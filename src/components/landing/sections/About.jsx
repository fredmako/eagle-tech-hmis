import { motion } from 'motion/react';
import { ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';
import { Reveal } from '../../ui/Reveal';
import { Stagger, StaggerItem } from '../../ui/Stagger';
import { SafeImage } from '../../ui/SafeImage';
import { PHOTO_ABOUT, PHOTO_ABOUT_SECONDARY, onboardingSteps, trustBadges } from '../data';

export function About({ onRegister }) {
  return (
    <section id="about" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <Reveal className="space-y-8" x={-24} y={0}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-sans font-bold"><Calendar size={12} /> Founded 2026</div>
            <h2 className="font-serif text-3xl md:text-4xl text-fg-strong leading-tight font-normal">Our mission: zero-paper<br /><span className="text-primary">clinical operations.</span></h2>
            <p className="text-sm leading-relaxed text-fg-muted font-sans">Eagle Tech was founded to replace error-prone paper registers in clinics with robust, MOH-compliant digital workflows — built for the Kenyan healthcare landscape from day one.</p>
          </div>
          <div className="relative">
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative hover-shine group rounded-xl overflow-hidden aspect-[4/3] bg-secondary border border-border-subtle"
            >
              <SafeImage src={PHOTO_ABOUT} alt="Clinical staff in training" className="w-full h-full object-cover clinical-photo-soft group-hover:scale-105 transition-transform duration-1000 ease-out" />
              <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="inline-flex items-start gap-3 rounded-xl p-3.5 bg-background/85 border border-border-strong backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0"><CheckCircle2 size={14} className="text-primary" /></div>
                  <div>
                    <div className="text-sm text-fg-strong font-sans font-semibold">Egesa Medical Clinic</div>
                    <div className="text-xs text-fg-subtle font-sans">Live deployment — triage, prescriptions & cashier workflows automated</div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Secondary floating image */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: '-80px' }} 
              animate={{
                y: [0, 8, 0],
              }}
              whileHover={{ scale: 1.05, y: -4, rotate: 1, transition: { duration: 0.2 } }}
              transition={{ 
                y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
                default: { duration: 0.6, delay: 0.3, ease: 'easeOut' }
              }} 
              className="hidden md:block absolute -bottom-8 -right-6 w-44 h-32 rounded-xl overflow-hidden border border-border-strong shadow-overlay hover-shine group/sec cursor-pointer"
            >
              <SafeImage src={PHOTO_ABOUT_SECONDARY} alt="Onboarding session" className="w-full h-full object-cover clinical-photo group-hover/sec:scale-105 transition-transform duration-1000 ease-out" />
              <div className="absolute inset-0 bg-linear-to-t from-background/60 to-transparent" />
            </motion.div>
          </div>
          <Stagger className="grid grid-cols-2 gap-3 pt-4" stagger={0.06}>
            {trustBadges.map((b) => {
              const Icon = b.icon;
              return (
                <StaggerItem 
                  key={b.label} 
                  whileHover={{ y: -3, scale: 1.025, borderColor: 'var(--primary)' }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-default transition-colors duration-medium"
                >
                  <Icon size={15} className="text-primary shrink-0" />
                  <div>
                    <div className="text-xs text-fg-strong font-sans font-semibold">{b.label}</div>
                    <div className="text-2xs text-fg-subtle font-sans">{b.sub}</div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>
        <Reveal className="space-y-6" x={24} y={0} delay={0.1}>
          <div className="rounded-xl overflow-hidden border border-border-strong">
            <div className="px-6 py-4 flex items-center justify-between bg-primary/5 border-b border-border">
              <span className="text-xs uppercase tracking-widest text-primary font-sans font-bold">Onboarding Checklist</span>
              <span className="text-xs text-fg-subtle font-sans">5 steps · ~24 hrs</span>
            </div>
            <Stagger className="bg-card divide-y divide-border" stagger={0.08}>
              {onboardingSteps.map((step, idx) => (
                <StaggerItem 
                  key={idx} 
                  whileHover={{ x: 6 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/40 transition-all duration-fast cursor-default"
                >
                  <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 + idx * 0.08 }} className="font-mono w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 font-extrabold">{idx + 1}</motion.span>
                  <span className="text-sm text-fg-body font-sans font-medium">{step}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="rounded-xl p-6 space-y-4 relative overflow-hidden border border-border-strong" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--primary) 10%, transparent), color-mix(in oklab, var(--chart-2) 6%, transparent))' }}>
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/4 translate-x-1/4" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)' }} />
            <h3 className="font-serif text-xl text-fg-strong relative font-normal">Ready to digitize your facility?</h3>
            <p className="text-sm leading-relaxed text-fg-muted relative font-sans">Register today and get your clinical workspace provisioned within 24 hours — including domain setup and staff role configuration.</p>
            <motion.button 
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRegister} 
              className="relative flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl transition-all duration-medium font-sans font-bold cursor-pointer"
            >
              Register Your Hospital <ArrowRight size={14} />
            </motion.button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

