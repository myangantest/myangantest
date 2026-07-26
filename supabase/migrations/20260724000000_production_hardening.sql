-- Migration: 20260724000000_production_hardening.sql
-- Production database hardening, additional fields, audit logs, payment tables, and idempotent migration logs

-- 1. Sensitive profile fields trigger (prevents self-escalation)
CREATE OR REPLACE FUNCTION public.check_profile_sensitive_fields_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.is_verified <> NEW.is_verified OR OLD.is_subscribed <> NEW.is_subscribed) 
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles 
           WHERE user_id = auth.uid() AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify verification or subscription status.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER check_profile_sensitive_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_sensitive_fields_update();

-- 2. Payment Orders table
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 3. Payment Events table
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Legacy Migration Logs table
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

-- 5. Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 6. ENABLE RLS ON NEW TABLES
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. SET RLS POLICIES
CREATE POLICY "Users can view own payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins full access on payment_events" ON public.payment_events
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins full access on legacy_migration_logs" ON public.legacy_migration_logs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins full access on audit_logs" ON public.audit_logs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
