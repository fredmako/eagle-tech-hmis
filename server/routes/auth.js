const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const { isRealSupabase, supabaseClient, loadSandboxDB, saveSandboxDB, db } = require("../utils/db");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

const roleList = (role) => String(role || "").split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
const hasAnyRole = (user, allowed) => roleList(user?.role).some((role) => allowed.includes(role));
const canManageFacilityAccess = (user) => hasAnyRole(user, ["admin", "super_admin", "facility_admin", "hr_manager"]);
const canInviteStaff = (user) => hasAnyRole(user, ["admin", "super_admin", "facility_admin", "hr_manager"]);

const resolveFacilityId = (user, headers = {}) => {
  if (hasAnyRole(user, ["super_admin"]) && headers["x-facility-id"]) {
    return headers["x-facility-id"];
  }
  return user?.facility_id;
};

const isInactiveProfile = (profile) => {
  const status = String(profile?.access_status || "active").toLowerCase();
  return status === "suspended" || status === "deleted" || status === "terminated";
};

const assertProfileActive = (profile) => {
  if (isInactiveProfile(profile)) {
    const status = String(profile.access_status || "suspended").toUpperCase();
    const err = new Error(`Access ${status}: this staff profile is not active. Contact the facility administrator.`);
    err.statusCode = 403;
    throw err;
  }
};

const isValidWalletAddress = (address) => {
  if (!address) return true;
  const clean = String(address).trim();
  return /^0x[a-fA-F0-9]{40}$/.test(clean) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
};

// User Signup
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }

  try {
    if (isRealSupabase) {
      // Create user account on Supabase
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: name,
        },
      });

      if (error) throw new Error(error.message);

      res.json({
        success: true,
        user: { id: user.id, email: user.email, name },
      });
    } else {
      // Local sandbox signup
      const data = loadSandboxDB();
      const existingUser = data.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "An account with this email already exists" });
      }

      const userId = "u_mock_" + Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      data.users.push({ id: userId, email, passwordHash, name });
      saveSandboxDB(data);

      res.json({ success: true, user: { id: userId, email, name } });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error occurred during registration" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password, requestedFacilityId } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    let verifiedUserId = null;
    let verifiedEmail = null;
    let verifiedName = null;

    if (isRealSupabase) {
      // Verify credentials using Supabase
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.admin.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(
          `[Login] Supabase auth failed for ${email}:`,
          error.message
        );
        return res
          .status(401)
          .json({ error: "Invalid email or password credentials" });
      }

      verifiedUserId = user.id;
      verifiedEmail = user.email;
      verifiedName = user.user_metadata?.full_name || user.email;

      console.log(
        `[Login] Supabase auth successful for: ${verifiedEmail} (ID: ${verifiedUserId})`
      );
    } else {
      // Sandbox mode login
      const data = loadSandboxDB();
      const user = data.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!user) {
        return res
          .status(401)
          .json({ error: "Invalid email or password credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res
          .status(401)
          .json({ error: "Invalid email or password credentials" });
      }

      verifiedUserId = user.id;
      verifiedEmail = user.email;
      verifiedName = user.name;
    }

    const verifiedEmailClean = verifiedEmail ? verifiedEmail.toLowerCase().trim() : "";

    // Check if profile exists
    let profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: verifiedEmailClean },
    ]);

    let activeProfile = null;

    if (verifiedEmailClean === "fredrickmakori102@gmail.com") {
      activeProfile = profiles && profiles.find(p => p.role === "super_admin");
      if (!activeProfile && profiles && profiles.length > 0) {
        activeProfile = profiles[0];
      }
      if (!activeProfile) {
        activeProfile = await db.createDocument("profiles", verifiedUserId, {
          full_name: "Fredrick Makori (Super Admin)",
          role: "super_admin",
          facility_id: isRealSupabase ? "f1" : null,
          email: verifiedEmailClean
        });
      } else if (activeProfile.role !== "super_admin" || activeProfile.email !== verifiedEmailClean) {
        await db.updateDocument("profiles", activeProfile.id, {
          role: "super_admin",
          email: verifiedEmailClean
        });
        activeProfile.role = "super_admin";
        activeProfile.email = verifiedEmailClean;
      }
    } else {
      if (requestedFacilityId) {
        activeProfile = profiles && profiles.find(p => p.facility_id === requestedFacilityId);
        
        // If we found profiles but none of them match the requested facility:
        if (!activeProfile && profiles && profiles.length > 0) {
          return res.status(401).json({
            error: "Access Denied: Your account is not registered under this facility subdomain."
          });
        }
      } else {
        activeProfile = profiles && profiles[0];
      }

      if (!activeProfile) {
        // Check if this email belongs to a patient
        const allPatients = await db.getDocuments("patients", []);
        let matchingPatient = null;
        if (requestedFacilityId) {
          matchingPatient = allPatients.find(pt => {
            if (pt.facility_id !== requestedFacilityId) return false;
            try {
              const contact = JSON.parse(pt.phone);
              return contact.email && contact.email.toLowerCase().trim() === verifiedEmailClean;
            } catch (e) {
              return false;
            }
          });
          
          // If the patient is found in other facilities but not this requested one, reject
          if (!matchingPatient) {
            const anyMatchingPatient = allPatients.find(pt => {
              try {
                const contact = JSON.parse(pt.phone);
                return contact.email && contact.email.toLowerCase().trim() === verifiedEmailClean;
              } catch (e) {
                return false;
              }
            });
            if (anyMatchingPatient) {
              return res.status(401).json({
                error: "Access Denied: Your account is not registered under this facility subdomain."
              });
            }
          }
        } else {
          matchingPatient = allPatients.find(pt => {
            try {
              const contact = JSON.parse(pt.phone);
              return contact.email && contact.email.toLowerCase().trim() === verifiedEmailClean;
            } catch (e) {
              return false;
            }
          });
        }

        if (matchingPatient) {
          // Automatically create a profile for the patient!
          activeProfile = await db.createDocument("profiles", verifiedUserId, {
            full_name: matchingPatient.name,
            role: "patient",
            facility_id: matchingPatient.facility_id,
            email: verifiedEmailClean
          });
        } else {
          // Query if there is a pending/rejected role request
          const requests = await db.getDocuments("role_requests", [
            { type: "equal", column: "email", value: verifiedEmailClean },
          ]);
          const activeRequest = requests && requests[0];

          // If a role request exists, verify it doesn't mismatch the requested facility
          if (activeRequest && requestedFacilityId && activeRequest.facility_id !== requestedFacilityId) {
            return res.status(401).json({
              error: "Access Denied: Your account is not registered under this facility subdomain."
            });
          }

          return res.json({
            status: "no_profile",
            user: { id: verifiedUserId, email: verifiedEmailClean, name: verifiedName },
            pendingRequest: activeRequest || null,
          });
        }
      }
    }

    assertProfileActive(activeProfile);

    if (activeProfile && activeProfile.role !== "super_admin" && requestedFacilityId) {
      if (activeProfile.facility_id && activeProfile.facility_id !== requestedFacilityId) {
        return res.status(401).json({
          error: "Access Denied: Your account is not registered under this facility subdomain."
        });
      }
    }

    // Fetch facilities to attach logo & details
    const facs = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: activeProfile.facility_id },
    ]);
    const facility = facs && facs[0];

    // Sign JWT Token
    const userPayload = {
      id: verifiedUserId,
      user_id: verifiedUserId,
      email: verifiedEmail,
      full_name: activeProfile.full_name,
      role: activeProfile.role,
      facility_id: activeProfile.facility_id,
      tenant_id: activeProfile.facility_id,
      facility_name: facility?.name || (activeProfile.role === "super_admin" ? "Eagle Tech Systems Control" : "Eagle Tech Medical Clinic"),
      facility_logo: facility?.logo_url || null,
      facility_is_verified: activeProfile.role === "super_admin" ? true : (facility?.is_verified || false),
      department: activeProfile.department || "admin",
      access_status: activeProfile.access_status || "active",
      blockchain_wallet_address: activeProfile.blockchain_wallet_address || null,
      license_tier: facility?.license_tier || "free",
      auth_method: "email_password",
      session_expiry: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "12h" });

    res.json({
      status: "success",
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error occurred during authentication" });
  }
});

