import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
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

  const [tumaPhone, setTumaPhone] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [tumaStatus, setTumaStatus] = useState(''); // '', 'sent', 'paid', 'failed'
  const [isSimulated, setIsSimulated] = useState(false);
  
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
        setAmountPaid((parseFloat(activeInvoice.total_amount) + 350).toString());
      }
    } catch (err) {
      console.error('Error loading billing records:', err);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !invoice) return;

    const paidVal = parseFloat(amountPaid || (parseFloat(invoice.total_amount) + 350));

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (paymentMethod === 'mpesa') {
        if (!tumaPhone.trim()) {
          setMessage({ type: 'error', text: 'Tuma Pay phone number is required.' });
          setLoading(false);
          return;
        }

        // Trigger STK Push via backend API
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${backendUrl}/mpesa/stkpush`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: tumaPhone,
            amount: paidVal,
            reference: invoice.id
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Tuma Pay STK Push request failed');
        }

        setCheckoutId(data.CheckoutRequestID);
        setIsSimulated(!!data.simulated);
        setTumaStatus('sent');
        setMessage({ type: 'success', text: 'Tuma Pay payment prompt sent successfully!' });
      } else {
        // Standard Manual Flow (Cash or Insurance)
        if (isNaN(paidVal) || paidVal < (parseFloat(invoice.total_amount) + 350)) {
          setMessage({ type: 'error', text: `Please enter full invoice payment of ${(parseFloat(invoice.total_amount) + 350).toFixed(2)}/-.` });
          setLoading(false);
          return;
        }

        const { error: invErr } = await supabase.from('invoices').update({
          amount_paid: paidVal,
          status: 'paid',
          payment_method: paymentMethod
        }).eq('id', invoice.id);

        if (invErr) throw invErr;

        // Redirect patient to Pharmacy queue or Complete
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
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Billing error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTumaStatus = async () => {
    setLoading(true);
    try {
      const { data: invs } = await supabase.from('invoices').select('*').eq('id', invoice.id);
      const inv = invs && invs[0];
      if (inv && inv.status === 'paid') {
        // Payment was recorded! Let's update the visit department
        const hasPrescriptions = orders.some(o => o.type === 'prescription');
        const nextDept = hasPrescriptions ? 'pharmacy' : 'completed';

        await supabase.from('visits').update({
          department: nextDept,
          status: nextDept === 'completed' ? 'completed' : 'waiting'
        }).eq('id', selectedVisit.id);

        // Refresh active invoice state
        setInvoice(inv);
        setTumaStatus('paid');
        setShowReceipt(true);
        setMessage({ type: 'success', text: 'Payment confirmed successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Payment confirmation not found yet. Please try again in a moment.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error checking payment status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTumaSuccess = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${backendUrl}/mpesa/simulate-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CheckoutRequestID: checkoutId })
      });
      if (res.ok) {
        // Check status immediately
        await handleCheckTumaStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to simulate payment success.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Simulation request error.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please enable popups to print receipt.');
      return;
    }
    
    // Logo resolution
    let logoHtml = '';
    const logoUrl = user?.facility_logo;
    if (logoUrl) {
      if (logoUrl.startsWith('preset:')) {
        const presetKey = logoUrl.split(':')[1];
        if (presetKey === 'shield') {
          logoHtml = `
            <div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto;">
              <svg style="width: 24px; height: 24px; color: #3b82f6;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12c-2.33 0-4.31-1.17-5.46-2.93.03-1.81 3.63-2.82 5.46-2.82 1.82 0 5.42 1.01 5.46 2.82-1.15 1.76-3.13 2.93-5.46 2.93z"/>
              </svg>
            </div>
          `;
        } else if (presetKey === 'cross') {
          logoHtml = `
            <div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto;">
              <svg style="width: 24px; height: 24px; color: #ef4444;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
              </svg>
            </div>
          `;
        } else {
          logoHtml = `
            <div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto;">
              <svg style="width: 24px; height: 24px; color: #10b981;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          `;
        }
      } else {
        logoHtml = `
          <div style="text-align: center; margin-bottom: 10px;">
            <img src="${logoUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" onerror="this.style.display='none'" />
          </div>
        `;
      }
    } else {
      logoHtml = `
        <div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #0d9488; font-size: 16px; margin: 0 auto 10px auto;">
          ${(user?.facility_name || 'EM').substring(0, 2).toUpperCase()}
        </div>
      `;
    }

    const total = (parseFloat(invoice?.total_amount || 0) + 350).toFixed(2);
    const receiptNo = 'RCPT-' + Math.floor(10000 + Math.random() * 90000);
    const ageYrs = selectedVisit?.patient?.dob ? Math.floor((new Date() - new Date(selectedVisit.patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${selectedVisit.patient?.name}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              background-color: #fff;
              width: 70mm;
              margin: 0 auto;
              padding: 5mm;
              font-size: 10px;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            
            .header-section {
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .facility-name {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
            }
            .facility-meta {
              font-size: 8px;
              margin: 2px 0;
            }
            
            .invoice-meta {
              font-size: 8px;
              margin-top: 6px;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
            }
            
            .patient-details {
              margin: 6px 0;
              font-size: 9px;
            }
            
            .items-header {
              border-bottom: 1px solid #000;
              font-weight: bold;
              margin-top: 8px;
              padding-bottom: 2px;
            }
            
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px dashed #eee;
            }
            
            .summary-section {
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 6px;
              font-size: 10px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            
            .watermark-paid {
              border: 2px solid #000;
              color: #000;
              font-size: 14px;
              font-weight: bold;
              display: inline-block;
              padding: 4px 12px;
              margin: 10px auto;
              text-transform: uppercase;
              transform: rotate(-5deg);
              letter-spacing: 2px;
            }
            
            .footer-section {
              margin-top: 15px;
              border-top: 1px dashed #000;
              padding-top: 8px;
              font-size: 8px;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="text-center header-section">
            ${logoHtml}
            <h4 class="facility-name">${user?.facility_name || 'Eagle Tech Medical Clinic'}</h4>
            <p class="facility-meta">MOH Register ID: EMC-001 | Tel: +254 712 345 678</p>
            <p class="facility-meta">${new Date().toLocaleString()}</p>
          </div>
          
          <div class="patient-details">
            <div class="font-bold">Patient: ${selectedVisit.patient?.name}</div>
            <div>ID Code: ${selectedVisit.patient?.facility_id_code}</div>
            <div>Age/Sex: ${ageYrs} Yrs | ${selectedVisit.patient?.gender?.toUpperCase() || 'N/A'}</div>
          </div>
          
          <div class="invoice-meta">
            <div>Receipt No: ${receiptNo}</div>
            <div>Payment Mode: ${(invoice?.payment_method || paymentMethod).toUpperCase()}</div>
            <div>Cashier: ${user?.full_name || 'N/A'}</div>
          </div>
          
          <div class="font-bold items-header">
            <div style="display: flex; justify-content: space-between;">
              <span>Fee Item</span>
              <span>Amount (KES)</span>
            </div>
          </div>
          
          <div class="item-row">
            <span>Outpatient Consultation & Vitals</span>
            <span>350.00</span>
          </div>
          
          ${orders.map(o => `
            <div class="item-row">
              <span style="text-transform: capitalize;">${o.type} Test: ${o.item_name}</span>
              <span>${parseFloat(o.price).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="summary-section">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${total}</span>
            </div>
            <div class="summary-row font-bold" style="font-size: 11px; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
              <span>AMOUNT PAID:</span>
              <span>${total}</span>
            </div>
            <div class="summary-row">
              <span>Balance Outstanding:</span>
              <span>0.00</span>
            </div>
          </div>
          
          <div class="text-center" style="margin-top: 10px;">
            <div class="watermark-paid">PAID</div>
          </div>
          
          <div class="text-center footer-section">
            <p>Thank you for choosing ${user?.facility_name || 'us'}.</p>
            <p style="font-size: 7px; color: #777;">Powered by Eagle Tech HMIS Solutions</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

            {tumaStatus === 'sent' ? (
              /* Tuma Pay STK Pending Status Card */
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="h-10 w-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Tuma Pay STK Prompt Sent</h4>
                  <p className="text-xs text-slate-500 mt-1">Please approve the payment request on your phone to complete payment of <strong>KES {(parseFloat(invoice?.total_amount || 0) + 350).toFixed(2)}</strong>.</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-1">Checkout ID: {checkoutId}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleCheckTumaStatus}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition"
                  >
                    Confirm Payment Received
                  </button>
                  
                  {isSimulated && (
                    <button
                      onClick={handleSimulateTumaSuccess}
                      className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold text-xs py-2 px-4 rounded-lg transition"
                    >
                      🧪 Simulate Successful Tuma Pay Result
                    </button>
                  )}
                  
                  <button
                    onClick={() => setTumaStatus('')}
                    className="w-full text-slate-550 hover:text-white text-xs font-semibold"
                  >
                    Cancel / Back to Payment Forms
                  </button>
                </div>
              </div>
            ) : showReceipt ? (
              /* Receipt Print View */
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                {/* PAID Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                  <span className="text-6xl font-extrabold text-teal-500 border-[12px] border-teal-500 rounded-lg p-4 rotate-12">PAID</span>
                </div>

                <div className="text-center pb-4 border-b border-dashed border-slate-800">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider">EAGLE TECH MEDICAL CLINIC</h4>
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
                    Payment Method: <span className="text-teal-400 font-bold uppercase">{invoice?.payment_method || paymentMethod}</span>
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
                    onClick={handlePrintReceipt}
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
                      <option value="mpesa">Tuma Pay (Mobile Money/Card)</option>
                      <option value="insurance">NHIF / Insurance Scheme</option>
                    </select>
                  </div>

                  {paymentMethod === 'mpesa' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tuma Pay Mobile Number *</label>
                      <input
                        type="text"
                        value={tumaPhone}
                        onChange={(e) => setTumaPhone(e.target.value)}
                        placeholder="e.g. 254712345678 or 0712345678"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                        required
                      />
                    </div>
                  ) : (
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
                  )}
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
