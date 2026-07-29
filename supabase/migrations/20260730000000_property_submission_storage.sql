-- Migration: 20260730000000_property_submission_storage.sql
-- Enforce private property-images storage bucket, storage RLS policies, and public visibility rules

-- 1. ENSURE PRIVATE PROPERTY-IMAGES STORAGE BUCKET EXISTS
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

-- 2. STORAGE RLS POLICIES FOR PROPERTY-IMAGES BUCKET
DROP POLICY IF EXISTS "Owners upload property images" ON storage.objects;
CREATE POLICY "Owners upload property images" ON storage.objects 
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'property-images' 
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Owners read property images" ON storage.objects;
CREATE POLICY "Owners read property images" ON storage.objects 
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'property-images' 
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Owners delete property images" ON storage.objects;
CREATE POLICY "Owners delete property images" ON storage.objects 
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'property-images' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.is_admin(auth.uid())
        )
    );

-- 3. CONFIRM STRICT PUBLIC PROPERTY VISIBILITY RLS POLICY
DROP POLICY IF EXISTS "Public read active and approved properties" ON public.properties;
CREATE POLICY "Public read active and approved properties"
    ON public.properties FOR SELECT
    USING (
        (status = 'active' AND approval_status IN ('approved', 'published'))
        OR (auth.uid() IS NOT NULL AND (
            owner_id = auth.uid()
            OR public.is_admin(auth.uid())
        ))
    );
