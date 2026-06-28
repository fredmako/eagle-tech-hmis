const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

router.post("/ai-chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a message." });
    }

    const aiRes = await axios.post(
      `${AI_DIAGNOSIS_URL}/chat`,
      { message: message.trim() },
      { timeout: 120_000 }
    );

    res.json(aiRes.data);
  } catch (err) {
    console.error("[AI Chat] Proxy error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI chat service is unreachable." });
    }
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message || "AI chat failed.";
    res.status(status).json({ error: message });
  }
});

module.exports = router;
