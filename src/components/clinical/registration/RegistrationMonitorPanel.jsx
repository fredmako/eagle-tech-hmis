import { Activity } from "lucide-react";

export default function RegistrationMonitorPanel({
  admissions,
  loadingAdmissions,
  fetchAdmissions,
  handleTabChange,
  selectedReceptionPatientId,
  setSelectedReceptionPatientId,
  loadPatientTimeline,
  loadingTimeline,
  timelineData,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 2xl:p-6 shadow-sm space-y-6 min-w-0">
      <div>
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Activity size={16} className="text-teal-400" /> Reception Monitor
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Admissions, recent activity and quick actions
        </p>
      </div>

      <div>
        <h4 className="text-2xs uppercase text-slate-500 font-bold tracking-wider mb-2">
          Current Admissions
        </h4>
        {loadingAdmissions ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            Loading admissions...
          </div>
        ) : admissions.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-lg p-4 text-center text-slate-500 text-xs">
            No current admissions
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {admissions.map((adm) => (
              <div
                key={adm.id}
                onClick={() => {
                  const pid = adm.patient?.id;
                  if (pid) {
                    setSelectedReceptionPatientId(pid);
                    loadPatientTimeline(pid);
                  }
                }}
                className={`bg-slate-950 border rounded-xl p-3 flex items-center justify-between cursor-pointer transition ${
                  selectedReceptionPatientId === adm.patient?.id
                    ? "border-teal-400/60 ring-1 ring-teal-400/10"
                    : "border-slate-800"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 text-sm truncate">
                    {adm.patient?.name || "Unknown"}
                  </div>
                  <div className="text-2xs text-slate-400">
                    {adm.ward_name} • {adm.bed_number}
                  </div>
                </div>
                <div className="text-2xs text-slate-400 font-mono">
                  {new Date(adm.admission_datetime).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-2xs uppercase text-slate-500 font-bold tracking-wider mb-2">
          Quick Actions
        </h4>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => fetchAdmissions()}
            className="text-sm text-teal-400 bg-slate-950/30 border border-slate-800 px-3 py-2 rounded-lg text-left"
          >
            Refresh Admissions
          </button>
          <button
            onClick={() => handleTabChange("search")}
            className="text-sm text-slate-100 bg-teal-500 hover:bg-teal-600 px-3 py-2 rounded-lg"
          >
            Go to Search
          </button>
          <button
            onClick={() => handleTabChange("wards")}
            className="text-sm text-slate-100 bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-lg"
          >
            View Wards
          </button>
        </div>
      </div>

      {selectedReceptionPatientId && (
        <div>
          <h4 className="text-2xs uppercase text-slate-500 font-bold tracking-wider mb-2">
            Selected Patient Timeline
          </h4>
          {loadingTimeline ? (
            <div className="py-3 text-center text-slate-500 text-xs">
              Loading timeline...
            </div>
          ) : timelineData.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-lg p-3 text-xs text-slate-500">
              No records for selected patient.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {timelineData.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2"
                >
                  <div className="text-2xs text-slate-400 font-mono">
                    {new Date(evt.date).toLocaleString()}
                  </div>
                  <div className="text-xs font-bold text-slate-200">{evt.title}</div>
                  <div className="text-2xs text-slate-400">{evt.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
