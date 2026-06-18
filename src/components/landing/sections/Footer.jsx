import { Activity } from 'lucide-react';
import { Reveal } from '../motion/Reveal';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Reveal as="div" className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md brand-gradient flex items-center justify-center"><Activity size={12} className="text-primary-foreground" /></div>
          <span className="font-serif text-sm text-fg-strong font-semibold">Eagle Tech HMIS</span>
        </div>
        <div className="text-xs text-fg-faint text-center font-sans font-medium">© 2026 Eagle Tech Hospital Management Software Solutions. All rights reserved.</div>
        <div className="font-mono text-2xs uppercase tracking-widest text-fg-faint font-bold">White-Label HMIS v4.0</div>
      </Reveal>
    </footer>
  );
}
