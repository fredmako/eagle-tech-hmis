const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { db } = require("../utils/db");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

function validateRowData(table, row) {
  if (!row) return;

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Patients Table
  if (table === 'patients') {
    if (row.dob) {
      if (row.dob > todayStr) {
        throw new Error("Validation: Date of Birth cannot be in the future.");
      }
      if (row.dob < '1900-01-01') {
        throw new Error("Validation: Date of Birth must not be before 1900.");
      }
    }
    if (row.phone) {
      const cleanPhone = String(row.phone).trim();
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        throw new Error("Validation: Phone number must be between 8 and 15 characters long.");
      }
      const phoneRegex = /^[0-9+\-\(\)\s]+$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error("Validation: Phone number contains invalid characters.");
      }
    }
    if (row.national_id || row.nationalId) {
      const natId = String(row.national_id || row.nationalId).trim();
      if (natId.length < 4 || natId.length > 20) {
        throw new Error("Validation: National ID must be between 4 and 20 characters long.");
      }
    }
  }

  // 2. Pregnancies Table (LMP date)
  if (table === 'pregnancies') {
    if (row.lmp_date) {
      if (row.lmp_date > todayStr) {
        throw new Error("Validation: LMP date cannot be in the future.");
      }
      const lmpDate = new Date(row.lmp_date);
      const diffTime = Math.abs(new Date() - lmpDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 315) { // 45 weeks
        throw new Error("Validation: LMP date must not be more than 45 weeks in the past.");
      }
    }
  }

  // 3. Triage / Vital Signs validation
  const checkVitals = (data) => {
    // Temperature: 25 - 45
    if (data.temperature !== undefined && data.temperature !== null) {
      const tempVal = parseFloat(data.temperature);
      if (tempVal < 25.0 || tempVal > 45.0) {
        throw new Error("Validation: Temperature must be between 25.0°C and 45.0°C.");
      }
    }
    // Systolic: 50 - 280
    let sys = null;
    if (data.systolic !== undefined && data.systolic !== null) sys = parseInt(data.systolic, 10);
    if (data.bp_systolic !== undefined && data.bp_systolic !== null) sys = parseInt(data.bp_systolic, 10);
    if (sys !== null && (sys < 50 || sys > 280)) {
      throw new Error("Validation: Systolic blood pressure must be between 50 mmHg and 280 mmHg.");
    }

    // Diastolic: 30 - 180
    let dia = null;
    if (data.diastolic !== undefined && data.diastolic !== null) dia = parseInt(data.diastolic, 10);
    if (data.bp_diastolic !== undefined && data.bp_diastolic !== null) dia = parseInt(data.bp_diastolic, 10);
    if (dia !== null && (dia < 30 || dia > 180)) {
      throw new Error("Validation: Diastolic blood pressure must be between 30 mmHg and 180 mmHg.");
    }

    // BP relation
    if (sys !== null && dia !== null && dia >= sys) {
      throw new Error("Validation: Diastolic blood pressure must be strictly lower than systolic blood pressure.");
    }

    // Pulse / Heart rate: 30 - 260
    let hr = null;
    if (data.heart_rate !== undefined && data.heart_rate !== null) hr = parseInt(data.heart_rate, 10);
    if (data.pulse_rate !== undefined && data.pulse_rate !== null) hr = parseInt(data.pulse_rate, 10);
    if (data.pulse !== undefined && data.pulse !== null) hr = parseInt(data.pulse, 10);
    if (hr !== null && (hr < 30 || hr > 260)) {
      throw new Error("Validation: Pulse / Heart rate must be between 30 bpm and 260 bpm.");
    }

    // Respiratory rate: 6 - 80
    let rr = null;
    if (data.resp_rate !== undefined && data.resp_rate !== null) rr = parseInt(data.resp_rate, 10);
    if (data.respiratory_rate !== undefined && data.respiratory_rate !== null) rr = parseInt(data.respiratory_rate, 10);
    if (rr !== null && (rr < 6 || rr > 80)) {
      throw new Error("Validation: Respiratory rate must be between 6 and 80 breaths per minute.");
    }

    // Oxygen saturation (SPO2): 10 - 100
    let spo2 = null;
    if (data.spo2 !== undefined && data.spo2 !== null) spo2 = parseInt(data.spo2, 10);
    if (data.oxygen_saturation !== undefined && data.oxygen_saturation !== null) spo2 = parseInt(data.oxygen_saturation, 10);
    if (spo2 !== null && (spo2 < 10 || spo2 > 100)) {
      throw new Error("Validation: Oxygen saturation (SPO2) must be between 10% and 100%.");
    }

    // Weight: 0.5 - 500
    if (data.weight !== undefined && data.weight !== null) {
      const wVal = parseFloat(data.weight);
      if (wVal < 0.5 || wVal > 500.0) {
        throw new Error("Validation: Body weight must be between 0.5 kg and 500 kg.");
      }
    }

    // Height: 0.2 - 2.6
    if (data.height !== undefined && data.height !== null) {
      const hVal = parseFloat(data.height);
      if (hVal < 0.2 || hVal > 2.6) {
        throw new Error("Validation: Height must be between 0.2 m and 2.6 m.");
      }
    }
  };

  if (['triages', 'triage_assessments', 'ward_care_records', 'visits'].includes(table)) {
    checkVitals(row);
  }

  // 4. ANC Visits Table
  if (table === 'anc_visits') {
    // Check vitals if embedded
    checkVitals({
      temperature: row.maternal_temperature,
      systolic: row.bp_systolic,
      diastolic: row.bp_diastolic,
      weight: row.weight_kg
    });
    if (row.visit_number !== undefined && row.visit_number !== null) {
      const v = parseInt(row.visit_number, 10);
      if (isNaN(v) || v < 1 || v > 12) {
        throw new Error("Validation: ANC visit number must be between 1 and 12.");
      }
    }
    if (row.gestational_age_at_visit !== undefined && row.gestational_age_at_visit !== null) {
      const ga = parseFloat(row.gestational_age_at_visit);
      if (isNaN(ga) || ga < 0 || ga > 45) {
        throw new Error("Validation: Gestational age must be between 0 and 45 weeks.");
      }
    }
    if (row.fundal_height_cm !== undefined && row.fundal_height_cm !== null) {
      const fh = parseFloat(row.fundal_height_cm);
      if (isNaN(fh) || fh < 10 || fh > 50) {
        throw new Error("Validation: Fundal height must be between 10 cm and 50 cm.");
      }
    }
    if (row.fetal_heart_rate !== undefined && row.fetal_heart_rate !== null) {
      const fhr = parseInt(row.fetal_heart_rate, 10);
      if (isNaN(fhr) || fhr < 60 || fhr > 220) {
        throw new Error("Validation: Fetal heart rate must be between 60 bpm and 220 bpm.");
      }
    }
    if (row.tetanus_toxoid_dose !== undefined && row.tetanus_toxoid_dose !== null) {
      const tt = parseInt(row.tetanus_toxoid_dose, 10);
      if (isNaN(tt) || tt < 1 || tt > 5) {
        throw new Error("Validation: Tetanus toxoid dose must be between 1 and 5.");
      }
    }
    if (row.supplements_count !== undefined && row.supplements_count !== null) {
      const sup = parseInt(row.supplements_count, 10);
      if (isNaN(sup) || sup < 0 || sup > 365) {
        throw new Error("Validation: Supplements supplied count must be between 0 and 365.");
      }
    }
  }

  // 5. Family Planning Records Table
  if (table === 'family_planning_records') {
    if (row.reproductive_history_gravidity !== undefined && row.reproductive_history_gravidity !== null) {
      const g = parseInt(row.reproductive_history_gravidity, 10);
      if (isNaN(g) || g < 0 || g > 30) {
        throw new Error("Validation: Gravidity must be between 0 and 30.");
      }
      if (row.reproductive_history_parity !== undefined && row.reproductive_history_parity !== null) {
        const p = parseInt(row.reproductive_history_parity, 10);
        if (isNaN(p) || p < 0 || p > g) {
          throw new Error("Validation: Parity must be between 0 and gravidity.");
        }
      }
    }
  }

  // 6. Orders Table (Laboratory & Radiology Results)
  if (table === 'orders' && row.results) {
    let meta = null;
    try {
      meta = JSON.parse(row.results);
    } catch (e) {
      // Non-JSON string results, no structured check needed
    }
    if (meta && meta.parameters && typeof meta.parameters === 'object') {
      Object.keys(meta.parameters).forEach(pName => {
        const valStr = String(meta.parameters[pName]).trim();
        // If it looks like a number, validate reasonable bound
        const num = parseFloat(valStr);
        if (!isNaN(num)) {
          if (num < 0 || num > 10000) {
            throw new Error(`Validation: Lab parameter "${pName}" value (${num}) is out of realistic physiological limits (0 to 10000).`);
          }
        }
      });
    }
  }

  // 7. Inventory Items Table
  if (table === 'inventory_items') {
    if (row.unit_price !== undefined && row.unit_price !== null) {
      const price = parseFloat(row.unit_price);
      if (isNaN(price) || price < 0) {
        throw new Error("Validation: Unit price cannot be negative.");
      }
    }
    if (row.quantity_in_stock !== undefined && row.quantity_in_stock !== null) {
      const qty = parseInt(row.quantity_in_stock, 10);
      if (isNaN(qty) || qty < 0) {
        throw new Error("Validation: Quantity in stock cannot be negative.");
      }
    }
    if (row.min_reorder_level !== undefined && row.min_reorder_level !== null) {
      const minLevel = parseInt(row.min_reorder_level, 10);
      if (isNaN(minLevel) || minLevel < 0) {
        throw new Error("Validation: Minimum reorder level cannot be negative.");
      }
    }
    if (row.category && !['pharmaceutical', 'surgical', 'consumable', 'asset'].includes(row.category)) {
      throw new Error("Validation: Invalid inventory category.");
    }
  }

  // 8. Inventory Transactions Table
  if (table === 'inventory_transactions') {
    if (row.quantity !== undefined && row.quantity !== null) {
      const qty = parseInt(row.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Validation: Transaction quantity must be greater than zero.");
      }
    }
    if (row.transaction_type && !['stock_in', 'stock_out', 'sale', 'adjustment'].includes(row.transaction_type)) {
      throw new Error("Validation: Invalid transaction type.");
    }
  }

  // 9. Purchases Table
  if (table === 'purchases') {
    if (row.quantity !== undefined && row.quantity !== null) {
      const qty = parseInt(row.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Validation: Purchase quantity must be greater than zero.");
      }
    }
    if (row.estimated_cost !== undefined && row.estimated_cost !== null) {
      const cost = parseFloat(row.estimated_cost);
      if (isNaN(cost) || cost < 0) {
        throw new Error("Validation: Estimated cost cannot be negative.");
      }
    }
    if (row.status && !['Pending Approval', 'Approved', 'Delivered', 'Rejected'].includes(row.status)) {
      throw new Error("Validation: Invalid purchase status.");
    }
  }

  // 10. Utility Records Table
  if (table === 'utility_records') {
    if (row.amount !== undefined && row.amount !== null) {
      const amt = parseFloat(row.amount);
      if (isNaN(amt) || amt < 0) {
        throw new Error("Validation: Utility bill amount cannot be negative.");
      }
    }
    if (row.payment_status && !['unpaid', 'paid'].includes(row.payment_status)) {
      throw new Error("Validation: Invalid payment status.");
    }
  }

  // 11. Ward Care Records Table (Daily check-in data)
  if (table === 'ward_care_records') {
    if (row.care_date) {
      if (row.care_date > todayStr) {
        throw new Error("Validation: Care check-in date cannot be in the future.");
      }
    }
  }

  // 12. Facilities Table
  if (table === 'facilities') {
    if (row.facility_images) {
      let imgs = row.facility_images;
      if (typeof imgs === 'string') {
        try {
          imgs = JSON.parse(imgs);
        } catch (e) {
          throw new Error("Validation: Facility images must be a valid JSON array.");
        }
      }
      if (!Array.isArray(imgs)) {
        throw new Error("Validation: Facility images must be an array.");
      }
      if (imgs.length > 4) {
        throw new Error("Validation: A facility can have at most 4 showcase images.");
      }
      for (const img of imgs) {
        if (typeof img !== 'string' || (!img.startsWith('data:image/') && !img.startsWith('http') && !img.startsWith('/'))) {
          throw new Error("Validation: Facility images must be valid image URLs or base64 data URIs.");
        }
      }
    }
  }
}


