import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { sendNotification, parsePatientContact } from '../../notificationService';
import { Bed, PlusCircle, CheckCircle, AlertCircle, ClipboardList, Thermometer, MapPin, Activity, Heart } from 'lucide-react';

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
  const [theme, setTheme] = useState(() => localStorage.getItem("egesa_theme") || "slate");

  useEffect(() => {
    const checkTheme = () => {
      const activeTheme = localStorage.getItem("egesa_theme") || "slate";
      if (activeTheme !== theme) {
        setTheme(activeTheme);
      }
    };
    const interval = setInterval(checkTheme, 500);
    return () => clearInterval(interval);
  }, [theme]);

  const getThemeColor = (key) => {
    const isEmerald = theme === 'emerald';
    const isNavy = theme === 'navy';

    switch (key) {
      case 'primary-text':
        return isEmerald ? 'text-emerald-400' : isNavy ? 'text-blue-400' : 'text-teal-400';
      case 'primary-bg':
        return isEmerald ? 'bg-emerald-500/10' : isNavy ? 'bg-blue-500/10' : 'bg-teal-500/10';
      case 'primary-border':
        return isEmerald ? 'border-emerald-500/20' : isNavy ? 'border-blue-500/20' : 'border-teal-500/20';
      case 'accent-btn':
        return isEmerald ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950' : isNavy ? 'bg-blue-500 hover:bg-blue-600 text-slate-950' : 'bg-teal-500 hover:bg-teal-600 text-slate-950';
      case 'compliance-checked':
        return isEmerald 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
          : isNavy 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20';
      case 'compliance-today':
        return isEmerald
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse'
          : isNavy
          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 animate-pulse'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse';
      case 'compliance-missed':
        return isEmerald
          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
          : isNavy
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
          : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
      case 'focus-border':
        return isEmerald ? 'focus:border-emerald-500' : isNavy ? 'focus:border-blue-500' : 'focus:border-teal-500';
      case 'bed-selected':
        return isEmerald
          ? 'border-emerald-500 bg-emerald-500/10 text-white'
          : isNavy
          ? 'border-blue-500 bg-blue-500/10 text-white'
          : 'border-teal-500 bg-teal-500/10 text-white';
      case 'accent-color':
        return isEmerald ? 'accent-emerald-500' : isNavy ? 'accent-blue-500' : 'accent-teal-500';
      default:
        return '';
    }
  };

  return { theme, getThemeColor };
}

