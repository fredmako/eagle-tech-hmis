import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Send, Users, User, ShieldAlert, PhoneCall, History, CheckCircle, AlertTriangle } from 'lucide-react';

export default function BroadcastPanel({ user, profiles = [], fetchAdminData }) {
  const [targetType, setTargetType] = useState('all'); // 'all', 'role', 'single', 'support'
  const [selectedRole, setSelectedRole] = useState('nurse');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Extract unique roles from active staff profiles list
  const rolesList = ['admin', 'facility_admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist', 'hr_manager'];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching broadcast history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both a title and message.' });
      return;
    }
    if (targetType === 'single' && !selectedUserId) {
      setStatusMessage({ type: 'error', text: 'Please select a target employee.' });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      
      if (targetType === 'support') {
        // 1. Submit a support ticket targeting platform
        const ticketId = 'ticket_' + Math.random().toString(36).substring(2, 12);
        const { error: ticketErr } = await supabase
          .from('support_tickets')
          .insert({
            id: ticketId,
            user_name: user.full_name || 'Administrator',
            user_email: user.email,
            subject: title,
            message: message,
            status: 'pending',
            facility_id: user.facility_id
          });

        if (ticketErr) throw ticketErr;

        // 2. Also insert a notification record to log the action locally
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert({
            id: notifId,
            facility_id: user.facility_id,
            title: `Escalated: ${title}`,
            message: `Ticket successfully filed to Eagle Tech Support: "${message.substring(0, 80)}..."`,
            is_read: false,
            created_at: new Date().toISOString()
          });

        if (notifErr) throw notifErr;

        setStatusMessage({ 
          type: 'success', 
          text: 'Technical support ticket successfully filed. Platform engineers have been notified.' 
        });

      } else {
        // Broadcast / Alert directed to employees
        const notificationData = {
          id: notifId,
          facility_id: user.facility_id,
          title: title.trim(),
          message: message.trim(),
          is_read: false,
          created_at: new Date().toISOString()
        };

        if (targetType === 'single') {
          notificationData.user_id = selectedUserId;
        } else if (targetType === 'role') {
          notificationData.target_role = selectedRole;
        }

        const { error } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (error) throw error;

        // Write to audit log
        await supabase.from('audit_logs').insert({
          facility_id: user.facility_id,
          user_id: user.id,
          action: 'Alert Broadcast Sent',
          details: `Sent broadcast titled "${title}" targeting ${
            targetType === 'all' ? 'All Employees' : targetType === 'role' ? `Role: ${selectedRole}` : `Employee ID: ${selectedUserId}`
          }`
        });

        setStatusMessage({ 
          type: 'success', 
          text: `Broadcast alert successfully dispatched to ${
            targetType === 'all' ? 'all employees' : targetType === 'role' ? `the ${selectedRole} group` : 'the selected employee'
          }!` 
        });
      }

      // Reset Form fields
      setTitle('');
      setMessage('');
      fetchHistory();
      if (fetchAdminData) fetchAdminData();

    } catch (err) {
      console.error('Error dispatching broadcast:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch broadcast alert.' });
    } finally {
      setSending(false);
    }
  };

  const getTargetLabel = (notif) => {
    if (notif.title.startsWith('Escalated:')) return 'Eagle Tech Support';
    if (notif.user_id) {
      const emp = profiles.find(p => p.id === notif.user_id);
      return emp ? `Single: ${emp.full_name}` : 'Single Employee';
    }
    if (notif.target_role) {
      return `Role: ${notif.target_role.toUpperCase()}`;
    }
    return 'All Employees';
  };

  return (
    <div className="space-y-6 pb-4 animate-fadeIn">
      {/* Tab/Section Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <ShieldAlert size={14} className="text-teal-400" /> Administrative Alerts & Broadcasts
        </h4>
        <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-[10px] font-bold font-sans">
          Notification Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Composer Form */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wide">Compose Outbound Alert</h5>

          {statusMessage && (
            <div className={`p-2.5 rounded text-xs flex gap-2 items-start ${
              statusMessage.type === 'success' 
                ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' 
                : 'bg-red-500/5 border border-red-500/20 text-red-400'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-3.5">
            {/* Target Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'All Staff', icon: Users },
                  { id: 'role', label: 'By Role Group', icon: ShieldAlert },
                  { id: 'single', label: 'Single Staff', icon: User },
                  { id: 'support', label: 'Eagle Support', icon: PhoneCall }
                ].map((target) => {
                  const Icon = target.icon;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setTargetType(target.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition text-left cursor-pointer ${
                        targetType === target.id
                          ? 'bg-teal-500/10 border-teal-500/30 text-teal-450'
                          : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800'
                      }`}
                    >
                      <Icon size={12} /> {target.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Target Selection Dropdowns */}
            {targetType === 'role' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Select Role Group</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r.toUpperCase().replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'single' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Select Employee</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role?.split(',')[0].toUpperCase()})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {targetType === 'support' ? 'Support Ticket Subject' : 'Alert Title'}
              </label>
              <input
                type="text"
                placeholder={targetType === 'support' ? 'e.g. Cannot dispense drug due to inventory lock' : 'e.g. Scheduled System Downtime'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50 placeholder:text-slate-650"
              />
            </div>

            {/* Message Input */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Message Details</label>
              <textarea
                rows={4}
                placeholder={targetType === 'support' ? 'Detail the issue and steps to reproduce. Our technical support will investigate immediately.' : 'Compose your broadcast notification details here...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50 placeholder:text-slate-650 resize-none font-sans"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-1.5 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Send size={12} />
              <span>{sending ? 'Dispatching...' : targetType === 'support' ? 'Escalate Inquiry' : 'Send Broadcast'}</span>
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-3 bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wide flex items-center gap-1">
              <History size={12} /> Outbound Alert History
            </h5>
            <button
              onClick={fetchHistory}
              className="text-[9px] text-teal-400 font-bold uppercase hover:underline cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Target</th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Message snippet</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-sans">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-slate-500 font-medium">Loading history logs...</td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-slate-650 font-medium">No past alerts recorded.</td>
                    </tr>
                  ) : (
                    history.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/30 text-slate-400">
                        <td className="p-2.5 whitespace-nowrap text-[9.5px]">
                          {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-bold text-teal-400/90 text-[9.5px]">
                          {getTargetLabel(log)}
                        </td>
                        <td className="p-2.5 font-bold text-slate-200">{log.title}</td>
                        <td className="p-2.5 max-w-[150px] truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            log.is_read 
                              ? 'bg-slate-800 text-slate-400' 
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}>
                            {log.is_read ? 'READ' : 'SENT'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
