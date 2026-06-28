import React from 'react';
import { Trash2, RefreshCw, Eye } from 'lucide-react';

export default function EmailLogs({
  smtp,
  handlePruneLogs,
  fetchAdminData,
  emailLogs,
  setSelectedLogBody
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-1">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound SMTP Communications</h4>
          <p className="text-2xs text-slate-500 mt-0.5">Logs pruned automatically based on your retention configuration ({smtp.log_retention || 30} days).</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePruneLogs}
            className="text-2xs bg-red-950/40 hover:bg-red-900/10 border border-red-500/20 text-red-400 px-2 py-1 rounded font-semibold flex items-center gap-1.5"
          >
            <Trash2 size={10} /> Prune Now
          </button>
          <button
            onClick={fetchAdminData}
            className="text-2xs text-teal-455 hover:text-teal-400 font-semibold flex items-center gap-1"
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
                <td className="py-2 px-3 text-2xs text-slate-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="py-2 px-3">
                  <span className="text-2xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                    {log.event}
                  </span>
                </td>
                <td className="py-2 px-3 text-2xs text-slate-400 font-mono max-w-32.5 truncate" title={log.sender}>
                  {log.sender}
                </td>
                <td className="py-2 px-3 text-2xs text-slate-400 font-mono truncate" title={log.recipient}>
                  {log.recipient}
                </td>
                <td className="py-2 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-2xs font-bold uppercase ${
                    log.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    log.status === 'queued' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    log.status === 'bounced' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-2xs text-slate-450 font-mono text-center">
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
  );
}
