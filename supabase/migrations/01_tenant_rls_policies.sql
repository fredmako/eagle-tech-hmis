-- ====================================================
-- EAGLE TECH HMIS - ROW-LEVEL SECURITY (RLS) POLICIES
-- ====================================================

-- Helper function to get authenticated facility_id from JWT claims or app session
CREATE OR REPLACE FUNCTION public.current_facility_id()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'facility_id',
    current_setting('app.current_facility_id', true)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin',
    false
  );
END;
$$ LANGUAGE plpgsql STABLE;


-- 1. Enable RLS on core tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;


-- 2. Facilities Policies
CREATE POLICY facilities_tenant_isolation ON public.facilities
    FOR ALL
    USING (id = public.current_facility_id() OR public.is_super_admin());


-- 3. Profiles Policies
CREATE POLICY profiles_tenant_isolation ON public.profiles
    FOR ALL
    USING (facility_id = public.current_facility_id() OR id = auth.uid()::text OR public.is_super_admin());


-- 4. Patients Policies
CREATE POLICY patients_tenant_isolation ON public.patients
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 5. Visits Policies
CREATE POLICY visits_tenant_isolation ON public.visits
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 6. Triages Policies
CREATE POLICY triages_tenant_isolation ON public.triages
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 7. Consultations Policies
CREATE POLICY consultations_tenant_isolation ON public.consultations
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 8. Orders Policies
CREATE POLICY orders_tenant_isolation ON public.orders
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 9. Invoices Policies
CREATE POLICY invoices_tenant_isolation ON public.invoices
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 10. Audit Logs Policies
CREATE POLICY audit_logs_tenant_isolation ON public.audit_logs
    FOR ALL
    USING (facility_id = public.current_facility_id() OR public.is_super_admin());


-- 11. Role Requests Policies
CREATE POLICY role_requests_tenant_isolation ON public.role_requests
    FOR ALL
    USING (facility_id = public.current_facility_id() OR user_id = auth.uid()::text OR public.is_super_admin());
