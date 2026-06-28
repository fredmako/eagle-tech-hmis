import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Calendar, 
  Tag, 
  FileText,
  Clock
} from 'lucide-react';

export default function AssetsMaintenance({ user }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal / Drawer Toggles
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // New Asset Form state
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('monitor');
  const [newAssetCategory, setNewAssetCategory] = useState('general');
  const [newAssetLocation, setNewAssetLocation] = useState('General Ward');
  const [newAssetManufacturer, setNewAssetManufacturer] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetInstallDate, setNewAssetInstallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newAssetCalibDate, setNewAssetCalibDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newAssetNextCalibDate, setNewAssetNextCalibDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [newAssetStatus, setNewAssetStatus] = useState('active');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Calibrate Form state
  const [calibNotes, setCalibNotes] = useState('');
  const [calibStatus, setCalibStatus] = useState('active');
  const [nextCalibDate, setNextCalibDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [calibrateSubmitting, setCalibrateSubmitting] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchDepartments();
  }, [user.facility_id]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('facility_id', user.facility_id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (!error && data) {
        setDbDepartments(data);
        if (data.length > 0) {
          setNewAssetLocation(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_instruments')
        .select('*')
        .eq('facility_id', user.facility_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      showMsg('error', 'Failed to fetch facility assets registry.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) {
      showMsg('error', 'Please enter asset name and serial number.');
      return;
    }

    setFormSubmitting(true);
    try {
      const newId = 'inst_' + Math.random().toString(36).substring(2, 12);
      const newAsset = {
        id: newId,
        facility_id: user.facility_id,
        name: newAssetName,
        type: newAssetType,
        category: newAssetCategory,
        manufacturer: newAssetManufacturer || 'Generic',
        model: newAssetModel || 'Standard',
        serial_number: newAssetSerial,
        installation_date: newAssetInstallDate,
        calibration_date: newAssetCalibDate,
        next_calibration_date: newAssetNextCalibDate,
        location_ward: newAssetLocation,
        status: newAssetStatus,
        usage_count: 0
      };

      const { error } = await supabase
        .from('medical_instruments')
        .insert([newAsset]);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Asset Added',
        details: `Registered new medical instrument "${newAssetName}" (Serial: ${newAssetSerial}) in ${newAssetLocation}`
      });

      showMsg('success', `Asset "${newAssetName}" registered successfully.`);
      setShowAddDrawer(false);
      resetAddForm();
      fetchAssets();
    } catch (err) {
      console.error('Error adding asset:', err);
      showMsg('error', `Failed to register asset: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setNewAssetName('');
    setNewAssetType('monitor');
    setNewAssetCategory('general');
    setNewAssetLocation('General Ward');
    setNewAssetManufacturer('');
    setNewAssetModel('');
    setNewAssetSerial('');
    setNewAssetInstallDate(new Date().toISOString().split('T')[0]);
    setNewAssetCalibDate(new Date().toISOString().split('T')[0]);
    setNewAssetNextCalibDate(() => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear.toISOString().split('T')[0];
    });
    setNewAssetStatus('active');
  };

  const openCalibrateModal = (asset) => {
    setSelectedAsset(asset);
    setCalibStatus(asset.status);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setNextCalibDate(nextYear.toISOString().split('T')[0]);
    setCalibNotes('');
    setShowCalibrateModal(true);
  };

  const handleUpdateMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setCalibrateSubmitting(true);
    try {
      const updates = {
        status: calibStatus,
        calibration_date: new Date().toISOString().split('T')[0],
        next_calibration_date: nextCalibDate
      };

      const { error } = await supabase
        .from('medical_instruments')
        .update(updates)
        .eq('id', selectedAsset.id);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Asset Calibrated',
        details: `Updated maintenance log for "${selectedAsset.name}". Status: ${calibStatus}. Next calibration: ${nextCalibDate}. Notes: ${calibNotes || 'N/A'}`
      });

      showMsg('success', `Maintenance status for "${selectedAsset.name}" updated successfully.`);
      setShowCalibrateModal(false);
      fetchAssets();
    } catch (err) {
      console.error('Error updating maintenance:', err);
      showMsg('error', `Failed to update asset: ${err.message}`);
    } finally {
      setCalibrateSubmitting(false);
    }
  };

  // Filtered Assets list
  const filteredAssets = assets.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.manufacturer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.model || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = locationFilter === 'all' || item.location_ward.toLowerCase() === locationFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesLocation && matchesStatus && matchesCategory;
  });

  // Extract unique locations for filter
  const locations = [...new Set(assets.map(a => a.location_ward))].filter(Boolean);
  const categories = [...new Set(assets.map(a => a.category))].filter(Boolean);

  // Statistics
  const totalCount = assets.length;
  const activeCount = assets.filter(a => a.status === 'active').length;
  const maintenanceCount = assets.filter(a => a.status === 'maintenance' || a.status === 'broken').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const calibrationWarningCount = assets.filter(a => a.status === 'active' && a.next_calibration_date <= todayStr).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
            <Wrench size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans">
              Clinical Equipment & Asset Maintenance
            </h4>
            <p className="text-2xs text-slate-500 font-medium">Track medical machinery health, next calibrations, and departmental logs</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddDrawer(true)}
          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-[11px] px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
        >
          <Plus size={14} /> Add New Asset
        </button>
      </div>

      {message.text && (
        <div className={`p-2.5 rounded text-xs ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? '✓ ' : '⚠️ '}{message.text}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Assets</span>
            <span className="block text-xl font-bold font-mono text-slate-200 mt-1">{totalCount}</span>
          </div>
          <Activity size={20} className="text-teal-500 opacity-30" />
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Operational</span>
            <span className="block text-xl font-bold font-mono text-green-400 mt-1">{activeCount}</span>
          </div>
          <CheckCircle size={20} className="text-green-500 opacity-30" />
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Under Repair</span>
            <span className="block text-xl font-bold font-mono text-red-400 mt-1">{maintenanceCount}</span>
          </div>
          <AlertTriangle size={20} className="text-red-500 opacity-30" />
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Needs Calibration</span>
            <span className="block text-xl font-bold font-mono text-yellow-400 mt-1">{calibrationWarningCount}</span>
          </div>
          <Clock size={20} className="text-yellow-500 opacity-30" />
        </div>
      </div>

      {/* Filters Strip */}
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Search */}
        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search Assets</label>
          <div className="flex bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus-within:border-teal-500/50 transition">
            <Search size={13} className="text-slate-550 mt-0.5 mr-2" />
            <input
              type="text"
              placeholder="Name, serial, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department / Location</label>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition"
          >
            <option value="all">All Departments</option>
            {Array.from(new Set([
              ...locations,
              ...dbDepartments.map(d => d.name)
            ])).map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Health Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition"
          >
            <option value="all">All States</option>
            <option value="active">Active / Operational</option>
            <option value="calibrating">Calibrating</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="broken">Broken / Repair Required</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory List table */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching assets inventory...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <p className="py-12 text-center text-slate-500 text-xs italic">No clinical assets match the filters or search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Asset Details</th>
                  <th className="py-3 px-4">Serial / Manufacturer</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Last Calibration</th>
                  <th className="py-3 px-4">Next Calibration</th>
                  <th className="py-3 px-4">Usage Logs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredAssets.map(item => {
                  const isCalibrationOverdue = item.status === 'active' && item.next_calibration_date <= todayStr;
                  return (
                    <tr key={item.id} className="hover:bg-slate-850/20 transition duration-150">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200 block text-[12px]">{item.name}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{item.category} ({item.type})</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-slate-300 font-semibold block">{item.serial_number}</span>
                        <span className="text-2xs text-slate-500">{item.manufacturer} - {item.model}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-350 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded text-2xs">
                          {item.location_ward}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{item.calibration_date || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className={isCalibrationOverdue ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {item.next_calibration_date || 'N/A'}
                        </span>
                        {isCalibrationOverdue && (
                          <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 px-1 py-0.5 rounded ml-1.5 uppercase font-bold tracking-wider">Overdue</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <span className="font-bold text-slate-200">{item.usage_count || 0}</span> usages
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          item.status === 'active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : item.status === 'calibrating'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openCalibrateModal(item)}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-teal-400 hover:text-teal-300 font-bold text-2xs py-1 px-2.5 rounded transition cursor-pointer"
                        >
                          ⚙ Log Service
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Drawer / Modal */}
      {showAddDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white">Register Medical Asset</h3>
                <span className="text-[9px] text-slate-500 font-bold block">Biomedical equipment, analyzers, and clinic assets</span>
              </div>
              <button 
                onClick={() => setShowAddDrawer(false)}
                className="text-slate-550 hover:text-slate-350 text-xs font-bold border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Hematology Analyzer"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-LAB-94827"
                    value={newAssetSerial}
                    onChange={(e) => setNewAssetSerial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Type</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-xs text-slate-150 focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value="analyzer">Analyzer / Lab Equipment</option>
                    <option value="ultrasound">Ultrasound Modality</option>
                    <option value="xray">X-Ray / Imaging</option>
                    <option value="monitor">Patient Monitor</option>
                    <option value="pump">Infusion Pump</option>
                    <option value="defibrillator">Defibrillator</option>
                    <option value="autoclave">Autoclave Sterilizer</option>
                    <option value="doppler">Fetal Doppler</option>
                    <option value="thermometer">Cold Chain Thermometer</option>
                    <option value="general">Other Machinery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category Group</label>
                  <select
                    value={newAssetCategory}
                    onChange={(e) => setNewAssetCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-xs text-slate-150 focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value="general">General Asset</option>
                    <option value="lab">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="triage">Triage</option>
                    <option value="emergency">Emergency / ER</option>
                    <option value="ward">Inpatient Ward</option>
                    <option value="immunization">Immunization</option>
                    <option value="anc">ANC Clinic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department / Location</label>
                  {dbDepartments.length > 0 ? (
                    <select
                      value={newAssetLocation}
                      onChange={(e) => setNewAssetLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                    >
                      {dbDepartments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Lab Room 2"
                      value={newAssetLocation}
                      onChange={(e) => setNewAssetLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. GE Healthcare"
                    value={newAssetManufacturer}
                    onChange={(e) => setNewAssetManufacturer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Voluson E10"
                    value={newAssetModel}
                    onChange={(e) => setNewAssetModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Installation Date</label>
                  <input
                    type="date"
                    value={newAssetInstallDate}
                    onChange={(e) => setNewAssetInstallDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Calibration</label>
                  <input
                    type="date"
                    value={newAssetCalibDate}
                    onChange={(e) => setNewAssetCalibDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Next Calibration</label>
                  <input
                    type="date"
                    value={newAssetNextCalibDate}
                    onChange={(e) => setNewAssetNextCalibDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select
                  value={newAssetStatus}
                  onChange={(e) => setNewAssetStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="active">Active / Operational</option>
                  <option value="calibrating">Under Calibration Check</option>
                  <option value="maintenance">Undergoing Repair</option>
                  <option value="broken">Broken / Needs Attention</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(false)}
                  className="w-1/2 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-350 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-1/2 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer"
                >
                  {formSubmitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Calibration / Service Modal */}
      {showCalibrateModal && selectedAsset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white">Log Asset Service / Calibration</h3>
                <span className="text-[9px] text-slate-500 font-bold block">{selectedAsset.name} (S/N: {selectedAsset.serial_number})</span>
              </div>
              <button 
                onClick={() => setShowCalibrateModal(false)}
                className="text-slate-550 hover:text-slate-350 text-xs font-bold border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Machine State</label>
                <select
                  value={calibStatus}
                  onChange={(e) => setCalibStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="active">Active / Fully Operational</option>
                  <option value="calibrating">Under Calibration Check</option>
                  <option value="maintenance">Undergoing Routine Maintenance</option>
                  <option value="broken">Broken / Repair Required</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Suggested Next Calibration Date</label>
                <input
                  type="date"
                  value={nextCalibDate}
                  onChange={(e) => setNextCalibDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Service / Calibration Notes</label>
                <textarea
                  value={calibNotes}
                  onChange={(e) => setCalibNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe repair details, calibration offsets, parts replaced, or technician recommendations..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-250 placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCalibrateModal(false)}
                  className="w-1/2 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-350 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calibrateSubmitting}
                  className="w-1/2 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer"
                >
                  {calibrateSubmitting ? 'Saving changes...' : 'Save Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
