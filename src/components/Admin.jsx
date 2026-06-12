import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Settings, Shield, UserPlus, ListTodo, CheckCircle } from 'lucide-react';

export default function Admin({ user }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [facilityDetails, setFacilityDetails] = useState({ name: '', code: '' });
  
  // Create user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('nurse');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch audit logs
      const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      setAuditLogs(logs || []);

      // Fetch profiles
      const { data: profs } = await supabase.from('profiles').select('*');
      setUsersList(profs || []);

      // Fetch facilities
      const { data: facs } = await supabase.from('facilities').select('*');
      const activeFac = facs?.find(f => f.id === user.facility_id);
      if (activeFac) {
        setFacilityDetails({ name: activeFac.name, code: activeFac.code });
      }
    } catch (err) {
      console.error('Error fetching admin details:', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      // Simulate profile creation (auth.users inserts usually handled by triggers,
      // but in sandbox it goes straight to profiles)
      const randId = Math.random().toString(36).substring(2, 11);
      const newProfile = {
        id: randId,
        full_name: newUserName,
        role: newUserRole,
        facility_id: user.facility_id
      };

      const { error } = await supabase.from('profiles').insert(newProfile);
      if (error) throw error;

      setMessage('New user account profile configured successfully!');
      setNewUserName('');
      fetchAdminData();
    } catch (err) {
      setMessage(`Config error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Columns: Config & Users */}
      <div className="lg:col-span-1 space-y-6">
        {/* Facility Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <Settings size={14} className="text-teal-400" /> Facility Configuration
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-500 block">Facility Name</span>
              <span className="font-semibold text-slate-200">{facilityDetails.name || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">MOH Facility Code</span>
              <span className="font-semibold text-teal-400 font-mono">{facilityDetails.code || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Active Service Departments</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['Triage', 'Outpatient Consult', 'Laboratory', 'Pharmacy', 'Billing'].map(d => (
                  <span key={d} className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-400">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <UserPlus size={14} className="text-teal-400" /> Register Healthcare User
          </h3>

          {message && (
            <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-xs flex gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Dr. Jane Doe / Nurse"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Operational Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="receptionist">Receptionist</option>
                <option value="nurse">Triage Nurse</option>
                <option value="clinician">Clinician (Doctor)</option>
                <option value="lab_tech">Lab Technician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="cashier">Billing Cashier</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition active:scale-[0.98]"
            >
              Configure Profile
            </button>
          </form>
        </div>
      </div>

      {/* Right Columns: Audit Log Viewer (2/3 width) */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Shield size={16} className="text-teal-400" /> Transaction Audit Log Viewer
          </h3>
          <button
            onClick={fetchAdminData}
            className="text-[10px] text-teal-450 hover:text-teal-400 font-semibold"
          >
            Refresh Log
          </button>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {auditLogs.map((log) => {
            const actor = usersList.find(u => u.id === log.user_id)?.full_name || 'System Auto-Agent';
            return (
              <div key={log.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>Timestamp: {new Date(log.created_at).toLocaleString()}</span>
                  <span className="bg-slate-900 border border-slate-800 text-teal-400 px-1 py-0.5 rounded font-bold uppercase">{log.action}</span>
                </div>
                
                <p className="text-slate-350 leading-relaxed font-medium">
                  {log.details}
                </p>

                <div className="text-[10px] text-slate-500">
                  Transaction Agent: <span className="text-slate-400 font-semibold">{actor}</span>
                </div>
              </div>
            );
          })}

          {auditLogs.length === 0 && (
            <div className="text-xs text-slate-600 text-center py-20">
              No audit log transactions registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
