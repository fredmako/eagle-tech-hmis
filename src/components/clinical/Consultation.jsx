import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Activity,
  ShieldAlert,
  CheckCircle,
  Search,
  FileText,
  ClipboardList,
} from "lucide-react";
import { diseaseMaster, medicineMaster, labTestMaster, radiologyTestMaster, surgicalProcedureMaster } from "../../medicalMaster";
import { parsePatientContact } from "../../notificationService";
import { Heart, MapPin } from "lucide-react";

export default function Consultation({ user, onComplete }) {
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [triageData, setTriageData] = useState(null);

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
  }, []);

  const fetchConsultationQueue = async () => {
    try {
      const { data: vsts } = await supabase
        .from("visits")
        .select("*")
        .eq("department", "consultation")
        .eq("status", "waiting");
      const { data: pts } = await supabase.from("patients").select("*");

      const enrichedQueue = vsts
        ? vsts.map((v) => {
            const p = pts?.find((pt) => pt.id === v.patient_id);
            return { ...v, patient: p };
          })
        : [];

      setQueue(enrichedQueue);
      if (enrichedQueue.length > 0) {
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
    setSelectedVisit(visit);

    // Clear clinical forms
    setHistory("");
    setExam("");
    setDiagnosis("");
    setTreatmentPlan("");
    setOrderedLabs([]);
    setOrderedRadiology([]);
    setOrderedSurgeries([]);
    setFollowUpDate("");
    setPatientHistory(null);
    setPrescriptions([
      { name: "", dosage: "", frequency: "1x1", duration: "3 days", price: 0 },
    ]);
    setMessage({ type: "", text: "" });

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

  const getPatientAge = (dobString) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
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
    try {
      // Save village to patient phone meta
      const contactInfo = selectedVisit.patient ? parsePatientContact(selectedVisit.patient.phone) : {};
      if (mohVillage !== contactInfo.village) {
        const updatedPhone = JSON.stringify({
          ...contactInfo,
          village: mohVillage
        });
        await supabase.from('patients').update({ phone: updatedPhone }).eq('id', selectedVisit.patient_id);
      }

      // Save vitals
      if (triageData) {
        await supabase.from('triages').update({
          temperature: parseFloat(mohTemp) || triageData.temperature,
          weight: parseFloat(mohWeight) || triageData.weight,
          systolic: parseInt(mohSystolic) || triageData.systolic,
          diastolic: parseInt(mohDiastolic) || triageData.diastolic
        }).eq('id', triageData.id);
      } else {
        const triageId = 'tr_' + Math.random().toString(36).substring(2, 11);
        await supabase.from('triages').insert({
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
      }
    } catch (err) {
      console.error('[MOH Record Save Error]', err);
    }
  };

  const handleSaveConsultation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedVisit) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 0. Save validated MOH details
      await saveMOHRecords();

      // 1. Insert Consultation Notes
      const consultRecord = {
        visit_id: selectedVisit.id,
        history,
        examination: exam,
        diagnosis_icd10: diagnosis,
        treatment_plan: treatmentPlan,
      };

      const { error: consultErr } = await supabase
        .from("consultations")
        .insert(consultRecord);
      if (consultErr) throw consultErr;

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
              price: testObj.price,
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
        const testObj = labTestMaster.find(t => t.name === testName);
        return sum + (testObj ? testObj.price : 0);
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

      setMessage({
        type: "success",
        text: `Consultation notes saved. Patient redirected to ${nextDept.toUpperCase()}.`,
      });

      setTimeout(() => {
        fetchConsultationQueue();
        if (onComplete) onComplete();
      }, 1200);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Error saving consultation details.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Column: Waiting Queue (1/4 width) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4 h-fit">
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
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
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
                <div className="text-left sm:text-right">
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
                  <select
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  >
                    <option value="">-- Select Diagnosis --</option>
                    {icd10Diagnoses.map((d, i) => (
                      <option key={i} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
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
                        {test.name} ({test.price}/-)
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
                    : "Submit Consult & Issue Orders"}
                </button>
              </div>
            </form>
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
                          placeholder="Systolic (e.g. 120)"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
                          required
                        />
                        <input
                          type="number"
                          value={mohDiastolic}
                          onChange={(e) => setMohDiastolic(e.target.value)}
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
