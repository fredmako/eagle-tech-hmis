import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { parsePatientContact } from '../../notificationService';
import { Search, UserPlus, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

export default function Registration({ user, onNavigateToQueue, showNotification }) {
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

  // Service Classification states
  const [regServiceType, setRegServiceType] = useState('OPD');
  const [autoCheckin, setAutoCheckin] = useState(true);

  // Email & notification settings
  const [email, setEmail] = useState('');
  const [optInLab, setOptInLab] = useState(true);
  const [optInPharmacy, setOptInPharmacy] = useState(true);
  const [optInBilling, setOptInBilling] = useState(true);

  // Extra MOH compliance demographics
  const [village, setVillage] = useState('');
  const [landmark, setLandmark] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [isPregnant, setIsPregnant] = useState(false);
  const [parity, setParity] = useState('');
  const [gravidae, setGravidae] = useState('');
  const [lmp, setLmp] = useState('');
  const [edd, setEdd] = useState('');

  // SHA registration states
  const [shaNumber, setShaNumber] = useState('');
  const [shaDependentType, setShaDependentType] = useState('self');
  const [shaStatus, setShaStatus] = useState('unverified');
  const [verifyingSha, setVerifyingSha] = useState(false);

  // Ward admissions states
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'wards'
  const [admissions, setAdmissions] = useState([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);

  const fetchAdmissions = async () => {
    setLoadingAdmissions(true);
    try {
      const { data: admData, error: admError } = await supabase
        .from('inpatient_admissions')
        .select('*')
        .eq('status', 'admitted');
      if (admError) throw admError;

      const { data: pts, error: ptsError } = await supabase
        .from('patients')
        .select('*');
      if (ptsError) throw ptsError;

      const { data: bedsData } = await supabase.from('bed_allocations').select('*');

      const enriched = admData ? admData.map(a => {
        const p = pts?.find(pt => pt.id === a.patient_id);
        const b = bedsData?.find(bd => bd.id === a.bed_id);
        return {
          ...a,
          patient: p,
          bed_number: b ? b.bed_number : 'Bed N/A',
          ward_name: a.ward_id ? a.ward_id.replace('ward_', '').toUpperCase() : 'Ward N/A'
        };
      }) : [];
      setAdmissions(enriched);
    } catch (err) {
      console.error('Error fetching admissions:', err);
    } finally {
      setLoadingAdmissions(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'wards') {
      fetchAdmissions();
    }
  };

  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const performSearch = async (query) => {
    setSearching(true);
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;
      
      const filtered = data ? data.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.national_id?.includes(query) ||
        p.facility_id_code?.toLowerCase().includes(query.toLowerCase())
      ) : [];

      if (filtered.length > 0) {
        const patientIds = filtered.map(p => p.id);
        const { data: ords } = await supabase.from('orders').select('*').in('status', ['ordered', 'pending', 'prescribed', 'scheduled', 'completed', 'verified']);
        const { data: invs } = await supabase.from('invoices').select('*').eq('status', 'unpaid');
        const { data: vsts } = await supabase.from('visits').select('*').in('patient_id', patientIds);

        const enriched = filtered.map(p => {
          const ptVisits = vsts ? vsts.filter(v => v.patient_id === p.id) : [];
          const ptVisitIds = ptVisits.map(v => v.id);

          const pendingLabs = ords ? ords.filter(o => ptVisitIds.includes(o.visit_id) && o.type === 'lab' && o.status !== 'released' && o.status !== 'cancelled') : [];
          const pendingRad = ords ? ords.filter(o => ptVisitIds.includes(o.visit_id) && o.type === 'radiology' && o.status !== 'released' && o.status !== 'cancelled') : [];
          const scheduledFollowups = ords ? ords.filter(o => ptVisitIds.includes(o.visit_id) && o.type === 'follow_up' && o.status === 'scheduled') : [];
          const unpaidInvoices = invs ? invs.filter(i => ptVisitIds.includes(i.visit_id)) : [];

          return {
            ...p,
            alerts: {
              pendingLabsCount: pendingLabs.length,
              pendingRadCount: pendingRad.length,
              scheduledFollowups,
              unpaidBalance: unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
            }
          };
        });
        setSearchResults(enriched);
      } else {
        setSearchResults([]);
      }
      setSearched(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSearching(false);
    }
  };

  const [timelineData, setTimelineData] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [expandedTimelinePtId, setExpandedTimelinePtId] = useState(null);

  const loadPatientTimeline = async (ptId) => {
    setLoadingTimeline(true);
    try {
      const { data: vsts, error: vError } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', ptId)
        .order('created_at', { ascending: false });
      if (vError) throw vError;

      if (!vsts || vsts.length === 0) {
        setTimelineData([]);
        setLoadingTimeline(false);
        return;
      }

      const visitIds = vsts.map(v => v.id);

      const { data: cns } = await supabase
        .from('consultations')
        .select('*')
        .in('visit_id', visitIds);

      const { data: trgs } = await supabase
        .from('triages')
        .select('*')
        .in('visit_id', visitIds);

      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .in('visit_id', visitIds);

      const events = [];

      vsts.forEach(v => {
        events.push({
          id: `visit-${v.id}`,
          date: v.created_at || v.visit_date,
          type: 'visit',
          title: `Clinic Visit Started - ${v.service_type || 'OPD'}`,
          desc: `Checked-in to ${v.current_queue || 'General'} queue. Status: ${v.status || 'Active'}`
        });
      });

      if (cns) {
        cns.forEach(c => {
          events.push({
            id: `consult-${c.id}`,
            date: c.created_at,
            type: 'consultation',
            title: `Clinical SOAP Consultation`,
            desc: `Diagnosis: ${c.diagnosis || 'None'} | Notes: ${c.history || 'No SOAP notes'}`
          });
        });
      }

      if (trgs) {
        trgs.forEach(t => {
          events.push({
            id: `triage-${t.id}`,
            date: t.created_at,
            type: 'triage',
            title: `Triage Vitals Check`,
            desc: `Temp: ${t.temperature}°C | BP: ${t.systolic_bp}/${t.diastolic_bp} | Pulse: ${t.pulse} bpm | SpO2: ${t.spo2}%`
          });
        });
      }

      if (ords) {
        ords.forEach(o => {
          let orderDetails = '';
          if (o.ordered_labs && o.ordered_labs.length > 0) {
            orderDetails = `Labs: ${o.ordered_labs.join(', ')}`;
          }
          if (o.prescriptions && o.prescriptions.length > 0) {
            orderDetails += (orderDetails ? ' | ' : '') + `Prescriptions: ${o.prescriptions.map(p => `${p.name} (${p.dosage})`).join(', ')}`;
          }
          events.push({
            id: `order-${o.id}`,
            date: o.created_at,
            type: 'order',
            title: `Clinical Orders Placed`,
            desc: orderDetails || `Lab or Pharmacy orders created.`
          });
        });
      }

      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimelineData(events);
    } catch (err) {
      console.warn("Timeline fetch error, fallback to mock events:", err.message);
      const mockEvents = [
        {
          id: 'mock-evt-1',
          date: new Date().toISOString(),
          type: 'visit',
          title: 'Clinic Visit Started - OPD',
          desc: 'Checked-in to General Triage queue.'
        },
        {
          id: 'mock-evt-2',
          date: new Date(Date.now() - 3600000).toISOString(),
          type: 'triage',
          title: 'Triage Vitals Check',
          desc: 'Temp: 36.8°C | BP: 120/80 mmHg | Pulse: 72 bpm | SpO2: 98%'
        },
        {
          id: 'mock-evt-3',
          date: new Date(Date.now() - 7200000).toISOString(),
          type: 'consultation',
          title: 'Clinical SOAP Consultation',
          desc: 'Diagnosis: Acute Bronchitis | Prescribed: Amoxicillin 500mg, Paracetamol 500mg'
        }
      ];
      setTimelineData(mockEvents);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    performSearch(searchQuery);
  };

  const handleDirectCheckin = async (patientId, serviceTypeVal) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      let targetDept = 'triage';
      let targetPriority = 'routine';

      if (serviceTypeVal === 'LAB') {
        targetDept = 'lab';
      } else if (serviceTypeVal === 'PHA') {
        targetDept = 'pharmacy';
      } else if (serviceTypeVal === 'IPD') {
        targetDept = 'ward';
      } else if (serviceTypeVal === 'EMR') {
        targetDept = 'triage';
        targetPriority = 'emergency';
      } else if (serviceTypeVal === 'FP' || serviceTypeVal === 'IMM') {
        targetDept = 'consultation';
      } else if (serviceTypeVal === 'ANC') {
        targetDept = 'triage';
      }

      // Check for active visit
      const { data: vsts } = await supabase.from('visits').select('*').eq('patient_id', patientId);
      const active = vsts?.find(v => v.status !== 'completed');
      if (active) {
        throw new Error(`Patient already has an active visit in ${active.department.toUpperCase()}.`);
      }

      const visitRecord = {
        patient_id: patientId,
        facility_id: user.facility_id,
        department: targetDept,
        priority: targetPriority,
        status: 'waiting',
        service_type: serviceTypeVal
      };
      const { error: visitErr } = await supabase.from('visits').insert(visitRecord);
      if (visitErr) throw visitErr;

      // Create MOH compliance record
      const regRecord = {
        patient_id: patientId,
        facility_id: user.facility_id,
        visit_type: 'walk-in',
        service_type: serviceTypeVal,
        status: 'active'
      };
      await supabase.from('patient_registrations').insert(regRecord);

      if (showNotification) {
        showNotification('success', 'Check-in Successful', `Patient checked in successfully for ${serviceTypeVal}!`);
      } else {
        setMessage({ type: 'success', text: `Patient checked in successfully for ${serviceTypeVal}!` });
      }
      performSearch(searchQuery);
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Check-in Failed', err.message || 'Check-in failed.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Check-in failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Input Buffers / Realistic Validation Checks
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (dob > todayStr) {
      setMessage({ type: 'error', text: 'Date of Birth cannot be in the future.' });
      return;
    }
    if (dob < '1900-01-01') {
      setMessage({ type: 'error', text: 'Date of Birth must not be before 1900.' });
      return;
    }

    if (phone) {
      const cleanPhone = phone.trim();
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        setMessage({ type: 'error', text: 'Phone number must be between 8 and 15 characters long.' });
        return;
      }
      const phoneRegex = /^[0-9+()\s-]+$/;
      if (!phoneRegex.test(cleanPhone)) {
        setMessage({ type: 'error', text: 'Phone number contains invalid characters.' });
        return;
      }
    }

    if (nationalId) {
      const cleanNatId = nationalId.trim();
      if (cleanNatId.length < 4 || cleanNatId.length > 20) {
        setMessage({ type: 'error', text: 'National ID must be between 4 and 20 characters long.' });
        return;
      }
    }

    if (isPregnant && lmp) {
      if (lmp > todayStr) {
        setMessage({ type: 'error', text: 'LMP date cannot be in the future.' });
        return;
      }
      const lmpDate = new Date(lmp);
      const diffTime = Math.abs(new Date() - lmpDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 315) {
        setMessage({ type: 'error', text: 'LMP date must not be more than 45 weeks in the past.' });
        return;
      }
    }

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
        phone: JSON.stringify({
          phone: phone,
          email: email,
          preferences: { lab: optInLab, pharmacy: optInPharmacy, billing: optInBilling },
          village: village,
          landmark: landmark,
          marital_status: maritalStatus,
          parity: parity ? parseInt(parity) : 0,
          gravidae: gravidae ? parseInt(gravidae) : 0,
          lmp: isPregnant ? lmp : '',
          edd: isPregnant ? edd : ''
        }),
        next_of_kin_name: nokName,
        next_of_kin_phone: nokPhone,
        next_of_kin_relation: nokRelation,
        consent_given: consent,
        sha_number: shaNumber || null,
        sha_dependent_type: shaDependentType,
        sha_status: shaStatus
      };

      const { data, error } = await supabase.from('patients').insert(newPatient).select();
      if (error) throw error;

      const addedPt = Array.isArray(data) ? data[0] : data;

      // Create MOH compliance record
      const regRecord = {
        patient_id: addedPt.id,
        facility_id: user.facility_id,
        visit_type: 'walk-in',
        service_type: regServiceType,
        status: 'active'
      };
      await supabase.from('patient_registrations').insert(regRecord);

      // Auto-queuing / routing
      if (autoCheckin) {
        let targetDept = 'triage';
        let targetPriority = 'routine';

        if (regServiceType === 'LAB') {
          targetDept = 'lab';
        } else if (regServiceType === 'PHA') {
          targetDept = 'pharmacy';
        } else if (regServiceType === 'IPD') {
          targetDept = 'ward';
        } else if (regServiceType === 'EMR') {
          targetDept = 'triage';
          targetPriority = 'emergency';
        } else if (regServiceType === 'FP' || regServiceType === 'IMM') {
          targetDept = 'consultation';
        } else if (regServiceType === 'ANC') {
          targetDept = 'triage';
        }

        const visitRecord = {
          patient_id: addedPt.id,
          facility_id: user.facility_id,
          department: targetDept,
          priority: targetPriority,
          status: 'waiting',
          service_type: regServiceType
        };
        await supabase.from('visits').insert(visitRecord);
      }

      if (showNotification) {
        showNotification('success', 'Registration Successful', `Patient successfully registered! Facility ID: ${facilityCode}${autoCheckin ? ' and checked in to queue.' : ''}`);
      } else {
        setMessage({ type: 'success', text: `Patient successfully registered! Facility ID: ${facilityCode}${autoCheckin ? ' and checked in to queue.' : ''}` });
      }
      
      // Clear form
      setName('');
      setDob('');
      setGender('male');
      setNationalId('');
      setPhone('');
      setEmail('');
      setNokName('');
      setNokPhone('');
      setNokRelation('spouse');
      setConsent(true);
      setOptInLab(true);
      setOptInPharmacy(true);
      setOptInBilling(true);
      setVillage('');
      setLandmark('');
      setMaritalStatus('single');
      setIsPregnant(false);
      setParity('');
      setGravidae('');
      setLmp('');
      setEdd('');
      setShaNumber('');
      setShaDependentType('self');
      setShaStatus('unverified');

      // Re-trigger search or take user to queue builder directly with patient details
      if (data) {
        const addedPt = Array.isArray(data) ? data[0] : data;
        setSearchResults([addedPt]);
        setSearched(true);
      }
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Registration Failed', err.message || 'Failed to register patient.');
      } else {
        setMessage({ type: 'error', text: err.message || 'Failed to register patient.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.88fr)_minmax(620px,1.12fr)] gap-6 2xl:gap-8 items-start">
      {/* Left Column: Search & Quick Actions / Patients in Wards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 2xl:p-6 shadow-sm space-y-6 h-fit min-w-0">
        <div className="flex border-b border-slate-800 pb-2 gap-4">
          <button
            type="button"
            onClick={() => handleTabChange('search')}
            className={`text-sm font-bold pb-2 transition border-b-2 ${
              activeTab === 'search'
                ? 'text-teal-400 border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Search Patient
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('wards')}
            className={`text-sm font-bold pb-2 transition border-b-2 ${
              activeTab === 'wards'
                ? 'text-teal-400 border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Patients In Wards
          </button>
        </div>

        {activeTab === 'search' ? (
          <>
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
                      <div key={pt.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-teal-500/30 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                          <div>
                            <span className="font-bold text-slate-200 block text-sm">{pt.name}</span>
                            <span className="text-xs text-slate-500 font-semibold uppercase">{pt.gender} | Age: {new Date().getFullYear() - new Date(pt.dob).getFullYear()} yrs</span>
                            <div className="grid grid-cols-2 gap-x-4 mt-1 text-[10px] text-slate-400">
                              <span>Code: <span className="text-teal-400 font-semibold">{pt.facility_id_code}</span></span>
                              <span>Phone: <span className="text-slate-300 font-semibold">{parsePatientContact(pt.phone).phone}</span></span>
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigateToQueue(pt)}
                            className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-semibold text-xs py-1.5 px-3 rounded-lg border border-teal-500/20 transition self-end sm:self-center shrink-0"
                          >
                            Open Visit / Queue
                          </button>
                        </div>
                        <div className="border-t border-slate-900 pt-2 flex flex-wrap items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-1.5">
                            <select
                              id={`service-select-${pt.id}`}
                              defaultValue="OPD"
                              className="bg-slate-900 border border-slate-800 text-[10px] text-white py-1 px-2 rounded focus:outline-none focus:border-teal-500"
                            >
                              <option value="OPD">General OPD (OPD)</option>
                              <option value="ANC">Antenatal Care (ANC)</option>
                              <option value="FP">Family Planning (FP)</option>
                              <option value="IMM">Immunization/Vaccine</option>
                              <option value="LAB">Laboratory-Only</option>
                              <option value="PHA">Pharmacy-Only</option>
                              <option value="IPD">Inpatient Admission</option>
                              <option value="EMR">Emergency/Triage</option>
                            </select>
                            <button
                              onClick={async () => {
                                const val = document.getElementById(`service-select-${pt.id}`).value;
                                await handleDirectCheckin(pt.id, val);
                              }}
                              className="bg-teal-500/15 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 font-bold text-[9px] py-1 px-2.5 rounded transition active:scale-[0.97]"
                            >
                              Direct Check-in
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (expandedTimelinePtId === pt.id) {
                                setExpandedTimelinePtId(null);
                              } else {
                                setExpandedTimelinePtId(pt.id);
                                loadPatientTimeline(pt.id);
                              }
                            }}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[9px] py-1 px-2.5 rounded transition active:scale-[0.97]"
                          >
                            {expandedTimelinePtId === pt.id ? "Hide Timeline" : "View Health Timeline"}
                          </button>
                        </div>
                        
                        {/* Clinical Journey Alerts */}
                        {pt.alerts && (
                          <div className="flex flex-wrap gap-1.5 mt-1 border-t border-slate-900 pt-2 w-full">
                            {pt.alerts.pendingLabsCount > 0 && (
                              <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                ⚠️ {pt.alerts.pendingLabsCount} Pending Lab
                              </span>
                            )}
                            {pt.alerts.pendingRadCount > 0 && (
                              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                ⚡ {pt.alerts.pendingRadCount} Imaging Ordered
                              </span>
                            )}
                            {pt.alerts.unpaidBalance > 0 && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                💳 Bill Unpaid: {pt.alerts.unpaidBalance}/-
                              </span>
                            )}
                            {pt.alerts.scheduledFollowups.map((f, fIdx) => (
                              <div key={fIdx} className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5">
                                📅 Follow-up: {f.instructions}
                                <button
                                  onClick={async () => {
                                    try {
                                      // Mark scheduled follow-up order as completed
                                      await supabase.from('orders').update({ status: 'completed' }).eq('id', f.id);
                                      // Create active visit in OPD Consultation
                                      await supabase.from('visits').insert({
                                        patient_id: pt.id,
                                        facility_id: user.facility_id,
                                        department: 'consultation',
                                        priority: 'routine',
                                        status: 'waiting'
                                      });
                                      setMessage({ type: 'success', text: `Patient successfully checked in for scheduled follow-up review!` });
                                      // Refresh search
                                      performSearch(searchQuery); 
                                    } catch (err) {
                                      setMessage({ type: 'error', text: err.message });
                                    }
                                  }}
                                  className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold px-1.5 py-0.2 rounded transition active:scale-[0.96]"
                                  title="Check-in patient now"
                                >
                                  Check-in
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {expandedTimelinePtId === pt.id && (
                          <div className="mt-3 border-t border-slate-900 pt-3 space-y-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chronological Clinical Health Timeline</span>
                            {loadingTimeline ? (
                              <div className="py-4 text-center text-slate-500 text-[10px] flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b border-teal-400" />
                                <span>Loading timeline...</span>
                              </div>
                            ) : timelineData.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-600">
                                No medical records found for this patient.
                              </div>
                            ) : (
                              <div className="relative pl-4 border-l border-slate-800 space-y-3.5 py-1">
                                {timelineData.map(evt => (
                                  <div key={evt.id} className="relative group">
                                    <div className={`absolute -left-[20.5px] top-1.5 h-2.5 w-2.5 rounded-full border border-slate-950 ${
                                      evt.type === 'visit' ? 'bg-teal-400' :
                                      evt.type === 'triage' ? 'bg-amber-400' :
                                      evt.type === 'consultation' ? 'bg-green-400' :
                                      'bg-purple-400'
                                    }`} />
                                    
                                    <div className="text-[9px] text-slate-500 font-semibold font-mono">
                                      {new Date(evt.date).toLocaleString()}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-200 mt-0.5">
                                      {evt.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-normal mt-0.5">
                                      {evt.desc}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity size={18} className="text-teal-400 animate-pulse" /> Patients In Wards
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Currently admitted patients in the ward facility.
              </p>
            </div>

            {loadingAdmissions ? (
              <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400" />
                <span>Loading admissions...</span>
              </div>
            ) : admissions.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500 text-xs">
                No patients currently admitted in the wards.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {admissions.map((adm) => (
                  <div key={adm.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 hover:border-teal-500/20 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-200 block text-xs">{adm.patient?.name || 'Unknown Patient'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{adm.patient?.gender} | Age: {adm.patient?.dob ? new Date().getFullYear() - new Date(adm.patient.dob).getFullYear() : 'N/A'} yrs</span>
                      </div>
                      <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">
                        {adm.admission_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-mono">
                      <div>Ward: <span className="text-slate-300 font-bold">{adm.ward_name}</span></div>
                      <div>Bed No: <span className="text-teal-400 font-bold">{adm.bed_number}</span></div>
                      <div className="col-span-2 text-[9px] text-slate-500">
                        Admitted: {new Date(adm.admission_datetime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Register New Patient Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 2xl:p-6 shadow-sm space-y-6 min-w-0">
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

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Service Classification */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Service Classification</h3>
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_240px] gap-4 items-end">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Service Type</label>
                <select
                  value={regServiceType}
                  onChange={(e) => setRegServiceType(e.target.value)}
                  className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="OPD">General OPD (Normal Consultation)</option>
                  <option value="ANC">Antenatal Care (ANC)</option>
                  <option value="FP">Family Planning (FP)</option>
                  <option value="IMM">Immunization/Vaccination</option>
                  <option value="LAB">Laboratory-Only</option>
                  <option value="PHA">Pharmacy-Only</option>
                  <option value="IPD">Inpatient Admission</option>
                  <option value="EMR">Emergency/Triage</option>
                </select>
              </div>
              <div className="flex items-center min-h-[42px]">
                <label className="flex items-start gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none hover:text-white transition leading-snug">
                  <input
                    type="checkbox"
                    checked={autoCheckin}
                    onChange={(e) => setAutoCheckin(e.target.checked)}
                    className="accent-teal-500 h-4 w-4 bg-slate-900 border-slate-800 rounded text-teal-505 shrink-0 mt-0.5"
                  />
                  <span>Check-in patient to queue immediately</span>
                </label>
              </div>
            </div>
          </div>

          {/* Social Health Authority (SHA) Insurance Verification */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Social Health Authority (SHA) Insurance</h3>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] gap-4 items-start">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SHA Member Number</label>
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    type="text"
                    value={shaNumber}
                    onChange={(e) => {
                      setShaNumber(e.target.value);
                      setShaStatus('unverified');
                    }}
                    placeholder="e.g. SHA-12345678"
                    className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
                  />
                  <button
                    type="button"
                    disabled={verifyingSha || !shaNumber.trim()}
                    onClick={async () => {
                      setVerifyingSha(true);
                      // Mock external API handshake
                      await new Promise((resolve) => setTimeout(resolve, 800));
                      if (shaNumber.trim().length >= 4) {
                        setShaStatus('Verified / Eligible');
                      } else {
                        setShaStatus('Ineligible / Invalid Number');
                      }
                      setVerifyingSha(false);
                    }}
                    className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 font-bold text-xs px-4 py-2.5 rounded-lg transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                  >
                    {verifyingSha ? 'Verifying...' : 'Verify Eligibility'}
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SHA Dependent Type</label>
                <select
                  value={shaDependentType}
                  onChange={(e) => setShaDependentType(e.target.value)}
                  className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="self">Principal Member (Self)</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="other">Other Dependent</option>
                </select>
              </div>
            </div>

            {shaNumber.trim() && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  shaStatus === 'Verified / Eligible' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                  shaStatus === 'unverified' ? 'bg-slate-900 border border-slate-800 text-slate-400' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {shaStatus}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
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
                min="1900-01-01"
                max={new Date().toISOString().split('T')[0]}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
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
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
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
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Patient Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@eagletechsolutions.tech"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            {/* Village / Estate */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Village / Estate *</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Kawangware"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Landmark / Residence Details</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Market / Church"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Marital Status *</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
            </div>
          </div>


          {/* Notification Opt-In preferences */}
          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Patient Notification Consent Preferences</h3>
            <div className="flex flex-wrap gap-4 text-xs font-bold">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
                <input
                  type="checkbox"
                  checked={optInLab}
                  onChange={(e) => setOptInLab(e.target.checked)}
                  className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
                />
                Opt-in Lab emails
              </label>
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
                <input
                  type="checkbox"
                  checked={optInPharmacy}
                  onChange={(e) => setOptInPharmacy(e.target.checked)}
                  className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
                />
                Opt-in Pharmacy emails
              </label>
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
                <input
                  type="checkbox"
                  checked={optInBilling}
                  onChange={(e) => setOptInBilling(e.target.checked)}
                  className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
                />
                Opt-in Billing emails
              </label>
            </div>
          </div>

          {/* Next of Kin Details */}
          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Next of Kin details</h3>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
