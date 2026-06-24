import { useState, useEffect } from 'react';
import { Reveal } from '../../ui/Reveal';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

export function Footer() {
  const [activeModal, setActiveModal] = useState(null); // 'privacy', 'service', or null

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#privacy') {
        setActiveModal('privacy');
      } else if (hash === '#service') {
        setActiveModal('service');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const closeModal = () => {
    setActiveModal(null);
    if (window.location.hash === '#privacy' || window.location.hash === '#service') {
      window.history.replaceState(null, null, ' ');
    }
  };

  const socials = [
    { 
      name: "Facebook", 
      href: "https://www.facebook.com/groups/1792340884935571", 
      path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" 
    },
    { 
      name: "Twitter", 
      href: "https://twitter.com", 
      path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" 
    },
    { 
      name: "LinkedIn", 
      href: "https://linkedin.com", 
      path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.73C24 .774 23.2 0 22.222 0h.003z" 
    },
    { 
      name: "Instagram", 
      href: "https://instagram.com", 
      path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" 
    }
  ];

  return (
    <footer className="border-t border-border bg-background relative z-10">
      <Reveal as="div" className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Eagle Tech Logo" className="w-6 h-6 rounded-md object-contain" />
          <span className="font-serif text-sm text-fg-strong font-semibold">Eagle Tech HMIS</span>
        </div>
        
        <div className="text-xs text-fg-faint text-center font-sans font-medium flex flex-col items-center gap-2">
          <div>© 2026 Eagle Tech Hospital Management Software Solutions. All rights reserved.</div>
          <div className="flex items-center gap-3 text-2xs text-fg-muted font-bold font-sans">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); window.location.hash = 'privacy'; }} className="hover:text-primary transition-colors cursor-pointer hover:underline">Privacy Policy</a>
            <span className="text-slate-805 font-bold">•</span>
            <a href="#service" onClick={(e) => { e.preventDefault(); setActiveModal('service'); window.location.hash = 'service'; }} className="hover:text-primary transition-colors cursor-pointer hover:underline">Service Agreement</a>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {socials.map((s, idx) => {
              return (
                <motion.a
                  key={idx}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  whileHover={{ y: -3, scale: 1.15, color: 'var(--primary)' }}
                  whileTap={{ scale: 0.95 }}
                  className="text-fg-muted hover:text-fg-strong transition-colors duration-fast cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </motion.a>
              );
            })}
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="font-mono text-2xs uppercase tracking-widest text-fg-faint font-bold hidden sm:block">
            White-Label HMIS v4.0
          </div>
        </div>
      </Reveal>

      {/* Document Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
            
            <div className="p-6 border-b border-slate-850 flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Legal & Compliance Documentation</span>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  {activeModal === 'privacy' ? 'Privacy Policy' : 'Service Agreement (SLA & ToS)'}
                </h3>
              </div>
              <button 
                onClick={closeModal} 
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-350 leading-relaxed scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
              {activeModal === 'privacy' ? (
                <>
                  <p className="font-bold text-slate-200">Effective Date: 24 June 2026</p>
                  <p>
                    <strong>Eagle Tech Solutions</strong> respects your privacy and is committed to protecting your personal data and sensitive personal data (including health records) in strict compliance with the <strong>Kenya Data Protection Act, 2019</strong> (the "Act") and the regulations thereunder.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">1. Data Controller and Data Processor</h4>
                  <p>
                    Under the Act, the subscribing healthcare facility (the Hospital or Clinic) acts as the <strong>Data Controller</strong>, retaining primary control and ownership over patient medical records. Eagle Tech Solutions acts as the <strong>Data Processor</strong>, maintaining cloud database infrastructure, backups, and secure synchronization tools.
                  </p>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">2. Information We Collect</h4>
                  <p>
                    We process both personal data and sensitive personal data (health data) on behalf of the Data Controller:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li><strong>Personal Data:</strong> Names, national ID numbers, email addresses, phone numbers, and profile credentials.</li>
                    <li><strong>Sensitive Personal Data (Health Data):</strong> Physiological vitals, clinical SOAP notes, laboratory results, prescriptions, and diagnosis records (ICD-10).</li>
                  </ul>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">3. Lawful Basis for Processing</h4>
                  <p>
                    Data is processed under the following lawful bases:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li><strong>Consent:</strong> Explicit consent given by patients/staff during registration.</li>
                    <li><strong>Contract:</strong> Necessary for the performance of the healthcare service agreement.</li>
                    <li><strong>Vital Interests:</strong> Processing essential for medical emergencies or protecting patient life.</li>
                  </ul>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">4. Technical Security & Protection</h4>
                  <p>
                    We implement appropriate technical and organizational safeguards:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li>AES-256 encryption-at-rest and TLS 1.3 encryption-in-transit.</li>
                    <li>Strict Role-Based Access Control (RBAC) to segment clinical access.</li>
                    <li>Automatic audit logging of all record modifications.</li>
                  </ul>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">5. Data Sharing and Transfer</h4>
                  <p>
                    We do not sell personal data or health records. Data is shared only with authorized healthcare personnel, when legally compelled by a court of law, or when necessary to protect safety. Any cross-border data transfer is conducted strictly in accordance with Section 48 of the Act.
                  </p>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">6. Your Rights under the Act</h4>
                  <p>
                    Subject to Section 26 of the Act, data subjects have the right to:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li>Be informed of the use to which their personal data is put.</li>
                    <li>Access, correct, or request the deletion of false or misleading data.</li>
                    <li>Object to the processing of all or part of their personal data.</li>
                  </ul>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">7. Data Retention and Deletion</h4>
                  <p>
                    Data is retained only as long as necessary to fulfill clinical workflows or legal obligations. Once no longer required, data is securely purged or anonymized.
                  </p>

                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">8. Complaints and Contact Info</h4>
                  <p>
                    If you have questions, or wish to file a complaint regarding how we process data, please contact our Data Protection Officer at:
                  </p>
                  <p className="font-semibold text-slate-200 mt-1">
                    Eagle Tech Solutions<br />
                    Email: <a href="mailto:info@eagletechsolutions.tech" className="text-teal-400 hover:underline">info@eagletechsolutions.tech</a>
                  </p>
                  <p className="mt-2 text-[10px]">
                    You also have the right to lodge a complaint directly with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> of Kenya.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-200">Effective Date: 24 June 2026</p>
                  <p>
                    This Service Agreement ("Agreement") governs the subscription, deployment, and use of the Eagle Tech Hospital Management Information System (HMIS) software and cloud services provided by <strong>Eagle Tech Solutions</strong>.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">1. Service Level Agreement (SLA) & Uptime</h4>
                  <p>
                    Eagle Tech Solutions guarantees a <strong>99.9% platform service uptime</strong> on all cloud-hosted portals. System performance and latency are actively monitored. Scheduled database optimizations or infrastructure upgrades are performed during low-traffic windows (Sundays 02:00–04:00 EAT), with notifications dispatched to administrators at least 24 hours in advance.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">2. Subscriptions, Fees & Payment Tiers</h4>
                  <p>
                    Services are offered on a recurring subscription basis under three tiers: Basic Care (Free), Standard Care ($29/month), and Enterprise Elite ($89/month) or their equivalent in Kenyan Shillings (Ksh). 
                  </p>
                  <p className="mt-1">
                    Payments are due on the billing cycle date. In the event of a payment failure, a <strong>7-day grace period</strong> is automatically initiated. If the account remains unpaid after the grace period, the workspace will transition to a <strong>read-only lock state</strong>. Normal service, including custom DNS mapping, active queues, and outbound SMTP notifications, will resume immediately upon settlement.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">3. Intellectual Property & White-Label Customization</h4>
                  <p>
                    The subscribing healthcare facility retains full ownership of its trademarks, logos, custom domain branding, and all patient records inputted into the system database. Eagle Tech Solutions retains all intellectual property rights, copyrights, source code, and clinical algorithms of the HMIS application logic.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">4. Medical Liability & Clinical Disclaimer</h4>
                  <p>
                    <strong>IMPORTANT:</strong> Eagle Tech HMIS is an administrative utility, record-keeping framework, and decision-support helper. The system does not make clinical decisions, diagnostic determinations, or therapeutic prescriptions. Full medical responsibility, clinical care decisions, and prescription oversight remain the sole, non-delegable duty of the registered, licensed medical practitioners operating the platform.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">5. Data Protection and Jurisdiction</h4>
                  <p>
                    All clinical files and database tables are protected under the security guidelines of the <strong>Kenya Data Protection Act, 2019</strong>. In the event of a dispute, this Agreement shall be governed by, and construed in accordance with, the laws of the Republic of Kenya.
                  </p>
                  
                  <h4 className="font-bold text-primary uppercase tracking-wide text-[9.5px] mt-2">6. Contact & Support</h4>
                  <p>
                    For service escalations, SLA reports, or billing disputes, please contact our support desk at:
                  </p>
                  <p className="font-semibold text-slate-200 mt-1">
                    Eagle Tech Solutions Support<br />
                    Email: <a href="mailto:info@eagletechsolutions.tech" className="text-teal-400 hover:underline font-sans">info@eagletechsolutions.tech</a>
                  </p>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[9px] text-slate-500 italic text-center sm:text-left">Eagle Tech Legal Compliance. Certified HIPAA & Data Protection Act 2019.</span>
              <button
                onClick={closeModal}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] py-1.5 px-5 rounded-lg transition cursor-pointer"
              >
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}


