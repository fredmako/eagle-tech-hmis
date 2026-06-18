import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Hero } from './landing/sections/Hero';
import { StatsStrip } from './landing/sections/StatsStrip';
import { ModulesGrid } from './landing/sections/ModulesGrid';
import { Pricing } from './landing/sections/Pricing';
import { About } from './landing/sections/About';
import { Footer } from './landing/sections/Footer';
import { ThemeToggle } from './ui/ThemeToggle';

export default function LandingPage({ onNavigateToLogin, onNavigateToSignup, theme, onToggleTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30 ambient-grid" />
      <header className={['sticky top-0 z-50 transition-all duration-medium', scrolled ? 'bg-background/90 backdrop-blur-md border-b border-border' : 'bg-transparent border-b border-transparent'].join(' ')}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Eagle Tech Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-serif text-lg text-fg-strong">Eagle Tech <span className="text-primary">HMIS</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-fg-muted">
            <a href="#modules" className="hover:text-fg-strong transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-fg-strong transition-colors">Pricing</a>
            <a href="#about" className="hover:text-fg-strong transition-colors">About</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
            <button onClick={onNavigateToLogin} className="text-sm font-semibold text-fg-muted hover:text-fg-strong transition-colors px-3 py-1.5 cursor-pointer">Sign In</button>
            <button onClick={onNavigateToSignup} className="text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-medium active:scale-[0.97] cursor-pointer">Register Hospital</button>
          </div>
          <div className="md:hidden flex items-center gap-2">
            {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
            <button className="text-fg-muted hover:text-fg-strong transition-colors p-1" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-background/95 border-t border-border">
            <div className="px-6 py-4 space-y-3 text-sm font-medium">
              <a href="#modules" className="block text-fg-muted hover:text-fg-strong py-1">Modules</a>
              <a href="#pricing" className="block text-fg-muted hover:text-fg-strong py-1">Pricing</a>
              <a href="#about" className="block text-fg-muted hover:text-fg-strong py-1">About</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={onNavigateToLogin} className="text-left text-fg-muted hover:text-fg-strong cursor-pointer">Sign In</button>
                <button onClick={onNavigateToSignup} className="font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center cursor-pointer">Register Hospital</button>
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
