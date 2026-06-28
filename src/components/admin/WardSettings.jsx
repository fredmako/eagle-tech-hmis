import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Bed, PlusCircle, Trash2, Building, Layers, Eye, RefreshCw, AlertCircle, CheckCircle, Move, RotateCw, MapPin, Grid, Settings } from 'lucide-react';

export default function WardSettings({ user }) {
  const { authFetch } = useAuth();
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  
  // Subtab Toggle: 'list' or 'layout'
  const [activeSubTab, setActiveSubTab] = useState('list');
  const [activeRoomName, setActiveRoomName] = useState('Room 1');
  const [selectedBedId, setSelectedBedId] = useState(null);
  const [newRoomNameInput, setNewRoomNameInput] = useState('');

  // Drag state
  const [draggingBedId, setDraggingBedId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
        facility_id: user.facility_id,
        x_position: 40,
        y_position: 60,
        rotation: 0,
        room_name: 'Room 1'
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
      if (selectedBedId === bedId) setSelectedBedId(null);
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

  // Drag and Drop Layout Handlers
  const handleBedPointerDown = (e, bed) => {
    e.stopPropagation();
    setDraggingBedId(bed.id);
    setSelectedBedId(bed.id);
    
    const canvas = document.getElementById('room-layout-canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const bedX = bed.x_position || 0;
    const bedY = bed.y_position || 0;
    
    const clickX = e.clientX - canvasRect.left - bedX;
    const clickY = e.clientY - canvasRect.top - bedY;
    setDragOffset({ x: clickX, y: clickY });
    
    e.target.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e) => {
    if (!draggingBedId) return;
    
    const canvas = document.getElementById('room-layout-canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    
    let rawX = e.clientX - canvasRect.left - dragOffset.x;
    let rawY = e.clientY - canvasRect.top - dragOffset.y;
    
    const bed = beds.find(b => b.id === draggingBedId);
    if (!bed) return;
    
    // Bounds check based on rotation box size (standard element size: 70px x 90px)
    const isRotated = bed.rotation === 90 || bed.rotation === 270;
    const width = isRotated ? 90 : 70;
    const height = isRotated ? 70 : 90;
    
    let x = Math.max(0, Math.min(canvasRect.width - width, rawX));
    let y = Math.max(0, Math.min(canvasRect.height - height, rawY));
    
    // Snap to 10px grid
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;
    
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === draggingBedId) {
        return { ...b, x_position: x, y_position: y };
      }
      return b;
    }));
  };

  const handleBedPointerUp = (e) => {
    if (draggingBedId) {
      e.target.releasePointerCapture(e.pointerId);
      setDraggingBedId(null);
    }
  };

  const handleRotateSelectedBed = () => {
    if (!selectedBedId) return;
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === selectedBedId) {
        const nextRotation = ((b.rotation || 0) + 90) % 360;
        return { ...b, rotation: nextRotation };
      }
      return b;
    }));
  };

  const handleMoveSelectedBedRoom = (newRoomName) => {
    if (!selectedBedId) return;
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === selectedBedId) {
        return { ...b, room_name: newRoomName };
      }
      return b;
    }));
  };

  const handleRenameSelectedBed = (newName) => {
    if (!selectedBedId) return;
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === selectedBedId) {
        return { ...b, bed_number: newName };
      }
      return b;
    }));
  };

  const handlePlaceInRoom = (bedId) => {
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === bedId) {
        return {
          ...b,
          room_name: activeRoomName,
          x_position: 40,
          y_position: 60
        };
      }
      return b;
    }));
    setSelectedBedId(bedId);
  };

  const handleRemoveFromRoom = (bedId) => {
    setBeds(prevBeds => prevBeds.map(b => {
      if (b.id === bedId) {
        return {
          ...b,
          room_name: 'Unassigned',
          x_position: 0,
          y_position: 0
        };
      }
      return b;
    }));
    if (selectedBedId === bedId) setSelectedBedId(null);
  };

  const handleAddRoomName = (e) => {
    e.preventDefault();
    const trimmed = newRoomNameInput.trim();
    if (trimmed) {
      setActiveRoomName(trimmed);
      setNewRoomNameInput('');
    }
  };

  const handleSaveLayout = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const wardBeds = beds.filter(b => b.ward_id === selectedWardId);
      
      await Promise.all(wardBeds.map(async (bed) => {
        const res = await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'bed_allocations',
            column: 'id',
            value: bed.id,
            values: {
              bed_number: bed.bed_number,
              x_position: bed.x_position || 0,
              y_position: bed.y_position || 0,
              rotation: bed.rotation || 0,
              room_name: bed.room_name || 'Room 1'
            }
          })
        });
        if (!res.ok) {
          throw new Error(`Failed to update layout for ${bed.bed_number}`);
        }
      }));
      
      setMessage({ type: 'success', text: 'Room layout saved successfully!' });
      await fetchSettingsData();
    } catch (err) {
      console.error('Save layout failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save layout.' });
    } finally {
      setLoading(false);
    }
  };

  // Derived states
  const activeWardBeds = beds.filter(b => b.ward_id === selectedWardId);
  const roomBeds = activeWardBeds.filter(b => b.room_name === activeRoomName);
  const paletteBeds = activeWardBeds.filter(b => b.room_name !== activeRoomName);
  
  // Extract all unique room names in active ward + default rooms
  const roomsInWard = Array.from(new Set([
    'Room 1', 'Room 2', 'Room 3', 'Room 4',
    ...activeWardBeds.map(b => b.room_name).filter(Boolean)
  ])).filter(r => r !== 'Unassigned');

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

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-850 pb-px">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'list'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          List View
        </button>
        <button
          onClick={() => {
            setActiveSubTab('layout');
            setSelectedBedId(null);
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'layout'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Room Layout Editor (Drag & Drop)
        </button>
      </div>

      {activeSubTab === 'list' ? (
        <>
          {/* Form configurations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Add Ward */}
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
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
                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-955 font-bold text-2xs py-1.5 px-4 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={12} /> Add Ward
                </button>
              </form>
            </div>

            {/* Card: Add Bed */}
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
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
                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-955 font-bold text-2xs py-1.5 px-4 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={12} /> Add Bed Allocation
                </button>
              </form>
            </div>
          </div>

          {/* Ward Capacity & Bed View */}
          <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
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
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                      selectedWardId === w.id
                        ? 'bg-slate-900 border border-slate-700 text-teal-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{w.name}</span>
                    <span className="bg-slate-950 text-[9px] text-slate-450 font-bold px-1.5 py-0.5 rounded-full border border-slate-850">
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
                      className="text-red-400 hover:text-red-300 transition flex items-center gap-1 text-2xs cursor-pointer"
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
                            className="absolute top-1 right-1 p-1 rounded hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
        </>
      ) : (
        /* Room Layout Drag & Drop Editor Tab */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
          {/* Left panel: Ward & Room Selection & General Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
              <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={13} /> Layout Controls
              </h5>
              
              {/* Ward selector */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Ward</label>
                <select
                  value={selectedWardId}
                  onChange={(e) => {
                    setSelectedWardId(e.target.value);
                    setSelectedBedId(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Room selector */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Room</label>
                <select
                  value={activeRoomName}
                  onChange={(e) => {
                    setActiveRoomName(e.target.value);
                    setSelectedBedId(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  {roomsInWard.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              {/* Add Room Inline Form */}
              <form onSubmit={handleAddRoomName} className="space-y-1.5 pt-2 border-t border-slate-850">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Create Custom Room</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Room 5, ICU A"
                    value={newRoomNameInput}
                    onChange={(e) => setNewRoomNameInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 px-2.5 rounded text-2xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Selected Bed Controls */}
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bed size={13} className="text-teal-400" /> Selected Bed Settings
              </h5>

              {selectedBedId ? (() => {
                const selBed = beds.find(b => b.id === selectedBedId);
                if (!selBed) return null;

                return (
                  <div className="space-y-3.5 text-xs text-slate-200">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bed Label / Name</label>
                      <input
                        type="text"
                        value={selBed.bed_number}
                        onChange={(e) => handleRenameSelectedBed(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Position (X, Y)</span>
                        <span className="bg-slate-900 border border-slate-850 px-2.5 py-1 rounded text-2xs block font-mono text-slate-400">
                          {selBed.x_position || 0}px, {selBed.y_position || 0}px
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Orientation</span>
                        <span className="bg-slate-900 border border-slate-850 px-2.5 py-1 rounded text-2xs block font-mono text-slate-400">
                          {selBed.rotation || 0}°
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleRotateSelectedBed}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 p-1.5 rounded flex items-center justify-center gap-1 text-2xs font-bold transition cursor-pointer"
                        title="Rotate Bed 90 degrees clockwise"
                      >
                        <RotateCw size={11} /> Rotate 90°
                      </button>
                      <button
                        onClick={() => handleRemoveFromRoom(selBed.id)}
                        className="flex-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 p-1.5 rounded flex items-center justify-center gap-1 text-2xs font-bold transition cursor-pointer"
                        title="Remove bed from this room layout"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>

                    {/* Room reassigner */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reassign Room</label>
                      <select
                        value={selBed.room_name || 'Room 1'}
                        onChange={(e) => handleMoveSelectedBedRoom(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      >
                        {roomsInWard.map(room => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                        <option value="Unassigned">-- Unassign (Move to Palette) --</option>
                      </select>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-6 text-xs text-slate-500 italic">
                  Click a bed on the canvas to configure it.
                </div>
              )}
            </div>
          </div>

          {/* Canvas & Sidebar layout grid */}
          <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fadeIn">
            {/* Room layout canvas */}
            <div className="xl:col-span-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid size={13} className="text-teal-400" /> Room Layout Grid ({activeRoomName})
                </span>
                <span className="text-2xs text-slate-500 italic">Drag beds snap-aligned to arrange them</span>
              </div>

              {/* Interactive Canvas container */}
              <div
                id="room-layout-canvas"
                onPointerMove={handleCanvasPointerMove}
                className="bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center cursor-default select-none shadow-inner"
                style={{
                  width: '600px',
                  height: '380px',
                  backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {/* Visual Walls boundary representation */}
                <div className="absolute inset-2 border border-slate-850/40 rounded-lg pointer-events-none border-dashed flex items-end justify-between p-2 text-[9px] text-slate-600 font-mono">
                  <span>Room Size: 15m x 9.5m</span>
                  <span>Scale: 1m = 40px</span>
                </div>

                {/* Render beds in active room */}
                {roomBeds.map((bed) => {
                  const isSelected = selectedBedId === bed.id;
                  const isDragging = draggingBedId === bed.id;
                  
                  let statusBorderColor = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400';
                  if (bed.bed_status === 'dirty') {
                    statusBorderColor = 'border-yellow-500/40 bg-yellow-950/20 text-yellow-400';
                  } else if (bed.bed_status === 'occupied') {
                    statusBorderColor = 'border-blue-500/40 bg-blue-950/20 text-blue-400';
                  } else if (bed.bed_status === 'maintenance') {
                    statusBorderColor = 'border-red-900/40 bg-red-950/10 text-red-400';
                  }

                  return (
                    <div
                      key={bed.id}
                      onPointerDown={(e) => handleBedPointerDown(e, bed)}
                      onPointerUp={handleBedPointerUp}
                      className={`absolute rounded border flex flex-col justify-between p-1.5 transition-shadow select-none ${statusBorderColor} ${
                        isSelected ? 'ring-2 ring-teal-400 border-transparent shadow shadow-teal-400/20' : 'hover:border-slate-400'
                      }`}
                      style={{
                        left: `${bed.x_position || 0}px`,
                        top: `${bed.y_position || 0}px`,
                        width: '70px',
                        height: '90px',
                        transform: `rotate(${bed.rotation || 0}deg)`,
                        transformOrigin: 'center center',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none' // Prevents browser panning on mobile
                      }}
                    >
                      {/* Bed Graphic Structure */}
                      {/* Pillow */}
                      <div className="w-[36px] h-[12px] bg-slate-700/80 border border-slate-600/40 rounded mx-auto mt-0.5" />
                      
                      {/* Bed Label */}
                      <div className="text-center pointer-events-none mt-1">
                        <span className="text-2xs font-bold block text-slate-100 font-mono truncate leading-none">{bed.bed_number}</span>
                        <span className="text-[7px] block opacity-75 uppercase tracking-wide mt-1">{bed.bed_status === 'clean' ? 'Vacant' : bed.bed_status}</span>
                      </div>

                      {/* Blanket Fold Line */}
                      <div className="w-full h-[28px] bg-slate-800/70 border-t border-slate-700/50 rounded-b mt-auto" />
                    </div>
                  );
                })}

                {roomBeds.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans">
                    <Move size={28} className="text-slate-700 mb-2 animate-bounce" />
                    <span className="text-xs font-bold">This room is empty!</span>
                    <span className="text-2xs opacity-75 mt-1 max-w-[280px]">
                      Use the "Available Beds" sidebar list on the right to place a bed in this room, then drag it to configure.
                    </span>
                  </div>
                )}
              </div>

              {/* Save layout trigger */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveLayout}
                  disabled={loading}
                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
                  Save Room Layout
                </button>
              </div>
            </div>

            {/* Sidebar list: Beds in other rooms / Palette */}
            <div className="xl:col-span-1 bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-4">
              <div>
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-teal-400" /> Available Beds
                </h5>
                <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                  Beds in the active ward that are unassigned or in other rooms. Click to place them in the editor.
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {paletteBeds.map(b => (
                  <div
                    key={b.id}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs hover:border-slate-750 transition"
                  >
                    <div>
                      <span className="font-bold text-slate-200 font-mono block">{b.bed_number}</span>
                      <span className="text-[8px] text-slate-500">Currently in: {b.room_name || 'Unassigned'}</span>
                    </div>
                    <button
                      onClick={() => handlePlaceInRoom(b.id)}
                      className="bg-slate-800 hover:bg-slate-750 text-teal-400 border border-slate-700 px-2 py-0.5 rounded text-2xs font-bold transition cursor-pointer"
                    >
                      Place
                    </button>
                  </div>
                ))}

                {paletteBeds.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                    No other beds available. All ward beds are placed in this room layout.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
