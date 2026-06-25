const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");

// Haversine formula to compute distance in meters
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// 1. Clock In
router.post("/clock-in", authenticateToken, async (req, res) => {
  const { latitude, longitude, notes } = req.body;
  const user = req.user;

  try {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Device location coordinates are required for verification." });
    }

    // Fetch facility
    const facilities = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: user.facility_id }
    ]);
    const facility = facilities && facilities[0];

    if (!facility) {
      return res.status(404).json({ error: "Facility not found." });
    }

    // If geofence coordinates are set on the facility
    if (facility.latitude !== undefined && facility.latitude !== null &&
        facility.longitude !== undefined && facility.longitude !== null) {
      const distance = getHaversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(facility.latitude),
        parseFloat(facility.longitude)
      );

      const maxRadius = facility.geofence_radius_meters || 100;
      if (distance > maxRadius) {
        return res.status(400).json({
          error: `Decline: You are not within the facility boundaries. Calculated distance: ${Math.round(distance)}m. Allowed: ${maxRadius}m.`
        });
      }
    }

    // Determine status: Late if clock-in is after 08:00 AM
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let status = "On-Time";
    if (hours > 8 || (hours === 8 && minutes > 0)) {
      status = "Late";
    }

    const logId = 'att_' + Math.random().toString(36).substring(2, 12);
    const newLog = {
      facility_id: user.facility_id,
      user_id: user.id,
      clock_in: now.toISOString(),
      clock_out: null,
      status: status,
      notes: notes || "Location Verified Check-in",
      clock_in_latitude: latitude,
      clock_in_longitude: longitude
    };

    const created = await db.createDocument("attendance_logs", logId, newLog);

    // Audit logs
    const auditId = 'aud_' + Math.random().toString(36).substring(2, 12);
    await db.createDocument("audit_logs", auditId, {
      facility_id: user.facility_id,
      user_id: user.id,
      action: "Clock-In (Geofenced)",
      details: `Clocked in via mobile/web coordinates (${latitude}, ${longitude}). Status: ${status}.`
    });

    // Alert if Late
    if (status === "Late") {
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      await db.createDocument("notifications", notifId, {
        facility_id: user.facility_id,
        title: "Late Clock-in Flagged",
        message: `${user.full_name || 'Staff'} checked in late today at ${now.toLocaleTimeString()}. Notes: ${notes}`,
        target_role: "admin",
        is_read: false
      });
    }

    res.json({ success: true, log: { id: logId, ...newLog } });

  } catch (err) {
    console.error("Geofence Clock-in Error:", err);
    res.status(500).json({ error: err.message || "Failed to process clock-in." });
  }
});

// 2. Clock Out
router.post("/clock-out", authenticateToken, async (req, res) => {
  const { latitude, longitude, notes } = req.body;
  const user = req.user;

  try {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Device location coordinates are required for verification." });
    }

    // Fetch active log
    const logs = await db.getDocuments("attendance_logs", [
      { type: "equal", column: "user_id", value: user.id },
      { type: "is", column: "clock_out", value: null }
    ]);
    const activeLog = logs && logs[0];

    if (!activeLog) {
      return res.status(404).json({ error: "No active clock-in log found." });
    }

    // Fetch facility
    const facilities = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: user.facility_id }
    ]);
    const facility = facilities && facilities[0];

    if (facility && facility.latitude !== undefined && facility.latitude !== null &&
        facility.longitude !== undefined && facility.longitude !== null) {
      const distance = getHaversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(facility.latitude),
        parseFloat(facility.longitude)
      );

      const maxRadius = facility.geofence_radius_meters || 100;
      if (distance > maxRadius) {
        return res.status(400).json({
          error: `Decline: You are not within the facility boundaries to clock out. Calculated distance: ${Math.round(distance)}m. Allowed: ${maxRadius}m.`
        });
      }
    }

    const now = new Date();
    const hours = now.getHours();
    let status = activeLog.status;
    if (hours < 17) {
      status = status + " / Early Departure";
    }

    await db.updateDocument("attendance_logs", activeLog.id, {
      clock_out: now.toISOString(),
      status: status,
      notes: notes ? `${activeLog.notes} | Out: ${notes}` : activeLog.notes,
      clock_out_latitude: latitude,
      clock_out_longitude: longitude
    });

    const auditId = 'aud_' + Math.random().toString(36).substring(2, 12);
    await db.createDocument("audit_logs", auditId, {
      facility_id: user.facility_id,
      user_id: user.id,
      action: "Clock-Out (Geofenced)",
      details: `Clocked out via mobile/web coordinates (${latitude}, ${longitude}). Status: ${status}.`
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Geofence Clock-out Error:", err);
    res.status(500).json({ error: err.message || "Failed to process clock-out." });
  }
});

