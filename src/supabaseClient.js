import { createClient } from '@supabase/supabase-js';

// Read keys from environment (Vite prefixes them with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we should use the real Supabase client
const isRealSupabase = supabaseUrl && supabaseAnonKey;

// --- Local Storage Sandbox Database Engine ---
const MOCK_STORAGE_KEY = 'egesa_health_mock_db';

const getInitialMockData = () => {
  const defaultFacilities = [
    { id: 'f1', name: 'Egesa Medical Clinic', code: 'EMC-001' },
    { id: 'f2', name: 'Meso Referral Hospital', code: 'MRH-002' }
  ];

  const defaultProfiles = [
    { id: 'u1', full_name: 'Dr. Arthur Conan', role: 'clinician', facility_id: 'f1' },
    { id: 'u2', full_name: 'Nurse Jane Doe', role: 'nurse', facility_id: 'f1' },
    { id: 'u3', full_name: 'Alice Cooper (Receptionist)', role: 'receptionist', facility_id: 'f1' },
    { id: 'u4', full_name: 'Dr. Lab Tech Terry', role: 'lab_tech', facility_id: 'f1' },
    { id: 'u5', full_name: 'Pharmacist Bob', role: 'pharmacist', facility_id: 'f1' },
    { id: 'u6', full_name: 'Cashier Mary', role: 'cashier', facility_id: 'f1' },
    { id: 'u7', full_name: 'Admin Grace', role: 'admin', facility_id: 'f1' }
  ];

  const defaultPatients = [
    {
      id: 'p1',
      facility_id: 'f1',
      name: 'John Mwangi',
      dob: '1988-05-14',
      gender: 'male',
      national_id: '29384758',
      facility_id_code: 'EMC-PT-001',
      phone: '0712345678',
      next_of_kin_name: 'Sarah Mwangi',
      next_of_kin_phone: '0787654321',
      next_of_kin_relation: 'spouse',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'p2',
      facility_id: 'f1',
      name: 'Mary Achieng',
      dob: '1995-11-23',
      gender: 'female',
      national_id: '30495867',
      facility_id_code: 'EMC-PT-002',
      phone: '0722334455',
      next_of_kin_name: 'Peter Omondi',
      next_of_kin_phone: '0799887766',
      next_of_kin_relation: 'brother',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  const defaultVisits = [
    {
      id: 'v1',
      patient_id: 'p1',
      facility_id: 'f1',
      department: 'triage',
      priority: 'routine',
      status: 'waiting',
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'v2',
      patient_id: 'p2',
      facility_id: 'f1',
      department: 'consultation',
      priority: 'urgent',
      status: 'in_progress',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  const defaultTriages = [
    {
      id: 't_v2',
      visit_id: 'v2',
      systolic: 135,
      diastolic: 85,
      heart_rate: 82,
      temperature: 38.5,
      resp_rate: 18,
      spo2: 97,
      weight: 68,
      height: 1.72,
      bmi: 23.0,
      chief_complaint: 'Severe headache and high fever for 3 days.',
      priority_flag: 'yellow',
      risk_indicators: 'Fever',
      created_at: new Date(Date.now() - 3000000).toISOString()
    }
  ];

  const defaultConsultations = [];
  const defaultOrders = [];
  const defaultInvoices = [];
  const defaultAuditLogs = [
    { id: 'log1', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient John Mwangi (EMC-PT-001)', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'log2', facility_id: 'f1', user_id: 'u3', action: 'Queue Ticket', details: 'Opened Triage visit for patient John Mwangi', created_at: new Date(Date.now() - 1800000).toISOString() }
  ];

  return {
    facilities: defaultFacilities,
    profiles: defaultProfiles,
    patients: defaultPatients,
    visits: defaultVisits,
    triages: defaultTriages,
    consultations: defaultConsultations,
    orders: defaultOrders,
    invoices: defaultInvoices,
    audit_logs: defaultAuditLogs
  };
};

// State loader
const loadMockDB = () => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    const initial = getInitialMockData();
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const saveMockDB = (db) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
};

// Mock Query Builder (Supports select, eq, order)
class MockQueryBuilder {
  constructor(tableName, db, resolveFn) {
    this.tableName = tableName;
    this.db = db;
    this.resolveFn = resolveFn;
    this.filters = [];
    this.orderByField = null;
    this.orderByAsc = true;
  }

  select(columns = '*') {
    return this;
  }

  eq(column, value) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderByField = column;
    this.orderByAsc = ascending;
    return this;
  }

  async then(resolve) {
    try {
      let data = [...(this.db[this.tableName] || [])];
      
      // Apply filters
      for (const filter of this.filters) {
        data = data.filter(filter);
      }
      
      // Apply sorting
      if (this.orderByField) {
        data.sort((a, b) => {
          let valA = a[this.orderByField];
          let valB = b[this.orderByField];
          
          if (typeof valA === 'string') {
            return this.orderByAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          if (valA < valB) return this.orderByAsc ? -1 : 1;
          if (valA > valB) return this.orderByAsc ? 1 : -1;
          return 0;
        });
      }
      
      resolve({ data, error: null });
    } catch (err) {
      resolve({ data: null, error: err.message });
    }
  }
}

// Mock Table Engine
class MockTable {
  constructor(tableName) {
    this.tableName = tableName;
  }

  select(columns = '*') {
    const db = loadMockDB();
    return new MockQueryBuilder(this.tableName, db);
  }

  insert(rows) {
    const db = loadMockDB();
    const dataRows = Array.isArray(rows) ? rows : [rows];
    const newItems = dataRows.map((row) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      ...row
    }));

    db[this.tableName] = [...(db[this.tableName] || []), ...newItems];
    saveMockDB(db);

    // Auto record audit log (except for audit log itself)
    if (this.tableName !== 'audit_logs') {
      const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
      const logEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        facility_id: activeUser?.facility_id || 'f1',
        user_id: activeUser?.id || 'system',
        action: `Insert: ${this.tableName}`,
        details: `Inserted data into ${this.tableName}: ${JSON.stringify(rowDetailsSummary(this.tableName, newItems))}`
      };
      db.audit_logs = [...(db.audit_logs || []), logEntry];
      saveMockDB(db);
    }

    return {
      select: () => ({
        then: (resolve) => resolve({ data: Array.isArray(rows) ? newItems : newItems[0], error: null })
      }),
      then: (resolve) => resolve({ data: Array.isArray(rows) ? newItems : newItems[0], error: null })
    };
  }

  update(values) {
    return {
      eq: (column, value) => {
        const db = loadMockDB();
        const table = db[this.tableName] || [];
        
        let updatedItems = [];
        db[this.tableName] = table.map((item) => {
          if (item[column] === value) {
            const updated = { ...item, ...values };
            updatedItems.push(updated);
            return updated;
          }
          return item;
        });
        
        saveMockDB(db);

        // Auto audit log
        if (this.tableName !== 'audit_logs' && updatedItems.length > 0) {
          const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
          const logEntry = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            created_at: new Date().toISOString(),
            facility_id: activeUser?.facility_id || 'f1',
            user_id: activeUser?.id || 'system',
            action: `Update: ${this.tableName}`,
            details: `Updated ${this.tableName} where ${column} = ${value} with values: ${JSON.stringify(values)}`
          };
          db.audit_logs = [...(db.audit_logs || []), logEntry];
          saveMockDB(db);
        }

        return {
          then: (resolve) => resolve({ data: updatedItems, error: null })
        };
      }
    };
  }

  delete() {
    return {
      eq: (column, value) => {
        const db = loadMockDB();
        const table = db[this.tableName] || [];
        const filtered = table.filter((item) => item[column] !== value);
        
        db[this.tableName] = filtered;
        saveMockDB(db);

        // Auto audit log
        if (this.tableName !== 'audit_logs') {
          const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
          const logEntry = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            created_at: new Date().toISOString(),
            facility_id: activeUser?.facility_id || 'f1',
            user_id: activeUser?.id || 'system',
            action: `Delete: ${this.tableName}`,
            details: `Deleted from ${this.tableName} where ${column} = ${value}`
          };
          db.audit_logs = [...(db.audit_logs || []), logEntry];
          saveMockDB(db);
        }

        return {
          then: (resolve) => resolve({ data: null, error: null })
        };
      }
    };
  }
}

