import { Search, Activity } from "lucide-react";
import { parsePatientContact } from "../../../notificationService";

export default function PatientSearchPanel({
  activeTab,
  handleTabChange,
  searchQuery,
  setSearchQuery,
  handleSearch,
  searchResults,
  searched,
  searching,
  onNavigateToQueue,
  expandedTimelinePtId,
  setExpandedTimelinePtId,
  loadPatientTimeline,
  loadingTimeline,
  performSearch,
  admissions,
  loadingAdmissions,
  handleDirectCheckin,
  setMessage,
  timelineData,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 2xl:p-6 shadow-sm space-y-6 h-fit min-w-0">
      <div className="flex border-b border-slate-800 pb-2 gap-4">
        <button
          type="button"
          onClick={() => handleTabChange("search")}
          className={`text-sm font-bold pb-2 transition border-b-2 ${
            activeTab === "search"
              ? "text-teal-400 border-teal-400"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          Search Patient
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("wards")}
          className={`text-sm font-bold pb-2 transition border-b-2 ${
            activeTab === "wards"
              ? "text-teal-400 border-teal-400"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          Patients In Wards
        </button>
      </div>

      {activeTab === "search" ? (
        <>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Search size={18} className="text-teal-400" /> Search Existing
              Patient
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Lookup patient records by Name, National ID, or Facility Patient
              Number.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. John Mwangi or National ID"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
              required
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition active:scale-[0.98] disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searched && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h3>

              {searchResults.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-lg p-6 text-center text-slate-500 text-sm">
                  No matching patients found in this facility.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {searchResults.map((pt) => (
                    <div
                      key={pt.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-teal-500/30 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div>
                          <span className="font-bold text-slate-200 block text-sm">
                            {pt.name}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold uppercase">
                            {pt.gender} | Age: {new Date().getFullYear() - new Date(pt.dob).getFullYear()} yrs
                          </span>
                          <div className="grid grid-cols-2 gap-x-4 mt-1 text-2xs text-slate-400">
                            <span>
                              Code: <span className="text-teal-400 font-semibold">{pt.facility_id_code}</span>
                            </span>
                            <span>
                              Phone: <span className="text-slate-300 font-semibold">{parsePatientContact(pt.phone).phone}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigateToQueue(pt)}
                          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-semibold text-xs py-1.5 px-3 rounded-lg border border-teal-500/20 transition self-end sm:self-center shrink-0"
                        >
                          Open Visit / Queue
                        </button>
                      </div>
                      <div className="border-t border-slate-900 pt-2 flex flex-wrap items-center justify-between gap-2.5 w-full">
                        <div className="flex items-center gap-1.5">
                          <select
                            id={`service-select-${pt.id}`}
                            defaultValue="OPD"
                            className="bg-slate-900 border border-slate-800 text-2xs text-white py-1 px-2 rounded focus:outline-none focus:border-teal-500"
                          >
                            <option value="OPD">General OPD (OPD)</option>
                            <option value="ANC">Antenatal Care (ANC)</option>
                            <option value="FP">Family Planning (FP)</option>
                            <option value="IMM">Immunization/Vaccine</option>
                            <option value="LAB">Laboratory-Only</option>
                            <option value="PHA">Pharmacy-Only</option>
                            <option value="IPD">Inpatient Admission</option>
                            <option value="EMR">Emergency/Triage</option>
                          </select>
                          <button
                            onClick={async () => {
                              const val = document.getElementById(`service-select-${pt.id}`).value;
                              await handleDirectCheckin(pt.id, val);
                            }}
                            className="bg-teal-500/15 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 font-bold text-[9px] py-1 px-2.5 rounded transition active:scale-[0.97]"
                          >
                            Direct Check-in
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (expandedTimelinePtId === pt.id) {
                              setExpandedTimelinePtId(null);
                            } else {
                              setExpandedTimelinePtId(pt.id);
                              loadPatientTimeline(pt.id);
                            }
                          }}
                          className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[9px] py-1 px-2.5 rounded transition active:scale-[0.97]"
                        >
                          {expandedTimelinePtId === pt.id ? "Hide Timeline" : "View Health Timeline"}
                        </button>
                      </div>

                      {pt.alerts && (
                        <div className="flex flex-wrap gap-1.5 mt-1 border-t border-slate-900 pt-2 w-full">
                          {pt.alerts.pendingLabsCount > 0 && (
                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              ⚠️ {pt.alerts.pendingLabsCount} Pending Lab
                            </span>
                          )}
                          {pt.alerts.pendingRadCount > 0 && (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              ⚡ {pt.alerts.pendingRadCount} Imaging Ordered
                            </span>
                          )}
                          {pt.alerts.unpaidBalance > 0 && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              💳 Bill Unpaid: {pt.alerts.unpaidBalance}/-
                            </span>
                          )}
                          {pt.alerts.scheduledFollowups.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
                            >
                              📅 Follow-up: {f.instructions}
                              <button
                                onClick={async () => {
                                  try {
                                    await handleDirectCheckin(pt.id, "OPD");
                                    setMessage({
                                      type: "success",
                                      text: `Patient successfully checked in for scheduled follow-up review!`,
                                    });
                                  } catch (err) {
                                    setMessage({
                                      type: "error",
                                      text: err.message,
                                    });
                                  }
                                }}
                                className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-1.5 py-0.2 rounded transition active:scale-[0.96]"
                                title="Check-in patient now"
                              >
                                Check-in
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {expandedTimelinePtId === pt.id && (
                        <div className="mt-3 border-t border-slate-900 pt-3 space-y-3">
                          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                            Chronological Clinical Health Timeline
                          </span>
                          {loadingTimeline ? (
                            <div className="py-4 text-center text-slate-500 text-2xs flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b border-teal-400" />
                              <span>Loading timeline...</span>
                            </div>
                          ) : timelineData.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-600">
                              No medical records found for this patient.
                            </div>
                          ) : (
                            <div className="relative pl-4 border-l border-slate-800 space-y-3.5 py-1">
                              {timelineData.map((evt) => (
                                <div key={evt.id} className="relative group">
                                  <div
                                    className={`absolute left-[-20.5px] top-1.5 h-2.5 w-2.5 rounded-full border border-slate-950 ${
                                      evt.type === "visit"
                                        ? "bg-teal-400"
                                        : evt.type === "triage"
                                          ? "bg-amber-400"
                                          : evt.type === "consultation"
                                            ? "bg-green-400"
                                            : "bg-purple-400"
                                    }`}
                                  />

                                  <div className="text-[9px] text-slate-500 font-semibold font-mono">
                                    {new Date(evt.date).toLocaleString()}
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-200 mt-0.5">
                                    {evt.title}
                                  </div>
                                  <div className="text-2xs text-slate-400 leading-normal mt-0.5">
                                    {evt.desc}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity size={18} className="text-teal-400 animate-pulse" /> Patients In Wards
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Currently admitted patients in the ward facility.
            </p>
          </div>

          {loadingAdmissions ? (
            <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400" />
              <span>Loading admissions...</span>
            </div>
          ) : admissions.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500 text-xs">
              No patients currently admitted in the wards.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-112.5 overflow-y-auto pr-1">
              {admissions.map((adm) => (
                <div
                  key={adm.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 hover:border-teal-500/20 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-200 block text-xs">
                        {adm.patient?.name || "Unknown Patient"}
                      </span>
                      <span className="text-2xs text-slate-400 font-semibold uppercase">
                        {adm.patient?.gender} | Age: {adm.patient?.dob ? new Date().getFullYear() - new Date(adm.patient.dob).getFullYear() : "N/A"} yrs
                      </span>
                    </div>
                    <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">
                      {adm.admission_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-2xs text-slate-400 border-t border-slate-900 pt-2 font-mono">
                    <div>
                      Ward: <span className="text-slate-300 font-bold">{adm.ward_name}</span>
                    </div>
                    <div>
                      Bed No: <span className="text-teal-400 font-bold">{adm.bed_number}</span>
                    </div>
                    <div className="col-span-2 text-[9px] text-slate-500">
                      Admitted: {new Date(adm.admission_datetime).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
