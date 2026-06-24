import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Settings, 
  Globe, 
  Palette, 
  Type, 
  CheckCircle, 
  User, 
  Lock, 
  Phone, 
  Shield, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Building,
  Key,
  Sun,
  Moon,
  Sidebar,
  PanelTop,
  Eye
} from 'lucide-react';

export default function Preferences({ 
  currentTheme, 
  onChangeTheme, 
  currentThemeMode,
  onChangeThemeMode,
  currentMenuLayout,
  onChangeMenuLayout,
  currentLang, 
  onChangeLang, 
  currentFont, 
  onChangeFont,
  brightness,
  onChangeBrightness,
  nightVision,
  onChangeNightVision,
  user,
  setUser
}) {
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dept, setDept] = useState(user?.department || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.name || '');
      setPhone(user.phone || '');
      setDept(user.department || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Full Name is required.' });
      return;
    }
    setLoadingProfile(true);
    setMessage({ type: '', text: '' });
    try {
      let query = supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          department: dept
        })
        .eq('id', user.id);
      
      if (user.facility_id) {
        query = query.eq('facility_id', user.facility_id);
      } else {
        query = query.is('facility_id', null);
      }

      const { error } = await query;
      if (error) throw error;

      // Update session context user object
      const updatedUser = {
        ...user,
        full_name: fullName,
        name: fullName,
        phone: phone,
        department: dept
      };
      
      setUser(updatedUser);
      sessionStorage.setItem('egesa_health_active_user', JSON.stringify(updatedUser));

      // Also log audit trail
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Profile Updated',
        details: `Updated own profile details: Name to ${fullName}, Phone to ${phone}, Dept to ${dept}.`
      });

      setMessage({ type: 'success', text: 'Profile details updated successfully!' });
    } catch (err) {
      console.error("Failed to update profile:", err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile details.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setMessage({ type: 'error', text: 'Password cannot be empty.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    
    setLoadingPassword(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Also log audit trail
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Password Changed',
        details: 'Successfully updated account password.'
      });

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error("Failed to update password:", err);
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const themes = [
    { id: 'teal', name: 'Teal (Slate)', desc: 'Teal clinical accents.' },
    { id: 'blue', name: 'Midnight Navy', desc: 'Deep blue dashboard layout.' },
    { id: 'green', name: 'Emerald', desc: 'Clinical green theme.' },
    { id: 'purple', name: 'Royal Purple', desc: 'Deep purple accents.' },
    { id: 'amber', name: 'Warm Amber', desc: 'Warm clinical amber accents.' }
  ];
  
  const languages = [
    { id: 'en', name: 'English', desc: 'Default system translations' },
    { id: 'sw', name: 'Kiswahili (Swahili)', desc: 'Toleo la lugha ya Kiswahili' },
    { id: 'fr', name: 'Français (French)', desc: 'Version en langue française' }
  ];
  
  const fonts = [
    { id: 'sans', name: 'DM Sans (Default)', desc: 'Design system body typeface' },
    { id: 'outfit', name: 'Outfit', desc: 'Elegant rounded geometric sans' },
    { id: 'roboto', name: 'Roboto', desc: 'Material design font scale' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-800/60 pb-3 flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
          <Settings size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Account Preferences & Profile</h2>
          <p className="text-[10.5px] text-slate-500 font-medium">Manage your personal profile details, security credentials, and workspace preferences</p>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`p-3.5 rounded-xl border text-xs flex gap-2.5 ${
          message.type === 'success' 
            ? 'bg-green-500/5 border-green-500/20 text-green-400' 
            : 'bg-red-500/5 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Profile & Security (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Card */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-slate-850">
              <User size={14} className="text-teal-400" /> Personal Profile Details
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                      <User size={12} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Arthur Conan"
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-[8px] text-slate-550">(Read-Only)</span>
                  </label>
                  <div className="flex bg-slate-950/40 border border-slate-850 rounded-lg overflow-hidden select-none opacity-60">
                    <span className="bg-slate-900/40 px-3 py-2 text-slate-550 border-r border-slate-850 flex items-center">
                      <Lock size={12} />
                    </span>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Contact Phone
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                      <Phone size={12} />
                    </span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +254712345678"
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                      <Building size={12} />
                    </span>
                    <input
                      type="text"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="e.g. Outpatient Clinic"
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assigned Role <span className="text-[8px] text-slate-550">(Clearance Level)</span>
                  </label>
                  <div className="bg-slate-950/40 border border-slate-850 rounded-lg p-2.5 flex items-center gap-2 select-none">
                    <Shield size={13} className="text-teal-500 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {user?.role ? user.role.split(',').join(' • ') : 'Staff Member'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-955 font-black text-xs py-2 px-5 rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  {loadingProfile ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} /> Save Profile Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password Card */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-slate-850">
              <Key size={14} className="text-teal-400" /> Account Password & Security
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                      <Lock size={12} />
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                      <Lock size={12} />
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-955 font-black text-xs py-2 px-5 rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  {loadingPassword ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Column 3: Workspace Preferences (1/3 width) */}
        <div className="space-y-6">
          
          {/* Color Mode */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Sun size={14} className="text-teal-400" /> Color Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'light', name: 'Light Mode', icon: Sun },
                { id: 'dark', name: 'Dark Mode', icon: Moon }
              ].map((m) => {
                const IconComponent = m.icon;
                return (
                  <button 
                    key={m.id} 
                    type="button"
                    onClick={() => onChangeThemeMode(m.id)} 
                    className={`flex-1 p-3 rounded-lg border cursor-pointer transition flex flex-col items-center gap-2 ${
                      currentThemeMode === m.id 
                        ? 'border-teal-500 bg-teal-500/5 text-slate-100' 
                        : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <IconComponent size={16} className={currentThemeMode === m.id ? 'text-teal-400' : 'text-slate-400'} />
                    <span className="text-xs font-bold">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace Theme */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Palette size={14} className="text-teal-400" /> Workspace Theme
            </h3>
            <div className="space-y-2.5">
              {themes.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => onChangeTheme(t.id)} 
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    currentTheme === t.id 
                      ? 'border-teal-500 bg-teal-500/5 text-slate-100' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{t.name}</span>
                    <span className="text-[9.5px] text-slate-500 mt-0.5 block">{t.desc}</span>
                  </div>
                  {currentTheme === t.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Layout */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Sidebar size={14} className="text-teal-400" /> Navigation Layout
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'sidebar', name: 'Left Sidebar', icon: Sidebar },
                { id: 'topbar', name: 'Top Navigation', icon: PanelTop }
              ].map((layout) => {
                const IconComponent = layout.icon;
                return (
                  <button 
                    key={layout.id} 
                    type="button"
                    onClick={() => onChangeMenuLayout(layout.id)} 
                    className={`flex-1 p-3 rounded-lg border cursor-pointer transition flex flex-col items-center gap-2 ${
                      currentMenuLayout === layout.id 
                        ? 'border-teal-500 bg-teal-500/5 text-slate-100' 
                        : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <IconComponent size={16} className={currentMenuLayout === layout.id ? 'text-teal-400' : 'text-slate-400'} />
                    <span className="text-xs font-bold">{layout.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screen & Visual Comfort */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Eye size={14} className="text-teal-400" /> Screen & Visual Comfort
            </h3>
            <div className="space-y-4">
              {/* Brightness Adjustment */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-450">Display Brightness</span>
                  <span className="font-mono text-teal-400 font-bold">{brightness}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500"><Sun size={12} /></span>
                  <input 
                    type="range" 
                    min="50" 
                    max="150" 
                    value={brightness} 
                    onChange={(e) => onChangeBrightness(Number(e.target.value))}
                    className="flex-1 accent-teal-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer border border-slate-800"
                  />
                  <span className="text-slate-400"><Sun size={15} /></span>
                </div>
              </div>

              {/* Night Vision Toggle */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-850/60">
                <div>
                  <span className="text-xs font-bold text-slate-450 block">Night Vision Mode</span>
                  <span className="text-[9px] text-slate-500 block">Green phosphor tint to reduce eye strain on night shifts</span>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeNightVision(!nightVision)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    nightVision 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-pulse' 
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Eye size={13} />
                  {nightVision ? 'Active' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* System Language */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Globe size={14} className="text-teal-400" /> Display Language
            </h3>
            <div className="space-y-2.5">
              {languages.map((l) => (
                <div 
                  key={l.id} 
                  onClick={() => onChangeLang(l.id)} 
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    currentLang === l.id 
                      ? 'border-teal-500 bg-teal-500/5 text-slate-100' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{l.name}</span>
                    <span className="text-[9.5px] text-slate-500 mt-0.5 block">{l.desc}</span>
                  </div>
                  {currentLang === l.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Typography Font */}
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-850">
              <Type size={14} className="text-teal-400" /> Typography Font
            </h3>
            <div className="space-y-2.5">
              {fonts.map((f) => (
                <div 
                  key={f.id} 
                  onClick={() => onChangeFont(f.id)} 
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    currentFont === f.id 
                      ? 'border-teal-500 bg-teal-500/5 text-slate-100' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{f.name}</span>
                    <span className="text-[9.5px] text-slate-500 mt-0.5 block">{f.desc}</span>
                  </div>
                  {currentFont === f.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
