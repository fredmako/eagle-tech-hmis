import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  PhoneCall, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare, 
  Send,
  XCircle,
  Inbox
} from 'lucide-react';

export default function FacilityHelpDesk({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'addressed'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [facilityWhatsApp, setFacilityWhatsApp] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');

      // Fetch support tickets scoped to this facility
      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          queries: [
            { type: 'equal', column: 'facility_id', value: user.facility_id }
          ],
          orderByField: 'created_at',
          orderByAsc: false
        })
      });

      if (!res.ok) {
        throw new Error('Failed to load support queries.');
      }

      const resData = await res.json();
      setTickets(resData.data || []);

      const facilityRes = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'facilities',
          queries: [{ type: 'equal', column: 'id', value: user.facility_id }],
          limit: 1
        })
      });

      if (facilityRes.ok) {
        const facilityBody = await facilityRes.json();
        setFacilityWhatsApp(facilityBody?.data?.[0]?.whatsapp_number || '');
      }
    } catch (err) {
      console.error('[FacilityHelpDesk] Error loading tickets:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load support queries.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.facility_id) {
      fetchTickets();
    }
  }, [user]);

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !responseText.trim()) return;

    setReplyLoading(true);
    setStatusMsg(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('egesa_health_token');

      // 1. Update ticket in DB proxy
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          column: 'id',
          value: selectedTicket.id,
          values: {
            status: 'addressed',
            response: responseText.trim()
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resolve support ticket.');
      }

      // 2. Dispatch Resolution Email
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: selectedTicket.user_email,
            subject: `Help Desk Response: [#${selectedTicket.id.substring(7, 13)}] - ${selectedTicket.subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Hospital Help Desk Resolution</h2>
                <p>Hello <strong>${selectedTicket.user_name}</strong>,</p>
                <p>The administration team at <strong>${user.facility_name}</strong> has responded to your inquiry (Reference: <strong>#${selectedTicket.id.substring(7, 13)}</strong>).</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #475569; margin: 20px 0; border-radius: 4px;">
                  <strong>Your Inquiry:</strong><br/>
                  <p style="color: #475569; font-style: italic; margin-top: 5px;">"${selectedTicket.message}"</p>
                </div>

                <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px;">
                  <strong>Hospital Response:</strong><br/>
                  <p style="color: #166534; font-weight: bold; margin-top: 5px;">"${responseText.trim()}"</p>
                </div>

                <p>If you have any further questions, please do not hesitate to contact us again.</p>
                <p>Thank you,</p>
                <p><strong>${user.facility_name} Administration</strong></p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error('[FacilityHelpDesk] Resolution email dispatch failed:', emailErr);
      }

      setStatusMsg({ type: 'success', text: `Ticket #${selectedTicket.id.substring(7, 13)} resolved and welcome email reply dispatched.` });
      setResponseText('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('[FacilityHelpDesk] Error resolving ticket:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit response.' });
    } finally {
      setReplyLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = 
      t.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-fadeIn font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall size={14} className="text-teal-400" /> Facility Help Desk & Patient Inquiries
            </h4>
            <p className="text-2xs text-slate-400 mt-1">
              Review and reply to inquiries and support tickets sent directly to your hospital workspace by patients or staff.
            </p>
          </div>
          {facilityWhatsApp && (
            <a
              href={`https://wa.me/${String(facilityWhatsApp).replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-2xs font-bold uppercase tracking-wider hover:bg-emerald-500/15 transition"
            >
              Chat on WhatsApp
            </a>
          )}
          <button
            onClick={() => { setRefreshing(true); fetchTickets(); }}
            disabled={loading}
            className="text-slate-400 hover:text-teal-400 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={12} className={loading || refreshing ? "animate-spin text-teal-400" : ""} />
          </button>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-lg text-xs flex gap-2 font-semibold ${
            statusMsg.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition placeholder:text-slate-650"
            />
          </div>

          <div className="flex gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg self-end sm:self-auto">
            {['all', 'pending', 'addressed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-2xs font-bold uppercase rounded-md transition ${
                  filterStatus === status 
                    ? 'bg-teal-400 text-slate-950 shadow' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* List panel */}
          <div className="lg:col-span-1 border border-slate-950 bg-slate-950/20 rounded-xl p-3 flex flex-col h-100">
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {loading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                  <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-2xs font-semibold">Loading help desk...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center p-4">
                  <Inbox size={28} className="mb-2 opacity-35" />
                  <span className="text-2xs font-bold block">No inquiries found</span>
                  <span className="text-2xs text-slate-500 mt-1 block">Patient help desk logs will display here.</span>
                </div>
              ) : (
                filteredTickets.map(t => {
                  const isSelected = selectedTicket && selectedTicket.id === t.id;
                  const isPending = t.status === 'pending';
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-left relative overflow-hidden ${
                        isSelected ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-800 bg-slate-955/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-2xs font-bold text-slate-350 truncate flex-1">{t.subject}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 mt-1 line-clamp-1 font-medium">{t.message}</p>
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-900/60 text-[9px] text-slate-650 font-bold">
                        <span>Ref: #{t.id.substring(7, 13)}</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details & Actions Panel */}
          <div className="lg:col-span-2 border border-slate-950 bg-slate-950/20 rounded-xl p-4 min-h-100 flex flex-col justify-between">
            {selectedTicket ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{selectedTicket.subject}</h4>
                      <p className="text-2xs text-slate-500 mt-1 font-semibold">
                        From: <span className="text-slate-300 capitalize">{selectedTicket.user_name}</span> ({selectedTicket.user_email})
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-slate-550 font-bold">Ref: #{selectedTicket.id.substring(7, 13)}</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Inquiry Message:</span>
                      <p className="text-xs text-slate-350 leading-relaxed font-medium whitespace-pre-wrap">"{selectedTicket.message}"</p>
                    </div>

                    {selectedTicket.status === 'addressed' ? (
                      <div className="bg-emerald-500/5 border border-emerald-550/15 p-4 rounded-xl space-y-1.5">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Resolution Reply:</span>
                        <p className="text-xs text-emerald-300 leading-relaxed font-semibold whitespace-pre-wrap">"{selectedTicket.response}"</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedTicket.status === 'pending' ? (
                  <form onSubmit={handleResolveTicket} className="border-t border-slate-900 pt-3 space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reply Message</label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type the resolution or reply here. An automated email response will be sent to the recipient..."
                        rows={4}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed font-semibold"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setSelectedTicket(null); setResponseText(''); }}
                        className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-slate-300 font-bold text-xs py-1.5 px-4 rounded-lg transition active:scale-[0.98] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={replyLoading || !responseText.trim()}
                        className="bg-teal-400 hover:bg-teal-350 disabled:opacity-40 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg shadow active:scale-[0.98] transition flex items-center gap-1 cursor-pointer"
                      >
                        {replyLoading ? (
                          <>
                            <div className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send size={11} />
                            <span>Resolve & Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-end border-t border-slate-900 pt-3">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-slate-300 font-bold text-xs py-1.5 px-4 rounded-lg transition active:scale-[0.98] cursor-pointer"
                    >
                      Close Details
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-6">
                <MessageSquare size={44} className="mb-3 opacity-20" />
                <h4 className="text-xs font-bold text-slate-400">No Inquiry Selected</h4>
                <p className="text-2xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                  Select a support ticket from the list pane to review details, view audit references, type resolution emails, or close tickets.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
