import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  Baby, Activity, Bed, Users, ShieldAlert, CheckCircle, RefreshCw,
  PlusCircle, Trash2, Edit2, Search, Sliders, Calendar, DollarSign,
  Package, LayoutDashboard, ChevronDown, ChevronRight, X, UserCheck,
  TrendingUp, Shield, BarChart3, Thermometer, Clock, Heart
} from 'lucide-react';

export default function MaternityDashboard({ user, onClose, showNotification, initialSubTab }) {
  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState(initialSubTab || 'dashboard');
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [setupExpanded, setSetupExpanded] = useState(true);

  // Lists Data
  const [blocks, setBlocks] = useState([]);
  const [wards, setWards] = useState([]);
  const [bedTypes, setBedTypes] = useState([]);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter states
  const [bedFilterType, setBedFilterType] = useState('');
  const [bedSearchQuery, setBedSearchQuery] = useState('');
  const [wardFilterBlock, setWardFilterBlock] = useState('');
  const [wardSearchQuery, setWardSearchQuery] = useState('');
  const [ptSearchQuery, setPtSearchQuery] = useState('');

  // Modals / Form entries
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ id: '', name: '', description: '', status: 'Active' });

  const [showWardModal, setShowWardModal] = useState(false);
  const [wardForm, setWardForm] = useState({ id: '', block_name: '', name: '', description: '', drug_store: 'INPATIENT', consumable_store: '', gender: 'Female', visiting_hours: '12PM-2PM', status: 'Active' });

  const [showBedTypeModal, setShowBedTypeModal] = useState(false);
  const [bedTypeForm, setBedTypeForm] = useState({ id: '', name: '', description: '', status: 'Active' });

  const [showBedModal, setShowBedModal] = useState(false);
  const [bedForm, setBedForm] = useState({ id: '', name_code: '', bed_type: '', ward_name: '', description: '', availability: 'Available', cash_price: '', corporate_price: '', status: 'Active' });

  // Patient Registration Form states
  const [regForm, setRegForm] = useState({
    name: '', dob: '', gender: 'female', phone: '', email: '',
    national_id: '', sha_number: '', sha_dependent_type: 'self', sha_status: 'unverified',
    nok_name: '', nok_phone: '', nok_relation: 'spouse', consent_given: true,
    lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true
  });
  const [registering, setRegistering] = useState(false);

  // Queue actions
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [selectedQueueVisit, setSelectedQueueVisit] = useState(null);
  const [triageForm, setTriageForm] = useState({
    systolic: '', diastolic: '', heart_rate: '', temperature: '',
    resp_rate: '', spo2: '', fetal_heart_rate: '', fundal_height: '', notes: ''
  });

  const [showAssignBedModal, setShowAssignBedModal] = useState(false);
  const [selectedAssignVisit, setSelectedAssignVisit] = useState(null);
  const [selectedBedId, setSelectedBedId] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchBlocks();
    fetchBedTypes();
    fetchWards();
    fetchBeds();
    fetchPatients();
    fetchQueue();
    fetchInventory();
  }, [user.facility_id]);

  // LMP auto-calculate EDD
  useEffect(() => {
    if (regForm.lmp_date) {
      const lmp = new Date(regForm.lmp_date);
      if (!isNaN(lmp.getTime())) {
        const eddDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
        setRegForm(prev => ({ ...prev, edd: eddDate.toISOString().split('T')[0] }));
      }
    }
  }, [regForm.lmp_date]);

  // Database actions
  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase.from('maternity_blocks').select('*').order('name');
      if (error) throw error;
      setBlocks(data || []);
    } catch (err) {
      console.error('Error fetching blocks:', err);
    }
  };

  const fetchWards = async () => {
    try {
      const { data, error } = await supabase.from('maternity_wards').select('*').order('name');
      if (error) throw error;
      setWards(data || []);
    } catch (err) {
      console.error('Error fetching wards:', err);
    }
  };

  const fetchBedTypes = async () => {
    try {
      const { data, error } = await supabase.from('maternity_bed_types').select('*').order('name');
      if (error) throw error;
      setBedTypes(data || []);
    } catch (err) {
      console.error('Error fetching bed types:', err);
    }
  };

  const fetchBeds = async () => {
    try {
      const { data, error } = await supabase.from('maternity_beds').select('*').order('name_code');
      if (error) throw error;
      setBeds(data || []);
    } catch (err) {
      console.error('Error fetching beds:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('department', 'maternity')
        .in('status', ['waiting', 'admitted', 'active']);
      if (visitsError) throw visitsError;

      // Enrich with patients
      const { data: pts } = await supabase.from('patients').select('*');
      const { data: bedsData } = await supabase.from('maternity_beds').select('*');

      const enriched = (visitsData || []).map(v => {
        const pt = (pts || []).find(p => p.id === v.patient_id);
        // Find if bed is assigned
        let assignedBed = null;
        if (bedsData) {
          assignedBed = bedsData.find(b => b.description?.includes(v.id) || (b.availability === 'Occupied' && b.status === 'Active' && b.description === pt?.name));
        }
        return {
          ...v,
          patient: pt,
          assignedBed
        };
      });

      setQueue(enriched);
    } catch (err) {
      console.error('Error fetching maternity queue:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      // Fetch or seed maternal items
      const { data, error } = await supabase.from('inventory_items').select('*');
      if (error) throw error;
      // Filter or custom list
      const matItems = data ? data.filter(i => 
        ['pharmaceutical', 'surgical', 'consumable'].includes(i.category)
      ) : [];
      setInventory(matItems);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  // Block CRUD handlers
  const handleSaveBlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        facility_id: user.facility_id || 'f1',
        name: blockForm.name,
        description: blockForm.description,
        status: blockForm.status
      };

      if (blockForm.id) {
        const { error } = await supabase.from('maternity_blocks').update(payload).eq('id', blockForm.id);
        if (error) throw error;
        showNotification?.('success', 'Block Updated', `Maternity block "${payload.name}" updated successfully.`);
      } else {
        const randId = 'block_' + Math.random().toString(36).substring(2, 9);
        const { error } = await supabase.from('maternity_blocks').insert({ id: randId, ...payload });
        if (error) throw error;
        showNotification?.('success', 'Block Added', `Maternity block "${payload.name}" added successfully.`);
      }

      setShowBlockModal(false);
      setBlockForm({ id: '', name: '', description: '', status: 'Active' });
      fetchBlocks();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete block "${name}"?`)) return;
    try {
      const { error } = await supabase.from('maternity_blocks').delete().eq('id', id);
      if (error) throw error;
      showNotification?.('success', 'Block Deleted', `Maternity block "${name}" deleted.`);
      fetchBlocks();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    }
  };

  // Ward CRUD handlers
  const handleSaveWard = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        facility_id: user.facility_id || 'f1',
        block_name: wardForm.block_name,
        name: wardForm.name,
        description: wardForm.description,
        drug_store: wardForm.drug_store,
        consumable_store: wardForm.consumable_store,
        gender: wardForm.gender,
        visiting_hours: wardForm.visiting_hours,
        status: wardForm.status
      };

      if (wardForm.id) {
        const { error } = await supabase.from('maternity_wards').update(payload).eq('id', wardForm.id);
        if (error) throw error;
        showNotification?.('success', 'Ward Updated', `Maternity ward "${payload.name}" updated.`);
      } else {
        const randId = 'ward_' + Math.random().toString(36).substring(2, 9);
        const { error } = await supabase.from('maternity_wards').insert({ id: randId, ...payload });
        if (error) throw error;
        showNotification?.('success', 'Ward Added', `Maternity ward "${payload.name}" added.`);
      }

      setShowWardModal(false);
      setWardForm({ id: '', block_name: '', name: '', description: '', drug_store: 'INPATIENT', consumable_store: '', gender: 'Female', visiting_hours: '12PM-2PM', status: 'Active' });
      fetchWards();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWard = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ward "${name}"?`)) return;
    try {
      const { error } = await supabase.from('maternity_wards').delete().eq('id', id);
      if (error) throw error;
      showNotification?.('success', 'Ward Deleted', `Maternity ward "${name}" deleted.`);
      fetchWards();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    }
  };

  // Bed Type CRUD handlers
  const handleSaveBedType = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        facility_id: user.facility_id || 'f1',
        name: bedTypeForm.name,
        description: bedTypeForm.description,
        status: bedTypeForm.status
      };

      if (bedTypeForm.id) {
        const { error } = await supabase.from('maternity_bed_types').update(payload).eq('id', bedTypeForm.id);
        if (error) throw error;
        showNotification?.('success', 'Bed Type Updated', `Bed type "${payload.name}" updated.`);
      } else {
        const randId = 'bt_' + Math.random().toString(36).substring(2, 9);
        const { error } = await supabase.from('maternity_bed_types').insert({ id: randId, ...payload });
        if (error) throw error;
        showNotification?.('success', 'Bed Type Added', `Bed type "${payload.name}" added.`);
      }

      setShowBedTypeModal(false);
      setBedTypeForm({ id: '', name: '', description: '', status: 'Active' });
      fetchBedTypes();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Beds CRUD handlers
  const handleSaveBed = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        facility_id: user.facility_id || 'f1',
        name_code: bedForm.name_code,
        bed_type: bedForm.bed_type,
        ward_name: bedForm.ward_name,
        description: bedForm.description,
        availability: bedForm.availability,
        cash_price: parseFloat(bedForm.cash_price || 0),
        corporate_price: parseFloat(bedForm.corporate_price || 0),
        status: bedForm.status
      };

      if (bedForm.id) {
        const { error } = await supabase.from('maternity_beds').update(payload).eq('id', bedForm.id);
        if (error) throw error;
        showNotification?.('success', 'Bed Updated', `Bed "${payload.name_code}" updated.`);
      } else {
        const randId = 'bed_' + Math.random().toString(36).substring(2, 9);
        const { error } = await supabase.from('maternity_beds').insert({ id: randId, ...payload });
        if (error) throw error;
        showNotification?.('success', 'Bed Added', `Bed "${payload.name_code}" added.`);
      }

      setShowBedModal(false);
      setBedForm({ id: '', name_code: '', bed_type: '', ward_name: '', description: '', availability: 'Available', cash_price: '', corporate_price: '', status: 'Active' });
      fetchBeds();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBed = async (id, name_code) => {
    if (!window.confirm(`Are you sure you want to delete bed "${name_code}"?`)) return;
    try {
      const { error } = await supabase.from('maternity_beds').delete().eq('id', id);
      if (error) throw error;
      showNotification?.('success', 'Bed Deleted', `Bed "${name_code}" deleted.`);
      fetchBeds();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    }
  };

  // Register Patient
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const facilityCode = `EMC-MAT-${randNum}`;

      // 1. Save patient record
      const newPtPayload = {
        facility_id: user.facility_id || 'f1',
        name: regForm.name,
        dob: regForm.dob,
        gender: regForm.gender,
        national_id: regForm.national_id || null,
        facility_id_code: facilityCode,
        phone: JSON.stringify({
          phone: regForm.phone,
          email: regForm.email,
          preferences: { lab: true, pharmacy: true, billing: true },
          lmp: regForm.lmp_date,
          edd: regForm.edd,
          gravida: parseInt(regForm.gravida || 1),
          parity: parseInt(regForm.parity || 0)
        }),
        next_of_kin_name: regForm.nok_name,
        next_of_kin_phone: regForm.nok_phone,
        next_of_kin_relation: regForm.nok_relation,
        consent_given: regForm.consent_given,
        sha_number: regForm.sha_number || null,
        sha_dependent_type: regForm.sha_dependent_type,
        sha_status: regForm.sha_status
      };

      const { data: addedPts, error: addedPtErr } = await supabase
        .from('patients')
        .insert(newPtPayload)
        .select();

      if (addedPtErr) throw addedPtErr;
      const patient = addedPts[0];

      // 2. Insert visit queue if selected
      if (regForm.auto_checkin) {
        const visitPayload = {
          patient_id: patient.id,
          facility_id: user.facility_id || 'f1',
          department: 'maternity',
          priority: 'routine',
          status: 'waiting',
          service_type: 'ANC'
        };
        const { error: visitErr } = await supabase.from('visits').insert(visitPayload);
        if (visitErr) throw visitErr;
      }

      // Add to audit logs
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id || 'f1',
        user_id: user.id || 'system',
        action: 'Maternity: Register Patient',
        details: `Registered maternity patient ${regForm.name} (Code: ${facilityCode})`
      });

      showNotification?.('success', 'Patient Registered', `${regForm.name} successfully registered. Code: ${facilityCode}`);
      setRegForm({
        name: '', dob: '', gender: 'female', phone: '', email: '',
        national_id: '', sha_number: '', sha_dependent_type: 'self', sha_status: 'unverified',
        nok_name: '', nok_phone: '', nok_relation: 'spouse', consent_given: true,
        lmp_date: '', gravida: 1, parity: 0, edd: '', auto_checkin: true
      });
      setActiveTab('queue');
      fetchPatients();
      fetchQueue();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setRegistering(false);
    }
  };

  // Submit Triage Vitals
  const handleSaveTriage = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const triagePayload = {
        facility_id: user.facility_id || 'f1',
        visit_id: selectedQueueVisit.id,
        systolic: parseInt(triageForm.systolic) || null,
        diastolic: parseInt(triageForm.diastolic) || null,
        heart_rate: parseInt(triageForm.heart_rate) || null,
        temperature: parseFloat(triageForm.temperature) || null,
        resp_rate: parseInt(triageForm.resp_rate) || null,
        spo2: parseInt(triageForm.spo2) || null,
        chief_complaint: triageForm.notes || 'Maternity check-in',
        priority_flag: 'routine',
        risk_indicators: JSON.stringify({
          fetal_heart_rate: triageForm.fetal_heart_rate,
          fundal_height: triageForm.fundal_height
        })
      };

      const { error } = await supabase.from('triages').insert(triagePayload);
      if (error) throw error;

      // Update visit status to active
      await supabase.from('visits').update({ status: 'active' }).eq('id', selectedQueueVisit.id);

      showNotification?.('success', 'Vitals Recorded', `Triage details saved for ${selectedQueueVisit.patient?.name}`);
      setShowTriageModal(false);
      setSelectedQueueVisit(null);
      setTriageForm({ systolic: '', diastolic: '', heart_rate: '', temperature: '', resp_rate: '', spo2: '', fetal_heart_rate: '', fundal_height: '', notes: '' });
      fetchQueue();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Assign Bed
  const handleAssignBed = async (e) => {
    e.preventDefault();
    if (!selectedBedId) return;
    setLoading(true);
    try {
      // Find bed object
      const bedObj = beds.find(b => b.id === selectedBedId);

      // Update bed status in supabase
      const { error: bedErr } = await supabase
        .from('maternity_beds')
        .update({
          availability: 'Occupied',
          description: selectedAssignVisit.patient?.name + ` (Visit: ${selectedAssignVisit.id})`
        })
        .eq('id', selectedBedId);

      if (bedErr) throw bedErr;

      // Update visit status to admitted
      await supabase
        .from('visits')
        .update({ status: 'admitted' })
        .eq('id', selectedAssignVisit.id);

      showNotification?.('success', 'Bed Assigned', `Bed ${bedObj.name_code} assigned to ${selectedAssignVisit.patient?.name}`);
      setShowAssignBedModal(false);
      setSelectedAssignVisit(null);
      setSelectedBedId('');
      fetchBeds();
      fetchQueue();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Discharge Patient
  const handleDischargePatient = async (visit) => {
    if (!window.confirm(`Discharge ${visit.patient?.name} and release bed?`)) return;
    setLoading(true);
    try {
      // Find and release bed
      if (visit.assignedBed) {
        await supabase
          .from('maternity_beds')
          .update({ availability: 'Available', description: '' })
          .eq('id', visit.assignedBed.id);
      } else {
        // Fallback: look up bed description
        const { data: matchedBeds } = await supabase
          .from('maternity_beds')
          .select('*')
          .eq('availability', 'Occupied')
          .eq('status', 'Active');
        
        const myBed = matchedBeds?.find(b => b.description?.includes(visit.id));
        if (myBed) {
          await supabase
            .from('maternity_beds')
            .update({ availability: 'Available', description: '' })
            .eq('id', myBed.id);
        }
      }

      // Complete visit status
      await supabase
        .from('visits')
        .update({ status: 'completed' })
        .eq('id', visit.id);

      showNotification?.('success', 'Patient Discharged', `${visit.patient?.name} discharged. Bed released.`);
      fetchBeds();
      fetchQueue();
    } catch (err) {
      showNotification?.('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper count getters
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.availability === 'Occupied').length;
  const availableBeds = beds.filter(b => b.availability === 'Available').length;
  const totalWards = wards.length;
  const totalBlocks = blocks.length;

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      {/* Sidebar Navigation (Hidden on Mobile, Flex on Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        {/* Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
            <Heart className="text-red-500 fill-red-500" size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm tracking-wider uppercase font-mono">HOSI POA</div>
            <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-widest">Maternity Setup</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard Overview</span>
          </button>

          {/* Setup Group */}
          <div>
            <button
              onClick={() => setSetupExpanded(!setupExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-left text-xs font-semibold tracking-wide transition-all"
            >
              <div className="flex items-center gap-3">
                <Sliders size={16} />
                <span>Maternity Setup</span>
              </div>
              {setupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {setupExpanded && (
              <div className="pl-8 pr-1 py-1 space-y-1">
                {/* Blocks */}
                <button
                  onClick={() => setActiveTab('blocks')}
                  className={`w-full flex items-center gap-2 py-1.5 px-2 text-left text-[11px] rounded transition-all ${
                    activeTab === 'blocks' ? 'text-teal-400 font-bold bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ChevronRight size={10} />
                  Maternity Blocks
                </button>
                {/* Wards */}
                <button
                  onClick={() => setActiveTab('wards')}
                  className={`w-full flex items-center gap-2 py-1.5 px-2 text-left text-[11px] rounded transition-all ${
                    activeTab === 'wards' ? 'text-teal-400 font-bold bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ChevronRight size={10} />
                  Maternity Wards
                </button>
                {/* Bed Types */}
                <button
                  onClick={() => setActiveTab('bed_types')}
                  className={`w-full flex items-center gap-2 py-1.5 px-2 text-left text-[11px] rounded transition-all ${
                    activeTab === 'bed_types' ? 'text-teal-400 font-bold bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ChevronRight size={10} />
                  Bed Types
                </button>
                {/* Add Beds */}
                <button
                  onClick={() => setActiveTab('beds')}
                  className={`w-full flex items-center gap-2 py-1.5 px-2 text-left text-[11px] rounded transition-all ${
                    activeTab === 'beds' ? 'text-teal-400 font-bold bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ChevronRight size={10} />
                  Add Beds / Bed list
                </button>
              </div>
            )}
          </div>

          {/* Registration */}
          <button
            onClick={() => setActiveTab('registration')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'registration'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <UserCheck size={16} />
            <span>Registration</span>
          </button>

          {/* In Queue */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'queue'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            <span>In Queue</span>
          </button>

          {/* Inventory */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'inventory'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Package size={16} />
            <span>Inventory</span>
          </button>

          {/* Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'reports'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={16} />
            <span>Reports</span>
          </button>
        </nav>

        {/* Support Admin Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-1 text-[11px] text-slate-500">
          <div className="font-semibold text-slate-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Support Admin</span>
          </div>
          <div>Sys-VER 4.0</div>
          <div>Powered by Eagle Tech</div>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <main className="flex-1 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
        {/* Top Navbar */}
        <header className="bg-sky-600 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <Baby size={22} className="text-white" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Maternity Care Console</h1>
              <p className="text-[10px] text-sky-100 font-semibold tracking-wider uppercase">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'blocks' && 'Maternity Blocks Setup'}
                {activeTab === 'wards' && 'Maternity Wards Management'}
                {activeTab === 'bed_types' && 'Bed Classifications'}
                {activeTab === 'beds' && 'Beds Management (Add Beds)'}
                {activeTab === 'registration' && 'Independent Patient Registration'}
                {activeTab === 'queue' && 'Active Treatment & Admitted Queue'}
                {activeTab === 'inventory' && 'Maternal Drugs Stock'}
                {activeTab === 'reports' && 'Outcome Analysis & ANC Stats'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-800 border border-sky-500/20 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X size={14} />
              Exit Console
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs (Scrollable horizontal bar, Hidden on Desktop) */}
        <div className="md:hidden flex bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto whitespace-nowrap shrink-0 gap-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'blocks'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blocks
          </button>
          <button
            onClick={() => setActiveTab('wards')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'wards'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wards
          </button>
          <button
            onClick={() => setActiveTab('bed_types')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'bed_types'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bed Types
          </button>
          <button
            onClick={() => setActiveTab('beds')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'beds'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Beds
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'registration'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registration
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'queue'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'inventory'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'reports'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reports
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
                      <Sliders size={22} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Maternity Blocks</div>
                      <div className="text-2xl font-mono font-bold text-slate-200">{totalBlocks}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-400">
                      <Home size={22} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Maternity Wards</div>
                      <div className="text-2xl font-mono font-bold text-slate-200">{totalWards}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                      <Bed size={22} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Available Beds</div>
                      <div className="text-2xl font-mono font-bold text-teal-400">{availableBeds} <span className="text-xs text-slate-500">/ {totalBeds}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                      <Users size={22} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Queued Patients</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400">{queue.length}</div>
                    </div>
                  </div>
                </div>

                {/* Dashboard info grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm">Active Maternity Queue</h3>
                        <p className="text-[10px] text-slate-500">Admitted or waiting for ANC/Delivery care</p>
                      </div>
                      <button onClick={() => setActiveTab('queue')} className="text-xs font-bold text-teal-400 hover:text-teal-300">View Queue</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-slate-400">
                        <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                          <tr>
                            <th className="px-4 py-2">Patient</th>
                            <th className="px-4 py-2">SHA Number</th>
                            <th className="px-4 py-2">Bed status</th>
                            <th className="px-4 py-2">Priority</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {queue.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No patients currently in queue</td>
                            </tr>
                          ) : (
                            queue.slice(0, 5).map(v => (
                              <tr key={v.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-2.5 font-bold text-slate-300">{v.patient?.name}</td>
                                <td className="px-4 py-2.5">{v.patient?.sha_number || 'N/A'}</td>
                                <td className="px-4 py-2.5">
                                  {v.assignedBed ? (
                                    <span className="text-teal-400 font-semibold">{v.assignedBed.name_code}</span>
                                  ) : (
                                    <span className="text-slate-600">No Bed Assigned</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 uppercase font-mono">{v.priority}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    v.status === 'admitted' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {v.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-200 text-sm">Bed Availability Overview</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {beds.map(b => (
                        <div
                          key={b.id}
                          className={`aspect-square rounded flex flex-col justify-center items-center border text-[9px] font-bold font-mono transition-all ${
                            b.availability === 'Occupied'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                          title={`${b.name_code} (${b.bed_type}) - ${b.availability}`}
                        >
                          <Bed size={12} className="mb-0.5" />
                          {b.name_code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: BLOCKS */}
            {activeTab === 'blocks' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Maternity Blocks Setup</h2>
                    <p className="text-[10px] text-slate-500">Configure building wings or clinical blocks</p>
                  </div>
                  <button
                    onClick={() => {
                      setBlockForm({ id: '', name: '', description: '', status: 'Active' });
                      setShowBlockModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Add Block
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Block Name</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {blocks.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-slate-500">No blocks configured</td>
                        </tr>
                      ) : (
                        blocks.map(b => (
                          <tr key={b.id} className="hover:bg-slate-800/30">
                            <td className="px-5 py-3.5 font-bold text-slate-300">{b.name}</td>
                            <td className="px-5 py-3.5 text-slate-400">{b.description || 'N/A'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                b.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setBlockForm(b);
                                  setShowBlockModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-teal-400 rounded transition-all cursor-pointer inline-flex"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteBlock(b.id, b.name)}
                                className="p-1 text-slate-500 hover:text-red-500 rounded transition-all cursor-pointer inline-flex"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: WARDS */}
            {activeTab === 'wards' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Maternity Wards Management</h2>
                    <p className="text-[10px] text-slate-500">Configure distinct ward rooms within maternity blocks</p>
                  </div>
                  <button
                    onClick={() => {
                      setWardForm({ id: '', block_name: blocks[0]?.name || '', name: '', description: '', drug_store: 'INPATIENT', consumable_store: '', gender: 'Female', visiting_hours: '12PM-2PM', status: 'Active' });
                      setShowWardModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Add Ward
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 p-4 border border-slate-800/80 rounded-xl">
                  <div className="flex-1">
                    <select
                      value={wardFilterBlock}
                      onChange={(e) => setWardFilterBlock(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                    >
                      <option value="">Select Block (All)</option>
                      {blocks.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Search Hospital Wards Name"
                      value={wardSearchQuery}
                      onChange={(e) => setWardSearchQuery(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                    />
                    <button className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Search size={14} />
                      Search Ward
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Block Name</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Drugs Store</th>
                        <th className="px-4 py-3">Consumables Store</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Visiting Hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {wards.filter(w => {
                        const matchBlock = !wardFilterBlock || w.block_name === wardFilterBlock;
                        const matchName = !wardSearchQuery || w.name.toLowerCase().includes(wardSearchQuery.toLowerCase());
                        return matchBlock && matchName;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-slate-500">No wards configured</td>
                        </tr>
                      ) : (
                        wards.filter(w => {
                          const matchBlock = !wardFilterBlock || w.block_name === wardFilterBlock;
                          const matchName = !wardSearchQuery || w.name.toLowerCase().includes(wardSearchQuery.toLowerCase());
                          return matchBlock && matchName;
                        }).map(w => (
                          <tr key={w.id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3.5 text-slate-400">{w.block_name}</td>
                            <td className="px-4 py-3.5 font-bold text-slate-300">{w.name}</td>
                            <td className="px-4 py-3.5 text-slate-400">{w.description || 'N/A'}</td>
                            <td className="px-4 py-3.5">{w.drug_store || 'INPATIENT'}</td>
                            <td className="px-4 py-3.5">{w.consumable_store || 'N/A'}</td>
                            <td className="px-4 py-3.5">{w.gender}</td>
                            <td className="px-4 py-3.5 font-mono">{w.visiting_hours}</td>
                            <td className="px-4 py-3.5">
                              {/* Slider status mock toggle */}
                              <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={w.status === 'Active'}
                                    onChange={async () => {
                                      const nextStatus = w.status === 'Active' ? 'Inactive' : 'Active';
                                      await supabase.from('maternity_wards').update({ status: nextStatus }).eq('id', w.id);
                                      showNotification?.('success', 'Status Toggled', `Ward "${w.name}" set to ${nextStatus}`);
                                      fetchWards();
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                                </label>
                                <span className={`text-[10px] font-bold ${w.status === 'Active' ? 'text-teal-400' : 'text-slate-500'}`}>{w.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setWardForm(w);
                                  setShowWardModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-teal-400 rounded transition-all cursor-pointer inline-flex"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteWard(w.id, w.name)}
                                className="p-1 text-slate-500 hover:text-red-500 rounded transition-all cursor-pointer inline-flex"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: BED TYPES */}
            {activeTab === 'bed_types' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Bed Types Classification</h2>
                    <p className="text-[10px] text-slate-500">Define general or private bed charges</p>
                  </div>
                  <button
                    onClick={() => {
                      setBedTypeForm({ id: '', name: '', description: '', status: 'Active' });
                      setShowBedTypeModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Add Bed Type
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Bed Type Name</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {bedTypes.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-slate-500">No bed types configured</td>
                        </tr>
                      ) : (
                        bedTypes.map(t => (
                          <tr key={t.id} className="hover:bg-slate-800/30">
                            <td className="px-5 py-3.5 font-bold text-slate-300">{t.name}</td>
                            <td className="px-5 py-3.5 text-slate-400">{t.description || 'N/A'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                t.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setBedTypeForm(t);
                                  setShowBedTypeModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-teal-400 rounded transition-all cursor-pointer inline-flex"
                              >
                                <Edit2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: BEDS */}
            {activeTab === 'beds' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-md font-bold text-slate-200">Beds Management Setup</h2>
                    <p className="text-[10px] text-slate-500">Map specific beds to wards and types with billing pricing</p>
                  </div>
                  <button
                    onClick={() => {
                      setBedForm({ id: '', name_code: '', bed_type: bedTypes[0]?.name || '', ward_name: wards[0]?.name || '', description: '', availability: 'Available', cash_price: '1000', corporate_price: '1000', status: 'Active' });
                      setShowBedModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Add Bed
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 p-4 border border-slate-800/80 rounded-xl">
                  <div className="flex-1">
                    <select
                      value={bedFilterType}
                      onChange={(e) => setBedFilterType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                    >
                      <option value="">Select Bed Type (All)</option>
                      {bedTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Search Bed"
                      value={bedSearchQuery}
                      onChange={(e) => setBedSearchQuery(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                    />
                    <button className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Search size={14} />
                      Search Bed
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Name/Code</th>
                        <th className="px-4 py-3">Bed Type</th>
                        <th className="px-4 py-3">Ward Name</th>
                        <th className="px-4 py-3">Description / Allocation</th>
                        <th className="px-4 py-3">Availability</th>
                        <th className="px-4 py-3">Cash Price</th>
                        <th className="px-4 py-3">Corporate Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                        <th className="px-4 py-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {beds.filter(b => {
                        const matchType = !bedFilterType || b.bed_type === bedFilterType;
                        const matchSearch = !bedSearchQuery || b.name_code.toLowerCase().includes(bedSearchQuery.toLowerCase()) || b.ward_name.toLowerCase().includes(bedSearchQuery.toLowerCase());
                        return matchType && matchSearch;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-4 py-8 text-center text-slate-500">No beds matched search filters</td>
                        </tr>
                      ) : (
                        beds.filter(b => {
                          const matchType = !bedFilterType || b.bed_type === bedFilterType;
                          const matchSearch = !bedSearchQuery || b.name_code.toLowerCase().includes(bedSearchQuery.toLowerCase()) || b.ward_name.toLowerCase().includes(bedSearchQuery.toLowerCase());
                          return matchType && matchSearch;
                        }).map(b => (
                          <tr key={b.id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3.5 font-bold text-slate-200">{b.name_code}</td>
                            <td className="px-4 py-3.5 text-slate-400">{b.bed_type}</td>
                            <td className="px-4 py-3.5 text-slate-300 font-bold">{b.ward_name}</td>
                            <td className="px-4 py-3.5 text-slate-500 italic max-w-[150px] truncate">{b.description || 'No notes'}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                                b.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {b.availability}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-300">Ksh {b.cash_price}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-300">Ksh {b.corporate_price}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                b.status === 'Active' ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setBedForm(b);
                                  setShowBedModal(true);
                                }}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Edit2 size={10} />
                                Update
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteBed(b.id, b.name_code)}
                                className="px-2 py-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer ml-auto"
                              >
                                <Trash2 size={10} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: REGISTRATION */}
            {activeTab === 'registration' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-4"
              >
                <div>
                  <h2 className="text-md font-bold text-slate-200">Maternity Department Patient Registration</h2>
                  <p className="text-[10px] text-slate-500">Admit a prenatal or maternal patient into isolated maternity records</p>
                </div>

                <form onSubmit={handleRegisterPatient} className="bg-slate-900 border border-slate-800/80 rounded-xl p-6 space-y-6">
                  {/* Demographics */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 border-b border-slate-800 pb-2">1. Demographic Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Patient Full Name</label>
                        <input
                          type="text"
                          required
                          value={regForm.name}
                          onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Jane Mary Wanjiru"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</label>
                        <input
                          type="date"
                          required
                          value={regForm.dob}
                          onChange={(e) => setRegForm(prev => ({ ...prev, dob: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50 text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={regForm.phone}
                          onChange={(e) => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g. 0712345678"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">National ID</label>
                        <input
                          type="text"
                          value={regForm.national_id}
                          onChange={(e) => setRegForm(prev => ({ ...prev, national_id: e.target.value }))}
                          placeholder="e.g. 34827164"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SHA coverage */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 border-b border-slate-800 pb-2">2. Social Health Authority (SHA) Coverage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">SHA Card/Member Number</label>
                        <input
                          type="text"
                          value={regForm.sha_number}
                          onChange={(e) => setRegForm(prev => ({ ...prev, sha_number: e.target.value }))}
                          placeholder="SHA-18290382"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Dependent Type</label>
                        <select
                          value={regForm.sha_dependent_type}
                          onChange={(e) => setRegForm(prev => ({ ...prev, sha_dependent_type: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        >
                          <option value="self">Self (Principal)</option>
                          <option value="spouse">Spouse</option>
                          <option value="child">Child Dependent</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">SHA Verification Status</label>
                        <select
                          value={regForm.sha_status}
                          onChange={(e) => setRegForm(prev => ({ ...prev, sha_status: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        >
                          <option value="unverified">Unverified (Pending Check)</option>
                          <option value="verified">Verified (Active Cover)</option>
                          <option value="ineligible">Ineligible (Suspended)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pregnancy Indicators */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 border-b border-slate-800 pb-2">3. Maternal & Clinical Indicators</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Last Menstrual Period (LMP)</label>
                        <input
                          type="date"
                          value={regForm.lmp_date}
                          onChange={(e) => setRegForm(prev => ({ ...prev, lmp_date: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50 text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Gravida</label>
                        <input
                          type="number"
                          min="1"
                          value={regForm.gravida}
                          onChange={(e) => setRegForm(prev => ({ ...prev, gravida: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50 text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Parity</label>
                        <input
                          type="number"
                          min="0"
                          value={regForm.parity}
                          onChange={(e) => setRegForm(prev => ({ ...prev, parity: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50 text-slate-300"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Estimated Date of Delivery (EDD)</label>
                        <input
                          type="date"
                          readOnly
                          value={regForm.edd}
                          className="w-full bg-slate-950/60 border border-slate-850 rounded px-3 py-2 text-xs font-semibold focus:outline-none text-teal-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Next of Kin */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 border-b border-slate-800 pb-2">4. Next of Kin Demographics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Contact Name</label>
                        <input
                          type="text"
                          value={regForm.nok_name}
                          onChange={(e) => setRegForm(prev => ({ ...prev, nok_name: e.target.value }))}
                          placeholder="e.g. Peter Wanjiru"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
                        <input
                          type="text"
                          value={regForm.nok_phone}
                          onChange={(e) => setRegForm(prev => ({ ...prev, nok_phone: e.target.value }))}
                          placeholder="e.g. 0722000000"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Relation</label>
                        <select
                          value={regForm.nok_relation}
                          onChange={(e) => setRegForm(prev => ({ ...prev, nok_relation: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500/50"
                        >
                          <option value="spouse">Spouse</option>
                          <option value="parent">Parent</option>
                          <option value="sibling">Sibling</option>
                          <option value="other">Other relation</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={regForm.auto_checkin}
                        onChange={(e) => setRegForm(prev => ({ ...prev, auto_checkin: e.target.checked }))}
                        className="rounded border-slate-800 text-teal-600 focus:ring-teal-500 bg-slate-950"
                      />
                      <span>Auto check-in / Queue to Maternity Triage</span>
                    </label>
                    <button
                      type="submit"
                      disabled={registering}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 text-white rounded text-xs font-bold transition-all cursor-pointer uppercase tracking-wider font-mono flex items-center gap-1.5"
                    >
                      {registering ? 'Processing ADT...' : 'Submit Admission Registration'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* TAB: QUEUE */}
            {activeTab === 'queue' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-md font-bold text-slate-200">Active Inpatient & Maternity Queue</h2>
                  <p className="text-[10px] text-slate-500">Perform admissions triage vitals check-ins and bed configurations</p>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Patient Name</th>
                        <th className="px-4 py-3">DOB / Age</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">SHA status</th>
                        <th className="px-4 py-3">LMP / EDD</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Bed Assigned</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {queue.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-slate-500">No active patients in queue</td>
                        </tr>
                      ) : (
                        queue.map(v => {
                          let contact = {};
                          try {
                            if (v.patient?.phone) {
                              contact = JSON.parse(v.patient.phone);
                            }
                          } catch (e) {
                            contact = { phone: v.patient?.phone };
                          }
                          return (
                            <tr key={v.id} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3.5 font-bold text-slate-200">{v.patient?.name}</td>
                              <td className="px-4 py-3.5">{v.patient?.dob || 'N/A'}</td>
                              <td className="px-4 py-3.5 font-mono">{contact.phone || 'N/A'}</td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  v.patient?.sha_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {v.patient?.sha_status || 'unverified'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">
                                {contact.lmp ? (
                                  <>
                                    <div>LMP: {contact.lmp}</div>
                                    <div className="text-teal-400 font-bold">EDD: {contact.edd}</div>
                                  </>
                                ) : 'N/A'}
                              </td>
                              <td className="px-4 py-3.5 uppercase font-bold text-[9px] font-mono tracking-wider">{v.priority}</td>
                              <td className="px-4 py-3.5">
                                {v.assignedBed ? (
                                  <span className="px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/10 font-mono">
                                    Bed {v.assignedBed.name_code}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Unassigned</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedQueueVisit(v);
                                    setShowTriageModal(true);
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Activity size={10} />
                                  Triage
                                </button>
                                {!v.assignedBed ? (
                                  <button
                                    onClick={() => {
                                      setSelectedAssignVisit(v);
                                      setShowAssignBedModal(true);
                                    }}
                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Bed size={10} />
                                    Assign Bed
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDischargePatient(v)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Trash2 size={10} />
                                    Discharge
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: INVENTORY */}
            {activeTab === 'inventory' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-md font-bold text-slate-200">Maternity Supplies & Drug Stock</h2>
                  <p className="text-[10px] text-slate-500">Monitor active pharmaceutical stocks and neonatal kit supplies</p>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="px-5 py-3">Item Name</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Stock Level</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Reorder Alert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-500">No inventory matches found</td>
                        </tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/30">
                            <td className="px-5 py-3.5 font-bold text-slate-300">{item.name}</td>
                            <td className="px-5 py-3.5 text-slate-400 uppercase text-[10px] tracking-wider">{item.category}</td>
                            <td className={`px-5 py-3.5 font-bold ${
                              item.quantity_in_stock <= item.min_reorder_level ? 'text-amber-400' : 'text-slate-200'
                            }`}>{item.quantity_in_stock} {item.unit_of_measure}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-300">Ksh {item.unit_price}</td>
                            <td className="px-5 py-3.5">
                              {item.quantity_in_stock <= item.min_reorder_level ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold font-mono">
                                  LOW STOCK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[9px] font-bold font-mono">
                                  SUFFICIENT
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-md font-bold text-slate-200">Outcome Analysis & ANC Stats</h2>
                  <p className="text-[10px] text-slate-500">View real-time department statistics and health outcomes</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp size={14} />
                      Delivery outcomes register
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total Deliveries</div>
                        <div className="text-3xl font-mono font-bold text-slate-100 mt-1">42</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Normal Vaginal (SVD)</div>
                        <div className="text-3xl font-mono font-bold text-teal-400 mt-1">35</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Caesarean Sections</div>
                        <div className="text-3xl font-mono font-bold text-rose-400 mt-1">7</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Live Births</div>
                        <div className="text-3xl font-mono font-bold text-emerald-400 mt-1">42</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield size={14} />
                      Patient Demographics Stats
                    </h3>
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>SHA Insured Patients</span>
                          <span className="font-bold text-teal-400">82%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-400 h-full rounded-full" style={{ width: '82%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Active Bed Occupancy Rate</span>
                          <span className="font-bold text-indigo-400">60%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-400 h-full rounded-full" style={{ width: '60%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Referrals Inbound</span>
                          <span className="font-bold text-amber-400">14%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: '14%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL: ADD/EDIT BLOCK */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{blockForm.id ? 'Edit Block' : 'Add Maternity Block'}</h3>
              <button onClick={() => setShowBlockModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Block Name</label>
                <input
                  type="text"
                  required
                  value={blockForm.name}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. Block A"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Description</label>
                <input
                  type="text"
                  value={blockForm.description}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. Main Maternity Block"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Status</label>
                <select
                  value={blockForm.status}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                {loading ? 'Saving...' : 'Save Block'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD/EDIT WARD */}
      {showWardModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{wardForm.id ? 'Edit Ward' : 'Add Maternity Ward'}</h3>
              <button onClick={() => setShowWardModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveWard} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Select Block</label>
                <select
                  value={wardForm.block_name}
                  onChange={(e) => setWardForm(prev => ({ ...prev, block_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  {blocks.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ward Name</label>
                <input
                  type="text"
                  required
                  value={wardForm.name}
                  onChange={(e) => setWardForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. MATERNITY-1"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Description</label>
                <input
                  type="text"
                  value={wardForm.description}
                  onChange={(e) => setWardForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. Inpatient Maternity Ward"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Drug Dispensing Store</label>
                <input
                  type="text"
                  value={wardForm.drug_store}
                  onChange={(e) => setWardForm(prev => ({ ...prev, drug_store: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Consumables Dispensing Store</label>
                <input
                  type="text"
                  value={wardForm.consumable_store}
                  onChange={(e) => setWardForm(prev => ({ ...prev, consumable_store: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Gender Preference</label>
                <select
                  value={wardForm.gender}
                  onChange={(e) => setWardForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="Female">Female Only</option>
                  <option value="Male">Male Only</option>
                  <option value="Everyone">Everyone</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Visiting Hours</label>
                <input
                  type="text"
                  value={wardForm.visiting_hours}
                  onChange={(e) => setWardForm(prev => ({ ...prev, visiting_hours: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. 12PM-2PM"
                />
              </div>
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                  {loading ? 'Saving...' : 'Save Ward'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD/EDIT BED TYPE */}
      {showBedTypeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{bedTypeForm.id ? 'Edit Bed Type' : 'Add Bed Type'}</h3>
              <button onClick={() => setShowBedTypeModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveBedType} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Bed Type Name</label>
                <input
                  type="text"
                  required
                  value={bedTypeForm.name}
                  onChange={(e) => setBedTypeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. General"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Description</label>
                <input
                  type="text"
                  value={bedTypeForm.description}
                  onChange={(e) => setBedTypeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. General Ward Bed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Status</label>
                <select
                  value={bedTypeForm.status}
                  onChange={(e) => setBedTypeForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                {loading ? 'Saving...' : 'Save Bed Type'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD/EDIT BED */}
      {showBedModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{bedForm.id ? 'Edit Bed' : 'Add Bed Code'}</h3>
              <button onClick={() => setShowBedModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveBed} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Name / Code</label>
                <input
                  type="text"
                  required
                  value={bedForm.name_code}
                  onChange={(e) => setBedForm(prev => ({ ...prev, name_code: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. 110"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Bed Type</label>
                <select
                  value={bedForm.bed_type}
                  onChange={(e) => setBedForm(prev => ({ ...prev, bed_type: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  {bedTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Select Ward</label>
                <select
                  value={bedForm.ward_name}
                  onChange={(e) => setBedForm(prev => ({ ...prev, ward_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Description / Allocation</label>
                <input
                  type="text"
                  value={bedForm.description}
                  onChange={(e) => setBedForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. Room 1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Cash Price (Ksh)</label>
                <input
                  type="number"
                  required
                  value={bedForm.cash_price}
                  onChange={(e) => setBedForm(prev => ({ ...prev, cash_price: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Corporate Price (Ksh)</label>
                <input
                  type="number"
                  required
                  value={bedForm.corporate_price}
                  onChange={(e) => setBedForm(prev => ({ ...prev, corporate_price: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Availability</label>
                <select
                  value={bedForm.availability}
                  onChange={(e) => setBedForm(prev => ({ ...prev, availability: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Status</label>
                <select
                  value={bedForm.status}
                  onChange={(e) => setBedForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                  {loading ? 'Saving...' : 'Save Bed'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: QUEUE TRIAGE */}
      {showTriageModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="text-teal-400" size={18} />
                <h3 className="font-bold text-slate-100 text-sm">Admissions Triage: {selectedQueueVisit?.patient?.name}</h3>
              </div>
              <button onClick={() => {
                setShowTriageModal(false);
                setSelectedQueueVisit(null);
              }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveTriage} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={triageForm.systolic}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, systolic: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="120"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  value={triageForm.diastolic}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, diastolic: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="80"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Pulse Rate (bpm)</label>
                <input
                  type="number"
                  value={triageForm.heart_rate}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, heart_rate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="72"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Temperature (°C)</label>
                <input
                  type="text"
                  value={triageForm.temperature}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, temperature: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="36.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Respiratory Rate</label>
                <input
                  type="number"
                  value={triageForm.resp_rate}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, resp_rate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="16"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Oxygen Saturation (SPO2 %)</label>
                <input
                  type="number"
                  value={triageForm.spo2}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, spo2: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50"
                  placeholder="98"
                />
              </div>

              {/* Fetal Heart Rate & Fundal Height */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Fetal Heart Rate (FHR bpm)</label>
                <input
                  type="number"
                  value={triageForm.fetal_heart_rate}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, fetal_heart_rate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-teal-400"
                  placeholder="e.g. 140"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Fundal Height (cm)</label>
                <input
                  type="number"
                  value={triageForm.fundal_height}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, fundal_height: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-teal-400"
                  placeholder="e.g. 32"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Complaints / Notes</label>
                <textarea
                  value={triageForm.notes}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 h-20"
                />
              </div>
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide">
                  Submit Vitals
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ASSIGN BED */}
      {showAssignBedModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-850 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Assign Maternity Bed</h3>
              <button onClick={() => {
                setShowAssignBedModal(false);
                setSelectedAssignVisit(null);
                setSelectedBedId('');
              }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleAssignBed} className="space-y-4">
              <div>
                <div className="text-xs text-slate-400">Assigning bed for patient:</div>
                <div className="font-bold text-slate-200 text-sm mt-0.5">{selectedAssignVisit?.patient?.name}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Select Available Bed</label>
                <select
                  required
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500/50 text-slate-300"
                >
                  <option value="">-- Select Bed --</option>
                  {beds.filter(b => b.availability === 'Available' && b.status === 'Active').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name_code} - {b.bed_type} ({b.ward_name}) - Ksh {b.cash_price}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!selectedBedId}
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 rounded text-xs font-bold text-white transition-all uppercase tracking-wide"
              >
                Confirm Allocation
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
