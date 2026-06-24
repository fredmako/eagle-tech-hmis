import React from 'react';
import { UserPlus, ShieldAlert, CheckCircle, LogOut } from 'lucide-react';

export default function RoleRequestForm({
  facilities,
  facilitySearchQuery,
  setFacilitySearchQuery,
  isSearchDropdownOpen,
  setIsSearchDropdownOpen,
  filteredFacilities,
  requestRole,
  setRequestRole,
  requestCategory,
  setRequestCategory,
  requestName,
  setRequestName,
  error,
  requestSuccess,
  handleRoleRequestSubmit,
  handleLogoutRequestScreen,
  loading,
  setRequestFacility
}) {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#060b14] via-[#091526] to-[#040910] flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
      
      {/* Radial Ambient Glow Backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-20%] w-[65%] h-[65%] rounded-full bg-blue-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '12s' }} />
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(45,212,191,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.08) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Side: Feasible Branding Panel */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 shrink-0">
          <div className="relative p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col items-center justify-center max-w-[280px] mx-auto lg:mx-0 overflow-hidden hover:border-teal-500/30 transition-all duration-medium group">
            {/* Glow sweep behind logo */}
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,var(--primary) 12%,transparent 70%) opacity-30 pointer-events-none group-hover:scale-110 transition-transform duration-slow" />
            <img src="/logo.png" alt="Eagle Tech Logo" className="h-40 object-contain relative z-10" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-teal-450 font-black tracking-widest uppercase block">HMIS Security Layer</span>
            <h1 className="font-serif text-3xl md:text-4xl text-fg-strong leading-tight font-normal">
              Eagle Tech <br/><span className="text-primary font-serif">Workspace Access</span>
            </h1>
            <p className="text-xs leading-relaxed text-fg-muted font-sans max-w-xs mx-auto lg:mx-0">
              Your account authentication is complete. Specify your operational credentials and target medical facility to establish role configurations.
            </p>
          </div>
        </div>

        {/* Right Side: The Form Card */}
        <div className="lg:col-span-7 w-full max-w-xl mx-auto bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center lg:text-left pb-3 border-b border-slate-800/60 mb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center justify-center lg:justify-start gap-2">
              <UserPlus size={18} className="text-teal-400" /> Request Operational Role
            </h2>
            <p className="text-xs text-slate-400 mt-1">Specify your clinical role and hospital to request access.</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 text-xs leading-relaxed mb-4 flex gap-2 font-sans">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Workspace Not Configured:</strong> We verified your Google account, but it does not belong to any active facility. Search for your hospital below to request access.
            </span>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {requestSuccess && (
            <div className="mb-4 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg p-3 text-xs flex items-start gap-2 font-medium">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>{requestSuccess}</span>
            </div>
          )}

          <form onSubmit={handleRoleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="e.g. Dr. Steve Rogers"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Search & Select Target Facility
              </label>
              <input
                type="text"
                value={facilitySearchQuery}
                onChange={(e) => {
                  setFacilitySearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Type to search facility..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                required
              />
              {isSearchDropdownOpen && (
                <div 
                  onMouseLeave={() => setIsSearchDropdownOpen(false)}
                  className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-xl divide-y divide-slate-950"
                >
                  {filteredFacilities.length > 0 ? (
                    filteredFacilities.map((fac) => (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => {
                          setRequestFacility(fac.id);
                          setFacilitySearchQuery(`${fac.name} (${fac.code})`);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition text-slate-300 hover:text-white cursor-pointer"
                      >
                        <span className="font-bold">{fac.name}</span> <span className="text-[10px] text-slate-505">({fac.code})</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2.5 text-xs text-slate-500 italic text-center">
                      No facilities match your search
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select Access Category
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { id: 'Clinical & Operational Workflows', label: 'Workflow Roles', desc: 'Doctors, nurses, lab techs, cashiers...' },
                  { id: 'Administrative & Management Settings', label: 'Admin Settings', desc: 'Facility admin, HR, IT, marketing...' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setRequestCategory(cat.id);
                      // Reset role selections when changing category to avoid mixed selections
                      if (cat.id === 'Administrative & Management Settings') {
                        setRequestRole(['facility_admin']);
                      } else {
                        setRequestRole(['receptionist']);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition select-none cursor-pointer flex flex-col justify-between h-full ${
                      requestCategory === cat.id
                        ? 'bg-teal-950/20 border-teal-500 text-teal-400 shadow-md shadow-teal-500/5'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900/50 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold">{cat.label}</span>
                    <span className="text-[8px] opacity-75 mt-1 leading-tight">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Requested Roles (Select one or more)
              </label>
              
              <div className="space-y-3.5">
                {requestCategory === 'Administrative & Management Settings' ? (
                  /* Category 1: Admin & Management */
                  <div className="bg-slate-955/20 border border-slate-800/80 p-3 rounded-lg space-y-2 animate-fadeIn">
                    <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider block border-b border-slate-950 pb-1 font-mono">
                      Administrative & Management Settings
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {[
                        { id: 'facility_admin', label: 'Facility Admin', desc: 'General administrative oversight' },
                        { id: 'marketing_admin', label: 'Marketing Admin', desc: 'Facility configurations & branding' },
                        { id: 'hr_manager', label: 'HR Manager', desc: 'Staff onboarding, roles, roster & HR' },
                        { id: 'operations_manager', label: 'Operations Manager', desc: 'Procurement desk & help desk support' },
                        { id: 'it_support', label: 'IT Support', desc: 'SMTP, audit logs, licensing & email logs' }
                      ].map(role => {
                        const isChecked = Array.isArray(requestRole) ? requestRole.includes(role.id) : requestRole === role.id;
                        return (
                          <label key={role.id} className="flex items-start gap-2 p-1.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-900 rounded-md cursor-pointer select-none transition">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                let newRoles = Array.isArray(requestRole) ? [...requestRole] : [requestRole];
                                if (checked) {
                                  if (!newRoles.includes(role.id)) newRoles.push(role.id);
                                } else {
                                  newRoles = newRoles.filter(r => r !== role.id);
                                }
                                setRequestRole(newRoles);
                              }}
                              className="rounded border-slate-800 bg-slate-955 text-teal-505 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer mt-0.5"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-slate-300">{role.label}</span>
                              <span className="text-[8px] text-slate-500 leading-tight">{role.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Category 2: Clinical & Operational Workflows */
                  <div className="bg-slate-955/20 border border-slate-800/80 p-3 rounded-lg space-y-2 animate-fadeIn">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block border-b border-slate-955 pb-1 font-mono">
                      Clinical & Operational Workflows
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'receptionist', label: 'Receptionist', desc: 'Patient Registration & Vitals' },
                        { id: 'nurse', label: 'Triage Nurse', desc: 'Vitals & Queue priority' },
                        { id: 'clinician', label: 'Clinician (Doctor)', desc: 'SOAP Consultations & Labs' },
                        { id: 'lab_tech', label: 'Lab Technician', desc: 'Investigations & Releases' },
                        { id: 'pharmacist', label: 'Pharmacist', desc: 'Prescription Dispensary' },
                        { id: 'cashier', label: 'Billing Cashier', desc: 'Invoices & cash collections' },
                        { id: 'reporting_officer', label: 'Reporting Officer', desc: 'MOH & Health Reports' }
                      ].map(role => {
                        const isChecked = Array.isArray(requestRole) ? requestRole.includes(role.id) : requestRole === role.id;
                        return (
                          <label key={role.id} className="flex items-start gap-2 p-1.5 bg-slate-955/40 hover:bg-slate-955/80 border border-slate-900 rounded-md cursor-pointer select-none transition">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                let newRoles = Array.isArray(requestRole) ? [...requestRole] : [requestRole];
                                if (checked) {
                                  if (!newRoles.includes(role.id)) newRoles.push(role.id);
                                } else {
                                  newRoles = newRoles.filter(r => r !== role.id);
                                }
                                setRequestRole(newRoles);
                              }}
                              className="rounded border-slate-800 bg-slate-955 text-teal-505 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer mt-0.5"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-slate-300">{role.label}</span>
                              <span className="text-[8px] text-slate-500 leading-tight">{role.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-850 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition active:scale-[0.98] mt-2 shadow-lg shadow-teal-500/10 cursor-pointer"
            >
              {loading ? 'Submitting Request...' : 'Submit Role Request'}
            </button>
          </form>

          <button
            onClick={handleLogoutRequestScreen}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 font-semibold text-xs py-2.5 rounded-lg transition active:scale-[0.98] mt-3 cursor-pointer"
          >
            <LogOut size={14} /> Cancel & Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
