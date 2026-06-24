-- 22_patient_caretakers_and_visitor_logs.sql
-- Create patient_caretakers table
CREATE TABLE IF NOT EXISTS public.patient_caretakers (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    is_primary_caretaker BOOLEAN NOT NULL DEFAULT false,
    is_allowed_visitor BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on patient_caretakers
ALTER TABLE public.patient_caretakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read caretakers" ON public.patient_caretakers FOR SELECT USING (true);
CREATE POLICY "Allow write caretakers" ON public.patient_caretakers FOR ALL USING (true);

-- Create patient_visitor_logs table
CREATE TABLE IF NOT EXISTS public.patient_visitor_logs (
    id TEXT PRIMARY KEY,
    admission_id TEXT REFERENCES public.inpatient_admissions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT NOT NULL,
    visitor_id_number TEXT NOT NULL,
    relationship_to_patient TEXT NOT NULL,
    check_in_datetime TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    check_out_datetime TIMESTAMP WITH TIME ZONE,
    security_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'flagged')),
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on patient_visitor_logs
ALTER TABLE public.patient_visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read visitor logs" ON public.patient_visitor_logs FOR SELECT USING (true);
CREATE POLICY "Allow write visitor logs" ON public.patient_visitor_logs FOR ALL USING (true);
