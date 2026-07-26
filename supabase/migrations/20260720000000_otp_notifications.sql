-- Migration to implement secure OTP and notification logging tables
-- Targets the existing schema and does not recreate already existing tables.

-- 1. Add `is_verified` to the existing user/profile table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Create otp_verifications table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 5 NOT NULL,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    request_ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast code verification lookup
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email_purpose ON public.otp_verifications(email, purpose);

-- 3. Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL, -- 'registration_otp', 'broker_premium_success', 'property_inquiry_landlord', 'property_inquiry_renter'
    recipient TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'nodemailer',
    message_id TEXT,
    status TEXT NOT NULL, -- 'sent', 'failed'
    error_code TEXT,
    error_message TEXT,
    idempotency_key TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for auditing logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON public.notification_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Set up secure RLS policies (only admin users can view raw logs or verifications)
-- Clients have no read or write access to these tables. All mutations are performed server-side via service role.

CREATE POLICY "Admin full access on otp_verifications"
    ON public.otp_verifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin full access on notification_logs"
    ON public.notification_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
