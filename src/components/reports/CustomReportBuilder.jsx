import React from 'react';
import { 
  Settings, Building, Calendar, CheckSquare, Square, Download, 
  RefreshCw, CheckCircle, Info, Eye, Activity, FileText, Layers 
} from 'lucide-react';

export default function CustomReportBuilder({
  reportCategory,
  setReportCategory,
  brandingMode,
  setBrandingMode,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedFields,
  toggleField,
  reportFormat,
  setReportFormat,
  handleGenerateReport,
  genLoading,
  genSuccess,
  customFilteredData,
  previewTheme,
  setPreviewTheme,
  facilityInfo,
  renderFacilityLogo,
  user,
  customActiveColumns
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Controls Sidebar (Left 5/12 width) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Settings size={14} className="text-teal-400" /> Report Configuration Details
          </h3>

          {/* Form Controls */}
          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Select Report Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'outpatient', label: 'Outpatient', icon: Activity },
                  { id: 'billing', label: 'Billing Invoices', icon: FileText },
                  { id: 'inpatient', label: 'Inpatient Admissions', icon: Layers }
                ].map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setReportCategory(cat.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        reportCategory === cat.id
                          ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <Icon size={18} className="mb-1.5" />
                      <span className="text-2xs font-bold leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branding Scope Selection */}
            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Branding & Logo Identity</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBrandingMode('platform')}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition text-xs font-bold ${
                    brandingMode === 'platform'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                      : 'bg-slate-955 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building size={14} />
                  <div>
                    <span className="block">Eagle Tech Platform</span>
                    <span className="text-[9px] font-semibold text-slate-500 block">Default corporate details</span>
                  </div>
                </button>
                <button
                  onClick={() => setBrandingMode('hospital')}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition text-xs font-bold ${
                    brandingMode === 'hospital'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                      : 'bg-slate-955 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building size={14} />
                  <div>
                    <span className="block">Hospital / Facility Specific</span>
                    <span className="text-[9px] font-semibold text-slate-500 block">{facilityInfo.name}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Date Ranges */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">3. Start Date</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-3 top-2.5 text-slate-550" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">4. End Date</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-3 top-2.5 text-slate-555" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Columns Checklist */}
            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">5. Selected Report Fields (Preview Grid Columns)</label>
              <div className="bg-slate-955 border border-slate-855 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs font-bold">
                {Object.keys(selectedFields[reportCategory]).map(field => {
                  const isChecked = selectedFields[reportCategory][field];
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(reportCategory, field)}
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition select-none text-left py-1"
                    >
                      {isChecked ? (
                        <CheckSquare size={14} className="text-teal-400 shrink-0" />
                      ) : (
                        <Square size={14} className="text-slate-700 shrink-0" />
                      )}
                      <span className="truncate capitalize">{field.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Format Selection */}
            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">6. Download Extension</label>
              <div className="flex gap-4 text-xs font-bold">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={reportFormat === 'csv'}
                    onChange={() => setReportFormat('csv')}
                    className="accent-teal-500 h-4 w-4 bg-slate-955 border-slate-800 rounded text-teal-500"
                  />
                  Standard Excel (CSV)
                </label>
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={reportFormat === 'json'}
                    onChange={() => setReportFormat('json')}
                    className="accent-teal-500 h-4 w-4 bg-slate-955 border-slate-800 rounded text-teal-500"
                  />
                  Data Interchange (JSON)
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-slate-850 flex gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={genLoading || customFilteredData.length === 0}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/10 active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {genLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Executing Supabase Edge Function...
                  </>
                ) : genSuccess ? (
                  <>
                    <CheckCircle size={14} />
                    Report Dispatched!
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Generate & Download Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-2.5 items-start">
          <Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
          <p className="text-2xs text-slate-450 leading-relaxed font-medium">
            Clicking "Generate & Download" sends the parameters to a Supabase Edge Function, which runs server-side compilation, writes an outbox email compliance notice using your Titan SMTP credentials, and records the event in the system audit database.
          </p>
        </div>
      </div>

      {/* Formatted Preview Frame (Right 7/12 width) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye size={14} className="text-teal-400" /> Interactive Report Preview Canvas
          </span>
          
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-2xs">
            <button
              onClick={() => setPreviewTheme('light')}
              className={`px-3 py-1 font-bold rounded transition ${previewTheme === 'light' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
              Light Mode
            </button>
            <button
              onClick={() => setPreviewTheme('dark')}
              className={`px-3 py-1 font-bold rounded transition ${previewTheme === 'dark' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
              Dark Mode
            </button>
          </div>
        </div>

        {/* Print Sheet Card */}
        <div className={`border rounded-2xl p-8 shadow-lg transition-all min-h-[580px] flex flex-col justify-between ${
          previewTheme === 'light' 
            ? 'bg-white border-slate-250 text-slate-800' 
            : 'bg-slate-950 border-slate-855 text-slate-300'
        }`}>
          
          {/* Header: Branded Logo, Title & Metas */}
          <div>
            <div className="flex justify-between items-start border-b pb-5 border-dashed border-slate-300/60">
              <div className="flex gap-3 items-center">
                {brandingMode === 'platform' ? (
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M8 11h8" />
                      <path d="M12 7v8" />
                    </svg>
                  </div>
                ) : (
                  renderFacilityLogo(facilityInfo.logo_url, "h-10 w-10", "text-sm")
                )}
                
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight leading-tight uppercase">
                    {brandingMode === 'platform' ? 'Eagle Tech Solutions Ltd' : facilityInfo.name}
                  </h4>
                  <p className="text-2xs font-semibold text-slate-500 mt-0.5">
                    {brandingMode === 'platform' 
                      ? 'HQ: 12th Floor, Eagle Tech Tower, Avenue Rd, Nairobi' 
                      : `Address: ${facilityInfo.address || 'N/A'} | Code: ${facilityInfo.code}`}
                  </p>
                  <p className="text-2xs font-semibold text-slate-400">
                    Email: {brandingMode === 'platform' ? 'info@eagletechsolutions.tech' : `info@${facilityInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xs uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">
                  Draft Preview
                </span>
                <h3 className="font-black text-sm uppercase tracking-wide mt-2">
                  {reportCategory === 'outpatient' ? 'Outpatient Register' : reportCategory === 'billing' ? 'Revenue Register' : 'Inpatient Admissions'}
                </h3>
              </div>
            </div>

            {/* Sub-Header Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-2xs border-b border-dashed border-slate-300/40">
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

            {/* Preview Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-2xs">
                <thead>
                  <tr className="border-b border-slate-300/60 uppercase font-black text-slate-500 tracking-wider">
                    {customActiveColumns.map(col => (
                      <th key={col} className="py-2">{col.replace('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customFilteredData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-550/20">
                      {customActiveColumns.map(col => (
                        <td key={col} className="py-2.5 pr-2 font-mono">
                          {col === 'total_amount' || col === 'amount_paid' ? (
                            `KES ${row[col]}/-`
                          ) : col === 'status' ? (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              row[col] === 'paid' || row[col] === 'Discharged'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-250'
                            }`}>
                              {row[col]}
                            </span>
                          ) : (
                            row[col]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {customFilteredData.length === 0 && (
                    <tr>
                      <td colSpan={customActiveColumns.length || 1} className="text-center py-10 text-slate-405 italic font-normal">
                        No records found matching date filter selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {customFilteredData.length > 5 && (
              <p className="text-[9px] text-slate-450 italic mt-3 text-center border-t pt-2 border-dashed border-slate-300/20">
                ... Showing 5 of {customFilteredData.length} records. Generate report to extract complete spreadsheet data.
              </p>
            )}
          </div>

          {/* Bottom Totals Summary */}
          <div className="border-t pt-4 border-slate-300/60 flex flex-col md:flex-row justify-between gap-4 text-2xs font-extrabold uppercase mt-6">
            <div className="flex gap-4">
              <span>Total Records: <span className="text-teal-600">{customFilteredData.length}</span></span>
              
              {reportCategory === 'billing' && (
                <>
                  <span>Total Revenue: <span className="text-teal-600">KES {
                    customFilteredData.reduce((acc, row) => acc + parseFloat(row.total_amount || 0), 0).toFixed(2)
                  }/-</span></span>
                  <span>Total Paid: <span className="text-teal-600">KES {
                    customFilteredData.reduce((acc, row) => acc + parseFloat(row.amount_paid || 0), 0).toFixed(2)
                  }/-</span></span>
                </>
              )}
            </div>

            <div className="text-right text-[8px] font-normal text-slate-400 italic">
              <span>Eagle Tech Outsource Compliance Intelligence Unit. Confidential.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
