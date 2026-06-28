import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Activity,
  ShieldAlert,
  CheckCircle,
  Search,
  FileText,
  ClipboardList,
  Baby,
  Compass,
  AlertTriangle,
  Clipboard,
  ShieldAlert as WarnIcon,
  FlaskConical
} from "lucide-react";
import { diseaseMaster, medicineMaster, labTestMaster, radiologyTestMaster, surgicalProcedureMaster } from "../../medicalMaster";
import { parsePatientContact, sendWhatsAppNotification } from "../../notificationService";
import { Heart, MapPin, Printer } from "lucide-react";
import DiagnosisAutocomplete from "./DiagnosisAutocomplete";
import InstrumentTracker from "./InstrumentTracker";

const getPatientAge = (dobString) => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export default function Consultation({ user, onComplete, showNotification }) {
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [triageData, setTriageData] = useState(null);
  const [facilityDetails, setFacilityDetails] = useState(null);

  // SOAP & Order States
  const [history, setHistory] = useState("");
  const [exam, setExam] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // Orders
  const [orderedLabs, setOrderedLabs] = useState([]);
  const [orderedRadiology, setOrderedRadiology] = useState([]);
  const [orderedSurgeries, setOrderedSurgeries] = useState([]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [patientHistory, setPatientHistory] = useState(null);

  const [prescriptions, setPrescriptions] = useState([
    { name: "", dosage: "", frequency: "1x1", duration: "3 days", price: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // MOH & AfyaLink validation states
  const [showMOHModal, setShowMOHModal] = useState(false);
  const [mohVillage, setMohVillage] = useState("");
  const [mohTemp, setMohTemp] = useState("");
  const [mohWeight, setMohWeight] = useState("");
  const [mohSystolic, setMohSystolic] = useState("");
  const [mohDiastolic, setMohDiastolic] = useState("");
  const [mohConfirmed, setMohConfirmed] = useState(false);

  // EMR Specialty Template selector states
  const [activeTemplate, setActiveTemplate] = useState('general');
  const [pediatricWeight, setPediatricWeight] = useState('');
  const [pediatricHeadCirc, setPediatricHeadCirc] = useState('');
  const [pediatricMilestones, setPediatricMilestones] = useState('normal');
  const [pediatricImmunizations, setPediatricImmunizations] = useState([]);

  // Specialized Workflow States
  const [activePregnancy, setActivePregnancy] = useState(null);
  const [ancGaWeeks, setAncGaWeeks] = useState(0);
  const [ancEdd, setAncEdd] = useState('');
  const [ancLmp, setAncLmp] = useState('');
  const [ancGravidity, setAncGravidity] = useState(1);
  const [ancParity, setAncParity] = useState(0);
  const [ancAbortions, setAncAbortions] = useState(0);
  
  // ANC Visit fields
  const [ancVisitNumber, setAncVisitNumber] = useState(1);
  const [ancFetalHeartRate, setAncFetalHeartRate] = useState('');
  const [ancFundalHeight, setAncFundalHeight] = useState('');
  const [ancEdema, setAncEdema] = useState(false);
  const [ancTetanusDose, setAncTetanusDose] = useState('');
  const [ancTetanusDate, setAncTetanusDate] = useState('');
  const [ancIronFolateSupplied, setAncIronFolateSupplied] = useState(true);
  const [ancSupplementsCount, setAncSupplementsCount] = useState(30);
  const [ancRiskLevel, setAncRiskLevel] = useState('normal');
  const [ancNextVisitDate, setAncNextVisitDate] = useState('');
  const [ancEnrollLoading, setAncEnrollLoading] = useState(false);
  
  // FP fields
  const [activeFPRecord, setActiveFPRecord] = useState(null);
  const [fpGravidity, setFpGravidity] = useState(0);
  const [fpParity, setFpParity] = useState(0);
  const [fpEligibilityCategory, setFpEligibilityCategory] = useState(1);
  const [fpCounselingProvided, setFpCounselingProvided] = useState(true);
  const [fpMethodSelectedId, setFpMethodSelectedId] = useState('');
  const [fpInsertionDate, setFpInsertionDate] = useState('');
  const [fpSideEffects, setFpSideEffects] = useState('');
  const [fpDiscontinued, setFpDiscontinued] = useState(false);
  const [fpDiscontinuedReason, setFpDiscontinuedReason] = useState('');
  const [contraceptiveMethodsList, setContraceptiveMethodsList] = useState([]);
  
  // FP WHO screening risk factors
  const [fpRiskHypertension, setFpRiskHypertension] = useState(false);
  const [fpRiskSmoking, setFpRiskSmoking] = useState(false);
  const [fpRiskBreastfeeding, setFpRiskBreastfeeding] = useState(false);
  const [fpRiskPid, setFpRiskPid] = useState(false);
  const [fpRiskBleeding, setFpRiskBleeding] = useState(false);
  const [fpWhoResult, setFpWhoResult] = useState(null);

  // Medical instrument binding
  const [boundInstrumentId, setBoundInstrumentId] = useState('');

  const [aiMedicalReportResult, setAiMedicalReportResult] = useState(null);
  const [aiMedicalReportLoading, setAiMedicalReportLoading] = useState(false);
  const [aiMedicalReportError, setAiMedicalReportError] = useState('');

  const handleAiWriteMedicalReport = async () => {
    const symptoms = (history + ' ' + exam).trim();
    const diagnosisText = diagnosis || 'Pending diagnosis';
    const plan = treatmentPlan || 'Standard follow-up and review';
    setAiMedicalReportLoading(true);
    setAiMedicalReportError('');
    setAiMedicalReportResult(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const payload = {
        mode: 'soap',
        prompt: `Write a formal medical consultation report using the following clinical details. Format as a structured clinical report.`,
        context: { symptoms, diagnosisText, plan, userName: user.full_name }
      };
      const res = await fetch(`${apiBase}/ai-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI medical report failed');
      }
      const data = await res.json();
      setAiMedicalReportResult(data.content || data.response || data);
    } catch (err) {
      setAiMedicalReportError(err.message || 'Failed to generate medical report');
    } finally {
      setAiMedicalReportLoading(false);
    }
  };

  // AI Diagnosis states
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiDiagnose = async () => {
    const symptoms = (history + ' ' + exam).trim();
    if (!symptoms) {
      setAiError('Please describe the patient symptoms or history first.');
      setAiDiagnosisResult(null);
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiDiagnosisResult(null);

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/ai-diagnose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symptoms })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `AI diagnosis request failed with status ${res.status}`);
      }

      const data = await res.json();
      setAiDiagnosisResult(data);
    } catch (err) {
      setAiError(err.message || 'Failed to run AI diagnosis.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchContraceptiveMethods();
  }, []);

  const fetchContraceptiveMethods = async () => {
    try {
      const { data } = await supabase.from('contraceptive_methods').select('*');
      if (data) setContraceptiveMethodsList(data);
    } catch (err) {
      console.error("Failed to load contraceptive methods:", err);
    }
  };

  const handleEnrollPregnancy = async (e) => {
    e.preventDefault();
    if (!ancLmp || !selectedVisit) return;
    setAncEnrollLoading(true);
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/workflows/anc/calculate-gestational-age`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lmp_date: ancLmp })
      });
      
      if (!res.ok) throw new Error("Failed to calculate GA from LMP");
      const calc = await res.json();

      const pregId = 'prg_' + Math.random().toString(36).substring(2, 12);
      const newPreg = {
        id: pregId,
        patient_id: selectedVisit.patient_id,
        facility_id: user.facility_id,
        lmp_date: ancLmp,
        estimated_delivery_date: calc.estimated_delivery_date,
        gravidity: parseInt(ancGravidity) || 1,
        parity: parseInt(ancParity) || 0,
        abortions: parseInt(ancAbortions) || 0,
        current_gestational_age_weeks: calc.gestational_age_weeks,
        conception_date: calc.conception_date,
        is_active: true
      };

      const { error } = await supabase.from('pregnancies').insert(newPreg);
      if (error) throw error;

      setActivePregnancy(newPreg);
      setAncGaWeeks(calc.gestational_age_weeks);
      setAncEdd(calc.estimated_delivery_date);
      setAncNextVisitDate(calc.suggested_next_visit_date);
      setMessage({ type: "success", text: "Patient successfully enrolled in ANC pregnancy profile!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setAncEnrollLoading(false);
    }
  };

  const checkFpEligibility = async () => {
    if (!fpMethodSelectedId || contraceptiveMethodsList.length === 0) return;
    const methodObj = contraceptiveMethodsList.find(m => m.id === fpMethodSelectedId);
    if (!methodObj) return;

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/workflows/fp/who-criteria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          method_code: methodObj.method_code,
          medical_conditions: {
            hypertension: fpRiskHypertension,
            smoking: fpRiskSmoking,
            breastfeeding: fpRiskBreastfeeding,
            pid_active: fpRiskPid,
            unexplained_bleeding: fpRiskBleeding,
            age: patientAge
          }
        })
      });
      if (res.ok) {
        const eligibilityData = await res.json();
        setFpEligibilityCategory(eligibilityData.category);
        setFpWhoResult(eligibilityData);
      }
    } catch (err) {
      console.error("Error evaluating FP WHO eligibility:", err);
    }
  };

  useEffect(() => {
    if (fpMethodSelectedId) {
      checkFpEligibility();
    }
  }, [fpMethodSelectedId, fpRiskHypertension, fpRiskSmoking, fpRiskBreastfeeding, fpRiskPid, fpRiskBleeding]);

  const renderPregnancyProgress = () => {
    if (!ancGaWeeks) return null;
    const progressPercent = Math.min(100, (ancGaWeeks / 40) * 100);
    let trimester = "1st Trimester";
    let trimesterColor = "from-emerald-500 to-teal-500";
    if (ancGaWeeks > 12 && ancGaWeeks <= 26) {
      trimester = "2nd Trimester";
      trimesterColor = "from-teal-500 to-cyan-500";
    } else if (ancGaWeeks > 26) {
      trimester = "3rd Trimester";
      trimesterColor = "from-cyan-500 to-indigo-500";
    }
    return (
      <div className="space-y-2 bg-slate-950/70 border border-slate-900 rounded-xl p-4">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-400">Pregnancy Progress Timeline ({ancGaWeeks} weeks)</span>
          <span className="text-teal-400 font-extrabold uppercase tracking-wide">{trimester}</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 overflow-hidden p-[2px]">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${trimesterColor} transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span>LMP: {activePregnancy?.lmp_date}</span>
          <span>EDD: {ancEdd || activePregnancy?.estimated_delivery_date}</span>
        </div>
      </div>
    );
  };

  const renderFpMethodsTable = () => {
    return (
      <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-850">
              <th className="p-3">Method Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Duration</th>
              <th className="p-3">WHO Category</th>
              <th className="p-3">Common Side Effects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 bg-slate-950/20">
            {contraceptiveMethodsList.map((m) => (
              <tr key={m.id} className="hover:bg-slate-900/40 transition">
                <td className="p-3 font-semibold text-slate-200">{m.method_name}</td>
                <td className="p-3 uppercase font-mono text-[10px] text-teal-400">{m.method_code}</td>
                <td className="p-3 text-slate-400">{m.duration_months === 0 ? 'Short term' : `${m.duration_months} Months`}</td>
                <td className="p-3 text-slate-450 font-bold">
                  {m.id === fpMethodSelectedId ? `Category ${fpEligibilityCategory}` : 'Category 1'}
                </td>
                <td className="p-3 text-[10px] text-slate-500 max-w-xs truncate" title={m.side_effects_list?.join(', ')}>
                  {m.side_effects_list?.join(', ') || 'None reported'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const patientAge = selectedVisit?.patient ? getPatientAge(selectedVisit.patient.dob) : 0;
  const patientGender = selectedVisit?.patient?.gender || "unknown";

  const availableDrugs = medicineMaster.map((m) => ({
    name: `${m.genericName} (${m.brandName || ""}) ${m.strength}`.trim(),
    genericName: m.genericName,
    price: m.price,
    unit: m.unit,
    id: m.id,
    controlled: m.controlledDrugFlag,
    childSafe: m.childSafeFlag,
    pregnancySafe: m.pregnancySafeFlag,
    lactationSafe: m.lactationSafeFlag,
    strength: m.strength
  }));

  const icd10Diagnoses = diseaseMaster.map((d) => `${d.name} (${d.code})`);

  useEffect(() => {
    fetchConsultationQueue();
    fetchFacilityDetails();
  }, []);

  const fetchFacilityDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', user.facility_id)
        .single();
      if (!error && data) {
        setFacilityDetails(data);
      }
    } catch (err) {
      console.error('Error fetching facility details:', err);
    }
  };

  const getLabPrice = (testName) => {
    if (facilityDetails?.services_list) {
      const matched = facilityDetails.services_list.find(
        (s) => s.name.toLowerCase() === testName.toLowerCase() && (s.category === "Lab" || s.category === "Laboratory")
      );
      if (matched && matched.charge !== undefined) {
        return matched.charge;
      }
    }
    const testObj = labTestMaster.find((t) => t.name.toLowerCase() === testName.toLowerCase());
    return testObj ? testObj.price : 0;
  };

  const handlePrintConsultationSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please allow popups to print reports.');
      return;
    }

    const facility = facilityDetails || {
      name: user.facility_name || 'Eagle Tech Medical Clinic',
      code: 'N/A',
      logo_url: user.facility_logo
    };

    const patient = selectedVisit?.patient || {};
    const ageYrs = patient.dob ? Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';

    // Logo resolution
    let logoHtml = '';
    const logoUrl = facility.logo_url;
    if (logoUrl) {
      if (logoUrl.startsWith('preset:')) {
        const presetKey = logoUrl.split(':')[1];
        let color = '#0d9488';
        if (presetKey === 'shield') color = '#3b82f6';
        if (presetKey === 'cross') color = '#ef4444';
        logoHtml = `
          <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); display: flex; align-items: center; justify-content: center; float: left; margin-right: 15px;">
            <span style="font-size: 24px; color: ${color}; font-weight: bold;">✚</span>
          </div>
        `;
      } else {
        logoHtml = `
          <img src="${logoUrl}" style="width: 55px; height: 55px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1; float: left; margin-right: 15px;" onerror="this.style.display='none'" />
        `;
      }
    } else {
      logoHtml = `
        <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); display: flex; align-items: center; justify-content: center; float: left; margin-right: 15px; font-weight: bold; color: #0d9488; font-size: 20px;">
          ${(facility.name || 'EM').substring(0, 2).toUpperCase()}
        </div>
      `;
    }

    // Vitals block
    const bpStr = triageData 
      ? `${triageData.systolic || '-'}/${triageData.diastolic || '-'}` 
      : (mohSystolic || mohDiastolic ? `${mohSystolic || '-'}/${mohDiastolic || '-'}` : 'N/A');
    const tempStr = triageData?.temperature ? `${triageData.temperature} °C` : (mohTemp ? `${mohTemp} °C` : 'N/A');
    const weightStr = triageData?.weight ? `${triageData.weight} kg` : (mohWeight ? `${mohWeight} kg` : 'N/A');
    const heightStr = triageData?.height ? `${triageData.height} cm` : 'N/A';
    const hrStr = triageData?.pulse ? `${triageData.pulse} bpm` : 'N/A';
    const rrStr = triageData?.resp_rate ? `${triageData.resp_rate} cpm` : 'N/A';
    const spo2Str = triageData?.spo2 ? `${triageData.spo2} %` : 'N/A';

    let bmiStr = 'N/A';
    if (triageData?.weight && triageData?.height) {
      const hMtrs = triageData.height / 100;
      bmiStr = (triageData.weight / (hMtrs * hMtrs)).toFixed(1);
    }

    // Prescription list table rows
    let prescriptionsHtml = '';
    const activePrescriptions = prescriptions.filter(p => p.name.trim() !== '');
    if (activePrescriptions.length > 0) {
      prescriptionsHtml = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold; background-color: #f8fafc;">
              <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Medication</th>
              <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Dosage</th>
              <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Frequency</th>
              <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Duration</th>
            </tr>
          </thead>
          <tbody>
      `;
      activePrescriptions.forEach(p => {
        prescriptionsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0; color: #334155;">
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">${p.name}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${p.dosage || '-'}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace;">${p.frequency}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${p.duration}</td>
          </tr>
        `;
      });
      prescriptionsHtml += `
          </tbody>
        </table>
      `;
    } else {
      prescriptionsHtml = '<p style="font-size: 11px; color: #64748b; font-style: italic;">No medications prescribed.</p>';
    }

    // Ordered Investigations
    let investigationsHtml = '';
    const hasLabs = orderedLabs.length > 0;
    const hasRad = orderedRadiology.length > 0;
    const hasSurg = orderedSurgeries.length > 0;

    if (hasLabs || hasRad || hasSurg) {
      investigationsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">';
      if (hasLabs) {
        investigationsHtml += `
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fafafa;">
            <strong style="font-size: 10px; text-transform: uppercase; color: #0d9488; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">Laboratory Tests</strong>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #334155;">
              ${orderedLabs.map(l => `<li style="margin-bottom: 3px;">${l}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      if (hasRad) {
        investigationsHtml += `
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fafafa;">
            <strong style="font-size: 10px; text-transform: uppercase; color: #3b82f6; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">Radiology Scans</strong>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #334155;">
              ${orderedRadiology.map(r => `<li style="margin-bottom: 3px;">${r}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      if (hasSurg) {
        investigationsHtml += `
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fafafa;">
            <strong style="font-size: 10px; text-transform: uppercase; color: #ef4444; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">Surgical Procedures</strong>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #334155;">
              ${orderedSurgeries.map(s => `<li style="margin-bottom: 3px;">${s}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      investigationsHtml += '</div>';
    } else {
      investigationsHtml = '<p style="font-size: 11px; color: #64748b; font-style: italic;">No diagnostic investigations ordered.</p>';
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Outpatient Consultation Summary - ${patient.name || 'Patient'}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.5;
            }
            .header-table {
              width: 100%;
              border-bottom: 3px double #0d9488;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .info-table td {
              padding: 5px 8px;
              border: 1px solid #e2e8f0;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
              background-color: #f8fafc;
              width: 20%;
            }
            .info-value {
              width: 30%;
            }
            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 25px;
            }
            .vital-card {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 10px;
              background-color: #f8fafc;
            }
            .vital-label {
              font-size: 9px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: bold;
            }
            .vital-value {
              font-size: 14px;
              font-weight: bold;
              color: #0f172a;
              margin-top: 2px;
            }
            .soap-section {
              margin-bottom: 20px;
            }
            .soap-title {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .soap-content {
              font-size: 12px;
              color: #334155;
              white-space: pre-line;
              line-height: 1.5;
              padding: 4px 0 12px 0;
            }
            .footer-section {
              margin-top: 40px;
              border-top: 1px solid #cbd5e1;
              padding-top: 15px;
            }
            .signature-block {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
            }
            .signature-line {
              width: 250px;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 5px;
              font-size: 10px;
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto;">
            
            <!-- Letterhead -->
            <table class="header-table">
              <tr>
                <td style="width: 60px; vertical-align: top;">
                  ${logoHtml}
                </td>
                <td style="vertical-align: top;">
                  <h1 style="margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: -0.5px;">
                    ${facility.name}
                  </h1>
                  <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b;">
                    Lic No: ${facility.kmpdc_reg_number || 'KMPDC/PENDING'} | MFL Code: ${facility.mfl_code || 'N/A'} | Category: ${facility.regulatory_category || 'Medical Clinic'}
                  </p>
                  <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
                    Address: ${facility.address || 'Kenya'} | County: ${facility.county || 'Kenya'}
                  </p>
                </td>
                <td style="text-align: right; vertical-align: top; font-size: 9px; color: #64748b; line-height: 1.3;">
                  <div style="font-weight: bold; color: #0d9488; font-size: 11px;">OUTPATIENT CLINICAL SUMMARY</div>
                  <div>Printed: ${new Date().toLocaleString()}</div>
                  <div>Encounter ID: ${selectedVisit.id}</div>
                </td>
              </tr>
            </table>

            <!-- Patient Identification -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Patient & Encounter Information
            </h2>
            <table class="info-table">
              <tr>
                <td class="info-label">Patient Name</td>
                <td class="info-value" style="font-weight: bold; color: #0f172a;">${patient.name || 'N/A'}</td>
                <td class="info-label">Patient ID Code</td>
                <td class="info-value" style="font-family: monospace; font-weight: bold; color: #0d9488;">${patient.facility_id_code || 'N/A'}</td>
              </tr>
              <tr>
                <td class="info-label">Age / Gender</td>
                <td class="info-value">${ageYrs} Years / <span style="text-transform: capitalize;">${patient.gender || 'N/A'}</span></td>
                <td class="info-label">Encounter Date</td>
                <td class="info-value">${selectedVisit.created_at ? new Date(selectedVisit.created_at).toLocaleString() : new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td class="info-label">Service Type</td>
                <td class="info-value" style="font-weight: bold;">${selectedVisit.service_type || 'General Outpatient'}</td>
                <td class="info-label">Attending Clinician</td>
                <td class="info-value">${user.full_name || 'Medical Practitioner'}</td>
              </tr>
            </table>

            <!-- Vital Signs -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Vitals & Measurements
            </h2>
            <div class="vitals-grid">
              <div class="vital-card">
                <div class="vital-label">Temperature</div>
                <div class="vital-value">${tempStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-value">${bpStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Heart Rate</div>
                <div class="vital-value">${hrStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Respiratory Rate</div>
                <div class="vital-value">${rrStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">SpO2</div>
                <div class="vital-value">${spo2Str}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Weight</div>
                <div class="vital-value">${weightStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Height</div>
                <div class="vital-value">${heightStr}</div>
              </div>
              <div class="vital-card">
                <div class="vital-label">Calculated BMI</div>
                <div class="vital-value">${bmiStr}</div>
              </div>
            </div>

            <!-- SOAP Notes / Clinical Presentation -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Clinical Examination Findings
            </h2>
            
            <div class="soap-section">
              <div class="soap-title">Chief Complaint & History of Present Illness</div>
              <div class="soap-content">${history || 'No history recorded.'}</div>
            </div>

            <div class="soap-section">
              <div class="soap-title">Physical Examination</div>
              <div class="soap-content">${exam || 'No examination findings recorded.'}</div>
            </div>

            <div class="soap-section">
              <div class="soap-title">Diagnosis & Assessment (ICD-10)</div>
              <div class="soap-content" style="font-weight: bold; color: #0f172a;">${diagnosis || 'No primary diagnosis assigned.'}</div>
            </div>

            <div class="soap-section">
              <div class="soap-title">Management & Treatment Plan</div>
              <div class="soap-content">${treatmentPlan || 'No treatment plan recorded.'}</div>
            </div>

            <!-- Prescribed Medications -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 20px 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Prescribed Medications
            </h2>
            ${prescriptionsHtml}

            <!-- Diagnostics & Investigations Ordered -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 20px 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Ordered Diagnostic Investigations
            </h2>
            ${investigationsHtml}

            <!-- Footer & Attending Stamp -->
            <div class="footer-section">
              <div style="font-size: 9px; color: #64748b; font-style: italic; line-height: 1.4; text-align: justify; margin-bottom: 20px;">
                <strong>Notice:</strong> This outpatient summary document is generated electronically from the active clinical database session. It serves as an official summary of the patient's presentation, examination, and immediate management plan. All prescriptions and ordered investigations should be verified by the respective dispensing or processing departments.
              </div>

              <div class="signature-block">
                <div>
                  <div style="height: 40px;"></div>
                  <div class="signature-line">
                    PATIENT SIGNATURE / THUMBPRINT
                  </div>
                </div>
                <div>
                  <div style="height: 40px; text-align: center; font-family: monospace; font-size: 9px; color: #0d9488; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                    CLINICALLY VALIDATED<br/>
                    ${user.full_name?.toUpperCase() || 'ATTENDING CLINICIAN'}
                  </div>
                  <div class="signature-line">
                    ATTENDING CLINICIAN SIGN-OFF
                  </div>
                  <div style="font-size: 8px; text-align: center; color: #64748b; margin-top: 2px;">
                    Licensed Practitioner Stamp & Sign
                  </div>
                </div>
              </div>
            </div>

            <!-- Print Controls -->
            <div style="margin-top: 30px; text-align: center;" class="print-hidden">
              <button onclick="window.print();" style="background-color: #0d9488; color: #fff; border: none; padding: 8px 20px; font-size: 12px; font-weight: bold; border-radius: 5px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);">
                Print Clinical Summary
              </button>
              <button onclick="window.close();" style="background-color: #64748b; color: #fff; border: none; padding: 8px 20px; font-size: 12px; font-weight: bold; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                Close Window
              </button>
            </div>

          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const fetchConsultationQueue = async () => {
    try {
      const { data: vsts } = await supabase
        .from("visits")
        .select("*")
        .eq("department", "consultation")
        .eq("status", "waiting");
      const visitIds = vsts ? vsts.map(v => v.id) : [];
      let ords = [];
      if (visitIds.length > 0) {
        const { data: fetchedOrds } = await supabase
          .from("orders")
          .select("*")
          .in("visit_id", visitIds);
        ords = fetchedOrds || [];
      }

      const enrichedQueue = vsts
        ? vsts.map((v) => {
            const p = pts?.find((pt) => pt.id === v.patient_id);
            const vOrds = ords.filter(o => o.visit_id === v.id);
            const completedLabs = vOrds.filter(o => o.type === 'lab' && o.status === 'released');
            return {
              ...v,
              patient: p,
              hasCompletedLabs: completedLabs.length > 0,
              completedLabsCount: completedLabs.length,
              totalLabsCount: vOrds.filter(o => o.type === 'lab').length
            };
          })
        : [];

      setQueue(enrichedQueue);
      const savedVisitId = sessionStorage.getItem('egesa_selected_visit_id_consultation');
      const matchedVisit = enrichedQueue.find(v => v.id === savedVisitId);
      if (matchedVisit) {
        handleSelectVisit(matchedVisit);
      } else if (enrichedQueue.length > 0) {
        handleSelectVisit(enrichedQueue[0]);
      } else {
        setSelectedVisit(null);
        setTriageData(null);
      }
    } catch (err) {
      console.error("Error fetching consultation queue:", err);
    }
  };

  const handleSelectVisit = async (visit) => {
    if (!visit) {
      sessionStorage.removeItem('egesa_selected_visit_id_consultation');
      return;
    }
    setSelectedVisit(visit);
    sessionStorage.setItem('egesa_selected_visit_id_consultation', visit.id);

    // Clear specialized workflow states
    setActivePregnancy(null);
    setAncGaWeeks(0);
    setAncEdd('');
    setAncLmp('');
    if (visit.service_type === 'ANC') {
      setActiveTemplate('anc');
    } else if (visit.service_type === 'IMM') {
      setActiveTemplate('pediatrics');
    } else if (visit.service_type === 'FP') {
      setActiveTemplate('fp');
    } else {
      setActiveTemplate('general');
    }
    setPediatricWeight('');
    setPediatricHeadCirc('');
    setPediatricMilestones('normal');
    setPediatricImmunizations([]);
    setAncGravidity(1);
    setAncParity(0);
    setAncAbortions(0);
    setAncVisitNumber(1);
    setAncFetalHeartRate('');
    setAncFundalHeight('');
    setAncEdema(false);
    setAncTetanusDose('');
    setAncTetanusDate('');
    setAncIronFolateSupplied(true);
    setAncSupplementsCount(30);
    setAncRiskLevel('normal');
    setAncNextVisitDate('');

    setActiveFPRecord(null);
    setFpGravidity(0);
    setFpParity(0);
    setFpEligibilityCategory(1);
    setFpCounselingProvided(true);
    setFpMethodSelectedId('');
    setFpInsertionDate('');
    setFpSideEffects('');
    setFpDiscontinued(false);
    setFpDiscontinuedReason('');
    setFpRiskHypertension(false);
    setFpRiskSmoking(false);
    setFpRiskBreastfeeding(false);
    setFpRiskPid(false);
    setFpRiskBleeding(false);
    setFpWhoResult(null);
    setBoundInstrumentId('');

    // Fetch vital signs
    try {
      const { data } = await supabase
        .from("triages")
        .select("*")
        .eq("visit_id", visit.id);
      if (data && data.length > 0) {
        setTriageData(data[0]);
        setHistory(`Chief Complaint: ${data[0].chief_complaint}\n`);
      } else {
        setTriageData(null);
      }
    } catch (err) {
      console.error("Error fetching triage data:", err);
    }

    // Load active pregnancy if ANC service
    if (visit.service_type === 'ANC') {
      try {
        const { data: preg } = await supabase
          .from("pregnancies")
          .select("*")
          .eq("patient_id", visit.patient_id)
          .eq("is_active", true);
        if (preg && preg.length > 0) {
          setActivePregnancy(preg[0]);
          // Calculate GA via backend API
          const token = localStorage.getItem('egesa_health_token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const res = await fetch(`${apiBase}/workflows/anc/calculate-gestational-age`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lmp_date: preg[0].lmp_date })
          });
          if (res.ok) {
            const gaData = await res.json();
            setAncGaWeeks(gaData.gestational_age_weeks);
            setAncEdd(gaData.estimated_delivery_date);
            setAncNextVisitDate(gaData.suggested_next_visit_date);
          }
        }
      } catch (err) {
        console.error("Error loading pregnancy context:", err);
      }
    }

    // Load active family planning record if FP
    if (visit.service_type === 'FP') {
      try {
        const { data: fpRecs } = await supabase
          .from("family_planning_records")
          .select("*")
          .eq("patient_id", visit.patient_id)
          .order("created_at", { ascending: false });
        if (fpRecs && fpRecs.length > 0) {
          setActiveFPRecord(fpRecs[0]);
          setFpGravidity(fpRecs[0].reproductive_history_gravidity || 0);
          setFpParity(fpRecs[0].reproductive_history_parity || 0);
          setFpMethodSelectedId(fpRecs[0].method_selected_id || '');
        }
      } catch (err) {
        console.error("Error loading FP context:", err);
      }
    }

    // Fetch patient history profile
    try {
      const { data: prevVisits } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", visit.patient_id)
        .order("created_at", { ascending: false });

      if (prevVisits && prevVisits.length > 0) {
        const visitIds = prevVisits.map(v => v.id);
        const { data: prevConsults } = await supabase.from("consultations").select("*");
        const { data: prevTriages } = await supabase.from("triages").select("*");
        const { data: prevOrders } = await supabase.from("orders").select("*");

        setPatientHistory({
          visits: prevVisits,
          consultations: prevConsults ? prevConsults.filter(c => visitIds.includes(c.visit_id)) : [],
          triages: prevTriages ? prevTriages.filter(t => visitIds.includes(t.visit_id)) : [],
          orders: prevOrders ? prevOrders.filter(o => visitIds.includes(o.visit_id)) : []
        });
      }
    } catch (err) {
      console.error("Error loading patient clinical history:", err);
    }
  };

  const getMedicineDetails = (fullName) => {
    return medicineMaster.find(m => {
      const matchName = `${m.genericName} (${m.brandName || ''}) ${m.strength}`.trim();
      return matchName === fullName || m.genericName === fullName;
    });
  };

  const addPrescriptionRow = () => {
    setPrescriptions([
      ...prescriptions,
      { name: "", dosage: "", frequency: "1x1", duration: "3 days", price: 0 },
    ]);
  };

  const handleQuickPrescribe = (comboType) => {
    let drugsToPrescribe = [];
    if (comboType === 'malaria') {
      drugsToPrescribe = [
        { name: 'Artemether-Lumefantrine (AL) (Coartem) 20 mg / 120 mg', generic: 'Artemether-Lumefantrine', strength: '20 mg / 120 mg', frequency: '2x1', duration: '3 days' },
        { name: 'Paracetamol (Panadol) 500 mg', generic: 'Paracetamol', strength: '500 mg', frequency: '3x1', duration: '3 days' }
      ];
    } else if (comboType === 'hypertension') {
      drugsToPrescribe = [
        { name: 'Omeprazole (Losec) 20 mg', generic: 'Omeprazole', strength: '20 mg', frequency: '1x1', duration: '14 days' },
        { name: 'Antacid suspension (Actal / Mucogel) 250 mg / 5 ml', generic: 'Antacid suspension', strength: '250 mg / 5 ml', frequency: '3x1', duration: '5 days' }
      ];
    } else if (comboType === 'cold') {
      drugsToPrescribe = [
        { name: 'Amoxicillin (Amoxil) 500 mg', generic: 'Amoxicillin', strength: '500 mg', frequency: '3x1', duration: '5 days' },
        { name: 'Paracetamol (Panadol) 500 mg', generic: 'Paracetamol', strength: '500 mg', frequency: '3x1', duration: '3 days' }
      ];
    } else if (comboType === 'diarrhea') {
      drugsToPrescribe = [
        { name: 'Oral rehydration salts (ORS Sachet) 20.5 g sachet', generic: 'Oral rehydration salts', strength: '20.5 g sachet', frequency: 'PRN', duration: '3 days' },
        { name: 'Zinc sulfate (Zinc-20) 20 mg', generic: 'Zinc sulfate', strength: '20 mg', frequency: '1x1', duration: '10 days' },
        { name: 'Metronidazole (Flagyl) 400 mg', generic: 'Metronidazole', strength: '400 mg', frequency: '3x1', duration: '5 days' }
      ];
    }

    const validPrescriptions = [];
    drugsToPrescribe.forEach(combo => {
      const match = availableDrugs.find(d => d.name.toLowerCase().includes(combo.generic.toLowerCase()));
      if (match) {
        validPrescriptions.push({
          name: match.name,
          dosage: match.strength || combo.strength,
          frequency: combo.frequency,
          duration: combo.duration,
          price: match.price || 0
        });
      }
    });

    if (validPrescriptions.length > 0) {
      if (prescriptions.length === 1 && !prescriptions[0].name) {
        setPrescriptions(validPrescriptions);
      } else {
        const filteredNew = validPrescriptions.filter(newP => !prescriptions.some(p => p.name === newP.name));
        setPrescriptions([...prescriptions, ...filteredNew]);
      }
      if (showNotification) {
        showNotification('success', 'Combo Prescribed', `Added ${validPrescriptions.map(p => p.name.split(' (')[0]).join(', ')} to prescriptions.`);
      }
    }
  };

  const removePrescriptionRow = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index, field, value) => {
    const updated = prescriptions.map((item, i) => {
      if (i === index) {
        const newItem = { ...item, [field]: value };
        if (field === "name") {
          // Auto set price based on selection
          const drug = availableDrugs.find((d) => d.name === value);
          newItem.price = drug ? drug.price : 0;
        }
        return newItem;
      }
      return item;
    });
    setPrescriptions(updated);
  };

  const handleSubmitClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedVisit) return;

    // Check if diagnosis is selected
    if (!diagnosis) {
      setMessage({ type: "error", text: "Please select an ICD-10 Diagnosis first." });
      return;
    }
    // Check if history (HPI) is provided
    if (!history.trim()) {
      setMessage({ type: "error", text: "Please provide the History of Presenting Illness (HPI) notes." });
      return;
    }
    // Check if physical exam is provided
    if (!exam.trim()) {
      setMessage({ type: "error", text: "Please enter the Physical Examination notes." });
      return;
    }

    const contactInfo = selectedVisit.patient ? parsePatientContact(selectedVisit.patient.phone) : {};
    setMohVillage(contactInfo.village || "");
    setMohTemp(triageData?.temperature || "");
    setMohWeight(triageData?.weight || "");
    setMohSystolic(triageData?.systolic || "");
    setMohDiastolic(triageData?.diastolic || "");
    setMohConfirmed(false);
    setShowMOHModal(true);
  };

  const saveMOHRecords = async () => {
    // Validation of vitals in Consultation MoH
    if (mohTemp) {
      const tempVal = parseFloat(mohTemp);
      if (tempVal < 25 || tempVal > 45) {
        throw new Error("Temperature must be between 25.0°C and 45.0°C.");
      }
    }
    const sysVal = mohSystolic ? parseInt(mohSystolic, 10) : null;
    const diaVal = mohDiastolic ? parseInt(mohDiastolic, 10) : null;

    if (sysVal !== null && (sysVal < 50 || sysVal > 280)) {
      throw new Error("Systolic blood pressure must be between 50 mmHg and 280 mmHg.");
    }
    if (diaVal !== null && (diaVal < 30 || diaVal > 180)) {
      throw new Error("Diastolic blood pressure must be between 30 mmHg and 180 mmHg.");
    }
    if (sysVal !== null && diaVal !== null && diaVal >= sysVal) {
      throw new Error("Diastolic blood pressure must be strictly lower than systolic blood pressure.");
    }

    if (mohWeight) {
      const wVal = parseFloat(mohWeight);
      if (wVal < 0.5 || wVal > 500) {
        throw new Error("Weight must be between 0.5 kg and 500 kg.");
      }
    }

    // Save village to patient phone meta
    const contactInfo = selectedVisit.patient ? parsePatientContact(selectedVisit.patient.phone) : {};
    if (mohVillage !== contactInfo.village) {
      const updatedPhone = JSON.stringify({
        ...contactInfo,
        village: mohVillage
      });
      const { error: patientErr } = await supabase.from('patients').update({ phone: updatedPhone }).eq('id', selectedVisit.patient_id);
      if (patientErr) throw patientErr;
    }

    // Save vitals
    if (triageData) {
      const { error: triageErr } = await supabase.from('triages').update({
        temperature: parseFloat(mohTemp) || triageData.temperature,
        weight: parseFloat(mohWeight) || triageData.weight,
        systolic: parseInt(mohSystolic) || triageData.systolic,
        diastolic: parseInt(mohDiastolic) || triageData.diastolic
      }).eq('id', triageData.id);
      if (triageErr) throw triageErr;
    } else {
      const triageId = 'tr_' + Math.random().toString(36).substring(2, 11);
      const { error: triageInsertErr } = await supabase.from('triages').insert({
        id: triageId,
        facility_id: user.facility_id,
        visit_id: selectedVisit.id,
        temperature: parseFloat(mohTemp) || null,
        weight: parseFloat(mohWeight) || null,
        systolic: parseInt(mohSystolic) || null,
        diastolic: parseInt(mohDiastolic) || null,
        chief_complaint: history || "Outpatient Encounter",
        priority_flag: "green"
      });
      if (triageInsertErr) throw triageInsertErr;
    }
  };

  const handleSaveConsultation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedVisit) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 0a. Frontend validation of specialized clinical records
      if (selectedVisit.service_type === 'ANC') {
        const fh = parseFloat(ancFundalHeight);
        if (ancFundalHeight !== '' && (isNaN(fh) || fh < 10 || fh > 50)) {
          throw new Error("Validation: Fundal height must be between 10 cm and 50 cm.");
        }
        const fhr = parseInt(ancFetalHeartRate, 10);
        if (ancFetalHeartRate !== '' && (isNaN(fhr) || fhr < 60 || fhr > 220)) {
          throw new Error("Validation: Fetal heart rate must be between 60 bpm and 220 bpm.");
        }
        const ttDose = parseInt(ancTetanusDose, 10);
        if (ancTetanusDose !== '' && (isNaN(ttDose) || ttDose < 1 || ttDose > 5)) {
          throw new Error("Validation: Tetanus toxoid dose must be between 1 and 5.");
        }
        const supplements = parseInt(ancSupplementsCount, 10);
        if (ancSupplementsCount !== '' && (isNaN(supplements) || supplements < 0 || supplements > 365)) {
          throw new Error("Validation: Supplements supplied count must be between 0 and 365.");
        }
        const vNum = parseInt(ancVisitNumber, 10);
        if (isNaN(vNum) || vNum < 1 || vNum > 12) {
          throw new Error("Validation: ANC visit number must be between 1 and 12.");
        }
      }

      if (selectedVisit.service_type === 'FP') {
        const grav = parseInt(fpGravidity, 10);
        if (isNaN(grav) || grav < 0 || grav > 30) {
          throw new Error("Validation: Family planning reproductive history gravidity must be between 0 and 30.");
        }
        const par = parseInt(fpParity, 10);
        if (isNaN(par) || par < 0 || par > grav) {
          throw new Error("Validation: Family planning reproductive history parity must be between 0 and gravidity.");
        }
      }

      // 0b. Save validated MOH details
      await saveMOHRecords();

      // 1. Insert Consultation Notes
      const consultRecord = {
        visit_id: selectedVisit.id,
        history: activeTemplate === 'anc' 
          ? `ANC Visit Notes\nFundal Height: ${ancFundalHeight}cm\nFetal Heart Rate: ${ancFetalHeartRate}bpm\n${history}` 
          : activeTemplate === 'fp' 
            ? `FP Consultation Notes\nMethod Selected: ${fpMethodSelectedId}\nEligibility Category: ${fpEligibilityCategory}\n${history}` 
            : activeTemplate === 'pediatrics'
              ? `Pediatric Visit Notes\nWeight: ${pediatricWeight}kg\nHead Circ: ${pediatricHeadCirc}cm\nMilestones: ${pediatricMilestones}\nVaccines: ${pediatricImmunizations.join(', ')}\n${history}`
              : history,
        examination: exam,
        diagnosis_icd10: diagnosis,
        treatment_plan: treatmentPlan,
      };

      const { error: consultErr } = await supabase
        .from("consultations")
        .insert(consultRecord);
      if (consultErr) throw consultErr;

      // 1b. Save specialized ANC/FP data
      if (selectedVisit.service_type === 'ANC' && activePregnancy) {
        const ancVisitId = 'ancv_' + Math.random().toString(36).substring(2, 12);
        const { error: ancErr } = await supabase.from('anc_visits').insert({
          id: ancVisitId,
          pregnancy_id: activePregnancy.id,
          facility_id: user.facility_id,
          visit_number: parseInt(ancVisitNumber) || 1,
          visit_date: new Date().toISOString().split('T')[0],
          gestational_age_at_visit: parseFloat(ancGaWeeks) || 0,
          bp_systolic: triageData?.systolic || parseInt(mohSystolic) || null,
          bp_diastolic: triageData?.diastolic || parseInt(mohDiastolic) || null,
          weight_kg: triageData?.weight || parseFloat(mohWeight) || null,
          fundal_height_cm: parseFloat(ancFundalHeight) || null,
          fetal_heart_rate: parseInt(ancFetalHeartRate) || null,
          maternal_temperature: triageData?.temperature || parseFloat(mohTemp) || null,
          edema_present: ancEdema,
          tetanus_toxoid_dose: parseInt(ancTetanusDose) || null,
          tetanus_date: ancTetanusDate || null,
          iron_folate_supplied: ancIronFolateSupplied,
          supplements_count: parseInt(ancSupplementsCount) || 0,
          complications_notes: treatmentPlan || null,
          risk_level: ancRiskLevel,
          next_visit_date: ancNextVisitDate || null,
          placed_by: user.id
        });
        if (ancErr) throw ancErr;

        // Insert anc diagnosis
        if (diagnosis) {
          const diagCode = diagnosis.split('(')[1]?.replace(')', '') || diagnosis;
          await supabase.from('anc_diagnoses').insert({
            id: 'ancd_' + Math.random().toString(36).substring(2, 12),
            anc_visit_id: ancVisitId,
            facility_id: user.facility_id,
            diagnosis_id: diagCode,
            is_pregnancy_specific: true,
            severity_level: 'moderate',
            principal_complication: true
          });
        }

        // Log instrument usage
        if (boundInstrumentId) {
          const token = localStorage.getItem('egesa_health_token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          await fetch(`${apiBase}/workflows/instruments/log-usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              instrument_id: boundInstrumentId,
              workflow_type: 'ANC',
              patient_id: selectedVisit.patient_id,
              encounter_id: selectedVisit.id,
              measurement_type: 'fetal_heart_rate',
              result_value: parseFloat(ancFetalHeartRate) || null,
              result_unit: 'bpm'
            })
          });
        }
      } else if (selectedVisit.service_type === 'FP') {
        let fpRecordId = activeFPRecord?.id;
        if (!fpRecordId) {
          fpRecordId = 'fpr_' + Math.random().toString(36).substring(2, 12);
          const { error: fpRecErr } = await supabase.from('family_planning_records').insert({
            id: fpRecordId,
            patient_id: selectedVisit.patient_id,
            facility_id: user.facility_id,
            consultation_date: new Date().toISOString().split('T')[0],
            reproductive_history_gravidity: parseInt(fpGravidity) || 0,
            reproductive_history_parity: parseInt(fpParity) || 0,
            medical_eligibility_category: parseInt(fpEligibilityCategory) || 1,
            counseling_provided: fpCounselingProvided,
            method_selected_id: fpMethodSelectedId || null,
            insertion_date: fpInsertionDate || null,
            next_followup_date: ancNextVisitDate || null,
            side_effects_reported: fpSideEffects || null
          });
          if (fpRecErr) throw fpRecErr;
        }

        // Save FP Visit
        const { error: fpVisErr } = await supabase.from('fp_visits').insert({
          id: 'fpv_' + Math.random().toString(36).substring(2, 12),
          fp_record_id: fpRecordId,
          facility_id: user.facility_id,
          visit_date: new Date().toISOString().split('T')[0],
          visit_type: activeFPRecord ? 'followup' : 'initial',
          method_status: fpMethodSelectedId ? 'active' : 'none',
          side_effects: fpSideEffects || null,
          discontinuation: fpDiscontinued,
          new_method_selected_id: fpMethodSelectedId || null,
          next_visit_date: ancNextVisitDate || null
        });
        if (fpVisErr) throw fpVisErr;

        // Log instrument usage
        if (boundInstrumentId) {
          const token = localStorage.getItem('egesa_health_token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          await fetch(`${apiBase}/workflows/instruments/log-usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              instrument_id: boundInstrumentId,
              workflow_type: 'FP',
              patient_id: selectedVisit.patient_id,
              encounter_id: selectedVisit.id,
              measurement_type: 'contraceptive_insertion',
              result_value: 1,
              result_unit: 'procedure'
            })
          });
        }
      }

      // 2. Insert Lab, Radiology, Surgery, Follow-up Orders
      const orderPromises = [];
      const labsOrdered = [];
      const radsOrdered = [];
      const surgeriesOrdered = [];

      // Lab
      orderedLabs.forEach((testName) => {
        const testObj = labTestMaster.find(t => t.name === testName);
        if (testObj) {
          labsOrdered.push(testObj.name);
          orderPromises.push(
            supabase.from("orders").insert({
              visit_id: selectedVisit.id,
              type: "lab",
              item_name: testObj.name,
              status: "ordered",
              price: getLabPrice(testObj.name),
            })
          );
        }
      });

      // Radiology
      orderedRadiology.forEach((scanName) => {
        const testObj = radiologyTestMaster.find(t => t.name === scanName);
        if (testObj) {
          radsOrdered.push(testObj.name);
          orderPromises.push(
            supabase.from("orders").insert({
              visit_id: selectedVisit.id,
              type: "radiology",
              item_name: testObj.name,
              status: "ordered",
              price: testObj.price,
            })
          );
        }
      });

      // Surgery
      orderedSurgeries.forEach((surgName) => {
        const surgObj = surgicalProcedureMaster.find(s => s.name === surgName);
        if (surgObj) {
          surgeriesOrdered.push(surgObj.name);
          orderPromises.push(
            supabase.from("orders").insert({
              visit_id: selectedVisit.id,
              type: "surgery",
              item_name: surgObj.name,
              status: "waiting_clearance",
              price: surgObj.price,
            })
          );
        }
      });

      // Follow-up Review Date
      if (followUpDate) {
        orderPromises.push(
          supabase.from("orders").insert({
            visit_id: selectedVisit.id,
            type: "follow_up",
            item_name: "Follow-up Review",
            instructions: followUpDate,
            status: "scheduled",
            price: 0
          })
        );
      }

      // Prescriptions
      const drugPromises = [];
      prescriptions.forEach((p) => {
        if (p.name) {
          drugPromises.push(
            supabase.from("orders").insert({
              visit_id: selectedVisit.id,
              type: "prescription",
              item_name: p.name,
              instructions: `Dosage: ${p.dosage} | Freq: ${p.frequency} | Dur: ${p.duration}`,
              status: "prescribed",
              price: p.price,
            })
          );
        }
      });

      if (orderPromises.length > 0) {
        await Promise.all(orderPromises);
      }
      if (drugPromises.length > 0) {
        await Promise.all(drugPromises);
      }

      // 4. Intelligent Routing
      let nextDept = "completed";
      if (surgeriesOrdered.length > 0) {
        nextDept = "surgery";
      } else if (radsOrdered.length > 0) {
        nextDept = "radiology";
      } else if (labsOrdered.length > 0) {
        nextDept = "lab";
      } else if (drugPromises.length > 0) {
        nextDept = "billing";
      }

      const { error: visitErr } = await supabase
        .from("visits")
        .update({
          department: nextDept,
          status: nextDept === "completed" ? "completed" : "waiting",
        })
        .eq("id", selectedVisit.id);

      if (visitErr) throw visitErr;

      // 5. Generate Billing Invoice automatically if items ordered
      const labBill = orderedLabs.reduce((sum, testName) => {
        return sum + getLabPrice(testName);
      }, 0);

      const radBill = orderedRadiology.reduce((sum, scanName) => {
        const testObj = radiologyTestMaster.find(t => t.name === scanName);
        return sum + (testObj ? testObj.price : 0);
      }, 0);

      const surgBill = orderedSurgeries.reduce((sum, surgName) => {
        const surgObj = surgicalProcedureMaster.find(s => s.name === surgName);
        return sum + (surgObj ? surgObj.price : 0);
      }, 0);

      const pharmBill = prescriptions
        .filter((p) => p.name)
        .reduce((sum, p) => sum + (p.price || 0), 0);

      const totalBill = labBill + radBill + surgBill + pharmBill;

      if (totalBill > 0) {
        await supabase.from("invoices").insert({
          visit_id: selectedVisit.id,
          total_amount: totalBill,
          amount_paid: 0.0,
          status: "unpaid",
        });
      }

      // 6. Submit to AfyaLink automatically
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
            visit_id: selectedVisit.id,
            patient_id: selectedVisit.patient_id,
            patient_name: selectedVisit.patient?.name,
            patient_code: selectedVisit.patient?.facility_id_code,
            diagnosis_code: diagnosis ? diagnosis.split('(')[1]?.replace(')', '') : 'A00',
            diagnosis_name: diagnosis ? diagnosis.split(' (')[0] : 'Consultation Encounter',
            encounter_class: 'AMB',
            vitals: {
              temperature: mohTemp || triageData?.temperature,
              weight: mohWeight || triageData?.weight,
              systolic: mohSystolic || triageData?.systolic,
              diastolic: mohDiastolic || triageData?.diastolic
            }
          })
        });
      } catch (afyaErr) {
        console.error('[AfyaLink Sync Trigger Failed]', afyaErr);
      }

      // WhatsApp Notification for Diagnosis & Prescription
      if (selectedVisit.patient) {
        const contactInfo = parsePatientContact(selectedVisit.patient.phone);
        if (contactInfo && contactInfo.phone) {
          if (contactInfo.preferences?.pharmacy !== false) {
            let message = `Hi ${selectedVisit.patient.name},\n\n`;
            message += `Your consultation at our facility has been completed.\n`;
            if (diagnosis) {
              const diagName = diagnosis.split(' (')[0];
              message += `Diagnosis: ${diagName}\n`;
            }
            const activePrescriptions = prescriptions.filter(p => p.name);
            if (activePrescriptions.length > 0) {
              message += `\nPrescribed Medications:\n`;
              activePrescriptions.forEach((p, idx) => {
                message += `${idx + 1}. ${p.name} - Dosage: ${p.dosage}, Freq: ${p.frequency}, Dur: ${p.duration}\n`;
              });
            }
            message += `\nThank you for choosing our facility!`;
            
            sendWhatsAppNotification(contactInfo.phone, message, selectedVisit.patient.facility_id || user.facility_id)
              .then(res => console.log('[WhatsApp Consultation Alert Sent]', res))
              .catch(err => console.error('[WhatsApp Consultation Alert Failed]', err));
          }
        }
      }

      if (showNotification) {
        showNotification('success', 'Consultation Saved', `Consultation notes saved. Patient redirected to ${nextDept.toUpperCase()}.`);
      } else {
        setMessage({
          type: "success",
          text: `Consultation notes saved. Patient redirected to ${nextDept.toUpperCase()}.`,
        });
      }

      setTimeout(() => {
        sessionStorage.removeItem('egesa_selected_visit_id_consultation');
        fetchConsultationQueue();
        if (onComplete) onComplete();
      }, 1200);
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Consultation Save Failed', err.message || "Error saving consultation details.");
      } else {
        setMessage({
          type: "error",
          text: err.message || "Error saving consultation details.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Column: Waiting Queue (1/4 width) */}
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4 h-fit ${selectedVisit ? 'hidden lg:block' : 'block'}`}>
        <div>
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={14} className="text-teal-400" /> Consult Queue
            ({queue.length})
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Select patient for consultation
          </p>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {queue.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3 rounded-lg border transition flex flex-col gap-1 ${
                selectedVisit?.id === item.id
                  ? "border-teal-500/60 bg-teal-500/5"
                  : "border-slate-800/80 bg-slate-950 hover:bg-slate-800/50"
              }`}
            >
              <span className="font-semibold text-slate-200 text-xs truncate">
                {item.patient?.name}
              </span>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono w-full">
                <span>{item.patient?.facility_id_code}</span>
                <div className="flex items-center gap-1.5">
                  {item.hasCompletedLabs && (
                    <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-sans font-bold flex items-center gap-0.5 animate-pulse">
                      <FlaskConical size={8} /> Results Ready ({item.completedLabsCount}/{item.totalLabsCount})
                    </span>
                  )}
                  <span
                    className={`px-1 py-0.5 rounded capitalize ${
                      item.priority === "emergency"
                        ? "text-red-400 bg-red-950/20"
                        : "text-slate-400 bg-slate-850"
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {queue.length === 0 && (
            <div className="text-xs text-slate-600 text-center py-12 border border-dashed border-slate-800 rounded-lg">
              No patients awaiting consultation.
            </div>
          )}
        </div>
      </div>

      {/* Middle & Right: SOAP notes and vital details (3/4 width) */}
      <div className={`lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 ${!selectedVisit ? 'hidden lg:block' : 'block'}`}>
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <FileText size={48} className="text-slate-600 mb-2 animate-pulse" />
            <h3 className="text-slate-400 font-medium text-sm">
              No Consult Session Open
            </h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">
              Select a patient from the consultation list to load history, exam
              files, vitals, and issue clinical orders.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mobile View Back Button */}
            <button
              type="button"
              onClick={() => setSelectedVisit(null)}
              className="lg:hidden w-full mb-4 py-2 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-[0.98]"
            >
              ← Back to Patient Queue
            </button>
            {/* Session Info & Vitals Header */}
            <div className="bg-slate-950 border border-slate-850/80 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                    Outpatient Consultation
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">
                    {selectedVisit.patient?.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedVisit.patient?.facility_id_code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-left sm:text-right justify-start sm:justify-end">
                  <button
                    onClick={handlePrintConsultationSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700 hover:border-teal-500/30 text-[10px] font-bold rounded-lg transition-all"
                  >
                    <Printer size={12} />
                    Print Summary
                  </button>
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      Triage Priority Badge
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        triageData?.priority_flag === "red"
                          ? "text-red-400 bg-red-950/20 border-red-500/20"
                          : triageData?.priority_flag === "yellow"
                            ? "text-yellow-400 bg-yellow-950/20 border-yellow-500/20"
                            : "text-green-400 bg-green-950/20 border-green-500/20"
                      }`}
                    >
                      {triageData?.priority_flag || "Green"} Flag
                    </span>
                  </div>
                </div>
              </div>

              {/* Triage Vitals Row */}
              {triageData ? (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 border-t border-slate-850/60 pt-3">
                  {[
                    {
                      label: "Temp",
                      val: `${triageData.temperature} °C`,
                      alert: triageData.temperature >= 38,
                    },
                    {
                      label: "BP",
                      val: `${triageData.systolic}/${triageData.diastolic}`,
                      alert: triageData.systolic >= 140,
                    },
                    {
                      label: "Pulse",
                      val: `${triageData.heart_rate} bpm`,
                      alert: triageData.heart_rate >= 100,
                    },
                    {
                      label: "SpO2",
                      val: `${triageData.spo2} %`,
                      alert: triageData.spo2 < 95,
                    },
                    {
                      label: "BMI",
                      val: triageData.bmi,
                      alert: triageData.bmi >= 25,
                    },
                    { label: "RR", val: `${triageData.resp_rate} bpm` },
                  ].map((vit, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5"
                    >
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">
                        {vit.label}
                      </span>
                      <span
                        className={`text-xs font-bold ${vit.alert ? "text-red-400" : "text-slate-200"}`}
                      >
                        {vit.val || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-yellow-500 bg-yellow-500/5 p-2 rounded text-center border border-yellow-500/20">
                  Warning: No vitals recorded in triage for this visit.
                </div>
              )}
            </div>

            {/* Laboratory Results Alert Widget */}
            {(() => {
              const currentVisitReleasedLabs = patientHistory?.orders?.filter(
                o => o.visit_id === selectedVisit.id && o.type === 'lab' && o.status === 'released'
              ) || [];
              if (currentVisitReleasedLabs.length === 0) return null;
              
              return (
                <div className="bg-emerald-950/20 border border-emerald-500/25 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <FlaskConical size={14} className="text-emerald-400 animate-pulse" /> Laboratory Examination Results Ready
                    </h4>
                    <span className="text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full font-bold font-sans">
                      Released ({currentVisitReleasedLabs.length})
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {currentVisitReleasedLabs.map((lab, i) => {
                      let meta = {};
                      if (lab.results && lab.results.startsWith('{')) {
                        try { meta = JSON.parse(lab.results); } catch (e) {}
                      }
                      
                      // Render either structured parameters or standard raw text findings
                      const parameterValues = meta.values ? Object.entries(meta.values) : [];
                      
                      return (
                        <div key={i} className="bg-slate-950 border border-slate-850 p-3 rounded-lg space-y-2 font-sans">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-200 text-xs block">{lab.item_name}</span>
                              <span className="text-[9px] text-slate-505 font-mono">Released: {new Date(lab.updated_at || lab.created_at).toLocaleTimeString()}</span>
                            </div>
                            {meta.critical === true && (
                              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black animate-pulse">
                                CRITICAL VALUE
                              </span>
                            )}
                          </div>
                          
                          {parameterValues.length > 0 ? (
                            <div className="space-y-1 bg-slate-900/50 p-2 rounded border border-slate-900/80 font-sans">
                              {parameterValues.map(([param, val], idx) => (
                                <div key={idx} className="flex justify-between text-[10px] py-0.5 border-b border-slate-950/40 last:border-b-0">
                                  <span className="text-slate-400 font-medium">{param}:</span>
                                  <span className="font-mono text-slate-200 font-bold">{val}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10.5px] text-slate-350 bg-slate-900/50 p-2 rounded border border-slate-900/80 font-mono whitespace-pre-wrap">
                              {lab.results || 'No result details available.'}
                            </p>
                          )}
                          
                          {lab.notes && (
                            <p className="text-[10px] text-slate-500 italic">
                              Note: {lab.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Historical Clinical Review Panel */}
            {patientHistory && patientHistory.visits.length > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
                  <ClipboardList size={14} /> Clinical Review & History Trends (Prior Visits: {patientHistory.visits.length - 1})
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                  {/* Previous Consultations */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">SOAP History</span>
                    {patientHistory.consultations.length === 0 ? (
                      <p className="text-slate-600 italic">No prior consultations recorded.</p>
                    ) : (
                      patientHistory.consultations.map((c, idx) => {
                        const vObj = patientHistory.visits.find(v => v.id === c.visit_id);
                        return (
                          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                              <span>Date: {vObj ? new Date(vObj.created_at).toLocaleDateString() : 'N/A'}</span>
                              <span className="bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded font-bold">{c.diagnosis_icd10}</span>
                            </div>
                            <p className="text-slate-300 font-medium"><span className="text-slate-505 font-bold">Hx:</span> {c.history}</p>
                            <p className="text-slate-300"><span className="text-slate-505 font-bold">Exam:</span> {c.examination}</p>
                            {c.treatment_plan && <p className="text-slate-400 italic"><span className="text-slate-505 font-bold">Plan:</span> {c.treatment_plan}</p>}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Vitals Trends Table */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Vitals Trends Chart</span>
                    {patientHistory.triages.length === 0 ? (
                      <p className="text-slate-600 italic">No prior vitals recorded.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-850 rounded-lg bg-slate-950">
                        <table className="w-full text-left text-[10px] border-collapse font-mono">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-850 text-slate-400">
                              <th className="p-2">Date</th>
                              <th className="p-2">BP</th>
                              <th className="p-2">Temp</th>
                              <th className="p-2">Pulse</th>
                              <th className="p-2">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientHistory.triages.map((t, idx) => {
                              const vObj = patientHistory.visits.find(v => v.id === t.visit_id);
                              return (
                                <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-900/40 text-slate-300">
                                  <td className="p-2">{vObj ? new Date(vObj.created_at).toLocaleDateString() : 'N/A'}</td>
                                  <td className="p-2 text-slate-200 font-bold">{t.systolic}/{t.diastolic}</td>
                                  <td className={t.temperature >= 38 ? 'p-2 text-red-400' : 'p-2'}>{t.temperature}°C</td>
                                  <td className="p-2">{t.heart_rate}</td>
                                  <td className="p-2">{t.weight || '—'}kg</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Previous Diagnostic Findings */}
                  <div className="lg:col-span-2 space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Diagnostic Reports & Released Results</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {patientHistory.orders.filter(o => o.status === 'released' || o.status === 'completed' || o.status === 'dispensed').length === 0 ? (
                        <p className="text-slate-650 col-span-2 italic">No prior released results recorded.</p>
                      ) : (
                        patientHistory.orders
                          .filter(o => o.status === 'released' || o.status === 'completed' || o.status === 'dispensed')
                          .map((o, idx) => {
                            const vObj = patientHistory.visits.find(v => v.id === o.visit_id);
                            let meta = {};
                            if (o.results && o.results.startsWith('{')) {
                              try { meta = JSON.parse(o.results); } catch (e) {}
                            }
                            const formattedResult = meta.values || o.results || '';
                            return (
                              <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-200 block text-xs">{o.item_name}</span>
                                  <span className="text-[9px] text-slate-505 font-mono">Date: {vObj ? new Date(vObj.created_at).toLocaleDateString() : 'N/A'} | Type: {o.type.toUpperCase()}</span>
                                  <p className="text-slate-400 font-mono text-[10px] mt-1 bg-slate-900/50 p-1.5 rounded border border-slate-900">Result: {formattedResult}</p>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">

            {message.text && (
              <div
                className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                  message.type === "success"
                    ? "bg-green-500/5 border-green-500/20 text-green-400"
                    : "bg-red-500/5 border-red-500/20 text-red-400"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <ShieldAlert size={18} />
                )}
                <span>{message.text}</span>
              </div>
            )}
            </div>

            <form onSubmit={handleSubmitClick} className="space-y-6">
              
              {/* EMR Template Selector */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical EMR Template:</span>
                  <select
                    value={activeTemplate}
                    onChange={(e) => setActiveTemplate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="general">General Outpatient Template</option>
                    <option value="pediatrics">Pediatrics / Child Development Template</option>
                    <option value="anc">Antenatal Care (Obstetric) Template</option>
                    <option value="fp">Family Planning (FP) Template</option>
                  </select>
                </div>
                <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider bg-teal-500/10 px-2.5 py-1 rounded">
                  Classification: {selectedVisit.service_type}
                </span>
              </div>

              {/* Specialized Pediatrics Form */}
              {activeTemplate === 'pediatrics' && (
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Pediatric Growth & Immunization Chart</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Child Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 8.5"
                        value={pediatricWeight}
                        onChange={(e) => setPediatricWeight(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Head Circumference (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 42.0"
                        value={pediatricHeadCirc}
                        onChange={(e) => setPediatricHeadCirc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Developmental Milestones</label>
                      <select
                        value={pediatricMilestones}
                        onChange={(e) => setPediatricMilestones(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      >
                        <option value="normal">Normal / Age-Appropriate</option>
                        <option value="delayed">Slight Milestone Delay</option>
                        <option value="significant_delay">Significant Delay (Referral Needed) ⚠️</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3">
                    <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-2">Immunizations / Vaccines Administered Today</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'bcg', label: 'BCG (Tuberculosis)' },
                        { id: 'opv', label: 'OPV (Oral Polio Vaccine)' },
                        { id: 'dpt', label: 'DPT-HepB-Hib (Pentavalent)' },
                        { id: 'measles', label: 'Measles-Rubella (MR)' }
                      ].map(v => (
                        <label key={v.id} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input
                            type="checkbox"
                            checked={pediatricImmunizations.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPediatricImmunizations([...pediatricImmunizations, v.id]);
                              } else {
                                setPediatricImmunizations(pediatricImmunizations.filter(id => id !== v.id));
                              }
                            }}
                            className="accent-teal-500"
                          />
                          {v.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Specialized ANC Enrollment/Form */}
              {activeTemplate === 'anc' && !activePregnancy && (
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-teal-400">Pregnancy Registry Enrollment</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Please initialize this patient's pregnancy metrics to generate the gestational timeline.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">LMP Date *</label>
                      <input
                        type="date"
                        value={ancLmp}
                        onChange={(e) => setAncLmp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gravidity *</label>
                      <input
                        type="number"
                        min="1"
                        value={ancGravidity}
                        onChange={(e) => setAncGravidity(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Parity *</label>
                      <input
                        type="number"
                        min="0"
                        value={ancParity}
                        onChange={(e) => setAncParity(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Abortions *</label>
                      <input
                        type="number"
                        min="0"
                        value={ancAbortions}
                        onChange={(e) => setAncAbortions(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnrollPregnancy}
                    disabled={ancEnrollLoading || !ancLmp}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {ancEnrollLoading ? 'Initializing Profile...' : 'Initialize Pregnancy Profile'}
                  </button>
                </div>
              )}

              {activeTemplate === 'anc' && activePregnancy && (
                <div className="space-y-6">
                  {renderPregnancyProgress()}

                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Maternal Vitals & Fetal Assessment</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ANC Visit Number</label>
                        <input
                          type="number"
                          min="1"
                          value={ancVisitNumber}
                          onChange={(e) => setAncVisitNumber(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fundal Height (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 24.5"
                          value={ancFundalHeight}
                          onChange={(e) => setAncFundalHeight(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fetal Heart Rate (bpm)</label>
                        <input
                          type="number"
                          placeholder="e.g. 140"
                          value={ancFetalHeartRate}
                          onChange={(e) => setAncFetalHeartRate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Risk Category</label>
                        <select
                          value={ancRiskLevel}
                          onChange={(e) => setAncRiskLevel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        >
                          <option value="normal">Normal Risk</option>
                          <option value="medium">Medium Risk</option>
                          <option value="high">High Risk Pregnancy ⚠️</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 py-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-450 cursor-pointer select-none hover:text-white transition">
                          <input
                            type="checkbox"
                            checked={ancEdema}
                            onChange={(e) => setAncEdema(e.target.checked)}
                            className="accent-teal-500 h-4 w-4 bg-slate-900 border-slate-800 rounded text-teal-500"
                          />
                          Maternal Edema Present
                        </label>
                      </div>

                      <div className="flex items-center gap-3 py-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-455 cursor-pointer select-none hover:text-white transition">
                          <input
                            type="checkbox"
                            checked={ancIronFolateSupplied}
                            onChange={(e) => setAncIronFolateSupplied(e.target.checked)}
                            className="accent-teal-500 h-4 w-4 bg-slate-900 border-slate-800 rounded text-teal-500"
                          />
                          Iron & Folate Supplements Issued (30 Days)
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tetanus Toxoid Dose</label>
                        <select
                          value={ancTetanusDose}
                          onChange={(e) => setAncTetanusDose(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        >
                          <option value="">-- No Vaccine Administered --</option>
                          <option value="1">Tetanus Dose 1 (First visit)</option>
                          <option value="2">Tetanus Dose 2 (4 weeks later)</option>
                          <option value="3">Tetanus Dose 3 (6 months later)</option>
                        </select>
                      </div>
                      {ancTetanusDose && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tetanus Administration Date</label>
                          <input
                            type="date"
                            value={ancTetanusDate}
                            onChange={(e) => setAncTetanusDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bind instrument */}
                    <InstrumentTracker 
                      category="ANC" 
                      selectedId={boundInstrumentId} 
                      onSelect={setBoundInstrumentId} 
                    />
                  </div>
                </div>
              )}

              {/* Specialized Family Planning Form */}
              {activeTemplate === 'fp' && (
                <div className="space-y-6">
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Reproductive Profile & counseling</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reproductive History Gravidity</label>
                        <input
                          type="number"
                          value={fpGravidity}
                          onChange={(e) => setFpGravidity(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reproductive History Parity</label>
                        <input
                          type="number"
                          value={fpParity}
                          onChange={(e) => setFpParity(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-3">
                      <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-2">WHO Medical Eligibility Screening Risk Factors</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input type="checkbox" checked={fpRiskHypertension} onChange={(e) => setFpRiskHypertension(e.target.checked)} className="accent-teal-500" />
                          Hypertension (High BP)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input type="checkbox" checked={fpRiskSmoking} onChange={(e) => setFpRiskSmoking(e.target.checked)} className="accent-teal-500" />
                          Smoking & Age &gt; 35
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input type="checkbox" checked={fpRiskBreastfeeding} onChange={(e) => setFpRiskBreastfeeding(e.target.checked)} className="accent-teal-500" />
                          Breastfeeding (&lt;6mo)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input type="checkbox" checked={fpRiskPid} onChange={(e) => setFpRiskPid(e.target.checked)} className="accent-teal-500" />
                          Active PID / STI
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-white transition">
                          <input type="checkbox" checked={fpRiskBleeding} onChange={(e) => setFpRiskBleeding(e.target.checked)} className="accent-teal-500" />
                          Unexplained Vaginal Bleeding
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1.5">Select Contraceptive Method</label>
                        <select
                          value={fpMethodSelectedId}
                          onChange={(e) => setFpMethodSelectedId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                        >
                          <option value="">-- Choose Method --</option>
                          {contraceptiveMethodsList.map(m => (
                            <option key={m.id} value={m.id}>{m.method_name} ({m.method_code})</option>
                          ))}
                        </select>
                      </div>
                      
                      {fpMethodSelectedId && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1.5">Insertion Date</label>
                          <input
                            type="date"
                            value={fpInsertionDate}
                            onChange={(e) => setFpInsertionDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                          />
                        </div>
                      )}
                    </div>

                    {fpWhoResult && (
                      <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                        fpWhoResult.category === 1 ? 'bg-green-500/5 border-green-500/25 text-green-400' :
                        fpWhoResult.category === 2 ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400' :
                        fpWhoResult.category === 3 ? 'bg-amber-500/5 border-amber-500/25 text-amber-400' :
                        'bg-red-500/5 border-red-500/25 text-red-400'
                      }`}>
                        <span className="font-bold text-xs">WHO Category {fpWhoResult.category}: {fpWhoResult.recommendation}</span>
                        {fpWhoResult.reasons.map((r, i) => (
                          <span key={i} className="text-[10px] block">• {r}</span>
                        ))}
                      </div>
                    )}

                    {/* Bind instrument */}
                    <InstrumentTracker 
                      category="general" 
                      selectedId={boundInstrumentId} 
                      onSelect={setBoundInstrumentId} 
                    />
                  </div>

                  {renderFpMethodsTable()}
                </div>
              )}

              {/* SOAP Text Area Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    History of Presenting Illness *
                  </label>
                  <textarea
                    rows="4"
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder="Enter subjective history, symptoms description..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Physical Examination *
                  </label>
                  <textarea
                    rows="4"
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                    placeholder="Enter objective physical exams, chest sounds, abdominal palpations..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Diagnosis and Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    ICD-10 Diagnosis *
                  </label>
                  <DiagnosisAutocomplete
                    value={diagnosis.split(' (')[1]?.replace(')', '') || diagnosis}
                    onSelect={(disease) => setDiagnosis(`${disease.name} (${disease.code})`)}
                    workflowType={selectedVisit.service_type}
                    placeholder="Search ICD-10 code or disease name..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Treatment Plan / Notes
                  </label>
                  <input
                    type="text"
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="e.g. Bed rest, follow-up after laboratory result review"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-750 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {/* AI Diagnosis Assistant */}
              <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">AI Diagnosis Assistant</h4>
                  <button
                    type="button"
                    onClick={handleAiDiagnose}
                    disabled={aiLoading}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50 transition"
                  >
                    {aiLoading ? 'Analyzing...' : 'AI Suggest Diagnosis'}
                  </button>
                </div>

                {aiError && (
                  <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                    {aiError}
                  </div>
                )}

                {aiDiagnosisResult && (
                  <div className="mt-3 space-y-2">
                    {aiDiagnosisResult.diagnosis && (
                      <div className="text-[11px] text-slate-200 whitespace-pre-line leading-relaxed">
                        {aiDiagnosisResult.diagnosis}
                      </div>
                    )}
                    {!aiDiagnosisResult.diagnosis && aiDiagnosisResult.error && (
                      <div className="text-[11px] text-red-400">
                        {aiDiagnosisResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Clinical Recommendations (ICD-10 Suggestions) */}
              {diagnosis && (() => {
                const disease = diseaseMaster.find(d => `${d.name} (${d.code})` === diagnosis);
                if (!disease) return null;
                
                return (
                  <div className="bg-slate-950 border border-teal-500/20 p-4 rounded-xl space-y-2 mt-4">
                    <h4 className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                      ICD-10 Suggested Protocol: {disease.name} ({disease.code})
                    </h4>
                    <p className="text-[10px] text-slate-405">
                      <strong>Typical Symptoms:</strong> {disease.symptoms} | <strong>Suggested Dept:</strong> {disease.suggestedDepartment}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      {/* Suggested Labs */}
                      {disease.suggestedLabs && disease.suggestedLabs.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Labs:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {disease.suggestedLabs.map((labName, idx) => {
                              const alreadyOrdered = orderedLabs.includes(labName);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!alreadyOrdered) {
                                      setOrderedLabs([...orderedLabs, labName]);
                                    }
                                  }}
                                  className={`text-[9px] font-bold px-2 py-1 rounded transition ${
                                    alreadyOrdered 
                                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                                      : "bg-slate-900 text-slate-350 border border-slate-800 hover:border-teal-500/30"
                                  }`}
                                >
                                  {alreadyOrdered ? "✓ " : "+ "} {labName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested Meds */}
                      {disease.suggestedMedications && disease.suggestedMedications.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Medications:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {disease.suggestedMedications.map((medName, idx) => {
                              const drugObj = availableDrugs.find(d => d.genericName.toLowerCase() === medName.toLowerCase());
                              const fullName = drugObj ? drugObj.name : medName;
                              
                              const alreadyPrescribed = prescriptions.some(p => p.name === fullName);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!alreadyPrescribed) {
                                      const emptyIndex = prescriptions.findIndex(p => !p.name);
                                      if (emptyIndex !== -1) {
                                        handlePrescriptionChange(emptyIndex, "name", fullName);
                                      } else {
                                        setPrescriptions([
                                          ...prescriptions,
                                          { name: fullName, dosage: drugObj ? drugObj.strength : "", frequency: "1x1", duration: "3 days", price: drugObj ? drugObj.price : 0 }
                                        ]);
                                      }
                                    }
                                  }}
                                  className={`text-[9px] font-bold px-2 py-1 rounded transition ${
                                    alreadyPrescribed 
                                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                                      : "bg-slate-900 text-slate-350 border border-slate-800 hover:border-teal-500/30"
                                  }`}
                                >
                                  {alreadyPrescribed ? "✓ " : "+ "} {medName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
                            {/* Orders Generator */}
              <div className="border-t border-slate-850 pt-4 mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Lab Orders Box */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                      Order Labs
                    </h4>
                    {labTestMaster.map((test) => (
                      <label
                        key={test.id}
                        className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={orderedLabs.includes(test.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOrderedLabs([...orderedLabs, test.name]);
                            } else {
                              setOrderedLabs(orderedLabs.filter((l) => l !== test.name));
                            }
                          }}
                          className="accent-teal-500 rounded border-slate-800 bg-slate-950 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                        />
                        {test.name} (KES {getLabPrice(test.name)}/-)
                      </label>
                    ))}
                  </div>

                  {/* Radiology Orders Box */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                      Order Radiology Scans
                    </h4>
                    {radiologyTestMaster.map((scan) => (
                      <label
                        key={scan.id}
                        className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={orderedRadiology.includes(scan.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOrderedRadiology([...orderedRadiology, scan.name]);
                            } else {
                              setOrderedRadiology(orderedRadiology.filter((r) => r !== scan.name));
                            }
                          }}
                          className="accent-purple-500 rounded border-slate-800 bg-slate-950 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                        />
                        <div>
                          <span className="block font-medium">{scan.name}</span>
                          <span className="text-[9px] text-slate-500">{scan.modality} | {scan.price}/-</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Surgery Referral Box */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                      Refer to Surgery
                    </h4>
                    {surgicalProcedureMaster.map((surg) => (
                      <label
                        key={surg.id}
                        className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={orderedSurgeries.includes(surg.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOrderedSurgeries([...orderedSurgeries, surg.name]);
                            } else {
                              setOrderedSurgeries(orderedSurgeries.filter((s) => s !== surg.name));
                            }
                          }}
                          className="accent-red-500 rounded border-slate-800 bg-slate-950 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                        />
                        <div>
                          <span className="block font-medium">{surg.name}</span>
                          <span className="text-[9px] text-slate-500">{surg.price}/-</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Follow-up Scheduler Box */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                      Schedule Follow-up
                    </h4>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Review Visit Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 text-xs w-full font-mono"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-[9px] text-slate-500 leading-relaxed mt-1">
                        Scheduling a review writes a scheduled follow-up order on the patient's care timeline.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prescription Box */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      Prescribe Medication
                    </h4>
                    <button
                      type="button"
                      onClick={addPrescriptionRow}
                      className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      + Add Drug
                    </button>
                  </div>

                  {/* Quick Prescribe Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/60 p-2 border border-slate-850 rounded-lg">
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase mr-1">Quick Prescribe:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickPrescribe('malaria')}
                      className="text-[9px] font-bold px-2 py-1 bg-slate-955 border border-slate-800 hover:border-teal-500/30 text-slate-350 rounded hover:text-teal-400 transition cursor-pointer"
                    >
                      + Malaria Combo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPrescribe('hypertension')}
                      className="text-[9px] font-bold px-2 py-1 bg-slate-955 border border-slate-800 hover:border-teal-500/30 text-slate-350 rounded hover:text-teal-400 transition cursor-pointer"
                    >
                      + Gastritis Set
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPrescribe('cold')}
                      className="text-[9px] font-bold px-2 py-1 bg-slate-955 border border-slate-800 hover:border-teal-500/30 text-slate-350 rounded hover:text-teal-400 transition cursor-pointer"
                    >
                      + Cold & Cough
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPrescribe('diarrhea')}
                      className="text-[9px] font-bold px-2 py-1 bg-slate-955 border border-slate-800 hover:border-teal-500/30 text-slate-350 rounded hover:text-teal-400 transition cursor-pointer"
                    >
                      + Gastroenteritis Set
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {prescriptions.map((p, idx) => (
                      <div key={idx} className="flex flex-col bg-slate-900 border border-slate-850 p-2 rounded-lg gap-2">
                        <div className="flex items-center gap-2 relative group w-full">
                          <select
                            value={p.name}
                            onChange={(e) =>
                              handlePrescriptionChange(
                                idx,
                                "name",
                                e.target.value,
                              )
                            }
                            className="flex-1 bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="">-- Choose Drug --</option>
                            {availableDrugs.map((d, i) => (
                              <option key={i} value={d.name}>
                                {d.name} ({d.price}/-)
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={p.dosage}
                            onChange={(e) =>
                              handlePrescriptionChange(
                                idx,
                                "dosage",
                                e.target.value,
                              )
                            }
                            placeholder="Dosage (e.g. 500mg)"
                            className="w-24 bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                          <select
                            value={p.frequency}
                            onChange={(e) =>
                              handlePrescriptionChange(
                                idx,
                                "frequency",
                                e.target.value,
                              )
                            }
                            className="w-18 bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="1x1">1x1</option>
                            <option value="2x1">2x1</option>
                            <option value="3x1">3x1</option>
                            <option value="2x2">2x2</option>
                            <option value="PRN">PRN</option>
                          </select>

                          {prescriptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePrescriptionRow(idx)}
                              className="text-slate-550 hover:text-red-400 font-bold px-1 transition"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Live Warnings and Alerts */}
                        {p.name && (() => {
                          const med = getMedicineDetails(p.name);
                          if (!med) return null;
                          const warnings = [];
                          if (!med.childSafeFlag && patientAge < 12) {
                            warnings.push(`Not recommended for pediatric patient (Age: ${patientAge})`);
                          }
                          if (!med.pregnancySafeFlag && patientGender.toLowerCase() === 'female') {
                            warnings.push(`Pregnancy Contraindication: verify pregnancy state`);
                          }
                          if (med.controlledDrugFlag) {
                            warnings.push(`Controlled Drug Lot: require secure storage & check`);
                          }
                          if (warnings.length > 0) {
                            return (
                              <div className="text-[10px] text-yellow-450 font-bold bg-yellow-950/20 border border-yellow-500/15 py-0.5 px-2 rounded flex flex-col gap-0.5 w-full">
                                {warnings.map((w, wIdx) => (
                                  <span key={wIdx}>⚠️ {w}</span>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {loading
                    ? "Submitting Consult..."

              <button
                type="button"
                onClick={handleAiWriteMedicalReport}
                disabled={aiMedicalReportLoading}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-teal-500/30 disabled:opacity-50 transition"
              >
                {aiMedicalReportLoading ? 'Writing Report...' : 'AI Write Medical Report'}
              </button>
              
                    : "Submit Consult & Issue Orders"}
                </button>
              </div>
            </form>
          </div>
        )}

              {aiMedicalReportError && (
                <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 w-full">
                  {aiMedicalReportError}
                </div>
              )}
              {aiMedicalReportResult && (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-[11px] text-slate-200 whitespace-pre-line leading-relaxed">{aiMedicalReportResult}</div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(aiMedicalReportResult)}
                    className="text-[10px] font-bold text-teal-400 hover:text-teal-300"
                  >
                    Copy to clipboard
                  </button>
                </div>
              )}
      {/* MOH RECORD COMPLETION VERIFICATION MODAL */}
      {showMOHModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-880 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Activity size={16} className="text-teal-400" /> Ministry of Health (MOH) Sync Verification
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Kenya Health Information Exchange (HIE) Compliance check</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowMOHModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-2">
                <span className="font-bold text-slate-350 block uppercase text-[9px] tracking-wider mb-1">Verify Patient Demographics</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-505">Name:</span> <span className="text-slate-300 font-bold">{selectedVisit.patient?.name}</span></div>
                  <div><span className="text-slate-505">Gender:</span> <span className="text-slate-300 font-bold uppercase">{selectedVisit.patient?.gender}</span></div>
                  <div><span className="text-slate-505">Age:</span> <span className="text-slate-300 font-bold">{patientAge} years</span></div>
                  <div><span className="text-slate-505">Diagnosis:</span> <span className="text-teal-450 font-bold">{diagnosis.split(' (')[0]}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="font-bold text-slate-350 block uppercase text-[9px] tracking-wider">Required MOH Compliance Fields</span>

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
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                {/* Vital signs checks */}
                <div className="bg-slate-950/20 border border-slate-850/80 p-3 rounded-lg space-y-3">
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
                        min="25"
                        max="45"
                        placeholder="e.g. 37.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
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
                        min="0.5"
                        max="500"
                        placeholder="e.g. 70.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>

                  {/* BP for Adults */}


                  {patientAge >= 18 && (
                    <div className="space-y-1.5 border-t border-slate-850/60 pt-2.5">
                      <div className="flex justify-between text-[10px] font-sans">
                        <span className="text-slate-400 font-bold">Blood Pressure (Required for Adults &gt;= 18 yrs) *</span>
                        {(mohSystolic && mohDiastolic) ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">⚠️</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={mohSystolic}
                          onChange={(e) => setMohSystolic(e.target.value)}
                          min="50"
                          max="280"
                          placeholder="Systolic (e.g. 120)"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
                          required
                        />
                        <input
                          type="number"
                          value={mohDiastolic}
                          onChange={(e) => setMohDiastolic(e.target.value)}
                          min="30"
                          max="180"
                          placeholder="Diastolic (e.g. 80)"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
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
                  className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500 cursor-pointer mt-0.5"
                />
                <label htmlFor="confirmMOH" className="text-[11px] text-slate-400 leading-normal cursor-pointer select-none">
                  I confirm that all Ministry of Health (MOH) data fields are fully captured and verified for this outpatient encounter.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowMOHModal(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-350 rounded-lg text-xs font-bold transition"
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                disabled={!mohConfirmed || !mohVillage || !mohTemp || !mohWeight || (patientAge >= 18 && (!mohSystolic || !mohDiastolic))}
                onClick={() => handleSaveConsultation()}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs transition active:scale-[0.98]"
              >
                Verify & Complete Patient Lifecycle
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}