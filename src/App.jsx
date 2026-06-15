import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './context/AuthContext';
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
import SaaSOnboarding from './components/SaaSOnboarding';
import LandingPage from './components/LandingPage';
import Preferences from './components/Preferences';
import translations from './translations';

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
  Bed,
  ShieldCheck,
  Sliders
} from 'lucide-react';

export default function App() {
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedPatient, setPreselectedPatient] = useState(null);
  const [publicView, setPublicView] = useState('landing'); // 'landing', 'login', 'signup'

  const [theme, setTheme] = useState(() => localStorage.getItem('egesa_theme') || 'slate');
  const [lang, setLang] = useState(() => localStorage.getItem('egesa_lang') || 'en');
  const [font, setFont] = useState(() => localStorage.getItem('egesa_font') || 'sans');

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('egesa_theme', newTheme);
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('egesa_lang', newLang);
  };

  const handleFontChange = (newFont) => {
    setFont(newFont);
    localStorage.setItem('egesa_font', newFont);
  };

  const t = (key) => {
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    return (translations['en'] && translations['en'][key]) || key;
  };

  const renderLogo = (logoUrl) => {
    if (!logoUrl) {
      return (
        <img 
          src="/logo.png" 
          alt="Eagle Tech Logo" 
          className="w-8 h-8 rounded-lg object-contain"
        />
      );
    }
    
    if (logoUrl.startsWith('preset:')) {
      const presetKey = logoUrl.split(':')[1];
      if (presetKey === 'shield') {
        return (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-1.5 rounded-lg">
            <ShieldCheck size={18} fill="currentColor" />
          </div>
        );
      }
      if (presetKey === 'cross') {
        return (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-1.5 rounded-lg">
            <Activity size={18} />
          </div>
        );
      }
      return (
        <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 p-1.5 rounded-lg">
          <Heart size={18} fill="currentColor" />
        </div>
      );
    }
    
    return (
      <img 
        src={logoUrl} 
        alt="Facility Logo" 
        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60';
        }}
      />
    );
  };

  const handleLoginSuccess = (userData) => {
    setActiveTab('dashboard');
  };

  const handleSignOut = () => {
    logout();
  };

  const handleNavigateToQueue = (patient) => {
    setPreselectedPatient(patient);
    setActiveTab('queue');
  };

  const clearPreselected = () => {
    setPreselectedPatient(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-teal-500/10">
            <Activity size={32} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">EAGLE TECH</h1>
            <p className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">HMIS SOFTWARE SOLUTIONS</p>
          </div>
        </div>
        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    const publicContent = (() => {
      if (publicView === 'signup') {
        return <SaaSOnboarding onBackToLogin={() => setPublicView('landing')} />;
      }
      if (publicView === 'login') {
        return (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onNavigateToSaaS={() => setPublicView('signup')} 
            onNavigateToLanding={() => setPublicView('landing')}
          />
        );
      }
      return (
        <LandingPage 
          onNavigateToLogin={() => setPublicView('login')} 
          onNavigateToSignup={() => setPublicView('signup')} 
        />
      );
    })();

    return (
      <div className={`theme-${theme} font-${font} min-h-screen bg-slate-950 text-slate-100`}>
        {publicContent}
      </div>
    );
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
    { id: 'admin', label: 'Admin Settings', icon: Settings, roles: ['admin'] },
    { id: 'settings', label: 'System Preferences', icon: Sliders, roles: ['*'] }
  ];

  // Filter menu based on user role
  const visibleMenuItems = menuItems.filter(
    (item) => item.roles.includes('*') || item.roles.includes(user.role)
  );

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden theme-${theme} font-${font}`}>
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand logo header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
          {renderLogo(user.facility_logo)}
          <div className="truncate flex-1">
            <span className="font-bold tracking-wide text-xs text-white block uppercase truncate leading-tight">
              {user.facility_name || 'Eagle Tech Hospital Management Systems'}
            </span>
            <span className="text-[9px] text-slate-505 font-bold uppercase tracking-wider block mt-0.5 truncate leading-none">
              {t('poweredBy')}
            </span>
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
                <span>{t(item.id)}</span>
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
            <span>{t('signOut')}</span>
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
          {activeTab === 'settings' && (
            <Preferences
              currentTheme={theme}
              onChangeTheme={handleThemeChange}
              currentLang={lang}
              onChangeLang={handleLangChange}
              currentFont={font}
              onChangeFont={handleFontChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}