// Utility to summarize row details for logging
const rowDetailsSummary = (tableName, items) => {
  if (items.length === 0) return '';
  const first = items[0];
  if (tableName === 'patients') return `Patient ${first.name} (${first.facility_id_code})`;
  if (tableName === 'visits') return `Visit directed to ${first.department} with priority ${first.priority}`;
  if (tableName === 'triages') return `Triage Vitals - Temp: ${first.temperature}, BP: ${first.systolic}/${first.diastolic}`;
  if (tableName === 'consultations') return `Diagnosis: ${first.diagnosis_icd10}`;
  if (tableName === 'orders') return `${first.type.toUpperCase()} order: ${first.item_name}`;
  if (tableName === 'invoices') return `Invoice totaling ${first.total_amount}`;
  return `ID: ${first.id}`;
};

// Mock Auth system
const mockAuth = {
  signInWithPassword: async ({ email, password }) => {
    // We allow logging in with any user profile from our DB
    const db = loadMockDB();
    // Simulate simple matching based on user role or full name keywords
    const users = db.profiles;
    // We'll match email username (e.g. receptionist@egesa.com -> matches receptionist role)
    const username = email.split('@')[0].toLowerCase();
    const user = users.find(u => u.role === username || u.full_name.toLowerCase().includes(username));
    
    if (user) {
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(user));
      // Log the login event
      const logEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Authentication',
        details: `${user.full_name} logged in successfully as ${user.role.toUpperCase()}`
      };
      db.audit_logs = [...(db.audit_logs || []), logEntry];
      saveMockDB(db);

      return { data: { user: { id: user.id, email, user_metadata: { full_name: user.full_name, role: user.role } } }, error: null };
    }
    return { data: null, error: 'Invalid login credentials. Tip: Use role name as username (e.g. nurse@egesa.com, clinician@egesa.com, receptionist@egesa.com, admin@egesa.com) with any password.' };
  },
  
  signOut: async () => {
    const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
    if (activeUser) {
      const db = loadMockDB();
      const logEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        facility_id: activeUser.facility_id,
        user_id: activeUser.id,
        action: 'Authentication',
        details: `${activeUser.full_name} logged out`
      };
      db.audit_logs = [...(db.audit_logs || []), logEntry];
      saveMockDB(db);
    }
    sessionStorage.removeItem('egesa_health_active_user');
    return { error: null };
  },
  
  getUser: async () => {
    const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
    if (activeUser) {
      return { data: { user: { id: activeUser.id, user_metadata: { full_name: activeUser.full_name, role: activeUser.role } } }, error: null };
    }
    return { data: { user: null }, error: null };
  }
};

// Exported Client
export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: mockAuth,
      from: (tableName) => new MockTable(tableName),
      isSandbox: true
    };
