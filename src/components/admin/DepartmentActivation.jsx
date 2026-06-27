import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Building2, Users, Save, AlertCircle } from 'lucide-react';

const DEPTS = [
  { key: 'reception', name: 'Reception', desc: 'Patient registration' },
  { key: 'doctors', name: 'Consultation', desc: 'Clinical services' },
  { key: 'laboratory', name: 'Laboratory', desc: 'Diagnostics' },
  { key: 'pharmacy', name: 'Pharmacy', desc: 'Medications' },
  { key: 'billing', name: 'Billing', desc: 'Payments' },
  { key: 'inpatient', name: 'Inpatient', desc: 'Ward care' },
  { key: 'maternity', name: 'Maternity', desc: 'Maternal care' },
  { key: 'hr', name: 'HR', desc: 'Staff management' },
];

export default function DepartmentActivation({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModules, setActiveModules] = useState({});
  const [deptRoles, setDeptRoles] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchData(); fetchProfiles(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: md } = await supabase.from('module_config').select('*').eq('facility_id', user.facility_id);
      const m = {}; md.forEach(x => m[x.module_key] = x.is_active);
      setActiveModules(m);
      const { data: rd } = await supabase.from('roster_role_assignments').select('*, profiles(full_name, role)').eq('facility_id', user.facility_id);
      const r = {};
      rd.forEach(a => {
        if (!r[a.department_code]) r[a.department_code] = [];
        r[a.department_code].push({
          pid: a.profile_id, name: a.profiles?.full_name, role: a.profiles?.role,
          mgr: a.can_manage_roster, view: a.can_view_roster, app: a.can_approve_attendance, aid: a.id
        });
      });
      setDeptRoles(r);
    } catch(e) { setMsg({t:'error',m:'Failed to load'}); }
    finally { setLoading(false); }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('facility_id', user.facility_id).eq('access_status', 'active');
  const toggle = async (k) => {
    const ns = !activeModules[k];
    await supabase.from('module_config').update({is_active:ns, updated_at:new Date().toISOString()}).eq('id',`mod_${user.facility_id}_${k}`);
    setActiveModules(p=>({...p,[k]:ns}));
  };

  const addRole = (dc, pid) => {
    if(!pid) return;
    const p = profiles.find(x=>x.id===pid);
    if(!p) return;
    setDeptRoles(pr=>{
      const d=pr[dc]||[];
      if(d.some(x=>x.pid===pid)) return pr;
      return {...pr,[dc]:[...d,{pid,name:p.full_name,role:p.role,mgr:false,view:true,app:false,aid:null}]};
    });
  };

  const remRole = (dc,pid) => setDeptRoles(pr=>({...pr,[dc]:pr[dc].filter(x=>x.pid!==pid)}));

  const chgPerm = (dc,pid,perm,val) => setDeptRoles(pr=>({...pr,[dc]:pr[dc].map(x=>x.pid===pid?{...x,[perm]:val}:x)}));

  const save = async () => {
    try {
      setSaving(true);
      const ts=[];
      Object.entries(deptRoles).forEach(([d,rs])=>rs.forEach(r=>ts.push({
        id:r.aid||`rra_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
        facility_id:user.facility_id,profile_id:r.pid,department_code:d,
        can_manage_roster:r.mgr,can_view_roster:r.view,can_approve_attendance:r.app
      })));
      if(ts.length) await supabase.from('roster_role_assignments').upsert(ts);
      await supabase.from('audit_logs').insert({id:`log_${Date.now()}`,facility_id:user.facility_id,user_id:user.id,action:'Update Roster',details:`Updated ${Object.keys(deptRoles).length} depts`});
      setMsg({t:'success',m:'Saved!'}); setTimeout(()=>setMsg(null),3000);
    } catch(e) { setMsg({t:'error',m:'Failed'}); }
    finally { setSaving(false); }
  };

  if(loading) return <div className="text-center py-20 text-slate-500 text-xs">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div><h4 className="text-xs font-bold text-slate-300 flex items-center gap-2"><Building2 size={14} className="text-teal-400"/>Department Activation</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">Activate departments and assign roster managers</p></div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400 hover:bg-teal-350 text-slate-950 text-xs font-bold rounded-lg disabled:opacity-50">
          <Save size={12}/>{saving?'Saving...':'Save'}
        </button>
      </div>
      {msg&&<div className={`p-2 rounded text-xs flex items-center gap-1.5 ${msg.t==='error'?'bg-red-500/10 text-red-400':'bg-teal-500/10 text-teal-400'}`}><AlertCircle size={10}/>{msg.m}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEPTS.map(dept=>{
          const ia=activeModules[dept.key]??false; const rs=deptRoles[dept.key]||[];
          return (<div key={dept.key} className={`p-3 rounded-lg border ${ia?'bg-teal-500/5 border-teal-500/20':'bg-slate-950/40 border-slate-850'}`}>
            <div className="flex items-start justify-between mb-2">
              <div><div className="text-xs font-semibold text-slate-200">{dept.name}</div><div className="text-[10px] text-slate-500">{dept.desc}</div></div>
              <button onClick={()=>toggle(dept.key)} className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex items-center ${ia?'bg-teal-400 justify-end':'bg-slate-800 justify-start'}`}><span className="w-3 h-3 rounded-full bg-slate-950 mx-0.5"/></button>
            </div>
            {ia&&<div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1 mb-1.5"><Users size={10} className="text-slate-500"/><span className="text-[10px] font-bold text-slate-400">Staff ({rs.length})</span></div>
              {rs.map(r=>(<div key={r.pid} className="flex items-center justify-between p-1.5 bg-slate-950/50 rounded mb-1">
                <div className="flex-1 min-w-0"><div className="text-[10px] text-slate-300 font-medium truncate">{r.name}</div>
                <div className="flex gap-1.5 mt-0.5"><label className="flex items-center gap-0.5 text-[9px] text-slate-500"><input type="checkbox" checked={r.mgr} onChange={e=>chgPerm(dept.key,r.pid,'mgr',e.target.checked)} className="rounded border-slate-700 text-teal-400"/>Manage</label>
                <label className="flex items-center gap-0.5 text-[9px] text-slate-500"><input type="checkbox" checked={r.view} onChange={e=>chgPerm(dept.key,r.pid,'view',e.target.checked)} className="rounded border-slate-700 text-teal-400"/>View</label></div></div>
                <button onClick={()=>remRole(dept.key,r.pid)} className="text-slate-500 hover:text-red-400">×</button>
              </div>))}
              <select onChange={e=>{addRole(dept.key,e.target.value);e.target.value='';}} className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-[10px] rounded px-2 py-1 mt-1" defaultValue="">
                <option value="">+ Add staff...</option>
                {profiles.filter(p=>!rs.some(x=>x.pid===p.id)).map(p=><option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
              </select>
            </div>}
          </div>);
        })}
      </div>
    </div>
  );
}
    setProfiles(data || []);
  };