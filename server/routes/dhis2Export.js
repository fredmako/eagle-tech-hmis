const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

// 1. Export MOH 717 Service Workload Data for DHIS2 Integration
router.get('/export-moh717/:facilityId', authenticateToken, async (req, res) => {
  const { facilityId } = req.params;
  const { period } = req.query; // e.g., '202606'

  try {
    const visits = await db.getDocuments('visits', [
      { type: 'equal', column: 'facility_id', value: facilityId }
    ]);

    const opdVisits = visits.filter(v => v.service_type === 'OPD' || !v.service_type);
    const ipdVisits = visits.filter(v => v.service_type === 'IPD');
    const ancVisits = visits.filter(v => v.service_type === 'ANC');
    const fpVisits = visits.filter(v => v.service_type === 'FP');
    const labVisits = visits.filter(v => v.service_type === 'LAB');

    const dhis2DataValueSet = {
      dataSet: 'MOH717_WORKLOAD_REGISTER',
      completeDate: new Date().toISOString().split('T')[0],
      period: period || '202606',
      orgUnit: facilityId,
      dataValues: [
        { dataElement: 'MOH717_OPD_NEW', value: opdVisits.length },
        { dataElement: 'MOH717_IPD_ADMISSIONS', value: ipdVisits.length },
        { dataElement: 'MOH717_ANC_ATTENDANCE', value: ancVisits.length },
        { dataElement: 'MOH717_FP_ATTENDANCE', value: fpVisits.length },
        { dataElement: 'MOH717_LAB_TESTS', value: labVisits.length }
      ]
    };

    res.json({
      success: true,
      facilityId,
      period: period || '202606',
      dhis2Payload: dhis2DataValueSet
    });
  } catch (err) {
    console.error('[DHIS2 Export] MOH 717 Export Error:', err);
    res.status(500).json({ error: 'Failed to generate DHIS2 MOH 717 payload.' });
  }
});

// 2. Export MOH 705 Morbidity Summary Data for DHIS2 Integration
router.get('/export-moh705/:facilityId', authenticateToken, async (req, res) => {
  const { facilityId } = req.params;
  const { type = '705A', period } = req.query; // 705A (Under 5) or 705B (Over 5)

  try {
    const consults = await db.getDocuments('consultations', [
      { type: 'equal', column: 'facility_id', value: facilityId }
    ]);

    const diagnosesCount = {};
    consults.forEach(c => {
      if (c.diagnosis_icd10) {
        diagnosesCount[c.diagnosis_icd10] = (diagnosesCount[c.diagnosis_icd10] || 0) + 1;
      }
    });

    const dataValues = Object.entries(diagnosesCount).map(([diag, count]) => ({
      dataElement: `MOH_${type}_${diag.replace(/\./g, '_')}`,
      value: count
    }));

    const dhis2Payload = {
      dataSet: `MOH${type}_MORBIDITY_SUMMARY`,
      completeDate: new Date().toISOString().split('T')[0],
      period: period || '202606',
      orgUnit: facilityId,
      dataValues
    };

    res.json({
      success: true,
      facilityId,
      reportType: `MOH ${type}`,
      dhis2Payload
    });
  } catch (err) {
    console.error('[DHIS2 Export] MOH 705 Export Error:', err);
    res.status(500).json({ error: `Failed to generate DHIS2 MOH ${type} payload.` });
  }
});

module.exports = router;
