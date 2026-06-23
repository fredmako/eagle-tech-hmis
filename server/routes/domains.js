const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");

const VERCEL_API_URL = "https://api.vercel.com";

// Helper to check if user has admin/owner rights for a facility
function isAuthorized(user, facilityId) {
  if (user.role === "super_admin") return true;
  if (user.role === "admin" || user.role === "facility_admin" || user.role === "hr_manager") {
    return user.facility_id === facilityId;
  }
  return false;
}

// 1. Add Domain to Vercel Project
router.post("/add", authenticateToken, async (req, res) => {
  const { domain, facilityId } = req.body;
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if (!domain || !facilityId) {
    return res.status(400).json({ error: "Domain and facilityId are required." });
  }

  // Authorize user
  if (!isAuthorized(req.user, facilityId)) {
    return res.status(403).json({ error: "Unauthorized to configure domain settings for this facility." });
  }

  // Clean domain name input
  const cleanDomain = domain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "");
  if (!cleanDomain) {
    return res.status(400).json({ error: "Invalid domain name format." });
  }

  try {
    let vercelRegistered = false;
    let detailsMessage = `Domain configuration updated locally for facility.`;

    // Only hit Vercel API if credentials are set
    if (VERCEL_TOKEN && PROJECT_ID) {
      try {
        const url = `${VERCEL_API_URL}/v9/projects/${PROJECT_ID}/domains`;
        await axios.post(
          url,
          { name: cleanDomain },
          {
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        vercelRegistered = true;
        detailsMessage = `Registered custom domain '${cleanDomain}' dynamically with Vercel project.`;
      } catch (vercelErr) {
        // If domain is already added to project, Vercel returns 409 or similar. We can treat it as registered.
        const code = vercelErr.response?.data?.error?.code;
        if (code === "domain_already_in_use" || code === "domain_taken") {
          vercelRegistered = true;
          detailsMessage = `Re-linked existing custom domain '${cleanDomain}' with Vercel project.`;
        } else {
          console.error("Vercel API registration failed:", vercelErr.response?.data || vercelErr.message);
          throw new Error(vercelErr.response?.data?.error?.message || "Failed to register domain with Vercel API.");
        }
      }
    } else {
      console.log(`[Vercel Domain Config] Simulation Mode: Registered custom domain '${cleanDomain}' for facility '${facilityId}'`);
      vercelRegistered = true;
    }

    if (vercelRegistered) {
      // Save custom_domain and domain_status to facility details
      await db.updateDocument("facilities", facilityId, {
        custom_domain: cleanDomain,
        domain_status: "pending"
      });

      // Audit Log
      await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
        facility_id: facilityId,
        user_id: req.user.id,
        action: "Custom Domain Configured",
        details: `${detailsMessage} DNS configuration set to pending.`
      });

      return res.json({
        success: true,
        message: "Domain added successfully. Please configure your DNS settings.",
        dnsConfig: {
          A_record: "76.76.21.21",
          CNAME_record: "cname.vercel-dns.com"
        }
      });
    } else {
      throw new Error("Unable to complete Vercel registration.");
    }
  } catch (err) {
    console.error("Add custom domain error:", err);
    return res.status(500).json({ error: err.message || "Internal server error occurred while adding custom domain." });
  }
});

// 2. Query/Verify DNS configuration on Vercel
router.get("/status", authenticateToken, async (req, res) => {
  const { domain, facilityId } = req.query;
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if (!domain || !facilityId) {
    return res.status(400).json({ error: "domain and facilityId query parameters are required." });
  }

  // Authorize user
  if (!isAuthorized(req.user, facilityId)) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  try {
    // If no Vercel config, simulate active state for local sandbox
    if (!VERCEL_TOKEN || !PROJECT_ID) {
      await db.updateDocument("facilities", facilityId, {
        domain_status: "active"
      });
      return res.json({
        verified: true,
        misconfigured: false,
        simulated: true,
        message: "Simulation Mode: DNS verified and domain is active."
      });
    }

    const cleanDomain = domain.trim().toLowerCase();
    const projectUrl = `${VERCEL_API_URL}/v9/projects/${PROJECT_ID}/domains/${cleanDomain}`;

    const projectRes = await axios.get(projectUrl, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });

    const isVerified = projectRes.data.verified === true;
    const isMisconfigured = projectRes.data.verification ? true : false;

    if (isVerified) {
      // Update database status to active
      await db.updateDocument("facilities", facilityId, {
        domain_status: "active"
      });
    } else {
      await db.updateDocument("facilities", facilityId, {
        domain_status: "pending"
      });
    }

    return res.json({
      verified: isVerified,
      misconfigured: isMisconfigured,
      dnsChallenges: projectRes.data.verification || null
    });
  } catch (err) {
    console.error("Verification status query failed:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to retrieve verification status from Vercel." });
  }
});

module.exports = router;
