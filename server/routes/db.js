const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { db } = require("../utils/db");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

// DB Proxy: Query documents
router.post("/query", async (req, res) => {
  const {
    table,
    queries = [],
    orderByField = null,
    orderByAsc = true,
  } = req.body;
  if (!table) return res.status(400).json({ error: "Table name is required" });

  // Security: only allow unauthenticated requests for 'facilities' table
  if (table !== "facilities") {
    // Authenticate token manually
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
    // If table is not a global table, automatically enforce facility filtering
    const globalTables = ["facilities", "profiles"];
    const enrichedQueries = [...queries];

    if (!globalTables.includes(table) && req.user) {
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

  // Security: only allow unauthenticated requests for 'facilities' and 'profiles' (needed during onboarding)
  if (table !== "facilities" && table !== "profiles") {
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
      const globalTables = ["facilities", "profiles"];

      // Enforce facility_id for tenant tables if authenticated
      if (
        !globalTables.includes(table) &&
        activeFacId &&
        !cleanRow.facility_id
      ) {
        cleanRow.facility_id = activeFacId;
      }

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

  try {
    // 1. Find matching documents
    const queries = [{ type: "equal", column, value }];
    const globalTables = ["facilities", "profiles"];
    if (!globalTables.includes(table)) {
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

  try {
    // 1. Find matching documents
    const queries = [{ type: "equal", column, value }];
    const globalTables = ["facilities", "profiles"];
    if (!globalTables.includes(table)) {
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
