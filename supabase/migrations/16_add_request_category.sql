-- Migration: Add request_category column to role_requests table
ALTER TABLE public.role_requests ADD COLUMN IF NOT EXISTS request_category text DEFAULT 'Clinical & Operational Workflows';
