import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Layers, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle, 
  HeartPulse, 
  Stethoscope, 
  FlaskConical, 
  Scan, 
  Activity, 
  Bed, 
  Pill, 
  DollarSign, 
  RefreshCw, 
  Clock, 
  Check, 
  ArrowRightLeft 
} from 'lucide-react';

export default function Queue({ preselectedPatient, user, clearPreselected }) {
  const [activeVisits, setActiveVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchQueueData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { data: vsts } = await supabase.from('visits').select('*').order('created_at', { ascending: true });
      const { data: pts } = await supabase.from('patients').select('*');
      
      setActiveVisits(vsts || []);
      setPatients(pts || []);
    } catch (err) {
      console.error('Error fetching queue data:', err);
    } finally {
      if (isManual) setRefreshing(false);
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
  const depts = ['triage', 'consultation', 'lab', 'radiology', 'surgery', 'ward', 'pharmacy', 'billing'];

  const DEPT_META = {
    triage: { label: 'Triage (Vitals)', icon: HeartPulse, color: 'text-sky-400', border: 'border-sky-500/20', badge: 'bg-sky-500/10 text-sky-400' },
    consultation: { label: 'OPD Consult', icon: Stethoscope, color: 'text-teal-400', border: 'border-teal-500/20', badge: 'bg-teal-500/10 text-teal-400' },
    lab: { label: 'Laboratory', icon: FlaskConical, color: 'text-purple-400', border: 'border-purple-500/20', badge: 'bg-purple-500/10 text-purple-400' },
    radiology: { label: 'Radiology', icon: Scan, color: 'text-indigo-400', border: 'border-indigo-500/20', badge: 'bg-indigo-500/10 text-indigo-400' },
    surgery: { label: 'Theatre', icon: Activity, color: 'text-rose-400', border: 'border-rose-500/20', badge: 'bg-rose-500/10 text-rose-400' },
    ward: { label: 'Inpatient Ward', icon: Bed, color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', badge: 'bg-fuchsia-500/10 text-fuchsia-400' },
    pharmacy: { label: 'Pharmacy', icon: Pill, color: 'text-amber-400', border: 'border-amber-500/20', badge: 'bg-amber-500/10 text-amber-400' },
    billing: { label: 'Billing Desk', icon: DollarSign, color: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-400' }
  };

  const getDeptVisits = (deptName) => {
    return activeVisits.filter(v => v.department === deptName && v.status !== 'completed');
  };

  const getPatientName = (patientId) => {
    return patients.find(p => p.id === patientId)?.name || 'Unknown Patient';
  };

  const getPatientCode = (patientId) => {
    return patients.find(p => p.id === patientId)?.facility_id_code || 'N/A';
  };

  const getWaitingTime = (createdAt) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ago`;
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
              <option value="radiology">Radiology / Imaging</option>
              <option value="surgery">Surgery / Theatre</option>
              <option value="ward">Inpatient Ward</option>
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-teal-400" /> Clinical Queue Board
          </h3>
          <button 
            onClick={() => fetchQueueData(true)} 
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-teal-500/30 text-slate-400 hover:text-teal-400 font-semibold text-[11px] px-3 py-1.5 rounded-lg transition active:scale-[0.97] disabled:opacity-50"
            title="Refresh active visits queue"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-teal-400' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Board'}</span>
          </button>
        </div>

        {/* Horizontal Kanban Scrollable Wrapper */}
        <div className="flex overflow-x-auto gap-4 pb-6 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {depts.map((deptName) => {
            const list = getDeptVisits(deptName);
            const meta = DEPT_META[deptName];
            const IconComponent = meta.icon;

            return (
              <div 
                key={deptName} 
                className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col h-[520px] w-[290px] shrink-0 shadow-sm"
              >
                {/* Dept Title Header */}
                <div className="mb-4 pb-2.5 border-b border-slate-800/70 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${meta.badge} bg-opacity-10`}>
                      <IconComponent size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-200 capitalize tracking-wide">{meta.label}</span>
                  </div>
                  <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full shadow-inner">
                    {list.length}
                  </span>
                </div>

                {/* Queue Cards */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-slate-950 scrollbar-track-transparent">
                  {list.map((v) => (
                    <div
                      key={v.id}
                      className={`bg-slate-950 border-y border-r rounded-xl p-3.5 text-xs flex flex-col gap-3 relative hover:-translate-y-[1px] hover:border-slate-700 hover:shadow-md transition-all duration-200 ${
                        v.priority === 'emergency' ? 'border-l-4 border-l-red-500 border-red-500/20' :
                        v.priority === 'urgent' ? 'border-l-4 border-l-yellow-500 border-yellow-500/20' :
                        'border-l-4 border-l-slate-700 border-slate-800'
                      }`}
                    >
                      {/* Patient Details */}
                      <div>
                        <span className="font-bold text-slate-200 block truncate leading-snug tracking-wide text-sm">{getPatientName(v.patient_id)}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{getPatientCode(v.patient_id)}</span>
                      </div>
                      
                      {/* Priority and Time */}
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] border ${
                          v.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          v.priority === 'urgent' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-slate-800/60 text-slate-400 border-slate-800'
                        }`}>
                          {v.priority}
                        </span>
                        
                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                          <Clock size={10} />
                          <span>{getWaitingTime(v.created_at)}</span>
                        </div>
                      </div>

                      {/* Dropdown Redirection Selector */}
                      <div className="border-t border-slate-900/60 pt-3 mt-1 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <ArrowRightLeft size={10} className="text-slate-600" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Redirect Patient</span>
                        </div>
                        
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMovePatient(v.id, e.target.value);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 py-1.5 px-2 rounded-lg focus:outline-none focus:border-teal-500/40 transition cursor-pointer font-medium"
                        >
                          <option value="" disabled>Send to department...</option>
                          {depts.filter(d => d !== deptName).map(d => (
                            <option key={d} value={d}>
                              {DEPT_META[d].label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleCompleteVisit(v.id)}
                          className="w-full flex items-center justify-center gap-1 text-[10px] font-bold bg-teal-500/10 border border-teal-500/20 hover:border-teal-500 hover:bg-teal-500 hover:text-slate-950 text-teal-400 text-center py-1.5 mt-2 rounded-lg transition duration-200"
                        >
                          <Check size={10} />
                          <span>Complete Care</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {list.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                      <div className="bg-slate-950/40 p-2.5 rounded-full border border-slate-800/40 mb-2">
                        <IconComponent size={14} className="opacity-40" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500/80">Queue Empty</span>
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

