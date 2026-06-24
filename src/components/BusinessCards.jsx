import React, { useState } from "react";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Sparkles,
  Globe,
  Sliders,
  LayoutGrid,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { motion } from "motion/react";

const themeStyles = {
  teal: {
    bg: "bg-[#07111e]",
    radialGrad: "bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.16),transparent_24%),linear-gradient(135deg,#06101b_0%,#0b1626_50%,#06111d_100%)]",
    lineGrad: "bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(255,255,255,0.04)_43%,transparent_44%,transparent_100%)]",
    textPrimary: "text-slate-100",
    textSecondary: "text-teal-300",
    textMuted: "text-slate-400",
    border: "border-teal-400/20",
    badgeBg: "bg-teal-400/10 text-teal-200 border-teal-400/20",
    iconTone: "text-teal-300",
    sparkleTone: "text-teal-300",
    backRadialGrad: "bg-[linear-gradient(135deg,rgba(45,212,191,0.16),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.18),transparent_20%),linear-gradient(180deg,#07111e_0%,#081423_100%)]",
    backQrBorder: "border-cyan-400/20 bg-white/5",
    backQrColor: "text-cyan-300",
    backModuleBorder: "border-white/8 bg-white/5",
    backModuleText: "text-slate-200",
    backTextSecondary: "text-cyan-300",
  },
  green: {
    bg: "bg-[#041410]",
    radialGrad: "bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(167,243,208,0.12),transparent_24%),linear-gradient(135deg,#030c09_0%,#061d17_50%,#030c0a_100%)]",
    lineGrad: "bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(255,255,255,0.04)_43%,transparent_44%,transparent_100%)]",
    textPrimary: "text-slate-100",
    textSecondary: "text-emerald-300",
    textMuted: "text-slate-400",
    border: "border-emerald-500/20",
    badgeBg: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
    iconTone: "text-emerald-300",
    sparkleTone: "text-emerald-300",
    backRadialGrad: "bg-[linear-gradient(135deg,rgba(52,211,153,0.16),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(167,243,208,0.18),transparent_20%),linear-gradient(180deg,#041410_0%,#061f19_100%)]",
    backQrBorder: "border-emerald-400/20 bg-white/5",
    backQrColor: "text-emerald-300",
    backModuleBorder: "border-white/8 bg-white/5",
    backModuleText: "text-slate-200",
    backTextSecondary: "text-emerald-300",
  },
  blue: {
    bg: "bg-[#060f24]",
    radialGrad: "bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.16),transparent_24%),linear-gradient(135deg,#030816_0%,#091736_50%,#030816_100%)]",
    lineGrad: "bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(255,255,255,0.04)_43%,transparent_44%,transparent_100%)]",
    textPrimary: "text-slate-100",
    textSecondary: "text-sky-300",
    textMuted: "text-slate-400",
    border: "border-sky-500/20",
    badgeBg: "bg-sky-500/10 text-sky-200 border-sky-500/20",
    iconTone: "text-sky-300",
    sparkleTone: "text-sky-300",
    backRadialGrad: "bg-[linear-gradient(135deg,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.18),transparent_20%),linear-gradient(180deg,#060f24_0%,#0a1b40_100%)]",
    backQrBorder: "border-sky-400/20 bg-white/5",
    backQrColor: "text-sky-300",
    backModuleBorder: "border-white/8 bg-white/5",
    backModuleText: "text-slate-200",
    backTextSecondary: "text-sky-300",
  },
  light: {
    bg: "bg-white",
    radialGrad: "bg-transparent",
    lineGrad: "bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(0,0,0,0.02)_43%,transparent_44%,transparent_100%)]",
    textPrimary: "text-slate-900",
    textSecondary: "text-teal-600",
    textMuted: "text-slate-500",
    border: "border-slate-300",
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
    iconTone: "text-teal-600",
    sparkleTone: "text-teal-650",
    backRadialGrad: "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
    backQrBorder: "border-slate-300 bg-slate-50",
    backQrColor: "text-slate-700",
    backModuleBorder: "border-slate-200 bg-slate-50",
    backModuleText: "text-slate-600",
    backTextSecondary: "text-teal-600",
  }
};

