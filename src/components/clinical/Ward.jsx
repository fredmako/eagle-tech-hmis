import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { sendNotification, parsePatientContact, sendWhatsAppNotification } from '../../notificationService';
import { Bed, PlusCircle, CheckCircle, AlertCircle, ClipboardList, Thermometer, MapPin, Activity, Heart, Users } from 'lucide-react';

// 1. Hook to ensure clinical check-ins and discharges meet MOH reporting validation criteria
function useMOHReportingValidation() {
  const [validationError, setValidationError] = useState(null);

  const validateVitals = (vitals) => {
    setValidationError(null);
    const { temperature, systolic, diastolic, heart_rate, resp_rate, pain_score, spo2 } = vitals;

    if (temperature) {
      const tempVal = parseFloat(temperature);
      if (isNaN(tempVal) || tempVal < 25.0 || tempVal > 45.0) {
        const msg = "Temperature must be between 25.0°C and 45.0°C.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    let sys = null;
    let dia = null;
    if (systolic) sys = parseInt(systolic, 10);
    if (diastolic) dia = parseInt(diastolic, 10);

    if (sys !== null) {
      if (isNaN(sys) || sys < 50 || sys > 280) {
        const msg = "Systolic blood pressure must be between 50 mmHg and 280 mmHg.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (dia !== null) {
      if (isNaN(dia) || dia < 30 || dia > 180) {
        const msg = "Diastolic blood pressure must be between 30 mmHg and 180 mmHg.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (sys !== null && dia !== null && dia >= sys) {
      const msg = "Diastolic blood pressure must be strictly lower than systolic blood pressure.";
      setValidationError(msg);
      return { isValid: false, error: msg };
    }

    if (heart_rate) {
      const hrVal = parseInt(heart_rate, 10);
      if (isNaN(hrVal) || hrVal < 30 || hrVal > 260) {
        const msg = "Pulse / Heart rate must be between 30 bpm and 260 bpm.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (resp_rate) {
      const rrVal = parseInt(resp_rate, 10);
      if (isNaN(rrVal) || rrVal < 6 || rrVal > 80) {
        const msg = "Respiratory rate must be between 6 and 80 breaths per minute.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (pain_score) {
      const painVal = parseInt(pain_score, 10);
      if (isNaN(painVal) || painVal < 0 || painVal > 10) {
        const msg = "Pain score must be between 0 and 10.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (spo2) {
      const spo2Val = parseInt(spo2, 10);
      if (isNaN(spo2Val) || spo2Val < 10 || spo2Val > 100) {
        const msg = "Oxygen saturation (SPO2) must be between 10% and 100%.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    return { isValid: true, error: null };
  };

  const validateDischarge = (dischargeData, patientAge) => {
    setValidationError(null);
    const { village, temp, weight, systolic, diastolic } = dischargeData;

    if (!village || !village.trim()) {
      const msg = "Patient Village / Residence is required for MOH reporting.";
      setValidationError(msg);
      return { isValid: false, error: msg };
    }

    if (!temp) {
      const msg = "Temperature is required for discharge verification.";
      setValidationError(msg);
      return { isValid: false, error: msg };
    } else {
      const tempVal = parseFloat(temp);
      if (isNaN(tempVal) || tempVal < 25.0 || tempVal > 45.0) {
        const msg = "Discharge temperature must be between 25.0°C and 45.0°C.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (!weight) {
      const msg = "Weight is required for discharge verification.";
      setValidationError(msg);
      return { isValid: false, error: msg };
    } else {
      const weightVal = parseFloat(weight);
      if (isNaN(weightVal) || weightVal < 0.5 || weightVal > 500.0) {
        const msg = "Discharge weight must be between 0.5 kg and 500 kg.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    if (patientAge >= 18) {
      if (!systolic || !diastolic) {
        const msg = "Blood pressure is required for adult discharges.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
      const sysVal = parseInt(systolic, 10);
      const diaVal = parseInt(diastolic, 10);

      if (isNaN(sysVal) || sysVal < 50 || sysVal > 280) {
        const msg = "Discharge systolic blood pressure must be between 50 mmHg and 280 mmHg.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
      if (isNaN(diaVal) || diaVal < 30 || diaVal > 180) {
        const msg = "Discharge diastolic blood pressure must be between 30 mmHg and 180 mmHg.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
      if (diaVal >= sysVal) {
        const msg = "Discharge diastolic blood pressure must be strictly lower than systolic blood pressure.";
        setValidationError(msg);
        return { isValid: false, error: msg };
      }
    }

    return { isValid: true, error: null };
  };

  return { validationError, validateVitals, validateDischarge, setValidationError };
}

// 2. Hook to ensure state persistence and seamless callback redirection exactly to the same inpatient file view
function useStateRedirection(initialAdmission = null) {
  const [selectedAdmission, setSelectedAdmission] = useState(initialAdmission);
  const [customCareDate, setCustomCareDate] = useState(null);

  // Load saved active session state on mount
  useEffect(() => {
    const savedAdmissionId = sessionStorage.getItem('egesa_selected_admission_id_ward');
    const savedCustomDate = sessionStorage.getItem('egesa_custom_care_date_ward');
    if (savedCustomDate) {
      setCustomCareDate(savedCustomDate);
    }
  }, []);

  const changeSelectedAdmission = (admissionOrFunc) => {
    setSelectedAdmission((prev) => {
      const next = typeof admissionOrFunc === 'function' ? admissionOrFunc(prev) : admissionOrFunc;
      if (next) {
        sessionStorage.setItem('egesa_selected_admission_id_ward', next.id);
      } else {
        sessionStorage.removeItem('egesa_selected_admission_id_ward');
        sessionStorage.removeItem('egesa_custom_care_date_ward');
      }
      return next;
    });
  };

  const changeCustomCareDate = (date) => {
    setCustomCareDate(date);
    if (date) {
      sessionStorage.setItem('egesa_custom_care_date_ward', date);
    } else {
      sessionStorage.removeItem('egesa_custom_care_date_ward');
    }
  };

  return {
    selectedAdmission,
    setSelectedAdmission: changeSelectedAdmission,
    customCareDate,
    setCustomCareDate: changeCustomCareDate
  };
}

// 3. Hook to ensure the right styling features and adaptive classes are used under the multi-theme structure
function useThemeClasses() {
  const [theme, setTheme] = useState(() => {
    const activeTheme = localStorage.getItem("egesa_theme") || "teal";
    if (activeTheme === "emerald") return "green";
    if (activeTheme === "slate") return "teal";
    return activeTheme;
  });

  useEffect(() => {
    const checkTheme = () => {
      let activeTheme = localStorage.getItem("egesa_theme") || "teal";
      if (activeTheme === "emerald") activeTheme = "green";
      if (activeTheme === "slate") activeTheme = "teal";
      if (activeTheme !== theme) {
        setTheme(activeTheme);
      }
    };
    const interval = setInterval(checkTheme, 500);
    return () => clearInterval(interval);
  }, [theme]);

  const getThemeColor = (key) => {
    const isGreen = theme === 'green';
    const isBlue = theme === 'blue' || theme === 'navy';
    const isPurple = theme === 'purple';
    const isAmber = theme === 'amber';
    const isTeal = theme === 'teal' || (!isGreen && !isBlue && !isPurple && !isAmber);

    switch (key) {
      case 'primary-text':
        if (isGreen) return 'text-emerald-400';
        if (isBlue) return 'text-blue-400';
        if (isPurple) return 'text-purple-400';
        if (isAmber) return 'text-amber-400';
        return 'text-teal-400';
      case 'primary-bg':
        if (isGreen) return 'bg-emerald-500/10';
        if (isBlue) return 'bg-blue-500/10';
        if (isPurple) return 'bg-purple-500/10';
        if (isAmber) return 'bg-amber-500/10';
        return 'bg-teal-500/10';
      case 'primary-border':
        if (isGreen) return 'border-emerald-500/20';
        if (isBlue) return 'border-blue-500/20';
        if (isPurple) return 'border-purple-500/20';
        if (isAmber) return 'border-amber-500/20';
        return 'border-teal-500/20';
      case 'accent-btn':
        if (isGreen) return 'bg-emerald-500 hover:bg-emerald-600 text-slate-950';
        if (isBlue) return 'bg-blue-500 hover:bg-blue-600 text-slate-950';
        if (isPurple) return 'bg-purple-500 hover:bg-purple-600 text-slate-950';
        if (isAmber) return 'bg-amber-500 hover:bg-amber-600 text-slate-950';
        return 'bg-teal-500 hover:bg-teal-600 text-slate-950';
      case 'compliance-checked':
        if (isGreen) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20';
        if (isBlue) return 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20';
        if (isPurple) return 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20';
        if (isAmber) return 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20';
        return 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20';
      case 'compliance-today':
        if (isGreen) return 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse';
        if (isBlue) return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 animate-pulse';
        if (isPurple) return 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20 animate-pulse';
        if (isAmber) return 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 animate-pulse';
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse';
      case 'compliance-missed':
        if (isGreen) return 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
        if (isBlue) return 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20';
        if (isPurple) return 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
        if (isAmber) return 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
        return 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
      case 'focus-border':
        if (isGreen) return 'focus:border-emerald-500';
        if (isBlue) return 'focus:border-blue-500';
        if (isPurple) return 'focus:border-purple-500';
        if (isAmber) return 'focus:border-amber-500';
        return 'focus:border-teal-500';
      case 'bed-selected':
        if (isGreen) return 'border-emerald-500 bg-emerald-500/10 text-white';
        if (isBlue) return 'border-blue-500 bg-blue-500/10 text-white';
        if (isPurple) return 'border-purple-500 bg-purple-500/10 text-white';
        if (isAmber) return 'border-amber-500 bg-amber-500/10 text-white';
        return 'border-teal-500 bg-teal-500/10 text-white';
      case 'accent-color':
        if (isGreen) return 'accent-emerald-500';
        if (isBlue) return 'accent-blue-500';
        if (isPurple) return 'accent-purple-500';
        if (isAmber) return 'accent-amber-500';
        return 'accent-teal-500';
      default:
        return '';
    }
  };

  return { theme, getThemeColor };
}

export default function Ward({ user, showNotification }) {
  const { authFetch } = useAuth();
  
  // Custom compliance hooks
  const { validationError, validateVitals, validateDischarge, setValidationError } = useMOHReportingValidation();
  const { selectedAdmission, setSelectedAdmission, customCareDate, setCustomCareDate } = useStateRedirection();
  const { theme, getThemeColor } = useThemeClasses();

  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [observations, setObservations] = useState([]);
  
  // New Admission states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');

  // Observations states
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [respRate, setRespRate] = useState('');
  const [painScore, setPainScore] = useState('');
  const [spo2, setSpo2] = useState('');
  const [medsGiven, setMedsGiven] = useState('');
  const [fluidsAdmin, setFluidsAdmin] = useState('');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  // Discharge states
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [activeRoomTab, setActiveRoomTab] = useState('Room 1');

  useEffect(() => {
    const rooms = Array.from(new Set(beds.map(b => b.room_name).filter(Boolean))).filter(r => r !== 'Unassigned');
    if (rooms.length > 0 && !rooms.includes(activeRoomTab)) {
      setActiveRoomTab(rooms[0]);
    }
  }, [beds, activeRoomTab]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // MOH & AfyaLink validation states
  const [showMOHModal, setShowMOHModal] = useState(false);
  const [triageRecord, setTriageRecord] = useState(null);
  const [mohVillage, setMohVillage] = useState("");
  const [mohTemp, setMohTemp] = useState("");
  const [mohWeight, setMohWeight] = useState("");
  const [mohSystolic, setMohSystolic] = useState("");
  const [mohDiastolic, setMohDiastolic] = useState("");
  const [mohConfirmed, setMohConfirmed] = useState(false);

  // Mobile layout and modal states
  const [viewModeTab, setViewModeTab] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'list';
    }
    return 'map';
  });
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);

  // Caretakers and Visitors tracking states
  const [inpatientTab, setInpatientTab] = useState('clinical'); // 'clinical' or 'visitors'
  const [caretakers, setCaretakers] = useState([]);

  const handlePrintInpatientFile = () => {
    if (!selectedAdmission) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please allow popups to print.');
      return;
    }

    const patient = selectedAdmission.patient;
    const age = patient ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A';
    
    // Build vitals history HTML
    let vitalsHistoryHtml = '';
    if (observations.length > 0) {
      vitalsHistoryHtml = observations.map((obs, idx) => `
        <tr>
          <td>#\${idx + 1}</td>
          <td>\${new Date(obs.created_at).toLocaleString()}</td>
          <td>\${obs.bp_systolic || '--'}/\${obs.bp_diastolic || '--'} mmHg</td>
          <td>\${obs.temperature || '--'} °C</td>
          <td>\${obs.pulse_rate || '--'} bpm</td>
          <td>\${obs.respiratory_rate || '--'} bpm</td>
          <td>\${obs.spo2 || '--'} %</td>
          <td>\${obs.meds_administered || 'None'}</td>
          <td>\${obs.observations_notes || 'None'}</td>
        </tr>
      `).join('');
    } else {
      vitalsHistoryHtml = '<tr><td colspan="9" style="text-align: center; font-style: italic;">No rounds logged.</td></tr>';
    }

    // Build caretakers HTML
    let caretakersHtml = '';
    if (caretakers.length > 0) {
      caretakersHtml = caretakers.map(c => `
        <li><strong>\${c.full_name}</strong> - \${c.relationship} (\${c.phone || 'No phone'}) - Allowed to visit: \${c.allowed_visitation ? 'Yes' : 'No'}</li>
      `).join('');
    } else {
      caretakersHtml = '<li>No caretakers registered.</li>';
    }

    // Build visitor log HTML
    let visitorLogsHtml = '';
    const activeLogs = visitorLogs.filter(log => log.admission_id === selectedAdmission.id);
    if (activeLogs.length > 0) {
      visitorLogsHtml = activeLogs.map((log, idx) => `
        <tr>
          <td>#\${idx + 1}</td>
          <td>\${log.visitor_name} (\${log.visitor_phone || 'N/A'})</td>
          <td>\${log.relationship_to_patient || log.relationship || 'N/A'}</td>
          <td>\${log.check_in_time ? new Date(log.check_in_time).toLocaleString() : '--'}</td>
          <td>\${log.check_out_time ? new Date(log.check_out_time).toLocaleString() : 'Still Checked In'}</td>
        </tr>
      `).join('');
    } else {
      visitorLogsHtml = '<tr><td colspan="5" style="text-align: center; font-style: italic;">No visitors logged.</td></tr>';
    }

    const htmlContent = `
      <html>
        <head>
          <title>Inpatient File - \${patient?.name || 'Inpatient'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; background: #fff; line-height: 1.5; font-size: 12px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #333; padding-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-size: 22px; text-transform: uppercase; color: #111; }
            .header p { margin: 3px 0; font-size: 12px; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; font-size: 13px; color: #111; }
            .grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 12px; }
            .field { display: flex; flex-direction: column; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .field-label { font-weight: bold; font-size: 10px; color: #555; text-transform: uppercase; }
            .field-value { font-size: 12px; margin-top: 2px; }
            .full-width { grid-column: span 3; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            table th, table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            table th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 15px; color: #666; }
            ul { padding-left: 20px; margin: 5px 0; }
            @media print {
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Egesa Health System</h2>
            <p>Inpatient File Summary Report</p>
            <p>Date: \${new Date().toLocaleDateString()} | Time: \${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Admission & Patient Particulars</div>
            <div class="grid">
              <div class="field"><span class="field-label">Patient Name:</span><span class="field-value">\${patient?.name || 'N/A'}</span></div>
              <div class="field"><span class="field-label">Patient Code:</span><span class="field-value">\${patient?.facility_id_code || 'N/A'}</span></div>
              <div class="field"><span class="field-label">Age / Gender:</span><span class="field-value">\${age} yrs / \dots \${patient?.gender || 'N/A'}</span></div>
              <div class="field"><span class="field-label">Allocated Bed:</span><span class="field-value">\${selectedAdmission.bed}</span></div>
              <div class="field"><span class="field-label">Admission Date:</span><span class="field-value">\${new Date(selectedAdmission.admission_date || selectedAdmission.created_at).toLocaleDateString()}</span></div>
              <div class="field"><span class="field-label">Admitting Clinician:</span><span class="field-value">\${selectedAdmission.admitting_doctor || 'N/A'}</span></div>
              <div class="field full-width"><span class="field-label">Diagnosis / Reason for Admission:</span><span class="field-value">\${selectedAdmission.diagnosis || 'None'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Chart & Vitals History</div>
            <table>
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Date/Time</th>
                  <th>BP</th>
                  <th>Temp</th>
                  <th>Pulse</th>
                  <th>Resp Rate</th>
                  <th>SPO2</th>
                  <th>Meds Given</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                \${vitalsHistoryHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Caretakers Profile (Allowed Visitors)</div>
            <ul>
              \${caretakersHtml}
            </ul>
          </div>

          <div class="section">
            <div class="section-title">Visitor Entry/Exit logs</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Visitor Name</th>
                  <th>Relationship</th>
                  <th>Checked In</th>
                  <th>Checked Out</th>
                </tr>
              </thead>
              <tbody>
                \${visitorLogsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Report Compiled by: \${user?.full_name || 'Ward Nurse'}</p>
            <p>Egesa Health System | Electronic Health Record</p>
            <div class="print-hidden" style="margin-top: 20px;">
              <button onclick="window.print();" style="padding: 8px 18px; font-weight: bold; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 4px; font-size: 12px;">Print Document</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [showAddCaretaker, setShowAddCaretaker] = useState(false);
  const [showCheckInVisitor, setShowCheckInVisitor] = useState(false);

  // Add Caretaker Form state
  const [newCaretaker, setNewCaretaker] = useState({
    name: '',
    relationship: 'Spouse',
    phone_number: '',
    is_primary_caretaker: false,
    is_allowed_visitor: true
  });

  // Check-In Visitor Form state
  const [newVisitor, setNewVisitor] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_id_number: '',
    relationship_to_patient: 'Family Member',
    security_notes: ''
  });

  useEffect(() => {
    fetchWardData();
  }, []);

  useEffect(() => {
    if (selectedAdmission) {
      fetchObservations(selectedAdmission.id);
      fetchCaretakers(selectedAdmission.patient?.id);
      fetchVisitorLogs(selectedAdmission.id);
      sessionStorage.setItem('egesa_selected_admission_id_ward', selectedAdmission.id);
    } else {
      setObservations([]);
      setCaretakers([]);
      setVisitorLogs([]);
      sessionStorage.removeItem('egesa_selected_admission_id_ward');
    }
  }, [selectedAdmission]);

  const fetchObservations = async (admissionId) => {
    try {
      const { data, error } = await supabase
        .from('ward_care_records')
        .select('*')
        .eq('admission_id', admissionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setObservations(data || []);
    } catch (err) {
      console.error('Error fetching ward care records:', err);
    }
  };

  const fetchCaretakers = async (patientId) => {
    if (!patientId) return;
    try {
      const { data, error } = await supabase
        .from('patient_caretakers')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCaretakers(data || []);
    } catch (err) {
      console.error('Failed to fetch caretakers:', err);
    }
  };

  const fetchVisitorLogs = async (admissionId) => {
    if (!admissionId) return;
    try {
      const { data, error } = await supabase
        .from('patient_visitor_logs')
        .select('*')
        .eq('admission_id', admissionId)
        .order('check_in_datetime', { ascending: false });
      if (error) throw error;
      setVisitorLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch visitor logs:', err);
    }
  };

  const handleAddCaretaker = async (e) => {
    e.preventDefault();
    if (!selectedAdmission || !selectedAdmission.patient) return;
    setLoading(true);
    try {
      const id = 'car_' + Math.random().toString(36).substring(2, 12);
      
      if (newCaretaker.is_primary_caretaker) {
        await supabase
          .from('patient_caretakers')
          .update({ is_primary_caretaker: false })
          .eq('patient_id', selectedAdmission.patient.id);
      }

      const { error } = await supabase
        .from('patient_caretakers')
        .insert({
          id,
          patient_id: selectedAdmission.patient.id,
          facility_id: user.facility_id,
          name: newCaretaker.name,
          relationship: newCaretaker.relationship,
          phone_number: newCaretaker.phone_number,
          is_primary_caretaker: newCaretaker.is_primary_caretaker,
          is_allowed_visitor: newCaretaker.is_allowed_visitor
        });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Caretaker/authorized person registered successfully.' });
      setNewCaretaker({
        name: '',
        relationship: 'Spouse',
        phone_number: '',
        is_primary_caretaker: false,
        is_allowed_visitor: true
      });
      setShowAddCaretaker(false);
      fetchCaretakers(selectedAdmission.patient.id);
    } catch (err) {
      console.error('Failed to add caretaker:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCaretaker = async (id) => {
    if (!window.confirm('Are you sure you want to remove this authorized person?')) return;
    try {
      const { error } = await supabase
        .from('patient_caretakers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Authorized person removed.' });
      if (selectedAdmission && selectedAdmission.patient) {
        fetchCaretakers(selectedAdmission.patient.id);
      }
    } catch (err) {
      console.error('Failed to delete caretaker:', err);
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleVisitorCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setLoading(true);
    try {
      const id = 'vis_' + Math.random().toString(36).substring(2, 12);
      
      const normalizedVisitorName = newVisitor.visitor_name.toLowerCase().trim();
      const normalizedVisitorPhone = newVisitor.visitor_phone.replace(/\D/g, '');
      
      const isAuthorized = caretakers.some(c => {
        const cName = c.name.toLowerCase().trim();
        const cPhone = c.phone_number.replace(/\D/g, '');
        return (cName === normalizedVisitorName || cPhone === normalizedVisitorPhone) && c.is_allowed_visitor;
      });

      const isExplicitlyBlocked = caretakers.some(c => {
        const cName = c.name.toLowerCase().trim();
        const cPhone = c.phone_number.replace(/\D/g, '');
        return (cName === normalizedVisitorName || cPhone === normalizedVisitorPhone) && !c.is_allowed_visitor;
      });

      let status = 'active';
      let isApproved = true;
      
      if (isExplicitlyBlocked) {
        status = 'flagged';
        isApproved = false;
      } else if (!isAuthorized && caretakers.length > 0) {
        isApproved = false;
        status = 'flagged';
      }

      const { error } = await supabase
        .from('patient_visitor_logs')
        .insert({
          id,
          admission_id: selectedAdmission.id,
          patient_id: selectedAdmission.patient?.id,
          facility_id: user.facility_id,
          visitor_name: newVisitor.visitor_name,
          visitor_phone: newVisitor.visitor_phone,
          visitor_id_number: newVisitor.visitor_id_number,
          relationship_to_patient: newVisitor.relationship_to_patient,
          security_notes: newVisitor.security_notes + (isExplicitlyBlocked ? ' [FLAGGED: Explicitly unauthorized visitor]' : !isApproved && caretakers.length > 0 ? ' [ALERT: Visitor not on patient authorized list]' : ''),
          status,
          is_approved: isApproved
        });

      if (error) throw error;

      const primaryCaretaker = caretakers.find(c => c.is_primary_caretaker);
      if (primaryCaretaker) {
        let alertMessage = `Ward Visitor Alert: ${newVisitor.visitor_name} (ID: ${newVisitor.visitor_id_number}) has checked in to visit patient ${selectedAdmission.patient?.name} in Bed ${selectedAdmission.bed} at ${new Date().toLocaleTimeString()}.`;
        if (isExplicitlyBlocked) {
          alertMessage = `SECURITY ALERT: Explicitly BLOCKED visitor ${newVisitor.visitor_name} (ID: ${newVisitor.visitor_id_number}) attempted to visit patient ${selectedAdmission.patient?.name} in Bed ${selectedAdmission.bed}. Ward security has been notified.`;
        } else if (!isApproved && caretakers.length > 0) {
          alertMessage = `Security Notice: Unlisted visitor ${newVisitor.visitor_name} (ID: ${newVisitor.visitor_id_number}, Relation: ${newVisitor.relationship_to_patient}) has checked in to visit ${selectedAdmission.patient?.name} in Bed ${selectedAdmission.bed}. If this is unexpected, please notify ward staff.`;
        }

        const notifyRes = await sendWhatsAppNotification(primaryCaretaker.phone_number, alertMessage, user.facility_id);
        if (notifyRes.success) {
          setMessage({
            type: isApproved ? 'success' : 'warning',
            text: `Visitor checked in. WhatsApp alert dispatched to primary caretaker ${primaryCaretaker.name} (${primaryCaretaker.phone_number}).`
          });
        } else {
          setMessage({
            type: isApproved ? 'success' : 'warning',
            text: `Visitor checked in. (WhatsApp simulation failed: ${notifyRes.error})`
          });
        }
      } else {
        setMessage({
          type: isApproved ? 'success' : 'warning',
          text: `Visitor checked in.${!isApproved ? ' WARNING: This visitor is not on the patient\'s authorized list.' : ''}`
        });
      }

      setNewVisitor({
        visitor_name: '',
        visitor_phone: '',
        visitor_id_number: '',
        relationship_to_patient: 'Family Member',
        security_notes: ''
      });
      setShowCheckInVisitor(false);
      fetchVisitorLogs(selectedAdmission.id);
    } catch (err) {
      console.error('Failed to log check-in:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorCheckOut = async (logId) => {
    try {
      const { error } = await supabase
        .from('patient_visitor_logs')
        .update({
          check_out_datetime: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', logId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Visitor checked out successfully.' });
      fetchVisitorLogs(selectedAdmission.id);
    } catch (err) {
      console.error('Failed to log check-out:', err);
      setMessage({ type: 'error', text: err.message });
    }
  };

  const fetchWardData = async () => {
    try {
      // 1. Fetch bed allocations
      const { data: bedsData } = await supabase.from('bed_allocations').select('*');
      setBeds(bedsData || []);
      if (bedsData && bedsData.length > 0 && !targetBedId) {
        // default to first vacant bed
        const vacant = bedsData.find(b => b.bed_status === 'clean');
        if (vacant) setTargetBedId(vacant.id);
      }

      // 2. Fetch inpatient admissions
      const { data: admData } = await supabase.from('inpatient_admissions').select('*').eq('status', 'admitted');
      const { data: pts } = await supabase.from('patients').select('*');

      setPatients(pts || []);
      
      const enriched = admData ? admData.map(a => {
        const p = pts?.find(pt => pt.id === a.patient_id);
        const b = bedsData?.find(bd => bd.id === a.bed_id);
        return { 
          ...a, 
          patient: p, 
          bed: b ? b.bed_number : 'Bed N/A',
          bed_id: a.bed_id
        };
      }) : [];

      setAdmissions(enriched);
      
      if (enriched.length > 0) {
        setSelectedAdmission(prev => {
          const savedId = sessionStorage.getItem('egesa_selected_admission_id_ward');
          const matched = enriched.find(a => a.id === savedId);
          if (matched) return matched;

          const stillAdmitted = enriched.find(a => a.id === prev?.id);
          return stillAdmitted || enriched[ enriched.length - 1 ];
        });
      } else {
        setSelectedAdmission(null);
      }
    } catch (err) {
      console.error('Error loading ward data:', err);
    }
  };

  const handleAdmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !targetBedId) {
      setMessage({ type: 'error', text: 'Please select a patient and a bed.' });
      return;
    }

    const selectedBed = beds.find(b => b.id === targetBedId);
    if (!selectedBed) return;

    if (selectedBed.bed_status === 'occupied') {
      setMessage({ type: 'error', text: `${selectedBed.bed_number} is already occupied.` });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Create admission record
      const admissionId = 'adm_' + Math.random().toString(36).substring(2, 12);
      const { error: admError } = await supabase.from('inpatient_admissions').insert({
        id: admissionId,
        patient_id: selectedPatientId,
        facility_id: user.facility_id,
        admission_datetime: new Date().toISOString(),
        admitting_clinician: user.id,
        ward_id: selectedBed.ward_id,
        bed_id: selectedBed.id,
        admission_type: 'routine',
        status: 'admitted'
      });
      if (admError) throw admError;

      // Update bed status via Express endpoints to sync local database
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const bedRes = await fetch(`${apiBase}/workflows/inpatient/bed-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bed_id: selectedBed.id,
          status: 'occupied',
          patient_id: selectedPatientId
        })
      });
      if (!bedRes.ok) throw new Error('Failed to update bed occupancy status.');

      if (showNotification) {
        showNotification('success', 'Patient Admitted', `Patient successfully admitted to ${selectedBed.bed_number}.`);
      } else {
        setMessage({ type: 'success', text: `Patient successfully admitted to ${selectedBed.bed_number}.` });
      }
 
      setSelectedPatientId('');
      fetchWardData();
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Admission Failed', err.message || 'Admission failed.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Admission failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogObservation = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    let bpSystolic = null;
    let bpDiastolic = null;
    if (bp) {
      const bpParts = bp.split('/');
      if (bpParts.length !== 2) {
        setMessage({ type: 'error', text: 'Blood pressure must be in the format Systolic/Diastolic (e.g. 120/80).' });
        return;
      }
      bpSystolic = parseInt(bpParts[0], 10);
      bpDiastolic = parseInt(bpParts[1], 10);
    }

    const validation = validateVitals({
      temperature: temp,
      systolic: bpSystolic,
      diastolic: bpDiastolic,
      heart_rate: pulse,
      resp_rate: respRate,
      pain_score: painScore,
      spo2: spo2
    });

    if (!validation.isValid) {
      setMessage({ type: 'error', text: validation.error });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const targetDate = customCareDate || new Date().toISOString().split('T')[0];
      const recordId = 'care_' + Math.random().toString(36).substring(2, 12);
      const { error: obsError } = await supabase.from('ward_care_records').insert({
        id: recordId,
        admission_id: selectedAdmission.id,
        facility_id: user.facility_id,
        care_date: targetDate,
        round_number: observations.filter(o => {
          const careDateStr = o.care_date ? o.care_date.split('T')[0] : '';
          return careDateStr === targetDate;
        }).length + 1,
        bp_systolic: bpSystolic,
        bp_diastolic: bpDiastolic,
        temperature: parseFloat(temp) || null,
        pulse_rate: parseInt(pulse) || null,
        respiratory_rate: parseInt(respRate) || 16,
        pain_score: parseInt(painScore) || 0,
        oxygen_saturation: parseInt(spo2) || 98,
        medications_given: medsGiven || '',
        fluids_administered: fluidsAdmin || '',
        observations_notes: progressNotes,
        recorded_by: user.id
      });
      if (obsError) throw obsError;

      // Add audit log
      await supabase.from('audit_logs').insert({
        action: 'Ward Observation Logged',
        details: `Logged observation for inpatient ${selectedAdmission.patient?.name} on ${selectedAdmission.bed}: Temp: ${temp}, BP: ${bp}, Pulse: ${pulse}. Notes: ${progressNotes}`
      });

      if (showNotification) {
        showNotification('success', 'Observations Saved', 'Clinical observations charted successfully.');
      } else {
        setMessage({ type: 'success', text: 'Clinical observations charted successfully.' });
      }
      setTemp('');
      setBp('');
      setPulse('');
      setRespRate('');
      setPainScore('');
      setSpo2('');
      setMedsGiven('');
      setFluidsAdmin('');
      setCustomCareDate(null);
      setProgressNotes('');
      
      // Refresh observations
      fetchObservations(selectedAdmission.id);
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Observation Failed', err.message || 'Failed to chart observations.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Failed to chart observations.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPatientAge = (dobString) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getAdmittedDays = (admissionDatetime) => {
    if (!admissionDatetime) return [];
    const dates = [];
    const start = new Date(new Date(admissionDatetime).toDateString());
    const today = new Date(new Date().toDateString());
    
    let current = new Date(start);
    let iterations = 0;
    while (current <= today && iterations < 100) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    return dates;
  };

  const handleDischargeClick = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedAdmission) return;

    if (!dischargeNotes.trim()) {
      setMessage({ type: 'error', text: 'Please enter discharge diagnoses & instructions summary.' });
      return;
    }

    setValidationError(null);
    setLoading(true);
    try {
      // Fetch existing triage data for this visit
      const { data } = await supabase.from('triages').select('*').eq('visit_id', selectedAdmission.id);
      const activeTriage = data && data[0];
      setTriageRecord(activeTriage || null);

      const contactInfo = selectedAdmission.patient ? parsePatientContact(selectedAdmission.patient.phone) : {};
      setMohVillage(contactInfo.village || "");
      setMohTemp(activeTriage?.temperature || "");
      setMohWeight(activeTriage?.weight || "");
      setMohSystolic(activeTriage?.systolic || "");
      setMohDiastolic(activeTriage?.diastolic || "");
      setMohConfirmed(false);
      setShowMOHModal(true);
    } catch (err) {
      console.error('Error fetching discharge MOH stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveMOHRecords = async () => {
    try {
      // Save village to patient phone meta
      const contactInfo = selectedAdmission.patient ? parsePatientContact(selectedAdmission.patient.phone) : {};
      if (mohVillage !== contactInfo.village) {
        const updatedPhone = JSON.stringify({
          ...contactInfo,
          village: mohVillage
        });
        await supabase.from('patients').update({ phone: updatedPhone }).eq('id', selectedAdmission.patient_id);
      }

      // Save vitals
      if (triageRecord) {
        await supabase.from('triages').update({
          temperature: parseFloat(mohTemp) || triageRecord.temperature,
          weight: parseFloat(mohWeight) || triageRecord.weight,
          systolic: parseInt(mohSystolic) || triageRecord.systolic,
          diastolic: parseInt(mohDiastolic) || triageRecord.diastolic
        }).eq('id', triageRecord.id);
      } else {
        const triageId = 'tr_' + Math.random().toString(36).substring(2, 11);
        await supabase.from('triages').insert({
          id: triageId,
          facility_id: user.facility_id,
          visit_id: selectedAdmission.id,
          temperature: parseFloat(mohTemp) || null,
          weight: parseFloat(mohWeight) || null,
          systolic: parseInt(mohSystolic) || null,
          diastolic: parseInt(mohDiastolic) || null,
          chief_complaint: dischargeNotes || "Inpatient Ward Encounter",
          priority_flag: "green"
        });
      }
    } catch (err) {
      console.error('[MOH Record Save Error - Inpatient]', err);
    }
  };

  const handleDischarge = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedAdmission) return;

    const patientAge = getPatientAge(selectedAdmission.patient?.dob);
    const validation = validateDischarge({
      village: mohVillage,
      temp: mohTemp,
      weight: mohWeight,
      systolic: mohSystolic,
      diastolic: mohDiastolic
    }, patientAge);

    if (!validation.isValid) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 0. Save validated MOH details
      await saveMOHRecords();

      // 1. Update inpatient_admissions status
      const { error: admError } = await supabase.from('inpatient_admissions').update({
        status: 'discharged',
        discharge_datetime: new Date().toISOString(),
        discharge_mode: 'routine'
      }).eq('id', selectedAdmission.id);
      if (admError) throw admError;

      // 2. Free bed status via Express API
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const bedRes = await fetch(`${apiBase}/workflows/inpatient/bed-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bed_id: selectedAdmission.bed_id,
          status: 'clean'
        })
      });
      if (!bedRes.ok) throw new Error('Failed to update bed status to clean.');

      // 3. Log Audit trail
      await supabase.from('audit_logs').insert({
        action: 'Ward Patient Discharge',
        details: `Discharged patient ${selectedAdmission.patient?.name} from ${selectedAdmission.bed}. Summary: ${dischargeNotes}`
      });

      // Trigger Notification
      try {
        const contactInfo = parsePatientContact(selectedAdmission.patient?.phone);
        if (contactInfo.email) {
          await sendNotification('INPATIENT_DISCHARGED', {
            patientName: selectedAdmission.patient?.name,
            bedName: selectedAdmission.bed,
            dischargedBy: user.full_name,
            dischargeNotes: dischargeNotes,
            recipientEmail: contactInfo.email,
            aiContextSummary: `Patient ${selectedAdmission.patient?.name} discharged from bed ${selectedAdmission.bed} by ${user.full_name}. Notes: ${dischargeNotes}`
          }, user.facility_id);
        }
      } catch (e) {
        console.error('Discharge email trigger failed:', e);
      }

      // 4. Submit to AfyaLink automatically
      try {
        const token = localStorage.getItem('egesa_health_token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiBase}/afyalink/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            visit_id: selectedAdmission.id,
            patient_id: selectedAdmission.patient_id,
            patient_name: selectedAdmission.patient?.name,
            patient_code: selectedAdmission.patient?.facility_id_code,
            diagnosis_code: 'A00',
            diagnosis_name: 'Inpatient Care Discharge',
            encounter_class: 'IMP',
            vitals: {
              temperature: mohTemp || triageRecord?.temperature,
              weight: mohWeight || triageRecord?.weight,
              sys: mohSystolic || triageRecord?.systolic,
              dia: mohDiastolic || triageRecord?.diastolic
            }
          })
        });
      } catch (afyaErr) {
        console.error('[AfyaLink Sync Trigger Failed - Inpatient]', afyaErr);
      }

      if (showNotification) {
        showNotification('success', 'Patient Discharged', 'Patient successfully discharged. Bed freed.');
      } else {
        setMessage({ type: 'success', text: 'Patient successfully discharged. Bed freed.' });
      }
      setDischargeNotes('');
      setShowMOHModal(false);
      fetchWardData();
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Discharge Failed', err.message || 'Discharge failed.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Discharge failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBedStatus = async (bedId, status) => {
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/workflows/inpatient/bed-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bed_id: bedId, status })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Bed status updated to ${status}.` });
        fetchWardData();
      }
    } catch (err) {
      console.error('Failed to update bed status:', err);
    }
  };  return (
    <div className="space-y-6">
      {/* Bed Layout Graphical Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-850 pb-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Bed size={14} className={getThemeColor('primary-text')} /> Inpatient Ward Map (Active Occupancy)
          </h3>
          {/* Layout Toggle Selector */}
          <div className="flex gap-1.5 self-end sm:self-auto bg-slate-950 p-1 border border-slate-850 rounded-lg shadow-inner shrink-0 select-none">
            <button
              onClick={() => setViewModeTab('map')}
              className={`px-3 py-1 rounded-md text-2xs font-bold cursor-pointer transition ${
                viewModeTab === 'map'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                  : 'text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              Map Layout
            </button>
            <button
              onClick={() => setViewModeTab('list')}
              className={`px-3 py-1 rounded-md text-2xs font-bold cursor-pointer transition ${
                viewModeTab === 'list'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                  : 'text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              Quick Access Cards
            </button>
          </div>
        </div>

        {viewModeTab === 'list' ? (
          <div className="space-y-6">
            {Array.from(new Set(beds.map(b => b.room_name).filter(Boolean))).filter(r => r !== 'Unassigned').sort().map((room) => (
              <div key={room} className="space-y-3">
                <div className="border-b border-slate-850 pb-1.5 flex justify-between items-center">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={11} className="text-teal-450" /> {room}
                  </span>
                  <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                    {beds.filter(b => b.room_name === room).length} Beds Configured
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {beds.filter(b => b.room_name === room).map((bed) => {
                    const occupant = admissions.find(a => a.bed_id === bed.id);
                    const isSelected = occupant && selectedAdmission?.id === occupant.id;

                    let statusText = 'Vacant';
                    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    let cardBorder = isSelected ? 'border-teal-500 ring-1 ring-teal-500/20 shadow shadow-teal-500/10 bg-slate-900/80' : 'border-slate-850 hover:border-slate-800 bg-slate-900/40';

                    if (bed.bed_status === 'dirty') {
                      statusText = 'Dirty / Needs Cleaning';
                      badgeColor = 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20';
                    } else if (bed.bed_status === 'occupied') {
                      statusText = 'Occupied';
                      badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    } else if (bed.bed_status === 'maintenance') {
                      statusText = 'Maintenance';
                      badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                    }

                    return (
                      <div 
                        key={bed.id}
                        className={`border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-medium ${cardBorder}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-black text-slate-100 block leading-tight">{bed.bed_number}</span>
                            <span className="text-[8.5px] text-slate-550 font-mono mt-0.5 block">{bed.id}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badgeColor}`}>
                            {statusText}
                          </span>
                        </div>

                        {occupant ? (
                          <div className="space-y-1 text-xs">
                            <span className="text-slate-400 block">Patient: <strong className="text-slate-100">{occupant.patient?.name}</strong></span>
                            <span className="text-[9.5px] text-slate-500 block leading-none">Code: {occupant.patient?.facility_id_code}</span>
                            <span className="text-[9.5px] text-slate-500 block leading-none mt-1">LOS: {Math.max(1, Math.ceil((new Date() - new Date(occupant.admission_datetime)) / (1000 * 60 * 60 * 24)))} Day(s)</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-550 italic py-2">
                            No patient admitted
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-850/60">
                          {occupant ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdmission(occupant);
                                  setShowVitalsModal(true);
                                }}
                                className="flex-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-bold text-2xs py-1.5 px-2 rounded-lg transition active:scale-[0.97] cursor-pointer"
                              >
                                Log Vitals
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdmission(occupant);
                                  setShowDischargeModal(true);
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-750 text-red-400 font-bold text-2xs py-1.5 px-2 rounded-lg transition active:scale-[0.97] cursor-pointer"
                              >
                                Discharge
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdmission(occupant);
                                  document.getElementById('patient-file-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full border border-slate-800 hover:bg-slate-850 text-slate-350 font-bold text-[9px] py-1.5 rounded-lg transition text-center cursor-pointer"
                              >
                                View History File
                              </button>
                            </>
                          ) : (
                            <>
                              {bed.bed_status === 'dirty' ? (
                                <button
                                  type="button"
                                  onClick={() => updateBedStatus(bed.id, 'clean')}
                                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-2xs py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  Mark as Clean
                                </button>
                              ) : bed.bed_status === 'clean' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetBedId(bed.id);
                                    setShowAdmissionModal(true);
                                  }}
                                  className="w-full bg-teal-500 hover:bg-teal-650 text-slate-950 font-bold text-2xs py-1.5 rounded-lg transition active:scale-[0.97] cursor-pointer shadow-sm"
                                >
                                  Admit Patient
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-600 italic text-center w-full py-1">Under Maintenance</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Room Selector Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
              {Array.from(new Set([
                'Room 1',
                ...beds.map(b => b.room_name).filter(Boolean)
              ])).filter(r => r !== 'Unassigned').sort().map((room) => (
                <button
                  key={room}
                  onClick={() => setActiveRoomTab(room)}
                  className={`px-3 py-1 rounded-lg text-2xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeRoomTab === room
                      ? 'bg-slate-800 border border-slate-700 text-teal-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>

            {/* Graphical Room Canvas Area */}
            <div className="overflow-x-auto flex justify-center py-2">
              <div
                className="bg-slate-955/20 border border-slate-850 rounded-xl relative overflow-hidden shadow-inner select-none shrink-0"
                style={{
                  width: '600px',
                  height: '380px',
                  backgroundImage: 'radial-gradient(circle, #27272a 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {/* Visual grid indicators */}
                <div className="absolute inset-2 border border-slate-850/40 rounded-lg pointer-events-none border-dashed flex items-end justify-between p-2 text-[9px] text-slate-650 font-mono">
                  <span>Room Layout: {activeRoomTab}</span>
                  <span>1m = 40px</span>
                </div>

                {/* Positioned Beds */}
                {beds.filter(b => b.room_name === activeRoomTab).map((bed) => {
                  const occupant = admissions.find(a => a.bed_id === bed.id);
                  const isSelected = occupant && selectedAdmission?.id === occupant.id;
                  
                  let statusBorderColor = 'border-emerald-500/40 bg-emerald-955/20 text-emerald-400';
                  if (bed.bed_status === 'dirty') {
                    statusBorderColor = 'border-yellow-500/40 bg-yellow-955/20 text-yellow-450';
                  } else if (bed.bed_status === 'occupied') {
                    statusBorderColor = isSelected
                      ? `${getThemeColor('bed-selected')} ring-2 ring-teal-400 border-transparent shadow shadow-teal-400/20`
                      : 'border-blue-500/40 bg-blue-955/20 text-blue-450 hover:border-blue-400';
                  } else if (bed.bed_status === 'maintenance') {
                    statusBorderColor = 'border-red-900/40 bg-red-955/10 text-red-400';
                  }

                  return (
                    <button
                      key={bed.id}
                      onClick={() => {
                        if (occupant) {
                          setSelectedAdmission(occupant);
                          setMessage({ type: '', text: '' });
                        }
                      }}
                      className={`absolute rounded border flex flex-col justify-between p-1.5 transition-all text-left ${statusBorderColor}`}
                      style={{
                        left: `${bed.x_position || 0}px`,
                        top: `${bed.y_position || 0}px`,
                        width: '70px',
                        height: '90px',
                        transform: `rotate(${bed.rotation || 0}deg)`,
                        transformOrigin: 'center center',
                        cursor: occupant ? 'pointer' : 'default'
                      }}
                    >
                      {/* Headboard Pillow */}
                      <div className={`w-[36px] h-[12px] bg-slate-800/80 border border-slate-700/40 rounded mx-auto mt-0.5 ${
                        occupant ? 'animate-pulse' : ''
                      }`} />
                      
                      {/* Bed Label */}
                      <div className="text-center mt-1">
                        <span className="text-2xs font-bold block text-slate-100 font-mono truncate leading-none">{bed.bed_number}</span>
                        <span className="text-[8px] truncate max-w-full font-semibold block mt-1 text-slate-400 leading-none">
                          {occupant ? occupant.patient?.name.split(' ')[0] : bed.bed_status === 'maintenance' ? 'Maint' : 'Vacant'}
                        </span>
                      </div>

                      {/* Bed Sheet fold */}
                      <div className="w-full h-[28px] bg-slate-900/60 border-t border-slate-800/50 rounded-b mt-auto" />
                    </button>
                  );
                })}

                {beds.filter(b => b.room_name === activeRoomTab).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-6 text-xs text-slate-500 italic">
                    No beds configured in this room layout. Add coordinates in Admin Settings.
                  </div>
                )}
              </div>
            </div>

            {/* Unassigned / Palette beds */}
            {beds.filter(b => b.room_name === 'Unassigned' || (!b.x_position && !b.y_position)).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <h4 className="text-2xs font-bold text-slate-450 uppercase tracking-wider">Unassigned Beds (Palette)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {beds.filter(b => b.room_name === 'Unassigned' || (!b.x_position && !b.y_position)).map(bed => {
                    const occupant = admissions.find(a => a.bed_id === bed.id);
                    const isSelected = occupant && selectedAdmission?.id === occupant.id;
                    
                    let statusBg = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
                    if (bed.bed_status === 'dirty') {
                      statusBg = 'bg-yellow-500/10 border-yellow-500/25 text-yellow-450';
                    } else if (bed.bed_status === 'occupied') {
                      statusBg = isSelected
                        ? `${getThemeColor('bed-selected')} shadow shadow-teal-500/10`
                        : 'border-slate-800 bg-slate-955 hover:border-slate-700 text-blue-400';
                    } else if (bed.bed_status === 'maintenance') {
                      statusBg = 'border-red-900/50 bg-red-950/10 text-red-400';
                    }

                    return (
                      <button
                        key={bed.id}
                        onClick={() => {
                          if (occupant) {
                            setSelectedAdmission(occupant);
                            setMessage({ type: '', text: '' });
                          }
                        }}
                        className={`border rounded-lg p-2 flex flex-col justify-between text-center min-h-[90px] transition cursor-pointer ${statusBg}`}
                      >
                        <Bed size={16} className="mx-auto opacity-85" />
                        <span className="text-2xs font-bold block text-slate-100 font-mono mt-1 leading-none">{bed.bed_number}</span>
                        <span className="text-[8px] truncate block opacity-75 mt-0.5">
                          {occupant ? occupant.patient?.name.split(' ')[0] : bed.bed_status === 'maintenance' ? 'Maint' : 'Vacant'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admit Patient Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <PlusCircle size={14} className={getThemeColor('primary-text')} /> Admit Patient to Ward
          </h3>

          {message.text && message.type === 'error' && (
            <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-xs flex gap-2 animate-pulse">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{message.text}</span>
            </div>
          )}

          {message.text && message.type === 'success' && (
            <div className="bg-green-500/5 border border-green-500/20 text-green-400 p-2.5 rounded text-xs flex gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleAdmit} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className={`w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none ${getThemeColor('focus-border')} transition`}
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.facility_id_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Bed</label>
              <select
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                className={`w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none ${getThemeColor('focus-border')} transition`}
                required
              >
                <option value="">-- Choose Vacant Bed --</option>
                {beds.filter(b => b.bed_status === 'clean').map(bed => (
                  <option key={bed.id} value={bed.id}>{bed.bed_number} ({bed.ward_id.replace('ward_', '')})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${getThemeColor('accent-btn')} font-bold text-xs py-2 rounded-lg transition`}
            >
              Confirm Admission
            </button>
          </form>
        </div>

        {/* Chart Observations Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          {!selectedAdmission ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <ClipboardList size={36} className="text-slate-700 mb-2 animate-bounce" />
              <span className="text-xs">No active inpatient selected. Click an occupied bed from the map.</span>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                <div>
                  <span className={`text-2xs ${getThemeColor('primary-text')} font-bold uppercase tracking-wider`}>{selectedAdmission.bed} Inpatient File</span>
                  <h4 className="text-sm font-bold text-slate-100">{selectedAdmission.patient?.name}</h4>
                  <span className="text-2xs text-slate-500 font-mono">{selectedAdmission.patient?.facility_id_code}</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintInpatientFile}
                  className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 hover:border-teal-500/30 text-slate-400 hover:text-teal-400 font-bold text-2xs px-3 py-1.5 rounded-lg transition active:scale-[0.97] cursor-pointer"
                >
                  Print File
                </button>
              </div>

              {/* Secondary Navigation Tabs for Inpatient File */}
              <div className="flex border-b border-slate-800 pb-2 gap-4">
                <button
                  type="button"
                  onClick={() => setInpatientTab('clinical')}
                  className={`text-xs font-bold pb-1.5 transition border-b-2 cursor-pointer ${
                    inpatientTab === 'clinical'
                      ? 'text-teal-400 border-teal-400 font-extrabold'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  Clinical Chart & Vitals
                </button>
                <button
                  type="button"
                  onClick={() => setInpatientTab('visitors')}
                  className={`text-xs font-bold pb-1.5 transition border-b-2 cursor-pointer ${
                    inpatientTab === 'visitors'
                      ? 'text-teal-400 border-teal-400 font-extrabold'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  Caretakers & Visitor Log
                </button>
              </div>

              {inpatientTab === 'clinical' && (
                <>

              {/* Clinical Progress Calendar */}
              <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Clinical Progress Calendar (Check-in Compliance)
                  </span>
                  {customCareDate && (
                    <button
                      type="button"
                      onClick={() => setCustomCareDate(null)}
                      className={`text-[9px] ${getThemeColor('primary-text')} border ${getThemeColor('primary-border')} ${getThemeColor('primary-bg')} px-2 py-0.5 rounded cursor-pointer font-sans`}
                    >
                      Reset to Today
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {getAdmittedDays(selectedAdmission?.admission_datetime).map((day, idx) => {
                    const formatted = day.toISOString().split('T')[0];
                    const dayNumber = idx + 1;
                    const hasCheck = observations.some(o => {
                      const careDateStr = o.care_date ? o.care_date.split('T')[0] : '';
                      return careDateStr === formatted;
                    });
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = formatted === todayStr;
                    const isPastDay = formatted < todayStr;
                    
                    let colorClass = "";
                    let tooltipText = "";
                    
                    if (hasCheck) {
                      colorClass = getThemeColor('compliance-checked');
                      tooltipText = `Day ${dayNumber}: Check-in complete. Click to review.`;
                    } else if (isToday) {
                      colorClass = getThemeColor('compliance-today');
                      tooltipText = `Day ${dayNumber} (Today): Check-in pending. Click to log.`;
                    } else if (isPastDay) {
                      colorClass = getThemeColor('compliance-missed');
                      tooltipText = `Day ${dayNumber} (Missed): Unchecked. Click to log check-in.`;
                    }
                    
                    return (
                      <button
                        key={formatted}
                        type="button"
                        onClick={() => {
                          if (hasCheck) {
                            const dayObs = observations.filter(o => {
                              const careDateStr = o.care_date ? o.care_date.split('T')[0] : '';
                              return careDateStr === formatted;
                            });
                            setSelectedCalendarDay({
                              dayNumber,
                              date: formatted,
                              records: dayObs
                            });
                          } else {
                            setCustomCareDate(formatted);
                          }
                        }}
                        title={tooltipText}
                        className={`w-11 h-11 rounded-lg flex flex-col justify-center items-center text-center border font-sans cursor-pointer transition ${colorClass}`}
                      >
                        <span className="text-[9px] font-black uppercase">Day {dayNumber}</span>
                        <span className="text-[8px] opacity-70 font-mono mt-0.5">{day.toLocaleDateString([], {month:'short', day:'numeric'})}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action tabs: Observations and Discharge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {/* Observations Logger */}
                <form onSubmit={handleLogObservation} className="space-y-3.5">
                  <div className="flex justify-between items-center font-sans">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5 font-sans">
                      <Thermometer size={12} className={getThemeColor('primary-text')} /> Observation Vitals Chart
                    </span>
                    {customCareDate && (
                      <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded font-mono animate-pulse">
                        Date: {customCareDate}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-sans">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        min="25"
                        max="45"
                        placeholder="37"
                        className={`w-full bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">BP (mmHg)</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="120/80"
                        className={`w-full bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        min="30"
                        max="260"
                        placeholder="72"
                        className={`w-full bg-slate-955 border border-slate-855 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-sans">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Resp (bpm)</label>
                      <input
                        type="number"
                        value={respRate}
                        onChange={(e) => setRespRate(e.target.value)}
                        min="6"
                        max="80"
                        placeholder="16"
                        className={`w-full bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">SPO2 (%)</label>
                      <input
                        type="number"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        min="10"
                        max="100"
                        placeholder="98"
                        className={`w-full bg-slate-955 border border-slate-855 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Pain (0-10)</label>
                      <input
                        type="number"
                        value={painScore}
                        onChange={(e) => setPainScore(e.target.value)}
                        min="0"
                        max="10"
                        placeholder="0"
                        className={`w-full bg-slate-955 border border-slate-855 rounded py-1 px-2 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')} font-mono`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-sans">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Medications Given</label>
                      <input
                        type="text"
                        value={medsGiven}
                        onChange={(e) => setMedsGiven(e.target.value)}
                        placeholder="e.g. Paracetamol 500mg IV"
                        className={`w-full bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs text-slate-205 focus:outline-none ${getThemeColor('focus-border')}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Fluids Administered</label>
                      <input
                        type="text"
                        value={fluidsAdmin}
                        onChange={(e) => setFluidsAdmin(e.target.value)}
                        placeholder="e.g. Normal Saline 500ml"
                        className={`w-full bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs text-slate-205 focus:outline-none ${getThemeColor('focus-border')}`}
                      />
                    </div>
                  </div>

                  <div className="font-sans">
                    <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Nursing / Progress Notes</label>
                    <textarea
                      rows="2"
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Enter patient observations, fluids admin, observations..."
                      className={`w-full bg-slate-955 border border-slate-850 rounded py-1.5 px-3 text-xs text-slate-200 focus:outline-none ${getThemeColor('focus-border')}`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full bg-slate-955 border border-slate-805 hover:bg-slate-800 ${getThemeColor('primary-text')} text-xs py-1.5 rounded transition font-bold cursor-pointer font-sans`}
                  >
                    {customCareDate ? `Backdate Observation (${customCareDate})` : 'Log Observation'}
                  </button>
                </form>

                {/* Discharge Panel */}
                <form onSubmit={handleDischargeClick} className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-855/80 pt-4 md:pt-0 md:pl-6">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wide block">Discharge Patient Summary</span>
                  
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Discharge Diagnoses & Instructions</label>
                    <textarea
                      rows="3"
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="Type discharge notes, medication checkouts..."
                      className={`w-full bg-slate-955 border border-slate-850 rounded py-1.5 px-3 text-xs text-slate-200 focus:outline-none ${getThemeColor('focus-border')}`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full ${getThemeColor('primary-bg')} hover:bg-opacity-20 ${getThemeColor('primary-text')} border ${getThemeColor('primary-border')} text-xs py-2 rounded-lg font-bold transition active:scale-[0.98]`}
                  >
                    Authorize Patient Discharge
                  </button>
                </form>
              </div>

              {/* Rounds History & Trend Visualizer */}
              <div className="border-t border-slate-850 pt-4 space-y-3">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
                  <Activity size={12} className={getThemeColor('primary-text')} /> Vitals History & Trends ({observations.length} rounds logged)
                </span>
                {observations.length > 0 ? (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {observations.map((obs, idx) => (
                      <div key={obs.id} className="bg-slate-955/60 border border-slate-850 rounded-lg p-2.5 text-xs flex justify-between items-center gap-4">
                        <div className="space-y-0.5">
                          <span className="text-2xs text-slate-550 block font-semibold">ROUND #{idx + 1} - {new Date(obs.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                          <p className="text-slate-300 italic text-[11px] font-medium">"{obs.observations_notes || 'No notes entered.'}"</p>
                        </div>
                        <div className="flex gap-3 text-right shrink-0">
                          <div>
                            <span className="text-[9px] text-slate-500 block">TEMP</span>
                            <span className={`font-bold font-mono ${obs.temperature >= 38 ? 'text-red-400' : getThemeColor('primary-text')}`}>{obs.temperature}°C</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">PULSE</span>
                            <span className="font-bold font-mono text-slate-205">{obs.pulse_rate} bpm</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">BP</span>
                            <span className="font-bold font-mono text-slate-205">{obs.bp_systolic}/{obs.bp_diastolic}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic p-4 text-center border border-dashed border-slate-850 rounded-lg">
                    No clinical observations logged yet for this admission.
                  </div>
                )}
              </div>

              {/* Automatic Discharge Summary Live Preview */}
              {dischargeNotes.trim() && (
                <div className="border-t border-slate-850 pt-4 space-y-2">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wide block">Automated Discharge Summary (Draft Preview)</span>
                  <div className={`bg-slate-955 border ${getThemeColor('primary-border')} rounded-xl p-4 text-xs font-sans text-slate-300 space-y-2.5`}>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                      <span className="font-bold text-slate-200">EGOTECH GENERAL HOSPITAL</span>
                      <span className="font-mono text-2xs text-slate-400 font-bold">CASE SUMMARY: {selectedAdmission.id.toUpperCase()}</span>
                    </div>
                    <div className="space-y-1">
                      <p><span className="text-slate-500">Patient:</span> <span className="font-bold text-slate-200">{selectedAdmission.patient?.name}</span> ({selectedAdmission.patient?.gender}, Age {getPatientAge(selectedAdmission.patient?.dob)})</p>
                      <p><span className="text-slate-500">Admission Date:</span> {new Date(selectedAdmission.admission_datetime).toLocaleDateString()}</p>
                      <p><span className="text-slate-500">Discharge Date:</span> {new Date().toLocaleDateString()} (Today)</p>
                      <p><span className="text-slate-500">Length of Stay:</span> {Math.max(1, Math.ceil((new Date() - new Date(selectedAdmission.admission_datetime)) / (1000 * 60 * 60 * 24)))} Day(s)</p>
                      <p><span className="text-slate-500">Logged Rounds:</span> {observations.length} rounds of clinical observations charted.</p>
                      {observations.length > 0 && (
                        <p><span className="text-slate-500">Last Vitals recorded:</span> Temp: {observations[observations.length - 1].temperature}°C, BP: {observations[observations.length - 1].bp_systolic}/{observations[observations.length - 1].bp_diastolic} mmHg, Pulse: {observations[observations.length - 1].pulse_rate} bpm</p>
                      )}
                      <p className="pt-1.5 border-t border-slate-850"><span className="text-slate-200 font-bold block uppercase text-2xs">Discharge Notes & Instructions:</span> "{dischargeNotes}"</p>
                    </div>
                    <div className="flex justify-between items-center text-2xs text-slate-400 pt-2 border-t border-slate-850">
                      <span>Sync Target: Ministry of Health (HIE)</span>
                      <span>Authorized by: Dr. {user.full_name}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {inpatientTab === 'visitors' && (
                <div className="space-y-6">
                  {/* Caretakers List Section */}
                  <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={12} className="text-teal-450" /> Authorized Caretakers & Allowed Visitors
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddCaretaker(!showAddCaretaker)}
                        className="text-2xs text-teal-400 border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 px-2 py-1 rounded cursor-pointer transition font-bold font-sans"
                      >
                        {showAddCaretaker ? 'Cancel' : '+ Add Authorized Person'}
                      </button>
                    </div>

                    {showAddCaretaker && (
                      <form onSubmit={handleAddCaretaker} className="bg-slate-900 border border-slate-850 p-3 rounded-lg space-y-3 font-sans text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                            <input
                              type="text"
                              value={newCaretaker.name}
                              onChange={(e) => setNewCaretaker({...newCaretaker, name: e.target.value})}
                              placeholder="e.g. Mary Jane"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Relationship</label>
                            <select
                              value={newCaretaker.relationship}
                              onChange={(e) => setNewCaretaker({...newCaretaker, relationship: e.target.value})}
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                            >
                              <option value="Spouse">Spouse</option>
                              <option value="Parent">Parent</option>
                              <option value="Sibling">Sibling</option>
                              <option value="Child">Child</option>
                              <option value="Relative">Relative</option>
                              <option value="Friend">Friend</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Phone Number (with Code)</label>
                            <input
                              type="text"
                              value={newCaretaker.phone_number}
                              onChange={(e) => setNewCaretaker({...newCaretaker, phone_number: e.target.value})}
                              placeholder="e.g. +254712345678"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-4 items-center bg-slate-955/50 p-2 rounded">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newCaretaker.is_primary_caretaker}
                              onChange={(e) => setNewCaretaker({...newCaretaker, is_primary_caretaker: e.target.checked})}
                              className="accent-teal-500"
                            />
                            Primary Contact (Alerts)
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newCaretaker.is_allowed_visitor}
                              onChange={(e) => setNewCaretaker({...newCaretaker, is_allowed_visitor: e.target.checked})}
                              className="accent-teal-500"
                            />
                            Allowed Entry (Visitor)
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs py-1.5 rounded transition cursor-pointer"
                        >
                          {loading ? 'Registering...' : 'Save Authorized Person'}
                        </button>
                      </form>
                    )}

                    {caretakers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {caretakers.map((c) => (
                          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex justify-between items-center text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-200">{c.name}</span>
                                <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded-full font-bold font-sans">
                                  {c.relationship}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-2xs text-slate-500">
                                <span>Phone: <span className="font-mono text-slate-400">{c.phone_number}</span></span>
                              </div>
                              <div className="flex gap-1.5 pt-0.5">
                                {c.is_primary_caretaker && (
                                  <span className="text-[8px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider font-sans">
                                    Primary Contact
                                  </span>
                                )}
                                {c.is_allowed_visitor ? (
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider font-sans">
                                    Allowed Entry
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider font-sans">
                                    Blocked / No Entry
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCaretaker(c.id)}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-3 text-center border border-dashed border-slate-850 rounded-lg bg-slate-900/20">
                        No caretakers registered. Add authorized family members to allow entry and receive automated WhatsApp alerts.
                      </div>
                    )}
                  </div>

                  {/* Visitor Logs Section */}
                  <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={12} className="text-teal-450" /> Security Visitor Tracking Logs
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCheckInVisitor(!showCheckInVisitor)}
                        className="text-2xs text-teal-400 border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 px-2 py-1 rounded cursor-pointer transition font-bold font-sans"
                      >
                        {showCheckInVisitor ? 'Cancel' : 'Log Visitor Check-In'}
                      </button>
                    </div>

                    {showCheckInVisitor && (
                      <form onSubmit={handleVisitorCheckIn} className="bg-slate-900 border border-slate-850 p-3 rounded-lg space-y-3 font-sans text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Visitor Name</label>
                            <input
                              type="text"
                              value={newVisitor.visitor_name}
                              onChange={(e) => setNewVisitor({...newVisitor, visitor_name: e.target.value})}
                              placeholder="e.g. David Cooper"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                            <input
                              type="text"
                              value={newVisitor.visitor_phone}
                              onChange={(e) => setNewVisitor({...newVisitor, visitor_phone: e.target.value})}
                              placeholder="e.g. +254700000000"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">ID / Passport Number</label>
                            <input
                              type="text"
                              value={newVisitor.visitor_id_number}
                              onChange={(e) => setNewVisitor({...newVisitor, visitor_id_number: e.target.value})}
                              placeholder="e.g. 34928402"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Claimed Relation</label>
                            <input
                              type="text"
                              value={newVisitor.relationship_to_patient}
                              onChange={(e) => setNewVisitor({...newVisitor, relationship_to_patient: e.target.value})}
                              placeholder="e.g. Uncle, Spouse"
                              className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Security / Observations Notes</label>
                          <textarea
                            rows="2"
                            value={newVisitor.security_notes}
                            onChange={(e) => setNewVisitor({...newVisitor, security_notes: e.target.value})}
                            placeholder="e.g. Bag searched. Authorized visitor."
                            className="w-full bg-slate-955 border border-slate-800 rounded py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs py-1.5 rounded transition cursor-pointer"
                        >
                          {loading ? 'Processing Check-in...' : 'Check In Visitor (Dispatches SMS/WhatsApp Alert)'}
                        </button>
                      </form>
                    )}

                    {/* Active Visitors list */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Active Visits ({visitorLogs.filter(v => v.status === 'active' || v.status === 'flagged').length})</span>
                      {visitorLogs.filter(v => v.status === 'active' || v.status === 'flagged').length > 0 ? (
                        <div className="space-y-2">
                          {visitorLogs.filter(v => v.status === 'active' || v.status === 'flagged').map((log) => (
                            <div key={log.id} className={`border rounded-lg p-3 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${log.status === 'flagged' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-850'}`}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-200">{log.visitor_name}</span>
                                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                                    ID: {log.visitor_id_number}
                                  </span>
                                  {log.status === 'flagged' && (
                                    <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider font-sans">
                                      Flagged / Unauthorized
                                    </span>
                                  )}
                                </div>
                                <div className="text-2xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>Phone: <span className="font-mono text-slate-400">{log.visitor_phone}</span></span>
                                  <span>Relation: <span className="text-slate-400">{log.relationship_to_patient}</span></span>
                                  <span>In: <span className="text-teal-400 font-mono">{new Date(log.check_in_datetime).toLocaleTimeString()}</span></span>
                                </div>
                                {log.security_notes && (
                                  <p className="text-[10.5px] text-slate-450 bg-slate-950/40 p-1.5 rounded italic">
                                    "{log.security_notes}"
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleVisitorCheckOut(log.id)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-2xs font-bold rounded-lg transition-all cursor-pointer text-slate-350 self-end sm:self-auto"
                              >
                                Check Out
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-2xs text-slate-500 italic p-3 text-center border border-dashed border-slate-850 rounded bg-slate-900/10">
                          No active visitors currently in the ward.
                        </div>
                      )}
                    </div>

                    {/* Past Visitors list */}
                    <div className="space-y-2 pt-2 border-t border-slate-850/50">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">History Logs ({visitorLogs.filter(v => v.status === 'completed').length})</span>
                      {visitorLogs.filter(v => v.status === 'completed').length > 0 ? (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {visitorLogs.filter(v => v.status === 'completed').map((log) => (
                            <div key={log.id} className="bg-slate-955/40 border border-slate-850/80 rounded-lg p-2.5 text-xs flex justify-between items-center gap-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-300">{log.visitor_name}</span>
                                  <span className="text-[8px] bg-slate-900 text-slate-550 px-1 rounded-full font-mono">ID: {log.visitor_id_number}</span>
                                </div>
                                <div className="text-[9.5px] text-slate-500 flex gap-3">
                                  <span>In: <span className="font-mono">{new Date(log.check_in_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span></span>
                                  <span>Out: <span className="font-mono">{new Date(log.check_out_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span></span>
                                </div>
                              </div>
                              <span className="text-[9px] bg-slate-900 text-slate-500 border border-slate-850 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-sans">
                                Checked Out
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-2xs text-slate-500 italic p-3 text-center">
                          No history visitor logs recorded for this admission.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* MOH DISCHARGE COMPLETION VERIFICATION MODAL */}
      {showMOHModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-80 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Activity size={16} className={getThemeColor('primary-text')} /> Ministry of Health (MOH) Inpatient Sync
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">Kenya Health Information Exchange (HIE) Compliance check</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowMOHModal(false);
                  setValidationError(null);
                }}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {validationError && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-xs flex gap-2 animate-pulse">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="bg-slate-955/50 border border-slate-850 p-3.5 rounded-xl space-y-2">
                <span className="font-bold text-slate-350 block uppercase text-[9px] tracking-wider mb-1">Verify Inpatient Demographics</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-550">Name:</span> <span className="text-slate-300 font-bold">{selectedAdmission.patient?.name}</span></div>
                  <div><span className="text-slate-550">Gender:</span> <span className="text-slate-300 font-bold uppercase">{selectedAdmission.patient?.gender}</span></div>
                  <div><span className="text-slate-550">Age:</span> <span className="text-slate-300 font-bold">{getPatientAge(selectedAdmission.patient?.dob)} years</span></div>
                  <div><span className="text-slate-550">Assigned Bed:</span> <span className={`${getThemeColor('primary-text')} font-bold`}>{selectedAdmission.bed}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="font-bold text-slate-355 block uppercase text-[9px] tracking-wider">Required MOH Compliance Fields</span>

                {/* Village field */}
                <div className="bg-slate-950/20 border border-slate-850/80 p-3 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 flex items-center gap-1">
                      <MapPin size={11} className="text-slate-500" /> Patient Village / Residence *
                    </label>
                    {mohVillage ? (
                      <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.2 rounded">✓ Captured</span>
                    ) : (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded">⚠️ Missing</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={mohVillage}
                    onChange={(e) => setMohVillage(e.target.value)}
                    placeholder="e.g. Kawangware / Riruta"
                    className={`w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-202 focus:outline-none ${getThemeColor('focus-border')}`}
                    required
                  />
                </div>

                {/* Vital signs checks */}
                <div className="bg-slate-955/20 border border-slate-850/80 p-3 rounded-lg space-y-3">
                  <span className="font-bold text-slate-355 block uppercase text-[8px] tracking-wider">Triage & Vital Signs Parameters</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Temperature */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-2xs">
                        <span className="text-slate-400">Temperature (°C) *</span>
                        {mohTemp ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">⚠️</span>}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={mohTemp}
                        onChange={(e) => setMohTemp(e.target.value)}
                        placeholder="e.g. 37.0"
                        className={`w-full bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')}`}
                        required
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-2xs">
                        <span className="text-slate-400">Weight (kg) *</span>
                        {mohWeight ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">⚠️</span>}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={mohWeight}
                        onChange={(e) => setMohWeight(e.target.value)}
                        placeholder="e.g. 70.0"
                        className={`w-full bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')}`}
                        required
                      />
                    </div>
                  </div>

                  {/* BP for Adults */}
                  {getPatientAge(selectedAdmission.patient?.dob) >= 18 && (
                    <div className="space-y-1.5 border-t border-slate-850/60 pt-2.5">
                      <div className="flex justify-between text-2xs font-sans">
                        <span className="text-slate-400 font-bold">Blood Pressure (Required for Adults &gt;= 18 yrs) *</span>
                        {(mohSystolic && mohDiastolic) ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">⚠️</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3 font-sans">
                        <input
                          type="number"
                          value={mohSystolic}
                          onChange={(e) => setMohSystolic(e.target.value)}
                          placeholder="Systolic (e.g. 120)"
                          className={`w-full bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')}`}
                          required
                        />
                        <input
                          type="number"
                          value={mohDiastolic}
                          onChange={(e) => setMohDiastolic(e.target.value)}
                          placeholder="Diastolic (e.g. 80)"
                          className={`w-full bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-202 text-center focus:outline-none ${getThemeColor('focus-border')}`}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="confirmMOH"
                  checked={mohConfirmed}
                  onChange={(e) => setMohConfirmed(e.target.checked)}
                  className={`${getThemeColor('accent-color')} h-4 w-4 bg-slate-950 border-slate-800 rounded cursor-pointer mt-0.5`}
                />
                <label htmlFor="confirmMOH" className="text-[11px] text-slate-400 leading-normal cursor-pointer select-none">
                  I confirm that all Ministry of Health (MOH) data fields are fully captured and verified for this inpatient discharge.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMOHModal(false);
                  setValidationError(null);
                }}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-350 rounded-lg text-xs font-bold transition"
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                disabled={!mohConfirmed || !mohVillage || !mohTemp || !mohWeight || (getPatientAge(selectedAdmission.patient?.dob) >= 18 && (!mohSystolic || !mohDiastolic))}
                onClick={() => handleDischarge()}
                className={`px-5 py-2 ${getThemeColor('accent-btn')} disabled:opacity-40 font-black rounded-lg text-xs transition active:scale-[0.98]`}
              >
                Verify & Complete Discharge Lifecycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR OBSERVATIONS HISTORY DETAILS OVERLAY */}
      {selectedCalendarDay && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-850 pb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                  Day {selectedCalendarDay.dayNumber} Check-in Logs
                </h4>
                <span className="text-2xs text-slate-500 font-mono">Target Date: {selectedCalendarDay.date}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCalendarDay(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {selectedCalendarDay.records.map((obs, idx) => (
                <div key={obs.id} className="bg-slate-955 border border-slate-850 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-[9px] text-slate-550 font-mono">
                    <span>ROUND #{obs.round_number || (idx + 1)}</span>
                    <span>{new Date(obs.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-[8px] text-slate-500 block">TEMP</span>
                      <span className={`text-2xs font-bold ${obs.temperature >= 38 ? 'text-red-400' : getThemeColor('primary-text')}`}>
                        {obs.temperature ? `${obs.temperature}°C` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-[8px] text-slate-500 block">BP</span>
                      <span className="text-2xs font-bold text-slate-200">
                        {obs.bp_systolic && obs.bp_diastolic ? `${obs.bp_systolic}/${obs.bp_diastolic}` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-[8px] text-slate-500 block">PULSE</span>
                      <span className="text-2xs font-bold text-slate-200">
                        {obs.pulse_rate ? `${obs.pulse_rate} bpm` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-[9px]">
                    <div className="bg-slate-900 p-1 rounded">
                      <span className="text-[8px] text-slate-500 block">RESP RATE</span>
                      <span className="font-bold text-slate-300">{obs.respiratory_rate || '16'} bpm</span>
                    </div>
                    <div className="bg-slate-900 p-1 rounded">
                      <span className="text-[8px] text-slate-500 block">SPO2</span>
                      <span className="font-bold text-slate-355">{obs.oxygen_saturation || '98'}%</span>
                    </div>
                  </div>

                  {(obs.medications_given || obs.fluids_administered) && (
                    <div className="bg-slate-900/60 p-2 rounded text-2xs space-y-1">
                      {obs.medications_given && (
                        <div>
                          <strong className="text-slate-450">Meds:</strong> <span className="text-slate-300">{obs.medications_given}</span>
                        </div>
                      )}
                      {obs.fluids_administered && (
                        <div>
                          <strong className="text-slate-455">Fluids:</strong> <span className="text-slate-300">{obs.fluids_administered}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {obs.observations_notes && (
                    <div className="text-slate-300 italic bg-slate-900/20 p-2 rounded border border-slate-900">
                      "{obs.observations_notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomCareDate(selectedCalendarDay.date);
                setSelectedCalendarDay(null);
                setMessage({ type: 'success', text: `Logging additional observation round for ${selectedCalendarDay.date}` });
              }}
              className={`w-full ${getThemeColor('primary-bg')} hover:bg-opacity-20 ${getThemeColor('primary-text')} border ${getThemeColor('primary-border')} text-xs py-2 rounded-lg font-bold transition cursor-pointer font-sans`}
            >
              Log Another Round for this Day
            </button>
          </div>
        </div>
      )}

      {/* MOBILE OBSERVATIONS ENTRY DRAWER/MODAL */}
      {showVitalsModal && selectedAdmission && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-80 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Thermometer size={16} className="text-teal-400" /> Chart Observations: {selectedAdmission.bed}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">Patient: {selectedAdmission.patient?.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowVitalsModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                await handleLogObservation(e);
                setShowVitalsModal(false);
              }}
              className="flex-1 overflow-y-auto pr-1 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder="e.g. 36.8"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Blood Pressure</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="e.g. 120/80"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="e.g. 72"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Resp Rate (bpm)</label>
                  <input
                    type="number"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    placeholder="e.g. 16"
                    className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Oxygen Sat (SPO2 %)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="e.g. 98"
                    className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pain Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={painScore}
                    onChange={(e) => setPainScore(e.target.value)}
                    placeholder="0 to 10"
                    className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Medications Given</label>
                <input
                  type="text"
                  value={medsGiven}
                  onChange={(e) => setMedsGiven(e.target.value)}
                  placeholder="e.g. Paracetamol 1g PO"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fluids Administered</label>
                <input
                  type="text"
                  value={fluidsAdmin}
                  onChange={(e) => setFluidsAdmin(e.target.value)}
                  placeholder="e.g. Normal Saline 500ml IV"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Clinical Progress Round Notes</label>
                <textarea
                  rows="3"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="flex-1 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 ${getThemeColor('accent-btn')} font-black rounded-lg text-xs transition cursor-pointer`}
                >
                  {loading ? 'Saving...' : 'Save Observations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE ADMIT PATIENT MODAL */}
      {showAdmissionModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <PlusCircle size={15} className="text-teal-400" /> Admit Patient
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdmissionModal(false)}
                className="text-slate-450 hover:text-slate-200 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleAdmit(e);
                setShowAdmissionModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.facility_id_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Bed</label>
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg font-bold text-slate-300 font-mono">
                  {beds.find(b => b.id === targetBedId)?.bed_number || 'No bed selected'}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="flex-1 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 ${getThemeColor('accent-btn')} font-black rounded-lg text-xs transition cursor-pointer`}
                >
                  {loading ? 'Admitting...' : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE AUTHORIZE DISCHARGE SUMMARY MODAL */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <ClipboardList size={15} className="text-teal-400" /> Authorize Patient Discharge
              </h3>
              <button 
                type="button" 
                onClick={() => setShowDischargeModal(false)}
                className="text-slate-450 hover:text-slate-200 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setShowDischargeModal(false);
                await handleDischargeClick(e);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <span className="text-2xs text-slate-500 block">Patient Name</span>
                <div className="font-bold text-slate-200 mt-0.5">{selectedAdmission.patient?.name}</div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discharge Diagnoses & Instructions *</label>
                <textarea
                  rows="4"
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Write instructions/diagnoses..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="flex-1 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 ${getThemeColor('accent-btn')} font-black rounded-lg text-xs transition cursor-pointer`}
                >
                  Authorize Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
