const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const axios = require('axios');
const sdk = require('node-appwrite');

// Load environment variables from both root and server directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'eagletech_hmis_super_secret_session_key_2026';

// ----------------------------------------------------
// DATABASE & APPWRITE INTEGRATION ENGINE
// ----------------------------------------------------
const isRealAppwrite = process.env.VITE_APPWRITE_PROJECT_ID && process.env.VITE_APPWRITE_PROJECT_ID.trim() !== '';

let appwriteClient = null;
let appwriteDatabases = null;
let appwriteUsers = null;
let appwriteFunctions = null;

if (isRealAppwrite) {
  console.log('Backend running in Real Appwrite Mode connecting to:', process.env.VITE_APPWRITE_ENDPOINT);
  appwriteClient = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);
  
  appwriteDatabases = new sdk.Databases(appwriteClient);
  appwriteUsers = new sdk.Users(appwriteClient);
  appwriteFunctions = new sdk.Functions(appwriteClient);
} else {
  console.log('Backend running in Local Sandbox Simulation Mode (sandbox_db.json)');
}

// Sandbox File Database Helper
const SANDBOX_DB_PATH = path.join(__dirname, 'sandbox_db.json');

const getInitialSandboxData = () => {
  // Hash for 'password123'
  const defaultHash = '$2a$10$tM.yF.1nJ9Z9P4mI8vN5yOqZk7xZ/Q3K5.p1j/H7J2zN9xK2TzJ.O';
  return {
    facilities: [
      { id: 'f1', name: 'Eagle Tech Medical Clinic', code: 'EMC-001', logo_url: 'preset:shield', address: 'Nairobi, Kenya' },
      { id: 'f2', name: 'Meso Referral Hospital', code: 'MRH-002', logo_url: 'preset:cross', address: 'Mombasa, Kenya' }
    ],
    profiles: [
      { id: 'u1', full_name: 'Dr. Arthur Conan', role: 'clinician', facility_id: 'f1', email: 'clinician@egesa.com' },
      { id: 'u2', full_name: 'Nurse Jane Doe', role: 'nurse', facility_id: 'f1', email: 'nurse@egesa.com' },
      { id: 'u3', full_name: 'Alice Cooper (Receptionist)', role: 'receptionist', facility_id: 'f1', email: 'receptionist@egesa.com' },
      { id: 'u4', full_name: 'Dr. Lab Tech Terry', role: 'lab_tech', facility_id: 'f1', email: 'lab_tech@egesa.com' },
      { id: 'u5', full_name: 'Pharmacist Bob', role: 'pharmacist', facility_id: 'f1', email: 'pharmacist@egesa.com' },
      { id: 'u6', full_name: 'Cashier Mary', role: 'cashier', facility_id: 'f1', email: 'cashier@egesa.com' },
      { id: 'u7', full_name: 'Admin Grace', role: 'admin', facility_id: 'f1', email: 'admin@egesa.com' }
    ],
    users: [
      { id: 'u1', email: 'clinician@egesa.com', passwordHash: defaultHash, name: 'Dr. Arthur Conan' },
      { id: 'u2', email: 'nurse@egesa.com', passwordHash: defaultHash, name: 'Nurse Jane Doe' },
      { id: 'u3', email: 'receptionist@egesa.com', passwordHash: defaultHash, name: 'Alice Cooper' },
      { id: 'u4', email: 'lab_tech@egesa.com', passwordHash: defaultHash, name: 'Dr. Lab Tech Terry' },
      { id: 'u5', email: 'pharmacist@egesa.com', passwordHash: defaultHash, name: 'Pharmacist Bob' },
      { id: 'u6', email: 'cashier@egesa.com', passwordHash: defaultHash, name: 'Cashier Mary' },
      { id: 'u7', email: 'admin@egesa.com', passwordHash: defaultHash, name: 'Admin Grace' }
    ],
    role_requests: [
      { id: 'req_1', user_id: 'user_steve', full_name: 'Steve Jobs', email: 'steve@apple.com', facility_id: 'f1', requested_role: 'clinician', status: 'pending', created_at: new Date().toISOString() },
      { id: 'req_2', user_id: 'user_florence', full_name: 'Florence Nightingale', email: 'florence@nursing.org', facility_id: 'f1', requested_role: 'nurse', status: 'pending', created_at: new Date().toISOString() }
    ],
    audit_logs: [],
    invoices: [],
    orders: [],
    visits: [],
    email_logs: []
  };
};

const loadSandboxDB = () => {
  if (!fs.existsSync(SANDBOX_DB_PATH)) {
    const data = getInitialSandboxData();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    return JSON.parse(fs.readFileSync(SANDBOX_DB_PATH, 'utf-8'));
  } catch (err) {
    console.error('Error loading sandbox database. Recreating.', err);
    const data = getInitialSandboxData();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
};

const saveSandboxDB = (data) => {
  fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2));
};

