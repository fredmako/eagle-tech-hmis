-- Migration 09: Create Universal Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id text PRIMARY KEY,
    user_name text NOT NULL,
    user_email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending', -- 'pending', 'addressed'
    response text,
    created_at timestamp with time zone DEFAULT now()
);

-- Disable Row Level Security to make it accessible to public submissions
ALTER TABLE IF EXISTS public.support_tickets DISABLE ROW LEVEL SECURITY;
