import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Registration from "./components/clinical/Registration";
import Queue from "./components/clinical/Queue";
import Triage from "./components/clinical/Triage";
import Consultation from "./components/clinical/Consultation";
import Orders from "./components/clinical/Orders";
import Pharmacy from "./components/clinical/Pharmacy";
import Billing from "./components/clinical/Billing";
import Reports from "./components/Reports";
import Admin from "./components/Admin";
import PatientDashboard from "./components/PatientDashboard";
import Ward from "./components/clinical/Ward";
import Radiology from "./components/clinical/Radiology";
import Surgery from "./components/clinical/Surgery";
import SaaSOnboarding from "./components/SaaSOnboarding";
import LandingPage from "./components/LandingPage";
import BusinessCards from "./components/BusinessCards";
import Preferences from "./components/Preferences";
import AuthCallback from "./components/AuthCallback";
import translations from "./translations";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import FacilityLandingPage from "./components/public/FacilityLandingPage";
import PatientPortal from "./components/PatientPortal";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import SupportPanel from "./components/SupportPanel";
import { motion } from "motion/react";

import {
  LayoutDashboard,
  UserPlus,
  Layers,
  Heart,
  Stethoscope,
  FlaskConical,
  Pill,
  DollarSign,
  FileSpreadsheet,
  Settings,
  LogOut,
  Activity,
  Clipboard,
  Bed,
  ShieldCheck,
  Camera,
  Sliders,
  Menu,
  X,
  Clock,
  HelpCircle,
} from "lucide-react";

