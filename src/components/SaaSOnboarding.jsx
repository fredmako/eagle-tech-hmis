import React, { useState } from 'react';
import { supabase } from '../appwriteClient';
import { sendNotification } from '../notificationService';
import { 
  Activity, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Check, 
  Sparkles,
  AlertCircle,
  Eye,
  Heart,
  ShieldAlert,
  Upload
} from 'lucide-react';

export default function SaaSOnboarding({ onBackToLogin }) {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('hospital'); // 'clinic', 'hospital', 'enterprise'
  
  // Registration & branding form state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalCode, setHospitalCode] = useState('');
  const [logoOption, setLogoOption] = useState('heart'); // 'heart', 'shield', 'cross', 'custom'
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Payment form state
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Success states
  const [createdFacilityCode, setCreatedFacilityCode] = useState('');

  // Preset Logos with clean medical styles
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

  const getActiveLogoUrl = () => {
    if (logoOption === 'custom') {
      return customLogoUrl || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60';
    }
    return `preset:${logoOption}`;
  };

  const renderActiveLogo = (size = 20, border = true) => {
    if (logoOption === 'custom' && customLogoUrl) {
      return (
        <img 
          src={customLogoUrl} 
          alt="Custom Logo" 
          className={`rounded-lg object-cover ${border ? 'border border-slate-700' : ''}`}
          style={{ width: size, height: size }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60';
          }}
        />
      );
    }
    const preset = logoPresets[logoOption] || logoPresets['heart'];
    return (
      <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${preset.bg} ${preset.color}`}>
        {preset.icon(`w-${Math.floor(size/4)}.5 h-${Math.floor(size/4)}.5`)}
      </div>
    );
  };

  // Dynamic Image compression to lightweight base64 string
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPEG, SVG).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 80; // Small size fits sidebar and complies with DB size attributes
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

          // 80% compression ensures high quality but tiny string size
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setCustomLogoUrl(compressedBase64);
          setError('');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const plans = [
    {
      id: 'clinic',
      name: 'Basic Clinic',
      price: '$49',
      billing: 'per month',
      description: 'Ideal for small clinics and standalone outpatient triage stations.',
      features: [
        'Up to 5 healthcare staff accounts',
        'Triage & OPD Consultation modules',
        'Basic local queue management',
        'Email customer support',
        'Standard daily audit logging'
      ]
    },
    {
      id: 'hospital',
      name: 'Standard Hospital',
      price: '$149',
      billing: 'per month',
      description: 'Perfect for mid-size hospitals requiring ward operations and lab/pharmacy integration.',
      features: [
        'Up to 30 healthcare staff accounts',
        'All 11 modules (Lab, Pharmacy, Billing, etc.)',
        'Inpatient Ward Bed Visualizer',
        'MOH 717 auto-reporting engines',
        'Priority email/chat support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise System',
      price: '$399',
      billing: 'per month',
      description: 'Built for large referral networks and multi-facility hospital groups.',
      features: [
        'Unlimited staff accounts & facilities',
        'Custom domain names (e.g. portal.yourhospital.com)',
        'Full HIPAA / local compliance database configurations',
        'Dedicated account manager & 24/7 SLA hotline',
        'Custom reporting integrations'
      ]
    }
  ];

  const handleNextStep = () => {
    if (step === 2) {
      if (!hospitalName.trim() || !hospitalAddress.trim() || !adminName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword.trim()) {
        setError('Please fill in all hospital and administrator profile details.');
        return;
      }
      if (adminPassword.length < 8) {
        setError('Administrator password must be at least 8 characters long.');
        return;
      }
      if (logoOption === 'custom' && !customLogoUrl) {
        setError('Please upload a custom Logo File or choose one of the presets.');
        return;
      }
      
      const cleanName = hospitalName.trim().replace(/[^a-zA-Z ]/g, "");
      const words = cleanName.split(" ");
      let code = "";
      if (words.length >= 2) {
        code = (words[0][0] + words[1][0] + (words[2] ? words[2][0] : 'H')).toUpperCase();
      } else {
        code = cleanName.substring(0, 3).toUpperCase();
      }
      setHospitalCode(`${code}-${Math.floor(100 + Math.random() * 900)}`);
    }
    setError('');
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleProvisionPortal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Register Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });

      if (authError) throw new Error(authError);

      const userId = authData.user.id;
      const facilityId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const logoUrl = getActiveLogoUrl();

      // 2. Insert new facility document including logo_url & address
      const { error: facError } = await supabase.from('facilities').insert({
        id: facilityId,
        name: hospitalName,
        code: hospitalCode,
        logo_url: logoUrl,
        address: hospitalAddress
      });

      if (facError) throw new Error(facError);

      // 3. Insert admin profile document
      const { error: profError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: adminName,
        role: 'admin',
        facility_id: facilityId
      });

      if (profError) throw new Error(profError);

      // 4. Trigger welcome email notification
      await sendNotification('USER_SIGNUP', {
        adminName,
        adminEmail,
        recipientEmail: adminEmail
      }, facilityId);

      // Cache details for redirect auto-fill
      sessionStorage.setItem('egesa_health_new_facility_id', facilityId);
      sessionStorage.setItem('egesa_health_new_facility_code', hospitalCode);
      sessionStorage.setItem('egesa_health_new_admin_email', adminEmail);

      setCreatedFacilityCode(hospitalCode);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Onboarding failed during server configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-955 flex flex-col justify-center items-center p-4">
      {/* Header Branding */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/10">
          <Building2 size={24} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wider uppercase">Eagle Tech</h1>
          <p className="text-[9px] text-teal-400 font-bold tracking-widest uppercase block">HMIS Outsource Solutions</p>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Step Indicators */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 1 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">01.</span>
              <span className="text-xs font-semibold">Tiers & Pricing</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 2 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">02.</span>
              <span className="text-xs font-semibold">Branding & Setup</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 3 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">03.</span>
              <span className="text-xs font-semibold">Secure Checkout</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3.5 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PLAN SELECTOR */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <Sparkles size={16} className="text-teal-400" /> Eagle Tech HMIS Licensing Plans
              </h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Secure enterprise-grade health management outsourced directly to your facility. Choose your plan to configure custom white-label portals for your clinical management team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`bg-slate-950 border rounded-xl p-5 cursor-pointer relative transition-all duration-200 hover:border-teal-500/40 flex flex-col justify-between ${
                    selectedPlan === p.id 
                      ? 'border-teal-500 shadow-lg shadow-teal-500/5 ring-1 ring-teal-500' 
                      : 'border-slate-850'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{p.name}</span>
                      {selectedPlan === p.id && (
                        <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] py-0.5 px-2 rounded-full font-bold uppercase">
                          Selected
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-2xl font-black text-white">{p.price}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">{p.billing}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed min-h-[44px]">
                      {p.description}
                    </p>
                    <div className="border-t border-slate-900 pt-4 space-y-2">
                      {p.features.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <Check size={12} className="text-teal-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button 
                onClick={onBackToLogin}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
              <button 
                onClick={handleNextStep}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition"
              >
                Define Portal Branding <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BRANDING SETUP & PREVIEW */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
                Portal White-Label Branding Setup
              </h2>
              <p className="text-xs text-slate-400">
                Design your custom medical portal. Define your Hospital Name, physical address, and upload your custom logo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form: Inputs (7/12 width) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-slate-955 border border-slate-850 p-5 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
                    <Building2 size={14} /> Hospital Identification
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital Name</label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g. St. Luke Referral Hospital"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1">Hospital Address</label>
                      <input
                        type="text"
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        placeholder="e.g. Avenue Rd, Nairobi, Kenya"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Choose Hospital Logo</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {Object.keys(logoPresets).map((presetKey) => {
                        const preset = logoPresets[presetKey];
                        return (
                          <button
                            key={presetKey}
                            type="button"
                            onClick={() => setLogoOption(presetKey)}
                            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                              logoOption === presetKey 
                                ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                                : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800 hover:text-slate-200'
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
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                          logoOption === 'custom' 
                            ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                            : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800'
                        }`}
                      >
                        <Upload size={16} />
                        <span className="text-[8px] font-bold tracking-wide uppercase">Custom Upload</span>
                      </button>
                    </div>

                    {logoOption === 'custom' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 hover:border-teal-500/50 transition">
                            <div className="flex flex-col items-center justify-center pt-4 pb-3">
                              <Upload size={24} className="mb-2 text-slate-400" />
                              <p className="text-[10px] text-slate-400 font-bold uppercase"><span className="text-teal-400">Click to upload</span> logo image</p>
                              <p className="text-[8px] text-slate-500 mt-0.5">PNG, JPG or SVG (Auto-compressed)</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleLogoUpload} 
                            />
                          </label>
                        </div>
                        {customLogoUrl && (
                          <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-lg">
                            <img src={customLogoUrl} alt="Uploaded Logo Preview" className="w-8 h-8 rounded object-cover border border-slate-700" />
                            <div className="truncate flex-1">
                              <span className="text-[10px] text-slate-450 block font-bold">Logo Uploaded Successfully</span>
                              <span className="text-[8px] text-slate-500 font-mono block truncate">{customLogoUrl.substring(0, 50)}...</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCustomLogoUrl('')}
                              className="text-[9px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-955 border border-slate-855 p-5 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
                    <User size={14} /> Admin Account Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Name</label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Dr. Frank Meso"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="+254 712 345678"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Email</label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@yourhospital.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Live Sidebar & Portal Preview (5/12 width) */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={13} className="text-teal-400" /> Live Sidebar Branding Preview
                </h3>

                {/* Glassmorphic Mock Sidebar widget */}
                <div className="bg-slate-950 border border-slate-855 rounded-xl p-5 shadow-inner relative overflow-hidden space-y-6 min-h-[340px] flex flex-col justify-between">
                  <div className="absolute top-1 right-2 text-[8px] text-slate-800 font-bold font-mono tracking-widest uppercase">
                    Eagle Tech HMIS Preview
                  </div>

                  {/* Header Branding Widget */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                      {renderActiveLogo(32, true)}
                      <div className="truncate flex-1">
                        <span className="font-bold tracking-wide text-xs text-white block uppercase truncate">
                          {hospitalName.trim() || 'Your Hospital Name'}
                        </span>
                        <span className="text-[8px] text-slate-400 block truncate mt-0.5 leading-none">
                          {hospitalAddress.trim() || 'Your Facility Address'}
                        </span>
                        <span className="text-[9px] text-teal-400 font-semibold tracking-wider uppercase block truncate leading-none mt-2">
                          HMIS PORTAL
                        </span>
                      </div>
                    </div>

                    {/* Mock Navigation Menu items */}
                    <div className="space-y-1.5 opacity-60">
                      <div className="w-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                        <Activity size={12} /> Dashboard View
                      </div>
                      <div className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-550 text-[10px] font-bold">
                        <User size={12} /> Patient Register
                      </div>
                      <div className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-555 text-[10px] font-bold">
                        <Lock size={12} /> Security Configuration
                      </div>
                    </div>
                  </div>

                  {/* Powered By Eagle Tech Footer */}
                  <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-[9px] text-slate-655 font-bold">
                    <span>Facility Code: {hospitalCode || 'MOCK-001'}</span>
                    <span className="text-teal-500/60 uppercase font-mono tracking-wider">Eagle Tech Solutions</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
              <button 
                onClick={handlePrevStep}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button 
                onClick={handleNextStep}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
              >
                Go to Payment Portal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MOCK CHECKOUT */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Left Column: Order Summary & Brand Confirmation */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-850 flex items-center gap-1.5">
                Branding & Licensing Summary
              </h3>

              {/* White label preview details */}
              <div className="bg-slate-950 border border-slate-855 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  {renderActiveLogo(28, true)}
                  <div className="truncate">
                    <span className="font-bold text-slate-200 block text-xs truncate uppercase">{hospitalName}</span>
                    <span className="text-[9px] text-slate-550 block font-semibold">Custom Portal Layout Activated</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-900 pt-3 space-y-1.5 text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Parent Outsourced Engine:</span>
                    <span className="font-bold text-slate-300">Eagle Tech Solutions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operational Licensing Tier:</span>
                    <span className="font-bold text-teal-400">{plans.find(p => p.id === selectedPlan)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MOH Identifier Code:</span>
                    <span className="font-mono text-teal-500 font-bold">{hospitalCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Facility Address:</span>
                    <span className="font-bold text-slate-300 truncate max-w-[180px]" title={hospitalAddress}>{hospitalAddress}</span>
                  </div>
                </div>
              </div>

              {/* Order total amount card */}
              <div className="bg-teal-500/5 border border-teal-500/10 p-4 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Subscription Total:</span>
                <span className="text-lg font-black text-teal-400">{plans.find(p => p.id === selectedPlan)?.price} <span className="text-[10px] text-slate-500 font-medium">/ month</span></span>
              </div>
            </div>

            {/* Right Column: Simulated checkout form */}
            <div className="bg-slate-950 border border-slate-855 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
                <CreditCard size={14} className="text-teal-400" /> Secure Payment portal
              </h3>

              <form onSubmit={handleProvisionPortal} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                    <CreditCard size={14} className="absolute right-3 top-2.5 text-slate-650" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1">CVC Code</label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-2 bg-slate-900/60 border border-slate-805 p-2.5 rounded-lg text-[9px] text-slate-500 font-medium">
                  <ShieldCheck size={18} className="text-teal-400 shrink-0 mt-0.5" />
                  <span>Eagle Tech billing processes transactions over TLS. Clicking pay now constructs your database profile and facility credentials immediately.</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                  <button 
                    type="button"
                    onClick={handlePrevStep}
                    disabled={loading}
                    className="text-xs font-bold text-slate-450 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
                  >
                    {loading ? 'Registering...' : `Pay & Activate Portal`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="space-y-6 max-w-lg mx-auto text-center py-4">
            <div className="flex justify-center mb-2">
              <div className="bg-teal-500/10 border border-teal-500/25 p-3 rounded-full text-teal-400">
                <CheckCircle2 size={40} className="animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide">Portal Provisioned Successfully!</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hospital **{hospitalName}** has been registered in Eagle Tech HMIS databases. A dedicated operational workspace and your Administrator profile are active.
              </p>
            </div>

            {/* Configured details */}
            <div className="bg-slate-950 border border-slate-855 p-5 rounded-xl space-y-3 text-xs text-left max-w-md mx-auto">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-900">
                {renderActiveLogo(24, true)}
                <span className="font-bold text-slate-100 uppercase">{hospitalName}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-500 font-bold">MOH Facility Code</span>
                <span className="font-mono text-teal-400 font-black">{createdFacilityCode}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-bold">Hospital Address</span>
                <span className="text-slate-300 font-semibold">{hospitalAddress}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-bold">Admin Login Email</span>
                <span className="text-slate-300 font-semibold">{adminEmail}</span>
              </div>
              <div className="border-t border-slate-900 pt-3 flex gap-2 text-[10px] text-slate-550 leading-relaxed">
                <Check size={14} className="text-teal-400 shrink-0" />
                <span>You can now log in using these credentials to add users, run consultations, and access the MOH daily portal.</span>
              </div>
            </div>

            <button
              onClick={onBackToLogin}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg active:scale-[0.98] transition w-full max-w-md cursor-pointer"
            >
              Go to Hospital Login Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
