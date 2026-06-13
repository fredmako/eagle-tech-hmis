import React, { useState, useEffect } from 'react';
import { supabase } from './appwriteClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import Queue from './components/Queue';
import Triage from './components/Triage';
import Consultation from './components/Consultation';
import Orders from './components/Orders';
import Pharmacy from './components/Pharmacy';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Admin from './components/Admin';
import PatientDashboard from './components/PatientDashboard';
import Ward from './components/Ward';

import {
  LayoutDashboard,
  UserPlus,
  Layers,
  Heart,
  Stethoscope,
  FlaskConical,
  Pill,
  DollarSign,
  FileSpreadsheet,
  Settings,
  LogOut,
  Activity,
  Clipboard,
  Bed
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedPatient, setPreselectedPatient] = useState(null);

  useEffect(() => {
    const checkActiveSession = async () => {
      // 1. Try quick local session cache first
      const loggedUser = sessionStorage.getItem('egesa_health_active_user');
      if (loggedUser) {
        setUser(JSON.parse(loggedUser));
        return;
      }

      // 2. Fall back to live server check (useful for OAuth redirects)
      try {
        const { data, error } = await supabase.auth.getUser();
        if (data && data.user) {
          const { data: profiles } = await supabase.from('profiles').select('*').eq('id', data.user.id);
          const profile = profiles && profiles[0];

          const finalProfile = profile || {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Google User',
            role: 'admin', // Default access role
            facility_id: 'f1'
          };

          // If the profile document doesn't exist yet (new OAuth user), provision it
          if (!profile) {
            await supabase.from('profiles').insert({
              id: finalProfile.id,
              full_name: finalProfile.full_name,
              role: finalProfile.role,
              facility_id: finalProfile.facility_id
            });
          }

          const loggedUserObj = {
            id: data.user.id,
            full_name: finalProfile.full_name,
            role: finalProfile.role,
            facility_id: finalProfile.facility_id,
            facility_name: 'Egesa Medical Clinic'
          };

          sessionStorage.setItem('egesa_health_active_user', JSON.stringify(loggedUserObj));
          setUser(loggedUserObj);
        }
      } catch (err) {
        console.error('Session retrieval failed:', err);
      }
    };

    checkActiveSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('dashboard');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('egesa_health_active_user');
  };

  const handleNavigateToQueue = (patient) => {
    setPreselectedPatient(patient);
    setActiveTab('queue');
  };

  const clearPreselected = () => {
    setPreselectedPatient(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation options
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['*'] },
    { id: 'registration', label: 'Patient Registration', icon: UserPlus, roles: ['receptionist', 'admin'] },
    { id: 'queue', label: 'Queue Management', icon: Layers, roles: ['receptionist', 'nurse', 'clinician', 'admin'] },
    { id: 'triage', label: 'Triage Desk', icon: Heart, roles: ['nurse', 'admin'] },
    { id: 'consultation', label: 'OPD Consultation', icon: Stethoscope, roles: ['clinician', 'admin'] },
    { id: 'orders', label: 'Laboratory Desk', icon: FlaskConical, roles: ['lab_tech', 'admin'] },
    { id: 'pharmacy', label: 'Pharmacy Desk', icon: Pill, roles: ['pharmacist', 'admin'] },
    { id: 'billing', label: 'Cashier / Billing', icon: DollarSign, roles: ['cashier', 'admin'] },
    { id: 'reports', label: 'MOH Reports', icon: FileSpreadsheet, roles: ['admin'] },
    { id: 'patient_dashboard', label: 'Patient Dashboard', icon: Clipboard, roles: ['*'] },
    { id: 'ward', label: 'Inpatient Ward', icon: Bed, roles: ['nurse', 'clinician', 'admin'] },
    { id: 'admin', label: 'Admin Settings', icon: Settings, roles: ['admin'] }
  ];

  // Filter menu based on user role
  const visibleMenuItems = menuItems.filter(
    (item) => item.roles.includes('*') || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand logo header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <div className="bg-teal-500 text-slate-950 p-1.5 rounded-lg shadow-md shadow-teal-500/10">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="font-bold tracking-wide text-sm text-white block uppercase">Egesa Health</span>
            <span className="text-[10px] text-teal-400 font-semibold tracking-wide uppercase block">MOH register portal</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10'
                    : 'text-slate-450 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Active User Details */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 text-xs shadow">
              {user.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-bold text-slate-200 block truncate leading-snug">{user.full_name}</span>
              <span className="text-[10px] text-teal-500 font-semibold uppercase block leading-none">{user.role}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-red-500/20 bg-slate-900/50 hover:bg-red-500/5 hover:text-red-400 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Workspace view area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && <Dashboard user={user} onNavigate={setActiveTab} />}
          {activeTab === 'registration' && <Registration user={user} onNavigateToQueue={handleNavigateToQueue} />}
          {activeTab === 'queue' && (
            <Queue
              preselectedPatient={preselectedPatient}
              user={user}
              clearPreselected={clearPreselected}
            />
          )}
          {activeTab === 'triage' && <Triage user={user} onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'consultation' && <Consultation user={user} onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'orders' && <Orders user={user} onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'pharmacy' && <Pharmacy user={user} onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'billing' && <Billing user={user} onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'reports' && <Reports user={user} />}
          {activeTab === 'patient_dashboard' && <PatientDashboard />}
          {activeTab === 'ward' && <Ward user={user} />}
          {activeTab === 'admin' && <Admin user={user} />}
        </div>
      </main>
    </div>
  );
}
