import React, { useState } from 'react';
import { supabase } from '../appwriteClient';
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
  AlertCircle
} from 'lucide-react';

export default function SaaSOnboarding({ onBackToLogin }) {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('hospital'); // 'clinic', 'hospital', 'enterprise'
  
  // Registration form state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalCode, setHospitalCode] = useState('');
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
      if (!hospitalName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword.trim()) {
        setError('Please fill in all hospital and administrator profile details.');
        return;
      }
      if (adminPassword.length < 8) {
        setError('Administrator password must be at least 8 characters long.');
        return;
      }
      // Generate a facility code based on name (e.g. Meso Referral -> MRH)
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
      // 1. Register Auth account (client-side Appwrite/Mock creation)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });

      if (authError) throw new Error(authError);

      const userId = authData.user.id;
      const facilityId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

      // 2. Insert new facility document
      const { error: facError } = await supabase.from('facilities').insert({
        id: facilityId,
        name: hospitalName,
        code: hospitalCode
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

      // Cache details for redirect auto-fill
      sessionStorage.setItem('egesa_health_new_facility_id', facilityId);
      sessionStorage.setItem('egesa_health_new_facility_code', hospitalCode);
      sessionStorage.setItem('egesa_health_new_admin_email', adminEmail);

      setCreatedFacilityCode(hospitalCode);
      setStep(4); // Navigate to success step
    } catch (err) {
      setError(err.message || 'Onboarding failed during server configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Header Branding */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-teal-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-teal-500/20">
          <Activity size={24} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">Egesa Health Cloud</h1>
          <p className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase">Enterprise Multi-Tenant SaaS Portal</p>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Step Indicators */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 1 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">01.</span>
              <span className="text-xs font-semibold">Plans</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 2 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">02.</span>
              <span className="text-xs font-semibold">Hospital Info</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 3 ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500'}`}>
              <span className="text-xs font-bold font-mono">03.</span>
              <span className="text-xs font-semibold">Checkout</span>
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
                <Sparkles size={16} className="text-teal-400" /> Choose Your Scale
              </h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Egesa Health provides a modular cloud system tailored for clinics, single networks, or large regional hospitals. Select a subscription to activate your dedicated portal workspace.
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
                Configure Hospital Profile <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION FORM */}
        {step === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
                Hospital Profile Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Provide the details of your facility and configure the primary Administrator account.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5 col-span-2 md:col-span-1">
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-1.5 border-b border-slate-850 flex items-center gap-1.5">
                  <Building2 size={13} /> Facility Information
                </h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital Name</label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Meso Referral Hospital"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="e.g. +254 712 345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-3.5 col-span-2 md:col-span-1">
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-1.5 border-b border-slate-850 flex items-center gap-1.5">
                  <User size={13} /> Admin Credentials
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Frank Meso"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Account Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. admin@yourhospital.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
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
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition"
              >
                Go to Payment Portal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MOCK CHECKOUT */}
        {step === 3 && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <CreditCard size={18} className="text-teal-400" /> Secure Plan Checkout
              </h2>
              <p className="text-xs text-slate-400">
                Complete your payment for Egesa Health {plans.find(p => p.id === selectedPlan)?.name} tier.
              </p>
            </div>

            {/* Order summary widget */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-350">
                <span>Selected Plan</span>
                <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
              </div>
              <div className="flex justify-between font-bold text-teal-400">
                <span>Amount Due</span>
                <span>{plans.find(p => p.id === selectedPlan)?.price} / mo</span>
              </div>
              <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-500 flex justify-between font-medium">
                <span>Facility Onboarding Code</span>
                <span className="font-mono text-teal-500">{hospitalCode}</span>
              </div>
            </div>

            {/* Simulated credit card form */}
            <form onSubmit={handleProvisionPortal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                  />
                  <CreditCard size={14} className="absolute right-3 top-2.5 text-slate-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CVC Code</label>
                  <input
                    type="password"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg text-[10px] text-slate-550 leading-relaxed font-semibold">
                <ShieldCheck size={20} className="text-teal-400 shrink-0" />
                <span>Simulated transaction portal. Clicking pay will register your facility and admin user in the live Appwrite databases immediately.</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={handlePrevStep}
                  disabled={loading}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition"
                >
                  {loading ? 'Configuring Server...' : `Pay & Provision Portal`}
                </button>
              </div>
            </form>
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
                Hospital **{hospitalName}** has been registered in the database. A dedicated operational workspace and your Administrator profile have been configured.
              </p>
            </div>

            {/* Generated Details */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5 text-xs text-left max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">MOH Facility Code</span>
                <span className="font-mono text-teal-400 font-black">{createdFacilityCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Hospital Tenant ID</span>
                <span className="font-mono text-slate-400 font-medium">Auto-Mapped</span>
              </div>
              <div className="flex justify-between">
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
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg active:scale-[0.98] transition w-full max-w-md"
            >
              Go to Hospital Login Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
