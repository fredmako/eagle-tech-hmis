-- ====================================================
-- EAGLE TECH HMIS - SUPABASE DATABASE INITIALIZATION SCHEMA
-- ====================================================

-- 1. Create facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
    id text PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    logo_url text,
    address text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id text PRIMARY KEY,
    full_name text NOT NULL,
    role text NOT NULL,
    facility_id text REFERENCES public.facilities(id) ON DELETE SET NULL,
    email text UNIQUE,
    autologin_token text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    dob text NOT NULL,
    gender text NOT NULL,
    national_id text,
    facility_id_code text NOT NULL,
    phone text NOT NULL,
    next_of_kin_name text,
    next_of_kin_phone text,
    next_of_kin_relation text,
    consent_given boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Create visits table
CREATE TABLE IF NOT EXISTS public.visits (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    department text NOT NULL,
    priority text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Create triages table
CREATE TABLE IF NOT EXISTS public.triages (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_id text REFERENCES public.visits(id) ON DELETE CASCADE,
    systolic integer,
    diastolic integer,
    heart_rate integer,
    temperature numeric,
    resp_rate integer,
    spo2 integer,
    weight numeric,
    height numeric,
    bmi numeric,
    chief_complaint text NOT NULL,
    priority_flag text NOT NULL,
    risk_indicators text,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Create consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_id text REFERENCES public.visits(id) ON DELETE CASCADE,
    history text NOT NULL,
    examination text NOT NULL,
    diagnosis_icd10 text NOT NULL,
    treatment_plan text,
    created_at timestamp with time zone DEFAULT now()
);

-- 7. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_id text REFERENCES public.visits(id) ON DELETE CASCADE,
    type text NOT NULL,
    item_name text NOT NULL,
    instructions text,
    status text NOT NULL,
    results text,
    price numeric DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_id text REFERENCES public.visits(id) ON DELETE CASCADE,
    total_amount numeric DEFAULT 0.0,
    amount_paid numeric DEFAULT 0.0,
    status text NOT NULL,
    payment_method text,
    created_at timestamp with time zone DEFAULT now()
);

-- 9. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    facility_id text,
    user_id text,
    action text NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now()
);

-- 10. Create role_requests table
CREATE TABLE IF NOT EXISTS public.role_requests (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    requested_role text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
    id text PRIMARY KEY,
    token text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    department text NOT NULL,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    invited_by text,
    status text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 12. Disable Row Level Security (RLS) on all tables to allow client-side access
ALTER TABLE IF EXISTS public.facilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.triages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invitations DISABLE ROW LEVEL SECURITY;

-- 13. Seed default clinic facility
INSERT INTO public.facilities (id, name, code, logo_url, address)
VALUES ('f1', 'Eagle Tech Medical Clinic', 'EMC-001', 'preset:shield', 'Nairobi, Kenya')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 14. Seed default clinic staff profiles
INSERT INTO public.profiles (id, full_name, role, facility_id, email)
VALUES 
('u1', 'Dr. Arthur Conan', 'clinician', 'f1', 'clinician@egesa.com'),
('u2', 'Nurse Jane Doe', 'nurse', 'f1', 'nurse@egesa.com'),
('u3', 'Alice Cooper (Receptionist)', 'receptionist', 'f1', 'receptionist@egesa.com'),
('u4', 'Dr. Lab Tech Terry', 'lab_tech', 'f1', 'lab_tech@egesa.com'),
('u5', 'Pharmacist Bob', 'pharmacist', 'f1', 'pharmacist@egesa.com'),
('u6', 'Cashier Mary', 'cashier', 'f1', 'cashier@egesa.com'),
('u7', 'Admin Grace', 'admin', 'f1', 'admin@egesa.com')
ON CONFLICT (id) DO NOTHING;
