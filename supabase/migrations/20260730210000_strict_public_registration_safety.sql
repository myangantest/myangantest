-- Migration: 20260730210000_strict_public_registration_safety.sql
-- Enforces strict public registration normalization:
-- Public signup metadata can ONLY be 'renter' or 'landlord_broker'.
-- 'owner', 'broker', 'landlord', 'admin' passed via raw_user_meta_data are normalized safely to 'renter'.
-- 'owner' and 'broker' operational roles may ONLY be granted via authenticated provider onboarding.

CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    req_role TEXT;
    req_category TEXT;
    init_category TEXT;
    init_onboarding TEXT;
    assigned_role public.app_role;
BEGIN
    req_category := LOWER(COALESCE(NEW.raw_user_meta_data->>'account_category', NEW.raw_user_meta_data->>'role', 'renter'));
    req_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'renter'));

    -- Strict public signup role normalization
    IF req_category = 'landlord_broker' OR req_role = 'landlord_broker' THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
        assigned_role := NULL; -- No operational role prior to onboarding
    ELSE
        -- Default all other public inputs ('owner', 'broker', 'landlord', 'admin', etc.) safely to renter
        init_category := 'renter';
        init_onboarding := 'complete';
        assigned_role := 'renter'::public.app_role;
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        account_category,
        onboarding_status,
        provider_type,
        account_status,
        is_verified
    )
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'phone',
        init_category,
        init_onboarding,
        NULL,
        CASE WHEN init_category = 'renter' THEN 'active' ELSE 'pending_verification' END,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        account_category = EXCLUDED.account_category,
        onboarding_status = EXCLUDED.onboarding_status,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    -- Upsert single operational role ONLY if role is resolved (renter)
    -- Do NOT insert any operational role for landlord_broker signups
    IF assigned_role IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, assigned_role)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, created_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
