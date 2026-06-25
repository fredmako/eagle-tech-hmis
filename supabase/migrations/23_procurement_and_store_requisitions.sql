-- 23_procurement_and_store_requisitions.sql

-- 1. Suppliers Registry Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_pin TEXT, -- For tax compliance / eTIMS
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow write suppliers" ON public.suppliers FOR ALL USING (true);

-- 2. Local Purchase Orders (LPO) Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY, -- LPO Number e.g. LPO-2026-XXXX
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    requesting_store TEXT NOT NULL DEFAULT 'MAIN STORE',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'delivered', 'rejected')),
    created_by TEXT REFERENCES public.profiles(id),
    approved_by TEXT REFERENCES public.profiles(id),
    estimated_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read POs" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow write POs" ON public.purchase_orders FOR ALL USING (true);

-- 3. LPO Items Table (One-to-many relationship)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id TEXT PRIMARY KEY,
    po_id TEXT REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read PO items" ON public.purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Allow write PO items" ON public.purchase_order_items FOR ALL USING (true);

-- 4. Store-to-Store Requisitions Table
CREATE TABLE IF NOT EXISTS public.store_requisitions (
    id TEXT PRIMARY KEY, -- Req Number e.g. REQ-2026-XXXX
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    requesting_store TEXT NOT NULL, -- e.g. 'PHARMACY STORE', 'LABORATORY'
    supplying_store TEXT NOT NULL DEFAULT 'MAIN STORE',
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed')),
    raised_by TEXT REFERENCES public.profiles(id),
    approved_by TEXT REFERENCES public.profiles(id),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read requisitions" ON public.store_requisitions FOR SELECT USING (true);
CREATE POLICY "Allow write requisitions" ON public.store_requisitions FOR ALL USING (true);

-- 5. Store Requisition Items Table
CREATE TABLE IF NOT EXISTS public.store_requisition_items (
    id TEXT PRIMARY KEY,
    requisition_id TEXT REFERENCES public.store_requisitions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.store_requisition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read req items" ON public.store_requisition_items FOR SELECT USING (true);
CREATE POLICY "Allow write req items" ON public.store_requisition_items FOR ALL USING (true);

-- 6. Stock Receipts / LPO Deliveries Log Table
CREATE TABLE IF NOT EXISTS public.stock_receipts (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES public.facilities(id) ON DELETE CASCADE,
    po_id TEXT REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    received_by TEXT REFERENCES public.profiles(id),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed')),
    confirmed_by TEXT REFERENCES public.profiles(id),
    etims_sync_status TEXT DEFAULT 'pending' CHECK (etims_sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read receipts" ON public.stock_receipts FOR SELECT USING (true);
CREATE POLICY "Allow write receipts" ON public.stock_receipts FOR ALL USING (true);

-- 7. Stock Receipt Items Table
CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT REFERENCES public.stock_receipts(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL,
    buy_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    store_name TEXT NOT NULL DEFAULT 'MAIN STORE' -- Store receiving the goods
);
ALTER TABLE public.stock_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read receipt items" ON public.stock_receipt_items FOR SELECT USING (true);
CREATE POLICY "Allow write receipt items" ON public.stock_receipt_items FOR ALL USING (true);
