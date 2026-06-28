import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, AlertCircle, Check } from 'lucide-react';
import { diseaseMaster } from '../../medicalMaster';

export default function DiagnosisAutocomplete({ 
  value, 
  onSelect, 
  placeholder = "Search ICD-10 code or disease name...", 
  workflowType = null, 
  allowCustom = true 
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [customEnabled, setCustomEnabled] = useState(false);
  const containerRef = useRef(null);

  // Initialize query with value if provided
  useEffect(() => {
    if (value) {
      const match = diseaseMaster.find(d => d.code === value);
      setQuery(match ? `${match.code} - ${match.name}` : value);
    } else {
      setQuery('');
    }
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (searchVal) => {
    setQuery(searchVal);
    if (searchVal.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Fuzzy filtering
    const cleanSearch = searchVal.toLowerCase().trim();
    let filtered = diseaseMaster.filter(d => 
      d.code.toLowerCase().includes(cleanSearch) || 
      d.name.toLowerCase().includes(cleanSearch) ||
      (d.category && d.category.toLowerCase().includes(cleanSearch))
    );

    // Prioritize/sort by workflow
    if (workflowType === 'ANC') {
      // Prioritize Maternal / ObGyn categories
      filtered.sort((a, b) => {
        const aMaternal = a.category?.toLowerCase() === 'maternal' || a.suggestedDepartment?.toLowerCase() === 'maternity';
        const bMaternal = b.category?.toLowerCase() === 'maternal' || b.suggestedDepartment?.toLowerCase() === 'maternity';
        if (aMaternal && !bMaternal) return -1;
        if (!aMaternal && bMaternal) return 1;
        return 0;
      });
    } else if (workflowType === 'EMR') {
      // Prioritize Severe diagnoses
      filtered.sort((a, b) => {
        const aSevere = a.severityDefault?.toLowerCase() === 'severe';
        const bSevere = b.severityDefault?.toLowerCase() === 'severe';
        if (aSevere && !bSevere) return -1;
        if (!aSevere && bSevere) return 1;
        return 0;
      });
    }

    setSuggestions(filtered.slice(0, 10)); // Limit to top 10 suggestions
    setIsOpen(true);
    setCustomEnabled(allowCustom && filtered.length === 0);
  };

  const handleSelectSuggestion = (disease) => {
    setQuery(`${disease.code} - ${disease.name}`);
    onSelect({
      code: disease.code,
      name: disease.name,
      custom: false
    });
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (!query.trim()) return;
    onSelect({
      code: "CUSTOM",
      name: query.trim(),
      custom: true
    });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
        />
        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-slate-900 border border-slate-850 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-850/60 scrollbar-thin scrollbar-thumb-slate-950 scrollbar-track-transparent">
          {suggestions.map((disease) => {
            const isSpecialty = 
              (workflowType === 'ANC' && (disease.category?.toLowerCase() === 'maternal' || disease.suggestedDepartment?.toLowerCase() === 'maternity')) ||
              (workflowType === 'EMR' && disease.severityDefault?.toLowerCase() === 'severe');

            return (
              <button
                key={disease.code}
                type="button"
                onClick={() => handleSelectSuggestion(disease)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-950 transition flex items-center justify-between text-xs gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/15">{disease.code}</span>
                    <span className="font-semibold text-slate-200">{disease.name}</span>
                  </div>
                  {disease.category && (
                    <span className="text-2xs text-slate-500 block mt-1">Category: {disease.category}</span>
                  )}
                </div>
                {isSpecialty && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    workflowType === 'ANC' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {workflowType === 'ANC' ? 'Pregnancy' : 'Emergency'}
                  </span>
                )}
              </button>
            );
          })}

          {customEnabled && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="w-full text-left px-4 py-3 hover:bg-slate-950 text-teal-400 font-bold text-xs flex items-center gap-2 transition"
            >
              <Plus size={14} />
              <span>Use custom diagnosis: "{query}"</span>
            </button>
          )}

          {suggestions.length === 0 && !customEnabled && (
            <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <AlertCircle size={14} className="text-slate-600" />
              Type at least 2 characters to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
