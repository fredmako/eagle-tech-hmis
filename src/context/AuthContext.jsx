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
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(data.user));
      } else {
        // Token invalid or expired
        logout();
      }
    } catch (err) {
      console.warn('Session verification failed, using local fallback:', err);
      // Network issues - fallback to storage if available to keep offline usability
      const localUser = sessionStorage.getItem('egesa_health_active_user');
      if (localUser) {
        try {
          setUser(JSON.parse(localUser));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.status === 'no_profile') {
        setLoading(false);
        return {
          status: 'no_profile',
          user: data.user,
          pendingRequest: data.pendingRequest
        };
      }

      localStorage.setItem('egesa_health_token', data.token);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(data.user));
      setUser(data.user);
      setLoading(false);
      return { status: 'success', user: data.user };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const signup = async (email, password, name) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      setLoading(false);
      return data;
    } catch (err) {
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
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, submitRoleRequest, authFetch }}>
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
