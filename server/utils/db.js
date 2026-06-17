const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Make sure env is loaded
require("../config/env");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const isRealSupabase = !!(supabaseUrl && supabaseKey);

let supabaseClient = null;

if (isRealSupabase) {
  console.log(
    "Database Engine: Real Supabase Mode connecting to:",
    supabaseUrl
  );
  supabaseClient = createClient(supabaseUrl, supabaseKey);
} else {
  console.log(
    "Database Engine: Local Sandbox Simulation Mode (sandbox_db.json)"
  );
}

const SANDBOX_DB_PATH = path.join(__dirname, "../sandbox_db.json");

const getInitialSandboxData = () => {
  // Hash for 'password123'
  const defaultHash =
    "$2a$10$tM.yF.1nJ9Z9P4mI8vN5yOqZk7xZ/Q3K5.p1j/H7J2zN9xK2TzJ.O";
  return {
    facilities: [
      {
        id: "f1",
        name: "Eagle Tech Medical Clinic",
        code: "EMC-001",
        logo_url: "preset:shield",
        address: "Nairobi, Kenya",
        is_verified: true,
      },
      {
        id: "f2",
        name: "Meso Referral Hospital",
        code: "MRH-002",
        logo_url: "preset:cross",
        address: "Mombasa, Kenya",
        is_verified: true,
      },
    ],
    profiles: [
      {
        id: "u1",
        full_name: "Dr. Arthur Conan",
        role: "clinician",
        facility_id: "f1",
        email: "clinician@egesa.com",
      },
      {
        id: "u2",
        full_name: "Nurse Jane Doe",
        role: "nurse",
        facility_id: "f1",
        email: "nurse@egesa.com",
      },
      {
        id: "u3",
        full_name: "Alice Cooper (Receptionist)",
        role: "receptionist",
        facility_id: "f1",
        email: "receptionist@egesa.com",
      },
      {
        id: "u4",
        full_name: "Dr. Lab Tech Terry",
        role: "lab_tech",
        facility_id: "f1",
        email: "lab_tech@egesa.com",
      },
      {
        id: "u5",
        full_name: "Pharmacist Bob",
        role: "pharmacist",
        facility_id: "f1",
        email: "pharmacist@egesa.com",
      },
      {
        id: "u6",
        full_name: "Cashier Mary",
        role: "cashier",
        facility_id: "f1",
        email: "cashier@egesa.com",
      },
      {
        id: "u7",
        full_name: "Admin Grace",
        role: "admin",
        facility_id: "f1",
        email: "admin@egesa.com",
      },
      {
        id: "u_super_admin",
        full_name: "Fredrick Makori (Super Admin)",
        role: "super_admin",
        facility_id: null,
        email: "fredrickmakori102@gmail.com",
      },
    ],
    users: [
      {
        id: "u1",
        email: "clinician@egesa.com",
        passwordHash: defaultHash,
        name: "Dr. Arthur Conan",
      },
      {
        id: "u2",
        email: "nurse@egesa.com",
        passwordHash: defaultHash,
        name: "Nurse Jane Doe",
      },
      {
        id: "u3",
        email: "receptionist@egesa.com",
        passwordHash: defaultHash,
        name: "Alice Cooper",
      },
      {
        id: "u4",
        email: "lab_tech@egesa.com",
        passwordHash: defaultHash,
        name: "Dr. Lab Tech Terry",
      },
      {
        id: "u5",
        email: "pharmacist@egesa.com",
        passwordHash: defaultHash,
        name: "Pharmacist Bob",
      },
      {
        id: "u6",
        email: "cashier@egesa.com",
        passwordHash: defaultHash,
        name: "Cashier Mary",
      },
      {
        id: "u7",
        email: "admin@egesa.com",
        passwordHash: defaultHash,
        name: "Admin Grace",
      },
      {
        id: "u_super_admin",
        email: "fredrickmakori102@gmail.com",
        passwordHash: defaultHash,
        name: "Fredrick Makori (Super Admin)",
      },
    ],
    role_requests: [
      {
        id: "req_1",
        user_id: "user_steve",
        full_name: "Steve Jobs",
        email: "steve@apple.com",
        facility_id: "f1",
        requested_role: "clinician",
        status: "pending",
        created_at: new Date().toISOString(),
      },
      {
        id: "req_2",
        user_id: "user_florence",
        full_name: "Florence Nightingale",
        email: "florence@nursing.org",
        facility_id: "f1",
        requested_role: "nurse",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ],
    audit_logs: [],
    invoices: [],
    orders: [],
    visits: [],
    email_logs: [],
    departments: [
      { id: "d_triage", facility_id: "f1", name: "Triage (Vitals)", code: "TRI", type: "triage", specialty: "general", is_active: true },
      { id: "d_consult", facility_id: "f1", name: "OPD Consult", code: "CON", type: "consultation", specialty: "general", is_active: true },
      { id: "d_lab", facility_id: "f1", name: "Laboratory", code: "LAB", type: "lab", specialty: "general", is_active: true },
      { id: "d_rad", facility_id: "f1", name: "Radiology", code: "RAD", type: "radiology", specialty: "general", is_active: true },
      { id: "d_surg", facility_id: "f1", name: "Theatre", code: "SUR", type: "surgery", specialty: "general", is_active: true },
      { id: "d_ward", facility_id: "f1", name: "Inpatient Ward", code: "WAR", type: "ward", specialty: "general", is_active: true },
      { id: "d_pharm", facility_id: "f1", name: "Pharmacy", code: "PHA", type: "pharmacy", specialty: "general", is_active: true },
      { id: "d_bill", facility_id: "f1", name: "Billing Desk", code: "BIL", type: "billing", specialty: "general", is_active: true }
    ]
  };
};

const loadSandboxDB = () => {
  if (!fs.existsSync(SANDBOX_DB_PATH)) {
    const data = getInitialSandboxData();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    return JSON.parse(fs.readFileSync(SANDBOX_DB_PATH, "utf-8"));
  } catch (err) {
    console.error("Error loading sandbox database. Recreating.", err);
    const data = getInitialSandboxData();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
};

const saveSandboxDB = (data) => {
  fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
};

// Unified Database Helpers
const db = {
  getDocuments: async (
    tableName,
    queries = [],
    orderByField = null,
    orderByAsc = true
  ) => {
    if (isRealSupabase) {
      let query = supabaseClient.from(tableName).select("*");

      // Apply equality filters
      queries.forEach((q) => {
        if (q.type === "equal") {
          query = query.eq(q.column, q.value);
        }
      });

      // Apply ordering
      if (orderByField) {
        query = query.order(orderByField, { ascending: orderByAsc });
      }

      const { data, error } = await query;
      if (error) throw new Error(`Supabase query error: ${error.message}`);
      return data || [];
    } else {
      const data = loadSandboxDB();
      let list = data[tableName] || [];
      queries.forEach((q) => {
        if (q.type === "equal") {
          list = list.filter((item) => item[q.column] === q.value);
        }
      });
      if (orderByField) {
        list = [...list].sort((a, b) => {
          let valA = a[orderByField];
          let valB = b[orderByField];
          if (typeof valA === "string") {
            return orderByAsc
              ? valA.localeCompare(valB)
              : valB.localeCompare(valA);
          }
          if (valA < valB) return orderByAsc ? -1 : 1;
          if (valA > valB) return orderByAsc ? 1 : -1;
          return 0;
        });
      }
      return list;
    }
  },

  createDocument: async (tableName, docId, docData) => {
    if (isRealSupabase) {
      const { data, error } = await supabaseClient
        .from(tableName)
        .insert({
          id: docId,
          ...docData,
          created_at: new Date().toISOString(),
        })
        .select();
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
      return data?.[0] || { id: docId, ...docData };
    } else {
      const data = loadSandboxDB();
      if (!data[tableName]) data[tableName] = [];
      const newDoc = {
        id: docId,
        created_at: new Date().toISOString(),
        ...docData,
      };
      data[tableName].push(newDoc);
      saveSandboxDB(data);
      return newDoc;
    }
  },

  updateDocument: async (tableName, docId, docData) => {
    if (isRealSupabase) {
      const { data, error } = await supabaseClient
        .from(tableName)
        .update(docData)
        .eq("id", docId)
        .select();
      if (error) throw new Error(`Supabase update error: ${error.message}`);
      return data?.[0] || { id: docId, ...docData };
    } else {
      const data = loadSandboxDB();
      if (!data[tableName]) data[tableName] = [];
      data[tableName] = data[tableName].map((doc) => {
        if (doc.id === docId) {
          return { ...doc, ...docData };
        }
        return doc;
      });
      saveSandboxDB(data);
      return { id: docId };
    }
  },

  deleteDocument: async (tableName, docId) => {
    if (isRealSupabase) {
      const { error } = await supabaseClient
        .from(tableName)
        .delete()
        .eq("id", docId);
      if (error) throw new Error(`Supabase delete error: ${error.message}`);
      return true;
    } else {
      const data = loadSandboxDB();
      if (data[tableName]) {
        data[tableName] = data[tableName].filter((doc) => doc.id !== docId);
        saveSandboxDB(data);
      }
      return true;
    }
  },
};

module.exports = {
  isRealSupabase,
  supabaseClient,
  loadSandboxDB,
  saveSandboxDB,
  db,
  SANDBOX_DB_PATH,
};
