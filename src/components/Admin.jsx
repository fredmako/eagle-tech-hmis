import React, { useState, useEffect } from 'react';
import AuditTrail from './admin/AuditTrail';
import EmailLogs from './admin/EmailLogs';
import SmtpSettings from './admin/SmtpSettings';
import LicensingBilling from './admin/LicensingBilling';
import StaffOnboarding from './admin/StaffOnboarding';
import RoleRequestsList from './admin/RoleRequestsList';
import HospitalProfile from './admin/HospitalProfile';
import HumanResources from './admin/HumanResources';
import OperationsDesk from './admin/OperationsDesk';
import WardSettings from './admin/WardSettings';
import PaymentSettings from './admin/PaymentSettings';
import FacilityHelpDesk from './admin/FacilityHelpDesk';
import AdminOverview from './admin/AdminOverview';
import StaffScheduler from './admin/StaffScheduler';
import BroadcastPanel from './admin/BroadcastPanel';
import AdminDelegation from './admin/AdminDelegation';
import ModulesConfig from './admin/ModulesConfig';
import SystemAdministration from './admin/SystemAdministration';
import LaboratoryManagement from './admin/LaboratoryManagement';
import AssetsMaintenance from './admin/AssetsMaintenance';
import { hasAccess } from '../utils/permissions';

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
  ShoppingBag,
  Bed,
  PhoneCall,
  Columns,
  Maximize2,
  Tv,
  Layout,
  LayoutGrid,
  Calendar,
  Sliders,
  Bell,
  Wrench
} from 'lucide-react';

