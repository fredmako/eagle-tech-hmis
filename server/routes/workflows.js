const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");

// Helper to calculate days between two dates
const getDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

// ====================================================
// 1. ANC Gestational Age & Scheduling
// ====================================================
router.post("/anc/calculate-gestational-age", authenticateToken, async (req, res) => {
  const { lmp_date } = req.body;
  if (!lmp_date) {
    return res.status(400).json({ error: "LMP date is required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const elapsedDays = getDaysBetween(lmp_date, today);
    
    if (elapsedDays < 0) {
      return res.status(400).json({ error: "LMP date cannot be in the future" });
    }

    const gaWeeks = parseFloat((elapsedDays / 7).toFixed(1));
    
    // EDD is LMP + 280 days (40 weeks)
    const eddDate = new Date(lmp_date);
    eddDate.setDate(eddDate.getDate() + 280);
    const edd = eddDate.toISOString().split("T")[0];

    // Conception is roughly LMP + 14 days
    const conceptionDate = new Date(lmp_date);
    conceptionDate.setDate(conceptionDate.getDate() + 14);
    const conception = conceptionDate.toISOString().split("T")[0];

    // Schedule: 4 weeks for GA < 28, 2 weeks for 28 <= GA <= 36, 1 week for GA > 36
    let nextVisitWeeks = 4;
    if (gaWeeks >= 28 && gaWeeks <= 36) {
      nextVisitWeeks = 2;
    } else if (gaWeeks > 36) {
      nextVisitWeeks = 1;
    }

    const nextVisitDateObj = new Date();
    nextVisitDateObj.setDate(nextVisitDateObj.getDate() + (nextVisitWeeks * 7));
    const nextVisitDate = nextVisitDateObj.toISOString().split("T")[0];

    res.json({
      success: true,
      gestational_age_weeks: gaWeeks,
      estimated_delivery_date: edd,
      conception_date: conception,
      next_visit_weeks: nextVisitWeeks,
      suggested_next_visit_date: nextVisitDate
    });
  } catch (err) {
    console.error("ANC Calculation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 2. Immunization Vaccine Eligibility
// ====================================================
router.post("/immunization/eligible-vaccines", authenticateToken, async (req, res) => {
  const { birth_date, patient_id } = req.body;
  if (!birth_date || !patient_id) {
    return res.status(400).json({ error: "Birth date and Patient ID are required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const elapsedDays = getDaysBetween(birth_date, today);
    const ageWeeks = Math.floor(elapsedDays / 7);
    const ageMonths = Math.floor(elapsedDays / 30.43);

    // Fetch all vaccines
    const vaccines = await db.getDocuments("vaccines");
    
    // Fetch doses received by patient
    const records = await db.getDocuments("immunization_records", [
      { type: "equal", column: "patient_id", value: patient_id }
    ]);
    
    let receivedDoses = [];
    if (records.length > 0) {
      receivedDoses = await db.getDocuments("vaccine_doses", [
        { type: "equal", column: "immunization_record_id", value: records[0].id }
      ]);
    }

    const list = vaccines.map((v) => {
      const isEligible = ageWeeks >= v.schedule_age_weeks;
      const dosesGiven = receivedDoses.filter(d => d.vaccine_id === v.id);
      const isCompleted = dosesGiven.length >= v.total_doses_required;
      
      return {
        ...v,
        is_eligible: isEligible,
        is_completed: isCompleted,
        doses_received: dosesGiven.length,
        doses_remaining: Math.max(0, v.total_doses_required - dosesGiven.length)
      };
    });

    res.json({
      success: true,
      age_weeks: ageWeeks,
      age_months: ageMonths,
      vaccines: list
    });
  } catch (err) {
    console.error("Immunization Eligibility Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 3. Family Planning WHO Eligibility
// ====================================================
router.post("/fp/who-criteria", authenticateToken, async (req, res) => {
  const { method_code, medical_conditions = {} } = req.body;
  
  if (!method_code) {
    return res.status(400).json({ error: "Contraceptive method code is required" });
  }

  try {
    let category = 1; // Default to unrestricted
    const reasons = [];

    // Simple screening rules matching WHO Guidelines
    if (method_code === "PILL") {
      if (medical_conditions.hypertension) {
        category = 4;
        reasons.push("Hypertension is an absolute contraindication for combined oral contraceptive pills (WHO Category 4).");
      }
      if (medical_conditions.smoking && medical_conditions.age > 35) {
        category = 4;
        reasons.push("Smoking and age > 35 carries high cardiovascular risk with pills (WHO Category 4).");
      }
      if (medical_conditions.breastfeeding) {
        category = 3;
        reasons.push("Breastfeeding less than 6 months postpartum generally contraindicates estrogen-based pills (WHO Category 3).");
      }
    }

    if (method_code === "IUD") {
      if (medical_conditions.pid_active || medical_conditions.sti_active) {
        category = 4;
        reasons.push("Active PID or STI is an absolute contraindication for IUD insertion (WHO Category 4).");
      }
      if (medical_conditions.unexplained_bleeding) {
        category = 4;
        reasons.push("Unexplained vaginal bleeding must be evaluated before IUD insertion (WHO Category 4).");
      }
    }

    if (method_code === "INJECTABLE") {
      if (medical_conditions.hypertension) {
        category = 2; // Injectables are safer than pills for high BP
        reasons.push("Progestin-only injectable has mild restriction for hypertension (WHO Category 2).");
      }
    }

    res.json({
      success: true,
      category,
      reasons,
      recommendation: category === 1 ? "Fully Eligible" : category === 2 ? "Eligible (Advantages outweigh risks)" : category === 3 ? "Avoid if other methods available" : "Contraindicated (Do not use)"
    });
  } catch (err) {
    console.error("FP WHO Evaluation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 4. Medical Instruments & Logs
// ====================================================
router.get("/instruments", authenticateToken, async (req, res) => {
  const { category, status } = req.query;
  try {
    const filters = [{ type: "equal", column: "facility_id", value: req.user.facility_id }];
    if (category) filters.push({ type: "equal", column: "category", value: category });
    if (status) filters.push({ type: "equal", column: "status", value: status });

    const list = await db.getDocuments("medical_instruments", filters);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error("Fetch instruments error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/instruments/log-usage", authenticateToken, async (req, res) => {
  const { instrument_id, workflow_type, patient_id, encounter_id, measurement_type, result_value, result_unit } = req.body;
  
  if (!instrument_id || !workflow_type || !patient_id || !encounter_id || !measurement_type) {
    return res.status(400).json({ error: "Missing required instrument log parameters" });
  }

  try {
    // 1. Fetch instrument to verify existence and calibration
    const instruments = await db.getDocuments("medical_instruments", [
      { type: "equal", column: "id", value: instrument_id },
      { type: "equal", column: "facility_id", value: req.user.facility_id }
    ]);

    const instrument = instruments?.[0];
    if (!instrument) {
      return res.status(404).json({ error: "Medical instrument not registered in this facility" });
    }

    // Check calibration expiry
    const isCalibrated = new Date(instrument.next_calibration_date) > new Date();
    
    // Log usage
    const logId = "log_" + Math.random().toString(36).substring(2, 12);
    const newLog = await db.createDocument("instrument_usage_logs", logId, {
      facility_id: req.user.facility_id,
      instrument_id,
      workflow_type,
      patient_id,
      encounter_id,
      measurement_type,
      result_value: result_value || null,
      result_unit: result_unit || null,
      operator_id: req.user.id
    });

    // Update usage count and last used datetime on the instrument record
    await db.updateDocument("medical_instruments", instrument_id, {
      usage_count: (instrument.usage_count || 0) + 1,
      last_used_datetime: new Date().toISOString()
    });

    res.json({
      success: true,
      calibration_status: isCalibrated ? "valid" : "expired",
      next_calibration_date: instrument.next_calibration_date,
      data: newLog
    });
  } catch (err) {
    console.error("Instrument Usage Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 5. Inpatient Bed Allocations
// ====================================================
router.post("/inpatient/bed-status", authenticateToken, async (req, res) => {
  const { bed_id, status, patient_id } = req.body;
  if (!bed_id || !status) {
    return res.status(400).json({ error: "Bed ID and status are required" });
  }

  try {
    const updates = { bed_status: status };
    if (status === "occupied") {
      updates.current_patient_id = patient_id || null;
      updates.allocation_datetime = new Date().toISOString();
      updates.release_datetime = null;
    } else if (status === "clean" || status === "maintenance") {
      updates.current_patient_id = null;
      updates.release_datetime = new Date().toISOString();
    }

    await db.updateDocument("bed_allocations", bed_id, updates);
    res.json({ success: true, message: `Bed status updated successfully to ${status}` });
  } catch (err) {
    console.error("Bed allocation update error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
