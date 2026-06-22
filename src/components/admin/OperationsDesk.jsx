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
  ClipboardList,
  Package,
  TrendingUp,
  Droplet,
  Zap,
  Search,
  Filter,
  ArrowUpDown,
  History
} from 'lucide-react';

export default function OperationsDesk({ user }) {
  // Tabs: 'inventory', 'purchases', 'utilities', 'sales'
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // Loading & Message States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Forms & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // New Inventory Item Form
  const [newInvName, setNewInvName] = useState('');
  const [newInvCategory, setNewInvCategory] = useState('pharmaceutical');
  const [newInvUnit, setNewInvUnit] = useState('Box of 100');
  const [newInvPrice, setNewInvPrice] = useState('');
  const [newInvStock, setNewInvStock] = useState(0);
  const [newInvMinReorder, setNewInvMinReorder] = useState(5);
  
  // Stock Adjustment Drawer
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustType, setAdjustType] = useState('stock_in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');
  
  // New Purchase Form
  const [purName, setPurName] = useState('');
  const [purQty, setPurQty] = useState(1);
  const [purCost, setPurCost] = useState('');
  const [purSupplier, setPurSupplier] = useState('');
  
  // New Utility Record Form
  const [utilName, setUtilName] = useState('');
  const [utilPeriod, setUtilPeriod] = useState('');
  const [utilAmount, setUtilAmount] = useState('');
  const [utilStatus, setUtilStatus] = useState('unpaid');

  // Trigger load on mount & when tab changes
  useEffect(() => {
    fetchData();
  }, [user.facility_id, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setInventory(data || []);
      } else if (activeTab === 'purchases') {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPurchases(data || []);
      } else if (activeTab === 'utilities') {
        const { data, error } = await supabase
          .from('utility_records')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUtilities(data || []);
      } else if (activeTab === 'sales') {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setInvoices(data || []);
      }
    } catch (err) {
      console.error(`Error loading data for ${activeTab}:`, err);
      showMsg('error', `Failed to load ${activeTab} data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Add inventory item
  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!newInvName || !newInvUnit || newInvPrice === '') {
      showMsg('error', 'Please fill in all inventory item details.');
      return;
    }
    
    try {
      const price = parseFloat(newInvPrice);
      const stock = parseInt(newInvStock, 10);
      const minLevel = parseInt(newInvMinReorder, 10);

      if (price < 0 || stock < 0 || minLevel < 0) {
        showMsg('error', 'Quantities and prices must be positive numbers.');
        return;
      }

      const itemId = 'inv_' + Math.random().toString(36).substring(2, 12);
      const newItem = {
        id: itemId,
        facility_id: user.facility_id,
        name: newInvName,
        category: newInvCategory,
        unit_of_measure: newInvUnit,
        unit_price: price,
        quantity_in_stock: stock,
        min_reorder_level: minLevel
      };

      const { error } = await supabase.from('inventory_items').insert(newItem);
      if (error) throw error;

      // Log initial stock transaction if stock > 0
      if (stock > 0) {
        const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
        await supabase.from('inventory_transactions').insert({
          id: txId,
          facility_id: user.facility_id,
          item_id: itemId,
          transaction_type: 'stock_in',
          quantity: stock,
          notes: 'Initial inventory setup',
          recorded_by: user.id
        });
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Inventory Added',
        details: `Created new inventory item "${newInvName}" in category "${newInvCategory}" with ${stock} initial stock.`
      });

      showMsg('success', `Inventory item "${newInvName}" added successfully.`);
      setNewInvName('');
      setNewInvPrice('');
      setNewInvStock(0);
      setNewInvMinReorder(5);
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to create inventory item: ${err.message}`);
    }
  };

  // Adjust stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustingItem || adjustQty <= 0) {
      showMsg('error', 'Please select a valid item and positive quantity.');
      return;
    }

    try {
      const qty = parseInt(adjustQty, 10);
      let newStock = adjustingItem.quantity_in_stock;

      if (adjustType === 'stock_in' || adjustType === 'adjustment') {
        newStock += qty;
      } else {
        if (newStock < qty) {
          showMsg('error', `Insufficient stock. Current stock is ${newStock}, but trying to remove ${qty}.`);
          return;
        }
        newStock -= qty;
      }

      // 1. Update item stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity_in_stock: newStock })
        .eq('id', adjustingItem.id);
      if (updateError) throw updateError;

      // 2. Insert transaction
      const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert({
          id: txId,
          facility_id: user.facility_id,
          item_id: adjustingItem.id,
          transaction_type: adjustType,
          quantity: qty,
          notes: adjustNotes,
          recorded_by: user.id
        });
      if (txError) throw txError;

      // Audit log
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: `Stock Adjustment: ${adjustType}`,
        details: `Adjusted "${adjustingItem.name}" by ${qty} units (${adjustType}). New stock: ${newStock}.`
      });

      showMsg('success', 'Stock level adjusted successfully.');
      setAdjustingItem(null);
      setAdjustQty(1);
      setAdjustNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to adjust stock: ${err.message}`);
    }
  };

  // Delete inventory item
  const handleDeleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete the inventory item "${itemName}"? All associated transactions will be deleted.`)) {
      return;
    }
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Inventory Deleted',
        details: `Deleted inventory item "${itemName}".`
      });

      showMsg('success', `Item "${itemName}" removed from inventory.`);
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to delete item: ${err.message}`);
    }
  };

  // Submit Purchase Requisition
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!purName || purQty <= 0 || !purCost || !purSupplier) {
      showMsg('error', 'Please fill in all order requirements.');
      return;
    }

    try {
      const cost = parseFloat(purCost);
      const qty = parseInt(purQty, 10);

      if (cost < 0 || qty <= 0) {
        showMsg('error', 'Valid cost and positive quantity are required.');
        return;
      }

      const newPurchase = {
        id: 'po_' + Math.random().toString(36).substring(2, 12),
        facility_id: user.facility_id,
        item_name: purName,
        quantity: qty,
        estimated_cost: cost,
        supplier: purSupplier,
        status: 'Pending Approval'
      };

      const { error } = await supabase.from('purchases').insert(newPurchase);
      if (error) throw error;

      // Audit log hook
      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Procurement Request',
        details: `Created new procurement request for "${purName}" (${qty} units) valued KES ${cost}.`
      });

      showMsg('success', `Requisition order for "${purName}" submitted successfully!`);
      setPurName('');
      setPurQty(1);
      setPurCost('');
      setPurSupplier('');
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to submit requisition: ${err.message}`);
    }
  };

  // Update Requisition Status
  const handleUpdatePurchaseStatus = async (purchase, newStatus) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus })
        .eq('id', purchase.id);
      if (error) throw error;

      // If marked Delivered, automatically credit/add quantity to live inventory
      if (newStatus === 'Delivered') {
        // Search for existing item with matching name (case-insensitive)
        const { data: existingItems, error: itemsError } = await supabase
          .from('inventory_items')
          .select('*');
        if (itemsError) throw itemsError;

        const matchingItem = existingItems.find(
          item => item.name.toLowerCase().trim() === purchase.item_name.toLowerCase().trim()
        );

        if (matchingItem) {
          const newQty = matchingItem.quantity_in_stock + purchase.quantity;
          const { error: qtyError } = await supabase
            .from('inventory_items')
            .update({ quantity_in_stock: newQty })
            .eq('id', matchingItem.id);
          if (qtyError) throw qtyError;

          // Record Transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
          await supabase.from('inventory_transactions').insert({
            id: txId,
            facility_id: user.facility_id,
            item_id: matchingItem.id,
            transaction_type: 'stock_in',
            quantity: purchase.quantity,
            reference_id: purchase.id,
            notes: `Purchase order delivered: ${purchase.supplier}`,
            recorded_by: user.id
          });
        } else {
          // Create new item in inventory
          const newItemId = 'inv_' + Math.random().toString(36).substring(2, 12);
          const newItem = {
            id: newItemId,
            facility_id: user.facility_id,
            name: purchase.item_name,
            category: 'consumable', // default category
            unit_of_measure: 'units',
            unit_price: parseFloat((purchase.estimated_cost / purchase.quantity).toFixed(2)),
            quantity_in_stock: purchase.quantity,
            min_reorder_level: 5
          };

          const { error: insertError } = await supabase
            .from('inventory_items')
            .insert(newItem);
          if (insertError) throw insertError;

          // Record Transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
          await supabase.from('inventory_transactions').insert({
            id: txId,
            facility_id: user.facility_id,
            item_id: newItemId,
            transaction_type: 'stock_in',
            quantity: purchase.quantity,
            reference_id: purchase.id,
            notes: `Purchase order delivered: ${purchase.supplier} (New Item Auto-Created)`,
            recorded_by: user.id
          });
        }
      }

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: `Procurement Status: ${newStatus}`,
        details: `Updated procurement requisition status for "${purchase.item_name}" to ${newStatus.toUpperCase()}.`
      });

      showMsg('success', `Requisition status updated to ${newStatus}!`);
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to update status: ${err.message}`);
    }
  };

  // Delete purchase requisition
  const handleDeletePurchase = async (orderId, orderName) => {
    if (!window.confirm(`Are you sure you want to delete the requisition for "${orderName}"?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', orderId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Procurement Deleted',
        details: `Deleted procurement requisition for "${orderName}".`
      });

      showMsg('success', 'Requisition order removed.');
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to delete purchase requisition: ${err.message}`);
    }
  };

  // Create utility bill record
  const handleCreateUtility = async (e) => {
    e.preventDefault();
    if (!utilName || !utilPeriod || !utilAmount) {
      showMsg('error', 'Please fill in all utility details.');
      return;
    }

    try {
      const amt = parseFloat(utilAmount);
      if (amt < 0) {
        showMsg('error', 'Utility bill amount cannot be negative.');
        return;
      }

      const newUtility = {
        id: 'ut_' + Math.random().toString(36).substring(2, 12),
        facility_id: user.facility_id,
        utility_name: utilName,
        billing_period: utilPeriod,
        amount: amt,
        payment_status: utilStatus
      };

      const { error } = await supabase.from('utility_records').insert(newUtility);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Utility Record Logged',
        details: `Logged utility "${utilName}" bill of KES ${amt} for ${utilPeriod} as ${utilStatus.toUpperCase()}.`
      });

      showMsg('success', `Utility bill for "${utilName}" recorded successfully!`);
      setUtilName('');
      setUtilPeriod('');
      setUtilAmount('');
      setUtilStatus('unpaid');
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to log utility: ${err.message}`);
    }
  };

  // Toggle utility bill payment status
  const handleToggleUtilityPayment = async (record) => {
    try {
      const nextStatus = record.payment_status === 'paid' ? 'unpaid' : 'paid';
      const { error } = await supabase
        .from('utility_records')
        .update({ payment_status: nextStatus })
        .eq('id', record.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Utility Payment Toggle',
        details: `Changed utility bill "${record.utility_name}" (${record.billing_period}) payment status to ${nextStatus.toUpperCase()}.`
      });

      showMsg('success', `Utility status marked as ${nextStatus.toUpperCase()}!`);
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to toggle payment status: ${err.message}`);
    }
  };

  // Delete utility record
  const handleDeleteUtility = async (recordId, recordName) => {
    if (!window.confirm(`Are you sure you want to delete the utility record for "${recordName}"?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('utility_records').delete().eq('id', recordId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Utility Deleted',
        details: `Deleted utility record for "${recordName}".`
      });

      showMsg('success', 'Utility record removed.');
      fetchData();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to delete utility record: ${err.message}`);
    }
  };

  // Calculate statistics across datasets
  const totalReorderLevelAlerts = inventory.filter(item => item.quantity_in_stock <= item.min_reorder_level).length;
  const pendingPurchasesCount = purchases.filter(o => o.status === 'Pending Approval').length;
  const monthlyUtilityTotalSpend = utilities
    .filter(u => u.payment_status === 'paid')
    .reduce((sum, u) => sum + parseFloat(u.amount), 0);
  const totalOutpatientSalesSpend = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  // Filters for inventory items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Alert Header Notification */}
      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${
          message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Top Operations Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Low Stocks Alert */}
        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reorder Alerts</span>
            <h4 className={`text-xl font-black mt-1 font-mono ${totalReorderLevelAlerts > 0 ? 'text-red-400 animate-pulse' : 'text-slate-350'}`}>
              {totalReorderLevelAlerts} <span className="text-xs font-normal text-slate-500">items low</span>
            </h4>
          </div>
          <div className={`p-2.5 rounded-lg border ${totalReorderLevelAlerts > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
            <Package size={16} />
          </div>
        </div>

        {/* Stat 2: Pending PO Requisitions */}
        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting PO Approvals</span>
            <h4 className={`text-xl font-black mt-1 font-mono ${pendingPurchasesCount > 0 ? 'text-amber-400' : 'text-slate-350'}`}>
              {pendingPurchasesCount} <span className="text-xs font-normal text-slate-500">pending</span>
            </h4>
          </div>
          <div className={`p-2.5 rounded-lg border ${pendingPurchasesCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
            <ClipboardList size={16} />
          </div>
        </div>

        {/* Stat 3: Utilities Costs (Paid) */}
        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Utilities Paid</span>
            <h4 className="text-xl font-black text-blue-400 mt-1 font-mono">
              KES {monthlyUtilityTotalSpend.toLocaleString()}
            </h4>
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <Zap size={16} />
          </div>
        </div>

        {/* Stat 4: Outpatient Dynamic Sales */}
        <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dynamic Billed Sales (Paid)</span>
            <h4 className="text-xl font-black text-teal-400 mt-1 font-mono">
              KES {totalOutpatientSalesSpend.toLocaleString()}
            </h4>
          </div>
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
            <DollarSign size={16} />
          </div>
        </div>
      </div>

      {/* Tab Navigation selectors */}
      <div className="flex border-b border-slate-850 gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'inventory' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inventory Stocks
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'purchases' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Purchases & Requisitions
        </button>
        <button
          onClick={() => setActiveTab('utilities')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'utilities' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Utilities Expenses
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'sales' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Operational Sales (Billing)
        </button>
      </div>

      {/* Tab Contents: INVENTORY ITEMS */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Inventory list column */}
          <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Package size={12} className="text-teal-400" /> Hospital Inventory Registry
              </h5>
              {/* Search & Category Filter */}
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <Search size={11} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-full sm:w-44 font-sans"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-slate-300 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Categories</option>
                  <option value="pharmaceutical">Pharmaceuticals</option>
                  <option value="surgical">Surgical/Medical</option>
                  <option value="consumable">Utilities/Consumables</option>
                  <option value="asset">General Assets</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500 text-xs">Loading inventory registry...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">No items match search or category criteria.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-900 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-3">Item details</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-center">In Stock</th>
                      <th className="py-2.5 px-3 text-center">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                    {filteredInventory.map((item) => {
                      const isLow = item.quantity_in_stock <= item.min_reorder_level;
                      return (
                        <tr key={item.id} className={`hover:bg-slate-900/10 transition ${isLow ? 'bg-red-500/[0.01]' : ''}`}>
                          <td className="py-3 px-3">
                            <span className="text-xs text-slate-200 block font-bold">{item.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">Unit: {item.unit_of_measure} | Reorder min: {item.min_reorder_level}</span>
                          </td>
                          <td className="py-3 px-3 uppercase text-[9px]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-extrabold ${
                              item.category === 'pharmaceutical' ? 'bg-teal-500/10 text-teal-400' :
                              item.category === 'surgical' ? 'bg-purple-500/10 text-purple-400' :
                              item.category === 'consumable' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.category === 'consumable' ? 'consumable' : item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[10.5px]">
                            KES {parseFloat(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                              isLow ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {item.quantity_in_stock}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => setAdjustingItem(item)}
                                className="px-2 py-1 text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition cursor-pointer"
                                title="Adjust inventory stock level"
                              >
                                Adjust Stock
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1 text-slate-650 hover:text-red-400 border border-slate-900 hover:border-red-500/20 rounded transition cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sidebar Area: Add item form OR stock adjustment drawer */}
          <div className="space-y-6">
            {/* 1. Quick Stock Adjustment Drawer */}
            {adjustingItem && (
              <div className="bg-slate-955 border border-amber-500/20 rounded-xl p-5 space-y-4 shadow-md bg-gradient-to-b from-slate-950 to-slate-955 font-sans">
                <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <History size={12} /> Stock Adjustment Desk
                </h5>
                <p className="text-[10px] text-slate-400 font-sans">
                  Adjusting stock count for <strong className="text-slate-200">"{adjustingItem.name}"</strong>. Current stock: <strong className="text-slate-200">{adjustingItem.quantity_in_stock}</strong>.
                </p>

                <form onSubmit={handleAdjustStock} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adjustment Action</label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    >
                      <option value="stock_in">Stock In (+) - Received Supplies</option>
                      <option value="stock_out">Stock Out (-) - Expired/Damaged/Lost</option>
                      <option value="sale">Sale (-) - Outpatient Dispensation</option>
                      <option value="adjustment">Manual Inventory Audit Correction (+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adjustment Quantity</label>
                    <input
                      type="number"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      min={1}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Audit/Adjustment Notes</label>
                    <textarea
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      placeholder="e.g. Expired batch removal, physical stock count check"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-650 focus:border-teal-500 transition resize-none font-sans"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg shadow-md transition cursor-pointer"
                    >
                      Process Adjustment
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustingItem(null)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. Add New Inventory Item Form */}
            <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
              <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <PlusCircle size={12} className="text-teal-400" /> Register Inventory Item
              </h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                Register a new medical device, pharmaceutical, or consumable supply into the live facility stock registry.
              </p>

              <form onSubmit={handleAddInventory} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Item Registry Name</label>
                  <input
                    type="text"
                    value={newInvName}
                    onChange={(e) => setNewInvName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg Tablets"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Category</label>
                    <select
                      value={newInvCategory}
                      onChange={(e) => setNewInvCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    >
                      <option value="pharmaceutical">Pharmaceutical</option>
                      <option value="surgical">Surgical/Medical</option>
                      <option value="consumable">Utility/Consumable</option>
                      <option value="asset">General Asset</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Unit of Measure</label>
                    <input
                      type="text"
                      value={newInvUnit}
                      onChange={(e) => setNewInvUnit(e.target.value)}
                      placeholder="e.g. Box of 100"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInvPrice}
                      onChange={(e) => setNewInvPrice(e.target.value)}
                      placeholder="150"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Initial Stock</label>
                    <input
                      type="number"
                      value={newInvStock}
                      onChange={(e) => setNewInvStock(e.target.value)}
                      min={0}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Min Reorder</label>
                    <input
                      type="number"
                      value={newInvMinReorder}
                      onChange={(e) => setNewInvMinReorder(e.target.value)}
                      min={1}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer font-sans"
                >
                  Register Inventory Item
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: PURCHASES & REQUISITIONS */}
      {activeTab === 'purchases' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Requisitions List */}
          <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <ShoppingBag size={12} className="text-teal-400" /> Purchase Requisitions Queue
            </h5>

            {loading ? (
              <div className="p-10 text-center text-slate-500 text-xs">Loading requisitions queue...</div>
            ) : purchases.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">No requisitions submitted yet.</div>
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
                    {purchases.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-900/10 transition">
                        <td className="py-3 px-3">
                          <span className="text-xs text-slate-200 block font-bold truncate max-w-[170px]" title={o.item_name}>
                            {o.item_name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">Quantity: {o.quantity}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[10px] truncate max-w-[130px]" title={o.supplier}>
                          {o.supplier}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[10.5px]">
                          KES {parseFloat(o.estimated_cost).toLocaleString()}
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
                                  onClick={() => handleUpdatePurchaseStatus(o, 'Approved')}
                                  className="p-1 text-teal-400 hover:bg-teal-500/10 border border-slate-800 rounded transition cursor-pointer"
                                  title="Approve Order"
                                >
                                  <CheckCircle2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleUpdatePurchaseStatus(o, 'Rejected')}
                                  className="p-1 text-red-400 hover:bg-red-500/10 border border-slate-800 rounded transition cursor-pointer"
                                  title="Reject Order"
                                >
                                  <XCircle size={12} />
                                </button>
                              </>
                            )}
                            {o.status === 'Approved' && (
                              <button
                                onClick={() => handleUpdatePurchaseStatus(o, 'Delivered')}
                                className="p-1 text-blue-400 hover:bg-blue-500/10 border border-slate-800 rounded transition cursor-pointer"
                                title="Mark as Delivered & Credit Inventory"
                              >
                                <Truck size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePurchase(o.id, o.item_name)}
                              className="p-1 text-slate-650 hover:text-red-450 border border-slate-900 rounded transition cursor-pointer"
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

          {/* New Requisition Form */}
          <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit font-sans">
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <PlusCircle size={12} className="text-teal-400" /> New Supply Requisition
            </h5>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Submit a purchase request for hospital inventory. Approving and delivering orders automatically credits the active stock count in the registry.
            </p>

            <form onSubmit={handleCreatePurchase} className="space-y-4 font-sans">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supply Item Name</label>
                <input
                  type="text"
                  value={purName}
                  onChange={(e) => setPurName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg Tablets"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Order Quantity</label>
                  <input
                    type="number"
                    value={purQty}
                    onChange={(e) => setPurQty(e.target.value)}
                    min={1}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimated Cost (KES)</label>
                  <input
                    type="number"
                    step="1"
                    value={purCost}
                    onChange={(e) => setPurCost(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Supplier / Vendor</label>
                <input
                  type="text"
                  value={purSupplier}
                  onChange={(e) => setPurSupplier(e.target.value)}
                  placeholder="Kenya Medical Supplies Authority (KEMSA)"
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
      )}

      {/* Tab Contents: UTILITIES TRACKER */}
      {activeTab === 'utilities' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Utilities list column */}
          <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <Zap size={12} className="text-teal-400" /> Utility Bill Registry
            </h5>

            {loading ? (
              <div className="p-10 text-center text-slate-500 text-xs">Loading utilities bills...</div>
            ) : utilities.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">No utility bill records logged.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-900 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-3">Utility Name</th>
                      <th className="py-2.5 px-3 text-center">Billing Period</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                    {utilities.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/10 transition">
                        <td className="py-3 px-3">
                          <span className="text-xs text-slate-200 block font-bold">{record.utility_name}</span>
                          <span className="text-[9px] text-slate-550">Logged: {new Date(record.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {record.billing_period}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[10.5px]">
                          KES {parseFloat(record.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleUtilityPayment(record)}
                            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider transition border cursor-pointer ${
                              record.payment_status === 'paid'
                                ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                            title={`Toggle status to ${record.payment_status === 'paid' ? 'UNPAID' : 'PAID'}`}
                          >
                            {record.payment_status}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDeleteUtility(record.id, record.utility_name)}
                              className="p-1 text-slate-600 hover:text-red-400 border border-slate-900 rounded transition cursor-pointer"
                              title="Delete Utility Bill"
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

          {/* Utility creation form */}
          <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit font-sans">
            <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <PlusCircle size={12} className="text-teal-400" /> Log Utility Expense
            </h5>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Track recurring utility invoices (electricity, water, laundry, waste disposal, internet) to monitor facility operations overheads.
            </p>

            <form onSubmit={handleCreateUtility} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Utility Expense Name</label>
                <input
                  type="text"
                  value={utilName}
                  onChange={(e) => setUtilName(e.target.value)}
                  placeholder="e.g. Nairobi Water Bill"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Period</label>
                  <input
                    type="text"
                    value={utilPeriod}
                    onChange={(e) => setUtilPeriod(e.target.value)}
                    placeholder="e.g. June 2026"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bill Amount (KES)</label>
                  <input
                    type="number"
                    step="1"
                    value={utilAmount}
                    onChange={(e) => setUtilAmount(e.target.value)}
                    placeholder="3200"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Payment Status</label>
                <select
                  value={utilStatus}
                  onChange={(e) => setUtilStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                >
                  <option value="unpaid">Unpaid / Outstanding Invoice</option>
                  <option value="paid">Paid / Settled Invoice</option>
                </select>
              </div>

              <button
                type="submit"
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
              >
                Log Utility Bill
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Contents: OPERATIONAL SALES */}
      {activeTab === 'sales' && (
        <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md font-sans">
          <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <DollarSign size={12} className="text-teal-400" /> Dynamic Sales Billing Ledger
          </h5>
          <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
            Lists patient service sales generated dynamically from the facility cashiers and outpatient check-out panels. Only paid receipts count towards dynamic outpatient revenue sums.
          </p>

          {loading ? (
            <div className="p-10 text-center text-slate-500 text-xs font-sans">Loading billing sales registry...</div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs font-sans">No sales invoices logged.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">Invoice ID</th>
                    <th className="py-2.5 px-3">Billing Date</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 px-3 font-mono text-[10px]">
                        #{inv.id}
                      </td>
                      <td className="py-3 px-3 text-slate-450 font-mono text-[10px]">
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[10px] uppercase font-bold">
                        {inv.payment_method || 'cash'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[10.5px]">
                        KES {parseFloat(inv.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          inv.status === 'paid' 
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
