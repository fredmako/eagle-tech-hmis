import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { CreditCard, Save, Plus, Trash2, HelpCircle, PhoneCall, DollarSign, Layers } from 'lucide-react';

export default function PaymentSettings({ user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Credentials & Meta
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappWelcomeMessage, setWhatsappWelcomeMessage] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [subdomainPrefix, setSubdomainPrefix] = useState('');

  // Services Catalog States
  const [servicesList, setServicesList] = useState([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Consultation');
  const [newServiceCharge, setNewServiceCharge] = useState('');

  useEffect(() => {
    fetchFacilitySettings();
  }, []);

  const fetchFacilitySettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', user.facility_id)
        .single();

      if (error) throw error;

      if (data) {
        setStripePublishableKey(data.stripe_publishable_key || '');
        setStripeSecretKey(data.stripe_secret_key || '');
        setPaypalClientId(data.paypal_client_id || '');
        setPaypalClientSecret(data.paypal_client_secret || '');
        setWhatsappNumber(data.whatsapp_number || '');
        setWhatsappWelcomeMessage(data.whatsapp_welcome_message || 'Hello, welcome to our facility!');
        setAboutUs(data.about_us || '');
        setSubdomainPrefix(data.subdomain_prefix || '');
        setServicesList(data.services_list || []);
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err);
      setMessage({ type: 'error', text: 'Failed to load facility configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = (e) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceCharge) return;

    const newService = {
      name: newServiceName.trim(),
      category: newServiceCategory,
      charge: parseFloat(newServiceCharge)
    };

    setServicesList([...servicesList, newService]);
    setNewServiceName('');
    setNewServiceCharge('');
  };

  const handleDeleteService = (indexToDelete) => {
    setServicesList(servicesList.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedData = {
        stripe_publishable_key: stripePublishableKey.trim(),
        stripe_secret_key: stripeSecretKey.trim(),
        paypal_client_id: paypalClientId.trim(),
        paypal_client_secret: paypalClientSecret.trim(),
        whatsapp_number: whatsappNumber.trim(),
        whatsapp_welcome_message: whatsappWelcomeMessage.trim(),
        about_us: aboutUs.trim(),
        subdomain_prefix: subdomainPrefix.trim().toLowerCase().replace(/[^a-z0-9\-]/g, ''),
        services_list: servicesList
      };

      // Perform update via proxy API to ensure sandbox syncing
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'facilities',
          column: 'id',
          value: user.facility_id,
          values: updatedData
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update configurations.');
      }

      setMessage({ type: 'success', text: 'Facility configs and services saved successfully!' });
      
      // Store subdomain locally for immediate redirect use
      if (updatedData.subdomain_prefix) {
        localStorage.setItem(`egesa_subdomain_${user.facility_id}`, updatedData.subdomain_prefix);
      }

      await fetchFacilitySettings();
    } catch (err) {
      console.error('Save configs failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save configurations.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <CreditCard size={14} className="text-teal-400" /> Payments, Services, & Public Landing Page Config
        </h4>
        <div className="text-[10px] text-slate-500 italic">Facility ID: {user.facility_id}</div>
      </div>

      {/* Alert Messaging */}
      {message.text && (
        <div className={`p-2.5 rounded text-xs ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Card 1: Subdomain & Landing Metadata */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} /> Facility subdomain & Landing Page Content
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subdomain Prefix</label>
              <input
                type="text"
                placeholder="e.g. egesa-medical"
                value={subdomainPrefix}
                onChange={(e) => setSubdomainPrefix(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
              <span className="text-[8px] text-slate-500 mt-1 block">Your public URL: http://localhost:5173/hospital/{subdomainPrefix || 'egesa-medical'}</span>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description / About Us</label>
              <textarea
                placeholder="Short statement describing your medical facility..."
                value={aboutUs}
                onChange={(e) => setAboutUs(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition min-h-[60px]"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Payment Gateways Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Config */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
            <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} /> Stripe Merchant Account
            </h5>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stripe Publishable Key</label>
              <input
                type="text"
                placeholder="pk_test_..."
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stripe Secret Key</label>
              <input
                type="password"
                placeholder="sk_test_..."
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>

          {/* PayPal Config */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
            <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} /> PayPal Merchant Account
            </h5>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">PayPal Client ID</label>
              <input
                type="text"
                placeholder="Client ID..."
                value={paypalClientId}
                onChange={(e) => setPaypalClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">PayPal Client Secret</label>
              <input
                type="password"
                placeholder="Client Secret..."
                value={paypalClientSecret}
                onChange={(e) => setPaypalClientSecret(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Card 3: WhatsApp Support Config */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <PhoneCall size={13} /> WhatsApp Helpdesk & Alerts Setup
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Number (with Country Code)</label>
              <input
                type="text"
                placeholder="e.g. 254712345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Default welcome text message</label>
              <input
                type="text"
                placeholder="e.g. Hello, I have a question about my medical schedule..."
                value={whatsappWelcomeMessage}
                onChange={(e) => setWhatsappWelcomeMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Services pricing list builder */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} /> Service Charges & Specialties Catalog
          </h5>

          {/* Add Service Catalog Row Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-900">
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Service / Spec Name</label>
              <input
                type="text"
                placeholder="e.g. Standard Consultation"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
              <select
                value={newServiceCategory}
                onChange={(e) => setNewServiceCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="Consultation">Consultation</option>
                <option value="Lab">Laboratory / Test</option>
                <option value="Pharmacy">Pharmacy / Meds</option>
                <option value="Radiology">Radiology / Imaging</option>
                <option value="ANC">Maternal ANC</option>
                <option value="Ward">Inpatient Ward</option>
                <option value="Other">Other Specialty</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Charge Fee (KES)</label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={newServiceCharge}
                  onChange={(e) => setNewServiceCharge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddService}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded flex items-center gap-1 transition"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          {/* Current Catalog Table */}
          <div className="overflow-x-auto border border-slate-900 rounded-lg">
            <table className="w-full text-left text-[10px] border-collapse font-sans">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 font-bold border-b border-slate-900 text-[8px] uppercase">
                  <th className="py-2 px-3">Service Name</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Fee (KES)</th>
                  <th className="py-2 px-3 text-center w-16">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {servicesList.map((svc, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30">
                    <td className="py-2 px-3 font-semibold text-slate-200">{svc.name}</td>
                    <td className="py-2 px-3 font-medium text-slate-500">{svc.category}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-teal-400">{svc.charge}/-</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteService(idx)}
                        className="text-red-450 hover:text-red-400 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {servicesList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-slate-500 italic">No services configured yet. Add services using the row builder above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
        >
          <Save size={14} /> Save Facility Configurations & Services
        </button>
      </form>
    </div>
  );
}
