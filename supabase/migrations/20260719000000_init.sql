-- MyAngan Database Initialization Migration
-- Target: Supabase Postgres (Canonical Production Schema)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('renter', 'landlord', 'broker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.furnishing_status AS ENUM ('unfurnished', 'semi_furnished', 'furnished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.property_status AS ENUM ('pending', 'approved', 'active', 'rented', 'inactive', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.waitlist_role AS ENUM ('landlord', 'broker', 'corporate_hr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. CORE PROFILE & ROLE TABLES (Modernized auth.users sync)

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'renter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, role)
);

-- Backwards-compatibility View: public.users
CREATE OR REPLACE VIEW public.users AS
SELECT 
    p.id,
    p.email,
    p.phone,
    p.full_name AS name,
    COALESCE(r.role::text, 'renter') AS role,
    p.is_verified,
    p.is_subscribed,
    p.subscribed_at,
    p.subscription_expires_at,
    p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id;

-- 4. APPLICATION DOMAIN TABLES

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 5),
    description TEXT NOT NULL,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
    bathrooms INTEGER NOT NULL CHECK (bathrooms >= 0),
    furnishing_status public.furnishing_status NOT NULL DEFAULT 'semi_furnished',
    rent_amount INTEGER NOT NULL CHECK (rent_amount > 0),
    deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    status public.property_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    agency_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    active_listings_count INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    role public.waitlist_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- Profiles
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Properties
CREATE POLICY "Allow public read of active properties" ON public.properties FOR SELECT USING (
    status = 'active' OR status = 'approved' OR auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow landlord/broker/admin to insert properties" ON public.properties FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('landlord', 'broker', 'admin')
    )
);

CREATE POLICY "Allow owner/admin to update own properties" ON public.properties FOR UPDATE USING (
    auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow owner/admin to delete own properties" ON public.properties FOR DELETE USING (
    auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Leads
CREATE POLICY "Allow anyone to submit leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow property owners and admins to read leads" ON public.leads FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.properties WHERE properties.id = leads.property_id AND properties.owner_id = auth.uid()
    ) OR renter_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Favorites
CREATE POLICY "Allow users to view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Brokers
CREATE POLICY "Allow public read of brokers" ON public.brokers FOR SELECT USING (true);
CREATE POLICY "Allow users to manage own broker profile" ON public.brokers FOR ALL USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Waitlist
CREATE POLICY "Allow public insert to waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can view waitlist" ON public.waitlist FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 7. AUTH TRIGGER (Syncs auth.users -> profiles & user_roles)

CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.app_role;
BEGIN
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

    -- Insert default role
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
