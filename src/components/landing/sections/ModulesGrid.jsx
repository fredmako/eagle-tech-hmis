import { motion } from 'motion/react';
import { Reveal } from '../../ui/Reveal';
import { Stagger, StaggerItem } from '../../ui/Stagger';
import { SafeImage } from '../../ui/SafeImage';
import { services } from '../data';

export function ModulesGrid() {
  return (
    <section id="modules" className="max-w-7xl mx-auto px-6 py-24 md:py-32 space-y-12">
      <Reveal className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-primary font-sans font-bold">Enterprise Modules</div>
        <h2 className="font-serif text-3xl md:text-4xl text-fg-strong leading-tight font-normal">
          Everything to run a modern facility,
          <br />
          <span className="text-fg-muted">fully integrated out of the box.</span>
        </h2>
      </Reveal>
      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-xl" stagger={0.06}>
        {services.map((s, idx) => {
          const Icon = s.icon;
          return (
            <StaggerItem key={idx} className="bg-background relative">
              <motion.div 
                whileHover={{ 
                  y: -6, 
                  scale: 1.015,
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                  zIndex: 10
                }} 
                transition={{ duration: 0.25, ease: 'easeOut' }} 
                className="group h-full hover-shine hover:bg-card p-6 space-y-4 transition-colors duration-medium cursor-default border border-transparent hover:border-primary/20 rounded-lg relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-border-strong flex items-center justify-center group-hover:scale-108 group-hover:rotate-6 transition-transform duration-medium"><Icon size={18} className="text-primary" /></div>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border-subtle">
                      <SafeImage src={s.photo} alt={s.title} className="w-full h-full object-cover clinical-photo group-hover:scale-110 transition-transform duration-slow" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--primary) 15%, transparent), color-mix(in oklab, var(--background) 40%, transparent))' }} />
                    </div>
                  </div>
                  <span className="text-2xs uppercase tracking-widest px-2 py-0.5 rounded bg-primary/5 border border-border-subtle text-primary/80 font-sans font-bold">{s.tag}</span>
                </div>
                <div>
                  <h3 className="text-base text-fg-strong mb-1.5 font-sans font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-fg-subtle font-sans">{s.desc}</p>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
