import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { 
  HelpCircle, 
  Send, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare, 
  User, 
  Mail, 
  PhoneCall,
  AlertCircle 
} from "lucide-react";

export default function SupportPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("submit"); // "submit" or "history"
  const [subject, setSubject] = useState("Technical Issue");
  const [messageText, setMessageText] = useState("");
  const [facilityEmail, setFacilityEmail] = useState("");
  const [facilityWhatsApp, setFacilityWhatsApp] = useState("");

  useEffect(() => {
    if (user?.facility_id) {
      supabase
        .from('facilities')
        .select('contact_email, whatsapp_number')
        .eq('id', user.facility_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFacilityEmail(data.contact_email || '');
            setFacilityWhatsApp(data.whatsapp_number || '');
          }
        });
    }
  }, [user]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [targetType, setTargetType] = useState('platform'); // 'platform' or 'facility'
  
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const categories = [
    "Technical Issue",
    "Billing & Billing Plans",
    "Hospital Registration",
    "Patient Portal Assistance",
    "Other"
  ];

  const whatsappNumber = (facilityWhatsApp || "254722334455").replace(/[^\d]/g, "");
  const whatsappMessage = encodeURIComponent(
    `Hello, I need help with Eagle Tech HMIS. My name is ${user?.full_name || ""}, facility: ${user?.facility_name || user?.facility_id || "N/A"}.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const fetchMyTickets = async () => {
    if (!user || !user.email) return;
    setLoadingTickets(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');
      
      const res = await fetch(`${apiBase}/db/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          table: "support_tickets",
          queries: [
            { type: "equal", column: "user_email", value: user.email }
          ],
          orderByField: "created_at",
          orderByAsc: false
        })
      });

      if (!res.ok) {
        throw new Error("Failed to load your support queries.");
      }

      const resData = await res.json();
      setTickets(resData.data || []);
    } catch (err) {
      console.error("[SupportPanel] Error fetching tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchMyTickets();
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const ticketId = 'ticket_' + Math.random().toString(36).substring(2, 12);
      const newTicket = {
        id: ticketId,
        user_name: user.full_name || 'Staff User',
        user_email: user.email,
        subject,
        message: messageText.trim(),
        status: 'pending',
        facility_id: targetType === 'facility' ? user.facility_id : null
      };

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');

      // 1. Submit ticket through DB insert proxy
      const dbRes = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          rows: newTicket
        })
      });

      if (!dbRes.ok) {
        const errData = await dbRes.json();
        throw new Error(errData.error || 'Failed to submit support ticket.');
      }

      // 2. Send email notification to user & system admin
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetType === 'facility' 
              ? `${user.email}, ${facilityEmail || 'admin@eagletechsolutions.tech'}` 
              : `${user.email}, admin@eagletechsolutions.tech`,
            subject: `Support Ticket Logged: [#${ticketId.substring(7, 13)}] - ${subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Support Ticket Received</h2>
                <p>Hello <strong>${user.full_name}</strong>,</p>
                <p>We have successfully received your support ticket (Reference: <strong>#${ticketId.substring(7, 13)}</strong>).</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 4px;">
                  <strong>Subject:</strong> ${subject}<br/>
                  <strong>Message:</strong> "${messageText.trim()}"
                </div>
                <p>${targetType === 'facility' ? 'Your local hospital administration is reviewing your help desk query and will reply shortly.' : 'Our platform administrators are reviewing your query and will get back to you shortly.'}</p>
                <p>Thank you,</p>
                <p><strong>${targetType === 'facility' ? user.facility_name || 'Hospital Help Desk' : 'Eagle Tech HMIS Support Team'}</strong></p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error("[SupportPanel] Confirmation email dispatch failed:", emailErr);
      }

      setStatusMessage({
        type: 'success',
        text: `Support ticket #${ticketId.substring(7, 13)} submitted successfully. A confirmation email has been sent.`
      });
      setMessageText("");
      setSubject("Technical Issue");
    } catch (err) {
      console.error("[SupportPanel] Error submitting ticket:", err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred while submitting your ticket. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-slate-100">
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="text-teal-400" size={20} /> Help & Support
          </h2>
          <p className="text-xs text-slate-400 mt-1">Submit support tickets directly to the Super Admin team and view the progress of your queries.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15 text-2xs font-bold transition"
          >
            <PhoneCall size={13} />
            Chat with us on WhatsApp
          </a>
          <div className="flex gap-1.5 bg-slate-900 border border-slate-850 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab("submit"); setStatusMessage(null); }}
            className={`px-3 py-1.5 text-2xs font-bold rounded-md transition ${activeTab === "submit" ? "bg-teal-400 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"}`}
          >
            Log a Query
          </button>
          <button
            onClick={() => { setActiveTab("history"); setStatusMessage(null); setSelectedTicket(null); }}
            className={`px-3 py-1.5 text-2xs font-bold rounded-md transition flex items-center gap-1 ${activeTab === "history" ? "bg-teal-400 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"}`}
          >
            My Queries
          </button>
          </div>
        </div>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15 text-2xs font-bold transition"
      >
        <PhoneCall size={13} />
        Chat with us on WhatsApp
      </a>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">{statusMessage.text}</div>
        </div>
      )}

      {activeTab === "submit" && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Send size={14} /> Submit a Support Ticket
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">User Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={user?.full_name || ""}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-400 cursor-not-allowed font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-400 cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Support Destination</label>
              <div className="flex flex-col sm:flex-row gap-4 bg-slate-955 p-3 rounded-lg border border-slate-800/80 mb-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="targetType"
                    value="platform"
                    checked={targetType === 'platform'}
                    onChange={() => setTargetType('platform')}
                    className="border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <span>Platform Operations (Super Admin)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="targetType"
                    value="facility"
                    checked={targetType === 'facility'}
                    onChange={() => setTargetType('facility')}
                    className="border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <span>Hospital Help Desk (Facility Admin)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Query Category</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-semibold"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Message / Details</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                rows={5}
                placeholder="Describe your issue or question in detail. Please provide facility code or invoice reference if relevant."
                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 placeholder:text-slate-600 resize-none leading-relaxed font-medium"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !messageText.trim()}
                className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs py-2 px-5 rounded-lg shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Submit Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "history" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 animate-fade-in">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket History</span>
              <button
                onClick={fetchMyTickets}
                disabled={loadingTickets}
                className="text-slate-400 hover:text-teal-400 transition cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw size={12} className={loadingTickets ? "animate-spin text-teal-400" : ""} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingTickets ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                  <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-2xs font-semibold">Loading queries...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center p-4">
                  <MessageSquare size={28} className="mb-2 opacity-35" />
                  <span className="text-2xs font-bold block">No tickets found</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Support queries you submit will appear here.</span>
                </div>
              ) : (
                tickets.map((ticket) => {
                  const isSelected = selectedTicket && selectedTicket.id === ticket.id;
                  const isPending = ticket.status === 'pending';
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-left relative overflow-hidden ${isSelected ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-800 bg-slate-955/50 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-2xs font-bold text-slate-300 truncate flex-1">
                          {ticket.subject}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          {ticket.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-medium">
                        {ticket.message}
                      </p>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-900/60 text-[9px] text-slate-650 font-bold">
                        <span>Ref: #{ticket.id.substring(7, 13)}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-xl min-h-[500px] flex flex-col">
            {selectedTicket ? (
              <div className="space-y-5 flex-1 flex flex-col">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span>Ref: <strong className="text-slate-400">#{selectedTicket.id.substring(7, 13)}</strong></span>
                      <span>•</span>
                      <span>Submitted on {new Date(selectedTicket.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${selectedTicket.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {selectedTicket.status}
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Inquiry:</span>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                      "{selectedTicket.message}"
                    </p>
                  </div>

                  {selectedTicket.status === 'addressed' ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={13} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Super Admin Response:</span>
                      </div>
                      <p className="text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap font-semibold">
                        "{selectedTicket.response}"
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
                      <Clock className="text-amber-400 shrink-0 mt-0.5 animate-pulse" size={14} />
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Awaiting Resolution</span>
                        <p className="text-[11px] text-slate-450 mt-1 leading-relaxed font-medium">
                          Your query is currently in queue. A system administrator will review the details and reply. You will receive an automated email notification once resolved.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-6">
                <HelpCircle size={44} className="mb-3 opacity-25" />
                <h4 className="text-xs font-bold text-slate-400">No Query Selected</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                  Select a support query from the history list to review detailed messages, response logs, and resolution updates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
