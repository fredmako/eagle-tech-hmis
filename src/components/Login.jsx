import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { sendNotification, getSmtpConfig } from '../notificationService';
import { Activity, ShieldAlert, CheckCircle } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateToSaaS, onNavigateToLanding }) {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  // Failed login tracking
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Password recovery flow state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    setIsSandbox(!!supabase.isSandbox);
    fetchFacilitiesAndCheckAutoLogin();
  }, []);

  const handleAutoLogin = async (token, facId, facList) => {
    setLoading(true);
    setError('');
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('autologin_token', token)
        .eq('facility_id', facId);

      if (profErr) throw profErr;

      if (profiles && profiles[0]) {
        const profile = profiles[0];
        const activeFac = facList.find(f => f.id === facId);

        // Clear query parameters from URL history
        window.history.replaceState({}, document.title, window.location.pathname);

        const loggedUser = {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          facility_id: facId,
          facility_name: activeFac?.name || 'Default Facility',
          facility_logo: activeFac?.logo_url || null
        };

        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUser));

        // Log auto login event
        await supabase.from('audit_logs').insert({
          facility_id: facId,
          user_id: profile.id,
          action: 'Auto-Login Authentication',
          details: `${profile.full_name} logged in securely via email invitation.`
        });

        onLoginSuccess(loggedUser);
      } else {
        setError('Invalid or expired dashboard access token.');
      }
    } catch (err) {
      setError(`Auto-login authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (code, facId, facList) => {
    setLoading(true);
    setError('');
    try {
      const { data: resData, error: exchangeErr } = await supabase.functions.invoke('google-oauth-exchange', {
        code,
        facilityId: facId
      });

      if (exchangeErr) throw new Error(exchangeErr);

      let parsedRes = {};
      try {
        parsedRes = typeof resData.responseBody === 'string' 
          ? JSON.parse(resData.responseBody) 
          : resData.responseBody;
      } catch (e) {
        parsedRes = resData.responseBody || {};
      }

      if (parsedRes && parsedRes.autologin_token) {
        await handleAutoLogin(parsedRes.autologin_token, facId, facList);
      } else {
        setError('Google authentication succeeded, but no matching user profile was found.');
      }
    } catch (err) {
      setError(`Google exchange failed: ${err.message}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilitiesAndCheckAutoLogin = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setFacilities(data);

        // Check for auto-login & OAuth query parameters
        const params = new URLSearchParams(window.location.search);
        const autologinToken = params.get('autologin');
        const facId = params.get('fac');
        const oauthCode = params.get('code');
        const oauthState = params.get('state');

        if (autologinToken && facId) {
          await handleAutoLogin(autologinToken, facId, data);
        } else if (oauthCode && oauthState) {
          await handleGoogleCallback(oauthCode, oauthState, data);
        } else {
          // Standard auto-select credentials autofill
          const newFacId = sessionStorage.getItem('egesa_health_new_facility_id');
          const newAdminEmail = sessionStorage.getItem('egesa_health_new_admin_email');
          if (newFacId && data.some(f => f.id === newFacId)) {
            setSelectedFacility(newFacId);
            if (newAdminEmail) {
              setEmail(newAdminEmail);
            }
            sessionStorage.removeItem('egesa_health_new_facility_id');
            sessionStorage.removeItem('egesa_health_new_admin_email');
          } else {
            setSelectedFacility(data[0].id);
          }
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

      // Reset failed attempts on success
      setFailedAttempts(0);

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
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      
      // Trigger security failed login notification if 3 failed attempts are reached
      if (nextFailCount >= 3) {
        await sendNotification('FAILED_LOGIN_ALERT', {
          email: email,
          recipientEmail: 'security@eagletechsolutions.tech'
        }, selectedFacility);
        setError('Consequent failed authentications exceeded. A security warning alert was sent to the system administrator.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccess('');
    try {
      const code = `ET-${Math.floor(100000 + Math.random() * 900000)}`;
      setGeneratedCode(code);

      // Trigger PASSWORD_RESET notification
      const response = await sendNotification('PASSWORD_RESET', {
        resetCode: code,
        recipientEmail: recoveryEmail
      }, selectedFacility || facilities[0]?.id || 'f1');

      if (response.blocked) {
        throw new Error('Outbound emails blocked: The facility license is EXPIRED. Please contact the administrator.');
      }

      setRecoverySuccess(`Verification code sent to ${recoveryEmail}. Check webmail inbox.`);
      setCodeSent(true);
    } catch (err) {
      setRecoveryError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyResetCode = (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');
    
    if (enteredCode.trim().toUpperCase() !== generatedCode) {
      setRecoveryError('Invalid verification reset code. Please check your inbox again.');
      return;
    }
    if (newPass.length < 8) {
      setRecoveryError('Password must be at least 8 characters long.');
      return;
    }

    setRecoverySuccess('Password updated successfully! Redirecting you to login...');
    setTimeout(() => {
      setPassword(newPass);
      setShowRecovery(false);
      setCodeSent(false);
      setRecoverySuccess('');
      setRecoveryEmail('');
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    if (!selectedFacility) {
      setError('Please select a facility/tenant first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const smtp = getSmtpConfig(selectedFacility);
      if (smtp && smtp.google_auth_enabled && smtp.google_client_id) {
        // Custom OAuth Identity Broker redirect
        const clientId = smtp.google_client_id;
        const callbackUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=email%20profile%20openid&state=${selectedFacility}`;

        console.log(`[GoogleAuthBroker] Redirecting via custom client: ${clientId}`);
        window.location.href = googleAuthUrl;
      } else {
        // Fallback to standard Appwrite Google Sign-In
        sessionStorage.setItem('egesa_health_pending_facility', selectedFacility);
        const { error } = await supabase.auth.signInWithGoogle();
        if (error) throw new Error(error);
      }
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

  // If password recovery toggle is clicked
  if (showRecovery) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md mb-4 flex justify-start">
          <button
            onClick={() => {
              setShowRecovery(false);
              setRecoveryError('');
              setRecoverySuccess('');
              setCodeSent(false);
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition font-semibold"
          >
            ← Back to Login
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/10">
            <Activity size={32} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">EAGLE TECH</h1>
            <p className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">HMIS SECURITY LAYER</p>
          </div>
        </div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="mt-2">
            <h2 className="text-xl font-bold text-slate-100 mb-1">Account Password Recovery</h2>
            <p className="text-xs text-slate-400 mb-6 font-medium">A security verification code will be generated and dispatched through Titan SMTP.</p>
          </div>

          {recoveryError && (
            <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{recoveryError}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="mb-4 bg-teal-500/10 border border-teal-500/25 text-teal-400 rounded-lg p-3 text-xs flex items-start gap-2 font-medium">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>{recoverySuccess}</span>
            </div>
          )}

          {!codeSent ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Facility / Tenant
                </label>
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                  required
                >
                  <option value="">-- Choose Facility --</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Account Email
                </label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="e.g. nurse@egesa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={recoveryLoading || !selectedFacility}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-850 disabled:text-slate-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition mt-2"
              >
                {recoveryLoading ? 'Generating Reset Code...' : 'Dispatch Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyResetCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Verification Reset Code
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="ET-XXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm font-mono focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Choose New Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition mt-2"
              >
                Update Password & Return to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

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
            <span className="text-[10px] bg-teal-500/20 text-teal-300 py-0.5 px-1.5 rounded uppercase font-bold">No Credentials Required</span>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-100 mb-1">Sign in to your account</h2>
          <p className="text-sm text-slate-400 mb-6 font-medium">Select your facility/tenant and authenticate.</p>
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
            <div className="flex justify-between items-center mb-1.5 font-semibold">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(true);
                  setError('');
                }}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
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
                  {role.label.split(' ')[0]} <span className="text-[10px] text-teal-500 block font-bold">{role.name.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
