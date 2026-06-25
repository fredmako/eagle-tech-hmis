import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendNotification } from '../../notificationService';
import HumanResources from './HumanResources';

export default function HumanResourcesWrapper({ user }) {
  const { authFetch, inviteStaff, getInvitations, revokeInvite } = useAuth();
  
  // Base states
  const [usersList, setUsersList] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsMessage, setRequestsMessage] = useState('');
  
  // Onboarding states
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(['nurse']);
  const [inviteDept, setInviteDept] = useState('general');
  const [inviteMessage, setInviteMessage] = useState({ type: '', text: '' });
  const [invitationsList, setInvitationsList] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Delegation matrix state
  const [adminDelegation, setAdminDelegation] = useState({});

  const fetchAdminData = async () => {
    setRequestsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');

      // 1. Fetch profiles filtered by facility
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
        console.error('[HR Wrapper] Error fetching profiles:', e);
      }

      // 2. Fetch role requests
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
        console.error('[HR Wrapper] Error fetching role requests:', reqErr);
        setRoleRequests([]);
      }

      // 3. Fetch departments
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
        console.error('[HR Wrapper] Error fetching departments:', deptErr);
      }

      // 4. Fetch facility details to get delegation matrix
      if (user.facility_id) {
        try {
          const res = await fetch(`${apiBase}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              table: 'facilities',
              queries: [{ type: 'equal', column: 'id', value: user.facility_id }]
            })
          });
          if (res.ok) {
            const resData = await res.json();
            const activeFac = resData.data?.find(f => f.id === user.facility_id);
            if (activeFac) {
              setAdminDelegation(activeFac.admin_delegation || {});
            }
          }
        } catch (e) {
          console.error('[HR Wrapper] Error fetching facility delegation:', e);
        }
      }

      // 5. Consolidate profiles
      const consolidated = profs ? [...profs] : [];

      // Add approved role requests
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
      
      // Fetch invitations
      await fetchInvitations();
    } catch (err) {
      console.error('[HR Wrapper] Fetch error:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    setInvitesLoading(true);
    try {
      const list = await getInvitations();
      setInvitationsList(list || []);
    } catch (err) {
      console.error('[HR Wrapper] Error fetching staff invitations:', err);
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user.facility_id]);

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

      const loginLink = `${window.location.origin}${window.location.pathname}`;
      try {
        await sendNotification('NEW_USER_CREATED', {
          fullName: req.full_name,
          role: req.requested_role,
          recipientEmail: req.email,
          loginLink: loginLink
        }, user.facility_id);
      } catch (err) {
        console.error('[HR Wrapper] Notification error:', err);
      }

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

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');
      // Create audit log
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
            action: 'Staff Invited',
            details: `Invited ${inviteEmail} as ${rolesString} (${inviteDept} department).`
          }
        })
      });
      fetchInvitations();
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

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');
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
            action: 'Staff Invitation Revoked',
            details: `Revoked pending invitation for ${email}.`
          }
        })
      });
      fetchInvitations();
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.message || 'Failed to revoke invitation.' });
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleDelegationUpdate = (matrix) => {
    setAdminDelegation(matrix);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <HumanResources
        user={user}
        profiles={usersList}
        fetchAdminData={fetchAdminData}
        roleRequests={roleRequests}
        requestsLoading={requestsLoading}
        requestsMessage={requestsMessage}
        handleApproveRequest={handleApproveRequest}
        handleRejectRequest={handleRejectRequest}
        
        // Onboarding props
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
        
        // Delegation props
        adminDelegation={adminDelegation}
        onDelegationUpdate={handleDelegationUpdate}
      />
    </div>
  );
}
