-- Migration 10: Add facility_id to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS facility_id text;
