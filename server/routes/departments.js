const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");

// 1. GET /api/departments - Fetch all active departments for the logged-in user's facility
router.get("/", authenticateToken, async (req, res) => {
  try {
    const list = await db.getDocuments("departments", [
      { type: "equal", column: "facility_id", value: req.user.facility_id }
    ]);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error("Fetch departments error:", err);
    res.status(500).json({ error: err.message || "Error loading departments" });
  }
});

// 2. POST /api/departments - Add a custom department (Extensive plan only)
router.post("/", authenticateToken, async (req, res) => {
  const { name, code, type, specialty = "general" } = req.body;
  if (!name || !code || !type) {
    return res.status(400).json({ error: "Name, code, and type are required" });
  }

  try {
    // Check facility license tier
    const facilities = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: req.user.facility_id }
    ]);
    const facility = facilities?.[0];

    if (!facility) {
      return res.status(404).json({ error: "Facility context not found" });
    }

    if (facility.license_tier !== "extensive") {
      return res.status(403).json({ 
        error: "Custom departments configuration is restricted. Please upgrade to the Extensive Plan." 
      });
    }

    const docId = "dept_" + Math.random().toString(36).substring(2, 12);
    const newDept = await db.createDocument("departments", docId, {
      facility_id: req.user.facility_id,
      name,
      code: code.toUpperCase(),
      type,
      specialty,
      is_active: true
    });

    // Log audit trail
    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id,
      user_id: req.user.id,
      action: "DEPARTMENT_CREATED",
      details: `Created new department: ${name} (${code.toUpperCase()}) of type ${type}.`
    });

    res.json({ success: true, data: newDept });
  } catch (err) {
    console.error("Create department error:", err);
    res.status(500).json({ error: err.message || "Error creating department" });
  }
});

// 3. PUT /api/departments/:id - Edit an existing department
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, code, type, specialty, is_active } = req.body;

  try {
    // Load existing department to verify facility ownership
    const depts = await db.getDocuments("departments", [
      { type: "equal", column: "id", value: id },
      { type: "equal", column: "facility_id", value: req.user.facility_id }
    ]);

    if (!depts || depts.length === 0) {
      return res.status(404).json({ error: "Department not found in your facility" });
    }

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (code !== undefined) updatedData.code = code.toUpperCase();
    if (type !== undefined) updatedData.type = type;
    if (specialty !== undefined) updatedData.specialty = specialty;
    if (is_active !== undefined) updatedData.is_active = is_active;

    const updatedDept = await db.updateDocument("departments", id, updatedData);

    // Log audit trail
    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id,
      user_id: req.user.id,
      action: "DEPARTMENT_UPDATED",
      details: `Updated department ID ${id} settings.`
    });

    res.json({ success: true, data: updatedDept });
  } catch (err) {
    console.error("Update department error:", err);
    res.status(500).json({ error: err.message || "Error updating department" });
  }
});

// 4. DELETE /api/departments/:id - Delete / deactivate a department
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Load department to verify ownership
    const depts = await db.getDocuments("departments", [
      { type: "equal", column: "id", value: id },
      { type: "equal", column: "facility_id", value: req.user.facility_id }
    ]);

    if (!depts || depts.length === 0) {
      return res.status(404).json({ error: "Department not found in your facility" });
    }

    await db.deleteDocument("departments", id);

    // Log audit trail
    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id,
      user_id: req.user.id,
      action: "DEPARTMENT_DELETED",
      details: `Deleted department: ${depts[0].name} (${depts[0].code}).`
    });

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("Delete department error:", err);
    res.status(500).json({ error: err.message || "Error deleting department" });
  }
});

module.exports = router;
