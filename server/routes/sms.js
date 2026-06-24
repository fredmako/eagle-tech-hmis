const express = require('express');
const router = express.Router();
const { sendSMS } = require('../utils/sms');
const { authenticateToken } = require('../middleware/auth');

/**
 * Trigger sending an SMS to a phone number.
 * Authenticated endpoint.
 */
router.post('/send', authenticateToken, async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Recipient phone number and message are required' });
  }

  try {
    const result = await sendSMS({
      facilityId: req.user.facility_id,
      to,
      message
    });

    res.json(result);
  } catch (err) {
    console.error('[SMS Route] Dispatch failed:', err);
    res.status(500).json({ error: err.message || 'SMS dispatch failed' });
  }
});

module.exports = router;
