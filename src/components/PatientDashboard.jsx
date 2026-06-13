import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { parsePatientContact } from '../notificationService';
import { User, Clipboard, Activity, FlaskConical, Pill, FileText, Calendar, DollarSign, Bed } from 'lucide-react';

export default function PatientDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState(null);
  
  // Timeline aggregated records
  const [visits, setVisits] = useState([]);
  const [triages, setTriages] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientTimeline(selectedPatientId);
    } else {
      setPatientData(null);
      setVisits([]);
      setTriages([]);
      setConsultations([]);
      setOrders([]);
      setInvoices([]);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const { data } = await supabase.from('patients').select('*');
      setPatients(data || []);
      if (data && data.length > 0) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const loadPatientTimeline = async (patientId) => {
    try {
      // 1. Get patient details
      const { data: pts } = await supabase.from('patients').select('*').eq('id', patientId);
      if (pts && pts.length > 0) {
        setPatientData(pts[0]);
      }

      // 2. Get visits
      const { data: vsts } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
      const activeVisits = vsts || [];
      setVisits(activeVisits);

      if (activeVisits.length > 0) {
        // Collect all visit IDs
        const visitIds = activeVisits.map(v => v.id);

        // Fetch related records
        const { data: trgs } = await supabase.from('triages').select('*');
        const { data: cns } = await supabase.from('consultations').select('*');
        const { data: ords } = await supabase.from('orders').select('*');
        const { data: invs } = await supabase.from('invoices').select('*');

        // Filter locally by visit IDs
        setTriages(trgs ? trgs.filter(t => visitIds.includes(t.visit_id)) : []);
        setConsultations(cns ? cns.filter(c => visitIds.includes(c.visit_id)) : []);
        setOrders(ords ? ords.filter(o => visitIds.includes(o.visit_id)) : []);
        setInvoices(invs ? invs.filter(i => visitIds.includes(i.visit_id)) : []);
      } else {
        setTriages([]);
        setConsultations([]);
        setOrders([]);
        setInvoices([]);
      }
    } catch (err) {
      console.error('Error loading patient timeline:', err);
    }
  };

  const getAge = (dob) => {
    if (!dob) return 'N/A';
    return new Date().getFullYear() - new Date(dob).getFullYear();
  };

  return (
    <div className="space-y-6">
      {/* Patient Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clipboard size={18} className="text-teal-400" /> Electronic Patient Health Record
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a patient to pull up their complete clinical summaries and timelines.</p>
        </div>
        
        <div className="w-full md:w-64">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
          >
            <option value="">-- Choose Patient Profile --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.facility_id_code})</option>
            ))}
          </select>
        </div>
      </div>

      {!patientData ? (
        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl py-24 text-center text-slate-500 text-sm">
          Please select a patient to display clinical records.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Info Sidebar Column (1/4 width) */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 h-fit">
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="h-16 w-16 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center font-bold text-teal-400 text-xl mx-auto shadow mb-3">
                {patientData.name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="font-bold text-slate-100 text-sm leading-tight">{patientData.name}</h3>
              <span className="text-xs text-teal-400 font-mono font-semibold">{patientData.facility_id_code}</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800/40">Demographics</h4>
              <div className="grid grid-cols-2 gap-y-2.5">
                <div>
                  <span className="text-slate-500 block">Gender</span>
                  <span className="font-semibold text-slate-200 capitalize">{patientData.gender}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Age</span>
                  <span className="font-semibold text-slate-200">{getAge(patientData.dob)} years</span>
                </div>
                <div>
                  <span className="text-slate-500 block">DOB</span>
                  <span className="font-semibold text-slate-200">{patientData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="font-semibold text-slate-200">{parsePatientContact(patientData.phone).phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-200">{parsePatientContact(patientData.phone).email || 'N/A'}</span>
                </div>
                <div className="col-span-2 mt-1 bg-slate-950 border border-slate-850 p-2 rounded-lg text-[10px]">
                  <span className="text-slate-500 block uppercase font-bold mb-1">Notification Opt-In Toggles</span>
                  <div className="flex gap-4 font-bold">
                    <span className={parsePatientContact(patientData.phone).preferences.lab ? "text-green-400" : "text-slate-500"}>● Lab alerts</span>
                    <span className={parsePatientContact(patientData.phone).preferences.pharmacy ? "text-green-400" : "text-slate-500"}>● Pharmacy alerts</span>
                    <span className={parsePatientContact(patientData.phone).preferences.billing ? "text-green-400" : "text-slate-500"}>● Billing receipts</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs pt-2">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800/40">Next of Kin</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 block">Name</span>
                  <span className="font-semibold text-slate-200">{patientData.next_of_kin_name || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Relation</span>
                    <span className="font-semibold text-slate-200 capitalize">{patientData.next_of_kin_relation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="font-semibold text-slate-200">{patientData.next_of_kin_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-2">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800/40">MOH Status</h4>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-2 rounded-lg">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${patientData.consent_given ? 'bg-green-500 shadow shadow-green-500/10' : 'bg-red-500'}`} />
                <span className="text-[10px] font-semibold text-slate-300">
                  {patientData.consent_given ? 'MOH Data Consent Given' : 'Consent Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Operations Column (3/4 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Visits</span>
                  <span className="text-xl font-bold text-slate-200">{visits.length}</span>
                </div>
                <Calendar size={20} className="text-slate-600" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Diagnoses Logged</span>
                  <span className="text-xl font-bold text-slate-200">{consultations.length}</span>
                </div>
                <FileText size={20} className="text-slate-600" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lab Tests Run</span>
                  <span className="text-xl font-bold text-slate-200">{orders.filter(o => o.type === 'lab').length}</span>
                </div>
                <FlaskConical size={20} className="text-slate-600" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Financial Bill</span>
                  <span className="text-xl font-bold text-teal-400 font-mono">
                    {invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)}/-
                  </span>
                </div>
                <DollarSign size={20} className="text-slate-600" />
              </div>
            </div>

            {/* Visit Timeline Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">Clinical Care Timeline</h3>

              {visits.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-12">
                  No medical visits registered for this patient.
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                  {visits.map((visit) => {
                    const triage = triages.find(t => t.visit_id === visit.id);
                    const consult = consultations.find(c => c.visit_id === visit.id);
                    const vOrders = orders.filter(o => o.visit_id === visit.id);
                    const invoice = invoices.find(i => i.visit_id === visit.id);

                    return (
                      <div key={visit.id} className="pl-8 relative group">
                        {/* Timeline node marker */}
                        <div className="absolute left-[5px] top-1.5 h-[16px] w-[16px] rounded-full bg-slate-900 border-2 border-teal-500 group-hover:bg-teal-500 transition-colors shadow shadow-teal-500/10" />

                        {/* Timeline card */}
                        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3.5">
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-[9px] text-slate-500 font-mono block">{new Date(visit.created_at).toLocaleString()}</span>
                              <span className="text-xs font-bold text-slate-200">Outpatient Visit</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                              visit.status === 'completed' ? 'text-green-400 bg-green-950/20 border-green-500/20' : 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20'
                            }`}>{visit.status}</span>
                          </div>

                          {/* Triage Detail Summary */}
                          {triage && (
                            <div className="bg-slate-900/40 border border-slate-850/60 p-3 rounded-lg text-xs space-y-2">
                              <span className="font-semibold text-slate-350 block flex items-center gap-1.5"><Activity size={12} className="text-teal-400" /> Triage Vital Diagnostics</span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono">
                                <span>BP: <span className="text-slate-200">{triage.systolic}/{triage.diastolic} mmHg</span></span>
                                <span>Temp: <span className="text-slate-200">{triage.temperature} °C</span></span>
                                <span>Pulse: <span className="text-slate-200">{triage.heart_rate} bpm</span></span>
                                <span>BMI: <span className="text-slate-250 font-bold">{triage.bmi}</span></span>
                              </div>
                              <p className="text-[11px] text-slate-450 border-t border-slate-850/45 pt-1.5">
                                **Chief Complaint**: {triage.chief_complaint}
                              </p>
                            </div>
                          )}

                          {/* Consultation SOAP & Diagnosis */}
                          {consult && (
                            <div className="bg-slate-900/40 border border-slate-850/60 p-3 rounded-lg text-xs space-y-2">
                              <span className="font-semibold text-slate-350 block flex items-center gap-1.5"><FileText size={12} className="text-teal-400" /> Clinician Consultation SOAP</span>
                              <div className="space-y-1 text-slate-400">
                                <p><span className="text-slate-500 font-medium">Subjective History:</span> {consult.history}</p>
                                <p><span className="text-slate-500 font-medium">Objective Exam:</span> {consult.examination}</p>
                              </div>
                              <div className="border-t border-slate-850/45 pt-1.5 flex justify-between items-center text-[10px]">
                                <span>MOH ICD-10 Diagnosis:</span>
                                <span className="bg-teal-500/5 border border-teal-500/20 text-teal-400 font-bold px-2 py-0.5 rounded">{consult.diagnosis_icd10}</span>
                              </div>
                            </div>
                          )}

                          {/* Orders and Prescriptions List */}
                          {vOrders.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Labs */}
                              {vOrders.some(o => o.type === 'lab') && (
                                <div className="bg-slate-900/20 border border-slate-850 p-2.5 rounded-lg space-y-1.5">
                                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] flex items-center gap-1"><FlaskConical size={10} /> Investigations</span>
                                  {vOrders.filter(o => o.type === 'lab').map(o => {
                                    let meta = {};
                                    if (o.results && o.results.startsWith('{')) {
                                      try { meta = JSON.parse(o.results); } catch (e) {}
                                    }
                                    return (
                                      <div key={o.id} className="border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0 text-[11px] space-y-1">
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold text-slate-350">{o.item_name}</span>
                                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                                            o.status === 'released' || o.status === 'completed' ? 'bg-green-500/10 text-green-450 border border-green-500/15' :
                                            o.status === 'rejected' ? 'bg-red-500/10 text-red-450 border border-red-500/15' :
                                            'bg-yellow-500/10 text-yellow-450 border border-yellow-500/15'
                                          }`}>
                                            {o.status || 'ordered'}
                                          </span>
                                        </div>
                                        {o.status === 'rejected' && (
                                          <p className="text-[10px] text-red-400">Reason: {meta.rejection_reason || 'Hemolyzed Sample'}</p>
                                        )}
                                        {meta.barcode && (
                                          <p className="text-[9px] text-slate-500 font-mono">Barcode: {meta.barcode}</p>
                                        )}
                                        {(o.status === 'released' || o.status === 'completed') && (
                                          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850/65 mt-1 font-sans">
                                            <p className="text-[10px] text-slate-200 font-medium">Result: {meta.values || o.results}</p>
                                            {meta.verifier && <p className="text-[8px] text-teal-400 mt-0.5">Verified by: {meta.verifier}</p>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Prescriptions */}
                              {vOrders.some(o => o.type === 'prescription') && (
                                <div className="bg-slate-900/20 border border-slate-850 p-2.5 rounded-lg space-y-1.5">
                                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] flex items-center gap-1"><Pill size={10} /> Prescriptions</span>
                                  {vOrders.filter(o => o.type === 'prescription').map(o => {
                                    let meta = {};
                                    if (o.results && o.results.startsWith('{')) {
                                      try { meta = JSON.parse(o.results); } catch (e) {}
                                    }
                                    return (
                                      <div key={o.id} className="border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0 text-[11px] space-y-1">
                                        <div className="flex justify-between items-start gap-1">
                                          <div>
                                            <span className="font-semibold text-slate-350">{o.item_name}</span>
                                            <p className="text-[10px] text-slate-500">{o.instructions}</p>
                                          </div>
                                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                                            o.status === 'dispensed' ? 'bg-green-500/10 text-green-455 border border-green-500/15' :
                                            o.status === 'out_of_stock' ? 'bg-red-500/10 text-red-455 border border-red-500/15' :
                                            'bg-yellow-500/10 text-yellow-455 border border-yellow-500/15'
                                          }`}>
                                            {o.status || 'prescribed'}
                                          </span>
                                        </div>
                                        {o.status === 'dispensed' && meta.dispensed_batch && (
                                          <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex justify-between bg-slate-900/30 p-1 rounded border border-slate-850/30">
                                            <span>Batch: {meta.dispensed_batch}</span>
                                            <span>Qty: {meta.dispensed_qty || '10 tabs'}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Finance Summary */}
                          {invoice && (
                            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-850/60 pt-2.5 font-mono">
                              <span>Invoice Status: <span className={invoice.status === 'paid' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{invoice.status.toUpperCase()}</span></span>
                              <span>Grand Total Bill: <span className="text-slate-350 font-bold">{(parseFloat(invoice.total_amount) + 350).toFixed(2)}/-</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
