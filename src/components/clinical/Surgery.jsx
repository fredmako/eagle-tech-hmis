import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ShieldCheck, 
  Bed, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  RefreshCw, 
  ClipboardList, 
  CheckCircle,
  Activity,
  Heart,
  UserCheck
} from 'lucide-react';
import { surgicalProcedureMaster } from '../../medicalMaster';

export default function Surgery({ user, onComplete }) {
  const [surgeryVisits, setSurgeryVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // Patient clinical records for clearance evaluation
  const [patientOrders, setPatientOrders] = useState([]);
  const [surgeryOrders, setSurgeryOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Clearance Checklists
  const [consentSigned, setConsentSigned] = useState(false);
  const [anesthesiaCleared, setAnesthesiaCleared] = useState(false);
  const [anestheticNotes, setAnestheticNotes] = useState('');
  
  // Theater Booking
  const [surgeonName, setSurgeonName] = useState(user?.full_name || '');
  const [anesthetistName, setAnesthetistName] = useState('');
  const [theaterRoom, setTheaterRoom] = useState('Theater A');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Operation Notes
  const [incisionStyle, setIncisionStyle] = useState('Midline');
  const [intraopFindings, setIntraopFindings] = useState('');
  const [closureDetail, setClosureDetail] = useState('Vicryl 2-0 Subcuticular');
  const [bloodLoss, setBloodLoss] = useState('');
  const [complications, setComplications] = useState('None');
  const [postopPlan, setPostopPlan] = useState('');
  const [surgeryOutcome, setSurgeryOutcome] = useState('Successful');
  
  // Post-op routing
  const [nextRoutingDept, setNextRoutingDept] = useState('ward');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSurgeryQueue();
  }, []);

  const fetchSurgeryQueue = async () => {
    try {
      // Fetch visits currently in the 'surgery' department queue
      const { data: vsts, error: vstsErr } = await supabase
        .from('visits')
        .select('*')
        .eq('department', 'surgery')
        .eq('status', 'waiting');

      if (vstsErr) throw vstsErr;
      
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setSurgeryVisits(enrichedVisits);
      
      // Auto-select first visit if available
      if (enrichedVisits.length > 0) {
        handleSelectVisit(enrichedVisits[0]);
      } else {
        setSelectedVisit(null);
        setSurgeryOrders([]);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error fetching surgery queue:', err);
      setMessage({ type: 'error', text: 'Failed to load surgery queue.' });
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    setSelectedOrder(null);
    setConsentSigned(false);
    setAnesthesiaCleared(false);
    setAnestheticNotes('');
    
    // Clear Op Notes inputs
    setIntraopFindings('');
    setBloodLoss('');
    setComplications('None');
    setPostopPlan('');
    setSurgeryOutcome('Successful');

    try {
      // 1. Fetch all orders (lab, radiology, surgery) for this visit to evaluate clearance
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('visit_id', visit.id);
        
      const allOrders = ords || [];
      setPatientOrders(allOrders);

      // Filter surgery orders specifically
      const surgOrds = allOrders.filter(o => o.type === 'surgery');
      setSurgeryOrders(surgOrds);
      
      if (surgOrds.length > 0) {
        handleSelectOrder(surgOrds[0]);
      }
    } catch (err) {
      console.error('Error loading patient orders for surgery:', err);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);

    if (order.status === 'completed') {
      try {
        const meta = JSON.parse(order.results);
        // Load clearance
        setConsentSigned(meta.clearance?.consent_signed || false);
        setAnesthesiaCleared(meta.clearance?.anesthetic_clearance || false);
        setAnestheticNotes(meta.clearance?.anesthetic_notes || '');
        // Load booking
        setSurgeonName(meta.booking?.surgeon || '');
        setAnesthetistName(meta.booking?.anesthetist || '');
        setTheaterRoom(meta.booking?.theatre_room || 'Theater A');
        setScheduledTime(meta.booking?.scheduled_time || '');
        // Load Op Notes
        setIncisionStyle(meta.op_notes?.incision || 'Midline');
        setIntraopFindings(meta.op_notes?.findings || '');
        setClosureDetail(meta.op_notes?.closure || '');
        setBloodLoss(meta.op_notes?.blood_loss || '');
        setComplications(meta.op_notes?.complications || 'None');
        setPostopPlan(meta.op_notes?.postop_plan || '');
        setSurgeryOutcome(meta.op_notes?.outcome || 'Successful');
      } catch (e) {
        setIntraopFindings(order.results || '');
      }
    }
  };

  // Evaluate clearance statuses based on laboratory & radiology test results
  const evaluateClearanceParameters = () => {
    // Hemoglobin/FBC Check
    const hbOrder = patientOrders.find(o => 
      o.type === 'lab' && 
      (o.item_name.toLowerCase().includes('hb') || 
       o.item_name.toLowerCase().includes('hemoglobin') || 
       o.item_name.toLowerCase().includes('fbc') || 
       o.item_name.toLowerCase().includes('full blood'))
    );
    
    let hbStatus = 'pending';
    let hbValue = 'Not Performed';
    if (hbOrder) {
      if (hbOrder.status === 'released' || hbOrder.status === 'completed') {
        hbStatus = 'cleared';
        try {
          const meta = JSON.parse(hbOrder.results);
          hbValue = meta.values || hbOrder.results;
        } catch(e) {
          hbValue = hbOrder.results;
        }
      }
    }

    // Blood Grouping & Crossmatch
    const bgOrder = patientOrders.find(o => 
      o.type === 'lab' && 
      (o.item_name.toLowerCase().includes('group') || 
       o.item_name.toLowerCase().includes('cross') || 
       o.item_name.toLowerCase().includes('typing') ||
       o.item_name.toLowerCase().includes('abo'))
    );

    let bgStatus = 'pending';
    let bgValue = 'Not Performed';
    if (bgOrder) {
      if (bgOrder.status === 'released' || bgOrder.status === 'completed') {
        bgStatus = 'cleared';
        try {
          const meta = JSON.parse(bgOrder.results);
          bgValue = meta.values || bgOrder.results;
        } catch(e) {
          bgValue = bgOrder.results;
        }
      }
    }

    // Infection screening (HIV/Hepatitis/Syphilis)
    const infOrder = patientOrders.find(o => 
      o.type === 'lab' && 
      (o.item_name.toLowerCase().includes('hiv') || 
       o.item_name.toLowerCase().includes('hep') || 
       o.item_name.toLowerCase().includes('vdrl') || 
       o.item_name.toLowerCase().includes('syphilis'))
    );

    let infStatus = 'pending';
    let infValue = 'Not Performed';
    if (infOrder) {
      if (infOrder.status === 'released' || infOrder.status === 'completed') {
        infStatus = 'cleared';
        try {
          const meta = JSON.parse(infOrder.results);
          infValue = meta.values || infOrder.results;
        } catch(e) {
          infValue = infOrder.results;
        }
      }
    }

    // Chest X-ray or Preoperative Scan Check
    const chestOrder = patientOrders.find(o => 
      o.type === 'radiology' && 
      (o.item_name.toLowerCase().includes('chest') || 
       o.item_name.toLowerCase().includes('x-ray') || 
       o.item_name.toLowerCase().includes('scan') ||
       o.item_name.toLowerCase().includes('ultrasound'))
    );

    let radStatus = 'pending';
    let radValue = 'Not Performed';
    if (chestOrder) {
      if (chestOrder.status === 'released' || chestOrder.status === 'completed') {
        radStatus = 'cleared';
        try {
          const meta = JSON.parse(chestOrder.results);
          radValue = `${chestOrder.item_name}: ${meta.findings?.substring(0, 40) || 'Normal findings'}`;
        } catch(e) {
          radValue = chestOrder.results;
        }
      }
    }

    const totalCleared = [hbStatus, bgStatus, infStatus, radStatus].filter(s => s === 'cleared').length;
    const clearanceScore = Math.round((totalCleared / 4) * 100);

    return {
      hb: { status: hbStatus, val: hbValue },
      bg: { status: bgStatus, val: bgValue },
      inf: { status: infStatus, val: infValue },
      rad: { status: radStatus, val: radValue },
      score: clearanceScore,
      fullyCleared: totalCleared === 4 && consentSigned && anesthesiaCleared
    };
  };

  const params = evaluateClearanceParameters();

  const handleCompleteSurgery = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !selectedOrder) return;
    if (!intraopFindings.trim()) {
      setMessage({ type: 'error', text: 'Please input the surgical intra-operative findings.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const resultsMeta = {
        clearance: {
          hb: params.hb.val,
          blood_group: params.bg.val,
          infections: params.inf.val,
          radiology: params.rad.val,
          consent_signed: consentSigned,
          anesthetic_clearance: anesthesiaCleared,
          anesthetic_notes: anestheticNotes
        },
        booking: {
          surgeon: surgeonName,
          anesthetist: anesthetistName,
          theatre_room: theaterRoom,
          scheduled_time: scheduledTime
        },
        op_notes: {
          incision: incisionStyle,
          findings: intraopFindings,
          closure: closureDetail,
          blood_loss: bloodLoss,
          complications,
          outcome: surgeryOutcome,
          postop_plan: postopPlan
        },
        completed_at: new Date().toISOString()
      };

      // 1. Update order status to 'completed'
      const { error: orderErr } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          results: JSON.stringify(resultsMeta)
        })
        .eq('id', selectedOrder.id);

      if (orderErr) throw orderErr;

      // 2. Add log entry
      await supabase.from('audit_logs').insert({
        action: 'Surgical Procedure Completed',
        details: `Completed ${selectedOrder.item_name} surgical procedure for patient ${selectedVisit.patient?.name}. Surgeon: ${surgeonName}, Outcome: ${surgeryOutcome}.`
      });

      // 3. Update visit routing
      // If ward is selected, we allocate a bed in ward (which triggers local bed logic in Ward.jsx)
      const { error: visitErr } = await supabase
        .from('visits')
        .update({
          department: nextRoutingDept,
          status: nextRoutingDept === 'completed' ? 'completed' : 'waiting'
        })
        .eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      setMessage({ type: 'success', text: `Surgical record for ${selectedOrder.item_name} completed and patient routed to ${nextRoutingDept.toUpperCase()}!` });
      
      // Refresh local data
      fetchSurgeryQueue();
    } catch (err) {
      console.error('Error completing surgical record:', err);
      setMessage({ type: 'error', text: err.message || 'Error saving surgical record.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex justify-between items-center shadow">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-teal-400" size={20} /> Surgery & Operating Theatre Desk
          </h2>
          <p className="text-xs text-slate-500">Assess preoperative parameters, book theatre rooms, sign anesthetic notes, and log intraoperative operation findings.</p>
        </div>
        <button 
          onClick={fetchSurgeryQueue}
          className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/5 transition text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300"
        >
          <RefreshCw size={12} /> Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Active Patients Queue (Left Panel, 1/4 width) */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-[700px] overflow-hidden">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5 mb-3 flex justify-between items-center">
            <span>Surgical Waitlist</span>
            <span className="bg-teal-500/10 text-teal-400 font-mono px-2 py-0.5 rounded text-[10px] font-bold">{surgeryVisits.length} waiting</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {surgeryVisits.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-20">No patients currently scheduled for Surgery.</div>
            ) : (
              surgeryVisits.map(visit => {
                const isSelected = selectedVisit?.id === visit.id;
                return (
                  <button
                    key={visit.id}
                    onClick={() => handleSelectVisit(visit)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition duration-150 ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500 text-slate-200'
                        : 'bg-slate-950 border-slate-850/70 hover:border-slate-800 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-200 block truncate max-w-[120px]">{visit.patient?.name}</span>
                      <span className={`text-[8px] font-mono px-1 rounded font-bold uppercase ${
                        visit.priority === 'emergency' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                      }`}>{visit.priority}</span>
                    </div>
                    <span className="text-[10px] text-teal-500 font-mono block mt-1">{visit.patient?.facility_id_code}</span>
                    <span className="text-[9px] text-slate-550 mt-2 block">{new Date(visit.created_at).toLocaleDateString()} at {new Date(visit.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Surgical clearance dashboard + booking (Right Panel, 3/4 width) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm min-h-[700px] flex flex-col justify-between">
          {!selectedVisit ? (
            <div className="flex-1 flex flex-col justify-center items-center py-24 text-slate-500 text-sm gap-2">
              <Bed size={48} className="text-slate-800 stroke-[1.5]" />
              Please select a patient from the surgical waitlist queue.
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Patient header info */}
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedVisit.patient?.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                    <span>Code: <span className="text-teal-400 font-bold">{selectedVisit.patient_id_code || selectedVisit.patient?.facility_id_code}</span></span>
                    <span>Sex: <span className="text-slate-300 capitalize">{selectedVisit.patient?.gender}</span></span>
                    <span>DOB: <span className="text-slate-300">{selectedVisit.patient?.dob}</span></span>
                  </div>
                </div>
                {/* Active Procedure chip */}
                <div className="flex flex-wrap gap-1.5">
                  {surgeryOrders.map(order => {
                    const isSel = selectedOrder?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition ${
                          isSel
                            ? 'bg-teal-500 border-teal-500 text-slate-950 shadow'
                            : 'bg-slate-955 border-slate-855 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        {order.item_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!selectedOrder && surgeryOrders.length === 0 && (
                <div className="flex-1 flex flex-col justify-center items-center py-20 text-slate-500 text-sm gap-2">
                  <Bed size={36} className="text-slate-850 animate-pulse" />
                  <span>No active surgery orders associated with this visit.</span>
                </div>
              )}

              {selectedOrder && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                  
                  {/* Left Column: clearance checklist indicators (5/12 width) */}
                  <div className="lg:col-span-5 space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5"><ClipboardList size={14} className="text-teal-400" /> Surgical Clearance Dashboard</span>

                    {/* Overall clearance radial score representation */}
                    <div className="bg-slate-950 border border-slate-855 p-4 rounded-xl flex items-center gap-4">
                      <div className="relative h-14 w-14 rounded-full flex items-center justify-center border-2 border-slate-800">
                        <span className="text-xs font-mono font-bold text-teal-400">{params.score}%</span>
                        <div className="absolute inset-0 rounded-full border-2 border-teal-500/40 border-t-transparent animate-spin duration-1000" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Pre-operative Clearance Rating</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Clears Hb levels, typing, infections, and radiology.</span>
                      </div>
                    </div>

                    {/* Checklist details */}
                    <div className="bg-slate-955 border border-slate-855 rounded-xl p-4 space-y-3.5 text-xs">
                      
                      {/* parameter 1: Hb */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-semibold text-slate-300 block">Hemoglobin Level (Hb)</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Result: {params.hb.val}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          params.hb.status === 'cleared' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                        }`}>{params.hb.status}</span>
                      </div>

                      {/* parameter 2: Blood group */}
                      <div className="flex justify-between items-start gap-4 border-t border-slate-850 pt-3">
                        <div>
                          <span className="font-semibold text-slate-300 block">Grouping / Cross-match</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Result: {params.bg.val}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          params.bg.status === 'cleared' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                        }`}>{params.bg.status}</span>
                      </div>

                      {/* parameter 3: infection screening */}
                      <div className="flex justify-between items-start gap-4 border-t border-slate-850 pt-3">
                        <div>
                          <span className="font-semibold text-slate-300 block">Infection Screening</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Result: {params.inf.val}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          params.inf.status === 'cleared' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                        }`}>{params.inf.status}</span>
                      </div>

                      {/* parameter 4: radiology scan */}
                      <div className="flex justify-between items-start gap-4 border-t border-slate-850 pt-3">
                        <div>
                          <span className="font-semibold text-slate-300 block">Chest X-Ray / Pre-op Imaging</span>
                          <span className="text-[10px] text-slate-550 font-mono mt-0.5 block truncate max-w-[200px]">{params.rad.val}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          params.rad.status === 'cleared' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-yellow-500/10 text-yellow-450 border border-yellow-500/10'
                        }`}>{params.rad.status}</span>
                      </div>
                    </div>

                    {/* Clinician clearance checkbox controls */}
                    <div className="bg-slate-950 border border-slate-855 rounded-xl p-4 space-y-3 text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] block">Theatre Checklist Validations</span>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={consentSigned}
                          onChange={(e) => setConsentSigned(e.target.checked)}
                          className="h-4 w-4 bg-slate-900 border-slate-800 rounded focus:ring-0 text-teal-500 focus:outline-none accent-teal-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-medium text-slate-200 group-hover:text-slate-100">Signed Surgical Consent</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Verify physical or digital consent form has been signed.</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group border-t border-slate-850/60 pt-3">
                        <input
                          type="checkbox"
                          checked={anesthesiaCleared}
                          onChange={(e) => setAnesthesiaCleared(e.target.checked)}
                          className="h-4 w-4 bg-slate-900 border-slate-800 rounded focus:ring-0 text-teal-500 focus:outline-none accent-teal-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-medium text-slate-200 group-hover:text-slate-100">Anesthesia Clearance</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Pre-anesthetic evaluation has been successfully passed.</p>
                        </div>
                      </label>

                      <div className="space-y-1 text-xs pt-1">
                        <label className="text-slate-500">Anesthesiologist Assessment Notes</label>
                        <textarea
                          value={anestheticNotes}
                          onChange={(e) => setAnestheticNotes(e.target.value)}
                          className="w-full h-14 bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs resize-none"
                          placeholder="e.g. ASA Class II, airway Mallampati Class I, general anesthesia planned..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Theater booking and Operation notes entry (7/12 width) */}
                  <form onSubmit={handleCompleteSurgery} className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      
                      {/* Sub-Header: Booking details */}
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5"><Calendar size={14} className="text-teal-400" /> Operating Theatre Booking</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Lead Surgeon</label>
                          <input 
                            type="text"
                            required
                            value={surgeonName}
                            onChange={(e) => setSurgeonName(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="Surgeon's Name"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Lead Anesthetist</label>
                          <input 
                            type="text"
                            value={anesthetistName}
                            onChange={(e) => setAnesthetistName(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="Anesthetist's Name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Theatre Room</label>
                          <select
                            value={theaterRoom}
                            onChange={(e) => setTheaterRoom(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="Theater A">Operating Theater A</option>
                            <option value="Theater B">Operating Theater B</option>
                            <option value="Minor Theater">Minor Surgery Theater</option>
                            <option value="Maternity Theater">Obstetrics / Maternity Theater</option>
                          </select>
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Scheduled Date & Time</label>
                          <input 
                            type="datetime-local"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Sub-Header: Operation notes */}
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5 pt-2"><FileText size={14} className="text-teal-400" /> Intra-operative Notes</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Surgical Incision Style</label>
                          <input 
                            type="text"
                            value={incisionStyle}
                            onChange={(e) => setIncisionStyle(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="e.g. Pfannenstiel, Midline"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Closure Details & Sutures</label>
                          <input 
                            type="text"
                            value={closureDetail}
                            onChange={(e) => setClosureDetail(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="e.g. Vicryl 2-0 subcuticular"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Estimated Blood Loss (EBL, mL)</label>
                          <input 
                            type="number"
                            value={bloodLoss}
                            onChange={(e) => setBloodLoss(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                            placeholder="e.g. 250"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Procedural Outcome</label>
                          <select
                            value={surgeryOutcome}
                            onChange={(e) => setSurgeryOutcome(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="Successful">Successful (Uncomplicated)</option>
                            <option value="Complications">Complications Encountered</option>
                            <option value="Transferred">Transferred to ICU</option>
                            <option value="Partial">Partial Resection Only</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400">Complications (if any)</label>
                        <input 
                          type="text"
                          value={complications}
                          onChange={(e) => setComplications(e.target.value)}
                          className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                          placeholder="e.g. None, transient bradycardia resolved..."
                        />
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400 font-bold">Intra-operative Findings & Procedure Description</label>
                        <textarea
                          required
                          value={intraopFindings}
                          onChange={(e) => setIntraopFindings(e.target.value)}
                          className="w-full h-24 bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                          placeholder="Describe surgical steps, visual pathognomonic findings, tissue pathology..."
                        />
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400 font-semibold text-teal-400">Post-operative Recovery Plan & Instructions</label>
                        <textarea
                          required
                          value={postopPlan}
                          onChange={(e) => setPostopPlan(e.target.value)}
                          className="w-full h-16 bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                          placeholder="Ward observations schedule, wound care, analgesics, mobilization..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-850">
                      {/* Postop Routing */}
                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400">Post-operative Check-out Routing</label>
                        <select
                          value={nextRoutingDept}
                          onChange={(e) => setNextRoutingDept(e.target.value)}
                          className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-250 focus:outline-none focus:border-teal-500"
                        >
                          <option value="ward">Inpatient Ward Recovery Room (Default)</option>
                          <option value="consultation">OPD Consultation Review</option>
                          <option value="billing">Billing Cashier (Payment)</option>
                          <option value="completed">Discharge Patient (Complete Lifecycle)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition shadow-lg shadow-teal-500/10"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Complete Surgery & Log to Timeline
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {message.text && (
            <div className={`mt-4 p-3.5 rounded-lg flex items-start gap-2.5 text-xs ${
              message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
