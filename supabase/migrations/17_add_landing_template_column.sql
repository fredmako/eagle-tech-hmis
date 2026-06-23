-- ====================================================
-- ADD LANDING PAGE TEMPLATE COLUMN TO FACILITIES
-- ====================================================

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS landing_template text DEFAULT 'classic';