router.post("/supabase-login", async (req, res) => {
  const { access_token, facility_id, requestedFacilityId } = req.body;

  try {
    if (!supabaseClient) {
      return res.status(400).json({ error: "Supabase client is not configured on this server. Check env keys." });
    }

    const { data, error } = await supabaseClient.auth.getUser(access_token);

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const user = data?.user;
    if (!user) {
      return res.status(401).json({ error: "Invalid Supabase session." });
    }

    const userEmailClean = user.email ? user.email.toLowerCase().trim() : "";

    // Check if profile exists
    let profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: userEmailClean },
    ]);

    let activeProfile = null;
    const targetFacId = requestedFacilityId || facility_id;

    if (userEmailClean === "fredrickmakori102@gmail.com") {
      activeProfile = profiles && profiles.find(p => p.role === "super_admin");
      if (!activeProfile && profiles && profiles.length > 0) {
        activeProfile = profiles[0];
      }
      if (!activeProfile) {
        activeProfile = await db.createDocument("profiles", user.id, {
          full_name: "Fredrick Makori (Super Admin)",
          role: "super_admin",
          facility_id: isRealSupabase ? "f1" : null,
          email: userEmailClean
        });
      } else if (activeProfile.role !== "super_admin" || activeProfile.email !== userEmailClean) {
        await db.updateDocument("profiles", activeProfile.id, {
          role: "super_admin",
          email: userEmailClean
        });
        activeProfile.role = "super_admin";
        activeProfile.email = userEmailClean;
      }
    } else {
      if (targetFacId) {
        activeProfile = profiles && profiles.find(p => p.facility_id === targetFacId);
        
        // If we found profiles but none of them match the requested facility:
        if (!activeProfile && profiles && profiles.length > 0) {
          return res.status(401).json({
            error: "Access Denied: Your account is not registered under this facility subdomain."
          });
        }
      } else if (profiles && profiles.length === 1) {
        activeProfile = profiles[0];
      } else if (profiles && profiles.length > 1) {
        // Return select_facility status
        const enrichedProfiles = [];
        for (const p of profiles) {
          const facs = await db.getDocuments("facilities", [
            { type: "equal", column: "id", value: p.facility_id },
          ]);
          enrichedProfiles.push({
            ...p,
            facility_name: facs && facs[0] ? facs[0].name : "Unknown Facility",
            facility_code: facs && facs[0] ? facs[0].code : "",
          });
        }
        return res.json({
          status: "select_facility",
          user: { id: user.id, email: userEmailClean, name: user.user_metadata?.full_name || user.email },
          profiles: enrichedProfiles
        });
      }

      if (!activeProfile) {
        // Check if this email belongs to a patient
        const allPatients = await db.getDocuments("patients", []);
        let matchingPatient = null;
        if (targetFacId) {
          matchingPatient = allPatients.find(pt => {
            if (pt.facility_id !== targetFacId) return false;
            try {
              const contact = JSON.parse(pt.phone);
              return contact.email && contact.email.toLowerCase().trim() === userEmailClean;
            } catch (e) {
              return false;
            }
          });

          // If the patient is found in other facilities but not this requested one, reject
          if (!matchingPatient) {
            const anyMatchingPatient = allPatients.find(pt => {
              try {
                const contact = JSON.parse(pt.phone);
                return contact.email && contact.email.toLowerCase().trim() === userEmailClean;
              } catch (e) {
                return false;
              }
            });
            if (anyMatchingPatient) {
              return res.status(401).json({
                error: "Access Denied: Your account is not registered under this facility subdomain."
              });
            }
          }
        } else {
          matchingPatient = allPatients.find(pt => {
            try {
              const contact = JSON.parse(pt.phone);
              return contact.email && contact.email.toLowerCase().trim() === userEmailClean;
            } catch (e) {
              return false;
            }
          });
        }

        if (matchingPatient) {
          activeProfile = await db.createDocument("profiles", user.id, {
            full_name: matchingPatient.name,
            role: "patient",
            facility_id: matchingPatient.facility_id,
            email: userEmailClean
          });
        } else {
          // Query if there is a pending/rejected role request
          const requests = await db.getDocuments("role_requests", [
            { type: "equal", column: "email", value: userEmailClean },
          ]);
          const activeRequest = requests && requests[0];

          if (activeRequest && targetFacId && activeRequest.facility_id !== targetFacId) {
            return res.status(401).json({
              error: "Access Denied: Your account is not registered under this facility subdomain."
            });
          }

          return res.json({
            status: "no_profile",
            user: { id: user.id, email: userEmailClean, name: user.user_metadata?.full_name || user.email },
            pendingRequest: activeRequest || null,
          });
        }
      }
    }

    assertProfileActive(activeProfile);

    if (activeProfile && activeProfile.role !== "super_admin" && targetFacId) {
      if (activeProfile.facility_id && activeProfile.facility_id !== targetFacId) {
        return res.status(401).json({
          error: "Access Denied: Your account is not registered under this facility subdomain."
        });
      }
    }

    // Fetch facilities to attach logo & details
    const facs = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: activeProfile.facility_id },
    ]);
    const facility = facs && facs[0];

    // Sign JWT Token
    const userPayload = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: activeProfile.full_name,
      role: activeProfile.role,
      facility_id: activeProfile.facility_id,
      tenant_id: activeProfile.facility_id,
      facility_name: facility?.name || (activeProfile.role === "super_admin" ? "Eagle Tech Systems Control" : "Eagle Tech Medical Clinic"),
      facility_logo: facility?.logo_url || null,
      facility_is_verified: activeProfile.role === "super_admin" ? true : (facility?.is_verified || false),
      department: activeProfile.department || "admin",
      access_status: activeProfile.access_status || "active",
      blockchain_wallet_address: activeProfile.blockchain_wallet_address || null,
      license_tier: facility?.license_tier || "free",
      auth_method: "google_oauth",
      avatar_url: activeProfile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      session_expiry: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "12h" });

    res.json({
      status: "success",
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error("Supabase login callback error:", err);
    res.status(500).json({ error: err.message || "OAuth login error" });
  }
});

