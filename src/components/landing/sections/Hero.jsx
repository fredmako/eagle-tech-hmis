import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { PHOTO_HERO } from '../data';

export function Hero({ onPrimary, onSecondary }) {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={reduced ? {} : { scale: 1.06 }}
          transition={{ duration: 18, ease: 'easeOut' }}
        >
          <SafeImage src={PHOTO_HERO} alt="Clinician using a digital health system" className="w-full h-full object-cover clinical-photo" />
        </motion.div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--landing-overlay-from, rgba(6,11,20,0.97)), var(--landing-overlay-via, rgba(6,11,20,0.88)), var(--landing-overlay-to, rgba(6,11,20,0.65)))',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_15%_50%,rgba(45,212,191,0.07),transparent_60%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
        <div className="max-w-2xl space-y-7">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-teal-400/10 border border-teal-400/20 text-[11px] font-bold uppercase tracking-widest text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Multitenant · White-Label · Cloud-Native
          </motion.div>

          <h1 className="font-['Instrument_Serif',serif] text-4xl md:text-6xl text-slate-100 leading-[1.1] font-normal">
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
              Clinical-Grade Hospital
            </motion.span>
            <motion.span className="block text-teal-400" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              Management Software
            </motion.span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }} className="text-[15px] leading-relaxed max-w-lg text-slate-400 font-['DM_Sans',system-ui,sans-serif]">
            Eagle Tech HMIS gives Kenyan healthcare facilities a unified digital workspace — from triage to MOH reporting — deployed under your own domain in days.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }} className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={onPrimary} className="flex items-center justify-center gap-2 font-bold text-[13px] bg-teal-400 hover:bg-teal-300 text-slate-950 px-6 py-3 rounded-xl transition-all duration-200 active:scale-[0.97] shadow-[0_0_24px_rgba(45,212,191,0.25)] cursor-pointer">
              Start Free Hospital Setup <ArrowRight size={15} />
            </button>
            <button onClick={onSecondary} className="flex items-center justify-center gap-2 font-semibold text-[13px] text-slate-300 hover:text-slate-100 border border-teal-500/20 hover:border-teal-500/40 hover:bg-slate-900 px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer">
              Access Clinical Workspace <ChevronRight size={14} />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
