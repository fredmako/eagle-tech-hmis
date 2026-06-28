import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function AuditTrail({
  fetchAdminData,
  auditLogs,
  usersList
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Activity Logs</h4>
        <button
          onClick={fetchAdminData}
          className="text-2xs text-teal-455 hover:text-teal-400 font-semibold flex items-center gap-1"
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

              <div className="text-2xs text-slate-500">
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
  );
}
