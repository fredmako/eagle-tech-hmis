const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

// GET /api/ai-knowledge — list all knowledge entries
router.get("/ai-knowledge", async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_DIAGNOSIS_URL}/knowledge`, { timeout: 30_000 });
    return res.json(data);
  } catch (err) {
    console.error("[AI Knowledge] GET error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI knowledge service is unreachable." });
    }
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-knowledge — add a new knowledge entry
router.post("/ai-knowledge", async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }
    const { data } = await axios.post(
      `${AI_DIAGNOSIS_URL}/knowledge`,
      { title, content, tags: tags || [] },
      { timeout: 30_000 }
    );
    return res.status(201).json(data);
  } catch (err) {
    console.error("[AI Knowledge] POST error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI knowledge service is unreachable." });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
