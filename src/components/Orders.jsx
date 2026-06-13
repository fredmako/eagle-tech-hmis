import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { sendNotification } from '../notificationService';
import { 
  FlaskConical, 
  AlertCircle, 
  CheckCircle, 
  Barcode, 
  Clock, 
  RefreshCw, 
  CheckSquare, 
  XCircle, 
  TrendingUp, 
  ShieldAlert, 
  Send, 
  UserCheck 
} from 'lucide-react';

export default function Orders({ user, onComplete }) {
  const [labVisits, setLabVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed', 'rejected'
  
  // Results inputs
  const [resultsInputs, setResultsInputs] = useState({});
  const [rejectionReason, setRejectionReason] = useState({});
  const [showRejectForm, setShowRejectForm] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [timeTicker, setTimeTicker] = useState(0);

  useEffect(() => {
    fetchLabQueue();
    // Refresh turnaround timers every 30 seconds
    const interval = setInterval(() => {
      setTimeTicker(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Recalculate turnaround timers whenever tab changes or queue updates
  const fetchLabQueue = async () => {
    try {
      // Fetch visits currently waiting in lab
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'lab');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setLabVisits(enrichedVisits);
      
      // Select the first active visit if none is selected
      if (enrichedVisits.length > 0) {
        // Find if selectedVisit is still in the queue
        const stillExists = enrichedVisits.find(v => v.id === selectedVisit?.id);
        if (!stillExists) {
          handleSelectVisit(enrichedVisits[0]);
        } else {
          // Refresh details
          handleSelectVisit(stillExists);
        }
      } else {
        setSelectedVisit(null);
        setPendingOrders([]);
      }
    } catch (err) {
      console.error('Error fetching lab queue:', err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    
    try {
      // Fetch all lab orders for this visit
      const { data: ords } = await supabase.from('orders')
        .select('*')
        .eq('visit_id', visit.id)
        .eq('type', 'lab');
        
      setPendingOrders(ords || []);
      
      // Initialize inputs for processing tests
      const initialResults = {};
      const initialRejections = {};
      ords?.forEach(o => {
        let meta = { values: '' };
        if (o.results && o.results.startsWith('{')) {
          try { meta = JSON.parse(o.results); } catch (e) {}
        } else if (o.results) {
          meta.values = o.results;
        }
        initialResults[o.id] = meta.values || '';
        initialRejections[o.id] = '';
      });
      setResultsInputs(initialResults);
      setRejectionReason(initialRejections);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const parseOrderMeta = (resultsStr) => {
    if (!resultsStr) return {};
    if (resultsStr.startsWith('{')) {
      try {
        return JSON.parse(resultsStr);
      } catch (e) {
        return { values: resultsStr };
      }
    }
    return { values: resultsStr };
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Get current order to preserve existing metadata in JSON
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      let existingMeta = parseOrderMeta(activeOrder?.results);
      
      const updatedMeta = {
        ...existingMeta,
        ...extraData
      };

      const { error } = await supabase.from('orders').update({
        status: newStatus,
        results: JSON.stringify(updatedMeta)
      }).eq('id', orderId);

      if (error) throw error;

      // Log action to audit trail
      await supabase.from('audit_logs').insert({
        action: `Lab Order Status: ${newStatus.toUpperCase()}`,
        details: `Updated test ${activeOrder?.item_name} status to ${newStatus.toUpperCase()} for patient ${selectedVisit?.patient?.name}.`
      });

      setMessage({ type: 'success', text: `Order updated to ${newStatus.toUpperCase()} successfully!` });
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error updating order status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSample = (orderId) => {
    const randomBarcode = 'BAR-' + Math.floor(100000 + Math.random() * 900000);
    updateOrderStatus(orderId, 'collected', { 
      barcode: randomBarcode,
      collected_at: new Date().toISOString(),
      collected_by: user.full_name
    });
  };

  const handleReceiveSample = (orderId) => {
    updateOrderStatus(orderId, 'received', { 
      received_at: new Date().toISOString(),
      received_by: user.full_name
    });
  };

  const handleAcceptSample = (orderId) => {
    updateOrderStatus(orderId, 'accepted', { 
      accepted_at: new Date().toISOString(),
      accepted_by: user.full_name
    });
  };

  const handleRejectSample = async (orderId, reason) => {
    if (!reason.trim()) return;
    await updateOrderStatus(orderId, 'rejected', { 
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      rejected_by: user.full_name
    });
    // Hide reject dropdown
    setShowRejectForm({ ...showRejectForm, [orderId]: false });

    // Trigger Notification
    try {
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      await sendNotification('LAB_SAMPLE_REJECTED', {
        patientName: selectedVisit?.patient?.name || 'N/A',
        testName: activeOrder?.item_name || 'Lab Test',
        reason: reason,
        recipientEmail: 'clinician@eagletechsolutions.tech'
      }, user.facility_id);
    } catch (e) {
      console.error('Rejection email trigger failed:', e);
    }
  };

  const handleRecollect = (orderId) => {
    // Reset status back to ordered to handle sample resubmission
    updateOrderStatus(orderId, 'ordered', {
      barcode: null,
      collected_at: null,
      collected_by: null,
      rejection_reason: null
    });
  };

  const handleStartProcess = (orderId) => {
    updateOrderStatus(orderId, 'in_process', { 
      processing_started_at: new Date().toISOString(),
      processed_by: user.full_name
    });
  };

  const handleResultChange = (orderId, val) => {
    setResultsInputs({
      ...resultsInputs,
      [orderId]: val
    });
  };

  const handleSaveResults = async (orderId) => {
    const findings = resultsInputs[orderId];
    if (!findings.trim()) {
      setMessage({ type: 'error', text: 'Please enter result values before saving.' });
      return;
    }
    updateOrderStatus(orderId, 'completed', { 
      values: findings,
      completed_at: new Date().toISOString()
    });
  };

  const handleVerifyResults = (orderId) => {
    updateOrderStatus(orderId, 'verified', { 
      verified_at: new Date().toISOString(),
      verifier: user.full_name
    });
  };

  const handleReleaseResults = async (orderId) => {
    setLoading(true);
    try {
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      const meta = parseOrderMeta(activeOrder?.results);

      // 1. Release the order findings
      const { error } = await supabase.from('orders').update({
        status: 'released'
      }).eq('id', orderId);
      if (error) throw error;

      // 2. Log release
      await supabase.from('audit_logs').insert({
        action: 'Lab Results Released',
        details: `Released finalized results for ${activeOrder?.item_name} (${meta.values}) for patient ${selectedVisit?.patient?.name}.`
      });

      // Trigger Notification
      try {
        await sendNotification('LAB_RESULT_READY', {
          patientName: selectedVisit?.patient?.name || 'N/A',
          testName: activeOrder?.item_name || 'Lab Test',
          findings: meta.values,
          verifier: meta.verifier || user.full_name,
          recipientEmail: 'clinician@eagletechsolutions.tech'
        }, user.facility_id);
      } catch (e) {
        console.error('Lab result email trigger failed:', e);
      }

      // 3. Check if all lab tests for this visit are completed/released
      const updatedOrders = pendingOrders.map(o => o.id === orderId ? { ...o, status: 'released' } : o);
      const allReleased = updatedOrders.every(o => o.status === 'released' || o.status === 'cancelled');

      if (allReleased) {
        // Move visit to Billing
        const { error: visitErr } = await supabase.from('visits').update({
          department: 'billing',
          status: 'waiting'
        }).eq('id', selectedVisit.id);
        if (visitErr) throw visitErr;

        setMessage({ type: 'success', text: 'All results released! Patient redirected to Billing Desk.' });
        setTimeout(() => {
          fetchLabQueue();
          if (onComplete) onComplete();
        }, 1500);
      } else {
        setMessage({ type: 'success', text: 'Results released to patient profile.' });
        await handleSelectVisit(selectedVisit);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error releasing results.' });
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = (createdAt) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const renderTAT = (visit) => {
    const mins = getElapsedTime(visit.created_at);
    let color = 'text-green-400 bg-green-500/10 border-green-500/20';
    if (mins >= 30) {
      color = 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';
    } else if (mins >= 15) {
      color = 'text-yellow-450 bg-yellow-500/10 border-yellow-500/20';
    }
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold flex items-center gap-1 ${color}`}>
        <Clock size={10} /> {mins}m
      </span>
    );
  };

  // Filter visits list based on filter tab
  const getFilteredVisits = () => {
    if (activeTab === 'completed') {
      return labVisits.filter(v => v.status === 'completed');
    }
    // Waiting queue
    return labVisits.filter(v => v.status === 'waiting');
  };

  const filteredVisits = getFilteredVisits();

  // Rejection Options
  const rejectionReasons = [
    'Hemolyzed Sample',
    'Insufficient Sample Volume',
    'Clotted / Blocked Tube',
    'Contaminated Sample',
    'Incorrect Container Type'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical size={14} className="text-teal-400" /> Laboratory Queue
          </h2>
          <button 
            onClick={fetchLabQueue} 
            className="text-slate-500 hover:text-white transition"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Tab filters */}
        <div className="flex border-b border-slate-800 text-[10px] uppercase font-bold tracking-wide">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              activeTab === 'active' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Pending ({labVisits.filter(v => v.status === 'waiting').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              activeTab === 'completed' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Completed ({labVisits.filter(v => v.status === 'completed').length})
          </button>
        </div>

        {/* Queue Items */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredVisits.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                selectedVisit?.id === item.id
                  ? 'border-teal-500/60 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[65%]">{item.patient?.name}</span>
                {renderTAT(item)}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 w-full font-mono">
                <span>{item.patient?.facility_id_code}</span>
                <span className={`px-1 rounded text-[8px] uppercase ${
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : 'bg-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
            </button>
          ))}

          {filteredVisits.length === 0 && (
            <div className="text-xs text-slate-650 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients in this queue.
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Interactive Workflow Engine */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-32 text-center my-auto">
            <FlaskConical size={54} className="text-slate-700 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wide">No Active Worklist Selected</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a waitlisted patient from the queue to access sample accessioning, result entries, and senior reviews.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-800 gap-4">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Lab Accessioning & Diagnostic Workspace</span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">{selectedVisit.patient?.name}</h3>
                <p className="text-xs text-slate-500">{selectedVisit.patient?.facility_id_code} | Age: {new Date().getFullYear() - new Date(selectedVisit.patient?.dob).getFullYear()} yrs | Gender: <span className="capitalize">{selectedVisit.patient?.gender}</span></p>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] text-yellow-500 bg-yellow-500/5 border border-yellow-500/15 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  Urgency: {selectedVisit.priority.toUpperCase()}
                </span>
                {renderTAT(selectedVisit)}
              </div>
            </div>

            {message.text && (
              <div className={`p-3.5 rounded-xl border text-xs flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Test Worklist */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
                <CheckSquare size={14} className="text-teal-400" /> Diagnostic Test Parameters & Lifecycle States
              </h4>

              <div className="space-y-4">
                {pendingOrders.map((ord) => {
                  const meta = parseOrderMeta(ord.results);
                  const isSeniorVerifier = user.role === 'admin' || user.role === 'clinician';
                  
                  return (
                    <div key={ord.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                      {/* Top Info Banner */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-bold text-slate-200 text-xs block">{ord.item_name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">Price: {ord.price || 0}/-</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Colored State Pill */}
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            ord.status === 'released' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            ord.status === 'verified' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                            ord.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            ord.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-450 border-yellow-500/20'
                          }`}>
                            {ord.status || 'ordered'}
                          </span>
                          {meta.barcode && (
                            <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                              <Barcode size={12} /> {meta.barcode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Workflow Timeline Status Tracker */}
                      <div className="grid grid-cols-5 text-[9px] text-slate-500 uppercase tracking-wider text-center border-t border-b border-slate-900 py-2.5 font-semibold">
                        <div className={!['ordered', 'pending'].includes(ord.status || 'ordered') ? 'text-teal-400' : 'text-slate-650'}>
                          ● Collected
                        </div>
                        <div className={['received', 'accepted', 'in_process', 'completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Received
                        </div>
                        <div className={['accepted', 'in_process', 'completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Accepted
                        </div>
                        <div className={['completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Results Entry
                        </div>
                        <div className={['verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Released
                        </div>
                      </div>

                      {/* Dynamic Workflow Actions */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/50 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                        <div className="text-[10px] text-slate-400">
                          {/* Collected state info */}
                          {ord.status === 'collected' && (
                            <p>Sample collected by <span className="text-white font-bold">{meta.collected_by}</span>. Accessioning clerk check-in pending.</p>
                          )}
                          {/* Received info */}
                          {ord.status === 'received' && (
                            <p>Sample received. Run integrity review to check for hemolyzation, clotting, or volume issues.</p>
                          )}
                          {/* Rejected details */}
                          {ord.status === 'rejected' && (
                            <p className="text-red-400 font-semibold">Rejected by {meta.rejected_by} (Reason: {meta.rejection_reason}). Phlebotomist recollecting required.</p>
                          )}
                          {/* Accepted info */}
                          {ord.status === 'accepted' && (
                            <p>Sample accepted and labeled. Ready for analyzer processing run.</p>
                          )}
                          {/* Processing info */}
                          {ord.status === 'in_process' && (
                            <p>Sample in process. Analyzer running. Diagnostic findings input required.</p>
                          )}
                          {/* Completed results info */}
                          {ord.status === 'completed' && (
                            <div className="space-y-1">
                              <p className="text-slate-200 font-bold">Findings: {meta.values}</p>
                              <p className="text-slate-500 text-[9px]">Awaiting supervisor/senior verifier sign-off.</p>
                            </div>
                          )}
                          {/* Verified info */}
                          {ord.status === 'verified' && (
                            <div className="space-y-1">
                              <p className="text-slate-200 font-bold">Findings: {meta.values}</p>
                              <p className="text-teal-400 text-[9px] font-bold">Verified by {meta.verifier}. Ready for medical release.</p>
                            </div>
                          )}
                          {/* Released state */}
                          {ord.status === 'released' && (
                            <div className="space-y-1">
                              <p className="text-green-400 font-bold">Released Findings: {meta.values}</p>
                              <p className="text-slate-500 text-[9px]">Released by {meta.released_by || 'Technician'} | Verified: {meta.verifier}</p>
                            </div>
                          )}
                          {/* Pending / Ordered */}
                          {(!ord.status || ord.status === 'ordered' || ord.status === 'pending') && (
                            <p>Test ordered. Phlebotomist collection of blood/urine/stool specimen pending.</p>
                          )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                          {/* Phlebotomy: Collect */}
                          {(!ord.status || ord.status === 'ordered' || ord.status === 'pending') && (
                            <button
                              disabled={loading}
                              onClick={() => handleCollectSample(ord.id)}
                              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <Barcode size={12} /> Collect Sample
                            </button>
                          )}

                          {/* Accession: Receive */}
                          {ord.status === 'collected' && (
                            <button
                              disabled={loading}
                              onClick={() => handleReceiveSample(ord.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                            >
                              Accession / Receive Sample
                            </button>
                          )}

                          {/* Integrity Review: Accept / Reject */}
                          {ord.status === 'received' && !showRejectForm[ord.id] && (
                            <>
                              <button
                                disabled={loading}
                                onClick={() => handleAcceptSample(ord.id)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                              >
                                Accept Sample
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => setShowRejectForm({ ...showRejectForm, [ord.id]: true })}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold text-[10px] py-1.5 px-3 rounded transition"
                              >
                                Reject Sample
                              </button>
                            </>
                          )}

                          {/* Rejection input */}
                          {showRejectForm[ord.id] && (
                            <div className="flex flex-col gap-1.5 bg-slate-950 p-2 rounded border border-slate-800">
                              <span className="text-[8px] font-bold text-slate-500 block uppercase">Select Rejection Reason</span>
                              <div className="flex gap-2">
                                <select
                                  id={`reject-select-${ord.id}`}
                                  className="bg-slate-900 border border-slate-800 text-[10px] text-white p-1 rounded focus:outline-none"
                                >
                                  {rejectionReasons.map((r, i) => (
                                    <option key={i} value={r}>{r}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const reason = document.getElementById(`reject-select-${ord.id}`).value;
                                    handleRejectSample(ord.id, reason);
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white text-[9px] py-1 px-2.5 rounded font-bold transition"
                                >
                                  Confirm Rejection
                                </button>
                                <button
                                  onClick={() => setShowRejectForm({ ...showRejectForm, [ord.id]: false })}
                                  className="text-slate-400 text-[9px] hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Recollect if rejected */}
                          {ord.status === 'rejected' && (
                            <button
                              disabled={loading}
                              onClick={() => handleRecollect(ord.id)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <RefreshCw size={11} /> Recollect Sample
                            </button>
                          )}

                          {/* Process sample */}
                          {ord.status === 'accepted' && (
                            <button
                              disabled={loading}
                              onClick={() => handleStartProcess(ord.id)}
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                            >
                              Process / Load Analyzer
                            </button>
                          )}

                          {/* Input Results form */}
                          {ord.status === 'in_process' && (
                            <div className="flex items-center gap-2 w-full max-w-md">
                              <input
                                type="text"
                                value={resultsInputs[ord.id] || ''}
                                onChange={(e) => handleResultChange(ord.id, e.target.value)}
                                placeholder="Enter diagnostic findings..."
                                className="bg-slate-950 border border-slate-800 rounded text-[10px] py-1.5 px-2 text-white placeholder:text-slate-700 w-full focus:outline-none focus:border-teal-500"
                                required
                              />
                              <button
                                disabled={loading}
                                onClick={() => handleSaveResults(ord.id)}
                                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded shrink-0 transition"
                              >
                                Submit Results
                              </button>
                            </div>
                          )}

                          {/* Verify double-check (restricted to admins/clinicians or senior tech) */}
                          {ord.status === 'completed' && (
                            <button
                              disabled={loading}
                              onClick={() => handleVerifyResults(ord.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <UserCheck size={12} /> Verify Findings
                            </button>
                          )}

                          {/* Release to Patient Record */}
                          {ord.status === 'verified' && (
                            <button
                              disabled={loading}
                              onClick={() => handleReleaseResults(ord.id)}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] py-1.5 px-4 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <Send size={11} /> Release Results
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pendingOrders.length === 0 && (
                  <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center">
                    No active laboratory orders found for this outpatient visit.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
