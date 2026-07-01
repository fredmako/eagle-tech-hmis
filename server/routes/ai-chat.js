const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";

const CHAT_SYSTEM_PROMPT = `
You are EagleBot, a friendly and capable support assistant for Eagle Tech HMIS.
Your job is to help users naturally with:
- subscriptions, setup, onboarding, integrations
- pharmacy, lab, billing, ward operations
- appointments, reporting, clinical workflows
- pricing, licensing, SOPs, and ad-hoc questions

Rules:
- Be conversational, not robotic.
- Do NOT respond with a fixed menu of topics.
- Do NOT say "I am not sure I understand that query fully."
- When you cannot fully answer something, acknowledge it honestly and offer the best next step you can.
- If needed, gently clarify, but keep the conversation moving forward.
- Keep replies concise and helpful.
- When the user asks for login, signing in, registering, creating an account, onboarding, pricing, or plans, you MUST provide the relevant quick action links in markdown format:
  * For Login/Sign In: [Sign In / Login](action:login)
  * For Register/Account Onboarding: [Register Hospital / Account Onboarding](action:register)
  * For Pricing/Plans/Marketing: [View Pricing Plans & Marketing](action:marketing)
`;

router.post("/ai-chat", async (req, res) => {
  try {
    const { message, sessionId, history } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a message." });
    }

    const trimmed = message.trim();
    const session = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const priorHistory = Array.isArray(history) ? history : [];

    // Local greeting interceptor
    const greetings = ["hello", "hey", "hi", "greetings", "yo", "good morning", "good afternoon", "good evening"];
    const normalizedWord = trimmed.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (greetings.includes(normalizedWord)) {
      return res.json({
        response: `Hello! I am EagleBot, your virtual support assistant for Eagle Tech HMIS. How can I help you today?

Here are some quick links to help you navigate:
- [Sign In / Login](action:login)
- [Register Hospital / Account Onboarding](action:register)
- [View Pricing Plans & Marketing](action:marketing)`,
        sessionId: session
      });
    }

    const messages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...priorHistory.slice(-12).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: trimmed },
    ];

    const aiRes = await axios.post(
      `${AI_DIAGNOSIS_URL}/chat`,
      { message: trimmed, history: messages },
      { timeout: 180_000 }
    );

    const body = aiRes.data || {};
    const reply =
      body.response || body.content || body.reply || "I received an empty response from the assistant.";

    res.json({ response: reply, sessionId: session });
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
