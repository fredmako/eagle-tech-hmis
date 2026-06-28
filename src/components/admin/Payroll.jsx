import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  CreditCard, Search, Edit, Plus, Trash2, Save, X, Check, Landmark, Percent, Scissors, Users, Award, DollarSign, Calculator, FileText, Settings, Heart
} from 'lucide-react';

export default function Payroll({ user }) {
  const [activeTab, setActiveTab] = useState('allowances_setup'); // banking, taxation, deductions, allowances_setup, employees, locum, sacco, loans, advances, process_payroll, reports
  const [allowanceTab, setAllowanceTab] = useState('listing'); // listing, form
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [allowances, setAllowances] = useState([]);
  const [banks, setBanks] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrollDrafts, setPayrollDrafts] = useState([]);

  // Form Editing states
  const [editingId, setEditingId] = useState(null);

  // Form Fields: Allowance Setup
  const [allowanceCode, setAllowanceCode] = useState('');
  const [allowanceDesc, setAllowanceDesc] = useState('');
  const [allowanceValue, setAllowanceValue] = useState(0);
  const [allowanceType, setAllowanceType] = useState('Fixed Amount');
  const [allowanceIsFixed, setAllowanceIsFixed] = useState('YES');
  const [allowanceIsTaxable, setAllowanceIsTaxable] = useState('YES');
  const [allowanceIsPayable, setAllowanceIsPayable] = useState('YES');
  const [allowanceStatus, setAllowanceStatus] = useState('Active');

  // Form Fields: Banking Setup
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // Form Fields: Deductions Setup
  const [deductionCode, setDeductionCode] = useState('');
  const [deductionDesc, setDeductionDesc] = useState('');
  const [deductionValue, setDeductionValue] = useState(0);
  const [deductionType, setDeductionType] = useState('Percentage of Gross'); // Fixed, Percentage

  // Form Fields: Employee Payroll Setting
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empBasicSalary, setEmpBasicSalary] = useState(0);
  const [empBankName, setEmpBankName] = useState('');
  const [empBankAccount, setEmpBankAccount] = useState('');

  // Process Payroll Fields
  const [payrollMonth, setPayrollMonth] = useState('June');
  const [payrollYear, setPayrollYear] = useState('2026');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const getApiContext = () => {
    const token = localStorage.getItem('egesa_health_token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return { token, apiBase };
  };

  const clearFields = () => {
    setEditingId(null);
    setAllowanceCode('');
    setAllowanceDesc('');
    setAllowanceValue(0);
    setAllowanceType('Fixed Amount');
    setAllowanceIsFixed('YES');
    setAllowanceIsTaxable('YES');
    setAllowanceIsPayable('YES');
    setAllowanceStatus('Active');

    setBankCode('');
    setBankName('');
    setBankBranch('');
    setBankAccount('');

    setDeductionCode('');
    setDeductionDesc('');
    setDeductionValue(0);
    setDeductionType('Percentage of Gross');

    setEmpBasicSalary(0);
    setEmpBankName('');
    setEmpBankAccount('');
  };

  const fetchData = async () => {
    setLoading(true);
    const { token, apiBase } = getApiContext();
    try {
      let targetTable = '';
      if (activeTab === 'allowances_setup') targetTable = 'payroll_allowances';
      else if (activeTab === 'banking') targetTable = 'payroll_banks';
      else if (activeTab === 'deductions') targetTable = 'payroll_deductions';
      else if (activeTab === 'employees') targetTable = 'profiles';
      else if (activeTab === 'process_payroll') targetTable = 'payrolls';

      if (!targetTable) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          table: targetTable,
          queries: targetTable === 'profiles' ? [] : [{ type: 'equal', column: 'facility_id', value: user.facility_id }]
        })
      });

      if (!res.ok) throw new Error('Query failed');
      const resData = await res.json();
      const records = resData.data || [];

      if (records.length === 0) {
        await seedDefaults(targetTable);
        // Re-fetch
        const retryRes = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: targetTable,
            queries: targetTable === 'profiles' ? [] : [{ type: 'equal', column: 'facility_id', value: user.facility_id }]
          })
        });
        const retryData = await retryRes.json();
        const retryRecords = retryData.data || [];
        setRecordsState(targetTable, retryRecords);
      } else {
        setRecordsState(targetTable, records);
      }
    } catch (e) {
      console.error('Error fetching payroll data:', e);
      showToast('Error fetching records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setRecordsState = (table, data) => {
    if (table === 'payroll_allowances') setAllowances(data);
    else if (table === 'payroll_banks') setBanks(data);
    else if (table === 'payroll_deductions') setDeductions(data);
    else if (table === 'profiles') setEmployees(data.filter(e => e.facility_id === user.facility_id));
    else if (table === 'payrolls') setPayrollDrafts(data);
  };

  const seedDefaults = async (table) => {
    const { token, apiBase } = getApiContext();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const facility_id = user.facility_id;

    try {
      if (table === 'payroll_allowances') {
        const defaults = [
          { id: 'al_1', code: 'MED', description: 'Medical Allowance', value: 1000, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'YES', is_payable: 'YES', status: 'Active' },
          { id: 'al_2', code: 'ACT', description: 'Acting Allowance', value: 0, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'NO', is_payable: 'YES', status: 'Active' },
          { id: 'al_3', code: 'OVT', description: 'Overtime Allowance', value: 0, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'NO', is_payable: 'YES', status: 'Active' },
          { id: 'al_4', code: 'HSE', description: 'House Allowance', value: 2500, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'NO', is_payable: 'YES', status: 'Active' },
          { id: 'al_5', code: 'TRVL', description: 'Travel Allowance', value: 1500, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'NO', is_payable: 'YES', status: 'Active' },
          { id: 'al_6', code: '7457', description: 'Professional Fee', value: 12000, type: 'Fixed Amount', is_fixed: 'YES', is_taxable: 'YES', is_payable: 'YES', status: 'Active' }
        ];
        for (const record of defaults) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: record.id, row: { facility_id, ...record } })
          });
        }
      } else if (table === 'payroll_banks') {
        const defaults = [
          { id: 'bnk_1', code: 'EQTY', name: 'Equity Bank', branch: 'Nairobi Corporate', account_no: '1290384930283' },
          { id: 'bnk_2', code: 'KCB', name: 'KCB Bank', branch: 'Mombasa Road', account_no: '5290483920381' },
          { id: 'bnk_3', code: 'COOP', name: 'Co-operative Bank', branch: 'Upperhill', account_no: '0112938492038' }
        ];
        for (const record of defaults) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: record.id, row: { facility_id, ...record } })
          });
        }
      } else if (table === 'payroll_deductions') {
        const defaults = [
          { id: 'ded_1', code: 'NSSF', description: 'NSSF Tier I Statutory', value: 400, type: 'Fixed Amount', status: 'Active' },
          { id: 'ded_2', code: 'SHIF', description: 'Social Health Insurance Fund', value: 2.75, type: 'Percentage of Gross', status: 'Active' },
          { id: 'ded_3', code: 'HOUSING_LEVY', description: 'Housing Levy Statutory', value: 1.5, type: 'Percentage of Gross', status: 'Active' }
        ];
        for (const record of defaults) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: record.id, row: { facility_id, ...record } })
          });
        }
      }
    } catch (e) {
      console.error('Error seeding defaults:', e);
    }
  };

  const handleSaveAllowance = async (e) => {
    e.preventDefault();
    if (!allowanceCode || !allowanceDesc) return showToast('Please fill required fields.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      const values = {
        code: allowanceCode.toUpperCase(),
        description: allowanceDesc,
        value: Number(allowanceValue),
        type: allowanceType,
        is_fixed: allowanceIsFixed,
        is_taxable: allowanceIsTaxable,
        is_payable: allowanceIsPayable,
        status: allowanceStatus
      };

      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ table: 'payroll_allowances', column: 'id', value: editingId, values })
        });
        showToast('Allowance/Income definition updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'payroll_allowances',
            docId: `alw_${Date.now()}`,
            row: { facility_id: user.facility_id, ...values }
          })
        });
        showToast('New Allowance/Income registered.');
      }
      clearFields();
      setAllowanceTab('listing');
      fetchData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!bankCode || !bankName || !bankAccount) return showToast('Please fill required fields.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      const values = {
        code: bankCode.toUpperCase(),
        name: bankName,
        branch: bankBranch,
        account_no: bankAccount
      };

      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ table: 'payroll_banks', column: 'id', value: editingId, values })
        });
        showToast('Bank details updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'payroll_banks',
            docId: `bnk_${Date.now()}`,
            row: { facility_id: user.facility_id, ...values }
          })
        });
        showToast('New bank registry registered.');
      }
      clearFields();
      fetchData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeduction = async (e) => {
    e.preventDefault();
    if (!deductionCode || !deductionDesc) return showToast('Please fill required fields.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      const values = {
        code: deductionCode.toUpperCase(),
        description: deductionDesc,
        value: Number(deductionValue),
        type: deductionType,
        status: 'Active'
      };

      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ table: 'payroll_deductions', column: 'id', value: editingId, values })
        });
        showToast('Statutory deduction updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'payroll_deductions',
            docId: `ded_${Date.now()}`,
            row: { facility_id: user.facility_id, ...values }
          })
        });
        showToast('New statutory deduction registered.');
      }
      clearFields();
      fetchData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployeeSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return showToast('Please select an employee.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          table: 'profiles',
          column: 'id',
          value: selectedEmpId,
          values: {
            basic_salary: Number(empBasicSalary),
            bank_name: empBankName,
            bank_account: empBankAccount
          }
        })
      });
      showToast('Employee salary profile updated.');
      clearFields();
      setSelectedEmpId('');
      fetchData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessPayroll = async () => {
    setSaving(true);
    const { token, apiBase } = getApiContext();
    const facility_id = user.facility_id;

    try {
      // 1. Calculate Gross, Deductions, PAYE, Net for each employee
      const calculatedPayrolls = employees.map(emp => {
        const basic = Number(emp.basic_salary || 30000); // fallback basic
        
        // Sum up active allowances
        const activeAllowances = allowances.filter(a => a.status === 'Active');
        const allowanceSum = activeAllowances.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
        
        const gross = basic + allowanceSum;
        
        // Simple Kenyan PAYE Bracket Calculation Mock
        let taxableIncome = gross;
        let paye = 0;
        if (taxableIncome > 24000) {
          paye += (24000 * 0.10);
          if (taxableIncome > 32333) {
            paye += (8333 * 0.25);
            paye += ((taxableIncome - 32333) * 0.30);
          } else {
            paye += ((taxableIncome - 24000) * 0.25);
          }
        } else {
          paye = taxableIncome * 0.10;
        }

        // Statutory Deductions Sum
        let deductionsSum = 0;
        deductions.forEach(d => {
          if (d.type === 'Fixed Amount') {
            deductionsSum += Number(d.value || 0);
          } else {
            deductionsSum += (gross * (Number(d.value || 0) / 100));
          }
        });

        const net = gross - paye - deductionsSum;

        return {
          employee_id: emp.id,
          employee_name: emp.full_name,
          employee_role: emp.role,
          basic_salary: basic,
          allowances_total: allowanceSum,
          gross_salary: gross,
          tax_paye: Math.round(paye),
          deductions_total: Math.round(deductionsSum),
          net_salary: Math.round(net)
        };
      });

      // 2. Save the payroll batch
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          table: 'payrolls',
          docId: `pay_${Date.now()}`,
          row: {
            facility_id,
            month: payrollMonth,
            year: payrollYear,
            calculations: calculatedPayrolls,
            status: 'Draft',
            total_net: calculatedPayrolls.reduce((sum, curr) => sum + curr.net_salary, 0),
            created_at: new Date().toISOString()
          }
        })
      });

      showToast(`Payroll batch draft for ${payrollMonth} ${payrollYear} generated successfully!`);
      fetchData();
    } catch (err) {
      showToast(`Payroll generation failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAllowance = (al) => {
    setEditingId(al.id);
    setAllowanceCode(al.code);
    setAllowanceDesc(al.description);
    setAllowanceValue(al.value);
    setAllowanceType(al.type);
    setAllowanceIsFixed(al.is_fixed);
    setAllowanceIsTaxable(al.is_taxable);
    setAllowanceIsPayable(al.is_payable);
    setAllowanceStatus(al.status);
    setAllowanceTab('form');
  };

  const handleEditBank = (bk) => {
    setEditingId(bk.id);
    setBankCode(bk.code);
    setBankName(bk.name);
    setBankBranch(bk.branch);
    setBankAccount(bk.account_no);
  };

  const handleEditDeduction = (dd) => {
    setEditingId(dd.id);
    setDeductionCode(dd.code);
    setDeductionDesc(dd.description);
    setDeductionValue(dd.value);
    setDeductionType(dd.type);
  };

  const handleEditEmployeeWage = (emp) => {
    setSelectedEmpId(emp.id);
    setEmpBasicSalary(emp.basic_salary || 0);
    setEmpBankName(emp.bank_name || '');
    setEmpBankAccount(emp.bank_account || '');
  };

  const handleDeleteRecord = async (table, id, display) => {
    if (!window.confirm(`Delete record "${display}"?`)) return;
    const { token, apiBase } = getApiContext();
    try {
      await fetch(`${apiBase}/db/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ table, column: 'id', value: id })
      });
      showToast(`"${display}" removed.`);
      fetchData();
    } catch (e) {
      showToast('Deletion failed.', 'error');
    }
  };

  return (
    <div className="flex h-full min-h-[550px] bg-slate-950 font-sans border border-slate-900 rounded-2xl overflow-hidden select-none">
      
      {/* Secondary Left Sidebar */}
      <div className="w-56 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <CreditCard size={15} className="text-teal-400" />
            <span className="text-[11px] font-black text-slate-100 uppercase tracking-widest">Payroll Console</span>
          </div>

          <div className="space-y-1">
            {[
              { id: 'banking', label: 'Banking Setup', icon: Landmark },
              { id: 'taxation', label: 'Taxation Setup', icon: Percent },
              { id: 'deductions', label: 'Deductions Setup', icon: Scissors },
              { id: 'allowances_setup', label: 'Allowances Setup', icon: Award },
              { id: 'employees', label: 'Payroll Employees', icon: Users },
              { id: 'process_payroll', label: 'Process Payroll', icon: Calculator }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition ${
                    activeTab === item.id 
                      ? 'bg-slate-800 text-teal-400 border border-slate-700/50' 
                      : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[9px] text-slate-600 font-bold tracking-wider leading-relaxed border-t border-slate-800 pt-3">
          Powered by Eagle Tech HMIS
        </div>
      </div>

      {/* Main Workspace Panel */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[580px] flex flex-col min-w-0">
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
            <span className="text-2xs font-mono">Loading Payroll Ledger...</span>
          </div>
        ) : (
          <div className="space-y-5 flex-1 flex flex-col min-w-0">
            
            {/* TAB 1: BANKING SETUP */}
            {activeTab === 'banking' && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-w-0">
                <div className="xl:col-span-3 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">Facility Disbursement Banks</h3>
                  <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                          <th className="py-2.5 px-3">Bank Code</th>
                          <th className="py-2.5 px-3">Bank Name</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3">Disbursement Account</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {banks.map(bk => (
                          <tr key={bk.id} className="hover:bg-slate-950/20">
                            <td className="py-2.5 px-3 text-teal-400 font-mono font-bold">{bk.code}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">{bk.name}</td>
                            <td className="py-2.5 px-3">{bk.branch}</td>
                            <td className="py-2.5 px-3 font-mono">{bk.account_no}</td>
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button onClick={() => handleEditBank(bk)} className="text-slate-400 hover:text-teal-400 p-1"><Edit size={12} /></button>
                              <button onClick={() => handleDeleteRecord('payroll_banks', bk.id, bk.name)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 h-fit space-y-4">
                  <h4 className="text-xs font-bold uppercase text-teal-400 border-b border-slate-850 pb-2">{editingId ? 'Edit Bank Registry' : 'Register Disbursement Bank'}</h4>
                  <form onSubmit={handleSaveBank} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Code</label>
                      <input type="text" placeholder="e.g. EQTY, KCB" value={bankCode} onChange={e => setBankCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name</label>
                      <input type="text" placeholder="e.g. Equity Bank" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Branch Name</label>
                      <input type="text" placeholder="e.g. Corporate Branch" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Disbursement Account No</label>
                      <input type="text" placeholder="Account digits" value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono" />
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                      <Save size={12} /> Save Bank
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: TAXATION SETUP */}
            {activeTab === 'taxation' && (
              <div className="space-y-4 max-w-4xl">
                <div className="pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-slate-100">PAYE Taxation Setup (Statutory Kenya)</h3>
                  <p className="text-2xs text-slate-500 mt-0.5">Define taxable income bands and percentage tax rates computed on gross earnings.</p>
                </div>

                <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                        <th className="py-2.5 px-3">Tax Band</th>
                        <th className="py-2.5 px-3">Taxable Income Min (KES)</th>
                        <th className="py-2.5 px-3">Taxable Income Max (KES)</th>
                        <th className="py-2.5 px-3">PAYE Tax Rate (%)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-350">
                      <tr className="hover:bg-slate-955/20">
                        <td className="py-2.5 px-3 text-teal-400 font-bold">Band I</td>
                        <td className="py-2.5 px-3 font-mono">0.00</td>
                        <td className="py-2.5 px-3 font-mono">24,000.00</td>
                        <td className="py-2.5 px-3 font-mono font-bold">10%</td>
                        <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[8px] bg-green-500/10 text-green-400 font-bold">Active</span></td>
                      </tr>
                      <tr className="hover:bg-slate-955/20">
                        <td className="py-2.5 px-3 text-teal-400 font-bold">Band II</td>
                        <td className="py-2.5 px-3 font-mono">24,001.00</td>
                        <td className="py-2.5 px-3 font-mono">32,333.00</td>
                        <td className="py-2.5 px-3 font-mono font-bold">25%</td>
                        <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[8px] bg-green-500/10 text-green-400 font-bold">Active</span></td>
                      </tr>
                      <tr className="hover:bg-slate-955/20">
                        <td className="py-2.5 px-3 text-teal-400 font-bold">Band III</td>
                        <td className="py-2.5 px-3 font-mono">32,334.00</td>
                        <td className="py-2.5 px-3 font-mono">And Above</td>
                        <td className="py-2.5 px-3 font-mono font-bold">30%</td>
                        <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[8px] bg-green-500/10 text-green-400 font-bold">Active</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-normal flex items-start gap-2.5 max-w-lg">
                  <ShieldAlert size={16} className="text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-350">Kenyan PAYE Compliance Note:</span> The above statutory rates are configured globally for your facility instance. Any change to these tax rates requires administrative authorization codes from the Ministry of Finance.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DEDUCTIONS SETUP */}
            {activeTab === 'deductions' && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-w-0">
                <div className="xl:col-span-3 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">Statutory & Custom Deductions</h3>
                  <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                          <th className="py-2.5 px-3">Deduction Code</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Calculation Method</th>
                          <th className="py-2.5 px-3">Value / Rate</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {deductions.map(ded => (
                          <tr key={ded.id} className="hover:bg-slate-950/20">
                            <td className="py-2.5 px-3 text-teal-400 font-mono font-bold">{ded.code}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">{ded.description}</td>
                            <td className="py-2.5 px-3">{ded.type}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                              {ded.type === 'Fixed Amount' ? `${ded.value} KES` : `${ded.value}%`}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[8px] bg-green-500/10 text-green-400 font-bold">{ded.status}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button onClick={() => handleEditDeduction(ded)} className="text-slate-400 hover:text-teal-400 p-1"><Edit size={12} /></button>
                              <button onClick={() => handleDeleteRecord('payroll_deductions', ded.id, ded.code)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 h-fit space-y-4">
                  <h4 className="text-xs font-bold uppercase text-teal-400 border-b border-slate-850 pb-2">{editingId ? 'Edit Deduction' : 'Register Deduction'}</h4>
                  <form onSubmit={handleSaveDeduction} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deduction Code</label>
                      <input type="text" placeholder="e.g. NSSF, SHIF" value={deductionCode} onChange={e => setDeductionCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                      <input type="text" placeholder="Deduction details..." value={deductionDesc} onChange={e => setDeductionDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calculation Method</label>
                      <select value={deductionType} onChange={e => setDeductionType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                        <option value="Fixed Amount">Fixed Amount</option>
                        <option value="Percentage of Gross">Percentage of Gross</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Value / Rate</label>
                      <input type="number" step="any" placeholder="KES or %" value={deductionValue} onChange={e => setDeductionValue(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono" />
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                      <Save size={12} /> Save Deduction
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 4: ALLOWANCES SETUP (Active in Screenshot) */}
            {activeTab === 'allowances_setup' && (
              <div className="space-y-4 grow flex flex-col min-w-0">
                {/* Secondary Tab selector */}
                <div className="flex border-b border-slate-800 pb-px gap-1 select-none shrink-0">
                  <button
                    onClick={() => setAllowanceTab('listing')}
                    className={`px-4 py-2 text-[10.5px] font-bold transition duration-205 border-b-2 cursor-pointer ${
                      allowanceTab === 'listing' 
                        ? 'border-teal-450 text-teal-400 bg-slate-900/40' 
                        : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-900/20'
                    }`}
                  >
                    Allowances/ Income Listing
                  </button>
                  <button
                    onClick={() => {
                      setAllowanceTab('form');
                      clearFields();
                    }}
                    className={`px-4 py-2 text-[10.5px] font-bold transition duration-205 border-b-2 cursor-pointer ${
                      allowanceTab === 'form' 
                        ? 'border-teal-450 text-teal-400 bg-slate-900/40' 
                        : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-900/20'
                    }`}
                  >
                    {editingId ? 'Edit Allowance' : 'Add Benefits/ Allowances/ Income'}
                  </button>
                </div>

                {allowanceTab === 'listing' ? (
                  <div className="space-y-3 flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-center shrink-0 gap-3">
                      <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                        <Award size={13} className="text-teal-400" />
                        Allowances/ Benefits List
                      </h4>
                      
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 text-slate-650" size={11} />
                          <input
                            type="text"
                            placeholder="Search Allowance Code/D..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 pl-8 text-xs text-slate-200 focus:outline-none focus:border-teal-500 w-44"
                          />
                        </div>
                        <button className="bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg shadow transition active:scale-[0.98] cursor-pointer flex items-center gap-1">
                          <Search size={12} />
                          <span>Search Records</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20 grow">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Value</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Is Fixed</th>
                            <th className="py-2.5 px-3">Is Taxable</th>
                            <th className="py-2.5 px-3">Is Payable</th>
                            <th className="py-2.5 px-3">Status.</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-350">
                          {allowances
                            .filter(al => al.code.toLowerCase().includes(searchQuery.toLowerCase()) || al.description.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(al => (
                              <tr key={al.id} className="hover:bg-slate-955/20 transition-colors">
                                <td className="py-2.5 px-3 text-teal-400 font-mono font-bold">{al.code}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-200">{al.description}</td>
                                <td className="py-2.5 px-3 font-mono font-bold">{Number(al.value).toFixed(2)}</td>
                                <td className="py-2.5 px-3">{al.type}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-400">{al.is_fixed || 'YES'}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-400">{al.is_taxable || 'YES'}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-400">{al.is_payable || 'YES'}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${al.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {al.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right space-x-1">
                                  <button onClick={() => handleEditAllowance(al)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 font-bold text-2xs px-3.5 py-1 rounded transition duration-200 cursor-pointer">
                                    ✔ Edit
                                  </button>
                                  <button onClick={() => handleDeleteRecord('payroll_allowances', al.id, al.code)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg">
                    <h3 className="text-xs font-bold uppercase text-teal-400 border-b border-slate-850 pb-2 mb-4">
                      {editingId ? 'Edit Allowance Details' : 'Register Allowance/ Benefit/ Income'}
                    </h3>
                    <form onSubmit={handleSaveAllowance} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Allowance Code</label>
                          <input type="text" placeholder="e.g. MED, TRVL" value={allowanceCode} onChange={e => setAllowanceCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calculation Type</label>
                          <select value={allowanceType} onChange={e => setAllowanceType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                            <option value="Fixed Amount">Fixed Amount</option>
                            <option value="Percentage of Basic">Percentage of Basic</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Name</label>
                        <input type="text" placeholder="e.g. Medical Allowance" value={allowanceDesc} onChange={e => setAllowanceDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Value (Amount / %)</label>
                          <input type="number" step="any" placeholder="KES value or rate" value={allowanceValue} onChange={e => setAllowanceValue(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Is Fixed Amount</label>
                          <select value={allowanceIsFixed} onChange={e => setAllowanceIsFixed(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Is Taxable</label>
                          <select value={allowanceIsTaxable} onChange={e => setAllowanceIsTaxable(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Is Payable</label>
                          <select value={allowanceIsPayable} onChange={e => setAllowanceIsPayable(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                          <select value={allowanceStatus} onChange={e => setAllowanceStatus(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                            <option value="Active">Active</option>
                            <option value="In-Active">In-Active</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={saving} className="grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                          <Save size={12} /> {saving ? 'Saving...' : 'Save Allowance'}
                        </button>
                        <button type="button" onClick={() => setAllowanceTab('listing')} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: EMPLOYEES LIST & WAGE PROFILE */}
            {activeTab === 'employees' && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-w-0">
                <div className="xl:col-span-3 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 font-sans">Employee Salary Registry</h3>
                  <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                          <th className="py-2.5 px-3">Staff Name</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Basic Salary (KES)</th>
                          <th className="py-2.5 px-3">Disbursement Bank</th>
                          <th className="py-2.5 px-3">Account Number</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {employees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-955/20">
                            <td className="py-2.5 px-3 text-teal-400 font-bold">{emp.full_name}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-450 uppercase text-[9px]">{emp.role}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{emp.basic_salary ? Number(emp.basic_salary).toLocaleString() : '30,000 (Default)'}</td>
                            <td className="py-2.5 px-3 font-semibold">{emp.bank_name || '—'}</td>
                            <td className="py-2.5 px-3 font-mono">{emp.bank_account || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button onClick={() => handleEditEmployeeWage(emp)} className="text-slate-400 hover:text-teal-400 p-1"><Edit size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 h-fit space-y-4">
                  <h4 className="text-xs font-bold uppercase text-teal-400 border-b border-slate-850 pb-2">Set Salary Profile</h4>
                  {selectedEmpId ? (
                    <form onSubmit={handleSaveEmployeeSalary} className="space-y-3">
                      <div className="text-2xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-850 mb-2 leading-relaxed">
                        Setting salary metrics for: <span className="text-teal-400 font-bold block mt-0.5">{employees.find(e => e.id === selectedEmpId)?.full_name}</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Basic Salary (KES)</label>
                        <input type="number" value={empBasicSalary} onChange={e => setEmpBasicSalary(e.target.value)} className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono font-bold" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Bank Name</label>
                        <select value={empBankName} onChange={e => setEmpBankName(e.target.value)} className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                          <option value="">Select Bank...</option>
                          {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Account Number</label>
                        <input type="text" placeholder="Disbursement account" value={empBankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={saving} className="grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                          <Save size={12} /> Save Info
                        </button>
                        <button type="button" onClick={clearFields} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-2xs">
                      <Users size={20} className="mx-auto text-slate-700 mb-2" />
                      <span>Select an employee edit icon on the left to set wage rates.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: PROCESS PAYROLL */}
            {activeTab === 'process_payroll' && (
              <div className="space-y-4 flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Run Monthly Payroll Batch</h3>
                    <p className="text-2xs text-slate-500 mt-0.5">Aggregate Basic Salary + Active Allowances, deduct PAYE tax, and statutory levies.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-xs font-semibold text-slate-200">
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={payrollYear} onChange={e => setPayrollYear(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-xs font-semibold text-slate-200">
                      {['2026', '2027', '2028'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={handleProcessPayroll} disabled={saving} className="bg-teal-400 hover:bg-teal-350 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg shadow transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5">
                      <Calculator size={13} />
                      <span>Generate Batch</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20 grow">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-2xs uppercase font-bold">
                        <th className="py-2.5 px-3">Batch Month</th>
                        <th className="py-2.5 px-3">Year</th>
                        <th className="py-2.5 px-3">Staff Evaluated</th>
                        <th className="py-2.5 px-3">Total Net Payout</th>
                        <th className="py-2.5 px-3">Batch Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-350">
                      {payrollDrafts.map(dr => (
                        <tr key={dr.id} className="hover:bg-slate-955/20">
                          <td className="py-2.5 px-3 text-teal-400 font-bold">{dr.month}</td>
                          <td className="py-2.5 px-3 font-mono">{dr.year}</td>
                          <td className="py-2.5 px-3 font-semibold">{dr.calculations ? dr.calculations.length : 0} Staff</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{Number(dr.total_net || 0).toLocaleString()} KES</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/15 font-bold">Draft Batch</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button 
                              onClick={() => {
                                showToast(`Payslips for batch ${dr.month} printed!`);
                              }}
                              className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] font-bold px-3 py-1 rounded border border-slate-700/40 cursor-pointer"
                            >
                              Print Payslips
                            </button>
                            <button onClick={() => handleDeleteRecord('payrolls', dr.id, `${dr.month} ${dr.year} Batch`)} className="text-slate-600 hover:text-red-400 p-1 ml-1.5"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {payrollDrafts.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-12 text-slate-500">
                            No payroll batches processed. Click "Generate Batch" above to compile month accounts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

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
          <span className="text-2xs font-bold font-sans">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
