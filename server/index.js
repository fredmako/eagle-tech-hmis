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

if (isRealAppwrite) {
  console.log('Backend running in Real Appwrite Mode connecting to:', process.env.VITE_APPWRITE_ENDPOINT);
  appwriteClient = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);
  
  appwriteDatabases = new sdk.Databases(appwriteClient);
  appwriteUsers = new sdk.Users(appwriteClient);
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
  getDocuments: async (tableName, queries = []) => {
    if (isRealAppwrite) {
      const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
      // Map basic query mappings
      const sdkQueries = queries.map(q => {
        if (q.type === 'equal') return sdk.Query.equal(q.column === 'id' ? '$id' : q.column, q.value);
        return null;
      }).filter(Boolean);
      
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
      email: verifiedEmail,
      full_name: activeProfile.full_name,
      role: activeProfile.role,
      facility_id: activeProfile.facility_id,
      facility_name: facility?.name || 'Eagle Tech Medical Clinic',
      facility_logo: facility?.logo_url || null
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
// M-PESA DARAJA MOBILE PAYMENTS INTEGRATION
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
    return res.status(400).json({ error: 'Valid Kenyan Safaricom phone number required (e.g. 2547XXXXXXXX or 07XXXXXXXX)' });
  }
  
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const env = process.env.MPESA_ENV || 'sandbox';
    
    const authUrl = `https://${env === 'sandbox' ? 'sandbox' : 'api'}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`;
    const pushUrl = `https://${env === 'sandbox' ? 'sandbox' : 'api'}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`;
    
    // 1. Get OAuth Access Token from Safaricom
    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    let token = '';
    try {
      const authResponse = await axios.get(authUrl, {
        headers: { Authorization: `Basic ${authHeader}` }
      });
      token = authResponse.data.access_token;
    } catch (tokenErr) {
      console.warn('M-Pesa API Auth Token request failed. Falling back to simulated STK push.', tokenErr.message);
      // Fallback: simulated push for sandbox or local testing when credentials aren't active
      const simulatedCheckoutId = 'ws_CO_' + Math.random().toString(36).substring(2, 12);
      
      // Save simulated pending payment to mock DB
      if (!isRealAppwrite) {
        const data = loadSandboxDB();
        data.invoices.push({
          id: reference, // reference maps to invoice id
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
        CustomerMessage: 'Success. Request received locally for simulated verification.'
      });
    }
    
    // 2. Generate security password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    
    // 3. Dispatch STK Push process request
    const response = await axios.post(pushUrl, {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: reference.substring(0, 12),
      TransactionDesc: 'Egesa Health Bill Payment'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    res.json({
      success: true,
      CheckoutRequestID: response.data.CheckoutRequestID,
      CustomerMessage: response.data.CustomerMessage
    });
  } catch (err) {
    console.error('M-Pesa STK Push Dispatch failed:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: err.message || 'M-Pesa request failed' });
  }
});

// Safaricom Callback Hook (receives confirmations)
app.post('/api/mpesa/callback', async (req, res) => {
  console.log('M-Pesa Callback payload received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
      return res.status(400).json({ error: 'Invalid callback payload structure' });
    }
    
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;
    
    if (ResultCode === 0) {
      // Payment Successful
      let amountPaid = 0;
      let mpesaReceipt = '';
      let phoneNumber = '';
      
      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach(item => {
          if (item.Name === 'Amount') amountPaid = item.Value;
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
          if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
        });
      }
      
      console.log(`STK Push Payment Verified: ${mpesaReceipt} | Paid: KES ${amountPaid} for checkout request ${CheckoutRequestID}`);
      
      // Update database status of the corresponding invoice
      if (isRealAppwrite) {
        // Query invoice matching CheckoutRequestID or reference
        const dbId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';
        // Note: For production we would filter invoices by checkout_id or metadata reference.
        // We log successful mpesa payment audit trail.
        await appwriteDatabases.createDocument(dbId, 'audit_logs', sdk.ID.unique(), {
          action: 'MPESA_PAYMENT_RECEIVED',
          details: `M-Pesa payment received. Receipt: ${mpesaReceipt}, Amount: ${amountPaid}, Phone: ${phoneNumber}.`
        });
      } else {
        // Local sandbox db updates
        const data = loadSandboxDB();
        // Find transaction
        const txn = data.invoices.find(inv => inv.checkout_id === CheckoutRequestID);
        if (txn) {
          txn.status = 'paid';
          txn.receipt_number = mpesaReceipt;
          
          // Also insert audit trail logs
          data.audit_logs.push({
            id: 'log_' + Math.random().toString(36).substring(2, 12),
            action: 'MPESA_PAYMENT_RECEIVED',
            details: `M-Pesa payment received. Receipt: ${mpesaReceipt}, Amount: ${amountPaid}, Phone: ${phoneNumber}.`,
            created_at: new Date().toISOString()
          });
          saveSandboxDB(data);
        }
      }
    } else {
      console.warn(`STK Push Payment Failed/Cancelled: Code ${ResultCode} | Description: ${ResultDesc}`);
    }
    
    res.json({ ResultCode: 0, ResultDescription: 'Success' });
  } catch (err) {
    console.error('M-Pesa Callback processing failed:', err);
    res.status(500).json({ ResultCode: 1, ResultDescription: err.message || 'Callback error' });
  }
});

// Sandbox Simulator Endpoint to trigger simulated payment success
app.post('/api/mpesa/simulate-success', async (req, res) => {
  const { CheckoutRequestID } = req.body;
  if (!CheckoutRequestID) {
    return res.status(400).json({ error: 'CheckoutRequestID is required' });
  }
  
  console.log('Simulating successful M-Pesa transaction payment for:', CheckoutRequestID);
  
  // Construct a standard successful Callback payload
  const mockPayload = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'sim_merchant_123',
        CheckoutRequestID,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 1.0 },
            { Name: 'MpesaReceiptNumber', Value: 'NLK' + Math.floor(100000 + Math.random() * 900000) },
            { Name: 'TransactionDate', Value: Date.now() },
            { Name: 'PhoneNumber', Value: 254712345678 }
          ]
        }
      }
    }
  };
  
  try {
    const callbackResponse = await axios.post(`http://localhost:${PORT}/api/mpesa/callback`, mockPayload);
    res.json({ success: true, callbackResponse: callbackResponse.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Eagle Tech HMIS Server listening on port ${PORT}`);
});
