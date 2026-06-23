import React from 'react';
import { 
  Building, CheckCircle, Shield, Upload, RefreshCw, Heart, ShieldCheck, Activity 
} from 'lucide-react';

export default function HospitalProfile({
  facilityMessage,
  handleSaveFacilityDetails,
  facilityDetails,
  setFacilityDetails,
  logoOption,
  setLogoOption,
  handleLogoUpload,
  customLogoUrl,
  setCustomLogoUrl,
  savingFacility
}) {
  const logoPresets = {
    heart: {
      name: 'Teal Heart Pulse',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      icon: (cls) => <Heart className={cls} fill="currentColor" />
    },
    shield: {
      name: 'Blue Care Shield',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: (cls) => <ShieldCheck className={cls} fill="currentColor" />
    },
    cross: {
      name: 'Red Clinic Cross',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      icon: (cls) => <Activity className={cls} />
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = facilityDetails.facility_images || [];
    
    if (currentImages.length + files.length > 4) {
      alert("You can upload a maximum of 4 facility images.");
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 500; // Keep it lightweight
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFacilityDetails(prev => {
            const list = prev.facility_images || [];
            if (list.length >= 4) return prev;
            return {
              ...prev,
              facility_images: [...list, compressedBase64]
            };
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryImage = (idxToRemove) => {
    setFacilityDetails(prev => ({
      ...prev,
      facility_images: (prev.facility_images || []).filter((_, idx) => idx !== idxToRemove)
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-900">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Building size={14} className="text-teal-400" /> Update Hospital Profile Particulars
          </h4>
        </div>

        {facilityMessage.text && (
          <div className={`p-2.5 rounded text-xs flex gap-2 font-sans ${
            facilityMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            <CheckCircle size={14} className="shrink-0 mt-0.5" />
            <span>{facilityMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveFacilityDetails} className="space-y-6">
          {/* Grid 1: Basic Particulars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital / Clinic Name</label>
              <input
                type="text"
                value={facilityDetails.name}
                onChange={(e) => setFacilityDetails(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Eagle Tech Medical Referral Hospital"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">MOH Identifier / Code</label>
              <input
                type="text"
                value={facilityDetails.code}
                disabled
                className="w-full bg-slate-900/40 border border-slate-855 rounded-lg py-2 px-3 text-xs text-slate-455 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Physical / Postal Address</label>
              <input
                type="text"
                value={facilityDetails.address}
                onChange={(e) => setFacilityDetails(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. Block C, Avenue Rd, Nairobi, Kenya"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Official Contact Email</label>
              <input
                type="email"
                value={facilityDetails.contact_email}
                onChange={(e) => setFacilityDetails(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="e.g. info@yourhospital.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={facilityDetails.contact_phone}
                onChange={(e) => setFacilityDetails(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="e.g. +254 712 345678"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>

          {/* Grid 2: Legal Details */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1.5 border-b border-slate-900 flex items-center gap-1.5 font-sans">
              <Shield size={12} className="text-teal-400" /> Hospital Legal Particulars
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registration / License Number</label>
                <input
                  type="text"
                  value={facilityDetails.registration_number}
                  onChange={(e) => setFacilityDetails(prev => ({ ...prev, registration_number: e.target.value }))}
                  placeholder="e.g. MED/REG/2026/0890"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Identification Number (TIN / PIN)</label>
                <input
                  type="text"
                  value={facilityDetails.tax_id}
                  onChange={(e) => setFacilityDetails(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="e.g. PIN-A009876543Z"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Logo Config Block */}
          <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl space-y-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Update Hospital Logo / Icon</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {Object.keys(logoPresets).map((presetKey) => {
                const preset = logoPresets[presetKey];
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => {
                      setLogoOption(presetKey);
                      setFacilityDetails(prev => ({ ...prev, logo_url: `preset:${presetKey}` }));
                    }}
                    className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                      logoOption === presetKey 
                        ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                        : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {preset.icon('w-5 h-5')}
                    <span className="text-[8px] font-bold tracking-wide uppercase truncate max-w-full">{presetKey}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setLogoOption('custom')}
                className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  logoOption === 'custom' 
                    ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                    : 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800'
                }`}
              >
                <Upload size={16} />
                <span className="text-[8px] font-bold tracking-wide uppercase">Custom Logo</span>
              </button>
            </div>

            {logoOption === 'custom' && (
              <div className="space-y-2">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 hover:border-teal-500/50 transition">
                    <div className="flex flex-col items-center justify-center pt-4 pb-3">
                      <Upload size={24} className="mb-2 text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase"><span className="text-teal-400">Click to upload</span> logo image</p>
                      <p className="text-[8px] text-slate-555 mt-0.5">PNG, JPG or SVG (Auto-compressed)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                    />
                  </label>
                </div>
                {customLogoUrl && (
                  <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-lg">
                    <img src={customLogoUrl} alt="Uploaded Logo Preview" className="w-8 h-8 rounded object-cover border border-slate-700" />
                    <div className="truncate flex-1">
                      <span className="text-[10px] text-slate-450 block font-bold">Logo Uploaded Successfully</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLogoUrl('');
                        setFacilityDetails(prev => ({ ...prev, logo_url: '' }));
                      }}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Facility Gallery Section */}
          <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1 font-sans">
                Facility Image Gallery (Public Landing Page Showcase)
              </label>
              <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                Upload up to 4 images of your clinics, wards, diagnostic equipment, or facility premises to showcase on your public landing page.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(facilityDetails.facility_images || []).map((imgUrl, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group aspect-video">
                  <img 
                    src={imgUrl} 
                    alt={`Facility ${idx + 1}`} 
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105 animate-fadeIn" 
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-md transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {(facilityDetails.facility_images || []).length < 4 && (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 hover:border-teal-500/50 transition">
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <Upload size={18} className="mb-1 text-slate-400" />
                    <span className="text-[9px] text-slate-450 font-bold uppercase"><span className="text-teal-400">Upload Image</span></span>
                    <span className="text-[7px] text-slate-555 mt-0.5">JPG / PNG (Max 4)</span>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleGalleryUpload} 
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-900">
            <button
              type="submit"
              disabled={savingFacility}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg shadow-md transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={savingFacility ? 'animate-spin' : ''} />
              {savingFacility ? 'Saving particulars...' : 'Update Hospital Particulars'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
