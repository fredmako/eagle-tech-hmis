const express = require("express");
const router = express.Router();
const axios = require("axios");
const { knowledgeEntries, syncKnowledgeBase } = require("../utils/knowledgeSync");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";
const KNOWLEDGE_URL = `${AI_DIAGNOSIS_URL}/knowledge`;

function logKnowledgeError(context, err) {
  console.error(`[AI Knowledge] ${context} failed for ${KNOWLEDGE_URL}`);
  if (err.response) {
    console.error("[AI Knowledge] upstream status:", err.response.status);
    console.error("[AI Knowledge] upstream body:", err.response.data);
  } else {
    console.error("[AI Knowledge] error stack:", err.stack || err.message);
  }
}

// GET /api/ai-knowledge/ping - test the upstream knowledge service directly
async function pingKnowledge(req, res) {
  console.log(`[AI Knowledge] pinging upstream: ${KNOWLEDGE_URL}`);
  try {
    const upstream = await axios.get(KNOWLEDGE_URL, { timeout: 30_000 });
    return res.json({
      status: upstream.status,
      body: upstream.data,
    });
  } catch (err) {
    logKnowledgeError("PING", err);
    return res.status(502).json({
      error: "AI knowledge upstream ping failed.",
      url: KNOWLEDGE_URL,
      status: err.response?.status || null,
      body: err.response?.data || null,
      message: err.message,
      stack: err.stack,
    });
  }
}

// GET /api/ai-knowledge — list all knowledge entries
async function listKnowledge(req, res) {
  console.log(`[AI Knowledge] GET upstream: ${KNOWLEDGE_URL}`);
  try {
    const { data, status } = await axios.get(KNOWLEDGE_URL, { timeout: 30_000 });
    console.log(`[AI Knowledge] GET upstream status: ${status}`);
    return res.json(data);
  } catch (err) {
    logKnowledgeError("GET", err);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI knowledge service is unreachable." });
    }
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/ai-knowledge — add a new knowledge entry
async function addKnowledge(req, res) {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }
    console.log(`[AI Knowledge] POST upstream: ${KNOWLEDGE_URL}`);
    const { data } = await axios.post(
      KNOWLEDGE_URL,
      { title, content, tags: tags || [] },
      { timeout: 30_000 }
    );
    return res.status(201).json(data);
  } catch (err) {
    logKnowledgeError("POST", err);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI knowledge service is unreachable." });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function syncKnowledge(req, res) {
  const expectedSecret = process.env.KNOWLEDGE_SYNC_SECRET;
  const providedSecret = req.headers["x-knowledge-sync-secret"];

  if (!expectedSecret) {
    return res.status(503).json({ error: "Knowledge sync endpoint is not configured." });
  }

  if (expectedSecret && providedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Invalid knowledge sync secret." });
  }

  try {
    const entries = Array.isArray(req.body?.entries) && req.body.entries.length > 0
      ? req.body.entries
      : knowledgeEntries;
    const result = await syncKnowledgeBase({ entries });
    return res.json({ success: true, ...result });
  } catch (err) {
    logKnowledgeError("SYNC", err);
    return res.status(500).json({
      error: "AI knowledge sync failed.",
      message: err.message,
      status: err.response?.status || null,
      body: err.response?.data || null,
    });
  }
}

// Supports both mount styles:
// app.use("/api/ai-knowledge", router) -> /
// app.use("/api", router) -> /ai-knowledge
router.get(["/ping", "/ai-knowledge/ping"], pingKnowledge);
router.post(["/sync", "/ai-knowledge/sync"], syncKnowledge);
router.get(["/", "/ai-knowledge"], listKnowledge);
router.post(["/", "/ai-knowledge"], addKnowledge);

module.exports = router;
