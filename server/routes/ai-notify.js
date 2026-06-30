const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

router.post("/ai-notify", async (req, res) => {
  try {
    const { event, payload, facilityName, contextSummary } = req.body;

    if (!event || !payload) {
      return res.status(400).json({ error: "Event and payload are required." });
    }

    const prompt = `You are an intelligent healthcare operations assistant for a hospital management system.

Event type: ${event}
Facility: ${facilityName || "Healthcare Facility"}
Event payload:
${JSON.stringify(payload, null, 2)}

${contextSummary ? `Additional operational context:\n${contextSummary}\n` : ""}

Write an improved, professional email notification for this event. Return JSON with:
- subject: concise, actionable subject line
- body: professional plain-text or HTML-ready body with clear next steps
- priority: "low" | "normal" | "high" | "urgent"
- summary: one-sentence executive summary of what happened`;

    const aiRes = await axios.post(
      `${AI_DIAGNOSIS_URL}/chat`,
      {
        message: prompt,
        system_prompt:
          "You are a healthcare operations assistant.",
      },
      { timeout: 180_000 }
    );

    const content = aiRes.data?.response || aiRes.data?.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        subject: null,
        body: content,
        priority: "normal",
        summary: content.slice(0, 180),
      };
    }

    res.json({
      success: true,
      subject: parsed.subject || null,
      body: parsed.body || content,
      priority: parsed.priority || "normal",
      summary: parsed.summary || null,
      raw: content,
    });
  } catch (err) {
    console.error("[AI Notify] Proxy error:", err.message);
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({ error: "AI notification service is unreachable." });
    }
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message || "AI notification failed.";
    res.status(status).json({ error: message });
  }
});

module.exports = router;
