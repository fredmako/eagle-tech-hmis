-- MOH Patient Record Keeping System Database Schema
-- Run this in your Supabase SQL Editor to set up the necessary tables.

-- 1. Create Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Profiles Table (extends Supabase Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('receptionist', 'nurse', 'clinician', 'lab_tech', 'pharmacist', 'cashier', 'admin')),
  facility_id UUID REFERENCES facilities(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  national_id TEXT UNIQUE,
  facility_id_code TEXT UNIQUE NOT NULL,
  phone TEXT,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_relation TEXT,
  consent_given BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Visits Table (represents clinic queue tickets)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('triage', 'consultation', 'lab', 'pharmacy', 'billing', 'completed')),
  priority TEXT NOT NULL CHECK (priority IN ('routine', 'urgent', 'emergency')),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Triages Table
CREATE TABLE IF NOT EXISTS triages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE NOT NULL,
  systolic INT,
  diastolic INT,
  heart_rate INT,
  temperature NUMERIC,
  resp_rate INT,
  spo2 INT,
  weight NUMERIC,
  height NUMERIC,
  bmi NUMERIC,
  chief_complaint TEXT,
  priority_flag TEXT CHECK (priority_flag IN ('green', 'yellow', 'red')),
  risk_indicators TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE NOT NULL,
  history TEXT,
  examination TEXT,
  diagnosis_icd10 TEXT,
  treatment_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Orders Table (Labs, prescriptions, radiology requests)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lab', 'radiology', 'prescription')),
  item_name TEXT NOT NULL,
  instructions TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  results TEXT,
  price NUMERIC DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC DEFAULT 0.00 NOT NULL,
  amount_paid NUMERIC DEFAULT 0.00 NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'insurance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE triages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert Seed Data for Testing
INSERT INTO facilities (id, name, code) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Egesa Medical Clinic', 'EMC-001'),
  ('f2000000-0000-0000-0000-000000000002', 'Meso Referral Hospital', 'MRH-002')
ON CONFLICT (code) DO NOTHING;
