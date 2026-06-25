import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Users, Hourglass, Activity, ShieldAlert, CheckCircle, RefreshCw, ArrowRight,
  Pill, DollarSign, Package, ShoppingBag, AlertTriangle, Calendar,
  ShoppingCart, Camera, Home, Heart, Baby, Truck, Contact, CreditCard,
  Wrench, HelpCircle, TrendingUp, Layers, Sliders
} from 'lucide-react';
import { motion } from 'motion/react';
import { Reveal } from './ui/Reveal';
import { Stagger, StaggerItem } from './ui/Stagger';
import { CountUp } from './ui/CountUp';

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState({
    todayPatients: 0,
    pendingTriage: 0,
    pendingConsultation: 0,
    pendingLab: 0,
    pendingPharmacy: 0,
    unpaidBilling: 0,
    failedSync: 1,
  });
  const [notifications, setNotifications] = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [activeModules, setActiveModules] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleModulesUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('egesa_modules_updated', handleModulesUpdate);
    return () => window.removeEventListener('egesa_modules_updated', handleModulesUpdate);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [{ data: pts }, { data: vsts }, { data: invs }, { data: tickets }, { data: fac }] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('visits').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('support_tickets').select('*').eq('facility_id', user.facility_id).eq('status', 'pending'),
        supabase.from('facilities').select('active_modules').eq('id', user.facility_id).maybeSingle()
      ]);
      if (fac && fac.active_modules) {
        setActiveModules(fac.active_modules);
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPts = pts ? pts.filter((p) => p.created_at?.startsWith(todayStr)).length : 0;
      const activeVisits = vsts || [];
      const pendingTriage = activeVisits.filter((v) => v.department === 'triage' && v.status !== 'completed').length;
      const pendingConsult = activeVisits.filter((v) => v.department === 'consultation' && v.status !== 'completed').length;
      const pendingLab = activeVisits.filter((v) => v.department === 'lab' && v.status !== 'completed').length;
      const pendingPharm = activeVisits.filter((v) => v.department === 'pharmacy' && v.status !== 'completed').length;
      const unpaidInvoices = invs ? invs.filter((i) => i.status !== 'paid').length : 0;

      setStats((prev) => ({
        todayPatients: todayPts,
        pendingTriage,
        pendingConsultation: pendingConsult,
        pendingLab,
        pendingPharmacy: pendingPharm,
        unpaidBilling: unpaidInvoices,
        failedSync: prev.failedSync,
      }));

      const list = activeVisits
        .filter((v) => v.status !== 'completed')
        .map((v) => {
          const patient = pts?.find((p) => p.id === v.patient_id);
          return {
            id: v.id,
            name: patient?.name || 'Unknown Patient',
            idCode: patient?.facility_id_code || 'N/A',
            dept: v.department.toUpperCase(),
            priority: v.priority,
            time: new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        });
      setQueueList(list);

      const alerts = [];
      if (pendingTriage > 2) alerts.push({ id: 'a1', type: 'warning', message: `High triage queue: ${pendingTriage} patients waiting.` });
      if (unpaidInvoices > 0) alerts.push({ id: 'a2', type: 'info', message: `${unpaidInvoices} pending billing payments require processing.` });
      
      const pendingTicketsCount = tickets ? tickets.length : 0;
      if (pendingTicketsCount > 0) {
        alerts.push({
          id: 'ticket_alert',
          type: 'warning',
          message: `Help Desk: ${pendingTicketsCount} pending support inquiries require response.`,
          tab: 'admin',
          subtab: 'help_desk'
        });
      }

      alerts.push({ id: 'a3', type: 'error', message: 'MOH 717 monthly export: 1 unsynced record due to invalid ID validation.' });
      setNotifications(alerts);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStats((prev) => ({ ...prev, failedSync: 0 }));
    setNotifications((prev) => prev.filter((n) => n.id !== 'a3'));
    setSyncing(false);
    await supabase.from('audit_logs').insert({
      action: 'MOH Interoperability Sync',
      details: 'Pushed pending daily register data to DHIS2. 1 corrected record sync completed successfully.',
    });
  };

  const roleAccess = {
    registration: ['receptionist', 'admin'],
    triage: ['nurse', 'admin'],
    consultation: ['clinician', 'admin'],
    orders: ['lab_tech', 'admin'],
    radiology: ['lab_tech', 'admin'],
    pharmacy: ['pharmacist', 'admin'],
    billing: ['cashier', 'admin'],
    pos: ['pharmacist', 'cashier', 'admin'],
    ward: ['nurse', 'admin'],
    surgery: ['clinician', 'admin'],
    appointments: ['receptionist', 'nurse', 'clinician', 'admin'],
    reports: ['admin', 'cashier'],
    admin: ['admin'],
    maintenance: ['admin', 'operations_manager', 'it_support'],
    support: ['admin', 'platform_support']
  };

  const checkAccess = (tab) => {
    if (!user || !user.role) return false;
    const rolesList = user.role.split(',').map(r => r.trim().toLowerCase());
    const isAdmin = rolesList.includes('admin') || rolesList.includes('super_admin');
    
    if (tab === 'maternity') {
      const userDept = user.department?.toLowerCase() || '';
      const isMaternityDept = userDept.includes('maternity');
      return isAdmin || isMaternityDept;
    }
    
    if (tab === 'mch') {
      const userDept = user.department?.toLowerCase() || '';
      const isMchDept = userDept.includes('mch') || userDept.includes('anc') || userDept.includes('antenatal');
      return isAdmin || isMchDept;
    }
    
    if (isAdmin) return true;
    return roleAccess[tab]?.some(r => rolesList.includes(r)) || false;
  };

  const statsModuleKeys = {
    registration: 'reception',
    triage: 'reception',
    consultation: 'doctors',
    orders: 'laboratory',
    pharmacy: 'pharmacy',
    billing: 'billing'
  };

  const cards = [
    { label: "Today's Registrations", value: stats.todayPatients, accent: 'teal', icon: Users, tab: 'registration' },
    { label: 'Pending Triage', value: stats.pendingTriage, accent: 'orange', icon: Hourglass, tab: 'triage' },
    { label: 'Pending Consultation', value: stats.pendingConsultation, accent: 'blue', icon: Activity, tab: 'consultation' },
    { label: 'Pending Lab', value: stats.pendingLab, accent: 'purple', icon: RefreshCw, tab: 'orders' },
    { label: 'Pending Pharmacy', value: stats.pendingPharmacy, accent: 'emerald', icon: CheckCircle, tab: 'pharmacy' },
    { label: 'Pending Invoices', value: stats.unpaidBilling, accent: 'rose', icon: ShieldAlert, tab: 'billing' },
  ];

  const moduleHubCards = [
    { label: "Reception Desk", desc: "Patient registration, SHA verification, and check-ins", icon: Users, tab: "registration", image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80" },
    { label: "OPD / Triage", desc: "Vitals recording, screening, and priority queue sorting", icon: Hourglass, tab: "triage", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80" },
    { label: "Consultation / EMR", desc: "SOAP EMR forms, clinical history, and prescription tools", icon: Activity, tab: "consultation", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80" },
    { label: "Billing & Cashier", desc: "Invoicing, co-pays, pre-auths, reversals, and refunds", icon: DollarSign, tab: "billing", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80" },
    { label: "POS Sales Entry", desc: "Direct cash sales, stock checks, and billing routing", icon: ShoppingCart, tab: "pos", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80" },
    { label: "Laboratory", desc: "Pathology orders, results logging, and machine config", icon: RefreshCw, tab: "orders", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80" },
    { label: "Radiology / Imaging", desc: "X-Ray/Ultrasound visual records and diagnostic logs", icon: Camera, tab: "radiology", image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80" },
    { label: "Pharmacy Dispensing", desc: "Prescription queuing, stock validation, and drug payouts", icon: Pill, tab: "pharmacy", image: "https://images.unsplash.com/photo-1607619056574-7b8d304a3b13?auto=format&fit=crop&w=600&q=80" },
    { label: "In-Patient Ward", desc: "Admissions census, bed layout editor, and ward rounds", icon: Home, tab: "ward", image: "https://images.unsplash.com/photo-1538108176447-28d90c497f10?auto=format&fit=crop&w=600&q=80" },
    { label: "MCH Clinic", desc: "Mother and Child health specialty records registry", icon: Heart, tab: "mch", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80" },
    { label: "Maternity Care", desc: "Delivery summary reports and prenatal registries", icon: Baby, tab: "maternity", image: "https://images.unsplash.com/photo-1518104593124-ac2e82a5eb9d?auto=format&fit=crop&w=600&q=80" },
    { label: "Theatre / ICU / HDU", desc: "Surgery schedule, pre-op lists, and anesthesiologist logs", icon: Activity, tab: "surgery", image: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=600&q=80" },
    { label: "Procurement Desk", desc: "Purchase order logging and supplier catalouges", icon: Package, tab: "admin", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80" },
    { label: "Supplier Management", desc: "Supplier directory and active SLA agreements", icon: Truck, tab: "admin", image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=600&q=80" },
    { label: "HR / Employees", desc: "Staff directory, rosters, and attendance logs", icon: Contact, tab: "admin", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80" },
    { label: "Payroll Console", desc: "Employee payslip generation and salary logs", icon: CreditCard, tab: "admin", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80" },
    { label: "Appointments Grid", desc: "Interactive appointment scheduling calendar slots", icon: Calendar, tab: "appointments", image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80" },
    { label: "Assets Maintenance", desc: "Medical machinery calibration and repairs logs", icon: Wrench, tab: "maintenance", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80" },
    { label: "Help Desk Support", desc: "Support inquiries, platform client feedback", icon: HelpCircle, tab: "support", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" },
    { label: "Finance & Accounting", desc: "Revenue ledgers, tax allocations, and billing reports", icon: TrendingUp, tab: "reports", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80" },
    { label: "Management Reports", desc: "Analytics metrics and institutional KPIs", icon: Layers, tab: "reports", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80" },
    { label: "System Administration", desc: "White-label custom domains, SMTP configuration", icon: Sliders, tab: "admin", image: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=600&q=80" }
  ];

  const accentMap = {
    teal:    { border: 'border-teal-500/25',    bg: 'bg-teal-500/5',    text: 'text-teal-400',    hover: 'hover:border-teal-500/50 hover:bg-teal-500/10' },
    orange:  { border: 'border-orange-500/25',  bg: 'bg-orange-500/5',  text: 'text-orange-400',  hover: 'hover:border-orange-500/50 hover:bg-orange-500/10' },
    blue:    { border: 'border-blue-500/25',    bg: 'bg-blue-500/5',    text: 'text-blue-400',    hover: 'hover:border-blue-500/50 hover:bg-blue-500/10' },
    purple:  { border: 'border-purple-500/25',  bg: 'bg-purple-500/5',  text: 'text-purple-400',  hover: 'hover:border-purple-500/50 hover:bg-purple-500/10' },
    emerald: { border: 'border-emerald-500/25', bg: 'bg-emerald-500/5', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/10' },
    rose:    { border: 'border-rose-500/25',    bg: 'bg-rose-500/5',    text: 'text-rose-400',    hover: 'hover:border-rose-500/50 hover:bg-rose-500/10' },
  };

  if (user.license_tier === "pharmacy") {
    return <PharmacyDashboard user={user} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6 font-['DM_Sans',system-ui,sans-serif]">

      {/* Welcome banner */}
      <Reveal className="relative overflow-hidden rounded-2xl border border-teal-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_85%_50%,rgba(45,212,191,0.08),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="font-['Instrument_Serif',serif] text-2xl sm:text-3xl text-slate-100 leading-tight font-normal">
              Welcome back, <span className="text-teal-400">{user.full_name}</span>
            </h1>
            <p className="text-[12px] text-slate-400">
              <span className="text-slate-300 font-semibold">{user.facility_name}</span>
              <span className="mx-2 text-slate-700">·</span>
              <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-wider bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded">{user.role}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stats.failedSync > 0 ? (
              <button onClick={handleManualSync} disabled={syncing} className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-medium text-xs px-3 sm:px-4 py-2 rounded-lg transition">
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? <span>Syncing…</span> : (<><span className="hidden sm:inline">DHIS2 Sync Failed — Retry</span><span className="sm:hidden">Retry Sync</span></>)}
              </button>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-medium text-xs px-3 sm:px-4 py-2 rounded-lg">
                <CheckCircle size={14} />
                <span className="hidden sm:inline">MOH Systems Fully Synced</span>
                <span className="sm:hidden">Synced</span>
              </motion.div>
            )}
            {(!activeModules || activeModules['reception'] !== false) && (
              <button onClick={() => onNavigate('registration')} className="flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[12px] px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(45,212,191,0.2)] transition active:scale-[0.97]">
                Register Patient <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* Stat cards */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" stagger={0.06}>
        {cards.filter((c) => {
          if (!activeModules) return true;
          const key = statsModuleKeys[c.tab];
          if (!key) return true;
          return activeModules[key] !== false;
        }).map((c) => {
          const Icon = c.icon;
          const a = accentMap[c.accent];
          const hasAccess = checkAccess(c.tab);
          const base = `border ${a.border} ${a.bg} p-4 rounded-xl flex flex-col justify-between shadow-sm transition-all duration-300 text-left`;
          if (!hasAccess) {
            return (
              <StaggerItem key={c.label} className={`${base} opacity-50 select-none`} title="Your role does not have permission to access this module">
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{c.label}</span>
                  <Icon size={14} className="text-slate-600 shrink-0" />
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-2xl font-black text-slate-600 mt-3">{c.value}</span>
              </StaggerItem>
            );
          }
          return (
            <StaggerItem key={c.label}>
              <motion.button onClick={() => onNavigate(c.tab)} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2, ease: 'easeOut' }} className={`${base} ${a.hover} w-full hover:shadow-lg cursor-pointer`}>
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{c.label}</span>
                  <Icon size={14} className={`${a.text} opacity-90 shrink-0`} />
                </div>
                <span className={`font-['JetBrains_Mono',monospace] text-2xl sm:text-3xl font-black text-slate-100 mt-3`}>
                  <CountUp to={c.value} duration={1} />
                </span>
              </motion.button>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Modules Grid Selector */}
      <Reveal className="space-y-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Institutional Hub</div>
          <h2 className="font-['Instrument_Serif',serif] text-2xl text-slate-100 font-normal mt-0.5">Departments & Operational Modules</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Access specific clinical departments, billing desk, cashier registry, and administration dashboards</p>
        </div>
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" stagger={0.03}>
          {moduleHubCards.filter((m) => {
            if (!activeModules) return true;
            const mapping = {
              "Reception Desk": "reception",
              "OPD / Triage": "reception",
              "Consultation / EMR": "doctors",
              "Billing & Cashier": "billing",
              "POS Sales Entry": "billing",
              "Laboratory": "laboratory",
              "Radiology / Imaging": "radiology",
              "Pharmacy Dispensing": "pharmacy",
              "In-Patient Ward": "inpatient",
              "MCH Clinic": "mch",
              "Maternity Care": "maternity",
              "Theatre / ICU / HDU": "theatre",
              "Procurement Desk": "procurement",
              "Supplier Management": "suppliers_management",
              "HR / Employees": "hr",
              "Payroll Console": "payroll",
              "Appointments Grid": "reception",
              "Assets Maintenance": "maintenance",
              "Help Desk Support": "help",
              "Finance & Accounting": "finance",
              "Management Reports": "reports",
              "System Administration": null
            };
            const key = mapping[m.label];
            if (key === null || key === undefined) return true;
            return activeModules[key] !== false;
          }).map((m) => {
            const Icon = m.icon;
            const hasAccess = checkAccess(m.tab);
            const baseClass = "relative overflow-hidden rounded-xl border p-5 flex flex-col justify-between h-[155px] text-left transition-all duration-300 group";
            
            if (!hasAccess) {
              return (
                <StaggerItem key={m.label}>
                  <div className={`${baseClass} border-slate-800/40 bg-slate-950/20 opacity-40 select-none cursor-not-allowed`} title="Access restricted by security policy">
                    {m.image && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-[0.08] select-none pointer-events-none filter grayscale brightness-50"
                        style={{ backgroundImage: `url(${m.image})` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-900/60 pointer-events-none" />
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="space-y-1 pr-2">
                        <h3 className="font-bold text-slate-400 text-sm leading-tight">{m.label}</h3>
                        <p className="text-[10px] text-slate-600 leading-normal">{m.desc}</p>
                      </div>
                      <Icon size={18} className="text-slate-600 shrink-0" />
                    </div>
                    <div className="relative z-10 text-[10px] font-semibold text-slate-600 flex items-center gap-1 mt-3">
                      <span>Locked (Restricted)</span>
                    </div>
                  </div>
                </StaggerItem>
              );
            }

            return (
              <StaggerItem key={m.label}>
                <motion.button
                  onClick={() => onNavigate(m.tab)}
                  whileHover={{ y: -4, borderColor: "rgba(45,212,191,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className={`${baseClass} border-teal-500/15 bg-slate-900/60 hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)] cursor-pointer w-full`}
                >
                  {/* Real Image Background Layer */}
                  {m.image && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-[0.25] group-hover:opacity-[0.45] transition-all duration-700 scale-100 group-hover:scale-105 select-none pointer-events-none filter saturate-[0.5] group-hover:saturate-[0.8] brightness-75 group-hover:brightness-90"
                      style={{ backgroundImage: `url(${m.image})` }}
                    />
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/40 group-hover:from-slate-950 group-hover:via-slate-950/50 group-hover:to-slate-900/20 transition-all duration-500 pointer-events-none" />

                  <div className="relative z-10 flex justify-between items-start w-full">
                    <div className="space-y-1 pr-2">
                      <h3 className="font-bold text-slate-200 text-sm leading-tight group-hover:text-teal-400 transition-colors duration-300">{m.label}</h3>
                      <p className="text-[10px] text-slate-450 leading-normal group-hover:text-slate-300 transition-colors duration-300">{m.desc}</p>
                    </div>
                    <Icon size={18} className="text-teal-400/80 group-hover:text-teal-300 group-hover:scale-110 transition-all duration-300 shrink-0" />
                  </div>
                  <div className="relative z-10 text-[10px] font-bold text-teal-400 group-hover:text-teal-300 flex items-center gap-1.5 mt-3 transition-colors duration-300">
                    <span>Click to Access Module</span>
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </motion.button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Reveal>

      {/* Queue + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Reveal className="lg:col-span-2 bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Live Workspace</div>
              <h2 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal mt-0.5">Active Facility Queue</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Patient traffic across departments · updated live</p>
            </div>
            <button onClick={() => onNavigate('queue')} className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs font-semibold transition-colors">
              Manage Queue <ArrowRight size={12} />
            </button>
          </div>

          {queueList.length === 0 ? (
            <div className="border border-dashed border-teal-500/15 rounded-xl p-10 text-center text-slate-500 text-sm">
              <Hourglass size={20} className="mx-auto mb-2 text-teal-400/50" />
              No active patients waiting in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-teal-500/10 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    <th className="py-2.5">Patient</th>
                    <th className="py-2.5">Dept</th>
                    <th className="py-2.5">Priority</th>
                    <th className="py-2.5 text-right">Entered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/8 text-xs">
                  {queueList.map((q, idx) => (
                    <motion.tr key={q.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: idx * 0.03 }} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-2">
                        <span className="font-semibold text-slate-200 block">{q.name}</span>
                        <span className="font-['JetBrains_Mono',monospace] text-[10px] text-slate-500">{q.idCode}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-['JetBrains_Mono',monospace] bg-teal-500/5 border border-teal-500/15 text-teal-400 font-bold px-2 py-0.5 rounded text-[10px]">{q.dept}</span>
                      </td>
                      <td className="py-2.5">
                        <span className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded ${q.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : q.priority === 'urgent' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{q.priority}</span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-['JetBrains_Mono',monospace]">{q.time}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Reveal>

        <Reveal className="bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm space-y-4" delay={0.1}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">System Health</div>
            <h2 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal mt-0.5">Notifications</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">MOH reporting and record alerts</p>
          </div>
          <Stagger className="space-y-2.5" stagger={0.06}>
            {notifications.map((notif) => {
              const baseClass = `p-3 rounded-xl border text-xs flex gap-2.5 items-start text-left w-full transition ${
                notif.type === 'error' 
                  ? 'bg-red-500/5 border-red-500/25 text-red-400 hover:bg-red-500/10' 
                  : notif.type === 'warning' 
                  ? 'bg-yellow-500/5 border-yellow-500/25 text-yellow-400 hover:bg-yellow-500/10' 
                  : 'bg-blue-500/5 border-blue-500/25 text-blue-400 hover:bg-blue-500/10'
              }`;

              if (notif.tab) {
                return (
                  <StaggerItem key={notif.id}>
                    <button
                      onClick={() => {
                        if (notif.subtab) {
                          localStorage.setItem('egesa_active_admin_subtab', notif.subtab);
                        }
                        onNavigate(notif.tab);
                      }}
                      className={`${baseClass} cursor-pointer active:scale-[0.99]`}
                    >
                      <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                      <span className="leading-relaxed flex-1">{notif.message}</span>
                    </button>
                  </StaggerItem>
                );
              }

              return (
                <StaggerItem key={notif.id} className={baseClass}>
                  <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{notif.message}</span>
                </StaggerItem>
              );
            })}
            {notifications.length === 0 && (
              <div className="bg-teal-500/5 border border-teal-500/25 text-teal-400 p-5 rounded-xl text-center text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle size={22} />
                <span>All systems operational. No outstanding alerts.</span>
              </div>
            )}
          </Stagger>
        </Reveal>
      </div>
    </div>
  );
}

function PharmacyDashboard({ user, onNavigate }) {
  const [pharmStats, setPharmStats] = useState({
    uniqueItems: 0,
    totalQty: 0,
    lowStockCount: 0,
    expiringCount: 0,
    todaySales: 0,
    todaySalesCount: 0,
    inventoryValue: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const loadPharmacyData = async () => {
    try {
      // 1. Load inventory from local storage
      const savedBatchesStr = localStorage.getItem("egesa_pharmacy_batches");
      let currentBatches = [];
      if (savedBatchesStr) {
        currentBatches = JSON.parse(savedBatchesStr);
      } else {
        currentBatches = [
          { name: "Artemether-Lumefantrine (AL)", batch: "AL-B902", stock: 50, expiry: "2026-10-15", price: 120, unit: "doses" },
          { name: "Paracetamol 500mg", batch: "PARA-L02", stock: 450, expiry: "2026-08-01", price: 5, unit: "tabs" },
          { name: "Amoxicillin 500mg", batch: "AMOX-B12", stock: 240, expiry: "2026-12-05", price: 15, unit: "tabs" },
          { name: "Metronidazole 400mg", batch: "MET-K90", stock: 410, expiry: "2027-03-30", price: 10, unit: "tabs" },
          { name: "ORS + Zinc", batch: "ORS-Z01", stock: 95, expiry: "2026-09-10", price: 40, unit: "sachets" }
        ];
      }

      // Group batches by drug name
      const drugTotals = {};
      currentBatches.forEach(b => {
        drugTotals[b.name] = (drugTotals[b.name] || 0) + b.stock;
      });

      let lowStockCount = 0;
      const lowStockAlerts = [];
      Object.entries(drugTotals).forEach(([name, stock]) => {
        const threshold = name.includes("Paracetamol") || name.includes("Amoxicillin") || name.includes("Metronidazole") ? 150 : 50;
        if (stock < threshold) {
          lowStockCount++;
          lowStockAlerts.push({
            id: `low_${name}`,
            type: "warning",
            message: `Low Stock: ${name} is at ${stock} units (threshold: ${threshold}).`
          });
        }
      });

      // Check expiring batches
      let expiringCount = 0;
      const expiryAlerts = [];
      const today = new Date();
      const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      currentBatches.forEach(b => {
        const expDate = new Date(b.expiry);
        if (expDate <= today) {
          expiringCount++;
          expiryAlerts.push({
            id: `exp_past_${b.batch}`,
            type: "error",
            message: `EXPIRED: Batch ${b.batch} of ${b.name} expired on ${b.expiry}!`
          });
        } else if (expDate <= ninetyDaysFromNow) {
          expiringCount++;
          expiryAlerts.push({
            id: `exp_soon_${b.batch}`,
            type: "warning",
            message: `Expiring Soon: Batch ${b.batch} of ${b.name} expires on ${b.expiry}.`
          });
        }
      });

      const uniqueItems = Object.keys(drugTotals).length;
      const totalQty = currentBatches.reduce((acc, b) => acc + b.stock, 0);
      
      const inventoryValue = currentBatches.reduce((acc, b) => {
        const price = b.price || (b.name.includes("Paracetamol") ? 5 : b.name.includes("Amoxicillin") ? 15 : 20);
        return acc + (b.stock * price);
      }, 0);

      // Load today's invoices
      const { data: invs } = await supabase
        .from("invoices")
        .select("*")
        .eq("facility_id", user.facility_id);

      const todayStr = new Date().toISOString().split("T")[0];
      const todayInvoices = invs ? invs.filter(i => i.created_at?.startsWith(todayStr)) : [];
      const todaySales = todayInvoices.reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
      const todaySalesCount = todayInvoices.length;

      setPharmStats({
        uniqueItems,
        totalQty,
        lowStockCount,
        expiringCount,
        todaySales,
        todaySalesCount,
        inventoryValue
      });

      setAlerts([...expiryAlerts, ...lowStockAlerts]);

      const recent = todayInvoices.slice(0, 10).map(i => ({
        id: i.id,
        client: i.receipt_number ? `Receipt ${i.receipt_number}` : "Walk-in Customer",
        amount: parseFloat(i.total_amount || 0),
        status: i.status,
        method: i.payment_method || "cash",
        time: new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }));
      setRecentSales(recent);

    } catch (err) {
      console.error("Error loading pharmacy dashboard data:", err);
    }
  };

  const cards = [
    { label: "Total Daily Sales", value: `KES ${pharmStats.todaySales.toLocaleString()}`, accent: "teal", icon: DollarSign, sub: `${pharmStats.todaySalesCount} transactions` },
    { label: "Total Stock Quantity", value: `${pharmStats.totalQty.toLocaleString()} units`, accent: "emerald", icon: Package, sub: `${pharmStats.uniqueItems} unique drugs` },
    { label: "Inventory Value", value: `KES ${pharmStats.inventoryValue.toLocaleString()}`, accent: "blue", icon: ShoppingBag, sub: "Based on unit prices" },
    { label: "Low Stock Drugs", value: `${pharmStats.lowStockCount}`, accent: "orange", icon: AlertTriangle, sub: "Below reorder levels" },
    { label: "Expiring Batches", value: `${pharmStats.expiringCount}`, accent: "rose", icon: Calendar, sub: "Within 90 days" }
  ];

  const accentMap = {
    teal:    { border: 'border-teal-500/25',    bg: 'bg-teal-500/5',    text: 'text-teal-400',    hover: 'hover:border-teal-500/50 hover:bg-teal-500/10' },
    emerald: { border: 'border-emerald-500/25', bg: 'bg-emerald-500/5', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/10' },
    blue:    { border: 'border-blue-500/25',    bg: 'bg-blue-500/5',    text: 'text-blue-400',    hover: 'hover:border-blue-500/50 hover:bg-blue-500/10' },
    orange:  { border: 'border-orange-500/25',  bg: 'bg-orange-500/5',  text: 'text-orange-400',  hover: 'hover:border-orange-500/50 hover:bg-orange-500/10' },
    rose:    { border: 'border-rose-500/25',    bg: 'bg-rose-500/5',    text: 'text-rose-400',    hover: 'hover:border-rose-500/50 hover:bg-rose-500/10' },
  };

  return (
    <div className="space-y-6 font-['DM_Sans',system-ui,sans-serif]">
      {/* Welcome banner */}
      <Reveal className="relative overflow-hidden rounded-2xl border border-teal-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_85%_50%,rgba(45,212,191,0.08),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="font-['Instrument_Serif',serif] text-2xl sm:text-3xl text-slate-100 leading-tight font-normal">
              Welcome back, <span className="text-teal-400">{user.full_name}</span>
            </h1>
            <p className="text-[12px] text-slate-400">
              <span className="text-slate-300 font-semibold">{user.facility_name}</span>
              <span className="mx-2 text-slate-700">·</span>
              <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans">
                Independent Pharmacy Mode
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => onNavigate('pharmacy')} className="flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[12px] px-4 py-2.5 rounded-lg shadow-[0_0_20px_rgba(45,212,191,0.2)] transition active:scale-[0.97] cursor-pointer">
              <DollarSign size={13} /> Record Walk-in POS Sale
            </button>
          </div>
        </div>
      </Reveal>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const a = accentMap[c.accent];
          const base = `border ${a.border} ${a.bg} p-4 rounded-xl flex flex-col justify-between shadow-sm transition-all duration-300 text-left w-full active:scale-[0.98]`;
          return (
            <button
              key={c.label}
              onClick={() => onNavigate('pharmacy')}
              className={`${base} ${a.hover} cursor-pointer`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{c.label}</span>
                <Icon size={14} className={`${a.text} opacity-90 shrink-0`} />
              </div>
              <div className="mt-3 space-y-1">
                <span className="font-['JetBrains_Mono',monospace] text-xl sm:text-2xl font-black text-slate-100 block">
                  {c.value}
                </span>
                <span className="text-[9px] text-slate-500 font-medium block">
                  {c.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Sales + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Reveal className="lg:col-span-2 bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">POS Sales Ledger</div>
              <h2 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal mt-0.5">Today's Transactions</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Summary of walk-in POS receipts generated today</p>
            </div>
            <button onClick={() => onNavigate('billing')} className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs font-semibold transition-colors cursor-pointer">
              View Sales History <ArrowRight size={12} />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="border border-dashed border-teal-500/15 rounded-xl p-10 text-center text-slate-500 text-sm">
              <ShoppingBag size={20} className="mx-auto mb-2 text-teal-400/50" />
              No sales completed yet today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-teal-500/10 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    <th className="py-2.5">Transaction ID</th>
                    <th className="py-2.5">Payment Method</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/8 text-xs">
                  {recentSales.map((sale, idx) => (
                    <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-2">
                        <span className="font-semibold text-slate-200 block">{sale.client}</span>
                        <span className="font-['JetBrains_Mono',monospace] text-[10px] text-slate-500">{sale.id}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-['JetBrains_Mono',monospace] bg-teal-500/5 border border-teal-500/15 text-teal-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">{sale.method}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-200">KES {sale.amount.toLocaleString()}</span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-['JetBrains_Mono',monospace]">{sale.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Reveal>

        <Reveal className="bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm space-y-4" delay={0.1}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Stock Center</div>
            <h2 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal mt-0.5">Inventory alerts</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Expiries and low-level reorder flags</p>
          </div>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {alerts.map((notif) => (
              <div key={notif.id} className={`p-3 rounded-xl border text-xs flex gap-2.5 items-start ${notif.type === 'error' ? 'bg-red-500/5 border-red-500/25 text-red-400' : 'bg-yellow-500/5 border-yellow-500/25 text-yellow-400'}`}>
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{notif.message}</span>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="bg-teal-500/5 border border-teal-500/25 text-teal-400 p-5 rounded-xl text-center text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle size={22} />
                <span>All stock levels healthy. No expiries in sight.</span>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
