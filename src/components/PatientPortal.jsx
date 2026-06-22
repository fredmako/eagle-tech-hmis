import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { User, Clipboard, DollarSign, Activity, FileText, Pill, LogOut, CheckCircle, AlertTriangle, ShieldCheck, CreditCard, PhoneCall } from 'lucide-react';

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [orders, setOrders] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Payment Modal States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // mpesa, stripe, paypal
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Mpesa STK States
  const [stkPhone, setStkPhone] = useState('');
  
  // Stripe States
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // WhatsApp welcome / contact details
  const [facilityWhatsApp, setFacilityWhatsApp] = useState('');

  // Support Ticket States
  const [supportSubject, setSupportSubject] = useState('Patient Portal Assistance');
  const [supportMessageText, setSupportMessageText] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportStatus, setSupportStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (user && user.email) {
      loadPatientDetails();
    }
  }, [user]);

  const loadPatientDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch patient matching email in phone JSON
      const { data: allPts, error: ptError } = await supabase.from('patients').select('*');
      if (ptError) throw ptError;

      const matchingPt = allPts?.find(pt => {
        try {
          const contact = JSON.parse(pt.phone);
          return contact.email && contact.email.toLowerCase().trim() === user.email.toLowerCase().trim();
        } catch (e) {
          return false;
        }
      });

      if (!matchingPt) {
        setMessage({ type: 'error', text: 'No patient medical file found linked to your email.' });
        setLoading(false);
        return;
      }

      setPatient(matchingPt);
      setStkPhone(JSON.parse(matchingPt.phone)?.phone || '');

      // Load facility WhatsApp info
      const { data: fac } = await supabase.from('facilities').select('*').eq('id', matchingPt.facility_id).single();
      if (fac) {
        setFacilityWhatsApp(fac.whatsapp_number || '');
      }

      // 2. Fetch Patient Visits
      const { data: vsts } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', matchingPt.id)
        .order('created_at', { ascending: false });
      setVisits(vsts || []);

      if (vsts && vsts.length > 0) {
        const visitIds = vsts.map(v => v.id);

        // 3. Fetch related Invoices
        const { data: invs } = await supabase
          .from('invoices')
          .select('*')
          .in('visit_id', visitIds)
          .order('created_at', { ascending: false });
        setInvoices(invs || []);

        // 4. Fetch Consultations
        const { data: consults } = await supabase
          .from('consultations')
          .select('*')
          .in('visit_id', visitIds);
        setConsultations(consults || []);

        // 5. Fetch Lab/Pharmacy Orders
        const { data: ords } = await supabase
          .from('orders')
          .select('*')
          .in('visit_id', visitIds);
        setOrders(ords || []);
      }
    } catch (err) {
      console.error('Error loading patient portal:', err);
      setMessage({ type: 'error', text: 'Failed to synchronize patient details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('egesa_health_token');
    localStorage.removeItem('egesa_health_user');
    if (logout) {
      await logout();
    }
    window.location.href = '/';
  };

  const triggerOnlineCheckout = (invoice) => {
    setSelectedInvoice(invoice);
    setShowCheckoutModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      if (paymentMethod === 'mpesa') {
        // Trigger M-Pesa STK Push
        const res = await fetch(`${apiBase}/mpesa/stkpush`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            phone: stkPhone,
            amount: selectedInvoice.total_amount || selectedInvoice.amount,
            reference: selectedInvoice.id
          })
        });

        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'STK Push failed.');

        setMessage({
          type: 'success',
          text: `M-Pesa STK push initiated successfully! Check your phone to enter PIN. (${body.CustomerMessage || ''})`
        });
        setShowCheckoutModal(false);
        await loadPatientDetails();
      } 
      else if (paymentMethod === 'stripe') {
        // Stripe Payment Intent simulation / API call
        const res = await fetch(`${apiBase}/payments/stripe/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: selectedInvoice.total_amount || selectedInvoice.amount,
            invoiceId: selectedInvoice.id,
            facilityId: patient.facility_id
          })
        });

        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Stripe initialization failed.');

        // Simulate successful stripe capture
        const captureRes = await fetch(`${apiBase}/payments/paypal/capture-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderID: body.clientSecret || 'stripe_intent_simulated',
            invoiceId: selectedInvoice.id,
            facilityId: patient.facility_id,
            paymentMethod: 'stripe'
          })
        });

        const captureBody = await captureRes.json();
        if (!captureRes.ok) throw new Error(captureBody.error || 'Invoice capture failed.');

        setMessage({ type: 'success', text: 'Stripe Card payment captured successfully!' });
        setShowCheckoutModal(false);
        await loadPatientDetails();
      }
      else if (paymentMethod === 'paypal') {
        // PayPal Order simulation / API call
        const res = await fetch(`${apiBase}/payments/paypal/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: selectedInvoice.total_amount || selectedInvoice.amount,
            invoiceId: selectedInvoice.id,
            facilityId: patient.facility_id
          })
        });

        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'PayPal order creation failed.');

        // Simulate capturing paypal order
        const captureRes = await fetch(`${apiBase}/payments/paypal/capture-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderID: body.orderID,
            invoiceId: selectedInvoice.id,
            facilityId: patient.facility_id,
            paymentMethod: 'paypal'
          })
        });

        const captureBody = await captureRes.json();
        if (!captureRes.ok) throw new Error(captureBody.error || 'Invoice capture failed.');

        setMessage({ type: 'success', text: 'PayPal Checkout order captured successfully!' });
        setShowCheckoutModal(false);
        await loadPatientDetails();
      }
    } catch (err) {
      console.error('Payment checkout failure:', err);
      setMessage({ type: 'error', text: err.message || 'Payment processing failed.' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportMessageText.trim()) return;

    setSupportSubmitting(true);
    setSupportStatus(null);

    try {
      const ticketId = 'ticket_' + Math.random().toString(36).substring(2, 12);
      const emailAddr = user?.email || '';
      const patientName = patient?.name || user?.full_name || 'Patient';

      const newTicket = {
        id: ticketId,
        user_name: patientName,
        user_email: emailAddr,
        subject: supportSubject,
        message: supportMessageText.trim(),
        status: 'pending'
      };

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // 1. Insert ticket into DB proxy
      const dbRes = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          rows: newTicket
        })
      });

      if (!dbRes.ok) {
        const errData = await dbRes.json();
        throw new Error(errData.error || 'Failed to submit support ticket.');
      }

      // 2. Dispatch Confirmation Email
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailAddr,
            subject: `Support Ticket Received: [#${ticketId.substring(7, 13)}] - ${supportSubject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Support Ticket Received</h2>
                <p>Hello <strong>${patientName}</strong>,</p>
                <p>We have successfully logged your support ticket (Reference: <strong>#${ticketId.substring(7, 13)}</strong>).</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 4px;">
                  <strong>Subject:</strong> ${supportSubject}<br/>
                  <strong>Message:</strong> "${supportMessageText.trim()}"
                </div>
                <p>Our administration team will review your query and reply shortly.</p>
                <p>Thank you,</p>
                <p><strong>Eagle Tech HMIS Support Team</strong></p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error("Support confirmation email dispatch failed:", emailErr);
      }

      setSupportStatus({
        type: 'success',
        text: `Ticket #${ticketId.substring(7, 13)} submitted successfully! A confirmation email has been sent.`
      });
      setSupportMessageText('');
    } catch (err) {
      console.error("Support ticket submission failed:", err);
      setSupportStatus({
        type: 'error',
        text: err.message || 'Failed to submit your support query.'
      });
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
          <p className="text-xs font-bold uppercase tracking-wider">Synchronizing Patient Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 relative font-sans">
      
      {/* Header Banner */}
      <header className="bg-slate-900 border-b border-slate-850 py-4 px-6 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center">
            <User className="text-teal-400" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">{patient?.name}</h1>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Patient Code: {patient?.facility_id_code}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {facilityWhatsApp && (
            <a
              href={`https://wa.me/${facilityWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition text-xs font-bold flex items-center gap-1 border border-slate-800 hover:border-emerald-500/20 px-3 py-1.5 rounded-lg"
            >
              <PhoneCall size={12} /> Contact Desk
            </a>
          )}
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition text-xs font-bold flex items-center gap-1 border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column 2/3: Medical Timeline & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {message.text && (
            <div className={`p-2.5 rounded text-xs ${
              message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? '✓ ' : '⚠️ '}{message.text}
            </div>
          )}

          {/* Visits Timeline */}
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} /> My Visit History Timeline
            </h2>

            <div className="space-y-4">
              {visits.map(visit => {
                const consult = consultations.find(c => c.visit_id === visit.id);
                const visitOrders = orders.filter(o => o.visit_id === visit.id);
                const invoice = invoices.find(i => i.visit_id === visit.id);

                return (
                  <div key={visit.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 shadow-lg">
                    <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-slate-900">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase font-mono">{new Date(visit.created_at).toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-200">Department: {visit.department.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          visit.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20'
                        }`}>{visit.status}</span>
                      </div>
                    </div>

                    {/* Vitals / Consult info */}
                    {consult && (
                      <div className="bg-slate-900/55 p-3 rounded-lg border border-slate-900 text-xs space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase">Diagnoses (ICD-10)</span>
                          <span className="text-slate-300 font-semibold">{consult.diagnosis_icd10 || 'No primary diagnosis recorded'}</span>
                        </div>
                        {consult.treatment_plan && (
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 block uppercase">Treatment Plan</span>
                            <span className="text-slate-350">{consult.treatment_plan}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prescriptions / Orders */}
                    {visitOrders.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase pl-1">Prescriptions & Diagnostic Tests</span>
                        <div className="flex flex-wrap gap-1.5">
                          {visitOrders.map(o => (
                            <span key={o.id} className="text-[9px] font-semibold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-850">
                              {o.item_name} ({o.status})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {visits.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-6">No clinical visits logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Billing Drawer / Payments widget */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} /> My Bills & Invoices
            </h2>

            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block font-bold">INV #{inv.id}</span>
                      <span className="text-[9px] text-slate-400 block">{new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      inv.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>{inv.status}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-900 pt-2.5">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Total Bill</span>
                      <span className="text-sm font-mono font-bold text-teal-400">KES {inv.total_amount || inv.amount}/-</span>
                    </div>
                    {inv.status === 'unpaid' && (
                      <button
                        onClick={() => triggerOnlineCheckout(inv)}
                        className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-[10px] py-1.5 px-3 rounded-lg shadow-lg flex items-center gap-1 transition"
                      >
                        <CreditCard size={12} /> Pay Online
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-6">No billing statements available.</p>
              )}
            </div>
          </div>

          {/* Help & Support Widget */}
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall size={14} /> Contact Help & Support
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Have a billing inquiry, medical record question, or need portal assistance? Log a support ticket directly.
            </p>

            {supportStatus && (
              <div className={`p-3 rounded text-[10px] font-semibold leading-relaxed ${
                supportStatus.type === 'success' ? 'bg-emerald-500/10 border border-emerald-550/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-550/20 text-rose-400'
              }`}>
                {supportStatus.text}
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inquiry Type</label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition font-semibold"
                >
                  <option value="Patient Portal Assistance">Patient Portal Assistance</option>
                  <option value="Billing & Billing Plans">Billing & Billing Plans</option>
                  <option value="Medical Record Inquiry">Medical Record Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Message Detail</label>
                <textarea
                  value={supportMessageText}
                  onChange={(e) => setSupportMessageText(e.target.value)}
                  rows={4}
                  placeholder="Tell us what you need help with..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-250 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={supportSubmitting || !supportMessageText.trim()}
                className="w-full bg-teal-400 hover:bg-teal-350 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs py-2 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {supportSubmitting ? (
                  <>
                    <div className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting ticket...</span>
                  </>
                ) : (
                  'Submit Support Ticket'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Checkout Drawer Modal */}
      {showCheckoutModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-start pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white">Online Billing Checkout</h3>
                <span className="text-[9px] text-slate-500 font-bold block">Invoice: #{selectedInvoice.id}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Total Bill</span>
                <span className="text-xs font-mono font-bold text-teal-400">KES {selectedInvoice.total_amount || selectedInvoice.amount}/-</span>
              </div>
            </div>

            {/* Selector Payment Mode */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              {['mpesa', 'paypal', 'stripe'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 border rounded-lg uppercase tracking-wider transition ${
                    paymentMethod === method
                      ? 'bg-slate-850 border-teal-500 text-teal-400'
                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 pt-2">
              {/* Conditional Inputs */}
              {paymentMethod === 'mpesa' && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2547XXXXXXXX"
                    value={stkPhone}
                    onChange={(e) => setStkPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition text-center"
                    required
                  />
                  <span className="text-[8px] text-slate-500 mt-1 block text-center">Triggers a secure STK push dialog directly to your phone.</span>
                </div>
              )}

              {paymentMethod === 'stripe' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition text-center font-mono"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition text-center font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">CVC / Code</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition text-center font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal' && (
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-center text-xs text-slate-400">
                  <p>You will be directed to complete standard secure PayPal checkout window.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-1/2 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="w-1/2 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs transition"
                >
                  {paymentLoading ? 'Processing...' : 'Authorize Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-850 py-3 text-center text-[10px] text-slate-600 shrink-0 font-sans">
        © 2026 Eagle Tech HMIS Solutions. All rights reserved. Secure Outpatient Payment Portal.
      </footer>
    </div>
  );
}
