import { supabase } from './supabaseClient';

// Key for storage
const EMAIL_LOGS_KEY = 'egesa_email_logs';
const SMTP_CONFIG_PREFIX = 'egesa_smtp_config_';
const LICENSE_PREFIX = 'egesa_facility_license_';

// Default Titan SMTP credentials and preferences
export const getDefaultSmtpConfig = () => ({
  host: 'smtp.titan.email',
  port: 465,
  encryption: 'SSL',
  sender_email: 'noreply@eagletechsolutions.tech',
  sender_name: 'Eagle Tech System Communications',
  username: 'noreply@eagletechsolutions.tech',
  password: 'password123',
  retry_policy: '3 attempts, linear backoff',
  timeout: 15, // seconds
  log_retention: 30, // days
  test_email_destination: 'admin@eagletechsolutions.tech',
  google_auth_enabled: false,
  google_client_id: '',
  google_client_secret: '',
  preferences: {
    USER_SIGNUP: true,
    PASSWORD_RESET: true,
    LAB_RESULT_READY: true,
    LAB_SAMPLE_REJECTED: true,
    PRESCRIPTION_DISPENSED: true,
    REPORT_GENERATED: true,
    NEW_USER_CREATED: true,
    FAILED_LOGIN_ALERT: true,
    LICENSE_WARNING: true,
    LICENSE_EXPIRED: true,
    INPATIENT_ADMITTED: true,
    INPATIENT_DISCHARGED: true
  }
});

// Default Licensing configuration
export const getDefaultLicenseConfig = () => ({
  tier: 'hospital', // 'clinic' | 'hospital' | 'enterprise'
  status: 'active', // 'active' | 'warning' | 'expired'
  expiry: new Date(Date.now() + 3600000 * 24 * 89).toISOString() // 89 days trial default
});

// Retrieve SMTP config for a facility
export const getSmtpConfig = (facilityId) => {
  const stored = localStorage.getItem(`${SMTP_CONFIG_PREFIX}${facilityId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return getDefaultSmtpConfig();
    }
  }
  const config = getDefaultSmtpConfig();
  localStorage.setItem(`${SMTP_CONFIG_PREFIX}${facilityId}`, JSON.stringify(config));
  return config;
};

// Save SMTP config for a facility
export const saveSmtpConfig = (facilityId, config) => {
  localStorage.setItem(`${SMTP_CONFIG_PREFIX}${facilityId}`, JSON.stringify(config));
};

// Retrieve License configuration
export const getLicenseConfig = (facilityId) => {
  const stored = localStorage.getItem(`${LICENSE_PREFIX}${facilityId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return getDefaultLicenseConfig();
    }
  }
  const config = getDefaultLicenseConfig();
  localStorage.setItem(`${LICENSE_PREFIX}${facilityId}`, JSON.stringify(config));
  return config;
};

// Save License configuration
export const saveLicenseConfig = (facilityId, config) => {
  localStorage.setItem(`${LICENSE_PREFIX}${facilityId}`, JSON.stringify(config));
};

// Get all email logs
export const getEmailLogs = (facilityId = null) => {
  const logs = localStorage.getItem(EMAIL_LOGS_KEY);
  if (!logs) return [];
  try {
    const allLogs = JSON.parse(logs);
    if (facilityId) {
      return allLogs.filter(log => log.facility_id === facilityId);
    }
    return allLogs;
  } catch (e) {
    return [];
  }
};

// Save a log entry
const addEmailLog = (logEntry) => {
  const logs = getEmailLogs();
  logs.unshift(logEntry); // new logs first
  localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
};

// Update a log entry status
const updateEmailLogStatus = (logId, status, extra = {}) => {
  const logs = getEmailLogs();
  const index = logs.findIndex(log => log.id === logId);
  if (index !== -1) {
    logs[index] = {
      ...logs[index],
      status,
      ...extra
    };
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
    return logs[index];
  }
  return null;
};

// Clears old logs beyond the retention period
export const pruneEmailLogs = (facilityId, retentionDays) => {
  const logs = getEmailLogs();
  const cutOffTime = Date.now() - retentionDays * 24 * 3600000;
  const filtered = logs.filter(log => {
    if (log.facility_id === facilityId) {
      return new Date(log.created_at).getTime() >= cutOffTime;
    }
    return true; // Keep logs for other facilities
  });
  localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(filtered));
};

