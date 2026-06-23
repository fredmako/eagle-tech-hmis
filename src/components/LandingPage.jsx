import { Menu, X, CheckCircle, Send, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Hero } from './landing/sections/Hero';
import { StatsStrip } from './landing/sections/StatsStrip';
import { ModulesGrid } from './landing/sections/ModulesGrid';
import { Pricing } from './landing/sections/Pricing';
import { About } from './landing/sections/About';
import { Footer } from './landing/sections/Footer';
import { ThemeToggle } from './ui/ThemeToggle';

export default function LandingPage({
  onNavigateToLogin,
  onNavigateToSignup,
  onNavigateToCards,
  theme,
  onToggleTheme,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('Technical Issue');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const faqs = [
    {
      q: "What features come with each package?",
      a: "We offer three clear plans:\n- Basic Care (Free): Outpatient Electronic Medical Records (EMR), patient registration/queuing, basic triage vitals, clinical SOAP notes, and standard laboratory reporting.\n- Standard Care ($29/mo): Everything in Free plus full digital pharmacy, billing/cashier modules, radiology scan catalogs, operations procurement desks, and customized subdomains.\n- Enterprise Elite ($89/mo): Everything in Pro plus Kenyan MOH clinical validations, multi-tenant payment gateways (Stripe, PayPal, M-Pesa STK), interactive bed layout room editors, and self-service patient portals."
    },
    {
      q: "How do I log in to the Eagle Tech HMIS platform?",
      a: "Logging in is simple. Click the 'Sign In' button at the top right of the homepage. You can then enter your registered corporate email and password. If your organization has configured single sign-on (SSO), you can also click 'Continue with Google' to authenticate with your Google Workspace credentials."
    },
    {
      q: "How do I create an account as a staff member?",
      a: "Staff accounts are created by invitation or approval. First, your hospital administrator must register the facility. After that, you can sign up with your details. Your account will remain in a pending state until a facility administrator or HR manager approves your role request under Admin Settings > Human Resources."
    },
    {
      q: "How do I register a hospital on the platform?",
      a: "To register a new hospital facility, click the 'Register Hospital' button at the top right of the homepage. Fill in the organization registration form, providing details like your facility name, licensing credentials, and your MFL code (Master Facility List). The initial registering user will automatically become the primary Facility Administrator."
    },
    {
      q: "How do I register and configure a pharmacy?",
      a: "Once your hospital is registered under a Standard Care or Enterprise Elite subscription, the admin can navigate to the Procurement tab within Admin Settings. Here you can configure pharmacy attributes, enter drug catalogs, set markup multipliers, and record initial stock quantities to activate the digital pharmacy module."
    },
    {
      q: "How do I configure and register a new pharmacy workflow?",
      a: "Navigating the pharmacy module is straightforward. Once your facility is registered under a Standard or Enterprise plan, the administrator can customize drug inventories, unit prices, and category identifiers via the Procurement Settings. Pharmacists can process incoming prescriptions from clinical consultations or add walk-in patients directly to dispense medications and queue unpaid invoices instantly."
    },
    {
      q: "Can I distribute facility administration responsibilities?",
      a: "Yes. Under the Administrative Settings panel, administrators can access the 'Settings Delegation' matrix. This allows you to delegate specific settings tabs (e.g. SMTP config, HR manager settings, or ward arrangements) to specific staff profiles or roles, ensuring administrative duties are securely partitioned."
    },
    {
      q: "How do we hook up lab analyzers for automatic results sync?",
      a: "In the Laboratory module, select the 'Automation Config' tab. Select the analyzer model and enter communication parameters—serial COM port (COM1–COM8) with baud rates for RS-232, or TCP/IP address and port. Technicians can click 'Retrieve Analyzer Data' to pull ASTM/HL7 test runs, verify parameter bounds, and save diagnostic results instantly."
    }
  ];

  const helpDocs = [
    {
      category: "Account Access",
      title: "How to Log In",
      short: "Learn how to access your staff workspace and authenticate sessions.",
      content: [
        "Eagle Tech HMIS employs strict role-based session control to keep clinical and patient data secure.",
        "1. Access the main login screen. Enter your registered email address and password.",
        "2. If your organization has enabled single sign-on (SSO), click 'Continue with Google' to authenticate via your corporate account.",
        "3. Secure Session Duration: For security reasons, authentication tokens auto-refresh. If you have been idle, the platform will automatically refresh your credentials in the background.",
        "4. Password Recovery: If you forget your password, click 'Forgot Password' to trigger an automated recovery email."
      ]
    },
    {
      category: "Onboarding",
      title: "How to Create an Account",
      short: "Guidelines for registering your organization and inviting team members.",
      content: [
        "To get started with Eagle Tech HMIS, the head administrator must first set up the hospital workspace.",
        "1. Registering the Organization: Head to the Signup screen. Select 'Register Hospital', fill in your facility's MFL code, licensing details, logo, and hospital name.",
        "2. Administrative Account: The credentials entered during onboarding will form the primary Facility Administrator profile.",
        "3. Staff Onboarding: Once logged into the dashboard, go to Admin Settings > Human Resources. From here, you can invite clinicians, lab techs, pharmacists, and cashiers, or approve pending employee signup requests."
      ]
    },
    {
      category: "Facilities",
      title: "How to Register a Hospital",
      short: "Configure wings, clinics, layout editors, and hospital profiles.",
      content: [
        "Hospital configuration allows you to model your physical space and clinics dynamically.",
        "1. Clinic Customization: Go to Admin Settings > Hospital Profile to set up active departments (e.g. ANC, Triage, Consultation, Laboratory, Pharmacy, Billing).",
        "2. Ward and Bed Setup: Model inpatient wings (Male Ward, Female Ward, etc.). Administrators can assign beds, track cleaning schedules, and configure coordinate positions.",
        "3. Room Layout Editor: Enterprise plans unlock the 'Room Layout Editor'. Admins can visually drag-and-drop beds, assign angles, and group them into logical room divisions for clinical charting."
      ]
    },
    {
      category: "Pharmacies",
      title: "How to Register a Pharmacy",
      short: "Activate drug catalogs, set markup multipliers, and configure walk-in workflows.",
      content: [
        "Model your drug distribution center and manage stock movements cleanly.",
        "1. Catalog Initialization: Go to Admin Settings > Procurement Settings. Here you can add medications, assign clinical categories, enter cost/sale unit prices, and define safety reorder thresholds.",
        "2. Stock Movements: Log stock-ins, adjustments (for damages), and review sales transaction trails.",
        "3. Prescriptions & Walk-ins: Pharmacists can review active outpatient prescription orders or process direct walk-in requests with no preceding consultation by searching the drug registry directly."
      ]
    }
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;

    setSupportLoading(true);
    setSupportError('');

    try {
      const ticketId = 'ticket_' + Math.random().toString(36).substring(2, 12);
      const newTicket = {
        id: ticketId,
        user_name: supportName.trim(),
        user_email: supportEmail.trim(),
        subject: supportSubject,
        message: supportMessage.trim(),
        status: 'pending'
      };

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // 1. Save support ticket in DB proxy (whitelisted for unauthenticated inserts)
      const dbRes = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'support_tickets',
          rows: newTicket
        })
      });

      if (!dbRes.ok) {
        const errorData = await dbRes.json();
        throw new Error(errorData.error || 'Failed to submit support ticket.');
      }

      // 2. Dispatch Automated Email Confirmation
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: supportEmail.trim(),
            subject: `Support Ticket Logged: [#${ticketId.substring(7, 13)}] - ${supportSubject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Support Ticket Received</h2>
                <p>Hello <strong>${supportName}</strong>,</p>
                <p>We have successfully received your platform support ticket. Our administration team is reviewing your query and will reply shortly.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 4px;">
                  <strong>Ticket Reference:</strong> #${ticketId.substring(7, 13)}<br/>
                  <strong>Subject:</strong> ${supportSubject}<br/>
                  <strong>Query Details:</strong><br/>
                  <p style="color: #475569; font-style: italic; margin-top: 5px;">"${supportMessage.trim()}"</p>
                </div>
                <p>Thank you for choosing Eagle Tech HMIS.</p>
                <p style="color: #64748b; font-size: 11px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
                  This is an automated platform alert. Please do not reply directly to this notification.
                </p>
              </div>
            `
          })
        });
      } catch (mailErr) {
        console.warn('[Support Form Email] Notification skipped/failed:', mailErr);
      }

      // Reset Form
      setSupportName('');
      setSupportEmail('');
      setSupportSubject('Technical Issue');
      setSupportMessage('');
      setSupportSuccess(true);
    } catch (err) {
      console.error('Support ticket submission failed:', err);
      setSupportError(err.message || 'Failed to submit support ticket.');
    } finally {
      setSupportLoading(false);
    }
  };

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
            <a href="#faqs" className="hover:text-fg-strong transition-colors">Help & FAQs</a>
            <a href="#support" className="hover:text-fg-strong transition-colors">Support</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
            <button onClick={onNavigateToLogin} className="text-sm font-semibold text-fg-muted hover:text-fg-strong transition-colors px-3 py-1.5 cursor-pointer">Sign In</button>
            <button onClick={onNavigateToSignup} className="text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-medium active:scale-[0.97] cursor-pointer">Register Hospital</button>
            {onNavigateToCards && (
              <button onClick={onNavigateToCards} className="text-sm font-semibold text-fg-muted hover:text-fg-strong transition-colors px-3 py-1.5 cursor-pointer">
                Business Cards
              </button>
            )}
          </div>
          <div className="md:hidden flex items-center gap-2">
            {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
            <button className="text-fg-muted hover:text-fg-strong transition-colors p-1" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-background/95 border-t border-border animate-fadeIn">
            <div className="px-6 py-4 space-y-3 text-sm font-medium">
              <a href="#modules" className="block text-fg-muted hover:text-fg-strong py-1" onClick={() => setMobileOpen(false)}>Modules</a>
              <a href="#pricing" className="block text-fg-muted hover:text-fg-strong py-1" onClick={() => setMobileOpen(false)}>Pricing</a>
              <a href="#about" className="block text-fg-muted hover:text-fg-strong py-1" onClick={() => setMobileOpen(false)}>About</a>
              <a href="#faqs" className="block text-fg-muted hover:text-fg-strong py-1" onClick={() => setMobileOpen(false)}>Help & FAQs</a>
              <a href="#support" className="block text-fg-muted hover:text-fg-strong py-1" onClick={() => setMobileOpen(false)}>Support</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => { onNavigateToLogin(); setMobileOpen(false); }} className="text-left text-fg-muted hover:text-fg-strong cursor-pointer">Sign In</button>
                <button onClick={() => { onNavigateToSignup(); setMobileOpen(false); }} className="font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center cursor-pointer">Register Hospital</button>
                {onNavigateToCards && (
                  <button onClick={() => { onNavigateToCards(); setMobileOpen(false); }} className="text-left text-fg-muted hover:text-fg-strong cursor-pointer">
                    Business Cards
                  </button>
                )}
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
        
        {/* Help & FAQ Section */}
        <section id="faqs" className="py-20 bg-slate-900/20 border-t border-slate-900 font-sans relative z-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center space-y-3 mb-16">
              <span className="text-xs text-primary font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Knowledge Hub</span>
              <h2 className="text-2xl font-serif text-fg-strong sm:text-3xl">Help Center & Frequently Asked Questions</h2>
              <p className="text-xs text-fg-muted max-w-xl mx-auto">
                Explore our guide documents and quick answers to configure, onboard, and manage your clinical workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1 & 2: Interactive FAQs Accordion (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-2 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Frequently Asked Questions
                </h3>
                
                {faqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div 
                      key={idx}
                      className="bg-slate-900/60 border border-slate-850/80 rounded-xl overflow-hidden transition-all duration-300"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                        className="w-full py-4 px-5 text-left flex items-center justify-between text-slate-200 hover:text-slate-100 font-bold text-xs cursor-pointer focus:outline-none"
                      >
                        <span>{faq.q}</span>
                        <span className={`text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                          <ChevronDown size={14} />
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-900/60 pt-3 animate-fadeIn">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Column 3: Quick Support Documents / Guides (1/3 width) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-2 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Support Documents & Guides
                </h3>

                <div className="space-y-3">
                  {helpDocs.map((doc, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedDoc(doc)}
                      className="p-4 rounded-xl border border-slate-855 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-800 transition cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{doc.category}</span>
                        <ChevronRight size={12} className="text-slate-500" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-250 mt-0.5">{doc.title}</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{doc.short}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Guide Document Details Modal */}
          {selectedDoc && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-fadeIn">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
                
                <div className="p-6 border-b border-slate-850 flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{selectedDoc.category} Guide</span>
                    <h3 className="text-base font-bold text-slate-100 mt-1">{selectedDoc.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedDoc(null)} 
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition focus:outline-none cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {selectedDoc.content.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-850 flex justify-between items-center gap-4">
                  <span className="text-[10px] text-slate-500 italic">Need further assistance? Submit a ticket below.</span>
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] py-1.5 px-4 rounded-lg transition cursor-pointer"
                  >
                    Contact Support Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Support Section */}
        <section id="support" className="py-20 bg-slate-950/40 relative z-10 border-t border-slate-900 font-sans">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-2xl font-serif text-fg-strong sm:text-3xl">Get Platform Support</h2>
              <p className="text-xs text-fg-muted max-w-xl mx-auto">
                Need help with hospital onboarding, configurations, or have billing questions? Submit a ticket and our platform team will reach out.
              </p>
            </div>

            {supportSuccess ? (
              <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-6 rounded-2xl text-center space-y-3 max-w-lg mx-auto animate-fadeIn">
                <CheckCircle size={36} className="mx-auto text-teal-450 animate-bounce" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Ticket Submitted Successfully!</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We have logged your support query. A confirmation email has been sent to your email address. Our team will review and respond shortly.
                </p>
                <button
                  onClick={() => setSupportSuccess(false)}
                  className="text-xs font-bold text-teal-400 underline cursor-pointer mt-2 block mx-auto"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl max-w-xl mx-auto space-y-4 shadow-xl">
                {supportError && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-2.5 rounded text-xs">
                    {supportError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Email</label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject / Category</label>
                  <select
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Onboarding & Registration">Onboarding & Registration</option>
                    <option value="Billing & Account Plans">Billing & Account Plans</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Detailed Message</label>
                  <textarea
                    required
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition resize-none"
                    placeholder="Describe your query in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98]"
                >
                  {supportLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  Submit Support Ticket
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
