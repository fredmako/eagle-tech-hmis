import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Sliders, ShieldAlert, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const gridModules = [
  { name: "Patient Reception & Queue", key: "reception", desc: "Patient registration, triage queues, and appointments" },
  { name: "OPD Consultation / EMR", key: "doctors", desc: "Clinical history, diagnoses, and outpatient treatment records" },
  { name: "Laboratory Services", key: "laboratory", desc: "Diagnostic testing, lab order queues, and result reporting" },
  { name: "Radiology & Imaging", key: "radiology", desc: "X-Ray, Ultrasound, and scan reports configuration" },
  { name: "Pharmacy & Drug POS", key: "pharmacy", desc: "Prescription dispensing queue, stock management, and sales POS" },
  { name: "Billing & Cashier Registry", key: "billing", desc: "Invoice generation, cashier registers, and insurance claims" },
  { name: "Inpatient Ward Operations", key: "inpatient", desc: "Admission list, ward allocation, bed transfers, and ward notes" },
  { name: "Maternity & Neonatal Care", key: "maternity", desc: "Labor tracking, delivery room records, and birth outcomes" },
  { name: "MCH & Child Welfare", key: "mch", desc: "Antenatal care (ANC), family planning, and immunizations" },
  { name: "Operating Theatre Desk", key: "theatre", desc: "Surgery schedule, pre-op assessments, and surgeon notes" },
  { name: "Procurement & Inventory", key: "procurement", desc: "Purchase requisitions, stock orders, and inventory receipt" },
  { name: "Supplier Management", key: "suppliers_management", desc: "External vendor registry, performance rating, and records" },
  { name: "Human Resources Setup", key: "hr", desc: "Staff onboarding, roles assignment, and department setup" },
  { name: "Payroll Console", key: "payroll", desc: "Statutory deductions, salary computations, and pay slips" },
  { name: "Finance & Ledger", key: "finance", desc: "General ledger entries, expense logging, and bank cashbooks" },
  { name: "MOH Reports & Analytics", key: "reports", desc: "MOH 711, 717 MOH reporting formats and administrative dashboards" },
  { name: "Clinical Equipment Maintenance", key: "maintenance", desc: "Biomedical requests, asset tracking, and maintenance logs" },
  { name: "Linen & Laundry Services", key: "laundry", desc: "Ward linen allocation, wash cycles, and linen inventory" },
  { name: "Patient Nutrition & Kitchen", key: "kitchen", desc: "Dietary prescriptions, ward meal logs, and kitchen supplies" },
  { name: "Last Office / Mortuary", key: "lastoffice", desc: "Deceased registry, body release logs, and cold room scheduling" },
  { name: "Consultant Directory", key: "consultants", desc: "Visiting specialists register, scheduling, and commission rates" },
  { name: "Night Shift Administration", key: "night_shift", desc: "Night duty logbooks, emergency logs, and handover reports" },
  { name: "System Help Desk", key: "help", desc: "Internal IT ticketing and troubleshooting support system" },
  { name: "Patient Quality Feedback", key: "feedback", desc: "Service quality surveys, feedback dashboard, and ratings" },
  { name: "Payments Gateway Integration", key: "payments", desc: "Mobile money (M-Pesa API), card payments, and online billing integrations" }
];

export default function ModulesConfig({ user, onClose }) {
  const [activeModules, setActiveModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchActiveModules();
  }, []);

  const fetchActiveModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('active_modules')
        .eq('id', user.facility_id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.active_modules) {
        setActiveModules(data.active_modules);
      } else {
        // Fallback to all enabled
        const initial = {};
        gridModules.forEach(m => {
          initial[m.key] = true;
        });
        setActiveModules(initial);
      }
    } catch (err) {
      console.error('Error fetching active modules:', err);
      showToast('Failed to load active modules. Using defaults.', 'error');
      
      const initial = {};
      gridModules.forEach(m => {
        initial[m.key] = true;
      });
      setActiveModules(initial);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleToggleModule = async (moduleKey, moduleName) => {
    const nextState = !activeModules[moduleKey];
    const updatedModules = {
      ...activeModules,
      [moduleKey]: nextState
    };

    // Optimistic UI update
    setActiveModules(updatedModules);

    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Save to facilities table
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'facilities',
          column: 'id',
          value: user.facility_id,
          values: { 
            active_modules: updatedModules
          }
        })
      });

      if (!res.ok) {
        throw new Error('Database update failed');
      }

      // Generate audit log for security compliance
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'audit_logs',
          docId: `log_${Date.now()}`,
          row: {
            facility_id: user.facility_id,
            user_id: user.id || 'admin',
            action: 'Toggle Module Config',
            details: `Module "${moduleName}" was ${nextState ? 'ENABLED' : 'DISABLED'} by Admin (${user.email || 'admin'})`
          }
        })
      });

      showToast(`Module "${moduleName}" ${nextState ? 'enabled' : 'disabled'} successfully.`, 'success');
    } catch (err) {
      console.error('Error toggling module:', err);
      // Revert UI state on failure
      setActiveModules(prev => ({
        ...prev,
        [moduleKey]: !nextState
      }));
      showToast(`Failed to update module state: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      {/* Header Info */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-teal-400" />
            System Module Settings
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Selectively activate or deactivate features across Eagle Tech HMIS based on your facility's requirements.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
          <span className="text-[10px] font-mono">Loading module configurations...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
          {gridModules.map((module) => {
            const isEnabled = !!activeModules[module.key];
            return (
              <div 
                key={module.key} 
                className="flex items-start justify-between p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 hover:bg-slate-950/70 transition-all duration-200"
              >
                <div className="space-y-1 pr-3 flex-1">
                  <div className="text-[11px] font-bold text-slate-200">
                    {module.name}
                  </div>
                  <div className="text-[9.5px] text-slate-500 leading-normal">
                    {module.desc}
                  </div>
                </div>
                
                <button
                  onClick={() => handleToggleModule(module.key, module.name)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none shrink-0 mt-0.5 ${
                    isEnabled ? 'bg-teal-400' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-950 transition-transform duration-200 shadow-md ${
                      isEnabled ? 'translate-x-4 bg-slate-950' : 'translate-x-0 bg-slate-400'
                    }`}
                  />
                </button>
              </div>
            );
          })}
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
