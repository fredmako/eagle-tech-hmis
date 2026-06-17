import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ShoppingBag, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Trash2, 
  AlertCircle, 
  DollarSign, 
  ClipboardList
} from 'lucide-react';

export default function ProcurementDesk({ user }) {
  const [orders, setOrders] = useState([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const STORAGE_KEY = `egesa_procurements_${user.facility_id}`;

  useEffect(() => {
    // Load saved procurement orders from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse procurement orders:', e);
        setOrders(getSeedOrders());
      }
    } else {
      const initial = getSeedOrders();
      setOrders(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, [user.facility_id]);

  const getSeedOrders = () => [
    {
      id: 'po_seed1',
      item_name: 'Paracetamol 500mg Tablets (100 Boxes)',
      quantity: 100,
      estimated_cost: 450.00,
      supplier: 'Medipharm Distributors',
      status: 'Delivered',
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString() // 5 days ago
    },
    {
      id: 'po_seed2',
      item_name: 'Sterile Surgical Gloves (Box of 50)',
      quantity: 20,
      estimated_cost: 180.00,
      supplier: 'Beta Care Supplies',
      status: 'Approved',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString() // 2 days ago
    },
    {
      id: 'po_seed3',
      item_name: 'Sphygmomanometer Blood Pressure Monitor',
      quantity: 5,
      estimated_cost: 250.00,
      supplier: 'Philips Medical Systems',
      status: 'Pending Approval',
      created_at: new Date().toISOString()
    }
  ];

  const saveOrders = (updatedList) => {
    setOrders(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    if (!itemName || !quantity || !estimatedCost || !supplier) {
      setMessage({ type: 'error', text: 'Please fill in all order requirements.' });
      return;
    }

    const newOrder = {
      id: 'po_' + Math.random().toString(36).substring(2, 12),
      item_name: itemName,
      quantity: parseInt(quantity),
      estimated_cost: parseFloat(estimatedCost),
      supplier: supplier,
      status: 'Pending Approval',
      created_at: new Date().toISOString()
    };

    const updated = [newOrder, ...orders];
    saveOrders(updated);

    // Audit log hook
    try {
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Procurement Request',
        details: `Created new procurement request for "${itemName}" (${quantity} units) valued at $${estimatedCost}.`
      });
    } catch (err) {
      console.warn('[Procurement Audit] Failed to write audit log:', err);
    }

    setMessage({ type: 'success', text: `Requisition order for "${itemName}" submitted successfully!` });
    setItemName('');
    setQuantity(1);
    setEstimatedCost('');
    setSupplier('');
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    saveOrders(updated);

    try {
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: `Procurement Status: ${newStatus}`,
        details: `Updated procurement requisition status for "${order?.item_name}" to ${newStatus.toUpperCase()}.`
      });
    } catch (err) {
      console.warn('[Procurement Audit] Failed to write audit log:', err);
    }

    setMessage({ type: 'success', text: `Requisition status updated to ${newStatus}!` });
  };

  const handleDeleteOrder = async (orderId, orderName) => {
    if (!window.confirm(`Are you sure you want to delete the requisition for "${orderName}"?`)) {
      return;
    }
    const updated = orders.filter(o => o.id !== orderId);
    saveOrders(updated);

    try {
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Procurement Deleted',
        details: `Deleted procurement requisition for "${orderName}".`
      });
    } catch (err) {
      console.warn('[Procurement Audit] Failed to write audit log:', err);
    }

    setMessage({ type: 'success', text: 'Requisition order removed.' });
  };

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending Approval').length;
  const totalSpend = orders
    .filter(o => o.status === 'Approved' || o.status === 'Delivered')
    .reduce((sum, o) => sum + o.estimated_cost, 0);

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Procurement Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Requisitions</span>
            <h4 className="text-xl font-black text-white mt-1 font-mono">{totalOrders}</h4>
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <ClipboardList size={16} />
          </div>
        </div>

        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Review</span>
            <h4 className={`text-xl font-black mt-1 font-mono ${pendingOrders > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>{pendingOrders}</h4>
          </div>
          <div className={`p-2.5 rounded-lg border ${pendingOrders > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
            <ClockIcon size={16} />
          </div>
        </div>

        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Capital Spend</span>
            <h4 className="text-xl font-black text-teal-400 mt-1 font-mono">${totalSpend.toFixed(2)}</h4>
          </div>
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
            <DollarSign size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Columns: Orders table (2/3 width on xl) */}
        <div className="xl:col-span-2 bg-slate-955 border border-slate-850 rounded-xl p-5 space-y-4 shadow-md">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <ShoppingBag size={12} className="text-teal-400" /> Purchase Requisitions Queue
          </h5>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              <span>No procurement orders submitted yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">Item Details</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-200 block truncate max-w-[150px]" title={o.item_name}>
                          {o.item_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Qty: {o.quantity}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[10px] truncate max-w-[100px]" title={o.supplier}>
                        {o.supplier}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[10.5px]">
                        ${o.estimated_cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          o.status === 'Delivered' 
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : o.status === 'Approved'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : o.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/5 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center gap-1.5">
                          {o.status === 'Pending Approval' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(o.id, 'Approved')}
                                className="p-1 text-teal-400 hover:bg-teal-500/10 border border-slate-800 rounded transition cursor-pointer"
                                title="Approve Order"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(o.id, 'Rejected')}
                                className="p-1 text-red-400 hover:bg-red-500/10 border border-slate-800 rounded transition cursor-pointer"
                                title="Reject Order"
                              >
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          {o.status === 'Approved' && (
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'Delivered')}
                              className="p-1 text-blue-400 hover:bg-blue-500/10 border border-slate-800 rounded transition cursor-pointer"
                              title="Mark as Delivered"
                            >
                              <Truck size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(o.id, o.item_name)}
                            className="p-1 text-slate-500 hover:text-red-400 border border-slate-800 rounded hover:border-red-500/20 transition cursor-pointer"
                            title="Delete Requisition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Order Request Form (1/3 width on xl) */}
        <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <PlusCircle size={12} className="text-teal-400" /> New Supply Requisition
          </h5>
          <p className="text-[10px] text-slate-500 leading-relaxed font-sans">Submit a purchase request for hospital inventory. Approving orders updates your capital expenditure charts.</p>

          <form onSubmit={handleCreateRequisition} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Supply Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Digital Thermometers (Pack of 10)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Order Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={1}
                  max={50000}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Estimated Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="120.00"
                  min={0.1}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Target Supplier / Vendor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Global Health Supplies"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
            >
              Submit Requisition Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Simple placeholder icon helper if lucide clock is missing
function ClockIcon({ size = 16, className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
