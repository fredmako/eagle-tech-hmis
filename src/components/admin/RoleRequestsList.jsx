import React from 'react';
import { UserCheck, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function RoleRequestsList({
  roleRequests = [],
  requestsLoading,
  requestsMessage,
  handleApproveRequest,
  handleRejectRequest,
  fetchAdminData
}) {
  const pendingRequests = roleRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-4 animate-fadeIn font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck size={14} className="text-teal-400" /> Pending Staff Access Requests
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Review and approve pending access requests from staff members wishing to join your hospital workspace.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            disabled={requestsLoading}
            className="text-slate-400 hover:text-teal-400 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={12} className={requestsLoading ? "animate-spin text-teal-400" : ""} />
          </button>
        </div>

        {requestsMessage && (
          <div className={`p-3 rounded-lg text-xs flex gap-2 font-semibold ${
            requestsMessage.includes('failed') || requestsMessage.includes('Error') 
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{requestsMessage}</span>
          </div>
        )}

        {requestsLoading && pendingRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading pending requests...</span>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs flex flex-col items-center justify-center">
            <Clock size={28} className="mb-2 text-slate-700" />
            <span className="font-bold text-slate-400">No Pending Requests</span>
            <span className="text-[10px] text-slate-500 mt-1 text-center">Staff members requesting access to this facility will appear here.</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-950 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-950 text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Requested Role</th>
                  <th className="py-2.5 px-3">Submitted Date</th>
                  <th className="py-2.5 px-3 text-center">Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-955 text-slate-300 font-semibold">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-955/25 transition">
                    <td className="py-3 px-3 text-slate-100 capitalize">{req.full_name}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-450">{req.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 border border-teal-500/20 text-teal-400">
                        {req.requested_role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={requestsLoading}
                          className="bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded-lg shadow active:scale-[0.97] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          disabled={requestsLoading}
                          className="bg-slate-850 hover:bg-slate-800 text-red-450 border border-slate-750 hover:border-red-500/25 font-bold text-[10px] py-1.5 px-3 rounded-lg shadow active:scale-[0.97] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={11} />
                          <span>Reject</span>
                        </button>
                      </div>
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
