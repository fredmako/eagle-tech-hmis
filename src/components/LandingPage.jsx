import { useState, useEffect } from 'react';
import { Menu, X, Activity } from 'lucide-react';
import { Hero } from './landing/sections/Hero';
import { StatsStrip } from './landing/sections/StatsStrip';
import { ModulesGrid } from './landing/sections/ModulesGrid';
import { Pricing } from './landing/sections/Pricing';
import { About } from './landing/sections/About';
import { Footer } from './landing/sections/Footer';

export default function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['DM_Sans',system-ui,sans-serif] selection:bg-teal-400 selection:text-slate-950">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30 ambient-grid" />

      <header className={[
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-slate-950/90 backdrop-blur-md border-b border-teal-500/10' : 'bg-transparent border-b border-transparent',
      ].join(' ')}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
              <Activity size={14} className="text-slate-950" />
            </div>
            <span className="font-['Instrument_Serif',serif] text-[1.05rem] text-slate-100">
              Eagle Tech <span className="text-teal-400">HMIS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-400">
            <a href="#modules" className="hover:text-slate-100 transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-slate-100 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-slate-100 transition-colors">About</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onNavigateToLogin} className="text-[13px] font-semibold text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5 cursor-pointer">
              Sign In
            </button>
            <button onClick={onNavigateToSignup} className="text-[13px] font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 px-4 py-2 rounded-lg transition-all duration-200 active:scale-[0.97] cursor-pointer">
              Register Hospital
            </button>
          </div>

          <button className="md:hidden text-slate-400 hover:text-slate-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-slate-950/95 border-t border-teal-500/10">
            <div className="px-6 py-4 space-y-3 text-[13px] font-medium">
              <a href="#modules" className="block text-slate-400 hover:text-slate-100 py-1">Modules</a>
              <a href="#pricing" className="block text-slate-400 hover:text-slate-100 py-1">Pricing</a>
              <a href="#about" className="block text-slate-400 hover:text-slate-100 py-1">About</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={onNavigateToLogin} className="text-left text-slate-400 hover:text-slate-100 cursor-pointer">Sign In</button>
                <button onClick={onNavigateToSignup} className="font-bold bg-teal-400 text-slate-950 px-4 py-2 rounded-lg text-center cursor-pointer">
                  Register Hospital
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative z-10">
        <Hero onPrimary={onNavigateToSignup} onSecondary={onNavigateToLogin} />
        <StatsStrip />
        <ModulesGrid />
        <Pricing />
        <About onRegister={onNavigateToSignup} />
      </main>

      <Footer />
    </div>
  );
}
