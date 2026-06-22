import React, { useState, useEffect } from 'react';
import PasswordRecovery from './login/PasswordRecovery';
import RoleRequestPending from './login/RoleRequestPending';
import RoleRequestForm from './login/RoleRequestForm';

import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { sendNotification, getSmtpConfig } from '../notificationService';
import { Activity, ShieldAlert, CheckCircle, UserPlus, Clock, LogOut, UserCheck, ShieldCheck, Heart, ChevronRight } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateToSaaS, onNavigateToLanding }) {
  const { login, signup, logout, submitRoleRequest, resolveTenant, acceptInvite, checkSession } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  // Dynamic tenant resolution and accept invitation states
  const [loginStage, setLoginStage] = useState('email_check'); // 'email_check', 'password_entry', 'oauth_entry', 'accept_invite', 'manual_select'
  const [resolvedTenant, setResolvedTenant] = useState(null);
  const [resolvedInvite, setResolvedInvite] = useState(null);
  const [selectableProfiles, setSelectableProfiles] = useState([]);

  const renderLogo = (logoUrl) => {
    if (!logoUrl) {
      return <img src="/logo.png" alt="Eagle Tech Logo" className="w-8 h-8 rounded-lg object-contain" />;
    }
    
    if (logoUrl.startsWith('preset:')) {
      const presetKey = logoUrl.split(':')[1];
      if (presetKey === 'shield') {
        return (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-1.5 rounded-lg">
            <ShieldCheck size={18} fill="currentColor" />
          </div>
        );
      }
      if (presetKey === 'cross') {
        return (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-1.5 rounded-lg">
            <Activity size={18} />
          </div>
        );
      }
      return (
        <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-1.5 rounded-lg">
          <Heart size={18} fill="currentColor" />
        </div>
      );
    }
    
    return (
      <img 
        src={logoUrl} 
        alt="Facility Logo" 
        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60';
        }}
      />
    );
  };
  
  // Accept invite fields
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

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

  // Self-service registration & role request states
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [hasNoProfile, setHasNoProfile] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [requestFacility, setRequestFacility] = useState('');
  const [requestRole, setRequestRole] = useState(['receptionist']);
  const [requestName, setRequestName] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

   const [isAdminAction, setIsAdminAction] = useState(false);

  useEffect(() => {
    setIsSandbox(!!supabase.isSandbox);
    fetchFacilitiesAndCheckAutoLogin();

    // Check if recovery link was clicked
    if (sessionStorage.getItem('egesa_health_recovery_active') === 'true') {
      setShowRecovery(true);
      setCodeSent(true); // Direct to Choose New Password view
    }

    // Check if URL parameters request super admin action
    const params = new URLSearchParams(window.location.search);
    if (params.get('action')) {
      setIsAdminAction(true);
    }
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
        if (checkSession) await checkSession();

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

  const handleSelectFacility = async (profile) => {
    setLoading(true);
    setError('');
    try {
      const sessionRes = await supabase.auth.getSession();
      const clientJwt = sessionRes?.data?.session?.access_token;
      if (!clientJwt) {
        throw new Error('Supabase session not found. Please log in again.');
      }

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${backendUrl}/auth/supabase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: clientJwt,
          facility_id: profile.facility_id
        })
      });

      const resData = await res.json();
      if (res.ok && resData.status === 'success') {
        localStorage.setItem('egesa_active_facility_id', profile.facility_id);
        localStorage.setItem('egesa_health_token', resData.token);
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(resData.user));
        if (checkSession) await checkSession();
        onLoginSuccess(resData.user);
      } else {
        setError(resData.error || 'Failed to authenticate with selected facility.');
      }
    } catch (err) {
      console.error('Error selecting facility:', err);
      setError(err.message || 'An error occurred during workspace selection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilitiesAndCheckAutoLogin = async () => {
    console.log('[Login:fetchFacilities] ▶ Loading facilities and checking auth state...');
    try {
      const { data, error } = await supabase.from('facilities').select('*');
      if (error) {
        console.error('[Login:fetchFacilities] ❌ Failed to fetch facilities:', error);
        throw error;
      }
      console.log('[Login:fetchFacilities] Facilities loaded:', data?.length || 0);
      if (data && data.length > 0) {
        setFacilities(data);

        // Check for active Supabase session (Google redirect callback)
        let supabaseUser = null;
        if (!supabase.isSandbox) {
          try {
            console.log('[Login:fetchFacilities] Checking for active Supabase session...');
            const userRes = await supabase.auth.getUser();
            supabaseUser = userRes?.data?.user;
            console.log('[Login:fetchFacilities] Supabase session user:', supabaseUser ? (supabaseUser.email || supabaseUser.id) : 'none');
          } catch (e) {
            console.log('[Login:fetchFacilities] No active Supabase session:', e.message);
          }
        } else {
          console.log('[Login:fetchFacilities] Sandbox mode — skipping Supabase session check.');
        }

        if (supabaseUser) {
          setLoading(true);
          try {
            console.log('[Login:fetchFacilities] Supabase user detected. Creating JWT for backend exchange...');
            const jwtRes = await supabase.auth.getSession();
            const clientJwt = jwtRes?.data?.session?.access_token;
            console.log('[Login:fetchFacilities] JWT created:', !!clientJwt);
            if (clientJwt) {
              const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              console.log('[Login:fetchFacilities] Sending JWT to backend:', `${backendUrl}/auth/supabase-login`);
              const res = await fetch(`${backendUrl}/auth/supabase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: clientJwt })
              });
              let resData;
              try {
                resData = await res.json();
              } catch (parseErr) {
                console.error('[Login:fetchFacilities] ❌ Failed to parse backend JWT response:', parseErr);
                setError('Authentication server returned an unexpected response. Please try again.');
                return;
              }
              console.log('[Login:fetchFacilities] Backend JWT response status:', res.status, '| Body:', resData);
              if (res.ok) {
                if (resData.status === 'success') {
                  console.log('[Login:fetchFacilities] ✅ JWT exchange successful! Logging in user:', resData.user?.email);
                  localStorage.setItem('egesa_health_token', resData.token);
                  sessionStorage.setItem('egesa_health_active_user', JSON.stringify(resData.user));
                  if (checkSession) await checkSession();
                  onLoginSuccess(resData.user);
                  return;
                } else if (resData.status === 'select_facility') {
                  console.log('[Login:fetchFacilities] Multiple facilities detected. Directing to selection screen.');
                  setSelectableProfiles(resData.profiles);
                  setLoginStage('select_facility');
                  return;
                } else if (resData.status === 'no_profile') {
                  console.warn('[Login:fetchFacilities] ⚠️ JWT exchange: no profile found for this Google account.');
                  if ((resData.user?.role && resData.user?.role !== 'staff') || (resData.user?.email && resData.user.email.toLowerCase().trim() === 'fredrickmakori102@gmail.com')) {
                    console.log('[Login:fetchFacilities] Bypass role request (user has assigned role). Redirecting to dashboard.');
                    onLoginSuccess(resData.user);
                    return;
                  }
                  if (sessionStorage.getItem('egesa_health_onboarding_redirect') === 'true') {
                    sessionStorage.removeItem('egesa_health_onboarding_redirect');
                    sessionStorage.setItem('egesa_health_onboarding_google_user', JSON.stringify(resData.user));
                    onNavigateToSaaS();
                    return;
                  }
                  setTempUser(resData.user);
                  setHasNoProfile(true);
                  setRequestName(resData.user.name || '');
                  if (data.length > 0) {
                    setRequestFacility(data[0].id);
                    setFacilitySearchQuery(`${data[0].name} (${data[0].code})`);
                  }
                  setPendingRequest(resData.pendingRequest || null);
                  return;
                } else {
                  console.error('[Login:fetchFacilities] ❌ Backend JWT exchange returned unknown status:', resData.status, resData);
                  setError(`Authentication error: ${resData.error || resData.status || 'Unknown server response'}`);
                }
              } else {
                console.error('[Login:fetchFacilities] ❌ Backend JWT exchange failed (HTTP', res.status, '):', resData);
                setError(`Authentication failed: ${resData?.error || 'Server error ' + res.status}`);
              }
            } else {
              console.error('[Login:fetchFacilities] ❌ createJWT returned no token. Full jwtRes:', jwtRes);
              setError('Could not obtain session token from authentication provider.');
            }
          } catch (err) {
            console.error('[Login:fetchFacilities] ❌ Supabase session exchange threw an error:', err.message, err);
            setError(`Google session exchange failed: ${err.message}`);
          } finally {
            setLoading(false);
          }
        }

        // Check for auto-login & OAuth query parameters
        const params = new URLSearchParams(window.location.search);
        const autologinToken = params.get('autologin');
        const facId = params.get('fac');
        const oauthCode = params.get('code');
        const oauthState = params.get('state');

        const inviteParam = params.get('invite');

        if (inviteParam) {
          console.log('[Login:fetchFacilities] Invite token detected:', inviteParam);
          await handleResolveInviteToken(inviteParam);
        } else if (autologinToken && facId) {
          console.log('[Login:fetchFacilities] Auto-login token detected. Processing...');
          await handleAutoLogin(autologinToken, facId, data);
        } else if (oauthCode && oauthState) {
          console.log('[Login:fetchFacilities] OAuth callback code detected. Processing exchange...');
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
      } else {
        console.warn('[Login:fetchFacilities] ⚠️ No facilities returned from server. Check DB or server connection.');
        setError('No facilities found. The system may not be configured yet.');
      }
    } catch (err) {
      console.error('[Login:fetchFacilities] ❌ Error fetching facilities:', err.message, err);
      setError(`Failed to load facilities: ${err.message}`);
    }
  };

  const handleResolveEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('[Login:handleResolveEmail] Dispatched resolveTenant for:', email);
      const res = await resolveTenant(email);
      console.log('[Login:handleResolveEmail] resolved:', res.resolved, 'type:', res.type);
      if (res.resolved) {
        setResolvedTenant(res.tenant);
        setSelectedFacility(res.tenant.id);
        if (res.type === 'login') {
          if (res.tenant.auth_method === 'google_oauth') {
            setLoginStage('oauth_entry');
          } else {
            setLoginStage('password_entry');
          }
        } else if (res.type === 'invite') {
          setResolvedInvite(res.invitation);
          setInviteName('');
          setInvitePassword('');
          setLoginStage('accept_invite');
        }
      } else {
        setError('No account or invitation found for this email. Please select your facility manually or check with your administrator.');
        setLoginStage('manual_select');
      }
    } catch (err) {
      console.error('[Login:handleResolveEmail] Failed resolution:', err.message);
      setError(err.message || 'Tenant resolution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveInviteToken = async (token) => {
    setLoading(true);
    setError('');
    try {
      console.log('[Login:handleResolveInviteToken] Resolving invitation token:', token);
      const res = await resolveTenant(email, token);
      if (res.resolved && res.type === 'invite') {
        console.log('[Login:handleResolveInviteToken] Invitation token valid. Redirecting to Accept Invite panel.');
        setResolvedTenant(res.tenant);
        setSelectedFacility(res.tenant.id);
        setResolvedInvite(res.invitation);
        setEmail(res.invitation.email);
        setInviteName('');
        setInvitePassword('');
        setLoginStage('accept_invite');
      } else {
        setError(res.message || 'The invitation link is invalid or has expired.');
        setLoginStage('email_check');
      }
    } catch (err) {
      console.error('[Login:handleResolveInviteToken] Error:', err.message);
      setError(err.message || 'Failed to resolve invitation link.');
      setLoginStage('email_check');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteName || !invitePassword) {
      setError('Please provide your name and choose a secure password.');
      return;
    }
    if (invitePassword.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('[Login:handleAcceptInviteSubmit] Dispatching acceptInvite with token:', resolvedInvite.token);
      const res = await acceptInvite(resolvedInvite.token, invitePassword, inviteName);
      setInviteSuccess('Invitation accepted successfully! Redirecting...');
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        onLoginSuccess(res.user);
      }, 1500);
    } catch (err) {
      console.error('[Login:handleAcceptInviteSubmit] Failed accepting invite:', err.message);
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedFacility && email.toLowerCase().trim() !== 'fredrickmakori102@gmail.com') {
      setError('Please select a facility/tenant first.');
      return;
    }

    setLoading(true);
    setError('');
    console.log('[Login:handleLogin] ▶ Login button clicked. Email:', email, '| Facility:', selectedFacility);

    try {
      const result = await login(email, password);
      console.log('[Login:handleLogin] login() resolved with status:', result?.status);
      // Reset failed attempts on success
      setFailedAttempts(0);

      if (result.status === 'select_facility') {
        console.log('[Login:handleLogin] Multiple facilities detected. Directing to selection screen.');
        setSelectableProfiles(result.profiles);
        setLoginStage('select_facility');
      } else if (result.status === 'no_profile') {
        if ((result.user?.role && result.user?.role !== 'staff') || email.toLowerCase().trim() === 'fredrickmakori102@gmail.com' || (result.user?.email && result.user.email.toLowerCase().trim() === 'fredrickmakori102@gmail.com')) {
          console.log('[Login:handleLogin] Bypass role request (user has assigned role). Redirecting to dashboard.');
          onLoginSuccess(result.user);
          return;
        }
        console.warn('[Login:handleLogin] User has no profile. Showing role request form.');
        setTempUser(result.user);
        setHasNoProfile(true);
        setRequestName(result.user.name || '');
        if (facilities.length > 0) {
          setRequestFacility(facilities[0].id);
        }
        setPendingRequest(result.pendingRequest || null);
      } else if (result.status === 'success') {
        console.log('[Login:handleLogin] ✅ Login success! Navigating to dashboard for:', result.user?.email || result.user?.id);
        onLoginSuccess(result.user);
      } else {
        console.error('[Login:handleLogin] ❌ Unexpected result status:', result);
        setError('Unexpected authentication response. Please contact support.');
      }
    } catch (err) {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      console.error(`[Login:handleLogin] ❌ Login failed (attempt ${nextFailCount}):`, err.message, err);
      
      // Trigger security failed login notification if 3 failed attempts are reached
      if (nextFailCount >= 3) {
        console.warn('[Login:handleLogin] 3+ failed attempts — sending security alert...');
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
      console.log('[Login:handleLogin] Loading state cleared.');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }
    if (signUpPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup(signUpEmail, signUpPassword, signUpName);

      // Auto login user after signing up
      const result = await login(signUpEmail, signUpPassword);

      if (result.status === 'no_profile') {
        if ((result.user?.role && result.user?.role !== 'staff') || signUpEmail.toLowerCase().trim() === 'fredrickmakori102@gmail.com') {
          console.log('[Login:handleSignUp] Bypass role request (user has assigned role). Redirecting to dashboard.');
          onLoginSuccess(result.user);
          return;
        }
        setTempUser(result.user);
        setHasNoProfile(true);
        setRequestName(signUpName);
        if (facilities.length > 0) {
          setRequestFacility(facilities[0].id);
        }
        setPendingRequest(null);
        setIsSignUp(false); // reset form view
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Check details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestFacility || !requestRole || !requestName.trim() || !tempUser) {
      setError('Please fill in all request fields.');
      return;
    }

    setLoading(true);
    setError('');
    setRequestSuccess('');

    try {
      const newRequest = await submitRoleRequest(
        tempUser.id,
        requestName.trim(),
        tempUser.email,
        requestFacility,
        Array.isArray(requestRole) ? requestRole.join(',') : requestRole
      );

      setPendingRequest(newRequest);
      setRequestSuccess('Operational role request successfully submitted! Pending administrator approval.');
    } catch (err) {
      setError(err.message || 'Failed to submit role request.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutRequestScreen = async () => {
    setLoading(true);
    try {
      logout();
      // Clear session states
      setTempUser(null);
      setHasNoProfile(false);
      setPendingRequest(null);
      setRequestName('');
      setRequestSuccess('');
      setFacilitySearchQuery('');
      setError('');
    } catch (err) {
      console.error('Logout error:', err);
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
      if (!supabase.isSandbox) {
        // Real Supabase native reset password flow
        const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`
        });
        if (error) throw error;

        setRecoverySuccess(`Password reset link sent to ${recoveryEmail}. Please check your email inbox.`);
      } else {
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
      }
    } catch (err) {
      setRecoveryError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');
    
    if (supabase.isSandbox) {
      if (enteredCode.trim().toUpperCase() !== generatedCode) {
        setRecoveryError('Invalid verification reset code. Please check your inbox again.');
        return;
      }
    }
    if (newPass.length < 8) {
      setRecoveryError('Password must be at least 8 characters long.');
      return;
    }

    if (!supabase.isSandbox) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;

        sessionStorage.removeItem('egesa_health_recovery_active');
        // Auto-check session to log user in immediately
        if (checkSession) await checkSession();
      } catch (err) {
        setRecoveryError(err.message || 'Failed to update password in Supabase.');
        return;
      }
    }

    setRecoverySuccess('Password updated successfully! Redirecting you to login...');
    setTimeout(() => {
      setPassword(newPass);
      setShowRecovery(false);
      setCodeSent(false);
      setRecoverySuccess('');
      setRecoveryEmail('');
      setEnteredCode('');
      setNewPass('');
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
      if (supabase.isSandbox) {
        const activeFac = facilities.find(f => f.id === selectedFacility) || facilities[0];
        const loggedUser = {
          id: 'u_mock_google_admin',
          full_name: 'Google Admin',
          role: 'admin',
          facility_id: selectedFacility,
          facility_name: activeFac?.name || 'Default Facility',
          facility_logo: activeFac?.logo_url || null
        };
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUser));
        if (checkSession) await checkSession();
        onLoginSuccess(loggedUser);
        setLoading(false);
        return;
      } else {
        // Link directly to Supabase Google Sign-In
        sessionStorage.setItem('egesa_health_pending_facility', selectedFacility);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Google Login failed.');
      setLoading(false);
    }
  };

  const handleGoogleGlobalLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (supabase.isSandbox) {
        // In sandbox, simulate a choice: does the profile exist?
        const simulateExists = window.confirm(
          "Sandbox Mock Google Login:\n\nClick [OK] to simulate a user WITH an existing facility profile.\nClick [Cancel] to simulate a user WITHOUT a facility profile (Request Access flow)."
        );
        
        if (simulateExists) {
          // Case 1: profile exists
          const activeFac = facilities[0];
          const loggedUser = {
            id: 'u_mock_google_user',
            email: 'google.user@egesa.com',
            full_name: 'Google Sandbox User',
            role: 'clinician',
            facility_id: activeFac?.id,
            facility_name: activeFac?.name || 'Default Facility',
            facility_logo: activeFac?.logo_url || null
          };
          sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUser));
          if (checkSession) await checkSession();
          onLoginSuccess(loggedUser);
        } else {
          // Case 2: profile does not exist (no profile request access flow)
          const mockUser = {
            id: 'u_mock_google_user_new',
            email: 'new.google.user@egesa.com',
            name: 'New Google User'
          };
          setTempUser(mockUser);
          setHasNoProfile(true);
          setRequestName(mockUser.name);
          if (facilities.length > 0) {
            setRequestFacility(facilities[0].id);
            setFacilitySearchQuery(`${facilities[0].name} (${facilities[0].code})`);
          }
          setPendingRequest(null);
        }
        setLoading(false);
        return;
      } else {
        sessionStorage.setItem('egesa_health_google_global_login', 'true');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Google Login failed.');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      if (supabase.isSandbox) {
        // Sandbox mock Google sign up: immediately log in as temp Google user
        const mockUser = {
          id: 'u_mock_google_signup',
          email: 'google.staff@egesa.com',
          name: 'Google Staff User'
        };
        setTempUser(mockUser);
        setHasNoProfile(true);
        setRequestName(mockUser.name);
        if (facilities.length > 0) {
          setRequestFacility(facilities[0].id);
          setFacilitySearchQuery(`${facilities[0].name} (${facilities[0].code})`);
        }
        setPendingRequest(null);
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Google Sign-up failed.');
      setLoading(false);
    }
  };




  // If password recovery toggle is clicked
  if (showRecovery) {
    return (
      <PasswordRecovery
        isSandbox={isSandbox}
        selectedFacility={selectedFacility}
        setSelectedFacility={setSelectedFacility}
        facilities={facilities}
        recoveryEmail={recoveryEmail}
        setRecoveryEmail={setRecoveryEmail}
        recoveryLoading={recoveryLoading}
        recoveryError={recoveryError}
        setRecoveryError={setRecoveryError}
        recoverySuccess={recoverySuccess}
        setRecoverySuccess={setRecoverySuccess}
        codeSent={codeSent}
        setCodeSent={setCodeSent}
        setShowRecovery={setShowRecovery}
        handleRequestCode={handleRequestCode}
        handleVerifyResetCode={handleVerifyResetCode}
        enteredCode={enteredCode}
        setEnteredCode={setEnteredCode}
        newPass={newPass}
        setNewPass={setNewPass}
      />
    );
  }

  // If user is authenticated but has no profile, render role request forms
  if (hasNoProfile) {
    const filteredFacilities = facilities.filter(fac => 
      fac.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
      fac.code.toLowerCase().includes(facilitySearchQuery.toLowerCase())
    );

    if (pendingRequest) {
      return (
        <RoleRequestPending
          pendingRequest={pendingRequest}
          facilities={facilities}
          handleLogoutRequestScreen={handleLogoutRequestScreen}
          loading={loading}
        />
      );
    } else {
      return (
        <RoleRequestForm
          facilities={facilities}
          facilitySearchQuery={facilitySearchQuery}
          setFacilitySearchQuery={setFacilitySearchQuery}
          isSearchDropdownOpen={isSearchDropdownOpen}
          setIsSearchDropdownOpen={setIsSearchDropdownOpen}
          filteredFacilities={filteredFacilities}
          requestRole={requestRole}
          setRequestRole={setRequestRole}
          requestName={requestName}
          setRequestName={setRequestName}
          error={error}
          requestSuccess={requestSuccess}
          handleRoleRequestSubmit={handleRoleRequestSubmit}
          handleLogoutRequestScreen={handleLogoutRequestScreen}
          loading={loading}
          setRequestFacility={setRequestFacility}
        />
      );
    }
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
      <div className="flex flex-col items-center mb-6">
        <img src="/logo.png" alt="Eagle Tech Logo" className="h-28 object-contain" />
        <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase mt-2">HMIS SOFTWARE SOLUTIONS</span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Sandbox banner */}
        {isSandbox && (
          <div className="absolute top-0 left-0 right-0 bg-teal-500/10 border-b border-teal-500/20 text-teal-400 text-xs py-1.5 px-4 flex items-center justify-between">
            <span className="font-semibold">Local Sandbox Mode</span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 py-0.5 px-1.5 rounded uppercase font-bold">No Credentials Required</span>
          </div>
        )}

        {!isSignUp ? (
          <>
            {isAdminAction && (
              <div className="mb-4 mt-4 bg-teal-500/5 border border-teal-500/25 text-teal-400 rounded-lg p-3.5 text-xs flex items-start gap-2.5 animate-pulse font-sans">
                <UserCheck size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider">Super Admin Action Detected</span>
                  <span className="text-slate-300 font-medium">Please sign in as the Super Admin (<strong>fredrickmakori102@gmail.com</strong>) to complete the verification action.</span>
                </div>
              </div>
            )}

            {loginStage === 'email_check' && (
              <form onSubmit={handleResolveEmail} className="space-y-4 mt-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 mb-1">Sign in to your account</h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Enter your account email to resolve your clinical workspace.</p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 active:scale-[0.98] transition mt-2 disabled:opacity-50"
                >
                  {loading ? 'Resolving workspace...' : 'Continue'}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-3 text-slate-500 font-bold">Or continue with</span>
                  </div>
                </div>

                {/* Continue with Google button */}
                <button
                  type="button"
                  onClick={handleGoogleGlobalLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-805 border border-slate-800 text-slate-200 font-semibold text-sm py-2.5 px-4 rounded-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginStage('manual_select');
                      if (facilities.length > 0) setSelectedFacility(facilities[0].id);
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold hover:underline cursor-pointer"
                  >
                    Or select hospital manually
                  </button>
                </div>
              </form>
            )}

            {loginStage === 'password_entry' && (
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                {/* Resolved Tenant Branding Header */}
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 mb-2">
                  <div className="shrink-0">
                    {renderLogo(resolvedTenant?.logo_url)}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Resolved Facility</span>
                    <span className="text-xs font-bold text-white block truncate">{resolvedTenant?.name}</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-1">Enter password</h2>
                  <p className="text-xs text-slate-400">Authenticated email: <strong className="text-slate-200">{email}</strong></p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    required
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginStage('email_check');
                    }}
                    className="w-1/3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-sm py-2.5 px-4 rounded-lg active:scale-[0.98] transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}

            {loginStage === 'oauth_entry' && (
              <div className="space-y-4 mt-4">
                {/* Resolved Tenant Branding Header */}
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 mb-2">
                  <div className="shrink-0">
                    {renderLogo(resolvedTenant?.logo_url)}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Resolved Facility</span>
                    <span className="text-xs font-bold text-white block truncate">{resolvedTenant?.name}</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-1">Single Sign-On (SSO)</h2>
                  <p className="text-xs text-slate-400">This workspace is configured with Google authentication. Dispatched email: <strong className="text-slate-200">{email}</strong></p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm py-2.5 px-4 rounded-lg transition active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>SSO Google Sign In</span>
                </button>

                <button
                  onClick={() => {
                    setError('');
                    setLoginStage('email_check');
                  }}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-450 font-semibold text-xs py-2 rounded-lg transition"
                >
                  Change Email
                </button>
              </div>
            )}

            {loginStage === 'accept_invite' && (
              <form onSubmit={handleAcceptInviteSubmit} className="space-y-4 mt-4 font-sans">
                {/* Resolved Tenant Branding Header */}
                <div className="bg-slate-955 border border-slate-900 p-3 rounded-xl flex items-center gap-3 mb-2">
                  <div className="shrink-0">
                    {renderLogo(resolvedTenant?.logo_url)}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Staff invitation resolved</span>
                    <span className="text-xs font-bold text-white block truncate">{resolvedTenant?.name}</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-1">Set Up Your Profile</h2>
                  <p className="text-xs text-slate-400">Invited to join as <strong className="text-teal-400 uppercase font-mono">{resolvedInvite?.role}</strong> in <strong className="text-teal-400 uppercase font-mono">{resolvedInvite?.department}</strong>.</p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg p-3 text-xs flex items-start gap-2 font-medium">
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Conan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-lg py-2.5 px-3 text-slate-500 text-xs focus:outline-none cursor-not-allowed"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Choose A Secure Password (Min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 rounded-lg active:scale-[0.98] transition shadow-lg shadow-teal-500/10"
                >
                  {loading ? 'Provisioning Profile...' : 'Accept Invite & Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginStage('email_check');
                  }}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 font-semibold text-xs py-2 rounded-lg transition"
                >
                  Cancel / Use Different Email
                </button>
              </form>
            )}

            {loginStage === 'manual_select' && (
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 mb-1">Sign in to your account</h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Select your facility/tenant and authenticate.</p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2">
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

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

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginStage('email_check');
                    }}
                    className="w-1/3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-sm py-2.5 px-4 rounded-lg active:scale-[0.98] transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition disabled:opacity-50 mt-0"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </div>

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
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm py-2.5 px-4 rounded-lg transition active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              </form>
            )}

            {loginStage === 'select_facility' && (
              <div className="space-y-4 mt-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 mb-1">Select Hospital Workspace</h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Your account is associated with multiple workspaces. Please select one to log in.</p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2">
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {selectableProfiles.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFacility(p)}
                      disabled={loading}
                      className="w-full text-left bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition duration-200 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {renderLogo(p.logo_url || 'preset:cross')}
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 group-hover:text-teal-400 transition">{p.facility_name}</h4>
                          <span className="text-xs text-slate-500 font-medium">Role: {p.role} {p.department ? `(${p.department})` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-teal-400 font-bold bg-teal-500/10 border border-teal-500/25 px-2 py-0.5 rounded">
                          {p.facility_code}
                        </span>
                        <ChevronRight size={16} className="text-slate-500 group-hover:text-teal-400 transition transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginStage('email_check');
                  }}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-sm py-2.5 px-4 rounded-lg active:scale-[0.98] transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Toggle to Sign Up */}
            {loginStage !== 'accept_invite' && loginStage !== 'select_facility' && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                  className="text-[11px] font-semibold text-slate-450 hover:text-teal-400 transition"
                >
                  Need a staff account? <span className="text-teal-400 font-bold hover:underline">Sign up here</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mt-4">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Create your staff account</h2>
              <p className="text-sm text-slate-400 mb-6 font-medium">Sign up here to request access to your facility.</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Nurse Florence"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="e.g. staff@hospital.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Choose Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  required
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? 'Creating Account...' : 'Sign Up & Request Role'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-bold">Or register with</span>
              </div>
            </div>

            {/* Google Registration Button */}
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm py-2.5 px-4 rounded-lg transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mb-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Sign Up with Google</span>
            </button>

            {/* Toggle back to Sign In */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                }}
                className="text-[11px] font-semibold text-slate-450 hover:text-teal-400 transition"
              >
                Already have an account? <span className="text-teal-400 font-bold hover:underline">Sign in instead</span>
              </button>
            </div>
          </>
        )}

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


      </div>
    </div>
  );
}