// Resolve Tenant by Email or Domain
router.post("/resolve-tenant", async (req, res) => {
  const { email, token } = req.body;
  if (!email && !token) {
    return res
      .status(400)
      .json({ error: "Email or invitation token is required" });
  }

  try {
    // If token is provided, resolve by token
    if (token) {
      const invitations = await db.getDocuments("invitations", [
        { type: "equal", column: "token", value: token },
        { type: "equal", column: "status", value: "pending" },
      ]);
      const activeInvites = (invitations || []).filter(
        (inv) => new Date(inv.expires_at) > new Date()
      );

      if (activeInvites && activeInvites.length > 0) {
        const invite = activeInvites[0];
        const facs = await db.getDocuments("facilities", [
          { type: "equal", column: "id", value: invite.facility_id },
        ]);
        const facility = facs && facs[0];

        return res.json({
          resolved: true,
          type: "invite",
          invitation: {
            token: invite.token,
            email: invite.email,
            role: invite.role,
            department: invite.department,
          },
          tenant: {
            id: invite.facility_id,
            name: facility?.name || "Eagle Tech Medical Clinic",
            logo_url: facility?.logo_url || null,
            license_tier: facility?.license_tier || "free",
            auth_method: facility?.auth_method || "email_password",
          },
        });
      }
      return res.json({
        resolved: false,
        message: "Invalid or expired invitation token.",
      });
    }

    const targetEmail = email.toLowerCase().trim();

    // Special bypass for super admin
    if (targetEmail === "fredrickmakori102@gmail.com") {
      return res.json({
        resolved: true,
        type: "login",
        tenant: {
          id: null,
          name: "Eagle Tech Systems Control",
          logo_url: "preset:shield",
          license_tier: "enterprise",
          auth_method: "email_password",
        },
      });
    }

    // 1. Check if there is an active profile with this email
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: targetEmail },
    ]);

    if (profiles && profiles.length > 0) {
      const activeProfile = profiles[0];
      const facs = await db.getDocuments("facilities", [
        { type: "equal", column: "id", value: activeProfile.facility_id },
      ]);
      const facility = facs && facs[0];

      return res.json({
        resolved: true,
        type: "login",
        tenant: {
          id: activeProfile.facility_id,
          name: facility?.name || "Eagle Tech Medical Clinic",
          logo_url: facility?.logo_url || null,
          license_tier: facility?.license_tier || "free",
          auth_method: facility?.auth_method || "email_password",
        },
      });
    }

    // 2. Check if there is a pending invitation
    const invitations = await db.getDocuments("invitations", [
      { type: "equal", column: "email", value: targetEmail },
      { type: "equal", column: "status", value: "pending" },
    ]);

    const activeInvites = (invitations || []).filter(
      (inv) => new Date(inv.expires_at) > new Date()
    );

    if (activeInvites && activeInvites.length > 0) {
      const invite = activeInvites[0];
      const facs = await db.getDocuments("facilities", [
        { type: "equal", column: "id", value: invite.facility_id },
      ]);
      const facility = facs && facs[0];

      return res.json({
        resolved: true,
        type: "invite",
        invitation: {
          token: invite.token,
          email: invite.email,
          role: invite.role,
          department: invite.department,
        },
        tenant: {
          id: invite.facility_id,
          name: facility?.name || "Eagle Tech Medical Clinic",
          logo_url: facility?.logo_url || null,
          license_tier: facility?.license_tier || "free",
          auth_method: facility?.auth_method || "email_password",
        },
      });
    }

    return res.json({
      resolved: false,
      message: "No active profile or pending invitation found for this email.",
    });
  } catch (err) {
    console.error("Resolve tenant error:", err);
    res
      .status(500)
      .json({
        error: err.message || "Error occurred during tenant resolution",
      });
  }
});

