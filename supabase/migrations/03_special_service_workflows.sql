-- ====================================================
-- EAGLE TECH HMIS - SPECIAL SERVICE WORKFLOWS MIGRATION
-- ====================================================

-- 1. Create Service Types Table
CREATE TABLE IF NOT EXISTS public.service_types (
    id text PRIMARY KEY,
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    requires_anc_card boolean DEFAULT false,
    requires_fp_card boolean DEFAULT false,
    billing_package_id text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Patient Registrations Table
CREATE TABLE IF NOT EXISTS public.patient_registrations (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_type text NOT NULL, -- e.g. walk-in, referral, scheduled
    service_type text REFERENCES public.service_types(code),
    registration_datetime timestamp with time zone DEFAULT now(),
    assigned_clinic text,
    status text NOT NULL, -- e.g. active, completed, cancelled
    next_followup_date date
);

-- Alter existing visits table to support service type
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS service_type text;

-- 3. Create ANC Workflow Tables
CREATE TABLE IF NOT EXISTS public.pregnancies (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    lmp_date date NOT NULL,
    estimated_delivery_date date NOT NULL,
    gravidity integer NOT NULL DEFAULT 1,
    parity integer NOT NULL DEFAULT 0,
    abortions integer NOT NULL DEFAULT 0,
    current_gestational_age_weeks numeric(4,2),
    conception_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anc_visits (
    id text PRIMARY KEY,
    pregnancy_id text REFERENCES public.pregnancies(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_number integer NOT NULL,
    visit_date date NOT NULL,
    gestational_age_at_visit numeric(4,2) NOT NULL,
    bp_systolic integer,
    bp_diastolic integer,
    weight_kg numeric(5,2),
    fundal_height_cm numeric(4,1),
    fetal_heart_rate integer,
    maternal_temperature numeric(3,1),
    edema_present boolean DEFAULT false,
    tetanus_toxoid_dose integer,
    tetanus_date date,
    iron_folate_supplied boolean DEFAULT false,
    supplements_count integer DEFAULT 0,
    complications_notes text,
    risk_level text DEFAULT 'normal', -- normal, medium, high
    next_visit_date date,
    placed_by text REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anc_diagnoses (
    id text PRIMARY KEY,
    anc_visit_id text REFERENCES public.anc_visits(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    diagnosis_id text NOT NULL, -- ICD-10 Code
    is_pregnancy_specific boolean DEFAULT true,
    severity_level text DEFAULT 'moderate',
    principal_complication boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.anc_tests (
    id text PRIMARY KEY,
    anc_visit_id text REFERENCES public.anc_visits(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    test_type text NOT NULL, -- Hb, HIV, syphilis, blood_group, urine
    test_result text NOT NULL,
    result_unit text,
    normal_range text,
    instrument_id text,
    tested_by text REFERENCES public.profiles(id),
    tested_at timestamp with time zone DEFAULT now()
);

-- 4. Create Family Planning Tables
CREATE TABLE IF NOT EXISTS public.contraceptive_methods (
    id text PRIMARY KEY,
    method_name text NOT NULL,
    method_code text UNIQUE NOT NULL,
    duration_months integer NOT NULL,
    provider_skill_level text,
    removal_required boolean DEFAULT false,
    side_effects_list text[]
);

CREATE TABLE IF NOT EXISTS public.family_planning_records (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    consultation_date date NOT NULL,
    reproductive_history_gravidity integer DEFAULT 0,
    reproductive_history_parity integer DEFAULT 0,
    medical_eligibility_category integer CHECK (medical_eligibility_category BETWEEN 1 AND 4),
    counseling_provided boolean DEFAULT false,
    method_selected_id text REFERENCES public.contraceptive_methods(id),
    insertion_date date,
    removal_date date,
    next_followup_date date,
    side_effects_reported text,
    discontinued boolean DEFAULT false,
    discontinued_reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fp_visits (
    id text PRIMARY KEY,
    fp_record_id text REFERENCES public.family_planning_records(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    visit_date date NOT NULL,
    visit_type text NOT NULL, -- initial, followup, removal, complication
    method_status text,
    side_effects text,
    discontinuation boolean DEFAULT false,
    new_method_selected_id text REFERENCES public.contraceptive_methods(id),
    next_visit_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Create Immunization Tables
CREATE TABLE IF NOT EXISTS public.vaccines (
    id text PRIMARY KEY,
    vaccine_name text NOT NULL,
    vaccine_code text UNIQUE NOT NULL,
    schedule_age_weeks integer NOT NULL,
    total_doses_required integer NOT NULL,
    contraindications_list text[]
);

CREATE TABLE IF NOT EXISTS public.immunization_records (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    birth_date date NOT NULL,
    current_age_weeks integer NOT NULL,
    current_age_months integer NOT NULL,
    vaccines_received_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vaccine_doses (
    id text PRIMARY KEY,
    immunization_record_id text REFERENCES public.immunization_records(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    vaccine_id text REFERENCES public.vaccines(id),
    dose_number integer NOT NULL,
    administration_date date NOT NULL,
    administration_site text,
    route text,
    batch_number text,
    expiry_date date,
    administered_by text REFERENCES public.profiles(id),
    adverse_events text,
    next_dose_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Create Lab-Only Tables
CREATE TABLE IF NOT EXISTS public.lab_only_registrations (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    registration_datetime timestamp with time zone DEFAULT now(),
    specimen_count integer DEFAULT 0,
    priority_level text DEFAULT 'routine',
    payment_status text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_test_orders (
    id text PRIMARY KEY,
    registration_id text REFERENCES public.lab_only_registrations(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    test_id text NOT NULL,
    specimen_type text NOT NULL,
    specimen_volume text,
    collection_datetime timestamp with time zone,
    received_datetime timestamp with time zone,
    status text NOT NULL DEFAULT 'pending',
    priority text DEFAULT 'routine',
    ordering_clinician text,
    instrument_id text,
    assigned_technician text REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_results (
    id text PRIMARY KEY,
    test_order_id text REFERENCES public.lab_test_orders(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    test_parameter text NOT NULL,
    result_value text NOT NULL,
    result_unit text,
    normal_range_low numeric,
    normal_range_high numeric,
    is_abnormal boolean DEFAULT false,
    flag text, -- L, H, LL, HH
    instrument_id text,
    result_datetime timestamp with time zone DEFAULT now(),
    verified_by text REFERENCES public.profiles(id),
    verified_at timestamp with time zone
);

-- 7. Create Pharmacy-Only Tables
CREATE TABLE IF NOT EXISTS public.pharmacy_only_registrations (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    registration_datetime timestamp with time zone DEFAULT now(),
    prescription_source text DEFAULT 'internal',
    payment_status text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pharmacy_dispensings (
    id text PRIMARY KEY,
    registration_id text REFERENCES public.pharmacy_only_registrations(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    medication_id text NOT NULL,
    quantity_dispensed integer NOT NULL,
    dosage_form text,
    strength text,
    frequency text,
    duration_days integer,
    batch_number text,
    expiry_date date,
    dispensed_by text REFERENCES public.profiles(id),
    dispensed_at timestamp with time zone DEFAULT now(),
    patient_instructions text,
    payment_amount numeric DEFAULT 0.0
);

-- 8. Create Inpatient Tables
CREATE TABLE IF NOT EXISTS public.inpatient_admissions (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    admission_datetime timestamp with time zone DEFAULT now(),
    admitting_clinician text REFERENCES public.profiles(id),
    admission_diagnosis_id text,
    ward_id text NOT NULL,
    bed_id text NOT NULL,
    admission_type text DEFAULT 'routine',
    payment_method text,
    status text DEFAULT 'admitted',
    discharge_datetime timestamp with time zone,
    discharge_diagnosis_id text,
    discharge_mode text,
    followup_date date,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_care_records (
    id text PRIMARY KEY,
    admission_id text REFERENCES public.inpatient_admissions(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    care_date date NOT NULL,
    round_number integer NOT NULL,
    bp_systolic integer,
    bp_diastolic integer,
    temperature numeric(3,1),
    pulse_rate integer,
    respiratory_rate integer,
    pain_score integer,
    oxygen_saturation integer,
    medications_given text,
    fluids_administered text,
    observations_notes text,
    recorded_by text REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bed_allocations (
    id text PRIMARY KEY,
    ward_id text NOT NULL,
    bed_number text NOT NULL,
    current_patient_id text REFERENCES public.patients(id) ON DELETE SET NULL,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    allocation_datetime timestamp with time zone,
    release_datetime timestamp with time zone,
    bed_status text DEFAULT 'clean',
    created_at timestamp with time zone DEFAULT now()
);

-- 9. Create Emergency Tables
CREATE TABLE IF NOT EXISTS public.emergency_registrations (
    id text PRIMARY KEY,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    arrival_datetime timestamp with time zone DEFAULT now(),
    arrival_mode text,
    triage_datetime timestamp with time zone,
    priority_level text, -- red, yellow, green, black
    abc_status text,
    chief_complaint text,
    assigned_doctor text REFERENCES public.profiles(id),
    disposition text,
    disposition_datetime timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.triage_assessments (
    id text PRIMARY KEY,
    emergency_id text REFERENCES public.emergency_registrations(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    assessment_datetime timestamp with time zone DEFAULT now(),
    airway_status text,
    breathing_status text,
    circulation_status text,
    pulse_rate integer,
    bp_systolic integer,
    bp_diastolic integer,
    respiratory_rate integer,
    temperature numeric(3,1),
    oxygen_saturation integer,
    pain_score integer,
    consciousness_level text,
    triage_nurse text REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.emergency_interventions (
    id text PRIMARY KEY,
    emergency_id text REFERENCES public.emergency_registrations(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    intervention_type text NOT NULL,
    intervention_description text,
    instrument_id text,
    performed_by text REFERENCES public.profiles(id),
    performed_at timestamp with time zone DEFAULT now()
);

-- 10. Create Medical Instrument Table
CREATE TABLE IF NOT EXISTS public.medical_instruments (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    manufacturer text,
    model text,
    serial_number text,
    installation_date date,
    calibration_date date,
    next_calibration_date date,
    location_ward text,
    status text DEFAULT 'active', -- active, maintenance, retired
    last_used_datetime timestamp with time zone,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.instrument_usage_logs (
    id text PRIMARY KEY,
    instrument_id text REFERENCES public.medical_instruments(id) ON DELETE CASCADE,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    workflow_type text NOT NULL,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id text NOT NULL,
    measurement_type text NOT NULL,
    result_value numeric,
    result_unit text,
    operator_id text REFERENCES public.profiles(id),
    used_at timestamp with time zone DEFAULT now()
);

-- ====================================================
-- RLS (Row Level Security) Configuration
-- ====================================================
ALTER TABLE IF EXISTS public.service_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patient_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pregnancies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anc_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anc_diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anc_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contraceptive_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_planning_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fp_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vaccines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.immunization_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vaccine_doses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_only_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_test_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pharmacy_only_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pharmacy_dispensings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inpatient_admissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ward_care_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bed_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.triage_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instrument_usage_logs DISABLE ROW LEVEL SECURITY;

-- ====================================================
-- Seeds / Static Catalog Configuration
-- ====================================================

-- Seed Service Types
INSERT INTO public.service_types (id, name, code, requires_anc_card, requires_fp_card) VALUES
('st_opd', 'General OPD (Normal Consultation)', 'OPD', false, false),
('st_anc', 'Antenatal Care (ANC)', 'ANC', true, false),
('st_fp', 'Family Planning (FP)', 'FP', false, true),
('st_imm', 'Immunization/Vaccination', 'IMM', false, false),
('st_lab', 'Laboratory-Only', 'LAB', false, false),
('st_pha', 'Pharmacy-Only', 'PHA', false, false),
('st_ipd', 'Inpatient Admission', 'IPD', false, false),
('st_emr', 'Emergency/Triage', 'EMR', false, false)
ON CONFLICT (code) DO NOTHING;

-- Seed Contraceptive Methods
INSERT INTO public.contraceptive_methods (id, method_name, method_code, duration_months, provider_skill_level, removal_required, side_effects_list) VALUES
('cm_pill', 'Combined Oral Contraceptive Pill', 'PILL', 1, 'basic', false, ARRAY['Nausea', 'Headache', 'Breast tenderness']),
('cm_inj', 'Progestogen Injectable (Depo-Provera)', 'INJECTABLE', 3, 'basic', false, ARRAY['Weight gain', 'Irregular spotting', 'Mood changes']),
('cm_imp', 'Contraceptive Implant (Implanon/Jadelle)', 'IMPLANT', 36, 'advanced', true, ARRAY['Irregular bleeding', 'Headache', 'Ovarian cysts']),
('cm_iud', 'Copper Intrauterine Device (IUD)', 'IUD', 120, 'advanced', true, ARRAY['Heavier periods', 'Cramping', 'Pelvic infection']),
('cm_cond', 'Male/Female Condoms', 'CONDOM', 0, 'none', false, ARRAY['Latex allergy'])
ON CONFLICT (method_code) DO NOTHING;

-- Seed Vaccines (Kenya EPI Schedule)
INSERT INTO public.vaccines (id, vaccine_name, vaccine_code, schedule_age_weeks, total_doses_required, contraindications_list) VALUES
('v_bcg', 'BCG (Bacillus Calmette-Guerin)', 'BCG', 0, 1, ARRAY['Symptomatic HIV infection', 'Severe immunodeficiency']),
('v_opv_b', 'Oral Polio Vaccine (OPV) - Birth Dose', 'OPV_0', 0, 1, ARRAY['Severe immunodeficiency']),
('v_opv_1', 'Oral Polio Vaccine (OPV) - Dose 1', 'OPV_1', 6, 1, ARRAY['Severe immunodeficiency']),
('v_penta_1', 'Pentavalent Vaccine (DPT-HepB-Hib) - Dose 1', 'PENTA_1', 6, 1, ARRAY['Encephalopathy within 7 days of previous dose']),
('v_pcv_1', 'Pneumococcal Conjugate Vaccine (PCV) - Dose 1', 'PCV_1', 6, 1, ARRAY['Severe allergic reaction to previous dose']),
('v_rota_1', 'Rotavirus Vaccine - Dose 1', 'ROTA_1', 6, 1, ARRAY['History of intussusception', 'Severe immunodeficiency']),
('v_measles_1', 'Measles-Rubella Vaccine - Dose 1', 'MR_1', 39, 1, ARRAY['Pregnancy', 'Severe immunodeficiency'])
ON CONFLICT (vaccine_code) DO NOTHING;

-- Seed Default Medical Instruments
INSERT INTO public.medical_instruments (id, facility_id, name, type, category, manufacturer, model, serial_number, installation_date, calibration_date, next_calibration_date, location_ward, status) VALUES
('inst_ultrasound', 'f1', 'Obstetric Ultrasound Machine', 'ultrasound', 'ANC', 'GE Healthcare', 'Voluson E8', 'US-VOL-198273', '2025-06-01', '2026-01-10', '2026-07-10', 'ANC Clinic', 'active'),
('inst_doppler', 'f1', 'Fetal Doppler Monitor', 'doppler', 'ANC', 'Sonoline', 'Sonoline B', 'FD-SONO-238472', '2025-08-15', '2026-03-15', '2026-09-15', 'ANC Clinic', 'active'),
('inst_autoclave', 'f1', 'Autoclave Sterilizer', 'autoclave', 'general', 'Tuttnauer', '2540M', 'AC-TUTT-493821', '2025-05-10', '2026-02-20', '2026-08-20', 'Main Theatre', 'active'),
('inst_dispenser', 'f1', 'Syringe Auto-Dispenser', 'dispenser', 'immunization', 'Becton Dickinson', 'BD AutoShield', 'DISP-BD-839218', '2025-10-01', '2026-05-10', '2026-11-10', 'Immunization Room', 'active'),
('inst_thermometer', 'f1', 'Cold Chain Logger Thermometer', 'thermometer', 'immunization', 'LogTag', 'UTRED30-16', 'THERM-LT-948302', '2025-11-05', '2026-05-01', '2026-11-01', 'Cold Chain Fridge', 'active'),
('inst_defibrillator', 'f1', 'Emergency Defibrillator', 'defibrillator', 'emergency', 'ZOLL Medical', 'AED Plus', 'DEFIB-ZOLL-840291', '2025-04-12', '2026-04-12', '2026-10-12', 'ER Room', 'active'),
('inst_monitor', 'f1', 'Patient Monitor Vitals', 'monitor', 'triage', 'Mindray', 'ePM 10', 'MON-MIND-928318', '2025-03-15', '2026-03-01', '2026-09-01', 'ER Triage', 'active'),
('inst_pump', 'f1', 'IV Infusion Pump', 'pump', 'ward', 'Baxter', 'Flo-Gard', 'PUMP-BAX-493021', '2025-07-22', '2026-02-18', '2026-08-18', 'Ward A', 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Ward Beds
INSERT INTO public.bed_allocations (id, ward_id, bed_number, facility_id, bed_status) VALUES
('bed_m1', 'ward_male', 'Male Bed 01', 'f1', 'clean'),
('bed_m2', 'ward_male', 'Male Bed 02', 'f1', 'clean'),
('bed_m3', 'ward_male', 'Male Bed 03', 'f1', 'clean'),
('bed_m4', 'ward_male', 'Male Bed 04', 'f1', 'clean'),
('bed_m5', 'ward_male', 'Male Bed 05', 'f1', 'clean'),
('bed_f1', 'ward_female', 'Female Bed 01', 'f1', 'clean'),
('bed_f2', 'ward_female', 'Female Bed 02', 'f1', 'clean'),
('bed_f3', 'ward_female', 'Female Bed 03', 'f1', 'clean'),
('bed_f4', 'ward_female', 'Female Bed 04', 'f1', 'clean'),
('bed_f5', 'ward_female', 'Female Bed 05', 'f1', 'clean'),
('bed_p1', 'ward_pediatric', 'Pediatric Bed 01', 'f1', 'clean'),
('bed_p2', 'ward_pediatric', 'Pediatric Bed 02', 'f1', 'clean'),
('bed_p3', 'ward_pediatric', 'Pediatric Bed 03', 'f1', 'clean')
ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- Performance Indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_pregnancies_patient ON public.pregnancies (patient_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_anc_visits_pregnancy ON public.anc_visits (pregnancy_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_fp_records_patient ON public.family_planning_records (patient_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_immunization_records_patient ON public.immunization_records (patient_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_admissions_patient ON public.inpatient_admissions (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_registrations_patient ON public.emergency_registrations (patient_id, priority_level);
CREATE INDEX IF NOT EXISTS idx_instrument_usage_logs ON public.instrument_usage_logs (instrument_id, facility_id);
