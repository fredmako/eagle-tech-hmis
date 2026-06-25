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
  History,
  Users,
  FileText,
  Check,
  Calendar,
  Building,
  Plus,
  Eye,
  ArrowRight
} from 'lucide-react';

export default function OperationsDesk({ user }) {
  // Tabs: 'inventory', 'purchases', 'utilities', 'sales'
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Procurement Module States
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [storeRequisitions, setStoreRequisitions] = useState([]);
  const [stockReceipts, setStockReceipts] = useState([]);
  const [stockReceiptItems, setStockReceiptItems] = useState([]);
  const [procurementSubTab, setProcurementSubTab] = useState('suppliers');

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTaxPin, setSupTaxPin] = useState('');

  // LPO Form State
  const [lpoSupplier, setLpoSupplier] = useState('');
  const [lpoStore, setLpoStore] = useState('MAIN STORE');
  const [lpoDate, setLpoDate] = useState(new Date().toISOString().split('T')[0]);
  const [lpoItems, setLpoItems] = useState([]);
  const [lpoCurrentItemName, setLpoCurrentItemName] = useState('');
  const [lpoCurrentQty, setLpoCurrentQty] = useState(1);
  const [lpoCurrentPrice, setLpoCurrentPrice] = useState(0);

  // Direct Stock Receipt Form State
  const [recPoId, setRecPoId] = useState('');
  const [recInvoice, setRecInvoice] = useState('');
  const [recSupplierId, setRecSupplierId] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recComments, setRecComments] = useState('');
  const [recItems, setRecItems] = useState([]);
  const [recCurrentItemName, setRecCurrentItemName] = useState('');
  const [recCurrentBatch, setRecCurrentBatch] = useState('');
  const [recCurrentExpiry, setRecCurrentExpiry] = useState(new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0]);
  const [recCurrentQty, setRecCurrentQty] = useState(1);
  const [recCurrentPrice, setRecCurrentPrice] = useState(0);
  const [recCurrentStore, setRecCurrentStore] = useState('MAIN STORE');

  // Store Requisition Form State
  const [reqRequestingStore, setReqRequestingStore] = useState('PHARMACY STORE');
  const [reqSupplyingStore, setReqSupplyingStore] = useState('MAIN STORE');
  const [reqComments, setReqComments] = useState('');
  const [reqItems, setReqItems] = useState([]);
  const [reqCurrentItemName, setReqCurrentItemName] = useState('');
  const [reqCurrentQty, setReqCurrentQty] = useState(1);

  // Detail / Processing Selection States
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [selectedRequisitionItems, setSelectedRequisitionItems] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedReceiptItems, setSelectedReceiptItems] = useState([]);
  const [requisitionApprovals, setRequisitionApprovals] = useState({}); // { itemId: quantity_approved }
  
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
        await Promise.all([
          fetchSuppliers(),
          fetchPurchaseOrders(),
          fetchStoreRequisitions(),
          fetchStockReceipts(),
          fetchStockReceiptItems()
        ]);
        // Keep legacy purchases for compatibility
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) setPurchases(data || []);
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

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('Error fetching suppliers:', error);
    else setSuppliers(data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching POs:', error);
    else setPurchaseOrders(data || []);
  };

  const fetchStoreRequisitions = async () => {
    const { data, error } = await supabase
      .from('store_requisitions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching requisitions:', error);
    else setStoreRequisitions(data || []);
  };

  const fetchStockReceipts = async () => {
    const { data, error } = await supabase
      .from('stock_receipts')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching receipts:', error);
    else setStockReceipts(data || []);
  };

  const fetchStockReceiptItems = async () => {
    const { data, error } = await supabase
      .from('stock_receipt_items')
      .select('*, stock_receipts(invoice_number, received_date, suppliers(name))')
      .order('id', { ascending: false });
    if (error) console.error('Error fetching stock receipt items:', error);
    else setStockReceiptItems(data || []);
  };

  const fetchPOItems = async (poId) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', poId);
    if (error) {
      console.error('Error fetching PO items:', error);
      return [];
    }
    return data || [];
  };

  const fetchRequisitionItems = async (reqId) => {
    const { data, error } = await supabase
      .from('store_requisition_items')
      .select('*')
      .eq('requisition_id', reqId);
    if (error) {
      console.error('Error fetching requisition items:', error);
      return [];
    }
    return data || [];
  };

  const fetchReceiptItems = async (receiptId) => {
    const { data, error } = await supabase
      .from('stock_receipt_items')
      .select('*')
      .eq('receipt_id', receiptId);
    if (error) {
      console.error('Error fetching receipt items:', error);
      return [];
    }
    return data || [];
  };

  const handleSelectPO = async (po) => {
    setSelectedPO(po);
    const items = await fetchPOItems(po.id);
    setSelectedPOItems(items);
  };

  const handleSelectRequisition = async (req) => {
    setSelectedRequisition(req);
    const items = await fetchRequisitionItems(req.id);
    setSelectedRequisitionItems(items);
    const approvals = {};
    items.forEach(item => {
      approvals[item.id] = item.quantity_requested;
    });
    setRequisitionApprovals(approvals);
  };

  const handleSelectReceipt = async (receipt) => {
    setSelectedReceipt(receipt);
    const items = await fetchReceiptItems(receipt.id);
    setSelectedReceiptItems(items);
  };

  const getItemStockForStore = (itemName, storeName) => {
    const match = inventory.find(item => item.name.toLowerCase().trim() === itemName.toLowerCase().trim());
    if (!match) return 0;
    if (storeName === 'MAIN STORE') {
      return match.quantity_in_stock;
    } else {
      return Math.max(0, Math.floor(match.quantity_in_stock * 0.12));
    }
  };

  const handlePoSelectForReceipt = async (poId) => {
    setRecPoId(poId);
    if (!poId) {
      setRecItems([]);
      setRecSupplierId('');
      return;
    }
    const po = purchaseOrders.find(o => o.id === poId);
    if (po) {
      setRecSupplierId(po.supplier_id);
      setRecCurrentStore(po.requesting_store);
      const items = await fetchPOItems(poId);
      const mapped = items.map(item => ({
        item_name: item.item_name,
        batch_number: '',
        expiry_date: new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
        quantity_received: item.quantity_ordered - item.quantity_received,
        buy_price: item.unit_price,
        store_name: po.requesting_store
      }));
      setRecItems(mapped);
    }
  };

  const handleUpdateRecItem = (index, field, value) => {
    setRecItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handleExportReceiptsCSV = () => {
    const headers = ['Date', 'Invoice', 'BatchNo', 'Item', 'ExpiryDate', 'Supplier', 'Quantity', 'BuyPrice', 'ReceivedBy'];
    const filtered = stockReceiptItems.filter(item => {
      const keywords = (searchQuery || '').toLowerCase().trim();
      if (!keywords) return true;
      const matchInvoice = (item.stock_receipts?.invoice_number || '').toLowerCase().includes(keywords);
      const matchBatch = (item.batch_number || '').toLowerCase().includes(keywords);
      const matchSupplier = (item.stock_receipts?.suppliers?.name || '').toLowerCase().includes(keywords);
      const matchDrug = (item.item_name || '').toLowerCase().includes(keywords);
      return matchInvoice || matchBatch || matchSupplier || matchDrug;
    });
    
    const rows = filtered.map(item => [
      item.stock_receipts?.received_date || '',
      item.stock_receipts?.invoice_number || '',
      item.batch_number || '',
      item.item_name || '',
      item.expiry_date || '',
      item.stock_receipts?.suppliers?.name || '',
      item.quantity_received || '',
      item.buy_price || '',
      'Staff Admin'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Received_Items_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // 1. Supplier Register Handler
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supName) {
      showMsg('error', 'Supplier name is required.');
      return;
    }
    try {
      const supId = 'sup_' + Math.random().toString(36).substring(2, 12);
      const newSupplier = {
        id: supId,
        facility_id: user.facility_id,
        name: supName,
        email: supEmail || null,
        phone: supPhone || null,
        address: supAddress || null,
        tax_pin: supTaxPin || null,
        is_active: true
      };

      const { error } = await supabase.from('suppliers').insert(newSupplier);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Supplier Registered',
        details: `Registered supplier "${supName}" (Tax PIN: ${supTaxPin || 'N/A'}).`
      });

      showMsg('success', `Supplier "${supName}" registered successfully.`);
      setSupName('');
      setSupEmail('');
      setSupPhone('');
      setSupAddress('');
      setSupTaxPin('');
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to register supplier: ${err.message}`);
    }
  };

  // 2. Create Purchase Order (LPO) Handler
  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    if (!lpoSupplier) {
      showMsg('error', 'Please select a supplier.');
      return;
    }
    if (lpoItems.length === 0) {
      showMsg('error', 'Please add at least one item to the purchase order.');
      return;
    }

    try {
      const poId = 'LPO-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const totalCost = lpoItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const newPO = {
        id: poId,
        facility_id: user.facility_id,
        supplier_id: lpoSupplier,
        requesting_store: lpoStore,
        order_date: lpoDate,
        status: 'pending_approval',
        created_by: user.id,
        estimated_total: totalCost
      };

      const { error: poError } = await supabase.from('purchase_orders').insert(newPO);
      if (poError) throw poError;

      const itemInserts = lpoItems.map(item => ({
        id: 'poi_' + Math.random().toString(36).substring(2, 12),
        po_id: poId,
        item_name: item.item_name,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_price: item.unit_price
      }));

      const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemInserts);
      if (itemsError) throw itemsError;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'LPO Created',
        details: `Created Local Purchase Order ${poId} with ${lpoItems.length} items, total KES ${totalCost.toLocaleString()}.`
      });

      showMsg('success', `Purchase Order ${poId} submitted for approval.`);
      setLpoSupplier('');
      setLpoItems([]);
      setLpoCurrentItemName('');
      setLpoCurrentQty(1);
      setLpoCurrentPrice(0);
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to create purchase order: ${err.message}`);
    }
  };

  // 3. Approve LPO
  const handleApprovePO = async (poId) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'approved', approved_by: user.id })
        .eq('id', poId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'LPO Approved',
        details: `Approved Local Purchase Order ${poId}.`
      });

      showMsg('success', `LPO ${poId} approved successfully.`);
      fetchPurchaseOrders();
      if (selectedPO?.id === poId) {
        setSelectedPO(prev => prev ? { ...prev, status: 'approved', approved_by: user.id } : null);
      }
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to approve LPO: ${err.message}`);
    }
  };

  // 4. Reject LPO
  const handleRejectPO = async (poId) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'rejected' })
        .eq('id', poId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'LPO Rejected',
        details: `Rejected Local Purchase Order ${poId}.`
      });

      showMsg('success', `LPO ${poId} has been rejected.`);
      fetchPurchaseOrders();
      if (selectedPO?.id === poId) {
        setSelectedPO(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to reject LPO: ${err.message}`);
    }
  };

  // 5. Confirm Stock Receipt
  const handleConfirmReceipt = async (e) => {
    e.preventDefault();
    if (!recInvoice) {
      showMsg('error', 'Invoice or receipt number is required.');
      return;
    }
    if (!recSupplierId) {
      showMsg('error', 'Supplier is required.');
      return;
    }
    if (recItems.length === 0) {
      showMsg('error', 'Please add items to receive.');
      return;
    }

    try {
      const receiptId = 'REC-' + Math.random().toString(36).substring(2, 12);
      
      const newReceipt = {
        id: receiptId,
        facility_id: user.facility_id,
        po_id: recPoId || null,
        invoice_number: recInvoice,
        supplier_id: recSupplierId,
        received_by: user.id,
        received_date: recDate,
        comments: recComments || null,
        status: 'confirmed',
        confirmed_by: user.id,
        etims_sync_status: 'pending'
      };

      const { error: recError } = await supabase.from('stock_receipts').insert(newReceipt);
      if (recError) throw recError;

      const itemsToInsert = recItems.map(item => ({
        id: 'ri_' + Math.random().toString(36).substring(2, 12),
        receipt_id: receiptId,
        item_name: item.item_name,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        quantity_received: item.quantity_received,
        buy_price: item.buy_price,
        store_name: item.store_name
      }));

      const { error: itemsError } = await supabase.from('stock_receipt_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      for (const item of recItems) {
        const { data: invItems, error: fetchInvError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('facility_id', user.facility_id);
        if (fetchInvError) throw fetchInvError;

        const match = invItems.find(i => i.name.toLowerCase().trim() === item.item_name.toLowerCase().trim());

        if (match) {
          const newQty = match.quantity_in_stock + item.quantity_received;
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ quantity_in_stock: newQty, unit_price: item.buy_price })
            .eq('id', match.id);
          if (updateError) throw updateError;

          const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
          await supabase.from('inventory_transactions').insert({
            id: txId,
            facility_id: user.facility_id,
            item_id: match.id,
            transaction_type: 'stock_in',
            quantity: item.quantity_received,
            reference_id: receiptId,
            notes: `Received Invoice ${recInvoice} (Batch ${item.batch_number})`,
            recorded_by: user.id
          });
        } else {
          const newItemId = 'inv_' + Math.random().toString(36).substring(2, 12);
          const newItem = {
            id: newItemId,
            facility_id: user.facility_id,
            name: item.item_name,
            category: 'pharmaceutical',
            unit_of_measure: 'Units',
            unit_price: item.buy_price,
            quantity_in_stock: item.quantity_received,
            min_reorder_level: 5
          };

          const { error: insertError } = await supabase.from('inventory_items').insert(newItem);
          if (insertError) throw insertError;

          const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
          await supabase.from('inventory_transactions').insert({
            id: txId,
            facility_id: user.facility_id,
            item_id: newItemId,
            transaction_type: 'stock_in',
            quantity: item.quantity_received,
            reference_id: receiptId,
            notes: `Received Invoice ${recInvoice} (New Item Auto-Created)`,
            recorded_by: user.id
          });
        }
      }

      if (recPoId) {
        const { error: poUpdateError } = await supabase
          .from('purchase_orders')
          .update({ status: 'delivered' })
          .eq('id', recPoId);
        if (poUpdateError) throw poUpdateError;

        for (const item of recItems) {
          const { data: poItems, error: poItemsFetchError } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('po_id', recPoId)
            .eq('item_name', item.item_name);
          if (!poItemsFetchError && poItems && poItems.length > 0) {
            const poItem = poItems[0];
            const newRecQty = poItem.quantity_received + item.quantity_received;
            await supabase
              .from('purchase_order_items')
              .update({ quantity_received: newRecQty })
              .eq('id', poItem.id);
          }
        }
      }

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Stock Received',
        details: `Confirmed delivery receipt ${receiptId} for invoice ${recInvoice} with ${recItems.length} items.`
      });

      showMsg('success', `Stock Receipt ${receiptId} confirmed. Inventory successfully credited.`);
      setRecPoId('');
      setRecInvoice('');
      setRecSupplierId('');
      setRecComments('');
      setRecItems([]);
      setRecCurrentItemName('');
      setRecCurrentBatch('');
      setRecCurrentQty(1);
      setRecCurrentPrice(0);
      
      fetchStockReceipts();
      fetchStockReceiptItems();
      fetchPurchaseOrders();
      
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (invData) setInventory(invData);

    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to confirm stock receipt: ${err.message}`);
    }
  };

  // 6. Create Store-to-Store Requisition
  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    if (!reqRequestingStore) {
      showMsg('error', 'Requesting department is required.');
      return;
    }
    if (reqItems.length === 0) {
      showMsg('error', 'Please add at least one item to request.');
      return;
    }

    try {
      const reqId = 'REQ-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

      const newReq = {
        id: reqId,
        facility_id: user.facility_id,
        requesting_store: reqRequestingStore,
        supplying_store: reqSupplyingStore,
        request_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        raised_by: user.id,
        comments: reqComments || null
      };

      const { error: reqError } = await supabase.from('store_requisitions').insert(newReq);
      if (reqError) throw reqError;

      const itemsToInsert = reqItems.map(item => ({
        id: 'sri_' + Math.random().toString(36).substring(2, 12),
        requisition_id: reqId,
        item_name: item.item_name,
        quantity_requested: item.quantity_requested,
        quantity_approved: 0
      }));

      const { error: itemsError } = await supabase.from('store_requisition_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Store Requisition Raised',
        details: `Raised internal store request ${reqId} from ${reqRequestingStore} to ${reqSupplyingStore} with ${reqItems.length} items.`
      });

      showMsg('success', `Internal Requisition ${reqId} raised successfully.`);
      setReqComments('');
      setReqItems([]);
      setReqCurrentItemName('');
      setReqCurrentQty(1);
      fetchStoreRequisitions();
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to submit store requisition: ${err.message}`);
    }
  };

  // 7. Process Internal Store Requisitions (Approve / Decline)
  const handleProcessRequisition = async (reqId, newStatus) => {
    try {
      if (newStatus === 'approved') {
        const items = selectedRequisitionItems;
        if (!items || items.length === 0) {
          showMsg('error', 'Requisition details missing.');
          return;
        }

        for (const item of items) {
          const approvedQty = parseInt(requisitionApprovals[item.id] || 0);
          if (approvedQty < 0) {
            showMsg('error', 'Approved quantity cannot be negative.');
            return;
          }

          if (approvedQty > 0) {
            const { data: invItems } = await supabase
              .from('inventory_items')
              .select('*')
              .eq('facility_id', user.facility_id);

            const match = invItems?.find(i => i.name.toLowerCase().trim() === item.item_name.toLowerCase().trim());
            if (!match || match.quantity_in_stock < approvedQty) {
              showMsg('error', `Insufficient stock in ${selectedRequisition.supplying_store} for item "${item.item_name}". Available: ${match ? match.quantity_in_stock : 0}.`);
              return;
            }

            const newQty = match.quantity_in_stock - approvedQty;
            const { error: updateError } = await supabase
              .from('inventory_items')
              .update({ quantity_in_stock: newQty })
              .eq('id', match.id);
            if (updateError) throw updateError;

            const { error: itemUpdateError } = await supabase
              .from('store_requisition_items')
              .update({ quantity_approved: approvedQty })
              .eq('id', item.id);
            if (itemUpdateError) throw itemUpdateError;

            const txId = 'tx_' + Math.random().toString(36).substring(2, 12);
            await supabase.from('inventory_transactions').insert({
              id: txId,
              facility_id: user.facility_id,
              item_id: match.id,
              transaction_type: 'stock_out',
              quantity: approvedQty,
              reference_id: reqId,
              notes: `Transferred to ${selectedRequisition.requesting_store} via Requisition ${reqId}`,
              recorded_by: user.id
            });
          }
        }
      }

      const { error: reqUpdateError } = await supabase
        .from('store_requisitions')
        .update({ status: newStatus, approved_by: user.id })
        .eq('id', reqId);
      if (reqUpdateError) throw reqUpdateError;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: `Store Requisition Processed: ${newStatus}`,
        details: `Processed internal requisition ${reqId} as ${newStatus.toUpperCase()}.`
      });

      showMsg('success', `Internal Requisition ${reqId} has been ${newStatus}.`);
      setSelectedRequisition(null);
      setSelectedRequisitionItems([]);
      fetchStoreRequisitions();
      
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (invData) setInventory(invData);
    } catch (err) {
      console.error(err);
      showMsg('error', `Failed to process requisition: ${err.message}`);
    }
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
  };
  const handleUpdatePurchaseStatus = async (purchase, newStatus) => {
  };
  const handleDeletePurchase = async (orderId, orderName) => {
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
  const pendingPurchasesCount = purchaseOrders.filter(o => o.status === 'pending_approval').length + storeRequisitions.filter(r => r.status === 'pending').length;
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
        <div className="space-y-6">
          {/* Sub-Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-3">
            <button
              onClick={() => { setProcurementSubTab('suppliers'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                procurementSubTab === 'suppliers'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={12} />
              Suppliers Register
            </button>
            <button
              onClick={() => { setProcurementSubTab('lpos'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                procurementSubTab === 'lpos'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={12} />
              Raise & Manage LPO
            </button>
            <button
              onClick={() => { setProcurementSubTab('receipts'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                procurementSubTab === 'receipts'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 size={12} />
              Confirm Receipts
            </button>
            <button
              onClick={() => { setProcurementSubTab('requisitions'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                procurementSubTab === 'requisitions'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building size={12} />
              Store Requisitions
            </button>
            <button
              onClick={() => { setProcurementSubTab('process_requisitions'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition relative ${
                procurementSubTab === 'process_requisitions'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList size={12} />
              Process Requests
              {storeRequisitions.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-955 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-955 animate-pulse">
                  {storeRequisitions.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setProcurementSubTab('reports'); setSelectedPO(null); setSelectedRequisition(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                procurementSubTab === 'reports'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                  : 'bg-slate-955 border-slate-855 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={12} />
              Received Items Report
            </button>
          </div>

          {/* Sub-Tab Content rendering */}
          {loading ? (
            <div className="p-10 text-center text-slate-500 text-xs font-sans">Loading data...</div>
          ) : (
            <>
              {/* SUBTAB 1: Suppliers Register */}
              {procurementSubTab === 'suppliers' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* List of Suppliers */}
                  <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <Users size={12} className="text-teal-400" /> Active Suppliers Registry
                    </h5>
                    {suppliers.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 text-xs font-sans">No suppliers registered yet. Register a supplier on the right.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-900 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse font-sans">
                          <thead>
                            <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">Tax PIN (eTIMS)</th>
                              <th className="py-2.5 px-3">Contact</th>
                              <th className="py-2.5 px-3">Address</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                            {suppliers.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-900/10 transition">
                                <td className="py-3 px-3 text-xs text-slate-200 font-bold">{s.name}</td>
                                <td className="py-3 px-3 font-mono text-slate-400">{s.tax_pin || 'N/A'}</td>
                                <td className="py-3 px-3">
                                  <span className="block text-slate-300">{s.phone || 'N/A'}</span>
                                  <span className="block text-[10px] text-slate-500">{s.email || ''}</span>
                                </td>
                                <td className="py-3 px-3 text-slate-400">{s.address || 'N/A'}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                    s.is_active ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-800 text-slate-500 border border-slate-800'
                                  }`}>
                                    {s.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add Supplier Form */}
                  <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <PlusCircle size={12} className="text-teal-400" /> Register Vendor / Supplier
                    </h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      Register a supplier to raise Local Purchase Orders (LPOs) and record tax-compliant invoices.
                    </p>
                    <form onSubmit={handleAddSupplier} className="space-y-4 font-sans">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier Name *</label>
                        <input
                          type="text"
                          value={supName}
                          onChange={(e) => setSupName(e.target.value)}
                          placeholder="e.g. Kentons Pharmaceuticals Ltd"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax PIN / eTIMS Compliance Code</label>
                        <input
                          type="text"
                          value={supTaxPin}
                          onChange={(e) => setSupTaxPin(e.target.value)}
                          placeholder="e.g. P051234567A"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={supPhone}
                            onChange={(e) => setSupPhone(e.target.value)}
                            placeholder="e.g. +254712345678"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                          <input
                            type="email"
                            value={supEmail}
                            onChange={(e) => setSupEmail(e.target.value)}
                            placeholder="e.g. orders@kentons.co.ke"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Physical/Postal Address</label>
                        <input
                          type="text"
                          value={supAddress}
                          onChange={(e) => setSupAddress(e.target.value)}
                          placeholder="e.g. Suite 4B, Industrial Area, Nairobi"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
                      >
                        Add Supplier to Register
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: Raise & Manage LPO */}
              {procurementSubTab === 'lpos' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* LPO Draft Builder */}
                  <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <PlusCircle size={12} className="text-teal-400" /> Local Purchase Order (LPO) Draft Builder
                    </h5>
                    
                    <form onSubmit={handleCreatePurchaseOrder} className="space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Supplier *</label>
                          <select
                            value={lpoSupplier}
                            onChange={(e) => setLpoSupplier(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            required
                          >
                            <option value="">-- Choose Supplier --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.tax_pin || 'No PIN'})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Requesting Store</label>
                          <select
                            value={lpoStore}
                            onChange={(e) => setLpoStore(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          >
                            <option value="MAIN STORE">MAIN STORE</option>
                            <option value="PHARMACY STORE">PHARMACY STORE</option>
                            <option value="LABORATORY STORE">LABORATORY STORE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">LPO Date</label>
                          <input
                            type="date"
                            value={lpoDate}
                            onChange={(e) => setLpoDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            required
                          />
                        </div>
                      </div>

                      {/* Item Addition Section */}
                      <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 space-y-3">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Add Line Item to LPO</span>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product / Item Name</label>
                            <input
                              type="text"
                              value={lpoCurrentItemName}
                              onChange={(e) => setLpoCurrentItemName(e.target.value)}
                              placeholder="e.g. Losartan H 50mg Tablets"
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 px-2.5 text-xs text-slate-100 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                            <input
                              type="number"
                              value={lpoCurrentQty}
                              onChange={(e) => setLpoCurrentQty(parseInt(e.target.value) || 1)}
                              min={1}
                              className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit Price (KES)</label>
                            <input
                              type="number"
                              value={lpoCurrentPrice}
                              onChange={(e) => setLpoCurrentPrice(parseFloat(e.target.value) || 0)}
                              min={0}
                              className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!lpoCurrentItemName) {
                                  showMsg('error', 'Item name is required.');
                                  return;
                                }
                                if (lpoCurrentQty <= 0) {
                                  showMsg('error', 'Quantity must be positive.');
                                  return;
                                }
                                const newItem = {
                                  item_name: lpoCurrentItemName,
                                  quantity: lpoCurrentQty,
                                  unit_price: lpoCurrentPrice
                                };
                                setLpoItems(prev => [...prev, newItem]);
                                setLpoCurrentItemName('');
                                setLpoCurrentQty(1);
                                setLpoCurrentPrice(0);
                              }}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 hover:border-slate-600 font-bold text-xs py-1.5 px-3 rounded-lg transition active:scale-[0.98] cursor-pointer"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Added Items Table */}
                      {lpoItems.length > 0 && (
                        <div className="border border-slate-900 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px] tracking-wider">
                                <th className="py-2 px-3">Item Description</th>
                                <th className="py-2 px-3 text-center">Quantity</th>
                                <th className="py-2 px-3 text-right">Unit Price</th>
                                <th className="py-2 px-3 text-right">Subtotal</th>
                                <th className="py-2 px-3 text-center">Controls</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 text-slate-300 font-semibold">
                              {lpoItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/10">
                                  <td className="py-2 px-3 text-xs">{item.item_name}</td>
                                  <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                                  <td className="py-2 px-3 text-right font-mono">KES {item.unit_price.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right font-mono">KES {(item.quantity * item.unit_price).toFixed(2)}</td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setLpoItems(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-900/30 text-teal-400 font-bold border-t border-slate-900 text-[11.5px]">
                                <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider">Estimated Total</td>
                                <td className="py-2 px-3 text-right font-mono">
                                  KES {lpoItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={lpoItems.length === 0}
                        className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
                      >
                        Submit Local Purchase Order (LPO)
                      </button>
                    </form>
                  </div>

                  {/* LPO Records History */}
                  <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <ClipboardList size={12} className="text-teal-400" /> LPO Records History
                    </h5>
                    
                    {purchaseOrders.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-sans">No LPOs raised yet.</div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1.5">
                        {purchaseOrders.map((po) => (
                          <div
                            key={po.id}
                            onClick={() => handleSelectPO(po)}
                            className={`p-3 border rounded-xl cursor-pointer transition flex flex-col gap-1.5 ${
                              selectedPO?.id === po.id
                                ? 'bg-teal-500/[0.03] border-teal-500/40'
                                : 'bg-slate-900/50 border-slate-900 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-200">{po.id}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                                po.status === 'delivered' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                po.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                po.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-amber-500/5 text-amber-400 border border-amber-500/20 animate-pulse'
                              }`}>
                                {po.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans">
                              <span>Supplier: {po.suppliers?.name || 'Unknown'}</span>
                              <span className="font-mono text-slate-500">{po.order_date}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500">Store: {po.requesting_store}</span>
                              <span className="font-bold text-teal-400 font-mono">KES {parseFloat(po.estimated_total).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LPO DETAILS DRAWER/POPUP */}
              {selectedPO && procurementSubTab === 'lpos' && (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4 shadow-lg font-sans">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-200">LPO DETAILS: <span className="font-mono text-teal-400">{selectedPO.id}</span></h4>
                      <p className="text-[10px] text-slate-500 font-sans">Raised Date: {selectedPO.order_date} | Supplier: {selectedPO.suppliers?.name || 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedPO(null); setSelectedPOItems([]); }}
                      className="text-xs text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      Close Details
                    </button>
                  </div>

                  {selectedPOItems.length === 0 ? (
                    <div className="p-5 text-center text-slate-500 text-xs">Loading items details...</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border border-slate-900 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-900/50 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px]">
                              <th className="py-2 px-3">Item Description</th>
                              <th className="py-2 px-3 text-center">Ordered Qty</th>
                              <th className="py-2 px-3 text-center">Received Qty</th>
                              <th className="py-2 px-3 text-right">Unit Price</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-semibold text-slate-350">
                            {selectedPOItems.map((item) => (
                              <tr key={item.id}>
                                <td className="py-2 px-3 text-xs">{item.item_name}</td>
                                <td className="py-2 px-3 text-center font-mono">{item.quantity_ordered}</td>
                                <td className="py-2 px-3 text-center font-mono text-slate-500">{item.quantity_received}</td>
                                <td className="py-2 px-3 text-right font-mono">KES {parseFloat(item.unit_price).toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-mono">KES {(item.quantity_ordered * item.unit_price).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Approval Actions for Pending Approval */}
                      {selectedPO.status === 'pending_approval' && (
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => handleApprovePO(selectedPO.id)}
                            className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-bold text-xs py-1.5 px-4 rounded-lg shadow-md transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 size={12} /> Approve Purchase Order
                          </button>
                          <button
                            onClick={() => handleRejectPO(selectedPO.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs py-1.5 px-4 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={12} /> Reject LPO
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: Confirm Receipts */}
              {procurementSubTab === 'receipts' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Delivery Receipt Form */}
                  <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <Truck size={12} className="text-teal-400" /> Confirm Received Items & Stock Deliveries
                    </h5>

                    <form onSubmit={handleConfirmReceipt} className="space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice / Receipt No *</label>
                          <input
                            type="text"
                            value={recInvoice}
                            onChange={(e) => setRecInvoice(e.target.value)}
                            placeholder="e.g. INV-9022"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Link Approved LPO (Optional)</label>
                          <select
                            value={recPoId}
                            onChange={(e) => handlePoSelectForReceipt(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          >
                            <option value="">-- Direct Receipt (No LPO) --</option>
                            {purchaseOrders.filter(o => o.status === 'approved').map(o => (
                              <option key={o.id} value={o.id}>{o.id} ({o.suppliers?.name})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier *</label>
                          <select
                            value={recSupplierId}
                            onChange={(e) => setRecSupplierId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            disabled={!!recPoId}
                            required
                          >
                            <option value="">-- Choose Supplier --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Received Date</label>
                          <input
                            type="date"
                            value={recDate}
                            onChange={(e) => setRecDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comments / Delivery Notes</label>
                        <input
                          type="text"
                          value={recComments}
                          onChange={(e) => setRecComments(e.target.value)}
                          placeholder="e.g. Received in good condition"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                        />
                      </div>

                      {/* Manual Entry Row */}
                      <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-3">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {recPoId ? 'Append Extra Direct Item' : 'Add Item to Receipt'}
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Product / Item Name</label>
                            <input
                              type="text"
                              value={recCurrentItemName}
                              onChange={(e) => setRecCurrentItemName(e.target.value)}
                              placeholder="e.g. Antiacid Susp 100ml"
                              className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Batch Number</label>
                            <input
                              type="text"
                              value={recCurrentBatch}
                              onChange={(e) => setRecCurrentBatch(e.target.value)}
                              placeholder="e.g. BT-908"
                              className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Expiry Date</label>
                            <input
                              type="date"
                              value={recCurrentExpiry}
                              onChange={(e) => setRecCurrentExpiry(e.target.value)}
                              className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1 px-2 text-xs text-slate-100 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Qty Received</label>
                            <input
                              type="number"
                              value={recCurrentQty}
                              onChange={(e) => setRecCurrentQty(parseInt(e.target.value) || 1)}
                              min={1}
                              className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!recCurrentItemName || !recCurrentBatch || !recCurrentExpiry) {
                                  showMsg('error', 'Item name, batch number, and expiry date are required.');
                                  return;
                                }
                                const newItem = {
                                  item_name: recCurrentItemName,
                                  batch_number: recCurrentBatch,
                                  expiry_date: recCurrentExpiry,
                                  quantity_received: recCurrentQty,
                                  buy_price: recCurrentPrice,
                                  store_name: recCurrentStore
                                };
                                setRecItems(prev => [...prev, newItem]);
                                setRecCurrentItemName('');
                                setRecCurrentBatch('');
                                setRecCurrentQty(1);
                                setRecCurrentPrice(0);
                              }}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 hover:border-slate-600 font-bold text-xs py-1.5 px-2 rounded-lg transition active:scale-[0.98] cursor-pointer font-sans"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Receipt Items list */}
                      {recItems.length > 0 && (
                        <div className="border border-slate-900 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8px] tracking-wider">
                                <th className="py-2 px-3">Item Description</th>
                                <th className="py-2 px-3">Batch Number *</th>
                                <th className="py-2 px-3">Expiry Date *</th>
                                <th className="py-2 px-3 text-center">Qty Received</th>
                                <th className="py-2 px-3 text-right">Buy Price</th>
                                <th className="py-2 px-3">Store Name</th>
                                <th className="py-2 px-3 text-center">Control</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                              {recItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/10">
                                  <td className="py-2 px-3 text-xs font-bold text-slate-200">{item.item_name}</td>
                                  <td className="py-1 px-3">
                                    <input
                                      type="text"
                                      value={item.batch_number}
                                      onChange={(e) => handleUpdateRecItem(idx, 'batch_number', e.target.value)}
                                      placeholder="Batch No"
                                      className="bg-slate-955 border border-slate-855 rounded py-0.5 px-1.5 text-[10.5px] w-24 text-slate-200 font-mono focus:border-teal-500 transition"
                                      required
                                    />
                                  </td>
                                  <td className="py-1 px-3">
                                    <input
                                      type="date"
                                      value={item.expiry_date}
                                      onChange={(e) => handleUpdateRecItem(idx, 'expiry_date', e.target.value)}
                                      className="bg-slate-955 border border-slate-855 rounded py-0.5 px-1.5 text-[10.5px] w-28 text-slate-200 focus:border-teal-500 transition"
                                      required
                                    />
                                  </td>
                                  <td className="py-1 px-3 text-center">
                                    <input
                                      type="number"
                                      value={item.quantity_received}
                                      onChange={(e) => handleUpdateRecItem(idx, 'quantity_received', parseInt(e.target.value) || 1)}
                                      min={1}
                                      className="bg-slate-955 border border-slate-855 rounded py-0.5 px-1.5 text-[10.5px] text-center w-16 text-slate-200 font-mono focus:border-teal-500 transition"
                                      required
                                    />
                                  </td>
                                  <td className="py-1 px-3 text-right">
                                    <input
                                      type="number"
                                      value={item.buy_price}
                                      onChange={(e) => handleUpdateRecItem(idx, 'buy_price', parseFloat(e.target.value) || 0)}
                                      min={0}
                                      className="bg-slate-955 border border-slate-855 rounded py-0.5 px-1.5 text-[10.5px] text-right w-20 text-slate-200 font-mono focus:border-teal-500 transition"
                                      required
                                    />
                                  </td>
                                  <td className="py-1 px-3">
                                    <select
                                      value={item.store_name}
                                      onChange={(e) => handleUpdateRecItem(idx, 'store_name', e.target.value)}
                                      className="bg-slate-955 border border-slate-855 rounded py-0.5 px-1.5 text-[10.5px] text-slate-200 focus:border-teal-500 transition"
                                    >
                                      <option value="MAIN STORE">MAIN STORE</option>
                                      <option value="PHARMACY STORE">PHARMACY STORE</option>
                                      <option value="LABORATORY STORE">LABORATORY STORE</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setRecItems(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={recItems.length === 0 || recItems.some(item => !item.batch_number || !item.expiry_date)}
                        className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-955 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
                      >
                        Confirm Delivery Receipt & Credit Inventory Stock
                      </button>
                    </form>
                  </div>

                  {/* Stock Receipts History */}
                  <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <History size={12} className="text-teal-400" /> Deliveries Receipts Logs
                    </h5>
                    
                    {stockReceipts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-sans">No receipts confirmed yet.</div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1.5">
                        {stockReceipts.map((rec) => (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectReceipt(rec)}
                            className={`p-3 border rounded-xl cursor-pointer transition flex flex-col gap-1.5 ${
                              selectedReceipt?.id === rec.id
                                ? 'bg-teal-500/[0.03] border-teal-500/40'
                                : 'bg-slate-900/50 border-slate-900 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-200">Invoice: <span className="font-mono text-teal-400">{rec.invoice_number}</span></span>
                              <span className="text-[9px] text-slate-500 font-mono">{rec.received_date}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Supplier: {rec.suppliers?.name || 'Unknown'}</span>
                              <span className="text-[9.5px] font-mono text-slate-500">{rec.id}</span>
                            </div>
                            {rec.comments && (
                              <span className="text-[10px] italic text-slate-500 block truncate">"{rec.comments}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RECEIPT ITEMS DETAILS DRAWER */}
              {selectedReceipt && procurementSubTab === 'receipts' && (
                <div className="bg-slate-950 border border-slate-855 rounded-xl p-5 space-y-4 shadow-lg font-sans">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-200">RECEIPT ITEMS LOGS: INVOICE <span className="font-mono text-teal-400">{selectedReceipt.invoice_number}</span></h4>
                      <p className="text-[10px] text-slate-500 font-sans">Supplier: {selectedReceipt.suppliers?.name} | Confirmed Date: {selectedReceipt.received_date}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedReceipt(null); setSelectedReceiptItems([]); }}
                      className="text-xs text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      Close Details
                    </button>
                  </div>
                  {selectedReceiptItems.length === 0 ? (
                    <div className="p-5 text-center text-slate-500 text-xs">Loading items details...</div>
                  ) : (
                    <div className="border border-slate-900 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px]">
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3">Batch Number</th>
                            <th className="py-2 px-3">Expiry Date</th>
                            <th className="py-2 px-3 text-center">Quantity Confirmed</th>
                            <th className="py-2 px-3 text-right">Buy Price</th>
                            <th className="py-2 px-3">Store</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-semibold text-slate-350">
                          {selectedReceiptItems.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2 px-3 text-xs">{item.item_name}</td>
                              <td className="py-2 px-3 font-mono text-amber-400">{item.batch_number}</td>
                              <td className="py-2 px-3 text-slate-450 font-mono">{item.expiry_date}</td>
                              <td className="py-2 px-3 text-center font-mono text-slate-200">{item.quantity_received}</td>
                              <td className="py-2 px-3 text-right font-mono">KES {parseFloat(item.buy_price).toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-450 uppercase text-[9.5px]">{item.store_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: Store-to-Store Requisitions */}
              {procurementSubTab === 'requisitions' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Requisition Builder */}
                  <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <Building size={12} className="text-teal-400" /> New Internal Store Requisition Form
                    </h5>
                    
                    <form onSubmit={handleCreateRequisition} className="space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Requesting Store / Department *</label>
                          <select
                            value={reqRequestingStore}
                            onChange={(e) => setReqRequestingStore(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                            required
                          >
                            <option value="PHARMACY STORE">PHARMACY STORE</option>
                            <option value="LABORATORY">LABORATORY</option>
                            <option value="WARD A">WARD A</option>
                            <option value="WARD B">WARD B</option>
                            <option value="OPD CLINIC">OPD CLINIC</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Request To (Supplying Store)</label>
                          <select
                            value={reqSupplyingStore}
                            onChange={(e) => setReqSupplyingStore(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          >
                            <option value="MAIN STORE">MAIN STORE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comments / Reference Notes</label>
                          <input
                            type="text"
                            value={reqComments}
                            onChange={(e) => setReqComments(e.target.value)}
                            placeholder="e.g. Weekly replenishment request"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
                          />
                        </div>
                      </div>

                      {/* Items entry */}
                      <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 space-y-3">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Add Requested Item</span>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Item Name</label>
                            <input
                              type="text"
                              value={reqCurrentItemName}
                              onChange={(e) => setRecCurrentItemName(e.target.value)}
                              placeholder="e.g. Disposable Cups"
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 px-2.5 text-xs text-slate-100 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Quantity Requested</label>
                            <input
                              type="number"
                              value={reqCurrentQty}
                              onChange={(e) => setReqCurrentQty(parseInt(e.target.value) || 1)}
                              min={1}
                              className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1 px-2.5 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!reqCurrentItemName) {
                                  showMsg('error', 'Item name is required.');
                                  return;
                                }
                                const newItem = {
                                  item_name: reqCurrentItemName,
                                  quantity_requested: reqCurrentQty
                                };
                                setReqItems(prev => [...prev, newItem]);
                                setReqCurrentItemName('');
                                setReqCurrentQty(1);
                              }}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 hover:border-slate-600 font-bold text-xs py-1.5 px-3 rounded-lg transition active:scale-[0.98] cursor-pointer"
                            >
                              Add Line
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items table */}
                      {reqItems.length > 0 && (
                        <div className="border border-slate-900 rounded-lg overflow-x-auto font-sans">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px] tracking-wider">
                                <th className="py-2 px-3">Item Description</th>
                                <th className="py-2 px-3 text-center">Requested Quantity</th>
                                <th className="py-2 px-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 font-semibold text-slate-350">
                              {reqItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/10">
                                  <td className="py-2 px-3 text-xs">{item.item_name}</td>
                                  <td className="py-2 px-3 text-center font-mono text-slate-200">{item.quantity_requested}</td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setReqItems(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer font-sans"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={reqItems.length === 0}
                        className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold text-xs py-2 px-4 rounded-lg shadow-md transition w-full active:scale-[0.98] cursor-pointer"
                      >
                        Submit Store Requisition
                      </button>
                    </form>
                  </div>

                  {/* Requisition History list */}
                  <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit font-sans">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <History size={12} className="text-teal-400" /> Requisition Logs
                    </h5>
                    
                    {storeRequisitions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">No requisitions logged yet.</div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1.5">
                        {storeRequisitions.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => handleSelectRequisition(req)}
                            className={`p-3 border rounded-xl cursor-pointer transition flex flex-col gap-1.5 ${
                              selectedRequisition?.id === req.id
                                ? 'bg-teal-500/[0.03] border-teal-500/40'
                                : 'bg-slate-900/50 border-slate-900 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono font-bold text-slate-200">{req.id}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                                req.status === 'completed' || req.status === 'approved' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                req.status === 'declined' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-amber-500/5 text-amber-400 border border-amber-500/20 animate-pulse'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex justify-between">
                              <span>Dept: {req.requesting_store}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{req.request_date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* REQUISITION DETAILS DRAWER */}
              {selectedRequisition && procurementSubTab === 'requisitions' && (
                <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-lg font-sans">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-200">REQUISITION DETAIL: <span className="font-mono text-teal-400">{selectedRequisition.id}</span></h4>
                      <p className="text-[10px] text-slate-500">Requesting Dept: {selectedRequisition.requesting_store} | Supplying Store: {selectedRequisition.supplying_store}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedRequisition(null); setSelectedRequisitionItems([]); }}
                      className="text-xs text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      Close Details
                    </button>
                  </div>
                  {selectedRequisitionItems.length === 0 ? (
                    <div className="p-5 text-center text-slate-500 text-xs">Loading items details...</div>
                  ) : (
                    <div className="border border-slate-900 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px]">
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3 text-center">Requested Quantity</th>
                            <th className="py-2 px-3 text-center">Approved Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-semibold text-slate-350">
                          {selectedRequisitionItems.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2 px-3 text-xs">{item.item_name}</td>
                              <td className="py-2 px-3 text-center font-mono text-slate-200">{item.quantity_requested}</td>
                              <td className="py-2 px-3 text-center font-mono text-teal-400">{selectedRequisition.status === 'pending' ? 'Pending Approval' : item.quantity_approved}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 5: Process Requests */}
              {procurementSubTab === 'process_requisitions' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
                  {/* Pending Requisitions Queue */}
                  <div className="xl:col-span-2 bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md font-sans">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <ClipboardList size={12} className="text-teal-400" /> Pending Store-to-Store Requests
                    </h5>
                    
                    {storeRequisitions.filter(r => r.status === 'pending').length === 0 ? (
                      <div className="p-10 text-center text-slate-500 text-xs font-sans">No pending store requisitions awaiting processing.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-900 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Req Number</th>
                              <th className="py-2.5 px-3">Requesting Dept</th>
                              <th className="py-2.5 px-3">Supplying Store</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">Controls</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-semibold text-slate-350">
                            {storeRequisitions.filter(r => r.status === 'pending').map((req) => (
                              <tr key={req.id} className="hover:bg-slate-900/10">
                                <td className="py-3 px-3 text-slate-455 font-mono">{req.request_date}</td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-200">{req.id}</td>
                                <td className="py-3 px-3 uppercase text-[10px] text-teal-400">{req.requesting_store}</td>
                                <td className="py-3 px-3 text-slate-400 text-[10px]">{req.supplying_store}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/5 text-amber-400 border border-amber-500/20 animate-pulse">
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleSelectRequisition(req)}
                                    className="px-2.5 py-1 text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition cursor-pointer"
                                  >
                                    Review & Process
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Requisition Process Panel */}
                  <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md h-fit">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <CheckCircle2 size={12} className="text-teal-400" /> Requisition Review Panel
                    </h5>

                    {selectedRequisition && selectedRequisition.status === 'pending' ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-900/60 rounded-xl space-y-1.5 border border-slate-900">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Selected Request Details</span>
                          <div className="text-xs text-slate-200">
                            <span className="font-mono block">Req Number: {selectedRequisition.id}</span>
                            <span className="block mt-1">From: <strong className="text-teal-400">{selectedRequisition.requesting_store}</strong></span>
                            <span className="block">To: <strong className="text-slate-455">{selectedRequisition.supplying_store}</strong></span>
                            {selectedRequisition.comments && (
                              <span className="block mt-1.5 italic text-slate-500">"{selectedRequisition.comments}"</span>
                            )}
                          </div>
                        </div>

                        {selectedRequisitionItems.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-xs">Loading items...</div>
                        ) : (
                          <div className="space-y-3">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Verify Quantities & Stocks</span>
                            {selectedRequisitionItems.map((item) => {
                              const sQty = getItemStockForStore(item.item_name, selectedRequisition.supplying_store);
                              const rQty = getItemStockForStore(item.item_name, selectedRequisition.requesting_store);
                              const approvedVal = requisitionApprovals[item.id] || 0;
                              return (
                                <div key={item.id} className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl space-y-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-200 truncate max-w-[170px]" title={item.item_name}>{item.item_name}</span>
                                    <span className="text-[10px] text-slate-400 font-sans">Requested: <strong className="text-slate-200">{item.quantity_requested}</strong></span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-950/60 p-1.5 rounded-lg border border-slate-900 font-mono">
                                    <span>RStoreQty: <strong className="text-slate-350">{rQty}</strong></span>
                                    <span>SStoreQty: <strong className={sQty < item.quantity_requested ? 'text-red-400 font-extrabold' : 'text-teal-400 font-extrabold'}>{sQty}</strong></span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 pt-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Approve Qty:</label>
                                    <input
                                      type="number"
                                      value={approvedVal}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setRequisitionApprovals(prev => ({ ...prev, [item.id]: val }));
                                      }}
                                      min={0}
                                      max={sQty}
                                      className="bg-slate-955 border border-slate-850 rounded py-1 px-2 text-xs w-20 text-right font-mono text-teal-400 focus:border-teal-500 transition"
                                    />
                                  </div>
                                </div>
                              );
                            })}

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleProcessRequisition(selectedRequisition.id, 'approved')}
                                className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg shadow-md transition flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <Check size={13} /> Approve Request
                              </button>
                              <button
                                onClick={() => handleProcessRequisition(selectedRequisition.id, 'declined')}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <XCircle size={13} /> Decline
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-10 text-center text-slate-500 text-xs font-sans">
                        Select a requisition request from the queue on the left to process.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 6: Stock Items Received Report */}
              {procurementSubTab === 'reports' && (
                <div className="bg-slate-955 border border-slate-855 rounded-xl p-5 space-y-4 shadow-md font-sans">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-3">
                    <h5 className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <History size={12} className="text-teal-400" /> Stock Items Received Historical Audit Report
                    </h5>
                    <button
                      onClick={handleExportReceiptsCSV}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-teal-400 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <FileText size={12} /> Export Report (CSV)
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/30 p-4 border border-slate-900 rounded-xl">
                    <div className="md:col-span-2">
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Search Keywords</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Invoice No, Supplier, Batch No, Drug Name..."
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-650 focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  {/* Filtered report rows */}
                  {(() => {
                    const filtered = stockReceiptItems.filter(item => {
                      const keywords = (searchQuery || '').toLowerCase().trim();
                      if (!keywords) return true;
                      
                      const matchInvoice = (item.stock_receipts?.invoice_number || '').toLowerCase().includes(keywords);
                      const matchBatch = (item.batch_number || '').toLowerCase().includes(keywords);
                      const matchSupplier = (item.stock_receipts?.suppliers?.name || '').toLowerCase().includes(keywords);
                      const matchDrug = (item.item_name || '').toLowerCase().includes(keywords);
                      
                      return matchInvoice || matchBatch || matchSupplier || matchDrug;
                    });

                    return filtered.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 text-xs font-sans">No matching received items records found.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-900 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse font-sans">
                          <thead>
                            <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 uppercase text-[8.5px] tracking-wider">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">BatchNo</th>
                              <th className="py-2.5 px-3">Item / Drug Name</th>
                              <th className="py-2.5 px-3">Expiry Date</th>
                              <th className="py-2.5 px-3">Supplier</th>
                              <th className="py-2.5 px-3 text-center">Qty Received</th>
                              <th className="py-2.5 px-3 text-right">Buy Price</th>
                              <th className="py-2.5 px-3">Received By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-semibold text-slate-355">
                            {filtered.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-900/10">
                                <td className="py-2.5 px-3 text-slate-455 font-mono text-[10px]">{item.stock_receipts?.received_date}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{item.stock_receipts?.invoice_number}</td>
                                <td className="py-2.5 px-3 font-mono text-amber-500 text-[10.5px]">{item.batch_number}</td>
                                <td className="py-2.5 px-3 text-xs text-slate-250 font-bold">{item.item_name}</td>
                                <td className="py-2.5 px-3 font-mono text-red-400 text-[10px]">{item.expiry_date}</td>
                                <td className="py-2.5 px-3 text-[10px] text-slate-400">{item.stock_receipts?.suppliers?.name || 'N/A'}</td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-250">{item.quantity_received}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-teal-400">KES {parseFloat(item.buy_price).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-slate-455 text-[10px]">Staff Admin</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
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
