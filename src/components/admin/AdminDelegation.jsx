import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Shield, CheckSquare, Save, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { defaultTabPermissions } from '../../utils/permissions';

const DELEGABLE_TABS = [
  { id: 'facility_profile', name: 'Hospital Profile' },
  { id: 'domain', name: 'Domain & Branding' },
  { id: 'payment_settings', name: 'Payment & Landing Config' },
  { id: 'ward_settings', name: 'Ward & Bed Settings' },
  { id: 'staff_onboarding', name: 'Staff Onboarding' },
  { id: 'role_requests', name: 'Role Requests' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'roster', name: 'Duty Roster & Attendance' },
  { id: 'broadcasts', name: 'Alerts & Broadcasts' },
  { id: 'procurement', name: 'Procurement Desk' },
  { id: 'help_desk', name: 'Help Desk Support' },
  { id: 'audit', name: 'Audit Trail' },
  { id: 'email_logs', name: 'Email Delivery Logs' },
  { id: 'smtp_settings', name: 'SMTP Server Settings' },
  { id: 'licensing', name: 'Licensing & Billing' },
  { id: 'afyalink', name: 'AfyaLink Integration' }
];

const DELEGABLE_ROLES = [
  { id: 'facility_admin', name: 'Facility Admin' },
  { id: 'marketing_admin', name: 'Marketing Admin' },
  { id: 'hr_manager', name: 'HR Manager' },
  { id: 'operations_manager', name: 'Operations Manager' },
  { id: 'it_support', name: 'IT Support' },
  { id: 'nurse', name: 'Nurse' },
  { id: 'lab_tech', name: 'Lab Tech' },
  { id: 'pharmacist', name: 'Pharmacist' },
  { id: 'cashier', name: 'Cashier' },
  { id: 'receptionist', name: 'Receptionist' },
  { id: 'clinician', name: 'Clinician' }
];

export default function AdminDelegation({ user, currentDelegation = {}, onUpdate }) {
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Build initial matrix state based on currentDelegation or defaultTabPermissions fallback
    const initialMatrix = {};
    DELEGABLE_TABS.forEach(tab => {
      initialMatrix[tab.id] = currentDelegation && currentDelegation[tab.id]
        ? [...currentDelegation[tab.id]]
        : [...(defaultTabPermissions[tab.id] || [])];
    });
    setMatrix(initialMatrix);
  }, [currentDelegation]);

  const handleToggle = (tabId, roleId) => {
    setMatrix(prev => {
      const currentList = prev[tabId] || [];
      const updatedList = currentList.includes(roleId)
        ? currentList.filter(r => r !== roleId)
        : [...currentList, roleId];
      return {
        ...prev,
        [tabId]: updatedList
      };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('facilities')
        .update({ admin_delegation: matrix })
        .eq('id', user.facility_id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Admin Delegation Updated',
        details: `Updated administration tab access delegation matrix.`
      });

      setMessage({ type: 'success', text: 'Role delegation settings saved successfully!' });
      if (onUpdate) {
        onUpdate(matrix);
      }
    } catch (err) {
      console.error("Failed to save delegation settings:", err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Shield size={14} className="text-teal-400" /> Admin Role Delegation & Permissions
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 max-w-xl leading-relaxed font-sans">
            Delegate specific administration settings and panels under organization management to your team. 
            Checkboxes below control access to each panel tab for different employee roles.
          </p>
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3.5 flex gap-3 items-center">
        <AlertTriangle className="text-yellow-500 shrink-0" size={16} />
        <span className="text-[10px] text-yellow-500/80 font-medium leading-relaxed font-sans">
          <strong>Security Bypass Rule:</strong> The primary Facility Owner (role <strong>'admin'</strong>) always retains full, unrestricted access to all panels and cannot be locked out.
        </span>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg border text-xs flex gap-2.5 ${
          message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Delegation Grid */}
      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] font-sans text-slate-350">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-950/60">
                <th className="p-3 text-left font-bold text-slate-200 uppercase tracking-wider min-w-[160px]">Admin Settings Tab</th>
                {DELEGABLE_ROLES.map(role => (
                  <th key={role.id} className="p-3 text-center font-bold text-slate-400 uppercase tracking-wider min-w-[90px]">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DELEGABLE_TABS.map(tab => {
                const allowedRoles = matrix[tab.id] || [];
                return (
                  <tr key={tab.id} className="border-b border-slate-850/60 hover:bg-slate-950/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">{tab.name}</td>
                    {DELEGABLE_ROLES.map(role => {
                      const checked = allowedRoles.includes(role.id);
                      return (
                        <td key={role.id} className="p-3 text-center">
                          <label className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggle(tab.id, role.id)}
                              className="sr-only peer"
                            />
                            <div className="w-4 h-4 bg-slate-950 border border-slate-800 rounded peer-checked:border-teal-500 peer-checked:bg-teal-500/10 flex items-center justify-center transition">
                              {checked && <CheckSquare size={10} className="text-teal-400" />}
                            </div>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          disabled={loading}
          onClick={handleSave}
          className="bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-6 rounded-lg shadow-lg active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={12} /> Save Configurations
            </>
          )}
        </button>
      </div>
    </div>
  );
}
