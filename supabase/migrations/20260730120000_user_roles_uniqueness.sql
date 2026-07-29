-- Migration: 20260730120000_user_roles_uniqueness.sql
-- Enforce single operational role per user_id, deduplicate roles, and establish UNIQUE constraint

-- 1. DEDUPLICATE EXISTING USER_ROLES (ONE ROLE PER USER)
WITH ranked_roles AS (
  SELECT id, user_id, role,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY 
             CASE role
               WHEN 'admin'::public.app_role THEN 1
               WHEN 'broker'::public.app_role THEN 2
               WHEN 'owner'::public.app_role THEN 3
               WHEN 'landlord'::public.app_role THEN 4
               ELSE 5
             END ASC,
             created_at DESC
         ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked_roles WHERE rn > 1);

-- 2. ENFORCE UNIQUE CONSTRAINT ON USER_ROLES(USER_ID)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 3. RECONCILE USER SYNCHRONIZATION TRIGGER TO UPSERT SINGLE OPERATIONAL ROLE
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

    IF req_role = 'owner' OR req_role = 'landlord' THEN
        assigned_role := 'owner'::public.app_role;
    ELSIF req_role = 'broker' THEN
        assigned_role := 'broker'::public.app_role;
    ELSIF req_role = 'admin' THEN
        assigned_role := 'renter'::public.app_role; -- Public signup cannot grant admin
    ELSE
        assigned_role := 'renter'::public.app_role;
    END IF;

    IF req_category = 'landlord_broker' OR assigned_role IN ('owner', 'broker') THEN
        init_category := 'landlord_broker';
        init_onboarding := 'pending';
    ELSE
        init_category := 'renter';
        init_onboarding := 'complete';
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
        CASE WHEN assigned_role = 'owner' THEN 'owner' WHEN assigned_role = 'broker' THEN 'broker' ELSE NULL END,
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

    -- Upsert single operational role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, created_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
