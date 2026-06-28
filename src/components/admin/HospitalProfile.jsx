import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Building, CheckCircle, Shield, Upload, RefreshCw, Heart, ShieldCheck, 
  Activity, Save, Sliders, Smartphone, Mail, Settings, Key, Send, AlertTriangle,
  MapPin, Compass, ArrowRight
} from 'lucide-react';

export default function HospitalProfile({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'billing' | 'gateways' | 'integrations'
  const [message, setMessage] = useState({ type: '', text: '' });

  // Core facility profile details
  const [facility, setFacility] = useState({
    name: '',
    code: '',
    address: '',
    registration_number: '',
    tax_id: '',
    contact_phone: '',
    contact_email: '',
    logo_url: '',
    facility_images: [],
    latitude: 0,
    longitude: 0,
    geofence_radius_meters: 100
  });

  // Logo preset and custom logo variables
  const [logoOption, setLogoOption] = useState('heart');
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  // Integrated system admin states
  const [companyConfig, setCompanyConfig] = useState({
    companyName: '',
    email: '',
    address: '',
    telephone: '',
    website: '',
    pin: '',
    code: '',
    reportsFontSize: '12',
    feedbackLink: '',
    doMoreLink: ''
  });

  const [salesConfig, setSalesConfig] = useState({
    insuranceRateType: 'Percentage',
    insurancePercentage: '10.00',
    insuranceMinDeposit: '0.00',
    cashRateType: 'Percentage',
    cashPercentage: '0.00',
    cashMinDeposit: '0.00'
  });

  const [mpesaBillsConfig, setMpesaBillsConfig] = useState({
    billNumber: '',
    passkey: '',
    consumerKey: '',
    consumerSecret: ''
  });

  const [mpesaPaymentsConfig, setMpesaPaymentsConfig] = useState({
    paybillNumber: '',
    passkey: '',
    consumerKey: '',
    consumerSecret: '',
    priorityPhone: '',
    accountNumber: ''
  });

  const [etimsConfig, setEtimsConfig] = useState({
    url: '',
    status: false,
    username: '',
    password: ''
  });

  const [atSmsConfig, setAtSmsConfig] = useState({
    username: '',
    apiKey: '',
    apiUrl: 'https://api.africastalking.com/version1/messaging',
    senderId: '',
    smsRecipientName: '',
    smsRecipientPhone: ''
  });

  const [shaConfig, setShaConfig] = useState({
    agentId: '',
    consumerKey: '',
    consumerSecret: '',
    username: '',
    password: '',
    appUrl: '',
    publicPemKey: '',
    privatePemKey: '',
    publicKeyExpiry: '',
    privateKeyExpiry: '',
    reminderEmail: '',
    hmisRate: '2.00'
  });

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello, testing Africa\'s Talking SMS connection from Egesa Medical Clinic.');
  const [testingSms, setTestingSms] = useState(false);

  const logoPresets = {
    heart: {
      name: 'Teal Heart Pulse',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      icon: (cls) => <Heart className={cls} fill="currentColor" />
    },
    shield: {
      name: 'Blue Care Shield',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: (cls) => <ShieldCheck className={cls} fill="currentColor" />
    },
    cross: {
      name: 'Red Clinic Cross',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      icon: (cls) => <Activity className={cls} />
    }
  };

  useEffect(() => {
    fetchFacilityAndSettings();
  }, [user.facility_id]);

  const fetchFacilityAndSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', user.facility_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFacility({
          name: data.name || '',
          code: data.code || '',
          address: data.address || '',
          registration_number: data.registration_number || '',
          tax_id: data.tax_id || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          logo_url: data.logo_url || '',
          facility_images: data.facility_images || [],
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          geofence_radius_meters: data.geofence_radius_meters || 100
        });

        // Resolve logo option
        if (data.logo_url && data.logo_url.startsWith('preset:')) {
          setLogoOption(data.logo_url.replace('preset:', ''));
        } else if (data.logo_url) {
          setLogoOption('custom');
          setCustomLogoUrl(data.logo_url);
        }

        // Initialize system administration configuration
        const config = data.system_admin_config || {};

        setCompanyConfig({
          companyName: config.companyConfig?.companyName || data.name || '',
          email: config.companyConfig?.email || data.contact_email || '',
          address: config.companyConfig?.address || data.address || '',
          telephone: config.companyConfig?.telephone || data.contact_phone || '',
          website: config.companyConfig?.website || '',
          pin: config.companyConfig?.pin || data.tax_id || '',
          code: config.companyConfig?.code || data.code || '',
          reportsFontSize: config.companyConfig?.reportsFontSize || '12',
          feedbackLink: config.companyConfig?.feedbackLink || '',
          doMoreLink: config.companyConfig?.doMoreLink || ''
        });

        if (config.salesConfig) setSalesConfig(prev => ({ ...prev, ...config.salesConfig }));
        if (config.mpesaBillsConfig) setMpesaBillsConfig(prev => ({ ...prev, ...config.mpesaBillsConfig }));
        if (config.mpesaPaymentsConfig) setMpesaPaymentsConfig(prev => ({ ...prev, ...config.mpesaPaymentsConfig }));
        if (config.etimsConfig) setEtimsConfig(prev => ({ ...prev, ...config.etimsConfig }));
        if (config.atSmsConfig) setAtSmsConfig(prev => ({ ...prev, ...config.atSmsConfig }));
        if (config.shaConfig) setShaConfig(prev => ({ ...prev, ...config.shaConfig }));
      }
    } catch (err) {
      console.error('Error fetching facility details:', err);
      showMsg('error', 'Failed to retrieve clinic configuration.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    if (!facility.name.trim()) {
      showMsg('error', 'Hospital name is required.');
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    let finalLogoUrl = facility.logo_url;
    if (logoOption !== 'custom') {
      finalLogoUrl = `preset:${logoOption}`;
    } else {
      finalLogoUrl = customLogoUrl;
    }

    try {
      const fullSystemConfig = {
        companyConfig: {
          ...companyConfig,
          companyName: companyConfig.companyName || facility.name,
          email: companyConfig.email || facility.contact_email,
          address: companyConfig.address || facility.address,
          telephone: companyConfig.telephone || facility.contact_phone,
          pin: companyConfig.pin || facility.tax_id,
          code: companyConfig.code || facility.code
        },
        salesConfig,
        mpesaBillsConfig,
        mpesaPaymentsConfig,
        etimsConfig,
        atSmsConfig,
        shaConfig
      };

      const { error } = await supabase
        .from('facilities')
        .update({
          name: facility.name,
          address: facility.address,
          registration_number: facility.registration_number,
          tax_id: facility.tax_id,
          contact_phone: facility.contact_phone,
          contact_email: facility.contact_email,
          logo_url: finalLogoUrl,
          facility_images: facility.facility_images || [],
          latitude: parseFloat(facility.latitude) || 0,
          longitude: parseFloat(facility.longitude) || 0,
          geofence_radius_meters: parseInt(facility.geofence_radius_meters) || 100,
          system_admin_config: fullSystemConfig
        })
        .eq('id', user.facility_id);

      if (error) throw error;

      // Update companyConfig local fields as well to match
      setCompanyConfig(prev => ({
        ...prev,
        companyName: prev.companyName || facility.name,
        email: prev.email || facility.contact_email,
        address: prev.address || facility.address,
        telephone: prev.telephone || facility.contact_phone,
        pin: prev.pin || facility.tax_id,
        code: prev.code || facility.code
      }));

      // Write audit log
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      try {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'audit_logs',
            rows: [{
              facility_id: user.facility_id,
              user_id: user.id || 'admin',
              action: 'Hospital Profile & Settings Updated',
              details: `Updated hospital particulars and integrated system parameters for "${facility.name}"`
            }]
          })
        });
      } catch (logErr) {
        console.error('Audit logging failed:', logErr);
      }

      showMsg('success', 'Hospital profile and system settings successfully saved!');
    } catch (err) {
      console.error('Error saving settings:', err);
      showMsg('error', `Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_size = 180;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/png', 0.85);
        setCustomLogoUrl(base64);
        setFacility(prev => ({ ...prev, logo_url: base64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = facility.facility_images || [];
    
    if (currentImages.length + files.length > 4) {
      alert("You can upload a maximum of 4 facility images.");
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFacility(prev => {
            const list = prev.facility_images || [];
            if (list.length >= 4) return prev;
            return {
              ...prev,
              facility_images: [...list, compressedBase64]
            };
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryImage = (idxToRemove) => {
    setFacility(prev => ({
      ...prev,
      facility_images: (prev.facility_images || []).filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      alert('Please enter a test phone number (e.g. +254712345678)');
      return;
    }
    setTestingSms(true);
    try {
      await handleSaveAll();

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const res = await fetch(`${apiBase}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });

      const resultData = await res.json();
      if (res.ok && resultData.success) {
        alert(`SMS connection test successful! Status: ${resultData.status}. ${resultData.message || ''}`);
      } else {
        alert(`SMS test failed: ${resultData.error?.message || resultData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Test SMS failed:', err);
      alert(`Test execution failed: ${err.message}`);
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
            <Building size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Hospital Profile & System Settings
            </h4>
            <p className="text-2xs text-slate-500 font-medium">Manage facility credentials, integration gateways, and operational overrides</p>
          </div>
        </div>

        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-2xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md uppercase tracking-wider"
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {message.text && (
        <div className={`p-2.5 rounded text-xs flex gap-2 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          <CheckCircle size={14} className="shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
          <span className="text-2xs font-mono">Retrieving hospital profile context...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          <div className="lg:col-span-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible border-b lg:border-b-0 lg:border-r border-slate-850 pb-3 lg:pb-0 lg:pr-4 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'profile' ? 'bg-slate-800 text-teal-400 border border-slate-700/60' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Building size={13} /> Profile Particulars
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'billing' ? 'bg-slate-800 text-teal-400 border border-slate-700/60' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Settings size={13} /> Clinical & Billing
            </button>
            <button
              onClick={() => setActiveTab('gateways')}
              className={`px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'gateways' ? 'bg-slate-800 text-teal-400 border border-slate-700/60' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Smartphone size={13} /> M-Pesa & eTIMS
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'integrations' ? 'bg-slate-800 text-teal-400 border border-slate-700/60' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Sliders size={13} /> SMS & HIE Portal
            </button>
          </div>

          <div className="lg:col-span-4 max-h-125 overflow-y-auto pr-1 space-y-6">
            
            {activeTab === 'profile' && (
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">Clinic Profile & Branding</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital / Clinic Name</label>
                    <input
                      type="text"
                      value={facility.name}
                      onChange={(e) => setFacility({ ...facility, name: e.target.value })}
                      placeholder="e.g. Eagle Tech Medical Clinic"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">MOH Identifier / Code</label>
                    <input
                      type="text"
                      value={facility.code}
                      disabled
                      className="w-full bg-slate-950/40 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-500 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Physical / Postal Address</label>
                    <input
                      type="text"
                      value={facility.address}
                      onChange={(e) => setFacility({ ...facility, address: e.target.value })}
                      placeholder="e.g. Avenue Rd, Nairobi, Kenya"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Official Contact Email</label>
                    <input
                      type="email"
                      value={facility.contact_email}
                      onChange={(e) => setFacility({ ...facility, contact_email: e.target.value })}
                      placeholder="e.g. info@yourclinic.com"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Official Contact Phone</label>
                    <input
                      type="text"
                      value={facility.contact_phone}
                      onChange={(e) => setFacility({ ...facility, contact_phone: e.target.value })}
                      placeholder="e.g. +254 712 345678"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Registration / License Number</label>
                    <input
                      type="text"
                      value={facility.registration_number}
                      onChange={(e) => setFacility({ ...facility, registration_number: e.target.value })}
                      placeholder="e.g. MED/REG/2026/0890"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Identification PIN</label>
                    <input
                      type="text"
                      value={facility.tax_id}
                      onChange={(e) => setFacility({ ...facility, tax_id: e.target.value })}
                      placeholder="e.g. PIN-A009876543Z"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div className="md:col-span-2 mt-6 border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-bold text-teal-400 font-serif flex items-center gap-1.5 mb-1">
                      <MapPin size={16} /> Attendance Geofencing & Location Settings
                    </h3>
                    <p className="text-2xs text-slate-400 mb-4 font-sans">
                      Configure your facility's exact GPS coordinates and geofencing radius. Staff must be within this boundary to register attendance.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Latitude Coordinate</label>
                          <input
                            type="number"
                            step="any"
                            value={facility.latitude || 0}
                            onChange={(e) => setFacility({ ...facility, latitude: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. -1.286389"
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Longitude Coordinate</label>
                          <input
                            type="number"
                            step="any"
                            value={facility.longitude || 0}
                            onChange={(e) => setFacility({ ...facility, longitude: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 36.817223"
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Geofence Radius (Meters)</label>
                          <input
                            type="number"
                            value={facility.geofence_radius_meters || 100}
                            onChange={(e) => setFacility({ ...facility, geofence_radius_meters: parseInt(e.target.value) || 100 })}
                            placeholder="e.g. 100"
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  setFacility(prev => ({
                                    ...prev,
                                    latitude: parseFloat(position.coords.latitude.toFixed(6)),
                                    longitude: parseFloat(position.coords.longitude.toFixed(6))
                                  }));
                                  showMsg('success', 'GPS Coordinates successfully captured!');
                                },
                                (err) => {
                                  showMsg('error', `Failed to get location: ${err.message}`);
                                }
                              );
                            } else {
                              showMsg('error', 'Geolocation is not supported by your browser.');
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-400 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
                        >
                          <Compass size={14} className="animate-spin" style={{ animationDuration: '6s' }} /> Capture Device GPS Location
                        </button>
                      </div>

                      <div className="md:col-span-2 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
                        <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Geofence Boundary Visualization</label>
                        <div className="relative h-44 bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center">
                          {/* Map Radar Effect */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-500/5 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute h-36 w-36 border border-teal-500/10 rounded-full flex items-center justify-center animate-ping" style={{ animationDuration: '3s' }} />
                          <div className="absolute h-24 w-24 border border-teal-500/20 rounded-full flex items-center justify-center animate-pulse" />
                          
                          {/* Geofence Ring */}
                          <div className="absolute border border-teal-400/40 bg-teal-400/[0.03] rounded-full flex flex-col items-center justify-center" style={{ 
                            width: `${Math.min(150, Math.max(60, ((facility.geofence_radius_meters || 100) / 500) * 150))}px`,
                            height: `${Math.min(150, Math.max(60, ((facility.geofence_radius_meters || 100) / 500) * 150))}px`,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}>
                            <span className="text-[9px] text-teal-400 font-black font-mono bg-slate-900/90 border border-teal-500/20 px-1.5 py-0.5 rounded shadow">
                              {facility.geofence_radius_meters || 100}m Radius
                            </span>
                          </div>

                          {/* Center Clinic Marker */}
                          <div className="z-10 flex flex-col items-center gap-1">
                            <div className="bg-teal-400 text-slate-950 p-2 rounded-full shadow-lg border border-teal-300 animate-bounce" style={{ animationDuration: '4s' }}>
                              <Activity size={18} />
                            </div>
                            <span className="text-2xs font-bold text-slate-200 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                              {facility.name || 'Hospital Center'}
                            </span>
                          </div>

                          {/* Coordinates Overlay */}
                          <div className="absolute bottom-2 left-2 text-[9px] text-slate-500 font-mono flex flex-col gap-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-800/40">
                            <span>Lat: {facility.latitude || 0}</span>
                            <span>Lng: {facility.longitude || 0}</span>
                          </div>

                          <a
                            href={`https://www.openstreetmap.org/?mlat=${facility.latitude || 0}&mlon=${facility.longitude || 0}#map=17/${facility.latitude || 0}/${facility.longitude || 0}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 hover:text-white px-2 py-1 rounded transition"
                          >
                            <span>OpenStreetMap</span>
                            <ArrowRight size={10} />
                          </a>
                        </div>

                        <p className="text-2xs text-slate-500 italic mt-2 text-center md:text-left font-sans">
                          * The Geofence boundary is scaled mock representation. Click "OpenStreetMap" to inspect actual coordinates on a satellite maps provider.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-955 border border-slate-850 p-4 rounded-lg space-y-3">
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital Logo preset or Custom</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {Object.keys(logoPresets).map((presetKey) => {
                      const preset = logoPresets[presetKey];
                      return (
                        <button
                          key={presetKey}
                          type="button"
                          onClick={() => {
                            setLogoOption(presetKey);
                            setFacility(prev => ({ ...prev, logo_url: `preset:${presetKey}` }));
                          }}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                            logoOption === presetKey 
                              ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                              : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800'
                          }`}
                        >
                          {preset.icon('w-5 h-5')}
                          <span className="text-[8px] font-bold tracking-wide uppercase truncate max-w-full">{presetKey}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setLogoOption('custom')}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        logoOption === 'custom' 
                          ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                          : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800'
                      }`}
                    >
                      <Upload size={16} />
                      <span className="text-[8px] font-bold tracking-wide uppercase">Custom Logo</span>
                    </button>
                  </div>

                  {logoOption === 'custom' && (
                    <div className="border border-dashed border-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-center gap-4">
                      {customLogoUrl && (
                        <img 
                          src={customLogoUrl} 
                          alt="Custom logo preview" 
                          className="h-14 w-14 object-contain rounded bg-slate-900 border border-slate-800 p-1 shrink-0" 
                        />
                      )}
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload}
                          className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-700 file:text-2xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-750 file:cursor-pointer" 
                        />
                        <span className="block text-[8px] text-slate-500">Supported formats: PNG, JPG (Max resolution 180x180px for layout fit).</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-955 border border-slate-850 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">Facility Showcase Gallery (Max 4)</label>
                    <span className="text-[9px] text-slate-450 font-semibold bg-slate-900 px-2 py-0.5 rounded">
                      {facility.facility_images?.length || 0} / 4 Images
                    </span>
                  </div>

                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleGalleryUpload}
                    disabled={(facility.facility_images || []).length >= 4}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-700 file:text-2xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-750 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                  />

                  {facility.facility_images && facility.facility_images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {facility.facility_images.map((img, idx) => (
                        <div key={idx} className="relative group border border-slate-800 rounded-lg overflow-hidden h-20 bg-slate-900">
                          <img src={img} alt="Showcase preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white font-bold p-1 rounded text-[8px] transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">Sales Margin Controls</h3>
                  <p className="text-[9px] text-slate-500 mt-1">Configure pricing caps, percentage margins, and minimal deposits for billing invoices.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3">
                    <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider">Cash Rates Config</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate Adjustment Mode</label>
                        <select
                          value={salesConfig.cashRateType}
                          onChange={(e) => setSalesConfig({ ...salesConfig, cashRateType: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-100 focus:outline-none"
                        >
                          <option value="Percentage">Percentage Increment</option>
                          <option value="Fixed">Fixed Amount Increment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adjustment Value</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesConfig.cashPercentage}
                          onChange={(e) => setSalesConfig({ ...salesConfig, cashPercentage: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min Deposit Limit</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesConfig.cashMinDeposit}
                          onChange={(e) => setSalesConfig({ ...salesConfig, cashMinDeposit: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-955 border border-slate-850 p-4 rounded-lg space-y-3">
                    <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider">Insurance Rates Config</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate Adjustment Mode</label>
                        <select
                          value={salesConfig.insuranceRateType}
                          onChange={(e) => setSalesConfig({ ...salesConfig, insuranceRateType: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-100 focus:outline-none"
                        >
                          <option value="Percentage">Percentage Increment</option>
                          <option value="Fixed">Fixed Amount Increment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adjustment Value</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesConfig.insurancePercentage}
                          onChange={(e) => setSalesConfig({ ...salesConfig, insurancePercentage: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min Deposit Limit</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesConfig.insuranceMinDeposit}
                          onChange={(e) => setSalesConfig({ ...salesConfig, insuranceMinDeposit: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-4">
                  <h4 className="text-2xs font-bold text-slate-300 uppercase tracking-wider">Reports Header & Clinical Feedbacks</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reports Header Font Size (px)</label>
                      <input
                        type="number"
                        value={companyConfig.reportsFontSize}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, reportsFontSize: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Feedback Intake Form Link</label>
                      <input
                        type="url"
                        placeholder="https://example.com/feedback"
                        value={companyConfig.feedbackLink}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, feedbackLink: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">External "Do More" Action Link</label>
                    <input
                      type="url"
                      placeholder="https://example.com/do-more"
                      value={companyConfig.doMoreLink}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, doMoreLink: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gateways' && (
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">Integrated Financial Gateways</h3>
                  <p className="text-[9px] text-slate-500 mt-1">Configure M-Pesa utilities and automatic tax logging (KRA eTIMS) callbacks.</p>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3">
                  <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={12} /> M-Pesa C2B Utilities (Patient Invoicing)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Paybill / Bill Till Number</label>
                      <input
                        type="text"
                        value={mpesaBillsConfig.billNumber}
                        onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, billNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-Pesa API Passkey</label>
                      <input
                        type="password"
                        value={mpesaBillsConfig.passkey}
                        onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, passkey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consumer API Key</label>
                      <input
                        type="text"
                        value={mpesaBillsConfig.consumerKey}
                        onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consumer Secret</label>
                      <input
                        type="password"
                        value={mpesaBillsConfig.consumerSecret}
                        onChange={(e) => setMpesaBillsConfig({ ...mpesaBillsConfig, consumerSecret: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-955 border border-slate-850 p-4 rounded-lg space-y-3">
                  <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={12} /> M-Pesa Express (STK Push Payments)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Merchant Shortcode (Paybill)</label>
                      <input
                        type="text"
                        value={mpesaPaymentsConfig.paybillNumber}
                        onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, paybillNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Express Passkey</label>
                      <input
                        type="password"
                        value={mpesaPaymentsConfig.passkey}
                        onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, passkey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consumer Key</label>
                      <input
                        type="text"
                        value={mpesaPaymentsConfig.consumerKey}
                        onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consumer Secret</label>
                      <input
                        type="password"
                        value={mpesaPaymentsConfig.consumerSecret}
                        onChange={(e) => setMpesaPaymentsConfig({ ...mpesaPaymentsConfig, consumerSecret: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-900">
                    <h4 className="text-2xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield size={12} className="text-teal-400" /> KRA eTIMS Tax Compliances API
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={etimsConfig.status}
                        onChange={(e) => setEtimsConfig({ ...etimsConfig, status: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500" />
                      <span className="ml-1.5 text-[8px] font-bold uppercase text-slate-500">Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">KRA eTIMS Bridge API Endpoint</label>
                      <input
                        type="url"
                        placeholder="https://timsv2.kra.go.ke/api"
                        value={etimsConfig.url}
                        onChange={(e) => setEtimsConfig({ ...etimsConfig, url: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">eTIMS Device Serial</label>
                      <input
                        type="text"
                        value={etimsConfig.username}
                        onChange={(e) => setEtimsConfig({ ...etimsConfig, username: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-6">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-4">
                  <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={12} /> Africa's Talking SMS Notification Service
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT Username</label>
                      <input
                        type="text"
                        placeholder="e.g. sandbox or egesatech"
                        value={atSmsConfig.username}
                        onChange={(e) => setAtSmsConfig({ ...atSmsConfig, username: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT API Key</label>
                      <input
                        type="password"
                        placeholder="Africa's Talking API key"
                        value={atSmsConfig.apiKey}
                        onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alphanumeric Sender ID / Shortcode</label>
                      <input
                        type="text"
                        placeholder="e.g. EAGLE_TECH"
                        value={atSmsConfig.senderId}
                        onChange={(e) => setAtSmsConfig({ ...atSmsConfig, senderId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Africa's Talking Messaging API URL</label>
                      <input
                        type="url"
                        value={atSmsConfig.apiUrl}
                        onChange={(e) => setAtSmsConfig({ ...atSmsConfig, apiUrl: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-850 p-4 rounded-lg bg-slate-900/50 space-y-3">
                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Send size={11} className="text-teal-400" /> Send Test SMS Connection
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-1">
                        <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Recipient Mobile</label>
                        <input
                          type="text"
                          placeholder="e.g. +254712345678"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2.5 text-[11px] text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">SMS Message Body</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded py-1 px-2.5 text-[11px] text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleTestSms}
                            disabled={testingSms}
                            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black text-2xs px-3 py-1 rounded transition shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={10} />
                            <span>{testingSms ? 'Sending...' : 'Test Send'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-955 border border-slate-850 p-4 rounded-lg space-y-4">
                  <h4 className="text-2xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} /> Social Health Authority (SHA) HIE Integration
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA Agent ID</label>
                      <input
                        type="text"
                        placeholder="e.g. DHABP03287"
                        value={shaConfig.agentId}
                        onChange={(e) => setShaConfig({ ...shaConfig, agentId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Portal Consumer Key</label>
                      <input
                        type="text"
                        value={shaConfig.consumerKey}
                        onChange={(e) => setShaConfig({ ...shaConfig, consumerKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Portal Consumer Secret</label>
                      <input
                        type="password"
                        value={shaConfig.consumerSecret}
                        onChange={(e) => setShaConfig({ ...shaConfig, consumerSecret: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA HIE Auth Username</label>
                      <input
                        type="text"
                        value={shaConfig.username}
                        onChange={(e) => setShaConfig({ ...shaConfig, username: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA HIE Auth Password</label>
                      <input
                        type="password"
                        value={shaConfig.password}
                        onChange={(e) => setShaConfig({ ...shaConfig, password: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">DHA Gateway Portal URL</label>
                    <input
                      type="url"
                      placeholder="https://api.dha.go.ke"
                      value={shaConfig.appUrl}
                      onChange={(e) => setShaConfig({ ...shaConfig, appUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">DHA Encryption Public Key (PEM)</label>
                      <textarea
                        rows="3"
                        placeholder="-----BEGIN PUBLIC KEY-----"
                        value={shaConfig.publicPemKey}
                        onChange={(e) => setShaConfig({ ...shaConfig, publicPemKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-2xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">DHA Encryption Private Key (PEM)</label>
                      <textarea
                        rows="3"
                        placeholder="-----BEGIN PRIVATE KEY-----"
                        value={shaConfig.privatePemKey}
                        onChange={(e) => setShaConfig({ ...shaConfig, privatePemKey: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-2xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
