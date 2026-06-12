import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Registration({ user, onNavigateToQueue }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [nokName, setNokName] = useState('');
  const [nokPhone, setNokPhone] = useState('');
  const [nokRelation, setNokRelation] = useState('spouse');
  const [consent, setConsent] = useState(true);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;
      
      const filtered = data ? data.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.national_id?.includes(searchQuery) ||
        p.facility_id_code?.toLowerCase().includes(searchQuery.toLowerCase())
      ) : [];

      setSearchResults(filtered);
      setSearched(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Auto-generate facility ID code
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const facilityCode = `EMC-PT-${randNum}`;

      const newPatient = {
        facility_id: user.facility_id,
        name,
        dob,
        gender,
        national_id: nationalId || null,
        facility_id_code: facilityCode,
        phone,
        next_of_kin_name: nokName,
        next_of_kin_phone: nokPhone,
        next_of_kin_relation: nokRelation,
        consent_given: consent
      };

      const { data, error } = await supabase.from('patients').insert(newPatient).select();
      if (error) throw error;

      setMessage({ type: 'success', text: `Patient successfully registered! Facility ID: ${facilityCode}` });
      
      // Clear form
      setName('');
      setDob('');
      setGender('male');
      setNationalId('');
      setPhone('');
      setNokName('');
      setNokPhone('');
      setNokRelation('spouse');
      setConsent(true);

      // Re-trigger search or take user to queue builder directly with patient details
      if (data) {
        const addedPt = Array.isArray(data) ? data[0] : data;
        setSearchResults([addedPt]);
        setSearched(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to register patient.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Search & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 h-fit">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Search size={18} className="text-teal-400" /> Search Existing Patient
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lookup patient records by Name, National ID, or Facility Patient Number.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. John Mwangi or National ID"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
            required
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition active:scale-[0.98] disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searched && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Results ({searchResults.length})</h3>
            
            {searchResults.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-lg p-6 text-center text-slate-500 text-sm">
                No matching patients found in this facility.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {searchResults.map((pt) => (
                  <div key={pt.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-500/30 transition">
                    <div>
                      <span className="font-bold text-slate-200 block text-sm">{pt.name}</span>
                      <span className="text-xs text-slate-500 font-semibold uppercase">{pt.gender} | Age: {new Date().getFullYear() - new Date(pt.dob).getFullYear()} yrs</span>
                      <div className="grid grid-cols-2 gap-x-4 mt-1 text-[10px] text-slate-400">
                        <span>Code: <span className="text-teal-400 font-semibold">{pt.facility_id_code}</span></span>
                        <span>National ID: {pt.national_id || 'N/A'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToQueue(pt)}
                      className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-semibold text-xs py-1.5 px-3 rounded-lg border border-teal-500/20 transition self-end sm:self-center"
                    >
                      Open Visit / Queue
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Register New Patient Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <UserPlus size={18} className="text-teal-400" /> Patient Registration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture patient details to assign records to the MOH registers.
          </p>
        </div>

        {message.text && (
          <div className={`p-3.5 rounded-lg border text-sm flex gap-2.5 ${
            message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth *</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* National ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">National ID / Passport</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="ID Number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            {/* Patient Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
          </div>

          {/* Next of Kin Details */}
          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Next of Kin details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">NOK Name</label>
                <input
                  type="text"
                  value={nokName}
                  onChange={(e) => setNokName(e.target.value)}
                  placeholder="NOK Full Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">NOK Phone</label>
                <input
                  type="text"
                  value={nokPhone}
                  onChange={(e) => setNokPhone(e.target.value)}
                  placeholder="NOK Phone number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Relation</label>
                <select
                  value={nokRelation}
                  onChange={(e) => setNokRelation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="border-t border-slate-800/80 pt-4 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="consentCheck"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="accent-teal-500 rounded border-slate-800 bg-slate-950 text-teal-600 focus:ring-teal-500 h-4 w-4 mt-0.5 cursor-pointer"
            />
            <label htmlFor="consentCheck" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
              Patient gives consent for medical care record capture and reporting to Ministry of Health (MOH) systems under the Data Protection Act.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Registering Patient...' : 'Register Patient'}
          </button>
        </form>
      </div>
    </div>
  );
}
