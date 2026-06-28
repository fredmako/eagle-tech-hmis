import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Registration from "./components/clinical/Registration";
import Queue from "./components/clinical/Queue";
import Triage from "./components/clinical/Triage";
import Reception from "./components/clinical/Reception";
import Consultation from "./components/clinical/Consultation";
import Orders from "./components/clinical/Orders";
import Pharmacy from "./components/clinical/Pharmacy";
import Billing from "./components/clinical/Billing";
import Reports from "./components/Reports";
import Admin from "./components/Admin";
import PatientDashboard from "./components/PatientDashboard";
import Ward from "./components/clinical/Ward";
import MaternityDashboard from "./components/clinical/MaternityDashboard";
import MCHDashboard from "./components/clinical/MCHDashboard";
import Radiology from "./components/clinical/Radiology";
import Surgery from "./components/clinical/Surgery";
import OperationsDesk from "./components/admin/OperationsDesk";
import HumanResourcesWrapper from "./components/admin/HumanResourcesWrapper";
import AssetsMaintenance from "./components/admin/AssetsMaintenance";
import Payroll from "./components/admin/Payroll";
import SaaSOnboarding from "./components/SaaSOnboarding";
import OnboardingTour from "./components/OnboardingTour";
import LandingPage from "./components/LandingPage";
import BusinessCards from "./components/BusinessCards";
import Preferences from "./components/Preferences";
import AuthCallback from "./components/AuthCallback";
import Appointments from "./components/Appointments";
import translations from "./translations";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import FacilityLandingPage from "./components/public/FacilityLandingPage";
import QueueBoardPublic from "./components/public/QueueBoardPublic";
import PatientPortal from "./components/PatientPortal";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import NotificationBell from "./components/NotificationBell";
import SupportPanel from "./components/SupportPanel";
import { motion } from "motion/react";
import { hasAccess } from "./utils/permissions";

import {
  LayoutDashboard,
  UserPlus,
  User,
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
  CheckCircle,
  ShieldAlert,
  Calendar,
  Baby,
  Search,
  ShoppingBag,
  Users,
  Wrench,
  CreditCard,
  Compass,
} from "lucide-react";

