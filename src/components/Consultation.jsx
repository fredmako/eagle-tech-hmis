import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { Activity, ShieldAlert, CheckCircle, Search, FileText, ClipboardList } from 'lucide-react';

export default function Consultation({ user, onComplete }) {
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [triageData, setTriageData] = useState(null);

  // SOAP & Order States
  const [history, setHistory] = useState('');
  const [exam, setExam] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  
  // Orders
  const [labTests, setLabTests] = useState({
    malaria: false,
    fbc: false,
    urinalysis: false,
    widal: false
  });
  
  const [prescriptions, setPrescriptions] = useState([
    { name: '', dosage: '', frequency: '1x1', duration: '3 days', price: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const availableDrugs = [
    { name: 'Artemether-Lumefantrine (AL)', price: 450, unit: 'dose' },
    { name: 'Paracetamol 500mg', price: 50, unit: 'strip' },
    { name: 'Amoxicillin 500mg', price: 180, unit: 'strip' },
    { name: 'Metronidazole 400mg', price: 120, unit: 'strip' },
    { name: 'ORS + Zinc', price: 100, unit: 'sachet' },
    { name: 'Ciprofloxacin 500mg', price: 250, unit: 'strip' }
  ];

  const icd10Diagnoses = [
    'Malaria (B54)',
    'Acute Upper Respiratory Infection (J06.9)',
    'Gastroenteritis (A09)',
    'Hypertension (I10)',
    'Urinary Tract Infection (N39.0)',
    'Typhoid Fever (A01.0)',
    'Amoebiasis (A06.9)',
    'Tonsillitis (J03.9)'
  ];

  useEffect(() => {
    fetchConsultationQueue();
  }, []);

  const fetchConsultationQueue = async () => {
    try {
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'consultation').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedQueue = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];
      
      setQueue(enrichedQueue);
      if (enrichedQueue.length > 0) {
        handleSelectVisit(enrichedQueue[0]);
      } else {
        setSelectedVisit(null);
        setTriageData(null);
      }
    } catch (err) {
      console.error('Error fetching consultation queue:', err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    
    // Clear clinical forms
    setHistory('');
    setExam('');
    setDiagnosis('');
    setTreatmentPlan('');
    setLabTests({ malaria: false, fbc: false, urinalysis: false, widal: false });
    setPrescriptions([{ name: '', dosage: '', frequency: '1x1', duration: '3 days', price: 0 }]);
    setMessage({ type: '', text: '' });

    // Fetch vital signs
    try {
      const { data } = await supabase.from('triages').select('*').eq('visit_id', visit.id);
      if (data && data.length > 0) {
        setTriageData(data[0]);
        // Prefill chief complaint as history starter
        setHistory(`Chief Complaint: ${data[0].chief_complaint}\n`);
      } else {
        setTriageData(null);
      }
    } catch (err) {
      console.error('Error fetching triage data:', err);
    }
  };

  const addPrescriptionRow = () => {
    setPrescriptions([...prescriptions, { name: '', dosage: '', frequency: '1x1', duration: '3 days', price: 0 }]);
  };

  const removePrescriptionRow = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index, field, value) => {
    const updated = prescriptions.map((item, i) => {
      if (i === index) {
        const newItem = { ...item, [field]: value };
        if (field === 'name') {
          // Auto set price based on selection
          const drug = availableDrugs.find(d => d.name === value);
          newItem.price = drug ? drug.price : 0;
        }
        return newItem;
      }
      return item;
    });
    setPrescriptions(updated);
  };

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Insert Consultation Notes
      const consultRecord = {
        visit_id: selectedVisit.id,
        history,
        examination: exam,
        diagnosis_icd10: diagnosis,
        treatment_plan: treatmentPlan
      };
      
      const { error: consultErr } = await supabase.from('consultations').insert(consultRecord);
      if (consultErr) throw consultErr;

      // 2. Insert Lab/Radiology Orders
      const orderPromises = [];
      const labsOrdered = [];
      
      const labMapping = {
        malaria: { name: 'Malaria BS/RDT', price: 150 },
        fbc: { name: 'Full Blood Count (FBC)', price: 400 },
        urinalysis: { name: 'Urinalysis Dipstick', price: 200 },
        widal: { name: 'Widal Agglutination Test', price: 300 }
      };

      Object.entries(labTests).forEach(([testKey, ordered]) => {
        if (ordered) {
          const test = labMapping[testKey];
          labsOrdered.push(test.name);
          orderPromises.push(
            supabase.from('orders').insert({
              visit_id: selectedVisit.id,
              type: 'lab',
              item_name: test.name,
              status: 'ordered',
              price: test.price
            })
          );
        }
      });

      // 3. Insert Prescriptions
      const drugPromises = [];
      prescriptions.forEach(p => {
        if (p.name) {
          drugPromises.push(
            supabase.from('orders').insert({
              visit_id: selectedVisit.id,
              type: 'prescription',
              item_name: p.name,
              instructions: `Dosage: ${p.dosage} | Freq: ${p.frequency} | Dur: ${p.duration}`,
              status: 'prescribed',
              price: p.price
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
      // If Lab tests ordered, route to 'lab'
      // Else if drugs prescribed but no lab, route to 'billing' (or pharmacy, but billing is required before dispensing in many health systems)
      // We will route: Lab -> Pharmacy/Billing.
      // Let's decide: if lab tests exist, next station is 'lab'. If no lab but drugs exist, next station is 'billing' (to pay for drugs first).
      // If nothing ordered, complete the visit.
      let nextDept = 'completed';
      if (orderPromises.length > 0) {
        nextDept = 'lab';
      } else if (drugPromises.length > 0) {
        nextDept = 'billing';
      }

      const { error: visitErr } = await supabase.from('visits').update({
        department: nextDept,
        status: nextDept === 'completed' ? 'completed' : 'waiting'
      }).eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      // 5. Generate Billing Invoice automatically if items ordered
      const totalBill = (orderPromises.length > 0 ? Object.entries(labTests).filter(([k,v]) => v).reduce((sum, [k]) => sum + labMapping[k].price, 0) : 0) +
                        (drugPromises.length > 0 ? prescriptions.filter(p => p.name).reduce((sum, p) => sum + p.price, 0) : 0);
      
      if (totalBill > 0) {
        await supabase.from('invoices').insert({
          visit_id: selectedVisit.id,
          total_amount: totalBill,
          amount_paid: 0.00,
          status: 'unpaid'
        });
      }

      setMessage({
        type: 'success',
        text: `Consultation notes saved. Patient redirected to ${nextDept.toUpperCase()}.`
      });

      setTimeout(() => {
        fetchConsultationQueue();
        if (onComplete) onComplete();
      }, 1200);

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error saving consultation details.' });
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
            <ClipboardList size={14} className="text-teal-400" /> Consult Queue ({queue.length})
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Select patient for consultation</p>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {queue.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3 rounded-lg border transition flex flex-col gap-1 ${
                selectedVisit?.id === item.id
                  ? 'border-teal-500/60 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
              }`}
            >
              <span className="font-semibold text-slate-200 text-xs truncate">{item.patient?.name}</span>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono w-full">
                <span>{item.patient?.facility_id_code}</span>
                <span className={`px-1 py-0.5 rounded capitalize ${
                  item.priority === 'emergency' ? 'text-red-400 bg-red-950/20' : 'text-slate-400 bg-slate-850'
                }`}>{item.priority}</span>
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
            <h3 className="text-slate-400 font-medium text-sm">No Consult Session Open</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient from the consultation list to load history, exam files, vitals, and issue clinical orders.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Info & Vitals Header */}
            <div className="bg-slate-950 border border-slate-850/80 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Outpatient Consultation</span>
                  <h3 className="text-sm font-bold text-slate-100">{selectedVisit.patient?.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">{selectedVisit.patient?.facility_id_code}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block">Triage Priority Badge</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    triageData?.priority_flag === 'red' ? 'text-red-400 bg-red-950/20 border-red-500/20' :
                    triageData?.priority_flag === 'yellow' ? 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20' :
                    'text-green-400 bg-green-950/20 border-green-500/20'
                  }`}>
                    {triageData?.priority_flag || 'Green'} Flag
                  </span>
                </div>
              </div>

              {/* Triage Vitals Row */}
              {triageData ? (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 border-t border-slate-850/60 pt-3">
                  {[
                    { label: 'Temp', val: `${triageData.temperature} °C`, alert: triageData.temperature >= 38 },
                    { label: 'BP', val: `${triageData.systolic}/${triageData.diastolic}`, alert: triageData.systolic >= 140 },
                    { label: 'Pulse', val: `${triageData.heart_rate} bpm`, alert: triageData.heart_rate >= 100 },
                    { label: 'SpO2', val: `${triageData.spo2} %`, alert: triageData.spo2 < 95 },
                    { label: 'BMI', val: triageData.bmi, alert: triageData.bmi >= 25 },
                    { label: 'RR', val: `${triageData.resp_rate} bpm` }
                  ].map((vit, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">{vit.label}</span>
                      <span className={`text-xs font-bold ${vit.alert ? 'text-red-400' : 'text-slate-200'}`}>{vit.val || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-yellow-500 bg-yellow-500/5 p-2 rounded text-center border border-yellow-500/20">
                  Warning: No vitals recorded in triage for this visit.
                </div>
              )}
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveConsultation} className="space-y-6">
              {/* SOAP Text Area Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">History of Presenting Illness *</label>
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
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Physical Examination *</label>
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
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">ICD-10 Diagnosis *</label>
                  <select
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  >
                    <option value="">-- Select Diagnosis --</option>
                    {icd10Diagnoses.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Treatment Plan / Notes</label>
                  <input
                    type="text"
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="e.g. Bed rest, follow-up after laboratory result review"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-750 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {/* Orders Generator */}
              <div className="border-t border-slate-850 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lab Orders Box */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">Order Labs</h4>
                  {[
                    { key: 'malaria', label: 'Malaria BS/RDT (150/-)' },
                    { key: 'fbc', label: 'Full Blood Count (400/-)' },
                    { key: 'urinalysis', label: 'Urinalysis (200/-)' },
                    { key: 'widal', label: 'Widal Agglutination (300/-)' }
                  ].map(test => (
                    <label key={test.key} className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={labTests[test.key]}
                        onChange={(e) => setLabTests({ ...labTests, [test.key]: e.target.checked })}
                        className="accent-teal-500 rounded border-slate-800 bg-slate-950 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                      />
                      {test.label}
                    </label>
                  ))}
                </div>

                {/* Prescription Box */}
                <div className="md:col-span-2 bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Prescribe Medication</h4>
                    <button
                      type="button"
                      onClick={addPrescriptionRow}
                      className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      + Add Drug
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {prescriptions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-2 rounded-lg relative group">
                        <select
                          value={p.name}
                          onChange={(e) => handlePrescriptionChange(idx, 'name', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                        >
                          <option value="">-- Choose Drug --</option>
                          {availableDrugs.map((d, i) => (
                            <option key={i} value={d.name}>{d.name} ({d.price}/-)</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={p.dosage}
                          onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (e.g. 500mg)"
                          className="w-24 bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                        <select
                          value={p.frequency}
                          onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
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
                            className="text-slate-500 hover:text-red-400 font-bold px-1 transition"
                          >
                            ×
                          </button>
                        )}
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
                  {loading ? 'Submitting Consult...' : 'Submit Consult & Issue Orders'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