export default function Ward({ user }) {
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

  useEffect(() => {
    fetchWardData();
  }, []);

  useEffect(() => {
    if (selectedAdmission) {
      fetchObservations(selectedAdmission.id);
      sessionStorage.setItem('egesa_selected_admission_id_ward', selectedAdmission.id);
    } else {
      setObservations([]);
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

      setMessage({ type: 'success', text: `Patient successfully admitted to ${selectedBed.bed_number}.` });
      
      // Trigger Notification
      try {
        const patient = patients.find(p => p.id === selectedPatientId);
        const contactInfo = parsePatientContact(patient?.phone);
        if (contactInfo.email) {
          await sendNotification('INPATIENT_ADMITTED', {
            patientName: patient.name,
            patientCode: patient.facility_id_code,
            bedName: selectedBed.bed_number,
            admittedBy: user.full_name,
            recipientEmail: contactInfo.email
          }, user.facility_id);
        }
      } catch (e) {
        console.error('Admission email trigger failed:', e);
      }

      setSelectedPatientId('');
      fetchWardData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Admission failed.' });
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

      setMessage({ type: 'success', text: 'Clinical observations charted successfully.' });
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
      setMessage({ type: 'error', text: err.message || 'Failed to chart observations.' });
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
            recipientEmail: contactInfo.email
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

      setMessage({ type: 'success', text: 'Patient successfully discharged. Bed freed.' });
      setDischargeNotes('');
      setShowMOHModal(false);
      fetchWardData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Discharge failed.' });
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
      {/* Bed Layout Grid Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Bed size={14} className={getThemeColor('primary-text')} /> Inpatient Ward Map (Active Occupancy)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {beds.map((bed) => {
            const occupant = admissions.find(a => a.bed_id === bed.id);
            const isSelected = occupant && selectedAdmission?.id === occupant.id;
            return (
              <button
                key={bed.id}
                onClick={() => {
                  if (occupant) {
                    setSelectedAdmission(occupant);
                    setMessage({ type: '', text: '' });
                  }
                }}
                className={`border rounded-xl p-4 flex flex-col justify-between text-center min-h-[120px] transition ${
                  occupant
                    ? isSelected
                      ? `${getThemeColor('bed-selected')} shadow shadow-teal-500/10`
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    : bed.bed_status === 'maintenance'
                      ? 'border-red-900/50 bg-red-950/10 text-red-400'
                      : 'border-slate-855/65 bg-slate-950/20 border-dashed text-slate-600 hover:border-slate-700'
                }`}
              >
                <Bed size={22} className={occupant ? `${getThemeColor('primary-text')} mx-auto animate-pulse` : bed.bed_status === 'maintenance' ? 'text-red-500 mx-auto' : 'text-slate-700 mx-auto'} />
                <span className="text-xs font-bold font-mono mt-2">{bed.bed_number}</span>
                <span className="text-[10px] truncate max-w-full font-semibold block mt-0.5 text-slate-400">
                  {occupant ? occupant.patient?.name.split(' ')[0] : bed.bed_status === 'maintenance' ? 'Maint' : 'Vacant'}
                </span>
                {!occupant && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBedStatus(bed.id, bed.bed_status === 'clean' ? 'maintenance' : 'clean');
                    }}
                    className={`text-[9px] ${getThemeColor('primary-text')} underline cursor-pointer mt-1.5 block font-medium`}
                  >
                    {bed.bed_status === 'clean' ? 'Maint' : 'Clean'}
                  </span>
                )}
              </button>
            );
          })}
          {beds.length === 0 && (
            <div className="col-span-full py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No beds configured.
            </div>
          )}
        </div>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Patient</label>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Bed</label>
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
                  <span className={`text-[10px] ${getThemeColor('primary-text')} font-bold uppercase tracking-wider`}>{selectedAdmission.bed} Inpatient File</span>
                  <h4 className="text-sm font-bold text-slate-100">{selectedAdmission.patient?.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedAdmission.patient?.facility_id_code}</span>
                </div>
              </div>

              {/* Clinical Progress Calendar */}
              <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5 font-sans">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Discharge Patient Summary</span>
                  
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
                  <Activity size={12} className={getThemeColor('primary-text')} /> Vitals History & Trends ({observations.length} rounds logged)
                </span>
                {observations.length > 0 ? (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {observations.map((obs, idx) => (
                      <div key={obs.id} className="bg-slate-955/60 border border-slate-850 rounded-lg p-2.5 text-xs flex justify-between items-center gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-550 block font-semibold">ROUND #{idx + 1} - {new Date(obs.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Automated Discharge Summary (Draft Preview)</span>
                  <div className={`bg-slate-955 border ${getThemeColor('primary-border')} rounded-xl p-4 text-xs font-sans text-slate-300 space-y-2.5`}>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                      <span className="font-bold text-slate-200">EGOTECH GENERAL HOSPITAL</span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">CASE SUMMARY: {selectedAdmission.id.toUpperCase()}</span>
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
                      <p className="pt-1.5 border-t border-slate-850"><span className="text-slate-200 font-bold block uppercase text-[10px]">Discharge Notes & Instructions:</span> "{dischargeNotes}"</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-850">
                      <span>Sync Target: Ministry of Health (HIE)</span>
                      <span>Authorized by: Dr. {user.full_name}</span>
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
                <p className="text-[10px] text-slate-500 mt-0.5">Kenya Health Information Exchange (HIE) Compliance check</p>
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
                      <div className="flex justify-between text-[10px]">
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
                      <div className="flex justify-between text-[10px]">
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
                      <div className="flex justify-between text-[10px] font-sans">
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
                <span className="text-[10px] text-slate-500 font-mono">Target Date: {selectedCalendarDay.date}</span>
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
                      <span className={`text-[10px] font-bold ${obs.temperature >= 38 ? 'text-red-400' : getThemeColor('primary-text')}`}>
                        {obs.temperature ? `${obs.temperature}°C` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-[8px] text-slate-500 block">BP</span>
                      <span className="text-[10px] font-bold text-slate-200">
                        {obs.bp_systolic && obs.bp_diastolic ? `${obs.bp_systolic}/${obs.bp_diastolic}` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-[8px] text-slate-500 block">PULSE</span>
                      <span className="text-[10px] font-bold text-slate-200">
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
                    <div className="bg-slate-900/60 p-2 rounded text-[10px] space-y-1">
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
    </div>
  );
}
