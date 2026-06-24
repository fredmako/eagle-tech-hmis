-- Migration: Create doctor availability table
CREATE TABLE IF NOT EXISTS public.doctor_availability (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    doctor_id text NOT NULL,
    day_of_week text NOT NULL, -- 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    start_time text NOT NULL, -- e.g. '09:00'
    end_time text NOT NULL,   -- e.g. '17:00'
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE IF EXISTS public.doctor_availability DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS doctor_availability_doc_fac_idx ON public.doctor_availability (doctor_id, facility_id);
