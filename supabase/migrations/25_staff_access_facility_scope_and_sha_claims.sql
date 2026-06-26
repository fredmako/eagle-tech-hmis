-- Staff access lifecycle, facility-scoped invites/requests, and SHA claim document support

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS blockchain_wallet_address text;

UPDATE public.profiles
SET access_status = 'active'
WHERE access_status IS NULL;

CREATE INDEX IF NOT EXISTS profiles_facility_access_status_idx
  ON public.profiles (facility_id, access_status);

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS mail_error text,
  ADD COLUMN IF NOT EXISTS mail_sent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS invitations_facility_email_status_idx
  ON public.invitations (facility_id, lower(email), status);

CREATE INDEX IF NOT EXISTS role_requests_facility_email_status_idx
  ON public.role_requests (facility_id, lower(email), status);

CREATE TABLE IF NOT EXISTS public.staff_access_archives (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE SET NULL,
  profile_id text NOT NULL,
  email text,
  full_name text,
  role text,
  department text,
  phone text,
  blockchain_wallet_address text,
  archived_by text,
  archive_reason text,
  archived_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  snapshot jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS staff_access_archives_facility_email_idx
  ON public.staff_access_archives (facility_id, lower(email));

CREATE TABLE IF NOT EXISTS public.sha_claim_documents (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id text REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_id text REFERENCES public.visits(id) ON DELETE SET NULL,
  invoice_id text REFERENCES public.invoices(id) ON DELETE SET NULL,
  claim_reference text,
  sha_member_number text,
  claim_form_url text,
  diagnosis_report_url text,
  invoice_url text,
  discharge_summary_url text,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb DEFAULT '{}'::jsonb,
  submitted_by text,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sha_claim_documents_facility_status_idx
  ON public.sha_claim_documents (facility_id, status, created_at DESC);

ALTER TABLE IF EXISTS public.staff_access_archives DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sha_claim_documents DISABLE ROW LEVEL SECURITY;

INSERT INTO public.profiles (
  id,
  full_name,
  role,
  facility_id,
  email,
  access_status,
  blockchain_wallet_address
)
VALUES (
  'u7',
  'Admin Grace',
  'admin',
  'f1',
  'admin@egesa.com',
  'active',
  ''
)
ON CONFLICT (id, facility_id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    access_status = 'active';