export default function App() {
  const { user, setUser, logout, loading, checkSession } = useAuth();

  // Extract subdomain and pathname at top level
  const hostnameParts = window.location.hostname.split(".");
  const isSubdomain =
    hostnameParts.length > 2 &&
    hostnameParts[0] !== "www" &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.match(/^[0-9.]+$/);

  let subdomain = null;
  if (isSubdomain) {
    subdomain = hostnameParts[0];
  } else {
    const pathParts = window.location.pathname.split("/");
    const hospitalIndex = pathParts.indexOf("hospital");
    subdomain =
      hospitalIndex !== -1 && pathParts[hospitalIndex + 1]
        ? pathParts[hospitalIndex + 1]
        : null;
  }

  const [subdomainFacility, setSubdomainFacility] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(true);

  useEffect(() => {
    const fetchSubdomainFacility = async () => {
      if (!subdomain) {
        setCheckingSubdomain(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select("*")
          .or(`subdomain_prefix.eq.${subdomain},id.eq.${subdomain}`)
          .maybeSingle();

        if (data) {
          setSubdomainFacility(data);
          // Verify active user facility context
          if (
            user &&
            user.role !== "super_admin" &&
            user.role !== "platform_support" &&
            user.facility_id !== data.id
          ) {
            console.warn(
              "[Subdomain Access] Logged-in user belongs to a different facility. Logging out.",
              user.facility_id,
              "vs",
              data.id,
            );
            await logout();
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Error loading subdomain facility details:", err);
      } finally {
        setCheckingSubdomain(false);
      }
    };
    fetchSubdomainFacility();
  }, [subdomain, user?.id]);

  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', title: string, message: string }
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
  };
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("egesa_active_tab") || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [pharmacySubTab, setPharmacySubTab] = useState("dispensing");
  const [billingSubTab, setBillingSubTab] = useState("desk");
  const [mchSubTab, setMchSubTab] = useState("dashboard");
  const [maternitySubTab, setMaternitySubTab] = useState("dashboard");
  const [adminSubTab, setAdminSubTab] = useState("overview");
  const [hrSubTab, setHrSubTab] = useState("directory");
  const [receptionSubTab, setReceptionSubTab] = useState("registration");
  const [activeModules, setActiveModules] = useState({});
  const [showTour, setShowTour] = useState(false);

  const fetchFacilityModules = async () => {
    if (!user?.facility_id) return;
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("active_modules")
        .eq("id", user.facility_id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.active_modules) {
        setActiveModules(data.active_modules);
      } else {
        setActiveModules({});
      }
    } catch (err) {
      console.error("Error fetching facility active modules:", err);
    }
  };

  useEffect(() => {
    fetchFacilityModules();
  }, [user?.facility_id]);

  useEffect(() => {
    const handleModulesUpdate = () => {
      fetchFacilityModules();
    };
    window.addEventListener("egesa_modules_updated", handleModulesUpdate);
    return () =>
      window.removeEventListener("egesa_modules_updated", handleModulesUpdate);
  }, [user?.facility_id]);

  const getSubActive = (itemId, subId) => {
    if (itemId === "pharmacy") return pharmacySubTab === subId;
    if (itemId === "billing") return billingSubTab === subId;
    if (itemId === "mch") return mchSubTab === subId;
    if (itemId === "maternity") return maternitySubTab === subId;
    if (itemId === "admin") return adminSubTab === subId;
    if (itemId === "hr") return hrSubTab === subId;
    if (itemId === "reception") return receptionSubTab === subId;
    return false;
  };

  const mapReceptionSubItemToRoute = (subId) => {
    const registrationItems = [
      "new_patient",
      "update_patient",
      "patient_insurance",
      "patients_in_wards",
      "sha_registrations",
      "eligibility_sha",
      "eligibility_patients",
    ];
    const triageItems = [
      "triage",
      "checkin_patient",
      "checkin_dependant",
      "sha_checkins",
    ];
    const queueItems = ["reprint_ticket", "manage_queue"];
    const supportItems = ["send_sms", "send_email", "sms_templates"];
    const appointmentItems = [
      "patients_calendar",
      "doctors_calendar",
      "schedule_appointments",
      "appointment_reminders",
    ];
    const hospitalFormRoutes = {
      referral: "consultation",
      sick_offs: "consultation",
      surgeon: "surgery",
      radiology: "radiology",
      anesthetist: "surgery",
    };

    if (registrationItems.includes(subId)) {
      return { tab: "reception", subTab: "registration" };
    }
    if (triageItems.includes(subId)) {
      return { tab: "reception", subTab: "triage" };
    }
    if (queueItems.includes(subId)) {
      return { tab: "reception", subTab: "queue" };
    }
    if (supportItems.includes(subId)) {
      return { tab: "support" };
    }
    if (appointmentItems.includes(subId)) {
      return { tab: "appointments" };
    }
    if (hospitalFormRoutes[subId]) {
      return { tab: hospitalFormRoutes[subId] };
    }
    return { tab: "reception", subTab: "registration" };
  };

  const handleSubClick = (itemId, subId) => {
    if (itemId === "reception") {
      const route = mapReceptionSubItemToRoute(subId);
      setActiveTab(route.tab);
      if (route.subTab) setReceptionSubTab(route.subTab);
      return;
    }

    setActiveTab(itemId);
    if (itemId === "pharmacy") setPharmacySubTab(subId);
    if (itemId === "billing") setBillingSubTab(subId);
    if (itemId === "mch") setMchSubTab(subId);
    if (itemId === "maternity") setMaternitySubTab(subId);
    if (itemId === "admin") setAdminSubTab(subId);
    if (itemId === "hr") setHrSubTab(subId);
  };

  const handleNavigate = (tabId, subId = null) => {
    if (tabId === "reception" && subId) {
      const route = mapReceptionSubItemToRoute(subId);
      setActiveTab(route.tab);
      if (route.subTab) setReceptionSubTab(route.subTab);
      return;
    }

    setActiveTab(tabId);
    if (!subId) return;
    if (tabId === "pharmacy") setPharmacySubTab(subId);
    if (tabId === "billing") setBillingSubTab(subId);
    if (tabId === "mch") setMchSubTab(subId);
    if (tabId === "maternity") setMaternitySubTab(subId);
    if (tabId === "admin") setAdminSubTab(subId);
    if (tabId === "hr") setHrSubTab(subId);
    if (tabId === "reception") setReceptionSubTab(subId);
  };

  const [preselectedPatient, setPreselectedPatient] = useState(null);
  const [pathname, setPathname] = useState(() => {
    const path = window.location.pathname;
    if (
      path.includes("auth/callback") ||
      window.location.hash.includes("access_token")
    ) {
      return "/auth/callback";
    }
    return path;
  });
  const [publicView, setPublicView] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (
        path.includes("auth/callback") ||
        window.location.hash.includes("access_token")
      ) {
        return "callback";
      }
      if (window.location.hash === "#cards") {
        return "cards";
      }
      if (
        sessionStorage.getItem("egesa_health_onboarding_redirect") === "true"
      ) {
        return "callback";
      }
      const persistedView = sessionStorage.getItem("egesa_public_view");
      if (persistedView) return persistedView;
    }
    return "landing";
  });

  const handleLogoClick = () => {
    window.history.replaceState({}, document.title, "/");
    setPathname("/");
    setPublicView("landing");
  };

  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = localStorage.getItem("egesa_theme_mode");
    if (savedMode) return savedMode;
    const oldTheme = localStorage.getItem("egesa_theme");
    if (oldTheme === "emerald") return "light";
    return "dark";
  });

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("egesa_theme");
    if (savedTheme === "emerald") return "green";
    if (savedTheme === "slate") return "blue";
    if (savedTheme) return savedTheme;
    return "teal";
  });

  const [menuLayout, setMenuLayout] = useState(
    () => localStorage.getItem("egesa_menu_layout") || "sidebar",
  );

  const [lang, setLang] = useState(
    () => localStorage.getItem("egesa_lang") || "en",
  );
  const [font, setFont] = useState(
    () => localStorage.getItem("egesa_font") || "sans",
  );
  const [brightness, setBrightness] = useState(() =>
    Number(localStorage.getItem("egesa_brightness") || 100),
  );
  const [nightVision, setNightVision] = useState(
    () => localStorage.getItem("egesa_night_vision") === "true",
  );
  const [menuSearch, setMenuSearch] = useState("");
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState(null);
  const [adminDelegation, setAdminDelegation] = useState({});

  useEffect(() => {
    if (user?.facility_id) {
      const fetchDelegation = async () => {
        try {
          const apiBase =
            import.meta.env.VITE_API_URL || "http://localhost:5000/api";
          const token = localStorage.getItem("egesa_health_token");
          const res = await fetch(`${apiBase}/db/query`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              table: "facilities",
              queries: [
                { type: "equal", column: "id", value: user.facility_id },
              ],
            }),
          });
          if (res.ok) {
            const resData = await res.json();
            const activeFac = resData.data?.find(
              (f) => f.id === user.facility_id,
            );
            if (activeFac) {
              setAdminDelegation(activeFac.admin_delegation || {});
            }
          }
        } catch (e) {
          console.error("Error fetching admin delegation in App.jsx:", e);
        }
      };
      fetchDelegation();
    }
  }, [user?.facility_id]);

  useEffect(() => {
    if (user && user.role) {
      const tourCompleted = localStorage.getItem(
        `egesa_tour_completed_${user.id}`,
      );
      if (!tourCompleted) {
        const timer = setTimeout(() => {
          setShowTour(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

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
      (c) =>
        c.startsWith("theme-") ||
        c.startsWith("font-") ||
        c.startsWith("mode-"),
    );
    classesToRemove.forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${theme}`);
    root.classList.add(`mode-${themeMode}`);
    root.classList.add(`font-${font}`);
  }, [theme, themeMode, font]);

  useEffect(() => {
    const filterValue = nightVision
      ? `sepia(1) saturate(1.8) hue-rotate(80deg) brightness(${brightness}%)`
      : `brightness(${brightness}%)`;
    document.documentElement.style.filter = filterValue;
  }, [nightVision, brightness]);

  useEffect(() => {
    const syncPublicViewFromHash = () => {
      const path = window.location.pathname;
      if (
        path.includes("auth/callback") ||
        window.location.hash.includes("access_token")
      ) {
        setPublicView("callback");
        setPathname("/auth/callback");
        return;
      }
      if (window.location.hash === "#cards") {
        setPublicView("cards");
        return;
      }
    };

    syncPublicViewFromHash();
    window.addEventListener("hashchange", syncPublicViewFromHash);

    return () =>
      window.removeEventListener("hashchange", syncPublicViewFromHash);
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

  const handleUrlAction = useCallback(
    async (action, facId) => {
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
    },
    [checkSession, user],
  );

  useEffect(() => {
    if (
      user &&
      (user.role === "super_admin" || user.role === "platform_support")
    ) {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const facId = params.get("facility_id");

      if (action && facId) {
        handleUrlAction(action, facId);
      }
    }
  }, [user, handleUrlAction]);

  useEffect(() => {
    if (
      user &&
      (user.role === "super_admin" || user.role === "platform_support")
    ) {
      if (publicView === "dashboard" && !user.facility_id) {
        setPublicView("landing");
      }
    }
  }, [user, publicView]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("egesa_theme", newTheme);
  };
  const handleThemeModeChange = (newMode) => {
    setThemeMode(newMode);
    localStorage.setItem("egesa_theme_mode", newMode);
  };
  const toggleLightDark = () =>
    handleThemeModeChange(themeMode === "light" ? "dark" : "light");

  const handleMenuLayoutChange = (newLayout) => {
    setMenuLayout(newLayout);
    localStorage.setItem("egesa_menu_layout", newLayout);
    setIsSidebarOpen(false);
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("egesa_lang", newLang);
  };
  const handleBrightnessChange = (val) => {
    setBrightness(val);
    localStorage.setItem("egesa_brightness", val);
  };
  const handleNightVisionChange = (val) => {
    setNightVision(val);
    localStorage.setItem("egesa_night_vision", val);
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

  const handleLoginSuccess = (loggedInUser) => {
    if (
      loggedInUser &&
      (loggedInUser.role === "super_admin" ||
        loggedInUser.role === "platform_support")
    ) {
      setPublicView("landing");
    } else {
      setPublicView("dashboard");
      setActiveTab("dashboard");
    }
  };

  const handleSwitchFacility = async (facilityId) => {
    try {
      const sessionRes = await supabase.auth.getSession();
      const clientJwt = sessionRes?.data?.session?.access_token;
      if (!clientJwt) {
        throw new Error("Supabase session not found. Please log in again.");
      }

      const backendUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${backendUrl}/auth/supabase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: clientJwt,
          facility_id: facilityId,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.status === "success") {
        localStorage.setItem("egesa_active_facility_id", facilityId);
        localStorage.setItem("egesa_health_token", resData.token);
        sessionStorage.setItem(
          "egesa_health_active_user",
          JSON.stringify(resData.user),
        );
        if (checkSession) await checkSession();
        setPublicView("dashboard");
        setActiveTab("dashboard");
      } else {
        alert(resData.error || "Failed to switch facility workspace.");
      }
    } catch (err) {
      console.error("Error switching facility:", err);
      alert(err.message || "An error occurred during workspace selection.");
    }
  };
  const handleSignOut = () => {
    logout();
    setPublicView("landing");
  };
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
            <p className="text-2xs text-teal-400 font-bold tracking-widest uppercase mt-1">
              Hospital Management Software
            </p>
          </div>
        </motion.div>
        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pathname.endsWith("/queue-board")) {
    return <QueueBoardPublic />;
  }

  const isViewingPublic =
    !user ||
    ["landing", "cards", "callback", "signup", "login"].includes(publicView) ||
    (pathname.startsWith("/hospital/") && !pathname.endsWith("/login"));
  if (isViewingPublic) {
    const publicContent = (() => {
      const isValidPath =
        pathname === "/" ||
        pathname === "/login" ||
        pathname.startsWith("/auth/callback") ||
        pathname === "/patient-portal" ||
        pathname.startsWith("/hospital/");

      if (!isValidPath) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl m-8 text-center font-sans max-w-md mx-auto mt-24 shadow-2xl">
            <ShieldAlert
              size={48}
              className="text-yellow-500 mb-4 animate-bounce"
            />
            <h3 className="text-lg font-bold text-slate-100">
              404 - Page Not Found
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
              The requested page path "{pathname}" is not registered or is
              unavailable.
            </p>
            <button
              onClick={() => {
                window.history.replaceState({}, "", "/");
                setPathname("/");
                setPublicView("landing");
              }}
              className="mt-6 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg transition active:scale-[0.98] cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        );
      }

      if (
        pathname === "/login" ||
        publicView === "login" ||
        (pathname.startsWith("/hospital/") && pathname.endsWith("/login"))
      ) {
        return (
          <Login
            lockedFacilityId={subdomainFacility?.id}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSaaS={() => setPublicView("signup")}
            onNavigateToLanding={() => setPublicView("landing")}
          />
        );
      }
      if (
        (pathname.startsWith("/hospital/") && !pathname.endsWith("/login")) ||
        (isSubdomain && pathname === "/")
      ) {
        return <FacilityLandingPage />;
      }
      if (pathname === "/patient-portal") {
        if (user && user.role === "patient") {
          return <PatientDashboard user={user} />;
        }
        return <FacilityLandingPage />;
      }
      if (publicView === "callback")
        return (
          <AuthCallback
            onCallbackComplete={(targetView) => {
              setPathname("/");
              setPublicView(targetView || "signup");
            }}
          />
        );
      if (publicView === "signup")
        return (
          <SaaSOnboarding onBackToLogin={() => setPublicView("landing")} />
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
          user={user}
          onNavigateToLogin={() => setPublicView("login")}
          onNavigateToSignup={() => setPublicView("signup")}
          onNavigateToCards={() => setPublicView("cards")}
          onNavigateToDashboard={() => setPublicView("dashboard")}
          onNavigateToSuperAdminDashboard={() =>
            setPublicView("super_admin_dashboard")
          }
          onSwitchFacility={handleSwitchFacility}
          onSignOut={handleSignOut}
          theme={themeMode}
          onToggleTheme={toggleLightDark}
        />
      );
    })();
    return (
      <div
        className={`theme-${theme} mode-${themeMode} font-${font} min-h-screen bg-slate-955 text-slate-100 overflow-x-hidden`}
      >
        {publicContent}
      </div>
    );
  }

  if (
    (user.role === "super_admin" || user.role === "platform_support") &&
    publicView === "super_admin_dashboard"
  ) {
    return (
      <div
        className={`theme-${theme} mode-${themeMode} font-${font} min-h-screen bg-slate-955 text-slate-100`}
      >
        <SuperAdminDashboard
          user={user}
          onSignOut={handleSignOut}
          onLogoClick={handleLogoClick}
        />
      </div>
    );
  }

  if (!user.facility_is_verified) {
    return (
      <div
        className={`theme-${theme} mode-${themeMode} font-${font} min-h-screen bg-slate-955 text-slate-100 flex flex-col justify-center items-center p-4 font-['DM_Sans',system-ui,sans-serif]`}
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
            <div className="border-t border-teal-500/10 pt-2 text-2xs text-slate-500 leading-relaxed">
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
        className={`theme-${theme} mode-${themeMode} font-${font} min-h-screen bg-slate-955 text-slate-100`}
      >
        <PatientPortal />
      </div>
    );
  }

  const rolesList = user.role
    ? user.role.split(",").map((r) => r.trim().toLowerCase())
    : [];
  const isAdmin =
    rolesList.includes("admin") || rolesList.includes("super_admin");

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["*"],
    },
    {
      id: "reception",
      label: "Reception Hub",
      icon: Users,
      roles: ["receptionist", "admin"],
      keywords: [
        "patients",
        "checkins",
        "sms",
        "email",
        "appointments",
        "referral",
        "sha",
      ],
      subItems: [
        { id: "new_patient", label: "New Patient" },
        { id: "update_patient", label: "Update Patient" },
        { id: "patient_insurance", label: "Patient Insurance" },
        { id: "patients_in_wards", label: "Patients in Wards" },
        { id: "sha_registrations", label: "SHA Registrations" },
        { id: "eligibility_sha", label: "SHA Eligibility" },
        { id: "eligibility_patients", label: "Patient Eligibility" },
        { id: "triage", label: "Triage" },
        { id: "checkin_patient", label: "Checkin Patient" },
        { id: "checkin_dependant", label: "Checkin Dependant" },
        { id: "sha_checkins", label: "SHA Checkins" },
        { id: "reprint_ticket", label: "Reprint Ticket" },
        { id: "manage_queue", label: "Manage Queue" },
        { id: "send_sms", label: "Send SMS" },
        { id: "send_email", label: "Send Email" },
        { id: "sms_templates", label: "SMS Templates" },
        { id: "patients_calendar", label: "Patients Calendar" },
        { id: "doctors_calendar", label: "Doctors Calendar" },
        { id: "schedule_appointments", label: "Schedule Appointments" },
        { id: "appointment_reminders", label: "Appointment Reminders" },
        { id: "referral", label: "Referral" },
        { id: "sick_offs", label: "Sick Offs" },
        { id: "surgeon", label: "Surgeon" },
        { id: "radiology", label: "Radiology" },
        { id: "anesthetist", label: "Anesthetist" },
      ],
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
      keywords: ["drugs", "prescriptions", "dispense", "stock"],
      subItems: [
        { id: "dispensing", label: "Dispense Queue" },
        { id: "sell", label: "Sell Drug(s)" },
        { id: "modify", label: "Modify Sale" },
        { id: "paid", label: "Paid Drugs" },
      ],
    },
    {
      id: "billing",
      label: "Cashier / Billing",
      icon: DollarSign,
      roles: ["cashier", "admin"],
      keywords: ["invoice", "claims", "preauth", "payments", "cashier"],
      subItems: [
        { id: "desk", label: "Billing Desk" },
        { id: "preauth", label: "Pre-Auth Claims" },
        { id: "setup", label: "Billing Setup" },
      ],
    },
    {
      id: "reports",
      label: "MOH Reports",
      icon: FileSpreadsheet,
      roles: ["admin"],
      keywords: [
        "reports",
        "moh",
        "compliance",
        "analytics",
        "diagnosis",
        "discharge summary",
      ],
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
    {
      id: "maternity",
      label: "Maternity Setup",
      icon: Baby,
      roles: ["nurse", "clinician", "admin"],
      subItems: [
        { id: "dashboard", label: "Maternity Dashboard" },
        { id: "blocks", label: "Blocks Setup" },
        { id: "wards", label: "Wards Setup" },
        { id: "bed_types", label: "Bed Classifications" },
        { id: "beds", label: "Beds Setup" },
        { id: "registration", label: "Patient Register" },
        { id: "queue", label: "Treatment Queue" },
        { id: "inventory", label: "Maternal Drugs" },
        { id: "reports", label: "Outcome Stats" },
      ],
    },
    {
      id: "mch",
      label: "MCH Clinic",
      icon: Heart,
      roles: ["nurse", "clinician", "admin"],
      subItems: [
        { id: "dashboard", label: "MCH Dashboard" },
        { id: "anc", label: "Antenatal Care" },
        { id: "fp", label: "Family Planning" },
        { id: "imm", label: "Child Welfare" },
        { id: "reports", label: "MCH Reports" },
      ],
    },
    {
      id: "admin",
      label: "Admin Settings",
      icon: Settings,
      roles: [
        "admin",
        "facility_admin",
        "hr_manager",
        "marketing_admin",
        "operations_manager",
        "it_support",
      ],
      keywords: [
        "settings",
        "smtp",
        "email delivery",
        "audit",
        "license",
        "facility",
        "sha",
        "shira",
        "claims",
      ],
      subItems: [
        { id: "audit", label: "Audit Logs" },
        {
          id: "smtp_settings",
          label: "SMTP Settings",
          keywords: ["smtp", "mail server", "email setup", "google oauth"],
        },
        {
          id: "email_logs",
          label: "Email Logs",
          keywords: [
            "mail delivery",
            "invites",
            "delivery status",
            "failed email",
          ],
        },
        { id: "licensing", label: "Licensing" },
        { id: "facility_profile", label: "Facility Profile" },
        {
          id: "afyalink",
          label: "SHA / DHA HIE Claims",
          keywords: [
            "shira",
            "sha",
            "claim forms",
            "invoice",
            "diagnosis report",
            "discharge summary",
          ],
        },
      ],
    },
    {
      id: "hr",
      label: "Human Resources",
      icon: Users,
      roles: ["*"],
      keywords: [
        "staff",
        "employees",
        "permissions",
        "access",
        "wallet",
        "suspend",
        "delete fired",
      ],
      subItems: [
        {
          id: "directory",
          label: "Staff Directory",
          keywords: [
            "employees",
            "access status",
            "suspend",
            "delete",
            "wallet",
          ],
        },
        {
          id: "roster",
          label: "Duty Roster",
          keywords: ["attendance", "clock in", "geofence", "openstreetmap"],
        },
        {
          id: "onboarding",
          label: "Staff On-boarding",
          keywords: ["invite", "email delivery", "mail status"],
        },
        {
          id: "requests",
          label: "Role Requests",
          keywords: ["permission upgrade", "facility role request", "approval"],
        },
        {
          id: "delegation",
          label: "Access Delegation Settings",
          keywords: ["privileges", "permissions", "delegate access"],
        },
      ],
    },
    {
      id: "payroll",
      label: "Payroll Console",
      icon: CreditCard,
      roles: ["admin", "facility_admin", "hr_manager"],
    },
    {
      id: "procurement",
      label: "Procurement Desk",
      icon: ShoppingBag,
      roles: ["admin", "facility_admin", "operations_manager"],
    },
    {
      id: "maintenance",
      label: "Assets Maintenance",
      icon: Wrench,
      roles: ["admin", "facility_admin", "operations_manager", "it_support"],
    },
    {
      id: "appointments",
      label: "Appointments Schedule",
      icon: Calendar,
      roles: ["receptionist", "nurse", "clinician", "admin"],
    },
    {
      id: "settings",
      label: "Manage Profile",
      icon: User,
      roles: ["*"],
    },
    {
      id: "support",
      label: "Help & Support",
      icon: HelpCircle,
      roles: ["*"],
      keywords: ["whatsapp", "chat", "support", "help desk"],
    },
  ];
  const MENU_CATEGORIES = [
    {
      id: "overview",
      label: "Overview & Schedule",
      icon: LayoutDashboard,
      items: ["dashboard", "appointments"],
    },
    {
      id: "patient_flow",
      label: "Patient Flow",
      icon: UserPlus,
      items: ["reception", "registration", "queue", "triage", "consultation"],
    },
    {
      id: "medical_depts",
      label: "Medical Departments",
      icon: Bed,
      items: ["ward", "maternity", "mch", "surgery", "orders"],
    },
    {
      id: "mgmt_depts",
      label: "Management Departments",
      icon: Users,
      items: ["procurement", "hr", "payroll", "maintenance"],
    },
    {
      id: "diagnostics_rx",
      label: "Diagnostics & Rx",
      icon: FlaskConical,
      items: ["radiology", "pharmacy"],
    },
    {
      id: "financials",
      label: "Billing & Reports",
      icon: DollarSign,
      items: ["billing", "reports", "patient_dashboard"],
    },
    {
      id: "system",
      label: "System Control",
      icon: Settings,
      items: ["admin", "settings", "support"],
    },
  ];

  const menuModuleKeys = {
    registration: "reception",
    queue: "reception",
    triage: "reception",
    consultation: "doctors",
    orders: "laboratory",
    reception: "reception",
    radiology: "radiology",
    pharmacy: "pharmacy",
    pos: "pharmacy",
    billing: "billing",
    ward: "inpatient",
    maternity: "maternity",
    mch: "mch",
    surgery: "theatre",
    procurement: "procurement",
    hr: "hr",
    payroll: "payroll",
    maintenance: "maintenance",
    reports: "reports",
    support: "help",
    appointments: "appointments",
  };

  const visibleMenuItems = menuItems.filter((item) => {
    const moduleKey = menuModuleKeys[item.id];
    if (moduleKey && activeModules && activeModules[moduleKey] === false) {
      return false;
    }

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

    // Decoupled modules custom department/admin access control
    if (item.id === "maternity") {
      const userDept = user.department?.toLowerCase() || "";
      const isMaternityDept = userDept.includes("maternity");
      return isAdmin || isMaternityDept;
    }

    if (item.id === "mch") {
      const userDept = user.department?.toLowerCase() || "";
      const isMchDept =
        userDept.includes("mch") ||
        userDept.includes("anc") ||
        userDept.includes("antenatal");
      return isAdmin || isMchDept;
    }

    if (item.id === "hr") {
      return true;
    }

    if (item.id === "procurement") {
      return isAdmin || hasAccess("procurement", user.role, adminDelegation);
    }

    if (item.id === "maintenance") {
      return isAdmin || hasAccess("maintenance", user.role, adminDelegation);
    }

    return (
      item.roles.includes("*") ||
      item.roles.some((r) => rolesList.includes(r)) ||
      isAdmin
    );
  });

  const filteredMenuItems = visibleMenuItems.filter(
    (item) =>
      item.label.toLowerCase().includes(menuSearch.toLowerCase()) ||
      (t && t(item.id)
        ? t(item.id).toLowerCase().includes(menuSearch.toLowerCase())
        : false),
  );

  const normalizedMenuSearch = menuSearch.trim().toLowerCase();
  const searchMenuResults = normalizedMenuSearch
    ? visibleMenuItems.flatMap((item) => {
        const parentLabel = t(item.id) || item.label;
        const parentKeywords = (item.keywords || []).join(" ");
        const parentMatches =
          parentLabel.toLowerCase().includes(normalizedMenuSearch) ||
          item.id.toLowerCase().includes(normalizedMenuSearch) ||
          parentKeywords.toLowerCase().includes(normalizedMenuSearch);
        const results = parentMatches
          ? [{ type: "parent", item, label: parentLabel, path: parentLabel }]
          : [];

        (item.subItems || []).forEach((sub) => {
          const subLabel = sub.label || sub.id;
          const subKeywords = (sub.keywords || []).join(" ");
          const subMatches =
            subLabel.toLowerCase().includes(normalizedMenuSearch) ||
            sub.id.toLowerCase().includes(normalizedMenuSearch) ||
            subKeywords.toLowerCase().includes(normalizedMenuSearch);
          if (subMatches) {
            results.push({
              type: "sub",
              item,
              sub,
              label: subLabel,
              path: `${parentLabel} / ${subLabel}`,
            });
          }
        });

        return results;
      })
    : [];

  const navigateSearchResult = (result) => {
    if (result.type === "sub") {
      handleSubClick(result.item.id, result.sub.id);
    } else {
      setActiveTab(result.item.id);
    }
    setActiveCategoryDropdown(null);
    setMenuSearch("");
    setIsSearchExpanded(false);
    setIsSidebarOpen(false);
  };

  return (
    <div
      className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden theme-${theme} mode-${themeMode} font-${font} font-['DM_Sans',system-ui,sans-serif] ${menuLayout === "topbar" ? "flex-col" : "flex-row"}`}
    >
      {menuLayout === "topbar" && (
        <header className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-teal-500/10 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition active:scale-[0.98]"
            >
              {renderLogo(user.facility_logo)}
              <div>
                <span className="font-['Instrument_Serif',serif] text-[13px] text-slate-100 block leading-tight truncate max-w-50">
                  {user.facility_name || "Eagle Tech HMIS"}
                </span>
                <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider block mt-0.5 leading-none">
                  {t("poweredBy") || "Eagle Tech HMIS"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 transition-all duration-300 mx-2 shrink-0">
            {isSearchExpanded ? (
              <div className="flex items-center gap-2 bg-slate-950 border border-teal-500/30 rounded-lg px-2.5 py-1 text-slate-450 w-45 transition-all duration-300 animate-fadeIn">
                <Search size={12} className="text-teal-450 shrink-0" />
                <input
                  type="text"
                  placeholder="Search menus..."
                  value={menuSearch}
                  autoFocus
                  onBlur={() => {
                    if (!menuSearch) setIsSearchExpanded(false);
                  }}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-2xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                {menuSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuSearch("");
                      setIsSearchExpanded(false);
                    }}
                    className="text-[9px] text-slate-500 hover:text-slate-200"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchExpanded(false)}
                    className="text-[9px] text-slate-500 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                title="Search menus..."
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-teal-400 transition cursor-pointer"
              >
                <Search size={14} />
              </button>
            )}
          </div>
          <nav className="flex-1 max-w-4xl mx-2 flex items-center gap-2.5 py-1">
            {menuSearch ? (
              // Flat Search Results
              searchMenuResults.length === 0 ? (
                <span className="text-2xs text-slate-500 italic px-3 py-1">
                  No matching menus found
                </span>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {searchMenuResults.map((result) => {
                    const item = result.item;
                    const Icon = item.icon;
                    const isActive =
                      result.type === "sub"
                        ? getSubActive(item.id, result.sub.id)
                        : activeTab === item.id;
                    return (
                      <button
                        key={`${item.id}-${result.type}-${result.sub?.id || "main"}`}
                        onClick={() => navigateSearchResult(result)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-teal-400 text-slate-955 shadow shadow-teal-500/15"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                        }`}
                      >
                        <Icon size={13} />
                        <span>{result.path}</span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // Categorized Dropdowns
              <div className="flex items-center gap-1.5 z-50">
                {MENU_CATEGORIES.map((cat) => {
                  const catItems = filteredMenuItems.filter((item) =>
                    cat.items.includes(item.id),
                  );
                  if (catItems.length === 0) return null;

                  const isCatActive = catItems.some(
                    (item) => item.id === activeTab,
                  );
                  const isDropdownOpen = activeCategoryDropdown === cat.id;
                  const CatIcon = cat.icon;

                  return (
                    <div
                      key={cat.id}
                      className="relative"
                      onMouseLeave={() => setActiveCategoryDropdown(null)}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCategoryDropdown(
                            isDropdownOpen ? null : cat.id,
                          )
                        }
                        onMouseEnter={() => setActiveCategoryDropdown(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer select-none ${
                          isCatActive
                            ? "text-teal-450 bg-slate-800/90 shadow-sm shadow-teal-500/5"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        }`}
                      >
                        <CatIcon
                          size={13.5}
                          className={
                            isCatActive ? "text-teal-450" : "text-slate-400"
                          }
                        />
                        <span>{t(cat.id) || cat.label}</span>
                        <span className="text-[7.5px] opacity-60 ml-0.5 select-none transition-transform duration-200">
                          {isDropdownOpen ? "▲" : "▼"}
                        </span>
                      </button>

                      {isDropdownOpen && (
                        <div
                          className="absolute top-full left-0 pt-1.5 z-50"
                          onMouseEnter={() => setActiveCategoryDropdown(cat.id)}
                        >
                          <div className="w-60 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5">
                            {catItems.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setActiveTab(item.id);
                                    setActiveCategoryDropdown(null);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-left transition-all duration-150 cursor-pointer ${
                                    isActive
                                      ? "bg-teal-400 text-slate-955 font-bold"
                                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                                  }`}
                                >
                                  <Icon
                                    size={13}
                                    className={
                                      isActive
                                        ? "text-slate-955"
                                        : "text-slate-400"
                                    }
                                  />
                                  <span className="flex-1 truncate">
                                    {t(item.id) || item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("settings")}
              title={`${user.full_name} (${user.role}) - View Account Preferences & Profile`}
              className="flex items-center border-r border-teal-500/10 pr-3 cursor-pointer hover:opacity-80 transition text-left focus:outline-none"
            >
              <div className="h-7 w-7 rounded-full bg-slate-800 border border-teal-500/15 flex items-center justify-center overflow-hidden font-bold text-teal-400 text-2xs shadow shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.full_name?.substring(0, 2).toUpperCase()
                )}
              </div>
            </button>

            <NotificationBell user={user} onNavigate={handleNavigate} />
            <ThemeToggle themeMode={themeMode} onToggle={toggleLightDark} />

            <button
              onClick={() => setShowTour(true)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-teal-450 hover:border-teal-500/30 transition cursor-pointer"
              title="System Onboarding Tour"
            >
              <Compass className="h-4 w-4" />
            </button>

            {(user.email === "fredrickmakori102@gmail.com" ||
              user.email === "support@egesa.com") && (
              <button
                onClick={() => {
                  const updatedUser = {
                    ...user,
                    role:
                      user.email === "support@egesa.com"
                        ? "platform_support"
                        : "super_admin",
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
                  setPublicView("super_admin_dashboard");
                }}
                title="Systems Control Console"
                className="p-1.5 border border-yellow-500/10 hover:border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 rounded-lg transition duration-150 cursor-pointer shrink-0"
              >
                <ShieldCheck size={14} />
              </button>
            )}

            <button
              onClick={handleSignOut}
              title={t("signOut") || "Sign Out"}
              className="p-1.5 border border-teal-500/10 hover:border-red-500/30 bg-slate-900/50 hover:bg-red-500/5 text-slate-400 hover:text-red-400 rounded-lg transition duration-150 cursor-pointer shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-teal-500/10 flex flex-col shrink-0 transition-transform duration-300 transform ${
          menuLayout === "topbar"
            ? `md:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : `md:translate-x-0 md:static md:flex ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="p-4 border-b border-teal-500/10 flex items-center justify-between gap-2.5">
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-85 transition active:scale-[0.98]"
          >
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
        <div className="px-3 pt-2 pb-1.5 border-b border-teal-500/5">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-455 focus-within:border-teal-500 transition">
            <Search size={12} className="text-slate-505 shrink-0" />
            <input
              type="text"
              placeholder="Search menus..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="w-full bg-transparent border-none text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            {menuSearch && (
              <button
                type="button"
                onClick={() => setMenuSearch("")}
                className="text-[9px] hover:text-slate-205"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {menuSearch ? (
            // Flat Search Results
            searchMenuResults.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-[11px] font-medium italic">
                No matching menus found
              </div>
            ) : (
              <div className="space-y-1">
                {searchMenuResults.map((result) => {
                  const item = result.item;
                  const Icon = item.icon;
                  const isActive =
                    result.type === "sub"
                      ? getSubActive(item.id, result.sub.id)
                      : activeTab === item.id;
                  const hasSub = false;
                  return (
                    <div
                      key={`${item.id}-${result.type}-${result.sub?.id || "main"}`}
                      className="space-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => navigateSearchResult(result)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/15"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={15} />
                          <span className="text-left">{result.path}</span>
                        </div>
                        {hasSub && (
                          <span className="text-[8px] opacity-70">
                            {isActive ? "▼" : "▶"}
                          </span>
                        )}
                      </button>

                      {isActive && hasSub && (
                        <div className="ml-5 border-l border-slate-800 pl-3.5 py-1 space-y-1 text-left">
                          {item.subItems.map((sub) => {
                            const isSubActive = getSubActive(item.id, sub.id);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  handleSubClick(item.id, sub.id);
                                  setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left block py-1.5 px-2 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                                  isSubActive
                                    ? "text-teal-400 font-extrabold bg-teal-500/5 shadow-inner"
                                    : "text-slate-500 hover:text-slate-350 hover:bg-slate-800/30"
                                }`}
                              >
                                <span className="mr-1.5 text-[8px] text-teal-500/60">
                                  ✳
                                </span>
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Categorized Sections
            MENU_CATEGORIES.map((cat) => {
              const catItems = filteredMenuItems.filter((item) =>
                cat.items.includes(item.id),
              );
              if (catItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="text-[9.5px] font-black tracking-widest text-teal-400/60 uppercase px-3 pt-1 select-none">
                    {t(cat.id) || cat.label}
                  </div>
                  <div className="space-y-1">
                    {catItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const hasSub = item.subItems && item.subItems.length > 0;
                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                              isActive
                                ? "bg-teal-400 text-slate-955 shadow-md shadow-teal-500/15"
                                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                size={14.5}
                                className={
                                  isActive ? "text-slate-955" : "text-slate-400"
                                }
                              />
                              <span>{t(item.id) || item.label}</span>
                            </div>
                            {hasSub && (
                              <span className="text-[8px] opacity-70">
                                {isActive ? "▼" : "▶"}
                              </span>
                            )}
                          </button>

                          {isActive && hasSub && (
                            <div className="ml-5 border-l border-slate-800 pl-3.5 py-1 space-y-1 text-left">
                              {item.subItems.map((sub) => {
                                const isSubActive = getSubActive(
                                  item.id,
                                  sub.id,
                                );
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                      handleSubClick(item.id, sub.id);
                                      setIsSidebarOpen(false);
                                    }}
                                    className={`w-full text-left block py-1.5 px-2 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                                      isSubActive
                                        ? "text-teal-400 font-extrabold bg-teal-500/5 shadow-inner"
                                        : "text-slate-500 hover:text-slate-350 hover:bg-slate-800/30"
                                    }`}
                                  >
                                    <span className="mr-1.5 text-[8px] text-teal-500/60">
                                      ✳
                                    </span>
                                    {sub.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </nav>

        <div className="p-4 border-t border-teal-500/10 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("settings");
                setIsSidebarOpen(false);
              }}
              title="View Account Preferences & Profile"
              className="flex items-center gap-3 truncate flex-1 cursor-pointer hover:opacity-80 transition text-left focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-teal-500/15 flex items-center justify-center overflow-hidden font-bold text-teal-400 text-xs shadow shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.full_name?.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-slate-200 block truncate leading-snug">
                  {user.full_name}
                </span>
                <span className="font-['JetBrains_Mono',monospace] text-2xs text-teal-400 font-semibold uppercase block leading-none">
                  {user.role}
                </span>
              </div>
            </button>
            <NotificationBell user={user} onNavigate={handleNavigate} />
            <ThemeToggle themeMode={themeMode} onToggle={toggleLightDark} />
          </div>

          {(user.email === "fredrickmakori102@gmail.com" ||
            user.email === "support@egesa.com") && (
            <button
              onClick={() => {
                const updatedUser = {
                  ...user,
                  role:
                    user.email === "support@egesa.com"
                      ? "platform_support"
                      : "super_admin",
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
                setPublicView("super_admin_dashboard");
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
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition active:scale-[0.98]"
            >
              {renderLogo(user.facility_logo)}
              <span className="font-['Instrument_Serif',serif] text-[13px] text-slate-100 truncate max-w-45">
                {user.facility_name || "Eagle Tech"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell user={user} onNavigate={handleNavigate} />
            <ThemeToggle themeMode={themeMode} onToggle={toggleLightDark} />
            <span className="font-['JetBrains_Mono',monospace] text-2xs text-teal-400 font-semibold uppercase bg-teal-500/10 px-2 py-0.5 rounded">
              {user.role}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div
            className={
              menuLayout === "topbar" ? "max-w-7xl mx-auto w-full" : ""
            }
          >
            {(() => {
              const moduleKey = menuModuleKeys[activeTab];
              const isModuleDisabled =
                moduleKey &&
                activeModules &&
                activeModules[moduleKey] === false;
              if (isModuleDisabled) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl m-4 text-center">
                    <ShieldAlert
                      size={48}
                      className="text-red-500 mb-4 animate-pulse"
                    />
                    <h3 className="text-lg font-semibold text-slate-100">
                      Module Disabled
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-md">
                      This feature module has been disabled in the systems
                      configuration. Please contact the administrator to
                      activate it.
                    </p>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="mt-6 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg transition active:scale-[0.98] cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                );
              }
              return (
                <>
                  {activeTab === "dashboard" && (
                    <Dashboard user={user} onNavigate={handleNavigate} />
                  )}
                  {(activeTab === "registration" ||
                    activeTab === "triage" ||
                    activeTab === "queue" ||
                    activeTab === "reception") && (
                    <Reception
                      user={user}
                      initialSubTab={
                        activeTab === "reception" ? receptionSubTab : activeTab
                      }
                      handleNavigate={(tab, subId) => {
                        if (tab === "reception" && subId) {
                          const route = mapReceptionSubItemToRoute(subId);
                          setActiveTab(route.tab);
                          if (route.subTab) setReceptionSubTab(route.subTab);
                        } else {
                          setActiveTab(tab);
                        }
                      }}
                      preselectedPatient={preselectedPatient}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "consultation" && (
                    <Consultation
                      user={user}
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "orders" && (
                    <Orders
                      user={user}
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "radiology" && (
                    <Radiology
                      user={user}
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "surgery" && (
                    <Surgery
                      user={user}
                      onComplete={() => setActiveTab("dashboard")}
                    />
                  )}
                  {activeTab === "pharmacy" && (
                    <Pharmacy
                      user={user}
                      initialSubTab={pharmacySubTab}
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "pos" && (
                    <Pharmacy
                      user={user}
                      initialSubTab="sell"
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "billing" && (
                    <Billing
                      user={user}
                      initialSubTab={billingSubTab}
                      onComplete={() => setActiveTab("dashboard")}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "reports" && <Reports user={user} />}
                  {activeTab === "patient_dashboard" && <PatientDashboard />}
                  {activeTab === "ward" && (
                    <Ward user={user} showNotification={showNotification} />
                  )}
                  {activeTab === "maternity" &&
                    (isAdmin ||
                    (user.department?.toLowerCase() || "").includes(
                      "maternity",
                    ) ? (
                      <MaternityDashboard
                        user={user}
                        initialSubTab={maternitySubTab}
                        onClose={() => setActiveTab("dashboard")}
                        showNotification={showNotification}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl m-4 text-center">
                        <ShieldAlert
                          size={48}
                          className="text-red-500 mb-4 animate-pulse"
                        />
                        <h3 className="text-lg font-semibold text-slate-100">
                          Access Denied
                        </h3>
                        <p className="text-sm text-slate-400 mt-2 max-w-md">
                          You do not have permission to access the Maternity
                          Setup module. Please verify your department assignment
                          with an administrator.
                        </p>
                        <button
                          onClick={() => setActiveTab("dashboard")}
                          className="mt-6 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg transition active:scale-[0.98]"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    ))}
                  {activeTab === "mch" &&
                    (isAdmin ||
                    ["mch", "anc", "antenatal"].some((keyword) =>
                      (user.department?.toLowerCase() || "").includes(keyword),
                    ) ? (
                      <MCHDashboard
                        user={user}
                        initialSubTab={mchSubTab}
                        onClose={() => setActiveTab("dashboard")}
                        showNotification={showNotification}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl m-4 text-center">
                        <ShieldAlert
                          size={48}
                          className="text-red-500 mb-4 animate-pulse"
                        />
                        <h3 className="text-lg font-semibold text-slate-100">
                          Access Denied
                        </h3>
                        <p className="text-sm text-slate-400 mt-2 max-w-md">
                          You do not have permission to access the MCH Clinic
                          module. Please verify your department assignment with
                          an administrator.
                        </p>
                        <button
                          onClick={() => setActiveTab("dashboard")}
                          className="mt-6 bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg transition active:scale-[0.98]"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    ))}
                  {activeTab === "admin" && (
                    <Admin
                      user={user}
                      initialSubTab={adminSubTab}
                      onNavigate={handleNavigate}
                    />
                  )}
                  {activeTab === "procurement" && (
                    <OperationsDesk user={user} />
                  )}
                  {activeTab === "hr" && (
                    <HumanResourcesWrapper
                      user={user}
                      initialSubTab={hrSubTab}
                    />
                  )}
                  {activeTab === "payroll" && <Payroll user={user} />}
                  {activeTab === "maintenance" && (
                    <AssetsMaintenance user={user} />
                  )}
                  {activeTab === "settings" && (
                    <Preferences
                      currentTheme={theme}
                      onChangeTheme={handleThemeChange}
                      currentThemeMode={themeMode}
                      onChangeThemeMode={handleThemeModeChange}
                      currentMenuLayout={menuLayout}
                      onChangeMenuLayout={handleMenuLayoutChange}
                      currentLang={lang}
                      onChangeLang={handleLangChange}
                      currentFont={font}
                      onChangeFont={handleFontChange}
                      brightness={brightness}
                      onChangeBrightness={handleBrightnessChange}
                      nightVision={nightVision}
                      onChangeNightVision={handleNightVisionChange}
                      user={user}
                      setUser={setUser}
                    />
                  )}
                  {activeTab === "appointments" && (
                    <Appointments
                      user={user}
                      showNotification={showNotification}
                    />
                  )}
                  {activeTab === "support" && <SupportPanel />}
                  {![
                    "dashboard",
                    "registration",
                    "queue",
                    "triage",
                    "consultation",
                    "orders",
                    "radiology",
                    "surgery",
                    "pharmacy",
                    "pos",
                    "billing",
                    "reports",
                    "patient_dashboard",
                    "ward",
                    "maternity",
                    "mch",
                    "admin",
                    "settings",
                    "appointments",
                    "support",
                    "procurement",
                    "hr",
                    "maintenance",
                  ].includes(activeTab) && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-850 rounded-2xl m-4 text-center">
                      <ShieldAlert
                        size={48}
                        className="text-yellow-500 mb-4 animate-bounce"
                      />
                      <h3 className="text-lg font-bold text-slate-100">
                        404 - Page Not Found
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-md">
                        The requested module space or page "{activeTab}" is not
                        registered on this system or is unavailable for your
                        account.
                      </p>
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className="mt-6 bg-teal-400 hover:bg-teal-350 text-slate-955 font-bold text-xs py-2 px-6 rounded-lg transition active:scale-[0.98] cursor-pointer"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </main>

      {notification && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div
            className={`w-full max-w-sm bg-slate-900 border rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all ${
              notification.type === "success"
                ? "border-teal-500/30"
                : "border-rose-500/30"
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-teal-500 via-emerald-500 to-teal-650" />

            <div className="flex flex-col items-center text-center mt-2">
              <div
                className={`p-3 rounded-full mb-4 ${
                  notification.type === "success"
                    ? "bg-teal-500/10 text-teal-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle size={36} className="animate-pulse" />
                ) : (
                  <ShieldAlert size={36} className="animate-bounce" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-1.5">
                {notification.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs py-2.5 rounded-lg border border-slate-700/60 transition active:scale-[0.98] cursor-pointer"
            >
              Close Confirmation
            </button>
          </div>
        </div>
      )}

      {showTour && (
        <OnboardingTour
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