// Unified Database Helpers
const db = {
  getDocuments: async (tableName, queries = [], orderByField = null, orderByAsc = true) => {
    if (isRealAppwrite) {
      const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
      // Map basic query mappings
      const sdkQueries = queries.map(q => {
        if (q.type === 'equal') return sdk.Query.equal(q.column === 'id' ? '$id' : q.column, q.value);
        return null;
      }).filter(Boolean);
      
      if (orderByField) {
        const targetCol = orderByField === 'id' ? '$id' : (orderByField === 'created_at' ? '$createdAt' : orderByField);
        sdkQueries.push(orderByAsc ? sdk.Query.orderAsc(targetCol) : sdk.Query.orderDesc(targetCol));
      }
      
      const response = await appwriteDatabases.listDocuments(dbId, tableName, sdkQueries);
      return response.documents.map(d => ({ id: d.$id, created_at: d.$createdAt, ...d }));
    } else {
      const data = loadSandboxDB();
      let list = data[tableName] || [];
      queries.forEach(q => {
        if (q.type === 'equal') {
          list = list.filter(item => item[q.column] === q.value);
        }
      });
      if (orderByField) {
        list = [...list].sort((a, b) => {
          let valA = a[orderByField];
          let valB = b[orderByField];
          if (typeof valA === 'string') {
            return orderByAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          if (valA < valB) return orderByAsc ? -1 : 1;
          if (valA > valB) return orderByAsc ? 1 : -1;
          return 0;
        });
      }
      return list;
    }
  },
  
  createDocument: async (tableName, docId, docData) => {
    if (isRealAppwrite) {
      const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
      const cleanData = { ...docData };
      delete cleanData.id;
      delete cleanData.created_at;
      const response = await appwriteDatabases.createDocument(dbId, tableName, docId, cleanData);
      return { id: response.$id, created_at: response.$createdAt, ...response };
    } else {
      const data = loadSandboxDB();
      if (!data[tableName]) data[tableName] = [];
      const newDoc = { id: docId, created_at: new Date().toISOString(), ...docData };
      data[tableName].push(newDoc);
      saveSandboxDB(data);
      return newDoc;
    }
  },
  
  updateDocument: async (tableName, docId, docData) => {
    if (isRealAppwrite) {
      const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
      const cleanData = { ...docData };
      delete cleanData.id;
      delete cleanData.created_at;
      const response = await appwriteDatabases.updateDocument(dbId, tableName, docId, cleanData);
      return { id: response.$id, created_at: response.$createdAt, ...response };
    } else {
      const data = loadSandboxDB();
      if (!data[tableName]) data[tableName] = [];
      data[tableName] = data[tableName].map(doc => {
        if (doc.id === docId) {
          return { ...doc, ...docData };
        }
        return doc;
      });
      saveSandboxDB(data);
      return { id: docId };
    }
  },

  deleteDocument: async (tableName, docId) => {
    if (isRealAppwrite) {
      const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
      await appwriteDatabases.deleteDocument(dbId, tableName, docId);
      return true;
    } else {
      const data = loadSandboxDB();
      if (data[tableName]) {
        data[tableName] = data[tableName].filter(doc => doc.id !== docId);
        saveSandboxDB(data);
      }
      return true;
    }
  }
};

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token' });
    req.user = user;
    next();
  });
};

// ----------------------------------------------------
// AUTHENTICATION & PROFILE ROUTES
// ----------------------------------------------------

// User Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  try {
    if (isRealAppwrite) {
      // Create user account on Appwrite Cloud
      const userId = sdk.ID.unique();
      await appwriteUsers.create(userId, email, undefined, password, name);
      res.json({ success: true, user: { id: userId, email, name } });
    } else {
      // Local sandbox signup
      const data = loadSandboxDB();
      const existingUser = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      
      const userId = 'u_mock_' + Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      data.users.push({ id: userId, email, passwordHash, name });
      saveSandboxDB(data);
      
      res.json({ success: true, user: { id: userId, email, name } });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during registration' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    let verifiedUserId = null;
    let verifiedEmail = null;
    let verifiedName = null;
    
    if (isRealAppwrite) {
      // To verify credentials in node-appwrite, we can create a session using standard Appwrite REST API or login client.
      // Alternatively, we look up the user using users service and verify using local hashing or Appwrite credentials.
      // Since Appwrite server SDK doesn't have password verify on users directly, we can test it by creating session using client.
      const userClient = new sdk.Client()
        .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
        .setProject(process.env.VITE_APPWRITE_PROJECT_ID);
      const account = new sdk.Account(userClient);
      
      try {
        const session = await account.createEmailPasswordSession(email, password);
        const userDetails = await account.get();
        verifiedUserId = userDetails.$id;
        verifiedEmail = userDetails.email;
        verifiedName = userDetails.name;
      } catch (authErr) {
        return res.status(401).json({ error: 'Invalid email or password credentials' });
      }
    } else {
      // Sandbox mode login
      const data = loadSandboxDB();
      const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password credentials' });
      }
      
      verifiedUserId = user.id;
      verifiedEmail = user.email;
      verifiedName = user.name;
    }
    
    // Check if profile exists
    const profiles = await db.getDocuments('profiles', [
      { type: 'equal', column: 'email', value: verifiedEmail }
    ]);
    
    const activeProfile = profiles && profiles[0];
    
    if (!activeProfile) {
      // Query if there is a pending/rejected role request
      const requests = await db.getDocuments('role_requests', [
        { type: 'equal', column: 'email', value: verifiedEmail }
      ]);
      const activeRequest = requests && requests[0];
      
      return res.json({
        status: 'no_profile',
        user: { id: verifiedUserId, email: verifiedEmail, name: verifiedName },
        pendingRequest: activeRequest || null
      });
    }
    
    // Fetch facilities to attach logo & details
    const facs = await db.getDocuments('facilities', [
      { type: 'equal', column: 'id', value: activeProfile.facility_id }
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
      facility_name: facility?.name || 'Eagle Tech Medical Clinic',
      facility_logo: facility?.logo_url || null,
      department: activeProfile.department || 'admin',
      license_tier: facility?.license_tier || 'free',
      auth_method: 'email_password',
      session_expiry: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
    };
    
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '12h' });
    
    res.json({
      status: 'success',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during authentication' });
  }
});

