-- Migration: 20260727120000_admin_review_system.sql
-- Admin provider verification review queue, listing approval workflow, and RLS policies

-- 1. ADD APPROVAL STATUS AND REVIEW NOTES TO PROPERTIES
ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending_review',
    ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 2. CREATE PROVIDER VERIFICATION REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.provider_verification_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_verification_user ON public.provider_verification_reviews(user_id);

-- 3. CREATE LISTING REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.listing_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    decision TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_property ON public.listing_reviews(property_id);

-- 4. ENABLE RLS
ALTER TABLE public.provider_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR REVIEWS
CREATE POLICY "Admins full access on provider_verification_reviews"
    ON public.provider_verification_reviews FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users view own provider verification reviews"
    ON public.provider_verification_reviews FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins full access on listing_reviews"
    ON public.listing_reviews FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Owners view own listing reviews"
    ON public.listing_reviews FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_id AND properties.owner_id = auth.uid()));

-- 6. PUBLIC PROPERTY SEARCH FILTER RLS POLICY
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;
CREATE POLICY "Public can view approved active properties"
    ON public.properties FOR SELECT
    USING (
        (status = 'active' AND approval_status IN ('approved', 'published'))
        OR (auth.uid() IS NOT NULL AND (
            owner_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        ))
    );
