import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Sliders, ShieldAlert, Check, Save } from 'lucide-react';

export default function SystemAdministration({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form states grouped for the system settings
  const [companyConfig, setCompanyConfig] = useState({
    companyName: 'RAM HOSPITAL LIMITED',
    email: 'ramclinic@yahoo.com',
    address: 'KENYA',
    telephone: '+254 204402554',
    website: 'www.remclinic.co.ke',
    pin: '1234567890',
    code: 'RAM',
    reportsFontSize: '33',
    feedbackLink: 'https://example.com/feedback',
    doMoreLink: 'https://example.com/do-more'
  });

  const [salesConfig, setSalesConfig] = useState({
    insuranceRateType: 'Percentage',
    insurancePercentage: '50.00',
    insuranceMinDeposit: '0.00',
    cashRateType: 'Percentage',
    cashPercentage: '30.00',
    cashMinDeposit: '0.00'
  });

  const [mpesaBillsConfig, setMpesaBillsConfig] = useState({
    billNumber: '4075143',
    passkey: 'c9696991aea3a9776c8e8e4ad40c0a2e3427c2f64a811ced319ca07781dd',
    consumerKey: 'BhzTERDBRKpjKWGMKCvgdNqHBD1Ibu',
    consumerSecret: 'mn6B64XU271PYU6X'
  });

  const [mpesaPaymentsConfig, setMpesaPaymentsConfig] = useState({
    paybillNumber: '4165311',
    passkey: '4e991dc5ec352333588913eb8b72c482547ba8511cd0ef90195227760e261',
    consumerKey: 'MkFmVnV9QAsEHamH6AFeIHz4JbAxQax40i2VXXkW87TGJ9',
    consumerSecret: 'x/ObdcQ45H85095aLVSjfMHVqSSNgpSgNjM6TMw1V2B86d6hGVAR1xYXiamoVLF',
    priorityPhone: '0728980173',
    accountNumber: '2001'
  });

  const [etimsConfig, setEtimsConfig] = useState({
    url: 'https://bridgeth.manager.co.ke',
    status: true,
    username: 'localhost',
    password: 'password123'
  });

  const [mailConfig, setMailConfig] = useState({
    driver: 'SMTP',
    host: 'smtp.zoho.com',
    port: '587',
    username: 'admin@tclfinance.co.ke',
    password: 'password123',
    encryption: 'TLS',
    senderEmail: 'admin@tclfinance.co.ke',
    senderName: 'RAM HOSPITAL',
    reportReceiverEmail: 'conrade@tclfinance.co.ke',
    insuranceReportEmail: 'conrade@tclfinance.co.ke',
    mohReportsEmail: 'conrade@tclfinance.co.ke',
    labReportsEmail: 'conrade@tclfinance.co.ke',
    pharmacyReportsEmail: 'conrade@tclfinance.co.ke'
  });

  const [atSmsConfig, setAtSmsConfig] = useState({
    username: 'conrade',
    apiKey: 'apikey1234567890',
    apiUrl: 'https://api.africastalking.com/version1/messaging',
    senderId: 'EAGLE_TECH',
    smsRecipientName: 'Samwel',
    smsRecipientPhone: '0728980173'
  });

  const [shaConfig, setShaConfig] = useState({
    agentId: 'DHABP03287',
    consumerKey: 'key123',
    consumerSecret: 'secret123',
    username: '8m1jamJZCPXOdtinJu',
    password: 'password123',
    appUrl: 'https://hosi5.manager.co.ke',
    publicPemKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyLRxIPafx3pPASu1NxCz\nS/nGeFs/9lxNfdrSsC9ZZ/qfn4S4Um/Mi+6/2HJ+1GYHJTTNNEghNtxcOMIVvcy\nckrJxV4ikD5T8eI5FY+UUBFJrKmZwzyIy8k9uN14lD+nvCd9fJ4ZvePrRT5FY0\nQgomo8za0EQqqgbRRDRFbkvsMtxVdpl1u65bUE4GLFGZO6oLABVGJaxSakwt6NQ\n-----END PUBLIC KEY-----',
    privatePemKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhSltHGU+x/HekBB\nK7U3ELNL+cZ4Wz/2XE1fdrSsC9ZZ/qfn4S4Um/Mi+6/2HJ+1GYHJTTNNEghNtxcOMIVvcy\n4yVVzJyssNFXiKD5T8eI5FY+UUBFJrKmZwzyIy8k9uN14lD+nvCd9fJ4ZvePrRT5FY0\ntHvK/RCCiojzs0EQqqgbRRDRFbkvsMtxVdpl1u65bUE4GLFGZO6oLABVGJaxSakwt6NQ\n-----END PRIVATE KEY-----',
    publicKeyExpiry: '2025-11-20T10:01',
    privateKeyExpiry: '2025-11-20T10:01',
    reminderEmail: 'admin@tclfinance.co.ke',
    hmisRate: '2.00'
  });

  useEffect(() => {
    fetchSystemAdminConfig();
  }, []);

  const fetchSystemAdminConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('system_admin_config')
        .eq('id', user.facility_id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.system_admin_config) {
        const config = data.system_admin_config;
        if (config.companyConfig) setCompanyConfig(prev => ({ ...prev, ...config.companyConfig }));
        if (config.salesConfig) setSalesConfig(prev => ({ ...prev, ...config.salesConfig }));
        if (config.mpesaBillsConfig) setMpesaBillsConfig(prev => ({ ...prev, ...config.mpesaBillsConfig }));
        if (config.mpesaPaymentsConfig) setMpesaPaymentsConfig(prev => ({ ...prev, ...config.mpesaPaymentsConfig }));
        if (config.etimsConfig) setEtimsConfig(prev => ({ ...prev, ...config.etimsConfig }));
        if (config.mailConfig) setMailConfig(prev => ({ ...prev, ...config.mailConfig }));
        if (config.atSmsConfig) setAtSmsConfig(prev => ({ ...prev, ...config.atSmsConfig }));
        if (config.shaConfig) setShaConfig(prev => ({ ...prev, ...config.shaConfig }));
      }
    } catch (err) {
      console.error('Error fetching system administration config:', err);
      showToast('Error loading saved configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const fullConfig = {
        companyConfig,
        salesConfig,
        mpesaBillsConfig,
        mpesaPaymentsConfig,
        etimsConfig,
        mailConfig,
        atSmsConfig,
        shaConfig
      };

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
          values: { 
            system_admin_config: fullConfig
          }
        })
      });

      if (!res.ok) {
        throw new Error('Database update failed');
      }

      // Audit logging
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          docId: `log_${Date.now()}`,
          row: {
            facility_id: user.facility_id,
            user_id: user.id || 'admin',
            action: 'Update System Administration',
            details: `System administration parameters updated by Admin (${user.email || 'admin'})`
          }
        })
      });

      showToast('All system administration configurations saved successfully.', 'success');
    } catch (err) {
      console.error('Error saving configurations:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      {/* Header Info */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-teal-400" />
            System Administration Settings
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Configure institutional settings, API integrations, SMS notifications, and billing configurations.
          </p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md uppercase tracking-wider"
        >
          <Save size={12} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
          <span className="text-[10px] font-mono">Loading system configurations...</span>
        </div>
      ) : (
        <div className="space-y-6 pt-1 max-h-[450px] overflow-y-auto pr-1">
          
          {/* SECTION 1: Company Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              Company Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={companyConfig.companyName}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={companyConfig.email}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Address</label>
                <input 
                  type="text" 
                  value={companyConfig.address}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Telephone</label>
                <input 
                  type="text" 
                  value={companyConfig.telephone}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, telephone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Website</label>
                <input 
                  type="text" 
                  value={companyConfig.website}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, website: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company PIN</label>
                <input 
                  type="password" 
                  value={companyConfig.pin}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, pin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
                <input 
                  type="text" 
                  value={companyConfig.code}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reports Header Font Size</label>
                <input 
                  type="number" 
                  value={companyConfig.reportsFontSize}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, reportsFontSize: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Feedback Link</label>
                <input 
                  type="text" 
                  value={companyConfig.feedbackLink}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, feedbackLink: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Do More URL Link</label>
                <input 
                  type="text" 
                  value={companyConfig.doMoreLink}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, doMoreLink: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Sales Configurations */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              Sales & Billing Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance Rate Type</label>
                <select 
                  value={salesConfig.insuranceRateType}
                  onChange={(e) => setSalesConfig({ ...salesConfig, insuranceRateType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                >
                  <option value="Percentage">Percentage</option>
                  <option value="Fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance Percentage Rate</label>
                <input 
                  type="text" 
                  value={salesConfig.insurancePercentage}
                  onChange={(e) => setSalesConfig({ ...salesConfig, insurancePercentage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance Minimum Deposit</label>
                <input 
                  type="text" 
                  value={salesConfig.insuranceMinDeposit}
                  onChange={(e) => setSalesConfig({ ...salesConfig, insuranceMinDeposit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cash Rate Type</label>
                <select 
                  value={salesConfig.cashRateType}
                  onChange={(e) => setSalesConfig({ ...salesConfig, cashRateType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                >
                  <option value="Percentage">Percentage</option>
                  <option value="Fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cash Percentage Rate</label>
                <input 
                  type="text" 
                  value={salesConfig.cashPercentage}
                  onChange={(e) => setSalesConfig({ ...salesConfig, cashPercentage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cash Minimum Deposit</label>
                <input 
                  type="text" 
                  value={salesConfig.cashMinDeposit}
                  onChange={(e) => setSalesConfig({ ...salesConfig, cashMinDeposit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: M-Pesa Bill / Paybill integration */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              M-Pesa API Integrations
            </h2>
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Customer to Business (C2B) / Paybill Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">C2B Bill Number / Paybill</label>
                  <input 
                    type="text" 
                    value={mpesaBillsConfig.billNumber}
                    onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, billNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">C2B Passkey</label>
                  <input 
                    type="password" 
                    value={mpesaBillsConfig.passkey}
                    onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, passkey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">C2B Consumer Key</label>
                  <input 
                    type="text" 
                    value={mpesaBillsConfig.consumerKey}
                    onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">C2B Consumer Secret</label>
                  <input 
                    type="password" 
                    value={mpesaBillsConfig.consumerSecret}
                    onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerSecret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
              </div>

              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-850/60">2. Business to Customer (B2C) / Lipa Na M-Pesa Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lipa Na M-Pesa Shortcode</label>
                  <input 
                    type="text" 
                    value={mpesaPaymentsConfig.paybillNumber}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, paybillNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LNM Passkey</label>
                  <input 
                    type="password" 
                    value={mpesaPaymentsConfig.passkey}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, passkey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LNM Consumer Key</label>
                  <input 
                    type="text" 
                    value={mpesaPaymentsConfig.consumerKey}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LNM Consumer Secret</label>
                  <input 
                    type="password" 
                    value={mpesaPaymentsConfig.consumerSecret}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerSecret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority Alert Phone</label>
                  <input 
                    type="text" 
                    value={mpesaPaymentsConfig.priorityPhone}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, priorityPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Account Number</label>
                  <input 
                    type="text" 
                    value={mpesaPaymentsConfig.accountNumber}
                    onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, accountNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: eTIMS Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              KRA eTIMS Billing Sync Setup
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS API Integration URL</label>
                <input 
                  type="text" 
                  value={etimsConfig.url}
                  onChange={(e) => setEtimsConfig({ ...etimsConfig, url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Status</label>
                <select 
                  value={etimsConfig.status ? 'true' : 'false'}
                  onChange={(e) => setEtimsConfig({ ...etimsConfig, status: e.target.value === 'true' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                >
                  <option value="true">Active (Direct Sync)</option>
                  <option value="false">Inactive / Sandbox Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS Username</label>
                <input 
                  type="text" 
                  value={etimsConfig.username}
                  onChange={(e) => setEtimsConfig({ ...etimsConfig, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS API Password</label>
                <input 
                  type="password" 
                  value={etimsConfig.password}
                  onChange={(e) => setEtimsConfig({ ...etimsConfig, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Mail Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              System SMTP Mail Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Driver</label>
                <input 
                  type="text" 
                  value={mailConfig.driver}
                  onChange={(e) => setMailConfig({ ...mailConfig, driver: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Host</label>
                <input 
                  type="text" 
                  value={mailConfig.host}
                  onChange={(e) => setMailConfig({ ...mailConfig, host: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Port</label>
                <input 
                  type="text" 
                  value={mailConfig.port}
                  onChange={(e) => setMailConfig({ ...mailConfig, port: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Username</label>
                <input 
                  type="text" 
                  value={mailConfig.username}
                  onChange={(e) => setMailConfig({ ...mailConfig, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Password</label>
                <input 
                  type="password" 
                  value={mailConfig.password}
                  onChange={(e) => setMailConfig({ ...mailConfig, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Encryption</label>
                <input 
                  type="text" 
                  value={mailConfig.encryption}
                  onChange={(e) => setMailConfig({ ...mailConfig, encryption: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Email</label>
                <input 
                  type="email" 
                  value={mailConfig.senderEmail}
                  onChange={(e) => setMailConfig({ ...mailConfig, senderEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Display Name</label>
                <input 
                  type="text" 
                  value={mailConfig.senderName}
                  onChange={(e) => setMailConfig({ ...mailConfig, senderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Report Receiver Email</label>
                <input 
                  type="email" 
                  value={mailConfig.reportReceiverEmail}
                  onChange={(e) => setMailConfig({ ...mailConfig, reportReceiverEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: AfricasTalking SMS Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              Africa's Talking SMS API
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT Username</label>
                <input 
                  type="text" 
                  value={atSmsConfig.username}
                  onChange={(e) => setAtSmsConfig({ ...atSmsConfig, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT API Key</label>
                <input 
                  type="password" 
                  value={atSmsConfig.apiKey}
                  onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT Sender ID (Shortcode)</label>
                <input 
                  type="text" 
                  value={atSmsConfig.senderId}
                  onChange={(e) => setAtSmsConfig({ ...atSmsConfig, senderId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT API Endpoint URL</label>
                <input 
                  type="text" 
                  value={atSmsConfig.apiUrl}
                  onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fallback Admin Phone</label>
                <input 
                  type="text" 
                  value={atSmsConfig.smsRecipientPhone}
                  onChange={(e) => setAtSmsConfig({ ...atSmsConfig, smsRecipientPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 7: SHA Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
              Social Health Authority (SHA) Portal
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Agent ID *</label>
                <input 
                  type="text" 
                  value={shaConfig.agentId}
                  onChange={(e) => setShaConfig({ ...shaConfig, agentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Consumer Key *</label>
                <input 
                  type="text" 
                  value={shaConfig.consumerKey}
                  onChange={(e) => setShaConfig({ ...shaConfig, consumerKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Consumer Secret *</label>
                <input 
                  type="password" 
                  value={shaConfig.consumerSecret}
                  onChange={(e) => setShaConfig({ ...shaConfig, consumerSecret: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Username *</label>
                <input 
                  type="text" 
                  value={shaConfig.username}
                  onChange={(e) => setShaConfig({ ...shaConfig, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Password *</label>
                <input 
                  type="password" 
                  value={shaConfig.password}
                  onChange={(e) => setShaConfig({ ...shaConfig, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA App Url *</label>
                <input 
                  type="text" 
                  value={shaConfig.appUrl}
                  onChange={(e) => setShaConfig({ ...shaConfig, appUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>

              {/* PEM KEYS with Expired indicators */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">SHA Public PEM KEY *</label>
                    <span className="bg-red-500/10 border border-red-500/25 text-red-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-sans">
                      Expired
                    </span>
                  </div>
                  <textarea 
                    value={shaConfig.publicPemKey}
                    onChange={(e) => setShaConfig({ ...shaConfig, publicPemKey: e.target.value })}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-mono focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">SHA Private PEM KEY *</label>
                    <span className="bg-red-500/10 border border-red-500/25 text-red-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-sans">
                      Expired
                    </span>
                  </div>
                  <textarea 
                    value={shaConfig.privatePemKey}
                    onChange={(e) => setShaConfig({ ...shaConfig, privatePemKey: e.target.value })}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-mono focus:outline-none focus:border-teal-500 transition" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Public PEM Key Expiry Date & Time *</label>
                <input 
                  type="datetime-local" 
                  value={shaConfig.publicKeyExpiry?.slice(0, 16)}
                  onChange={(e) => setShaConfig({ ...shaConfig, publicKeyExpiry: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Private PEM Key Expiry Date & Time *</label>
                <input 
                  type="datetime-local" 
                  value={shaConfig.privateKeyExpiry?.slice(0, 16)}
                  onChange={(e) => setShaConfig({ ...shaConfig, privateKeyExpiry: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Reminder Recipient Email *</label>
                <input 
                  type="email" 
                  value={shaConfig.reminderEmail}
                  onChange={(e) => setShaConfig({ ...shaConfig, reminderEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA HMIS Rate *</label>
                <input 
                  type="text" 
                  value={shaConfig.hmisRate}
                  onChange={(e) => setShaConfig({ ...shaConfig, hmisRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
        }`}>
          <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            {toast.type === 'error' ? <ShieldAlert size={10} className="text-red-400" /> : <Check size={10} className="text-teal-400" />}
          </div>
          <span className="text-[10px] font-bold font-sans">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
