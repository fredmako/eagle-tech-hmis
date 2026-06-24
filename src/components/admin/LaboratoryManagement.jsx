import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Search, Edit, Save, Plus, Trash2, Sliders, ShieldAlert, Check 
} from 'lucide-react';

export default function LaboratoryManagement({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [specimens, setSpecimens] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Sample Specimen'); // 'Test Categories', 'Sample Specimen', 'Test Units', 'Specimen Tests', 'Reference Ranges'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowCount, setRowCount] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Form states
  const [formCategory, setFormCategory] = useState('MICROBIOLOGY');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchSpecimens();
  }, [currentPage, rowCount]);

  const fetchSpecimens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Build query parameters
      const queries = [
        { type: 'equal', column: 'facility_id', value: user.facility_id }
      ];

      // Fetch from database proxy
      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'sample_specimens',
          queries,
          orderByField: 'created_at',
          orderByAsc: false
        })
      });

      if (!res.ok) throw new Error('Failed to fetch specimens');
      const resData = await res.json();
      const allSpecimens = resData.data || [];

      // Filter based on search query client-side (for instant feedback)
      const filtered = allSpecimens.filter(spec => 
        spec.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setTotalCount(filtered.length);

      // Paginate
      const startIndex = (currentPage - 1) * rowCount;
      const paginated = filtered.slice(startIndex, startIndex + rowCount);

      setSpecimens(paginated);
    } catch (err) {
      console.error('Error fetching specimens:', err);
      showToast('Error loading specimen data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSpecimens();
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSaveSpecimen = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Specimen Name is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      if (editingId) {
        // Update existing specimen
        const res = await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'sample_specimens',
            column: 'id',
            value: editingId,
            values: {
              category: formCategory,
              name: formName,
              description: formDescription
            }
          })
        });

        if (!res.ok) throw new Error('Update failed');
        showToast('Specimen updated successfully.');
      } else {
        // Add new specimen
        const res = await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'sample_specimens',
            docId: `spec_${Date.now()}`,
            row: {
              facility_id: user.facility_id,
              category: formCategory,
              name: formName,
              description: formDescription
            }
          })
        });

        if (!res.ok) throw new Error('Insertion failed');
        showToast('New specimen registered successfully.');
      }

      setFormName('');
      setFormDescription('');
      setEditingId(null);
      setCurrentPage(1);
      fetchSpecimens();
    } catch (err) {
      console.error('Error saving specimen:', err);
      showToast(`Failed to save specimen: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSpecimen = (spec) => {
    setEditingId(spec.id);
    setFormCategory(spec.category);
    setFormName(spec.name);
    setFormDescription(spec.description || '');
  };

  const handleDeleteSpecimen = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete specimen "${name}"?`)) return;

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const res = await fetch(`${apiBase}/db/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'sample_specimens',
          column: 'id',
          value: id
        })
      });

      if (!res.ok) throw new Error('Deletion failed');
      showToast(`Specimen "${name}" deleted successfully.`);
      fetchSpecimens();
    } catch (err) {
      console.error('Error deleting specimen:', err);
      showToast(`Failed to delete specimen: ${err.message}`, 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
  };

  const totalPages = Math.ceil(totalCount / rowCount) || 1;

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      {/* Header Info */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-teal-400" />
            Laboratory Management Desk
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Manage lab sample types, speciments, categories, and ranges.
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 pb-px gap-1 overflow-x-auto select-none">
        {['Test Categories', 'Sample Specimen', 'Test Units', 'Specimen Tests', 'Reference Ranges'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[10.5px] font-bold transition duration-205 border-b-2 cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'border-teal-450 text-teal-400 bg-slate-900/40' 
                  : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-900/20'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab !== 'Sample Specimen' ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
          <Sliders size={24} className="text-slate-700 mb-2" />
          <h3 className="text-xs font-bold text-slate-350 uppercase">Workspace Tab Setup</h3>
          <p className="text-[10.5px] text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
            This configuration subtab is handled by the laboratory settings desk. Select the <strong>Sample Specimen</strong> tab to manage blood/sputum catalog logs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 pt-1 max-h-[450px] overflow-y-auto pr-1">
          
          {/* Left Column: Specimen list search & table */}
          <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[350px]">
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                <input 
                  type="text" 
                  placeholder="Search Category Name/Description"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>
              <button 
                type="submit"
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 px-4 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Search
              </button>
            </form>

            {loading ? (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-500 gap-2 py-10">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent" />
                <span className="text-[10px] font-mono">Fetching catalog...</span>
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between">
                
                {/* Table Container */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Specimen Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {specimens.map((spec) => (
                        <tr key={spec.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-2.5 px-3 text-teal-400 font-semibold">{spec.category}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-200">{spec.name}</td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate" title={spec.description}>{spec.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            <button 
                              onClick={() => handleEditSpecimen(spec)}
                              className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50 transition cursor-pointer inline-flex items-center"
                              title="Edit Specimen"
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSpecimen(spec.id, spec.name)}
                              className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50 transition cursor-pointer inline-flex items-center"
                              title="Delete Specimen"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {specimens.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-10 text-slate-500 font-medium">
                            No specimen catalog logs registered.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/60 select-none text-[10.5px]">
                  <div className="text-slate-500 font-medium">
                    Showing <span className="text-slate-350">{specimens.length}</span> of <span className="text-slate-350">{totalCount}</span> entries
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-750 transition cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-slate-400 px-1">Page {currentPage} of {totalPages}</span>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-750 transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Right Column: Add / Edit Form */}
          <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <Plus size={13} />
              {editingId ? 'Edit Specimen Details' : 'Register New Specimen'}
            </h3>

            <form onSubmit={handleSaveSpecimen} className="space-y-3.5 pt-3.5">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                >
                  <option value="MICROBIOLOGY">MICROBIOLOGY</option>
                  <option value="HISTOLOGY">HISTOLOGY</option>
                  <option value="BIOCHEMISTRY">BIOCHEMISTRY</option>
                  <option value="HEMACYTOLOGY">HEMACYTOLOGY</option>
                  <option value="PATHOLOGY">PATHOLOGY</option>
                  <option value="PARASITOLOGY">PARASITOLOGY</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specimen Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Whole Blood, Sputum"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specimen Description</label>
                <textarea 
                  placeholder="Enter details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition resize-none" 
                />
              </div>

              <div className="flex gap-2 pt-1.5">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md"
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {editingId && (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

          </div>

        </div>
      )}

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
        }`}>
          <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            {toast.type === 'error' ? <ShieldAlert size={10} className="text-red-400" /> : <Check size={10} className="text-teal-400" />}
          </div>
          <span className="text-[10px] font-bold font-sans">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
