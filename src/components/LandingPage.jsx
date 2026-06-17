import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowRight, 
  Bed, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Coins, 
  CreditCard, 
  DollarSign, 
  FileSpreadsheet, 
  FlaskConical, 
  Globe, 
  Heart, 
  Lock, 
  Menu, 
  Pill, 
  Server, 
  Shield, 
  Stethoscope, 
  TrendingUp, 
  Users, 
  X, 
  Zap 
} from 'lucide-react';

const heroImage = "https://images.unsplash.com/photo-1758691462848-ba1e929da259?w=1400&h=900&fit=crop&auto=format";
const aboutImage = "https://images.unsplash.com/photo-1758691461957-13aff0c37c6f?w=800&h=600&fit=crop&auto=format";

export default function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    { icon: Heart, title: "Triage & Vital Signs", desc: "Real-time logger for blood pressure, temperature, heart rate, and weight with automated BMI computation.", tag: "Clinical" },
    { icon: Stethoscope, title: "OPD Consultation Desk", desc: "Integrated SOAP clinical notes, drug prescriptions, and direct ICD-10 diagnostic coding search.", tag: "Clinical" },
    { icon: FlaskConical, title: "Laboratory Management", desc: "Automated order placement, test record workflows, result verification, and digital receipt delivery.", tag: "Diagnostics" },
    { icon: Pill, title: "Pharmacy Stock Control", desc: "Real-time stock decrementing on dispensing, low-level warning notifications, and inventory tracking.", tag: "Operations" },
    { icon: DollarSign, title: "Cashier & Billing Desk", desc: "Flexible invoices, instant payment receipts, and automated payment status mapping.", tag: "Finance" },
    { icon: Bed, title: "Inpatient Ward Operations", desc: "Interactive bed allocation maps, vital signs monitoring logs, and discharge tracking.", tag: "Inpatient" },
    { icon: FileSpreadsheet, title: "MOH Daily Reporting", desc: "Auto-compiled Ministry of Health registers (including MOH 717) with one-click data sheet export.", tag: "Compliance" }
  ];

  const stats = [
    { value: "1", suffix: "+", label: "Live Deployment", icon: Activity },
    { value: "7", suffix: "", label: "Clinical Modules", icon: Zap },
    { value: "99.9", suffix: "%", label: "Uptime SLA", icon: TrendingUp },
    { value: "MOH", suffix: "", label: "Compliant Reports", icon: Shield }
  ];

  const pricing = [
    { icon: Globe, title: "Custom Domain Setup", cost: "Ksh 1,500", period: "/ year", desc: "Registration of your custom web address (e.g. portal.yourhospital.com) with global DNS routing.", highlight: false },
    { icon: Server, title: "Database & Server Infrastructure", cost: "Ksh 2,900", period: "/ month", desc: "Secure cloud hosting via dedicated Appwrite instances with automated daily backups and SSL certificates.", highlight: true },
    { icon: Coins, title: "White-Label Branding", cost: "Ksh 4,900", period: "one-off", desc: "Complete system styling: upload your logo, define custom dashboard templates, and configure roles.", highlight: false }
  ];

  const checklist = [
    "Submit hospital name & domain requirements",
    "Upload logo branding and configure staff roles",
    "Select Standard or Enterprise licensing",
    "Process setup fee & provision cloud database",
    "Lock workspace and launch live portal"
  ];

  const badges = [
    { icon: Shield, label: "MOH Compliant", sub: "Reg. & reporting ready" },
    { icon: Lock, label: "Encrypted at Rest", sub: "AES-256 cloud storage" },
    { icon: Users, label: "Multi-Role Access", sub: "Staff permission tiers" },
    { icon: Zap, label: "Same-Day Setup", sub: "Portal live in 24 hrs" }
  ];

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-['DM_Sans',system-ui,sans-serif] selection:bg-teal-400 selection:text-slate-950 overflow-x-hidden">
      {/* Decorative Grid Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(45,212,191,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(45,212,191,0.07) 1px,transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-slate-950/90 backdrop-blur-md border-b border-teal-500/10" : "bg-transparent border-b border-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
              <Activity size={14} className="text-slate-950" />
            </div>
            <span className="font-['Instrument_Serif',serif] text-lg text-slate-100">
              Eagle Tech <span className="text-teal-400">HMIS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-400">
            <a href="#modules" className="hover:text-slate-100 transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-slate-100 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-slate-100 transition-colors">About</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onNavigateToLogin}
              className="text-[13px] font-semibold text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={onNavigateToSignup}
              className="text-[13px] font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 px-4 py-2 rounded-lg transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Register Hospital
            </button>
          </div>

          <button 
            className="md:hidden text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/98 border-t border-teal-500/10">
            <div className="px-6 py-4 space-y-3 text-[13px] font-medium">
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-slate-100 py-1">Modules</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-slate-100 py-1">Pricing</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-slate-100 py-1">About</a>
              <div className="pt-2 flex flex-col gap-2">
                <button 
                  onClick={() => { setMobileMenuOpen(false); onNavigateToLogin(); }}
                  className="text-left text-slate-400 hover:text-slate-100 py-2 cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onNavigateToSignup(); }}
                  className="font-bold bg-teal-400 text-slate-950 px-4 py-2 rounded-lg text-center cursor-pointer"
                >
                  Register Hospital
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={heroImage} 
              alt="Doctor using digital health system" 
              className="w-full h-full object-cover saturate-[0.55]" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/97 via-slate-950/88 to-slate-950/65" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_15%_50%,rgba(45,212,191,0.07),transparent_60%)]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
            <div className="max-w-2xl space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-teal-400/8 border border-teal-400/20 text-[11px] font-bold uppercase tracking-widest text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Multitenant · White-Label · Cloud-Native
              </div>
              <h1 className="font-['Instrument_Serif',serif] text-4xl md:text-6xl text-slate-100 leading-[1.1] font-normal">
                Clinical-Grade Hospital <br />
                <span className="text-teal-400">Management Software</span>
              </h1>
              <p className="text-[15px] leading-relaxed max-w-lg text-slate-400">
                Eagle Tech HMIS gives Kenyan healthcare facilities a unified digital workspace — from triage to MOH reporting — deployed under your own domain in days.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={onNavigateToSignup}
                  className="flex items-center justify-center gap-2 font-bold text-[13px] bg-teal-400 hover:bg-teal-300 text-slate-950 px-6 py-3 rounded-xl transition-all duration-200 active:scale-[0.97] shadow-[0_0_24px_rgba(45,212,191,0.25)] cursor-pointer"
                >
                  Start Free Hospital Setup <ArrowRight size={15} />
                </button>
                <button 
                  onClick={onNavigateToLogin}
                  className="flex items-center justify-center gap-2 font-semibold text-[13px] text-slate-300 hover:text-slate-100 border border-teal-500/20 hover:border-teal-500/40 hover:bg-slate-900 px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Access Clinical Workspace <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BANNER */}
        <div className="border-y border-teal-500/8 bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-teal-400/8 border border-teal-400/15 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-teal-400" />
                    </div>
                    <div>
                      <div className="font-['JetBrains_Mono',monospace] text-xl font-black text-slate-100">
                        {stat.value}<span className="text-teal-400">{stat.suffix}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ENTERPRISE MODULES */}
        <section id="modules" className="max-w-7xl mx-auto px-6 py-24 space-y-12">
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Enterprise Modules</div>
            <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
              Everything to run a modern facility, <br />
              <span className="text-slate-400">fully integrated out of the box.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-teal-500/8 border border-teal-500/8 rounded-2xl overflow-hidden">
            {services.map((service, idx) => {
              const Icon = service.icon;
              return (
                <div 
                  key={idx} 
                  className="group bg-slate-950 hover:bg-slate-900/80 p-6 space-y-4 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-teal-400/8 border border-teal-400/15 flex items-center justify-center">
                      <Icon size={18} className="text-teal-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-teal-400/6 border border-teal-400/12 text-teal-400/80">
                      {service.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-100 mb-1.5">{service.title}</h3>
                    <p className="text-[13px] leading-relaxed text-slate-500">{service.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 bg-slate-900/40">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Transparent Pricing</div>
              <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
                No hidden costs. <br />
                <span className="text-slate-400">Only what your facility actually needs.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricing.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx} 
                    className={`rounded-2xl p-6 space-y-5 flex flex-col relative overflow-hidden ${
                      card.highlight ? "bg-teal-400/6 border border-teal-400/25" : "bg-slate-900 border border-teal-500/8"
                    }`}
                  >
                    {card.highlight && (
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-teal-400" />
                      </div>
                      <div className="text-[13px] font-semibold text-slate-100 pt-1.5">{card.title}</div>
                    </div>
                    <div>
                      <span className="font-['JetBrains_Mono',monospace] text-3xl font-black text-slate-100">{card.cost}</span>
                      <span className="text-[13px] ml-1.5 text-slate-500">{card.period}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-500 flex-1">{card.desc}</p>
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-teal-400">
                      <CheckCircle2 size={13} />
                      Included in setup
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invoicing Integrations Banner */}
            <div className="rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900 border border-teal-500/8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
                  <CreditCard size={15} className="text-teal-400" />
                  Integrated Payment Gateways
                </div>
                <p className="text-[12px] text-slate-500">
                  We wire your portal to process clinic billings securely via your preferred processor.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {["Stripe", "M-Pesa", "PayPal", "Mastercard"].map((gate) => (
                  <span 
                    key={gate}
                    className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-teal-400/6 border border-teal-400/12 text-slate-400"
                  >
                    {gate}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MISSION & CHECKLIST */}
        <section id="about" className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-teal-400">
                  <Calendar size={12} /> Founded 2026
                </div>
                <h2 className="font-['Instrument_Serif',serif] text-3xl md:text-4xl text-slate-100 font-normal leading-[1.15]">
                  Our mission: zero-paper <br />
                  <span className="text-teal-400">clinical operations.</span>
                </h2>
                <p className="text-[14px] leading-relaxed text-slate-400">
                  Eagle Tech was founded to replace error-prone paper registers in clinics with robust, MOH-compliant digital workflows — built for the Kenyan healthcare landscape from day one.
                </p>
              </div>

              {/* Showcase visual card */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-800">
                <img 
                  src={aboutImage} 
                  alt="Doctor reviewing diagnostic data on tablet" 
                  className="w-full h-full object-cover saturate-[0.65]" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-start gap-3 rounded-xl p-3.5 bg-slate-950/85 border border-teal-400/15 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-teal-400/12 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} className="text-teal-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-100">Egesa Medical Clinic</div>
                      <div className="text-[11px] text-slate-500">Live deployment — triage, prescriptions & cashier workflows automated</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Badges */}
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div key={badge.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-teal-500/8">
                      <Icon size={15} className="text-teal-400 shrink-0" />
                      <div>
                        <div className="text-[12px] font-semibold text-slate-100">{badge.label}</div>
                        <div className="text-[10px] text-slate-500">{badge.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Onboarding Checklist Column */}
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden border border-teal-500/12">
                <div className="px-6 py-4 flex items-center justify-between bg-teal-400/5 border-b border-teal-500/10">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-teal-400">Onboarding Checklist</span>
                  <span className="text-[11px] text-slate-500">5 steps · ~24 hrs</span>
                </div>
                <div className="bg-slate-900 divide-y divide-teal-500/6">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-850/50 transition-colors duration-150">
                      <span className="font-['JetBrains_Mono',monospace] w-6 h-6 rounded-full bg-teal-400 text-slate-950 text-[11px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] font-medium text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signup Card Callout */}
              <div className="rounded-2xl p-6 space-y-4 relative overflow-hidden bg-gradient-to-br from-teal-400/10 to-cyan-600/6 border border-teal-400/20">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.08),transparent_70%)] -translate-y-1/4 translate-x-1/4" />
                <h3 className="font-['Instrument_Serif',serif] text-xl text-slate-100 font-normal relative">Ready to digitize your facility?</h3>
                <p className="text-[13px] leading-relaxed text-slate-400 relative">
                  Register today and get your clinical workspace provisioned within 24 hours — including domain setup and staff role configuration.
                </p>
                <button 
                  onClick={onNavigateToSignup}
                  className="relative flex items-center gap-2 font-bold text-[13px] bg-teal-400 hover:bg-teal-300 text-slate-950 px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer"
                >
                  Register Your Hospital <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-teal-500/8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
              <Activity size={12} className="text-slate-950" />
            </div>
            <span className="font-['Instrument_Serif',serif] text-[13px] font-semibold text-slate-100">
              Eagle Tech HMIS
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-600 text-center">
            © 2026 Eagle Tech Hospital Management Software Solutions. All rights reserved.
          </div>
          <div className="font-['JetBrains_Mono',monospace] text-[10px] font-bold uppercase tracking-widest text-slate-700">
            White-Label HMIS v4.0
          </div>
        </div>
      </footer>
    </div>
  );
}
