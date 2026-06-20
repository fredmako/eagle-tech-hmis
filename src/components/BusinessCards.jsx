import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Sparkles,
  Globe,
} from "lucide-react";
import { motion } from "motion/react";

const contacts = [
  { icon: Phone, label: "+254 702 423 889", tone: "text-teal-300" },
  { icon: Phone, label: "+254 746 081 588", tone: "text-teal-300" },
  { icon: Mail, label: "info@eagletechsolutions.tech", tone: "text-cyan-300" },
  { icon: Globe, label: "eagletechhmis.com", tone: "text-sky-300" },
  { icon: MapPin, label: "Nairobi, Kenya", tone: "text-indigo-300" },
];

function CardLine({ icon: Icon, label, tone = "text-slate-200" }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className={tone} />
      <span className="text-[11px] tracking-wide text-slate-200/90">
        {label}
      </span>
    </div>
  );
}

function BusinessCardFront() {
  return (
    <div className="business-card relative aspect-[3.5/2] overflow-hidden rounded-[22px] border border-teal-400/20 bg-[#07111e] shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.16),transparent_24%),linear-gradient(135deg,#06101b_0%,#0b1626_50%,#06111d_100%)]" />
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(255,255,255,0.04)_43%,transparent_44%,transparent_100%)]" />
      <div className="relative h-full p-5 text-slate-100 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Eagle Tech Logo"
              className="h-11 w-11 rounded-xl object-contain bg-slate-950/30 border border-white/10 p-1"
            />
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-teal-300 font-bold">
                Eagle Tech
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-slate-400">
                HMIS Solution
              </div>
            </div>
          </div>
          <div className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-[9px] uppercase tracking-[0.28em] text-teal-200">
            Healthcare software
          </div>
        </div>

        <div className="grid grid-cols-[1.35fr_0.9fr] gap-4 items-end">
          <div className="space-y-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-slate-400 mb-2">
                Name
              </p>
              <h2 className="font-serif text-2xl leading-none text-white">
                Fredrick Makori
              </h2>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-teal-300 font-semibold">
                CEO, Eagle Tech Solutions
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-400 font-semibold">
                Software Developer
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 max-w-[18ch]">
              Digital health systems for modern hospitals.
            </p>
          </div>

          <div className="space-y-2.5">
            {contacts.map((item) => (
              <CardLine
                key={item.label}
                icon={item.icon}
                label={item.label}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-white/8 pt-3">
          <div className="text-[9px] uppercase tracking-[0.28em] text-slate-500">
            Trusted clinical software
          </div>
          <div className="flex items-center gap-2 text-teal-300">
            <Sparkles size={12} />
            <span className="text-[9px] uppercase tracking-[0.28em] font-bold">
              Eagle Tech HMIS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessCardBack() {
  return (
    <div className="business-card relative aspect-[3.5/2] overflow-hidden rounded-[22px] border border-cyan-400/15 bg-[#07111e] shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,212,191,0.16),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.18),transparent_20%),linear-gradient(180deg,#07111e_0%,#081423_100%)]" />
      <div className="relative h-full p-5 text-slate-100 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
              Solutions that scale
            </div>
            <h3 className="mt-2 font-serif text-xl text-white">
              Eagle Tech HMIS
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[22ch]">
              Built for registration, triage, billing, reporting, and
              operations.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-3">
            <QrCode size={42} className="text-cyan-300" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
          <div className="rounded-xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-500 uppercase tracking-[0.3em] mb-2">
              Modules
            </div>
            <div className="space-y-1 text-slate-200">
              <div>Patient registration</div>
              <div>Clinical workflow</div>
              <div>Billing and reporting</div>
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-500 uppercase tracking-[0.3em] mb-2">
              Reach us
            </div>
            <div className="space-y-1 text-slate-200">
              <div>+254 702 423 889</div>
              <div>+254 746 081 588</div>
              <div>info@eagletechsolutions.tech</div>
              <div>eagletechhmis.com</div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-3">
          <span className="text-[9px] uppercase tracking-[0.28em] text-slate-500">
            White-label ready
          </span>
          <span className="text-[9px] uppercase tracking-[0.28em] text-cyan-300 font-bold">
            3.5 x 2 in
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BusinessCards({ onBackToLanding, onNavigateToLogin }) {
  return (
    <div className="business-cards-page min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-10">
        <div className="print-hidden flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div className="space-y-3 max-w-2xl">
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to home
            </button>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-teal-300 font-bold">
                Branded business cards
              </p>
              <h1 className="font-serif text-3xl md:text-5xl text-white">
                Eagle Tech HMIS Solution
              </h1>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                A dark, teal-accented business card system styled to match the
                Eagle Tech logo and brand palette.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-400/15 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              Print layout
            </button>
            <button
              onClick={onNavigateToLogin}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer"
            >
              Access dashboard
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr] print:block"
        >
          <div className="rounded-3xl border border-white/8 bg-slate-900/50 p-5 md:p-6 shadow-2xl shadow-black/20 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
            <div className="print-hidden flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm uppercase tracking-[0.35em] text-slate-400 font-bold">
                Front and back preview
              </h2>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Standard business-card ratio
              </span>
            </div>
            <div className="print-stack grid gap-5 md:grid-cols-2 print:grid print:grid-cols-1 print:gap-5">
              <BusinessCardFront />
              <BusinessCardBack />
            </div>
          </div>

          <div className="print-hidden space-y-6">
            <div className="rounded-3xl border border-teal-400/15 bg-slate-900/60 p-6 shadow-xl">
              <h3 className="text-sm uppercase tracking-[0.35em] text-teal-300 font-bold">
                Brand cues
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div>Dark navy base for a premium healthcare-tech feel.</div>
                <div>
                  Teal and cyan accents pulled from the Eagle logo wings.
                </div>
                <div>
                  Rounded card edges with subtle glass and gradient depth.
                </div>
                <div>Logo-first layout with clean contact hierarchy.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-slate-900/60 p-6 shadow-xl">
              <h3 className="text-sm uppercase tracking-[0.35em] text-slate-400 font-bold">
                Suggested print specs
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div>Size: 3.5 x 2 in</div>
                <div>Bleed: 0.125 in on all sides</div>
                <div>Finish: matte or soft-touch stock</div>
                <div>Safe area: keep text inside 0.15 in margin</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
