-- Migration: 20260726120000_phase1_backend_foundation.sql
-- Phase 1 Backend Foundation Schema: Tables, Foreign Keys, Indexes, RLS Policies & Private Storage

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('renter', 'landlord', 'broker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.prop_status AS ENUM ('pending', 'approved', 'active', 'rented', 'inactive', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.agreement_status AS ENUM ('draft', 'pending_signature', 'signed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. CORE TABLES

-- User Roles mapping
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'renter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Profiles table (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_subscribed BOOLEAN NOT NULL DEFAULT false,
    subscribed_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 5),
    description TEXT NOT NULL,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
    bathrooms INTEGER NOT NULL CHECK (bathrooms >= 0),
    furnishing_status TEXT NOT NULL DEFAULT 'semi_furnished',
    rent_amount INTEGER NOT NULL CHECK (rent_amount > 0),
    deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    status prop_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Private Property Images table (Storage Object metadata)
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

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Comparison Items table
CREATE TABLE IF NOT EXISTS public.comparison_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Inquiries & Leads table
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

-- Payment Orders table
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'created',
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

-- Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
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

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, self-update only
CREATE POLICY "Public read of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles: Users read own roles, Admins full access
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Properties: Public read active/approved, Owners manage own, Admins manage all
CREATE POLICY "Public view active properties" ON public.properties FOR SELECT USING (
    status = 'active' OR status = 'approved' OR auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Owners and Brokers create properties" ON public.properties FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('landlord', 'broker', 'admin')
    )
);

CREATE POLICY "Owners update own properties" ON public.properties FOR UPDATE USING (
    auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Owners delete own properties" ON public.properties FOR DELETE USING (
    auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Property Images: Read tied to property view access, Owners upload/delete images of own properties
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

-- Favorites: Users manage own favorites only
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Comparison Items: Users manage own comparison items
CREATE POLICY "Users manage own comparison items" ON public.comparison_items FOR ALL USING (auth.uid() = user_id);

-- Inquiries: Anyone can insert, only property owner and admin can view
CREATE POLICY "Public create inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners and admins view inquiries" ON public.inquiries FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.owner_id = auth.uid()
    ) OR auth.uid() = renter_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Maintenance Tickets: Users view own tickets, owners view property tickets, admins manage all
CREATE POLICY "Users view own tickets" ON public.maintenance_tickets FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.properties WHERE properties.id = maintenance_tickets.property_id AND properties.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Users create tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments: Users view own orders and transactions
CREATE POLICY "Users view own payment orders" ON public.payment_orders FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users view own payment transactions" ON public.payment_transactions FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Agreements: Tenants and landlords view own agreement records
CREATE POLICY "Parties view own agreements" ON public.agreement_records FOR SELECT USING (
    auth.uid() = landlord_id OR auth.uid() = tenant_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Admin-Only Tables RLS Policies (Service Role / Admin Bypass)
CREATE POLICY "Admin access to webhook events" ON public.payment_webhook_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to email logs" ON public.email_delivery_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to verification requests" ON public.property_verification_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access to audit logs" ON public.audit_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. PRIVATE STORAGE BUCKET SCRIPT (Run in Supabase Console / Admin CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', false) ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Owners upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owners delete property images" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. IDEMPOTENT PROFILE SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.app_role;
BEGIN
    -- Determine role safely from user metadata
    BEGIN
        assigned_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'renter'::public.app_role;
    END;

    IF assigned_role IS NULL THEN
        assigned_role := 'renter'::public.app_role;
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (id, email, full_name, phone, is_verified)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'phone',
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    -- Insert role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
