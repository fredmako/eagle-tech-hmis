import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { SafeImage } from '../../ui/SafeImage';
import { PHOTO_HERO } from '../data';

export function Hero({ onPrimary, onSecondary }) {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div className="absolute inset-0" initial={{ scale: 1 }} animate={reduced ? {} : { scale: 1.06 }} transition={{ duration: 18, ease: 'easeOut' }}>
          <SafeImage src={PHOTO_HERO} alt="Clinician using a digital health system" className="w-full h-full object-cover clinical-photo" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 15% 50%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 60%)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
        <div className="max-w-2xl space-y-7">
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }} className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={onPrimary} className="flex items-center justify-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-all duration-medium active:scale-[0.97] font-sans font-bold shadow-glow">Start Free Hospital Setup <ArrowRight size={15} /></button>
            <button onClick={onSecondary} className="flex items-center justify-center gap-2 text-sm text-fg-body hover:text-fg-strong border border-border-strong hover:border-border-emphasis hover:bg-card px-6 py-3 rounded-xl transition-all duration-medium font-sans font-semibold">Access Clinical Workspace <ChevronRight size={14} /></button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
