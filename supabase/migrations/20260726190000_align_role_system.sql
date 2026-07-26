-- Migration: 20260726190000_align_role_system.sql
-- Aligns account_category ('renter', 'landlord_broker') and operational roles ('renter', 'owner', 'broker', 'admin')
-- Fixes automatic conversion of landlord_broker signups into renters.

-- 1. ADD PROFILE CATEGORY & ONBOARDING FIELDS
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS account_category TEXT NOT NULL DEFAULT 'renter',
    ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'complete',
    ADD COLUMN IF NOT EXISTS provider_type TEXT,
    ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 2. RECONCILE AUTH USER CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    req_category TEXT;
    init_category TEXT;
    init_onboarding TEXT;
BEGIN
    req_category := LOWER(COALESCE(NEW.raw_user_meta_data->>'account_category', NEW.raw_user_meta_data->>'role', 'renter'));

    IF req_category = 'landlord_broker' THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
    ELSE
        init_category := 'renter';
        init_onboarding := 'complete';
    END IF;

    -- Upsert profile with proper category and onboarding state
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
        'pending_verification',
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        account_category = EXCLUDED.account_category,
        onboarding_status = EXCLUDED.onboarding_status,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    -- ONLY assign operational role 'renter' if account_category IS 'renter'
    IF init_category = 'renter' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'renter'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();

-- 3. REPLICATE BACKWARDS-COMPATIBLE VIEW FOR public.users
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users AS
SELECT 
    p.id,
    p.email,
    p.phone,
    p.full_name AS name,
    p.account_category,
    p.onboarding_status,
    p.provider_type,
    p.account_status,
    COALESCE(r.role::text, p.account_category) AS role,
    p.is_verified,
    p.is_subscribed,
    p.subscribed_at,
    p.subscription_expires_at,
    p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id;

-- 4. DATA REPAIR MIGRATION
DO $$
DECLARE
    affected_count INTEGER := 0;
BEGIN
    UPDATE public.profiles
    SET account_category = 'landlord_broker',
        onboarding_status = CASE 
            WHEN provider_type IN ('owner', 'broker') THEN 'complete'
            ELSE 'pending'
        END
    WHERE id IN (
        SELECT u.id FROM auth.users u
        WHERE LOWER(u.raw_user_meta_data->>'role') = 'landlord_broker'
           OR LOWER(u.raw_user_meta_data->>'account_category') = 'landlord_broker'
    );

    DELETE FROM public.user_roles
    WHERE role = 'renter'::public.app_role
      AND user_id IN (
          SELECT p.id FROM public.profiles p
          WHERE p.account_category = 'landlord_broker'
            AND p.provider_type IS NULL
      );

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Landlord/Broker role reconciliation complete. Reconciled % accounts.', affected_count;
END $$;
