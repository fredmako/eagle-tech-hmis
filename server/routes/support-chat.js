const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { supabaseClient, isRealSupabase } = require("../utils/db");

router.post("/support-chat-ticket", optionalAuth, async (req, res) => {
  try {
    const {
      subject,
      description,
      priority = "normal",
      facility_id = null,
      user_id = null,
      contact_email = null,
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: "Subject and description are required." });
    }

    const ticket = {
      subject,
      description,
      priority,
      status: "open",
      facility_id,
      user_id: user_id || null,
      contact_email: contact_email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: "ai_chat",
    };

    if (isRealSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from("support_tickets")
        .insert([ticket])
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message || "Failed to create ticket." });
      }
      return res.status(201).json({ success: true, ticket: data });
    }

    return res.status(500).json({ error: "Database is not configured for ticket creation." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
