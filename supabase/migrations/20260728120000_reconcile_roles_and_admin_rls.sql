-- Migration: 20260728120000_reconcile_roles_and_admin_rls.sql
-- Reconcile production schema, app_role enum usage, user_roles uniqueness, non-recursive RLS, and admin review constraints

-- 1. MIGRATE EXISTING LEGACY 'landlord' ENTRIES TO 'owner'
UPDATE public.user_roles
SET role = 'owner'::public.app_role
WHERE role = 'landlord'::public.app_role;

-- 2. USER ROLE UNIQUENESS & DEDUPLICATION (ONE ROLE PER USER)
WITH ranked_roles AS (
  SELECT id, user_id, role,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY 
             CASE role
               WHEN 'admin'::public.app_role THEN 1
               WHEN 'owner'::public.app_role THEN 2
               WHEN 'landlord'::public.app_role THEN 3
               WHEN 'broker'::public.app_role THEN 4
               ELSE 5
             END ASC,
             created_at DESC
         ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked_roles WHERE rn > 1);

-- Enforce UNIQUE constraint on user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 3. RECONCILE AUTH USER CREATION TRIGGER
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
        -- Admin cannot be assigned via raw registration
        assigned_role := 'renter'::public.app_role;
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

    -- Assign single operational role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, created_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. NON-RECURSIVE SECURITY DEFINER ADMIN HELPER
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = COALESCE(check_user_id, auth.uid())
      AND role = 'admin'::public.app_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- 5. RE-ARCHITECT user_roles RLS POLICIES
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own role or admin reads all roles" ON public.user_roles;

CREATE POLICY "Users read own role or admin reads all roles"
    ON public.user_roles FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can modify user roles"
    ON public.user_roles FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 6. ADMIN REVIEW CONSTRAINTS & INDEXES
ALTER TABLE public.provider_verification_reviews
    DROP CONSTRAINT IF EXISTS chk_provider_verification_status;
ALTER TABLE public.provider_verification_reviews
    ADD CONSTRAINT chk_provider_verification_status
    CHECK (new_status IN ('pending', 'under_review', 'additional_information_required', 'approved', 'rejected', 'suspended'));

ALTER TABLE public.properties
    DROP CONSTRAINT IF EXISTS chk_property_approval_status;
ALTER TABLE public.properties
    ADD CONSTRAINT chk_property_approval_status
    CHECK (approval_status IN ('draft', 'pending_review', 'changes_requested', 'approved', 'published', 'rejected', 'suspended', 'archived'));

-- 7. RE-ARCHITECT REVIEW RLS POLICIES
DROP POLICY IF EXISTS "Admins full access on provider_verification_reviews" ON public.provider_verification_reviews;
DROP POLICY IF EXISTS "Users view own provider verification reviews" ON public.provider_verification_reviews;

CREATE POLICY "Admins full access on provider_verification_reviews"
    ON public.provider_verification_reviews FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view own provider verification reviews"
    ON public.provider_verification_reviews FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access on listing_reviews" ON public.listing_reviews;
DROP POLICY IF EXISTS "Owners view own listing reviews" ON public.listing_reviews;

CREATE POLICY "Admins full access on listing_reviews"
    ON public.listing_reviews FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners view own listing reviews"
    ON public.listing_reviews FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.properties WHERE id = listing_reviews.property_id AND owner_id = auth.uid()));

-- 8. PROPERTY VISIBILITY RLS POLICIES
DROP POLICY IF EXISTS "Allow public read of active properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view approved active properties" ON public.properties;

CREATE POLICY "Public read active and approved properties"
    ON public.properties FOR SELECT
    USING (
        (status = 'active' AND approval_status IN ('approved', 'published'))
        OR (auth.uid() IS NOT NULL AND (
            owner_id = auth.uid()
            OR public.is_admin(auth.uid())
        ))
    );

DROP POLICY IF EXISTS "Allow landlord/broker/admin to insert properties" ON public.properties;
CREATE POLICY "Allow owner/broker/admin to insert properties"
    ON public.properties FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = owner_id AND (
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'landlord', 'broker'))
            OR public.is_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Allow owner/admin to update own properties" ON public.properties;
CREATE POLICY "Allow owner/admin to update properties"
    ON public.properties FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow owner/admin to delete own properties" ON public.properties;
CREATE POLICY "Allow owner/admin to delete properties"
    ON public.properties FOR DELETE TO authenticated
    USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));
