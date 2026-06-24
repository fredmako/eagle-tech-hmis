import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  LayoutDashboard, Settings, User, Calendar, Activity, Heart, ShieldAlert,
  ArrowRight, ShieldCheck, Check, Sliders, ChevronDown, ChevronRight, Menu, LogOut, Lock, 
  Search, Edit, Save, Plus, ArrowLeft, Trash2
} from 'lucide-react';

export default function LaboratoryManagement({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [specimens, setSpecimens] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Sample Specimen'); // 'Test Categories', 'Sample Specimen', 'Test Units', 'Specimen Tests', 'Reference Ranges'
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [productsServicesOpen, setProductsServicesOpen] = useState(true);

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
      showToast('Specimen Name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      if (editingId) {
        // Edit existing specimen
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
              category: formCategory.toUpperCase(),
              name: formName.trim().toUpperCase(),
              description: formDescription.trim(),
              status: 'Active'
            }
          })
        });

        if (!res.ok) throw new Error('Failed to update specimen');
        showToast('Sample specimen updated successfully.');
      } else {
        // Create new specimen
        const newId = `spec_${Date.now()}`;
        const res = await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: 'sample_specimens',
            docId: newId,
            row: {
              facility_id: user.facility_id,
              category: formCategory.toUpperCase(),
              name: formName.trim().toUpperCase(),
              description: formDescription.trim(),
              status: 'Active'
            }
          })
        });

        if (!res.ok) throw new Error('Failed to insert specimen');
        showToast('New sample specimen registered successfully.');
      }

      // Reset form states
      setEditingId(null);
      setFormName('');
      setFormDescription('');
      fetchSpecimens();
    } catch (err) {
      console.error('Error saving specimen:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (specimen) => {
    setEditingId(specimen.id);
    setFormCategory(specimen.category);
    setFormName(specimen.name);
    setFormDescription(specimen.description || '');
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
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Header Bar */}
      <header className="h-14 bg-[#0066FF] flex items-center justify-between px-4 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)} 
            className="text-white hover:bg-white/10 p-1.5 rounded transition cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
              <Heart size={18} className="text-white fill-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-wider uppercase font-sans">
              Hosi Poa
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-l border-white/20 pl-4 py-1">
            <div className="h-7 w-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-bold text-white text-xs shadow-inner">
              SA
            </div>
            <div className="text-left leading-none">
              <span className="text-[11px] font-bold text-white block">Support Admin</span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-mono">conrade@hosipoa.co.ke</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            title="Exit Laboratory Management"
            className="text-white hover:bg-red-600 hover:text-white p-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside 
          className={`bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ${
            sidebarExpanded ? 'w-64' : 'w-0 overflow-hidden'
          }`}
        >
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
              <Settings size={14} className="text-slate-500" />
              <span>System Setup</span>
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
              <Sliders size={14} className="text-slate-500" />
              <span>Facility Management</span>
            </button>

            {/* Dropdown Products & Services (Active) */}
            <div className="space-y-1">
              <button 
                onClick={() => setProductsServicesOpen(!productsServicesOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-[12px] font-bold text-slate-100 bg-[#8B0000]/10 border-l-4 border-red-700 hover:bg-[#8B0000]/15 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sliders size={14} className="text-red-500" />
                  <span>Products & Services</span>
                </div>
                {productsServicesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {productsServicesOpen && (
                <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 py-1">
                  {[
                    "Procedure Categories",
                    "Available Services",
                    "Laboratory Services",
                    "Default Items Pricing",
                    "Default Lab Pricing",
                    "Default Radiology Pricing",
                    "Default Services Pricing"
                  ].map((subItem) => {
                    const isActive = subItem === "Laboratory Services";
                    return (
                      <button 
                        key={subItem}
                        className={`w-full text-left px-3 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          isActive 
                            ? 'text-white bg-[#0066FF] font-semibold shadow-sm' 
                            : 'text-slate-450 hover:text-slate-205 hover:bg-slate-850'
                        }`}
                      >
                        {subItem}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {[
              "Insurance Management",
              "Server Status",
              "Sha Pay Settings",
              "System Audit Report"
            ].map((menuItem) => (
              <button key={menuItem} className="w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-semibold text-slate-450 hover:bg-slate-800 hover:text-slate-100 transition text-left cursor-pointer">
                <Sliders size={14} className="text-slate-500" />
                <span>{menuItem}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Central Content Area */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col min-w-0">
          
          {/* Breadcrumbs & Title */}
          <div className="flex justify-between items-center mb-6 shrink-0 font-sans">
            <div>
              <h1 className="text-2xl font-light text-slate-100 tracking-wide">Laboratory Management</h1>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Home / Module Select &gt; <span className="text-[#0066FF]">Laboratory Management</span>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation matching tab headers */}
          <div className="flex border-b border-slate-800 pb-px gap-1 mb-6 overflow-x-auto shrink-0 select-none">
            {['Test Categories', 'Sample Specimen', 'Test Units', 'Specimen Tests', 'Reference Ranges'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 text-xs font-bold transition duration-200 border-t-2 cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 border-[#0066FF] text-slate-100' 
                      : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {activeTab !== 'Sample Specimen' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
              <Sliders size={32} className="text-slate-700 mb-2" />
              <h3 className="text-sm font-bold text-slate-350 uppercase">Workspace Tab Setup</h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs text-center">
                This configuration subtab is handled by the laboratory settings desk. Select the <strong>Sample Specimen</strong> tab to manage blood/sputum catalog logs.
              </p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0">
              
              {/* Left Column: Specimen list search & table */}
              <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col min-h-[480px]">
                
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2.5 mb-5 shrink-0">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search Category Name/Description"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs py-2 px-6 rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                  >
                    <Search size={13} /> Search Records
                  </button>
                </form>

                {/* Table Title */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0">
                  <Sliders size={14} className="text-[#0066FF]" />
                  <span className="text-xs font-bold uppercase text-slate-100 tracking-wider">
                    Listed Sample Specimen
                  </span>
                </div>

                {/* Specimen Table */}
                <div className="flex-1 overflow-y-auto min-h-0 border border-slate-850 rounded-lg bg-slate-950/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-500 font-mono">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0066FF] border-t-transparent mx-auto mb-2" />
                            Loading catalog registers...
                          </td>
                        </tr>
                      ) : specimens.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-500 font-mono">
                            No specimen records matching filters found.
                          </td>
                        </tr>
                      ) : (
                        specimens.map((spec) => (
                          <tr key={spec.id} className="hover:bg-slate-900/30 transition">
                            <td className="py-2 px-4 font-semibold text-slate-350">{spec.category}</td>
                            <td className="py-2 px-4 font-bold text-slate-200">{spec.name}</td>
                            <td className="py-2 px-4 text-slate-400">{spec.description || '-'}</td>
                            <td className="py-2 px-4">
                              <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {spec.status}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right flex justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditClick(spec)}
                                className="bg-red-900/80 hover:bg-red-800 text-white font-bold text-[10px] py-1 px-3 rounded flex items-center gap-1 transition cursor-pointer"
                              >
                                <Edit size={10} /> Edit &gt;
                              </button>
                              <button 
                                onClick={() => handleDeleteSpecimen(spec.id, spec.name)}
                                className="bg-slate-900 hover:bg-red-950 text-red-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 p-1 rounded transition cursor-pointer"
                                title="Delete Specimen"
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4 shrink-0 text-slate-400 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 select-none">
                    <button 
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      &lt;&lt;
                    </button>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      &lt;
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-2.5 py-1 rounded border transition cursor-pointer ${
                          currentPage === p 
                            ? 'bg-[#0066FF] border-[#0066FF] text-white font-bold' 
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      &gt;
                    </button>
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      &gt;&gt;
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span>Go to page:</span>
                      <select 
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
                      >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Row count:</span>
                      <select 
                        value={rowCount}
                        onChange={(e) => {
                          setRowCount(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div>
                      Showing {Math.min(totalCount, (currentPage - 1) * rowCount + 1)}-{Math.min(totalCount, currentPage * rowCount)} of {totalCount}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Add/Edit Specimen Form */}
              <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col shadow-sm">
                
                <div className="border-b border-slate-800 pb-3 mb-5 shrink-0 flex justify-between items-center">
                  <h3 className="text-xs font-extrabold uppercase text-slate-100 tracking-wider">
                    {editingId ? 'Edit Sample Specimen' : 'Add Sample Specimen'}
                  </h3>
                  {editingId && (
                    <button 
                      onClick={handleCancelEdit}
                      className="text-slate-400 hover:text-slate-200 text-[10px] font-bold border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveSpecimen} className="space-y-4 flex-1 flex flex-col justify-start">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-250 focus:outline-none focus:border-blue-500 transition"
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specimen Name</label>
                    <input 
                      type="text" 
                      placeholder="Specimen Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specimen Description</label>
                    <textarea 
                      placeholder="Specimen Description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none" 
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#0066FF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer mt-4 shadow-md"
                  >
                    <Save size={14} />
                    {saving ? 'Saving Records...' : 'Save'}
                  </button>
                </form>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
            toast.type === 'error' ? 'bg-red-500/20' : 'bg-emerald-500/20'
          }`}>
            {toast.type === 'error' ? <ShieldAlert size={12} /> : <Check size={12} />}
          </div>
          <span className="text-xs font-bold font-sans">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
