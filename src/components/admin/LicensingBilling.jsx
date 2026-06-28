import React from 'react';
import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LicensingBilling({
  license,
  licenseMessage,
  handleSimulateLicense
}) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4">
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
            <span className="text-2xs text-slate-500 block uppercase font-bold">Licensing Tier</span>
            <span className="text-sm font-black text-slate-100 uppercase tracking-wide">{license.tier}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg space-y-1">
            <span className="text-2xs text-slate-500 block uppercase font-bold">Status Badge</span>
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
            <span className="text-2xs text-slate-500 block uppercase font-bold">Trial / Term Expiry</span>
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
      <div className="bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-yellow-500" /> Entitlement Gate & Compliance Simulator
        </h4>
        <p className="text-2xs text-slate-500">Toggle simulation states below to immediately modify active license status and trigger subscription warning notifications.</p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSimulateLicense('active')}
            className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98] cursor-pointer"
          >
            Simulate Active License
          </button>
          <button
            onClick={() => handleSimulateLicense('warning')}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98] cursor-pointer"
          >
            Simulate Expiry Warning (3 Days Expiry)
          </button>
          <button
            onClick={() => handleSimulateLicense('expired')}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2 px-4 rounded-lg shadow transition active:scale-[0.98] cursor-pointer"
          >
            Simulate Expired Block (1 Day Expired)
          </button>
        </div>
      </div>
    </div>
  );
}
