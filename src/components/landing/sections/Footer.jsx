import { Activity } from 'lucide-react';
import { Reveal } from '../motion/Reveal';

export function Footer() {
  return (
    <footer className="border-t border-teal-500/10 bg-slate-950">
      <Reveal className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
            <Activity size={12} className="text-slate-950" />
          </div>
          <span className="font-['Instrument_Serif',serif] text-[13px] font-semibold text-slate-100">Eagle Tech HMIS</span>
        </div>
        <div className="text-[11px] font-medium text-slate-600 text-center">© 2026 Eagle Tech Hospital Management Software Solutions. All rights reserved.</div>
        <div className="font-['JetBrains_Mono',monospace] text-[10px] font-bold uppercase tracking-widest text-slate-700">White-Label HMIS v4.0</div>
      </Reveal>
    </footer>
  );
}
