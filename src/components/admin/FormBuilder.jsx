import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Sliders, Plus, Trash2, Save, CheckCircle, FileText, Layout } from 'lucide-react';

export default function FormBuilder({ user, showNotification }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // New field form states
  const [department, setDepartment] = useState('consultation');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text'); // text, number, select, boolean, textarea
  const [options, setOptions] = useState(''); // comma-separated for select
  const [required, setRequired] = useState(false);

  useEffect(() => {
    fetchFacilityFormSchema();
  }, [user?.facility_id]);

  const fetchFacilityFormSchema = async () => {
    if (!user?.facility_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('custom_form_schemas')
        .eq('id', user.facility_id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.custom_form_schemas) {
        setFields(Array.isArray(data.custom_form_schemas) ? data.custom_form_schemas : []);
      } else {
        // Default seed fields
        setFields([
          { id: 'f_1', department: 'consultation', label: 'Smoking History', type: 'select', options: 'Never, Former, Current Heavy, Current Light', required: false },
          { id: 'f_2', department: 'consultation', label: 'Allergies Notes', type: 'textarea', options: '', required: false },
          { id: 'f_3', department: 'triage', label: 'Oxygen Flow Rate (L/min)', type: 'number', options: '', required: false }
        ]);
      }
    } catch (err) {
      console.error('Error loading custom form schemas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    const newField = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      department,
      label: label.trim(),
      type: fieldType,
      options: fieldType === 'select' ? options.trim() : '',
      required
    };

    setFields(prev => [...prev, newField]);
    setLabel('');
    setOptions('');
    setRequired(false);
  };

  const handleRemoveField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSaveSchema = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('facilities')
        .update({ custom_form_schemas: fields })
        .eq('id', user.facility_id);

      if (error) throw error;

      if (showNotification) {
        showNotification('success', 'Form Templates Saved', 'Custom clinical fields schema saved successfully!');
      } else {
        setMessage({ type: 'success', text: 'Custom clinical fields schema saved successfully!' });
      }
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Save Failed', err.message);
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders size={18} className="text-teal-400" /> Dynamic Clinical Form Builder
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic JSON-driven custom fields per department without code redeployments.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveSchema}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl transition shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <Save size={14} /> {loading ? 'Saving...' : 'Save Schema Changes'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Field Form */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 h-fit">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} /> Add Dynamic Field
          </h3>

          <form onSubmit={handleAddField} className="space-y-3">
            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Department Scope *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition cursor-pointer"
              >
                <option value="consultation">Outpatient Consultation</option>
                <option value="triage">Triage Desk</option>
                <option value="mch">Maternal & Child Health (MCH)</option>
                <option value="ward">Inpatient Ward</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Field Label *</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Tobacco Use History"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Field Input Type *</label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition cursor-pointer"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Multi-line Text Area</option>
                <option value="number">Numeric Input</option>
                <option value="select">Dropdown Select Options</option>
                <option value="boolean">Yes / No Checkbox</option>
              </select>
            </div>

            {fieldType === 'select' && (
              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dropdown Options (Comma-separated) *</label>
                <input
                  type="text"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="e.g. Low, Moderate, Severe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reqCheck"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-teal-400 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="reqCheck" className="text-xs text-slate-300 cursor-pointer">Mark field as mandatory/required</label>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs py-2 px-4 rounded-lg transition mt-2 cursor-pointer"
            >
              Add to Active Template
            </button>
          </form>
        </div>

        {/* Dynamic Fields List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Configured Dynamic Fields ({fields.length})</span>
            <span className="text-2xs text-teal-400 font-mono">Active Schema</span>
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {fields.map((f) => (
              <div key={f.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{f.label}</span>
                    <span className="bg-slate-800 text-slate-400 text-[9px] font-mono px-2 py-0.5 rounded capitalize">{f.department}</span>
                    {f.required && <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0.2 rounded">Required</span>}
                  </div>
                  <span className="text-2xs text-slate-500 mt-1 block font-mono">Type: {f.type} {f.options ? `(${f.options})` : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveField(f.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-xs text-slate-600 text-center py-16 border border-dashed border-slate-800 rounded-xl">
                No custom fields configured yet. Use the form on the left to add fields.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
