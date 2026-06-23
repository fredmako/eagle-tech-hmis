-- ====================================================
-- ADD CUSTOM DOMAIN SUPPORT TO FACILITIES
-- ====================================================

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS domain_status text DEFAULT 'pending';
