import React from 'react';
import { 
  Lock, Settings, Calendar, Download, Printer, Clock, RefreshCw, Eye 
} from 'lucide-react';

export default function DepartmentReports({
  selectedDeptReport,
  setSelectedDeptReport,
  checkReportAccess,
  user,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  brandingMode,
  setBrandingMode,
  handleExportReport,
  handlePrint,
  handleScheduleReport,
  previewTheme,
  setPreviewTheme,
  activeReport,
  genLoading,
  scheduleLoading,
  facilityInfo,
  renderFacilityLogo
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Navigation Sidebar (3/12 width) */}
      <div className="lg:col-span-3 space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl self-start">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Clinic Departments</span>
        {[
          { id: 'reg_daily', label: 'Patient Register', desk: 'Front Office' },
          { id: 'clinical_encounter', label: 'Encounter Log', desk: 'Consultation' },
          { id: 'lab_order', label: 'Lab Orders Worklist', desk: 'Laboratory' },
          { id: 'lab_results', label: 'Lab Results Released', desk: 'Laboratory' },
          { id: 'pharm_prescription', label: 'Prescription Log', desk: 'Pharmacy' },
          { id: 'pharm_dispense', label: 'Drug Dispense Log', desk: 'Pharmacy' },
          { id: 'pharm_revenue', label: 'Pharmacy Revenue', desk: 'Pharmacy' },
          { id: 'pharm_stock', label: 'Stock-on-Hand & Expiry', desk: 'Pharmacy' },
          { id: 'billing_receipts', label: 'Receipts & Payments', desk: 'Billing Cashier' },
          { id: 'ward_admissions', label: 'Admission & Bed Use', desk: 'Inpatient Ward' }
        ].map(rep => {
          const active = selectedDeptReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setSelectedDeptReport(rep.id)}
              className={`w-full text-left p-2.5 rounded-lg border text-xs font-bold transition flex flex-col justify-center cursor-pointer ${
                active
                  ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                  : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[9px] font-extrabold uppercase text-slate-500 leading-none">{rep.desk}</span>
              <span className="block mt-1 leading-snug">{rep.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preview & Controls Frame (9/12 width) */}
      <div className="lg:col-span-9 space-y-6">
        {!checkReportAccess(selectedDeptReport) ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <Lock size={40} className="text-red-400 animate-bounce" />
            <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">Access Restriction Gate</h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Your current credentials (role: <strong className="text-teal-400 uppercase">{user.role}</strong>) do not possess the necessary clearance level to view or download this report. Please contact the Facility Administrator for system permission elevation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4 space-y-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl self-start">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Settings size={14} className="text-teal-400" /> Export Controls
              </h4>

              {/* Date selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                  <div className="relative">
                    <Calendar size={12} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                  <div className="relative">
                    <Calendar size={12} className="absolute left-3 top-2.5 text-slate-550" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Identity branding selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Branding Scope</label>
                <select
                  value={brandingMode}
                  onChange={(e) => setBrandingMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-xs text-slate-355 focus:outline-none focus:border-teal-500 transition font-bold"
                >
                  <option value="platform">Eagle Tech Platform Branding</option>
                  <option value="hospital">Hospital Specific Branding</option>
                </select>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleExportReport(selectedDeptReport, 'csv', 'dept')}
                  disabled={genLoading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
                >
                  <Download size={13} />
                  Export to Excel (CSV)
                </button>
                <button
                  onClick={() => handleExportReport(selectedDeptReport, 'json', 'dept')}
                  disabled={genLoading}
                  className="w-full bg-slate-955 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={13} />
                  Export Data (JSON)
                </button>
                <button
                  onClick={() => handlePrint(activeReport.name, activeReport.headers, activeReport.rows, activeReport.totals)}
                  className="w-full bg-slate-955 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer size={13} />
                  Print Layout
                </button>
                <button
                  onClick={() => handleScheduleReport(activeReport.name)}
                  disabled={scheduleLoading}
                  className="w-full border border-teal-500/20 hover:border-teal-500/30 text-teal-400 bg-teal-500/5 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {scheduleLoading ? <RefreshCw size={13} className="animate-spin" /> : <Clock size={13} />}
                  Schedule Auto-Email
                </button>
              </div>
            </div>

            <div className="xl:col-span-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-teal-400" /> Print Sheet Preview Canvas
                </span>
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9px] font-bold">
                  <button
                    onClick={() => setPreviewTheme('light')}
                    className={`px-3 py-1 rounded transition ${previewTheme === 'light' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                  >
                    Light Mode
                  </button>
                  <button
                    onClick={() => setPreviewTheme('dark')}
                    className={`px-3 py-1 rounded transition ${previewTheme === 'dark' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                  >
                    Dark Mode
                  </button>
                </div>
              </div>

              {/* Dynamic Print Card Frame */}
              <div className={`border rounded-2xl p-6 shadow-lg transition-all min-h-[500px] flex flex-col justify-between ${
                previewTheme === 'light' 
                  ? 'bg-white border-slate-200 text-slate-800' 
                  : 'bg-slate-950 border-slate-855 text-slate-300'
              }`}>
                <div>
                  {/* Brand Header */}
                  <div className="flex justify-between items-start border-b pb-4 border-dashed border-slate-300/60">
                    <div className="flex gap-2.5 items-center">
                      {brandingMode === 'platform' ? (
                        <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs">
                          ET
                        </div>
                      ) : (
                        renderFacilityLogo(facilityInfo.logo_url, "h-8 w-8", "text-xs")
                      )}
                      <div>
                        <h4 className="font-extrabold text-xs tracking-tight uppercase leading-none">
                          {brandingMode === 'platform' ? 'Eagle Tech Solutions Ltd' : facilityInfo.name}
                        </h4>
                        <span className="text-[9px] text-slate-500 block mt-1 font-semibold leading-none">
                          {brandingMode === 'platform' ? 'HQ: Avenue Rd, Nairobi' : `Address: ${facilityInfo.address || 'N/A'} | Code: ${facilityInfo.code}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">Draft Layout</span>
                      <h3 className="font-black text-xs uppercase tracking-wide mt-1.5">{activeReport.name}</h3>
                    </div>
                  </div>

                  {/* Meta Columns */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-3.5 text-[9px] border-b border-dashed border-slate-300/40">
                    <div>
                      <span className="text-slate-400 block font-semibold">Report Period</span>
                      <span className="font-bold">{startDate} to {endDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Generated By</span>
                      <span className="font-bold">{user.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Compile System</span>
                      <span className="font-bold">Supabase serverless</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Printed Date</span>
                      <span className="font-bold font-mono">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="border-b border-slate-300/60 uppercase font-black text-slate-500 tracking-wider">
                          {activeReport.headers.map(col => (
                            <th key={col} className="py-1.5">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {activeReport.rows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            {row.map((cell, cidx) => (
                              <td key={cidx} className="py-2 pr-2 font-mono">{cell}</td>
                            ))}
                          </tr>
                        ))}
                        {activeReport.rows.length === 0 && (
                          <tr>
                            <td colSpan={activeReport.headers.length || 1} className="text-center py-10 text-slate-400 italic">
                              No records found matching date filter selection.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {activeReport.rows.length > 5 && (
                    <p className="text-[8px] text-slate-400 italic mt-2 text-center border-t pt-1.5 border-dashed border-slate-200/50">
                      ... Showing 5 of {activeReport.rows.length} records. Export standard CSV to download the complete spreadsheet.
                    </p>
                  )}
                </div>

                {/* Footer Totals */}
                <div className="border-t pt-3.5 border-slate-300/60 flex justify-between gap-4 text-[9px] font-extrabold uppercase mt-4">
                  <div>{activeReport.totals?.left}</div>
                  <div>{activeReport.totals?.right}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
