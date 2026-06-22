-- Drop existing primary key and unique email constraints on profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Add new composite primary key to allow a user ID to belong to multiple facilities
ALTER TABLE public.profiles ADD PRIMARY KEY (id, facility_id);
