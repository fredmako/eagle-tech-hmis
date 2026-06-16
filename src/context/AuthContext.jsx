import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

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
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      console.log('[AuthContext:checkSession] Supabase session check:', session?.user?.email || 'no session');
      
      if (sessionErr) throw sessionErr;
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if sessionStorage already has the enriched user details (like facility_id or specific roles)
      const storedUser = sessionStorage.getItem('egesa_health_active_user');
      let userData = null;
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.email === session.user.email) {
            userData = parsed;
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (!userData) {
        userData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          role: session.user.user_metadata?.role || 'staff'
        };
      }
      
      console.log('[AuthContext:checkSession] ✅ Session valid:', userData.email);
      setUser(userData);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(userData));
    } catch (err) {
      console.warn('[AuthContext:checkSession] ❌ Session check failed:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError('');
    setLoading(true);
    console.log('[AuthContext:login] ▶ Attempting login with Supabase:', email);
    try {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authErr) throw authErr;
      if (!authUser) throw new Error('Login failed: no user returned');

      const userData = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email,
        role: authUser.user_metadata?.role || 'staff'
      };

      console.log('[AuthContext:login] ✅ Login successful:', userData.email);
      setUser(userData);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(userData));
      setLoading(false);
      return { status: 'success', user: userData };
    } catch (err) {
      console.error('[AuthContext:login] ❌ Login error:', err.message);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const signup = async (email, password, name) => {
    setError('');
    setLoading(true);
    console.log('[AuthContext:signup] ▶ Attempting signup with Supabase:', email);
    try {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (authErr) throw authErr;
      if (!authUser) throw new Error('Signup failed: no user returned');

      console.log('[AuthContext:signup] ✅ Signup successful:', email);
      setLoading(false);
      return { user: authUser };
    } catch (err) {
      console.error('[AuthContext:signup] ❌ Signup error:', err.message);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err.message);
    }
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
