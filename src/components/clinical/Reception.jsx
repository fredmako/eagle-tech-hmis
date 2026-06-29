import { useState, useEffect } from "react";
import Registration from "./Registration";
import Triage from "./Triage";
import Queue from "./Queue";
import {
  Activity,
  ArrowRight,
  ListChecks,
  Stethoscope,
  Users,
} from "lucide-react";

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
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
              <Activity size={18} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Reception Operations
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Manage patient registration, triage, and live queue flow from
                one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "registration", label: "Registration", icon: Users },
              { key: "triage", label: "Triage", icon: Stethoscope },
              { key: "queue", label: "Queue", icon: ListChecks },
            ].map((item) => {
              const Icon = item.icon;
              const active = subTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() =>
                    item.key === "queue" ? goToQueue() : setSubTab(item.key)
                  }
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-500 text-slate-950"
                      : "bg-slate-850 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Users size={15} className="text-teal-400" /> Registration
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Capture new patients and route them to the correct service.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Stethoscope size={15} className="text-teal-400" /> Triage
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Review patient vitals, priorities, and pending screening tasks.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ListChecks size={15} className="text-teal-400" /> Queue
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Follow active visit flow and manage the clinic line efficiently.
            </p>
          </div>
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
        <Queue user={user} preselectedPatient={preselectedPatient} />
      )}
    </div>
  );
}
