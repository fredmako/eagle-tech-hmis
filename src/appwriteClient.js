import { Client, ID, Account } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';

const isRealAppwrite = projectId && projectId.trim() !== '';

// Initialize Appwrite Client if credentials exist
let client = null;
let account = null;

if (isRealAppwrite) {
  client = new Client();
  client.setEndpoint(endpoint).setProject(projectId);
  account = new Account(client);
}

// --- Local Storage Sandbox Database Engine (Fallback) ---
const MOCK_STORAGE_KEY = 'egesa_health_mock_db';

const getInitialMockData = () => {
  const defaultFacilities = [
    { id: 'f1', name: 'Eagle Tech Medical Clinic', code: 'EMC-001' },
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
      dob: '1985-05-14',
      gender: 'male',
      national_id: '29384758',
      facility_id_code: 'EMC-PT-001',
      phone: JSON.stringify({
        phone: '0712345678',
        email: 'john.mwangi@eagletechsolutions.tech',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'Kawangware Estate',
        landmark: 'Near Stage 56',
        marital_status: 'married'
      }),
      next_of_kin_name: 'Sarah Mwangi',
      next_of_kin_phone: '0787654321',
      next_of_kin_relation: 'spouse',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
    },
    {
      id: 'p2',
      facility_id: 'f1',
      name: 'Mary Achieng',
      dob: '1995-11-23',
      gender: 'female',
      national_id: '30495867',
      facility_id_code: 'EMC-PT-002',
      phone: JSON.stringify({
        phone: '0722334455',
        email: 'mary.achieng@eagletechsolutions.tech',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'Kibera Lindi',
        landmark: 'Lindi Primary School',
        marital_status: 'single'
      }),
      next_of_kin_name: 'Peter Omondi',
      next_of_kin_phone: '0799887766',
      next_of_kin_relation: 'brother',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
    },
    {
      id: 'p3',
      facility_id: 'f1',
      name: 'Baby Ethan Mwangi',
      dob: '2024-03-12',
      gender: 'male',
      national_id: null,
      facility_id_code: 'EMC-PT-003',
      phone: JSON.stringify({
        phone: '0712345678',
        email: 'john.mwangi@eagletechsolutions.tech',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'Kawangware Estate',
        landmark: 'Near Stage 56',
        marital_status: 'single'
      }),
      next_of_kin_name: 'John Mwangi',
      next_of_kin_phone: '0712345678',
      next_of_kin_relation: 'parent',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'p4',
      facility_id: 'f1',
      name: 'Grace Wambui',
      dob: '1998-04-12',
      gender: 'female',
      national_id: '35496874',
      facility_id_code: 'EMC-PT-004',
      phone: JSON.stringify({
        phone: '0733445566',
        email: 'grace.wambui@egesa.com',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'Kariakor Estate',
        landmark: 'Kariakor Market',
        marital_status: 'married',
        parity: 1,
        gravidae: 2,
        lmp: '2026-01-15',
        edd: '2026-10-22'
      }),
      next_of_kin_name: 'Peter Wambui',
      next_of_kin_phone: '0755443322',
      next_of_kin_relation: 'spouse',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    },
    {
      id: 'p5',
      facility_id: 'f1',
      name: 'Faith Mutua',
      dob: '2001-09-05',
      gender: 'female',
      national_id: '38294715',
      facility_id_code: 'EMC-PT-005',
      phone: JSON.stringify({
        phone: '0744556677',
        email: 'faith.mutua@egesa.com',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'South B',
        landmark: 'Shopping Center',
        marital_status: 'single'
      }),
      next_of_kin_name: 'Mercy Mutua',
      next_of_kin_phone: '0799887766',
      next_of_kin_relation: 'sibling',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
    },
    {
      id: 'p6',
      facility_id: 'f1',
      name: 'David Kiprop',
      dob: '1975-07-20',
      gender: 'male',
      national_id: '20194837',
      facility_id_code: 'EMC-PT-006',
      phone: JSON.stringify({
        phone: '0755667788',
        email: 'david.kiprop@egesa.com',
        preferences: { lab: true, pharmacy: true, billing: true },
        village: 'Westlands',
        landmark: 'Sarit Centre',
        marital_status: 'married'
      }),
      next_of_kin_name: 'Jane Kiprop',
      next_of_kin_phone: '0788776655',
      next_of_kin_relation: 'spouse',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
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
    },
    {
      id: 'v3',
      patient_id: 'p3',
      facility_id: 'f1',
      department: 'completed',
      priority: 'routine',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'v4',
      patient_id: 'p4',
      facility_id: 'f1',
      department: 'completed',
      priority: 'routine',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'v5',
      patient_id: 'p5',
      facility_id: 'f1',
      department: 'completed',
      priority: 'routine',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
    },
    {
      id: 'v6',
      patient_id: 'p6',
      facility_id: 'f1',
      department: 'completed',
      priority: 'routine',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
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
    },
    {
      id: 't_v3',
      visit_id: 'v3',
      systolic: null,
      diastolic: null,
      heart_rate: 110,
      temperature: 38.9,
      resp_rate: 28,
      spo2: 96,
      weight: 12.5,
      height: 0.85,
      bmi: 17.3,
      chief_complaint: 'Fever and diarrhea for 2 days. Lethargic child.',
      priority_flag: 'yellow',
      risk_indicators: 'Dehydration',
      created_at: new Date(Date.now() - 3600000 * 2.2).toISOString()
    },
    {
      id: 't_v4',
      visit_id: 'v4',
      systolic: 110,
      diastolic: 70,
      heart_rate: 76,
      temperature: 36.6,
      resp_rate: 16,
      spo2: 99,
      weight: 62.0,
      height: 1.60,
      bmi: 24.2,
      chief_complaint: 'Routine ANC visit (2nd visit). Gestation 20 weeks.',
      priority_flag: 'green',
      risk_indicators: 'Pregnant (LMP: 2026-01-15)',
      created_at: new Date(Date.now() - 3600000 * 24 * 2.1).toISOString()
    },
    {
      id: 't_v5',
      visit_id: 'v5',
      systolic: 120,
      diastolic: 80,
      heart_rate: 72,
      temperature: 36.7,
      resp_rate: 16,
      spo2: 98,
      weight: 58.0,
      height: 1.65,
      bmi: 21.3,
      chief_complaint: 'Wants DMPA family planning renewal.',
      priority_flag: 'green',
      risk_indicators: 'Family Planning',
      created_at: new Date(Date.now() - 3600000 * 24 * 4.1).toISOString()
    },
    {
      id: 't_v6',
      visit_id: 'v6',
      systolic: 128,
      diastolic: 82,
      heart_rate: 88,
      temperature: 38.6,
      resp_rate: 18,
      spo2: 97,
      weight: 75.0,
      height: 1.78,
      bmi: 23.7,
      chief_complaint: 'Fever, chills, headache for 4 days.',
      priority_flag: 'yellow',
      risk_indicators: 'High fever',
      created_at: new Date(Date.now() - 3600000 * 4.2).toISOString()
    }
  ];

  const defaultConsultations = [
    {
      id: 'c3',
      visit_id: 'v3',
      history: 'Mother reports hotness of body and watery loose stools for two days. Vomits when feeding.',
      examination: 'Sunken eyes, tearless crying, skin pinch goes back slowly.',
      diagnosis_icd10: 'Gastroenteritis (A09)',
      treatment_plan: 'Oral Rehydration Salts (ORS) + Zinc tablets. Advised to breastfeed continuously.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'c4',
      visit_id: 'v4',
      history: 'G2P1. LMP 2026-01-15. No vaginal bleeding, no lower abdominal pain.',
      examination: 'Fundal height at umbilicus. Fetal heart rate regular at 144 bpm. Breast exam normal.',
      diagnosis_icd10: 'Antenatal Care (Z34.9)',
      treatment_plan: 'Issued Fefol tablets. Scheduled next ANC visit in 4 weeks.',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'c5',
      visit_id: 'v5',
      history: 'Re-visit for contraceptive injection. Has used DMPA for 1 year without side effects.',
      examination: 'Weight stable. Blood pressure normal.',
      diagnosis_icd10: 'Family Planning (Z30.0)',
      treatment_plan: 'Administer DMPA 150mg IM. Next visit scheduled in 12 weeks.',
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
    },
    {
      id: 'c6',
      visit_id: 'v6',
      history: 'Patient presents with persistent fever, sweating, chills and joint pains.',
      examination: 'BP 128/82. Mild abdominal tenderness. Warm to touch.',
      diagnosis_icd10: 'Malaria (B54)',
      treatment_plan: 'Ordered lab tests (Malaria RDT/BS). Patient sent to laboratory.',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  const defaultOrders = [
    {
      id: 'o_v3',
      visit_id: 'v3',
      type: 'prescription',
      item_name: 'ORS + Zinc',
      instructions: 'Dosage: 1 sachet + 10mg Zinc | Freq: 1x1 | Dur: 5 days',
      status: 'approved',
      price: 100,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'o_v4',
      visit_id: 'v4',
      type: 'prescription',
      item_name: 'Paracetamol 500mg',
      instructions: 'Dosage: 500mg | Freq: 3x1 | Dur: 3 days',
      status: 'approved',
      price: 50,
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'o_v5_rx',
      visit_id: 'v5',
      type: 'prescription',
      item_name: 'Paracetamol 500mg',
      instructions: 'Dosage: 500mg | Freq: 3x1 | Dur: 3 days',
      status: 'approved',
      price: 50,
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
    },
    {
      id: 'o_v5_fp',
      visit_id: 'v5',
      type: 'prescription',
      item_name: 'Injectables (DMPA)',
      instructions: 'Dosage: 150mg IM | Freq: Stat | Dur: 1 day',
      status: 'approved',
      price: 200,
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
    },
    {
      id: 'o_v6_lab',
      visit_id: 'v6',
      type: 'lab',
      item_name: 'Malaria BS/RDT',
      instructions: 'Blood smear for parasites',
      status: 'released',
      price: 150,
      results: JSON.stringify({
        values: 'Positive (Plasmodium falciparum ++)',
        specimen_type: 'Blood',
        specimen_condition: 'Good',
        collected_at: new Date(Date.now() - 3600000 * 4.1).toISOString(),
        processing_started_at: new Date(Date.now() - 3600000 * 4.0).toISOString(),
        completed_at: new Date(Date.now() - 3600000 * 3.8).toISOString(),
        processed_by: 'Arthur Conan',
        verifier: 'Arthur Conan'
      }),
      created_at: new Date(Date.now() - 3600000 * 4.2).toISOString()
    },
    {
      id: 'o_v6_rx',
      visit_id: 'v6',
      type: 'prescription',
      item_name: 'Artemether-Lumefantrine (AL)',
      instructions: 'Dosage: 20/120 | Freq: 2x1 | Dur: 3 days',
      status: 'approved',
      price: 450,
      created_at: new Date(Date.now() - 3600000 * 3.7).toISOString()
    }
  ];

  const defaultInvoices = [
    {
      id: 'inv_v3',
      visit_id: 'v3',
      total_amount: 100,
      amount_paid: 100,
      status: 'paid',
      created_at: new Date(Date.now() - 3600000 * 1.9).toISOString()
    },
    {
      id: 'inv_v4',
      visit_id: 'v4',
      total_amount: 50,
      amount_paid: 50,
      status: 'paid',
      created_at: new Date(Date.now() - 3600000 * 24 * 1.9).toISOString()
    },
    {
      id: 'inv_v5',
      visit_id: 'v5',
      total_amount: 250,
      amount_paid: 250,
      status: 'paid',
      created_at: new Date(Date.now() - 3600000 * 24 * 3.9).toISOString()
    },
    {
      id: 'inv_v6',
      visit_id: 'v6',
      total_amount: 600,
      amount_paid: 600,
      status: 'paid',
      created_at: new Date(Date.now() - 3600000 * 3.6).toISOString()
    }
  ];

  const defaultAuditLogs = [
    { id: 'log1', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient John Mwangi (EMC-PT-001)', created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString() },
    { id: 'log2', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient Mary Achieng (EMC-PT-002)', created_at: new Date(Date.now() - 3600000 * 24 * 9).toISOString() },
    { id: 'log3', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient Grace Wambui (EMC-PT-004)', created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { id: 'log4', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient Faith Mutua (EMC-PT-005)', created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
    { id: 'log5', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient David Kiprop (EMC-PT-006)', created_at: new Date(Date.now() - 3600000 * 4).toISOString() }
  ];

  const defaultRoleRequests = [
    {
      id: 'req1',
      user_id: 'u_req1',
      email: 'steve.jobs@eagletechsolutions.tech',
      full_name: 'Dr. Steve Jobs',
      facility_id: 'f1',
      requested_role: 'clinician',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'req2',
      user_id: 'u_req2',
      email: 'florence@eagletechsolutions.tech',
      full_name: 'Nurse Florence',
      facility_id: 'f1',
      requested_role: 'nurse',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
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
    audit_logs: defaultAuditLogs,
    role_requests: defaultRoleRequests
  };
};

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

const getActiveFacilityId = () => {
  const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
  return activeUser?.facility_id || null;
};

// --- Mock Query Builder ---
class MockQueryBuilder {
  constructor(tableName, db) {
    this.tableName = tableName;
    this.db = db;
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
      
      const globalTables = ['facilities', 'profiles'];
      const activeFacId = getActiveFacilityId();
      if (!globalTables.includes(this.tableName) && activeFacId) {
        data = data.filter((item) => item.facility_id === activeFacId);
      }

      for (const filter of this.filters) {
        data = data.filter(filter);
      }
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

// --- Appwrite Real Query Builder ---
class AppwriteQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.queries = [];
    this.orderByField = null;
    this.orderByAsc = true;
  }

  select(columns = '*') {
    return this;
  }

  eq(column, value) {
    this.queries.push({ type: 'equal', column, value });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderByField = column;
    this.orderByAsc = ascending;
    return this;
  }

  async then(resolve) {
    try {
      const token = localStorage.getItem('egesa_health_token');
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${backendUrl}/db/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          table: this.tableName,
          queries: this.queries,
          orderByField: this.orderByField,
          orderByAsc: this.orderByAsc
        })
      });
      
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Database query failed');
      }
      resolve({ data: resData.data, error: null });
    } catch (err) {
      resolve({ data: null, error: err.message });
    }
  }
}

// --- Table / Collection Class ---
class QueryTable {
  constructor(tableName) {
    this.tableName = tableName;
  }

  select(columns = '*') {
    if (isRealAppwrite) {
      return new AppwriteQueryBuilder(this.tableName).select(columns);
    } else {
      const db = loadMockDB();
      return new MockQueryBuilder(this.tableName, db).select(columns);
    }
  }

  insert(rows) {
    if (isRealAppwrite) {
      const execute = async () => {
        try {
          const token = localStorage.getItem('egesa_health_token');
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          
          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const res = await fetch(`${backendUrl}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              table: this.tableName,
              rows
            })
          });
          
          const resData = await res.json();
          if (!res.ok) {
            throw new Error(resData.error || 'Insert failed');
          }
          return { data: resData.data, error: null };
        } catch (err) {
          return { data: null, error: err.message };
        }
      };

      return {
        select: () => ({
          then: (resolve) => execute().then(resolve)
        }),
        then: (resolve) => execute().then(resolve)
      };
    } else {
      // Local Mock DB fallback
      const db = loadMockDB();
      const dataRows = Array.isArray(rows) ? rows : [rows];
      const activeFacId = getActiveFacilityId();

      const newItems = dataRows.map((row) => {
        const { id, created_at, ...cleanRow } = row;
        const globalTables = ['facilities', 'profiles'];
        if (!globalTables.includes(this.tableName) && activeFacId && !cleanRow.facility_id) {
          cleanRow.facility_id = activeFacId;
        }
        return {
          id: id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
          created_at: created_at || new Date().toISOString(),
          ...cleanRow
        };
      });

      db[this.tableName] = [...(db[this.tableName] || []), ...newItems];
      saveMockDB(db);

      if (this.tableName !== 'audit_logs') {
        const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
        const logEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          facility_id: activeUser?.facility_id || 'f1',
          user_id: activeUser?.id || 'system',
          action: `Insert: ${this.tableName}`,
          details: `Inserted data into ${this.tableName}`
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
  }

  update(values) {
    if (isRealAppwrite) {
      return {
        eq: (column, value) => {
          const executeUpdate = async () => {
            try {
              const token = localStorage.getItem('egesa_health_token');
              const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              
              const headers = { 'Content-Type': 'application/json' };
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }
              
              const res = await fetch(`${backendUrl}/db/update`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  table: this.tableName,
                  column,
                  value,
                  values
                })
              });
              
              const resData = await res.json();
              if (!res.ok) {
                throw new Error(resData.error || 'Update failed');
              }
              return { data: resData.data, error: null };
            } catch (err) {
              return { data: null, error: err.message };
            }
          };

          return {
            then: (resolve) => executeUpdate().then(resolve)
          };
        }
      };
    } else {
      // Local Mock DB fallback
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

          if (this.tableName !== 'audit_logs' && updatedItems.length > 0) {
            const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
            const logEntry = {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              created_at: new Date().toISOString(),
              facility_id: activeUser?.facility_id || 'f1',
              user_id: activeUser?.id || 'system',
              action: `Update: ${this.tableName}`,
              details: `Updated ${this.tableName} where ${column} = ${value}`
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
  }

  delete() {
    if (isRealAppwrite) {
      return {
        eq: (column, value) => {
          const executeDelete = async () => {
            try {
              const token = localStorage.getItem('egesa_health_token');
              const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              
              const headers = { 'Content-Type': 'application/json' };
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }
              
              const res = await fetch(`${backendUrl}/db/delete`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  table: this.tableName,
                  column,
                  value
                })
              });
              
              const resData = await res.json();
              if (!res.ok) {
                throw new Error(resData.error || 'Delete failed');
              }
              return { data: null, error: null };
            } catch (err) {
              return { data: null, error: err.message };
            }
          };

          return {
            then: (resolve) => executeDelete().then(resolve)
          };
        }
      };
    } else {
      // Local Mock DB fallback
      return {
        eq: (column, value) => {
          const db = loadMockDB();
          const table = db[this.tableName] || [];
          db[this.tableName] = table.filter((item) => item[column] !== value);
          saveMockDB(db);

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
}

// --- Appwrite Auth Wrapper ---
const appwriteAuth = {
  signInWithPassword: async ({ email, password }) => {
    if (isRealAppwrite) {
      try {
        // Appwrite creates a session for the user
        const session = await account.createEmailPasswordSession(email, password);
        const userDetails = await account.get();
        
        return {
          data: {
            user: {
              id: userDetails.$id,
              email: userDetails.email,
              user_metadata: userDetails.prefs || {} // Appwrite user preferences can store roles
            }
          },
          error: null
        };
      } catch (err) {
        return { data: null, error: err.message };
      }
    } else {
      // Mock Auth system
      const db = loadMockDB();
      const username = email.split('@')[0].toLowerCase();
      const user = db.profiles.find(u => u.role === username || u.full_name.toLowerCase().includes(username));
      
      if (user) {
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(user));
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
      return { data: null, error: 'Invalid login credentials. Tip: Use role name as username (e.g. nurse@egesa.com) with any password.' };
    }
  },

  signOut: async () => {
    if (isRealAppwrite) {
      try {
        await account.deleteSession('current');
        return { error: null };
      } catch (err) {
        return { error: err.message };
      }
    } else {
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
    }
  },

  signInWithGoogle: async () => {
    if (isRealAppwrite) {
      try {
        const successUrl = window.location.origin;
        const failureUrl = window.location.origin;
        account.createOAuth2Session('google', successUrl, failureUrl);
        return { error: null };
      } catch (err) {
        return { error: err.message };
      }
    } else {
      // Mock Google Login in Sandbox Mode - logs in as Admin
      const db = loadMockDB();
      const user = db.profiles.find(u => u.role === 'admin');
      if (user) {
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(user));
        return { data: { user: { id: user.id, email: 'google.admin@egesa.com', user_metadata: { full_name: user.full_name, role: user.role } } }, error: null };
      }
      return { error: 'Sandbox Admin profile not found' };
    }
  },

  getUser: async () => {
    if (isRealAppwrite) {
      try {
        const userDetails = await account.get();
        return {
          data: {
            user: {
              id: userDetails.$id,
              email: userDetails.email,
              user_metadata: userDetails.prefs || {}
            }
          },
          error: null
        };
      } catch (err) {
        return { data: { user: null }, error: null };
      }
    } else {
      const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
      if (activeUser) {
        return { data: { user: { id: activeUser.id, user_metadata: { full_name: activeUser.full_name, role: activeUser.role } } }, error: null };
      }
      return { data: { user: null }, error: null };
    }
  },

  signUp: async ({ email, password, name }) => {
    if (isRealAppwrite) {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${backendUrl}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Registration failed');
        }
        return {
          data: {
            user: {
              id: resData.user.id,
              email: resData.user.email,
              user_metadata: { full_name: resData.user.name }
            }
          },
          error: null
        };
      } catch (err) {
        return { data: null, error: err.message };
      }
    } else {
      // Sandbox mode signup
      const mockUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        email,
        user_metadata: { full_name: name }
      };
      return { data: { user: mockUser }, error: null };
    }
  }
};

// Export Client
export const supabase = {
  auth: appwriteAuth,
  from: (tableName) => new QueryTable(tableName),
  isSandbox: !isRealAppwrite,
  functions: {
    invoke: async (functionName, payload) => {
      if (isRealAppwrite) {
        try {
          const token = localStorage.getItem('egesa_health_token');
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          
          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const res = await fetch(`${backendUrl}/functions/invoke`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: functionName,
              payload
            })
          });
          
          const resData = await res.json();
          if (!res.ok) {
            throw new Error(resData.error || 'Function execution failed');
          }
          return {
            data: resData.data,
            error: null
          };
        } catch (err) {
          return { data: null, error: err.message };
        }
      } else {
        // High-fidelity sandbox simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (functionName === 'google-oauth-exchange') {
          const db = loadMockDB();
          const facilityProfiles = db.profiles.filter(p => p.facility_id === payload.facilityId);

          if (facilityProfiles.length > 0) {
            const targetUser = facilityProfiles.find(p => p.role === 'admin') || facilityProfiles[0];
            const token = targetUser.autologin_token || `tok_google_${Math.random().toString(36).substring(2, 15)}`;

            db.profiles = db.profiles.map(p => {
              if (p.id === targetUser.id) {
                return { ...p, autologin_token: token };
              }
              return p;
            });
            saveMockDB(db);

            return {
              data: {
                responseBody: JSON.stringify({
                  success: true,
                  email: targetUser.email || `${targetUser.full_name.toLowerCase().replace(/ /g, '')}@egesa.com`,
                  autologin_token: token
                }),
                statusCode: 200
              },
              error: null
            };
          } else {
            return {
              data: null,
              error: 'No active profile found for the selected hospital facility.'
            };
          }
        }

        return {
          data: {
            responseBody: JSON.stringify({
              success: true,
              message: `Simulated report generated by Appwrite Function '${functionName}'`,
              timestamp: new Date().toISOString(),
              recordCount: payload.recordCount || 0
            }),
            statusCode: 200
          },
          error: null
        };
      }
    }
  }
};
