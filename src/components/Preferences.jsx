import React from 'react';
import { Settings, Globe, Palette, Type, CheckCircle } from 'lucide-react';

export default function Preferences({ currentTheme, onChangeTheme, currentLang, onChangeLang, currentFont, onChangeFont }) {
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
    { id: 'sans', name: 'DM Sans (Default)', desc: 'Design system body typeface' },
    { id: 'outfit', name: 'Outfit', desc: 'Elegant rounded geometric sans' },
    { id: 'roboto', name: 'Roboto', desc: 'Material design font scale' }
  ];
  return (
    <div className="space-y-6 max-w-4xl font-sans">
      <div className="border-b border-border pb-3">
        <h2 className="text-lg font-bold text-fg-strong flex items-center gap-2">
          <Settings className="text-primary" size={20} /> System Preferences
        </h2>
        <p className="text-xs text-fg-muted mt-1">Customize your workspace experience. Choose your UI layout theme, typography font face, and display language.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-card">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border"><Palette size={14} /> Workspace Theme</h3>
          <div className="space-y-2.5">
            {themes.map((t) => (
              <div key={t.id} onClick={() => onChangeTheme(t.id)} className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${currentTheme === t.id ? 'border-primary bg-primary/5 text-fg-body' : 'border-border bg-background/40 text-fg-muted hover:border-border-strong'}`}>
                <div><span className="text-xs font-bold block">{t.name}</span><span className="text-2xs text-fg-subtle mt-0.5 block">{t.desc}</span></div>
                {currentTheme === t.id && <CheckCircle size={14} className="text-primary shrink-0" />}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-card">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border"><Globe size={14} /> System Language</h3>
          <div className="space-y-2.5">
            {languages.map((l) => (
              <div key={l.id} onClick={() => onChangeLang(l.id)} className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${currentLang === l.id ? 'border-primary bg-primary/5 text-fg-body' : 'border-border bg-background/40 text-fg-muted hover:border-border-strong'}`}>
                <div><span className="text-xs font-bold block">{l.name}</span><span className="text-2xs text-fg-subtle mt-0.5 block">{l.desc}</span></div>
                {currentLang === l.id && <CheckCircle size={14} className="text-primary shrink-0" />}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-card">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border"><Type size={14} /> Typography Font</h3>
          <div className="space-y-2.5">
            {fonts.map((f) => (
              <div key={f.id} onClick={() => onChangeFont(f.id)} className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${currentFont === f.id ? 'border-primary bg-primary/5 text-fg-body' : 'border-border bg-background/40 text-fg-muted hover:border-border-strong'}`}>
                <div><span className="text-xs font-bold block">{f.name}</span><span className="text-2xs text-fg-subtle mt-0.5 block">{f.desc}</span></div>
                {currentFont === f.id && <CheckCircle size={14} className="text-primary shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
