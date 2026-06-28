const express = require("express");
const router = express.Router();
const axios = require("axios");
const { authenticateToken } = require("../middleware/auth");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

router.post("/ai-diagnose", authenticateToken, async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a symptoms description." });
    }

    const aiRes = await axios.post(
      `${AI_DIAGNOSIS_URL}/diagnose`,
      { symptoms: symptoms.trim() },
      { timeout: 120_000 }
    );

    res.json(aiRes.data);
  } catch (err) {
    console.error("[AI Diagnosis] Proxy error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI diagnosis service is unreachable." });
    }
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message || "AI diagnosis failed.";
    res.status(status).json({ error: message });
  }
});

module.exports = router;
