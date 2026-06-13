import React from 'react';
import { Settings, Globe, Palette, Type, CheckCircle } from 'lucide-react';

export default function Preferences({ 
  currentTheme, 
  onChangeTheme, 
  currentLang, 
  onChangeLang, 
  currentFont, 
  onChangeFont 
}) {
  
  const themes = [
    { id: 'slate', name: 'Dark Slate (Default)', desc: 'Premium dark slate clinical theme.' },
    { id: 'navy', name: 'Midnight Navy', desc: 'Deep blue dashboard layout.' },
    { id: 'emerald', name: 'Light Emerald', desc: 'Clean, professional light medical layout.' }
  ];

  const languages = [
    { id: 'en', name: 'English', desc: 'Default system translations' },
    { id: 'sw', name: 'Kiswahili (Swahili)', desc: 'Toleo la lugha ya Kiswahili' },
    { id: 'fr', name: 'Français (French)', desc: 'Version en langue française' }
  ];

  const fonts = [
    { id: 'sans', name: 'Inter (Sans-Serif)', desc: 'Standard clean medical typography' },
    { id: 'outfit', name: 'Outfit', desc: 'Elegant and rounded modern geometric sans' },
    { id: 'roboto', name: 'Roboto', desc: 'Default material design font scale' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings className="text-teal-400" size={20} /> System Preferences
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize your workspace experience. Choose your UI layout theme, typography font face, and display language.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* THEME SELECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
            <Palette size={14} /> Workspace Theme
          </h3>
          <div className="space-y-2.5">
            {themes.map((t) => (
              <div 
                key={t.id}
                onClick={() => onChangeTheme(t.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  currentTheme === t.id 
                    ? 'border-teal-500 bg-teal-500/5 text-slate-200' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{t.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{t.desc}</span>
                </div>
                {currentTheme === t.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* LANGUAGE SELECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
            <Globe size={14} /> System Language
          </h3>
          <div className="space-y-2.5">
            {languages.map((l) => (
              <div 
                key={l.id}
                onClick={() => onChangeLang(l.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  currentLang === l.id 
                    ? 'border-teal-500 bg-teal-500/5 text-slate-200' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{l.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{l.desc}</span>
                </div>
                {currentLang === l.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* FONT SELECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
            <Type size={14} /> Typography Font
          </h3>
          <div className="space-y-2.5">
            {fonts.map((f) => (
              <div 
                key={f.id}
                onClick={() => onChangeFont(f.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  currentFont === f.id 
                    ? 'border-teal-500 bg-teal-500/5 text-slate-200' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{f.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{f.desc}</span>
                </div>
                {currentFont === f.id && <CheckCircle size={14} className="text-teal-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
