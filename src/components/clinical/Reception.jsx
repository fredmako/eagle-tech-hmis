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
  architectureModel,
  initialSubTab = "registration",
  selectedSubItem,
  handleNavigate,
  preselectedPatient,
  showNotification,
}) {
  const [subTab, setSubTab] = useState(initialSubTab);
  const privateModel = architectureModel?.private;
  const activeDepartment = privateModel?.forms?.department || "reception";
  const activeQueueSubTab = privateModel?.queues?.subTab || subTab;

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const goToQueue = (patient) => {
    if (handleNavigate) handleNavigate("queue");
  };

  const isRegistrationSubItem = [
    "new_patient",
    "update_patient",
    "patient_insurance",
    "patients_in_wards",
    "sha_registrations",
    "eligibility_sha",
    "eligibility_patients",
  ].includes(selectedSubItem);

  if (isRegistrationSubItem) {
    return (
      <Registration
        user={user}
        architectureModel={architectureModel}
        selectedSubItem={selectedSubItem}
        onNavigateToQueue={(pt) => {
          if (handleNavigate) handleNavigate("queue");
        }}
        showNotification={showNotification}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/90 p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border-subtle bg-background/80 p-2.5">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg-strong">
                Reception Operations
              </h2>
              <p className="mt-1 text-xs text-fg-muted">
                Manage patient registration, triage, and live queue flow from
                one place.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Global + private model active · {activeDepartment} ·{" "}
                {activeQueueSubTab}
              </div>
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
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-primary/40 bg-primary text-primary-foreground shadow-glow shadow-primary/10"
                      : "border-border-subtle bg-background/70 text-fg-body hover:border-border-strong hover:bg-card"
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
          <div className="rounded-2xl border border-border-subtle bg-background/70 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg-strong">
              <Users size={15} className="text-primary" /> Registration
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Capture new patients and route them to the correct service.
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background/70 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg-strong">
              <Stethoscope size={15} className="text-primary" /> Triage
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Review patient vitals, priorities, and pending screening tasks.
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background/70 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg-strong">
              <ListChecks size={15} className="text-primary" /> Queue
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Follow active visit flow and manage the clinic line efficiently.
            </p>
          </div>
        </div>
      </div>

      {subTab === "registration" && (
        <Registration
          user={user}
          architectureModel={architectureModel}
          selectedSubItem={selectedSubItem}
          onNavigateToQueue={(pt) => {
            if (handleNavigate) handleNavigate("queue");
          }}
          showNotification={showNotification}
        />
      )}

      {subTab === "triage" && (
        <Triage
          user={user}
          architectureModel={architectureModel}
          onComplete={() => {
            if (handleNavigate) handleNavigate("dashboard");
          }}
          showNotification={showNotification}
        />
      )}

      {subTab === "queue" && (
        <Queue
          user={user}
          architectureModel={architectureModel}
          preselectedPatient={preselectedPatient}
        />
      )}
    </div>
  );
}
