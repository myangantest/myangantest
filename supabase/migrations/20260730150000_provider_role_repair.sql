-- Migration: 20260730150000_provider_role_repair.sql
-- Idempotent Backfill and Operational Repair for Provider user_roles

-- 1. BACKFILL OWNER ROLES FOR ACTIVE/VALID PROVIDERS MISSING USER_ROLES ROWS
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT p.id, 'owner'::public.app_role, NOW()
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
WHERE (p.provider_type = 'owner' OR (p.account_category = 'landlord_broker' AND p.provider_type IS NULL))
  AND r.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE 
SET role = 'owner'::public.app_role
WHERE public.user_roles.role NOT IN ('admin'::public.app_role);

-- 2. BACKFILL BROKER ROLES FOR ACTIVE/VALID PROVIDERS MISSING USER_ROLES ROWS
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT p.id, 'broker'::public.app_role, NOW()
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
WHERE p.provider_type = 'broker'
  AND r.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE 
SET role = 'broker'::public.app_role
WHERE public.user_roles.role NOT IN ('admin'::public.app_role);

-- 3. SPECIFIC GUARANTEED REPAIR FOR USER c2567a6a-7e53-4aea-9957-1eae3810919a (aryanv408@gmail.com)
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('c2567a6a-7e53-4aea-9957-1eae3810919a'::uuid, 'owner'::public.app_role, NOW())
ON CONFLICT (user_id) DO UPDATE
SET role = 'owner'::public.app_role;
