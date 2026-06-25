import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, ArrowRight, ArrowLeft, X, 
  LayoutDashboard, UserPlus, Heart, FlaskConical, Pill, DollarSign, Settings, CheckCircle
} from 'lucide-react';

export default function OnboardingTour({ user, activeTab, setActiveTab, onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Eagle Tech HMIS!",
      description: `Congratulations on being approved, ${user?.full_name || 'User'}! We've prepared a quick guided tour of your health management platform. Let's explore the core modules to get you up to speed.`,
      tab: "dashboard",
      icon: Sparkles,
      highlight: "Welcome Hub"
    },
    {
      title: "Interactive Dashboard",
      description: "This is your central command center. Get real-time statistics on today's registrations, triage counts, pending lab tests, pharmacy queues, and system notifications.",
      tab: "dashboard",
      icon: LayoutDashboard,
      highlight: "Real-time Operations"
    },
    {
      title: "Patient Registration & Vitals",
      description: "Register new patient files, run direct Social Health Authority (SHA) insurance lookups, and route patients to Triage for vitals entry (blood pressure, temperature, weight).",
      tab: "registration",
      icon: UserPlus,
      highlight: "Patient Desk"
    },
    {
      title: "Doctor's Consultation Desk",
      description: "Clinicians can fill digital SOAP forms, record clinical histories, request lab/radiology diagnostics, prescribe medications, or coordinate ward admissions.",
      tab: "consultation",
      icon: Heart,
      highlight: "EMR Suite"
    },
    {
      title: "Laboratory & Diagnostics",
      description: "Manage pathology orders, enter specimen results, run Physiological Reference Ranges, set cash/insurance tariffs, and check SHA-covered specimen parameters.",
      tab: "orders",
      icon: FlaskConical,
      highlight: "Diagnostic Lab"
    },
    {
      title: "Pharmacy & Drug Sales",
      description: "Dispense prescriptions, run real-time drug inventory checks, manage direct over-the-counter POS cash sales, and track minimum stock limits.",
      tab: "pharmacy",
      icon: Pill,
      highlight: "Pharmacy Hub"
    },
    {
      title: "Billing & Claims",
      description: "Manage invoicing, collect cashier payments, trigger insurance pre-authorizations, view claims ledgers, and manage reversals or refunds.",
      tab: "billing",
      icon: DollarSign,
      highlight: "Billing Desk"
    },
    {
      title: "System Admin & Payroll Console",
      description: "Manage facility details, toggle active modules, invite team members, adjust progressive Kenyan PAYE taxes, manage statutory deductions (NSSF/SHIF/Housing Levy), and process monthly employee payslips.",
      tab: "admin",
      icon: Settings,
      highlight: "Admin Controls"
    },
    {
      title: "Ready to Begin!",
      description: "You've successfully completed the tour! You can restart this tour anytime by clicking the Help icon in the top header. Enjoy your workspace!",
      tab: "dashboard",
      icon: CheckCircle,
      highlight: "Setup Complete"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setActiveTab(steps[nextStep].tab);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      setActiveTab(steps[prevStep].tab);
    }
  };

  const handleComplete = () => {
    if (user?.id) {
      localStorage.setItem(`egesa_tour_completed_${user.id}`, 'true');
    }
    onClose();
  };

  const current = steps[step];
  const StepIcon = current.icon;
  const progressPercent = ((step + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center pointer-events-none p-4 md:p-6 select-none">
      {/* Semi-transparent backdrop only for first and last step to draw attention */}
      {(step === 0 || step === steps.length - 1) && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm pointer-events-auto transition-all duration-300" />
      )}

      {/* Floating Card */}
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="relative w-full max-w-lg bg-slate-900/95 border border-teal-500/20 rounded-2xl shadow-2xl shadow-teal-950/30 backdrop-blur-xl p-5 pointer-events-auto overflow-hidden text-slate-100"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-950/50 border border-teal-500/20 text-teal-400">
              <StepIcon className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/30 border border-teal-500/10 px-2 py-0.5 rounded-full">
              {current.highlight}
            </span>
          </div>
          <button 
            onClick={handleComplete} 
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 p-1.5 rounded-lg transition"
            title="Skip Tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 min-h-[100px]">
          <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
            {current.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
          <div className="text-[10px] font-medium text-slate-400">
            Step <span className="font-bold text-teal-400">{step + 1}</span> of {steps.length}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700/80 hover:bg-slate-750 transition text-slate-300"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-650 hover:to-teal-700 text-slate-950 shadow-md shadow-teal-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {step === steps.length - 1 ? (
                <>Finish <Sparkles className="h-3.5 w-3.5 ml-0.5" /></>
              ) : (
                <>Next <ArrowRight className="h-3.5 w-3.5 ml-0.5" /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
