import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, User, Mail, Phone, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';

export default function DemoRequestModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !date || !time) {
      setError('Please fill in all the booking fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/demo/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          preferred_date: date,
          preferred_time: time
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to request demo.');
      }

      const resData = await res.json();
      setSuccess(true);
    } catch (err) {
      console.error('Demo request error:', err);
      setError(err.message || 'Connection error submitting booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setDate('');
    setTime('10:00');
    setSuccess(false);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 font-sans select-none pointer-events-auto">
        {/* Darkened backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Content Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10"
        >
          {/* Top glow stripes */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-teal-500 via-teal-400 to-emerald-500" />
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg bg-slate-950/50 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {success ? (
            // Success State
            <div className="p-8 text-center space-y-5 animate-fadeIn text-slate-100">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
                <CheckCircle size={36} className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-serif font-bold text-slate-100">Demo Scheduled!</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Hi <span className="text-slate-200 font-bold">{name}</span>, we have successfully logged your live demo request for:
                </p>
                <div className="inline-flex flex-col items-center gap-1 bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-2xl mt-2 w-full max-w-xs">
                  <div className="flex items-center gap-1.5 text-xs text-teal-400 font-bold">
                    <Calendar size={13} /> {date}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Clock size={12} /> {time} (Time Slot)
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                An automated confirmation message has been dispatched to your WhatsApp number <span className="text-slate-400 font-medium">{phone}</span>.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Book Another Slot
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            // Form State
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-2xs uppercase font-bold tracking-widest text-teal-450">
                  <Sparkles size={12} />
                  <span>Request Live Demo</span>
                </div>
                <h3 className="text-lg font-serif text-slate-100">Schedule Platform Walkthrough</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select your preferred slot and enter your details to receive an instant WhatsApp booking ticket.
                </p>
              </div>

              {error && (
                <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={13} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Corporate Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail size={13} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="e.g. contact@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone size={13} />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +254712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Scheduling Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Preferred Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Time Slot</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-teal-950/20 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>Book Walkthrough Session</>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