// Appwrite JWT Verification & Login
app.post('/api/auth/appwrite-jwt-login', async (req, res) => {
  const { jwt: clientJwt } = req.body;
  if (!clientJwt) {
    return res.status(400).json({ error: 'Appwrite JWT token is required' });
  }

  try {
    let verifiedUserId = null;
    let verifiedEmail = null;
    let verifiedName = null;

    if (isRealAppwrite) {
      // Create server-side Client initialized with the user's JWT
      const jwtClient = new sdk.Client()
        .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
        .setJWT(clientJwt);
      
      const jwtAccount = new sdk.Account(jwtClient);
      const userDetails = await jwtAccount.get();
      
      verifiedUserId = userDetails.$id;
      verifiedEmail = userDetails.email;
      verifiedName = userDetails.name;
    } else {
      // Sandbox simulation: check if token represents onboarding
      if (clientJwt === 'mock_jwt_onboarding') {
        verifiedUserId = 'u_mock_google_' + Math.random().toString(36).substring(2, 10);
        verifiedEmail = 'google.admin@egesa.com';
        verifiedName = 'Google Admin';
      } else {
        const data = loadSandboxDB();
        const defaultUser = data.profiles.find(p => p.role === 'admin') || data.profiles[0];
        verifiedUserId = defaultUser.id;
        verifiedEmail = defaultUser.email;
        verifiedName = defaultUser.full_name;
      }
    }

    // Check if profile exists
    const profiles = await db.getDocuments('profiles', [
      { type: 'equal', column: 'email', value: verifiedEmail }
    ]);
    
    const activeProfile = profiles && profiles[0];
    
    if (!activeProfile) {
      // Query if there is a pending/rejected role request
      const requests = await db.getDocuments('role_requests', [
        { type: 'equal', column: 'email', value: verifiedEmail }
      ]);
      const activeRequest = requests && requests[0];
      
      return res.json({
        status: 'no_profile',
        user: { id: verifiedUserId, email: verifiedEmail, name: verifiedName },
        pendingRequest: activeRequest || null
      });
    }
    
    // Fetch facilities to attach logo & details
    const facs = await db.getDocuments('facilities', [
      { type: 'equal', column: 'id', value: activeProfile.facility_id }
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
      facility_name: facility?.name || 'Eagle Tech Medical Clinic',
      facility_logo: facility?.logo_url || null,
      department: activeProfile.department || 'admin',
      license_tier: facility?.license_tier || 'free',
      auth_method: 'google_oauth',
      session_expiry: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
    };
    
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '12h' });
    
    res.json({
      status: 'success',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Appwrite JWT login error:', err);
    res.status(401).json({ error: err.message || 'Invalid or expired Appwrite session' });
  }
});

// ----------------------------------------------------
// MULTI-TENANT RESOLUTION & ONBOARDING ENDPOINTS
// ----------------------------------------------------

// Resolve Tenant by Email or Domain
app.post('/api/auth/resolve-tenant', async (req, res) => {
  const { email, token } = req.body;
  if (!email && !token) {
    return res.status(400).json({ error: 'Email or invitation token is required' });
  }

  try {
    // If token is provided, resolve by token
    if (token) {
      const invitations = await db.getDocuments('invitations', [
        { type: 'equal', column: 'token', value: token },
        { type: 'equal', column: 'status', value: 'pending' }
      ]);
      const activeInvites = (invitations || []).filter(inv => new Date(inv.expires_at) > new Date());

      if (activeInvites && activeInvites.length > 0) {
        const invite = activeInvites[0];
        const facs = await db.getDocuments('facilities', [
          { type: 'equal', column: 'id', value: invite.facility_id }
        ]);
        const facility = facs && facs[0];

        return res.json({
          resolved: true,
          type: 'invite',
          invitation: {
            token: invite.token,
            email: invite.email,
            role: invite.role,
            department: invite.department
          },
          tenant: {
            id: invite.facility_id,
            name: facility?.name || 'Eagle Tech Medical Clinic',
            logo_url: facility?.logo_url || null,
            license_tier: facility?.license_tier || 'free',
            auth_method: facility?.auth_method || 'email_password'
          }
        });
      }
      return res.json({
        resolved: false,
        message: 'Invalid or expired invitation token.'
      });
    }

    const targetEmail = email.toLowerCase().trim();

    // 1. Check if there is an active profile with this email
    const profiles = await db.getDocuments('profiles', [
      { type: 'equal', column: 'email', value: targetEmail }
    ]);

    if (profiles && profiles.length > 0) {
      const activeProfile = profiles[0];
      const facs = await db.getDocuments('facilities', [
        { type: 'equal', column: 'id', value: activeProfile.facility_id }
      ]);
      const facility = facs && facs[0];

      return res.json({
        resolved: true,
        type: 'login',
        tenant: {
          id: activeProfile.facility_id,
          name: facility?.name || 'Eagle Tech Medical Clinic',
          logo_url: facility?.logo_url || null,
          license_tier: facility?.license_tier || 'free',
          auth_method: facility?.auth_method || 'email_password'
        }
      });
    }

    // 2. Check if there is a pending invitation
    const invitations = await db.getDocuments('invitations', [
      { type: 'equal', column: 'email', value: targetEmail },
      { type: 'equal', column: 'status', value: 'pending' }
    ]);

    const activeInvites = (invitations || []).filter(inv => new Date(inv.expires_at) > new Date());

    if (activeInvites && activeInvites.length > 0) {
      const invite = activeInvites[0];
      const facs = await db.getDocuments('facilities', [
        { type: 'equal', column: 'id', value: invite.facility_id }
      ]);
      const facility = facs && facs[0];

      return res.json({
        resolved: true,
        type: 'invite',
        invitation: {
          token: invite.token,
          email: invite.email,
          role: invite.role,
          department: invite.department
        },
        tenant: {
          id: invite.facility_id,
          name: facility?.name || 'Eagle Tech Medical Clinic',
          logo_url: facility?.logo_url || null,
          license_tier: facility?.license_tier || 'free',
          auth_method: facility?.auth_method || 'email_password'
        }
      });
    }

    return res.json({
      resolved: false,
      message: 'No active profile or pending invitation found for this email.'
    });

  } catch (err) {
    console.error('Resolve tenant error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during tenant resolution' });
  }
});

