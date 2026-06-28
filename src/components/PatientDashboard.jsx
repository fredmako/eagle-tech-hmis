import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { parsePatientContact } from '../notificationService';
import { 
  User, Clipboard, Activity, FlaskConical, Pill, FileText, 
  Calendar, DollarSign, Bed, ShieldCheck, Camera, LogOut, 
  Lock, Wallet, ArrowRightLeft, TrendingUp, HelpCircle, Copy, Check 
} from 'lucide-react';

export default function PatientDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState(null);
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'appointments', 'profile', 'wallet'
  
  // Timeline aggregated records
  const [visits, setVisits] = useState([]);
  const [triages, setTriages] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [wardLogs, setWardLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Profile Form States
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileInsurance, setProfileInsurance] = useState('');
  const [profileMemberId, setProfileMemberId] = useState('');
  const [profilePreferences, setProfilePreferences] = useState({ lab: true, pharmacy: true, billing: true });
  const [nextOfKinName, setNextOfKinName] = useState('');
  const [nextOfKinRelation, setNextOfKinRelation] = useState('');
  const [nextOfKinPhone, setNextOfKinPhone] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Eagle Wallet Blockchain states (saved in localStorage for persistence)
  const [walletAddress, setWalletAddress] = useState('');
  const [egcBalance, setEgcBalance] = useState(100.0);
  const [transactions, setTransactions] = useState([]);
  const [faucetCooldown, setFaucetCooldown] = useState(0); // cooldown in seconds
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [walletError, setWalletError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  // Inflation Simulator states
  const [inflationRate, setInflationRate] = useState(12); // default 12% annual inflation
  const [simService, setSimService] = useState('consultation'); // 'consultation', 'lab', 'prescription'

  // Blockchain Blocks Animation logs
  const [blocks, setBlocks] = useState([
    { number: 104821, hash: '0000ef83a9c3d4f10928e3b7b25cde18', prevHash: '00008fa9e3c2b8109d2f09a8e27c1a89', nonce: 49103, txns: 1 },
    { number: 104822, hash: '0000a39fbc8d31a784d129a08e7cfa18', prevHash: '0000ef83a9c3d4f10928e3b7b25cde18', nonce: 12450, txns: 2 }
  ]);

  const servicePrices = {
    consultation: { name: 'Doctor Consultation', cash: 1000, egc: 10 },
    lab: { name: 'Comprehensive Blood Panel', cash: 3500, egc: 35 },
    prescription: { name: 'Chronic Medication Package', cash: 2000, egc: 20 }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientTimeline(selectedPatientId);
      fetchAppointments(selectedPatientId);
      initializeWallet(selectedPatientId);
    } else {
      setPatientData(null);
      setVisits([]);
      setTriages([]);
      setConsultations([]);
      setOrders([]);
      setInvoices([]);
      setWardLogs([]);
      setAppointments([]);
    }
  }, [selectedPatientId]);

  // Handle wallet faucet cooldown timer
  useEffect(() => {
    if (faucetCooldown > 0) {
      const timer = setTimeout(() => setFaucetCooldown(faucetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [faucetCooldown]);

  // Blockchain Miner Block generator simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlocks(prev => {
        const lastBlock = prev[prev.length - 1];
        const newNum = lastBlock.number + 1;
        const newHash = '0000' + Math.random().toString(16).substring(2, 30);
        const newBlock = {
          number: newNum,
          hash: newHash,
          prevHash: lastBlock.hash,
          nonce: Math.floor(1000 + Math.random() * 90000),
          txns: Math.floor(Math.random() * 4) + 1
        };
        return [...prev.slice(-3), newBlock]; // keep last 4 blocks
      });
    }, 12000); // mine a block every 12 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await supabase.from('patients').select('*');
      const list = data || [];
      setPatients(list);

      if (list.length > 0) {
        if (user && user.role === 'patient') {
          const ptMatch = list.find(p => {
            const contact = parsePatientContact(p.phone);
            return contact.email.toLowerCase() === user.email.toLowerCase();
          });
          if (ptMatch) {
            setSelectedPatientId(ptMatch.id);
          } else {
            setSelectedPatientId(list[0].id);
          }
        } else {
          setSelectedPatientId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const loadPatientTimeline = async (patientId) => {
    try {
      const { data: pts } = await supabase.from('patients').select('*').eq('id', patientId);
      let patientName = '';
      if (pts && pts.length > 0) {
        const pt = pts[0];
        setPatientData(pt);
        patientName = pt.name;

        // Load profile updates state
        const contact = parsePatientContact(pt.phone);
        setProfileEmail(contact.email || '');
        setProfilePhone(contact.phone || '');
        setProfileInsurance(contact.insurance_provider || '');
        setProfileMemberId(contact.member_id || '');
        setProfilePreferences(contact.preferences || { lab: true, pharmacy: true, billing: true });
        setNextOfKinName(pt.next_of_kin_name || '');
        setNextOfKinRelation(pt.next_of_kin_relation || '');
        setNextOfKinPhone(pt.next_of_kin_phone || '');
      }

      // Fetch ward observations matching patient name
      if (patientName) {
        const { data: wlogs } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('action', 'Ward Observation Logged')
          .ilike('details', `%${patientName}%`)
          .order('created_at', { ascending: false });
        setWardLogs(wlogs || []);
      } else {
        setWardLogs([]);
      }

      const { data: vsts } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
      const activeVisits = vsts || [];
      setVisits(activeVisits);

      if (activeVisits.length > 0) {
        const visitIds = activeVisits.map(v => v.id);
        const { data: trgs } = await supabase.from('triages').select('*');
        const { data: cns } = await supabase.from('consultations').select('*');
        const { data: ords } = await supabase.from('orders').select('*');
        const { data: invs } = await supabase.from('invoices').select('*');

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

  const fetchAppointments = async (patientId) => {
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: true });
      setAppointments(data || []);
    } catch (e) {
      console.error("Error fetching appointments:", e);
    }
  };

  const initializeWallet = (patientId) => {
    const savedBalance = localStorage.getItem(`egc_balance_${patientId}`);
    const savedTxns = localStorage.getItem(`egc_txns_${patientId}`);
    
    // Generate static wallet address
    let hash = 0;
    for (let i = 0; i < patientId.length; i++) {
      hash = patientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hex = Math.abs(hash).toString(16).padEnd(8, 'a').substring(0, 8);
    const addr = `0x7a${hex}29fd9e48f7638706240dca1917f`;
    setWalletAddress(addr);

    if (savedBalance) {
      setEgcBalance(parseFloat(savedBalance));
    } else {
      setEgcBalance(100.0);
      localStorage.setItem(`egc_balance_${patientId}`, '100.0');
    }

    if (savedTxns) {
      setTransactions(JSON.parse(savedTxns));
    } else {
      const initialTxns = [
        {
          id: 'tx_init',
          date: new Date(Date.now() - 86400000 * 3).toLocaleString(),
          hash: '0x2b8fe3c9f28a7e0892a76f28198fcd35b89a',
          type: 'Signup Allocation',
          amount: '+100.00 EGC',
          status: 'Confirmed'
        }
      ];
      setTransactions(initialTxns);
      localStorage.setItem(`egc_txns_${patientId}`, JSON.stringify(initialTxns));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const updatedContact = {
        phone: profilePhone,
        email: profileEmail,
        preferences: profilePreferences,
        insurance_provider: profileInsurance,
        member_id: profileMemberId
      };

      const { error } = await supabase
        .from('patients')
        .update({
          phone: JSON.stringify(updatedContact),
          next_of_kin_name: nextOfKinName,
          next_of_kin_relation: nextOfKinRelation,
          next_of_kin_phone: nextOfKinPhone
        })
        .eq('id', patientData.id);

      if (error) throw error;
      setSuccessMsg('Profile and payment insurance provider details updated successfully!');
      loadPatientTimeline(patientData.id);
    } catch (err) {
      console.error('Profile update failed:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimFaucet = () => {
    if (faucetCooldown > 0) return;
    setFaucetCooldown(30); // 30 seconds cooldown for testing convenience

    const amountClaimed = 50.0;
    const newBal = egcBalance + amountClaimed;
    setEgcBalance(newBal);
    localStorage.setItem(`egc_balance_${patientData.id}`, newBal.toString());

    const newTx = {
      id: 'tx_' + Date.now(),
      date: new Date().toLocaleString(),
      hash: '0x' + Math.random().toString(16).substring(2, 34),
      type: 'Faucet Claim',
      amount: `+${amountClaimed.toFixed(2)} EGC`,
      status: 'Confirmed'
    };
    const updatedTxns = [newTx, ...transactions];
    setTransactions(updatedTxns);
    localStorage.setItem(`egc_txns_${patientData.id}`, JSON.stringify(updatedTxns));
    setWalletSuccess(`Successfully claimed ${amountClaimed} EGC! Coins credited to wallet.`);
    setTimeout(() => setWalletSuccess(''), 5000);
  };

  const handleSendCoins = (e) => {
    e.preventDefault();
    setWalletError('');
    setWalletSuccess('');

    const amt = parseFloat(sendAmount);
    if (!sendAddress.trim()) {
      setWalletError('Please provide a recipient wallet address.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setWalletError('Please enter a valid transfer amount.');
      return;
    }
    if (amt > egcBalance) {
      setWalletError('Decline: Insufficient Eagle Coin balance in wallet.');
      return;
    }

    const newBal = egcBalance - amt;
    setEgcBalance(newBal);
    localStorage.setItem(`egc_balance_${patientData.id}`, newBal.toString());

    const newTx = {
      id: 'tx_' + Date.now(),
      date: new Date().toLocaleString(),
      hash: '0x' + Math.random().toString(16).substring(2, 34),
      type: sendNotes.trim() ? `Transfer: ${sendNotes}` : 'Token Transfer Out',
      amount: `-${amt.toFixed(2)} EGC`,
      status: 'Confirmed'
    };

    const updatedTxns = [newTx, ...transactions];
    setTransactions(updatedTxns);
    localStorage.setItem(`egc_txns_${patientData.id}`, JSON.stringify(updatedTxns));
    setWalletSuccess(`Transferred ${amt.toFixed(2)} EGC to ${sendAddress.substring(0, 8)}... successfully!`);
    setSendAddress('');
    setSendAmount('');
    setSendNotes('');
    setTimeout(() => setWalletSuccess(''), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('egesa_health_token');
    localStorage.removeItem('egesa_health_user');
    sessionStorage.removeItem('egesa_health_token');
    sessionStorage.removeItem('egesa_health_active_user');
    window.location.href = '/';
  };

  const getAge = (dob) => {
    if (!dob) return 'N/A';
    return new Date().getFullYear() - new Date(dob).getFullYear();
  };

  // Solidity Smart Contract Text
  const solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleCoin
 * @dev Inflation-Resistant Healthcare Token peg-locked to medical service points.
 */
contract EagleCoin is ERC20, Ownable {
    // 1 EGC acts as a peg representing 1% of a basic clinical service point
    uint256 public constant CLINICAL_SERVICE_UNIT = 100 * 10**18;

    constructor() ERC20("Eagle Coin", "EGC") Ownable(msg.sender) {
        _mint(msg.sender, 10000000 * 10**18); // 10 Million EGC initial supply
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function purchaseService(uint256 amount) public {
        _burn(msg.sender, amount); // Burns tokens to secure deflationary stability
    }
}`;

  // Marketing Social Media Post Text
  const marketingPost = `🚀 Say Goodbye to Medical Inflation! 🩺

Introducing Eagle Coin (EGC) - the world's first inflation-proof healthcare token built directly into the Eagle Tech HMIS portal! 

With healthcare costs rising annually by over 12%, holding cash drains your medical coverage. Eagle Coin locks in your fees. Whether you buy a consultation or lab reports today, next month, or next year, the EGC price remains completely locked.

✅ 0% Inflation impact on medical care
✅ Secure, decentralised blockchain ledger
✅ Instant billing settlement and automatic receipt dispatch
✅ Claim free daily coins directly in your Patient Portal

Sign up now and protect your family's health security! 
👉 Visit: www.eagletechsolutions.tech 

#HealthTech #Web3 #Blockchain #EagleHMIS #Solidity #HealthcareRevolution`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPost(true);
      setTimeout(() => setCopiedPost(false), 2000);
    }
  };

  // Calculate inflation simulator details
  const simData = servicePrices[simService];
  const cashYr1 = simData.cash;
  const cashYr3 = Math.round(simData.cash * Math.pow(1 + inflationRate / 100, 2));
  const cashYr5 = Math.round(simData.cash * Math.pow(1 + inflationRate / 100, 4));
  const egcCost = simData.egc;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Patient Portal Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400 font-serif">
            EP
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-slate-100">Eagle Patient Portal</h1>
            <span className="text-2xs text-slate-500">Secure Healthcare Ledger Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {patientData && (
            <span className="hidden sm:inline-block text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
              Welcome back, <strong className="text-teal-400">{patientData.name}</strong>
            </span>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition cursor-pointer font-bold"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Patient Selection Banner (Visible to Staff only, Hidden for logged-in Patient role) */}
        {(!user || user.role !== 'patient') && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Clipboard size={18} className="text-teal-400" /> Electronic Patient Health Record (Staff View)
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
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-850 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2.5 px-4 font-bold text-xs shrink-0 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'timeline' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            <Clipboard size={14} /> Medical Records & Timeline
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-2.5 px-4 font-bold text-xs shrink-0 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'appointments' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            <Calendar size={14} /> My Appointments
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-4 font-bold text-xs shrink-0 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'profile' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            <User size={14} /> Profile & Insurance Details
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-2.5 px-4 font-bold text-xs shrink-0 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'wallet' ? 'border-purple-400 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            <Wallet size={14} /> Eagle Coin Wallet
          </button>
        </div>

        {!patientData ? (
          <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl py-24 text-center text-slate-500 text-sm">
            Please select a patient to display clinical records.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Demographics Sidebar */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 h-fit">
              <div className="text-center pb-4 border-b border-slate-850">
                <div className="h-16 w-16 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center font-bold text-teal-400 text-xl mx-auto shadow mb-3">
                  {patientData.name.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-slate-100 text-sm leading-tight">{patientData.name}</h3>
                <span className="text-xs text-teal-400 font-mono font-semibold">{patientData.facility_id_code}</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-2xs pb-1 border-b border-slate-850/40">Demographics</h4>
                <div className="grid grid-cols-2 gap-y-2.5">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Gender</span>
                    <span className="font-semibold text-slate-200 capitalize">{patientData.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Age</span>
                    <span className="font-semibold text-slate-200">{getAge(patientData.dob)} years</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">DOB</span>
                    <span className="font-semibold text-slate-200">{patientData.dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Phone</span>
                    <span className="font-semibold text-slate-200">{parsePatientContact(patientData.phone).phone || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[9px]">Email Address</span>
                    <span className="font-semibold text-slate-200 truncate block">{parsePatientContact(patientData.phone).email || 'N/A'}</span>
                  </div>
                  
                  {/* Insurance Provider badge */}
                  <div className="col-span-2 pt-1 border-t border-slate-850/60 mt-1">
                    <span className="text-slate-500 block text-[9px]">Active Coverage</span>
                    <span className="font-bold text-teal-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={13} /> {parsePatientContact(patientData.phone).insurance_provider?.toUpperCase() || 'CASH BASIS'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 text-xs pt-2">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-2xs pb-1 border-b border-slate-850/40">Next of Kin</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Name</span>
                    <span className="font-semibold text-slate-200">{patientData.next_of_kin_name || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Relation</span>
                      <span className="font-semibold text-slate-200 capitalize">{patientData.next_of_kin_relation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Phone</span>
                      <span className="font-semibold text-slate-200">{patientData.next_of_kin_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Tabs Details View */}
            <div className="lg:col-span-3 space-y-6">

              {/* TAB 1: CLINICAL TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Quick Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Total Visits</span>
                        <span className="text-xl font-bold text-slate-200">{visits.length}</span>
                      </div>
                      <Calendar size={18} className="text-slate-600" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Diagnoses</span>
                        <span className="text-xl font-bold text-slate-200">{consultations.length}</span>
                      </div>
                      <FileText size={18} className="text-slate-600" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Lab Tests</span>
                        <span className="text-xl font-bold text-slate-200">{orders.filter(o => o.type === 'lab').length}</span>
                      </div>
                      <FlaskConical size={18} className="text-slate-600" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Outstanding Invoices</span>
                        <span className="text-xl font-bold text-teal-400 font-mono">
                          {invoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)}/-
                        </span>
                      </div>
                      <DollarSign size={18} className="text-slate-600" />
                    </div>
                  </div>

                  {/* TIMELINE */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2">Clinical Care Timeline</h3>

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
                              <div className="absolute left-[5px] top-1.5 h-[16px] w-[16px] rounded-full bg-slate-900 border-2 border-teal-500 group-hover:bg-teal-500 transition-colors shadow shadow-teal-500/10" />

                              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3.5">
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <span className="text-[9px] text-slate-500 font-mono block">{new Date(visit.created_at).toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-200">Outpatient Visit</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                    visit.status === 'completed' ? 'text-green-400 bg-green-950/20 border-green-500/20' : 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20'
                                  }`}>{visit.status}</span>
                                </div>

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
                                      <strong>Chief Complaint</strong>: {triage.chief_complaint}
                                    </p>
                                  </div>
                                )}

                                {consult && (
                                  <div className="bg-slate-900/40 border border-slate-850/60 p-3 rounded-lg text-xs space-y-2">
                                    <span className="font-semibold text-slate-350 block flex items-center gap-1.5"><FileText size={12} className="text-teal-400" /> Clinician Consultation SOAP</span>
                                    <div className="space-y-1 text-slate-400">
                                      <p><span className="text-slate-500 font-medium">Subjective History:</span> {consult.history}</p>
                                      <p><span className="text-slate-500 font-medium">Objective Exam:</span> {consult.examination}</p>
                                    </div>
                                    <div className="border-t border-slate-850/45 pt-1.5 flex justify-between items-center text-2xs">
                                      <span>MOH ICD-10 Diagnosis:</span>
                                      <span className="bg-teal-500/5 border border-teal-500/20 text-teal-400 font-bold px-2 py-0.5 rounded">{consult.diagnosis_icd10}</span>
                                    </div>
                                  </div>
                                )}

                                {vOrders.length > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
                                                  o.status === 'released' || o.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/15' :
                                                  o.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                                                  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15'
                                                }`}>{o.status || 'ordered'}</span>
                                              </div>
                                              {(o.status === 'released' || o.status === 'completed') && (
                                                <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850/65 mt-1 font-sans">
                                                  <p className="text-2xs text-slate-200 font-medium">Result: {meta.values || o.results}</p>
                                                  {meta.verifier && <p className="text-[8px] text-teal-400 mt-0.5">Verified by: {meta.verifier}</p>}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {vOrders.some(o => o.type === 'prescription') && (
                                      <div className="bg-slate-900/20 border border-slate-850 p-2.5 rounded-lg space-y-1.5">
                                        <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] flex items-center gap-1"><Pill size={10} /> Prescriptions</span>
                                        {vOrders.filter(o => o.type === 'prescription').map(o => (
                                          <div key={o.id} className="border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0 text-[11px]">
                                            <span className="font-semibold text-slate-350 block">{o.item_name}</span>
                                            <span className="text-slate-500 text-2xs">{o.instructions}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {invoice && (
                                  <div className="flex justify-between items-center text-2xs text-slate-500 border-t border-slate-850/60 pt-2.5 font-mono">
                                    <span>Invoice Status: <span className={invoice.status === 'paid' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{invoice.status.toUpperCase()}</span></span>
                                    <span>Total Settled Bill: <span className="text-slate-350 font-bold">{parseFloat(invoice.amount_paid).toFixed(2)}/-</span></span>
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
              )}

              {/* TAB 2: APPOINTMENTS */}
              {activeTab === 'appointments' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">My Appointment Bookings</h3>
                  {appointments.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-12">
                      No future appointments scheduled at our facility. You can book an appointment from the public facility homepage.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px]">
                            <th className="p-3">Appointment ID</th>
                            <th className="p-3">Preferred Date</th>
                            <th className="p-3">Time Slot</th>
                            <th className="p-3">Doctor / Clinician</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {appointments.map(app => (
                            <tr key={app.id} className="hover:bg-slate-950/20">
                              <td className="p-3 font-mono font-bold text-teal-400">{app.id}</td>
                              <td className="p-3">{app.date}</td>
                              <td className="p-3 font-mono">{app.time_slot}</td>
                              <td className="p-3">Dr. Specialist Assistant</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  app.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                  app.status === 'booked' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                  'bg-slate-950 text-slate-500 border border-slate-850'
                                }`}>
                                  {app.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INSURANCE & PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6 animate-fadeIn">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">Manage Patient Details & Coverage</h3>
                  
                  {successMsg && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg animate-fadeIn">{successMsg}</div>}
                  {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg animate-fadeIn">{errorMsg}</div>}

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name (Locked)</label>
                        <input
                          type="text"
                          value={patientData.name}
                          disabled
                          className="w-full bg-slate-950/50 border border-slate-850 text-slate-500 text-xs rounded-lg p-2.5 focus:outline-none cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">DOB / Age (Locked)</label>
                        <input
                          type="text"
                          value={`${patientData.dob} (${getAge(patientData.dob)} Years)`}
                          disabled
                          className="w-full bg-slate-950/50 border border-slate-850 text-slate-500 text-xs rounded-lg p-2.5 focus:outline-none cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Phone Number</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-4 space-y-4">
                      <h4 className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Payment & Insurance details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary Insurance Provider</label>
                          <select
                            value={profileInsurance}
                            onChange={(e) => setProfileInsurance(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          >
                            <option value="">Cash Basis (No Corporate Cover)</option>
                            <option value="nhif">National SHA / NHIF</option>
                            <option value="aar">AAR Insurance</option>
                            <option value="jubilee">Jubilee Corporate Insurance</option>
                            <option value="britam">Britam Health Cover</option>
                            <option value="apa">APA Insurance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Insurance Member ID / Policy No</label>
                          <input
                            type="text"
                            placeholder="e.g. AAR-993-294-10"
                            value={profileMemberId}
                            onChange={(e) => setProfileMemberId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-4 space-y-4">
                      <h4 className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Next of Kin Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">FullName</label>
                          <input
                            type="text"
                            value={nextOfKinName}
                            onChange={(e) => setNextOfKinName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Relationship</label>
                          <input
                            type="text"
                            placeholder="e.g. Spouse / Brother"
                            value={nextOfKinRelation}
                            onChange={(e) => setNextOfKinRelation(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Phone</label>
                          <input
                            type="text"
                            value={nextOfKinPhone}
                            onChange={(e) => setNextOfKinPhone(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-teal-400 hover:bg-teal-350 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving Changes...' : 'Save Profile & Insurance Coverage'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: EAGLE WALLET BLOCKCHAIN */}
              {activeTab === 'wallet' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Wallet balances grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-linear-to-br from-purple-900/30 to-indigo-950/20 border border-purple-500/20 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-purple-500/5">
                      <div className="absolute top-2 right-2 p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                        <Wallet size={16} />
                      </div>
                      <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-white font-serif">{egcBalance.toFixed(2)}</span>
                        <span className="text-xs text-purple-400 font-bold">EGC</span>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-2 block leading-none font-mono truncate">{walletAddress}</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Inflation Shield Status</span>
                        <span className="text-base font-bold text-green-400 mt-2 flex items-center gap-1.5"><ShieldCheck size={18} /> Deflationary Locked</span>
                        <p className="text-2xs text-slate-400 mt-1">EGC peg shields you from clinical price increases. Medical fees are locked to static coin values.</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                      <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block">Faucet Reward (Marketing Bonus)</span>
                      <div className="mt-2">
                        <button
                          onClick={handleClaimFaucet}
                          disabled={faucetCooldown > 0}
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xs py-2 px-4 rounded-xl shadow-lg shadow-purple-500/10 transition disabled:opacity-50 cursor-pointer"
                        >
                          {faucetCooldown > 0 ? `Claim Cooldown (${faucetCooldown}s)` : '🎁 Claim +50.0 EGC Free'}
                        </button>
                        <span className="text-[8.5px] text-slate-550 block text-center mt-1.5">Promotional reward to test transactions and inflation protection.</span>
                      </div>
                    </div>
                  </div>

                  {walletSuccess && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg animate-fadeIn">{walletSuccess}</div>}
                  {walletError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg animate-fadeIn">{walletError}</div>}

                  {/* Transfer Coins & Transaction Logs */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5"><ArrowRightLeft size={14} className="text-purple-400" /> Send EGC Tokens</h4>
                      <form onSubmit={handleSendCoins} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Recipient Wallet Address</label>
                          <input
                            type="text"
                            placeholder="0x7a... or hospital master contract"
                            value={sendAddress}
                            onChange={(e) => setSendAddress(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-purple-500/50"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Amount (EGC)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={sendAmount}
                              onChange={(e) => setSendAmount(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-purple-500/50 font-mono"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Reference Memo</label>
                            <input
                              type="text"
                              placeholder="e.g. Lab Bill"
                              value={sendNotes}
                              onChange={(e) => setSendNotes(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-purple-500/50"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-200 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                        >
                          Transfer Coins
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5"><Clipboard size={14} className="text-purple-400" /> Wallet Transaction Logs</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-550 uppercase tracking-wider text-[8px]">
                              <th className="pb-2">Tx Hash</th>
                              <th className="pb-2">Details</th>
                              <th className="pb-2">Amount</th>
                              <th className="pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-350 font-sans">
                            {transactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-950/20">
                                <td className="py-2 font-mono text-slate-500">{tx.hash.substring(0, 10)}...</td>
                                <td className="py-2">{tx.type}</td>
                                <td className={`py-2 font-mono font-bold ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-purple-400'}`}>{tx.amount}</td>
                                <td className="py-2"><span className="px-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[8px] font-bold">Confirmed</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* INFLATION SIMULATOR */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <TrendingUp className="text-green-400" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Eagle Coin Inflation Deflector</h4>
                        <p className="text-2xs text-slate-500 leading-normal">Compare cash inflation increases vs locked on-chain coin redemption values.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-4 space-y-4 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Selected Medical Service</label>
                          <select
                            value={simService}
                            onChange={(e) => setSimService(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-xs rounded-lg p-2.5 focus:outline-none focus:border-green-500/50"
                          >
                            <option value="consultation">Doctor Consultation</option>
                            <option value="lab">Comprehensive Blood Panel</option>
                            <option value="prescription">Medication Package</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
                            <span>Annual Cash Inflation</span>
                            <span className="text-green-400">{inflationRate}%</span>
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="30"
                            value={inflationRate}
                            onChange={(e) => setInflationRate(Number(e.target.value))}
                            className="w-full accent-green-400 bg-slate-950 h-1 rounded"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-8 bg-slate-950/80 border border-slate-850 p-4 rounded-xl">
                        <div className="grid grid-cols-4 gap-4 text-center text-xs">
                          <div className="text-left font-bold text-slate-500 text-[9px] uppercase tracking-wider self-center">Payment System</div>
                          <div className="font-bold text-slate-400">Year 1 Cost</div>
                          <div className="font-bold text-slate-400">Year 3 (Est)</div>
                          <div className="font-bold text-slate-400">Year 5 (Est)</div>

                          <div className="text-left font-bold text-slate-300">Standard Cash</div>
                          <div className="font-mono text-slate-400">KES {cashYr1}</div>
                          <div className="font-mono text-slate-400">KES {cashYr3}</div>
                          <div className="font-mono text-red-400">KES {cashYr5}</div>

                          <div className="text-left font-bold text-purple-400">Eagle Coin (EGC)</div>
                          <div className="font-mono text-purple-400 font-bold">{egcCost} EGC</div>
                          <div className="font-mono text-purple-400 font-bold">{egcCost} EGC</div>
                          <div className="font-mono text-purple-400 font-bold">{egcCost} EGC</div>
                        </div>

                        <div className="mt-4 p-2 bg-green-500/10 border border-green-500/20 text-green-400 text-2xs text-center rounded font-sans">
                          🎉 Locking service with Eagle Coin saves you <strong>KES {cashYr5 - cashYr1}</strong> (Cash cost grows by <strong>{((cashYr5 - cashYr1)/cashYr1*100).toFixed(0)}%</strong> while EGC cost stays locked!)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COIN REGISTRATION / DEPLOYMENT GUIDE */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5"><Lock size={14} className="text-purple-400" /> Solidity ERC-20 Smart Contract</h4>
                        <button
                          onClick={() => copyToClipboard(solidityCode, 'code')}
                          className="text-2xs text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded hover:bg-teal-500/25 transition cursor-pointer flex items-center gap-1"
                        >
                          {copiedCode ? <Check size={10} /> : <Copy size={10} />}
                          {copiedCode ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-2xs text-slate-400 leading-relaxed font-sans">
                        You can deploy and register this smart contract code to testnets or L2 chains (such as Sepolia, Arbitrum, or Base) using Remix IDE.
                      </p>
                      <pre className="w-full bg-slate-950 border border-slate-850 p-3 rounded-lg text-[9px] font-mono text-purple-300 max-h-[220px] overflow-y-auto overflow-x-auto leading-normal">
                        {solidityCode}
                      </pre>
                      <div className="text-[9.5px] text-slate-500 leading-normal space-y-1 font-sans">
                        <strong>Deployment Guide:</strong>
                        <ol className="list-decimal pl-4 space-y-0.5">
                          <li>Copy the code above and open <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">remix.ethereum.org</a>.</li>
                          <li>Create a file named <code>EagleCoin.sol</code>, paste, and compile.</li>
                          <li>Deploy using MetaMask connected to Arbitrum/Sepolia Network.</li>
                          <li>Add the contract address to your HMIS portal settings.</li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5"><Activity size={14} className="text-teal-400" /> Social Marketing Post</h4>
                          <button
                            onClick={() => copyToClipboard(marketingPost, 'post')}
                            className="text-2xs text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded hover:bg-teal-500/25 transition cursor-pointer flex items-center gap-1"
                          >
                            {copiedPost ? <Check size={10} /> : <Copy size={10} />}
                            {copiedPost ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-2xs text-slate-400 leading-relaxed font-sans mt-2">
                          Copy this ready-to-share social media post to promote Eagle Coin and get patient leads.
                        </p>
                        <blockquote className="w-full bg-slate-950 border border-slate-850 p-3 rounded-lg text-[9.5px] font-sans text-slate-400 italic max-h-[220px] overflow-y-auto leading-normal whitespace-pre-wrap">
                          {marketingPost}
                        </blockquote>
                      </div>

                      {/* Blockchain block logs visual animation */}
                      <div className="border-t border-slate-850 pt-3">
                        <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">Live Blockchain Miner State</span>
                        <div className="grid grid-cols-2 gap-2">
                          {blocks.map(b => (
                            <div key={b.number} className="bg-slate-950 p-2 rounded border border-slate-850 text-[8px] font-mono leading-normal space-y-0.5">
                              <span className="text-purple-400 block font-bold">Block #{b.number}</span>
                              <span className="text-slate-500 block truncate">Hash: {b.hash}</span>
                              <span className="text-slate-500 block">Nonce: {b.nonce}</span>
                              <span className="text-green-400 block font-bold">✓ Mined ({b.txns} Txns)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
