import React from 'react';
import { 
  Building2, 
  Activity, 
  Heart, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  DollarSign, 
  FileSpreadsheet, 
  Bed, 
  Settings, 
  ArrowRight, 
  Globe, 
  Server, 
  Coins, 
  CreditCard,
  Sparkles,
  CheckCircle2,
  Calendar,
  Lock
} from 'lucide-react';

export default function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  const services = [
    { icon: Heart, title: 'Triage & Vital Signs', desc: 'Real-time logger for blood pressure, temperature, heart rate, and weight with automated BMI computation.' },
    { icon: Stethoscope, title: 'OPD Consultation Desk', desc: 'Integrated SOAP clinical notes, drug prescriptions, and direct ICD-10 diagnostic coding search engines.' },
    { icon: FlaskConical, title: 'Laboratory Management', desc: 'Automated order placement, test record workflows, result verification, and digital receipt delivery.' },
    { icon: Pill, title: 'Pharmacy stock control', desc: 'Real-time stock decrementing on dispensing, low-level warning notifications, and inventory tracking.' },
    { icon: DollarSign, title: 'Cashier & Billing Desk', desc: 'Flexible invoices, instant payment receipts, and automated payment status mapping.' },
    { icon: Bed, title: 'Inpatient Ward Operations', desc: 'Interactive bed allocation maps, vital signs monitoring logs, and discharge tracking.' },
    { icon: FileSpreadsheet, title: 'MOH Daily reporting', desc: 'Auto-compiled Ministry of Health registers (including MOH 717) with one-click data sheet export.' }
  ];

  const budgetItems = [
    { 
      icon: Globe, 
      title: 'Custom Domain Setup', 
      cost: '$15 / year', 
      desc: 'Registration of your custom web address (e.g. portal.yourhospital.com) with global DNS routing.' 
    },
    { 
      icon: Server, 
      title: 'Database & Server Infrastructure', 
      cost: '$29 / month', 
      desc: 'Secure cloud hosting via dedicated Appwrite instances with automated daily backups and SSL certificates.' 
    },
    { 
      icon: Coins, 
      title: 'White-Label Branding', 
      cost: '$49 (One-off)', 
      desc: 'Complete system styling customization: upload your logo, define custom dashboard templates, and configure roles.' 
    }
  ];

  const paymentGateways = [
    { name: 'Stripe', logo: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=64&auto=format&fit=crop&q=60' },
    { name: 'M-Pesa', logo: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=64&auto=format&fit=crop&q=60' },
    { name: 'PayPal', logo: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=64&auto=format&fit=crop&q=60' },
    { name: 'Mastercard', logo: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=64&auto=format&fit=crop&q=60' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Dynamic Header Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 p-2 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-wider block uppercase leading-none">Eagle Tech</span>
              <span className="text-[9px] text-teal-400 font-bold tracking-widest uppercase block mt-1 leading-none">HMIS Solutions</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigateToLogin}
              className="text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Sign In to HMIS
            </button>
            <button 
              onClick={onNavigateToSignup}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold py-1.5 px-4 rounded-lg shadow-md hover:shadow-teal-500/10 active:scale-[0.98] transition"
            >
              Register Your Hospital
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 space-y-20">
        
        {/* HERO SECTION */}
        <section className="text-center py-8 space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-500/5 border border-teal-500/10 rounded-full px-3 py-1 text-[10px] text-teal-400 font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Hospital Operations Outsourced & White-Labeled
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-wide">
            Next Generation Hospital Management Software
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-xl mx-auto">
            Eagle Tech HMIS provides robust, clinical-grade workflows to digitize outpatient care, track laboratory diagnostic orders, manage ward occupancy, and auto-compile MOH logs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button 
              onClick={onNavigateToSignup}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow active:scale-[0.98] transition"
            >
              Start Free Hospital Setup <ArrowRight size={14} />
            </button>
            <button 
              onClick={onNavigateToLogin}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs py-3 px-6 rounded-lg transition"
            >
              Access Clinical Workspaces
            </button>
          </div>
        </section>

        {/* SERVICES OFFERED */}
        <section className="space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Enterprise HMIS Modules Included</h2>
            <p className="text-xs text-slate-400">Everything you need to automate daily clinic and hospital workflows.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-3 hover:border-slate-800 transition duration-150">
                  <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-2 rounded-lg inline-block">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">{s.title}</h3>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-medium">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ONBOARDING COSTING & BUDGET TERMS */}
        <section className="space-y-8 bg-slate-900 border border-slate-850 rounded-2xl p-6 md:p-8">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
              Hospital Setup & Budgeting Terms
            </h2>
            <p className="text-xs text-slate-400">
              Clear, transparent costs required to register your medical facility and set up the cloud portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {budgetItems.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div key={idx} className="bg-slate-950 border border-slate-850/80 p-5 rounded-xl space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-1.5 rounded-lg">
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-black text-teal-400 font-mono">{b.cost}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">{b.title}</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment integrations section */}
          <div className="border-t border-slate-800 pt-6 mt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard size={14} className="text-teal-400" /> Integrated Payment Gateways
                </h4>
                <p className="text-[10px] text-slate-500">We integrate your portal to process clinic billings securely.</p>
              </div>
              <div className="flex flex-wrap gap-4 items-center justify-center">
                {['Stripe', 'M-Pesa', 'PayPal', 'Mastercard'].map((p) => (
                  <span key={p} className="bg-slate-950 border border-slate-850 py-1.5 px-3 rounded-lg text-[10px] font-bold text-slate-400 tracking-wide uppercase">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-t border-slate-900 pt-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 text-teal-400 text-[10px] font-bold uppercase tracking-wider">
              <Calendar size={12} /> Founded in 2026
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide leading-tight">
              Our Vision: Zero-Paper Clinical Operations
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Eagle Tech was established this year with a core mission: to replace error-prone paper registers in clinics with robust, HIPAA-compliant digital logs.
            </p>
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-start gap-3.5">
              <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-2 rounded-lg shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-200 block mb-0.5">Egesa Medical Clinic Deployment</span>
                <p className="text-slate-450 leading-relaxed">
                  We began our journey by partnering with Egesa Medical Clinic, deploying our unified clinical workspace to automate triage, prescriptions, and cashier cashflows.
                </p>
              </div>
            </div>
          </div>

          {/* Right graphics panel */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4 shadow-inner">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Setup checklist</span>
              <span className="text-[10px] text-slate-500">Eagle Tech Solutions</span>
            </div>
            <div className="space-y-2.5">
              {[
                'Submit Hospital Name & Domain requirements',
                'Upload Logo branding and configure staff roles',
                'Select Standard or Enterprise licensing',
                'Process setup fee & provision database',
                'Lock workspace and launch live portal'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-350 font-semibold">
                  <span className="bg-teal-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
        <p>© 2026 Eagle Tech Hospital Management Software Solutions. All rights reserved.</p>
        <p className="text-slate-700 mt-1">White-label HMIS portal framework v4.0</p>
      </footer>

    </div>
  );
}
