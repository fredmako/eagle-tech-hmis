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
  ArrowRightLeft,
  X
} from 'lucide-react';

const SERVICE_TYPE_META = {
  OPD: { label: 'General OPD', color: 'bg-slate-800/60 text-slate-400 border-slate-800' },
  ANC: { label: 'Antenatal Care', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  FP: { label: 'Family Planning', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  IMM: { label: 'Immunization', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  LAB: { label: 'Lab-Only', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  PHA: { label: 'Pharmacy-Only', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  IPD: { label: 'Inpatient', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
  EMR: { label: 'Emergency', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-extrabold animate-pulse' }
};

export default function Queue({ preselectedPatient, user, clearPreselected }) {
  const [activeVisits, setActiveVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Queue ticket form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [serviceType, setServiceType] = useState('OPD');
  const [department, setDepartment] = useState('triage');
  const [priority, setPriority] = useState('routine');
  const [isReferral, setIsReferral] = useState(false);
  const [referredFromFacility, setReferredFromFacility] = useState('');
  const [referredFromReason, setReferredFromReason] = useState('');

  // Reconciliation states
  const [reconciliationVisit, setReconciliationVisit] = useState(null);
  const [complianceChecks, setComplianceChecks] = useState({
    triage: false,
    consult: false,
    specialRegister: false,
    specialRegisterLabel: ''
  });
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [confirmReconciled, setConfirmReconciled] = useState(false);
  const [reconcilerNotes, setReconcilerNotes] = useState('');
  const [referredToFacility, setReferredToFacility] = useState('');
  const [referredToReason, setReferredToReason] = useState('');

  // Auto-route based on service type
  useEffect(() => {
    if (serviceType === 'LAB') {
      setDepartment('lab');
      setPriority('routine');
    } else if (serviceType === 'PHA') {
      setDepartment('pharmacy');
      setPriority('routine');
    } else if (serviceType === 'IPD') {
      setDepartment('ward');
      setPriority('routine');
    } else if (serviceType === 'EMR') {
      setDepartment('triage');
      setPriority('emergency');
    } else if (serviceType === 'ANC') {
      setDepartment('triage');
      setPriority('routine');
    } else if (serviceType === 'FP' || serviceType === 'IMM') {
      setDepartment('consultation');
      setPriority('routine');
    } else {
      setDepartment('triage');
      setPriority('routine');
    }
  }, [serviceType]);

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
        status: 'waiting',
        service_type: serviceType,
        referred_from_facility: isReferral ? referredFromFacility.trim() : null,
        referred_from_reason: isReferral ? referredFromReason.trim() : null
      };

      const { data: insertedVisits, error } = await supabase.from('visits').insert(newVisit).select();
      if (error) throw error;

      // Create record in patient_registrations for MOH reporting compliance
      const newReg = {
        patient_id: selectedPatientId,
        facility_id: user.facility_id,
        visit_type: isReferral ? 'referral' : 'walk-in',
        service_type: serviceType,
        status: 'active',
        assigned_clinic: department
      };
      await supabase.from('patient_registrations').insert(newReg);

      setMessage({ type: 'success', text: 'Visit ticket opened successfully!' });
      
      // Clear selection
      setSelectedPatientId('');
      setIsReferral(false);
      setReferredFromFacility('');
      setReferredFromReason('');
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

  const handleCompleteVisitClick = async (visitId) => {
    setReconciliationLoading(true);
    try {
      const visit = activeVisits.find(v => v.id === visitId);
      if (!visit) return;

      // 1. Check Triage Vitals
      const { data: triages } = await supabase.from('triages').select('id').eq('visit_id', visitId);
      const triageCaptured = !!(triages && triages.length > 0);

      // 2. Check Consultation Notes
      const { data: consults } = await supabase.from('consultations').select('id').eq('visit_id', visitId);
      const consultCaptured = !!(consults && consults.length > 0);

      // 3. Check Special Registers based on service type
      let specialRegisterCaptured = true;
      let registerLabel = '';

      if (visit.service_type === 'FP') {
        registerLabel = 'Family Planning Register';
        const { data: fpRecs } = await supabase.from('family_planning_records').select('id').eq('patient_id', visit.patient_id);
        specialRegisterCaptured = !!(fpRecs && fpRecs.length > 0);
      } else if (visit.service_type === 'ANC') {
        registerLabel = 'Antenatal Care Register (Maternal Care)';
        const { data: ancRecs } = await supabase.from('anc_visits').select('id').eq('patient_id', visit.patient_id);
        specialRegisterCaptured = !!(ancRecs && ancRecs.length > 0);
      } else if (visit.service_type === 'IPD') {
        registerLabel = 'Inpatient Admission Register';
        const { data: ipdRecs } = await supabase.from('ward_care_records').select('id').eq('visit_id', visitId);
        specialRegisterCaptured = !!(ipdRecs && ipdRecs.length > 0);
      }

      setComplianceChecks({
        triage: triageCaptured,
        consult: consultCaptured,
        specialRegister: specialRegisterCaptured,
        specialRegisterLabel: registerLabel
      });

      setReconciliationVisit(visit);
      setConfirmReconciled(false);
      setReconcilerNotes('');
      setReferredToFacility('');
      setReferredToReason('');
    } catch (err) {
      console.error('Error during reconciliation check:', err);
    } finally {
      setReconciliationLoading(false);
    }
  };

  const handleConfirmReconciliation = async () => {
    if (!reconciliationVisit) return;
    
    // Check if user confirmed when there are missing records
    const isFullyCompliant = complianceChecks.triage && complianceChecks.consult && complianceChecks.specialRegister;
    if (!isFullyCompliant && !confirmReconciled) {
      alert('Please check the confirmation checkbox to certify manual MOH reconciliation.');
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        status: 'completed',
        reconciled_with_moh: true,
        reconciler_notes: reconcilerNotes.trim() || 'Fully Reconciled.',
        referred_to_facility: referredToFacility.trim() || null,
        referred_to_reason: referredToReason.trim() || null
      };

      const { error } = await supabase.from('visits').update(updateData).eq('id', reconciliationVisit.id);
      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id || 'system',
        action: 'MOH Record Reconciled',
        details: `Visit ID ${reconciliationVisit.id} reconciled. Outbound Referral to: ${referredToFacility || 'None'}. Notes: ${reconcilerNotes}`
      });

      setReconciliationVisit(null);
      fetchQueueData();
    } catch (err) {
      console.error('Error saving reconciliation:', err);
      alert('Failed to complete care reconciliation: ' + err.message);
    } finally {
      setLoading(false);
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

        <form onSubmit={handleOpenVisit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

          {/* Service Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="OPD">General OPD</option>
              <option value="ANC">Antenatal Care (ANC)</option>
              <option value="FP">Family Planning (FP)</option>
              <option value="IMM">Immunization</option>
              <option value="LAB">Lab-Only</option>
              <option value="PHA">Pharmacy-Only</option>
              <option value="IPD">Inpatient Admission</option>
              <option value="EMR">Emergency/Triage</option>
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

          {/* Referral Fields */}
          <div className="md:col-span-5 border-t border-slate-800/60 pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 h-full pt-6">
              <input
                type="checkbox"
                id="isReferral"
                checked={isReferral}
                onChange={(e) => setIsReferral(e.target.checked)}
                className="rounded border-slate-800 text-teal-500 focus:ring-teal-500 bg-slate-950 h-4 w-4"
              />
              <label htmlFor="isReferral" className="text-xs font-semibold text-slate-400 cursor-pointer">
                Referred from another facility?
              </label>
            </div>
            {isReferral && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Referred From (Facility)</label>
                  <input
                    type="text"
                    value={referredFromFacility}
                    onChange={(e) => setReferredFromFacility(e.target.value)}
                    placeholder="e.g. Pumwani Maternity Hospital"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required={isReferral}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Referral Reason</label>
                  <input
                    type="text"
                    value={referredFromReason}
                    onChange={(e) => setReferredFromReason(e.target.value)}
                    placeholder="e.g. Specialized delivery care"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action */}
          <div className="md:col-span-5 flex justify-end gap-2 pt-2">
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
                        {v.service_type && SERVICE_TYPE_META[v.service_type] && (
                          <span className={`inline-block px-2 py-0.5 mt-2 rounded text-[8px] font-bold uppercase tracking-wider border ${SERVICE_TYPE_META[v.service_type].color}`}>
                            {SERVICE_TYPE_META[v.service_type].label}
                          </span>
                        )}
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
                          onClick={() => handleCompleteVisitClick(v.id)}
                          disabled={reconciliationLoading}
                          className="w-full flex items-center justify-center gap-1 text-[10px] font-bold bg-teal-500/10 border border-teal-500/20 hover:border-teal-500 hover:bg-teal-500 hover:text-slate-950 text-teal-400 text-center py-1.5 mt-2 rounded-lg transition duration-200 disabled:opacity-50"
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

      {/* MOH Reconciliation Modal */}
      {reconciliationVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500" />
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">MOH Compliance Check</span>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  Reconcile Health Records: {getPatientName(reconciliationVisit.patient_id)}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Visit Code: {reconciliationVisit.id.substring(0, 8).toUpperCase()} | Service Type: {SERVICE_TYPE_META[reconciliationVisit.service_type]?.label || reconciliationVisit.service_type}
                </p>
              </div>
              <button 
                onClick={() => setReconciliationVisit(null)} 
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {/* Compliance Checklist */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider border-b border-slate-900 pb-2">
                  Clinical Registry Check (MOH Reporting Schemes)
                </h4>
                <div className="space-y-2.5">
                  {/* Triage Vitals */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">1. Outpatient Triage Vital Signs</span>
                    {complianceChecks.triage ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                        <Check size={12} /> Captured
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                        ⚠️ Missing Triage Vitals
                      </span>
                    )}
                  </div>

                  {/* Consultation Notes */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">2. Clinical Diagnosis & SOAP Note</span>
                    {complianceChecks.consult ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                        <Check size={12} /> Captured
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                        ⚠️ Missing Consult SOAP Notes
                      </span>
                    )}
                  </div>

                  {/* Special Register (if applicable) */}
                  {complianceChecks.specialRegisterLabel && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">3. {complianceChecks.specialRegisterLabel}</span>
                      {complianceChecks.specialRegister ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                          <Check size={12} /> Captured
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                          ⚠️ Missing Register Entry
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings / Disclaimer if records are not complete */}
              {!(complianceChecks.triage && complianceChecks.consult && complianceChecks.specialRegister) && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 text-[11px] text-amber-400 leading-relaxed space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    ⚠️ Reconciliation Overrides Required
                  </p>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Some clinical records are incomplete in the system database. To complete care, please ensure these records are manually entered in the physical MOH Daily Register Book (e.g. MOH 717 Outpatient Register, MOH 711 Maternity, etc.) and check the declaration below.
                  </p>
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="confirmReconciled"
                      checked={confirmReconciled}
                      onChange={(e) => setConfirmReconciled(e.target.checked)}
                      className="rounded border-amber-500/30 text-amber-500 focus:ring-amber-500 bg-slate-950 mt-0.5 h-4 w-4"
                    />
                    <label htmlFor="confirmReconciled" className="text-slate-300 font-medium select-none cursor-pointer">
                      I certify that I have manually reconciled and captured these clinical records in the physical MOH Daily Register.
                    </label>
                  </div>
                </div>
              )}

              {/* Refer To Section (Outward Referrals) */}
              <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                  🏥 Outward Referral (Referred To)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Referred To (Facility)</label>
                    <input
                      type="text"
                      value={referredToFacility}
                      onChange={(e) => setReferredToFacility(e.target.value)}
                      placeholder="e.g. Kenyatta National Hospital"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Referral Reason</label>
                    <input
                      type="text"
                      value={referredToReason}
                      onChange={(e) => setReferredToReason(e.target.value)}
                      placeholder="e.g. ICU Bed admission needed"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Reconciliation Notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reconciliation Notes / Comments</label>
                <textarea
                  rows={2}
                  value={reconcilerNotes}
                  onChange={(e) => setReconcilerNotes(e.target.value)}
                  placeholder="Enter any notes about data reconciliation, physical register page numbers, or referral details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReconciliationVisit(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-semibold text-xs py-2 px-5 rounded-lg transition cursor-pointer"
              >
                Back to Clinical Desk
              </button>
              <button
                type="button"
                onClick={handleConfirmReconciliation}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs py-2 px-6 rounded-lg shadow transition active:scale-[0.98] cursor-pointer"
              >
                Confirm Reconciliation & Complete Care
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

