// Force local sandbox simulation mode for tests
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.VITE_SUPABASE_URL = "";
process.env.VITE_SUPABASE_ANON_KEY = "";

const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');
const { JWT_SECRET } = require('./middleware/auth');
const workflowsRouter = require('./routes/workflows');
const dbRouter = require('./routes/db');

const app = express();
app.use(express.json());
app.use('/api/workflows', workflowsRouter);
app.use('/api/db', dbRouter);

const server = http.createServer(app);

const runTests = async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/workflows`;

  // Generate test token
  const token = jwt.sign({ id: 'test_nurs_id', role: 'admin,clinician', facility_id: 'f1' }, JWT_SECRET);
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  console.log("Starting workflows API integration tests on port", port);
  let failed = false;

  // Test 1: ANC Gestational Age Calculation
  try {
    const lmp = new Date();
    lmp.setDate(lmp.getDate() - 70); // 10 weeks ago
    const res = await axios.post(`${baseUrl}/anc/calculate-gestational-age`, {
      lmp_date: lmp.toISOString().split('T')[0]
    }, config);
    
    if (res.data.success && res.data.gestational_age_weeks === 10) {
      console.log("✅ Test 1 Passed: ANC Gestational Age calculated successfully (10 weeks)");
    } else {
      console.error("❌ Test 1 Failed: Unexpected ANC response", res.data);
      failed = true;
    }
  } catch (err) {
    console.error("❌ Test 1 Failed with error:", err.message);
    failed = true;
  }

  // Test 2: Family Planning WHO Eligibility
  try {
    const res = await axios.post(`${baseUrl}/fp/who-criteria`, {
      method_code: 'PILL',
      medical_conditions: { hypertension: true }
    }, config);

    if (res.data.success && res.data.category === 4) {
      console.log("✅ Test 2 Passed: FP WHO Criteria contraindicated hypertension successfully");
    } else {
      console.error("❌ Test 2 Failed: Unexpected FP response", res.data);
      failed = true;
    }
  } catch (err) {
    console.error("❌ Test 2 Failed with error:", err.message);
    failed = true;
  }

  // Test 3: Immunization Vaccine Eligibility
  try {
    const dob = new Date();
    dob.setDate(dob.getDate() - 42); // 6 weeks ago
    const res = await axios.post(`${baseUrl}/immunization/eligible-vaccines`, {
      birth_date: dob.toISOString().split('T')[0],
      patient_id: 'test_patient_id'
    }, config);

    if (res.data.success && Array.isArray(res.data.vaccines)) {
      console.log("✅ Test 3 Passed: Vaccine eligibility returned vaccines list");
    } else {
      console.error("❌ Test 3 Failed: Unexpected Vaccine response", res.data);
      failed = true;
    }
  } catch (err) {
    console.error("❌ Test 3 Failed with error:", err.message);
    failed = true;
  }

  // Test 4: Inpatient Bed Status update
  try {
    const res = await axios.post(`${baseUrl}/inpatient/bed-status`, {
      bed_id: 'bed_m1',
      status: 'occupied',
      patient_id: 'test_patient_id'
    }, config);

    if (res.data.success) {
      console.log("✅ Test 4 Passed: Inpatient bed status updated successfully");
    } else {
      console.error("❌ Test 4 Failed: Unexpected Bed status response", res.data);
      failed = true;
    }
  } catch (err) {
    console.error("❌ Test 4 Failed with error:", err.message);
    failed = true;
  }

  // Test 5: Input Validation Checks
  try {
    const dbUrl = `http://127.0.0.1:${port}/api/db`;
    // Try to insert a patient with DOB 1000-01-01
    try {
      await axios.post(`${dbUrl}/insert`, {
        table: 'patients',
        rows: { dob: '1000-01-01', name: 'Old Man', gender: 'male' }
      }, config);
      console.error("❌ Test 5 Failed: Old DOB inserted without error");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("before 1900")) {
        console.log("✅ Test 5a Passed: Backend successfully rejected unrealistic patient birthdate");
      } else {
        console.error("❌ Test 5a Failed: Unexpected error for old DOB insertion", err.message, err.response?.data);
        failed = true;
      }
    }

    // Try to insert a triage record with temperature 55°C
    try {
      await axios.post(`${dbUrl}/insert`, {
        table: 'triages',
        rows: { temperature: 55.0, systolic: 120, diastolic: 80, visit_id: 'some_visit_id' }
      }, config);
      console.error("❌ Test 5 Failed: Extreme temperature inserted without error");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("Temperature must be between")) {
        console.log("✅ Test 5b Passed: Backend successfully rejected extreme physiological temperature");
      } else {
        console.error("❌ Test 5b Failed: Unexpected error for extreme temperature insertion", err.message, err.response?.data);
        failed = true;
      }
    }
  } catch (err) {
    console.error("❌ Test 5 Failed with error:", err.message);
    failed = true;
  }

  server.close();
  if (failed) {
    process.exit(1);
  } else {
    console.log("🎉 All integration tests passed successfully!");
    process.exit(0);
  }
};

runTests();
