import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Calendar, 
  Clock, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Plus, 
  UserCheck, 
  RefreshCw, 
  FileText,
  Clock3
} from 'lucide-react';

export default function StaffScheduler({ user, profiles = [], fetchAdminData }) {
  const [activeSubTab, setActiveSubTab] = useState('roster'); // 'roster', 'attendance_logs', 'clock_widget'
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Assign shift drawer/modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [targetDay, setTargetDay] = useState('Monday');
  const [shiftType, setShiftType] = useState('Morning');
  const [department, setDepartment] = useState('consultation');

  // Clock in/out widget state
  const [activeAttendanceLog, setActiveAttendanceLog] = useState(null);
  const [clockNotes, setClockNotes] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shiftTypes = ['Morning', 'Afternoon', 'Night', 'On-Call'];
  const departments = ['triage', 'consultation', 'lab', 'pharmacy', 'radiology', 'ward'];

  // Check roles: Duty Roster & Attendance admin tools are only visible to admins, facility_admins, or HR
  const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
  const hasAdminPrivilege = rolesList.includes('admin') || rolesList.includes('facility_admin') || rolesList.includes('hr_manager');

  useEffect(() => {
    fetchSchedulerData();
  }, [user]);

  const fetchSchedulerData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Duty Rosters
      const { data: rosterData, error: rosterErr } = await supabase
        .from('duty_rosters')
        .select('*')
        .eq('facility_id', user.facility_id);
      if (rosterErr) throw rosterErr;
      setRoster(rosterData || []);

      // 2. Fetch Attendance Logs
      const { data: attData, error: attErr } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('facility_id', user.facility_id)
        .order('clock_in', { ascending: false });
      if (attErr) throw attErr;
      setAttendance(attData || []);

      // 3. Find if logged-in user is currently clocked-in
      const activeLog = attData?.find(log => log.user_id === user.id && !log.clock_out);
      setActiveAttendanceLog(activeLog || null);

    } catch (err) {
      console.error('Error loading scheduler data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    if (!targetEmployeeId) {
      setMessage({ type: 'error', text: 'Please select an employee.' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const selectedEmp = profiles.find(p => p.id === targetEmployeeId);
      
      // Delete existing shift if scheduled for the same employee and day to prevent duplicates
      await supabase
        .from('duty_rosters')
        .delete()
        .eq('user_id', targetEmployeeId)
        .eq('day_of_week', targetDay);

      // Insert new shift allocation
      const shiftId = 'shift_' + Math.random().toString(36).substring(2, 12);
      const { error } = await supabase
        .from('duty_rosters')
        .insert({
          id: shiftId,
          facility_id: user.facility_id,
          user_id: targetEmployeeId,
          day_of_week: targetDay,
          shift_type: shiftType,
          department: department,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send a notification to the scheduled employee
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      await supabase
        .from('notifications')
        .insert({
          id: notifId,
          facility_id: user.facility_id,
          user_id: targetEmployeeId,
          title: 'New Shift Scheduled',
          message: `You have been allocated a ${shiftType} shift in the ${department.toUpperCase()} department on ${targetDay}.`,
          is_read: false,
          created_at: new Date().toISOString()
        });

      // Log in audit trail
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Shift Assigned',
        details: `Assigned ${selectedEmp ? selectedEmp.full_name : 'Staff'} to ${shiftType} shift on ${targetDay} in ${department.toUpperCase()} department.`
      });

      setMessage({ type: 'success', text: 'Shift assigned and notification sent successfully!' });
      setIsAssignModalOpen(false);
      fetchSchedulerData();

    } catch (err) {
      console.error('Error assigning shift:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to assign shift.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Determine status: Late if clock-in is after 08:00 AM
      let status = "On-Time";
      if (hours > 8 || (hours === 8 && minutes > 0)) {
        status = "Late";
      }

      const logId = 'att_' + Math.random().toString(36).substring(2, 12);
      const newLog = {
        id: logId,
        facility_id: user.facility_id,
        user_id: user.id,
        clock_in: now.toISOString(),
        clock_out: null,
        status: status,
        notes: clockNotes.trim() || 'Manual Check-in',
        created_at: now.toISOString()
      };

      const { error } = await supabase
        .from('attendance_logs')
        .insert(newLog);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Clock-In',
        details: `Staff clocked in at ${now.toLocaleTimeString()} with status ${status}. Notes: ${clockNotes}`
      });

      // Send alert notification if late
      if (status === 'Late') {
        const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
        await supabase.from('notifications').insert({
          id: notifId,
          facility_id: user.facility_id,
          title: 'Late Clock-in Flagged',
          message: `${user.full_name} checked in late today at ${now.toLocaleTimeString()}. Notes: ${clockNotes}`,
          target_role: 'admin',
          is_read: false,
          created_at: now.toISOString()
        });
      }

      setClockNotes('');
      setMessage({ type: 'success', text: 'You have clocked in successfully!' });
      fetchSchedulerData();

    } catch (err) {
      console.error('Error clocking in:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to clock in.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeAttendanceLog) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const now = new Date();
      const hours = now.getHours();
      
      let status = activeAttendanceLog.status;
      // Early departure if clocked out before 5:00 PM (17:00)
      if (hours < 17) {
        status = status + " / Early Departure";
      }

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          clock_out: now.toISOString(),
          status: status,
          notes: clockNotes.trim() ? `${activeAttendanceLog.notes} | Out: ${clockNotes.trim()}` : activeAttendanceLog.notes
        })
        .eq('id', activeAttendanceLog.id);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Clock-Out',
        details: `Staff clocked out at ${now.toLocaleTimeString()} with final status ${status}.`
      });

      setClockNotes('');
      setMessage({ type: 'success', text: 'You have clocked out successfully!' });
      fetchSchedulerData();

    } catch (err) {
      console.error('Error clocking out:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to clock out.' });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteShift = async (shiftId) => {
    if (!confirm('Are you sure you want to remove this shift?')) return;
    try {
      const { error } = await supabase
        .from('duty_rosters')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;
      fetchSchedulerData();
    } catch (err) {
      console.error('Error deleting shift:', err);
    }
  };

  const getShiftInCell = (empId, day) => {
    return roster.find(r => r.user_id === empId && r.day_of_week === day);
  };

  const getEmployeeName = (empId) => {
    const emp = profiles.find(p => p.id === empId);
    return emp ? emp.full_name : 'Unknown Staff';
  };

  return (
    <div className="space-y-6 pb-4 animate-fadeIn">
      {/* Subtab Navigation header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('roster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Calendar size={13} /> Weekly Roster Grid
          </button>
          {hasAdminPrivilege && (
            <button
              onClick={() => setActiveSubTab('attendance_logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'attendance_logs'
                  ? 'bg-slate-850 border border-slate-700 text-teal-400'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <UserCheck size={13} /> Live Attendance Logs
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('clock_widget')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'clock_widget'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Clock size={13} /> Clock-In / Out Widget
          </button>
        </div>

        <button
          onClick={fetchSchedulerData}
          className="p-1 rounded bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition"
          title="Reload Roster"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {message && (
        <div className={`p-2.5 rounded text-xs flex gap-2 items-start max-w-md ${
          message.type === 'success' 
            ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' 
            : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. WEEKLY ROSTER GRID */}
      {activeSubTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wide">Duty Shift Roster</h5>
              <p className="text-[9.5px] text-slate-500 mt-0.5">Assign shifts to healthcare clinicians and manage departments</p>
            </div>
            {hasAdminPrivilege && (
              <button
                onClick={() => {
                  setTargetEmployeeId('');
                  setIsAssignModalOpen(true);
                }}
                className="flex items-center gap-1 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-[10.5px] px-2.5 py-1.5 rounded-lg shadow transition active:scale-[0.97] cursor-pointer"
              >
                <Plus size={12} /> Allocate Shift
              </button>
            )}
          </div>

          <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px] min-w-[800px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3 w-[150px]">Employee</th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="p-3 text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-sans">
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-5 text-center text-slate-600 font-medium">No registered clinicians found.</td>
                    </tr>
                  ) : (
                    profiles.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-900/30 text-slate-400">
                        <td className="p-3 whitespace-nowrap font-bold text-slate-200 border-r border-slate-850 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-850 flex items-center justify-center font-bold text-[10px] text-teal-400 shrink-0">
                            {emp.full_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <span className="block truncate font-bold text-slate-200">{emp.full_name}</span>
                            <span className="block text-[8.5px] text-slate-500 uppercase font-mono">{emp.role?.split(',')[0]}</span>
                          </div>
                        </td>
                        {daysOfWeek.map((day) => {
                          const shift = getShiftInCell(emp.id, day);
                          return (
                            <td key={day} className="p-2 border-r border-slate-850 text-center relative group min-h-[50px] align-middle">
                              {shift ? (
                                <div className="p-1.5 rounded-lg border bg-slate-950/80 text-[9.5px] text-slate-300 font-medium border-slate-800 space-y-0.5 shadow relative">
                                  <span className={`block font-bold text-[9px] px-1 py-0.5 rounded ${
                                    shift.shift_type === 'Morning' ? 'bg-emerald-500/10 text-emerald-400' :
                                    shift.shift_type === 'Afternoon' ? 'bg-sky-500/10 text-sky-400' :
                                    shift.shift_type === 'Night' ? 'bg-purple-500/10 text-purple-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {shift.shift_type}
                                  </span>
                                  <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{shift.department}</span>
                                  {hasAdminPrivilege && (
                                    <button
                                      onClick={() => deleteShift(shift.id)}
                                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500/20 text-red-400 text-[8px] font-black items-center justify-center hidden group-hover:flex border border-red-500/30 shadow transition cursor-pointer hover:bg-red-500 hover:text-white"
                                      title="Remove shift"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center min-h-[30px]">
                                  {hasAdminPrivilege ? (
                                    <button
                                      onClick={() => {
                                        setTargetEmployeeId(emp.id);
                                        setTargetDay(day);
                                        setIsAssignModalOpen(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 rounded-full bg-slate-850 hover:bg-teal-500/20 text-slate-500 hover:text-teal-400 transition cursor-pointer shadow border border-slate-800/80"
                                      title={`Assign shift to ${emp.full_name} on ${day}`}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  ) : (
                                    <span className="text-slate-650">—</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIVE ATTENDANCE LOGS */}
      {activeSubTab === 'attendance_logs' && hasAdminPrivilege && (
        <div className="space-y-4">
          <div>
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wide">Live Staff Attendance Logs</h5>
            <p className="text-[9.5px] text-slate-500 mt-0.5">Track employee check-in timestamps, departures, and lateness logs</p>
          </div>

          <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Staff Employee</th>
                    <th className="p-2.5">Clock-In Time</th>
                    <th className="p-2.5">Clock-Out Time</th>
                    <th className="p-2.5">Lateness Status</th>
                    <th className="p-2.5">Audit / Shift Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-sans">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-5 text-center text-slate-650 font-medium">No check-in logs recorded.</td>
                    </tr>
                  ) : (
                    attendance.map((log) => {
                      const isLate = log.status?.includes('Late');
                      const hasEarly = log.status?.includes('Early Departure');
                      return (
                        <tr key={log.id} className="hover:bg-slate-900/30 text-slate-400">
                          <td className="p-2.5 whitespace-nowrap text-[9.5px]">
                            {new Date(log.clock_in).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 font-bold text-slate-200 whitespace-nowrap">
                            {getEmployeeName(log.user_id)}
                          </td>
                          <td className="p-2.5 text-slate-350 font-mono">
                            {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-2.5 text-slate-350 font-mono">
                            {log.clock_out ? (
                              new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            ) : (
                              <span className="text-teal-400/90 font-bold flex items-center gap-1 animate-pulse text-[9px] tracking-wide uppercase">
                                <Clock3 size={10} /> Active
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              isLate ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                              hasEarly ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' :
                              'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-2.5 max-w-[200px] truncate" title={log.notes}>
                            {log.notes}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLOCK IN / OUT WIDGET */}
      {activeSubTab === 'clock_widget' && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
            <div className={`p-2.5 rounded-xl border ${
              activeAttendanceLog ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' : 'text-slate-550 bg-slate-950 border-slate-850'
            }`}>
              <Clock size={20} />
            </div>
            <div>
              <h5 className="text-[12px] font-bold text-slate-200 uppercase tracking-wide">Staff Punch Console</h5>
              <p className="text-[10px] text-slate-500">Record check-in time and checkout departure times</p>
            </div>
          </div>

          {/* Current Punch Status indicator */}
          <div className="bg-slate-950 border border-slate-850/80 rounded-xl p-4 text-center space-y-2">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Operational Status</span>
            
            {activeAttendanceLog ? (
              <div className="space-y-1">
                <span className="text-xs font-black text-teal-400 uppercase tracking-wide block animate-pulse">✓ Currently Clocked-In</span>
                <p className="text-[10.5px] text-slate-400 leading-normal font-sans">
                  Checked in at <span className="font-mono text-slate-200 font-bold">{new Date(activeAttendanceLog.clock_in).toLocaleTimeString()}</span> on {new Date(activeAttendanceLog.clock_in).toLocaleDateString()}
                </p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[8.5px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold">
                  {activeAttendanceLog.status}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wide block">✕ Clocked-Out</span>
                <p className="text-[10.5px] text-slate-450 leading-normal font-sans">You are not clocked in today. Please submit punch-in timestamp when shift begins.</p>
              </div>
            )}
          </div>

          {/* Action inputs */}
          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Punch Log Notes (Optional)</label>
              <input
                type="text"
                placeholder={activeAttendanceLog ? "e.g. Completed pharmacy handover shift" : "e.g. On-time check-in, consulting ward duty"}
                value={clockNotes}
                onChange={(e) => setClockNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50 placeholder:text-slate-650"
              />
            </div>

            <div className="flex gap-3">
              {activeAttendanceLog ? (
                <button
                  onClick={handleClockOut}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <Clock size={13} />
                  <span>{actionLoading ? 'Saving departure...' : 'Clock-Out Departure'}</span>
                </button>
              ) : (
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <Clock size={13} />
                  <span>{actionLoading ? 'Saving check-in...' : 'Clock-In Entry'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. ALLOCATE SHIFT MODAL DRAWER */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h6 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-teal-400" /> Roster Shift Allocation
              </h6>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-450 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignShift} className="space-y-3.5">
              {/* Employee selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Staff Employee</label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  <option value="">-- Select Clinician --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role?.split(',')[0].toUpperCase()})</option>
                  ))}
                </select>
              </div>

              {/* Day selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Day of the Week</label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  {daysOfWeek.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Shift type selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Shift Type</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  {shiftTypes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Department selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Hospital Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 focus:outline-none focus:border-teal-500/50"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <UserCheck size={12} />
                <span>{actionLoading ? 'Allocating...' : 'Assign Shift Schedule'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
