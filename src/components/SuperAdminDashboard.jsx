import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  LogOut, 
  Sliders, 
  Clock, 
  Lock, 
  Unlock,
  AlertCircle
} from 'lucide-react';

export default function SuperAdminDashboard({ user, onSignOut }) {
  const [facilities, setFacilities] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores facilityId during action
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('registry'); // 'registry' | 'audit'

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
          <div className="bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/10">
            <ShieldCheck size={26} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-black tracking-wider text-white uppercase leading-none">Eagle Tech Systems Control</h1>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest block mt-1">Super Administrative Supervisor Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        ) : (
          /* SYSTEM AUDIT PANEL */
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5">
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
        )}
      </main>
    </div>
  );
}