// Admin: Invite Department Staff
router.post("/invite-staff", authenticateToken, async (req, res) => {
  if (!canInviteStaff(req.user)) {
    return res
      .status(403)
      .json({ error: "Administrative privileges required" });
  }

  const { email, role, department } = req.body;
  if (!email || !role || !department) {
    return res
      .status(400)
      .json({ error: "Email, role, and department are required" });
  }

  const facilityId = resolveFacilityId(req.user, req.headers);

  if (!facilityId) {
    return res.status(400).json({ error: "Facility ID is required context" });
  }

  try {
    const targetEmail = email.toLowerCase().trim();

    // Check if profile already exists
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: targetEmail },
    ]);
    if (profiles && profiles.some((profile) => profile.facility_id === facilityId && !isInactiveProfile(profile))) {
      return res
        .status(400)
        .json({
          error: "A staff member with this email already has a profile.",
        });
    }

    // Check if there is an active pending invitation
    const existingInvites = await db.getDocuments("invitations", [
      { type: "equal", column: "email", value: targetEmail },
      { type: "equal", column: "status", value: "pending" },
    ]);
    const activeInvites = (existingInvites || []).filter(
      (inv) => inv.facility_id === facilityId && new Date(inv.expires_at) > new Date()
    );
    if (activeInvites && activeInvites.length > 0) {
      return res
        .status(400)
        .json({
          error: "A pending invitation has already been sent to this email.",
        });
    }

    const token =
      "inv_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours

    const newInvite = await db.createDocument(
      "invitations",
      "doc_" + Math.random().toString(36).substring(2, 12),
      {
        email: targetEmail,
        facility_id: facilityId,
        role,
        department,
        invited_by: req.user.email,
        token,
        status: "pending",
        mail_status: "queued",
        expires_at: expiresAt,
      }
    );

    // Resolve facility details for email template
    const facs = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: facilityId },
    ]);
    const facility = facs && facs[0];

    // Load template relative to server root
    const templatePath = path.join(
      __dirname,
      "../templates",
      "email_invite_user_template.html"
    );
    let htmlContent = "";
    try {
      htmlContent = fs.readFileSync(templatePath, "utf8");
      const origin = req.headers.origin || "https://www.eagletechsolutions.tech";
      htmlContent = htmlContent
        .replace(/\{\{team\}\}/g, facility?.name || "Eagle Tech Clinic")
        .replace(/\{\{user\}\}/g, targetEmail)
        .replace(/\{\{redirect\}\}/g, `${origin}/login?invite=${token}`)
        .replace(/\{\{project\}\}/g, "Eagle Tech HMIS");
    } catch (e) {
      console.error("Error reading invite email template:", e);
      htmlContent =
        `<p>You have been invited to join ${facility?.name || "Eagle Tech Clinic"} as a ${role} in ${department} department.</p>` +
        `<p>Click here to accept: <a href="${req.headers.origin || "https://www.eagletechsolutions.tech"}/login?invite=${token}">Accept Invite</a></p>`;
    }

    // Try sending email
    const host = process.env.SMTP_HOST || "smtp.titan.email";
    const port = parseInt(process.env.SMTP_PORT || "465");
    const userMail = process.env.SMTP_USER || "admin@eagletechsolutions.tech";
    const passMail = process.env.SMTP_PASS || "";

    let mailSent = false;
    let errMessage = null;

    if (isRealSupabase) {
      try {
        const origin = req.headers.origin || "https://www.eagletechsolutions.tech";
        const { error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(targetEmail, {
          redirectTo: `${origin}/login?invite=${token}`,
          data: {
            facility_name: facility?.name || "Eagle Tech Clinic",
            project_name: "Eagle Tech HMIS",
            role: role,
            department: department
          }
        });
        if (inviteError) throw inviteError;
        mailSent = true;
      } catch (err) {
        console.error("Failed sending invite email via Supabase Auth Admin API:", err);
        errMessage = err.message || "Supabase Auth Admin API invite failed";
      }
    } else if (passMail) {
      try {
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

        await transporter.sendMail({
          from: `"Eagle Tech HMIS" <${userMail}>`,
          to: targetEmail,
          subject: `[System Invite] Join ${facility?.name || "Eagle Tech Clinic"} on Eagle Tech HMIS`,
          html: htmlContent,
        });
        mailSent = true;
      } catch (err) {
        console.error("Failed sending invite email via nodemailer:", err);
        errMessage = err.message;
      }
    } else {
      errMessage = "SMTP Password not configured and Supabase not in use. Mail logged to simulated outbox.";
      const sandboxData = loadSandboxDB();
      if (!sandboxData.email_logs) sandboxData.email_logs = [];
      sandboxData.email_logs.push({
        id: "mail_" + Math.random().toString(36).substring(2, 12),
        recipient: targetEmail,
        subject: `[System Invite] Join ${facility?.name || "Eagle Tech Clinic"} on Eagle Tech HMIS`,
        html: htmlContent,
        status: "sent_simulated",
        created_at: new Date().toISOString(),
      });
      saveSandboxDB(sandboxData);
      mailSent = true;
    }

    const mailStatus = mailSent ? "sent" : "failed";
    await db.updateDocument("invitations", newInvite.id, {
      mail_status: mailStatus,
      mail_error: errMessage,
      mail_sent_at: mailSent ? new Date().toISOString() : null,
    });
    newInvite.mail_status = mailStatus;
    newInvite.mail_error = errMessage;
    newInvite.mail_sent_at = mailSent ? new Date().toISOString() : null;

    // Write audit log
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: facilityId,
        user_id: req.user.id,
        action: "STAFF_INVITATION_SENT",
        details: `Admin ${req.user.full_name} invited ${targetEmail} for role ${role.toUpperCase()} in ${department}. Mail sent: ${mailSent}.${errMessage ? ` Error: ${errMessage}` : ""}`,
      }
    );

    res.json({
      success: true,
      invite: newInvite,
      mailSent,
      mailStatus,
      mailError: errMessage,
      mailSentAt: newInvite.mail_sent_at
    });
  } catch (err) {
    console.error("Invite staff error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error occurred while inviting staff" });
  }
});

