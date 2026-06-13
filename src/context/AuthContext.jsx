import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('egesa_health_token');
    console.log('[AuthContext:checkSession] Token present:', !!token);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('[AuthContext:checkSession] Verifying token with backend:', `${API_URL}/auth/me`);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log('[AuthContext:checkSession] Response status:', res.status, '| Body:', data);
      if (res.ok && data.user) {
        console.log('[AuthContext:checkSession] ✅ Session valid — user:', data.user.email || data.user.id);
        setUser(data.user);
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(data.user));
      } else {
        console.warn('[AuthContext:checkSession] ⚠️ Token rejected by server:', data);
        // Token invalid or expired
        logout();
      }
    } catch (err) {
      console.warn('[AuthContext:checkSession] ❌ Network error during session check:', err.message);
      // Network issues - fallback to storage if available to keep offline usability
      const localUser = sessionStorage.getItem('egesa_health_active_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          console.log('[AuthContext:checkSession] Using cached local user fallback:', parsed.email || parsed.id);
          setUser(parsed);
        } catch (e) { console.error('[AuthContext:checkSession] Failed to parse cached user:', e); }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError('');
    setLoading(true);
    console.log('[AuthContext:login] ▶ Attempting login for:', email);
    console.log('[AuthContext:login] API endpoint:', `${API_URL}/auth/login`);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error('[AuthContext:login] ❌ Failed to parse response JSON:', parseErr);
        throw new Error(`Server returned non-JSON response (status ${res.status})`);
      }
      console.log('[AuthContext:login] Response status:', res.status, '| Body:', data);
      
      if (!res.ok) {
        const errMsg = data?.error || data?.message || `Authentication failed (HTTP ${res.status})`;
        console.error('[AuthContext:login] ❌ Server rejected login:', errMsg);
        throw new Error(errMsg);
      }

      if (data.status === 'no_profile') {
        console.warn('[AuthContext:login] ⚠️ User authenticated but has no facility profile. Returning no_profile status.');
        setLoading(false);
        return {
          status: 'no_profile',
          user: data.user,
          pendingRequest: data.pendingRequest
        };
      }

      if (!data.token) {
        console.error('[AuthContext:login] ❌ Login response missing token field! Full response:', data);
        throw new Error('Server response missing authentication token.');
      }

      console.log('[AuthContext:login] ✅ Login successful. User:', data.user?.email || data.user?.id);
      localStorage.setItem('egesa_health_token', data.token);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(data.user));
      setUser(data.user);
      setLoading(false);
      return { status: 'success', user: data.user };
    } catch (err) {
      console.error('[AuthContext:login] ❌ Login error caught:', err.message, err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const signup = async (email, password, name) => {
    setError('');
    setLoading(true);
    console.log('[AuthContext:signup] ▶ Attempting signup for:', email);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error('[AuthContext:signup] ❌ Failed to parse response JSON:', parseErr);
        throw new Error(`Server returned non-JSON response (status ${res.status})`);
      }
      console.log('[AuthContext:signup] Response status:', res.status, '| Body:', data);
      
      if (!res.ok) {
        const errMsg = data?.error || data?.message || `Registration failed (HTTP ${res.status})`;
        console.error('[AuthContext:signup] ❌ Server rejected signup:', errMsg);
        throw new Error(errMsg);
      }
      
      console.log('[AuthContext:signup] ✅ Signup successful for:', email);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[AuthContext:signup] ❌ Signup error:', err.message, err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('egesa_health_token');
    sessionStorage.removeItem('egesa_health_active_user');
    setUser(null);
    setError('');
  };

  const submitRoleRequest = async (userId, fullName, email, facilityId, requestedRole) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/role-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          full_name: fullName,
          email,
          facility_id: facilityId,
          requested_role: requestedRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request submission failed');
      }
      setLoading(false);
      return data.request;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const resolveTenant = async (email) => {
    setError('');
    console.log('[AuthContext:resolveTenant] Resolving tenant for email:', email);
    try {
      const res = await fetch(`${API_URL}/auth/resolve-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve tenant');
      return data;
    } catch (err) {
      console.error('[AuthContext:resolveTenant] Error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const inviteStaff = async (email, role, department) => {
    setError('');
    console.log('[AuthContext:inviteStaff] Sending invitation to:', email, 'role:', role, 'dept:', department);
    try {
      const res = await authFetch('/auth/invite-staff', {
        method: 'POST',
        body: JSON.stringify({ email, role, department })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send staff invitation');
      return data;
    } catch (err) {
      console.error('[AuthContext:inviteStaff] Error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const acceptInvite = async (token, password, name) => {
    setError('');
    console.log('[AuthContext:acceptInvite] Accepting invitation with token:', token);
    try {
      const res = await fetch(`${API_URL}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation');
      
      console.log('[AuthContext:acceptInvite] Accept invite successful. Logging in user...');
      localStorage.setItem('egesa_health_token', data.token);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (err) {
      console.error('[AuthContext:acceptInvite] Error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const getInvitations = async () => {
    try {
      const res = await authFetch('/auth/invitations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invitations');
      return data.invitations || [];
    } catch (err) {
      console.error('[AuthContext:getInvitations] Error:', err.message);
      throw err;
    }
  };

  const revokeInvite = async (inviteId) => {
    try {
      const res = await authFetch('/auth/revoke-invite', {
        method: 'POST',
        body: JSON.stringify({ invite_id: inviteId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke invitation');
      return data;
    } catch (err) {
      console.error('[AuthContext:revokeInvite] Error:', err.message);
      throw err;
    }
  };

  // Authenticated fetch wrapper for backend calls
  const authFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('egesa_health_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, submitRoleRequest, authFetch, resolveTenant, inviteStaff, acceptInvite, getInvitations, revokeInvite }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
