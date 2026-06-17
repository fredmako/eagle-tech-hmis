import { motion } from 'motion/react';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';
import { SafeImage } from '../SafeImage';
import { services } from '../data';

export function ModulesGrid() {
  return (
    <section id="modules" className="max-w-7xl mx-auto px-6 py-24 md:py-32 space-y-12">
      <Reveal className="space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Enterprise Modules</div>
        <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
          Everything to run a modern facility,
          <br />
          <span className="text-slate-400">fully integrated out of the box.</span>
        </h2>
      </Reveal>

      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-teal-500/10 border border-teal-500/10 rounded-2xl overflow-hidden" stagger={0.06}>
        {services.map((s, idx) => {
          const Icon = s.icon;
          return (
            <StaggerItem key={idx} className="bg-slate-950">
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="group h-full hover:bg-slate-900 p-6 space-y-4 transition-colors duration-200 cursor-default">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
                      <Icon size={18} className="text-teal-400" />
                    </div>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-teal-400/10">
                      <SafeImage src={s.photo} alt={s.title} className="w-full h-full object-cover clinical-photo group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/15 to-slate-950/40" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-teal-400/10 border border-teal-400/15 text-teal-400/80">{s.tag}</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-100 mb-1.5">{s.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">{s.desc}</p>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
