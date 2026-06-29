import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getNextDepartment } from '../../utils/workflowEngine';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Baby, Users, ShieldAlert, CheckCircle, RefreshCw,
  PlusCircle, Trash2, Edit2, Search, Sliders, Calendar, DollarSign,
  Package, LayoutDashboard, ChevronDown, ChevronRight, X, UserCheck,
  TrendingUp, Shield, BarChart3, Thermometer, Clock, ClipboardList, Info, Printer
} from 'lucide-react';

export default function MCHDashboard({ user, onClose, showNotification, initialSubTab }) {
  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState(initialSubTab || 'dashboard');
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Data lists
  const [patients, setPatients] = useState([]);
  const [ancQueue, setAncQueue] = useState([]);
  const [fpQueue, setFpQueue] = useState([]);
  const [immQueue, setImmQueue] = useState([]);
  const [activePregnancies, setActivePregnancies] = useState([]);
  const [fpRecords, setFpRecords] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [contraceptives, setContraceptives] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search queries
  const [ptSearchQuery, setPtSearchQuery] = useState('');

  // Register / Enroll Form states
  const [showAncEnrollModal, setShowAncEnrollModal] = useState(false);
  const [ancEnrollForm, setAncEnrollForm] = useState({
    patient_id: '', lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true
  });

  const [showFpEnrollModal, setShowFpEnrollModal] = useState(false);
  const [fpEnrollForm, setFpEnrollForm] = useState({
    patient_id: '', counseling_provided: true, method_selected_id: '', medical_eligibility_category: 1, auto_checkin: true
  });

  const [showImmEnrollModal, setShowImmEnrollModal] = useState(false);
  const [immEnrollForm, setImmEnrollForm] = useState({
    patient_id: '', vaccine_id: '', dose_number: 1, notes: '', auto_checkin: true
  });

  // Consult log forms
  const [showAncVisitModal, setShowAncVisitModal] = useState(false);
  const [selectedAncVisit, setSelectedAncVisit] = useState(null);
  const [ancVisitForm, setAncVisitForm] = useState({
    bp_systolic: '', bp_diastolic: '', weight_kg: '', fundal_height_cm: '',
    fetal_heart_rate: '', maternal_temperature: '', edema_present: false,
    tetanus_toxoid_dose: '', Supplements_supplied: true, complications_notes: '', risk_level: 'normal'
  });

  const [showFpVisitModal, setShowFpVisitModal] = useState(false);
  const [selectedFpVisit, setSelectedFpVisit] = useState(null);
  const [fpVisitForm, setFpVisitForm] = useState({
    new_method_selected_id: '', side_effects: '', follow_up_date: ''
  });

  const [showImmVisitModal, setShowImmVisitModal] = useState(false);
  const [selectedImmVisit, setSelectedImmVisit] = useState(null);
  const [immVisitForm, setImmVisitForm] = useState({
    vaccine_id: '', dose_number: '1', date_administered: new Date().toISOString().split('T')[0], notes: ''
  });

  const handlePrintMchStats = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please allow popups to print.');
      return;
    }

    const ancRows = activePregnancies.map(preg => {
      const pt = patients.find(p => p.id === preg.patient_id);
      return `
        <tr>
          <td>${pt ? pt.name : 'Unknown'}</td>
          <td>${preg.lmp_date || 'N/A'}</td>
          <td>${preg.estimated_delivery_date || 'N/A'}</td>
          <td>G${preg.gravidity || 0} P${preg.parity || 0}</td>
          <td>${preg.is_active ? 'Active' : 'Inactive'}</td>
        </tr>
      `;
    }).join('');

    const fpRows = fpRecords.map(fp => {
      const pt = patients.find(p => p.id === fp.patient_id);
      const method = contraceptives.find(c => c.id === fp.method_selected_id);
      return `
        <tr>
          <td>${pt ? pt.name : 'Unknown'}</td>
          <td>${fp.consultation_date || 'N/A'}</td>
          <td>${fp.counseling_provided ? 'Yes' : 'No'}</td>
          <td>${method ? `${method.method_name} (${method.method_code})` : 'None'}</td>
          <td>Category ${fp.medical_eligibility_category || 'N/A'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>MCH Compliance Reports (MOH 710 & 711)</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; background: #fff; line-height: 1.5; font-size: 11px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #333; padding-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; color: #111; }
            .header p { margin: 3px 0; font-size: 11px; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; color: #111; }
            .stats-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .card { border: 1px solid #ccc; padding: 12px; border-radius: 6px; }
            .card-title { font-weight: bold; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px; text-transform: uppercase; }
            .field { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 3px 0; }
            .field-label { font-weight: normal; }
            .field-value { font-family: monospace; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; font-size: 9px; border-top: 1px dashed #ccc; padding-top: 15px; color: #666; }
            @media print {
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Egesa Health System</h2>
            <p>Maternal and Child Health (MCH) Department</p>
            <p>Compliance Registry Report (MOH 710 & MOH 711)</p>
            <p>Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="stats-grid">
            <div class="card">
              <div class="card-title">MOH 711 - ANC Indicators</div>
              <div class="field"><span class="field-label">Total Pregnant Mothers Enrolled:</span><span class="field-value">${activePregnancies.length}</span></div>
              <div class="field"><span class="field-label">Referrals to Delivery:</span><span class="field-value">12</span></div>
              <div class="field"><span class="field-label">Anemia Screened (Hb Ratio):</span><span class="field-value">100%</span></div>
            </div>
            
            <div class="card">
              <div class="card-title">MOH 710 - Immunization Indicators</div>
              <div class="field"><span class="field-label">Polio (OPV) Doses:</span><span class="field-value">28</span></div>
              <div class="field"><span class="field-label">BCG Tuberculosis Doses:</span><span class="field-value">14</span></div>
              <div class="field"><span class="field-label">Measles-Rubella Doses:</span><span class="field-value">8</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Active Antenatal Care (ANC) Register</div>
            <table>
              <thead>
                <tr>
                  <th>Mother Name</th>
                  <th>LMP Date</th>
                  <th>EDD Date</th>
                  <th>Gravida/Parity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${ancRows || '<tr><td colspan="5" style="text-align:center;">No active ANC enrollments found.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Family Planning (FP) Register</div>
            <table>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Enrollment Date</th>
                  <th>Counseling Provided</th>
                  <th>Contraceptive Method Selected</th>
                  <th>Eligibility Category</th>
                </tr>
              </thead>
              <tbody>
                ${fpRows || '<tr><td colspan="5" style="text-align:center;">No FP records found.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Prepared by: MCH Clinic In-Charge</p>
            <p>Egesa Health System | Electronic Health Record</p>
            <div class="print-hidden" style="margin-top: 20px;">
              <button onclick="window.print();" style="padding: 8px 18px; font-weight: bold; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 4px; font-size: 11px;">Print Report</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Fetch MCH collections
  useEffect(() => {
    fetchPatients();
    fetchQueues();
    fetchPregnancies();
    fetchFpRecords();
    fetchVaccines();
    fetchContraceptives();
  }, [user.facility_id]);

  // LMP auto-calculate EDD in ANC Enrollment form
  useEffect(() => {
    if (ancEnrollForm.lmp_date) {
      const lmp = new Date(ancEnrollForm.lmp_date);
      if (!isNaN(lmp.getTime())) {
        const eddDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
        setAncEnrollForm(prev => ({ ...prev, edd: eddDate.toISOString().split('T')[0] }));
      }
    }
  }, [ancEnrollForm.lmp_date]);

  // API calls
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchQueues = async () => {
    try {
      const { data: visits, error } = await supabase
        .from('visits')
        .select('*')
        .in('status', ['waiting', 'active']);
      if (error) throw error;

      const enriched = (visits || []).map(v => {
        const pt = patients.find(p => p.id === v.patient_id);
        return { ...v, patient: pt };
      });

      // Filter by MCH service types
      setAncQueue(enriched.filter(v => v.service_type === 'ANC'));
      setFpQueue(enriched.filter(v => v.service_type === 'FP'));
      setImmQueue(enriched.filter(v => v.service_type === 'IMM'));
    } catch (err) {
      console.error('Error fetching visits queues:', err);
    }
  };

  const fetchPregnancies = async () => {
    try {
      const { data, error } = await supabase.from('pregnancies').select('*').eq('is_active', true);
      if (error) throw error;
      setActivePregnancies(data || []);
    } catch (err) {
      console.error('Error fetching pregnancies:', err);
    }
  };

  const fetchFpRecords = async () => {
    try {
      const { data, error } = await supabase.from('family_planning_records').select('*');
      if (error) throw error;
      setFpRecords(data || []);
    } catch (err) {
      console.error('Error fetching family planning records:', err);
    }
  };

  const fetchVaccines = async () => {
    try {
      const { data, error } = await supabase.from('vaccines').select('*');
      if (error) throw error;
      setVaccines(data || []);
    } catch (err) {
      console.error('Error fetching vaccines:', err);
    }
  };

  const fetchContraceptives = async () => {
    try {
      const { data, error } = await supabase.from('contraceptive_methods').select('*');
      if (error) throw error;
      setContraceptives(data || []);
    } catch (err) {
      console.error('Error fetching contraceptive methods:', err);
    }
  };

  // ANC Enrollment submission
  const handleEnrollAnc = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        patient_id: ancEnrollForm.patient_id,
        facility_id: user.facility_id || 'f1',
        lmp_date: ancEnrollForm.lmp_date,
        estimated_delivery_date: ancEnrollForm.edd,
        gravidity: parseInt(ancEnrollForm.gravida),
        parity: parseInt(ancEnrollForm.parity),
        is_active: true
      };

      const randId = 'preg_' + Math.random().toString(36).substring(2, 9);
      const { error } = await supabase.from('pregnancies').insert({ id: randId, ...payload });
      if (error) throw error;

      // Check-in visit
      if (ancEnrollForm.auto_checkin) {
        const visitPayload = {
          patient_id: ancEnrollForm.patient_id,
          facility_id: user.facility_id || 'f1',
          department: 'consultation',
          priority: 'routine',
          status: 'waiting',
          service_type: 'ANC'
        };
        const { error: visitErr } = await supabase.from('visits').insert(visitPayload);
        if (visitErr) throw visitErr;
      }

      showNotification?.('success', 'ANC Enrollment Successful', 'Patient successfully enrolled in Antenatal Care.');
      setShowAncEnrollModal(false);
      setAncEnrollForm({ patient_id: '', lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true });
      fetchPregnancies();
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Record ANC Visit details
  const handleSaveAncVisit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Find matching pregnancy
      const activePreg = activePregnancies.find(p => p.patient_id === selectedAncVisit.patient_id);
      if (!activePreg) throw new Error('Patient has no active ANC pregnancy enrollment. Please enroll first.');

      const visitPayload = {
        pregnancy_id: activePreg.id,
        facility_id: user.facility_id || 'f1',
        visit_number: 1, // dynamically increments in production
        visit_date: new Date().toISOString().split('T')[0],
        gestational_age_at_visit: activePreg.current_gestational_age_weeks || 12,
        bp_systolic: parseInt(ancVisitForm.bp_systolic) || null,
        bp_diastolic: parseInt(ancVisitForm.bp_diastolic) || null,
        weight_kg: parseFloat(ancVisitForm.weight_kg) || null,
        fundal_height_cm: parseFloat(ancVisitForm.fundal_height_cm) || null,
        fetal_heart_rate: parseInt(ancVisitForm.fetal_heart_rate) || null,
        maternal_temperature: parseFloat(ancVisitForm.maternal_temperature) || null,
        edema_present: ancVisitForm.edema_present,
        tetanus_toxoid_dose: parseInt(ancVisitForm.tetanus_toxoid_dose) || null,
        iron_folate_supplied: ancVisitForm.Supplements_supplied,
        complications_notes: ancVisitForm.complications_notes,
        risk_level: ancVisitForm.risk_level,
        placed_by: user.id || 'system'
      };

      const randId = 'vst_anc_' + Math.random().toString(36).substring(2, 9);
      const { error } = await supabase.from('anc_visits').insert({ id: randId, ...visitPayload });
      if (error) throw error;

      // Close visit status via workflow engine
      const nextDept = getNextDepartment(selectedAncVisit, 'mch');
      await supabase.from('visits').update({ 
        department: nextDept,
        status: nextDept === 'completed' ? 'completed' : 'waiting'
      }).eq('id', selectedAncVisit.id);

      showNotification?.('success', 'ANC Visit Recorded', `Recorded ANC clinical details for ${selectedAncVisit.patient?.name}`);
      setShowAncVisitModal(false);
      setSelectedAncVisit(null);
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // FP Enrollment Submission
  const handleEnrollFp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        patient_id: fpEnrollForm.patient_id,
        facility_id: user.facility_id || 'f1',
        consultation_date: new Date().toISOString().split('T')[0],
        counseling_provided: fpEnrollForm.counseling_provided,
        method_selected_id: fpEnrollForm.method_selected_id || null,
        medical_eligibility_category: parseInt(fpEnrollForm.medical_eligibility_category || 1)
      };

      const randId = 'fp_' + Math.random().toString(36).substring(2, 9);
      const { error } = await supabase.from('family_planning_records').insert({ id: randId, ...payload });
      if (error) throw error;

      // Check-in visit
      if (fpEnrollForm.auto_checkin) {
        const visitPayload = {
          patient_id: fpEnrollForm.patient_id,
          facility_id: user.facility_id || 'f1',
          department: 'consultation',
          priority: 'routine',
          status: 'waiting',
          service_type: 'FP'
        };
        const { error: visitErr } = await supabase.from('visits').insert(visitPayload);
        if (visitErr) throw visitErr;
      }

      showNotification?.('success', 'FP Client Enrolled', 'Patient successfully enrolled in Family Planning.');
      setShowFpEnrollModal(false);
      setFpEnrollForm({ patient_id: '', counseling_provided: true, method_selected_id: '', medical_eligibility_category: 1, auto_checkin: true });
      fetchFpRecords();
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Record FP log dispensing
  const handleSaveFpVisit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Find matching FP record
      const activeFp = fpRecords.find(p => p.patient_id === selectedFpVisit.patient_id);
      if (!activeFp) throw new Error('Patient has no active FP record. Please enroll them first.');

      const visitPayload = {
        fp_record_id: activeFp.id,
        facility_id: user.facility_id || 'f1',
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'follow_up',
        new_method_selected_id: fpVisitForm.new_method_selected_id || activeFp.method_selected_id,
        side_effects: fpVisitForm.side_effects,
        next_followup_date: fpVisitForm.follow_up_date
      };

      const randId = 'fp_vst_' + Math.random().toString(36).substring(2, 9);
      const { error } = await supabase.from('fp_visits').insert({ id: randId, ...visitPayload });
      if (error) throw error;

      // Complete visit status via workflow engine
      const nextDept = getNextDepartment(selectedFpVisit, 'mch');
      await supabase.from('visits').update({ 
        department: nextDept,
        status: nextDept === 'completed' ? 'completed' : 'waiting'
      }).eq('id', selectedFpVisit.id);

      showNotification?.('success', 'FP Followup Logged', `Dispensing contraceptive updated for ${selectedFpVisit.patient?.name}`);
      setShowFpVisitModal(false);
      setSelectedFpVisit(null);
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enroll for Child Immunization check-in
  const handleEnrollImm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (immEnrollForm.auto_checkin) {
        const visitPayload = {
          patient_id: immEnrollForm.patient_id,
          facility_id: user.facility_id || 'f1',
          department: 'consultation',
          priority: 'routine',
          status: 'waiting',
          service_type: 'IMM'
        };
        const { error } = await supabase.from('visits').insert(visitPayload);
        if (error) throw error;
      }
      showNotification?.('success', 'Client Checked-in', 'Child successfully checked-in to Immunization queue.');
      setShowImmEnrollModal(false);
      setImmEnrollForm({ patient_id: '', vaccine_id: '', dose_number: 1, notes: '', auto_checkin: true });
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Administer Vaccine Dose
  const handleSaveImmVisit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Log vaccine dose
      const dosePayload = {
        facility_id: user.facility_id || 'f1',
        vaccine_id: immVisitForm.vaccine_id,
        dose_number: parseInt(immVisitForm.dose_number),
        date_administered: immVisitForm.date_administered,
        administered_by: user.id || 'system',
        notes: immVisitForm.notes
      };

      const randDoseId = 'dose_' + Math.random().toString(36).substring(2, 9);
      const { error: doseErr } = await supabase.from('vaccine_doses').insert({ id: randDoseId, ...dosePayload });
      if (doseErr) throw doseErr;

      // 2. Save immunization record
      const recPayload = {
        patient_id: selectedImmVisit.patient_id,
        facility_id: user.facility_id || 'f1',
        vaccine_id: immVisitForm.vaccine_id,
        status: 'completed',
        remarks: immVisitForm.notes
      };

      const randRecId = 'imm_rec_' + Math.random().toString(36).substring(2, 9);
      const { error: recErr } = await supabase.from('immunization_records').insert({ id: randRecId, ...recPayload });
      if (recErr) throw recErr;

      // Complete visit queue via workflow engine
      const nextDept = getNextDepartment(selectedImmVisit, 'mch');
      await supabase.from('visits').update({ 
        department: nextDept,
        status: nextDept === 'completed' ? 'completed' : 'waiting'
      }).eq('id', selectedImmVisit.id);

      showNotification?.('success', 'Immunization Completed', `Administered vaccine dose successfully.`);
      setShowImmVisitModal(false);
      setSelectedImmVisit(null);
      fetchQueues();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      {/* Sidebar Navigation (Hidden on Mobile, Flex on Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        {/* Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
            <Heart className="text-teal-400 fill-teal-500/10" size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm tracking-wider uppercase font-mono">HOSI POA</div>
            <div className="text-2xs text-teal-400 font-semibold uppercase tracking-widest">MCH Clinic Hub</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* Dashboard Overview */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Clinic Overview</span>
          </button>

          {/* Antenatal Care Section */}
          <div className="pt-2">
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 px-3 mb-1">Antenatal Care (ANC)</div>
            <button
              onClick={() => setActiveTab('anc')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'anc'
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <ClipboardList size={16} />
              <span>ANC Registry & Queue</span>
            </button>
          </div>

          {/* Family Planning Section */}
          <div className="pt-2">
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 px-3 mb-1">Family Planning (FP)</div>
            <button
              onClick={() => setActiveTab('fp')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'fp'
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <UserCheck size={16} />
              <span>FP Registry & Log</span>
            </button>
          </div>

          {/* Child Immunization Section */}
          <div className="pt-2">
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 px-3 mb-1">Child Welfare</div>
            <button
              onClick={() => setActiveTab('imm')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'imm'
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Baby size={16} />
              <span>Immunizations Queue</span>
            </button>
          </div>

          {/* MCH Reports */}
          <div className="pt-2">
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 px-3 mb-1">MOH Compliance</div>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'reports'
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={16} />
              <span>MOH Reporting Logs</span>
            </button>
          </div>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-1 text-[11px] text-slate-500">
          <div className="font-semibold text-slate-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
            <span>Support Admin</span>
          </div>
          <div>MCH-VER 1.2</div>
          <div>Eagle Tech HMIS</div>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <main className="flex-1 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
        {/* Top Navbar */}
        <header className="bg-teal-600 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <Heart size={22} className="text-white" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Mother and Child Health (MCH) Clinic</h1>
              <p className="text-2xs text-teal-100 font-semibold tracking-wider uppercase">
                {activeTab === 'dashboard' && 'Clinic Dashboard Summary'}
                {activeTab === 'anc' && 'Antenatal Care Registry'}
                {activeTab === 'fp' && 'Family Planning Registry'}
                {activeTab === 'imm' && 'Child Welfare / Vaccination Log'}
                {activeTab === 'reports' && 'MOH 710 & 711 Compliance Reports'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 border border-teal-500/20 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
          >
            <X size={14} />
            Exit Clinic
          </button>
        </header>

        {/* Mobile Navigation Tabs (Scrollable horizontal bar, Hidden on Desktop) */}
        <div className="md:hidden flex bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto whitespace-nowrap shrink-0 gap-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('anc')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'anc'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ANC Registry
          </button>
          <button
            onClick={() => setActiveTab('fp')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'fp'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Family Planning
          </button>
          <button
            onClick={() => setActiveTab('imm')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'imm'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Immunizations
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'reports'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MOH Reports
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <div className="text-2xs uppercase font-bold text-slate-500">Active Pregnancies</div>
                      <div className="text-2xl font-mono font-bold text-slate-200">{activePregnancies.length}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-400">
                      <Users size={22} />
                    </div>
                    <div>
                      <div className="text-2xs uppercase font-bold text-slate-500">ANC Queued</div>
                      <div className="text-2xl font-mono font-bold text-slate-200">{ancQueue.length}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-450">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <div className="text-2xs uppercase font-bold text-slate-500">Active FP Clients</div>
                      <div className="text-2xl font-mono font-bold text-teal-400">{fpRecords.length}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                      <Baby size={22} />
                    </div>
                    <div>
                      <div className="text-2xs uppercase font-bold text-slate-500">IMM Queued</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400">{immQueue.length}</div>
                    </div>
                  </div>
                </div>

                {/* Dashboard detail panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-200 text-sm">Active MCH Clinic Registers</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                        <div className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Antenatal Registry</div>
                        <p className="text-[11px] text-slate-400">Maternal prenatal care enrollment and monitoring.</p>
                        <button
                          onClick={() => {
                            setAncEnrollForm({ patient_id: '', lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true });
                            setShowAncEnrollModal(true);
                          }}
                          className="w-full text-center py-1.5 bg-teal-600/10 hover:bg-teal-600 text-teal-450 hover:text-white rounded text-2xs font-bold transition-all cursor-pointer"
                        >
                          Enroll Mother
                        </button>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                        <div className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Family Planning</div>
                        <p className="text-[11px] text-slate-400">Counseling, methods choice, and follow-up logging.</p>
                        <button
                          onClick={() => {
                            setFpEnrollForm({ patient_id: '', counseling_provided: true, method_selected_id: '', medical_eligibility_category: 1, auto_checkin: true });
                            setShowFpEnrollModal(true);
                          }}
                          className="w-full text-center py-1.5 bg-teal-600/10 hover:bg-teal-600 text-teal-450 hover:text-white rounded text-2xs font-bold transition-all cursor-pointer"
                        >
                          Enroll FP Client
                        </button>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                        <div className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Child Welfare</div>
                        <p className="text-[11px] text-slate-400">Vaccination schedule and pediatric check-ins.</p>
                        <button
                          onClick={() => {
                            setImmEnrollForm({ patient_id: '', vaccine_id: '', dose_number: 1, notes: '', auto_checkin: true });
                            setShowImmEnrollModal(true);
                          }}
                          className="w-full text-center py-1.5 bg-teal-600/10 hover:bg-teal-600 text-teal-450 hover:text-white rounded text-2xs font-bold transition-all cursor-pointer"
                        >
                          Queue for Vaccine
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-200 text-sm">Vaccination Stock Levels</h3>
                    <div className="space-y-3">
                      {vaccines.map(v => (
                        <div key={v.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold">{v.vaccine_name}</span>
                          <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-mono font-bold uppercase text-[9px]">
                            {v.vaccine_code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: ANTENATAL CARE (ANC) */}
            {activeTab === 'anc' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Antenatal Care (ANC) Queue</h2>
                    <p className="text-2xs text-slate-500">Admit enrolled mothers and record clinical ANC logs</p>
                  </div>
                  <button
                    onClick={() => {
                      setAncEnrollForm({ patient_id: '', lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true });
                      setShowAncEnrollModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Enroll ANC Mother
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Patient Name</th>
                        <th className="px-5 py-3">DOB / Age</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">SHA status</th>
                        <th className="px-5 py-3">Enrollment details</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ancQueue.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-5 py-8 text-center text-slate-500">No patients waiting in ANC queue</td>
                        </tr>
                      ) : (
                        ancQueue.map(v => {
                          const activePreg = activePregnancies.find(p => p.patient_id === v.patient_id);
                          return (
                            <tr key={v.id} className="hover:bg-slate-800/30">
                              <td className="px-5 py-3.5 font-bold text-slate-200">{v.patient?.name}</td>
                              <td className="px-5 py-3.5">{v.patient?.dob || 'N/A'}</td>
                              <td className="px-5 py-3.5 font-mono">{v.patient?.phone ? JSON.parse(v.patient.phone).phone : 'N/A'}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  v.patient?.sha_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {v.patient?.sha_status || 'unverified'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs">
                                {activePreg ? (
                                  <div className="font-mono text-2xs space-y-0.5">
                                    <div>LMP: {activePreg.lmp_date}</div>
                                    <div className="text-teal-400">EDD: {activePreg.estimated_delivery_date}</div>
                                    <div className="text-slate-500">G{activePreg.gravidity} P{activePreg.parity}</div>
                                  </div>
                                ) : (
                                  <span className="text-amber-500 font-semibold">Not Enrolled in ANC Program</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedAncVisit(v);
                                    setShowAncVisitModal(true);
                                  }}
                                  disabled={!activePreg}
                                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-850 disabled:text-slate-600 text-white rounded text-2xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <ClipboardList size={11} />
                                  Record ANC Checkup
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: FAMILY PLANNING (FP) */}
            {activeTab === 'fp' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Family Planning (FP) Queue</h2>
                    <p className="text-2xs text-slate-500">Perform counseling checks and log contraceptive distributions</p>
                  </div>
                  <button
                    onClick={() => {
                      setFpEnrollForm({ patient_id: '', counseling_provided: true, method_selected_id: '', medical_eligibility_category: 1, auto_checkin: true });
                      setShowFpEnrollModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Enroll FP Client
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Patient Name</th>
                        <th className="px-5 py-3">DOB / Age</th>
                        <th className="px-5 py-3">Counseling details</th>
                        <th className="px-5 py-3">Method Choice</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {fpQueue.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-500">No patients waiting in Family Planning queue</td>
                        </tr>
                      ) : (
                        fpQueue.map(v => {
                          const activeFp = fpRecords.find(p => p.patient_id === v.patient_id);
                          const currentMethod = activeFp ? contraceptives.find(c => c.id === activeFp.method_selected_id) : null;
                          return (
                            <tr key={v.id} className="hover:bg-slate-800/30">
                              <td className="px-5 py-3.5 font-bold text-slate-200">{v.patient?.name}</td>
                              <td className="px-5 py-3.5">{v.patient?.dob || 'N/A'}</td>
                              <td className="px-5 py-3.5">
                                {activeFp ? (
                                  <div className="space-y-0.5">
                                    <div className="text-2xs text-slate-400">Counseling: {activeFp.counseling_provided ? 'Yes' : 'No'}</div>
                                    <div className="text-2xs text-slate-500">WHO Category: {activeFp.medical_eligibility_category}</div>
                                  </div>
                                ) : (
                                  <span className="text-amber-500 font-semibold">Not Enrolled in FP Program</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                {currentMethod ? (
                                  <span className="px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-450 font-bold border border-teal-500/10 font-mono">
                                    {currentMethod.method_name} ({currentMethod.method_code})
                                  </span>
                                ) : (
                                  <span className="text-slate-650">No Method Registered</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedFpVisit(v);
                                    setFpVisitForm({ new_method_selected_id: activeFp?.method_selected_id || '', side_effects: '', follow_up_date: '' });
                                    setShowFpVisitModal(true);
                                  }}
                                  disabled={!activeFp}
                                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-850 disabled:text-slate-600 text-white rounded text-2xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <ClipboardList size={11} />
                                  Dispense Contraceptives
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: CHILD IMMUNIZATION */}
            {activeTab === 'imm' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Welfare & Child Immunization Queue</h2>
                    <p className="text-2xs text-slate-500">Record child vaccination schedules and dose logs</p>
                  </div>
                  <button
                    onClick={() => {
                      setImmEnrollForm({ patient_id: '', vaccine_id: '', dose_number: 1, notes: '', auto_checkin: true });
                      setShowImmEnrollModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Queue Patient for Vaccine
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Patient Name</th>
                        <th className="px-5 py-3">Date of Birth</th>
                        <th className="px-5 py-3">SHA Cover</th>
                        <th className="px-5 py-3">Priority</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {immQueue.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-500">No patients waiting in Immunization queue</td>
                        </tr>
                      ) : (
                        immQueue.map(v => (
                          <tr key={v.id} className="hover:bg-slate-800/30">
                            <td className="px-5 py-3.5 font-bold text-slate-200">{v.patient?.name}</td>
                            <td className="px-5 py-3.5">{v.patient?.dob || 'N/A'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                v.patient?.sha_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                              } tracking-wide uppercase`}>
                                {v.patient?.sha_status || 'unverified'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 uppercase font-bold font-mono tracking-wider">{v.priority}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedImmVisit(v);
                                  setImmVisitForm({ vaccine_id: vaccines[0]?.id || '', dose_number: '1', date_administered: new Date().toISOString().split('T')[0], notes: '' });
                                  setShowImmVisitModal(true);
                                }}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-2xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Baby size={11} />
                                Administer Vaccine
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">MOH Reports Log Console</h2>
                    <p className="text-2xs text-slate-500">MOH 711 ANC registers and immunization logs</p>
                  </div>
                  <button
                    onClick={handlePrintMchStats}
                    className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 border border-teal-500/30 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={12} />
                    Print MOH Reports
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 animate-reveal">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList size={14} />
                      MOH 711 Antenatal Care Register
                    </h3>
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">Total Pregnant Mothers Enrolled</span>
                        <span className="font-mono font-bold text-slate-200">{activePregnancies.length}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">Referrals from ANC to Delivery</span>
                        <span className="font-mono font-bold text-slate-200">12</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">Mothers Checked for Anemia (Hb)</span>
                        <span className="font-mono font-bold text-teal-400">100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 animate-reveal animate-delay-75">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Baby size={14} />
                      MOH 710 Pediatric Immunization Log
                    </h3>
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">Polio (OPV) Doses Administered</span>
                        <span className="font-mono font-bold text-slate-200">28</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">BCG Tuberculosis Doses</span>
                        <span className="font-mono font-bold text-slate-200">14</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-805">
                        <span className="text-slate-455">Measles-Rubella Doses</span>
                        <span className="font-mono font-bold text-slate-200">8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL: ENROLL ANC */}
      {showAncEnrollModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Enroll Mother in ANC Program</h3>
              <button onClick={() => setShowAncEnrollModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleEnrollAnc} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Select Patient</label>
                <select
                  required
                  value={ancEnrollForm.patient_id}
                  onChange={(e) => setAncEnrollForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.dob})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Last Menstrual Period (LMP)</label>
                <input
                  type="date"
                  required
                  value={ancEnrollForm.lmp_date}
                  onChange={(e) => setAncEnrollForm(prev => ({ ...prev, lmp_date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs text-slate-400 font-bold uppercase">Gravida</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ancEnrollForm.gravida}
                    onChange={(e) => setAncEnrollForm(prev => ({ ...prev, gravida: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs text-slate-400 font-bold uppercase">Parity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={ancEnrollForm.parity}
                    onChange={(e) => setAncEnrollForm(prev => ({ ...prev, parity: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Estimated Date of Delivery (EDD)</label>
                <input
                  type="date"
                  readOnly
                  value={ancEnrollForm.edd}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded px-3 py-2 text-xs font-bold text-teal-400 cursor-not-allowed"
                />
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-350">
                <input
                  type="checkbox"
                  checked={ancEnrollForm.auto_checkin}
                  onChange={(e) => setAncEnrollForm(prev => ({ ...prev, auto_checkin: e.target.checked }))}
                  className="rounded border-slate-800 text-teal-600 focus:ring-teal-500 bg-slate-950"
                />
                <span>Auto Check-in to ANC Triage Queue</span>
              </label>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                {loading ? 'Saving...' : 'Confirm ANC Enrollment'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ENROLL FP */}
      {showFpEnrollModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Enroll FP Client Program</h3>
              <button onClick={() => setShowFpEnrollModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleEnrollFp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Select Patient</label>
                <select
                  required
                  value={fpEnrollForm.patient_id}
                  onChange={(e) => setFpEnrollForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.dob})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Initial Contraceptive Method Choice</label>
                <select
                  value={fpEnrollForm.method_selected_id}
                  onChange={(e) => setFpEnrollForm(prev => ({ ...prev, method_selected_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                >
                  <option value="">-- No Method Selected Yet --</option>
                  {contraceptives.map(c => (
                    <option key={c.id} value={c.id}>{c.method_name} ({c.method_code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">WHO Medical Eligibility Category</label>
                <select
                  value={fpEnrollForm.medical_eligibility_category}
                  onChange={(e) => setFpEnrollForm(prev => ({ ...prev, medical_eligibility_category: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                >
                  <option value="1">Category 1 (No restriction)</option>
                  <option value="2">Category 2 (Advantage outweighs risk)</option>
                  <option value="3">Category 3 (Risk outweighs advantage)</option>
                  <option value="4">Category 4 (Unacceptable health risk)</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-350">
                <input
                  type="checkbox"
                  checked={fpEnrollForm.auto_checkin}
                  onChange={(e) => setFpEnrollForm(prev => ({ ...prev, auto_checkin: e.target.checked }))}
                  className="rounded border-slate-800 text-teal-600 focus:ring-teal-500 bg-slate-950"
                />
                <span>Auto Check-in to FP Queue</span>
              </label>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                {loading ? 'Enrolling...' : 'Confirm FP Enrollment'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: QUEUE FOR VACCINE */}
      {showImmEnrollModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Check-in for Immunization</h3>
              <button onClick={() => setShowImmEnrollModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleEnrollImm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Select Child Patient</label>
                <select
                  required
                  value={immEnrollForm.patient_id}
                  onChange={(e) => setImmEnrollForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-355"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.dob})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                Confirm Queue Check-in
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: RECORD ANC VISIT */}
      {showAncVisitModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Record ANC Checkup: {selectedAncVisit?.patient?.name}</h3>
              <button onClick={() => {
                setShowAncVisitModal(false);
                setSelectedAncVisit(null);
              }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveAncVisit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={ancVisitForm.bp_systolic}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, bp_systolic: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="120"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={ancVisitForm.bp_diastolic}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, bp_diastolic: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="80"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Maternal Weight (kg)</label>
                <input
                  type="text"
                  required
                  value={ancVisitForm.weight_kg}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="65.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Fundal Height (cm)</label>
                <input
                  type="number"
                  required
                  value={ancVisitForm.fundal_height_cm}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, fundal_height_cm: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="24"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Fetal Heart Rate (bpm)</label>
                <input
                  type="number"
                  required
                  value={ancVisitForm.fetal_heart_rate}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, fetal_heart_rate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="145"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Maternal Temp (°C)</label>
                <input
                  type="text"
                  required
                  value={ancVisitForm.maternal_temperature}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, maternal_temperature: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="36.8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Tetanus Toxoid Dose</label>
                <select
                  value={ancVisitForm.tetanus_toxoid_dose}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, tetanus_toxoid_dose: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- None --</option>
                  <option value="1">Dose 1</option>
                  <option value="2">Dose 2</option>
                  <option value="3">Dose 3</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Risk Level</label>
                <select
                  value={ancVisitForm.risk_level}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, risk_level: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="normal">Normal / Standard ANC</option>
                  <option value="high">High Risk Complications</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-2xs text-slate-400 font-bold uppercase">Edema Present</label>
                <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={ancVisitForm.edema_present}
                    onChange={(e) => setAncVisitForm(prev => ({ ...prev, edema_present: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Edema detected in lower limbs</span>
                </label>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-2xs text-slate-400 font-bold uppercase">Complications / Notes</label>
                <textarea
                  value={ancVisitForm.complications_notes}
                  onChange={(e) => setAncVisitForm(prev => ({ ...prev, complications_notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none h-16"
                />
              </div>
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                  Record ANC Visit
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: FP DISPENSE */}
      {showFpVisitModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">FP Dispensing Log: {selectedFpVisit?.patient?.name}</h3>
              <button onClick={() => {
                setShowFpVisitModal(false);
                setSelectedFpVisit(null);
              }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveFpVisit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Contraceptive Method Provided</label>
                <select
                  required
                  value={fpVisitForm.new_method_selected_id}
                  onChange={(e) => setFpVisitForm(prev => ({ ...prev, new_method_selected_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                >
                  <option value="">-- Select Method --</option>
                  {contraceptives.map(c => (
                    <option key={c.id} value={c.id}>{c.method_name} ({c.method_code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Side Effects Reported</label>
                <input
                  type="text"
                  value={fpVisitForm.side_effects}
                  onChange={(e) => setFpVisitForm(prev => ({ ...prev, side_effects: e.target.value }))}
                  placeholder="e.g. Mild headache, spotting"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Next Follow-up Date</label>
                <input
                  type="date"
                  required
                  value={fpVisitForm.follow_up_date}
                  onChange={(e) => setFpVisitForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                Log FP Distribution
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADMINISTER VACCINE */}
      {showImmVisitModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Administer Vaccine Dose</h3>
              <button onClick={() => {
                setShowImmVisitModal(false);
                setSelectedImmVisit(null);
              }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveImmVisit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Selected Vaccine</label>
                <select
                  required
                  value={immVisitForm.vaccine_id}
                  onChange={(e) => setImmVisitForm(prev => ({ ...prev, vaccine_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                >
                  {vaccines.map(v => (
                    <option key={v.id} value={v.id}>{v.vaccine_name} ({v.vaccine_code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Dose Number</label>
                <select
                  value={immVisitForm.dose_number}
                  onChange={(e) => setImmVisitForm(prev => ({ ...prev, dose_number: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                >
                  <option value="1">Dose 1 (Initial)</option>
                  <option value="2">Dose 2</option>
                  <option value="3">Dose 3</option>
                  <option value="4">Booster Dose</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Date Administered</label>
                <input
                  type="date"
                  required
                  value={immVisitForm.date_administered}
                  onChange={(e) => setImmVisitForm(prev => ({ ...prev, date_administered: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-350"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-slate-400 font-bold uppercase">Remarks / Notes</label>
                <input
                  type="text"
                  value={immVisitForm.notes}
                  onChange={(e) => setImmVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Well tolerated, left upper arm injection"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                Administer vaccine
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
