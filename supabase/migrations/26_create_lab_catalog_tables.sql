-- Facility-scoped laboratory catalog configuration tables

CREATE TABLE IF NOT EXISTS public.lab_test_categories (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_test_categories_facility_name_idx
  ON public.lab_test_categories (facility_id, lower(name));

CREATE TABLE IF NOT EXISTS public.sample_specimens (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  category text,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sample_specimens_facility_category_name_idx
  ON public.sample_specimens (facility_id, category, lower(name));

CREATE TABLE IF NOT EXISTS public.lab_test_units (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_test_units_facility_name_idx
  ON public.lab_test_units (facility_id, lower(name));

CREATE TABLE IF NOT EXISTS public.lab_specimen_tests (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  category text,
  specimen text,
  procedure_classification text,
  country text DEFAULT 'Kenya',
  result_type text,
  unit text,
  name text NOT NULL,
  is_sha_pay boolean NOT NULL DEFAULT false,
  sha_test_code text,
  description text,
  cash_amount numeric(12, 2) NOT NULL DEFAULT 0,
  insurance_amount numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  etims_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_specimen_tests_facility_category_name_idx
  ON public.lab_specimen_tests (facility_id, category, lower(name));

CREATE TABLE IF NOT EXISTS public.lab_specimen_sub_tests (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  test_id text,
  name text NOT NULL,
  description text,
  result_type text,
  unit text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_specimen_sub_tests_facility_test_name_idx
  ON public.lab_specimen_sub_tests (facility_id, test_id, lower(name));

CREATE TABLE IF NOT EXISTS public.lab_reference_ranges (
  id text PRIMARY KEY,
  facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
  sub_test_id text,
  gender text NOT NULL DEFAULT 'All',
  age_min numeric(6, 2),
  age_max numeric(6, 2),
  min_value numeric(14, 4),
  max_value numeric(14, 4),
  normal_text text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_reference_ranges_facility_sub_test_idx
  ON public.lab_reference_ranges (facility_id, sub_test_id);

ALTER TABLE IF EXISTS public.lab_test_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sample_specimens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_test_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_specimen_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_specimen_sub_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_reference_ranges DISABLE ROW LEVEL SECURITY;
