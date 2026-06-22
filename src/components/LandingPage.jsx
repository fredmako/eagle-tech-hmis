import { useState, useEffect } from 'react';
import { Menu, X, CheckCircle, Send, RefreshCw } from 'lucide-react';
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
