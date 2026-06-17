import { Stagger, StaggerItem } from '../motion/Stagger';
import { CountUp } from '../motion/CountUp';
import { stats } from '../data';

export function StatsStrip() {
  return (
    <div className="border-y border-border bg-card/60">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-6" stagger={0.08}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.label} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-border-strong flex items-center justify-center shrink-0"><Icon size={16} className="text-primary" /></div>
                <div>
                  <div className="font-mono text-xl text-fg-strong font-extrabold">
                    {s.text ? s.text : <CountUp to={s.value} decimals={s.decimals} />}
                    <span className="text-primary">{s.suffix}</span>
                  </div>
                  <div className="text-xs text-fg-subtle font-sans font-medium">{s.label}</div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
