// Force local sandbox simulation mode for tests
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.VITE_SUPABASE_URL = "";
process.env.VITE_SUPABASE_ANON_KEY = "";
process.env.TUMA_API_KEY = "";


const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');
const { JWT_SECRET } = require('./middleware/auth');
const workflowsRouter = require('./routes/workflows');
const dbRouter = require('./routes/db');
const paymentsRouter = require('./routes/payments');
const mpesaRouter = require('./routes/mpesa');

const app = express();
app.use(express.json());
app.use('/api/workflows', workflowsRouter);
app.use('/api/db', dbRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/mpesa', mpesaRouter);

const server = http.createServer(app);

const runTests = async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/workflows`;
  const dbUrl = `http://127.0.0.1:${port}/api/db`;

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

  // Test 6: Payment Endpoints (Stripe, PayPal, M-Pesa)
  try {
    // 6.1 Seed test invoice
    await axios.post(`${dbUrl}/insert`, {
      table: 'invoices',
      rows: { id: 'test_invoice_123', total_amount: 1000, status: 'pending', visit_id: 'v1' }
    }, config);

    // 6.2 Stripe Create Payment Intent
    const stripeRes = await axios.post(`http://127.0.0.1:${port}/api/payments/stripe/create-payment-intent`, {
      amount: 1000,
      invoiceId: 'test_invoice_123',
      facilityId: 'f1'
    }, config);

    if (stripeRes.data.success && stripeRes.data.clientSecret) {
      console.log("✅ Test 6a Passed: Stripe create-payment-intent returned secret successfully");
    } else {
      console.error("❌ Test 6a Failed: Unexpected Stripe response", stripeRes.data);
      failed = true;
    }

    // 6.3 PayPal Create Order
    const paypalRes = await axios.post(`http://127.0.0.1:${port}/api/payments/paypal/create-order`, {
      amount: 1000,
      invoiceId: 'test_invoice_123',
      facilityId: 'f1'
    }, config);

    if (paypalRes.data.success && paypalRes.data.orderID) {
      console.log("✅ Test 6b Passed: PayPal create-order created order successfully");
    } else {
      console.error("❌ Test 6b Failed: Unexpected PayPal response", paypalRes.data);
      failed = true;
    }

    // 6.4 PayPal Capture Order
    const captureRes = await axios.post(`http://127.0.0.1:${port}/api/payments/paypal/capture-order`, {
      orderID: paypalRes.data.orderID,
      invoiceId: 'test_invoice_123',
      facilityId: 'f1',
      paymentMethod: 'paypal'
    }, config);

    if (captureRes.data.success) {
      console.log("✅ Test 6c Passed: PayPal capture-order marked invoice paid successfully");
    } else {
      console.error("❌ Test 6c Failed: Unexpected PayPal capture response", captureRes.data);
      failed = true;
    }

    // 6.5 M-Pesa STK Push
    const mpesaRes = await axios.post(`http://127.0.0.1:${port}/api/mpesa/stkpush`, {
      phone: '0712345678',
      amount: 1000,
      reference: 'test_invoice_123'
    }, config);

    if (mpesaRes.data.success && mpesaRes.data.CheckoutRequestID) {
      console.log("✅ Test 6d Passed: M-Pesa STK Push mock request sent successfully");
    } else {
      console.error("❌ Test 6d Failed: Unexpected M-Pesa response", mpesaRes.data);
      failed = true;
    }

  } catch (err) {
    console.error("❌ Test 6 Failed with error:", err.message, err.response?.data || "");
    failed = true;
  }

  // Test 7: Operations & Calendar Input Validations
  try {
    // 7.1 Invalid inventory price
    try {
      await axios.post(`${dbUrl}/insert`, {
        table: 'inventory_items',
        rows: {
          id: 'test_inv_fail',
          name: 'Fail Drug',
          category: 'pharmaceutical',
          unit_of_measure: 'box',
          unit_price: -10.00,
          quantity_in_stock: 10,
          min_reorder_level: 5
        }
      }, config);
      console.error("❌ Test 7a Failed: Backend accepted negative unit price!");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("Unit price cannot be negative")) {
        console.log("✅ Test 7a Passed: Backend successfully rejected negative unit price");
      } else {
        console.error("❌ Test 7a Failed: Unexpected error for negative unit price", err.response?.data || err.message);
        failed = true;
      }
    }

    // 7.2 Invalid purchase quantity
    try {
      await axios.post(`${dbUrl}/insert`, {
        table: 'purchases',
        rows: {
          id: 'test_po_fail',
          item_name: 'Surgical Gowns',
          quantity: -5,
          estimated_cost: 200.00,
          supplier: 'Supplier Inc',
          status: 'Pending Approval'
        }
      }, config);
      console.error("❌ Test 7b Failed: Backend accepted negative purchase quantity!");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("Purchase quantity must be greater than zero")) {
        console.log("✅ Test 7b Passed: Backend successfully rejected negative purchase quantity");
      } else {
        console.error("❌ Test 7b Failed: Unexpected error for negative purchase quantity", err.response?.data || err.message);
        failed = true;
      }
    }

    // 7.3 Invalid utility amount
    try {
      await axios.post(`${dbUrl}/insert`, {
        table: 'utility_records',
        rows: {
          id: 'test_util_fail',
          utility_name: 'Water Intake',
          billing_period: 'June 2026',
          amount: -500,
          payment_status: 'unpaid'
        }
      }, config);
      console.error("❌ Test 7c Failed: Backend accepted negative utility bill amount!");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("Utility bill amount cannot be negative")) {
        console.log("✅ Test 7c Passed: Backend successfully rejected negative utility bill amount");
      } else {
        console.error("❌ Test 7c Failed: Unexpected error for negative utility bill amount", err.response?.data || err.message);
        failed = true;
      }
    }

    // 7.4 Future check-in date
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await axios.post(`${dbUrl}/insert`, {
        table: 'ward_care_records',
        rows: {
          id: 'test_ward_fail',
          admission_id: 'test_adm_123',
          care_date: tomorrowStr,
          round_number: 1,
          bp_systolic: 120,
          bp_diastolic: 80,
          temperature: 37.0,
          pulse_rate: 72,
          respiratory_rate: 16,
          observations_notes: 'Future note'
        }
      }, config);
      console.error("❌ Test 7d Failed: Backend accepted future care check-in date!");
      failed = true;
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes("Care check-in date cannot be in the future")) {
        console.log("✅ Test 7d Passed: Backend successfully rejected future care check-in date");
      } else {
        console.error("❌ Test 7d Failed: Unexpected error for future care check-in date", err.response?.data || err.message);
        failed = true;
      }
    }
  } catch (err) {
    console.error("❌ Test 7 Failed with error:", err.message);
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