// 3. Batch Sync Offline Logs
router.post("/sync-offline", authenticateToken, async (req, res) => {
  const { logs } = req.body;
  const user = req.user;

  if (!Array.isArray(logs)) {
    return res.status(400).json({ error: "Invalid logs payload." });
  }

  try {
    const facilities = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: user.facility_id }
    ]);
    const facility = facilities && facilities[0];

    if (!facility) {
      return res.status(404).json({ error: "Facility not found." });
    }

    const results = [];

    for (const offlineLog of logs) {
      const { type, timestamp, latitude, longitude, notes, id } = offlineLog;

      if (latitude === undefined || longitude === undefined) {
        results.push({ id, status: "declined", reason: "Coordinates missing." });
        continue;
      }

      // Geofence check
      let inGeofence = true;
      let calculatedDistance = 0;
      const maxRadius = facility.geofence_radius_meters || 100;

      if (facility.latitude !== undefined && facility.latitude !== null &&
          facility.longitude !== undefined && facility.longitude !== null) {
        calculatedDistance = getHaversineDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(facility.latitude),
          parseFloat(facility.longitude)
        );

        if (calculatedDistance > maxRadius) {
          inGeofence = false;
        }
      }

      if (!inGeofence) {
        results.push({
          id,
          status: "declined",
          reason: `Decline: Out of bounds (${Math.round(calculatedDistance)}m from facility).`
        });
        continue;
      }

      const logTime = new Date(timestamp || Date.now());

      if (type === "in") {
        // Clock In
        const hours = logTime.getHours();
        const minutes = logTime.getMinutes();
        let status = "On-Time";
        if (hours > 8 || (hours === 8 && minutes > 0)) {
          status = "Late";
        }

        const logId = 'att_' + Math.random().toString(36).substring(2, 12);
        const newLog = {
          facility_id: user.facility_id,
          user_id: user.id,
          clock_in: logTime.toISOString(),
          clock_out: null,
          status: status + " (Offline Synced)",
          notes: notes || "Offline Location-Captured Check-in",
          clock_in_latitude: latitude,
          clock_in_longitude: longitude
        };

        await db.createDocument("attendance_logs", logId, newLog);
        results.push({ id, status: "synced", dbId: logId });

      } else if (type === "out") {
        // Clock Out
        const activeLogs = await db.getDocuments("attendance_logs", [
          { type: "equal", column: "user_id", value: user.id },
          { type: "is", column: "clock_out", value: null }
        ]);
        const activeLog = activeLogs && activeLogs[0];

        if (!activeLog) {
          results.push({ id, status: "declined", reason: "No active clock-in log to match offline clock-out." });
          continue;
        }

        const hours = logTime.getHours();
        let status = activeLog.status;
        if (hours < 17) {
          status = status + " / Early Departure";
        }

        await db.updateDocument("attendance_logs", activeLog.id, {
          clock_out: logTime.toISOString(),
          status: status + " (Offline Synced)",
          notes: notes ? `${activeLog.notes} | Out: ${notes}` : activeLog.notes,
          clock_out_latitude: latitude,
          clock_out_longitude: longitude
        });

        results.push({ id, status: "synced", dbId: activeLog.id });
      }
    }

    res.json({ success: true, results });

  } catch (err) {
    console.error("Offline sync error:", err);
    res.status(500).json({ error: err.message || "Failed to process offline sync." });
  }
});

module.exports = router;
