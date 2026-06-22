-- Migration 11: Create Notifications, Duty Rosters, and Attendance Logs Tables

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id text PRIMARY KEY,
    user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_role text,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. Create Duty Rosters Table
CREATE TABLE IF NOT EXISTS public.duty_rosters (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    user_id text NOT NULL, -- references profiles(id) (composite key compat)
    day_of_week text NOT NULL, -- "Monday", "Tuesday", etc.
    shift_type text NOT NULL, -- "Morning", "Afternoon", "Night", "On-Call"
    department text NOT NULL, -- "triage", "consultation", "lab", etc.
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.duty_rosters DISABLE ROW LEVEL SECURITY;

-- 3. Create Attendance Logs Table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id text PRIMARY KEY,
    facility_id text REFERENCES public.facilities(id) ON DELETE CASCADE,
    user_id text NOT NULL, -- references profiles(id)
    clock_in timestamp with time zone NOT NULL,
    clock_out timestamp with time zone,
    status text NOT NULL, -- "On-Time", "Late", "Early Departure", etc.
    notes text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE IF EXISTS public.attendance_logs DISABLE ROW LEVEL SECURITY;
