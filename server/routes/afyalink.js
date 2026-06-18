const express = require('express');
const router = express.Router();
const { submitEncounterToAfyaLink } = require('../utils/afyalink');
const { authenticateToken } = require('../middleware/auth');

/**
 * Trigger immediate clinical encounter submission to the AfyaLink HIE.
 * Authenticated endpoint.
 */
router.post('/submit', authenticateToken, async (req, res) => {
  const encounterData = req.body;
  
  if (!encounterData || !encounterData.visit_id || !encounterData.patient_id) {
    return res.status(400).json({ error: 'Missing required encounter identifiers (visit_id, patient_id)' });
  }

  try {
    // Attach user ID and facility context from JWT payload
    const result = await submitEncounterToAfyaLink({
      ...encounterData,
      user_id: req.user.id,
      facility_id: req.user.facility_id,
      facility_name: req.user.facility_name
    });

    res.json({
      success: result.success,
      status: result.status,
      data: result.data || null,
      error: result.error || null,
      mocked: result.mocked || false
    });
  } catch (err) {
    console.error('[AfyaLink Route] Encounter submission failed:', err);
    res.status(500).json({ error: err.message || 'HIE submission process failed' });
  }
});

module.exports = router;
