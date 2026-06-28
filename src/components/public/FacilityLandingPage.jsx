import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { visibleOfferedServices } from '../../utils/facilityServices';
import { 
  PhoneCall, ShieldCheck, ArrowRight, UserPlus,
  LogIn, Award, MapPin, Heart, Activity,
  Sparkles, Stethoscope, Search, Mail, Key, MessageSquare, X
} from 'lucide-react';

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

  // Search & Category states for landing templates
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('All');

  // Patient Login & Register Card States
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [isStaffLogin, setIsStaffLogin] = useState(false);
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

  // Public Booking Modal States
  const [showPublicBookingModal, setShowPublicBookingModal] = useState(false);

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: `Hi there! I am your automated clinic assistant. Ask me anything about our medical packages, services pricing, opening hours, or appointments!` }
  ]);

  const handleChatSend = async (text) => {
    if (!text.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: text.trim() }]);
    setChatInput('');
    setChatTyping(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI chat failed');
      }

      const data = await res.json();
      const reply = data.response || data.error || 'I received an empty response from the assistant.';
      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am having trouble connecting right now. Please try again later or send us a message through the inquiry form.' }]);
    } finally {
      setChatTyping(false);
    }
  };
  const [facilityDoctors, setFacilityDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');

  useEffect(() => {
    if (facility) {
      fetchFacilityDoctors(facility.id);
    }
  }, [facility]);

  useEffect(() => {
    if (selectedDoctorId && bookingDate && showPublicBookingModal) {
      fetchAvailableSlots(selectedDoctorId, bookingDate);
    }
  }, [selectedDoctorId, bookingDate, showPublicBookingModal]);

  const getDayName = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr);
    return days[d.getDay()];
  };

  const fetchFacilityDoctors = async (facilityId) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'profiles',
          queries: [{ type: 'equal', column: 'facility_id', value: facilityId }]
        })
      });

      const body = await res.json();
      if (res.ok && body.data) {
        const filteredDocs = body.data.filter(p => {
          const r = (p.role || '').toLowerCase();
          return r.includes('clinician') || r.includes('doctor') || r.includes('admin') || r.includes('nurse');
        }).map(p => ({
          id: p.id,
          name: p.full_name || 'Anonymous Doctor',
          specialty: p.department || 'General Practice'
        }));
        setFacilityDoctors(filteredDocs);
        if (filteredDocs.length > 0) setSelectedDoctorId(filteredDocs[0].id);
      }
    } catch (err) {
      console.error('Error fetching facility doctors:', err);
    }
  };

  const fetchAvailableSlots = async (docId, dateStr) => {
    if (!docId || !dateStr) return;
    setLoadingSlots(true);
    try {
      const dayName = getDayName(dateStr);
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // 1. Fetch doctor availability config
      const availRes = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'doctor_availability',
          queries: [
            { type: 'equal', column: 'doctor_id', value: docId },
            { type: 'equal', column: 'day_of_week', value: dayName }
          ]
        })
      });
      const availBody = await availRes.json();
      const avail = availBody.data && availBody.data.length > 0 ? availBody.data[0] : null;

      // 2. Fetch existing appointments
      const apptRes = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'appointments',
          queries: [
            { type: 'equal', column: 'doctor_id', value: docId },
            { type: 'equal', column: 'appointment_date', value: dateStr }
          ]
        })
      });
      const apptBody = await apptRes.json();
      const booked = apptBody.data || [];

      let startHour = 8;
      let endHour = 17;
      let isAvailable = true;

      if (avail) {
        isAvailable = avail.is_available;
        try {
          startHour = parseInt(avail.start_time.split(':')[0], 10);
          endHour = parseInt(avail.end_time.split(':')[0], 10);
        } catch(e) {}
      } else {
        if (dayName === 'Saturday' || dayName === 'Sunday') {
          isAvailable = false;
        }
      }

      if (!isAvailable) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      const slots = [];
      const bookedTimes = booked
        .filter(b => b.status !== 'cancelled')
        .map(b => b.start_time.substring(0, 5));

      for (let h = startHour; h < endHour; h++) {
        const hh = h < 10 ? `0${h}:00` : `${h}:00`;
        if (!bookedTimes.includes(hh)) {
          slots.push(hh);
        }
      }

      setAvailableSlots(slots);
      if (slots.length > 0) setSelectedSlot(slots[0]);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const newApp = {
        id: `app_${Date.now()}`,
        facility_id: facility.id,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        doctor_id: selectedDoctorId,
        appointment_date: bookingDate,
        start_time: selectedSlot,
        notes: bookingNotes.trim(),
        status: 'booked'
      };

      if (patientEmail.trim()) {
        newApp.notes = `[Email: ${patientEmail.trim()}] ${bookingNotes.trim()}`;
      }

      const res = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'appointments',
          rows: newApp
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to request appointment.');

      setAuthSuccess(`Slot reserved! Your appointment has been booked for ${bookingDate} at ${selectedSlot}.`);
      setShowPublicBookingModal(false);
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setBookingNotes('');
      setTimeout(() => {
        setAuthSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error booking appointment:', err);
      setAuthError(err.message || 'Failed to request appointment.');
      setTimeout(() => {
        setAuthError('');
      }, 5000);
    } finally {
      setBookingLoading(false);
    }
  };

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

  const handleGoogleSignIn = async (preferredRole = isStaffLogin ? 'staff' : 'patient') => {
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      const googleAuthIntent = preferredRole === 'staff' ? 'staff' : 'patient';
      sessionStorage.setItem('egesa_google_auth_intent', googleAuthIntent);

      if (supabase.isSandbox) {
        if (googleAuthIntent === 'patient') {
          const mockUser = {
            id: 'u_mock_google_patient',
            email: 'patient.google@eagletechsolutions.tech',
            name: 'Google Patient User',
            role: 'patient',
            facility_id: facility.id
          };
          localStorage.setItem('egesa_health_token', 'mock_google_token');
          localStorage.setItem('egesa_health_user', JSON.stringify(mockUser));
          localStorage.setItem('egesa_active_facility_id', facility.id);
          sessionStorage.setItem('egesa_health_token', 'mock_google_token');
          sessionStorage.setItem('egesa_health_active_user', JSON.stringify(mockUser));
          setAuthSuccess('Redirecting to Patient Portal...');
          setTimeout(() => {
            window.location.href = '/patient-portal';
          }, 1000);
        } else {
          const mockUser = {
            id: 'u_mock_google_staff',
            email: 'staff.google@eagletechsolutions.tech',
            name: 'Google Staff User',
            role: 'doctor',
            facility_id: facility.id
          };
          localStorage.setItem('egesa_health_token', 'mock_google_token');
          localStorage.setItem('egesa_health_user', JSON.stringify(mockUser));
          localStorage.setItem('egesa_active_facility_id', facility.id);
          sessionStorage.setItem('egesa_health_token', 'mock_google_token');
          sessionStorage.setItem('egesa_health_active_user', JSON.stringify(mockUser));
          setAuthSuccess('Redirecting to Staff Workspace...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
      } else {
        sessionStorage.setItem('egesa_health_pending_facility', facility.id);
        sessionStorage.setItem('egesa_google_auth_intent', googleAuthIntent);
        localStorage.setItem('egesa_active_facility_id', facility.id);
        sessionStorage.setItem('egesa_google_auth_facility_redirect', 'true');
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || 'Google Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const checkGoogleSession = async () => {
      if (facility?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const localUserStr = localStorage.getItem('egesa_health_user');
          if (!localUserStr) {
            setAuthLoading(true);
            try {
              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const res = await fetch(`${apiBase}/auth/supabase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  access_token: session.access_token,
                  requestedFacilityId: facility.id
                })
              });
              
              const resData = await res.json();
              if (res.ok) {
                if (resData.status === 'success') {
                  sessionStorage.removeItem('egesa_google_auth_intent');
                  localStorage.setItem('egesa_health_token', resData.token);
                  localStorage.setItem('egesa_health_user', JSON.stringify(resData.user));
                  localStorage.setItem('egesa_active_facility_id', resData.user.facility_id || '');
                  sessionStorage.setItem('egesa_health_token', resData.token);
                  sessionStorage.setItem('egesa_health_active_user', JSON.stringify(resData.user));
                  
                  setAuthSuccess('Logged in successfully!');
                  setTimeout(() => {
                    if (resData.user.role === 'patient') {
                      window.location.href = '/patient-portal';
                    } else {
                      window.location.href = '/';
                    }
                  }, 1000);
                } else if (resData.status === 'no_profile') {
                  const authIntent = sessionStorage.getItem('egesa_google_auth_intent') || 'patient';
                  if (authIntent === 'staff') {
                    sessionStorage.removeItem('egesa_google_auth_intent');
                    await supabase.auth.signOut().catch(() => {});
                    setAuthError('No staff profile is linked to this Google account yet. Please use a staff invite or ask an administrator to assign your role before signing in with Google.');
                    return;
                  }
                  try {
                    const patientRes = await fetch(`${apiBase}/auth/patient/signup`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: session.user.email,
                        password: 'google_oauth_bypass_pass_' + Math.random().toString(36),
                        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                        dob: '2000-01-01',
                        gender: 'female',
                        facilityId: facility.id,
                        phone: ''
                      })
                    });
                    
                    const signUpBody = await patientRes.json();
                    if (!patientRes.ok) throw new Error(signUpBody.error || 'Auto-signup failed.');
                    
                    const retryRes = await fetch(`${apiBase}/auth/supabase-login`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        access_token: session.access_token,
                        requestedFacilityId: facility.id
                      })
                    });
                    const retryData = await retryRes.json();
                    if (retryRes.ok && retryData.status === 'success') {
                      localStorage.setItem('egesa_health_token', retryData.token);
                      localStorage.setItem('egesa_health_user', JSON.stringify(retryData.user));
                      localStorage.setItem('egesa_active_facility_id', retryData.user.facility_id || '');
                      sessionStorage.setItem('egesa_health_token', retryData.token);
                      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(retryData.user));
                      
                      setAuthSuccess('Account registered successfully with Google!');
                      setTimeout(() => {
                        window.location.href = '/patient-portal';
                      }, 1000);
                    } else {
                      throw new Error(retryData.error || 'Failed to initialize session.');
                    }
                  } catch (err) {
                    setAuthError('Google registration failed: ' + err.message);
                  }
                }
              } else {
                setAuthError(resData.error || 'OAuth session initialization failed.');
              }
            } catch (err) {
              setAuthError(err.message);
            } finally {
              setAuthLoading(false);
            }
          }
        }
      }
    };
    
    checkGoogleSession();
  }, [facility]);

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
        body: JSON.stringify({ email, password, requestedFacilityId: facility?.id })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed.');

      localStorage.setItem('egesa_health_token', body.token);
      localStorage.setItem('egesa_health_user', JSON.stringify(body.user));
      localStorage.setItem('egesa_active_facility_id', body.user.facility_id || '');
      sessionStorage.setItem('egesa_health_token', body.token);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(body.user));

      if (body.user.role === 'patient') {
        setAuthSuccess('Redirecting to Patient Portal...');
        setTimeout(() => {
          window.location.href = '/patient-portal';
        }, 1000);
      } else {
        setAuthSuccess('Redirecting to Workspace Dashboard...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
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
        body: JSON.stringify({ email, password, requestedFacilityId: facility.id })
      });
      const loginBody = await loginRes.json();
      localStorage.setItem('egesa_health_token', loginBody.token);
      localStorage.setItem('egesa_health_user', JSON.stringify(loginBody.user));
      localStorage.setItem('egesa_active_facility_id', loginBody.user.facility_id || '');
      sessionStorage.setItem('egesa_health_token', loginBody.token);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loginBody.user));

      if (loginBody.user.role === 'patient') {
        setTimeout(() => {
          window.location.href = '/patient-portal';
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
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
            email: facility.contact_email ? `${supportEmail.trim()}, ${facility.contact_email}` : supportEmail.trim(),
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

  // Group services by category. Entries explicitly marked offered=false are hidden.
  const services = visibleOfferedServices(facility.services_list || []);
  const categories = [...new Set(services.map(s => s.category || 'Other'))];
  const template = facility.landing_template || 'classic';

  const getServiceImage = (svc) => {
    const name = (svc.name || '').toLowerCase();
    const cat = (svc.category || '').toLowerCase();

    if (cat.includes('consult') || name.includes('consult')) {
      return '/medical_consultation.png';
    }
    if (cat.includes('lab') || cat.includes('test') || name.includes('lab') || name.includes('blood') || name.includes('stool') || name.includes('urine') || name.includes('widal') || name.includes('hiv') || name.includes('panel')) {
      return '/laboratory_diagnostics.png';
    }
    if (cat.includes('immun') || cat.includes('vaccin') || name.includes('vacc') || name.includes('immun')) {
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80';
    }
    if (cat.includes('mch') || cat.includes('maternity') || cat.includes('anc') || name.includes('pregnancy') || name.includes('antenatal') || name.includes('delivery')) {
      return 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=500&q=80';
    }
    if (cat.includes('radiology') || cat.includes('scan') || name.includes('ct') || name.includes('mri') || name.includes('x-ray')) {
      return 'https://images.unsplash.com/photo-1516549838248-7452393c0807?auto=format&fit=crop&w=500&q=80';
    }
    if (cat.includes('ward') || cat.includes('bed') || cat.includes('icu') || name.includes('admission') || name.includes('ward')) {
      return 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80';
    }
    return 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80';
  };

  const renderHeader = () => (
    <header className="bg-slate-900/60 backdrop-blur border-b border-slate-900 py-4 px-6 shrink-0 flex justify-between items-center z-50 sticky top-0 animate-slideDown">
      <div className="flex items-center gap-2.5">
        <div className={`h-9 w-9 border rounded-xl flex items-center justify-center transition-all ${
          template === 'wellness' 
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
        }`}>
          <Award size={20} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">{facility.name}</h1>
          <span className={`text-[9px] font-bold uppercase tracking-widest block ${
            template === 'wellness' ? 'text-purple-400' : 'text-teal-400'
          }`}>{facility.code}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-semibold">
        <span className="text-slate-400 flex items-center gap-1.5 hidden sm:flex">
          <MapPin size={14} className={template === 'wellness' ? 'text-purple-400' : 'text-teal-400'} /> 
          {facility.address}
        </span>
        <button
          onClick={() => setShowPublicBookingModal(true)}
          className={`font-black text-[10px] py-1.5 px-3.5 rounded-lg border cursor-pointer active:scale-[0.98] transition ${
            template === 'wellness'
              ? 'bg-purple-500 hover:bg-purple-650 text-white border-purple-500/20 shadow-lg shadow-purple-500/10'
              : 'bg-teal-500 hover:bg-teal-600 text-slate-950 border-teal-500/20 shadow-lg shadow-teal-500/10'
          }`}
        >
          📅 Book Appointment
        </button>
      </div>
    </header>
  );

  const renderAuthWidget = () => (
    <div className={`bg-slate-900 border rounded-2xl shadow-2xl p-6 space-y-6 transition duration-300 ${
      template === 'wellness' ? 'border-slate-800 hover:border-purple-500/30' : 'border-slate-850 hover:border-teal-500/30'
    }`}>
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => { setIsLoginTab(true); setIsStaffLogin(false); setAuthError(''); }}
          className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            isLoginTab && !isStaffLogin
              ? `border-b-2 ${template === 'wellness' ? 'border-purple-500 text-purple-400' : 'border-teal-500 text-teal-400'}` 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LogIn size={13} /> Patient Login
        </button>
        <button
          onClick={() => { setIsLoginTab(false); setIsStaffLogin(false); setAuthError(''); }}
          className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            !isLoginTab && !isStaffLogin
              ? `border-b-2 ${template === 'wellness' ? 'border-purple-500 text-purple-400' : 'border-teal-500 text-teal-400'}` 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserPlus size={13} /> Patient Sign Up
        </button>
        <button
          onClick={() => { setIsStaffLogin(true); setAuthError(''); }}
          className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            isStaffLogin
              ? `border-b-2 ${template === 'wellness' ? 'border-purple-500 text-purple-400' : 'border-teal-500 text-teal-400'}` 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShieldCheck size={13} /> Staff Login
        </button>
      </div>

      {authError && (
        <div className="p-2.5 bg-red-500/5 border border-red-500/20 text-red-400 rounded text-xs animate-fadeIn">
          {authError}
        </div>
      )}
      {authSuccess && (
        <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 text-teal-400 rounded text-xs animate-fadeIn">
          {authSuccess}
        </div>
      )}

      {isStaffLogin ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Email Address</label>
            <div className="flex bg-slate-950 border border-slate-850 rounded-lg focus-within:border-teal-500/60 transition overflow-hidden">
              <span className="pl-3 py-2 text-slate-550 flex items-center justify-center"><Mail size={13} /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@eagletechsolutions.tech"
                className="flex-1 bg-transparent py-2 px-2 text-xs text-slate-100 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <div className="flex bg-slate-950 border border-slate-850 rounded-lg focus-within:border-teal-500/60 transition overflow-hidden">
              <span className="pl-3 py-2 text-slate-550 flex items-center justify-center"><Key size={13} /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent py-2 px-2 text-xs text-slate-100 focus:outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className={`w-full font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer ${
              template === 'wellness' 
                ? 'bg-purple-500 hover:bg-purple-650 text-white shadow-lg shadow-purple-500/10' 
                : 'bg-teal-500 hover:bg-teal-600 text-slate-955 shadow-lg shadow-teal-500/10'
            }`}
          >
            Sign In as Staff <ArrowRight size={14} />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-550 font-bold uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={() => handleGoogleSignIn('staff')}
            disabled={authLoading}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.68 1.285 6.567l3.98 3.198Z"
              />
              <path
                fill="#4285F4"
                d="M16.04 15.348c-1.07.728-2.42 1.16-4.04 1.16a5.084 5.084 0 0 1-4.834-3.498l-4.02 3.125C5.176 20.354 8.356 22 12 22c3.218 0 6.143-1.127 8.318-3.055l-4.278-3.597Z"
              />
              <path
                fill="#FBBC05"
                d="M7.166 13.01a4.9 4.9 0 0 1-.257-1.01c0-.35.035-.69.097-1.01l-3.98-3.197A9.034 9.034 0 0 0 2 12c0 1.564.4 3.037 1.097 4.328l4.069-3.318Z"
              />
              <path
                fill="#34A853"
                d="M23.49 12.275c0-.82-.074-1.604-.21-2.364H12v4.51h6.46A5.523 5.523 0 0 1 16.04 15.35l4.278 3.596c2.502-2.31 3.938-5.71 3.938-9.67Z"
              />
            </svg>
            Continue with Google
          </button>
        </form>
      ) : isLoginTab ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <div className="flex bg-slate-950 border border-slate-850 rounded-lg focus-within:border-teal-500/60 transition overflow-hidden">
              <span className="pl-3 py-2 text-slate-550 flex items-center justify-center"><Mail size={13} /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@eagletechsolutions.tech"
                className="flex-1 bg-transparent py-2 px-2 text-xs text-slate-100 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <div className="flex bg-slate-950 border border-slate-850 rounded-lg focus-within:border-teal-500/60 transition overflow-hidden">
              <span className="pl-3 py-2 text-slate-550 flex items-center justify-center"><Key size={13} /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent py-2 px-2 text-xs text-slate-100 focus:outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className={`w-full font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer ${
              template === 'wellness' 
                ? 'bg-purple-500 hover:bg-purple-650 text-white shadow-lg shadow-purple-500/10' 
                : 'bg-teal-500 hover:bg-teal-600 text-slate-955 shadow-lg shadow-teal-500/10'
            }`}
          >
            Sign In <ArrowRight size={14} />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-550 font-bold uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={() => handleGoogleSignIn('patient')}
            disabled={authLoading}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.68 1.285 6.567l3.98 3.198Z"
              />
              <path
                fill="#4285F4"
                d="M16.04 15.348c-1.07.728-2.42 1.16-4.04 1.16a5.084 5.084 0 0 1-4.834-3.498l-4.02 3.125C5.176 20.354 8.356 22 12 22c3.218 0 6.143-1.127 8.318-3.055l-4.278-3.597Z"
              />
              <path
                fill="#FBBC05"
                d="M7.166 13.01a4.9 4.9 0 0 1-.257-1.01c0-.35.035-.69.097-1.01l-3.98-3.197A9.034 9.034 0 0 0 2 12c0 1.564.4 3.037 1.097 4.328l4.069-3.318Z"
              />
              <path
                fill="#34A853"
                d="M23.49 12.275c0-.82-.074-1.604-.21-2.364H12v4.51h6.46A5.523 5.523 0 0 1 16.04 15.35l4.278 3.596c2.502-2.31 3.938-5.71 3.938-9.67Z"
              />
            </svg>
            Continue with Google
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
            className={`w-full font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer ${
              template === 'wellness' 
                ? 'bg-purple-500 hover:bg-purple-650 text-white shadow-lg' 
                : 'bg-teal-500 hover:bg-teal-600 text-slate-955 shadow-lg'
            }`}
          >
            Register Account <ArrowRight size={14} />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-550 font-bold uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={() => handleGoogleSignIn('patient')}
            disabled={authLoading}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.68 1.285 6.567l3.98 3.198Z"
              />
              <path
                fill="#4285F4"
                d="M16.04 15.348c-1.07.728-2.42 1.16-4.04 1.16a5.084 5.084 0 0 1-4.834-3.498l-4.02 3.125C5.176 20.354 8.356 22 12 22c3.218 0 6.143-1.127 8.318-3.055l-4.278-3.597Z"
              />
              <path
                fill="#FBBC05"
                d="M7.166 13.01a4.9 4.9 0 0 1-.257-1.01c0-.35.035-.69.097-1.01l-3.98-3.197A9.034 9.034 0 0 0 2 12c0 1.564.4 3.037 1.097 4.328l4.069-3.318Z"
              />
              <path
                fill="#34A853"
                d="M23.49 12.275c0-.82-.074-1.604-.21-2.364H12v4.51h6.46A5.523 5.523 0 0 1 16.04 15.35l4.278 3.596c2.502-2.31 3.938-5.71 3.938-9.67Z"
              />
            </svg>
            Continue with Google
          </button>
        </form>
      )}

      <div className="border-t border-slate-800 pt-4 text-center">
        <button
          type="button"
          onClick={() => setShowPublicBookingModal(true)}
          className={`text-[10px] font-bold uppercase tracking-wider underline hover:text-white transition cursor-pointer ${
            template === 'wellness' ? 'text-purple-400' : 'text-teal-400'
          }`}
        >
          📅 Book appointment without an account
        </button>
      </div>
    </div>
  );

  const renderInquiryForm = () => (
    <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6">
      <div>
        <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${
          template === 'wellness' ? 'text-purple-400' : 'text-teal-400'
        }`}>
          <PhoneCall size={16} /> Contact & Inquiry Help Desk
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Have a question or request for {facility.name}? Submit your query below and our team will get in touch.
        </p>
      </div>

      {supportError && (
        <div className="p-2.5 bg-red-500/5 border border-red-500/20 text-red-400 rounded text-xs animate-fadeIn">
          {supportError}
        </div>
      )}
      {supportSuccess && (
        <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 text-teal-400 rounded text-xs font-semibold animate-fadeIn">
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
            className="w-full bg-slate-955 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
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
          className={`w-full font-black py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer ${
            template === 'wellness' 
              ? 'bg-purple-500 hover:bg-purple-650 text-white' 
              : 'bg-teal-500 hover:bg-teal-600 text-slate-955'
          }`}
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
  );

  const renderClassicBody = () => (
    <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start animate-fadeIn">
      {/* Left 2 Cols: Services catalog and info */}
      <div className="lg:col-span-2 space-y-8 animate-slideUp">
        {/* Welcome Card */}
        <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-[250px]">
              <h2 className="text-xl font-black text-white font-sans tracking-tight">Our Services & Specialities</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{facility.about_us}</p>
            </div>
            <button
              onClick={() => setShowPublicBookingModal(true)}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg hover:scale-[1.02] transition active:scale-[0.98] cursor-pointer shrink-0 mt-1"
            >
              📅 Book Appointment
            </button>
          </div>
        </div>

        {/* Pricing Catalog */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Medical Services Pricing Guide</h3>
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat} className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 border-l-2 border-teal-500">{cat}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.filter(s => s.category === cat).map((svc, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg group hover:border-slate-800 transition duration-300 flex flex-col">
                      <div className="relative h-28 w-full bg-slate-955 overflow-hidden">
                        <img 
                          src={getServiceImage(svc)} 
                          alt={svc.name} 
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-955/80 to-transparent" />
                        <span className="absolute bottom-2 left-2 text-[8px] font-bold text-teal-400 bg-teal-950/80 border border-teal-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          {svc.category}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <h5 className="font-bold text-slate-100 text-xs leading-snug">{svc.name}</h5>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">Standard Fee</span>
                          <span className="font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/10 px-2.5 py-1 rounded-lg">
                            {svc.charge}/-
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-xs text-slate-550 italic">No services registered for this facility.</p>
            )}
          </div>
        </div>

        {/* Contact / Inquiry Form */}
        {renderInquiryForm()}
      </div>

      {/* Right Col: Patient Portal Access Widget */}
      <div className="animate-slideUp delay-100">
        {renderAuthWidget()}
      </div>
    </main>
  );

  const renderModernBody = () => {
    // Filter services based on search query and active tab
    const filteredServices = services.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
                          s.category.toLowerCase().includes(serviceSearch.toLowerCase());
      const matchTab = activeCategoryTab === 'All' || s.category === activeCategoryTab;
      return matchSearch && matchTab;
    });

    const displayCategories = ['All', ...categories];

    return (
      <div className="flex-1 space-y-16 py-6 font-sans animate-fadeIn">
        {/* Modern Hero Section */}
        <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
          <div className="lg:col-span-7 space-y-6 animate-slideUp">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 select-none">
              <Sparkles size={12} className="animate-pulse" /> Premium Healthcare
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight font-serif">
              Next-Gen Intelligent Healthcare for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Your Family</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              {facility.about_us} Eagle Tech HMIS enables direct laboratory integrations, electronic medical records, digital pharmacies, and seamless real-time notifications.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => setShowPublicBookingModal(true)}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg hover:shadow-teal-500/10 hover:scale-[1.02] transition active:scale-[0.98] cursor-pointer"
              >
                📅 Book Appointment
              </button>
              <a 
                href="#portal-access" 
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-slate-850 transition"
              >
                Patient Portal
              </a>
              <a 
                href="#pricing-catalog" 
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-slate-850 transition"
              >
                View Price Catalog
              </a>
            </div>
          </div>
          <div className="lg:col-span-5 relative flex justify-center animate-slideUp delay-100">
            <div className="absolute inset-0 bg-teal-500/5 rounded-2xl blur-3xl -z-10" />
            <img 
              src="/modern_hospital_hero.png" 
              alt="Healthcare Vector illustration" 
              className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-850 transform hover:scale-[1.02] transition duration-500 shadow-teal-500/5 object-cover h-[280px]"
            />
          </div>
        </section>

        {/* Dynamic Key Stats Strip */}
        <section className="bg-slate-900/30 border-y border-slate-900/60 py-10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 bg-slate-900/60 border border-slate-855 rounded-2xl text-center space-y-1 hover:border-slate-800 transition">
              <span className="block text-2xl font-black text-teal-400">15+</span>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Departments</span>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-855 rounded-2xl text-center space-y-1 hover:border-slate-800 transition">
              <span className="block text-2xl font-black text-teal-400">100%</span>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Certified Results</span>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-855 rounded-2xl text-center space-y-1 hover:border-slate-800 transition">
              <span className="block text-2xl font-black text-teal-400">24/7</span>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp Support</span>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-855 rounded-2xl text-center space-y-1 hover:border-slate-800 transition">
              <span className="block text-2xl font-black text-teal-400">Secure</span>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">MOH Integrations</span>
            </div>
          </div>
        </section>

        {/* Gallery Showcase (if images exist) */}
        {facility.facility_images && facility.facility_images.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 space-y-6 animate-slideUp">
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-white">Facility Gallery</h3>
              <p className="text-xs text-slate-455">Explore views of our modern clinics, wards, and treatment equipment.</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {facility.facility_images.map((imgUrl, idx) => (
                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-850 shadow-md group bg-slate-900">
                  <img 
                    src={imgUrl} 
                    alt={`Facility view ${idx + 1}`} 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services Section with Search and Tabs */}
        <section id="pricing-catalog" className="max-w-7xl mx-auto px-6 space-y-8 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-slate-900 pb-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-white">Medical Catalog & Services</h3>
              <p className="text-xs text-slate-450">Filter specialized diagnostics, vaccinations, consultations, and inpatient checkups.</p>
            </div>
            {/* Search Input */}
            <div className="w-full md:max-w-xs flex bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-teal-500/50 transition">
              <Search size={14} className="text-slate-550 mt-0.5 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {displayCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryTab(cat)}
                className={`text-[10px] font-bold tracking-wider uppercase px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeCategoryTab === cat 
                    ? 'bg-teal-500 text-slate-950' 
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Catalog grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((svc, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/40 border border-slate-850/60 rounded-2xl overflow-hidden shadow-md hover:shadow-lg hover:border-slate-800 transition duration-300 flex flex-col group"
              >
                <div className="relative h-32 w-full bg-slate-950 overflow-hidden">
                  <img 
                    src={getServiceImage(svc)} 
                    alt={svc.name} 
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 text-[8px] font-black text-teal-400 bg-teal-950/85 border border-teal-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest">
                    {svc.category}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <h4 className="font-bold text-slate-200 text-xs leading-snug group-hover:text-white transition">{svc.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider font-sans">Service Fee</span>
                    <span className="font-mono font-bold text-teal-400 bg-teal-500/5 border border-teal-500/15 px-3 py-1 rounded-lg">
                      {svc.charge}/-
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredServices.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-550 italic">
                No matching medical services found. Try a different query.
              </div>
            )}
          </div>
        </section>

        {/* Portal Access and Support section */}
        <section id="portal-access" className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 scroll-mt-20">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-white">Join Our Digital Patient Portal</h3>
              <p className="text-xs text-slate-450 leading-relaxed font-sans">
                Registered patients can view laboratory sync logs, check active prescriptions, verify outstanding billing invoices, and consult medical professionals online.
              </p>
            </div>
            {renderAuthWidget()}
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-white">Inquire or File a Request</h3>
              <p className="text-xs text-slate-450 leading-relaxed font-sans">
                Need details regarding medical packages, hospital admission files, or custom billing structures? Fill in the form and we will notify you.
              </p>
            </div>
            {renderInquiryForm()}
          </div>
        </section>
      </div>
    );
  };

  const renderWellnessBody = () => (
    <div className="flex-1 space-y-16 py-6 font-sans animate-fadeIn">
      {/* Wellness Hero Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
        <div className="lg:col-span-7 space-y-6 animate-slideUp">
          <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full select-none">
            <Activity size={12} className="animate-pulse" /> Compassionate Clinical Care
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight font-serif">
            Providing Calming Care & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Wellness Solutions</span>
          </h2>
          <p className="text-xs text-slate-450 leading-relaxed max-w-xl">
            {facility.about_us} Our clinic prioritizes a calm patient experience, certified laboratory parameters, and instant digital check-ins to make your health journey stress-free.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={() => setShowPublicBookingModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02] transition active:scale-[0.98] cursor-pointer"
            >
              📅 Book Appointment
            </button>
            <a 
              href="#portal-widget" 
              className="bg-slate-900 border border-slate-850 text-slate-300 hover:text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-slate-850 transition"
            >
              Patient Sign In
            </a>
          </div>
        </div>
        <div className="lg:col-span-5 relative flex justify-center animate-slideUp delay-100">
          <div className="absolute inset-0 bg-purple-500/5 rounded-2xl blur-3xl -z-10" />
          <img 
            src="/wellness_clinic_hero.png" 
            alt="Wellness illustration" 
            className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 transform hover:scale-[1.02] transition duration-500 shadow-purple-500/5 object-cover h-[280px]"
          />
        </div>
      </section>

      {/* Trust & Certifications Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl flex gap-4 items-start">
          <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0"><ShieldCheck size={20} /></span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200">Certified Operations</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">Full integrations with Kenyan MOH registers, verified licensing numbers, and audit logs.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl flex gap-4 items-start">
          <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0"><Heart size={20} /></span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200">Patient-Centric Portal</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">Allows patient login, direct accessions tracking, invoice verification, and vaccine rosters.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl flex gap-4 items-start">
          <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0"><Stethoscope size={20} /></span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200">Automated LIS Tracker</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">Lab results sync automatically from diagnostic equipment handshakes, reducing delays.</p>
          </div>
        </div>
      </section>

      {/* Gallery Showcase (if images exist) */}
      {facility.facility_images && facility.facility_images.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 space-y-6 animate-slideUp">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold font-serif text-white font-normal">Explore Our Premises</h3>
            <p className="text-xs text-slate-455 max-w-lg mx-auto">A visual tour of our calming wellness spaces and modern treatment areas.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {facility.facility_images.map((imgUrl, idx) => (
              <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-850 shadow-lg group bg-slate-900">
                <img 
                  src={imgUrl} 
                  alt={`Wellness Space ${idx + 1}`} 
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 to-transparent" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Services Catalog */}
      <section className="max-w-4xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold font-serif text-white">Our Services Directory</h3>
          <p className="text-xs text-slate-450 max-w-lg mx-auto">Explore standard rates and departments configured by the clinical administration.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-850 p-6 rounded-2xl space-y-6">
          {categories.map(cat => (
            <div key={cat} className="space-y-3">
              <span className="inline-block text-[9px] font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md uppercase tracking-wider">{cat}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1">
                {services.filter(s => s.category === cat).map((svc, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow transition duration-300 flex flex-col group">
                    <div className="relative h-28 w-full bg-slate-955 overflow-hidden">
                      <img 
                        src={getServiceImage(svc)} 
                        alt={svc.name} 
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-955/85 to-transparent" />
                      <span className="absolute bottom-2 left-2 text-[8px] font-bold text-purple-400 bg-purple-950/80 border border-purple-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        {svc.category}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <span className="font-semibold text-slate-300 text-xs leading-normal">{svc.name}</span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-slate-500 font-medium font-sans">Standard Charge</span>
                        <span className="font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/10 px-2.5 py-1 rounded-lg">
                          {svc.charge}/-
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-xs text-slate-550 italic text-center">No services registered for this facility.</p>
          )}
        </div>
      </section>

      {/* Appointment Booking Inquiry & Portal Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-8">
        <div id="appointment-desk" className="lg:col-span-7 space-y-4 scroll-mt-20">
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-serif text-white">Inquiry Help Desk</h3>
            <p className="text-xs text-slate-455">Submit health enquiries or department bookings directly. Our nurses will notify you.</p>
          </div>
          {renderInquiryForm()}
        </div>
        <div id="portal-widget" className="lg:col-span-5 space-y-4 scroll-mt-20">
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-serif text-white">Secure Access Portal</h3>
            <p className="text-xs text-slate-455 font-sans">Access medical records and digital pharmacy prescriptions.</p>
          </div>
          {renderAuthWidget()}
        </div>
      </section>
    </div>
  );

  const renderWhatsAppWidget = () => {
    if (!facility.whatsapp_number) return null;
    return (
      <a
        href={`https://wa.me/${facility.whatsapp_number}?text=${encodeURIComponent(facility.whatsapp_welcome_message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 text-slate-950 font-extrabold p-3 rounded-full flex items-center gap-2 shadow-2xl transition hover:scale-105 z-50 group duration-300 ${
          template === 'wellness' ? 'bg-purple-400 hover:bg-purple-500 text-slate-950' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
        }`}
        title="Chat on WhatsApp"
      >
        <PhoneCall size={20} className="group-hover:rotate-12 duration-300" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-[150px] transition-all duration-300 text-xs font-black tracking-wide whitespace-nowrap block">
          Chat on WhatsApp
        </span>
      </a>
    );
  };

  const renderFooter = () => (
    <footer className="bg-slate-950 py-4 px-6 text-center text-[10px] text-slate-600 border-t border-slate-900 shrink-0 font-sans">
      © 2026 Eagle Tech HMIS Solutions. All rights reserved. Managed by {facility.name}.
    </footer>
  );

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 relative font-sans overflow-x-hidden ${
      template === 'wellness' 
        ? 'bg-gradient-to-br from-slate-950 via-purple-950/10 to-slate-950' 
        : 'bg-slate-950'
    }`}>
      
      {/* Top Navigation Banner */}
      {renderHeader()}

      {/* Main Content Body depending on active template selection */}
      {template === 'modern' && renderModernBody()}
      {template === 'wellness' && renderWellnessBody()}
      {template === 'classic' && renderClassicBody()}

      {/* Floating WhatsApp Widget */}
      {renderWhatsAppWidget()}

      {/* Footer */}
      {renderFooter()}

      {/* Public Booking Modal */}
      {showPublicBookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white">Schedule an Appointment</h3>
                <span className="text-[9px] text-slate-500 font-bold block">No account required to reserve a slot</span>
              </div>
              <button 
                onClick={() => setShowPublicBookingModal(false)}
                className="text-slate-500 hover:text-slate-350 text-xs font-bold border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0712345678"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Doctor / Clinician</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition font-semibold"
                  required
                >
                  {facilityDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} ({doc.specialty})
                    </option>
                  ))}
                  {facilityDoctors.length === 0 && (
                    <option value="">No doctors available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Appointment Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Available Time Slots
                </label>
                {loadingSlots ? (
                  <div className="py-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                    <div className="h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking availability...</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-1 text-[10px] font-bold font-mono border rounded transition ${
                          selectedSlot === slot
                            ? template === 'wellness' 
                              ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                              : 'bg-teal-500/10 border-teal-500 text-teal-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-400 italic bg-amber-500/5 border border-amber-550/15 p-2 rounded text-center">
                    No available time slots on this date.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={2}
                  placeholder="Tell us briefly how we can help you..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-250 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPublicBookingModal(false)}
                  className="w-1/2 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-350 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || !selectedSlot}
                  className={`w-1/2 py-2 font-black rounded-lg text-xs transition ${
                    template === 'wellness'
                      ? 'bg-purple-500 hover:bg-purple-650 text-white disabled:opacity-40'
                      : 'bg-teal-500 hover:bg-teal-600 text-slate-950 disabled:opacity-40'
                  }`}
                >
                  {bookingLoading ? 'Requesting...' : 'Request Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Floating Facility Chatbot Widget */}
      <div className="fixed bottom-6 left-6 z-[9999] font-sans text-slate-100">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer ${
              template === 'wellness'
                ? 'bg-purple-500 hover:bg-purple-650 text-white shadow-purple-500/10'
                : 'bg-teal-400 hover:bg-teal-500 text-slate-950 shadow-teal-500/10'
            }`}
            aria-label="Open support chat"
          >
            <MessageSquare size={22} />
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col h-[400px] animate-fadeIn">
            {/* Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-serif ${
                    template === 'wellness' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-teal-400/10 text-teal-400 border border-teal-400/20'
                  }`}>
                    {facility?.name?.substring(0, 2).toUpperCase() || 'EP'}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-slate-900" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1 font-sans">
                    {facility?.name || 'Clinic'} Helper
                  </h4>
                  <span className="text-[9px] text-slate-500 block leading-none font-sans">Online Assistant</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message logs */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl py-2 px-3 text-xs leading-relaxed font-sans ${
                      m.sender === 'user'
                        ? template === 'wellness'
                          ? 'bg-purple-500 text-white font-medium rounded-tr-none'
                          : 'bg-teal-400 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-950/60 border border-slate-855 text-slate-200 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-950/60 border border-slate-855 text-slate-400 rounded-2xl rounded-tl-none py-1.5 px-3 text-xs flex gap-1">
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce" />
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend(chatInput);
              }}
              className="p-2.5 bg-slate-950 border-t border-slate-850 flex gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Ask about pricing, services, or location..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500/50"
              />
              <button
                type="submit"
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                  template === 'wellness'
                    ? 'bg-purple-500 text-white'
                    : 'bg-teal-400 text-slate-950'
                }`}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}