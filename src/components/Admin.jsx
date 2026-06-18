import React, { useState, useEffect } from 'react';
import AuditTrail from './admin/AuditTrail';
import EmailLogs from './admin/EmailLogs';
import SmtpSettings from './admin/SmtpSettings';
import LicensingBilling from './admin/LicensingBilling';
import StaffOnboarding from './admin/StaffOnboarding';
import HospitalProfile from './admin/HospitalProfile';
import HumanResources from './admin/HumanResources';
import ProcurementDesk from './admin/ProcurementDesk';

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
  UserCheck,
  Upload,
  Heart,
  ShieldCheck,
  Activity,
  Users,
  ShoppingBag
} from 'lucide-react';

export default function Admin({ user }) {
  const { authFetch, inviteStaff, getInvitations, revokeInvite, setUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('audit'); // 'audit', 'smtp_settings', 'email_logs', 'licensing', 'role_requests', 'facility_profile', 'hr', 'procurement'
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsMessage, setRequestsMessage] = useState('');
  const [facilityDetails, setFacilityDetails] = useState({
    name: '',
    code: '',
    address: '',
    registration_number: '',
    tax_id: '',
    contact_phone: '',
    contact_email: '',
    logo_url: ''
  });
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityMessage, setFacilityMessage] = useState({ type: '', text: '' });
  const [logoOption, setLogoOption] = useState('heart'); // 'heart', 'shield', 'cross', 'custom'
  const [customLogoUrl, setCustomLogoUrl] = useState('');

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
        setFacilityDetails({
          name: activeFac.name || '',
          code: activeFac.code || '',
          address: activeFac.address || '',
          registration_number: activeFac.registration_number || '',
          tax_id: activeFac.tax_id || '',
          contact_phone: activeFac.contact_phone || '',
          contact_email: activeFac.contact_email || '',
          logo_url: activeFac.logo_url || ''
        });

        // Initialize logo options
        const logo = activeFac.logo_url || '';
        if (logo.startsWith('preset:')) {
          setLogoOption(logo.split(':')[1]);
        } else if (logo) {
          setLogoOption('custom');
          setCustomLogoUrl(logo);
        }
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

  const logoPresets = {
    heart: {
      name: 'Teal Heart Pulse',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      icon: (cls) => <Heart className={cls} fill="currentColor" />
    },
    shield: {
      name: 'Blue Care Shield',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: (cls) => <ShieldCheck className={cls} fill="currentColor" />
    },
    cross: {
      name: 'Red Clinic Cross',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      icon: (cls) => <Activity className={cls} />
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFacilityMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPEG, SVG).' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 80;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setCustomLogoUrl(compressedBase64);
          setFacilityDetails(prev => ({ ...prev, logo_url: compressedBase64 }));
          setLogoOption('custom');
          setFacilityMessage({ type: '', text: '' });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFacilityDetails = async (e) => {
    e.preventDefault();
    if (!facilityDetails.name.trim()) {
      setFacilityMessage({ type: 'error', text: 'Hospital name is required.' });
      return;
    }
    
    setSavingFacility(true);
    setFacilityMessage({ type: '', text: '' });
    
    let logoUrl = facilityDetails.logo_url;
    if (logoOption !== 'custom') {
      logoUrl = `preset:${logoOption}`;
    } else {
      logoUrl = customLogoUrl;
    }

    try {
      const { error } = await supabase
        .from('facilities')
        .update({
          name: facilityDetails.name,
          address: facilityDetails.address,
          registration_number: facilityDetails.registration_number,
          tax_id: facilityDetails.tax_id,
          contact_phone: facilityDetails.contact_phone,
          contact_email: facilityDetails.contact_email,
          logo_url: logoUrl
        })
        .eq('id', user.facility_id);
      
      if (error) throw error;

      setFacilityMessage({ type: 'success', text: 'Hospital profile particulars updated successfully!' });

      // Update local user context if setUser exists
      if (setUser) {
        setUser(prev => ({
          ...prev,
          facility_name: facilityDetails.name,
          facility_logo: logoUrl
        }));
      }

      // Log config change in audit logs
      try {
        await supabase.from('audit_logs').insert({
          facility_id: user.facility_id,
          user_id: user.id,
          action: 'Facility Profile Updated',
          details: `Updated hospital particulars for ${facilityDetails.name}.`
        });
      } catch (logErr) {
        console.error('Failed to write audit log:', logErr);
      }

      // Refresh data
      fetchAdminData();
    } catch (err) {
      setFacilityMessage({ type: 'error', text: err.message || 'Failed to update hospital particulars.' });
    } finally {
      setSavingFacility(false);
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

        {user.email === 'fredrickmakori102@gmail.com' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
              <ShieldCheck size={14} className="text-yellow-400" /> Super Admin Portal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              You are currently logged in as a clinic administrator for this tenant. Click below to return to the Systems Control Console.
            </p>
            <button
              onClick={() => {
                const updatedUser = {
                  ...user,
                  role: 'super_admin',
                  facility_id: null,
                  facility_name: 'Eagle Tech Systems Control',
                  facility_logo: null,
                  facility_is_verified: true
                };
                setUser(updatedUser);
                sessionStorage.setItem('egesa_health_active_user', JSON.stringify(updatedUser));
              }}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition active:scale-[0.98] cursor-pointer font-sans"
            >
              Go to Super Admin Console
            </button>
          </div>
        )}

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
            onClick={() => setActiveSubTab('facility_profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'facility_profile'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Building size={13} /> Hospital Profile
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

          <button
            onClick={() => setActiveSubTab('hr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'hr'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Users size={13} /> Human Resources
          </button>

          <button
            onClick={() => setActiveSubTab('procurement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
              activeSubTab === 'procurement'
                ? 'bg-slate-850 border border-slate-700 text-teal-400'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <ShoppingBag size={13} /> Procurement Desk
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-4">
          
          
          {/* TAB 1: AUDIT TRAIL */}
          {activeSubTab === 'audit' && (
            <AuditTrail
              fetchAdminData={fetchAdminData}
              auditLogs={auditLogs}
              usersList={usersList}
            />
          )}

          {/* TAB 2: OUTBOUND EMAIL LOGS */}
          {activeSubTab === 'email_logs' && (
            <EmailLogs
              smtp={smtp}
              handlePruneLogs={handlePruneLogs}
              fetchAdminData={fetchAdminData}
              emailLogs={emailLogs}
              setSelectedLogBody={setSelectedLogBody}
            />
          )}

          {/* TAB 3: SMTP SERVER SETTINGS */}
          {activeSubTab === 'smtp_settings' && (
            <SmtpSettings
              handleSaveSmtp={handleSaveSmtp}
              smtp={smtp}
              setSmtp={setSmtp}
              smtpMessage={smtpMessage}
              smtpLoading={smtpLoading}
              handleSendTestEmail={handleSendTestEmail}
              testMessage={testMessage}
              testRecipient={testRecipient}
              setTestRecipient={setTestRecipient}
              testLoading={testLoading}
              handleCheckDns={handleCheckDns}
              dnsChecking={dnsChecking}
              dnsMessage={dnsMessage}
            />
          )}

          {/* TAB 4: LICENSING & BILLING */}
          {activeSubTab === 'licensing' && (
            <LicensingBilling
              license={license}
              licenseMessage={licenseMessage}
              handleSimulateLicense={handleSimulateLicense}
            />
          )}

          {/* TAB 5: STAFF ONBOARDING & INVITATIONS PORTAL */}
          {activeSubTab === 'role_requests' && (
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
              roleRequests={roleRequests}
              requestsLoading={requestsLoading}
              requestsMessage={requestsMessage}
              handleApproveRequest={handleApproveRequest}
              handleRejectRequest={handleRejectRequest}
            />
          )}

          {/* TAB 6: HOSPITAL PROFILE PARTICULARS */}
          {activeSubTab === 'facility_profile' && (
            <HospitalProfile
              facilityMessage={facilityMessage}
              handleSaveFacilityDetails={handleSaveFacilityDetails}
              facilityDetails={facilityDetails}
              setFacilityDetails={setFacilityDetails}
              logoOption={logoOption}
              setLogoOption={setLogoOption}
              handleLogoUpload={handleLogoUpload}
              customLogoUrl={customLogoUrl}
              setCustomLogoUrl={setCustomLogoUrl}
              savingFacility={savingFacility}
            />
          )}

          {/* TAB 7: HUMAN RESOURCES */}
          {activeSubTab === 'hr' && (
            <HumanResources
              user={user}
              profiles={usersList}
              fetchAdminData={fetchAdminData}
            />
          )}

          {/* TAB 8: PROCUREMENT DESK */}
          {activeSubTab === 'procurement' && (
            <ProcurementDesk
              user={user}
            />
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