// Admin: Invite Department Staff
app.post('/api/auth/invite-staff', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }

  const { email, role, department } = req.body;
  if (!email || !role || !department) {
    return res.status(400).json({ error: 'Email, role, and department are required' });
  }

  try {
    const targetEmail = email.toLowerCase().trim();

    // Check if profile already exists
    const profiles = await db.getDocuments('profiles', [
      { type: 'equal', column: 'email', value: targetEmail }
    ]);
    if (profiles && profiles.length > 0) {
      return res.status(400).json({ error: 'A staff member with this email already has a profile.' });
    }

    // Check if there is an active pending invitation
    const existingInvites = await db.getDocuments('invitations', [
      { type: 'equal', column: 'email', value: targetEmail },
      { type: 'equal', column: 'status', value: 'pending' }
    ]);
    const activeInvites = (existingInvites || []).filter(inv => new Date(inv.expires_at) > new Date());
    if (activeInvites && activeInvites.length > 0) {
      return res.status(400).json({ error: 'A pending invitation has already been sent to this email.' });
    }

    const token = 'inv_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours

    const newInvite = await db.createDocument('invitations', 'doc_' + Math.random().toString(36).substring(2, 12), {
      email: targetEmail,
      facility_id: req.user.facility_id,
      role,
      department,
      invited_by: req.user.email,
      token,
      status: 'pending',
      expires_at: expiresAt
    });

    // Resolve facility details for email template
    const facs = await db.getDocuments('facilities', [
      { type: 'equal', column: 'id', value: req.user.facility_id }
    ]);
    const facility = facs && facs[0];

    // Load template
    const templatePath = path.join(__dirname, 'templates', 'email_invite_user_template.html');
    let htmlContent = '';
    try {
      htmlContent = fs.readFileSync(templatePath, 'utf8');
      const origin = req.headers.origin || 'http://localhost:5174';
      htmlContent = htmlContent
        .replace(/\{\{team\}\}/g, facility?.name || 'Eagle Tech Clinic')
        .replace(/\{\{user\}\}/g, targetEmail)
        .replace(/\{\{redirect\}\}/g, `${origin}/login?invite=${token}`)
        .replace(/\{\{project\}\}/g, 'Eagle Tech HMIS');
    } catch (e) {
      console.error('Error reading invite email template:', e);
      htmlContent = `<p>You have been invited to join ${facility?.name || 'Eagle Tech Clinic'} as a ${role} in ${department} department.</p>` +
                    `<p>Click here to accept: <a href="${req.headers.origin || 'http://localhost:5174'}/login?invite=${token}">Accept Invite</a></p>`;
    }

    // Try sending email
    const host = process.env.SMTP_HOST || 'smtp.titan.email';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const userMail = process.env.SMTP_USER || 'noreply@eagletechsolutions.tech';
    const passMail = process.env.SMTP_PASS || '';

    let mailSent = false;
    let errMessage = null;

    if (passMail) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user: userMail,
            pass: passMail
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        await transporter.sendMail({
          from: `"Eagle Tech HMIS" <${userMail}>`,
          to: targetEmail,
          subject: `[System Invite] Join ${facility?.name || 'Eagle Tech Clinic'} on Eagle Tech HMIS`,
          html: htmlContent
        });
        mailSent = true;
      } catch (err) {
        console.error('Failed sending invite email via nodemailer:', err);
        errMessage = err.message;
      }
    }

    // Write audit log
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id,
      user_id: req.user.id,
      action: 'STAFF_INVITATION_SENT',
      details: `Admin ${req.user.full_name} invited ${targetEmail} for role ${role.toUpperCase()} in ${department}. Mail sent: ${mailSent}.${errMessage ? ` Error: ${errMessage}` : ''}`
    });

    res.json({ success: true, invite: newInvite, mailSent });

  } catch (err) {
    console.error('Invite staff error:', err);
    res.status(500).json({ error: err.message || 'Error occurred while inviting staff' });
  }
});

// Accept Invite & Complete Registration
app.post('/api/auth/accept-invite', async (req, res) => {
  const { token, password, name } = req.body;
  if (!token || !password || !name) {
    return res.status(400).json({ error: 'Token, password, and name are required' });
  }

  try {
    // 1. Find the invitation
    const invitations = await db.getDocuments('invitations', [
      { type: 'equal', column: 'token', value: token },
      { type: 'equal', column: 'status', value: 'pending' }
    ]);

    const activeInvites = (invitations || []).filter(inv => new Date(inv.expires_at) > new Date());
    if (!activeInvites || activeInvites.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    const invite = activeInvites[0];

    // 2. Register User in Auth provider
    let userId = null;
    if (isRealAppwrite) {
      const uId = sdk.ID.unique();
      await appwriteUsers.create(uId, invite.email, undefined, password, name);
      userId = uId;
    } else {
      const uId = 'u_mock_' + Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const sandboxData = loadSandboxDB();
      sandboxData.users.push({
        id: uId,
        email: invite.email,
        passwordHash,
        name
      });
      saveSandboxDB(sandboxData);
      userId = uId;
    }

    // 3. Create Linked Profile
    const profile = await db.createDocument('profiles', userId, {
      full_name: name,
      role: invite.role,
      facility_id: invite.facility_id,
      email: invite.email,
      department: invite.department,
      auth_method: 'email_password'
    });

    // 4. Mark invitation as accepted
    await db.updateDocument('invitations', invite.id, {
      status: 'accepted'
    });

    // 5. Fetch facility details to build JWT payload
    const facs = await db.getDocuments('facilities', [
      { type: 'equal', column: 'id', value: invite.facility_id }
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
      facility_name: facility?.name || 'Eagle Tech Medical Clinic',
      facility_logo: facility?.logo_url || null,
      department: invite.department,
      license_tier: facility?.license_tier || 'free',
      auth_method: 'email_password',
      session_expiry: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '12h' });

    // Write audit log
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      facility_id: invite.facility_id,
      user_id: userId,
      action: 'INVITATION_ACCEPTED',
      details: `${name} accepted invitation and joined as ${invite.role.toUpperCase()} in ${invite.department}.`
    });

    res.json({
      success: true,
      token: sessionToken,
      user: userPayload
    });

  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: err.message || 'Error occurred while accepting invitation' });
  }
});

