-- Migration 08: Bed Layout Coordinates & Room Configuration
ALTER TABLE public.bed_allocations
ADD COLUMN IF NOT EXISTS x_position integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS y_position integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotation integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS room_name text DEFAULT 'Room 1';
