import { useState, useEffect } from "react";
import Registration from "./Registration";
import Triage from "./Triage";
import Queue from "./Queue";
import { Activity, Users } from "lucide-react";

export default function Reception({
  user,
  initialSubTab = "registration",
  handleNavigate,
  preselectedPatient,
  showNotification,
}) {
  const [subTab, setSubTab] = useState(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const goToQueue = (patient) => {
    if (handleNavigate) handleNavigate("queue");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
            <Activity size={18} className="text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Reception</h2>
            <p className="text-xs text-slate-400">Registration & Triage desk</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("registration")}
            className={`text-sm px-3 py-2 rounded-lg font-semibold ${
              subTab === "registration"
                ? "bg-teal-500 text-slate-950"
                : "bg-slate-850 text-slate-200"
            }`}
          >
            Registration
          </button>
          <button
            onClick={() => setSubTab("triage")}
            className={`text-sm px-3 py-2 rounded-lg font-semibold ${
              subTab === "triage"
                ? "bg-teal-500 text-slate-950"
                : "bg-slate-850 text-slate-200"
            }`}
          >
            Triage
          </button>
          <button
            onClick={() => goToQueue()}
            className="text-sm px-3 py-2 rounded-lg bg-slate-850 text-slate-200"
          >
            Open Queue
          </button>
        </div>
      </div>

      {subTab === "registration" && (
        <Registration
          user={user}
          onNavigateToQueue={(pt) => {
            if (handleNavigate) handleNavigate("queue");
          }}
          showNotification={showNotification}
        />
      )}

      {subTab === "triage" && (
        <Triage
          user={user}
          onComplete={() => {
            if (handleNavigate) handleNavigate("dashboard");
          }}
          showNotification={showNotification}
        />
      )}

      {subTab === "queue" && (
        <Queue
          user={user}
          preselectedPatient={preselectedPatient}
        />
      )}
    </div>
  );
}
