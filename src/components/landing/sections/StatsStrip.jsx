import { Stagger, StaggerItem } from '../motion/Stagger';
import { CountUp } from '../motion/CountUp';
import { stats } from '../data';

export function StatsStrip() {
  return (
    <div className="border-y border-teal-500/10 bg-slate-900/60">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-6" stagger={0.08}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.label} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-teal-400" />
                </div>
                <div>
                  <div className="font-['JetBrains_Mono',monospace] text-xl font-black text-slate-100">
                    {s.text ? s.text : <CountUp to={s.value} decimals={s.decimals} />}
                    <span className="text-teal-400">{s.suffix}</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">{s.label}</div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
