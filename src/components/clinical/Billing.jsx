import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { CreditCard, DollarSign, Printer, CheckCircle, AlertCircle, Eye, RefreshCw, Upload, Shield, Plus } from 'lucide-react';
import { parsePatientContact, sendWhatsAppNotification } from '../../notificationService';
import { getNextDepartment } from '../../utils/workflowEngine';

export default function Billing({ user, architectureModel, onComplete, showNotification, initialSubTab }) {
  const [billingVisits, setBillingVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [orders, setOrders] = useState([]);
  const [facilityServices, setFacilityServices] = useState([]);
  const [selectedAdhocService, setSelectedAdhocService] = useState('');
  const [addingAdhoc, setAddingAdhoc] = useState(false);
  
  // Payment recording states
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  
  // Insurance split payment states
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [memberId, setMemberId] = useState('');
  const [preAuthCode, setPreAuthCode] = useState('');
  const [insuranceCoverage, setInsuranceCoverage] = useState('');
  const [copayPaymentMethod, setCopayPaymentMethod] = useState('cash');
  const [copayAmount, setCopayAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Console Tabs & State
  const [activeConsoleTab, setActiveConsoleTab] = useState('desk'); // 'desk', 'preauth', 'setup'
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveConsoleTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [billingTab, setBillingTab] = useState('queue'); // 'queue' or 'history'
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [allPatients, setAllPatients] = useState([]);

  // Reversal states
  const [reversalReason, setReversalReason] = useState('Incorrect Patient Billing');
  const [reversalNotes, setReversalNotes] = useState('');

  // Pre-auth states
  const [preAuths, setPreAuths] = useState(() => {
    const saved = localStorage.getItem(`egesa_preauths_${user?.facility_id}`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'PA-8832',
        patient_name: 'John Mwangi',
        insurance_provider: 'AAR Insurance',
        member_id: 'AAR-993821',
        preauth_code: 'AUTH-5532',
        approved_amount: 15000,
        notes: 'Pre-approved for lab panel and drugs',
        status: 'Approved',
        filename: 'aar_approval_doc.pdf',
        created_at: new Date(Date.now() - 86400000).toLocaleString()
      },
      {
        id: 'PA-2391',
        patient_name: 'Jane Doe',
        insurance_provider: 'Jubilee Insurance',
        member_id: 'JUB-482029',
        preauth_code: 'AUTH-9011',
        approved_amount: 8500,
        notes: 'Pre-approved for minor surgical clean-up',
        status: 'Approved',
        filename: 'jubilee_letter.png',
        created_at: new Date(Date.now() - 172800000).toLocaleString()
      }
    ];
  });

  useEffect(() => {
    if (user?.facility_id) {
      localStorage.setItem(`egesa_preauths_${user.facility_id}`, JSON.stringify(preAuths));
    }
  }, [preAuths, user?.facility_id]);

  const [preauthPatientId, setPreauthPatientId] = useState('');
  const [preauthProvider, setPreauthProvider] = useState('');
  const [preauthMemberId, setPreauthMemberId] = useState('');
  const [preauthCodeVal, setPreauthCodeVal] = useState('');
  const [preauthAmount, setPreauthAmount] = useState('');
  const [preauthNotes, setPreauthNotes] = useState('');
  const [preauthFile, setPreauthFile] = useState('');

  // Catalog update states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('OPD');
  const [newServicePrice, setNewServicePrice] = useState('');

  const updateServicesCatalog = async (updatedCatalog) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('facilities')
        .update({ services_list: updatedCatalog })
        .eq('id', user.facility_id);
      if (error) throw error;
      setFacilityServices(updatedCatalog);
      if (showNotification) {
        showNotification('success', 'Catalog Updated', 'Facility billing prices updated successfully!');
      } else {
        setMessage({ type: 'success', text: 'Facility billing prices updated successfully!' });
      }
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Update Failed', err.message);
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreauth = (e) => {
    e.preventDefault();
    if (!preauthPatientId || !preauthProvider || !preauthCodeVal || !preauthAmount) {
      alert('Please fill in all required fields');
      return;
    }
    const pt = allPatients.find(p => p.id === preauthPatientId);
    const newPreauth = {
      id: `PA-${Math.floor(1000 + Math.random() * 9000)}`,
      patient_name: pt ? pt.name : 'Unknown Patient',
      insurance_provider: preauthProvider,
      member_id: preauthMemberId,
      preauth_code: preauthCodeVal,
      approved_amount: parseFloat(preauthAmount),
      notes: preauthNotes,
      status: 'Approved',
      filename: preauthFile || 'approval_document.pdf',
      created_at: new Date().toLocaleString()
    };
    setPreAuths([newPreauth, ...preAuths]);
    
    // Clear form
    setPreauthPatientId('');
    setPreauthProvider('');
    setPreauthMemberId('');
    setPreauthCodeVal('');
    setPreauthAmount('');
    setPreauthNotes('');
    setPreauthFile('');

    if (showNotification) {
      showNotification('success', 'Pre-auth Logged', 'Pre-authorization approval logged successfully!');
    } else {
      setMessage({ type: 'success', text: 'Pre-authorization approval logged successfully!' });
    }
  };

  const handleReverseInvoice = async (inv, reason, notes) => {
    setLoading(true);
    try {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const revInvoiceId = `REV-${inv.id.substring(0, 8)}-${randNum}`;
      
      const negativeInvoice = {
        id: revInvoiceId,
        facility_id: inv.facility_id,
        visit_id: inv.visit_id,
        total_amount: -parseFloat(inv.total_amount),
        amount_paid: -parseFloat(inv.amount_paid),
        status: 'reversed',
        payment_method: inv.payment_method,
        receipt_number: `REV-${inv.receipt_number || 'RCPT'}`
      };
      
      const { error: insError } = await supabase
        .from('invoices')
        .insert(negativeInvoice);
      if (insError) throw insError;
      
      const { error: updError } = await supabase
        .from('invoices')
        .update({ status: 'reversed' })
        .eq('id', inv.id);
      if (updError) throw updError;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Invoice Reversal',
        details: `Reversed invoice ${inv.id} for KES ${inv.total_amount}/- (Reason: ${reason}. Notes: ${notes})`
      });

      if (showNotification) {
        showNotification('success', 'Invoice Reversed', `Reversal of KES -${inv.total_amount} processed and logged!`);
      } else {
        setMessage({ type: 'success', text: `Reversal of KES -${inv.total_amount} processed and logged!` });
      }

      setSelectedVisit(null);
      setInvoice(null);
      fetchBillingQueue();
      if (billingTab === 'history') {
        fetchPaidInvoices();
      }
    } catch (err) {
      console.error('Reversal failed:', err);
      if (showNotification) {
        showNotification('error', 'Reversal Failed', err.message);
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidInvoices = async () => {
    setLoadingHistory(true);
    try {
      const { data: invs, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['paid', 'reversed'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: pts } = await supabase.from('patients').select('*');
      const { data: vsts } = await supabase.from('visits').select('*');

      const enriched = invs ? invs.map(i => {
        const v = vsts?.find(visit => visit.id === i.visit_id);
        const p = pts?.find(pt => pt.id === v?.patient_id);
        return {
          ...i,
          visit: v,
          patient: p
        };
      }) : [];
      setPaidInvoices(enriched);
    } catch (err) {
      console.error('Error fetching paid invoices:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const [tumaPhone, setTumaPhone] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [tumaStatus, setTumaStatus] = useState(''); // '', 'sent', 'paid', 'failed'
  const [isSimulated, setIsSimulated] = useState(false);
  
  // Receipt print view trigger
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchBillingQueue();
    fetchFacilityServices();
  }, []);

  const fetchBillingQueue = async () => {
    try {
      // Fetch visits currently waiting in billing
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'billing').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');
      setAllPatients(pts || []);
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setBillingVisits(enrichedVisits);
      
      if (enrichedVisits.length > 0) {
        const savedVisitId = sessionStorage.getItem('egesa_selected_visit_id_billing');
        const matchedVisit = enrichedVisits.find(v => v.id === savedVisitId);
        if (matchedVisit) {
          handleSelectVisit(matchedVisit);
        } else {
          handleSelectVisit(enrichedVisits[0]);
        }
      } else {
        setSelectedVisit(null);
        setInvoice(null);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching billing queue:', err);
    }
  };

  const fetchFacilityServices = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('services_list')
        .eq('id', user.facility_id)
        .single();
      if (!error && data) {
        setFacilityServices(data.services_list || []);
      }
    } catch (err) {
      console.error('Error fetching facility services:', err);
    }
  };

  const getConsultationFee = (visit) => {
    if (!visit) return 0;
    const directWalkins = ['LAB', 'PHA', 'RAD', 'IPD'];
    if (directWalkins.includes(visit.service_type)) {
      return 0;
    }
    return 350;
  };

  const handleAddAdhocCharge = async (e) => {
    e.preventDefault();
    if (!selectedAdhocService || !selectedVisit || !invoice) return;
    setAddingAdhoc(true);
    setMessage({ type: '', text: '' });
    
    try {
      const service = facilityServices.find(s => s.name === selectedAdhocService);
      const charge = service ? service.charge : 500;
      
      const newOrder = {
        visit_id: selectedVisit.id,
        type: 'service',
        item_name: selectedAdhocService,
        status: 'completed',
        price: charge
      };
      const { error: orderErr } = await supabase.from('orders').insert(newOrder);
      if (orderErr) throw orderErr;
      
      const newTotal = parseFloat(invoice.total_amount || 0) + charge;
      const { error: invErr } = await supabase
        .from('invoices')
        .update({ total_amount: newTotal })
        .eq('id', invoice.id);
      if (invErr) throw invErr;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Ad-hoc Billing Charge Added',
        details: `Added ad-hoc service charge ${selectedAdhocService} (KES ${charge}) for patient ${selectedVisit?.patient?.name}.`
      });

      if (showNotification) {
        showNotification('success', 'Charge Added', `Custom charge '${selectedAdhocService}' (KES ${charge}) added successfully!`);
      } else {
        setMessage({ type: 'success', text: `Custom charge '${selectedAdhocService}' (KES ${charge}) added successfully!` });
      }
      setSelectedAdhocService('');
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      console.error('Error adding adhoc charge:', err);
      if (showNotification) {
        showNotification('error', 'Charge Failed', err.message || 'Failed to add charge.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Failed to add charge.' });
      }
    } finally {
      setAddingAdhoc(false);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    setShowReceipt(false);
    setAmountPaid('');
    setInsuranceProvider('');
    setMemberId('');
    setPreAuthCode('');
    setInsuranceCoverage('');
    setCopayPaymentMethod('cash');
    setCopayAmount('');
    if (visit) {
      sessionStorage.setItem('egesa_selected_visit_id_billing', visit.id);
    } else {
      sessionStorage.removeItem('egesa_selected_visit_id_billing');
    }
    
    try {
      // Fetch invoice
      const { data: invs } = await supabase.from('invoices').select('*').eq('visit_id', visit.id).eq('status', 'unpaid');
      let activeInvoice = invs && invs[0];

      // Fetch all lab & drug orders for this visit to list on receipt
      const { data: ords } = await supabase.from('orders').select('*').eq('visit_id', visit.id);
      setOrders(ords || []);
      
      if (!activeInvoice) {
        const ordersTotal = ords ? ords.reduce((sum, o) => sum + parseFloat(o.price || 0), 0) : 0;
        
        const newInvoice = {
          visit_id: visit.id,
          facility_id: user.facility_id,
          total_amount: ordersTotal,
          status: 'unpaid',
          created_at: new Date().toISOString()
        };
        
        const { data: inserted, error: insertErr } = await supabase
          .from('invoices')
          .insert(newInvoice)
          .select();
          
        if (!insertErr && inserted) {
          activeInvoice = inserted[0];
        }
      }
      
      setInvoice(activeInvoice);
      
      if (activeInvoice) {
        const consultFee = getConsultationFee(visit);
        setAmountPaid((parseFloat(activeInvoice.total_amount) + consultFee).toString());
      }
    } catch (err) {
      console.error('Error loading billing records:', err);
    }
  };

  const dispatchReceiptWhatsApp = async (paidVal, method) => {
    if (!selectedVisit || !selectedVisit.patient) return;
    try {
      const contactInfo = parsePatientContact(selectedVisit.patient.phone);
      if (contactInfo && contactInfo.phone) {
        if (contactInfo.preferences?.billing !== false) {
          const message = `Hi ${selectedVisit.patient.name},\n\n` +
            `We have successfully received your payment of KES ${parseFloat(paidVal).toFixed(2)} via ${method.toUpperCase()}.\n` +
            `Thank you for your payment!`;
          
          await sendWhatsAppNotification(contactInfo.phone, message, selectedVisit.patient.facility_id || user.facility_id);
          console.log('[WhatsApp Receipt Alert Sent] Success');
        }
      }
    } catch (err) {
      console.error('[WhatsApp Receipt Alert Failed]', err);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !invoice) return;

    const consultFee = getConsultationFee(selectedVisit);
    const grandTotal = parseFloat(invoice.total_amount) + consultFee;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (paymentMethod === 'mpesa') {
        const paidVal = parseFloat(amountPaid || grandTotal);
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
        if (showNotification) {
          showNotification('success', 'Prompt Sent', 'Tuma Pay payment prompt sent successfully!');
        } else {
          setMessage({ type: 'success', text: 'Tuma Pay payment prompt sent successfully!' });
        }
      } else if (paymentMethod === 'insurance') {
        const coveredVal = parseFloat(insuranceCoverage || grandTotal);
        const copayVal = parseFloat(copayAmount || 0);
        const totalPaidVal = coveredVal + copayVal;
        const providerName = insuranceProvider ? insuranceProvider.toUpperCase() : 'INSURANCE';
        const methodRecorded = `insurance_split (${providerName} + ${copayPaymentMethod.toUpperCase()} CO-PAY)`;

        if (copayVal > 0 && copayPaymentMethod === 'mpesa') {
          if (!tumaPhone.trim()) {
            setMessage({ type: 'error', text: 'Tuma Pay phone number is required for Co-pay.' });
            setLoading(false);
            return;
          }

          // Save meta details to invoice first before STK push
          const { error: prepErr } = await supabase.from('invoices').update({
            payment_method: methodRecorded,
            amount_paid: totalPaidVal
          }).eq('id', invoice.id);
          if (prepErr) throw prepErr;

          // Trigger STK Push for Co-pay portion
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const response = await fetch(`${backendUrl}/mpesa/stkpush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: tumaPhone,
              amount: copayVal,
              reference: invoice.id
            })
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Tuma Pay STK Push for Co-pay failed');
          }

          setCheckoutId(data.CheckoutRequestID);
          setIsSimulated(!!data.simulated);
          setTumaStatus('sent');
          if (showNotification) {
            showNotification('success', 'Co-pay Prompt Sent', 'Co-pay payment prompt sent successfully!');
          } else {
            setMessage({ type: 'success', text: 'Co-pay payment prompt sent successfully!' });
          }
        } else {
          // Standard Cash co-pay or 100% insurance coverage
          const { error: invErr } = await supabase.from('invoices').update({
            amount_paid: totalPaidVal,
            status: 'paid',
            payment_method: methodRecorded
          }).eq('id', invoice.id);

          if (invErr) throw invErr;

          // Redirect patient to Pharmacy queue or Complete via workflow engine
          const hasPrescriptions = orders.some(o => o.type === 'prescription');
          const nextDept = getNextDepartment(selectedVisit, 'billing', { hasPrescriptions });

          const { error: visitErr } = await supabase.from('visits').update({
            department: nextDept,
            status: nextDept === 'completed' ? 'completed' : 'waiting'
          }).eq('id', selectedVisit.id);

          if (visitErr) throw visitErr;

          if (showNotification) {
            showNotification('success', 'Payment Settled', 'Insurance invoice payment recorded successfully!');
          } else {
            setMessage({ type: 'success', text: 'Insurance invoice payment recorded successfully!' });
          }
          setShowReceipt(true);
          dispatchReceiptWhatsApp(totalPaidVal, methodRecorded);

          // Log invoice payment
          await supabase.from('audit_logs').insert({
            action: 'Invoice Settlement',
            details: `Recorded split payment of ${totalPaidVal}/- via ${methodRecorded} for patient ${selectedVisit.patient?.name}`
          });
        }
      } else {
        // Standard Manual Cash Flow
        const paidVal = parseFloat(amountPaid || grandTotal);
        if (isNaN(paidVal) || paidVal < grandTotal) {
          setMessage({ type: 'error', text: `Please enter full invoice payment of ${grandTotal.toFixed(2)}/-.` });
          setLoading(false);
          return;
        }

        const { error: invErr } = await supabase.from('invoices').update({
          amount_paid: paidVal,
          status: 'paid',
          payment_method: paymentMethod
        }).eq('id', invoice.id);

        if (invErr) throw invErr;

        // Redirect patient to Pharmacy queue or Complete via workflow engine
        const hasPrescriptions = orders.some(o => o.type === 'prescription');
        const nextDept = getNextDepartment(selectedVisit, 'billing', { hasPrescriptions });

        const { error: visitErr } = await supabase.from('visits').update({
          department: nextDept,
          status: nextDept === 'completed' ? 'completed' : 'waiting'
        }).eq('id', selectedVisit.id);

        if (visitErr) throw visitErr;

        if (showNotification) {
          showNotification('success', 'Payment Settled', 'Invoice payment recorded successfully!');
        } else {
          setMessage({ type: 'success', text: 'Invoice payment recorded successfully!' });
        }
        setShowReceipt(true);
        dispatchReceiptWhatsApp(paidVal, paymentMethod);

        // Log invoice payment
        await supabase.from('audit_logs').insert({
          action: 'Invoice Settlement',
          details: `Recorded payment of ${paidVal}/- via ${paymentMethod.toUpperCase()} for patient ${selectedVisit.patient?.name}`
        });
      }
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Payment Failed', err.message || 'Billing error.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Billing error.' });
      }
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
        // Payment was recorded! Let's update the visit department via workflow engine
        const hasPrescriptions = orders.some(o => o.type === 'prescription');
        const nextDept = getNextDepartment(selectedVisit, 'billing', { hasPrescriptions });

        await supabase.from('visits').update({
          department: nextDept,
          status: nextDept === 'completed' ? 'completed' : 'waiting'
        }).eq('id', selectedVisit.id);

        // Refresh active invoice state
        setInvoice(inv);
        setTumaStatus('paid');
        setShowReceipt(true);
        setMessage({ type: 'success', text: 'Payment confirmed successfully!' });
        dispatchReceiptWhatsApp(inv.amount_paid, inv.payment_method || 'mpesa');
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
    <div className="space-y-6">
      {architectureModel && (
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-300">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          Global + private model active · {architectureModel.private?.forms?.department || "billing"} · {architectureModel.private?.state?.activeTab || "billing"}
        </div>
      )}
      {/* Top Console Navigation Bar */}
      <div className="flex border-b border-slate-800 pb-2 gap-6">
        <button
          type="button"
          onClick={() => setActiveConsoleTab('desk')}
          className={`text-sm font-bold pb-2 transition border-b-2 ${
            activeConsoleTab === 'desk'
              ? 'text-teal-400 border-teal-400'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Billing Desk
        </button>
        <button
          type="button"
          onClick={() => setActiveConsoleTab('preauth')}
          className={`text-sm font-bold pb-2 transition border-b-2 ${
            activeConsoleTab === 'preauth'
              ? 'text-teal-400 border-teal-400'
              : 'text-slate-400 border-transparent hover:text-slate-205'
          }`}
        >
          Insurance Pre-authorizations
        </button>
        <button
          type="button"
          onClick={() => setActiveConsoleTab('setup')}
          className={`text-sm font-bold pb-2 transition border-b-2 ${
            activeConsoleTab === 'setup'
              ? 'text-teal-400 border-teal-400'
              : 'text-slate-400 border-transparent hover:text-slate-205'
          }`}
        >
          Billing Setup (Catalog Prices)
        </button>
      </div>

      {activeConsoleTab === 'desk' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billing queue / History */}
          <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 ${selectedVisit ? 'hidden lg:block' : 'block'}`}>
            <div className="flex border-b border-slate-800 pb-1.5 gap-3">
              <button
                type="button"
                onClick={() => setBillingTab('queue')}
                className={`text-xs font-bold pb-1.5 transition border-b-2 ${
                  billingTab === 'queue'
                    ? 'text-teal-400 border-teal-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Billing Queue ({billingVisits.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setBillingTab('history');
                  fetchPaidInvoices();
                }}
                className={`text-xs font-bold pb-1.5 transition border-b-2 ${
                  billingTab === 'history'
                    ? 'text-teal-400 border-teal-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Paid History
              </button>
            </div>

            {billingTab === 'queue' ? (
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
                    <div className="flex justify-between items-center text-2xs text-slate-400 w-full font-mono">
                      <span>{item.patient?.facility_id_code}</span>
                      <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </button>
                ))}

                {billingVisits.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-16 border border-dashed border-slate-800 rounded-xl">
                    No patients awaiting billing invoices.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {loadingHistory ? (
                  <div className="py-12 text-center text-slate-500 text-2xs flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b border-teal-400" />
                    <span>Loading history...</span>
                  </div>
                ) : paidInvoices.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-16 border border-dashed border-slate-800 rounded-xl">
                    No settled invoices found.
                  </div>
                ) : (
                  paidInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={async () => {
                        setSelectedVisit({
                          id: inv.visit_id,
                          patient: inv.patient,
                          service_type: inv.visit?.service_type,
                          created_at: inv.visit?.created_at
                        });
                        setInvoice(inv);
                        const { data: ords } = await supabase.from('orders').select('*').eq('visit_id', inv.visit_id);
                        setOrders(ords || []);
                        setShowReceipt(false);
                        setReversalReason('Incorrect Patient Billing');
                        setReversalNotes('');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                        invoice?.id === inv.id
                          ? 'border-teal-500/60 bg-slate-950/5'
                          : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="font-semibold text-slate-200 text-xs truncate max-w-[70%]">{inv.patient?.name || 'Walk-in Client'}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          inv.status === 'reversed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>{inv.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-2xs text-slate-400 w-full font-mono">
                        <span>KES {parseFloat(inv.total_amount).toFixed(2)}</span>
                        <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Invoice Viewer / Payment Recorder */}
          <div className={`lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between ${!selectedVisit ? 'hidden lg:block' : 'block'}`}>
            {!selectedVisit ? (
              <div className="flex flex-col items-center justify-center py-28 text-center my-auto">
                <DollarSign size={48} className="text-slate-600 mb-2 animate-bounce" />
                <h3 className="text-slate-400 font-medium text-sm">No Active Billing Invoice Loaded</h3>
                <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient waiting in billing on the left to compile invoice items, record payments, and print checkout receipts.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mobile View Back Button */}
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  className="lg:hidden w-full mb-4 py-2 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-[0.98]"
                >
                  ← Back to Billing Queue
                </button>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Patient billing invoice</span>
                    <h3 className="text-base font-bold text-slate-100">{selectedVisit.patient?.name}</h3>
                    <p className="text-xs text-slate-500">{selectedVisit.patient?.facility_id_code} | DOB: {selectedVisit.patient?.dob}</p>
                  </div>
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded uppercase ${
                    invoice?.status === 'paid' ? 'text-green-500 bg-green-500/10 border border-green-500/20' :
                    invoice?.status === 'reversed' ? 'text-red-500 bg-red-500/10 border border-red-500/20' :
                    'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20'
                  }`}>{invoice?.status || 'UNPAID'}</span>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                    message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-404' : 'bg-red-500/5 border-red-505/20 text-red-404'
                  }`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{message.text}</span>
                  </div>
                )}

                {tumaStatus === 'sent' ? (
                  /* Tuma Pay STK Pending Status Card */
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="h-10 w-10 border-2 border-teal-505 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-202">Tuma Pay STK Prompt Sent</h4>
                      <p className="text-xs text-slate-500 mt-1">Please approve the payment request on your phone to complete payment of <strong>KES {(parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit)).toFixed(2)}</strong>.</p>
                      <p className="text-2xs text-slate-600 font-mono mt-1">Checkout ID: {checkoutId}</p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={handleCheckTumaStatus}
                        className="w-full bg-teal-550 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition"
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
                  <div className="bg-slate-955 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                    {/* PAID Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                      <span className="text-6xl font-extrabold text-teal-500 border-[12px] border-teal-500 rounded-lg p-4 rotate-12">PAID</span>
                    </div>

                    <div className="text-center pb-4 border-b border-dashed border-slate-800">
                      <h4 className="font-bold text-slate-202 uppercase tracking-wider">EAGLE TECH MEDICAL CLINIC</h4>
                      <p className="text-2xs text-slate-500">MOH Register ID: EMC-001 | Tel: +254 712 345 678</p>
                      <p className="text-[9px] text-slate-600 font-mono mt-1">Receipt No: RCPT-{Math.floor(10000 + Math.random() * 90000)} | Date: {new Date().toLocaleString()}</p>
                    </div>

                    {/* Receipt Details */}
                    <div className="py-4 space-y-3">
                      <div className="flex justify-between text-[11px] text-slate-404">
                        <span>Patient: {selectedVisit.patient?.name}</span>
                        <span>ID Code: {selectedVisit.patient?.facility_id_code}</span>
                      </div>

                      <div className="border-t border-slate-800 pt-2 text-xs space-y-2">
                        <div className="flex justify-between text-2xs font-bold text-slate-500 uppercase">
                          <span>Fee Item</span>
                          <span>Amount</span>
                        </div>

                        {/* Standard registration fee */}
                        {getConsultationFee(selectedVisit) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Outpatient Consultation & Vitals Fee</span>
                            <span className="font-mono text-slate-300">350.00/-</span>
                          </div>
                        )}

                        {/* Order items */}
                        {orders.map(o => (
                          <div key={o.id} className="flex justify-between">
                            <span className="text-slate-400 capitalize">${o.type} Test: ${o.item_name}</span>
                            <span className="font-mono text-slate-300">${parseFloat(o.price).toFixed(2)}/-</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Paid Summary */}
                    <div className="border-t border-dashed border-slate-800 pt-3 flex flex-col items-end gap-1 font-mono">
                      <div className="text-xs text-slate-400">
                        Subtotal: <span className="text-slate-200">{(parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit)).toFixed(2)}/-</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Payment Method: <span className="text-teal-400 font-bold uppercase">{invoice?.payment_method || paymentMethod}</span>
                      </div>
                      <div className="text-sm font-bold text-teal-400 mt-1">
                        Amount Paid: {(parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit)).toFixed(2)}/-
                      </div>
                      <div className="text-2xs text-slate-500 mt-0.5">
                        Balance Outstanding: 0.00/-
                      </div>
                    </div>

                    <div className="flex justify-between pt-5 mt-4 border-t border-slate-800">
                      <button
                        onClick={() => {
                          sessionStorage.removeItem('egesa_selected_visit_id_billing');
                          fetchBillingQueue();
                          setShowReceipt(false);
                        }}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold text-xs py-2 px-4 rounded-lg transition"
                      >
                        Load Next Ticket
                      </button>
                      <button
                        onClick={handlePrintReceipt}
                        className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-606 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-lg shadow-teal-500/10 transition"
                      >
                        <Printer size={12} /> Print Receipt
                      </button>
                    </div>
                  </div>
                ) : invoice?.status === 'paid' || invoice?.status === 'reversed' ? (
                  /* Paid / Reversed Invoice details & Reversal Form */
                  <div className="space-y-6">
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Invoice Details</h4>
                      <div className="space-y-2 text-xs">
                        {getConsultationFee(selectedVisit) > 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>Outpatient Consultation Charge</span>
                            <span className="font-mono">350.00/-</span>
                          </div>
                        )}
                        {orders.map(o => (
                          <div key={o.id} className="flex justify-between text-slate-400">
                            <span className="capitalize">{o.type}: {o.item_name}</span>
                            <span className="font-mono">{parseFloat(o.price).toFixed(2)}/-</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-2 text-slate-202 font-mono">
                          <span>Grand Total</span>
                          <span className="font-mono text-teal-400">{(parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit)).toFixed(2)}/-</span>
                        </div>
                      </div>
                    </div>

                    {invoice.status === 'paid' && (
                      <div className="bg-slate-955 border border-red-500/20 p-5 rounded-xl space-y-4">
                        <div>
                          <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            ⚠️ Transaction Reversal & Refund Console
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Reverse this transaction to issue a refund. This will create a negative financial ledger entry and update original invoice status.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reversal Reason *</label>
                            <select
                              value={reversalReason}
                              onChange={(e) => setReversalReason(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition"
                            >
                              <option value="Incorrect Patient Billing">Incorrect Patient Billing</option>
                              <option value="Services Not Offered / Cancelled">Services Not Offered / Cancelled</option>
                              <option value="Overcharged Rate Adjustment">Overcharged Rate Adjustment</option>
                              <option value="Incorrect Payment Mode">Incorrect Payment Mode</option>
                              <option value="Other / Audit Correction">Other / Audit Correction</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Audit Notes / Explanation</label>
                            <input
                              type="text"
                              value={reversalNotes}
                              onChange={(e) => setReversalNotes(e.target.value)}
                              placeholder="Input brief reason details..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowReceipt(true)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg transition"
                          >
                            View / Print Receipt
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to reverse this payment transaction?")) {
                                await handleReverseInvoice(invoice, reversalReason, reversalNotes);
                              }
                            }}
                            className="bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg shadow-lg shadow-red-500/10 transition active:scale-[0.98]"
                          >
                            Process Reversal (Refund)
                          </button>
                        </div>
                      </div>
                    )}

                    {invoice.status === 'reversed' && (
                      <div className="bg-slate-955 border border-red-500/20 p-5 rounded-xl text-center space-y-2.5">
                        <AlertCircle size={32} className="text-red-500 mx-auto" />
                        <h4 className="font-bold text-slate-200">Reversed / Refunded</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          This invoice transaction has been fully reversed. A negative ledger record (refund entry) has been inserted into the audits, and all outstanding balances were nullified.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowReceipt(true)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg transition"
                          >
                            View Original Receipt
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Payment Processing Form */
                  <div className="space-y-4">
                    {/* Ad-hoc service charge builder */}
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">Add Ad-hoc / Custom Service Charge</h4>
                      <div className="flex gap-2 font-sans">
                        <select
                          value={selectedAdhocService}
                          onChange={(e) => setSelectedAdhocService(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                        >
                          <option value="">-- Select Service to Add --</option>
                          {facilityServices.map((svc, i) => (
                            <option key={i} value={svc.name}>
                              [{svc.category}] ${svc.name} - KES ${svc.charge}/-
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={addingAdhoc || !selectedAdhocService}
                          onClick={handleAddAdhocCharge}
                          className="bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg shadow transition shrink-0 cursor-pointer"
                        >
                          ${addingAdhoc ? 'Adding...' : 'Add Charge'}
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handlePay} className="space-y-4">
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fee Summary</h4>
                        <div className="space-y-2 text-xs">
                          {getConsultationFee(selectedVisit) > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Outpatient Consultation Charge</span>
                              <span className="font-mono">350.00/-</span>
                            </div>
                          )}
                          {orders.map(o => (
                            <div key={o.id} className="flex justify-between text-slate-400">
                              <span className="capitalize">${o.type}: ${o.item_name}</span>
                              <span className="font-mono">${parseFloat(o.price).toFixed(2)}/-</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-2 text-slate-202">
                            <span>Grand Total Due</span>
                            <span className="font-mono text-teal-400">{(parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit)).toFixed(2)}/-</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Payment Method */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Primary Payment Option</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value);
                              if (e.target.value === 'insurance') {
                                const totalDue = parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit);
                                setInsuranceCoverage(totalDue.toString());
                                setCopayAmount('0');
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                          >
                            <option value="cash">Cash (Manual Drawer Payment)</option>
                            <option value="mpesa">Tuma Pay (Mobile Money STK Push)</option>
                            <option value="insurance">NHIF / Private Insurance Split Checkout</option>
                          </select>
                        </div>

                        {paymentMethod === 'mpesa' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tuma Pay Mobile Number *</label>
                            <input
                              type="text"
                              value={tumaPhone}
                              onChange={(e) => setTumaPhone(e.target.value)}
                              placeholder="e.g. 0712345678"
                              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-505 transition font-mono"
                              required
                            />
                          </div>
                        )}

                        {paymentMethod === 'cash' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cash Amount Received (KSH) *</label>
                            <input
                              type="number"
                              value={amountPaid}
                              onChange={(e) => setAmountPaid(e.target.value)}
                              placeholder="e.g. 1000"
                              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-550 transition font-mono"
                              required
                            />
                          </div>
                        )}

                        {paymentMethod === 'insurance' && (
                          <div className="bg-slate-950 p-4 border border-slate-855 rounded-xl space-y-4">
                            <span className="text-2xs text-teal-400 font-bold uppercase tracking-wider block">Insurance Authorization & Co-pay Split Details</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Insurance Provider</label>
                                <select
                                  value={insuranceProvider}
                                  onChange={(e) => setInsuranceProvider(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition cursor-pointer"
                                >
                                  <option value="">-- Select Provider --</option>
                                  <option value="nhif">NHIF (Social Health Authority)</option>
                                  <option value="aar">AAR Insurance</option>
                                  <option value="jubilee">Jubilee Insurance</option>
                                  <option value="britam">Britam Health</option>
                                  <option value="apa">APA Insurance</option>
                                  <option value="madison">Madison Insurance</option>
                                  <option value="corporate">Corporate Account (Co-pay direct)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Member ID / Policy Number</label>
                                <input
                                  type="text"
                                  value={memberId}
                                  onChange={(e) => setMemberId(e.target.value)}
                                  placeholder="e.g. AAR-993821"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pre-auth Code</label>
                                <input
                                  type="text"
                                  value={preAuthCode}
                                  onChange={(e) => setPreAuthCode(e.target.value)}
                                  placeholder="e.g. AUTH-5532"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-900 pt-3">
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Insurance Coverage (KES)</label>
                                <input
                                  type="number"
                                  value={insuranceCoverage}
                                  onChange={(e) => {
                                    const cov = parseFloat(e.target.value) || 0;
                                    setInsuranceCoverage(e.target.value);
                                    const totalDue = parseFloat(invoice?.total_amount || 0) + getConsultationFee(selectedVisit);
                                    setCopayAmount(Math.max(0, totalDue - cov).toString());
                                  }}
                                  placeholder="Amount covered..."
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Patient Co-pay (KES)</label>
                                <input
                                  type="number"
                                  value={copayAmount}
                                  onChange={(e) => setCopayAmount(e.target.value)}
                                  placeholder="Co-pay portion..."
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Co-pay Method</label>
                                  <select
                                    value={copayPaymentMethod}
                                    onChange={(e) => setCopayPaymentMethod(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition cursor-pointer"
                                  >
                                    <option value="cash">Cash Co-pay</option>
                                    <option value="mpesa">Tuma Pay (M-Pesa) Co-pay</option>
                                  </select>
                                </div>
                              </div>

                              {copayPaymentMethod === 'mpesa' && parseFloat(copayAmount) > 0 && (
                                <div className="w-full max-w-sm pt-2 border-t border-slate-900">
                                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tuma Pay Mobile Number for Co-pay *</label>
                                  <input
                                    type="text"
                                    value={tumaPhone}
                                    onChange={(e) => setTumaPhone(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition font-mono"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto bg-teal-500 hover:bg-teal-606 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98]"
                          >
                            ${loading ? 'Processing Payment...' : 'Record Payment & Generate Receipt'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      )}

      {activeConsoleTab === 'preauth' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shield size={18} className="text-teal-400" /> Insurance Pre-authorizations Console
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Log, track, and upload approval letters for private or public insurance pre-authorizations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Log form */}
            <div className="bg-slate-955 border border-slate-850 p-5 rounded-xl space-y-4 h-fit">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <Plus size={14} /> Log Pre-auth Approval
              </h3>
              
              <form onSubmit={handleSavePreauth} className="space-y-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient *</label>
                  <select
                    value={preauthPatientId}
                    onChange={(e) => setPreauthPatientId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                    required
                  >
                    <option value="">-- Select Patient --</option>
                    {allPatients.map(p => (
                      <option key={p.id} value={p.id}>${p.name} (${p.facility_id_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Insurance Provider *</label>
                  <select
                    value={preauthProvider}
                    onChange={(e) => setPreauthProvider(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                    required
                  >
                    <option value="">-- Select Provider --</option>
                    <option value="AAR Insurance">AAR Insurance</option>
                    <option value="Jubilee Insurance">Jubilee Insurance</option>
                    <option value="Britam Health">Britam Health</option>
                    <option value="NHIF / SHA">NHIF / SHA</option>
                    <option value="APA Insurance">APA Insurance</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Member ID</label>
                    <input
                      type="text"
                      value={preauthMemberId}
                      onChange={(e) => setPreauthMemberId(e.target.value)}
                      placeholder="Card No"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pre-auth Code *</label>
                    <input
                      type="text"
                      value={preauthCodeVal}
                      onChange={(e) => setPreauthCodeVal(e.target.value)}
                      placeholder="Auth Code"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Approved Limit (KES) *</label>
                  <input
                    type="number"
                    value={preauthAmount}
                    onChange={(e) => setPreauthAmount(e.target.value)}
                    placeholder="Approved limit..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mock File Upload (Letter) *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={preauthFile}
                      onChange={(e) => setPreauthFile(e.target.value)}
                      placeholder="Filename e.g. approval.pdf"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                    <label className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 p-2 rounded-lg cursor-pointer transition">
                      <Upload size={14} />
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPreauthFile(e.target.files[0].name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis / Notes</label>
                  <textarea
                    value={preauthNotes}
                    onChange={(e) => setPreauthNotes(e.target.value)}
                    rows="2"
                    placeholder="Enter diagnosis or notes..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-550 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition"
                >
                  Log Pre-authorization
                </button>
              </form>
            </div>

            {/* Pre-auth List */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Logged Pre-authorizations (${preAuths.length})
              </h3>
              
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {preAuths.map((pa) => (
                  <div key={pa.id} className="bg-slate-905 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2.5 hover:border-teal-505/20 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-200 text-sm block">${pa.patient_name}</span>
                        <span className="text-xs text-slate-400">${pa.insurance_provider} | Code: <span className="text-teal-400 font-bold font-mono">${pa.preauth_code}</span></span>
                      </div>
                      <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-2xs font-bold px-2 py-0.5 rounded">
                        ${pa.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800 pt-2.5 font-mono">
                      <div>Approved Limit: <span className="text-slate-200 font-bold">KES ${pa.approved_amount.toFixed(2)}</span></div>
                      <div>Member ID: <span className="text-slate-202">${pa.member_id || 'N/A'}</span></div>
                      <div className="col-span-2 text-2xs text-slate-400 leading-normal">
                        Notes: ${pa.notes || 'No extra diagnosis noted.'}
                      </div>
                      <div className="col-span-2 text-[9px] text-teal-400 flex items-center gap-1 border-t border-slate-800/40 pt-1.5 font-sans">
                        <Upload size={10} /> Attached Letter: <span className="underline cursor-pointer">${pa.filename}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeConsoleTab === 'setup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CreditCard size={18} className="text-teal-400" /> Billing Prices Setup
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure and add outpatient services, lab tests, and procedure fees for your facility catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add service form */}
            <div className="bg-slate-955 border border-slate-850 p-5 rounded-xl space-y-4 h-fit">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <Plus size={14} /> Add Service to Catalog
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Service Name *</label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Tooth Extraction"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category *</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-505 transition cursor-pointer"
                  >
                    <option value="OPD">OPD Consultation / Procedure</option>
                    <option value="LAB">Laboratory Panel / Test</option>
                    <option value="RAD">Radiology / Imaging</option>
                    <option value="MATERNITY">Maternity / Delivery</option>
                    <option value="GENERAL">General Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Price (KES) *</label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-505 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!newServiceName || !newServicePrice) {
                      alert('Please specify name and price');
                      return;
                    }
                    const updated = [
                      ...facilityServices,
                      {
                        name: newServiceName,
                        category: newServiceCategory,
                        charge: parseFloat(newServicePrice)
                      }
                    ];
                    await updateServicesCatalog(updated);
                    setNewServiceName('');
                    setNewServicePrice('');
                  }}
                  className="w-full bg-teal-500 hover:bg-teal-606 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition active:scale-[0.98]"
                >
                  Add Service
                </button>
              </div>
            </div>

            {/* Catalog list */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">
                Current Services Catalog (${facilityServices.length})
              </h3>
              
              <div className="space-y-2.5 max-h-100 overflow-y-auto pr-1 font-sans">
                {facilityServices.map((svc, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 flex justify-between items-center hover:border-teal-505/20 transition">
                    <div>
                      <span className="font-bold text-slate-202 text-xs block">${svc.name}</span>
                      <span className="text-2xs text-slate-500 uppercase tracking-wider font-bold">${svc.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={svc.charge}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...facilityServices];
                          updated[i].charge = val;
                          setFacilityServices(updated);
                        }}
                        className="bg-slate-955 border border-slate-800 text-xs font-mono text-teal-400 py-1.5 px-2 rounded-lg w-24 text-right focus:outline-none focus:border-teal-505"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await updateServicesCatalog(facilityServices);
                        }}
                        className="text-2xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-404 border border-teal-500/20 py-1.5 px-3 rounded-lg transition"
                      >
                        Save Price
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete ${svc.name}?`)) {
                            const updated = facilityServices.filter((_, idx) => idx !== i);
                            await updateServicesCatalog(updated);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 transition"
                      >
                        <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {facilityServices.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-12">
                    No services in the catalog list.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
