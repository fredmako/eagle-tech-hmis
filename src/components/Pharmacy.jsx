import React, { useState, useEffect } from 'react';
import { supabase } from '../appwriteClient';
import { Pill, AlertCircle, CheckCircle, RefreshCw, Layers } from 'lucide-react';

export default function Pharmacy({ user, onComplete }) {
  const [pharmVisits, setPharmVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  
  // Stock Simulator State
  const [inventory, setInventory] = useState([
    { name: 'Artemether-Lumefantrine (AL)', stock: 120, unit: 'doses' },
    { name: 'Paracetamol 500mg', stock: 850, unit: 'tabs' },
    { name: 'Amoxicillin 500mg', stock: 340, unit: 'tabs' },
    { name: 'Metronidazole 400mg', stock: 410, unit: 'tabs' },
    { name: 'ORS + Zinc', stock: 95, unit: 'sachets' },
    { name: 'Ciprofloxacin 500mg', stock: 180, unit: 'tabs' }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPharmacyQueue();
    loadLocalInventory();
  }, []);

  const loadLocalInventory = () => {
    const savedInv = localStorage.getItem('egesa_pharmacy_inventory');
    if (savedInv) {
      setInventory(JSON.parse(savedInv));
    } else {
      localStorage.setItem('egesa_pharmacy_inventory', JSON.stringify(inventory));
    }
  };

  const fetchPharmacyQueue = async () => {
    try {
      // Fetch visits waiting in pharmacy
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'pharmacy').eq('status', 'waiting');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setPharmVisits(enrichedVisits);
      
      if (enrichedVisits.length > 0) {
        handleSelectVisit(enrichedVisits[0]);
      } else {
        setSelectedVisit(null);
        setPendingPrescriptions([]);
      }
    } catch (err) {
      console.error('Error fetching pharmacy queue:', err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    
    // Fetch pending prescriptions for this visit
    try {
      const { data: ords } = await supabase.from('orders')
        .select('*')
        .eq('visit_id', visit.id)
        .eq('type', 'prescription')
        .eq('status', 'pending');
        
      setPendingPrescriptions(ords || []);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    if (!selectedVisit || pendingPrescriptions.length === 0) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Mark prescriptions as completed
      const updatePromises = pendingPrescriptions.map((p) => {
        return supabase.from('orders').update({
          status: 'completed'
        }).eq('id', p.id);
      });

      await Promise.all(updatePromises);

      // 2. Decrement mock inventory stock levels (simulate dispensing subtraction)
      const updatedInventory = inventory.map(invItem => {
        const matchingPresc = pendingPrescriptions.find(p => p.item_name === invItem.name);
        if (matchingPresc) {
          // Decrement by standard clinical unit quantity (e.g. 10 tabs / 1 dose)
          const qtyToDecrement = invItem.name.includes('Paracetamol') || invItem.name.includes('Amoxicillin') ? 10 : 1;
          const newStock = Math.max(0, invItem.stock - qtyToDecrement);
          return { ...invItem, stock: newStock };
        }
        return invItem;
      });

      setInventory(updatedInventory);
      localStorage.setItem('egesa_pharmacy_inventory', JSON.stringify(updatedInventory));

      // 3. Mark visit as completed since prescription was dispensed
      const { error: visitErr } = await supabase.from('visits').update({
        department: 'completed',
        status: 'completed'
      }).eq('id', selectedVisit.id);

      if (visitErr) throw visitErr;

      setMessage({
        type: 'success',
        text: 'Prescriptions successfully dispensed and registered. Stock levels updated.'
      });

      setTimeout(() => {
        fetchPharmacyQueue();
        if (onComplete) onComplete();
      }, 1500);

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Dispensing operation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = () => {
    const defaultInv = [
      { name: 'Artemether-Lumefantrine (AL)', stock: 120, unit: 'doses' },
      { name: 'Paracetamol 500mg', stock: 850, unit: 'tabs' },
      { name: 'Amoxicillin 500mg', stock: 340, unit: 'tabs' },
      { name: 'Metronidazole 400mg', stock: 410, unit: 'tabs' },
      { name: 'ORS + Zinc', stock: 95, unit: 'sachets' },
      { name: 'Ciprofloxacin 500mg', stock: 180, unit: 'tabs' }
    ];
    setInventory(defaultInv);
    localStorage.setItem('egesa_pharmacy_inventory', JSON.stringify(defaultInv));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pharmacy Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Pill size={16} className="text-teal-400" /> Pharmacy Prescription Queue ({pharmVisits.length})
          </h2>
          <p className="text-[11px] text-slate-505 mt-0.5">Select patient to dispense medicine</p>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {pharmVisits.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                selectedVisit?.id === item.id
                  ? 'border-teal-500/60 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[70%]">{item.patient?.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-405 w-full font-mono">
                <span>{item.patient?.facility_id_code}</span>
                <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </button>
          ))}

          {pharmVisits.length === 0 && (
            <div className="text-xs text-slate-650 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients awaiting medicine dispensing.
            </div>
          )}
        </div>
      </div>

      {/* Prescription Dispense Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-28 text-center my-auto">
            <Pill size={48} className="text-slate-600 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-medium text-sm">No Prescription Loaded</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a patient from the pharmacy queue to review their clinical prescriptions and execute dispensing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Dispensing desk</span>
                <h3 className="text-base font-bold text-slate-100">{selectedVisit.patient?.name}</h3>
                <p className="text-xs text-slate-500">{selectedVisit.patient?.facility_id_code} | DOB: {selectedVisit.patient?.dob}</p>
              </div>
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg border text-sm flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleDispense} className="space-y-4">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Prescribed Meds & Instructions</h4>
              
              <div className="space-y-2.5">
                {pendingPrescriptions.map((presc) => (
                  <div key={presc.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex justify-between items-start gap-4">
                    <div>
                      <span className="font-bold text-slate-200 text-xs">{presc.item_name}</span>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold">{presc.instructions}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono">Pending</span>
                  </div>
                ))}

                {pendingPrescriptions.length === 0 && (
                  <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center">
                    Warning: No pending prescriptions found. Verify if items were ordered by clinician.
                  </div>
                )}
              </div>

              {pendingPrescriptions.length > 0 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition mt-4"
                >
                  {loading ? 'Dispensing...' : 'Confirm Dispensing & Decrement Inventory'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Stock Levels Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-teal-400" /> Pharmacy Inventory Stock
            </h3>
            <p className="text-[10px] text-slate-500">Live decrement simulation</p>
          </div>
          <button
            onClick={handleRestock}
            className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
          >
            <RefreshCw size={10} /> Restock
          </button>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {inventory.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-950/50 border border-slate-850 rounded-lg">
              <span className="font-semibold text-slate-300">{item.name}</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                item.stock < 100 ? 'text-red-400 bg-red-950/20 border border-red-500/20' : 'text-slate-350 bg-slate-850'
              }`}>
                {item.stock} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