export default function App() {
  const { user, setUser, logout, loading, checkSession } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("egesa_active_tab") || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [preselectedPatient, setPreselectedPatient] = useState(null);
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [publicView, setPublicView] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/auth/callback" || path.startsWith("/auth/callback/")) {
        return "callback";
      }
      if (window.location.hash.includes("access_token")) {
        return "callback";
      }
      if (window.location.hash === "#cards") {
        return "cards";
      }
      if (sessionStorage.getItem("egesa_health_onboarding_redirect") === "true") {
        return "callback";
      }
      const persistedView = sessionStorage.getItem("egesa_public_view");
      if (persistedView) return persistedView;
    }
    return "landing";
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem("egesa_theme") || "slate",
  );
  const [lang, setLang] = useState(
    () => localStorage.getItem("egesa_lang") || "en",
  );
  const [font, setFont] = useState(
    () => localStorage.getItem("egesa_font") || "sans",
  );

  useEffect(() => {
    localStorage.setItem("egesa_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (publicView !== "callback") {
      sessionStorage.setItem("egesa_public_view", publicView);
    }
  }, [publicView]);

  useEffect(() => {
    const root = document.documentElement;
    const classesToRemove = Array.from(root.classList).filter(
      (c) => c.startsWith("theme-") || c.startsWith("font-")
    );
    classesToRemove.forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${theme}`);
    root.classList.add(`font-${font}`);
  }, [theme, font]);

  useEffect(() => {
    const syncPublicViewFromHash = () => {
      const path = window.location.pathname;
      if (path === "/auth/callback" || path.startsWith("/auth/callback/")) {
        setPublicView("callback");
        return;
      }
      if (window.location.hash.includes("access_token")) {
        setPublicView("callback");
        return;
      }
      if (window.location.hash === "#cards") {
        setPublicView("cards");
        return;
      }
    };

    syncPublicViewFromHash();
    window.addEventListener("hashchange", syncPublicViewFromHash);

    return () => window.removeEventListener("hashchange", syncPublicViewFromHash);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (user && user.role === "patient" && pathname !== "/patient-portal") {
      window.history.replaceState({}, "", "/patient-portal");
      setPathname("/patient-portal");
    }
  }, [user, pathname]);

  const handleUrlAction = useCallback(async (action, facId) => {
    // Clear URL parameters immediately to avoid repeat execution on refresh
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      if (action === "approve_facility") {
        const { error } = await supabase
          .from("facilities")
          .update({ is_verified: true })
          .eq("id", facId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          facility_id: facId,
          user_id: user.id,
          action: "Facility Verified",
          details: `Verified facility registration for ID ${facId} via email action link.`,
        });

        // Clear active user session cache to force fresh load
        sessionStorage.removeItem("egesa_health_active_user");

        alert(`Successfully approved and verified facility ID: ${facId}!`);
      } else if (action === "reject_facility") {
        const { error } = await supabase
          .from("facilities")
          .update({ is_verified: false })
          .eq("id", facId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          facility_id: facId,
          user_id: user.id,
          action: "Facility Suspended",
          details: `Suspended/Deactivated facility registration for ID ${facId} via email action link.`,
        });

        // Clear active user session cache to force fresh load
        sessionStorage.removeItem("egesa_health_active_user");

        alert(`Successfully suspended/rejected facility ID: ${facId}.`);
      }

      if (checkSession) await checkSession();
    } catch (err) {
      console.error("[App URL Action] Failed:", err);
      alert(`Action failed: ${err.message}`);
    }
  }, [checkSession, user]);

  useEffect(() => {
    if (user && user.role === "super_admin") {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const facId = params.get("facility_id");

      if (action && facId) {
        handleUrlAction(action, facId);
      }
    }
  }, [user, handleUrlAction]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("egesa_theme", newTheme);
  };
  const toggleLightDark = () =>
    handleThemeChange(theme === "emerald" ? "slate" : "emerald");

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("egesa_lang", newLang);
  };
  const handleFontChange = (newFont) => {
    setFont(newFont);
    localStorage.setItem("egesa_font", newFont);
  };

  const t = (key) => {
    if (translations[lang] && translations[lang][key])
      return translations[lang][key];
    return (translations["en"] && translations["en"][key]) || key;
  };

  const renderLogo = (logoUrl) => {
    if (!logoUrl) {
      return (
        <img
          src="/logo.png"
          alt="Eagle Tech Logo"
          className="w-8 h-8 rounded-lg object-contain"
        />
      );
    }
    if (logoUrl.startsWith("preset:")) {
      const presetKey = logoUrl.split(":")[1];
      if (presetKey === "shield") {
        return (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-1.5 rounded-lg">
            <ShieldCheck size={18} fill="currentColor" />
          </div>
        );
      }
      if (presetKey === "cross") {
        return (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-1.5 rounded-lg">
            <Activity size={18} />
          </div>
        );
      }
      return (
        <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-1.5 rounded-lg">
          <Heart size={18} fill="currentColor" />
        </div>
      );
    }
    return (
      <img
        src={logoUrl}
        alt="Facility Logo"
        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
        onError={(e) => {
          e.target.src =
            "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60";
        }}
      />
    );
  };

  const handleLoginSuccess = () => setActiveTab("dashboard");
  const handleSignOut = () => logout();
  const handleNavigateToQueue = (patient) => {
    setPreselectedPatient(patient);
    setActiveTab("queue");
  };
  const clearPreselected = () => setPreselectedPatient(null);

  if (loading) {
    return (
      <div
        className={`theme-${theme} font-${font} min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-['DM_Sans',system-ui,sans-serif]`}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="bg-slate-955 border border-slate-900 p-2.5 rounded-xl shadow-lg shadow-teal-500/5">
            <img
              src="/logo.png"
              alt="Eagle Tech Logo"
              className="w-10 h-10 object-contain animate-pulse"
            />
          </div>
          <div>
            <h1 className="font-['Instrument_Serif',serif] text-2xl text-slate-100 leading-none">
              Eagle Tech <span className="text-teal-400">HMIS</span>
            </h1>
            <p className="text-[10px] text-teal-400 font-bold tracking-widest uppercase mt-1">
              Hospital Management Software
            </p>
          </div>
        </motion.div>
        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const publicContent = (() => {
      const hostnameParts = window.location.hostname.split('.');
      const isSubdomain = hostnameParts.length > 2 && hostnameParts[0] !== 'www' && !window.location.hostname.includes('localhost') && !window.location.hostname.match(/^[0-9.]+$/);
      if (pathname.startsWith("/hospital/") || (isSubdomain && pathname === "/")) {
        return <FacilityLandingPage />;
      }
      if (pathname === "/patient-portal") {
        return <FacilityLandingPage />;
      }
      if (publicView === "callback")
        return (
          <AuthCallback
            onCallbackComplete={(targetView) =>
              setPublicView(targetView || "signup")
            }
          />
        );
      if (publicView === "signup")
        return (
          <SaaSOnboarding onBackToLogin={() => setPublicView("landing")} />
        );
      if (publicView === "login")
        return (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSaaS={() => setPublicView("signup")}
            onNavigateToLanding={() => setPublicView("landing")}
          />
        );
      if (publicView === "cards")
      return (
        <BusinessCards
          onBackToLanding={() => setPublicView("landing")}
          onNavigateToLogin={() => setPublicView("login")}
        />
      );
      return (
      <LandingPage
        onNavigateToLogin={() => setPublicView("login")}
        onNavigateToSignup={() => setPublicView("signup")}
        onNavigateToCards={() => setPublicView("cards")}
        theme={theme}
        onToggleTheme={toggleLightDark}
      />
      );
    })();
    return (
      <div
        className={`theme-${theme} font-${font} min-h-screen bg-slate-950 text-slate-100`}
      >
        {publicContent}
      </div>
    );
  }

  if (user.role === "super_admin") {
    return (
      <div
        className={`theme-${theme} font-${font} min-h-screen bg-slate-955 text-slate-100`}
      >
        <SuperAdminDashboard user={user} onSignOut={handleSignOut} />
      </div>
    );
  }

  if (
    user.role !== "patient" &&
    user.facility_is_verified === false &&
    (!user.email ||
      user.email.toLowerCase().trim() !== "fredrickmakori102@gmail.com")
  ) {
    return (
      <div
        className={`theme-${theme} font-${font} min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-['DM_Sans',system-ui,sans-serif]`}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-slate-900 border border-teal-500/15 rounded-2xl p-6 md:p-8 shadow-xl text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-full text-amber-400">
              <Clock size={48} className="animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-['Instrument_Serif',serif] text-2xl text-slate-100">
              Registration Under Review
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your facility{" "}
              <strong className="text-slate-200">{user.facility_name}</strong>{" "}
              has been registered successfully. A system supervisor must verify
              your credentials before access is granted to your dashboard.
            </p>
          </div>
          <div className="bg-slate-950 border border-teal-500/10 p-4 rounded-xl text-left space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-bold">Facility Code</span>
              <span className="font-['JetBrains_Mono',monospace] text-teal-400 font-black">
                {user.facility_id}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-bold">Admin Email</span>
              <span className="text-slate-300 font-semibold">{user.email}</span>
            </div>
            <div className="border-t border-teal-500/10 pt-2 text-[10px] text-slate-500 leading-relaxed">
              Please contact the platform supervisor at{" "}
              <span className="text-teal-400 font-bold">
                fredrickmakori102@gmail.com
              </span>{" "}
              if you require immediate verification.
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={async () => {
                sessionStorage.removeItem("egesa_health_active_user");
                await checkSession();
              }}
              className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg active:scale-[0.98] transition w-full cursor-pointer"
            >
              Refresh Verification Status
            </button>
            <button
              onClick={handleSignOut}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (user.role === "patient") {
    return (
      <div
        className={`theme-${theme} font-${font} min-h-screen bg-slate-955 text-slate-100`}
      >
        <PatientPortal />
      </div>
    );
  }

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["*"],
    },
    {
      id: "registration",
      label: "Patient Registration",
      icon: UserPlus,
      roles: ["receptionist", "admin"],
    },
    {
      id: "queue",
      label: "Queue Management",
      icon: Layers,
      roles: ["receptionist", "nurse", "clinician", "admin"],
    },
    {
      id: "triage",
      label: "Triage Desk",
      icon: Heart,
      roles: ["nurse", "admin"],
    },
    {
      id: "consultation",
      label: "OPD Consultation",
      icon: Stethoscope,
      roles: ["clinician", "admin"],
    },
    {
      id: "orders",
      label: "Laboratory Desk",
      icon: FlaskConical,
      roles: ["lab_tech", "admin"],
    },
    {
      id: "radiology",
      label: "Radiology Desk",
      icon: Camera,
      roles: ["lab_tech", "clinician", "admin"],
    },
    {
      id: "surgery",
      label: "Surgery Desk",
      icon: ShieldCheck,
      roles: ["clinician", "admin"],
    },
    {
      id: "pharmacy",
      label: "Pharmacy Desk",
      icon: Pill,
      roles: ["pharmacist", "admin"],
    },
    {
      id: "billing",
      label: "Cashier / Billing",
      icon: DollarSign,
      roles: ["cashier", "admin"],
    },
    {
      id: "reports",
      label: "MOH Reports",
      icon: FileSpreadsheet,
      roles: ["admin"],
    },
    {
      id: "patient_dashboard",
      label: "Patient Dashboard",
      icon: Clipboard,
      roles: ["*"],
    },
    {
      id: "ward",
      label: "Inpatient Ward",
      icon: Bed,
      roles: ["nurse", "clinician", "admin"],
    },
    { id: "admin", label: "Admin Settings", icon: Settings, roles: ["admin", "facility_admin", "hr_manager"] },
    {
      id: "settings",
      label: "System Preferences",
      icon: Sliders,
      roles: ["*"],
    },
    {
      id: "support",
      label: "Help & Support",
      icon: HelpCircle,
      roles: ["*"],
    },
  ];
  const visibleMenuItems = menuItems.filter((item) => {
    if (user.license_tier === "pharmacy") {
      const allowedPharmacyTabs = [
        "dashboard",
        "pharmacy",
        "billing",
        "admin",
        "settings",
      ];
      if (!allowedPharmacyTabs.includes(item.id)) return false;
    }
    const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
    return item.roles.includes("*") || item.roles.some(r => rolesList.includes(r)) || rolesList.includes('admin');
  });

  return (
    <div
      className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden theme-${theme} font-${font} font-['DM_Sans',system-ui,sans-serif]`}
    >
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-teal-500/10 flex flex-col shrink-0 transition-transform duration-300 transform md:translate-x-0 md:static md:flex ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 border-b border-teal-500/10 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 truncate">
            {renderLogo(user.facility_logo)}
            <div className="truncate flex-1">
              <span className="font-['Instrument_Serif',serif] text-[13px] text-slate-100 block truncate leading-tight">
                {user.facility_name || "Eagle Tech HMIS"}
              </span>
              <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider block mt-0.5 truncate leading-none">
                {t("poweredBy") || "Eagle Tech HMIS"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-100 p-1 rounded focus:outline-none"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-semibold tracking-wide transition-all duration-200 ${isActive ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/15" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`}
              >
                <Icon size={15} />
                <span>{t(item.id) || item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-teal-500/10 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-teal-500/15 flex items-center justify-center font-bold text-teal-400 text-xs shadow">
              {user.full_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-bold text-slate-200 block truncate leading-snug">
                {user.full_name}
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-[10px] text-teal-400 font-semibold uppercase block leading-none">
                {user.role}
              </span>
            </div>
            <ThemeToggle theme={theme} onToggle={toggleLightDark} />
          </div>

          {user.email === "fredrickmakori102@gmail.com" && (
            <button
              onClick={() => {
                const updatedUser = {
                  ...user,
                  role: "super_admin",
                  facility_id: null,
                  facility_name: "Eagle Tech Systems Control",
                  facility_logo: null,
                  facility_is_verified: true,
                };
                setUser(updatedUser);
                sessionStorage.setItem(
                  "egesa_health_active_user",
                  JSON.stringify(updatedUser),
                );
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 border border-yellow-500/10 hover:border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer"
            >
              <ShieldCheck size={13} />
              <span>Systems Control Console</span>
            </button>
          )}

          <button
            onClick={() => {
              handleSignOut();
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 border border-teal-500/10 hover:border-red-500/30 bg-slate-900/50 hover:bg-red-500/5 text-slate-400 hover:text-red-400 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150"
          >
            <LogOut size={13} />
            <span>{t("signOut") || "Sign Out"}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-teal-500/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-400 hover:text-slate-100 p-1 rounded focus:outline-none"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {renderLogo(user.facility_logo)}
              <span className="font-['Instrument_Serif',serif] text-[13px] text-slate-100 truncate max-w-[180px]">
                {user.facility_name || "Eagle Tech"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleLightDark} />
            <span className="font-['JetBrains_Mono',monospace] text-[10px] text-teal-400 font-semibold uppercase bg-teal-500/10 px-2 py-0.5 rounded">
              {user.role}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "dashboard" && (
            <Dashboard user={user} onNavigate={setActiveTab} />
          )}
          {activeTab === "registration" && (
            <Registration
              user={user}
              onNavigateToQueue={handleNavigateToQueue}
            />
          )}
          {activeTab === "queue" && (
            <Queue
              preselectedPatient={preselectedPatient}
              user={user}
              clearPreselected={clearPreselected}
            />
          )}
          {activeTab === "triage" && (
            <Triage user={user} onComplete={() => setActiveTab("dashboard")} />
          )}
          {activeTab === "consultation" && (
            <Consultation
              user={user}
              onComplete={() => setActiveTab("dashboard")}
            />
          )}
          {activeTab === "orders" && (
            <Orders user={user} onComplete={() => setActiveTab("dashboard")} />
          )}
          {activeTab === "radiology" && (
            <Radiology
              user={user}
              onComplete={() => setActiveTab("dashboard")}
            />
          )}
          {activeTab === "surgery" && (
            <Surgery user={user} onComplete={() => setActiveTab("dashboard")} />
          )}
          {activeTab === "pharmacy" && (
            <Pharmacy
              user={user}
              onComplete={() => setActiveTab("dashboard")}
            />
          )}
          {activeTab === "billing" && (
            <Billing user={user} onComplete={() => setActiveTab("dashboard")} />
          )}
          {activeTab === "reports" && <Reports user={user} />}
          {activeTab === "patient_dashboard" && <PatientDashboard />}
          {activeTab === "ward" && <Ward user={user} />}
          {activeTab === "admin" && <Admin user={user} />}
          {activeTab === "settings" && (
            <Preferences
              currentTheme={theme}
              onChangeTheme={handleThemeChange}
              currentLang={lang}
              onChangeLang={handleLangChange}
              currentFont={font}
              onChangeFont={handleFontChange}
            />
          )}
          {activeTab === "support" && <SupportPanel />}
        </div>
      </main>
    </div>
  );
}