// Admin: Get all Invitations for Facility
app.get('/api/auth/invitations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  try {
    const invites = await db.getDocuments('invitations', [
      { type: 'equal', column: 'facility_id', value: req.user.facility_id }
    ]);
    res.json({ success: true, invitations: invites });
  } catch (err) {
    console.error('Fetch invitations error:', err);
    res.status(500).json({ error: err.message || 'Error loading invitations' });
  }
});

// Admin: Revoke Invitation
app.post('/api/auth/revoke-invite', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  const { invite_id } = req.body;
  if (!invite_id) {
    return res.status(400).json({ error: 'Invitation ID is required' });
  }

  try {
    // Fetch invite first to verify it belongs to this admin's facility
    const invites = await db.getDocuments('invitations', [
      { type: 'equal', column: 'id', value: invite_id }
    ]);
    const invite = invites && invites[0];
    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    if (invite.facility_id !== req.user.facility_id) {
      return res.status(403).json({ error: 'Unauthorized facility access' });
    }

    await db.updateDocument('invitations', invite_id, { status: 'revoked' });

    // Write audit log
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id,
      user_id: req.user.id,
      action: 'INVITATION_REVOKED',
      details: `Admin ${req.user.full_name} revoked invitation sent to ${invite.email}.`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Revoke invitation error:', err);
    res.status(500).json({ error: err.message || 'Error revoking invitation' });
  }
});

// Get Current Logged-in User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Submit a new Role Request
app.post('/api/auth/role-request', async (req, res) => {
  const { user_id, full_name, email, facility_id, requested_role } = req.body;
  if (!user_id || !full_name || !email || !facility_id || !requested_role) {
    return res.status(400).json({ error: 'All request fields are required' });
  }
  
  try {
    const docId = 'req_' + Math.random().toString(36).substring(2, 12);
    const newRequest = await db.createDocument('role_requests', docId, {
      user_id,
      full_name,
      email,
      facility_id,
      requested_role,
      status: 'pending'
    });
    
    // Log audit
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      action: 'ROLE_REQUEST_SUBMITTED',
      details: `${full_name} (${email}) requested role ${requested_role.toUpperCase()} for facility ID ${facility_id}.`
    });
    
    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error('Role request error:', err);
    res.status(500).json({ error: err.message || 'Error submitting role request' });
  }
});

// Admin: Get all Role Requests
app.get('/api/auth/role-requests', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  try {
    // Filter requests for the admin's facility
    const requests = await db.getDocuments('role_requests', [
      { type: 'equal', column: 'facility_id', value: req.user.facility_id }
    ]);
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Fetch requests error:', err);
    res.status(500).json({ error: err.message || 'Error loading requests' });
  }
});

// Admin: Approve Request
app.post('/api/auth/approve-request', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  
  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: 'Request ID is required' });
  }
  
  try {
    const requests = await db.getDocuments('role_requests', [
      { type: 'equal', column: 'id', value: request_id }
    ]);
    const request = requests && requests[0];
    if (!request) {
      return res.status(404).json({ error: 'Role request not found' });
    }
    
    // 1. Create Profile
    const profileId = request.user_id || ('u_prof_' + Math.random().toString(36).substring(2, 10));
    await db.createDocument('profiles', profileId, {
      full_name: request.full_name,
      role: request.requested_role,
      facility_id: request.facility_id,
      email: request.email
    });
    
    // 2. Update Request Status
    await db.updateDocument('role_requests', request_id, { status: 'approved' });
    
    // 3. Log Audit
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      action: 'ROLE_REQUEST_APPROVED',
      details: `Admin ${req.user.full_name} approved role ${request.requested_role.toUpperCase()} for ${request.full_name}.`
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ error: err.message || 'Error processing approval' });
  }
});

// Admin: Reject Request
app.post('/api/auth/reject-request', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  
  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: 'Request ID is required' });
  }
  
  try {
    // 1. Update Request
    await db.updateDocument('role_requests', request_id, { status: 'rejected' });
    
    // 2. Log Audit
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      action: 'ROLE_REQUEST_REJECTED',
      details: `Admin ${req.user.full_name} rejected role request ID ${request_id}.`
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: err.message || 'Error processing rejection' });
  }
});

