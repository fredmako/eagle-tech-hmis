import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  LayoutDashboard, Settings, User, Calendar, Activity, Heart, ShieldAlert,
  ArrowRight, ShieldCheck, Check, Sliders, ChevronDown, ChevronRight, Menu, LogOut, Lock, Save
} from 'lucide-react';

export default function SystemAdministration({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [systemSetupOpen, setSystemSetupOpen] = useState(true);

  // Form states grouped as in the screenshots
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
    senderId: 'HOSI_POA',
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
            details: `System administration parameters updated by Support Admin (${user.email || 'conrade@hosipoa.co.ke'})`
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
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Header Bar */}
      <header className="h-14 bg-[#0066FF] flex items-center justify-between px-4 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)} 
            className="text-white hover:bg-white/10 p-1.5 rounded transition cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
              <Heart size={18} className="text-white fill-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-wider uppercase font-sans">
              Hosi Poa
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <div className="flex items-center gap-2 border-l border-white/20 pl-4 py-1">
            <div className="h-7 w-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-bold text-white text-xs shadow-inner">
              SA
            </div>
            <div className="text-left leading-none">
              <span className="text-[11px] font-bold text-white block">Support Admin</span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-mono">conrade@hosipoa.co.ke</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            title="Exit System Administration"
            className="text-white hover:bg-red-600 hover:text-white p-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside 
          className={`bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ${
            sidebarExpanded ? 'w-64' : 'w-0 overflow-hidden'
          }`}
        >
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>

            {/* Dropdown System Setup (Active) */}
            <div className="space-y-1">
              <button 
                onClick={() => setSystemSetupOpen(!systemSetupOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-[12px] font-bold text-slate-100 bg-[#8B0000]/10 border-l-4 border-red-700 hover:bg-[#8B0000]/15 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings size={14} className="text-red-500" />
                  <span>System Setup</span>
                </div>
                {systemSetupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {systemSetupOpen && (
                <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 py-1">
                  {[
                    "Core Systems",
                    "Clinic Setup Administration",
                    "System Modules",
                    "Modules Config",
                    "System Configuration",
                    "System Administration",
                    "System Configs",
                    "Function Configs",
                    "Performc Configs",
                    "System Pages Config",
                    "Users Management",
                    "User Permissions",
                    "User Grouping",
                    "User Reset Logins",
                    "User Permission Details",
                    "User Notifications Config",
                    "Department Permissions"
                  ].map((subItem) => {
                    const isActive = subItem === "System Administration";
                    return (
                      <button 
                        key={subItem}
                        className={`w-full text-left px-3 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          isActive 
                            ? 'text-white bg-[#0066FF] font-semibold shadow-sm' 
                            : 'text-slate-450 hover:text-slate-205 hover:bg-slate-850'
                        }`}
                      >
                        {subItem}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {[
              "Facility Management",
              "Products & Services",
              "Insurance Management",
              "Server Status",
              "Sha Pay Settings",
              "System Audit Report"
            ].map((menuItem) => (
              <button key={menuItem} className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
                <Sliders size={14} className="text-slate-500" />
                <span>{menuItem}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Central Form Container */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col min-w-0">
          
          {/* Breadcrumbs & Title */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-light text-slate-100 font-sans tracking-wide">System Administration</h1>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Main Home / Module Select &gt; <span className="text-[#0066FF]">System Administration</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded px-4 py-2 text-xs font-bold text-slate-350 tracking-wide flex items-center gap-1.5">
              <Sliders size={14} className="text-teal-400" /> Manage Company Details
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066FF] border-t-transparent" />
              <span className="text-xs font-mono">Loading system administration keys...</span>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl pb-12">
              
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={companyConfig.email}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Address</label>
                    <input 
                      type="text" 
                      value={companyConfig.address}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Telephone</label>
                    <input 
                      type="text" 
                      value={companyConfig.telephone}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, telephone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Website</label>
                    <input 
                      type="text" 
                      value={companyConfig.website}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, website: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company PIN</label>
                    <input 
                      type="password" 
                      value={companyConfig.pin}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, pin: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
                    <input 
                      type="text" 
                      value={companyConfig.code}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reports Header Font Size</label>
                    <input 
                      type="number" 
                      value={companyConfig.reportsFontSize}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, reportsFontSize: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Feedback Link</label>
                    <input 
                      type="text" 
                      value={companyConfig.feedbackLink}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, feedbackLink: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Do More Link</label>
                    <input 
                      type="text" 
                      value={companyConfig.doMoreLink}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, doMoreLink: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Sales Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  Sales Configuration
                </h2>
                
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Insurance Sales Rate</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate Type</label>
                      <select 
                        value={salesConfig.insuranceRateType}
                        onChange={(e) => setSalesConfig({ ...salesConfig, insuranceRateType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="Fixed">Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Percentage (%)</label>
                      <input 
                        type="text" 
                        value={salesConfig.insurancePercentage}
                        onChange={(e) => setSalesConfig({ ...salesConfig, insurancePercentage: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admission Insurance Minimum Deposit</label>
                      <input 
                        type="text" 
                        value={salesConfig.insuranceMinDeposit}
                        onChange={(e) => setSalesConfig({ ...salesConfig, insuranceMinDeposit: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">Cash Sale Drugs Rate</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate Type</label>
                      <select 
                        value={salesConfig.cashRateType}
                        onChange={(e) => setSalesConfig({ ...salesConfig, cashRateType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="Fixed">Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Percentage (%)</label>
                      <input 
                        type="text" 
                        value={salesConfig.cashPercentage}
                        onChange={(e) => setSalesConfig({ ...salesConfig, cashPercentage: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admission Cash Minimum Deposit</label>
                      <input 
                        type="text" 
                        value={salesConfig.cashMinDeposit}
                        onChange={(e) => setSalesConfig({ ...salesConfig, cashMinDeposit: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Mpesa Hospital Patient Bills Config */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  Mpesa Hospital Patient Bills Config
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Bill Number</label>
                    <input 
                      type="text" 
                      value={mpesaBillsConfig.billNumber}
                      onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, billNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa PassKey</label>
                    <input 
                      type="text" 
                      value={mpesaBillsConfig.passkey}
                      onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, passkey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Consumer Key</label>
                    <input 
                      type="text" 
                      value={mpesaBillsConfig.consumerKey}
                      onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Consumer Secret</label>
                    <input 
                      type="text" 
                      value={mpesaBillsConfig.consumerSecret}
                      onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerSecret: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Mpesa Services Payment Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  Mpesa Services Payment Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Paybill Number</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.paybillNumber}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, paybillNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa PassKey</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.passkey}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, passkey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Consumer Key</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.consumerKey}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa Consumer Secret</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.consumerSecret}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerSecret: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority Phone number</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.priorityPhone}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, priorityPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number</label>
                    <input 
                      type="text" 
                      value={mpesaPaymentsConfig.accountNumber}
                      onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, accountNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: eTIMS Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  eTIMS Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      eTIMS URL <span className="text-slate-500">(Enter the full URL without a trailing slash, e.g., https://etims.example.com)</span>
                    </label>
                    <input 
                      type="text" 
                      value={etimsConfig.url}
                      onChange={(e) => setEtimsConfig({ ...etimsConfig, url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">eTIMS URL Status</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEtimsConfig({ ...etimsConfig, status: !etimsConfig.status })}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none shrink-0 ${
                          etimsConfig.status ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md ${
                            etimsConfig.status ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-bold ${etimsConfig.status ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {etimsConfig.status ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS Username <span className="text-slate-500">(Enter your eTIMS login username)</span></label>
                    <input 
                      type="text" 
                      value={etimsConfig.username}
                      onChange={(e) => setEtimsConfig({ ...etimsConfig, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS Password <span className="text-slate-500">(Enter your eTIMS login password)</span></label>
                    <input 
                      type="password" 
                      value={etimsConfig.password}
                      onChange={(e) => setEtimsConfig({ ...etimsConfig, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: Mail Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  Mail Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Driver *</label>
                    <select 
                      value={mailConfig.driver}
                      onChange={(e) => setMailConfig({ ...mailConfig, driver: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="SMTP">SMTP</option>
                      <option value="Sendmail">Sendmail</option>
                      <option value="Mailgun">Mailgun</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Host *</label>
                    <input 
                      type="text" 
                      value={mailConfig.host}
                      onChange={(e) => setMailConfig({ ...mailConfig, host: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Port *</label>
                    <input 
                      type="text" 
                      value={mailConfig.port}
                      onChange={(e) => setMailConfig({ ...mailConfig, port: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Username *</label>
                    <input 
                      type="text" 
                      value={mailConfig.username}
                      onChange={(e) => setMailConfig({ ...mailConfig, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Password *</label>
                    <input 
                      type="password" 
                      value={mailConfig.password}
                      onChange={(e) => setMailConfig({ ...mailConfig, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mail Encryption *</label>
                    <select 
                      value={mailConfig.encryption}
                      onChange={(e) => setMailConfig({ ...mailConfig, encryption: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="TLS">TLS</option>
                      <option value="SSL">SSL</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Email *</label>
                    <input 
                      type="text" 
                      value={mailConfig.senderEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, senderEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Name *</label>
                    <input 
                      type="text" 
                      value={mailConfig.senderName}
                      onChange={(e) => setMailConfig({ ...mailConfig, senderName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Report Receiver Email Address *</label>
                    <input 
                      type="text" 
                      value={mailConfig.reportReceiverEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, reportReceiverEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance Report Email *</label>
                    <input 
                      type="text" 
                      value={mailConfig.insuranceReportEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, insuranceReportEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">MoH reports Email *</label>
                    <input 
                      type="text" 
                      value={mailConfig.mohReportsEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, mohReportsEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lab Reports Email *</label>
                    <input 
                      type="text" 
                      value={mailConfig.labReportsEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, labReportsEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pharmacy Dispensed Reports Email *</label>
                    <input 
                      type="text" 
                      value={mailConfig.pharmacyReportsEmail}
                      onChange={(e) => setMailConfig({ ...mailConfig, pharmacyReportsEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 7: Africa's Talking SMS Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  Africa's Talking SMS Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT Username *</label>
                    <input 
                      type="text" 
                      value={atSmsConfig.username}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT API Key *</label>
                    <input 
                      type="password" 
                      value={atSmsConfig.apiKey}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT API URL *</label>
                    <input 
                      type="text" 
                      value={atSmsConfig.apiUrl}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT Sender ID</label>
                    <input 
                      type="text" 
                      value={atSmsConfig.senderId}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, senderId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name of SMS Recipient</label>
                    <input 
                      type="text" 
                      value={atSmsConfig.smsRecipientName}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, smsRecipientName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number of Recipient</label>
                    <input 
                      type="text" 
                      value={atSmsConfig.smsRecipientPhone}
                      onChange={(e) => setAtSmsConfig({ ...atSmsConfig, smsRecipientPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 8: SHA Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850">
                  SHA Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Agent ID *</label>
                    <input 
                      type="text" 
                      value={shaConfig.agentId}
                      onChange={(e) => setShaConfig({ ...shaConfig, agentId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Consumer Key *</label>
                    <input 
                      type="password" 
                      value={shaConfig.consumerKey}
                      onChange={(e) => setShaConfig({ ...shaConfig, consumerKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Consumer Secret *</label>
                    <input 
                      type="password" 
                      value={shaConfig.consumerSecret}
                      onChange={(e) => setShaConfig({ ...shaConfig, consumerSecret: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Username *</label>
                    <input 
                      type="text" 
                      value={shaConfig.username}
                      onChange={(e) => setShaConfig({ ...shaConfig, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Password *</label>
                    <input 
                      type="password" 
                      value={shaConfig.password}
                      onChange={(e) => setShaConfig({ ...shaConfig, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA App Url *</label>
                    <input 
                      type="text" 
                      value={shaConfig.appUrl}
                      onChange={(e) => setShaConfig({ ...shaConfig, appUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-mono focus:outline-none focus:border-blue-500 transition" 
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-mono focus:outline-none focus:border-blue-500 transition" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Public PEM Key Expiry Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      value={shaConfig.publicKeyExpiry?.slice(0, 16)}
                      onChange={(e) => setShaConfig({ ...shaConfig, publicKeyExpiry: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Private PEM Key Expiry Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      value={shaConfig.privateKeyExpiry?.slice(0, 16)}
                      onChange={(e) => setShaConfig({ ...shaConfig, privateKeyExpiry: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Reminder Recipient Email *</label>
                    <input 
                      type="email" 
                      value={shaConfig.reminderEmail}
                      onChange={(e) => setShaConfig({ ...shaConfig, reminderEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA HMIS Rate *</label>
                    <input 
                      type="text" 
                      value={shaConfig.hmisRate}
                      onChange={(e) => setShaConfig({ ...shaConfig, hmisRate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>

                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
            toast.type === 'error' ? 'bg-red-500/20' : 'bg-emerald-500/20'
          }`}>
            {toast.type === 'error' ? <ShieldAlert size={12} /> : <Check size={12} />}
          </div>
          <span className="text-xs font-bold font-sans">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
