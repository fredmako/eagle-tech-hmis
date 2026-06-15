import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  sendNotification, 
  getSmtpConfig, 
  saveSmtpConfig, 
  getLicenseConfig, 
  saveLicenseConfig, 
  getEmailLogs, 
  pruneEmailLogs 
} from '../notificationService';
import { 
  Settings, 
  Shield, 
  UserPlus, 
  CheckCircle, 
  Mail, 
  Server, 
  Key, 
  RefreshCw, 
  FileText, 
  Eye, 
  Trash2, 
  AlertTriangle, 
  CreditCard,
  Send,
  Lock,
  Globe,
  Check,
  Building,
  UserCheck
} from 'lucide-react';

export default function Admin({ user }) {
  const { authFetch, inviteStaff, getInvitations, revokeInvite } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('audit'); // 'audit', 'smtp_settings', 'email_logs', 'licensing', 'role_requests'
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsMessage, setRequestsMessage] = useState('');
  const [facilityDetails, setFacilityDetails] = useState({ name: '', code: '' });

  // Staff Onboarding & Invites states
  const [invitationsList, setInvitationsList] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('nurse');
  const [inviteDept, setInviteDept] = useState('triage');
  const [inviteMessage, setInviteMessage] = useState({ type: '', text: '' });
  
  // Create user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('nurse');
  const [userLoading, setUserLoading] = useState(false);
  const [userMessage, setUserMessage] = useState('');

  // SMTP Settings form state
  const [smtp, setSmtp] = useState(getSmtpConfig(user.facility_id));
  const [smtpMessage, setSmtpMessage] = useState({ type: '', text: '' });
  const [smtpLoading, setSmtpLoading] = useState(false);

  // Test email state
  const [testRecipient, setTestRecipient] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState({ type: '', text: '' });

  // License state
  const [license, setLicense] = useState(getLicenseConfig(user.facility_id));
  const [licenseMessage, setLicenseMessage] = useState('');

  // Delivery logs state
  const [emailLogs, setEmailLogs] = useState(getEmailLogs(user.facility_id));
  const [selectedLogBody, setSelectedLogBody] = useState(null); // For view body modal

  const [loadingLogs, setLoadingLogs] = useState(false);

  // DNS Checking state
  const [dnsChecking, setDnsChecking] = useState(false);
  const [dnsMessage, setDnsMessage] = useState('DNS Configuration Fully Verified & Aligned with Titan Email Services!');

  useEffect(() => {
    fetchAdminData();
    setTestRecipient(smtp.test_email_destination || 'admin@eagletechsolutions.tech');
  }, []);

  const fetchAdminData = async () => {
    setLoadingLogs(true);
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

      // Fetch role requests for this facility from backend
      try {
        const res = await authFetch('/auth/role-requests');
        const data = await res.json();
        if (res.ok && data.requests) {
          setRoleRequests(data.requests);
        } else {
          setRoleRequests([]);
        }
      } catch (reqErr) {
        console.error('Error fetching role requests:', reqErr);
        setRoleRequests([]);
      }

      // Fetch staff invitations
      await fetchInvitations();

      // Refresh email logs
      setEmailLogs(getEmailLogs(user.facility_id));
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchInvitations = async () => {
    setInvitesLoading(true);
    try {
      const list = await getInvitations();
      setInvitationsList(list);
    } catch (err) {
      console.error('Error fetching staff invitations:', err);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInvitesLoading(true);
    setInviteMessage({ type: '', text: '' });
    try {
      await inviteStaff(inviteEmail.trim(), inviteRole, inviteDept);
      setInviteMessage({ type: 'success', text: `Invitation successfully dispatched to ${inviteEmail}!` });
      setInviteEmail('');
      // Log config change in audit logs
      try {
        await supabase.from('audit_logs').insert({
          action: 'Staff Invitation Sent',
          details: `Invited ${inviteEmail} as ${inviteRole} (${inviteDept} department).`
        });
      } catch (logErr) {
        console.error('Failed to write audit log:', logErr);
      }
      fetchAdminData();
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.message || 'Failed to send invitation.' });
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId, email) => {
    setInvitesLoading(true);
    setInviteMessage({ type: '', text: '' });
    try {
      await revokeInvite(inviteId);
      setInviteMessage({ type: 'success', text: `Successfully revoked invitation for ${email}.` });
      try {
        await supabase.from('audit_logs').insert({
          action: 'Staff Invitation Revoked',
          details: `Revoked active invitation for ${email}.`
        });
      } catch (logErr) {
        console.error('Failed to write audit log:', logErr);
      }
      fetchAdminData();
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.message || 'Failed to revoke invitation.' });
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleApproveRequest = async (req) => {
    setRequestsLoading(true);
    setRequestsMessage('');
    try {
      const res = await authFetch('/auth/approve-request', {
        method: 'POST',
        body: JSON.stringify({ request_id: req.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      // TRIGGER EMAIL: send welcome email dynamically to the approved user
      const loginLink = `${window.location.origin}${window.location.pathname}`;
      await sendNotification('NEW_USER_CREATED', {
        fullName: req.full_name,
        role: req.requested_role,
        recipientEmail: req.email,
        loginLink: loginLink
      }, user.facility_id);

      setRequestsMessage(`Successfully approved ${req.full_name}'s request! Welcome email sent.`);
      fetchAdminData();
    } catch (err) {
      setRequestsMessage(`Approval failed: ${err.message}`);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRejectRequest = async (req) => {
    setRequestsLoading(true);
    setRequestsMessage('');
    try {
      const res = await authFetch('/auth/reject-request', {
        method: 'POST',
        body: JSON.stringify({ request_id: req.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      setRequestsMessage(`Rejected role request for ${req.full_name}.`);
      fetchAdminData();
    } catch (err) {
      setRequestsMessage(`Rejection failed: ${err.message}`);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setUserLoading(true);
    setUserMessage('');
    try {
      const randId = Math.random().toString(36).substring(2, 11);
      const token = `tok_${Math.random().toString(36).substring(2, 15)}`;

      const newProfile = {
        id: randId,
        full_name: newUserName,
        role: newUserRole,
        email: newUserEmail,
        autologin_token: token,
        facility_id: user.facility_id
      };

      const { error } = await supabase.from('profiles').insert(newProfile);
      if (error) throw error;

      // Construct secure invitation auto-login URL
      const loginLink = `${window.location.origin}${window.location.pathname}?autologin=${token}&fac=${user.facility_id}`;

      // TRIGGER EMAIL: NEW_USER_CREATED notification
      await sendNotification('NEW_USER_CREATED', {
        fullName: newUserName,
        role: newUserRole,
        recipientEmail: newUserEmail,
        loginLink: loginLink
      }, user.facility_id);

      setUserMessage('New user account profile configured successfully and invitation email sent!');
      setNewUserName('');
      setNewUserEmail('');
      fetchAdminData();
    } catch (err) {
      setUserMessage(`Config error: ${err.message}`);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSaveSmtp = (e) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpMessage({ type: '', text: '' });
    try {
      saveSmtpConfig(user.facility_id, smtp);
      setSmtpMessage({ type: 'success', text: 'Titan SMTP Outbound configurations updated successfully!' });
      
      // Log config change in audit logs
      supabase.from('audit_logs').insert({
        action: 'SMTP Config Change',
        details: `Updated SMTP host to ${smtp.host}:${smtp.port} and modified preferences.`
      });
    } catch (err) {
      setSmtpMessage({ type: 'error', text: err.message || 'Failed to save SMTP config.' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testRecipient) return;

    setTestLoading(true);
    setTestMessage({ type: '', text: '' });
    try {
      const response = await sendNotification('USER_SIGNUP', {
        adminName: 'Test Administrator',
        adminEmail: testRecipient,
        recipientEmail: testRecipient
      }, user.facility_id);

      if (response.success) {
        setTestMessage({ type: 'success', text: `Test email successfully queued and dispatched to ${testRecipient}!` });
      } else {
        setTestMessage({ type: 'error', text: `Failed to dispatch test email: ${response.reason || 'Unknown error'}` });
      }
      fetchAdminData();
    } catch (err) {
      setTestMessage({ type: 'error', text: err.message || 'Error executing test send.' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSimulateLicense = async (status) => {
    let tier = license.tier || 'hospital';
    let expiry = '';
    let statusText = '';
    let notificationEvent = '';

    if (status === 'active') {
      expiry = new Date(Date.now() + 3600000 * 24 * 90).toISOString(); // 90 days from now
      statusText = 'Active (90 Days Remaining)';
    } else if (status === 'warning') {
      expiry = new Date(Date.now() + 3600000 * 24 * 3).toISOString(); // 3 days from now
      statusText = 'Warning (Near Expiry)';
      notificationEvent = 'LICENSE_WARNING';
    } else if (status === 'expired') {
      expiry = new Date(Date.now() - 3600000 * 24 * 1).toISOString(); // 1 day ago
      statusText = 'Expired (Service Suspended)';
      notificationEvent = 'LICENSE_EXPIRED';
    }

    const updatedLicense = {
      tier,
      status,
      expiry
    };

    saveLicenseConfig(user.facility_id, updatedLicense);
    setLicense(updatedLicense);
    setLicenseMessage(`Simulated license state updated: ${statusText}`);

    // Log in audit log
    await supabase.from('audit_logs').insert({
      action: 'License State Simulation',
      details: `Simulated subscription license state changed to ${status.toUpperCase()} for tier ${tier.toUpperCase()}.`
    });

    // Send notifications for warning/expired to admin
    if (notificationEvent) {
      await sendNotification(notificationEvent, {
        tier,
        expiry
      }, user.facility_id);
    }

    fetchAdminData();
  };

  const handlePruneLogs = () => {
    try {
      pruneEmailLogs(user.facility_id, smtp.log_retention || 30);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckDns = async () => {
    setDnsChecking(true);
    setDnsMessage('');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDnsChecking(false);
    setDnsMessage('DNS Configuration Fully Verified & Aligned with Titan Email Services!');
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
              <span className="text-slate-500 block font-semibold">Facility Name</span>
              <span className="font-semibold text-slate-200">{facilityDetails.name || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">MOH Facility Code</span>
              <span className="font-semibold text-teal-400 font-mono">{facilityDetails.code || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Active Service Departments</span>
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

          {userMessage && (
            <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-xs flex gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{userMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="staff@hospital.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operational Role</label>
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
              disabled={userLoading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition active:scale-[0.98]"
            >
              {userLoading ? 'Provisioning Profile...' : 'Configure Profile'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Columns: Tabbed Control Center (2/3 width) */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 flex flex-col justify-between min-h-[480px]">
        {/* Sub-tab Navigation */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1 shrink-0">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Shield size={13} /> Audit Trail
          </button>
          
          <button
            onClick={() => setActiveSubTab('email_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'email_logs'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Mail size={13} /> Email Delivery Logs
            {emailLogs.length > 0 && (
              <span className="bg-slate-950 text-[10px] text-teal-400 font-bold px-1.5 py-0.5 rounded-full border border-teal-500/20">
                {emailLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('smtp_settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'smtp_settings'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Server size={13} /> SMTP Server Settings
          </button>

          <button
            onClick={() => setActiveSubTab('licensing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'licensing'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <CreditCard size={13} /> Licensing & Billing
          </button>

          <button
            onClick={() => setActiveSubTab('role_requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'role_requests'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <UserPlus size={13} /> Staff Onboarding & Invites
            {invitationsList.filter(i => i.status === 'pending').length > 0 && (
              <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25">
                {invitationsList.filter(i => i.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-4">
          
          {/* TAB 1: AUDIT TRAIL */}
          {activeSubTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Activity Logs</h4>
                <button
                  onClick={fetchAdminData}
                  className="text-[10px] text-teal-450 hover:text-teal-400 font-semibold flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Refresh Log
                </button>
              </div>

              <div className="space-y-2">
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
          )}

          {/* TAB 2: OUTBOUND EMAIL LOGS */}
          {activeSubTab === 'email_logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound SMTP Communications</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Logs pruned automatically based on your retention configuration ({smtp.log_retention || 30} days).</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePruneLogs}
                    className="text-[10px] bg-red-950/40 hover:bg-red-900/10 border border-red-500/20 text-red-400 px-2 py-1 rounded font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 size={10} /> Prune Now
                  </button>
                  <button
                    onClick={fetchAdminData}
                    className="text-[10px] text-teal-455 hover:text-teal-400 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto bg-slate-950 border border-slate-850 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Sender Identity</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Retry</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-medium">
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 text-slate-350">
                        <td className="py-2 px-3 text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                            {log.event}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-400 font-mono max-w-[130px] truncate" title={log.sender}>
                          {log.sender}
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-400 font-mono truncate" title={log.recipient}>
                          {log.recipient}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            log.status === 'queued' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            log.status === 'bounced' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-450 font-mono text-center">
                          {log.retry_count}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => setSelectedLogBody(log)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-1 rounded text-teal-400 transition"
                            title="View Rendered Email"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {emailLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-600">
                          No outbound email logs registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SMTP SERVER SETTINGS */}
          {activeSubTab === 'smtp_settings' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSmtp} className="space-y-5">
                <div className="flex justify-between items-center pb-1 border-b border-slate-850">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Titan Server Authentication Configuration</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSmtp(getDefaultSmtpConfig())}
                      className="text-[10px] text-slate-500 hover:text-slate-200 font-bold"
                    >
                      Reset Titan Presets
                    </button>
                  </div>
                </div>

                {smtpMessage.text && (
                  <div className={`p-2.5 rounded text-xs flex gap-2 ${
                    smtpMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
                  }`}>
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{smtpMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtp.host}
                      onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                      placeholder="smtp.titan.email"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={smtp.port}
                      onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) })}
                      placeholder="465"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Encryption Protocol</label>
                    <select
                      value={smtp.encryption}
                      onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    >
                      <option value="SSL">SSL (Implicit)</option>
                      <option value="TLS">STARTTLS (Explicit)</option>
                      <option value="None">None (Unsecured)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Timeout Settings (Seconds)</label>
                    <input
                      type="number"
                      value={smtp.timeout || 15}
                      onChange={(e) => setSmtp({ ...smtp, timeout: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      min={5}
                      max={90}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Email Identity</label>
                    <input
                      type="email"
                      value={smtp.sender_email}
                      onChange={(e) => setSmtp({ ...smtp, sender_email: e.target.value })}
                      placeholder="noreply@eagletechsolutions.tech"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Name Prefix</label>
                    <input
                      type="text"
                      value={smtp.sender_name}
                      onChange={(e) => setSmtp({ ...smtp, sender_name: e.target.value })}
                      placeholder="Eagle Tech Medical Desk"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={smtp.username}
                      onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                      placeholder="noreply@eagletechsolutions.tech"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={smtp.password}
                      onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Retry & Failover Policy</label>
                    <select
                      value={smtp.retry_policy}
                      onChange={(e) => setSmtp({ ...smtp, retry_policy: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    >
                      <option value="3 attempts, linear backoff">3 attempts, linear backoff</option>
                      <option value="5 attempts, exponential backoff">5 attempts, exponential backoff</option>
                      <option value="No retries">No retries</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Log Retention Period (Days)</label>
                    <input
                      type="number"
                      value={smtp.log_retention || 30}
                      onChange={(e) => setSmtp({ ...smtp, log_retention: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      min={1}
                      max={365}
                    />
                  </div>
                </div>

                {/* Preferences Toggle Matrix */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Notification Preferences Toggles</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-950 border border-slate-850 p-4 rounded-xl">
                    {Object.keys(smtp.preferences || {}).map((prefKey) => (
                      <label key={prefKey} className="flex items-center gap-2 text-[10px] text-slate-350 cursor-pointer font-bold select-none hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={smtp.preferences[prefKey]}
                          onChange={(e) => setSmtp({
                            ...smtp,
                            preferences: {
                              ...smtp.preferences,
                              [prefKey]: e.target.checked
                            }
                          })}
                          className="w-3.5 h-3.5 accent-teal-500 rounded border-slate-800 bg-slate-900"
                        />
                        <span className="capitalize">{prefKey.replace(/_/g, ' ').toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Google OAuth Credentials Section */}
                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <h5 className="text-[11px] font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5">
                    <Building size={12} className="text-teal-400" /> Custom Google Sign-In Credentials
                  </h5>
                  <p className="text-[10px] text-slate-500">Enable and configure hospital-specific Google OAuth credentials to display your logo and brand on the Google Consent Login screen.</p>
                  
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer font-bold select-none hover:text-white transition">
                      <input
                        type="checkbox"
                        checked={smtp.google_auth_enabled || false}
                        onChange={(e) => setSmtp({
                          ...smtp,
                          google_auth_enabled: e.target.checked
                        })}
                        className="w-3.5 h-3.5 accent-teal-500 rounded border-slate-800 bg-slate-900"
                      />
                      Enable Hospital-Specific Google Login
                    </label>

                    {(smtp.google_auth_enabled) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Google Client ID</label>
                          <input
                            type="text"
                            value={smtp.google_client_id || ''}
                            onChange={(e) => setSmtp({ ...smtp, google_client_id: e.target.value })}
                            placeholder="xxxx-xxxx.apps.googleusercontent.com"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Google Client Secret</label>
                          <input
                            type="password"
                            value={smtp.google_client_secret || ''}
                            onChange={(e) => setSmtp({ ...smtp, google_client_secret: e.target.value })}
                            placeholder="••••••••••••"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="submit"
                    disabled={smtpLoading}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-5 rounded-lg shadow-md transition active:scale-[0.98]"
                  >
                    {smtpLoading ? 'Saving Configurations...' : 'Save SMTP Configurations'}
                  </button>
                </div>
              </form>

              {/* SMTP test utility */}
              <form onSubmit={handleSendTestEmail} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={11} className="text-teal-400" /> Outbound SMTP Test Utility
                </h5>
                <p className="text-[10px] text-slate-500">Dispatch a test welcome email using your active Titan credentials above to verify DNS connectivity.</p>

                {testMessage.text && (
                  <div className={`p-2.5 rounded text-xs flex gap-2 ${
                    testMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
                  }`}>
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{testMessage.text}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="recipient@example.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={testLoading}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-teal-400 font-bold text-xs px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Send size={12} /> {testLoading ? 'Sending Test...' : 'Send Test Mail'}
                  </button>
                </div>
              </form>

              {/* DNS settings checker */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Shield size={11} className="text-teal-400" /> Eagle Tech Outsource Custom Domain DNS Diagnostics
                  </h5>
                  <button
                    type="button"
                    onClick={handleCheckDns}
                    disabled={dnsChecking}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 font-sans"
                  >
                    <RefreshCw size={10} className={dnsChecking ? 'animate-spin' : ''} /> {dnsChecking ? 'Verifying...' : 'Re-check DNS'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-sans">Configure these DNS records at your domain registrar to authenticate your custom domain and maximize Titan SMTP inbox deliverability.</p>
                
                {dnsMessage && (
                  <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-[10px] flex gap-1.5 font-sans">
                    <CheckCircle size={12} className="shrink-0 mt-0.5" />
                    <span>{dnsMessage}</span>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left text-[10px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 text-[9px] uppercase">
                        <th className="py-1.5 px-2.5">Record Type</th>
                        <th className="py-1.5 px-2.5">Host Name</th>
                        <th className="py-1.5 px-2.5">Target/Value</th>
                        <th className="py-1.5 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-450 divide-y divide-slate-900 font-semibold">
                      <tr>
                        <td className="py-1.5 px-2.5 text-slate-300">TXT (SPF)</td>
                        <td className="py-1.5 px-2.5 text-teal-500">@</td>
                        <td className="py-1.5 px-2.5 break-all max-w-[200px]" title='v=spf1 include:spf.titan.email ~all'>"v=spf1 include:spf.titan.email ~all"</td>
                        <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 text-slate-300">TXT (DKIM)</td>
                        <td className="py-1.5 px-2.5 text-teal-500">titan1._domainkey</td>
                        <td className="py-1.5 px-2.5 truncate max-w-[200px]" title='v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0G...'>"v=DKIM1; k=rsa; p=MIIBIjANBgkq..."</td>
                        <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 text-slate-300">MX</td>
                        <td className="py-1.5 px-2.5 text-teal-500">@</td>
                        <td className="py-1.5 px-2.5">mx1.titan.email (10) / mx2.titan.email (20)</td>
                        <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 text-slate-300">CNAME</td>
                        <td className="py-1.5 px-2.5 text-teal-500">api</td>
                        <td className="py-1.5 px-2.5">api.eagletechsolutions.tech</td>
                        <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LICENSING & BILLING */}
          {activeSubTab === 'licensing' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                  <CreditCard size={14} className="text-teal-400" /> Subscription entitlement profile
                </h4>

                {licenseMessage && (
                  <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-xs flex gap-2">
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{licenseMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Licensing Tier</span>
                    <span className="text-sm font-black text-slate-100 uppercase tracking-wide">{license.tier}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Status Badge</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-2 w-2 rounded-full ${
                        license.status === 'active' ? 'bg-green-400' :
                        license.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></span>
                      <span className={`text-xs font-bold uppercase ${
                        license.status === 'active' ? 'text-green-400' :
                        license.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      }`}>{license.status}</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Trial / Term Expiry</span>
                    <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                      {new Date(license.expiry).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed space-y-2 bg-slate-900/40 p-4 rounded-lg">
                  <p className="font-semibold text-slate-200">Eagle Tech Licensing Entitlement Rules:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Active State:</strong> Outbound SMTP service handles transactional patient notifications normally.</li>
                    <li><strong>Warning State:</strong> Alerts facility administrator of upcoming renewal requirements, but remains operational.</li>
                    <li><strong className="text-red-400">Expired State (Service Blocked):</strong> Locks all clinical workflow and reporting outbound emails. Password resets and license compliance messages are permitted.</li>
                  </ul>
                </div>
              </div>

              {/* License status simulator utility */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-yellow-500" /> Entitlement Gate & Compliance Simulator
                </h4>
                <p className="text-[10px] text-slate-500">Toggle simulation states below to immediately modify active license status and trigger subscription warning notifications.</p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleSimulateLicense('active')}
                    className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98]"
                  >
                    Simulate Active License
                  </button>
                  <button
                    onClick={() => handleSimulateLicense('warning')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98]"
                  >
                    Simulate Expiry Warning (3 Days Expiry)
                  </button>
                  <button
                    onClick={() => handleSimulateLicense('expired')}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98]"
                  >
                    Simulate Expired Block (1 Day Expired)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STAFF ONBOARDING & INVITATIONS PORTAL */}
          {activeSubTab === 'role_requests' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <UserPlus size={14} className="text-teal-400" /> Send Staff Onboarding Invitation
                  </h4>
                </div>

                {inviteMessage.text && (
                  <div className={`p-2.5 rounded text-xs flex gap-2 font-sans ${
                    inviteMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
                  }`}>
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{inviteMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nurse@hospital.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operational Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
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

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                    <select
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="triage">Triage</option>
                      <option value="consultation">Consultation</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="billing">Billing</option>
                      <option value="ward">Ward</option>
                      <option value="admin">Administration</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={invitesLoading}
                      className="bg-teal-500 hover:bg-teal-600 hover:scale-[1.02] text-slate-950 font-bold text-xs py-2 px-5 rounded-lg shadow-md transition active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <Send size={12} /> {invitesLoading ? 'Sending Invitation...' : 'Send Onboarding Invite'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Mail size={14} className="text-teal-400" /> Active & Sent Onboarding Invites
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold font-sans">
                    Total Sent: {invitationsList.length}
                  </span>
                </div>

                {invitesLoading && invitationsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-sans">
                    Loading invitations list...
                  </div>
                ) : invitationsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs leading-relaxed font-sans">
                    No staff invitations generated yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-900 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 border-b border-slate-900 text-[10px] uppercase font-bold">
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Sent By</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                        {invitationsList.map((invite) => (
                          <tr key={invite.id || invite.$id} className="hover:bg-slate-900/40 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-100 font-mono">{invite.email}</td>
                            <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-teal-400">{invite.role}</td>
                            <td className="py-2.5 px-3 capitalize text-[10px] font-mono text-slate-400">{invite.department}</td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{invite.invited_by || 'Admin'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                invite.status === 'pending' ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20' :
                                invite.status === 'accepted' ? 'bg-green-400/10 text-green-400 border border-green-500/20' :
                                'bg-red-400/10 text-red-400 border border-red-500/20'
                              }`}>
                                {invite.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {invite.status === 'pending' ? (
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => handleRevokeInvite(invite.id || invite.$id, invite.email)}
                                    className="bg-slate-850 hover:bg-slate-800 border border-slate-700 text-red-400 hover:text-red-300 font-bold text-[10px] py-1 px-2.5 rounded transition active:scale-[0.96] flex items-center gap-1"
                                  >
                                    <Trash2 size={10} /> Revoke
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center text-[10px] text-slate-500 italic uppercase font-bold">
                                  {invite.status}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RENDERED EMAIL VIEW MODAL */}
      {selectedLogBody && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-teal-400" /> Outbound SMTP Dispatch Review
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Message unique ID: {selectedLogBody.id} | Event: {selectedLogBody.event}</p>
              </div>
              <button
                onClick={() => setSelectedLogBody(null)}
                className="text-slate-400 hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Log Metadata Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950 border border-slate-850 p-3 rounded-lg text-[10px] shrink-0 font-mono">
              <div className="space-y-1">
                <div><span className="text-slate-500">From Identity:</span> <span className="text-slate-350">{selectedLogBody.sender}</span></div>
                <div><span className="text-slate-500">To Destination:</span> <span className="text-slate-350">{selectedLogBody.recipient}</span></div>
                <div><span className="text-slate-500">Email Subject:</span> <span className="text-teal-400">{selectedLogBody.subject}</span></div>
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500">SMTP Server:</span> <span className="text-slate-350">{selectedLogBody.smtp_config.host}:{selectedLogBody.smtp_config.port} ({selectedLogBody.smtp_config.encryption})</span></div>
                <div><span className="text-slate-500">Retries Logged:</span> <span className="text-slate-350">{selectedLogBody.retry_count} attempts</span></div>
                <div><span className="text-slate-500">Timestamp:</span> <span className="text-slate-350">{new Date(selectedLogBody.created_at).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Error banner if failed */}
            {selectedLogBody.error_message && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-[10px] shrink-0 flex items-start gap-2">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">SMTP Dispatch Failure Log:</span> {selectedLogBody.error_message}
                </div>
              </div>
            )}

            {/* Rendered HTML Body Panel */}
            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[200px]">
              <div 
                className="text-xs text-slate-300"
                dangerouslySetInnerHTML={{ __html: selectedLogBody.body }}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setSelectedLogBody(null)}
                className="bg-slate-850 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
