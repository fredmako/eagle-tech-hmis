import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Volume2, Clock, Play, AlertCircle, ArrowRight, Home } from 'lucide-react';

export default function QueueBoardPublic() {
  const hostnameParts = window.location.hostname.split('.');
  const isSubdomain = hostnameParts.length > 2 && hostnameParts[0] !== 'www' && !window.location.hostname.includes('localhost') && !window.location.hostname.match(/^[0-9.]+$/);
  
  let subdomain = null;
  if (isSubdomain) {
    subdomain = hostnameParts[0];
  } else {
    const pathParts = window.location.pathname.split('/');
    const hospitalIndex = pathParts.indexOf('hospital');
    subdomain = hospitalIndex !== -1 && pathParts[hospitalIndex + 1] ? pathParts[hospitalIndex + 1] : null;
  }

  const [facility, setFacility] = useState(null);
  const [calledTickets, setCalledTickets] = useState([]);
  const [nowServing, setNowServing] = useState(null);
  const [showFlash, setShowFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Poll for tickets
  useEffect(() => {
    fetchFacility();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [subdomain]);

  useEffect(() => {
    if (!facility) return;

    fetchCalledTickets();

    // Poll for called tickets every 3 seconds to maintain real-time sync across screens
    const ticketInterval = setInterval(() => {
      fetchCalledTickets();
    }, 3000);

    return () => clearInterval(ticketInterval);
  }, [facility]);

  const fetchFacility = async () => {
    try {
      let query = supabase.from('facilities').select('*');
      if (subdomain) {
        query = query.eq('subdomain_prefix', subdomain);
      } else {
        query = query.eq('id', 'f1'); // Default
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setFacility(data[0]);
      } else {
        const { data: fallback } = await supabase.from('facilities').select('*').eq('id', 'f1');
        if (fallback) setFacility(fallback[0]);
      }
    } catch (err) {
      console.error('Error fetching facility details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalledTickets = async () => {
    if (!facility) return;
    try {
      const { data, error } = await supabase
        .from('called_tickets')
        .select('*')
        .eq('facility_id', facility.id)
        .order('called_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const latest = data[0];
        // If the latest ticket is different from our current nowServing, trigger alert chime & speech
        setCalledTickets(data);
        
        setNowServing(prev => {
          if (!prev || prev.id !== latest.id) {
            triggerCallNotification(latest);
            return latest;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error fetching called tickets:', err);
    }
  };

  const playSynthesizerChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gainNode.gain.setValueAtTime(0.15, start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(554.37, now, 0.15); // C#5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(880.00, now + 0.3, 0.4); // A5
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  };

  const speakTicketAnnouncement = (ticketCode, patientName, destination) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Clear speech queue
      const utterance = new SpeechSynthesisUtterance();
      // Spell out ticket code letters
      const spelledCode = ticketCode.split('').map(c => c === '-' ? ' ' : c).join(' ');
      utterance.text = `Ticket Number ${spelledCode}, ${patientName}, please proceed to ${destination}`;
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerCallNotification = (ticket) => {
    playSynthesizerChime();
    setShowFlash(true);
    speakTicketAnnouncement(ticket.ticket_code, ticket.patient_name, ticket.destination);
    
    setTimeout(() => {
      setShowFlash(false);
    }, 4500);
  };

  // Simulates a ticket call for live demonstration/testing
  const handleSimulateCall = async () => {
    if (!facility) return;
    const services = ['OPD', 'ANC', 'PHA', 'LAB', 'EMR', 'IPD'];
    const desks = ['Triage Desk', 'Consultation Desk', 'Pharmacy Queue Counter', 'Laboratory Room 2', 'Emergency Room', 'Ward Room 3'];
    
    const randomIdx = Math.floor(Math.random() * services.length);
    const mockTicketCode = `${services[randomIdx]}-${Math.floor(Math.random() * 900 + 100)}`;
    const mockNames = ['Grace Wambui', 'Amos Kiprop', 'Evelyne Cherotich', 'John Ndwiga', 'Mercy Auma', 'David Omondi'];
    const mockName = mockNames[Math.floor(Math.random() * mockNames.length)];

    try {
      const { error } = await supabase.from('called_tickets').insert({
        facility_id: facility.id,
        ticket_code: mockTicketCode,
        patient_name: mockName,
        destination: desks[randomIdx],
        status: 'called'
      });
      if (error) throw error;
      fetchCalledTickets();
    } catch (err) {
      console.error('Simulation call failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading Queue Display System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-900 bg-slate-900/60 backdrop-blur px-8 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-teal-400/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400 text-[11px]">
            Q
          </div>
          <div>
            <h2 className="font-['Instrument_Serif',serif] text-base leading-none text-slate-100">
              {facility?.name || "Egesa Medical Clinic"}
            </h2>
            <span className="text-[9px] text-teal-400 uppercase tracking-widest block mt-0.5 leading-none">
              Lobby Queue display board
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={handleSimulateCall}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700/60 rounded text-2xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <Play size={10} /> Test Announcement
          </button>
          
          <div className="flex items-center gap-2 text-slate-400 font-mono text-sm font-semibold border-l border-slate-800 pl-6">
            <Clock size={14} className="text-teal-500 animate-pulse" />
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Board Layout */}
      <main className="flex-1 flex md:flex-row flex-col overflow-hidden p-6 gap-6 bg-slate-950">
        {/* Left Column: Now Serving */}
        <section className="flex-1 bg-slate-900/50 border border-slate-900 rounded-2xl p-8 flex flex-col justify-between items-center text-center shadow-inner relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-teal-500 via-sky-500 to-indigo-500" />
          
          <div className="w-full flex justify-between items-center text-slate-500 text-2xs uppercase font-bold tracking-widest">
            <span>Live status</span>
            <span className="flex items-center gap-1 text-emerald-400 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 py-8">
            {nowServing ? (
              <>
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800 shadow">
                  NOW CALLING
                </span>
                
                <h1 className="text-7xl md:text-8xl font-black text-teal-400 font-mono tracking-tight glow-text animate-pulse py-2">
                  {nowServing.ticket_code}
                </h1>
                
                <div className="h-12 flex items-center justify-center">
                  <p className="text-2xl md:text-3xl font-bold text-slate-100 max-w-lg truncate">
                    {nowServing.patient_name}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 px-6 py-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 font-semibold text-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <Volume2 size={20} className="animate-bounce" />
                  Please proceed to: <span className="font-bold text-white ml-1">{nowServing.destination}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500 flex flex-col items-center gap-2 py-10">
                <AlertCircle size={40} className="text-slate-700" />
                <span className="text-xs">No active tickets called yet. Waiting for registrations...</span>
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-600 font-mono">
            Eagle Tech HMIS • Powered by Antigravity AI
          </div>
        </section>

        {/* Right Column: Recall list */}
        <aside className="w-full md:w-96 bg-slate-900/30 border border-slate-900/60 rounded-2xl p-6 flex flex-col overflow-hidden shadow-2xl">
          <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recently Called</h3>
            <span className="bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold font-mono">
              Recall Log
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {calledTickets.slice(1, 6).map((ticket, idx) => (
              <div 
                key={ticket.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex justify-between items-center hover:border-slate-700 transition duration-150 animate-in fade-in duration-200"
              >
                <div className="flex flex-col gap-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-teal-400 font-mono">{ticket.ticket_code}</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(ticket.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 truncate">{ticket.patient_name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded-md font-semibold block">
                    {ticket.destination}
                  </span>
                </div>
              </div>
            ))}

            {calledTickets.length <= 1 && (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs text-center py-20">
                No recent recalls.
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Flashing Overlay for Active Announcements */}
      {showFlash && nowServing && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-8 z-50 animate-in fade-in duration-100">
          <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center flex flex-col items-center gap-6">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-teal-400 animate-pulse" />
            
            <Volume2 size={48} className="text-teal-400 animate-pulse" />

            <div className="space-y-1">
              <span className="text-teal-400 font-bold uppercase tracking-widest text-xs animate-bounce block">NOW CALLING</span>
              <h2 className="text-8xl font-black text-white font-mono tracking-tight drop-shadow-md">
                {nowServing.ticket_code}
              </h2>
            </div>

            <p className="text-3xl font-bold text-slate-100 max-w-md truncate">
              {nowServing.patient_name}
            </p>

            <div className="w-full h-px bg-slate-800" />

            <div className="text-slate-400 text-lg flex items-center justify-center gap-2">
              Please proceed to:
              <span className="text-teal-300 font-extrabold text-xl bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 rounded-lg">
                {nowServing.destination}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
