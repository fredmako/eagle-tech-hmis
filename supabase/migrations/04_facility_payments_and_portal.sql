-- ====================================================
-- EAGLE TECH HMIS - PAYMENT GATEWAYS, PORTAL, AND LANDING PAGES
-- ====================================================

-- 1. Add settings and config columns to public.facilities
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS stripe_publishable_key text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS stripe_secret_key text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS paypal_client_id text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS paypal_client_secret text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS whatsapp_welcome_message text DEFAULT 'Hello, welcome to our facility!';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS services_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS about_us text DEFAULT 'Providing premium healthcare services to our community.';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS subdomain_prefix text;

-- 2. Seed services list for default facility 'f1'
UPDATE public.facilities SET 
  subdomain_prefix = 'egesa-medical',
  about_us = 'Eagle Tech Medical Clinic is Nairobi''s leading family medical center offering out-patient care, laboratory tests, immunization schedules, and minor theatre surgeries.',
  whatsapp_number = '254712345678',
  services_list = '[
    {"name": "General Outpatient Consultation", "category": "Consultation", "charge": 1000},
    {"name": "Comprehensive Lab Panel", "category": "Lab", "charge": 3500},
    {"name": "Pediatric Vaccination Package", "category": "Immunization", "charge": 1500},
    {"name": "Standard ANC Antenatal Care Checkup", "category": "ANC", "charge": 2000},
    {"name": "Inpatient Admission Ward Bed (Daily)", "category": "Ward", "charge": 4000}
  ]'::jsonb
WHERE id = 'f1';

-- 3. Add transactional payment tracing columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paypal_order_id text;