// DB Proxy: Query documents
router.post("/query", async (req, res) => {
  const {
    table,
    queries = [],
    orderByField = null,
    orderByAsc = true,
  } = req.body;
  if (!table) return res.status(400).json({ error: "Table name is required" });

  // Security: only allow unauthenticated requests for 'facilities', 'doctor_availability', 'profiles', and 'appointments' tables
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const decodedUser = jwt.verify(token, JWT_SECRET);
      req.user = decodedUser;
    } catch (err) {
      if (table !== "facilities" && table !== "doctor_availability" && table !== "profiles" && table !== "appointments") {
        return res.status(403).json({ error: "Invalid or expired session token" });
      }
    }
  } else {
    if (table !== "facilities" && table !== "doctor_availability" && table !== "profiles" && table !== "appointments") {
      return res.status(401).json({ error: "Access token required" });
    }
  }

  try {
    // If table is not a global table, automatically enforce facility filtering
    const globalTables = ["facilities", "profiles", "support_tickets"];
    const enrichedQueries = [...queries];

    if (table === "support_tickets" && req.user) {
      if (req.user.role === "admin") {
        const cleanQueries = enrichedQueries.filter((q) => q && q.column !== "facility_id");
        cleanQueries.push({
          type: "equal",
          column: "facility_id",
          value: req.user.facility_id,
        });
        enrichedQueries.length = 0;
        enrichedQueries.push(...cleanQueries);
      } else if (req.user.role !== "super_admin" && req.user.role !== "platform_support") {
        const cleanQueries = enrichedQueries.filter((q) => q && q.column !== "user_email");
        cleanQueries.push({
          type: "equal",
          column: "user_email",
          value: req.user.email,
        });
        enrichedQueries.length = 0;
        enrichedQueries.push(...cleanQueries);
      }
    }

    if (!globalTables.includes(table) && req.user && req.user.role !== "super_admin") {
      // Ensure facility_id filter is appended
      const hasFacilityFilter = enrichedQueries.some(
        (q) => q && q.column === "facility_id"
      );
      if (!hasFacilityFilter) {
        enrichedQueries.push({
          type: "equal",
          column: "facility_id",
          value: req.user.facility_id,
        });
      }
    }

    const data = await db.getDocuments(
      table,
      enrichedQueries,
      orderByField,
      orderByAsc
    );

    // Security: redact patient information from appointments table for unauthenticated visitors
    if (table === "appointments" && !req.user) {
      const redactedData = data.map(app => ({
        doctor_id: app.doctor_id,
        appointment_date: app.appointment_date,
        start_time: app.start_time,
        status: app.status
      }));
      return res.json({ success: true, data: redactedData });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(`DB Query Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || "Database query failed" });
  }
});

// DB Proxy: Insert documents
router.post("/insert", async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !rows)
    return res.status(400).json({ error: "Table and rows are required" });

  // Security: only allow unauthenticated requests for 'facilities', 'profiles', 'support_tickets', and 'appointments'
  if (table !== "facilities" && table !== "profiles" && table !== "support_tickets" && table !== "appointments") {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access token required" });

    try {
      const decodedUser = jwt.verify(token, JWT_SECRET);
      req.user = decodedUser;
    } catch (err) {
      return res
        .status(403)
        .json({ error: "Invalid or expired session token" });
    }
  }

  try {
    const dataRows = Array.isArray(rows) ? rows : [rows];
    const results = [];
    const activeFacId = req.user ? req.user.facility_id : null;

    for (const row of dataRows) {
      const { id, created_at, ...cleanRow } = row;
      const globalTables = ["facilities", "profiles", "support_tickets"];

      // Enforce facility_id for tenant tables if authenticated
      if (
        !globalTables.includes(table) &&
        activeFacId &&
        !cleanRow.facility_id
      ) {
        cleanRow.facility_id = activeFacId;
      }

      // Backend Input Buffer Validation
      validateRowData(table, cleanRow);

      const docId = id || "doc_" + Math.random().toString(36).substring(2, 15);
      const newDoc = await db.createDocument(table, docId, cleanRow);
      results.push(newDoc);
    }

    // Log audit log hook
    if (table !== "audit_logs") {
      const facilityId =
        activeFacId || (table === "facilities" ? results[0]?.id : "f1");
      const userId = req.user ? req.user.id : "onboarding";
      await db.createDocument(
        "audit_logs",
        "log_" + Math.random().toString(36).substring(2, 12),
        {
          facility_id: facilityId,
          user_id: userId,
          action: `Insert: ${table}`,
          details: `Inserted ${results.length} record(s) into ${table}`,
        }
      );
    }

    res.json({
      success: true,
      data: Array.isArray(rows) ? results : results[0],
    });
  } catch (err) {
    console.error(`DB Insert Proxy failed for table ${table}:`, err);
    if (err.message && err.message.startsWith("Validation:")) {
      return res.status(400).json({ error: err.message.replace("Validation: ", "") });
    }
    res.status(500).json({ error: err.message || "Database insertion failed" });
  }
});

// DB Proxy: Update documents
router.post("/update", authenticateToken, async (req, res) => {
  const { table, column, value, values } = req.body;
  if (!table || !column || value === undefined || !values) {
    return res
      .status(400)
      .json({
        error:
          "Table, query column, query value, and values to update are required",
      });
  }

  if (table === "support_tickets") {
    if (req.user.role !== "super_admin" && req.user.role !== "platform_support" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only platform or facility administrators can modify support tickets." });
    }
  }

  try {
    // 1. Find matching documents
    const queries = [{ type: "equal", column, value }];
    const globalTables = ["facilities", "profiles", "support_tickets"];
    if (!globalTables.includes(table) && req.user.role !== "super_admin" && req.user.role !== "platform_support") {
      queries.push({
        type: "equal",
        column: "facility_id",
        value: req.user.facility_id,
      });
    } else if (table === "support_tickets" && req.user.role === "admin") {
      queries.push({
        type: "equal",
        column: "facility_id",
        value: req.user.facility_id,
      });
    }

    const docs = await db.getDocuments(table, queries);
    if (docs.length === 0) {
      return res
        .status(404)
        .json({ error: "No matching records found to update" });
    }

    const results = [];
    const { id, created_at, ...cleanValues } = values;

    // Backend Input Buffer Validation
    validateRowData(table, cleanValues);

    for (const doc of docs) {
      await db.updateDocument(table, doc.id, cleanValues);
      results.push({ id: doc.id });
    }

    // Log audit
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: req.user.facility_id || "f1",
        user_id: req.user.id || "system",
        action: `Update: ${table}`,
        details: `Updated ${results.length} record(s) in ${table} where ${column} = ${value}`,
      }
    );

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(`DB Update Proxy failed for table ${table}:`, err);
    if (err.message && err.message.startsWith("Validation:")) {
      return res.status(400).json({ error: err.message.replace("Validation: ", "") });
    }
    res.status(500).json({ error: err.message || "Database update failed" });
  }
});

// DB Proxy: Delete documents
router.post("/delete", authenticateToken, async (req, res) => {
  const { table, column, value } = req.body;
  if (!table || !column || value === undefined) {
    return res
      .status(400)
      .json({ error: "Table, query column, and query value are required" });
  }

  if (table === "support_tickets") {
    if (req.user.role !== "super_admin" && req.user.role !== "platform_support" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only platform or facility administrators can delete support tickets." });
    }
  }

  try {
    // 1. Find matching documents
    const queries = [{ type: "equal", column, value }];
    const globalTables = ["facilities", "profiles", "support_tickets"];
    if (!globalTables.includes(table) && req.user.role !== "super_admin" && req.user.role !== "platform_support") {
      queries.push({
        type: "equal",
        column: "facility_id",
        value: req.user.facility_id,
      });
    } else if (table === "support_tickets" && req.user.role === "admin") {
      queries.push({
        type: "equal",
        column: "facility_id",
        value: req.user.facility_id,
      });
    }

    const docs = await db.getDocuments(table, queries);
    if (docs.length === 0) {
      return res
        .status(404)
        .json({ error: "No matching records found to delete" });
    }

    for (const doc of docs) {
      await db.deleteDocument(table, doc.id);
    }

    // Log audit
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: req.user.facility_id || "f1",
        user_id: req.user.id || "system",
        action: `Delete: ${table}`,
        details: `Deleted ${docs.length} record(s) from ${table} where ${column} = ${value}`,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(`DB Delete Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || "Database deletion failed" });
  }
});

module.exports = router;
