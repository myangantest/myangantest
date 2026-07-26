-- Migration: 20260724000000_production_hardening.sql
-- Production database hardening, additional fields, audit logs, payment tables, and idempotent migration logs

-- 1. Ensure columns on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Trigger to prevent non-admin users from changing their own verification, subscription or role
CREATE OR REPLACE FUNCTION public.check_user_sensitive_fields_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role <> NEW.role OR OLD.is_verified <> NEW.is_verified OR OLD.is_subscribed <> NEW.is_subscribed) 
       AND NOT EXISTS (
           SELECT 1 FROM public.users 
           WHERE id = auth.uid() AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify role, verification, or subscription status.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_user_sensitive_fields ON public.users;
CREATE TRIGGER check_user_sensitive_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.check_user_sensitive_fields_update();


-- 2. Ensure columns on public.properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'pending';

-- Update property RLS policy so unapproved (pending/rejected) properties are NOT visible to the public
DROP POLICY IF EXISTS "Allow public read of active properties" ON public.properties;
CREATE POLICY "Allow public read of active properties" ON public.properties
    FOR SELECT USING (
        status = 'active' OR auth.uid() = owner_id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- 3. Create payment_orders table
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create payment_events table
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create legacy_migration_logs table
CREATE TABLE IF NOT EXISTS public.legacy_migration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_batch_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    legacy_id TEXT NOT NULL,
    supabase_id UUID,
    status TEXT NOT NULL CHECK (status IN ('pending', 'migrated', 'skipped', 'duplicate', 'failed')),
    action TEXT NOT NULL,
    error_code TEXT,
    safe_error_message TEXT,
    source_fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legacy_migration_logs_batch ON public.legacy_migration_logs(migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_legacy_migration_logs_fingerprint ON public.legacy_migration_logs(source_fingerprint);

-- 6. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 7. ENABLE RLS ON NEW TABLES
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. SET RLS POLICIES
-- payment_orders: User can read own orders, Admin full access
CREATE POLICY "Users can view own payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- payment_events, legacy_migration_logs, audit_logs: Only Admin access (and service role)
CREATE POLICY "Admins full access on payment_events" ON public.payment_events
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins full access on legacy_migration_logs" ON public.legacy_migration_logs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins full access on audit_logs" ON public.audit_logs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
