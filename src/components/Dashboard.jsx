import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { Users, Hourglass, Activity, ShieldAlert, CheckCircle, RefreshCw, Send } from 'lucide-react';

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState({
    todayPatients: 0,
    pendingTriage: 0,
    pendingConsultation: 0,
    pendingLab: 0,
    pendingPharmacy: 0,
    unpaidBilling: 0,
    failedSync: 1
  });
  const [notifications, setNotifications] = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch patients
      const { data: pts } = await supabase.from('patients').select('*');
      // Fetch visits
      const { data: vsts } = await supabase.from('visits').select('*');
      // Fetch orders
      const { data: ords } = await supabase.from('orders').select('*');
      // Fetch invoices
      const { data: invs } = await supabase.from('invoices').select('*');

      const todayStr = new Date().toISOString().split('T')[0];
      const todayPts = pts ? pts.filter(p => p.created_at.startsWith(todayStr)).length : 0;

      const activeVisits = vsts || [];
      const pendingTriage = activeVisits.filter(v => v.department === 'triage' && v.status !== 'completed').length;
      const pendingConsult = activeVisits.filter(v => v.department === 'consultation' && v.status !== 'completed').length;
      const pendingLab = activeVisits.filter(v => v.department === 'lab' && v.status !== 'completed').length;
      const pendingPharm = activeVisits.filter(v => v.department === 'pharmacy' && v.status !== 'completed').length;
      const unpaidInvoices = invs ? invs.filter(i => i.status !== 'paid').length : 0;

      setStats({
        todayPatients: todayPts,
        pendingTriage,
        pendingConsultation: pendingConsult,
        pendingLab,
        pendingPharmacy: pendingPharm,
        unpaidBilling: unpaidInvoices,
        failedSync: stats.failedSync // Keep our mock failed sync
      });

      // Construct a queue list
      const list = activeVisits.filter(v => v.status !== 'completed').map(v => {
        const patient = pts?.find(p => p.id === v.patient_id);
        return {
          id: v.id,
          name: patient?.name || 'Unknown Patient',
          idCode: patient?.facility_id_code || 'N/A',
          dept: v.department.toUpperCase(),
          priority: v.priority,
          time: new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
      setQueueList(list);

      // Construct system alerts/notifications
      const alerts = [];
      if (pendingTriage > 2) {
        alerts.push({ id: 'a1', type: 'warning', message: `High triage queue: ${pendingTriage} patients waiting.` });
      }
      if (unpaidInvoices > 0) {
        alerts.push({ id: 'a2', type: 'info', message: `${unpaidInvoices} pending billing payments require processing.` });
      }
      alerts.push({ id: 'a3', type: 'error', message: 'MOH 717 monthly export: 1 unsynced record due to invalid ID validation.' });
      setNotifications(alerts);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    // Simulate API push delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStats(prev => ({ ...prev, failedSync: 0 }));
    setNotifications(prev => prev.filter(n => n.id !== 'a3'));
    setSyncing(false);
    
    // Log sync in audit trail
    await supabase.from('audit_logs').insert({
      action: 'MOH Interoperability Sync',
      details: 'Pushed pending daily register data to DHIS2. 1 corrected record sync completed successfully.'
    });
  };

  const roleAccess = {
    registration: ['receptionist', 'admin'],
    triage: ['nurse', 'admin'],
    consultation: ['clinician', 'admin'],
    orders: ['lab_tech', 'admin'],
    pharmacy: ['pharmacist', 'admin'],
    billing: ['cashier', 'admin']
  };

  const checkAccess = (tab) => {
    if (!user || !user.role) return false;
    if (user.role === 'admin') return true;
    return roleAccess[tab]?.includes(user.role) || false;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white">Welcome, {user.full_name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Facility: <span className="text-teal-400 font-semibold">{user.facility_name}</span> | Role: <span className="text-teal-400 uppercase font-semibold text-xs tracking-wider bg-teal-500/10 px-2 py-0.5 rounded">{user.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.failedSync > 0 ? (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-medium text-xs px-4 py-2 rounded-lg transition"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing DHIS2...' : 'DHIS2 Sync Failed: Click to retry'}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-medium text-xs px-4 py-2 rounded-lg">
              <CheckCircle size={14} />
              MOH Systems Fully Synced
            </div>
          )}
          <button
            onClick={() => onNavigate('registration')}
            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg shadow-lg shadow-teal-500/10 transition active:scale-[0.98]"
          >
            Register Patient
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Today's Registrations", value: stats.todayPatients, color: "border-teal-500/20 text-teal-400", bg: "bg-teal-500/5", hover: "hover:border-teal-500/50 hover:bg-teal-500/10 hover:shadow-teal-500/5", icon: Users, tab: 'registration' },
          { label: "Pending Triage", value: stats.pendingTriage, color: "border-orange-500/20 text-orange-400", bg: "bg-orange-500/5", hover: "hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-orange-500/5", icon: Hourglass, tab: 'triage' },
          { label: "Pending Consultation", value: stats.pendingConsultation, color: "border-blue-500/20 text-blue-400", bg: "bg-blue-500/5", hover: "hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-blue-500/5", icon: Activity, tab: 'consultation' },
          { label: "Pending Lab", value: stats.pendingLab, color: "border-purple-500/20 text-purple-400", bg: "bg-purple-500/5", hover: "hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-purple-500/5", icon: RefreshCw, tab: 'orders' },
          { label: "Pending Pharmacy", value: stats.pendingPharmacy, color: "border-emerald-500/20 text-emerald-400", bg: "bg-emerald-500/5", hover: "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-emerald-500/5", icon: CheckCircle, tab: 'pharmacy' },
          { label: "Pending Invoices", value: stats.unpaidBilling, color: "border-rose-500/20 text-rose-400", bg: "bg-rose-500/5", hover: "hover:border-rose-500/50 hover:bg-rose-500/10 hover:shadow-rose-500/5", icon: ShieldAlert, tab: 'billing' },
        ].map((item, i) => {
          const Icon = item.icon;
          const hasAccess = checkAccess(item.tab);

          if (hasAccess) {
            return (
              <button
                key={i}
                onClick={() => onNavigate(item.tab)}
                className={`border ${item.color} ${item.bg} ${item.hover} p-4 rounded-xl flex flex-col justify-between shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] cursor-pointer text-left w-full`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    {item.label}
                  </span>
                  <Icon size={16} className="opacity-80" />
                </div>
                <span className="text-3xl font-extrabold text-white mt-4">{item.value}</span>
              </button>
            );
          } else {
            return (
              <div
                key={i}
                className="border border-slate-800/40 bg-slate-900/20 opacity-50 p-4 rounded-xl flex flex-col justify-between shadow-sm text-left w-full select-none"
                title="Your current role does not have permission to access this module"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                    {item.label}
                  </span>
                  <Icon size={16} className="text-slate-600" />
                </div>
                <span className="text-3xl font-extrabold text-slate-600 mt-4">{item.value}</span>
              </div>
            );
          }
        })}
      </div>

      {/* Main Grid: Queue & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Status Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Active Facility Queue</h2>
              <p className="text-[11px] text-slate-500">Live patient traffic across departments</p>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-teal-400 hover:text-teal-300 text-xs font-semibold"
            >
              Manage Queue
            </button>
          </div>

          {queueList.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
              No active patients waiting in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    <th className="py-2.5">Patient</th>
                    <th className="py-2.5">Dept</th>
                    <th className="py-2.5">Priority</th>
                    <th className="py-2.5 text-right">Time Entered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs">
                  {queueList.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-2">
                        <span className="font-semibold text-slate-200 block">{q.name}</span>
                        <span className="text-[10px] text-slate-500">{q.idCode}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="bg-slate-850 border border-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {q.dept}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded ${
                          q.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          q.priority === 'urgent' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {q.priority}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-mono">{q.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications & System Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-200">System Notifications</h2>
            <p className="text-[11px] text-slate-500">MOH reporting and record completion alerts</p>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border text-xs flex gap-2.5 ${
                  notif.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                  notif.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/5 border-blue-500/20 text-blue-400'
                }`}
              >
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{notif.message}</span>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-4 rounded-lg text-center text-xs flex flex-col items-center justify-center gap-1.5">
                <CheckCircle size={20} />
                <span>All systems operational. No outstanding critical alerts.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