// Accept Invite & Complete Registration
router.post("/accept-invite", async (req, res) => {
  const { token, password, name } = req.body;
  if (!token || !password || !name) {
    return res
      .status(400)
      .json({ error: "Token, password, and name are required" });
  }

  try {
    // 1. Find the invitation
    const invitations = await db.getDocuments("invitations", [
      { type: "equal", column: "token", value: token },
      { type: "equal", column: "status", value: "pending" },
    ]);

    const activeInvites = (invitations || []).filter(
      (inv) => new Date(inv.expires_at) > new Date()
    );
    if (!activeInvites || activeInvites.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid or expired invitation token." });
    }

    const invite = activeInvites[0];

    // 2. Register User in Auth provider
    let userId = null;
    if (isRealSupabase) {
      let user = null;
      let userError = null;
      try {
        const result = await supabaseClient.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: name,
          },
        });
        user = result.data;
        userError = result.error;
      } catch (e) {
        userError = e;
      }

      if (userError) {
        // If user already exists (e.g. they were invited via Supabase inviteUserByEmail),
        // update their password and user metadata instead.
        if (userError.message?.includes("already") || userError.status === 422 || userError.code === "email_exists") {
          console.log("User already exists in Supabase. Attempting to update credentials...");
          const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
          if (listError) throw listError;
          const found = users.find(u => u.email.toLowerCase() === invite.email.toLowerCase());
          if (!found) throw new Error("User email exists but user record could not be found");

          const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
            found.id,
            {
              password: password,
              email_confirm: true,
              user_metadata: {
                full_name: name,
              }
            }
          );
          if (updateError) throw updateError;
          userId = updatedUser.user.id;
        } else {
          throw userError;
        }
      } else {
        userId = user.user.id;
      }
    } else {
      const uId = "u_mock_" + Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const sandboxData = loadSandboxDB();
      sandboxData.users.push({
        id: uId,
        email: invite.email,
        passwordHash,
        name,
      });
      saveSandboxDB(sandboxData);
      userId = uId;
    }

    // 3. Create Linked Profile
    const profile = await db.createDocument("profiles", userId, {
      full_name: name,
      role: invite.role,
      facility_id: invite.facility_id,
      email: invite.email,
      department: invite.department,
      auth_method: "email_password",
      access_status: "active",
    });

    // 4. Mark invitation as accepted
    await db.updateDocument("invitations", invite.id, {
      status: "accepted",
    });

    // 5. Fetch facility details to build JWT payload
    const facs = await db.getDocuments("facilities", [
      { type: "equal", column: "id", value: invite.facility_id },
    ]);
    const facility = facs && facs[0];

    // 6. Sign JWT Session Token
    const userPayload = {
      id: userId,
      user_id: userId,
      email: invite.email,
      full_name: name,
      role: invite.role,
      facility_id: invite.facility_id,
      tenant_id: invite.facility_id,
      facility_name: facility?.name || "Eagle Tech Medical Clinic",
      facility_logo: facility?.logo_url || null,
      department: invite.department,
      access_status: "active",
      license_tier: facility?.license_tier || "free",
      auth_method: "email_password",
      session_expiry: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: "12h",
    });

    // Write audit log
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: invite.facility_id,
        user_id: userId,
        action: "INVITATION_ACCEPTED",
        details: `${name} accepted invitation and joined as ${invite.role.toUpperCase()} in ${invite.department}.`,
      }
    );

    res.json({
      success: true,
      token: sessionToken,
      user: userPayload,
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    res.status(500).json({ error: err.message || "Error occurred while accepting invitation" });
  }
});

// Admin: Get all Invitations for Facility
router.get("/invitations", authenticateToken, async (req, res) => {
  if (!canInviteStaff(req.user)) {
    return res
      .status(403)
      .json({ error: "Administrative privileges required" });
  }

  const facilityId = resolveFacilityId(req.user, req.headers);

  if (!facilityId) {
    return res.status(400).json({ error: "Facility ID is required context" });
  }

  try {
    const invites = await db.getDocuments("invitations", [
      { type: "equal", column: "facility_id", value: facilityId },
    ]);
    res.json({ success: true, invitations: invites });
  } catch (err) {
    console.error("Fetch invitations error:", err);
    res.status(500).json({ error: err.message || "Error loading invitations" });
  }
});

