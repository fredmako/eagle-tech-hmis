import React, { useState, useEffect } from 'react';
import { Menu, X, CheckCircle, Send, RefreshCw, ChevronDown, ChevronRight, MessageSquare, Search, HelpCircle, Activity, DollarSign, Settings, Layers, LayoutDashboard } from 'lucide-react';
import { Hero } from './landing/sections/Hero';
import { StatsStrip } from './landing/sections/StatsStrip';
import { ModulesGrid } from './landing/sections/ModulesGrid';
import { Pricing } from './landing/sections/Pricing';
import { About } from './landing/sections/About';
import { Footer } from './landing/sections/Footer';
import { ThemeToggle } from './ui/ThemeToggle';

export default function LandingPage({
  user,
  onNavigateToLogin,
  onNavigateToSignup,
  onNavigateToCards,
  onNavigateToDashboard,
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
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState('all');

  // Chatbot Assistant States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am EagleBot, your virtual HMIS assistant. Ask me anything about our subscription packages, hospital setup, pharmacy configuration, or laboratory serial/COM port syncing!' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);

  const faqs = [
    {
      q: "What features come with each package?",
      a: "We offer three clear plans:\n- Basic Care (Free): Outpatient Electronic Medical Records (EMR), patient registration/queuing, basic triage vitals, clinical SOAP notes, and standard laboratory reporting.\n- Standard Care ($29/mo): Everything in Free plus full digital pharmacy, billing/cashier modules, radiology scan catalogs, operations procurement desks, and customized subdomains.\n- Enterprise Elite ($89/mo): Everything in Pro plus Kenyan MOH clinical validations, multi-tenant payment gateways (Stripe, PayPal, M-Pesa STK), interactive bed layout room editors, and self-service patient portals.",
      category: "billing"
    },
    {
      q: "How do I log in to the Eagle Tech HMIS platform?",
      a: "Logging in is simple. Click the 'Sign In' button at the top right of the homepage. You can then enter your registered corporate email and password. If your organization has configured single sign-on (SSO), you can also click 'Continue with Google' to authenticate with your Google Workspace credentials.",
      category: "setup"
    },
    {
      q: "How do I create an account as a staff member?",
      a: "Staff accounts are created by invitation or approval. First, your hospital administrator must register the facility. After that, you can sign up with your details. Your account will remain in a pending state until a facility administrator or HR manager approves your role request under Admin Settings > Human Resources.",
      category: "setup"
    },
    {
      q: "How do I register a hospital on the platform?",
      a: "To register a new hospital facility, click the 'Register Hospital' button at the top right of the homepage. Fill in the organization registration form, providing details like your facility name, licensing credentials, and your MFL code (Master Facility List). The initial registering user will automatically become the primary Facility Administrator.",
      category: "setup"
    },
    {
      q: "How do I register and configure a pharmacy?",
      a: "Once your hospital is registered under a Standard Care or Enterprise Elite subscription, the admin can navigate to the Procurement tab within Admin Settings. Here you can configure pharmacy attributes, enter drug catalogs, set markup multipliers, and record initial stock quantities to activate the digital pharmacy module.",
      category: "clinical"
    },
    {
      q: "How do I configure and register a new pharmacy workflow?",
      a: "Navigating the pharmacy module is straightforward. Once your facility is registered under a Standard or Enterprise plan, the administrator can customize drug inventories, unit prices, and category identifiers via the Procurement Settings. Pharmacists can process incoming prescriptions from clinical consultations or add walk-in patients directly to dispense medications and queue unpaid invoices instantly.",
      category: "clinical"
    },
    {
      q: "Can I distribute facility administration responsibilities?",
      a: "Yes. Under the Administrative Settings panel, administrators can access the 'Settings Delegation' matrix. This allows you to delegate specific settings tabs (e.g. SMTP config, HR manager settings, or ward arrangements) to specific staff profiles or roles, ensuring administrative duties are securely partitioned.",
      category: "setup"
    },
    {
      q: "How do we hook up lab analyzers for automatic results sync?",
      a: "In the Laboratory module, select the 'Automation Config' tab. Select the analyzer model and enter communication parameters—serial COM port (COM1–COM8) with baud rates for RS-232, or TCP/IP address and port. Technicians can click 'Retrieve Analyzer Data' to pull ASTM/HL7 test runs, verify parameter bounds, and save diagnostic results instantly.",
      category: "clinical"
    },
    {
      q: "How is the Antenatal Care (ANC) and Family Planning (FP) registry structured?",
      a: "Antenatal Care (ANC) and Family Planning (FP) are decoupled from the general patient registration to simplify triage. Under MCH Clinic, ANC tracks gestational parameters, blood pressure, fetal heart rates, risk assessments, and EDDs, while FP manages counseling logs and WHO eligibility checks.",
      category: "clinical"
    },
    {
      q: "Can we dynamically configure inpatient wings and bed capacities?",
      a: "Yes, facility administrators or HR managers can dynamically organize the facility space under Maternity Setup > Wards. You can add distinct Blocks, Wards, Bed Types, and Bed grids with cash/corporate prices to handle admissions.",
      category: "clinical"
    },
    {
      q: "How does the unified Pharmacy and POS sales entry work?",
      a: "The Pharmacy Desk is unified with a POS sales entry workflow. Using the inner secondary sidebar, pharmacists can switch between the EMR Dispense Queue (prescription releases), Sell Drug(s) (with code/description catalogs, cart discounts, and patient search), Modify Sale (to restore held carts), and Paid Drugs (to review completed transactions).",
      category: "clinical"
    },
    {
      q: "How does the lobby queue board and ticket calling system work?",
      a: "Staff members can call patient tickets directly from the Queue Management panel by clicking the megaphone icon (📣) next to their name. This inserts the ticket code, name, and destination desk into the database. A public lobby display screen at `/queue-board` (e.g. `/hospital/egesa/queue-board`) will instantly play a synthesizer chime tone and announce the ticket number using voice synthesis while flashing the details on screen.",
      category: "clinical"
    },
    {
      q: "How do I schedule and manage patient appointments?",
      a: "Select the Appointments Schedule module. Choose a date and doctor to load the timeline slot grid. Click on any vacant slot, search for a patient, and book the slot. You can update appointment status (booked, checked in, completed, cancelled) or check-in patients to push them automatically into the clinical triage queue.",
      category: "clinical"
    },
    {
      q: "How does the system ensure compliance with the Kenya Data Protection Act, 2019?",
      a: "Eagle Tech HMIS separates personal and sensitive data (health logs), enforces Role-Based Access Controls (RBAC), logs all audit trails of data edits, and supports data subject rights (access, correction, deletion) under the Act. Subscribing hospitals act as the Data Controllers, while Eagle Tech Solutions acts as the Data Processor.",
      category: "clinical"
    },
    {
      q: "Can I customize the visual theme and branding of my facility portal?",
      a: "Yes. Facility admins can upload custom logos and configure theme modes (Midnight Navy, Royal Purple, Emerald, Teal, Warm Amber) and slate shades under System Settings. The entire interface—including dashboards, icons, buttons, and custom subdomains—will automatically inherit your selected branding colors.",
      category: "setup"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions', icon: Layers, count: faqs.length },
    { id: 'setup', name: 'Getting Started', icon: Settings, count: faqs.filter(f => f.category === 'setup').length },
    { id: 'clinical', name: 'Clinical Modules', icon: Activity, count: faqs.filter(f => f.category === 'clinical').length },
    { id: 'billing', name: 'Pricing & Plans', icon: DollarSign, count: faqs.filter(f => f.category === 'billing').length }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
    const matchesSearch = faqSearch === '' || 
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
      faq.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const handleChatSend = (text) => {
    if (!text.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: text.trim() }]);
    setChatInput('');
    setChatTyping(true);

    setTimeout(() => {
      let reply = '';
      const query = text.toLowerCase().trim();

      if (query.includes('free') || query.includes('pricing') || query.includes('plan') || query.includes('package') || query.includes('cost') || query.includes('dollar') || query.includes('subscription')) {
        reply = 'We offer three simple plans:\n- Basic Care (Free): Outpatient EMR, registration/queues, and clinical SOAP notes.\n- Standard Care ($29/mo): Adds pharmacy inventory, cashier billing, and custom subdomains.\n- Enterprise Elite ($89/mo): Adds Kenyan MOH clinical registries, Stripe/M-Pesa STK checkouts, and room ward layout builders.';
      } else if (query.includes('login') || query.includes('log in') || query.includes('sign in') || query.includes('access') || query.includes('credential')) {
        reply = 'To log in, click "Sign In" at the top right of the homepage. You can authenticate using your registered email and password, or use Google SSO if configured by your administrator.';
      } else if (query.includes('register') || query.includes('hospital') || query.includes('sign up') || query.includes('account creation') || query.includes('join')) {
        reply = 'To set up your hospital, click "Register Hospital" at the top right. Enter your organization name, MFL code, and license number. The first registered user automatically becomes the facility administrator.';
      } else if (query.includes('pharmacy') || query.includes('drug') || query.includes('dispens') || query.includes('procurement') || query.includes('pos') || query.includes('sell') || query.includes('held') || query.includes('sale') || query.includes('invoice')) {
        reply = 'The Pharmacy Desk is unified with a POS sales entry workflow. In addition to processing EMR prescriptions from the Dispense Queue, it supports direct walk-in sales catalog searches, pagination, cart discounts, customer details, held carts management (under Modify Sale), and date-range invoice logs (under Paid Drugs).';
      } else if (query.includes('mch') || query.includes('anc') || query.includes('pregnancy') || query.includes('contraceptive') || query.includes('family planning') || query.includes('welfare') || query.includes('immunization') || query.includes('vaccine')) {
        reply = 'Our MCH Clinic module manages maternal and child healthcare programs. It tracks active pregnancies (ANC checkups, risk levels, EDD calculations), contraceptive followups (family planning methods, counseling), and child welfare immunization registries (BCG, Polio, Measles, and Pentavalent doses) decoupled from general triage.';
      } else if (query.includes('maternity') || query.includes('ward') || query.includes('bed') || query.includes('wing') || query.includes('room')) {
        reply = 'Under Maternity Setup and Inpatient Wards, administrators can dynamically define Blocks, Wards, Bed Types, and individual beds with custom cash/corporate pricing. A live visual bed grid allows tracking occupied vs vacant vs dirty states in real-time.';
      } else if (query.includes('access') || query.includes('permission') || query.includes('department') || query.includes('lock') || query.includes('restrict') || query.includes('denied')) {
        reply = 'Eagle Tech HMIS implements strict role and department-based access controls. Decoupled modules (such as Maternity and MCH) are locked and only accessible if you are a facility administrator, or if you have been specifically assigned to work in those departments (e.g. MCH/ANC/Maternity).';
      } else if (query.includes('queue') || query.includes('board') || query.includes('ticket') || query.includes('call') || query.includes('lobby') || query.includes('voice') || query.includes('announc')) {
        reply = 'Eagle Tech HMIS features a bank-like Queue Calling & Lobby Ticket Display system. Staff can click the megaphone icon (📣) in the Queue Management desk to announce patient tickets. The public lobby TV board (at `/queue-board`) automatically flashes the ticket code, chimes, and reads the ticket/patient details out loud using voice synthesis.';
      } else if (query.includes('lab') || query.includes('analyzer') || query.includes('instrument') || query.includes('machine') || query.includes('serial') || query.includes('com')) {
        reply = 'In the Laboratory module under "Automation Config", technicians can specify RS-232 serial parameters (COM1-COM8, baud rates) or TCP/IP details to retrieve diagnostic data (ASTM/HL7 format) from physical analyzers instantly.';
      } else if (query.includes('referral') || query.includes('referred')) {
        reply = 'Our system fully supports referrals! You can specify Referred From details when opening a visit ticket, and Referred To details with required reconciliation check boxes when completing care on the clinical queue.';
      } else if (query.includes('appointment') || query.includes('schedul') || query.includes('calendar') || query.includes('slot')) {
        reply = 'The Appointments Schedule module features an interactive hourly grid where you can search for patients and book slots under specific doctors. You can update statuses (booked, checked_in, completed, cancelled). Checking in a patient automatically routes them to the active triage queue.';
      } else if (query.includes('policy') || query.includes('privacy') || query.includes('agreement') || query.includes('sla') || query.includes('gdpr') || query.includes('protection') || query.includes('act') || query.includes('odpc')) {
        reply = 'Our platform is fully aligned with the Kenya Data Protection Act, 2019. Subscribing facilities act as Data Controllers, and Eagle Tech acts as the Data Processor. We guarantee a 99.9% uptime SLA with a 7-day payment grace period before read-only lock. You can access the full Privacy Policy and Service Agreement modals in the page footer.';
      } else if (query.includes('theme') || query.includes('color') || query.includes('font') || query.includes('personalization') || query.includes('accent') || query.includes('slate')) {
        reply = 'Eagle Tech HMIS supports deep branding personalization. You can toggle between Teal, Midnight Navy, Emerald, Royal Purple, and Warm Amber themes, adjust light/dark modes, select fonts, and customize slate readability under System Settings.';
      } else if (query.includes('card') || query.includes('qr') || query.includes('business card') || query.includes('website')) {
        reply = 'You can generate professional, white-labeled hospital staff business cards under the Admin settings. The cards default to our website www.eagletechsolutions.tech and feature a dynamic scan-ready QR code that routes scanners to the portal website.';
      } else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('bot')) {
        reply = 'Hi there! I am EagleBot, your Eagle Tech HMIS assistant. Ask me anything about our software modules, integration tools, or setups!';
      } else {
        reply = 'I am not sure I understand that query fully. Try asking about "pricing plans", "how to log in", "register a hospital", "lab automation", "appointments scheduler", "data protection policy", or submit a support ticket in the support form below!';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
      setChatTyping(false);
    }, 800);
  };

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
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
            {user ? (
              <button onClick={onNavigateToDashboard} className="text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-medium active:scale-[0.97] cursor-pointer flex items-center gap-1.5">
                <LayoutDashboard size={14} />
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button onClick={onNavigateToLogin} className="text-sm font-semibold text-fg-muted hover:text-fg-strong transition-colors px-3 py-1.5 cursor-pointer">Sign In</button>
                <button onClick={onNavigateToSignup} className="text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-medium active:scale-[0.97] cursor-pointer">Register Hospital</button>
              </>
            )}
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
                {user ? (
                  <button onClick={() => { onNavigateToDashboard(); setMobileOpen(false); }} className="font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5">
                    <LayoutDashboard size={14} />
                    <span>Go to Dashboard</span>
                  </button>
                ) : (
                  <>
                    <button onClick={() => { onNavigateToLogin(); setMobileOpen(false); }} className="text-left text-fg-muted hover:text-fg-strong cursor-pointer">Sign In</button>
                    <button onClick={() => { onNavigateToSignup(); setMobileOpen(false); }} className="font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center cursor-pointer">Register Hospital</button>
                  </>
                )}
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
        <Hero 
          user={user}
          onPrimary={user ? onNavigateToDashboard : onNavigateToSignup}
          onSecondary={user ? onNavigateToDashboard : onNavigateToLogin}
        />
        <StatsStrip />
        <ModulesGrid />
        <Pricing />
        <About onRegister={onNavigateToSignup} />
             {/* Help & FAQ Section */}
        <section id="faqs" className="py-20 bg-slate-900/20 border-t border-slate-900 font-sans relative z-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center space-y-3 mb-8">
              <span className="text-xs text-primary font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Knowledge Base</span>
              <h2 className="text-2xl font-serif text-fg-strong sm:text-3xl">Frequently Asked Questions</h2>
              <p className="text-xs text-fg-muted max-w-xl mx-auto">
                Explore our guide documents and search quick answers to configure, onboard, and manage your clinical workflows.
              </p>
            </div>

            {/* Premium Interactive Search Input */}
            <div className="relative max-w-xl mx-auto mb-12">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search questions, clinical modules, billing packages..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/80 transition-all shadow-lg"
              />
              {faqSearch && (
                <button
                  onClick={() => setFaqSearch('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Categories Selector & CTA */}
              <div className="space-y-6">
                {/* Desktop Categories List */}
                <div className="hidden lg:block space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">
                    Browse Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.map((cat) => {
                      const IconComponent = cat.icon;
                      const isActive = faqCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setFaqCategory(cat.id);
                            setActiveFaq(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                            isActive
                              ? 'bg-primary/10 border-primary/30 text-primary shadow-glow shadow-primary/5 font-semibold'
                              : 'bg-slate-900/20 border-slate-900/40 text-slate-400 hover:bg-slate-900/45 hover:text-slate-200 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent size={15} className={isActive ? 'text-primary' : 'text-slate-500'} />
                            <span className="text-xs">{cat.name}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-primary/20 text-primary' : 'bg-slate-800/40 text-slate-500'
                          }`}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Categories Selector */}
                <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 scrollbar-none snap-x">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isActive = faqCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setFaqCategory(cat.id);
                          setActiveFaq(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shrink-0 snap-align-start cursor-pointer text-xs transition-all ${
                          isActive
                            ? 'bg-primary/15 border-primary/30 text-primary font-semibold'
                            : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComponent size={14} />
                        <span>{cat.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-primary/25 text-primary' : 'bg-slate-800/60 text-slate-500'
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* EagleBot CTA (Desktop only) */}
                <div className="hidden lg:block p-5 bg-gradient-to-br from-primary/10 to-teal-500/5 rounded-2xl border border-primary/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Still have questions?</h4>
                      <p className="text-[10px] text-slate-400 leading-tight">Chat with EagleBot for instant support.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-glow shadow-primary/10"
                  >
                    <MessageSquare size={14} />
                    <span>Launch EagleBot</span>
                  </button>
                </div>

                {/* Desktop Support Documents / Guides List */}
                <div className="hidden lg:block space-y-4 pt-4 border-t border-slate-900/60">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                    <HelpCircle size={14} className="text-primary" />
                    Guides & Documents
                  </h3>
                  <div className="space-y-3">
                    {helpDocs.map((doc, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedDoc(doc)}
                        className="p-4 rounded-xl border border-slate-850 bg-slate-900/20 hover:bg-slate-900/50 hover:border-slate-800 transition cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{doc.category}</span>
                          <ChevronRight size={12} className="text-slate-500" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mt-0.5">{doc.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{doc.short}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: FAQ Accordion Panels */}
              <div className="lg:col-span-2 space-y-4">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq) => {
                    const originalIndex = faqs.findIndex(f => f.q === faq.q);
                    const isOpen = activeFaq === originalIndex;
                    return (
                      <div 
                        key={originalIndex}
                        className={`backdrop-blur-md bg-slate-900/40 border rounded-2xl overflow-hidden transition-all duration-300 ${
                          isOpen 
                            ? 'border-primary/45 shadow-glow shadow-primary/5 translate-x-1' 
                            : 'border-teal-500/10 hover:border-teal-500/35'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(isOpen ? null : originalIndex)}
                          className="w-full py-4.5 px-6 text-left flex items-center justify-between text-slate-200 hover:text-slate-105 font-bold text-xs cursor-pointer focus:outline-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`h-1.5 w-1.5 rounded-full transition-all ${
                              isOpen ? 'bg-primary scale-125' : 'bg-slate-700'
                            }`} />
                            <span>{faq.q}</span>
                          </div>
                          <span className={`text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                            <ChevronDown size={14} />
                          </span>
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-900/60 pt-4 animate-fadeIn whitespace-pre-line">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-slate-900/20 border border-slate-850/80 rounded-2xl space-y-4 animate-fadeIn">
                    <div className="h-12 w-12 rounded-full bg-slate-800/40 flex items-center justify-center mx-auto text-slate-500">
                      <HelpCircle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-350">No questions found</h4>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                        We couldn't find any FAQs matching "{faqSearch}". Try adjusting your keywords or chat directly with EagleBot.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFaqSearch('');
                        setFaqCategory('all');
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-bold underline transition cursor-pointer"
                    >
                      Clear filters & search
                    </button>
                  </div>
                )}

                {/* Mobile Support Documents & Guides List (Visible only on mobile below FAQs) */}
                <div className="lg:hidden space-y-4 pt-6 mt-6 border-t border-slate-900/60">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle size={14} className="text-primary" />
                    Guides & Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {helpDocs.map((doc, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedDoc(doc)}
                        className="p-4 rounded-xl border border-slate-850 bg-slate-900/20 hover:bg-slate-900/50 hover:border-slate-850 transition cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{doc.category}</span>
                          <ChevronRight size={12} className="text-slate-500" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mt-0.5">{doc.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{doc.short}</p>
                      </div>
                    ))}
                  </div>
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

      {/* Floating Chatbot Widget */}
      <div className="fixed bottom-6 left-6 z-[9999] font-sans">
        {/* Toggle Button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="h-12 w-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-glow shadow-primary/20 hover:scale-105 active:scale-95 transition cursor-pointer"
            aria-label="Open helper chat"
          >
            <MessageSquare size={22} />
          </button>
        )}

        {/* Chat Window */}
        {chatOpen && (
          <div className="w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col h-[450px] animate-fadeIn">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs font-serif">
                    EB
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-slate-900" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1 font-sans">
                    EagleBot <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">Helper</span>
                  </h4>
                  <span className="text-[9px] text-slate-500 block leading-none font-sans">Online & Automated</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages Logs */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl py-2.5 px-3 text-xs leading-relaxed font-sans ${
                      m.sender === 'user'
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                        : 'bg-slate-950/60 border border-slate-855 text-slate-200 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-955 border border-slate-855 text-slate-450 rounded-2xl rounded-tl-none py-2 px-3 text-[10px] italic flex items-center gap-1.5 font-sans">
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" />
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    EagleBot is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Ask Suggestion Chips */}
            <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-900 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 shrink-0">
              {[
                { label: 'Pricing Plans', text: 'What plans do you have and how much do they cost?' },
                { label: 'Register Hospital', text: 'How do I register a hospital?' },
                { label: 'Pharmacy Setup', text: 'How do I register and configure a pharmacy?' },
                { label: 'Lab Sync', text: 'How do we hook up lab analyzers for results sync?' }
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChatSend(chip.text)}
                  className="bg-slate-950 border border-slate-850 hover:border-primary/30 text-[10px] text-slate-400 hover:text-primary py-1 px-2.5 rounded-full transition cursor-pointer shrink-0 font-sans"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend(chatInput);
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask EagleBot a question..."
                className="flex-1 bg-slate-900 border border-slate-855 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-sans"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-1.5 px-4 rounded-lg transition-all cursor-pointer shadow active:scale-[0.98] font-sans"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
