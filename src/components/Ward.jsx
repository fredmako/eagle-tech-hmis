import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sendNotification, parsePatientContact } from '../notificationService';
import { Bed, PlusCircle, CheckCircle, AlertCircle, ClipboardList, Thermometer } from 'lucide-react';

export default function Ward({ user }) {
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  
  // New Admission states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [targetBed, setTargetBed] = useState('Bed 01');

  // Observations states
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  // Discharge states
  const [dischargeNotes, setDischargeNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const bedsList = ['Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Bed 06', 'Bed 07', 'Bed 08'];

  useEffect(() => {
    fetchWardData();
  }, []);

  const fetchWardData = async () => {
    try {
      // Admitted visits have department = 'ward' (let's assume 'ward' is a department)
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'ward').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');

      setPatients(pts || []);
      
      const enriched = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        // Emulate assigning a bed index based on ID hash or session-stored bed allocations
        const savedBeds = JSON.parse(localStorage.getItem('egesa_ward_bed_allocations') || '{}');
        const bed = savedBeds[v.id] || 'Bed 01';
        return { ...v, patient: p, bed };
      }) : [];

      setAdmissions(enriched);
      
      if (enriched.length > 0) {
        setSelectedAdmission(enriched[0]);
      } else {
        setSelectedAdmission(null);
      }
    } catch (err) {
      console.error('Error loading ward data:', err);
    }
  };

  const handleAdmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setMessage({ type: 'error', text: 'Please select a patient.' });
      return;
    }

    // Check if bed is occupied
    const isOccupied = admissions.some(a => a.bed === targetBed);
    if (isOccupied) {
      setMessage({ type: 'error', text: `${targetBed} is already occupied.` });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Create a new visit directed to 'ward'
      const newAdmission = {
        patient_id: selectedPatientId,
        facility_id: user.facility_id,
        department: 'ward',
        priority: 'routine',
        status: 'waiting'
      };

      const { data, error } = await supabase.from('visits').insert(newAdmission).select();
      if (error) throw error;

      if (data) {
        const visit = Array.isArray(data) ? data[0] : data;
        // Save bed allocation in local storage to keep it persistent
        const savedBeds = JSON.parse(localStorage.getItem('egesa_ward_bed_allocations') || '{}');
        savedBeds[visit.id] = targetBed;
        localStorage.setItem('egesa_ward_bed_allocations', JSON.stringify(savedBeds));
      }

      setMessage({ type: 'success', text: `Patient successfully admitted to ${targetBed}.` });
      
      // Trigger Notification
      try {
        const patient = patients.find(p => p.id === selectedPatientId);
        const contactInfo = parsePatientContact(patient?.phone);
        if (contactInfo.email) {
          await sendNotification('INPATIENT_ADMITTED', {
            patientName: patient.name,
            patientCode: patient.facility_id_code,
            bedName: targetBed,
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

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Simulate adding a ward observation record
      const details = `Temp: ${temp}°C | BP: ${bp} | Pulse: ${pulse} bpm. Notes: ${progressNotes}`;
      
      await supabase.from('audit_logs').insert({
        action: 'Ward Observation Logged',
        details: `Logged observation for inpatient ${selectedAdmission.patient?.name} on ${selectedAdmission.bed}: ${details}`
      });

      setMessage({ type: 'success', text: 'Clinical observations charted successfully.' });
      setTemp('');
      setBp('');
      setPulse('');
      setProgressNotes('');
      
      // Refresh
      fetchWardData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to chart observations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Complete the visit ticket
      const { error } = await supabase.from('visits').update({
        status: 'completed'
      }).eq('id', selectedAdmission.id);

      if (error) throw error;

      // 2. Remove bed allocation
      const savedBeds = JSON.parse(localStorage.getItem('egesa_ward_bed_allocations') || '{}');
      delete savedBeds[selectedAdmission.id];
      localStorage.setItem('egesa_ward_bed_allocations', JSON.stringify(savedBeds));

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

      setMessage({ type: 'success', text: 'Patient successfully discharged. Bed freed.' });
      setDischargeNotes('');
      fetchWardData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Discharge failed.' });
    } finally {
      setLoading(false);
    }
  };

  const getBedOccupant = (bedName) => {
    return admissions.find(a => a.bed === bedName);
  };

  return (
    <div className="space-y-6">
      {/* Bed Layout Grid Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Bed size={14} className="text-teal-400" /> Inpatient Ward Map (Active Occupancy)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {bedsList.map((bedName) => {
            const occupant = getBedOccupant(bedName);
            return (
              <button
                key={bedName}
                onClick={() => {
                  if (occupant) {
                    setSelectedAdmission(occupant);
                    setMessage({ type: '', text: '' });
                  }
                }}
                className={`border rounded-xl p-4 flex flex-col justify-between text-center min-h-[110px] transition ${
                  occupant
                    ? selectedAdmission?.id === occupant.id
                      ? 'border-teal-500 bg-teal-500/10 text-white shadow shadow-teal-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    : 'border-slate-850/60 bg-slate-950/40 border-dashed text-slate-600 cursor-default'
                }`}
              >
                <Bed size={24} className={occupant ? 'text-teal-400 mx-auto' : 'text-slate-700 mx-auto'} />
                <span className="text-xs font-bold font-mono mt-2">{bedName}</span>
                <span className="text-[10px] truncate max-w-full font-semibold block mt-1">
                  {occupant ? occupant.patient?.name.split(' ')[0] : 'Vacant'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admit Patient Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <PlusCircle size={14} className="text-teal-400" /> Admit Patient to Ward
          </h3>

          {message.text && message.type === 'error' && (
            <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-xs flex gap-2">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.facility_id_code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Bed</label>
                <select
                  value={targetBed}
                  onChange={(e) => setTargetBed(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  {bedsList.map(bed => (
                    <option key={bed} value={bed}>{bed}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition"
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
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">{selectedAdmission.bed} Inpatient File</span>
                  <h4 className="text-sm font-bold text-slate-100">{selectedAdmission.patient?.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedAdmission.patient?.facility_id_code}</span>
                </div>
              </div>

              {/* Action tabs: Observations and Discharge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Observations Logger */}
                <form onSubmit={handleLogObservation} className="space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5"><Thermometer size={12} className="text-teal-400" /> Observation Vitals Chart</span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        placeholder="37"
                        className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
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
                        className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        placeholder="72"
                        className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2 text-xs text-slate-200 text-center focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Nursing / Progress Notes</label>
                    <textarea
                      rows="2"
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Enter patient observations, fluids admin, observations..."
                      className="w-full bg-slate-950 border border-slate-850 rounded py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-350 text-xs py-1.5 rounded transition"
                  >
                    Log Observation
                  </button>
                </form>

                {/* Discharge Panel */}
                <form onSubmit={handleDischarge} className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-850/80 pt-4 md:pt-0 md:pl-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Discharge Patient Summary</span>
                  
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Discharge Diagnoses & Instructions</label>
                    <textarea
                      rows="3"
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="Type discharge notes, medication checkouts..."
                      className="w-full bg-slate-950 border border-slate-850 rounded py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs py-2 rounded-lg font-bold transition active:scale-[0.98]"
                  >
                    Authorize Patient Discharge
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
