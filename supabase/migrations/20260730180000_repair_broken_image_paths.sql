-- Migration: 20260730180000_repair_broken_image_paths.sql
-- Quarantines and repairs unverified/broken image path references in public.properties

-- 1. Ensure indexes exist on public.property_images
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_storage_path ON public.property_images(storage_path);

-- 2. Clear fake/broken string paths from properties.image_urls where no corresponding row exists in property_images
UPDATE public.properties p
SET image_urls = ARRAY[]::text[]
WHERE p.image_urls IS NOT NULL 
  AND cardinality(p.image_urls) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.property_images pi WHERE pi.property_id = p.id
  );
