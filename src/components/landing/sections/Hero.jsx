import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronRight, Activity, ChevronDown, ShieldCheck, Building, LayoutDashboard } from 'lucide-react';
import { SafeImage } from '../../ui/SafeImage';
import { PHOTO_HERO } from '../data';
import DemoRequestModal from './DemoRequestModal';

export function Hero({ 
  user, 
  onPrimary, 
  onSecondary, 
  userFacilities = [], 
  isSuperAdmin = false, 
  onNavigateToSuperAdminDashboard, 
  onSwitchFacility 
}) {
  const reduced = useReducedMotion();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = user && (isSuperAdmin || userFacilities.length > 1);
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div className="absolute inset-0" initial={{ scale: 1 }} animate={reduced ? {} : { scale: 1.06 }} transition={{ duration: 18, ease: 'easeOut' }}>
          <SafeImage src={PHOTO_HERO} alt="Clinician using a digital health system" className="w-full h-full object-cover clinical-photo" />
        </motion.div>
        <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/85 to-background/60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 15% 50%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 60%)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-7">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-primary/10 border border-border-strong text-xs uppercase tracking-widest text-primary font-sans font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Multitenant · White-Label · Cloud-Native
          </motion.div>
          <h1 className="font-serif text-4xl md:text-6xl text-fg-strong leading-tight font-normal">
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>Clinical-Grade Hospital</motion.span>
            <motion.span className="block text-primary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>Management Software</motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }} className="text-base leading-relaxed max-w-lg text-fg-muted font-sans">
            Eagle Tech HMIS gives Kenyan healthcare facilities a unified digital workspace — from triage to MOH reporting — deployed under your own domain in days.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }} className="flex flex-col sm:flex-row gap-3 pt-2 items-start relative">
            {user ? (
              showDropdown ? (
                <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                  <motion.button
                    whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-all duration-medium font-sans font-bold shadow-glow cursor-pointer"
                  >
                    <span>Access My Dashboard</span>
                    <ChevronDown size={15} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </motion.button>
                  {dropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-md animate-fadeIn">
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            if (onNavigateToSuperAdminDashboard) onNavigateToSuperAdminDashboard();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition text-left cursor-pointer"
                        >
                          <ShieldCheck size={16} />
                          <span>Super Admin Console</span>
                        </button>
                      )}
                      {isSuperAdmin && userFacilities.length > 0 && (
                        <div className="border-t border-slate-800 my-1" />
                      )}
                      {userFacilities.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                            Hospital Portals
                          </div>
                          {userFacilities.map((fac) => (
                            <button
                              key={fac.facility_id}
                              onClick={() => {
                                setDropdownOpen(false);
                                if (onSwitchFacility) onSwitchFacility(fac.facility_id);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Building size={14} className="text-slate-400" />
                                <span className="font-medium truncate max-w-[140px]">{fac.facility_name}</span>
                              </div>
                              <span className="font-mono text-[9px] bg-slate-955 text-teal-400 px-1.5 py-0.5 rounded border border-slate-850">
                                {fac.facility_code}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        !isSuperAdmin && (
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              onPrimary();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition text-left cursor-pointer"
                          >
                            <LayoutDashboard size={14} />
                            <span>My Dashboard</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <motion.button
                    whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onPrimary}
                    className="flex items-center justify-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-all duration-medium font-sans font-bold shadow-glow cursor-pointer"
                  >
                    <span>Access Hospital Dashboard</span> <ArrowRight size={15} />
                  </motion.button>
                  <motion.button
                    whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSecondary}
                    className="flex items-center justify-center gap-2 text-sm text-fg-body hover:text-fg-strong border border-border-strong hover:border-border-emphasis hover:bg-card px-6 py-3 rounded-xl transition-all duration-medium font-sans font-semibold cursor-pointer"
                  >
                    <span>Return to Dashboard</span> <ChevronRight size={14} />
                  </motion.button>
                </>
              )
            ) : (
              <>
                <motion.button
                  whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onPrimary}
                  className="flex items-center justify-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-all duration-medium font-sans font-bold shadow-glow cursor-pointer"
                >
                  <span>Start Free Hospital Setup</span> <ArrowRight size={15} />
                </motion.button>
                <motion.button
                  whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSecondary}
                  className="flex items-center justify-center gap-2 text-sm text-fg-body hover:text-fg-strong border border-border-strong hover:border-border-emphasis hover:bg-card px-6 py-3 rounded-xl transition-all duration-medium font-sans font-semibold cursor-pointer"
                >
                  <span>Access Clinical Workspace</span> <ChevronRight size={14} />
                </motion.button>
                <motion.button
                  whileHover={reduced ? {} : { scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsDemoOpen(true)}
                  className="flex items-center justify-center gap-2 text-sm text-teal-400 hover:text-teal-300 border border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/5 px-6 py-3 rounded-xl transition-all duration-medium font-sans font-bold cursor-pointer"
                >
                  <span>Request Live Demo</span> <Activity size={14} className="animate-pulse" />
                </motion.button>
              </>
            )}
          </motion.div>
        </div>
        <div className="hidden lg:block lg:col-span-5 relative">
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={reduced ? { opacity: 1, x: 0, scale: 1 } : { opacity: 1, x: 0, scale: 1, y: [0, -10, 0] }}
            whileHover={reduced ? {} : { scale: 1.025, borderColor: 'rgba(45, 212, 191, 0.4)' }}
            transition={reduced ? { duration: 0.8, delay: 0.3 } : { 
              y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              default: { duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }
            }}
            className="relative bg-slate-900/80 border border-teal-500/20 backdrop-blur-md rounded-2xl p-6 shadow-2xl shadow-teal-500/5 overflow-hidden"
          >
            {/* Shimmer light effect inside card */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-teal-500/5 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-2xs font-bold text-slate-300 uppercase tracking-widest font-mono">Live Clinic Monitor</span>
              </div>
              <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Sandbox Active</span>
            </div>

            <div className="space-y-4 pt-4">
              {/* Patient Queue Tracker */}
              <div className="space-y-2">
                <div className="flex justify-between text-2xs text-slate-500 font-bold uppercase">
                  <span>General Queue</span>
                  <span className="text-teal-400">4 Patients Waiting</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: "Grace Muthoni", time: "2 mins ago", status: "Triage" },
                    { name: "John Kiprop", time: "5 mins ago", status: "Consultation" }
                  ].map((p, idx) => (
                    <motion.div 
                      key={p.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={reduced ? {} : { scale: 1.02, x: 4, backgroundColor: 'rgba(45, 212, 191, 0.08)', borderColor: 'rgba(45, 212, 191, 0.2)' }}
                      transition={{ 
                        default: { duration: 0.2 },
                        opacity: { delay: 0.5 + idx * 0.2 },
                        y: { delay: 0.5 + idx * 0.2 }
                      }}
                      className="flex items-center justify-between p-2 bg-slate-955/40 border border-slate-850 rounded-lg text-[11px] transition-colors duration-fast"
                    >
                      <span className="font-bold text-slate-200">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500">{p.time}</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-teal-500/10 text-teal-400 font-bold uppercase">{p.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Patient Vitals Tracker */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={reduced ? {} : { scale: 1.02, borderColor: 'rgba(45, 212, 191, 0.3)' }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-slate-955/60 border border-slate-850 p-3 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Patient Vitals (#102)</span>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <Activity size={12} className="animate-pulse" />
                    <span className="text-2xs font-bold font-mono">72 BPM</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Temp", val: "36.8°C", color: "text-emerald-400" },
                    { label: "Blood Pres", val: "120/80", color: "text-teal-400" },
                    { label: "SPO2", val: "98%", color: "text-sky-400" }
                  ].map((v) => (
                    <div key={v.label} className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-855/50">
                      <div className="text-[8px] text-slate-500 uppercase font-black">{v.label}</div>
                      <div className={`text-[11px] font-extrabold mt-0.5 ${v.color} font-mono`}>{v.val}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Bed Occupancy Grid */}
              <div className="space-y-2">
                <div className="text-2xs text-slate-500 font-bold uppercase tracking-wider">Inpatient Ward Bed Grid</div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "A1", status: "occupied" },
                    { id: "A2", status: "vacant" },
                    { id: "A3", status: "dirty" },
                    { id: "A4", status: "occupied" }
                  ].map((bed) => (
                    <motion.div 
                      key={bed.id}
                      whileHover={reduced ? {} : { y: -3, scale: 1.05, borderColor: 'rgba(45, 212, 191, 0.4)' }}
                      transition={{ duration: 0.2 }}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 font-mono text-[9px] cursor-default ${
                        bed.status === 'occupied' ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-bold' :
                        bed.status === 'vacant' ? 'bg-emerald-500/5 border-slate-800 text-slate-400' :
                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      <span className="font-bold">{bed.id}</span>
                      <span className="text-[7px] uppercase font-semibold">{bed.status}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <DemoRequestModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
}
