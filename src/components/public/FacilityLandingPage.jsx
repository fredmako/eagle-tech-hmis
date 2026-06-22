import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { PhoneCall, DollarSign, Calendar, ShieldCheck, ArrowRight, UserPlus, LogIn, Award, MapPin } from 'lucide-react';

export default function FacilityLandingPage() {
  const hostnameParts = window.location.hostname.split('.');
  const isSubdomain = hostnameParts.length > 2 && hostnameParts[0] !== 'www' && !window.location.hostname.includes('localhost') && !window.location.hostname.match(/^[0-9.]+$/);
  
  let subdomain = null;
  if (isSubdomain) {
    subdomain = hostnameParts[0];
  } else {
    const pathParts = window.location.pathname.split('/');
    const hospitalIndex = pathParts.indexOf('hospital');
    subdomain = hospitalIndex !== -1 && pathParts[hospitalIndex + 1] ? pathParts[hospitalIndex + 1] : null;
  }
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  // Patient Login & Register Card States
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('female');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Support / Inquiry Form States
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('General Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState('');
  const [supportError, setSupportError] = useState('');

  useEffect(() => {
    fetchFacilityDetails();
  }, [subdomain]);

  const fetchFacilityDetails = async () => {
    setLoading(true);
    try {
      let query = supabase.from('facilities').select('*');
      if (subdomain) {
        query = query.eq('subdomain_prefix', subdomain);
      } else {
        query = query.eq('id', 'f1'); // Default to Egesa Medical Clinic
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setFacility(data[0]);
      } else {
        // Fallback default
        const { data: fallback } = await supabase.from('facilities').select('*').eq('id', 'f1');
        if (fallback) setFacility(fallback[0]);
      }
    } catch (err) {
      console.error('Error fetching landing details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed.');

      localStorage.setItem('egesa_health_token', body.token);
      localStorage.setItem('egesa_health_user', JSON.stringify(body.user));

      setAuthSuccess('Redirecting to Patient Portal...');
      setTimeout(() => {
        window.location.href = '/patient-portal';
      }, 1000);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    // Input Buffers Validation
    const todayStr = new Date().toISOString().split('T')[0];
    if (dob > todayStr || dob < '1900-01-01') {
      setAuthError('Please enter a realistic Date of Birth.');
      setAuthLoading(false);
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/patient/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          dob,
          gender,
          facilityId: facility.id,
          phone
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Signup failed.');

      setAuthSuccess('Account created successfully! Logging you in...');
      
      // Auto Login
      const loginRes = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const loginBody = await loginRes.json();
      localStorage.setItem('egesa_health_token', loginBody.token);
      localStorage.setItem('egesa_health_user', JSON.stringify(loginBody.user));

      setTimeout(() => {
        window.location.href = '/patient-portal';
      }, 1000);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;

    setSupportLoading(true);
    setSupportError('');
    setSupportSuccess('');

    try {
      const ticketId = 'ticket_' + Math.random().toString(36).substring(2, 12);
      const newTicket = {
        id: ticketId,
        user_name: supportName.trim(),
        user_email: supportEmail.trim(),
        subject: supportSubject,
        message: supportMessage.trim(),
        status: 'pending',
        facility_id: facility.id
      };

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // 1. Save support ticket in DB proxy
      const dbRes = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'support_tickets',
          rows: newTicket
        })
      });

      if (!dbRes.ok) {
        const errorData = await dbRes.json();
        throw new Error(errorData.error || 'Failed to submit support ticket.');
      }

      // 2. Dispatch Automated Email Confirmation
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: supportEmail.trim(),
            subject: `Inquiry Received: [#${ticketId.substring(7, 13)}] - ${supportSubject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Help Desk Inquiry Received</h2>
                <p>Hello <strong>${supportName}</strong>,</p>
                <p>Thank you for contacting <strong>${facility.name}</strong>. We have received your inquiry and our hospital administration team is reviewing it.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 4px;">
                  <strong>Ticket Reference:</strong> #${ticketId.substring(7, 13)}<br/>
                  <strong>Subject:</strong> ${supportSubject}<br/>
                  <strong>Message:</strong><br/>
                  <p style="color: #475569; font-style: italic; margin-top: 5px;">"${supportMessage.trim()}"</p>
                </div>
                <p>We will get back to you as soon as possible.</p>
                <p>Thank you,</p>
                <p><strong>${facility.name} Team</strong></p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error('Email dispatch failed:', emailErr);
      }

      setSupportSuccess(`Inquiry submitted successfully! Reference: #${ticketId.substring(7, 13)}`);
      setSupportName('');
      setSupportEmail('');
      setSupportSubject('General Inquiry');
      setSupportMessage('');
    } catch (err) {
      setSupportError(err.message);
    } finally {
      setSupportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
          <p className="text-xs font-bold uppercase tracking-wider">Loading Hospital Landing Page...</p>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="text-xs font-bold uppercase">Hospital Facility Not Found</p>
      </div>
    );
  }

  // Group services by category
  const services = facility.services_list || [];
  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 relative font-sans">
      
      {/* Top Navigation Banner */}
      <header className="bg-slate-900/60 backdrop-blur border-b border-slate-900 py-3 px-6 shrink-0 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
            <Award className="text-teal-400" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">{facility.name}</h1>
            <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest block">{facility.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-slate-400 flex items-center gap-1"><MapPin size={13} /> {facility.address}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Left 2 Cols: Services catalog and info */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Welcome Card */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
            <h2 className="text-xl font-black text-white font-sans tracking-tight">Our Services & Specialities</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">{facility.about_us}</p>
          </div>

          {/* Pricing Catalog */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Medical Services Pricing Guide</h3>
            
            <div className="space-y-6">
              {categories.map(cat => (
                <div key={cat} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 border-l-2 border-teal-500">{cat}</h4>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl divide-y divide-slate-900 overflow-hidden shadow-lg">
                    {services.filter(s => s.category === cat).map((svc, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs hover:bg-slate-900/10">
                        <span className="font-semibold text-slate-200">{svc.name}</span>
                        <span className="font-mono font-bold text-teal-400">{svc.charge}/-</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-xs text-slate-500 italic">No services registered for this facility.</p>
              )}
            </div>
          </div>

          {/* Contact / Inquiry Form */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                <PhoneCall size={16} /> Contact & Inquiry Help Desk
              </h3>
              <p className="text-2xs text-slate-400 mt-1 leading-relaxed">
                Have a question or request for {facility.name}? Submit your query below and our team will get in touch.
              </p>
            </div>

            {supportError && (
              <div className="p-2.5 bg-red-500/5 border border-red-500/20 text-red-400 rounded text-xs">
                {supportError}
              </div>
            )}
            {supportSuccess && (
              <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 text-teal-400 rounded text-xs font-semibold">
                {supportSuccess}
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={supportName}
                    onChange={(e) => setSupportName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject of Inquiry</label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Appointment Query">Appointment Query</option>
                  <option value="Billing Question">Billing Question</option>
                  <option value="Feedback">Feedback & Suggestions</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Message / Query Description</label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="How can we assist you today? Please provide as much detail as possible..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={supportLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
              >
                {supportLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Inquiry</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Patient Portal Access Widget */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 space-y-6">
          <div className="flex border-b border-slate-850">
            <button
              onClick={() => { setIsLoginTab(true); setAuthError(''); }}
              className={`flex-1 pb-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isLoginTab ? 'border-b-2 border-teal-500 text-teal-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LogIn size={14} /> Patient Login
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setAuthError(''); }}
              className={`flex-1 pb-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                !isLoginTab ? 'border-b-2 border-teal-500 text-teal-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserPlus size={14} /> Patient Sign Up
            </button>
          </div>

          {authError && (
            <div className="p-2.5 bg-red-500/5 border border-red-500/20 text-red-400 rounded text-xs">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 text-teal-400 rounded text-xs">
              {authSuccess}
            </div>
          )}

          {isLoginTab ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@eagletechsolutions.tech"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1"
              >
                Sign In <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1"
              >
                Register Account <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Floating WhatsApp Widget */}
      {facility.whatsapp_number && (
        <a
          href={`https://wa.me/${facility.whatsapp_number}?text=${encodeURIComponent(facility.whatsapp_welcome_message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold p-3 rounded-full flex items-center gap-2 shadow-2xl transition hover:scale-105 z-50 group duration-300"
          title="Chat on WhatsApp"
        >
          <PhoneCall size={20} className="group-hover:rotate-12 duration-300" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[150px] transition-all duration-300 text-xs font-black tracking-wide whitespace-nowrap block">
            Chat on WhatsApp
          </span>
        </a>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 py-4 px-6 text-center text-[10px] text-slate-600 border-t border-slate-900 shrink-0 font-sans">
        © 2026 Eagle Tech HMIS Solutions. All rights reserved. Managed by {facility.name}.
      </footer>
    </div>
  );
}
