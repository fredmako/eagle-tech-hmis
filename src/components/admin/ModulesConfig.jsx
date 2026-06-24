import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  LayoutDashboard, Settings, User, Calendar, Activity, Heart, ShieldAlert,
  ArrowRight, ShieldCheck, Check, Sliders, ChevronDown, ChevronRight, Menu, LogOut, Lock
} from 'lucide-react';

const gridModules = [
  { name: "Kitchen Module", key: "kitchen" },
  { name: "Reception Module", key: "reception" },
  { name: "Billing Module", key: "billing" },
  { name: "Reception Module", key: "reception" }, // repeated in screenshot
  { name: "Billing Module", key: "billing" },     // repeated in screenshot
  { name: "Doctors Module", key: "doctors" },
  { name: "Laboratory Module", key: "laboratory" },
  { name: "Pharmacy Module", key: "pharmacy" },
  { name: "Inpatient Module", key: "inpatient" },
  { name: "Procurement Module", key: "procurement" },
  { name: "HR Module", key: "hr" },
  { name: "Payroll Module", key: "payroll" },
  { name: "Finance Module", key: "finance" },
  { name: "Reports Module", key: "reports" },
  { name: "LastOffice Module", key: "lastoffice" },
  { name: "Maintenance Module", key: "maintenance" },
  { name: "Laundry Module", key: "laundry" },
  { name: "MCH Module", key: "mch" },
  { name: "Radiology Module", key: "radiology" },
  { name: "Theatre Module", key: "theatre" },
  { name: "Consultants Module", key: "consultants" },
  { name: "Night Shift Module", key: "night_shift" },
  { name: "HELP Module", key: "help" },
  { name: "Feedback Module", key: "feedback" },
  { name: "Payments Module", key: "payments" },
  { name: "Suppliers Management Module", key: "suppliers_management" },
  { name: "Maternity Module", key: "maternity" }
];

