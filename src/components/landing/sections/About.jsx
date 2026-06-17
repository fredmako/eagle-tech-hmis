import { motion } from 'motion/react';
import { ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';
import { SafeImage } from '../SafeImage';
import { PHOTO_ABOUT, PHOTO_ABOUT_SECONDARY, onboardingSteps, trustBadges } from '../data';

export function About({ onRegister }) {
  return (
    <section id="about" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <Reveal className="space-y-8" x={-24} y={0}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-teal-400">
              <Calendar size={12} /> Founded 2026
            </div>
            <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
              Our mission: zero-paper
              <br />
              <span className="text-teal-400">clinical operations.</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-slate-400">
              Eagle Tech was founded to replace error-prone paper registers in clinics with robust, MOH-compliant digital workflows — built for the Kenyan healthcare landscape from day one.
            </p>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-800 border border-teal-400/10">
              <SafeImage src={PHOTO_ABOUT} alt="Clinical staff in training" className="w-full h-full object-cover clinical-photo-soft" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="inline-flex items-start gap-3 rounded-xl p-3.5 bg-slate-950/85 border border-teal-400/15 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-lg bg-teal-400/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-100">Egesa Medical Clinic</div>
                    <div className="text-[11px] text-slate-500">Live deployment — triage, prescriptions & cashier workflows automated</div>
                  </div>
                </div>
              </div>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }} className="hidden md:block absolute -bottom-8 -right-6 w-44 h-32 rounded-xl overflow-hidden border border-teal-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <SafeImage src={PHOTO_ABOUT_SECONDARY} alt="Onboarding session" className="w-full h-full object-cover clinical-photo" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
            </motion.div>
          </div>

          <Stagger className="grid grid-cols-2 gap-3 pt-4" stagger={0.06}>
            {trustBadges.map((b) => {
              const Icon = b.icon;
              return (
                <StaggerItem key={b.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-teal-500/10">
                  <Icon size={15} className="text-teal-400 shrink-0" />
                  <div>
                    <div className="text-[12px] font-semibold text-slate-100">{b.label}</div>
                    <div className="text-[10px] text-slate-500">{b.sub}</div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>

        <Reveal className="space-y-6" x={24} y={0} delay={0.1}>
          <div className="rounded-2xl overflow-hidden border border-teal-500/15">
            <div className="px-6 py-4 flex items-center justify-between bg-teal-400/5 border-b border-teal-500/10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Onboarding Checklist</span>
              <span className="text-[11px] text-slate-500">5 steps · ~24 hrs</span>
            </div>
            <Stagger className="bg-slate-900 divide-y divide-teal-500/10" stagger={0.08}>
              {onboardingSteps.map((step, idx) => (
                <StaggerItem key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/50 transition-colors duration-150">
                  <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 + idx * 0.08 }} className="font-['JetBrains_Mono',monospace] w-6 h-6 rounded-full bg-teal-400 text-slate-950 text-[11px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </motion.span>
                  <span className="text-[13px] font-medium text-slate-200">{step}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <div className="rounded-2xl p-6 space-y-4 relative overflow-hidden bg-gradient-to-br from-teal-400/10 to-cyan-600/10 border border-teal-400/20">
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.12),transparent_70%)] -translate-y-1/4 translate-x-1/4" />
            <h3 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal relative">
              Ready to digitize your facility?
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-400 relative">
              Register today and get your clinical workspace provisioned within 24 hours — including domain setup and staff role configuration.
            </p>
            <button onClick={onRegister} className="relative flex items-center gap-2 font-bold text-[13px] bg-teal-400 hover:bg-teal-300 text-slate-950 px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer">
              Register Your Hospital <ArrowRight size={14} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
