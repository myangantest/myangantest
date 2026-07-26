-- Migration: 20260726120000_phase1_backend_foundation.sql
-- Phase 1 Backend Foundation Schema: Storage, Operational Tables, Indexes & RLS

-- 1. ENUMS FOR PHASE 1 MODULES
DO $$ BEGIN
    CREATE TYPE public.ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.agreement_status AS ENUM ('draft', 'pending_signature', 'signed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. DOMAIN TABLES

-- Private Property Images table
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes <= 5242880), -- Max 5MB
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comparison Items table
CREATE TABLE IF NOT EXISTS public.comparison_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    renter_name TEXT NOT NULL,
    renter_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Tickets table
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE NOT NULL,
    razorpay_signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'captured',
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Webhook Events table (for idempotency)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Delivery Logs table
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    template_type TEXT NOT NULL,
    message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    error_details TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property Verification Requests table
CREATE TABLE IF NOT EXISTS public.property_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agreement Records table
CREATE TABLE IF NOT EXISTS public.agreement_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rent_amount INTEGER NOT NULL,
    deposit_amount INTEGER NOT NULL,
    start_date DATE NOT NULL,
    tenure_months INTEGER NOT NULL,
    terms_json JSONB NOT NULL DEFAULT '{}',
    status agreement_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_locality ON public.properties(city, locality);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_property_images_prop ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_prop ON public.inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.maintenance_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_prop ON public.maintenance_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON public.payment_webhook_events(event_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_records ENABLE ROW LEVEL SECURITY;

-- Property Images
CREATE POLICY "View images of viewable properties" ON public.property_images FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = property_images.property_id 
        AND (properties.status IN ('active', 'approved') OR properties.owner_id = auth.uid())
    )
);

CREATE POLICY "Owners manage images for own properties" ON public.property_images FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = property_images.property_id 
        AND properties.owner_id = auth.uid()
    )
);

-- Comparison Items
CREATE POLICY "Users manage own comparison items" ON public.comparison_items FOR ALL USING (auth.uid() = user_id);

-- Inquiries
CREATE POLICY "Public create inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners and admins view inquiries" ON public.inquiries FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.owner_id = auth.uid()
    ) OR auth.uid() = renter_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Maintenance Tickets
CREATE POLICY "Users view own tickets" ON public.maintenance_tickets FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.properties WHERE properties.id = maintenance_tickets.property_id AND properties.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Users create tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment Transactions
CREATE POLICY "Users view own payment transactions" ON public.payment_transactions FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Agreements
CREATE POLICY "Parties view own agreements" ON public.agreement_records FOR SELECT USING (
    auth.uid() = landlord_id OR auth.uid() = tenant_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Admin-Only Tables RLS Policies
CREATE POLICY "Admin access to webhook events" ON public.payment_webhook_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to email logs" ON public.email_delivery_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to verification requests" ON public.property_verification_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. PRIVATE STORAGE BUCKET CREATION & POLICIES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-images',
    'property-images',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Owners upload property images" ON storage.objects;
CREATE POLICY "Owners upload property images" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owners read property images" ON storage.objects;
CREATE POLICY "Owners read property images" ON storage.objects 
    FOR SELECT USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owners delete property images" ON storage.objects;
CREATE POLICY "Owners delete property images" ON storage.objects 
    FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