export default function ModulesConfig({ user, onClose }) {
  const [activeModules, setActiveModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [systemSetupOpen, setSystemSetupOpen] = useState(true);

  useEffect(() => {
    fetchActiveModules();
  }, []);

  const fetchActiveModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('active_modules')
        .eq('id', user.facility_id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.active_modules) {
        setActiveModules(data.active_modules);
      } else {
        // Fallback to all enabled
        const initial = {};
        gridModules.forEach(m => {
          initial[m.key] = true;
        });
        setActiveModules(initial);
      }
    } catch (err) {
      console.error('Error fetching active modules:', err);
      showToast('Failed to load active modules. Using defaults.', 'error');
      
      const initial = {};
      gridModules.forEach(m => {
        initial[m.key] = true;
      });
      setActiveModules(initial);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleToggleModule = async (moduleKey, moduleName) => {
    const nextState = !activeModules[moduleKey];
    const updatedModules = {
      ...activeModules,
      [moduleKey]: nextState
    };

    // Optimistic UI update
    setActiveModules(updatedModules);

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Save to facilities table
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'facilities',
          column: 'id',
          value: user.facility_id,
          values: { 
            active_modules: updatedModules
          }
        })
      });

      if (!res.ok) {
        throw new Error('Database update failed');
      }

      // Generate audit log for security compliance
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          docId: `log_${Date.now()}`,
          row: {
            facility_id: user.facility_id,
            user_id: user.id || 'admin',
            action: 'Toggle Module Config',
            details: `Module "${moduleName}" was ${nextState ? 'ENABLED' : 'DISABLED'} by Support Admin (${user.email || 'conrade@hosipoa.co.ke'})`
          }
        })
      });

      showToast(`Module "${moduleName}" ${nextState ? 'enabled' : 'disabled'} successfully.`, 'success');
    } catch (err) {
      console.error('Error toggling module:', err);
      // Revert UI state on failure
      setActiveModules(prev => ({
        ...prev,
        [moduleKey]: !nextState
      }));
      showToast(`Failed to update module state: ${err.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* 1. Header Bar (Bright Medical Blue) */}
      <header className="h-14 bg-[#0066FF] flex items-center justify-between px-4 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)} 
            className="text-white hover:bg-white/10 p-1.5 rounded transition cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
              <Heart size={18} className="text-white fill-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-wider uppercase font-sans">
              Hosi Poa
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-l border-white/20 pl-4 py-1">
            <div className="h-7 w-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-bold text-white text-xs shadow-inner">
              SA
            </div>
            <div className="text-left leading-none">
              <span className="text-[11px] font-bold text-white block">Support Admin</span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-mono">conrade@hosipoa.co.ke</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            title="Exit System Setup"
            className="text-white hover:bg-red-600 hover:text-white p-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Left Sidebar (Dark Charcoal Slate) */}
        <aside 
          className={`bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ${
            sidebarExpanded ? 'w-64' : 'w-0 overflow-hidden'
          }`}
        >
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>

            {/* Dropdown System Setup (Active) */}
            <div className="space-y-1">
              <button 
                onClick={() => setSystemSetupOpen(!systemSetupOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-[12px] font-bold text-slate-100 bg-[#8B0000]/10 border-l-4 border-red-700 hover:bg-[#8B0000]/15 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings size={14} className="text-red-500" />
                  <span>System Setup</span>
                </div>
                {systemSetupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {systemSetupOpen && (
                <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 py-1">
                  {[
                    "Core Systems",
                    "Clinic Setup Administration",
                    "System Modules",
                    "Modules Config",
                    "System Configs",
                    "Function Configs",
                    "Performc Configs",
                    "System Pages Config",
                    "Users Management",
                    "User Permissions",
                    "User Grouping",
                    "User Reset Logins",
                    "User Permission Details",
                    "User Notifications Config",
                    "Department Permissions"
                  ].map((subItem) => {
                    const isActive = subItem === "Modules Config";
                    return (
                      <button 
                        key={subItem}
                        className={`w-full text-left px-3 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          isActive 
                            ? 'text-white bg-[#0066FF] font-semibold shadow-sm' 
                            : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850'
                        }`}
                      >
                        {subItem}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {[
              "Facility Management",
              "Products & Services",
              "Insurance Management",
              "Server Status",
              "Sha Pay Settings",
              "System Audit Report"
            ].map((menuItem) => (
              <button key={menuItem} className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
                <Sliders size={14} className="text-slate-500" />
                <span>{menuItem}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 3. Central Configuration View */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col min-w-0">
          
          {/* Breadcrumbs & Title */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-light text-slate-100 font-sans tracking-wide">System Configuration</h1>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Home / Module Select &gt; <span className="text-[#0066FF]">System Configuration</span>
              </div>
            </div>
          </div>

          {/* Main Grid: Split Layout */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0">
            
            {/* Left Card: Metadata Profile, Branding, Calendar */}
            <div className="xl:col-span-1 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col items-center text-center shadow-md">
                <div className="h-20 w-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-3xl mb-4 shadow-inner">
                  <User size={36} className="text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">Support Admin</h3>
                <span className="text-[11px] text-slate-500 font-mono mt-1">conrade@hosipoa.co.ke</span>
              </div>

              {/* Date Card */}
              <div className="bg-[#0066FF] text-white rounded-lg p-3.5 flex items-center gap-3 shadow-md">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Calendar size={18} className="text-white" />
                </div>
                <div className="leading-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">System Clock</span>
                  <span className="text-sm font-black block mt-1 font-mono">24-Jun-2026</span>
                </div>
              </div>

              {/* Branding / Partner Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col items-center text-center shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#10b981]" />
                <div className="border border-[#10b981]/50 rounded px-6 py-4 mt-2 mb-2 w-full max-w-[200px]">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#10b981] block">THE NAIROBI</span>
                  <span className="text-sm uppercase font-black tracking-widest text-red-500 block mt-0.5">HOSPITAL</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-3">
                  Powered by TCL &copy; 2026 | VER 4.0
                </div>
              </div>

            </div>

            {/* Right Card: Core Modules Grid */}
            <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col shadow-md min-h-[480px]">
              
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6 shrink-0">
                <Sliders className="text-[#0066FF]" size={16} />
                <h2 className="text-sm font-extrabold uppercase text-slate-100 tracking-wider">
                  Core System Module Configuration
                </h2>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0066FF] border-t-transparent" />
                  <span className="text-xs font-mono">Retrieving tenant configuration...</span>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 overflow-y-auto pr-1">
                  {gridModules.map((module, index) => {
                    const isEnabled = !!activeModules[module.key];
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/60 rounded-lg hover:border-slate-850 hover:bg-slate-950/60 transition"
                      >
                        <span className="text-xs font-bold text-slate-300 pr-2">
                          {module.name}
                        </span>
                        
                        <button
                          onClick={() => handleToggleModule(module.key, module.name)}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none shrink-0 ${
                            isEnabled ? 'bg-[#0066FF]' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md ${
                              isEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

        </main>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
            toast.type === 'error' ? 'bg-red-500/20' : 'bg-emerald-500/20'
          }`}>
            {toast.type === 'error' ? <ShieldAlert size={12} /> : <Check size={12} />}
          </div>
          <span className="text-xs font-bold font-sans">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
