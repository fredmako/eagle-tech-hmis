import React from 'react';
import { 
  CheckCircle, RefreshCw, Printer, BarChart2, ShieldAlert, AlertTriangle 
} from 'lucide-react';

export default function OperationalDashboard({
  syncStatus,
  syncLoading,
  forceSync,
  handlePrintDashboard,
  visits,
  orders,
  invoices,
  malariaCount,
  respiratoryCount,
  gastroCount,
  hyperCount,
  utiCount,
  batches,
  dataErrors
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Management & Supervisor Intelligence</h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time status summaries tracking outpatient volumes, laboratory load, and cash flow.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {syncStatus === 'fully_synced' ? (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold">
              <CheckCircle size={14} /> DHIS2 Synced
            </div>
          ) : (
            <button
              onClick={forceSync}
              disabled={syncLoading}
              className="bg-yellow-500/10 border border-yellow-500/25 hover:bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition cursor-pointer"
            >
              <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? 'Uploading...' : 'MOH Warn: Force DHIS2 Sync'}
            </button>
          )}

          <button
            onClick={handlePrintDashboard}
            className="bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition font-bold cursor-pointer"
          >
            <Printer size={13} /> Print Dashboard
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Patient Volume', val: visits.length, desc: 'Total visits in log' },
          { label: 'Triage Queue', val: visits.filter(v => v.department === 'triage' && v.status !== 'completed').length, desc: 'Pending vitals desk' },
          { label: 'Clinician Consults', val: visits.filter(v => v.department === 'consultation' && v.status !== 'completed').length, desc: 'Pending clinical SOAP' },
          { label: 'Lab Tests Pending', val: orders.filter(o => o.type === 'lab' && o.status !== 'completed').length, desc: 'Awaiting lab releases' },
          { label: 'Pharmacy Pending', val: orders.filter(o => o.type === 'prescription' && o.status === 'prescribed').length, desc: 'Awaiting drug dispense' },
          { label: 'Billed Revenue', val: `KES ${invoices.reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0).toFixed(0)}`, desc: 'Billed invoices sum' }
        ].map((card, i) => (
          <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.label}</span>
              <span className="text-2xl font-black text-white block mt-2">{card.val}</span>
            </div>
            <span className="text-[9px] text-slate-500 mt-2 block font-medium">{card.desc}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 size={14} className="text-teal-400" /> Disease Surveillance Summary
          </h3>
          <div className="space-y-4 pt-1">
            {[
              { label: 'Malaria Infections (B54)', count: malariaCount, percentage: visits.length > 0 ? (malariaCount / visits.length) * 100 : 0, color: 'bg-teal-500' },
              { label: 'Respiratory Diseases (J06.9)', count: respiratoryCount, percentage: visits.length > 0 ? (respiratoryCount / visits.length) * 100 : 0, color: 'bg-blue-500' },
              { label: 'Gastroenteritis (A09)', count: gastroCount, percentage: visits.length > 0 ? (gastroCount / visits.length) * 100 : 0, color: 'bg-orange-500' },
              { label: 'Hypertension (I10)', count: hyperCount, percentage: visits.length > 0 ? (hyperCount / visits.length) * 100 : 0, color: 'bg-rose-500' },
              { label: 'UTI (N39.0)', count: utiCount, percentage: visits.length > 0 ? (utiCount / visits.length) * 100 : 0, color: 'bg-purple-500' }
            ].map((dis, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-350">
                  <span className="truncate max-w-[80%]">{dis.label}</span>
                  <span className="font-mono text-slate-400">{dis.count} cases ({dis.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-855">
                  <div className={`${dis.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${dis.percentage || 2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Health Warnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-teal-400" /> Operational Warnings
          </h4>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {batches.some(b => new Date(b.expiry) < new Date()) && (
              <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/15 text-red-400 text-xs flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wide text-[9px] mb-0.5">EXPIRED STOCK ALERT</span>
                  <span>Certain medication batches have expired! Review pharmacy stock reports.</span>
                </div>
              </div>
            )}
            {dataErrors.length > 0 && (
              <div className="p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/15 text-yellow-450 text-xs flex gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wide text-[9px] mb-0.5">DATA QUALITY WARNING</span>
                  <span>{dataErrors.length} clinical record deficits identified. Resolve missing values prior to final DHIS2 upload.</span>
                </div>
              </div>
            )}
            {dataErrors.length === 0 && !batches.some(b => new Date(b.expiry) < new Date()) && (
              <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-4 rounded-lg text-center text-xs flex flex-col items-center justify-center gap-1">
                <CheckCircle size={18} />
                <span>All systems fully operational. No outstanding critical alerts.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
