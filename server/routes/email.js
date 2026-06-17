const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const { isRealSupabase, loadSandboxDB, saveSandboxDB } = require("../utils/db");

// SMTP EMAIL ROUTING ENDPOINT
router.post("/send-email", async (req, res) => {
  const { email, subject, html, facilityId, smtpConfig } = req.body;
  if (!email || !subject || !html) {
    return res
      .status(400)
      .json({ error: "Email, subject, and html body are required" });
  }

  // Bypass on server for Supabase native/supported emails in production
  const isAuthEmail = subject.includes("Password Reset") || 
                      subject.includes("Welcome to your Eagle Tech") || 
                      subject.includes("Portal Setup Success") ||
                      subject.includes("Reset Request");

  if (isRealSupabase && isAuthEmail) {
    console.log(`[Server Email Router] Bypassing custom SMTP send for Supabase-supported email subject: "${subject}"`);
    return res.json({
      success: true,
      message: "Bypassed on server. Delegated to Supabase native email template.",
      messageId: "supabase-delegated-server"
    });
  }

  try {
    // Try to get SMTP settings (defaults to Titan SMTP or system values)
    const host = smtpConfig?.host || process.env.SMTP_HOST || "smtp.titan.email";
    const port = parseInt(smtpConfig?.port || process.env.SMTP_PORT || "465");
    const userMail = smtpConfig?.username || process.env.SMTP_USER || "admin@eagletechsolutions.tech";
    const passMail = smtpConfig?.password || process.env.SMTP_PASS || "";

    if (!passMail) {
      console.log(
        "SMTP Password not configured. Email logged to simulated outbox."
      );
      if (!isRealSupabase) {
        const data = loadSandboxDB();
        data.email_logs.push({
          id: "mail_" + Math.random().toString(36).substring(2, 12),
          recipient: email,
          subject,
          html,
          status: "sent_simulated",
          created_at: new Date().toISOString(),
        });
        saveSandboxDB(data);
      }
      return res.json({
        success: true,
        message: "Simulated dispatch logged successfully.",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: userMail,
        pass: passMail,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const senderName = smtpConfig?.sender_name || "Eagle Tech HMIS";
    const senderEmail = smtpConfig?.sender_email || userMail;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: email,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Email dispatch error:", err);
    res.status(500).json({ error: err.message || "SMTP dispatch failed" });
  }
});

module.exports = router;
