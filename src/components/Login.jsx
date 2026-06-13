import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { Activity, ShieldAlert, CheckCircle } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateToSaaS, onNavigateToLanding }) {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    setIsSandbox(!!supabase.isSandbox);
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setFacilities(data);
        
        // Auto-select newly created facility if returning from SaaS onboarding
        const newFacId = sessionStorage.getItem('egesa_health_new_facility_id');
        const newAdminEmail = sessionStorage.getItem('egesa_health_new_admin_email');
        if (newFacId && data.some(f => f.id === newFacId)) {
          setSelectedFacility(newFacId);
          if (newAdminEmail) {
            setEmail(newAdminEmail);
          }
          // Clean up cache
          sessionStorage.removeItem('egesa_health_new_facility_id');
          sessionStorage.removeItem('egesa_health_new_admin_email');
        } else {
          setSelectedFacility(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedFacility) {
      setError('Please select a facility/tenant first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw new Error(error);

      // Successfully logged in
      if (data && data.user) {
        // Retrieve local profile info or construct it
        const { data: profiles } = await supabase.from('profiles').select('*').eq('id', data.user.id);
        const profile = profiles && profiles[0];
        
        // Save selected facility in session state
        const activeFac = facilities.find(f => f.id === selectedFacility);
        const loggedUser = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || profile?.full_name || 'Healthcare Worker',
          role: data.user.user_metadata?.role || profile?.role || 'admin',
          facility_id: selectedFacility,
          facility_name: activeFac?.name || 'Default Facility',
          facility_logo: activeFac?.logo_url || null
        };
        
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!selectedFacility) {
      setError('Please select a facility/tenant first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Temporarily cache the selected facility to preserve it through the OAuth redirect loop
      sessionStorage.setItem('egesa_health_pending_facility', selectedFacility);
      const { error } = await supabase.auth.signInWithGoogle();
      if (error) throw new Error(error);
    } catch (err) {
      setError(err.message || 'Google Login failed.');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleName, roleLabel) => {
    setError('');
    setLoading(true);
    try {
      const mockEmail = `${roleName}@egesa.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: 'password123'
      });
      if (error) throw new Error(error);

      if (data && data.user) {
        const activeFac = facilities.find(f => f.id === selectedFacility);
        const loggedUser = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || roleLabel,
          role: roleName,
          facility_id: selectedFacility,
          facility_name: activeFac?.name || 'Eagle Tech Medical Clinic',
          facility_logo: activeFac?.logo_url || null
        };
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    { name: 'receptionist', label: 'Alice (Receptionist)' },
    { name: 'nurse', label: 'Nurse Jane (Triage)' },
    { name: 'clinician', label: 'Dr. Arthur (Clinician)' },
    { name: 'lab_tech', label: 'Terry (Lab Technician)' },
    { name: 'pharmacist', label: 'Bob (Pharmacist)' },
    { name: 'cashier', label: 'Mary (Cashier/Billing)' },
    { name: 'admin', label: 'Grace (Admin)' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Back to Landing Page Button */}
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button
          onClick={onNavigateToLanding}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition font-semibold"
        >
          ← Back to Homepage
        </button>
      </div>

      {/* Header Banner */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/10">
          <Activity size={32} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase">EAGLE TECH</h1>
          <p className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">HMIS SOFTWARE SOLUTIONS</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Sandbox banner */}
        {isSandbox && (
          <div className="absolute top-0 left-0 right-0 bg-teal-500/10 border-b border-teal-500/20 text-teal-400 text-xs py-1.5 px-4 flex items-center justify-between">
            <span className="font-semibold">Local Sandbox Mode</span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 py-0.5 px-1.5 rounded uppercase">No Credentials Required</span>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-100 mb-1">Sign in to your account</h2>
          <p className="text-sm text-slate-400 mb-6">Select your facility/tenant and authenticate.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Facility Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Facility / Tenant
            </label>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              required
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.code})
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. clinician@egesa.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              required
            />
          </div>

          {/* Sign in Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-bold">Or continue with</span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm py-2.5 px-4 rounded-lg transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Sign In with Google</span>
        </button>

        {/* SaaS Hospital Registration Link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onNavigateToSaaS}
            className="text-[11px] font-semibold text-slate-400 hover:text-teal-400 transition"
          >
            Need Eagle Tech Hospital Management Systems for your hospital? <span className="text-teal-400 font-bold hover:underline">Register here</span>
          </button>
        </div>

        {/* Quick Credentials Seeder for Sandbox Mode */}
        {isSandbox && (
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle size={14} /> Sandbox Quick-Connect Roles
            </h3>
            <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
              Click any role below to bypass authentication and launch the corresponding workspace view directly:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickRoles.map((role) => (
                <button
                  key={role.name}
                  onClick={() => handleQuickLogin(role.name, role.label)}
                  disabled={loading}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs py-2 px-2.5 rounded-lg text-slate-300 hover:text-white transition active:scale-[0.97]"
                >
                  {role.label.split(' ')[0]} <span className="text-[10px] text-teal-500 block">{role.name.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
