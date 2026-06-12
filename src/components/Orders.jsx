import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FlaskConical, AlertCircle, CheckCircle, Save, CheckSquare } from 'lucide-react';

export default function Orders({ user, onComplete }) {
  const [labVisits, setLabVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  
  // Results inputs
  const [resultsData, setResultsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchLabQueue();
  }, []);

  const fetchLabQueue = async () => {
    try {
      // Fetch visits currently waiting in lab
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'lab').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setLabVisits(enrichedVisits);
      
      if (enrichedVisits.length > 0) {
        handleSelectVisit(enrichedVisits[0]);
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
    setResultsData({});
    
    // Fetch pending orders for this visit
    try {
      const { data: ords } = await supabase.from('orders')
        .select('*')
        .eq('visit_id', visit.id)
        .eq('type', 'lab')
        .eq('status', 'pending');
        
      setPendingOrders(ords || []);
      
      // Initialize inputs
      const initialResults = {};
      ords?.forEach(o => {
        initialResults[o.id] = '';
      });
      setResultsData(initialResults);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const handleResultChange = (orderId, val) => {
    setResultsData({
      ...resultsData,
      [orderId]: val
    });
  };

  const handleSaveResults = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Update each order with results and mark completed
      const updatePromises = Object.entries(resultsData).map(([orderId, resultText]) => {
        if (!resultText.trim()) throw new Error('Please enter results for all ordered tests.');
        return supabase.from('orders').update({
          results: resultText,
          status: 'completed'
        }).eq('id', orderId);
      });

      await Promise.all(updatePromises);

      // 2. Move patient to Billing department to settle charges before getting drugs
      // In this setup, we assume billing handles invoices for both labs & prescription drugs.
      // After lab, patient goes to Billing (to pay for labs and prepare for pharmacy)
      // or if they already paid or have insurance, they can go to Pharmacy directly.
      // For this MVP flow, we will route to 'billing' so cashiers can confirm payment.
      const { error: visitErr } = await supabase.from('visits').update({
        department: 'billing',
        status: 'waiting'
      }).eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      setMessage({
        type: 'success',
        text: 'Lab results captured successfully. Patient redirected to Billing Desk.'
      });

      setTimeout(() => {
        fetchLabQueue();
        if (onComplete) onComplete();
      }, 1200);

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error saving lab results.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lab Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <FlaskConical size={16} className="text-teal-400" /> Laboratory Waiting Queue ({labVisits.length})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Select patient to record test outputs</p>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {labVisits.map((item) => (
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
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-905 border border-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 w-full font-mono">
                <span>{item.patient?.facility_id_code}</span>
                <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </button>
          ))}

          {labVisits.length === 0 && (
            <div className="text-xs text-slate-600 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients awaiting laboratory tests.
            </div>
          )}
        </div>
      </div>

      {/* Lab Entry Panel */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <FlaskConical size={48} className="text-slate-600 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-medium text-sm">No Pending Lab Selection</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient from the lab queue on the left to start recording diagnostic data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Lab Results Logging</span>
                <h3 className="text-base font-bold text-slate-100">{selectedVisit.patient?.name}</h3>
                <p className="text-xs text-slate-500">{selectedVisit.patient?.facility_id_code} | Age: {new Date().getFullYear() - new Date(selectedVisit.patient?.dob).getFullYear()} yrs</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-450 block">Urgency</span>
                <span className="text-xs font-semibold text-white uppercase bg-slate-850 px-2 py-0.5 rounded border border-slate-800">{selectedVisit.priority}</span>
              </div>
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveResults} className="space-y-4">
              <h4 className="text-xs font-bold text-teal-450 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={14} /> Pending Test Parameters
              </h4>

              <div className="space-y-4">
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-200 text-sm">{ord.item_name}</span>
                      <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider bg-teal-500/5 px-2 py-0.5 rounded border border-teal-500/20">Pending Result</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Result Findings / Values *</label>
                      <input
                        type="text"
                        value={resultsData[ord.id] || ''}
                        onChange={(e) => handleResultChange(ord.id, e.target.value)}
                        placeholder={
                          ord.item_name.includes('Malaria') ? "e.g. Positive (+++) / MPS Seen or Negative" :
                          ord.item_name.includes('Count') ? "e.g. Hb: 11.8 g/dL, WBC: 6.4 x10^9/L" : "Enter findings"
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                        required
                      />
                    </div>
                  </div>
                ))}

                {pendingOrders.length === 0 && (
                  <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center">
                    No active lab test orders found for this visit. Check if orders were entered during Consultation.
                  </div>
                )}
              </div>

              {pendingOrders.length > 0 && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98]"
                  >
                    <Save size={14} />
                    {loading ? 'Submitting Results...' : 'Verify & Submit Results'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
