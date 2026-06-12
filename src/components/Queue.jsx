import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { Layers, ArrowRight, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';

export default function Queue({ preselectedPatient, user, clearPreselected }) {
  const [activeVisits, setActiveVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Queue ticket form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [department, setDepartment] = useState('triage');
  const [priority, setPriority] = useState('routine');

  useEffect(() => {
    fetchQueueData();
    if (preselectedPatient) {
      setSelectedPatientId(preselectedPatient.id);
    }
  }, [preselectedPatient]);

  const fetchQueueData = async () => {
    try {
      const { data: vsts } = await supabase.from('visits').select('*').order('created_at', { ascending: true });
      const { data: pts } = await supabase.from('patients').select('*');
      
      setActiveVisits(vsts || []);
      setPatients(pts || []);
    } catch (err) {
      console.error('Error fetching queue data:', err);
    }
  };

  const handleOpenVisit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setMessage({ type: 'error', text: 'Please select a patient.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Check if patient already has an active visit
      const active = activeVisits.find(v => v.patient_id === selectedPatientId && v.status !== 'completed');
      if (active) {
        throw new Error(`Patient already has an active visit in ${active.department.toUpperCase()}.`);
      }

      const newVisit = {
        patient_id: selectedPatientId,
        facility_id: user.facility_id,
        department,
        priority,
        status: 'waiting'
      };

      const { error } = await supabase.from('visits').insert(newVisit);
      if (error) throw error;

      setMessage({ type: 'success', text: 'Visit ticket opened successfully!' });
      
      // Clear selection
      setSelectedPatientId('');
      if (clearPreselected) clearPreselected();

      // Refresh
      fetchQueueData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMovePatient = async (visitId, nextDept) => {
    try {
      const { error } = await supabase.from('visits').update({
        department: nextDept,
        status: 'waiting'
      }).eq('id', visitId);

      if (error) throw error;

      fetchQueueData();
    } catch (err) {
      console.error('Error moving patient:', err);
    }
  };

  const handleCompleteVisit = async (visitId) => {
    try {
      const { error } = await supabase.from('visits').update({
        status: 'completed'
      }).eq('id', visitId);

      if (error) throw error;
      fetchQueueData();
    } catch (err) {
      console.error('Error completing visit:', err);
    }
  };

  // Group visits by department
  const depts = ['triage', 'consultation', 'lab', 'pharmacy', 'billing'];
  const getDeptVisits = (deptName) => {
    return activeVisits.filter(v => v.department === deptName && v.status !== 'completed');
  };

  const getPatientName = (patientId) => {
    return patients.find(p => p.id === patientId)?.name || 'Unknown Patient';
  };

  const getPatientCode = (patientId) => {
    return patients.find(p => p.id === patientId)?.facility_id_code || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Visit Ticket Creator Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <PlusCircle size={18} className="text-teal-400" /> Open Clinic Visit (Queue Ticket)
        </h2>

        {message.text && (
          <div className={`p-3 rounded-lg border text-xs flex gap-2.5 mb-4 ${
            message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleOpenVisit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Patient Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.facility_id_code})</option>
              ))}
            </select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Direct to Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="triage">Triage (Vitals)</option>
              <option value="consultation">OPD Consultation</option>
              <option value="lab">Lab Orders</option>
              <option value="pharmacy">Pharmacy Dispensing</option>
              <option value="billing">Billing Payments</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          {/* Action */}
          <div className="md:col-span-4 flex justify-end gap-2 pt-2">
            {preselectedPatient && (
              <button
                type="button"
                onClick={clearPreselected}
                className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold text-xs py-2 px-4 rounded-lg transition"
              >
                Clear Selection
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-5 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98]"
            >
              {loading ? 'Opening Visit...' : 'Open Visit'}
            </button>
          </div>
        </form>
      </div>

      {/* Department Grid Board */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Layers size={14} /> Clinical Queue Board
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {depts.map((deptName) => {
            const list = getDeptVisits(deptName);
            return (
              <div key={deptName} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col h-[420px]">
                {/* Dept Title Header */}
                <div className="mb-3 pb-2 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200 capitalize">{deptName}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-full">{list.length}</span>
                </div>

                {/* Queue Cards */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {list.map((v) => (
                    <div
                      key={v.id}
                      className={`bg-slate-950 border rounded-lg p-3 text-xs flex flex-col gap-2 relative group hover:border-slate-700 transition ${
                        v.priority === 'emergency' ? 'border-red-500/20 bg-red-950/5' :
                        v.priority === 'urgent' ? 'border-yellow-500/20 bg-yellow-950/5' :
                        'border-slate-800/80'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-slate-200 block truncate leading-snug">{getPatientName(v.patient_id)}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{getPatientCode(v.patient_id)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                          v.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          v.priority === 'urgent' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>{v.priority}</span>
                        <span className="text-[9px] text-slate-500">{new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>

                      {/* Quick Move Action Tooltips */}
                      <div className="border-t border-slate-850 pt-2 mt-1 flex flex-col gap-1">
                        <span className="text-[9px] text-slate-600 block">Move to:</span>
                        <div className="flex flex-wrap gap-1">
                          {depts.filter(d => d !== deptName).map(d => (
                            <button
                              key={d}
                              onClick={() => handleMovePatient(v.id, d)}
                              className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 py-0.5 px-1 rounded uppercase hover:text-teal-400 hover:border-teal-500/30 transition-all"
                              title={`Move patient to ${d}`}
                            >
                              {d.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleCompleteVisit(v.id)}
                          className="w-full text-[9px] bg-teal-500/10 border border-teal-500/20 text-teal-400 text-center py-0.5 mt-1 rounded hover:bg-teal-500 hover:text-slate-950 transition"
                        >
                          Complete Care
                        </button>
                      </div>
                    </div>
                  ))}

                  {list.length === 0 && (
                    <div className="text-[11px] text-slate-600 text-center py-12">
                      Queue Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
