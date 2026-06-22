import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Activity, ShieldAlert, CheckCircle, Heart, Thermometer, AlertOctagon, Zap } from 'lucide-react';
import InstrumentTracker from './InstrumentTracker';

export default function Triage({ user, onComplete }) {
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [patient, setPatient] = useState(null);

  // Vitals State
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temp, setTemp] = useState('');
  const [respRate, setRespRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmi, setBmi] = useState(0);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [priorityFlag, setPriorityFlag] = useState('green');
  const [riskIndicators, setRiskIndicators] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ETAT+ Triage & ABC Checklist States
  const [airwayStatus, setAirwayStatus] = useState('clear');
  const [breathingStatus, setBreathingStatus] = useState('normal');
  const [circulationStatus, setCirculationStatus] = useState('normal');
  const [consciousnessLevel, setConsciousnessLevel] = useState('alert');
  const [boundInstrumentId, setBoundInstrumentId] = useState('');

  // Auto evaluate ETAT+ priority flag
  useEffect(() => {
    if (airwayStatus === 'obstructed' || breathingStatus === 'apnea' || circulationStatus === 'shock' || consciousnessLevel === 'unresponsive') {
      setPriorityFlag('red');
    } else if (breathingStatus === 'distress' || circulationStatus === 'weak' || consciousnessLevel === 'pain' || consciousnessLevel === 'voice') {
      setPriorityFlag('yellow');
    } else {
      setPriorityFlag('green');
    }
  }, [airwayStatus, breathingStatus, circulationStatus, consciousnessLevel]);

  useEffect(() => {
    fetchTriageQueue();
  }, []);

  useEffect(() => {
    // Recalculate BMI
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w && h) {
      const computed = w / (h * h);
      setBmi(parseFloat(computed.toFixed(1)));
    } else {
      setBmi(0);
    }
  }, [weight, height]);

  const fetchTriageQueue = async () => {
    try {
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'triage').eq('status', 'waiting');
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
        setPatient(null);
      }
    } catch (err) {
      console.error('Error fetching triage queue:', err);
    }
  };

  const handleSelectVisit = (visit) => {
    setSelectedVisit(visit);
    setPatient(visit.patient);
    
    // Clear vitals
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setTemp('');
    setRespRate('');
    setSpo2('');
    setWeight('');
    setHeight('');
    setChiefComplaint('');
    setPriorityFlag('green');
    setRiskIndicators('');
    setMessage({ type: '', text: '' });
  };

  const handleSaveTriage = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    // Validation of vitals
    if (temp) {
      const tempVal = parseFloat(temp);
      if (tempVal < 25 || tempVal > 45) {
        setMessage({ type: 'error', text: 'Temperature must be between 25.0°C and 45.0°C.' });
        return;
      }
    }
    const sysVal = systolic ? parseInt(systolic, 10) : null;
    const diaVal = diastolic ? parseInt(diastolic, 10) : null;

    if (sysVal !== null && (sysVal < 50 || sysVal > 280)) {
      setMessage({ type: 'error', text: 'Systolic blood pressure must be between 50 mmHg and 280 mmHg.' });
      return;
    }
    if (diaVal !== null && (diaVal < 30 || diaVal > 180)) {
      setMessage({ type: 'error', text: 'Diastolic blood pressure must be between 30 mmHg and 180 mmHg.' });
      return;
    }
    if (sysVal !== null && diaVal !== null && diaVal >= sysVal) {
      setMessage({ type: 'error', text: 'Diastolic blood pressure must be strictly lower than systolic blood pressure.' });
      return;
    }

    if (heartRate) {
      const hrVal = parseInt(heartRate, 10);
      if (hrVal < 30 || hrVal > 260) {
        setMessage({ type: 'error', text: 'Pulse / Heart rate must be between 30 bpm and 260 bpm.' });
        return;
      }
    }

    if (respRate) {
      const rrVal = parseInt(respRate, 10);
      if (rrVal < 6 || rrVal > 80) {
        setMessage({ type: 'error', text: 'Respiratory rate must be between 6 and 80 breaths per minute.' });
        return;
      }
    }

    if (spo2) {
      const spo2Val = parseInt(spo2, 10);
      if (spo2Val < 10 || spo2Val > 100) {
        setMessage({ type: 'error', text: 'Oxygen saturation (SPO2) must be between 10% and 100%.' });
        return;
      }
    }

    if (weight) {
      const wVal = parseFloat(weight);
      if (wVal < 0.5 || wVal > 500) {
        setMessage({ type: 'error', text: 'Weight must be between 0.5 kg and 500 kg.' });
        return;
      }
    }

    if (height) {
      const hVal = parseFloat(height);
      if (hVal < 0.2 || hVal > 2.6) {
        setMessage({ type: 'error', text: 'Height must be between 0.2 m and 2.6 m.' });
        return;
      }
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Save triage records
      const triageRecord = {
        visit_id: selectedVisit.id,
        systolic: parseInt(systolic) || null,
        diastolic: parseInt(diastolic) || null,
        heart_rate: parseInt(heartRate) || null,
        temperature: parseFloat(temp) || null,
        resp_rate: parseInt(respRate) || null,
        spo2: parseInt(spo2) || null,
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        bmi: bmi || null,
        chief_complaint: chiefComplaint,
        priority_flag: priorityFlag,
        risk_indicators: riskIndicators
      };

      const { error: triageErr } = await supabase.from('triages').insert(triageRecord);
      if (triageErr) throw triageErr;

      // 1b. Save specialized Triage Assessment
      const assessmentId = 'trga_' + Math.random().toString(36).substring(2, 12);
      await supabase.from('triage_assessments').insert({
        id: assessmentId,
        emergency_id: selectedVisit.id,
        facility_id: user.facility_id,
        assessment_datetime: new Date().toISOString(),
        airway_status: airwayStatus,
        breathing_status: breathingStatus,
        circulation_status: circulationStatus,
        pulse_rate: parseInt(heartRate) || null,
        bp_systolic: parseInt(systolic) || null,
        bp_diastolic: parseInt(diastolic) || null,
        respiratory_rate: parseInt(respRate) || null,
        temperature: parseFloat(temp) || null,
        oxygen_saturation: parseInt(spo2) || null,
        pain_score: 0,
        consciousness_level: consciousnessLevel,
        triage_nurse: user.id
      });

      // 1c. If Emergency Red or Yellow flag, create emergency registration record
      if (priorityFlag === 'red' || priorityFlag === 'yellow') {
        const emrRegId = 'emr_' + Math.random().toString(36).substring(2, 12);
        await supabase.from('emergency_registrations').insert({
          id: emrRegId,
          patient_id: selectedVisit.patient_id,
          facility_id: user.facility_id,
          arrival_datetime: new Date().toISOString(),
          arrival_mode: 'walking',
          triage_datetime: new Date().toISOString(),
          priority_level: priorityFlag,
          abc_status: `Airway: ${airwayStatus}, Breathing: ${breathingStatus}, Circulation: ${circulationStatus}`,
          chief_complaint: chiefComplaint || 'Emergency Triage',
          assigned_doctor: null,
          disposition: 'triage'
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
            workflow_type: 'EMR',
            patient_id: selectedVisit.patient_id,
            encounter_id: selectedVisit.id,
            measurement_type: 'vitals_monitoring',
            result_value: parseFloat(temp) || null,
            result_unit: 'C'
          })
        });
      }

      // 2. Move patient visit to next queue
      // If priority is emergency (red), bypass consultation queue straight to ER, or route standard
      const { error: visitErr } = await supabase.from('visits').update({
        department: priorityFlag === 'red' ? 'surgery' : 'consultation', // Emergency goes straight to Theatre/ER
        priority: priorityFlag === 'red' ? 'emergency' : priorityFlag === 'yellow' ? 'urgent' : 'routine',
        status: 'waiting'
      }).eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      setMessage({ type: 'success', text: `Triage completed! Patient priority flagged as ${priorityFlag.toUpperCase()}.` });
      
      // Clear selection and refresh queue
      setTimeout(() => {
        fetchTriageQueue();
        if (onComplete) onComplete();
      }, 1000);

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save triage details.' });
    } finally {
      setLoading(false);
    }
  };

  const getBmiBadgeColor = (val) => {
    if (val <= 0) return 'text-slate-400 bg-slate-900 border border-slate-800';
    if (val < 18.5) return 'text-yellow-400 bg-yellow-950/20 border border-yellow-500/30';
    if (val >= 18.5 && val <= 24.9) return 'text-green-400 bg-green-950/20 border border-green-500/30';
    if (val >= 25 && val <= 29.9) return 'text-orange-400 bg-orange-950/20 border border-orange-500/30';
    return 'text-red-400 bg-red-950/20 border border-red-500/30';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Triage Queue List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Heart size={16} className="text-teal-400" /> Patients in Triage Queue ({queue.length})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Select a patient to enter vital signs</p>
        </div>

        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
          {queue.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                selectedVisit?.id === item.id
                  ? 'border-teal-500/60 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[70%]">{item.patient?.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  item.priority === 'urgent' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  'bg-slate-900 border border-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 w-full font-mono">
                <span>{item.patient?.facility_id_code}</span>
                <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </button>
          ))}

          {queue.length === 0 && (
            <div className="text-xs text-slate-600 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients awaiting triage.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Vitals Form */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Thermometer size={48} className="text-slate-600 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-medium text-sm">No Active Patient Selected</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient from the triage queue on the left to begin entering diagnostics.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Triage Recording</span>
                <h3 className="text-base font-bold text-slate-100">{patient?.name}</h3>
                <p className="text-xs text-slate-500">{patient?.facility_id_code} | Gender: {patient?.gender} | Age: {new Date().getFullYear() - new Date(patient?.dob).getFullYear()} yrs</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Queue Priority</span>
                <span className="text-xs font-semibold text-white uppercase bg-slate-850 px-2.5 py-0.5 rounded border border-slate-800">{selectedVisit?.priority}</span>
              </div>
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveTriage} className="space-y-5">
              {/* ETAT+ / ABC Checklist */}
              <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <AlertOctagon size={16} className="text-red-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">ETAT+ Emergency Checklist (ABC / AVPU)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  {/* Airway */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Airway</label>
                    <select
                      value={airwayStatus}
                      onChange={(e) => setAirwayStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="clear">Clear (Normal)</option>
                      <option value="obstructed">Obstructed (⚠️ Emergency)</option>
                    </select>
                  </div>

                  {/* Breathing */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Breathing</label>
                    <select
                      value={breathingStatus}
                      onChange={(e) => setBreathingStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="normal">Normal</option>
                      <option value="distress">Distress (⚠️ Urgent)</option>
                      <option value="apnea">Apnea (🚨 Emergency)</option>
                    </select>
                  </div>

                  {/* Circulation */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Circulation</label>
                    <select
                      value={circulationStatus}
                      onChange={(e) => setCirculationStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="normal">Normal</option>
                      <option value="weak">Weak Pulse (⚠️ Urgent)</option>
                      <option value="shock">Shock/No Pulse (🚨 Emergency)</option>
                    </select>
                  </div>

                  {/* Consciousness */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Consciousness (AVPU)</label>
                    <select
                      value={consciousnessLevel}
                      onChange={(e) => setConsciousnessLevel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="alert">Alert (Normal)</option>
                      <option value="voice">Voice Responsive (⚠️ Urgent)</option>
                      <option value="pain">Pain Responsive (⚠️ Urgent)</option>
                      <option value="unresponsive">Unresponsive (🚨 Emergency)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Instrument Tracker */}
              <InstrumentTracker
                category="triage"
                selectedId={boundInstrumentId}
                onSelect={(id) => setBoundInstrumentId(id)}
                measurementType="vitals_monitoring"
              />

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Blood Pressure (mmHg)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      min="50"
                      max="280"
                      placeholder="Sys"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg py-2 px-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition text-center"
                    />
                    <span className="text-slate-600 text-sm">/</span>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      min="30"
                      max="180"
                      placeholder="Dia"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg py-2 px-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition text-center"
                    />
                  </div>
                </div>

                {/* Heart Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pulse/Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    min="30"
                    max="260"
                    placeholder="e.g. 72"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['60', '72', '80', '100'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setHeartRate(val)}
                        className="text-[9px] font-bold bg-slate-950 border border-slate-850 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    min="25"
                    max="45"
                    placeholder="e.g. 36.8"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['36.5', '37.0', '38.0', '39.0'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTemp(val)}
                        className="text-[9px] font-bold bg-slate-950 border border-slate-850 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition"
                      >
                        {val}°C
                      </button>
                    ))}
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Resp Rate (bpm)</label>
                  <input
                    type="number"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    min="6"
                    max="80"
                    placeholder="e.g. 16"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['12', '16', '20', '28'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRespRate(val)}
                        className="text-[9px] font-bold bg-slate-950 border border-slate-850 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Oxygen Saturation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SPO2 Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    min="10"
                    max="100"
                    placeholder="e.g. 98"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['92', '95', '98', '100'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSpo2(val)}
                        className="text-[9px] font-bold bg-slate-950 border border-slate-850 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition"
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight & Height */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Weight (kg) & Height (m)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      min="0.5"
                      max="500"
                      step="0.1"
                      placeholder="kg"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg py-2 px-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition text-center"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min="0.2"
                      max="2.6"
                      placeholder="m"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg py-2 px-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition text-center"
                    />
                  </div>
                </div>
              </div>

              {/* BMI Panel & Priority Flagging */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4 mt-2">
                {/* BMI Display */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Body Mass Index</span>
                    <span className="text-xl font-bold text-white">{bmi || '—'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getBmiBadgeColor(bmi)}`}>
                    {bmi <= 0 ? 'Pending' :
                     bmi < 18.5 ? 'Underweight' :
                     bmi <= 24.9 ? 'Normal' :
                     bmi <= 29.9 ? 'Overweight' : 'Obese'}
                  </span>
                </div>

                {/* Priority Flag */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Clinical Priority Flag</label>
                  <div className="flex gap-3">
                    {[
                      { val: 'green', label: 'Green (Routine)', bg: 'checked:bg-green-500 ring-green-500 border-green-500/30 text-green-400' },
                      { val: 'yellow', label: 'Yellow (Urgent)', bg: 'checked:bg-yellow-500 ring-yellow-500 border-yellow-500/30 text-yellow-400' },
                      { val: 'red', label: 'Red (Emergency)', bg: 'checked:bg-red-500 ring-red-500 border-red-500/30 text-red-400' }
                    ].map(btn => (
                      <label key={btn.val} className={`flex-1 border rounded-lg py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold border-slate-800 hover:border-slate-700 cursor-pointer select-none transition ${
                        priorityFlag === btn.val ? 'bg-slate-950 border-teal-500/50' : 'bg-slate-950/40'
                      }`}>
                        <input
                          type="radio"
                          name="pflag"
                          value={btn.val}
                          checked={priorityFlag === btn.val}
                          onChange={(e) => setPriorityFlag(e.target.value)}
                          className={`accent-teal-500 h-3.5 w-3.5 cursor-pointer`}
                        />
                        <span className={btn.val === 'red' ? 'text-red-400' : btn.val === 'yellow' ? 'text-yellow-400' : 'text-green-400'}>{btn.label.split(' ')[0]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Chief Complaint *</label>
                  <textarea
                    rows="2"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Describe patient presenting complaints..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Risk Indicators / Key Observations</label>
                  <input
                    type="text"
                    value={riskIndicators}
                    onChange={(e) => setRiskIndicators(e.target.value)}
                    placeholder="e.g. Asthma history, Pregnant (LNMP), Diabetes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Submitting Vitals...' : 'Complete Triage & Move to Consultation'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