// Admin: Revoke Invitation
router.post("/revoke-invite", authenticateToken, async (req, res) => {
  if (!canInviteStaff(req.user)) {
    return res
      .status(403)
      .json({ error: "Administrative privileges required" });
  }
  const { invite_id } = req.body;
  if (!invite_id) {
    return res.status(400).json({ error: "Invitation ID is required" });
  }

  const facilityId = resolveFacilityId(req.user, req.headers);

  if (!facilityId) {
    return res.status(400).json({ error: "Facility ID is required context" });
  }

  try {
    // Fetch invite first to verify it belongs to this admin's facility
    const invites = await db.getDocuments("invitations", [
      { type: "equal", column: "id", value: invite_id },
    ]);
    const invite = invites && invites[0];
    if (!invite) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    if (invite.facility_id !== facilityId) {
      return res.status(403).json({ error: "Unauthorized facility access" });
    }

    await db.updateDocument("invitations", invite_id, { status: "revoked" });

    // Write audit log
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: facilityId,
        user_id: req.user.id,
        action: "INVITATION_REVOKED",
        details: `Admin ${req.user.full_name} revoked invitation sent to ${invite.email}.`,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Revoke invitation error:", err);
    res.status(500).json({ error: err.message || "Error revoking invitation" });
  }
});
// Get Current Logged-in User
router.get("/me", authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Submit a new Role Request
router.post("/role-request", async (req, res) => {
  let { user_id, full_name, email, facility_id, requested_role, request_category } = req.body;
  if (!user_id || !full_name || !email || !facility_id || !requested_role) {
    return res.status(400).json({ error: "All request fields are required" });
  }

  if (!request_category) {
    const roles = (requested_role || "").split(",");
    const isAdminRole = roles.some(r => ["facility_admin", "hr_manager"].includes(r));
    const isOperationalRole = roles.some(r => ["receptionist", "nurse", "clinician", "lab_tech", "pharmacist", "cashier", "reporting_officer"].includes(r));
    if (isAdminRole && isOperationalRole) {
      request_category = "Mixed Access";
    } else if (isAdminRole) {
      request_category = "Administrative & Management Settings";
    } else {
      request_category = "Clinical & Operational Workflows";
    }
  }

  try {
    const emailClean = email.toLowerCase().trim();
    const existingRequests = await db.getDocuments("role_requests", [
      { type: "equal", column: "email", value: emailClean },
      { type: "equal", column: "facility_id", value: facility_id },
    ]);
    const activeExistingRequest = (existingRequests || []).find((request) => request.status === "pending");
    if (activeExistingRequest) {
      return res.status(409).json({
        error: "A pending role request already exists for this facility.",
        request: activeExistingRequest,
      });
    }

    const docId = "req_" + Math.random().toString(36).substring(2, 12);
    const newRequest = await db.createDocument("role_requests", docId, {
      user_id,
      full_name,
      email: emailClean,
      facility_id,
      requested_role,
      request_category,
      status: "pending",
    });

    // Log audit
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: facility_id,
        user_id: user_id,
        action: "ROLE_REQUEST_SUBMITTED",
        details: `${full_name} (${email}) requested role ${requested_role.toUpperCase()} under category "${request_category}" for facility ID ${facility_id}.`,
      }
    );

    // Redirect request to facility admin via SMTP
    try {
      const facs = await db.getDocuments("facilities", [
        { type: "equal", column: "id", value: facility_id },
      ]);
      const facility = facs && facs[0];
      const facilityName = facility?.name || "Eagle Tech Medical Clinic";

      const facilityProfiles = await db.getDocuments("profiles", [
        { type: "equal", column: "facility_id", value: facility_id },
      ]);
      const facilityAdminEmails = (facilityProfiles || [])
        .filter((profile) => hasAnyRole(profile, ["admin", "facility_admin", "hr_manager"]) && !isInactiveProfile(profile))
        .map((profile) => profile.email)
        .filter(Boolean);
      const adminEmails = Array.from(new Set([...facilityAdminEmails, "fredrickmakori102@gmail.com"]));

      const origin = req.headers.origin || "https://www.eagletechsolutions.tech";
      const loginUrl = `${origin}/login`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Role Access Request</h2>
          <p>Hello Systems Control Supervisor,</p>
          <p>A new role access request has been submitted for facility <strong>${facilityName}</strong>.</p>
          
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #2dd4bf; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Applicant Name:</strong> ${full_name}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Applicant Email:</strong> ${emailClean}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Request Category:</strong> ${request_category}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Requested Role:</strong> <span style="font-family: monospace; color: #2dd4bf; font-weight: bold;">${requested_role.toUpperCase()}</span></p>
          </div>
          
          <p>Please log into your dashboard to review and approve/reject this request under the Systems Control Dashboard.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${loginUrl}" style="background-color: #2dd4bf; color: #0f172a; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
              Log In to Systems Control Dashboard
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            This security notice was auto-dispatched by Eagle Tech HMIS Notification Engine.
          </p>
        </div>
      `;

      const host = process.env.SMTP_HOST || "smtp.titan.email";
      const port = parseInt(process.env.SMTP_PORT || "465");
      const userMail = process.env.SMTP_USER || "admin@eagletechsolutions.tech";
      const passMail = process.env.SMTP_PASS || "";

      if (passMail) {
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

        for (const recipient of adminEmails) {
          await transporter.sendMail({
            from: `"Eagle Tech HMIS" <${userMail}>`,
            to: recipient,
            subject: `[System Alert] New Role Request for ${facilityName}`,
            html: htmlContent,
          });
        }
      } else {
        const sandboxData = loadSandboxDB();
        if (!sandboxData.email_logs) sandboxData.email_logs = [];
        for (const recipient of adminEmails) {
          sandboxData.email_logs.push({
            id: "mail_" + Math.random().toString(36).substring(2, 12),
            recipient,
            subject: `[System Alert] New Role Request for ${facilityName}`,
            html: htmlContent,
            status: "sent_simulated",
            created_at: new Date().toISOString(),
          });
        }
        saveSandboxDB(sandboxData);
      }
    } catch (emailErr) {
      console.error("Failed sending role request notification emails:", emailErr);
    }

    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error("Role request error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error submitting role request" });
  }
});

// Get all Role Requests (Super Admin: all; Facility Admin: filtered by facility)
router.get("/role-requests", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.json({ success: true, requests: [] });
  }
  try {
    if (hasAnyRole(req.user, ["super_admin"]) && !req.headers["x-facility-id"]) {
      // Fetch all requests across all facilities for super admin
      const requests = await db.getDocuments("role_requests", []);
      res.json({ success: true, requests });
    } else {
      // Filter requests for the admin's facility
      const facilityId = resolveFacilityId(req.user, req.headers);
      const requests = await db.getDocuments("role_requests", [
        { type: "equal", column: "facility_id", value: facilityId },
      ]);
      res.json({ success: true, requests });
    }
  } catch (err) {
    console.error("Fetch requests error:", err);
    res.status(500).json({ error: err.message || "Error loading requests" });
  }
});

// Approve Request (Super Admin or Facility Admin)
router.post("/approve-request", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res
      .status(403)
      .json({ error: "Administrative privileges required" });
  }

  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  try {
    const requests = await db.getDocuments("role_requests", [
      { type: "equal", column: "id", value: request_id },
    ]);
    const request = requests && requests[0];
    if (!request) {
      return res.status(404).json({ error: "Role request not found" });
    }

    // Security check: Facility Admin can only approve requests for their own facility
    const approverFacilityId = resolveFacilityId(req.user, req.headers);
    if (!hasAnyRole(req.user, ["super_admin"]) && request.facility_id !== approverFacilityId) {
      return res.status(403).json({ error: "Access denied. Request belongs to another facility." });
    }

    // 1. Create or Update Profile
    const profileId =
      request.user_id ||
      "u_prof_" + Math.random().toString(36).substring(2, 10);

    const existingProfiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: request.email.toLowerCase().trim() },
    ]);

    const existingProfile = existingProfiles?.[0] || null;

    if (existingProfile) {
      await db.updateDocument(
        "profiles",
        existingProfile.id,
        {
          full_name: request.full_name,
          role: request.requested_role,
          facility_id: request.facility_id,
          access_status: "active",
          suspended_at: null,
          deleted_at: null,
        }
      );
    } else {
      await db.createDocument("profiles", profileId, {
        full_name: request.full_name,
        role: request.requested_role,
        facility_id: request.facility_id,
        email: request.email.toLowerCase().trim(),
        access_status: "active",
      });
    }

    // 2. Update Request Status
    await db.updateDocument("role_requests", request_id, {
      status: "approved",
    });

    // 3. Log Audit
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: request.facility_id || null,
        user_id: req.user.id,
        action: "ROLE_REQUEST_APPROVED",
        details: `${req.user.role === "super_admin" ? "Super Admin" : "Admin"} ${req.user.full_name} approved role ${request.requested_role.toUpperCase()} for ${request.full_name}.`,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ error: err.message || "Error processing approval" });
  }
});

// Reject Request (Super Admin or Facility Admin)
router.post("/reject-request", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res
      .status(403)
      .json({ error: "Administrative privileges required" });
  }

  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  try {
    const requests = await db.getDocuments("role_requests", [
      { type: "equal", column: "id", value: request_id },
    ]);
    const request = requests && requests[0];
    if (!request) {
      return res.status(404).json({ error: "Role request not found" });
    }

    // Security check: Facility Admin can only reject requests for their own facility
    const rejectorFacilityId = resolveFacilityId(req.user, req.headers);
    if (!hasAnyRole(req.user, ["super_admin"]) && request.facility_id !== rejectorFacilityId) {
      return res.status(403).json({ error: "Access denied. Request belongs to another facility." });
    }

    // 1. Update Request
    await db.updateDocument("role_requests", request_id, {
      status: "rejected",
    });

    // 2. Log Audit
    await db.createDocument(
      "audit_logs",
      "log_" + Math.random().toString(36).substring(2, 12),
      {
        facility_id: request?.facility_id || null,
        user_id: req.user.id,
        action: "ROLE_REQUEST_REJECTED",
        details: `${req.user.role === "super_admin" ? "Super Admin" : "Admin"} ${req.user.full_name} rejected role request ID ${request_id} for ${request?.full_name || 'unknown'}.`,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Reject request error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error processing rejection" });
  }
});

// Admin: Suspend active staff access without deleting history
router.post("/profiles/:profile_id/suspend", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  const { profile_id } = req.params;
  const { reason } = req.body || {};
  if (!profile_id) {
    return res.status(400).json({ error: "Profile ID is required" });
  }
  if (profile_id === req.user.id) {
    return res.status(400).json({ error: "You cannot suspend your own active session profile." });
  }

  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "id", value: profile_id },
    ]);
    const profile = (profiles || []).find((candidate) => candidate.facility_id === facilityId);
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found." });
    }

    if (!hasAnyRole(req.user, ["super_admin"]) && profile.facility_id !== facilityId) {
      return res.status(403).json({ error: "Access denied. Staff profile belongs to another facility." });
    }

    await db.updateDocument(
      "profiles",
      profile_id,
      {
        access_status: "suspended",
        suspended_at: new Date().toISOString(),
        suspension_reason: reason || "Suspended by facility administrator",
      },
      [{ column: "facility_id", value: facilityId }]
    );

    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: profile.facility_id,
      user_id: req.user.id,
      action: "STAFF_ACCESS_SUSPENDED",
      details: `${req.user.full_name || req.user.email} suspended ${profile.full_name || profile.email}. Reason: ${reason || "Not specified"}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Suspend profile error:", err);
    res.status(500).json({ error: err.message || "Error suspending staff profile" });
  }
});