export default function Admin({ user, initialSubTab }) {
  const { authFetch, inviteStaff, getInvitations, revokeInvite, setUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('egesa_active_admin_subtab') || 'overview'); // 'overview', 'audit', 'smtp_settings', 'email_logs', 'licensing', 'staff_onboarding', 'role_requests', 'help_desk', 'facility_profile', 'hr', 'procurement', 'ward_settings', 'payment_settings'
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [supportTicketsCount, setSupportTicketsCount] = useState(0);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'maximize' | 'window' | 'dock'
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
    logo_url: '',
    facility_images: []
  });
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityMessage, setFacilityMessage] = useState({ type: '', text: '' });
  const [logoOption, setLogoOption] = useState('heart'); // 'heart', 'shield', 'cross', 'custom'
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [adminDelegation, setAdminDelegation] = useState({});

  // Staff Onboarding & Invites states
  const [invitationsList, setInvitationsList] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(['nurse']);
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

  // AfyaLink states
  const [afyalinkLogs, setAfyalinkLogs] = useState([]);
  const [afyaMessage, setAfyaMessage] = useState('');
  const [retryingLogId, setRetryingLogId] = useState(null);
  const [revealSecret, setRevealSecret] = useState(false);
  const [selectedPayloadLog, setSelectedPayloadLog] = useState(null);

  // Custom Domain/Subdomain states
  const [customSubdomain, setCustomSubdomain] = useState(localStorage.getItem(`egesa_subdomain_${user.facility_id}`) || '');
  const [customDomain, setCustomDomain] = useState(localStorage.getItem(`egesa_custom_domain_${user.facility_id}`) || '');
  const [domainStatus, setDomainStatus] = useState('pending');
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState({ type: '', text: '' });
  const [landingTemplate, setLandingTemplate] = useState('classic');

  useEffect(() => {
    localStorage.setItem('egesa_active_admin_subtab', activeSubTab);
  }, [activeSubTab]);

  const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
  const isAdminRole = rolesList.includes('admin');

  useEffect(() => {
    // If activeSubTab is not allowed, fallback to overview
    if (activeSubTab !== 'overview' && activeSubTab !== 'delegation') {
      if (!hasAccess(activeSubTab, user.role, adminDelegation)) {
        setActiveSubTab('overview');
      }
    } else if (activeSubTab === 'delegation' && !isAdminRole) {
      setActiveSubTab('overview');
    }
  }, [activeSubTab, adminDelegation, user.role, isAdminRole]);

  useEffect(() => {
    fetchAdminData();
    setTestRecipient(smtp.test_email_destination || 'admin@eagletechsolutions.tech');
  }, []);

  const handleDelegationUpdate = (newDelegation) => {
    setAdminDelegation(newDelegation);
  };

  const fetchAdminData = async () => {
    setLoadingLogs(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');

      // Fetch audit logs filtered by active facility context
      let logs = [];
      try {
        const res = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'audit_logs',
            queries: user.facility_id ? [
              { type: 'equal', column: 'facility_id', value: user.facility_id }
            ] : [],
            orderByField: 'created_at',
            orderByAsc: false
          })
        });
        if (res.ok) {
          const resData = await res.json();
          logs = resData.data || [];
        }
      } catch (e) {
        console.error('Error fetching audit logs:', e);
      }
      setAuditLogs(logs);
      
      // Filter out AfyaLink sync transactions
      const afyaLogs = logs.filter(l => l.action === 'AfyaLink Sync');
      setAfyalinkLogs(afyaLogs);

      // Fetch profiles filtered by this facility context
      let profs = [];
      try {
        const res = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'profiles',
            queries: user.facility_id ? [
              { type: 'equal', column: 'facility_id', value: user.facility_id }
            ] : [
              { type: 'is', column: 'facility_id', value: null }
            ]
          })
        });
        if (res.ok) {
          const resData = await res.json();
          profs = resData.data || [];
        }
      } catch (e) {
        console.error('Error fetching profiles:', e);
      }

      // Fetch facilities
      let facs = [];
      try {
        const res = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'facilities',
            queries: []
          })
        });
        if (res.ok) {
          const resData = await res.json();
          facs = resData.data || [];
        }
      } catch (e) {
        console.error('Error fetching facilities:', e);
      }

      const activeFac = facs?.find(f => f.id === user.facility_id);
      if (activeFac) {
        setAdminDelegation(activeFac.admin_delegation || {});
        setFacilityDetails({
          name: activeFac.name || '',
          code: activeFac.code || '',
          address: activeFac.address || '',
          registration_number: activeFac.registration_number || '',
          tax_id: activeFac.tax_id || '',
          contact_phone: activeFac.contact_phone || '',
          contact_email: activeFac.contact_email || '',
          logo_url: activeFac.logo_url || '',
          facility_images: activeFac.facility_images || []
        });

        // Initialize logo options
        const logo = activeFac.logo_url || '';
        if (logo.startsWith('preset:')) {
          setLogoOption(logo.split(':')[1]);
        } else if (logo) {
          setLogoOption('custom');
          setCustomLogoUrl(logo);
        }

        setCustomSubdomain(activeFac.subdomain_prefix || '');
        setCustomDomain(activeFac.custom_domain || '');
        setDomainStatus(activeFac.domain_status || 'pending');
        setLandingTemplate(activeFac.landing_template || 'classic');
      }

      // Fetch role requests for this facility from backend
      let reqs = [];
      try {
        const res = await authFetch('/auth/role-requests');
        const data = await res.json();
        if (res.ok && data.requests) {
          reqs = data.requests;
          setRoleRequests(reqs);
        } else {
          setRoleRequests([]);
        }
      } catch (reqErr) {
        console.error('Error fetching role requests:', reqErr);
        setRoleRequests([]);
      }

      // Fetch duty rosters & attendance logs to check for rostered/active employees
      let rostersData = [];
      let attendanceData = [];
      if (user.facility_id) {
        try {
          const res = await fetch(`${apiBase}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              table: 'duty_rosters',
              queries: [{ type: 'equal', column: 'facility_id', value: user.facility_id }]
            })
          });
          if (res.ok) {
            const resData = await res.json();
            rostersData = resData.data || [];
          }
        } catch (e) {
          console.error('Error loading rosters for consolidation:', e);
        }

        try {
          const res = await fetch(`${apiBase}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              table: 'attendance_logs',
              queries: [{ type: 'equal', column: 'facility_id', value: user.facility_id }]
            })
          });
          if (res.ok) {
            const resData = await res.json();
            attendanceData = resData.data || [];
          }
        } catch (e) {
          console.error('Error loading attendance for consolidation:', e);
        }
      }

      const activeEmployeeIds = Array.from(new Set([
        ...rostersData.map(r => r.user_id),
        ...attendanceData.map(a => a.user_id)
      ])).filter(Boolean);

      // Fetch profiles for these active employees if they aren't already included in profs
      let activeEmpProfiles = [];
      if (activeEmployeeIds.length > 0) {
        try {
          const res = await fetch(`${apiBase}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              table: 'profiles',
              queries: [{ type: 'in', column: 'id', value: activeEmployeeIds }]
            })
          });
          if (res.ok) {
            const resData = await res.json();
            activeEmpProfiles = resData.data || [];
          }
        } catch (e) {
          console.error('Error fetching active employee profiles:', e);
        }
      }

      // Consolidate profiles
      const consolidated = profs ? [...profs] : [];

      // Add active roster/attendance employee profiles
      activeEmpProfiles.forEach(emp => {
        const exists = consolidated.some(p => p.id === emp.id || (p.email && emp.email && p.email.toLowerCase().trim() === emp.email.toLowerCase().trim()));
        if (!exists) {
          consolidated.push(emp);
        }
      });

      // Add approved role requests (which represent accepted employees)
      if (reqs && reqs.length > 0) {
        const approvedReqs = reqs.filter(r => r.status === 'approved' && (!user.facility_id || r.facility_id === user.facility_id));
        approvedReqs.forEach(req => {
          const exists = consolidated.some(p => 
            (p.email && p.email.toLowerCase().trim() === req.email.toLowerCase().trim()) || 
            p.id === req.user_id
          );
          if (!exists) {
            consolidated.push({
              id: req.user_id || `req_${req.id}`,
              full_name: req.full_name,
              email: req.email,
              role: req.requested_role,
              facility_id: req.facility_id,
              created_at: req.created_at
            });
          }
        });
      }

      // Add current administrator user context
      if (user && user.email) {
        const exists = consolidated.some(p => p.email && p.email.toLowerCase().trim() === user.email.toLowerCase().trim());
        if (!exists) {
          consolidated.push({
            id: user.id,
            full_name: user.full_name || user.name || 'Administrator',
            email: user.email,
            role: user.role || 'admin',
            facility_id: user.facility_id || null,
            created_at: new Date().toISOString()
          });
        }
      }

      setUsersList(consolidated);

      // Fetch departments
      try {
        const res = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'departments',
            queries: user.facility_id ? [
              { type: 'equal', column: 'facility_id', value: user.facility_id }
            ] : []
          })
        });
        if (res.ok) {
          const resData = await res.json();
          setDepartments(resData.data || []);
        }
      } catch (deptErr) {
        console.error('Error fetching departments:', deptErr);
      }

      // Fetch staff invitations
      await fetchInvitations();

      // Refresh email logs
      setEmailLogs(getEmailLogs(user.facility_id));

      // Fetch support tickets count
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('egesa_health_token');
        if (user.facility_id) {
          const res = await fetch(`${apiBase}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              table: 'support_tickets',
              queries: [
                { type: 'equal', column: 'facility_id', value: user.facility_id },
                { type: 'equal', column: 'status', value: 'pending' }
              ]
            })
          });
          if (res.ok) {
            const resData = await res.json();
            setSupportTicketsCount(resData.data?.length || 0);
          }
        }
      } catch (ticketErr) {
        console.error('Error fetching support tickets count:', ticketErr);
      }
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
      const rolesString = Array.isArray(inviteRole) ? inviteRole.join(',') : inviteRole;
      await inviteStaff(inviteEmail.trim(), rolesString, inviteDept);
      setInviteMessage({ type: 'success', text: `Invitation successfully dispatched to ${inviteEmail}!` });
      setInviteEmail('');
      // Log config change in audit logs
      try {
        await supabase.from('audit_logs').insert({
          action: 'Staff Invitation Sent',
          details: `Invited ${inviteEmail} as ${Array.isArray(inviteRole) ? inviteRole.join(', ') : inviteRole} (${inviteDept} department).`
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
          logo_url: logoUrl,
          facility_images: facilityDetails.facility_images || []
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

  const handleRetrySync = async (log) => {
    setRetryingLogId(log.id);
    setAfyaMessage({ type: '', text: '' });
    try {
      let details = {};
      try {
        details = JSON.parse(log.details);
      } catch (e) {
        throw new Error('Invalid log details format');
      }

      // Reconstruct original encounterData
      const encounterData = details.encounterData || {
        visit_id: details.encounterId,
        patient_id: details.payload?.entry?.[0]?.resource?.subject?.reference?.split('/')?.[1] || 'p_unknown',
        patient_name: details.patientName,
        patient_code: details.patientCode,
        diagnosis_code: details.payload?.entry?.[1]?.resource?.code?.coding?.[0]?.code || 'A00',
        diagnosis_name: details.diagnosis || 'Consultation Encounter',
        encounter_class: details.payload?.entry?.[0]?.resource?.class?.code === 'IMP' ? 'IMP' : 'AMB',
        vitals: {
          temperature: details.payload?.entry?.[3]?.resource?.valueQuantity?.value || 37.0,
          weight: details.payload?.entry?.[4]?.resource?.valueQuantity?.value || 70.0,
          systolic: details.payload?.entry?.[2]?.resource?.component?.[0]?.valueQuantity?.value || 120,
          diastolic: details.payload?.entry?.[2]?.resource?.component?.[1]?.valueQuantity?.value || 80
        }
      };

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/afyalink/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(encounterData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error during sync retry');

      setAfyaMessage({ type: 'success', text: `Sync retry succeeded! HIE Response Code: ${res.status}` });
      fetchAdminData();
    } catch (err) {
      setAfyaMessage({ type: 'error', text: `Sync retry failed: ${err.message}` });
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSaveDomain = async (e) => {
    e.preventDefault();
    setSavingDomain(true);
    setDomainMessage({ type: '', text: '' });
    
    try {
      const cleanSubdomain = customSubdomain.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
      const cleanDomain = customDomain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
      
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // 1. Save subdomain prefix to facilities table via DB Proxy
      const resSub = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'facilities',
          column: 'id',
          value: user.facility_id,
          values: { 
            subdomain_prefix: cleanSubdomain,
            landing_template: landingTemplate
          }
        })
      });

      if (!resSub.ok) {
        const errorData = await resSub.json();
        throw new Error(errorData.error || 'Failed to update subdomain prefix.');
      }

      localStorage.setItem(`egesa_subdomain_${user.facility_id}`, cleanSubdomain);

      // 2. If custom domain is set, configure it programmatically via backend domains router
      if (cleanDomain) {
        const resDom = await fetch(`${apiBase}/domains/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            domain: cleanDomain,
            facilityId: user.facility_id
          })
        });

        if (!resDom.ok) {
          const errorData = await resDom.json();
          throw new Error(errorData.error || 'Failed to register custom domain with Vercel.');
        }

        localStorage.setItem(`egesa_custom_domain_${user.facility_id}`, cleanDomain);
      } else {
        // Clear custom domain on backend if user empties the field
        const resDomClear = await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'facilities',
            column: 'id',
            value: user.facility_id,
            values: { custom_domain: '', domain_status: 'pending' }
          })
        });
        if (!resDomClear.ok) {
          const errorData = await resDomClear.json();
          throw new Error(errorData.error || 'Failed to clear custom domain settings.');
        }
        localStorage.removeItem(`egesa_custom_domain_${user.facility_id}`);
      }

      // Log event in audit trail
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Custom Domain Updated',
        details: `Subdomain prefix set to: ${cleanSubdomain}, Custom domain set to: ${cleanDomain || 'None'}`
      });

      setDomainMessage({ type: 'success', text: 'Hospital subdomain & custom domain saved successfully!' });
      await fetchAdminData();
    } catch (err) {
      console.error('Save domain settings failed:', err);
      setDomainMessage({ type: 'error', text: err.message || 'Failed to save domain configuration.' });
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDomainStatus = async () => {
    if (!customDomain) return;
    setSavingDomain(true);
    setDomainMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/domains/status?domain=${customDomain.trim()}&facilityId=${user.facility_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification query failed.');

      if (data.verified) {
        setDomainMessage({ type: 'success', text: 'DNS configurations are verified! Custom domain is live.' });
      } else {
        setDomainMessage({ type: 'error', text: 'Domain configuration verification is still pending. Please verify CNAME/A records.' });
      }
      await fetchAdminData();
    } catch (err) {
      console.error('Verify domain status failed:', err);
      setDomainMessage({ type: 'error', text: err.message || 'Failed to verify DNS.' });
    } finally {
      setSavingDomain(false);
    }
  };

  return (
    <div className="relative">
      {/* View Mode Background Backdrop */}
      {(viewMode === 'window' || viewMode === 'dock') && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fadeIn"
          onClick={() => setViewMode('split')}
        />
      )}

      <div className={viewMode === 'maximize' ? 'w-full animate-fadeIn' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn'}>
        {/* Left Columns: Config & Users */}
        {viewMode !== 'maximize' && (
          <div className="space-y-6 transition-all duration-300">
        {/* Facility Info Card */}
        <div 
          onClick={() => setActiveSubTab('facility_profile')}
          className="bg-slate-900 border border-slate-800 hover:border-teal-500/30 rounded-xl p-5 shadow-sm space-y-4 cursor-pointer transition-all duration-300 hover:bg-slate-850/20 hover:shadow-lg group"
        >
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800 group-hover:text-teal-400 transition-colors">
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
      )}

      {/* Right Columns: Tabbed Control Center */}
      <div className={`transition-all duration-300 flex flex-col justify-start min-w-0 ${
        viewMode === 'maximize' 
          ? 'w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 min-h-[480px]'
          : viewMode === 'window'
          ? 'fixed inset-4 sm:inset-10 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto'
          : viewMode === 'dock'
          ? 'fixed top-0 right-0 h-screen w-full sm:w-[500px] z-50 bg-slate-900 border-l border-slate-800 shadow-2xl p-5 space-y-3 overflow-y-auto'
          : 'lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 min-h-[480px]'
      }`}>
        {/* Sub-tab Navigation & View Mode Panel */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-800 pb-2 gap-3 shrink-0 w-full min-w-0">
          <div className="flex overflow-x-auto gap-2 pb-2 w-full xl:flex-1 min-w-0 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                activeSubTab === 'overview'
                  ? 'bg-slate-850 border border-slate-700 text-teal-400'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={13} /> Overview
            </button>

            {isAdminRole && (
              <button
                onClick={() => setActiveSubTab('modules_config')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'modules_config'
                    ? 'bg-slate-850 border border-slate-705 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Sliders size={13} /> Modules Config
              </button>
            )}

            {isAdminRole && (
              <button
                onClick={() => setActiveSubTab('system_administration')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'system_administration'
                    ? 'bg-slate-850 border border-slate-705 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Sliders size={13} /> System Administration
              </button>
            )}

            {isAdminRole && (
              <button
                onClick={() => setActiveSubTab('laboratory_management')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'laboratory_management'
                    ? 'bg-slate-850 border border-slate-705 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Sliders size={13} /> Laboratory Services
              </button>
            )}

            {isAdminRole && (
              <button
                onClick={() => setActiveSubTab('delegation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'delegation'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <ShieldCheck size={13} /> Role Delegation
              </button>
            )}

            {hasAccess('audit', user.role, adminDelegation) && (
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
            )}
            
            {hasAccess('email_logs', user.role, adminDelegation) && (
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
            )}

            {hasAccess('smtp_settings', user.role, adminDelegation) && (
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
            )}

            {hasAccess('licensing', user.role, adminDelegation) && (
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
            )}

            {hasAccess('facility_profile', user.role, adminDelegation) && (
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
            )}

            {hasAccess('staff_onboarding', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('staff_onboarding')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'staff_onboarding'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <UserPlus size={13} /> Staff Onboarding
                {invitationsList.filter(i => i.status === 'pending').length > 0 && (
                  <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25">
                    {invitationsList.filter(i => i.status === 'pending').length}
                  </span>
                )}
              </button>
            )}

            {hasAccess('role_requests', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('role_requests')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'role_requests'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <UserCheck size={13} /> Role Requests
                {roleRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25">
                    {roleRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            )}

            {hasAccess('help_desk', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('help_desk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'help_desk'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <PhoneCall size={13} /> Help Desk
                {supportTicketsCount > 0 && (
                  <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25">
                    {supportTicketsCount}
                  </span>
                )}
              </button>
            )}

            {hasAccess('hr', user.role, adminDelegation) && (
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
            )}

            {hasAccess('procurement', user.role, adminDelegation) && (
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
            )}

            {hasAccess('maintenance', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('maintenance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'maintenance'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Wrench size={13} /> Assets Maintenance
              </button>
            )}

            {hasAccess('afyalink', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('afyalink')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'afyalink'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Activity size={13} /> AfyaLink HIE Integration
                {afyalinkLogs.filter(l => {
                  try {
                    return JSON.parse(l.details).status === 'failed';
                  } catch(e) { return false; }
                }).length > 0 && (
                  <span className="bg-red-500/20 text-[10px] text-red-400 font-bold px-1.5 py-0.5 rounded-full border border-red-500/25 ml-1">
                    {afyalinkLogs.filter(l => {
                      try {
                        return JSON.parse(l.details).status === 'failed';
                      } catch(e) { return false; }
                    }).length}
                  </span>
                )}
              </button>
            )}

            {hasAccess('domain', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('domain')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'domain'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Globe size={13} /> Domain & Branding
              </button>
            )}

            {hasAccess('ward_settings', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('ward_settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'ward_settings'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Bed size={13} /> Ward & Bed Settings
              </button>
            )}

            {hasAccess('payment_settings', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('payment_settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'payment_settings'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <CreditCard size={13} /> Payment & Landing Config
              </button>
            )}

            {hasAccess('roster', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('roster')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'roster'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Calendar size={13} /> Duty Roster & Attendance
              </button>
            )}

            {hasAccess('broadcasts', user.role, adminDelegation) && (
              <button
                onClick={() => setActiveSubTab('broadcasts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeSubTab === 'broadcasts'
                    ? 'bg-slate-850 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <Bell size={13} /> Alerts & Broadcasts
              </button>
            )}
          </div>

          {/* Mini Settings Panel for View Modes */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg shrink-0 select-none self-end xl:self-auto shadow-inner">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1.5 border-r border-slate-850">
              View
            </span>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded transition ${
                viewMode === 'split' 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Split View"
            >
              <Columns size={11} />
            </button>
            <button
              onClick={() => setViewMode('maximize')}
              className={`p-1 rounded transition ${
                viewMode === 'maximize' 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Maximize"
            >
              <Maximize2 size={11} />
            </button>
            <button
              onClick={() => setViewMode('window')}
              className={`p-1 rounded transition ${
                viewMode === 'window' 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Window Mode"
            >
              <Tv size={11} />
            </button>
            <button
              onClick={() => setViewMode('dock')}
              className={`p-1 rounded transition ${
                viewMode === 'dock' 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Dock Right"
            >
              <Layout size={11} />
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-4">
          
          {activeSubTab !== 'overview' && activeSubTab !== 'delegation' && activeSubTab !== 'modules_config' && activeSubTab !== 'system_administration' && activeSubTab !== 'laboratory_management' && !hasAccess(activeSubTab, user.role, adminDelegation) ? (
            <div className="p-8 text-center text-slate-500 font-medium bg-slate-950/20 border border-slate-850 rounded-xl space-y-2">
              <Lock className="mx-auto text-slate-600 mb-2" size={24} />
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Access Denied</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto">You do not have administrative clearance to access this settings panel.</p>
            </div>
          ) : (
            <>
              {/* TAB: MODULES CONFIGURATION */}
              {activeSubTab === 'modules_config' && (
                <ModulesConfig 
                  user={user} 
                  onClose={() => setActiveSubTab('overview')} 
                />
              )}

              {/* TAB: SYSTEM ADMINISTRATION */}
              {activeSubTab === 'system_administration' && (
                <SystemAdministration 
                  user={user} 
                  onClose={() => setActiveSubTab('overview')} 
                />
              )}

              {/* TAB: LABORATORY SERVICES */}
              {activeSubTab === 'laboratory_management' && (
                <LaboratoryManagement 
                  user={user} 
                  onClose={() => setActiveSubTab('overview')} 
                />
              )}

              {/* TAB 0: OVERVIEW */}
              {activeSubTab === 'overview' && (
                <AdminOverview
                  setActiveSubTab={setActiveSubTab}
                  user={user}
                  invitationsList={invitationsList}
                  roleRequests={roleRequests}
                  supportTicketsCount={supportTicketsCount}
                  afyalinkLogs={afyalinkLogs}
                  emailLogs={emailLogs}
                  adminDelegation={adminDelegation}
                />
              )}

              {/* TAB: ROLE DELEGATION */}
              {activeSubTab === 'delegation' && isAdminRole && (
                <AdminDelegation
                  user={user}
                  currentDelegation={adminDelegation}
                  onUpdate={handleDelegationUpdate}
                />
              )}
          
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
          {activeSubTab === 'staff_onboarding' && (
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
              dbDepartments={departments}
            />
          )}

          {/* TAB 5b: STAFF ROLE APPROVAL REQUESTS */}
          {activeSubTab === 'role_requests' && (
            <RoleRequestsList
              roleRequests={roleRequests}
              requestsLoading={requestsLoading}
              requestsMessage={requestsMessage}
              handleApproveRequest={handleApproveRequest}
              handleRejectRequest={handleRejectRequest}
              fetchAdminData={fetchAdminData}
            />
          )}

          {/* TAB 5c: FACILITY HELP DESK & PATIENT INQUIRIES */}
          {activeSubTab === 'help_desk' && (
            <FacilityHelpDesk user={user} />
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
              roleRequests={roleRequests}
              requestsLoading={requestsLoading}
              requestsMessage={requestsMessage}
              handleApproveRequest={handleApproveRequest}
              handleRejectRequest={handleRejectRequest}
            />
          )}

          {activeSubTab === 'procurement' && (
            <OperationsDesk
              user={user}
            />
          )}

          {activeSubTab === 'maintenance' && (
            <AssetsMaintenance
              user={user}
            />
          )}

          {/* TAB 9: AFYALINK HIE INTEGRATION */}
          {activeSubTab === 'afyalink' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Activity size={14} className="text-teal-400 animate-pulse" /> DHA Kenya AfyaLink HIE System Integration
                </h4>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold font-sans">
                  Status: Connected (UAT Approved)
                </span>
              </div>

              {afyaMessage && afyaMessage.text && (
                <div className={`p-2.5 rounded text-xs flex gap-2 ${
                  afyaMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
                }`}>
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{afyaMessage.text}</span>
                </div>
              )}

              {/* Credentials & Details Card */}
              <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider font-sans">HIE Authentication Credentials</h5>
                  <button
                    onClick={() => setRevealSecret(!revealSecret)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-bold font-sans"
                  >
                    {revealSecret ? 'Hide Secrets' : 'Reveal Credentials'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block font-semibold">Base URL</span>
                    <span className="text-slate-300">https://api.dha.go.ke/v1</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Agent ID</span>
                    <span className="text-slate-300">DHABP06856</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Username</span>
                    <span className="text-slate-300">{revealSecret ? 't8xwo9EjTR9xVot7jgc' : '••••••••••••••••••••'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Password</span>
                    <span className="text-slate-300">{revealSecret ? '70h1gsbVx1cV1hgewB4' : '••••••••••••••••••••'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Client Key</span>
                    <span className="text-slate-300">{revealSecret ? 'HA6-DHABP06856' : '••••••••••••••••••••'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Client Secret</span>
                    <span className="text-slate-300 break-all">{revealSecret ? 'fECP2T1dOAJn4BEzeyYtbgXmGz4moWTftxBx9aMGybfPj5Cr' : '••••••••••••••••••••••••••••••••••••••••'}</span>
                  </div>
                </div>
              </div>

              {/* Transactions logs table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-sans">HIE Submission Activity Logs</h5>
                  <button
                    onClick={fetchAdminData}
                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bold font-sans cursor-pointer"
                  >
                    <RefreshCw size={10} /> Refresh Logs
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-850 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-850 uppercase text-[9px] tracking-wider">
                        <th className="py-2.5 px-3">Date/Time</th>
                        <th className="py-2.5 px-3">Patient Code</th>
                        <th className="py-2.5 px-3">Patient Name</th>
                        <th className="py-2.5 px-3">Diagnosis</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {afyalinkLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-500 text-[11px] font-sans">
                            No sync activity logs found for this facility context.
                          </td>
                        </tr>
                      ) : (
                        afyalinkLogs.map(log => {
                          let details = {};
                          try {
                            details = JSON.parse(log.details);
                          } catch (e) {}

                          const status = details.status || 'sent';

                          return (
                            <tr key={log.id} className="hover:bg-slate-850/40 transition">
                              <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-teal-500">
                                {details.patientCode || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[11px]">
                                {details.patientName || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 truncate max-w-[150px]" title={details.diagnosis}>
                                {details.diagnosis || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block ${
                                  status === 'sent'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedPayloadLog(details.payload)}
                                  className="text-[10px] text-teal-400 hover:text-teal-300 underline font-bold cursor-pointer font-sans"
                                >
                                  View Payload
                                </button>
                                {status === 'failed' && (
                                  <button
                                    onClick={() => handleRetrySync(log)}
                                    disabled={retryingLogId === log.id}
                                    className="text-[10px] text-yellow-400 hover:text-yellow-300 font-bold bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded cursor-pointer transition disabled:opacity-50 font-sans"
                                  >
                                    {retryingLogId === log.id ? 'Retrying...' : 'Retry'}
                                  </button>
                                )}
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

          {/* TAB 10: CUSTOM SUBDOMAINS & BRANDING */}
          {activeSubTab === 'domain' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Globe size={14} className="text-teal-400" /> Custom Subdomain & Outbound Branding
                </h4>
              </div>

              {domainMessage.text && (
                <div className={`p-2.5 rounded text-xs flex gap-2 ${
                  domainMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
                }`}>
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{domainMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveDomain} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      Preferred Subdomain Prefix
                    </label>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                      <input
                        type="text"
                        value={customSubdomain}
                        onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="egesamedicalclinic"
                        className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                      />
                      <span className="bg-slate-900 px-3 py-2 text-xs text-slate-550 border-l border-slate-800 select-none font-mono">
                        .eagletechsolutions.tech
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 font-sans">Only lower-case letters, numbers, and hyphens are supported.</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                        Custom Outer Domain (Optional)
                      </label>
                      {customDomain && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          domainStatus === 'active' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                        }`}>
                          {domainStatus === 'active' ? 'Verified & Active' : 'Verification Pending'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                      placeholder="egesamedicalclinic.com"
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition focus:outline-none font-mono"
                    />
                    <p className="text-[9px] text-slate-500 mt-1 font-sans">Configure full domain mapping if you own a custom TLD domain.</p>
                  </div>
                </div>

                {/* Landing Page Template Selector */}
                <div className="border-t border-slate-800 pt-6">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">
                    Public Landing Page Design Template
                  </label>
                  <p className="text-[10px] text-slate-500 mb-4 font-sans leading-relaxed">
                    Select a layout template for your subdomain landing page. Each template is fully responsive, optimized for conversions, and includes animated sections.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Classic */}
                    <div 
                      onClick={() => setLandingTemplate('classic')}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                        landingTemplate === 'classic' 
                          ? 'bg-teal-950/20 border-teal-500 shadow-md shadow-teal-500/5' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200">Classic Clinic Grid</span>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          landingTemplate === 'classic' ? 'border-teal-500 bg-teal-500' : 'border-slate-600'
                        }`}>
                          {landingTemplate === 'classic' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        A structured, functional portal displaying your specialization departments, pricing catalog, direct inquiry desk, and patient authentication.
                      </p>
                    </div>

                    {/* Card 2: Modern */}
                    <div 
                      onClick={() => setLandingTemplate('modern')}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                        landingTemplate === 'modern' 
                          ? 'bg-teal-950/20 border-teal-500 shadow-md shadow-teal-500/5' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200">Modern Vibrant Wellness</span>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          landingTemplate === 'modern' ? 'border-teal-500 bg-teal-500' : 'border-slate-600'
                        }`}>
                          {landingTemplate === 'modern' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        An impressive full-width hero header, dynamic key metrics/statistics, active services grid, and bold patient portal login widgets.
                      </p>
                    </div>

                    {/* Card 3: Wellness */}
                    <div 
                      onClick={() => setLandingTemplate('wellness')}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                        landingTemplate === 'wellness' 
                          ? 'bg-teal-950/20 border-teal-500 shadow-md shadow-teal-500/5' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200">Calming Wellness & Care</span>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          landingTemplate === 'wellness' ? 'border-teal-500 bg-teal-500' : 'border-slate-600'
                        }`}>
                          {landingTemplate === 'wellness' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-450 leading-relaxed">
                        A peaceful design with soft colors, emphasizing primary care services, active clinical certifications, and interactive appointment requests.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
                  {customDomain && (
                    <button
                      type="button"
                      onClick={handleVerifyDomainStatus}
                      disabled={savingDomain}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs py-2 px-5 rounded-lg transition active:scale-[0.98] cursor-pointer font-sans animate-pulse"
                    >
                      Verify DNS Status
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingDomain}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-bold text-xs py-2 px-5 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer font-sans"
                  >
                    {savingDomain ? 'Saving Settings...' : 'Save Domain Settings'}
                  </button>
                </div>
              </form>

              {/* DNS Mapping Configuration Cards */}
              <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1 font-sans">
                    DNS Routing Instructions
                  </h5>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  To point your subdomain or custom domain to your Eagle Tech portal, sign in to your DNS provider control panel and configure the following DNS records:
                </p>

                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left text-[10px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 text-[9px] uppercase">
                        <th className="py-2 px-2.5">Record Type</th>
                        <th className="py-2 px-2.5">Host Name</th>
                        <th className="py-2 px-2.5">Target Value</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-450 divide-y divide-slate-900 font-semibold">
                      <tr>
                        <td className="py-2 px-2.5 text-slate-300">CNAME</td>
                        <td className="py-2 px-2.5 text-teal-500">
                          {customSubdomain || 'egesamedicalclinic'}
                        </td>
                        <td className="py-2 px-2.5">cname.vercel-dns.com</td>
                        <td className="py-2 px-2.5 text-center text-green-400 font-bold">● Active (Wildcard Routing)</td>
                      </tr>
                      {customDomain && (
                        <tr>
                          <td className="py-2 px-2.5 text-slate-300">A Record</td>
                          <td className="py-2 px-2.5 text-teal-500">@</td>
                          <td className="py-2 px-2.5">76.76.21.21</td>
                          <td className="py-2 px-2.5 text-center font-bold">
                            {domainStatus === 'active' ? (
                              <span className="text-green-400">● Verified</span>
                            ) : (
                              <span className="text-yellow-400">● Pending DNS Check</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SMTP configuration guide linkage */}
              <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-2">
                <h5 className="text-[11px] font-bold text-slate-305 uppercase tracking-wider font-sans">Outbound SMTP Custom Email Branding</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  By default, system notification mailers (user invitations, password resets, phlebotomy rejections, pharmacy dispensations) are dispatched using <strong>admin@eagletechsolutions.tech</strong>.
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  To authenticate and white-label your custom email identity (e.g. <code>info@{customDomain || 'egesamedicalclinic.com'}</code>):
                </p>
                <ol className="list-decimal list-inside text-[10px] text-slate-500 pl-1 space-y-1 pt-1 font-sans">
                  <li>Configure SPF, DKIM, and MX records at your domain DNS registrar to delegate Titan Email auth.</li>
                  <li>Head over to the <button onClick={() => setActiveSubTab('smtp_settings')} className="text-teal-400 font-bold underline cursor-pointer">SMTP Server Settings</button> tab to save your custom SMTP Host, Port, Username, and Password particulars.</li>
                </ol>
              </div>
            </div>
          )}

          {activeSubTab === 'ward_settings' && (
            <WardSettings user={user} />
          )}

          {activeSubTab === 'payment_settings' && (
            <PaymentSettings user={user} />
          )}

          {activeSubTab === 'roster' && (
            <StaffScheduler user={user} profiles={usersList} fetchAdminData={fetchAdminData} dbDepartments={departments} />
          )}

          {activeSubTab === 'broadcasts' && (
            <BroadcastPanel user={user} profiles={usersList} fetchAdminData={fetchAdminData} />
          )}
            </>
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
                className="bg-slate-855 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDERED FHIR PAYLOAD VIEW MODAL */}
      {selectedPayloadLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-scale-up">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                  <FileText size={16} className="text-teal-400" /> DHA FHIR Transaction Payload
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Clinical bundle resource details</p>
              </div>
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="text-slate-400 hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Rendered JSON Payload Panel */}
            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[300px]">
              <pre className="text-[10px] text-teal-400 font-mono whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(selectedPayloadLog, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="bg-slate-850 border border-slate-700 text-slate-350 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