// ----------------------------------------------------
// SMTP EMAIL ROUTING ENDPOINT
// ----------------------------------------------------
app.post('/api/send-email', async (req, res) => {
  const { email, subject, html, facilityId } = req.body;
  if (!email || !subject || !html) {
    return res.status(400).json({ error: 'Email, subject, and html body are required' });
  }
  
  try {
    // Try to get SMTP settings (defaults to Titan SMTP or system values)
    const host = process.env.SMTP_HOST || 'smtp.titan.email';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const userMail = process.env.SMTP_USER || 'noreply@eagletechsolutions.tech';
    const passMail = process.env.SMTP_PASS || '';
    
    if (!passMail) {
      console.log('SMTP Password not configured. Email logged to simulated outbox.');
      if (!isRealAppwrite) {
        const data = loadSandboxDB();
        data.email_logs.push({
          id: 'mail_' + Math.random().toString(36).substring(2, 12),
          recipient: email,
          subject,
          html,
          status: 'sent_simulated',
          created_at: new Date().toISOString()
        });
        saveSandboxDB(data);
      }
      return res.json({ success: true, message: 'Simulated dispatch logged successfully.' });
    }
    
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: userMail,
        pass: passMail
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const mailOptions = {
      from: `"Eagle Tech HMIS" <${userMail}>`,
      to: email,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email dispatch error:', err);
    res.status(500).json({ error: err.message || 'SMTP dispatch failed' });
  }
});

// ----------------------------------------------------
// TUMA PAY MOBILE MONEY & CARD INTEGRATION
// ----------------------------------------------------

// STK Push Payment Request Trigger
app.post('/api/mpesa/stkpush', async (req, res) => {
  const { phone, amount, reference } = req.body;
  if (!phone || !amount || !reference) {
    return res.status(400).json({ error: 'Phone number, amount, and reference account are required' });
  }
  
  // Clean phone number format: e.g. 0712345678 -> 254712345678
  let formattedPhone = phone.trim().replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }
  
  if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
    return res.status(400).json({ error: 'Valid Kenyan mobile number required (e.g. 2547XXXXXXXX or 07XXXXXXXX)' });
  }
  
  try {
    const tumaEmail = process.env.TUMA_EMAIL || 'info@eagletechsolutions.tech';
    const tumaApiKey = process.env.TUMA_API_KEY;
    const callbackUrl = process.env.TUMA_CALLBACK_URL || 'https://api.eagletechsolutions.tech/api/mpesa/callback';
    
    if (!tumaApiKey) {
      console.warn('Tuma API Key not configured. Falling back to simulated STK push.');
      const simulatedCheckoutId = reference; // reference maps to invoice id
      
      // Save simulated pending payment to mock DB
      if (!isRealAppwrite) {
        const data = loadSandboxDB();
        data.invoices.push({
          id: reference,
          checkout_id: simulatedCheckoutId,
          amount,
          phone: formattedPhone,
          status: 'pending_stk',
          created_at: new Date().toISOString()
        });
        saveSandboxDB(data);
      }
      
      return res.json({
        success: true,
        simulated: true,
        CheckoutRequestID: simulatedCheckoutId,
        CustomerMessage: 'Success. Simulated STK Push sent successfully (no API key present).'
      });
    }
    
    // 1. Get OAuth JWT Token from Tuma API
    let token = '';
    try {
      const authResponse = await axios.post('https://api.tuma.co.ke/auth/token', {
        email: tumaEmail,
        api_key: tumaApiKey
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      token = authResponse.data.token || authResponse.data.access_token;
    } catch (authErr) {
      console.error('Tuma API token authentication failed:', authErr.message);
      throw new Error('Tuma Authentication failed. Check your API credentials.');
    }
    
    // 2. Dispatch STK Push payment trigger to Tuma API
    const response = await axios.post('https://api.tuma.co.ke/payment/stk-push', {
      amount: Math.round(amount),
      phone: formattedPhone,
      description: `Egesa Health Invoice Checkout: #${reference}`,
      callback_url: callbackUrl
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Record checkout mapping to database
    const mpesaTxnId = response.data.id || response.data.paymentKey || response.data.CheckoutRequestID || reference;
    
    if (!isRealAppwrite) {
      const data = loadSandboxDB();
      data.invoices.push({
        id: reference,
        checkout_id: mpesaTxnId,
        amount,
        phone: formattedPhone,
        status: 'pending_stk',
        created_at: new Date().toISOString()
      });
      saveSandboxDB(data);
    }
    
    res.json({
      success: true,
      CheckoutRequestID: mpesaTxnId,
      CustomerMessage: response.data.message || 'Tuma Pay STK Push initialized.'
    });
  } catch (err) {
    console.error('Tuma Pay STK Push failed:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: err.message || 'Tuma Pay STK Push failed' });
  }
});

// Tuma Webhook Callback Hook (receives payment completions)
app.post('/api/mpesa/callback', async (req, res) => {
  console.log('Tuma Pay Webhook Callback payload received:', JSON.stringify(req.body, null, 2));
  
  try {
    // Parse both Tuma callback formats and Safaricom fallbacks
    let isSuccess = false;
    let amountPaid = 0;
    let receiptNumber = '';
    let invoiceId = '';
    let checkoutId = '';
    
    const { Body, status, statusId, partnerUniqueId, paymentKey, transactionId, id, amount } = req.body;
    
    if (Body && Body.stkCallback) {
      // Direct Safaricom layout fallback
      const { CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback;
      if (ResultCode === 0) {
        isSuccess = true;
        checkoutId = CheckoutRequestID;
        invoiceId = CheckoutRequestID; // default reference
        if (CallbackMetadata && CallbackMetadata.Item) {
          CallbackMetadata.Item.forEach(item => {
            if (item.Name === 'Amount') amountPaid = item.Value;
            if (item.Name === 'MpesaReceiptNumber') receiptNumber = item.Value;
          });
        }
      }
    } else {
      // Tuma Pay layout
      const statusVal = (status || statusId || '').toLowerCase();
      if (statusVal === 'success' || statusVal === 'completed' || statusVal === 'approved' || req.body.ResultCode === 0) {
        isSuccess = true;
      }
      invoiceId = partnerUniqueId || id;
      checkoutId = partnerUniqueId || id;
      receiptNumber = paymentKey || transactionId || id || ('TUMA_TX_' + Math.floor(100000 + Math.random() * 900000));
      amountPaid = amount || 0;
    }
    
    if (isSuccess) {
      console.log(`Tuma Pay Settlement Verified: Receipt ${receiptNumber} | Amount: KES ${amountPaid} | Ref: ${invoiceId}`);
      
      // Update database status of the corresponding invoice
      if (isRealAppwrite) {
        const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
        // 1. Update invoice to paid
        await appwriteDatabases.updateDocument(dbId, 'invoices', invoiceId, {
          status: 'paid',
          amount_paid: amountPaid,
          payment_method: 'tuma',
          receipt_number: receiptNumber
        });
        
        // 2. Log transaction
        await appwriteDatabases.createDocument(dbId, 'audit_logs', sdk.ID.unique(), {
          action: 'TUMA_PAYMENT_RECEIVED',
          details: `Tuma Pay payment confirmed. Receipt: ${receiptNumber}, Amount: ${amountPaid}, Invoice ID: ${invoiceId}.`
        });
      } else {
        // Local sandbox db updates
        const data = loadSandboxDB();
        const txn = data.invoices.find(inv => inv.id === invoiceId || inv.checkout_id === checkoutId);
        if (txn) {
          txn.status = 'paid';
          txn.receipt_number = receiptNumber;
          txn.amount_paid = amountPaid;
          
          // Also insert audit trail logs
          data.audit_logs.push({
            id: 'log_' + Math.random().toString(36).substring(2, 12),
            action: 'TUMA_PAYMENT_RECEIVED',
            details: `Tuma Pay payment confirmed. Receipt: ${receiptNumber}, Amount: ${amountPaid}, Invoice: ${invoiceId}.`,
            created_at: new Date().toISOString()
          });
          saveSandboxDB(data);
        }
      }
    } else {
      console.warn('Tuma Pay Transaction Callback failed or was cancelled.');
    }
    
    res.json({ ResultCode: 0, ResultDescription: 'Success' });
  } catch (err) {
    console.error('Tuma Pay Callback processing failed:', err);
    res.status(500).json({ ResultCode: 1, ResultDescription: err.message || 'Callback error' });
  }
});

// Sandbox Simulator Endpoint to trigger simulated payment success
app.post('/api/mpesa/simulate-success', async (req, res) => {
  const { CheckoutRequestID } = req.body;
  if (!CheckoutRequestID) {
    return res.status(400).json({ error: 'CheckoutRequestID is required' });
  }
  
  console.log('Simulating successful Tuma Pay payment callback for invoice reference:', CheckoutRequestID);
  
  const mockPayload = {
    status: 'success',
    partnerUniqueId: CheckoutRequestID,
    paymentKey: 'TUMA_TX_' + Math.floor(100000 + Math.random() * 900000),
    amount: 1.0
  };
  
  try {
    const callbackResponse = await axios.post(`http://localhost:${PORT}/api/mpesa/callback`, mockPayload);
    res.json({ success: true, callbackResponse: callbackResponse.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DATABASE & FUNCTION PROXIES FOR PRODUCTION SECURE ACCESS
// ----------------------------------------------------

// DB Proxy: Query documents
app.post('/api/db/query', async (req, res) => {
  const { table, queries = [], orderByField = null, orderByAsc = true } = req.body;
  if (!table) return res.status(400).json({ error: 'Table name is required' });

  // Security: only allow unauthenticated requests for 'facilities' table
  if (table !== 'facilities') {
    // Authenticate token manually
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    try {
      const decodedUser = jwt.verify(token, JWT_SECRET);
      req.user = decodedUser;
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
  }

  try {
    // If table is not a global table, automatically enforce facility filtering
    const globalTables = ['facilities', 'profiles'];
    const enrichedQueries = [...queries];
    
    if (!globalTables.includes(table) && req.user) {
      // Ensure facility_id filter is appended
      const hasFacilityFilter = enrichedQueries.some(q => q && q.column === 'facility_id');
      if (!hasFacilityFilter) {
        enrichedQueries.push({ type: 'equal', column: 'facility_id', value: req.user.facility_id });
      }
    }

    const data = await db.getDocuments(table, enrichedQueries, orderByField, orderByAsc);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`DB Query Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || 'Database query failed' });
  }
});

// DB Proxy: Insert documents
app.post('/api/db/insert', async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !rows) return res.status(400).json({ error: 'Table and rows are required' });

  // Security: only allow unauthenticated requests for 'facilities' and 'profiles' (needed during onboarding)
  if (table !== 'facilities' && table !== 'profiles') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    try {
      const decodedUser = jwt.verify(token, JWT_SECRET);
      req.user = decodedUser;
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
  }

  try {
    const dataRows = Array.isArray(rows) ? rows : [rows];
    const results = [];
    const activeFacId = req.user ? req.user.facility_id : null;

    for (const row of dataRows) {
      const { id, created_at, ...cleanRow } = row;
      const globalTables = ['facilities', 'profiles'];
      
      // Enforce facility_id for tenant tables if authenticated
      if (!globalTables.includes(table) && activeFacId && !cleanRow.facility_id) {
        cleanRow.facility_id = activeFacId;
      }

      const docId = id || 'doc_' + Math.random().toString(36).substring(2, 15);
      const newDoc = await db.createDocument(table, docId, cleanRow);
      results.push(newDoc);
    }

    // Log audit log hook
    if (table !== 'audit_logs') {
      const facilityId = activeFacId || (table === 'facilities' ? results[0]?.id : 'f1');
      const userId = req.user ? req.user.id : 'onboarding';
      await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
        facility_id: facilityId,
        user_id: userId,
        action: `Insert: ${table}`,
        details: `Inserted ${results.length} record(s) into ${table}`
      });
    }

    res.json({ success: true, data: Array.isArray(rows) ? results : results[0] });
  } catch (err) {
    console.error(`DB Insert Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || 'Database insertion failed' });
  }
});

// DB Proxy: Update documents
app.post('/api/db/update', authenticateToken, async (req, res) => {
  const { table, column, value, values } = req.body;
  if (!table || !column || value === undefined || !values) {
    return res.status(400).json({ error: 'Table, query column, query value, and values to update are required' });
  }

  try {
    // 1. Find matching documents
    const queries = [{ type: 'equal', column, value }];
    const globalTables = ['facilities', 'profiles'];
    if (!globalTables.includes(table)) {
      queries.push({ type: 'equal', column: 'facility_id', value: req.user.facility_id });
    }

    const docs = await db.getDocuments(table, queries);
    if (docs.length === 0) {
      return res.status(404).json({ error: 'No matching records found to update' });
    }

    const results = [];
    const { id, created_at, ...cleanValues } = values;

    for (const doc of docs) {
      await db.updateDocument(table, doc.id, cleanValues);
      results.push({ id: doc.id });
    }

    // Log audit
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id || 'f1',
      user_id: req.user.id || 'system',
      action: `Update: ${table}`,
      details: `Updated ${results.length} record(s) in ${table} where ${column} = ${value}`
    });

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(`DB Update Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || 'Database update failed' });
  }
});

// DB Proxy: Delete documents
app.post('/api/db/delete', authenticateToken, async (req, res) => {
  const { table, column, value } = req.body;
  if (!table || !column || value === undefined) {
    return res.status(400).json({ error: 'Table, query column, and query value are required' });
  }

  try {
    // 1. Find matching documents
    const queries = [{ type: 'equal', column, value }];
    const globalTables = ['facilities', 'profiles'];
    if (!globalTables.includes(table)) {
      queries.push({ type: 'equal', column: 'facility_id', value: req.user.facility_id });
    }

    const docs = await db.getDocuments(table, queries);
    if (docs.length === 0) {
      return res.status(404).json({ error: 'No matching records found to delete' });
    }

    for (const doc of docs) {
      await db.deleteDocument(table, doc.id);
    }

    // Log audit
    await db.createDocument('audit_logs', 'log_' + Math.random().toString(36).substring(2, 12), {
      facility_id: req.user.facility_id || 'f1',
      user_id: req.user.id || 'system',
      action: `Delete: ${table}`,
      details: `Deleted ${docs.length} record(s) from ${table} where ${column} = ${value}`
    });

    res.json({ success: true });
  } catch (err) {
    console.error(`DB Delete Proxy failed for table ${table}:`, err);
    res.status(500).json({ error: err.message || 'Database deletion failed' });
  }
});

// Appwrite Cloud Functions proxy runner
app.post('/api/functions/invoke', async (req, res) => {
  const { name, payload } = req.body;
  if (!name) return res.status(400).json({ error: 'Function name is required' });

  // Security: only allow unauthenticated requests for 'google-oauth-exchange'
  if (name !== 'google-oauth-exchange') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    try {
      const decodedUser = jwt.verify(token, JWT_SECRET);
      req.user = decodedUser;
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
  }

  try {
    let functionId = name;
    if (name === 'send-email') {
      functionId = process.env.VITE_APPWRITE_FUNCTION_SEND_EMAIL || '6a2d4a8900176cd7c70a';
    } else if (name === 'google-oauth-exchange') {
      functionId = process.env.VITE_APPWRITE_FUNCTION_GOOGLE_OAUTH_EXCHANGE || 'google-oauth-exchange';
    } else if (name === 'generate-report-excel') {
      functionId = process.env.VITE_APPWRITE_FUNCTION_GENERATE_REPORT_EXCEL || 'generate-report-excel';
    }

    if (isRealAppwrite && appwriteFunctions) {
      const execution = await appwriteFunctions.createExecution(
        functionId,
        JSON.stringify(payload)
      );
      res.json({
        success: true,
        data: {
          responseBody: execution.responseBody,
          statusCode: execution.statusCode
        }
      });
    } else {
      // Sandbox simulation fallback
      if (name === 'google-oauth-exchange') {
        const dbList = await db.getDocuments('profiles', [
          { type: 'equal', column: 'facility_id', value: payload.facilityId }
        ]);
        if (dbList.length > 0) {
          const targetUser = dbList.find(p => p.role === 'admin') || dbList[0];
          const mockToken = targetUser.autologin_token || `tok_google_${Math.random().toString(36).substring(2, 15)}`;

          // Update autologin_token
          await db.updateDocument('profiles', targetUser.id, { autologin_token: mockToken });

          res.json({
            success: true,
            data: {
              responseBody: JSON.stringify({
                success: true,
                email: targetUser.email || `${targetUser.full_name.toLowerCase().replace(/ /g, '')}@egesa.com`,
                autologin_token: mockToken
              }),
              statusCode: 200
            }
          });
        } else {
          res.status(404).json({ error: 'No active profile found for the selected hospital facility.' });
        }
      } else {
        res.json({
          success: true,
          data: {
            responseBody: JSON.stringify({
              success: true,
              message: `Simulated report generated by Appwrite Function '${name}'`,
              timestamp: new Date().toISOString(),
              recordCount: payload.recordCount || 0
            }),
            statusCode: 200
          }
        });
      }
    }
  } catch (err) {
    console.error(`Appwrite Function Proxy failed for ${name}:`, err);
    res.status(500).json({ error: err.message || 'Function execution failed' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Eagle Tech HMIS Server listening on port ${PORT}`);
});
