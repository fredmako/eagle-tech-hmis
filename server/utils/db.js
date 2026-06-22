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
    ],
    service_types: [
      { id: "st_opd", name: "General OPD (Normal Consultation)", code: "OPD", requires_anc_card: false, requires_fp_card: false },
      { id: "st_anc", name: "Antenatal Care (ANC)", code: "ANC", requires_anc_card: true, requires_fp_card: false },
      { id: "st_fp", name: "Family Planning (FP)", code: "FP", requires_anc_card: false, requires_fp_card: true },
      { id: "st_imm", name: "Immunization/Vaccination", code: "IMM", requires_anc_card: false, requires_fp_card: false },
      { id: "st_lab", name: "Laboratory-Only", code: "LAB", requires_anc_card: false, requires_fp_card: false },
      { id: "st_pha", name: "Pharmacy-Only", code: "PHA", requires_anc_card: false, requires_fp_card: false },
      { id: "st_ipd", name: "Inpatient Admission", code: "IPD", requires_anc_card: false, requires_fp_card: false },
      { id: "st_emr", name: "Emergency/Triage", code: "EMR", requires_anc_card: false, requires_fp_card: false }
    ],
    patient_registrations: [],
    pregnancies: [],
    anc_visits: [],
    anc_diagnoses: [],
    anc_tests: [],
    contraceptive_methods: [
      { id: "cm_pill", method_name: "Combined Oral Contraceptive Pill", method_code: "PILL", duration_months: 1, provider_skill_level: "basic", removal_required: false, side_effects_list: ["Nausea", "Headache", "Breast tenderness"] },
      { id: "cm_inj", method_name: "Progestogen Injectable (Depo-Provera)", method_code: "INJECTABLE", duration_months: 3, provider_skill_level: "basic", removal_required: false, side_effects_list: ["Weight gain", "Irregular spotting", "Mood changes"] },
      { id: "cm_imp", method_name: "Contraceptive Implant (Implanon/Jadelle)", method_code: "IMPLANT", duration_months: 36, provider_skill_level: "advanced", removal_required: true, side_effects_list: ["Irregular bleeding", "Headache", "Ovarian cysts"] },
      { id: "cm_iud", method_name: "Copper Intrauterine Device (IUD)", method_code: "IUD", duration_months: 120, provider_skill_level: "advanced", removal_required: true, side_effects_list: ["Heavier periods", "Cramping", "Pelvic infection"] },
      { id: "cm_cond", method_name: "Male/Female Condoms", method_code: "CONDOM", duration_months: 0, provider_skill_level: "none", removal_required: false, side_effects_list: ["Latex allergy"] }
    ],
    family_planning_records: [],
    fp_visits: [],
    vaccines: [
      { id: "v_bcg", vaccine_name: "BCG (Bacillus Calmette-Guerin)", vaccine_code: "BCG", schedule_age_weeks: 0, total_doses_required: 1, contraindications_list: ["Symptomatic HIV", "Severe immunodeficiency"] },
      { id: "v_opv_b", vaccine_name: "Oral Polio Vaccine (OPV) - Birth Dose", vaccine_code: "OPV_0", schedule_age_weeks: 0, total_doses_required: 1, contraindications_list: ["Severe immunodeficiency"] },
      { id: "v_opv_1", vaccine_name: "Oral Polio Vaccine (OPV) - Dose 1", vaccine_code: "OPV_1", schedule_age_weeks: 6, total_doses_required: 1, contraindications_list: ["Severe immunodeficiency"] },
      { id: "v_penta_1", vaccine_name: "Pentavalent Vaccine (DPT-HepB-Hib) - Dose 1", vaccine_code: "PENTA_1", schedule_age_weeks: 6, total_doses_required: 1, contraindications_list: ["Encephalopathy within 7 days of previous dose"] },
      { id: "v_pcv_1", vaccine_name: "Pneumococcal Conjugate Vaccine (PCV) - Dose 1", vaccine_code: "PCV_1", schedule_age_weeks: 6, total_doses_required: 1, contraindications_list: ["Severe allergic reaction"] },
      { id: "v_rota_1", vaccine_name: "Rotavirus Vaccine - Dose 1", vaccine_code: "ROTA_1", schedule_age_weeks: 6, total_doses_required: 1, contraindications_list: ["History of intussusception", "Severe immunodeficiency"] },
      { id: "v_measles_1", vaccine_name: "Measles-Rubella Vaccine - Dose 1", vaccine_code: "MR_1", schedule_age_weeks: 39, total_doses_required: 1, contraindications_list: ["Pregnancy", "Severe immunodeficiency"] }
    ],
    immunization_records: [],
    vaccine_doses: [],
    lab_only_registrations: [],
    lab_test_orders: [],
    lab_results: [],
    pharmacy_only_registrations: [],
    pharmacy_dispensings: [],
    inpatient_admissions: [],
    ward_care_records: [],
    bed_allocations: [
      { id: "bed_m1", ward_id: "ward_male", bed_number: "Male Bed 01", facility_id: "f1", bed_status: "clean" },
      { id: "bed_m2", ward_id: "ward_male", bed_number: "Male Bed 02", facility_id: "f1", bed_status: "clean" },
      { id: "bed_m3", ward_id: "ward_male", bed_number: "Male Bed 03", facility_id: "f1", bed_status: "clean" },
      { id: "bed_m4", ward_id: "ward_male", bed_number: "Male Bed 04", facility_id: "f1", bed_status: "clean" },
      { id: "bed_m5", ward_id: "ward_male", bed_number: "Male Bed 05", facility_id: "f1", bed_status: "clean" },
      { id: "bed_f1", ward_id: "ward_female", bed_number: "Female Bed 01", facility_id: "f1", bed_status: "clean" },
      { id: "bed_f2", ward_id: "ward_female", bed_number: "Female Bed 02", facility_id: "f1", bed_status: "clean" },
      { id: "bed_f3", ward_id: "ward_female", bed_number: "Female Bed 03", facility_id: "f1", bed_status: "clean" },
      { id: "bed_f4", ward_id: "ward_female", bed_number: "Female Bed 04", facility_id: "f1", bed_status: "clean" },
      { id: "bed_f5", ward_id: "ward_female", bed_number: "Female Bed 05", facility_id: "f1", bed_status: "clean" },
      { id: "bed_p1", ward_id: "ward_pediatric", bed_number: "Pediatric Bed 01", facility_id: "f1", bed_status: "clean" },
      { id: "bed_p2", ward_id: "ward_pediatric", bed_number: "Pediatric Bed 02", facility_id: "f1", bed_status: "clean" },
      { id: "bed_p3", ward_id: "ward_pediatric", bed_number: "Pediatric Bed 03", facility_id: "f1", bed_status: "clean" }
    ],
    emergency_registrations: [],
    triage_assessments: [],
    emergency_interventions: [],
    medical_instruments: [
      { id: "inst_ultrasound", facility_id: "f1", name: "Obstetric Ultrasound Machine", type: "ultrasound", category: "ANC", manufacturer: "GE Healthcare", model: "Voluson E8", serial_number: "US-VOL-198273", installation_date: "2025-06-01", calibration_date: "2026-01-10", next_calibration_date: "2026-07-10", location_ward: "ANC Clinic", status: "active", usage_count: 0 },
      { id: "inst_doppler", facility_id: "f1", name: "Fetal Doppler Monitor", type: "doppler", category: "ANC", manufacturer: "Sonoline", model: "Sonoline B", serial_number: "FD-SONO-238472", installation_date: "2025-08-15", calibration_date: "2026-03-15", next_calibration_date: "2026-09-15", location_ward: "ANC Clinic", status: "active", usage_count: 0 },
      { id: "inst_autoclave", facility_id: "f1", name: "Autoclave Sterilizer", type: "autoclave", category: "general", manufacturer: "Tuttnauer", model: "2540M", serial_number: "AC-TUTT-493821", installation_date: "2025-05-10", calibration_date: "2026-02-20", next_calibration_date: "2026-08-20", location_ward: "Main Theatre", status: "active", usage_count: 0 },
      { id: "inst_dispenser", facility_id: "f1", name: "Syringe Auto-Dispenser", type: "dispenser", category: "immunization", manufacturer: "Becton Dickinson", model: "BD AutoShield", serial_number: "DISP-BD-839218", installation_date: "2025-10-01", calibration_date: "2026-05-10", next_calibration_date: "2026-11-10", location_ward: "Immunization Room", status: "active", usage_count: 0 },
      { id: "inst_thermometer", facility_id: "f1", name: "Cold Chain Logger Thermometer", type: "thermometer", category: "immunization", manufacturer: "LogTag", model: "UTRED30-16", serial_number: "THERM-LT-948302", installation_date: "2025-11-05", calibration_date: "2026-05-01", next_calibration_date: "2026-11-01", location_ward: "Cold Chain Fridge", status: "active", usage_count: 0 },
      { id: "inst_defibrillator", facility_id: "f1", name: "Emergency Defibrillator", type: "defibrillator", category: "emergency", manufacturer: "ZOLL Medical", model: "AED Plus", serial_number: "DEFIB-ZOLL-840291", installation_date: "2025-04-12", calibration_date: "2026-04-12", next_calibration_date: "2026-10-12", location_ward: "ER Room", status: "active", usage_count: 0 },
      { id: "inst_monitor", facility_id: "f1", name: "Patient Monitor Vitals", type: "monitor", category: "triage", manufacturer: "Mindray", model: "ePM 10", serial_number: "MON-MIND-928318", installation_date: "2025-03-15", calibration_date: "2026-03-01", next_calibration_date: "2026-09-01", location_ward: "ER Triage", status: "active", usage_count: 0 },
      { id: "inst_pump", facility_id: "f1", name: "IV Infusion Pump", type: "pump", category: "ward", manufacturer: "Baxter", model: "Flo-Gard", serial_number: "PUMP-BAX-493021", installation_date: "2025-07-22", calibration_date: "2026-02-18", next_calibration_date: "2026-08-18", location_ward: "Ward A", status: "active", usage_count: 0 }
    ],
    instrument_usage_logs: []
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
