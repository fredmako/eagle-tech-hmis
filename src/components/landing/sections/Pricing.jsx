import { motion } from 'motion/react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { Reveal } from '../../ui/Reveal';
import { Stagger, StaggerItem } from '../../ui/Stagger';
import { SafeImage } from '../../ui/SafeImage';
import { budgetItems, PHOTO_PRICING_BAND } from '../data';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-card/40">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <Reveal className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-primary font-sans font-bold">Transparent Pricing</div>
          <h2 className="font-serif text-3xl md:text-4xl text-fg-strong leading-tight font-normal">No hidden costs.<br /><span className="text-fg-muted">Only what your facility actually needs.</span></h2>
        </Reveal>
        <Reveal className="relative rounded-xl overflow-hidden border border-border aspect-[5/1] min-h-[140px]">
          <SafeImage src={PHOTO_PRICING_BAND} alt="Hospital facility interior" className="absolute inset-0 w-full h-full object-cover clinical-photo" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/40" />
          <div className="relative h-full flex items-center px-8 md:px-12">
            <div className="max-w-md space-y-2">
              <div className="text-2xs uppercase tracking-widest text-primary font-sans font-bold">Built for Kenyan facilities</div>
              <div className="font-serif text-xl md:text-2xl text-fg-strong font-normal">Setup paid in Kenyan Shillings.<span className="text-primary"> No FX surprises.</span></div>
            </div>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.1}>
          {budgetItems.map((b, idx) => {
            const Icon = b.icon;
            return (
              <StaggerItem key={idx} className={['rounded-xl p-6 space-y-5 flex flex-col relative overflow-hidden', b.highlight ? 'bg-primary/5 border border-border-emphasis' : 'bg-card border border-border'].join(' ')}>
                {b.highlight && (<motion.div initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }} className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent origin-center" />)}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-border-strong flex items-center justify-center shrink-0"><Icon size={16} className="text-primary" /></div>
                  <div className="text-sm text-fg-strong pt-1.5 font-sans font-semibold">{b.title}</div>
                </div>
                <div>
                  <span className="font-mono text-3xl text-fg-strong font-extrabold">{b.cost}</span>
                  <span className="text-sm ml-1.5 text-fg-subtle font-sans">{b.period}</span>
                </div>
                <p className="text-sm leading-relaxed text-fg-subtle flex-1 font-sans">{b.desc}</p>
                <div className="flex items-center gap-1.5 text-xs text-primary font-sans font-semibold"><CheckCircle2 size={13} /> Included in setup</div>
              </StaggerItem>
            );
          })}
        </Stagger>
        <Reveal className="rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-card border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-fg-strong font-sans font-semibold"><CreditCard size={15} className="text-primary" /> Integrated Payment Gateways</div>
            <p className="text-xs text-fg-subtle font-sans">We wire your portal to process clinic billings securely via your preferred processor.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {['Stripe', 'M-Pesa', 'PayPal', 'Mastercard'].map((p) => (
              <motion.span key={p} whileHover={{ y: -2 }} className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary/5 border border-border-subtle text-fg-muted font-sans font-bold">{p}</motion.span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
