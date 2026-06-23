import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  UserCheck, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  XCircle,
  Sliders
} from 'lucide-react';

export default function HumanResources({ 
  user, 
  profiles, 
  fetchAdminData,
  roleRequests = [],
  requestsLoading = false,
  requestsMessage = '',
  handleApproveRequest,
  handleRejectRequest
}) {
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(['nurse']);
  const [editingRolesProfileId, setEditingRolesProfileId] = useState(null);
  const [newStaffDept, setNewStaffDept] = useState('general');
  const [actionLoading, setActionLoading] = useState(null); // stores user ID during action
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) {
      setMessage({ type: 'error', text: 'Please fill in all staff details.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Create a mock user ID for direct registration in sandbox or Supabase profiles table
      const profileId = 'u_dir_' + Math.random().toString(36).substring(2, 12);
      const rolesString = Array.isArray(newStaffRole) ? newStaffRole.join(',') : newStaffRole;

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Insert profile via DB proxy
      const insertRes = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'profiles',
          rows: {
            id: profileId,
            full_name: newStaffName,
            role: rolesString,
            facility_id: user.facility_id,
            email: newStaffEmail,
            department: newStaffDept
          }
        })
      });

      if (!insertRes.ok) {
        const errData = await insertRes.json();
        throw new Error(errData.error || 'Failed to insert profile record.');
      }

      // 2. Log configuration change in audit logs via DB proxy
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          rows: {
            facility_id: user.facility_id,
            user_id: user.id,
            action: 'Direct HR Registration',
            details: `Directly registered staff profile ${newStaffName} (${rolesString}) under email ${newStaffEmail}.`
          }
        })
      });

      setMessage({ type: 'success', text: `Staff profile for ${newStaffName} has been successfully registered directly!` });
      setNewStaffName('');
      setNewStaffEmail('');
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Registration failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to register staff profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (profileId, newRole) => {
    setActionLoading(profileId);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const updateRes = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'profiles',
          column: 'id',
          value: profileId,
          values: { role: newRole }
        })
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        throw new Error(errData.error || 'Failed to update profile role.');
      }

      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          rows: {
            facility_id: user.facility_id,
            user_id: user.id,
            action: 'Staff Role Changed',
            details: `Updated role for profile ID ${profileId} to ${newRole.toUpperCase()}.`
          }
        })
      });

      setMessage({ type: 'success', text: 'Staff role has been updated successfully!' });
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Role update failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update staff role.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProfile = async (profileId, staffName) => {
    if (!window.confirm(`Are you sure you want to permanently remove ${staffName} from this facility context?`)) {
      return;
    }
    setActionLoading(profileId);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const deleteRes = await fetch(`${apiBase}/db/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'profiles',
          column: 'id',
          value: profileId
        })
      });

      if (!deleteRes.ok) {
        const errData = await deleteRes.json();
        throw new Error(errData.error || 'Failed to delete profile record.');
      }

      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          rows: {
            facility_id: user.facility_id,
            user_id: user.id,
            action: 'Staff Profile Removed',
            details: `Permanently removed staff profile for ${staffName} (ID: ${profileId}).`
          }
        })
      });

      setMessage({ type: 'success', text: 'Staff profile removed successfully!' });
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Profile deletion failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove staff profile.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculation
  const totalStaff = profiles.length;
  const adminStaff = profiles.filter(p => p.role && p.role.split(',').map(r => r.trim().toLowerCase()).includes('admin')).length;
  const clinicalStaff = profiles.filter(p => {
    if (!p.role) return false;
    const rolesList = p.role.split(',').map(r => r.trim().toLowerCase());
    return ['clinician', 'nurse', 'lab_tech', 'pharmacist'].some(r => rolesList.includes(r));
  }).length;

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* PENDING ROLE AUTHORIZATION REQUESTS */}
      {roleRequests && roleRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4 shadow-md animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <UserCheck size={14} className="text-teal-400" /> Pending Role Authorization Requests
            </h4>
            <span className="text-[10px] text-slate-500 font-semibold font-sans">
              Pending: {roleRequests.filter(r => r.status === 'pending').length}
            </span>
          </div>

          {requestsMessage && (
            <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-xs flex gap-2 font-sans">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{requestsMessage}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-900 text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Category & Requested Roles</th>
                  <th className="py-2.5 px-3 text-center">Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                {roleRequests.filter(r => r.status === 'pending').map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-100">{req.full_name}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{req.email}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-500 font-mono tracking-wide uppercase">
                          {req.request_category || 'Clinical & Operational Workflows'}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(req.requested_role || '').split(',').map(role => (
                            <span key={role} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-teal-500/10 border border-teal-500/20 text-teal-400 w-fit">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={requestsLoading}
                          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1 px-3 rounded transition active:scale-[0.96] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck size={10} /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          disabled={requestsLoading}
                          className="bg-slate-850 hover:bg-slate-800 border border-slate-700 text-red-400 hover:text-red-300 font-bold text-[10px] py-1 px-3 rounded transition active:scale-[0.96] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={10} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Staff Registered</span>
            <h4 className="text-xl font-black text-white mt-1 font-mono">{totalStaff}</h4>
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <Users size={16} />
          </div>
        </div>

        <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinical Operators</span>
            <h4 className="text-xl font-black text-teal-400 mt-1 font-mono">{clinicalStaff}</h4>
          </div>
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
            <UserCheck size={16} />
          </div>
        </div>

        <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Administrative Officers</span>
            <h4 className="text-xl font-black text-purple-400 mt-1 font-mono">{adminStaff}</h4>
          </div>
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
            <Briefcase size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Staff List (2/3 width on xl) */}
        <div className="xl:col-span-2 bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4 shadow-md">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <Users size={12} className="text-teal-400" /> Active Roster Directory
          </h5>

          <div className="overflow-x-auto border border-slate-900 rounded-lg">
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead>
                <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Assign Role</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                {profiles.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-teal-400 uppercase">
                          {prof.full_name.substring(0, 2)}
                        </div>
                        <span className="text-xs text-slate-200 block truncate max-w-[120px]" title={prof.full_name}>
                          {prof.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px] truncate max-w-[150px]" title={prof.email}>
                      {prof.email}
                    </td>
                    <td className="py-3 px-3 relative">
                      <div className="flex items-center gap-1.5 justify-between">
                        <div className="flex flex-wrap gap-1 max-w-[130px]">
                          {(prof.role || '').split(',').map(r => r.trim()).filter(Boolean).map(r => (
                            <span key={r} className="bg-teal-500/10 text-teal-400 border border-teal-500/15 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold font-mono">
                              {r === 'lab_tech' ? 'lab tech' : r === 'reporting_officer' ? 'reporting' : r}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingRolesProfileId(editingRolesProfileId === prof.id ? null : prof.id)}
                          className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-900 border border-slate-800 transition cursor-pointer shrink-0"
                          title="Manage staff roles"
                        >
                          <Sliders size={10} />
                        </button>
                      </div>
                      
                      {editingRolesProfileId === prof.id && (
                        <div className="absolute z-30 left-0 mt-1 p-3 bg-slate-950 border border-slate-800 rounded-lg shadow-xl grid grid-cols-1 gap-2 min-w-[160px]">
                          {[
                            { id: 'receptionist', label: 'Receptionist' },
                            { id: 'nurse', label: 'Triage Nurse' },
                            { id: 'clinician', label: 'Clinician (Doctor)' },
                            { id: 'lab_tech', label: 'Lab Technician' },
                            { id: 'pharmacist', label: 'Pharmacist' },
                            { id: 'cashier', label: 'Billing Cashier' },
                            { id: 'admin', label: 'Administrator' }
                          ].map(role => {
                            const rolesList = (prof.role || '').split(',').map(r => r.trim());
                            const isChecked = rolesList.includes(role.id);
                            return (
                              <label key={role.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={async (e) => {
                                    const checked = e.target.checked;
                                    let newRoles = [...rolesList];
                                    if (checked) {
                                      if (!newRoles.includes(role.id)) newRoles.push(role.id);
                                    } else {
                                      newRoles = newRoles.filter(r => r !== role.id);
                                    }
                                    if (newRoles.length === 0) newRoles = [role.id];
                                    const rolesString = newRoles.join(',');
                                    await handleChangeRole(prof.id, rolesString);
                                  }}
                                  className="rounded border-slate-800 bg-slate-900 text-teal-500 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                                />
                                <span>{role.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteProfile(prof.id, prof.full_name)}
                        disabled={actionLoading === prof.id || prof.id === user.id}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-red-500/20 disabled:opacity-40 transition cursor-pointer"
                        title={prof.id === user.id ? "Cannot remove yourself" : "Remove staff profile"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Direct Registration Form (1/3 width on xl) */}
        <div className="bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4 shadow-md h-fit">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <UserPlus size={12} className="text-teal-400" /> Direct Profile Creation
          </h5>
          <p className="text-[10px] text-slate-500 leading-relaxed">Directly create a staff member profile in the database. The user will be authorized to access the system immediately upon registration.</p>

          <form onSubmit={handleRegisterStaff} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Full Name</label>
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Dr. John Watson"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Email Address</label>
              <input
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="watson@eagletech.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Portal Roles (Select one or more)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 border border-slate-850 p-3 rounded-lg">
                  {[
                    { id: 'receptionist', label: 'Receptionist' },
                    { id: 'nurse', label: 'Triage Nurse' },
                    { id: 'clinician', label: 'Clinician (Doctor)' },
                    { id: 'lab_tech', label: 'Lab Technician' },
                    { id: 'pharmacist', label: 'Pharmacist' },
                    { id: 'cashier', label: 'Billing Cashier' },
                    { id: 'admin', label: 'Administrator' }
                  ].map(role => {
                    const isChecked = Array.isArray(newStaffRole) ? newStaffRole.includes(role.id) : newStaffRole === role.id;
                    return (
                      <label key={role.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            let newRoles = Array.isArray(newStaffRole) ? [...newStaffRole] : [newStaffRole];
                            if (checked) {
                              if (!newRoles.includes(role.id)) newRoles.push(role.id);
                            } else {
                              newRoles = newRoles.filter(r => r !== role.id);
                            }
                            if (newRoles.length === 0) newRoles = [role.id];
                            setNewStaffRole(newRoles);
                          }}
                          className="rounded border-slate-850 bg-slate-900 text-teal-500 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 font-bold focus:border-teal-500 transition cursor-pointer"
                >
                  <option value="general">General</option>
                  <option value="triage">Triage</option>
                  <option value="consultation">OPD Consult</option>
                  <option value="lab">Laboratory</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="billing">Billing</option>
                  <option value="ward">Inpatient Ward</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Creating Profile...' : 'Create Staff Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
