-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text NOT NULL,
    type text NOT NULL,                  -- 'outpatient', 'inpatient', 'diagnostic', 'billing', 'support'
    specialty text DEFAULT 'general',    -- 'general', 'orthopedics', 'cardiology', 'pediatrics'
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Add relation to visits
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS department_id text REFERENCES public.departments(id) ON DELETE SET NULL;

-- Disable RLS
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
