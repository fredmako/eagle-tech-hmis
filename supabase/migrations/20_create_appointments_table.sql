-- Migration: Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    patient_name text NOT NULL,
    patient_phone text,
    doctor_id text NOT NULL,
    appointment_date text NOT NULL,
    start_time text NOT NULL,
    status text NOT NULL DEFAULT 'booked',
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS appointments_date_doc_fac_idx ON public.appointments (appointment_date, doctor_id, facility_id);
