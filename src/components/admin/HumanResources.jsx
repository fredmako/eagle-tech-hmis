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
  Sliders,
  Printer,
  Shield,
  Mail,
  Calendar,
  PauseCircle,
  RotateCcw,
  Wallet
} from 'lucide-react';
import StaffOnboarding from './StaffOnboarding';
import RoleRequestsList from './RoleRequestsList';
import AdminDelegation from './AdminDelegation';
import StaffScheduler from './StaffScheduler';

export default function HumanResources({ 
  user, 
  profiles = [], 
  fetchAdminData,
  roleRequests = [],
  requestsLoading = false,
  requestsMessage = '',
  handleApproveRequest,
  handleRejectRequest,
  
  // Onboarding props
  inviteMessage,
  handleSendInvite,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteDept,
  setInviteDept,
  invitesLoading,
  invitationsList = [],
  handleRevokeInvite,
  dbDepartments = [],
  
  // Delegation props
  adminDelegation = {},
  onDelegationUpdate,
  initialSubTab = 'directory'
}) {
  const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
  const isHRManager = rolesList.includes('admin') || rolesList.includes('super_admin') || rolesList.includes('facility_admin') || rolesList.includes('hr_manager');

  const [activeTab, setActiveTab] = useState(initialSubTab || (isHRManager ? 'directory' : 'roster')); // 'directory' | 'onboarding' | 'requests' | 'delegation' | 'roster'
  
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(['nurse']);
  const [editingRolesProfileId, setEditingRolesProfileId] = useState(null);
  const [editingWalletProfileId, setEditingWalletProfileId] = useState(null);
  const [walletDraft, setWalletDraft] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('general');
  const [actionLoading, setActionLoading] = useState(null); // stores user ID during action
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  React.useEffect(() => {
    if (initialSubTab) setActiveTab(initialSubTab);
  }, [initialSubTab]);

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) {
      setMessage({ type: 'error', text: 'Please fill in all staff details.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const profileId = 'u_dir_' + Math.random().toString(36).substring(2, 12);
      const rolesString = Array.isArray(newStaffRole) ? newStaffRole.join(',') : newStaffRole;

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
            department: newStaffDept,
            access_status: 'active',
            blockchain_wallet_address: ''
          }
        })
      });

      if (!insertRes.ok) {
        const errData = await insertRes.json();
        throw new Error(errData.error || 'Failed to insert profile record.');
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
    const existingProfile = profiles.find(p => p.id === profileId);
    const currentRoles = (existingProfile?.role || '').split(',').map(r => r.trim()).filter(Boolean);
    const nextRoles = (newRole || '').split(',').map(r => r.trim()).filter(Boolean);
    const sensitiveRoles = ['admin', 'facility_admin', 'hr_manager', 'it_support'];
    const addedSensitiveRoles = nextRoles.filter(role => sensitiveRoles.includes(role) && !currentRoles.includes(role));
    if (addedSensitiveRoles.length > 0) {
      const confirmed = window.confirm(`Increase privileges for ${existingProfile?.full_name || 'this staff member'} to include ${addedSensitiveRoles.join(', ')}? This grants higher system access in this facility.`);
      if (!confirmed) return;
    }

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

  const handleSaveWallet = async (profileId, staffName) => {
    setActionLoading(profileId);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/profiles/${profileId}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ blockchain_wallet_address: walletDraft.trim() })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update wallet address.');
      }
      setMessage({ type: 'success', text: `Blockchain wallet linkage updated for ${staffName}.` });
      setEditingWalletProfileId(null);
      setWalletDraft('');
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Wallet update failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update staff wallet.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendProfile = async (profileId, staffName) => {
    const reason = window.prompt(`Reason for suspending ${staffName}'s access?`, 'Suspended by HR');
    if (reason === null) return;
    setActionLoading(profileId);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/profiles/${profileId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to suspend staff access.');
      }
      setMessage({ type: 'success', text: `${staffName}'s access has been suspended.` });
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Suspension failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to suspend staff access.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreProfile = async (profileId, staffName) => {
    setActionLoading(profileId);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/profiles/${profileId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to restore staff access.');
      }
      setMessage({ type: 'success', text: `${staffName}'s access has been restored.` });
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Restore failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to restore staff access.' });
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

      const deleteRes = await fetch(`${apiBase}/auth/profiles/${profileId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Fired employee removed by HR' })
      });

      if (!deleteRes.ok) {
        const errData = await deleteRes.json();
        throw new Error(errData.error || 'Failed to delete profile record.');
      }

      setMessage({ type: 'success', text: 'Staff profile removed successfully!' });
      fetchAdminData();
    } catch (err) {
      console.error('[HR Panel] Profile deletion failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove staff profile.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintHR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please allow popups to print.');
      return;
    }

    const directoryRowsHtml = profiles.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${p.full_name}</td>
        <td>${p.email}</td>
        <td>${p.role || 'N/A'}</td>
        <td>${p.department || 'general'}</td>
      </tr>
    `).join('');

    const pendingRequests = roleRequests.filter(r => r.status === 'pending');
    let requestsHtml = '';
    if (pendingRequests.length > 0) {
      requestsHtml = pendingRequests.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.full_name}</td>
          <td>${r.email}</td>
          <td>${r.requested_role}</td>
          <td>${r.request_category || 'N/A'}</td>
        </tr>
      `).join('');
    } else {
      requestsHtml = '<tr><td colspan="5" style="text-align: center; font-style: italic;">No pending role requests.</td></tr>';
    }

    const pendingInvites = invitationsList.filter(i => i.status === 'pending');
    let invitesHtml = '';
    if (pendingInvites.length > 0) {
      invitesHtml = pendingInvites.map((i, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${i.email}</td>
          <td>${i.role}</td>
          <td>${i.department || 'N/A'}</td>
          <td>${new Date(i.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } else {
      invitesHtml = '<tr><td colspan="5" style="text-align: center; font-style: italic;">No pending staff invitations.</td></tr>';
    }

    const htmlContent = `
      <html>
        <head>
          <title>Human Resources Summary - Staff Directory & Access Control</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; background: #fff; line-height: 1.5; font-size: 12px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #333; padding-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-size: 22px; text-transform: uppercase; color: #111; }
            .header p { margin: 3px 0; font-size: 12px; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; font-size: 13px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            table th, table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            table th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 15px; color: #666; }
            @media print {
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Egesa Health System</h2>
            <p>Human Resources & Access Authorization Summary</p>
            <p>Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Active Roster Directory</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role(s)</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                ${directoryRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Pending Signup / Role Requests</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Requested Role</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                ${requestsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Pending Invitations Outbox</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Department</th>
                  <th>Sent Date</th>
                </tr>
              </thead>
              <tbody>
                ${invitesHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Report Generated by: Egesa Health Administrator</p>
            <p>Egesa Health System | Electronic Health Record</p>
            <div class="print-hidden" style="margin-top: 20px;">
              <button onclick="window.print();" style="padding: 8px 18px; font-weight: bold; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 4px; font-size: 12px;">Print Report</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const totalStaff = profiles.length;
  const adminStaff = profiles.filter(p => p.role && p.role.split(',').map(r => r.trim().toLowerCase()).includes('admin')).length;
  const clinicalStaff = profiles.filter(p => {
    if (!p.role) return false;
    const rolesList = p.role.split(',').map(r => r.trim().toLowerCase());
    return ['clinician', 'nurse', 'lab_tech', 'pharmacist'].some(r => rolesList.includes(r));
  }).length;

  const isAdmin = rolesList.includes('admin') || rolesList.includes('super_admin');

  return (
    <div className="space-y-6">
      {/* Upper Navigation Header */}
      {isHRManager && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="text-teal-400" size={20} /> Human Resources Management Desk
            </h2>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Admin Management: ' : ''}Register staff members, send portal invitations, process role authorization requests, and configure access control delegation.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrintHR}
              className="flex items-center gap-1.5 bg-slate-955 border border-slate-800 hover:border-teal-500/30 text-slate-400 hover:text-teal-400 font-semibold text-[11px] px-3.5 py-2 rounded-lg transition active:scale-[0.97]"
            >
              <Printer size={13} />
              <span>Print Directory</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub Tab Navigation */}
      {isHRManager && (
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'directory' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            Staff Directory & Registration
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'roster' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            Duty Roster
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer relative ${
              activeTab === 'onboarding' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            Staff On-boarding (Invites)
            {invitationsList.filter(i => i.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500/20 text-[8px] text-amber-400 font-bold px-1 py-0.5 rounded-full border border-amber-500/25">
                {invitationsList.filter(i => i.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer relative ${
              activeTab === 'requests' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            Role Requests
            {roleRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500/20 text-[8px] text-amber-400 font-bold px-1 py-0.5 rounded-full border border-amber-500/25">
                {roleRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('delegation')}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'delegation' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            Access Delegation Settings
          </button>
        </div>
      )}

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Directory Tab View */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Staff Statistics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Staff Registered</span>
                <h4 className="text-xl font-black text-white mt-1 font-mono">{totalStaff}</h4>
              </div>
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinical Operators</span>
                <h4 className="text-xl font-black text-teal-400 mt-1 font-mono">{clinicalStaff}</h4>
              </div>
              <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
                <UserCheck size={16} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
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
            {/* Staff List */}
            <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                <Users size={12} className="text-teal-400" /> Active Roster Directory
              </h5>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-800 uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Assign Role</th>
                      <th className="py-2.5 px-3">Access</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                    {profiles.map((prof) => (
                      <tr key={prof.id} className="hover:bg-slate-800/10 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-850 border border-slate-850 flex items-center justify-center font-bold text-[10px] text-teal-400 uppercase">
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
                              className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-950 border border-slate-800 transition cursor-pointer shrink-0"
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
                                { id: 'facility_admin', label: 'Facility Admin' },
                                { id: 'marketing_admin', label: 'Marketing Admin' },
                                { id: 'hr_manager', label: 'HR Manager' },
                                { id: 'operations_manager', label: 'Operations Manager' },
                                { id: 'it_support', label: 'IT Support' },
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
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            (prof.access_status || 'active') === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {prof.access_status || 'active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {(prof.access_status || 'active') === 'suspended' ? (
                              <button
                                onClick={() => handleRestoreProfile(prof.id, prof.full_name)}
                                disabled={actionLoading === prof.id || prof.id === user.id}
                                className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/20 disabled:opacity-40 transition cursor-pointer"
                                title="Restore staff access"
                              >
                                <RotateCcw size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspendProfile(prof.id, prof.full_name)}
                                disabled={actionLoading === prof.id || prof.id === user.id}
                                className="text-amber-400 hover:text-amber-300 p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/20 disabled:opacity-40 transition cursor-pointer"
                                title={prof.id === user.id ? "Cannot suspend yourself" : "Suspend staff access"}
                              >
                                <PauseCircle size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingWalletProfileId(editingWalletProfileId === prof.id ? null : prof.id);
                                setWalletDraft(prof.blockchain_wallet_address || '');
                              }}
                              disabled={actionLoading === prof.id}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-blue-500/20 disabled:opacity-40 transition cursor-pointer"
                              title="Update blockchain wallet"
                            >
                              <Wallet size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteProfile(prof.id, prof.full_name)}
                              disabled={actionLoading === prof.id || prof.id === user.id}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-red-500/20 disabled:opacity-40 transition cursor-pointer"
                              title={prof.id === user.id ? "Cannot remove yourself" : "Delete fired employee profile"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {editingWalletProfileId === prof.id && (
                            <div className="mt-2 flex items-center gap-1.5 justify-center">
                              <input
                                type="text"
                                value={walletDraft}
                                onChange={(e) => setWalletDraft(e.target.value)}
                                placeholder="0x... or Solana address"
                                className="w-44 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 font-mono focus:border-blue-500 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveWallet(prof.id, prof.full_name)}
                                disabled={actionLoading === prof.id}
                                className="bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 text-[9px] font-bold px-2 py-1 rounded"
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Direct Registration Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm h-fit">
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Portal Roles (Select one or more)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 border border-slate-850 p-3 rounded-lg max-h-[140px] overflow-y-auto">
                    {[
                      { id: 'receptionist', label: 'Receptionist' },
                      { id: 'nurse', label: 'Triage Nurse' },
                      { id: 'clinician', label: 'Clinician (Doctor)' },
                      { id: 'lab_tech', label: 'Lab Technician' },
                      { id: 'pharmacist', label: 'Pharmacist' },
                      { id: 'cashier', label: 'Billing Cashier' },
                      { id: 'facility_admin', label: 'Facility Admin' },
                      { id: 'marketing_admin', label: 'Marketing Admin' },
                      { id: 'hr_manager', label: 'HR Manager' },
                      { id: 'operations_manager', label: 'Operations Manager' },
                      { id: 'it_support', label: 'IT Support' },
                      { id: 'admin', label: 'Administrator' }
                    ].map(role => {
                      const isChecked = Array.isArray(newStaffRole) ? newStaffRole.includes(role.id) : newStaffRole === role.id;
                      return (
                        <label key={role.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-350 cursor-pointer select-none">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 font-bold focus:border-teal-500 transition cursor-pointer"
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
      )}

      {/* Onboarding (Invites) Tab View */}
      {activeTab === 'onboarding' && (
        <StaffOnboarding
          inviteMessage={inviteMessage}
          handleSendInvite={handleSendInvite}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteRole={inviteRole}
          setInviteRole={setInviteRole}
          inviteDept={inviteDept}
          setInviteDept={setInviteDept}
          invitesLoading={invitesLoading}
          invitationsList={invitationsList}
          handleRevokeInvite={handleRevokeInvite}
          dbDepartments={dbDepartments}
        />
      )}

      {/* Role Requests Tab View */}
      {activeTab === 'requests' && (
        <RoleRequestsList
          roleRequests={roleRequests}
          requestsLoading={requestsLoading}
          requestsMessage={requestsMessage}
          handleApproveRequest={handleApproveRequest}
          handleRejectRequest={handleRejectRequest}
          fetchAdminData={fetchAdminData}
        />
      )}

      {/* Access/Role Delegation Tab View */}
      {activeTab === 'delegation' && (
        <AdminDelegation
          user={user}
          currentDelegation={adminDelegation}
          onUpdate={onDelegationUpdate}
        />
      )}

      {/* Duty Roster Tab View */}
      {activeTab === 'roster' && (
        <StaffScheduler
          user={user}
          profiles={profiles}
          fetchAdminData={fetchAdminData}
          dbDepartments={dbDepartments}
        />
      )}
    </div>
  );
}
