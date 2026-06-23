-- ====================================================
-- ADD FACILITY IMAGES GALLERY COLUMN TO FACILITIES
-- ====================================================

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS facility_images jsonb DEFAULT '[]'::jsonb;
