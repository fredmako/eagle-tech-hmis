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
  Clock3,
  MapPin,
  Navigation
} from 'lucide-react';

export default function StaffScheduler({ user, profiles = [], fetchAdminData, dbDepartments = [] }) {
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
  const [facilityGeo, setFacilityGeo] = useState(null);

  // Offline Geofenced Caching States
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('egesa_offline_attendance');
    return saved ? JSON.parse(saved) : [];
  });
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Helper to fetch current location via HTML5 Geolocation API
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (err) => {
            let msg = "Failed to retrieve location. Please enable location permissions.";
            if (err.code === err.PERMISSION_DENIED) {
              msg = "Location permission was denied. You must enable location services to check in/out.";
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              msg = "Location information is unavailable.";
            } else if (err.code === err.TIMEOUT) {
              msg = "Retrieving location timed out.";
            }
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }
    });
  };

  // Sync offline captured logs back to the server
  const syncOfflineLogs = async (logsToSync = offlineQueue) => {
    if (logsToSync.length === 0 || !navigator.onLine) return;
    setSyncingOffline(true);
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/attendance/sync-offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logs: logsToSync })
      });
      
      if (res.ok) {
        const data = await res.json();
        const syncedCount = data.results.filter(r => r.status === 'synced').length;
        const declined = data.results.filter(r => r.status === 'declined');
        
        let feedback = `Offline synchronization complete. ${syncedCount} log(s) synced.`;
        if (declined.length > 0) {
          feedback += ` ${declined.length} log(s) declined: ${declined.map(d => d.reason).join(', ')}`;
        }
        
        setMessage({ type: declined.length > 0 ? 'error' : 'success', text: feedback });
        localStorage.removeItem('egesa_offline_attendance');
        setOfflineQueue([]);
        fetchSchedulerData();
      } else {
        throw new Error("Batch sync failed on server.");
      }
    } catch (err) {
      console.error("Failed to sync offline logs:", err);
      setMessage({ type: 'error', text: 'Offline sync failed: ' + err.message });
    } finally {
      setSyncingOffline(false);
    }
  };

  // Trigger offline sync when connection comes back online
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineLogs();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [offlineQueue]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shiftTypes = ['Morning', 'Afternoon', 'Night', 'On-Call'];
  const shiftWindows = {
    Morning: { start: '08:00', end: '13:00' },
    Afternoon: { start: '13:00', end: '17:00' },
    Night: { start: '17:00', end: '08:00' },
    'On-Call': { start: '00:00', end: '23:59' }
  };
  
  // Get active departments from module config
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [roleAllocations, setRoleAllocations] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  useEffect(() => {
    const fetchActiveDepts = async () => {
      try {
        const { data: moduleData } = await supabase
          .from('module_config')
          .select('module_key')
          .eq('facility_id', user.facility_id)
          .eq('is_active', true);
        
        if (moduleData) {
          setActiveDepartments(moduleData.map(m => m.module_key));
        }
      } catch (err) {
        console.error('Error fetching active departments:', err);
      }
    };
    
    fetchActiveDepts();
  }, [user.facility_id]);

  const fetchRoleAllocations = async () => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('roster_role_assignments')
        .select('*, profiles(full_name, role, email)')
        .eq('facility_id', user.facility_id)
        .order('department_code');

      if (error) throw error;

      const allocations = {};
      data.forEach(assignment => {
        if (!allocations[assignment.department_code]) {
          allocations[assignment.department_code] = [];
        }
        allocations[assignment.department_code].push({
          id: assignment.id,
          profileId: assignment.profile_id,
          name: assignment.profiles?.full_name || 'Unknown',
          role: assignment.profiles?.role || 'N/A',
          email: assignment.profiles?.email || '',
          canManageRoster: assignment.can_manage_roster,
          canViewRoster: assignment.can_view_roster,
          canApproveAttendance: assignment.can_approve_attendance
        });
      });
      setRoleAllocations(allocations);
    } catch (err) {
      console.error('Error fetching role allocations:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'role_allocations') {
      fetchRoleAllocations();
    }
  }, [activeSubTab]);

  const departments = dbDepartments.length > 0
    ? dbDepartments.map(d => d.type || d.name.toLowerCase()).filter(d => activeDepartments.includes(d))
    : ['triage', 'consultation', 'lab', 'pharmacy', 'radiology', 'ward', 'cleaning', 'security', 'emergency', 'kitchen'].filter(d => activeDepartments.includes(d));

  // Check roles: Duty Roster & Attendance admin tools are only visible to admins, facility_admins, or HR
  const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
  const hasAdminPrivilege = rolesList.includes('admin') || rolesList.includes('facility_admin') || rolesList.includes('hr_manager');

  const getTodayRoster = () => {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return roster.find((shift) => shift.user_id === user.id && shift.day_of_week === todayName) || null;
  };

  const todayRoster = getTodayRoster();
  const todayWindow = todayRoster ? shiftWindows[todayRoster.shift_type] || shiftWindows['On-Call'] : null;

  useEffect(() => {
    if (dbDepartments.length > 0) {
      const firstDept = dbDepartments[0].type || dbDepartments[0].name.toLowerCase();
      setDepartment(firstDept);
    }
  }, [dbDepartments]);

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

      const { data: facData } = await supabase
        .from('facilities')
        .select('id,name,address,latitude,longitude,geofence_radius_meters')
        .eq('id', user.facility_id)
        .maybeSingle();
      setFacilityGeo(facData || null);

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

  const handleClockIn = async (noteOverride = null) => {
    setActionLoading(true);
    setMessage(null);
    try {
      let coords = null;
      try {
        coords = await getCurrentLocation();
      } catch (locErr) {
        throw new Error(locErr.message);
      }

      // Check if offline
      const punchNotes = noteOverride ?? clockNotes.trim();

      if (!navigator.onLine) {
        const queueId = 'off_in_' + Date.now();
        const offlineLog = {
          id: queueId,
          type: 'in',
          timestamp: new Date().toISOString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: punchNotes || 'Offline Clock-In'
        };
        const updatedQueue = [...offlineQueue, offlineLog];
        localStorage.setItem('egesa_offline_attendance', JSON.stringify(updatedQueue));
        setOfflineQueue(updatedQueue);
        
        setClockNotes('');
        setMessage({ type: 'error', text: 'No internet detected. Location captured. Sync will run automatically when online.' });
        return;
      }

      // Online: call backend endpoint
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: punchNotes || 'Manual Check-in'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clock in.');
      }

      setClockNotes('');
      setMessage({ type: 'success', text: 'You have clocked in successfully within facility boundaries!' });
      fetchSchedulerData();

    } catch (err) {
      console.error('Error clocking in:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to clock in.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async (noteOverride = null) => {
    if (!activeAttendanceLog) return;
    setActionLoading(true);
    setMessage(null);

    try {
      let coords = null;
      try {
        coords = await getCurrentLocation();
      } catch (locErr) {
        throw new Error(locErr.message);
      }

      const punchNotes = noteOverride ?? clockNotes.trim();

      // Check if offline
      if (!navigator.onLine) {
        const queueId = 'off_out_' + Date.now();
        const offlineLog = {
          id: queueId,
          type: 'out',
          timestamp: new Date().toISOString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: punchNotes || 'Offline Clock-Out'
        };
        const updatedQueue = [...offlineQueue, offlineLog];
        localStorage.setItem('egesa_offline_attendance', JSON.stringify(updatedQueue));
        setOfflineQueue(updatedQueue);

        setClockNotes('');
        setMessage({ type: 'error', text: 'No internet detected. Location captured. Sync will run automatically when online.' });
        return;
      }

      // Online: call backend endpoint
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: punchNotes || 'Manual Check-out'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clock out.');
      }

      setClockNotes('');
      setMessage({ type: 'success', text: 'You have clocked out successfully within facility boundaries!' });
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
          {hasAdminPrivilege && (
            <button
              onClick={() => { setActiveSubTab('role_allocations'); fetchRoleAllocations(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'role_allocations'
                  ? 'bg-slate-850 border border-slate-700 text-teal-400'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Users size={13} /> Role Allocations
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
                    <th className="p-3 w-37.5">Employee</th>
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
                          <div className="h-6 w-6 rounded-full bg-slate-850 flex items-center justify-center font-bold text-2xs text-teal-400 shrink-0">
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
              <table className="w-full text-left border-collapse text-2xs">
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

      {/* 2.5 ROLE ALLOCATIONS VIEW */}
      {activeSubTab === 'role_allocations' && hasAdminPrivilege && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wide">Department Role Allocations</h5>
              <p className="text-[9.5px] text-slate-500 mt-0.5">Staff members assigned to each department with their permissions</p>
            </div>
            <button
              onClick={fetchRoleAllocations}
              disabled={loadingRoles}
              className="p-1 rounded bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition"
            >
              <RefreshCw size={12} className={loadingRoles ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingRoles ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent mx-auto mb-2" />
              <p className="text-2xs text-slate-500">Loading role allocations...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(roleAllocations).length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-950/30 border border-slate-850 rounded-xl">
                  <Users size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No role allocations found</p>
                  <p className="text-2xs text-slate-600 mt-1">Assign staff to departments from Admin → Dept Activation</p>
                </div>
              ) : (
                Object.entries(roleAllocations).map(([deptCode, allocations]) => {
                  const deptNames = {
                    reception: 'Reception',
                    doctors: 'Consultation',
                    laboratory: 'Laboratory',
                    pharmacy: 'Pharmacy',
                    billing: 'Billing',
                    inpatient: 'Inpatient',
                    maternity: 'Maternity',
                    hr: 'HR',
                    cleaning: 'Cleaning',
                    security: 'Security',
                    emergency: 'Emergency Unit',
                    kitchen: 'Kitchen'
                  };
                  const deptName = deptNames[deptCode] || deptCode.toUpperCase();

                  return (
                    <div key={deptCode} className="bg-slate-950/40 border border-slate-850 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                        <h6 className="text-xs font-bold text-slate-300 uppercase">{deptName}</h6>
                        <span className="text-2xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                          {allocations.length} staff
                        </span>
                      </div>

                      <div className="space-y-2">
                        {allocations.map(allocation => (
                          <div key={allocation.id} className="flex items-start justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-850/50 hover:border-slate-800 transition">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-2xs text-teal-400 shrink-0">
                                  {allocation.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-2xs font-semibold text-slate-200 truncate">{allocation.name}</div>
                                  <div className="text-[9px] text-slate-500 truncate">{allocation.role} • {allocation.email}</div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2 shrink-0">
                              {allocation.canManageRoster && (
                                <span className="text-[8px] font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20" title="Can manage roster">
                                  MGR
                                </span>
                              )}
                              {allocation.canViewRoster && (
                                <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20" title="Can view roster">
                                  VIEW
                                </span>
                              )}
                              {allocation.canApproveAttendance && (
                                <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Can approve attendance">
                                  APPR
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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
              <p className="text-2xs text-slate-500">Record check-in time and checkout departure times</p>
            </div>
          </div>

          {/* Offline Pending Queue Banner */}
          {offlineQueue.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-2xs font-sans leading-relaxed animate-pulse">
              ⚠️ You have <strong>{offlineQueue.length} offline punch log(s)</strong> waiting for internet connection to sync.
            </div>
          )}

          {/* Automatic Shift Attendance Prompt */}
          {todayRoster && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl space-y-2 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[8px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Clock3 size={10} /> Automatic Shift Detection
                  </span>
                  <p className="text-2xs text-slate-300 font-semibold mt-1">
                    Today: {todayRoster.shift_type} shift in {String(todayRoster.department || 'assigned department').toUpperCase()}
                    {todayWindow ? ` (${todayWindow.start}-${todayWindow.end})` : ''}
                  </p>
                </div>
                {!activeAttendanceLog && (
                  <button
                    type="button"
                    onClick={() => {
                      const autoNote = `Auto shift check-in: ${todayRoster.shift_type} ${todayRoster.department || ''}`.trim();
                      setClockNotes(autoNote);
                      handleClockIn(autoNote);
                    }}
                    disabled={actionLoading}
                    className="shrink-0 bg-blue-400 hover:bg-blue-300 text-slate-950 text-2xs font-black px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Auto Clock-In
                  </button>
                )}
              </div>
              <p className="text-[9.5px] text-slate-450 leading-relaxed">
                The system detected your rostered shift. Attendance still requests device location so the geofence proof is attached to the punch log.
              </p>
            </div>
          )}

          {/* Geofence Status Information */}
          <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl space-y-1 text-left">
            <span className="text-[8px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin size={10} /> Boundary Verification Active
            </span>
            <p className="text-2xs text-slate-400 font-sans leading-normal">
              Clocking is geofence-restricted. You must be physically present within {facilityGeo?.geofence_radius_meters || 100} meters of the facility to register attendance. Offline clock-ins capture your device coordinates and will be verified by the server upon sync.
            </p>
            {facilityGeo?.latitude && facilityGeo?.longitude && (
              <div className="pt-2 space-y-2">
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                  <iframe
                    title="OpenStreetMap attendance geofence"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(facilityGeo.longitude) - 0.004}%2C${Number(facilityGeo.latitude) - 0.004}%2C${Number(facilityGeo.longitude) + 0.004}%2C${Number(facilityGeo.latitude) + 0.004}&layer=mapnik&marker=${facilityGeo.latitude}%2C${facilityGeo.longitude}`}
                    className="w-full h-36 border-0"
                    loading="lazy"
                  />
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${facilityGeo.latitude}&mlon=${facilityGeo.longitude}#map=17/${facilityGeo.latitude}/${facilityGeo.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-2xs text-teal-400 hover:text-teal-300 font-bold"
                >
                  <Navigation size={10} /> Open facility geofence in OpenStreetMap
                </a>
              </div>
            )}
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