function CardLine({ icon: Icon, label, tone = "text-slate-200" }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={10} className={`${tone} shrink-0`} />
      <span className="text-[9.5px] tracking-wide truncate">
        {label}
      </span>
    </div>
  );
}

function BusinessCardFront({ theme = "teal", formData, isPrintMode = false }) {
  const styles = themeStyles[theme] || themeStyles.teal;
  const contacts = [
    { icon: Phone, label: formData.phone1, tone: styles.iconTone },
    { icon: Phone, label: formData.phone2, tone: styles.iconTone },
    { icon: Mail, label: formData.email, tone: styles.iconTone },
    { icon: Globe, label: formData.website, tone: styles.iconTone },
    { icon: MapPin, label: formData.address, tone: styles.iconTone },
  ];

  return (
    <div className={`business-card relative overflow-hidden flex flex-col justify-between p-4 ${styles.bg} ${styles.textPrimary} ${isPrintMode ? 'business-card-print' : 'aspect-[3.5/2] rounded-[18px] border shadow-2xl border-slate-800/40'}`}>
      {/* Background Gradients */}
      <div className={`absolute inset-0 pointer-events-none ${styles.radialGrad}`} />
      <div className={`absolute inset-0 pointer-events-none opacity-70 ${styles.lineGrad}`} />
      
      {/* Content wrapper */}
      <div className="relative h-full flex flex-col justify-between z-10 select-none">
        
        {/* Top Branding Section */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center p-1 border ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-white/10'
            }`}>
              <span className="font-serif text-md font-bold text-teal-400">E</span>
            </div>
            <div>
              <div className="text-[8.5px] uppercase tracking-[0.25em] text-teal-450 font-black leading-none">
                Eagle Tech
              </div>
              <div className={`text-[7.5px] uppercase tracking-[0.2em] font-bold mt-0.5 leading-none ${styles.textMuted}`}>
                HMIS Solution
              </div>
            </div>
          </div>
          <div className={`rounded-full border px-2 py-0.5 text-[7px] uppercase tracking-[0.2em] font-bold ${styles.badgeBg}`}>
            Healthcare Software
          </div>
        </div>

        {/* Center Details section */}
        <div className="grid grid-cols-[1.25fr_0.95fr] gap-3 items-end flex-1 py-1.5 min-h-0">
          <div className="space-y-1 min-w-0">
            <p className={`text-[7.5px] uppercase tracking-[0.25em] font-bold leading-none ${styles.textMuted}`}>
              Name
            </p>
            <h2 className="font-serif text-[17px] font-black leading-tight truncate">
              {formData.name}
            </h2>
            <p className="text-[8.5px] uppercase tracking-[0.18em] text-teal-405 font-bold truncate">
              {formData.designation}
            </p>
            <p className={`text-[8px] uppercase tracking-[0.18em] font-semibold truncate ${styles.textMuted}`}>
              {formData.role}
            </p>
            <p className={`text-[8.5px] leading-snug mt-1 max-w-[17ch] break-words line-clamp-2 ${styles.textMuted}`}>
              {formData.summary}
            </p>
          </div>

          <div className="space-y-1 min-w-0">
            {contacts.map((item, idx) => (
              <CardLine
                key={idx}
                icon={item.icon}
                label={item.label}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        {/* Bottom footer bar */}
        <div className="flex items-end justify-between gap-2 border-t border-slate-500/10 pt-1.5 shrink-0">
          <div className="text-[7.5px] uppercase tracking-[0.2em] text-slate-500">
            {formData.tagline}
          </div>
          <div className="flex items-center gap-1.5 text-teal-400">
            <Sparkles size={9} className={styles.sparkleTone} />
            <span className={`text-[7.5px] uppercase tracking-[0.2em] font-bold ${styles.textSecondary}`}>
              Eagle Tech HMIS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessCardBack({ theme = "teal", formData, isPrintMode = false }) {
  const styles = themeStyles[theme] || themeStyles.teal;

  return (
    <div className={`business-card relative overflow-hidden flex flex-col p-4 ${styles.bg} ${styles.textPrimary} ${isPrintMode ? 'business-card-print' : 'aspect-[3.5/2] rounded-[18px] border shadow-2xl border-slate-800/40'}`}>
      <div className={`absolute inset-0 pointer-events-none ${styles.backRadialGrad}`} />
      
      <div className="relative h-full flex flex-col z-10 select-none">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className={`text-[8.5px] uppercase tracking-[0.25em] font-black ${styles.backTextSecondary}`}>
              Solutions that scale
            </div>
            <h3 className="mt-1 font-serif text-[15px] font-black leading-none">
              Eagle Tech HMIS
            </h3>
            <p className={`text-[9px] mt-1 max-w-[21ch] leading-relaxed line-clamp-2 ${styles.textMuted}`}>
              Built for registration, triage, consultation, billing, reporting, and ward operations.
            </p>
          </div>
          <div className={`rounded-xl border p-2 shrink-0 ${styles.backQrBorder}`}>
            <QrCode size={30} className={styles.backQrColor} />
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[8px] flex-1">
          <div className={`rounded-lg border p-2 ${styles.backModuleBorder}`}>
            <div className="text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">
              Modules
            </div>
            <div className={`space-y-0.5 font-sans font-medium ${styles.backModuleText}`}>
              <div>Patient EHR Registry</div>
              <div>Clinical Triages</div>
              <div>Ward Operations</div>
            </div>
          </div>
          <div className={`rounded-lg border p-2 ${styles.backModuleBorder}`}>
            <div className="text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">
              Reach us
            </div>
            <div className={`space-y-0.5 font-sans font-medium truncate ${styles.backModuleText}`}>
              <div className="truncate">{formData.phone1}</div>
              <div className="truncate">{formData.email}</div>
              <div className="truncate">{formData.website}</div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-500/10 pt-1.5 shrink-0">
          <span className="text-[7.5px] uppercase tracking-[0.2em] text-slate-500">
            White-label ready
          </span>
          <span className={`text-[7.5px] uppercase tracking-[0.2em] font-bold ${styles.backTextSecondary}`}>
            3.5 x 2 in
          </span>
        </div>
      </div>
    </div>
  );
}

const paperSizes = {
  A4: {
    name: "A4",
    widthMm: 297,
    heightMm: 210,
    landscape: { cols: 3, rows: 4, cap: 12 },
    portrait: { cols: 2, rows: 5, cap: 10 }
  },
  A5: {
    name: "A5",
    widthMm: 210,
    heightMm: 148.5,
    landscape: { cols: 2, rows: 2, cap: 4 },
    portrait: { cols: 1, rows: 4, cap: 4 }
  },
  Letter: {
    name: "Letter",
    widthMm: 279.4,
    heightMm: 215.9,
    landscape: { cols: 3, rows: 4, cap: 12 },
    portrait: { cols: 2, rows: 5, cap: 10 }
  }
};

export default function BusinessCards({ onBackToLanding, onNavigateToLogin }) {
  const [theme, setTheme] = useState("teal"); // 'teal', 'green', 'blue', 'light'
  const [isPreviewSheet, setIsPreviewSheet] = useState(false);
  const [sheetSide, setSheetSide] = useState("front"); // 'front', 'back'
  const [paperSize, setPaperSize] = useState("A4"); // 'A4', 'A5', 'Letter'
  const [orientation, setOrientation] = useState("landscape"); // 'landscape', 'portrait'
  const [totalCards, setTotalCards] = useState(12);

  const [formData] = useState({
    name: "Fredrick Makori",
    designation: "CEO, Eagle Tech Solutions",
    role: "Software Developer",
    phone1: "+254 702 423 889",
    phone2: "+254 746 081 588",
    email: "info@eagletechsolutions.tech",
    website: "eagletechhmis.com",
    address: "Nairobi, Kenya",
    tagline: "Trusted clinical software",
    summary: "Digital health systems for modern hospitals."
  });

  const currentConfig = paperSizes[paperSize]?.[orientation] || paperSizes.A4.landscape;
  const capacity = currentConfig.cap;
  const sheetsCount = Math.ceil(totalCards / capacity);

  const handlePaperSizeChange = (size) => {
    setPaperSize(size);
    const newConfig = paperSizes[size][orientation];
    setTotalCards(newConfig.cap);
  };

  const handleOrientationChange = (orient) => {
    setOrientation(orient);
    const newConfig = paperSizes[paperSize][orient];
    setTotalCards(newConfig.cap);
  };

  // Preview dimensions calculations
  const pageW = orientation === "landscape" ? paperSizes[paperSize].widthMm : paperSizes[paperSize].heightMm;
  const pageH = orientation === "landscape" ? paperSizes[paperSize].heightMm : paperSizes[paperSize].widthMm;

  return (
    <div className="business-cards-page min-h-screen bg-slate-955 text-slate-100 font-sans">
      {/* Dynamic Print stylesheet inject */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize.toLowerCase()} ${orientation};
            margin: 0;
          }
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-page {
            width: 100% !important;
            height: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow: hidden !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, 3.5in) !important;
            grid-auto-rows: 2in !important;
            justify-content: center !important;
            align-content: center !important;
            gap: 0 !important;
            /* round down container width/height to exact multiples of card sizes to prevent half-cards */
            width: round(down, 100%, 3.5in) !important;
            height: round(down, 100%, 2in) !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-card-wrapper {
            width: 3.5in !important;
            height: 2in !important;
            box-sizing: border-box !important;
            border: 0.2px dashed #bbb !important; /* Professional cutting margins */
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .business-card-print {
            width: 3.5in !important;
            height: 2in !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* RENDERED printable sheets during print execution */}
      <div className="hidden print:block">
        {Array.from({ length: sheetsCount }).map((_, sheetIdx) => {
          const startIdx = sheetIdx * capacity;
          return (
            <React.Fragment key={sheetIdx}>
              {/* Front Page of Sheet */}
              <div className="print-page">
                <div className="print-grid">
                  {Array.from({ length: capacity }).map((_, cardIdx) => {
                    const globalIdx = startIdx + cardIdx;
                    return (
                      <div key={cardIdx} className="print-card-wrapper">
                        {globalIdx < totalCards ? (
                          <BusinessCardFront theme={theme} formData={formData} isPrintMode={true} />
                        ) : (
                          <div className="w-full h-full bg-white border border-dashed border-slate-200" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back Page of Sheet */}
              <div className="print-page">
                <div className="print-grid">
                  {Array.from({ length: capacity }).map((_, cardIdx) => {
                    const globalIdx = startIdx + cardIdx;
                    return (
                      <div key={cardIdx} className="print-card-wrapper">
                        {globalIdx < totalCards ? (
                          <BusinessCardBack theme={theme} formData={formData} isPrintMode={true} />
                        ) : (
                          <div className="w-full h-full bg-white border border-dashed border-slate-200" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Screen layout UI */}
      <div className="print-hidden max-w-7xl mx-auto px-6 py-8 md:py-10">
        
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div className="space-y-2.5 max-w-2xl">
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              Back to home
            </button>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.3em] text-teal-300 font-bold">
                Dynamic Card Creator
              </p>
              <h1 className="font-serif text-3xl md:text-5xl text-white font-bold leading-tight">
                Branded Business Cards
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                Customize details, pick a theme, and preview the dynamic duplex printable layout before printing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsPreviewSheet(!isPreviewSheet)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                isPreviewSheet 
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' 
                  : 'border-slate-800 text-slate-350 hover:bg-slate-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>{isPreviewSheet ? 'Single Card View' : `${paperSize} Sheet Layout (${capacity} cards)`}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-teal-350 transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Print {paperSize} Sheets ({sheetsCount})</span>
            </button>
            <button
              onClick={onNavigateToLogin}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              Access Dashboard
            </button>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          
          {/* Left Column: Settings Form */}
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Sliders size={15} className="text-teal-400" />
              <h2 className="text-xs uppercase tracking-[0.25em] text-slate-300 font-bold">Print Configuration</h2>
            </div>

            {/* Theme selection dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Card Style Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'teal', label: 'Teal & Cyan', color: 'bg-teal-400' },
                  { id: 'green', label: 'Emerald Green', color: 'bg-emerald-450' },
                  { id: 'blue', label: 'Navy Blue', color: 'bg-sky-400' },
                  { id: 'light', label: 'Ink-Saver (Light)', color: 'bg-slate-300' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition text-left cursor-pointer ${
                      theme === t.id
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                        : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Print Settings: Paper Size, Orientation, Card Count */}
            <div className="space-y-4 pt-4 border-t border-slate-850">
              <div className="flex items-center gap-2 mb-2">
                <Printer size={13} className="text-teal-400" />
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Print Layout Settings</label>
              </div>

              {/* Paper Size */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Paper Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {['A4', 'A5', 'Letter'].map(size => (
                    <button
                      key={size}
                      onClick={() => handlePaperSizeChange(size)}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-bold transition text-center cursor-pointer ${
                        paperSize === size
                          ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                          : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Orientation</span>
                <div className="grid grid-cols-2 gap-2">
                  {['landscape', 'portrait'].map(orient => (
                    <button
                      key={orient}
                      onClick={() => handleOrientationChange(orient)}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-bold capitalize transition text-center cursor-pointer ${
                        orientation === orient
                          ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                          : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800'
                      }`}
                    >
                      {orient}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Count */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Cards to Print</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTotalCards(Math.max(1, totalCards - capacity))}
                    className="h-8 w-8 rounded-lg bg-slate-950 border border-slate-850 hover:bg-slate-900 transition flex items-center justify-center font-bold text-slate-350 cursor-pointer"
                    title={`Decrease by 1 sheet (${capacity} cards)`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={totalCards}
                    onChange={(e) => setTotalCards(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-8 rounded-lg bg-slate-950 border border-slate-850 text-center text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                  <button
                    onClick={() => setTotalCards(totalCards + capacity)}
                    className="h-8 w-8 rounded-lg bg-slate-950 border border-slate-850 hover:bg-slate-900 transition flex items-center justify-center font-bold text-slate-350 cursor-pointer"
                    title={`Increase by 1 sheet (${capacity} cards)`}
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-between text-[9px] text-slate-550 mt-1">
                  <span>Fits {capacity} per sheet</span>
                  <span>Needs {sheetsCount} {sheetsCount === 1 ? 'sheet' : 'sheets'}</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-teal-500/5 border border-teal-500/10 p-3.5 rounded-xl text-[10px] text-slate-400 leading-relaxed font-sans">
              <span className="font-bold text-slate-300 block mb-1">💡 Professional Printing Tips</span>
              <ul className="list-disc list-inside space-y-1 text-[9.5px]">
                <li>Paper size and orientation are set automatically.</li>
                <li>Set <strong>Margins to None</strong> in the browser print dialog.</li>
                <li>Enable <strong>Background graphics</strong> to print rich theme colors.</li>
                <li>Use double-sided (duplex) with <strong>Flip on Long Edge</strong>.</li>
              </ul>
            </div>

            <div className="bg-teal-500/5 border border-teal-500/10 p-4 rounded-xl text-[10.5px] text-slate-450 leading-relaxed font-sans">
              <span className="font-bold text-slate-350 block mb-1">ℹ️ Read-Only Contact Details</span>
              Card contact information (Full Name, Designation, Phone numbers, Email address, Website, Location) is populated automatically from the facility's corporate registry and cannot be modified from this workstation.
            </div>
          </div>

          {/* Right Column: Dynamic Preview Container */}
          <div className="rounded-2xl border border-slate-850 bg-slate-900/20 p-5 flex flex-col justify-between">
            
            {/* Single Card Side-by-Side Previews */}
            {!isPreviewSheet ? (
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-3 border-b border-slate-850 pb-2">
                  <h3 className="text-xs uppercase tracking-[0.25em] text-slate-350 font-bold">Front and Back Preview</h3>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Safe margins preserved</span>
                </div>

                <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto w-full">
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block text-center">Front Side</span>
                    <BusinessCardFront theme={theme} formData={formData} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block text-center">Back Side</span>
                    <BusinessCardBack theme={theme} formData={formData} />
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-2.5 text-xs text-slate-400 leading-relaxed font-sans max-w-xl mx-auto mt-4">
                  <h4 className="font-bold text-slate-300 flex items-center gap-1.5"><CreditCard size={13} className="text-teal-400" /> Duplex Duplication alignment Guidelines</h4>
                  <p className="text-[10.5px]">
                    To print double-sided card sheets exactly back-to-back:
                  </p>
                  <ol className="list-decimal list-inside text-[10px] pl-1 space-y-1">
                    <li>Margins are perfectly centered on the horizontal axis (Left & Right margins are symmetric).</li>
                    <li>Select **Landscape Orientation** and set **Margins to None** (or Default borderless).</li>
                    <li>Choose **Print on Both Sides** (Duplex), selecting **Flip on Long Edge**.</li>
                  </ol>
                </div>
              </div>
            ) : (
              /* Simulated Sheet Print preview representation */
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.25em] text-slate-355 font-bold flex items-center gap-1.5">
                      <LayoutGrid size={13} className="text-teal-400" /> {paperSize} Sheet Print Layout Preview
                    </h3>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">Miniature {orientation} sheet layout rendering {capacity} cards per {paperSize} page</p>
                  </div>

                  <div className="flex gap-2">
                    {[
                      { id: 'front', label: 'Front Page' },
                      { id: 'back', label: 'Back Page' }
                    ].map(side => (
                      <button
                        key={side.id}
                        onClick={() => setSheetSide(side.id)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition tracking-wide cursor-pointer ${
                          sheetSide === side.id
                            ? 'bg-teal-500/10 border border-teal-500/20 text-teal-405'
                            : 'bg-slate-950 border border-slate-850 text-slate-450 hover:text-slate-350'
                        }`}
                      >
                        {side.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Page visual Container */}
                <div className="flex-1 flex items-center justify-center p-3 bg-slate-950 border border-slate-850 rounded-xl overflow-auto min-h-[300px]">
                  <div 
                    className="bg-slate-900 border border-slate-800 p-[30px] flex items-center justify-center shadow-2xl relative select-none"
                    style={{
                      aspectRatio: `${pageW} / ${pageH}`,
                      width: orientation === 'landscape' ? '460px' : '320px',
                    }}
                  >
                    <div className="absolute top-2 left-3 text-[9px] text-slate-550 uppercase tracking-widest font-bold">Simulated {paperSize} {orientation} Page</div>
                    
                    {/* Grid rendering cards */}
                    <div 
                      className="grid gap-0 border border-dashed border-slate-700/60 w-full h-full scale-[0.98]"
                      style={{
                        gridTemplateColumns: `repeat(${currentConfig.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${currentConfig.rows}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: capacity }).map((_, i) => (
                        <div key={i} className="border border-dashed border-slate-700/50 overflow-hidden flex items-center justify-center relative">
                          <div className="absolute inset-0 scale-[0.94]">
                            {i < totalCards ? (
                              sheetSide === 'front' ? (
                                <BusinessCardFront theme={theme} formData={formData} isPrintMode={true} />
                              ) : (
                                <BusinessCardBack theme={theme} formData={formData} isPrintMode={true} />
                              )
                            ) : (
                              <div className="w-full h-full bg-slate-950/20 flex items-center justify-center text-[7.5px] text-slate-700 font-bold uppercase tracking-wider select-none font-mono">
                                Empty Slot
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