// Admin: Restore a suspended staff profile
router.post("/profiles/:profile_id/restore", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  const { profile_id } = req.params;
  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "id", value: profile_id },
    ]);
    const profile = (profiles || []).find((candidate) => candidate.facility_id === facilityId);
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found." });
    }

    if (!hasAnyRole(req.user, ["super_admin"]) && profile.facility_id !== facilityId) {
      return res.status(403).json({ error: "Access denied. Staff profile belongs to another facility." });
    }

    await db.updateDocument(
      "profiles",
      profile_id,
      {
        access_status: "active",
        suspended_at: null,
        suspension_reason: null,
      },
      [{ column: "facility_id", value: facilityId }]
    );

    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: profile.facility_id,
      user_id: req.user.id,
      action: "STAFF_ACCESS_RESTORED",
      details: `${req.user.full_name || req.user.email} restored access for ${profile.full_name || profile.email}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Restore profile error:", err);
    res.status(500).json({ error: err.message || "Error restoring staff profile" });
  }
});

// Admin: Mark fired staff as deleted and remove the profile record from active directory
router.post("/profiles/:profile_id/delete", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  const { profile_id } = req.params;
  const { reason } = req.body || {};
  if (profile_id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own active session profile." });
  }

  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "id", value: profile_id },
    ]);
    const profile = (profiles || []).find((candidate) => candidate.facility_id === facilityId);
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found." });
    }

    if (!hasAnyRole(req.user, ["super_admin"]) && profile.facility_id !== facilityId) {
      return res.status(403).json({ error: "Access denied. Staff profile belongs to another facility." });
    }

    await db.createDocument("staff_access_archives", "arch_" + Math.random().toString(36).substring(2, 12), {
      profile_id,
      facility_id: profile.facility_id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      phone: profile.phone || "",
      blockchain_wallet_address: profile.blockchain_wallet_address || "",
      archived_by: req.user.id,
      archive_reason: reason || "Deleted by facility administrator",
      snapshot: profile,
    });

    await db.deleteDocument("profiles", profile_id, [{ column: "facility_id", value: facilityId }]);

    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: profile.facility_id,
      user_id: req.user.id,
      action: "STAFF_PROFILE_DELETED",
      details: `${req.user.full_name || req.user.email} deleted staff profile ${profile.full_name || profile.email}. Reason: ${reason || "Not specified"}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete profile error:", err);
    res.status(500).json({ error: err.message || "Error deleting staff profile" });
  }
});

