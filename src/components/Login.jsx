import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Activity, ShieldAlert, CheckCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
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
        setSelectedFacility(data[0].id);
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
        const loggedUser = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || profile?.full_name || 'Healthcare Worker',
          role: data.user.user_metadata?.role || profile?.role || 'admin',
          facility_id: selectedFacility,
          facility_name: facilities.find(f => f.id === selectedFacility)?.name || 'Default Facility'
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
        const loggedUser = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || roleLabel,
          role: roleName,
          facility_id: selectedFacility,
          facility_name: facilities.find(f => f.id === selectedFacility)?.name || 'Egesa Medical Clinic'
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
      {/* Header Banner */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-teal-500 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
          <Activity size={32} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">EGESA HEALTH</h1>
          <p className="text-xs text-teal-400 font-semibold tracking-wider uppercase">MOH Daily Patient Register</p>
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
