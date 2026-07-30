-- Migration: 20260730200000_reconcile_provider_lifecycle.sql
-- Reconciles user registration trigger, provider role lifecycle, and user_roles single-role constraint

-- 1. RECONCILE AUTH USER SYNCHRONIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    req_role TEXT;
    req_category TEXT;
    init_category TEXT;
    init_onboarding TEXT;
    assigned_provider TEXT;
    assigned_role public.app_role;
BEGIN
    req_category := LOWER(COALESCE(NEW.raw_user_meta_data->>'account_category', NEW.raw_user_meta_data->>'role', 'renter'));
    req_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'renter'));

    -- Determine provider type and account category
    IF req_role = 'owner' OR req_role = 'landlord' THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
        assigned_provider := 'owner';
        assigned_role := 'owner'::public.app_role;
    ELSIF req_role = 'broker' THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
        assigned_provider := 'broker';
        assigned_role := 'broker'::public.app_role;
    ELSIF req_category = 'landlord_broker' OR req_role = 'landlord_broker' THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
        assigned_provider := NULL;
        assigned_role := NULL; -- No operational role prior to onboarding
    ELSE
        init_category := 'renter';
        init_onboarding := 'complete';
        assigned_provider := NULL;
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
        assigned_provider,
        CASE WHEN init_category = 'renter' THEN 'active' ELSE 'pending_verification' END,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        account_category = EXCLUDED.account_category,
        onboarding_status = EXCLUDED.onboarding_status,
        provider_type = COALESCE(EXCLUDED.provider_type, public.profiles.provider_type),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    -- Upsert single operational role ONLY if role is resolved (renter, owner, broker)
    -- Do NOT insert any operational role for pending landlord_broker signups!
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

-- 2. REPAIR EXISTING USER DATA SAFELY

-- Case 1: Clean up erroneous 'renter' roles for pending landlord_broker accounts
DELETE FROM public.user_roles
WHERE role = 'renter'::public.app_role
  AND user_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.account_category = 'landlord_broker'
        AND p.provider_type IS NULL
        AND p.onboarding_status = 'pending'
  );

-- Case 2: Ensure owner roles for completed owner profiles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT p.id, 'owner'::public.app_role, NOW()
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
WHERE p.provider_type = 'owner'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'owner'::public.app_role
WHERE public.user_roles.role NOT IN ('admin'::public.app_role);

-- Case 3: Ensure broker roles for completed broker profiles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT p.id, 'broker'::public.app_role, NOW()
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
WHERE p.provider_type = 'broker'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'broker'::public.app_role
WHERE public.user_roles.role NOT IN ('admin'::public.app_role);

-- Case 4: Explicit preservation for active owner account (aryanv408@gmail.com)
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('c2567a6a-7e53-4aea-9957-1eae3810919a'::uuid, 'owner'::public.app_role, NOW())
ON CONFLICT (user_id) DO UPDATE
SET role = 'owner'::public.app_role;

UPDATE public.profiles
SET account_category = 'landlord_broker',
    provider_type = 'owner',
    onboarding_status = 'complete',
    account_status = 'active'
WHERE id = 'c2567a6a-7e53-4aea-9957-1eae3810919a'::uuid;
