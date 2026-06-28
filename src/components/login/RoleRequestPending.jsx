import React from 'react';
import { Clock, UserCheck, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

export default function RoleRequestPending({
  pendingRequest,
  facilities,
  handleLogoutRequestScreen,
  loading,
  onRefresh,
  refreshLoading = false,
  error
}) {
  return (
    <div className="min-h-screen bg-slate-955 flex flex-col justify-center items-center p-4 font-sans">
      <div className="flex flex-col items-center mb-6">
        <img src="/logo.png" alt="Eagle Tech Logo" className="h-28 object-contain" />
        <span className="text-2xs text-teal-400 font-bold tracking-widest uppercase mt-2">HMIS SECURITY LAYER</span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-xs flex gap-2 animate-pulse mb-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center text-center my-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-full mb-4">
            <Clock size={36} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">Access Authorization Pending</h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Your request to join this hospital workspace has been successfully submitted and is awaiting administrator approval.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5 text-xs text-slate-300 my-4 font-sans">
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-500 font-medium">Full Name:</span>
            <span className="font-semibold text-slate-200">{pendingRequest.full_name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-500 font-medium">Email Address:</span>
            <span className="font-semibold text-slate-200 font-mono text-[11px]">{pendingRequest.email}</span>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-500 font-medium">Hospital/Tenant:</span>
            <span className="font-semibold text-slate-200">
              {facilities.find(f => f.id === pendingRequest.facility_id)?.name || 'Default Facility'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-500 font-medium">Request Category:</span>
            <span className="font-semibold text-slate-350">{pendingRequest.request_category || 'Clinical & Operational Workflows'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-500 font-medium">Requested Role:</span>
            <span className="font-semibold text-teal-400 uppercase font-mono">{pendingRequest.requested_role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Submitted At:</span>
            <span className="font-semibold text-slate-400">
              {new Date(pendingRequest.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 rounded-lg p-3 text-[11px] leading-relaxed my-4 flex gap-2">
          <UserCheck size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Action Needed:</strong> Once the facility admin approves your pending request, simply log in again to access the clinical desks.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading || refreshLoading}
            className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw size={14} className={refreshLoading ? "animate-spin" : ""} />
            {refreshLoading ? "Checking Status..." : "Refresh Approval Status"}
          </button>

          <button
            onClick={handleLogoutRequestScreen}
            disabled={loading || refreshLoading}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 font-bold text-xs py-2.5 rounded-lg transition active:scale-[0.98] cursor-pointer"
          >
            <LogOut size={14} /> Log Out / Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
