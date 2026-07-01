const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

// Middleware to authenticate token (for admin view/delete operations)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);
    req.user = decodedUser;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired session token" });
  }
};

// 1. POST /api/demo/request - Public route to book a live demo
router.post("/request", async (req, res) => {
  const { name, email, phone, preferred_date, preferred_time } = req.body;

  if (!name || !email || !phone || !preferred_date || !preferred_time) {
    return res.status(400).json({ error: "All fields are required to request a demo" });
  }

  try {
    const demoId = "demo_" + Math.random().toString(36).substring(2, 12);
    const newDemo = {
      id: demoId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      preferred_date,
      preferred_time,
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Save to the database
    await db.createDocument("demo_requests", demoId, newDemo);

    // Call WhatsApp API if Key is present
    const apiKey = process.env.WHATSAPP_API_KEY;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const watiApiEndpoint = process.env.WATI_API_ENDPOINT;

    let whatsappDispatched = false;
    let whatsappError = null;

    const msgText = `Hi ${name.trim()},\n\nThank you for requesting a demo of Eagle Tech HMIS! We have registered your session slot for ${preferred_date} at ${preferred_time}.\n\nOur solutions engineer will contact you shortly on this number to guide you through the clinical & administrative workspaces.\n\nBest regards,\nEagle Tech Solutions Team`;

    console.log(`[WhatsApp Demo Alert] Dispatch initiated.`);
    console.log(`To: ${phone.trim()}`);
    console.log(`Message:\n"${msgText}"`);

    if (apiKey) {
      try {
        if (watiApiEndpoint) {
          // Wati Gateway Dispatch
          const cleanPhone = phone.trim().replace("+", "");
          const watiUrl = `${watiApiEndpoint.replace(/\/$/, "")}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(msgText)}`;
          
          console.log(`[WhatsApp Wati] Dispatching message via: ${watiUrl}`);
          const watiRes = await fetch(watiUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });

          if (watiRes.ok) {
            whatsappDispatched = true;
            console.log(`[WhatsApp Wati] Message sent successfully to ${phone}`);
          } else {
            const watiErrText = await watiRes.text();
            throw new Error(`Wati API returned status ${watiRes.status}: ${watiErrText}`);
          }
        } else if (whatsappPhoneId) {
          // Meta Cloud API Dispatch
          const metaUrl = `https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`;
          console.log(`[WhatsApp Meta] Dispatching template message via: ${metaUrl}`);

          const metaRes = await fetch(metaUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phone.trim(),
              type: "text",
              text: { body: msgText }
            })
          });

          if (metaRes.ok) {
            whatsappDispatched = true;
            console.log(`[WhatsApp Meta] Message sent successfully to ${phone}`);
          } else {
            const metaErr = await metaRes.json();
            throw new Error(`Meta API Error: ${JSON.stringify(metaErr)}`);
          }
        } else {
          // Generic Custom HTTP Webhook Dispatch
          console.log(`[WhatsApp Custom] Dispatching via generic webhook...`);
          const customRes = await fetch("https://api.eagletechsolutions.tech/whatsapp/webhook", {
            method: "POST",
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: phone.trim(),
              message: msgText
            })
          });
          whatsappDispatched = customRes.ok;
        }
      } catch (wsErr) {
        console.error(`[WhatsApp API Dispatch Failed]:`, wsErr.message);
        whatsappError = wsErr.message;
      }
    } else {
      console.log(`[WhatsApp Alert Simulation] No WHATSAPP_API_KEY environment variable detected. Alert simulated successfully.`);
      whatsappDispatched = true; // Mark as true since simulation completed
    }

    // Log audit trail
    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: "system",
      user_id: "public_landing",
      action: "Demo Booking",
      details: `Prospect ${name} (${email}) booked a live demo for ${preferred_date} at ${preferred_time}. WhatsApp status: ${whatsappDispatched ? "Dispatched" : "Failed: " + whatsappError}`
    });

    res.json({
      success: true,
      message: "Your live demo request has been successfully booked!",
      demoId,
      whatsappDispatched,
      whatsappError
    });
  } catch (err) {
    console.error("Demo request booking failure:", err);
    res.status(500).json({ error: err.message || "Failed to submit demo request." });
  }
});

// 2. GET /api/demo/list - Retrieve all booked demo requests (Admin/Super Admin only)
router.get("/list", authenticateToken, async (req, res) => {
  if (req.user.role !== "super_admin" && req.user.role !== "platform_support") {
    return res.status(403).json({ error: "Access denied. Super Admin privileges required." });
  }

  try {
    const list = await db.getDocuments("demo_requests", [], "created_at", false);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error("Failed to fetch demo requests list:", err);
    if (/demo_requests|relation .* does not exist|schema cache/i.test(err.message || "")) {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ error: err.message || "Failed to fetch prospects." });
  }
});

// 3. POST /api/demo/status - Update demo request status (Admin/Super Admin only)
router.post("/status", authenticateToken, async (req, res) => {
  if (req.user.role !== "super_admin" && req.user.role !== "platform_support") {
    return res.status(403).json({ error: "Access denied. Super Admin privileges required." });
  }

  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "Demo request ID and status are required." });
  }

  try {
    await db.updateDocument("demo_requests", id, { status });
    res.json({ success: true, message: `Demo request status updated to ${status}.` });
  } catch (err) {
    console.error("Failed to update demo request status:", err);
    res.status(500).json({ error: err.message || "Failed to update status." });
  }
});

module.exports = router;
