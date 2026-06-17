import { motion } from 'motion/react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';
import { SafeImage } from '../SafeImage';
import { budgetItems, PHOTO_PRICING_BAND } from '../data';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <Reveal className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Transparent Pricing</div>
          <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
            No hidden costs.
            <br />
            <span className="text-slate-400">Only what your facility actually needs.</span>
          </h2>
        </Reveal>

        <Reveal className="relative rounded-2xl overflow-hidden border border-teal-500/10 aspect-[5/1] min-h-[140px]">
          <SafeImage src={PHOTO_PRICING_BAND} alt="Hospital facility interior" className="absolute inset-0 w-full h-full object-cover clinical-photo" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/40" />
          <div className="relative h-full flex items-center px-8 md:px-12">
            <div className="max-w-md space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Built for Kenyan facilities</div>
              <div className="font-['Instrument_Serif',serif] text-xl md:text-2xl text-slate-100">
                Setup paid in Kenyan Shillings.
                <span className="text-teal-400"> No FX surprises.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.1}>
          {budgetItems.map((b, idx) => {
            const Icon = b.icon;
            const base = 'rounded-2xl p-6 space-y-5 flex flex-col relative overflow-hidden';
            const variant = b.highlight ? 'bg-teal-400/10 border border-teal-400/25' : 'bg-slate-900 border border-teal-500/10';
            return (
              <StaggerItem key={idx} className={`${base} ${variant}`}>
                {b.highlight && (
                  <motion.div initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }} className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent origin-center" />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-teal-400" />
                  </div>
                  <div className="text-[13px] font-semibold text-slate-100 pt-1.5">{b.title}</div>
                </div>
                <div>
                  <span className="font-['JetBrains_Mono',monospace] text-3xl font-black text-slate-100">{b.cost}</span>
                  <span className="text-[13px] ml-1.5 text-slate-500">{b.period}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-500 flex-1">{b.desc}</p>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-teal-400">
                  <CheckCircle2 size={13} />
                  Included in setup
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal className="rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900 border border-teal-500/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
              <CreditCard size={15} className="text-teal-400" />
              Integrated Payment Gateways
            </div>
            <p className="text-[12px] text-slate-500">We wire your portal to process clinic billings securely via your preferred processor.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {['Stripe', 'M-Pesa', 'PayPal', 'Mastercard'].map((p) => (
              <motion.span key={p} whileHover={{ y: -2 }} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-teal-400/10 border border-teal-400/15 text-slate-400">
                {p}
              </motion.span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
