import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enable Sandbox Mode if Supabase environment variables are not supplied
const isRealSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
supabase.isSandbox = !isRealSupabase;

// Global Tenant Isolation / Multi-Facility Interceptor Layer
const originalFrom = supabase.from;
supabase.from = function (table) {
  const queryBuilder = originalFrom.call(supabase, table);

  // Helper to extract active facility details from local auth session
  const getActiveFacilityInfo = () => {
    try {
      const storedUser = sessionStorage.getItem('egesa_health_active_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return {
          facilityId: parsed?.facility_id || null,
          isSuperAdmin: parsed?.role === 'super_admin'
        };
      }
    } catch (e) {
      console.warn('[Tenant Interceptor] Error parsing user details:', e);
    }
    return { facilityId: null, isSuperAdmin: false };
  };

  const tenantTables = [
    'patients', 'visits', 'invoices', 'orders', 'bed_allocations', 
    'admissions', 'appointments', 'support_tickets', 'audit_logs',
    'lab_test_categories', 'lab_test_units', 'lab_specimen_tests', 
    'lab_specimen_sub_tests', 'lab_reference_ranges',
    'payroll_allowances', 'payroll_banks', 'payroll_deductions', 'payrolls',
    'patient_registrations', 'medication_stock', 'prescriptions',
    'role_requests', 'invitations', 'triages', 'triage_assessments',
    'emergency_registrations', 'duty_rosters', 'attendance_logs',
    'staff_access_archives', 'sha_claim_documents'
  ];

  const applyTenantFilter = (builder) => {
    if (!builder) return builder;
    const { facilityId, isSuperAdmin } = getActiveFacilityInfo();
    if (facilityId && !isSuperAdmin && tenantTables.includes(table)) {
      return builder.eq('facility_id', facilityId);
    }
    return builder;
  };

  // Wrap select
  const originalSelect = queryBuilder.select;
  if (originalSelect) {
    queryBuilder.select = function (...args) {
      const builder = originalSelect.apply(this, args);
      return applyTenantFilter(builder);
    };
  }

  // Wrap update
  const originalUpdate = queryBuilder.update;
  if (originalUpdate) {
    queryBuilder.update = function (...args) {
      const builder = originalUpdate.apply(this, args);
      return applyTenantFilter(builder);
    };
  }

  // Wrap delete
  const originalDelete = queryBuilder.delete;
  if (originalDelete) {
    queryBuilder.delete = function (...args) {
      const builder = originalDelete.apply(this, args);
      return applyTenantFilter(builder);
    };
  }

  // Wrap insert
  const originalInsert = queryBuilder.insert;
  if (originalInsert) {
    queryBuilder.insert = function (values, options) {
      const { facilityId } = getActiveFacilityInfo();
      if (facilityId && tenantTables.includes(table)) {
        if (Array.isArray(values)) {
          values = values.map(v => ({ facility_id: facilityId, ...v }));
        } else if (values && typeof values === 'object') {
          values = { facility_id: facilityId, ...values };
        }
      }
      return originalInsert.call(this, values, options);
    };
  }

  // Wrap upsert
  const originalUpsert = queryBuilder.upsert;
  if (originalUpsert) {
    queryBuilder.upsert = function (values, options) {
      const { facilityId } = getActiveFacilityInfo();
      if (facilityId && tenantTables.includes(table)) {
        if (Array.isArray(values)) {
          values = values.map(v => ({ facility_id: facilityId, ...v }));
        } else if (values && typeof values === 'object') {
          values = { facility_id: facilityId, ...values };
        }
      }
      return originalUpsert.call(this, values, options);
    };
  }

  return queryBuilder;
};

export default supabase;
