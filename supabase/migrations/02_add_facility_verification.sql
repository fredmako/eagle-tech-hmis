-- Add is_verified column to facilities table
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Mark existing facilities as verified by default so we don't break them
UPDATE public.facilities SET is_verified = true;
