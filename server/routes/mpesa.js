const express = require("express");
const router = express.Router();
const axios = require("axios");

const { isRealSupabase, supabaseClient, loadSandboxDB, saveSandboxDB } = require("../utils/db");

// STK Push Payment Request Trigger
router.post("/stkpush", async (req, res) => {
  const { phone, amount, reference } = req.body;
  if (!phone || !amount || !reference) {
    return res
      .status(400)
      .json({
        error: "Phone number, amount, and reference account are required",
      });
  }

  // Clean phone number format: e.g. 0712345678 -> 254712345678
  let formattedPhone = phone.trim().replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "254" + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith("+")) {
    formattedPhone = formattedPhone.substring(1);
  }

  if (!formattedPhone.startsWith("254") || formattedPhone.length !== 12) {
    return res
      .status(400)
      .json({
        error:
          "Valid Kenyan mobile number required (e.g. 2547XXXXXXXX or 07XXXXXXXX)",
      });
  }

  try {
    const tumaEmail = process.env.TUMA_EMAIL || "info@eagletechsolutions.tech";
    const tumaApiKey = process.env.TUMA_API_KEY;
    const callbackUrl =
      process.env.TUMA_CALLBACK_URL ||
      "https://api.eagletechsolutions.tech/api/mpesa/callback";

    if (!tumaApiKey) {
      console.warn(
        "Tuma API Key not configured. Falling back to simulated STK push."
      );
      const simulatedCheckoutId = reference; // reference maps to invoice id

      // Save simulated pending payment to mock DB
      if (!isRealSupabase) {
        const data = loadSandboxDB();
        data.invoices.push({
          id: reference,
          checkout_id: simulatedCheckoutId,
          amount,
          phone: formattedPhone,
          status: "pending_stk",
          created_at: new Date().toISOString(),
        });
        saveSandboxDB(data);
      }

      return res.json({
        success: true,
        simulated: true,
        CheckoutRequestID: simulatedCheckoutId,
        CustomerMessage:
          "Success. Simulated STK Push sent successfully (no API key present).",
      });
    }

    // 1. Get OAuth JWT Token from Tuma API
    let token = "";
    try {
      const authResponse = await axios.post(
        "https://api.tuma.co.ke/auth/token",
        {
          email: tumaEmail,
          api_key: tumaApiKey,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      token = authResponse.data.token || authResponse.data.access_token;
    } catch (authErr) {
      console.error("Tuma API token authentication failed:", authErr.message);
      throw new Error(
        "Tuma Authentication failed. Check your API credentials."
      );
    }

    // 2. Dispatch STK Push payment trigger to Tuma API
    const response = await axios.post(
      "https://api.tuma.co.ke/payment/stk-push",
      {
        amount: Math.round(amount),
        phone: formattedPhone,
        description: `Egesa Health Invoice Checkout: #${reference}`,
        callback_url: callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Record checkout mapping to database
    const mpesaTxnId =
      response.data.id ||
      response.data.paymentKey ||
      response.data.CheckoutRequestID ||
      reference;

    if (isRealSupabase) {
      const { error } = await supabaseClient
        .from("invoices")
        .update({
          checkout_id: mpesaTxnId,
          status: "pending_stk",
        })
        .eq("id", reference);

      if (error) {
        console.error("Failed to update invoice checkout_id in Supabase:", error.message);
      }
    } else {
      const data = loadSandboxDB();
      data.invoices.push({
        id: reference,
        checkout_id: mpesaTxnId,
        amount,
        phone: formattedPhone,
        status: "pending_stk",
        created_at: new Date().toISOString(),
      });
      saveSandboxDB(data);
    }

    res.json({
      success: true,
      CheckoutRequestID: mpesaTxnId,
      CustomerMessage:
        response.data.message || "Tuma Pay STK Push initialized.",
    });
  } catch (err) {
    console.error(
      "Tuma Pay STK Push failed:",
      err.response ? err.response.data : err.message
    );
    res.status(500).json({ error: err.message || "Tuma Pay STK Push failed" });
  }
});

// Tuma Webhook Callback Hook (receives payment completions)
router.post("/callback", async (req, res) => {
  console.log(
    "Tuma Webhook Callback payload received:",
    JSON.stringify(req.body, null, 2)
  );

  try {
    // Parse both Tuma callback formats and Safaricom fallbacks
    let isSuccess = false;
    let amountPaid = 0;
    let receiptNumber = "";
    let invoiceId = "";
    let checkoutId = "";

    const {
      Body,
      status,
      statusId,
      partnerUniqueId,
      paymentKey,
      transactionId,
      id,
      amount,
    } = req.body;

    if (Body && Body.stkCallback) {
      // Direct Safaricom layout fallback
      const { CheckoutRequestID, ResultCode, CallbackMetadata } =
        Body.stkCallback;
      if (ResultCode === 0) {
        isSuccess = true;
        checkoutId = CheckoutRequestID;
        invoiceId = CheckoutRequestID; // default reference
        if (CallbackMetadata && CallbackMetadata.Item) {
          CallbackMetadata.Item.forEach((item) => {
            if (item.Name === "Amount") amountPaid = item.Value;
            if (item.Name === "MpesaReceiptNumber") receiptNumber = item.Value;
          });
        }
      }
    } else {
      // Tuma Pay layout
      const statusVal = (status || statusId || "").toLowerCase();
      if (
        statusVal === "success" ||
        statusVal === "completed" ||
        statusVal === "approved" ||
        req.body.ResultCode === 0
      ) {
        isSuccess = true;
      }
      invoiceId = partnerUniqueId || id;
      checkoutId = partnerUniqueId || id;
      receiptNumber =
        paymentKey ||
        transactionId ||
        id ||
        "TUMA_TX_" + Math.floor(100000 + Math.random() * 900000);
      amountPaid = amount || 0;
    }

    if (isSuccess) {
      console.log(
        `Tuma Pay Settlement Verified: Receipt ${receiptNumber} | Amount: KES ${amountPaid} | Ref: ${invoiceId}`
      );

      // Update database status of the corresponding invoice
      if (isRealSupabase) {
        // Find matching invoice by either id or checkout_id
        const { data: invoices, error: fetchError } = await supabaseClient
          .from("invoices")
          .select("id")
          .or(`id.eq.${invoiceId},checkout_id.eq.${checkoutId}`);

        if (fetchError) {
          console.error("Supabase invoice fetch failed:", fetchError.message);
        } else if (invoices && invoices.length > 0) {
          const targetInvoiceId = invoices[0].id;

          // 1. Update invoice to paid
          const { error } = await supabaseClient
            .from("invoices")
            .update({
              status: "paid",
              amount_paid: amountPaid,
              payment_method: "tuma",
              receipt_number: receiptNumber,
            })
            .eq("id", targetInvoiceId);

          if (error) {
            console.error("Supabase invoice update failed:", error.message);
          }

          // 2. Log transaction
          await supabaseClient.from("audit_logs").insert({
            id: "log_" + Math.random().toString(36).substring(2, 12),
            action: "TUMA_PAYMENT_RECEIVED",
            details: `Tuma Pay payment confirmed. Receipt: ${receiptNumber}, Amount: ${amountPaid}, Invoice ID: ${targetInvoiceId}.`,
            created_at: new Date().toISOString(),
          });
        } else {
          console.warn(`No invoice found matching id=${invoiceId} or checkout_id=${checkoutId}`);
        }
      } else {
        // Local sandbox db updates
        const data = loadSandboxDB();
        const txn = data.invoices.find(
          (inv) => inv.id === invoiceId || inv.checkout_id === checkoutId,
        );
        if (txn) {
          txn.status = "paid";
          txn.receipt_number = receiptNumber;
          txn.amount_paid = amountPaid;

          // Also insert audit trail logs
          data.audit_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 12),
            action: "TUMA_PAYMENT_RECEIVED",
            details: `Tuma Pay payment confirmed. Receipt: ${receiptNumber}, Amount: ${amountPaid}, Invoice: ${invoiceId}.`,
            created_at: new Date().toISOString(),
          });
          saveSandboxDB(data);
        }
      }
    } else {
      console.warn("Tuma Pay Transaction Callback failed or was cancelled.");
    }

    res.json({ ResultCode: 0, ResultDescription: "Success" });
  } catch (err) {
    console.error("Tuma Webhook Callback processing failed:", err);
    res
      .status(500)
      .json({
        ResultCode: 1,
        ResultDescription: err.message || "Callback error",
      });
  }
});

// Sandbox Simulator Endpoint to trigger simulated payment success
router.post("/simulate-success", async (req, res) => {
  const { CheckoutRequestID } = req.body;
  if (!CheckoutRequestID) {
    return res.status(400).json({ error: "CheckoutRequestID is required" });
  }

  const PORT = process.env.PORT || 5000;
  console.log(
    "Simulating successful Tuma Pay payment callback for invoice reference:",
    CheckoutRequestID
  );

  const mockPayload = {
    status: "success",
    partnerUniqueId: CheckoutRequestID,
    paymentKey: "TUMA_TX_" + Math.floor(100000 + Math.random() * 900000),
    amount: 1.0,
  };

  try {
    const callbackResponse = await axios.post(
      `http://localhost:${PORT}/api/mpesa/callback`,
      mockPayload
    );
    res.json({ success: true, callbackResponse: callbackResponse.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
