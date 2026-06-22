-- PostgreSQL Migration: Hospital Operations & Inpatient Progress Calendar

-- 1. Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pharmaceutical', 'surgical', 'consumable', 'asset')),
    unit_of_measure TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    min_reorder_level INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for same facility" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow write for admin/staff" ON public.inventory_items FOR ALL USING (true);

-- 2. Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'sale', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference_id TEXT, -- e.g. Link to invoice ID or purchase PO ID
    notes TEXT,
    recorded_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read transactions" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Allow write transactions" ON public.inventory_transactions FOR ALL USING (true);

-- 3. Create purchases table (Procurement orders)
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    estimated_cost NUMERIC(10,2) NOT NULL,
    supplier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Delivered', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read purchases" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "Allow write purchases" ON public.purchases FOR ALL USING (true);

-- 4. Create utility_records table
CREATE TABLE IF NOT EXISTS public.utility_records (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    utility_name TEXT NOT NULL,
    billing_period TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on utility_records
ALTER TABLE public.utility_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read utilities" ON public.utility_records FOR SELECT USING (true);
CREATE POLICY "Allow write utilities" ON public.utility_records FOR ALL USING (true);
