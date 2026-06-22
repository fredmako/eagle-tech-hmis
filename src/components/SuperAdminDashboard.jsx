import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  RefreshCw, 
  LogOut, 
  Sliders, 
  Clock, 
  Lock, 
  Unlock,
  AlertCircle,
  MessageSquare,
  Mail,
  Send,
  User,
  Inbox
} from 'lucide-react';

export default function SuperAdminDashboard({ user, onSignOut }) {
  const { setUser, authFetch } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores facilityId or request ID during action
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('registry'); // 'registry' | 'audit' | 'requests' | 'support'
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [supportFilter, setSupportFilter] = useState('all');
  const [supportSearch, setSupportSearch] = useState('');

  const handleResolveSupportTicket = async (ticketId) => {
    if (!responseText.trim()) return;
    setReplyLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const ticket = supportTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          column: 'id',
          value: ticketId,
          values: {
            status: 'addressed',
            response: responseText.trim()
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resolve support ticket.');
      }

      // Send email notification of the reply
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ticket.user_email,
            subject: `Support Ticket Addressed: [#${ticket.id.substring(7, 13)}] - ${ticket.subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Support Ticket Reply</h2>
                <p>Hello <strong>${ticket.user_name}</strong>,</p>
                <p>Our platform administration team has addressed your support request (Reference: <strong>#${ticket.id.substring(7, 13)}</strong>).</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #475569; margin: 20px 0; border-radius: 4px;">
                  <strong>Your Ticket Message:</strong><br/>
                  <p style="color: #475569; font-style: italic; margin-top: 5px;">"${ticket.message}"</p>
                </div>

                <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px;">
                  <strong>Administrator Response:</strong><br/>
                  <p style="color: #166534; font-weight: bold; margin-top: 5px;">"${responseText.trim()}"</p>
                </div>

                <p>If you have any further questions, please do not hesitate to contact us again.</p>
                <p>Thank you,</p>
                <p><strong>Eagle Tech HMIS Systems</strong></p>
                <p style="color: #64748b; font-size: 11px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
                  This is an automated platform alert. Please do not reply directly to this notification.
                </p>
              </div>
            `
          })
        });
      } catch (mailErr) {
        console.warn('[Support Reply Email] Notification skipped/failed:', mailErr);
      }

      setResponseText('');
      setSelectedTicketId(null);
      setMessage({ type: 'success', text: `Support ticket #${ticketId.substring(7, 13)} resolved and response sent successfully!` });
      await fetchSuperAdminData();
    } catch (err) {
      console.error('Resolve ticket failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to resolve support ticket.' });
    } finally {
      setReplyLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    setLoading(true);
    try {
      // Fetch all facilities
      const { data: facs, error: facErr } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (facErr) throw facErr;
      setFacilities(facs || []);

      // Fetch global audit logs
      const { data: logs, error: logErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (logErr) throw logErr;
      setAuditLogs(logs || []);

      // Fetch all support tickets
      const { data: tickets, error: ticketErr } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketErr) throw ticketErr;
      setSupportTickets(tickets || []);

      // Role requests shifted to facility admins
    } catch (err) {
      console.error('[SuperAdminDashboard] Error loading data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load system control records.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleVerification = async (facilityId, currentStatus) => {
    setActionLoading(facilityId);
    setMessage({ type: '', text: '' });
    const newStatus = !currentStatus;

    try {
      // 1. Update facility status
      const { error: updateErr } = await supabase
        .from('facilities')
        .update({ is_verified: newStatus })
        .eq('id', facilityId);

      if (updateErr) throw updateErr;

      // 2. Insert audit log
      const details = newStatus 
        ? `Verified facility registration for ID ${facilityId}.`
        : `Suspended/Deactivated facility registration for ID ${facilityId}.`;
      
      await supabase.from('audit_logs').insert({
        facility_id: facilityId,
        user_id: user.id,
        action: newStatus ? 'Facility Verified' : 'Facility Suspended',
        details
      });

      // Update state locally
      setFacilities(prev => prev.map(f => f.id === facilityId ? { ...f, is_verified: newStatus } : f));
      setMessage({ 
        type: 'success', 
        text: `Facility status successfully updated to ${newStatus ? 'VERIFIED (Unlocked)' : 'SUSPENDED (Locked)'}!` 
      });

      // Refresh audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (logs) setAuditLogs(logs);

    } catch (err) {
      console.error('[SuperAdminDashboard] Action failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update facility verification.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccessPortal = () => {
    const targetFacility = facilities.find(f => f.id === 'f1') || facilities[0];
    if (!targetFacility) {
      alert("No facilities onboarded yet to access.");
      return;
    }
    const updatedUser = {
      ...user,
      role: 'admin',
      facility_id: targetFacility.id,
      facility_name: targetFacility.name,
      facility_logo: targetFacility.logo_url,
      facility_is_verified: true
    };
    setUser(updatedUser);
    sessionStorage.setItem('egesa_health_active_user', JSON.stringify(updatedUser));
  };

  // Role requests approved/rejected directly by facility administrators

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuperAdminData();
  };

  // Calculate stats
  const totalFacilities = facilities.length;
  const verifiedCount = facilities.filter(f => f.is_verified).length;
  const pendingCount = totalFacilities - verifiedCount;

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans">
      {/* Super Admin Top Control Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-slate-955 border border-slate-900 p-1.5 rounded-xl shadow-lg shadow-teal-500/5">
            <img src="/logo.png" alt="Eagle Tech Logo" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-md font-black tracking-wider text-white uppercase leading-none">Eagle Tech Systems Control</h1>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest block mt-1">Super Administrative Supervisor Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAccessPortal}
            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <Building2 size={12} />
            <span>Access Egesa Clinic Portal</span>
          </button>

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Console</span>
          </button>
          
          <div className="h-6 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-teal-500/10 border border-teal-500/25 flex items-center justify-center font-bold text-teal-400 text-xs shadow-inner">
              SA
            </div>
            <div className="text-left leading-none hidden sm:block">
              <span className="text-xs font-bold text-slate-200 block">{user.full_name}</span>
              <span className="text-[9px] text-teal-500 font-semibold uppercase tracking-wider block mt-0.5">SUPER ADMIN</span>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="border border-slate-800 hover:border-red-500/25 bg-slate-900/50 hover:bg-red-500/5 hover:text-red-400 p-2 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Verification Status Alerts */}
        {message.text && (
          <div className={`p-4 rounded-xl text-xs flex gap-3 ${
            message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wider">{message.type === 'success' ? 'Operation Success' : 'Error Alert'}</span>
              <p className="text-slate-300 font-semibold">{message.text}</p>
            </div>
          </div>
        )}

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered Facilities</span>
              <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{totalFacilities}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Building2 size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Verified Facilities</span>
              <h3 className="text-2xl font-black text-teal-400 mt-1.5 font-mono">{verifiedCount}</h3>
            </div>
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Verification Review</span>
              <h3 className={`text-2xl font-black mt-1.5 font-mono ${pendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>{pendingCount}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${pendingCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unaddressed Support Queries</span>
              <h3 className={`text-2xl font-black mt-1.5 font-mono ${supportTickets.filter(t => t.status === 'pending').length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>{supportTickets.filter(t => t.status === 'pending').length}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${supportTickets.filter(t => t.status === 'pending').length > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-455' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-850">
          <button
            onClick={() => setActiveTab('registry')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'registry' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Facility Onboarding Registry
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'audit' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Security Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'support' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Support Queries</span>
            {supportTickets.filter(t => t.status === 'pending').length > 0 && (
              <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25 animate-pulse">
                {supportTickets.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Console loading state */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-850 p-10 rounded-2xl text-center space-y-3 shadow-md">
            <div className="h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Retrieving System Logs & Entities...</p>
          </div>
        ) : activeTab === 'registry' ? (
          /* REGISTRY PANEL */
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-850 bg-slate-900/60 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Registered Facilities Directories</h4>
                <p className="text-[10px] text-slate-500 mt-1">Review credentials and toggle verification locks to allow/deny access to tenant portal dashboards.</p>
              </div>
            </div>

            {facilities.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                <AlertCircle size={32} className="mx-auto mb-2 text-slate-600" />
                <span>No facilities registered in systems control.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-bold border-b border-slate-850 text-[10px] uppercase">
                      <th className="py-3 px-4">Hospital Name & Code</th>
                      <th className="py-3 px-4">Address Context</th>
                      <th className="py-3 px-4">Subscription Tier</th>
                      <th className="py-3 px-4">Registration Date</th>
                      <th className="py-3 px-4 text-center">Status Lock</th>
                      <th className="py-3 px-4 text-center">Action Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-semibold text-slate-300">
                    {facilities.map((fac) => (
                      <tr key={fac.id} className="hover:bg-slate-950/20 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center font-bold text-teal-400 text-xs">
                              {fac.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-100 block text-xs uppercase">{fac.name}</span>
                              <span className="font-mono text-[10px] text-teal-400 font-black block mt-0.5">{fac.code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-350 text-[11px] font-sans">
                          {fac.address || 'Nairobi, Kenya'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            fac.license_tier === 'extensive' 
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {fac.license_tier || 'basic'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-450 font-mono text-[10px]">
                          {new Date(fac.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            fac.is_verified 
                              ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' 
                              : 'bg-amber-500/5 border border-amber-500/20 text-amber-400 animate-pulse'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${fac.is_verified ? 'bg-teal-400' : 'bg-amber-400'}`}></span>
                            {fac.is_verified ? 'Verified (Unlocked)' : 'Awaiting Review'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleVerification(fac.id, fac.is_verified)}
                            disabled={actionLoading === fac.id}
                            className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase py-1.5 px-3 rounded-lg shadow transition active:scale-[0.98] cursor-pointer ${
                              fac.is_verified
                                ? 'bg-slate-800 hover:bg-slate-750 text-red-400 border border-slate-700 hover:border-red-500/25'
                                : 'bg-teal-500 hover:bg-teal-600 text-slate-950 font-black'
                            }`}
                          >
                            {actionLoading === fac.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : fac.is_verified ? (
                              <Lock size={10} />
                            ) : (
                              <Unlock size={10} />
                            )}
                            <span>
                              {actionLoading === fac.id 
                                ? 'Processing...' 
                                : fac.is_verified ? 'Suspend Portal' : 'Verify Facility'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'audit' ? (
          /* SYSTEM AUDIT PANEL */
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5 font-sans">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Platform System-Wide Audit Log Stream</h4>
              <p className="text-[10px] text-slate-500 mt-1">Observe real-time security events, administrator configurations, and data mutations logged across all clinics.</p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                <span>No audit events registered.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="bg-slate-955 border border-slate-855 p-3 rounded-xl flex justify-between items-center gap-4 text-xs font-mono">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          log.action.includes('Verification') || log.action.includes('Verify')
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : log.action.includes('Delete')
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-550">Facility context: <span className="text-slate-300 font-bold">{log.facility_id || 'System'}</span></span>
                      </div>
                      <p className="text-[10.5px] text-slate-350 truncate">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-550 block">{new Date(log.created_at).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-600 block mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SUPPORT QUERIES PANEL */
          <div className="space-y-4 animate-fadeIn font-sans">
            {/* Filter and Search actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow">
              <div className="flex gap-2">
                {['all', 'pending', 'addressed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSupportFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
                      supportFilter === f
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                        : 'border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f} ({
                      f === 'all' 
                        ? supportTickets.length 
                        : supportTickets.filter(t => t.status === f).length
                    })
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search user name, email, or subject..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* Tickets table */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-350">
                  <thead className="bg-slate-955 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850">
                    <tr>
                      <th className="px-5 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-5 py-3.5">Submitted</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 bg-slate-900/40">
                    {supportTickets
                      .filter(t => supportFilter === 'all' || t.status === supportFilter)
                      .filter(t => {
                        const s = supportSearch.toLowerCase();
                        return (
                          t.user_name.toLowerCase().includes(s) ||
                          t.user_email.toLowerCase().includes(s) ||
                          t.subject.toLowerCase().includes(s)
                        );
                      })
                      .map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-950/20 transition">
                          <td className="px-5 py-4 font-mono font-bold text-teal-400">
                            #{ticket.id.substring(7, 13)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-white block">{ticket.user_name}</span>
                            <span className="text-[10px] text-slate-500 block">{ticket.user_email}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-200 font-sans">
                            {ticket.subject}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(ticket.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              ticket.status === 'addressed'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-amber-500/10 text-amber-450 border-amber-500/20 animate-pulse'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicketId(ticket.id);
                                setResponseText(ticket.response || '');
                              }}
                              className="bg-slate-800 hover:bg-slate-750 text-teal-400 border border-slate-700 hover:border-teal-500/20 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition cursor-pointer"
                            >
                              {ticket.status === 'addressed' ? 'View Details' : 'Address Query'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    {supportTickets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-500 italic">
                          No support tickets logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected ticket details modal drawer */}
            {selectedTicketId && (() => {
              const ticket = supportTickets.find(t => t.id === selectedTicketId);
              if (!ticket) return null;

              return (
                <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
                  <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b border-slate-850">
                      <div>
                        <span className="text-[9px] font-mono text-teal-400 font-bold block">REF: #{ticket.id.substring(7, 13)}</span>
                        <h3 className="text-sm font-black text-white">{ticket.subject}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTicketId(null);
                          setResponseText('');
                        }}
                        className="text-slate-500 hover:text-white transition text-xs font-bold border border-slate-800 px-2.5 py-1 rounded cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/45 border border-slate-850 p-3 rounded-xl">
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Submitted By</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User size={12} className="text-slate-400" />
                          <span className="text-slate-200 font-bold">{ticket.user_name}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} className="text-slate-400" />
                          <span className="text-slate-200 font-bold font-mono">{ticket.user_email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl text-xs space-y-2">
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">Query Message</span>
                      <p className="text-slate-350 leading-relaxed italic">"{ticket.message}"</p>
                      <span className="text-[8px] text-slate-550 block font-mono text-right">{new Date(ticket.created_at).toLocaleString()}</span>
                    </div>

                    {ticket.status === 'addressed' ? (
                      <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl text-xs space-y-2 animate-fadeIn">
                        <span className="text-[9px] font-bold text-green-400 block uppercase">Resolution Response</span>
                        <p className="text-green-300 leading-relaxed">"{ticket.response}"</p>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reply Message</label>
                          <textarea
                            rows={4}
                            required
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition resize-none"
                            placeholder="Type support reply details here. An email will be dispatched to the user automatically..."
                          />
                        </div>
                        <button
                          onClick={() => handleResolveSupportTicket(ticket.id)}
                          disabled={replyLoading || !responseText.trim()}
                          className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98]"
                        >
                          {replyLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                          Send Response & Resolve Ticket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
