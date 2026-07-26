-- MyAngan Database Initialization Migration
-- Target: Supabase Postgres

-- 1. ENUMS & EXTENSIONS
CREATE TYPE user_role AS ENUM ('renter', 'landlord_broker', 'admin');
CREATE TYPE furnishing_status AS ENUM ('unfurnished', 'semi_furnished', 'furnished');
CREATE TYPE property_status AS ENUM ('active', 'rented', 'inactive');
CREATE TYPE waitlist_role AS ENUM ('landlord', 'broker', 'corporate_hr');

-- 2. TABLES

-- Users table (stores profile data linked to auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'renter',
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Properties table
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    city TEXT NOT NULL, -- e.g., 'Gurugram', 'South Delhi'
    locality TEXT NOT NULL, -- e.g., 'DLF Phase 3', 'Vasant Kunj'
    bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
    bathrooms INTEGER NOT NULL CHECK (bathrooms >= 0),
    furnishing_status furnishing_status NOT NULL DEFAULT 'semi_furnished',
    rent_amount INTEGER NOT NULL CHECK (rent_amount > 0),
    deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    status property_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Leads table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Favorites table
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, property_id)
);

-- Brokers table
CREATE TABLE public.brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    agency_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    active_listings_count INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Waitlist table
CREATE TABLE public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    role waitlist_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Users table policies
CREATE POLICY "Allow public read of profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Properties table policies
CREATE POLICY "Allow public read of active properties" ON public.properties
    FOR SELECT USING (status = 'active' OR auth.uid() = owner_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Allow landlord/broker to insert properties" ON public.properties
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('landlord_broker', 'admin')
        )
    );

CREATE POLICY "Allow owner to update own properties" ON public.properties
    FOR UPDATE USING (
        (auth.uid() = owner_id AND EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'landlord_broker'
        )) OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Allow owner to delete own properties" ON public.properties
    FOR DELETE USING (
        (auth.uid() = owner_id AND EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'landlord_broker'
        )) OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Leads table policies
-- Anyone can insert a lead (including unauthenticated visitors)
CREATE POLICY "Allow anyone to submit leads" ON public.leads
    FOR INSERT WITH CHECK (true);

-- Only property owners and admins can read leads
CREATE POLICY "Allow property owners and admins to read leads" ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = leads.property_id AND properties.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Favorites table policies
CREATE POLICY "Allow users to view own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert own favorites" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own favorites" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Brokers table policies
CREATE POLICY "Allow public read of brokers" ON public.brokers
    FOR SELECT USING (true);

CREATE POLICY "Allow users to manage own broker profile" ON public.brokers
    FOR ALL USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Waitlist table policies
CREATE POLICY "Allow public insert to waitlist" ON public.waitlist
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view waitlist" ON public.waitlist
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));


-- 5. STORAGE BUCKET CONFIGURATION FOR IMAGES
-- Note: Run these in Supabase console to create bucket.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);
-- CREATE POLICY "Allow public read of property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
-- CREATE POLICY "Allow authenticated users to upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');


-- 6. TRIGGERS & PROCEDURES (To sync Supabase Auth users with public.users table)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'renter'::user_role),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger to prevent standard users from escalating their privileges by changing their roles
CREATE OR REPLACE FUNCTION public.check_user_role_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role <> NEW.role AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_user_role_change
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.check_user_role_update();


-- 7. SEED DATA FOR DEMO PURPOSES
-- Note: Create dummy users first to own properties
-- Let's define UUID variables (or static UUIDs for easy testing)
-- Landlord/Broker User: 'd0bf67a0-2f16-4bb6-b6fe-2cf643f87091'
-- Renter User: 'a123f8c0-3b47-49f2-84da-508249b6b772'
-- Admin User: '9876f123-e456-4b12-a123-123456789abc'

-- (The code below should be run manually if seeding via CLI, or we pre-generate inside the client database simulator)
