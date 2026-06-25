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
    active_modules jsonb,
    system_admin_config jsonb,
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
    referred_from_facility text,
    referred_from_reason text,
    referred_to_facility text,
    referred_to_reason text,
    reconciled_with_moh boolean DEFAULT false,
    reconciler_notes text,
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
    checkout_id text,
    receipt_number text,
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
    request_category text DEFAULT 'Clinical & Operational Workflows',
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

-- 15. Create sample_specimens table
CREATE TABLE IF NOT EXISTS public.sample_specimens (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    category text NOT NULL,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.sample_specimens DISABLE ROW LEVEL SECURITY;

-- 16. Seed sample specimens
INSERT INTO public.sample_specimens (id, facility_id, category, name, description, status)
VALUES 
('spec_1', 'f1', 'MICROBIOLOGY', 'SERUM', 'Serum Crag', 'Active'),
('spec_2', 'f1', 'MICROBIOLOGY', 'SCRAPING', 'SCRAPING', 'Active'),
('spec_3', 'f1', 'HISTOLOGY', 'SPUTUM', 'SPUTUM', 'Active'),
('spec_4', 'f1', 'BIOCHEMISTRY', 'SPUTUM', 'SPUTUM', 'Active'),
('spec_5', 'f1', 'MICROBIOLOGY', 'BIOPSY', 'BIOPSY', 'Active'),
('spec_6', 'f1', 'MICROBIOLOGY', 'SWAB', 'SWAP', 'Active'),
('spec_7', 'f1', 'BIOCHEMISTRY', 'ASPIRATE', 'ASPIRATE', 'Active'),
('spec_8', 'f1', 'HISTOLOGY', 'ASPIRATE', 'ASPIRATE', 'Active'),
('spec_9', 'f1', 'HISTOLOGY', 'TISSUE', 'TISSUE', 'Active'),
('spec_10', 'f1', 'HISTOLOGY', 'BLOOD', 'BLOOD', 'Active')
ON CONFLICT (id) DO NOTHING;

-- 17. Create appointments table
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

-- 18. Create lab_test_categories table
CREATE TABLE IF NOT EXISTS public.lab_test_categories (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.lab_test_categories DISABLE ROW LEVEL SECURITY;

-- 19. Create lab_test_units table
CREATE TABLE IF NOT EXISTS public.lab_test_units (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.lab_test_units DISABLE ROW LEVEL SECURITY;

-- 20. Create lab_specimen_tests table
CREATE TABLE IF NOT EXISTS public.lab_specimen_tests (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    category text NOT NULL,
    specimen text NOT NULL,
    procedure_classification text,
    country text DEFAULT 'Kenya',
    result_type text NOT NULL DEFAULT 'Quantitative',
    unit text,
    name text NOT NULL,
    is_sha_pay boolean DEFAULT false,
    sha_test_code text,
    description text,
    cash_amount numeric DEFAULT 0,
    insurance_amount numeric DEFAULT 0,
    status text NOT NULL DEFAULT 'Active',
    etims_code text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.lab_specimen_tests DISABLE ROW LEVEL SECURITY;

-- 21. Create lab_specimen_sub_tests table
CREATE TABLE IF NOT EXISTS public.lab_specimen_sub_tests (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    test_id text REFERENCES public.lab_specimen_tests(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    result_type text NOT NULL DEFAULT 'Quantitative',
    unit text,
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.lab_specimen_sub_tests DISABLE ROW LEVEL SECURITY;

-- 22. Create lab_reference_ranges table
CREATE TABLE IF NOT EXISTS public.lab_reference_ranges (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    sub_test_id text REFERENCES public.lab_specimen_sub_tests(id) ON DELETE CASCADE,
    gender text NOT NULL DEFAULT 'All',
    age_min numeric DEFAULT 0,
    age_max numeric DEFAULT 120,
    min_value numeric,
    max_value numeric,
    normal_text text,
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.lab_reference_ranges DISABLE ROW LEVEL SECURITY;

-- 23. Create payroll_allowances table
CREATE TABLE IF NOT EXISTS public.payroll_allowances (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    code text NOT NULL,
    description text NOT NULL,
    value numeric DEFAULT 0,
    type text NOT NULL DEFAULT 'Fixed Amount',
    is_fixed text DEFAULT 'YES',
    is_taxable text DEFAULT 'YES',
    is_payable text DEFAULT 'YES',
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.payroll_allowances DISABLE ROW LEVEL SECURITY;

-- 24. Create payroll_banks table
CREATE TABLE IF NOT EXISTS public.payroll_banks (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    branch text,
    account_no text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.payroll_banks DISABLE ROW LEVEL SECURITY;

-- 25. Create payroll_deductions table
CREATE TABLE IF NOT EXISTS public.payroll_deductions (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    code text NOT NULL,
    description text NOT NULL,
    value numeric DEFAULT 0,
    type text NOT NULL DEFAULT 'Percentage of Gross',
    status text NOT NULL DEFAULT 'Active',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.payroll_deductions DISABLE ROW LEVEL SECURITY;

-- 26. Create payrolls table
CREATE TABLE IF NOT EXISTS public.payrolls (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    month text NOT NULL,
    year text NOT NULL,
    calculations jsonb NOT NULL,
    status text NOT NULL DEFAULT 'Draft',
    total_net numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.payrolls DISABLE ROW LEVEL SECURITY;


-- 27. Create demo_requests table
CREATE TABLE IF NOT EXISTS public.demo_requests (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    preferred_date text NOT NULL,
    preferred_time text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.demo_requests DISABLE ROW LEVEL SECURITY;