// Admin: Update staff blockchain wallet address for payroll/benefits linkage
router.post("/profiles/:profile_id/wallet", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  const { profile_id } = req.params;
  const walletAddress = String(req.body?.blockchain_wallet_address || "").trim();
  if (!isValidWalletAddress(walletAddress)) {
    return res.status(400).json({ error: "Wallet address must be a valid EVM or Solana-style public address." });
  }

  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "id", value: profile_id },
    ]);
    const profile = (profiles || []).find((candidate) => candidate.facility_id === facilityId);
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found for this facility." });
    }

    await db.updateDocument(
      "profiles",
      profile_id,
      { blockchain_wallet_address: walletAddress },
      [{ column: "facility_id", value: facilityId }]
    );

    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: facilityId,
      user_id: req.user.id,
      action: "STAFF_WALLET_UPDATED",
      details: `${req.user.full_name || req.user.email} updated blockchain wallet linkage for ${profile.full_name || profile.email}.`,
    });

    res.json({ success: true, blockchain_wallet_address: walletAddress });
  } catch (err) {
    console.error("Update staff wallet error:", err);
    res.status(500).json({ error: err.message || "Error updating staff wallet" });
  }
});

// Admin / facility staff: Store SHA claim document references for adjudication
router.get("/sha-claims", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const claims = await db.getDocuments("sha_claim_documents", [
      { type: "equal", column: "facility_id", value: facilityId }
    ], "created_at", false);

    res.json({ success: true, data: claims });
  } catch (err) {
    console.error("Fetch SHA claims error:", err);
    res.status(500).json({ error: err.message || "Error loading SHA claim documents" });
  }
});

router.post("/sha-claims", authenticateToken, async (req, res) => {
  if (!canManageFacilityAccess(req.user)) {
    return res.status(403).json({ error: "Administrative privileges required" });
  }

  const {
    patient_id = null,
    visit_id = null,
    invoice_id = null,
    claim_reference = "",
    sha_member_number = "",
    claim_form_url = "",
    diagnosis_report_url = "",
    invoice_url = "",
    discharge_summary_url = "",
    status = "draft",
    payload = {}
  } = req.body || {};

  try {
    const facilityId = resolveFacilityId(req.user, req.headers);
    const claimId = "sha_claim_" + Math.random().toString(36).substring(2, 12);
    const normalizedStatus = String(status || "draft").toLowerCase();
    const submittedAt = normalizedStatus === "submitted" ? new Date().toISOString() : null;

    const record = await db.createDocument("sha_claim_documents", claimId, {
      facility_id: facilityId,
      patient_id,
      visit_id,
      invoice_id,
      claim_reference: claim_reference || `SHA-${claimId.substring(9).toUpperCase()}`,
      sha_member_number,
      claim_form_url,
      diagnosis_report_url,
      invoice_url,
      discharge_summary_url,
      status: normalizedStatus,
      payload,
      submitted_by: normalizedStatus === "submitted" ? req.user.id : null,
      submitted_at: submittedAt,
      updated_at: new Date().toISOString()
    });

    await db.createDocument("audit_logs", "log_" + Math.random().toString(36).substring(2, 12), {
      facility_id: facilityId,
      user_id: req.user.id,
      action: "SHA_CLAIM_DOCUMENT_SAVED",
      details: `${req.user.full_name || req.user.email} saved SHA claim ${record.claim_reference || claimId} with supporting documents.`
    });

    res.json({ success: true, data: record });
  } catch (err) {
    console.error("Save SHA claim error:", err);
    res.status(500).json({ error: err.message || "Error saving SHA claim document" });
  }
});

// Patient Self Signup Route
router.post("/patient/signup", async (req, res) => {
  const { email, password, name, dob, gender, facilityId, phone } = req.body;
  if (!email || !password || !name || !dob || !gender || !facilityId) {
    return res.status(400).json({ error: "Required details missing" });
  }

  try {
    let userId;
    const emailClean = email.toLowerCase().trim();
    
    if (isRealSupabase) {
      const { data: { user }, error } = await supabaseClient.auth.admin.createUser({
        email: emailClean,
        password,
        user_metadata: { full_name: name }
      });
      if (error) throw error;
      userId = user.id;
    } else {
      const data = loadSandboxDB();
      const existing = data.users.find(u => u.email.toLowerCase() === emailClean);
      if (existing) return res.status(400).json({ error: "An account with this email already exists" });

      userId = "pt_user_" + Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      data.users.push({ id: userId, email: emailClean, passwordHash, name });
      saveSandboxDB(data);
    }

    // Create Patient Record
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const facilityCode = `EMC-PT-${randNum}`;
    const patientId = "pt_" + Math.random().toString(36).substring(2, 12);
    
    const newPt = {
      facility_id: facilityId,
      name,
      dob,
      gender,
      facility_id_code: facilityCode,
      phone: JSON.stringify({
        phone: phone || "",
        email: emailClean,
        preferences: { lab: true, pharmacy: true, billing: true },
        village: "Nairobi",
        landmark: ""
      })
    };

    await db.createDocument("patients", patientId, newPt);

    // Create Profile record
    await db.createDocument("profiles", userId, {
      full_name: name,
      role: "patient",
      facility_id: facilityId,
      email: emailClean
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Patient signup failure:", err);
    res.status(500).json({ error: err.message || "Failed to create patient account" });
  }
});

// Check Role Request Status
router.get("/role-request-status", async (req, res) => {
  const { email, id } = req.query;
  if (!email || !id) {
    return res.status(400).json({ error: "Email and Request ID are required" });
  }

  try {
    const emailClean = email.toLowerCase().trim();
    const requests = await db.getDocuments("role_requests", [
      { type: "equal", column: "id", value: id },
      { type: "equal", column: "email", value: emailClean },
    ]);
    const request = requests && requests[0];
    if (!request) {
      // Check if a profile already exists for this email
      const profiles = await db.getDocuments("profiles", [
        { type: "equal", column: "email", value: emailClean },
      ]);
      const profile = profiles && profiles[0];
      if (profile) {
        return res.json({ success: true, status: "approved" });
      }
      return res.status(404).json({ error: "Role request not found" });
    }

    res.json({ success: true, status: request.status });
  } catch (err) {
    console.error("Check request status error:", err);
    res.status(500).json({ error: err.message || "Error checking request status" });
  }
});

module.exports = router;
