import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Bed, PlusCircle, Trash2, Building, Layers, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function WardSettings({ user }) {
  const { authFetch } = useAuth();
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  
  // Loading & Alerts
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Add Ward Form States
  const [newWardName, setNewWardName] = useState('');
  const [newWardWing, setNewWardWing] = useState('');

  // Add Bed Form States
  const [targetWardId, setTargetWardId] = useState('');
  const [newBedNumber, setNewBedNumber] = useState('');
  const [newBedStatus, setNewBedStatus] = useState('clean');

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wards
      let wardsQuery = supabase.from('wards').select('*');
      if (user.facility_id) {
        wardsQuery = wardsQuery.eq('facility_id', user.facility_id);
      }
      const { data: wardsData, error: wardsError } = await wardsQuery;
      if (wardsError) throw wardsError;
      setWards(wardsData || []);

      if (wardsData && wardsData.length > 0) {
        if (!selectedWardId) setSelectedWardId(wardsData[0].id);
        if (!targetWardId) setTargetWardId(wardsData[0].id);
      }

      // 2. Fetch Beds
      let bedsQuery = supabase.from('bed_allocations').select('*');
      if (user.facility_id) {
        bedsQuery = bedsQuery.eq('facility_id', user.facility_id);
      }
      const { data: bedsData, error: bedsError } = await bedsQuery;
      if (bedsError) throw bedsError;
      setBeds(bedsData || []);
    } catch (err) {
      console.error('Error fetching ward settings data:', err);
      setMessage({ type: 'error', text: 'Failed to load ward settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWard = async (e) => {
    e.preventDefault();
    if (!newWardName.trim()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const newWard = {
        id: 'ward_' + Math.random().toString(36).substring(2, 12),
        name: newWardName.trim(),
        wing: newWardWing.trim() || 'General',
        facility_id: user.facility_id
      };

      // Perform insertion via standard route API to ensure syncing in sandbox
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'wards',
          rows: newWard
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create ward.');
      }

      setNewWardName('');
      setNewWardWing('');
      setMessage({ type: 'success', text: 'Ward created successfully!' });
      await fetchSettingsData();
    } catch (err) {
      console.error('Add ward failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add ward.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    if (!targetWardId || !newBedNumber.trim()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const newBed = {
        id: 'bed_' + Math.random().toString(36).substring(2, 12),
        ward_id: targetWardId,
        bed_number: newBedNumber.trim(),
        bed_status: newBedStatus,
        facility_id: user.facility_id
      };

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'bed_allocations',
          rows: newBed
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create bed.');
      }

      setNewBedNumber('');
      setMessage({ type: 'success', text: 'Bed added successfully!' });
      await fetchSettingsData();
    } catch (err) {
      console.error('Add bed failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add bed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBed = async (bedId, bedStatus) => {
    if (bedStatus === 'occupied') {
      setMessage({ type: 'error', text: 'Cannot delete an occupied bed.' });
      return;
    }

    if (!window.confirm('Are you sure you want to remove this bed?')) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.from('bed_allocations').delete().eq('id', bedId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Bed removed successfully.' });
      await fetchSettingsData();
    } catch (err) {
      console.error('Delete bed failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove bed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWard = async (wardId) => {
    const wardBeds = beds.filter(b => b.ward_id === wardId);
    if (wardBeds.length > 0) {
      setMessage({ type: 'error', text: 'Cannot delete a ward with active beds. Please delete the beds first.' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this ward?')) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.from('wards').delete().eq('id', wardId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Ward deleted successfully.' });
      if (selectedWardId === wardId) setSelectedWardId('');
      await fetchSettingsData();
    } catch (err) {
      console.error('Delete ward failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete ward.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <Layers size={14} className="text-teal-400" /> Dynamic Ward & Inpatient Bed Configuration
        </h4>
        <button
          onClick={fetchSettingsData}
          disabled={loading}
          className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Wards
        </button>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`p-2.5 rounded text-xs flex gap-2 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Form configurations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Add Ward */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building size={13} /> Add New Inpatient Ward
          </h5>
          <form onSubmit={handleAddWard} className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ward Name</label>
              <input
                type="text"
                placeholder="e.g. ICU, Pediatric Ward, Female Ward"
                value={newWardName}
                onChange={(e) => setNewWardName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Wing / Location Specification</label>
              <input
                type="text"
                placeholder="e.g. North Wing, Level 3, Block B"
                value={newWardWing}
                onChange={(e) => setNewWardWing(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-[10px] py-1.5 px-4 rounded transition flex items-center gap-1"
            >
              <PlusCircle size={12} /> Add Ward
            </button>
          </form>
        </div>

        {/* Card: Add Bed */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bed size={13} /> Add Bed to Ward
          </h5>
          <form onSubmit={handleAddBed} className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Target Ward</label>
              <select
                value={targetWardId}
                onChange={(e) => setTargetWardId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="">-- Choose Ward --</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.wing})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bed Number / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Bed 08, ICU-01"
                  value={newBedNumber}
                  onChange={(e) => setNewBedNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select
                  value={newBedStatus}
                  onChange={(e) => setNewBedStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="clean">Vacant & Clean</option>
                  <option value="dirty">Vacant & Dirty</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !targetWardId}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-[10px] py-1.5 px-4 rounded transition flex items-center gap-1"
            >
              <PlusCircle size={12} /> Add Bed Allocation
            </button>
          </form>
        </div>
      </div>

      {/* Ward Capacity & Bed View */}
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
        <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Eye size={13} className="text-teal-400" /> Active Wards & Bed Capacity Status
        </h5>

        <div className="flex border-b border-slate-850 overflow-x-auto gap-2 pb-1">
          {wards.map(w => {
            const wardBeds = beds.filter(b => b.ward_id === w.id);
            const occupiedCount = wardBeds.filter(b => b.bed_status === 'occupied').length;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWardId(w.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedWardId === w.id
                    ? 'bg-slate-900 border border-slate-700 text-teal-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <span>{w.name}</span>
                <span className="bg-slate-950 text-[9px] text-slate-400 font-bold px-1.5 py-0.5 rounded-full border border-slate-850">
                  {occupiedCount}/{wardBeds.length} Beds
                </span>
              </button>
            );
          })}
          {wards.length === 0 && (
            <span className="text-xs text-slate-500 italic p-2">No wards configured yet. Add a ward above.</span>
          )}
        </div>

        {selectedWardId && (() => {
          const selectedWard = wards.find(w => w.id === selectedWardId);
          if (!selectedWard) return null;
          const wardBeds = beds.filter(b => b.ward_id === selectedWardId);

          return (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Wing/Location: </span>
                  <span className="text-slate-200 font-bold">{selectedWard.wing}</span>
                </div>
                <button
                  onClick={() => handleDeleteWard(selectedWard.id)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 transition flex items-center gap-1 text-[10px]"
                >
                  <Trash2 size={11} /> Delete {selectedWard.name}
                </button>
              </div>

              {/* Grid of Beds */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {wardBeds.map(b => {
                  let statusBg = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
                  let statusText = 'Vacant/Clean';
                  if (b.bed_status === 'dirty') {
                    statusBg = 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400';
                    statusText = 'Dirty';
                  } else if (b.bed_status === 'occupied') {
                    statusBg = 'bg-blue-500/10 border-blue-500/25 text-blue-400';
                    statusText = 'Occupied';
                  } else if (b.bed_status === 'maintenance') {
                    statusBg = 'bg-slate-500/10 border-slate-500/25 text-slate-400';
                    statusText = 'Maintenance';
                  }

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-lg border flex flex-col justify-between items-center gap-2 relative group min-h-[90px] ${statusBg}`}
                    >
                      <Bed size={22} className="opacity-80" />
                      <div className="text-center">
                        <span className="text-[11px] font-bold block text-slate-100">{b.bed_number}</span>
                        <span className="text-[8px] block opacity-70 mt-0.5">{statusText}</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteBed(b.id, b.bed_status)}
                        disabled={loading}
                        className="absolute top-1 right-1 p-1 rounded hover:bg-red-500/20 text-red-450 opacity-0 group-hover:opacity-100 transition"
                        title="Delete Bed"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}

                {wardBeds.length === 0 && (
                  <div className="col-span-full text-center text-xs text-slate-500 py-6 border border-dashed border-slate-800 rounded-lg">
                    No beds added to this ward yet. Use the form above to add a bed.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
