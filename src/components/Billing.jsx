import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, DollarSign, Printer, CheckCircle, AlertCircle, Eye } from 'lucide-react';

export default function Billing({ user, onComplete }) {
  const [billingVisits, setBillingVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Payment recording states
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Receipt print view trigger
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchBillingQueue();
  }, []);

  const fetchBillingQueue = async () => {
    try {
      // Fetch visits currently waiting in billing
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'billing').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setBillingVisits(enrichedVisits);
      
      if (enrichedVisits.length > 0) {
        handleSelectVisit(enrichedVisits[0]);
      } else {
        setSelectedVisit(null);
        setInvoice(null);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching billing queue:', err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    setShowReceipt(false);
    setAmountPaid('');
    
    try {
      // Fetch invoice
      const { data: invs } = await supabase.from('invoices').select('*').eq('visit_id', visit.id).eq('status', 'unpaid');
      const activeInvoice = invs && invs[0];
      setInvoice(activeInvoice);

      // Fetch all lab & drug orders for this visit to list on receipt
      const { data: ords } = await supabase.from('orders').select('*').eq('visit_id', visit.id);
      setOrders(ords || []);
      
      if (activeInvoice) {
        setAmountPaid(activeInvoice.total_amount.toString());
      }
    } catch (err) {
      console.error('Error loading billing records:', err);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !invoice) return;

    const paidVal = parseFloat(amountPaid);
    if (isNaN(paidVal) || paidVal < invoice.total_amount) {
      setMessage({ type: 'error', text: `Please enter full invoice payment of ${invoice.total_amount}/-.` });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Update invoice to paid
      const { error: invErr } = await supabase.from('invoices').update({
        amount_paid: paidVal,
        status: 'paid',
        payment_method: paymentMethod
      }).eq('id', invoice.id);

      if (invErr) throw invErr;

      // 2. Redirect patient to Pharmacy queue to collect drugs
      // If there are prescription items ordered, redirect to pharmacy.
      // If no drugs were ordered, complete visit.
      const hasPrescriptions = orders.some(o => o.type === 'prescription');
      const nextDept = hasPrescriptions ? 'pharmacy' : 'completed';

      const { error: visitErr } = await supabase.from('visits').update({
        department: nextDept,
        status: nextDept === 'completed' ? 'completed' : 'waiting'
      }).eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      setMessage({ type: 'success', text: 'Invoice payment recorded successfully!' });
      setShowReceipt(true);

      // Log invoice payment
      await supabase.from('audit_logs').insert({
        action: 'Invoice Settlement',
        details: `Recorded payment of ${paidVal}/- via ${paymentMethod.toUpperCase()} for patient ${selectedVisit.patient?.name}`
      });

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Billing error.' });
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentFee = (dept) => {
    // Basic service fees
    if (dept === 'triage') return 100;
    if (dept === 'consultation') return 300;
    return 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Billing queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <CreditCard size={16} className="text-teal-400" /> Cashier Billing Queue ({billingVisits.length})
          </h2>
          <p className="text-[11px] text-slate-505 mt-0.5">Select patient to process billing</p>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {billingVisits.map((item) => (
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
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-405 w-full font-mono">
                <span>{item.patient?.facility_id_code}</span>
                <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </button>
          ))}

          {billingVisits.length === 0 && (
            <div className="text-xs text-slate-650 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients awaiting billing invoices.
            </div>
          )}
        </div>
      </div>

      {/* Invoice Viewer / Payment Recorder */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-28 text-center my-auto">
            <DollarSign size={48} className="text-slate-600 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-medium text-sm">No Active Billing Invoice Loaded</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient waiting in billing on the left to compile invoice items, record payments, and print checkout receipts.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Patient billing invoice</span>
                <h3 className="text-base font-bold text-slate-100">{selectedVisit.patient?.name}</h3>
                <p className="text-xs text-slate-500">{selectedVisit.patient?.facility_id_code} | DOB: {selectedVisit.patient?.dob}</p>
              </div>
              <span className="text-[10px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 font-bold px-2 py-0.5 rounded uppercase">UNPAID</span>
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            {showReceipt ? (
              /* Receipt Print View */
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                {/* PAID Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                  <span className="text-6xl font-extrabold text-teal-500 border-[12px] border-teal-500 rounded-lg p-4 rotate-12">PAID</span>
                </div>

                <div className="text-center pb-4 border-b border-dashed border-slate-800">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider">EGESA MEDICAL CLINIC</h4>
                  <p className="text-[10px] text-slate-500">MOH Register ID: EMC-001 | Tel: +254 712 345 678</p>
                  <p className="text-[9px] text-slate-600 font-mono mt-1">Receipt No: RCPT-{Math.floor(10000 + Math.random() * 90000)} | Date: {new Date().toLocaleString()}</p>
                </div>

                {/* Receipt Details */}
                <div className="py-4 space-y-3">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Patient: {selectedVisit.patient?.name}</span>
                    <span>ID Code: {selectedVisit.patient?.facility_id_code}</span>
                  </div>

                  <div className="border-t border-slate-800 pt-2 text-xs space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Fee Item</span>
                      <span>Amount</span>
                    </div>

                    {/* Standard registration fee */}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Outpatient Consultation & Vitals Fee</span>
                      <span className="font-mono text-slate-300">350.00/-</span>
                    </div>

                    {/* Order items */}
                    {orders.map(o => (
                      <div key={o.id} className="flex justify-between">
                        <span className="text-slate-400 capitalize">{o.type} Test: {o.item_name}</span>
                        <span className="font-mono text-slate-300">{parseFloat(o.price).toFixed(2)}/-</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paid Summary */}
                <div className="border-t border-dashed border-slate-800 pt-3 flex flex-col items-end gap-1 font-mono">
                  <div className="text-xs text-slate-400">
                    Subtotal: <span className="text-slate-200">{(parseFloat(invoice?.total_amount) + 350).toFixed(2)}/-</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Payment Method: <span className="text-teal-400 font-bold uppercase">{paymentMethod}</span>
                  </div>
                  <div className="text-sm font-bold text-teal-400 mt-1">
                    Amount Paid: {(parseFloat(invoice?.total_amount) + 350).toFixed(2)}/-
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Balance Outstanding: 0.00/-
                  </div>
                </div>

                <div className="flex justify-between pt-5 mt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      fetchBillingQueue();
                      setShowReceipt(false);
                    }}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold text-xs py-2 px-4 rounded-lg transition"
                  >
                    Load Next Ticket
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-lg shadow-teal-500/10 transition"
                  >
                    <Printer size={12} /> Print Receipt
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Processing Form */
              <form onSubmit={handlePay} className="space-y-4">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fee Summary</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Outpatient Consultation Charge</span>
                      <span className="font-mono">350.00/-</span>
                    </div>
                    {orders.map(o => (
                      <div key={o.id} className="flex justify-between text-slate-400">
                        <span className="capitalize">{o.type}: {o.item_name}</span>
                        <span className="font-mono">{parseFloat(o.price).toFixed(2)}/-</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-2 text-slate-200">
                      <span>Grand Total Due</span>
                      <span className="font-mono text-teal-400">{(parseFloat(invoice?.total_amount || 0) + 350).toFixed(2)}/-</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="cash">Cash (Manual Drawer)</option>
                      <option value="mpesa">Mobile Money (M-Pesa Express)</option>
                      <option value="insurance">NHIF / Insurance Scheme</option>
                    </select>
                  </div>

                  {/* Cash Amount Paid */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount Received (KSH) *</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98]"
                  >
                    {loading ? 'Processing Payment...' : 'Record Payment & Generate Receipt'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
