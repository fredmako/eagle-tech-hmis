-- Drop existing primary key and unique email constraints on profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Clean up null values and enforce NOT NULL constraints
UPDATE public.profiles SET facility_id = 'f1' WHERE facility_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN facility_id SET NOT NULL;

-- Add new composite primary key to allow a user ID to belong to multiple facilities
ALTER TABLE public.profiles ADD PRIMARY KEY (id, facility_id);