// Resolve HTML email template based on branding and payload details
const resolveTemplate = (event, payload, branding) => {
  const { facilityName, facilityCode, logoUrl } = branding;
  let subject = '';
  let body = '';
  
  // Choose department-based sender email prefix based on layer rules
  let senderPrefix = 'noreply';

  switch (event) {
    case 'USER_SIGNUP':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Welcome to your Eagle Tech Outsource Portal!`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Portal Setup Success</h2>
          <p>Dear ${payload.adminName || 'Facility Administrator'},</p>
          <p>We are excited to welcome you to **Eagle Tech Outsource Solutions** for your hospital system.</p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #2dd4bf; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Hospital Name:</strong> ${facilityName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>MOH Facility Code:</strong> <span style="font-family: monospace; color: #2dd4bf; font-weight: bold;">${facilityCode}</span></p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Access Account:</strong> ${payload.adminEmail}</p>
          </div>
          <p>You can now log in, configure user accounts, triage patients, and utilize laboratory and pharmacy modules under this facility context.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            This security email was auto-dispatched by Eagle Tech Authentication Gate.
          </p>
        </div>
      `;
      break;

    case 'PASSWORD_RESET':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Security Center: Password Reset Request`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #f43f5e; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Password Reset Requested</h2>
          <p>We received a request to reset the password for your account linked to **${facilityName}**.</p>
          <p>Use the temporary verification code below to complete the reset process. This code will expire in 15 minutes.</p>
          <div style="background-color: #1e293b; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 5px; color: #2dd4bf;">${payload.resetCode || 'ET-849204'}</span>
          </div>
          <p>If you did not request this, please change your credentials immediately or notify your system security supervisor.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Security notification dispatched from Titan Mail security/identity layer.
          </p>
        </div>
      `;
      break;

    case 'NEW_USER_CREATED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Workspace Invitation: Secure Access Notification`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Workspace Invitation</h2>
          <p>Hello ${payload.fullName},</p>
          <p>An operational profile has been configured for you at **${facilityName}** under the role **${payload.role.toUpperCase()}**.</p>
          <p>To access your dashboard, click the button below to log in automatically:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${payload.loginLink}" style="background-color: #2dd4bf; color: #0f172a; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
              Access My Dashboard
            </a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
            If the button above does not work, copy and paste the link below into your web browser:<br/>
            <a href="${payload.loginLink}" style="color: #2dd4bf; word-break: break-all; text-decoration: underline;">${payload.loginLink}</a>
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Eagle Tech Secure Access provisioning notice.
          </p>
        </div>
      `;
      break;

    case 'LAB_RESULT_READY':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Diagnostic Alert: Clinical Results Released`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Lab Findings Notification</h2>
          <p>Attention Doctor / Medical Staff,</p>
          <p>A laboratory order has been finalized and released by the testing technician.</p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #2dd4bf; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Patient Name:</strong> ${payload.patientName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Diagnostic Test:</strong> ${payload.testName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Released Findings:</strong> ${payload.findings}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Verifier Signature:</strong> ${payload.verifier}</p>
          </div>
          <p>These findings are synced directly to the patient's EHR timeline. You may review full clinical charts on the OPD Consultation desk.</p>
          <p style="font-size: 11px; color: #ef4444; font-weight: bold;">
            CONFIDENTIALITY NOTICE: This clinical lab result is intended solely for authorized medical professionals. Do not forward.
          </p>
        </div>
      `;
      break;

    case 'LAB_SAMPLE_REJECTED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Lab Alert: Phlebotomy Sample Rejected`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #f59e0b; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Phlebotomy Rejection Alert</h2>
          <p>A laboratory specimen has failed quality checks at the lab accessioning desk.</p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Patient Name:</strong> ${payload.patientName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Ordered Test:</strong> ${payload.testName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Rejection Status:</strong> Rejected Sample</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Quality Defect Details:</strong> ${payload.reason || 'Hemolyzed Specimen'}</p>
          </div>
          <p><strong>Clinical Action Needed:</strong> Please request a re-collection of the patient's phlebotomy sample to reset the timeline.</p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Automated quality control dispatch.
          </p>
        </div>
      `;
      break;

    case 'PRESCRIPTION_DISPENSED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Pharmacy Desk: Medication Dispense Invoice`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Prescription Pickup Confirmed</h2>
          <p>Dear ${payload.patientName || 'Patient'},</p>
          <p>Your prescription has been dispensed and checked at the pharmacy desk.</p>
          <div style="background-color: #1e293b; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Prescription Item:</strong> ${payload.drugName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Quantity Filled:</strong> ${payload.qtyDispensed}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Dispensed Batches:</strong> ${payload.batches}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Dispensing Pharmacist:</strong> ${payload.pharmacist}</p>
          </div>
          <p>Please follow dosage instructions exactly. Reach out to the consultation desk if you experience side effects.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Thank you for trusting ${facilityName}. Outpatient pharmacy invoice.
          </p>
        </div>
      `;
      break;

    case 'REPORT_GENERATED':
      senderPrefix = 'info';
      subject = `[${facilityName}] Administrative Alert: MOH Report Register Exported`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Outpatient Register Compilation</h2>
          <p>System Administrator notice,</p>
          <p>A compilation register sheet for MOH reports has been generated or sync check override triggered.</p>
          <div style="background-color: #1e293b; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Operation Event:</strong> ${payload.details || 'DHIS2 Sync Check Run'}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Initiating User:</strong> ${payload.userName || 'Facility Admin'}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>This action has been logged into the clinic audit database logs for MOH 717 data verification compliance.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Report controller notification engine.
          </p>
        </div>
      `;
      break;

    case 'FAILED_LOGIN_ALERT':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Security Center: Failed Authentication Alerts`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Authentication Lockout Threat</h2>
          <p>Alert: System has flagged multiple failed login attempts on a single staff account.</p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Target Account Email:</strong> ${payload.email}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Failed Count Checked:</strong> 3+ consecutive attempts</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Warning Actions:</strong> Bypassed in Sandbox, but live credentials may require verification.</p>
          </div>
          <p>Please verify if this is authorized staff or inspect audit trails for credential attacks.</p>
        </div>
      `;
      break;

    case 'LICENSE_WARNING':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] SYSTEM WARN: Eagle Tech Subscription Expiring Soon`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #eab308; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Licensing Expiring Alert</h2>
          <p>Dear System Admin,</p>
          <p>Your subscription tier **${payload.tier.toUpperCase()}** for **${facilityName}** is due to expire soon.</p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #eab308; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Active Plan Tier:</strong> ${payload.tier.toUpperCase()}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Expiry Date:</strong> ${new Date(payload.expiry).toLocaleDateString()}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Days Remaining:</strong> Less than 5 days</p>
          </div>
          <p>Please update your billing records in the SaaS Onboarding checkout panel to prevent service interruption.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Eagle Tech Licensing Outsource Department.
          </p>
        </div>
      `;
      break;

    case 'INPATIENT_ADMITTED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Clinical Alert: Inpatient Admission Checked`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Inpatient Admission Notice</h2>
          <p>This is to confirm that patient **${payload.patientName}** has been admitted to **${facilityName}**'s inpatient ward.</p>
          <div style="background-color: #1e293b; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Patient Name:</strong> ${payload.patientName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Patient Code:</strong> ${payload.patientCode}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Assigned Bed:</strong> ${payload.bedName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Admitted By:</strong> ${payload.admittedBy}</p>
          </div>
          <p>Clinical observations and vitals charting will be maintained on the inpatient file dashboard.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Eagle Tech Inpatient Management Unit notice.
          </p>
        </div>
      `;
      break;

    case 'INPATIENT_DISCHARGED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] Clinical Alert: Patient Discharge Authorized`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Patient Discharge Summary</h2>
          <p>This is to confirm that patient **${payload.patientName}** has been authorized for discharge from **${facilityName}**'s inpatient ward.</p>
          <div style="background-color: #1e293b; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Patient Name:</strong> ${payload.patientName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Discharged From:</strong> ${payload.bedName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Authorized By:</strong> ${payload.dischargedBy}</p>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #2dd4bf;"><strong>Discharge Diagnoses & Instructions:</strong></p>
            <p style="margin: 3px 0 0 0; font-size: 13px; color: #cbd5e1; font-style: italic;">${payload.dischargeNotes}</p>
          </div>
          <p>Please follow checkout instructions and pharmacy pickups if any prescriptions were generated.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 10px;">
            Eagle Tech Inpatient Management Unit notice.
          </p>
        </div>
      `;
      break;

    case 'LICENSE_EXPIRED':
      senderPrefix = 'noreply';
      subject = `[${facilityName}] SYSTEM CRITICAL: Outsource Service Blocked (Expired)`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Entitlements Suspended</h2>
          <p><strong>CRITICAL NOTICE:</strong> The subscription license for **${facilityName}** expired on **${new Date(payload.expiry).toLocaleDateString()}**.</p>
          <p>All outbound diagnostic alerts, pharmacy updates, and user registration emails have been locked under compliance rules.</p>
          <div style="background-color: #ef4444/10; border: 1px solid #ef4444; padding: 15px; border-radius: 4px; margin: 15px 0; color: #ef4444;">
            <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Service Suspended</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Resolution Required:</strong> Submit subscription renewal fees immediately to reactivate notification flows.</p>
          </div>
          <p>Only security passwords resets and license warnings remain active for admin restoration purposes.</p>
        </div>
      `;
      break;

    default:
      subject = `[${facilityName}] Notification Alert`;
      body = `<p>${JSON.stringify(payload)}</p>`;
  }

  return { subject, body, senderPrefix };
};

// Main Event-Driven Notification trigger function
export const sendNotification = async (event, payload, facilityId = null) => {
  // 1. Resolve Facility ID Context
  let finalFacId = facilityId;
  if (!finalFacId) {
    const sessionUser = sessionStorage.getItem('egesa_health_active_user');
    if (sessionUser) {
      try {
        finalFacId = JSON.parse(sessionUser).facility_id;
      } catch (e) {
        finalFacId = 'f1';
      }
    } else {
      finalFacId = 'f1';
    }
  }

  // 2. Fetch Licensing Status
  const license = getLicenseConfig(finalFacId);
  const isLicenseExpired = license.status === 'expired';

  // 3. Licensing Restrictions Gate
  // Allow PASSWORD_RESET, FAILED_LOGIN_ALERT, LICENSE_WARNING, and LICENSE_EXPIRED regardless of license state.
  // Block clinical workflow/onboarding notifications if license is expired.
  const bypassEvents = ['PASSWORD_RESET', 'FAILED_LOGIN_ALERT', 'LICENSE_WARNING', 'LICENSE_EXPIRED'];
  if (isLicenseExpired && !bypassEvents.includes(event)) {
    console.warn(`[NotificationService] Event ${event} BLOCKED due to expired facility license for facility ${finalFacId}`);
    
    // Log blocked event to audit trail
    await supabase.from('audit_logs').insert({
      facility_id: finalFacId,
      user_id: 'system',
      action: 'Email Dispatch Blocked',
      details: `Outbound email for ${event} was blocked because the facility license is EXPIRED.`
    });
    
    return { success: false, reason: 'License expired', blocked: true };
  }

  // 4. Resolve Branding
  let branding = {
    facilityName: 'Eagle Tech Hospital Management Systems',
    facilityCode: 'EMC-001',
    logoUrl: null
  };
  try {
    const { data: facs } = await supabase.from('facilities').select('*').eq('id', finalFacId);
    if (facs && facs[0]) {
      branding.facilityName = facs[0].name;
      branding.facilityCode = facs[0].code;
      branding.logoUrl = facs[0].logo_url;
    }
  } catch (err) {
    console.error('Error resolving branding metadata:', err);
  }

  // 5. Get SMTP Configurations
  const smtp = getSmtpConfig(finalFacId);
  
  // Check preferences toggle
  if (smtp.preferences && smtp.preferences[event] === false) {
    console.log(`[NotificationService] Event ${event} is disabled in SMTP preferences for facility ${finalFacId}`);
    return { success: false, reason: 'Disabled by user preference' };
  }

  // 6. Generate subject/body/sender from templates
  const { subject, body, senderPrefix } = resolveTemplate(event, payload, branding);
  const smtpDomain = smtp.sender_email && smtp.sender_email.includes('@') 
    ? smtp.sender_email.split('@')[1] 
    : 'eagletechsolutions.tech';
  const finalSender = `${senderPrefix}@${smtpDomain}`;

  // 7. Resolve Recipient
  const recipient = payload.recipientEmail || smtp.test_email_destination || 'admin@eagletechsolutions.tech';

  // 8. Create Outbox log entry
  const logId = Math.random().toString(36).substring(2, 11);
  const logEntry = {
    id: logId,
    facility_id: finalFacId,
    event,
    sender: finalSender,
    recipient,
    subject,
    body,
    status: 'queued',
    retry_count: 0,
    created_at: new Date().toISOString(),
    error_message: null,
    smtp_config: {
      host: smtp.host,
      port: smtp.port,
      encryption: smtp.encryption,
      username: smtp.username
    }
  };

  addEmailLog(logEntry);

  // 9. Execute SMTP Send Simulation
  const maxRetries = 3;
  const timeoutMs = (smtp.timeout || 15) * 1000;

  const performSend = async (currentAttempt) => {
    try {
      let messageId = null;

      if (supabase.isSandbox) {
        // Simulate network delay
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            // 5% chance of timeout failure to test retries, 95% success
            if (Math.random() < 0.08) {
              reject(new Error('SMTP connection timed out or socket closed.'));
            } else {
              resolve();
            }
          }, 300); // quick simulation delay
        });

        // Update log to sent
        updateEmailLogStatus(logId, 'sent', { retry_count: currentAttempt });
      } else {
        // Real outbound dispatch via Appwrite Serverless Function
        const invokeRes = await supabase.functions.invoke('send-email', {
          smtpConfig: {
            host: smtp.host,
            port: smtp.port,
            encryption: smtp.encryption,
            username: smtp.username,
            password: smtp.password,
            sender_email: smtp.sender_email,
            sender_name: smtp.sender_name
          },
          emailDetails: {
            recipient,
            subject,
            body
          }
        });

        if (invokeRes.error) {
          throw new Error(invokeRes.error);
        }

        const resBody = invokeRes.data?.responseBody;
        let parsed = {};
        try {
          parsed = typeof resBody === 'string' ? JSON.parse(resBody) : resBody;
        } catch (e) {
          parsed = { success: false, error: 'Failed to parse function execution response body: ' + resBody };
        }

        // Check response code and parsed response status
        if (invokeRes.data?.statusCode !== 200 || !parsed.success) {
          throw new Error(parsed.error || `Serverless Function returned HTTP ${invokeRes.data?.statusCode}`);
        }

        messageId = parsed.messageId || null;

        // Update log to sent with real message ID
        updateEmailLogStatus(logId, 'sent', { 
          retry_count: currentAttempt, 
          message_id: messageId
        });
      }

      // Log success in audit trail
      await supabase.from('audit_logs').insert({
        facility_id: finalFacId,
        user_id: 'system',
        action: 'Email Dispatch Success',
        details: `Successfully sent email "${subject}" to ${recipient} via Titan SMTP (${smtp.host}).${messageId ? ` Message ID: ${messageId}` : ''}`
      });

      return { success: true };
    } catch (err) {
      console.warn(`SMTP send attempt ${currentAttempt + 1} failed: ${err.message}`);
      
      if (currentAttempt < maxRetries - 1) {
        // Increment retry and call again
        updateEmailLogStatus(logId, 'queued', { retry_count: currentAttempt + 1, error_message: err.message });
        
        // Wait a bit before retry (backoff)
        await new Promise(r => setTimeout(r, (currentAttempt + 1) * 1000));
        return await performSend(currentAttempt + 1);
      } else {
        // Mark as failed/bounced
        // For real SMTP, we classify permanent failure based on error signature (e.g. invalid recipient status codes)
        const isBounce = supabase.isSandbox 
          ? (Math.random() < 0.3)
          : (err.message.includes('550') || err.message.toLowerCase().includes('recipient address rejected') || err.message.toLowerCase().includes('does not exist'));

        const finalStatus = isBounce ? 'bounced' : 'failed';
        updateEmailLogStatus(logId, finalStatus, { 
          retry_count: currentAttempt, 
          error_message: isBounce ? 'Address rejected. Recipient inbox does not exist. (SMTP 550)' : err.message 
        });

        // Log failure in audit trail
        await supabase.from('audit_logs').insert({
          facility_id: finalFacId,
          user_id: 'system',
          action: 'Email Dispatch Failed',
          details: `Email dispatch to ${recipient} failed after ${maxRetries} attempts. Status: ${finalStatus.toUpperCase()}. Error: ${err.message}`
        });

        return { success: false, reason: err.message };
      }
    }
  };

  return await performSend(0);
};

// Parser for consolidated patient contact and preferences info
export const parsePatientContact = (contactString) => {
  if (!contactString) return { phone: '', email: '', preferences: { lab: true, pharmacy: true, billing: true } };
  
  // If JSON format
  if (contactString.startsWith('{')) {
    try {
      return JSON.parse(contactString);
    } catch (e) {
      // Fallback to pipe parsing
    }
  }

  const parts = contactString.split('|');
  const phone = parts[0] || '';
  const email = parts[1] || '';
  const prefStr = parts[2] || '';
  
  const preferences = { lab: true, pharmacy: true, billing: true };
  if (prefStr) {
    prefStr.split(',').forEach(p => {
      const [k, v] = p.split(':');
      if (k) preferences[k] = v === 'true';
    });
  }
  return { phone, email, preferences };
};

