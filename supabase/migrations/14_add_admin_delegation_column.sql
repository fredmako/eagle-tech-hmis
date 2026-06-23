-- Migration: Add admin_delegation column to facilities table
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS admin_delegation jsonb DEFAULT '{}'::jsonb;
