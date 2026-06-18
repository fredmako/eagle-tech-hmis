import React from 'react';
import { UserPlus, CheckCircle, Send, Mail, Trash2, UserCheck, XCircle } from 'lucide-react';

export default function StaffOnboarding({
  inviteMessage,
  handleSendInvite,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteDept,
  setInviteDept,
  invitesLoading,
  invitationsList,
  handleRevokeInvite,
  roleRequests = [],
  requestsLoading,
  requestsMessage,
  handleApproveRequest,
  handleRejectRequest
}) {
  return (
    <div className="space-y-4 animate-fadeIn">

      <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4">
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
              className="bg-teal-500 hover:bg-teal-600 hover:scale-[1.02] text-slate-950 font-bold text-xs py-2 px-5 rounded-lg shadow-md transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} /> {invitesLoading ? 'Sending Invitation...' : 'Send Onboarding Invite'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4">
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
                    <td className="py-2.5 px-3 font-mono text-[10px]">
                      {invite.status === 'pending' ? (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRevokeInvite(invite.id || invite.$id, invite.email)}
                            className="bg-slate-850 hover:bg-slate-850 border border-slate-700 text-red-400 hover:text-red-300 font-bold text-[10px] py-1 px-2.5 rounded transition active:scale-[0.96] flex items-center gap-1 cursor-pointer"
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
  );
}
