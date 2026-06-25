-- Migration 24: Add Geofencing Columns to Facilities and Attendance Logs
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;

ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS clock_in_latitude numeric;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS clock_in_longitude numeric;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS clock_out_latitude numeric;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS clock_out_longitude numeric;
