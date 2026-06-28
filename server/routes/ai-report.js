const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

router.post("/ai-report", async (req, res) => {
  try {
    const { mode, prompt, context } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a prompt for the report writer." });
    }

    const body = {
      prompt: prompt.trim(),
      mode: mode || "adhoc",
    };

    if (context && typeof context === "object") {
      body.context = context;
    }

    const aiRes = await axios.post(
      `${AI_DIAGNOSIS_URL}/report`,
      body,
      { timeout: 180_000 }
    );

    res.json(aiRes.data);
  } catch (err) {
    console.error("[AI Report] Proxy error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI report service is unreachable." });
    }
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message || "AI report failed.";
    res.status(status).json({ error: message });
  }
});

module.exports = router;
