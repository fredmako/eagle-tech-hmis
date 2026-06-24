import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Search, ShoppingCart, Trash2, Tag, CreditCard, User, 
  ArrowRight, CheckCircle, AlertCircle, Play, Pause, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { medicineMaster } from "../../medicalMaster";

export default function POS({ user, onComplete, showNotification }) {
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Cart state
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState("NONE"); // NONE, PERCENTAGE, FLAT
  const [discountValue, setDiscountValue] = useState(0);
  const [transactionType, setTransactionType] = useState("Bill Payment");
  const [paymentOption, setPaymentOption] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [narration, setNarration] = useState("");
  const [salesToType, setSalesToType] = useState("General Client"); // "General Client" or "Registered Patient"

  // Registered patient selection states
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // General state
  const [loading, setLoading] = useState(false);
  const [heldCarts, setHeldCarts] = useState([]);

  // Fetch initial stock catalog and patients
  useEffect(() => {
    fetchInventory();
    fetchPatients();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setInventory(data);
      } else {
        // Fallback mock inventory if remote database is empty
        const mockInventory = medicineMaster.slice(0, 30).map((med, idx) => ({
          id: `inv_mock_${idx}`,
          name: med.name,
          category: med.category || "pharmaceutical",
          unit_of_measure: med.unit || "tabs",
          unit_price: med.price || 150.0,
          quantity_in_stock: Math.floor(Math.random() * 200) + 10,
          code: `D-MOCK-${idx}`
        }));
        setInventory(mockInventory);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*");
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error("Error loading patients:", err);
    }
  };

  // Add to cart logic
  const handleAddToCart = (item, qtyInput) => {
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      showNotification("Please enter a valid quantity.", "error");
      return;
    }

    if (qty > item.quantity_in_stock) {
      showNotification(`Insufficient stock. Only ${item.quantity_in_stock} available.`, "warning");
      return;
    }

    const existingIdx = cart.findIndex((i) => i.id === item.id);
    if (existingIdx > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIdx].qty + qty;
      if (newQty > item.quantity_in_stock) {
        showNotification(`Cannot exceed available stock of ${item.quantity_in_stock}.`, "warning");
        return;
      }
      updatedCart[existingIdx].qty = newQty;
      updatedCart[existingIdx].subtotal = newQty * item.unit_price;
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        code: item.code || item.id,
        price: item.unit_price,
        qty: qty,
        subtotal: qty * item.unit_price
      }]);
    }
    showNotification(`${item.name} added to cart.`, "success");
  };

  // Remove / clear cart
  const handleRemoveFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType("NONE");
    setAmountPaid("");
    setNarration("");
    setSelectedPatient(null);
    setSalesToType("General Client");
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const calculateDiscount = () => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return 0;
    if (discountType === "PERCENTAGE") {
      return (cartSubtotal * val) / 100;
    }
    if (discountType === "FLAT") {
      return val;
    }
    return 0;
  };

  const discountAmount = calculateDiscount();
  const amountPayable = Math.max(0, cartSubtotal - discountAmount);
  const paidVal = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, amountPayable - paidVal);

  // Filter items
  const filteredInventory = inventory.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = (item.code || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || codeMatch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);

  // Hold current cart
  const handleHoldCart = () => {
    if (cart.length === 0) {
      showNotification("Cart is empty. Cannot hold.", "warning");
      return;
    }
    const newHeld = {
      id: `held_${Date.now()}`,
      cart: [...cart],
      discountType,
      discountValue,
      salesToType,
      selectedPatient,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: amountPayable
    };
    setHeldCarts([...heldCarts, newHeld]);
    handleClearCart();
    showNotification("Cart successfully placed on Hold.", "info");
  };

  // Restore held cart
  const handleRestoreHeld = (held) => {
    setCart(held.cart);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setSalesToType(held.salesToType);
    setSelectedPatient(held.selectedPatient);
    setHeldCarts(heldCarts.filter((c) => c.id !== held.id));
    showNotification("Held cart restored.", "success");
  };

  // Final checkout logic: direct cashier payout or routing to global billing queue
  const handleCheckout = async (sendToBilling = false) => {
    if (cart.length === 0) {
      showNotification("Cart is empty.", "warning");
      return;
    }

    if (salesToType === "Registered Patient" && !selectedPatient) {
      showNotification("Please select a registered patient first.", "warning");
      return;
    }

    setLoading(true);
    try {
      if (sendToBilling) {
        // Find or create an active visit for the registered patient
        let visitId = null;
        const { data: activeVisits, error: visitErr } = await supabase
          .from("visits")
          .select("id")
          .eq("patient_id", selectedPatient.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (visitErr) throw visitErr;

        if (activeVisits && activeVisits.length > 0) {
          visitId = activeVisits[0].id;
        } else {
          // Auto create a pharmacy referral visit ticket if they don't have one active
          const newVisitId = `v_pos_${Date.now()}`;
          const { error: insVisitErr } = await supabase
            .from("visits")
            .insert({
              id: newVisitId,
              patient_id: selectedPatient.id,
              facility_id: user.facility_id,
              department: "pharmacy",
              priority: "normal",
              status: "active",
              service_type: "POS Drugs Purchase",
              created_at: new Date().toISOString()
            });

          if (insVisitErr) throw insVisitErr;
          visitId = newVisitId;
        }

        // Insert items into pharmacy dispensing queue linked to the visit
        const newRegId = `preg_pos_${Date.now()}`;
        const { error: regErr } = await supabase
          .from("pharmacy_only_registrations")
          .insert({
            id: newRegId,
            patient_id: selectedPatient.id,
            facility_id: user.facility_id,
            prescription_source: "POS Sales Counter",
            payment_status: "unpaid",
            registration_datetime: new Date().toISOString()
          });

        if (regErr) throw regErr;

        // Save items as pharmacy dispensings records
        const dispensingPromises = cart.map((item, idx) => {
          return supabase.from("pharmacy_dispensings").insert({
            id: `disp_pos_${Date.now()}_${idx}`,
            registration_id: newRegId,
            facility_id: user.facility_id,
            medication_id: item.id,
            strength: "standard",
            quantity_dispensed: item.qty,
            payment_amount: item.subtotal,
            dispensed_at: new Date().toISOString(),
            patient_instructions: narration || "Dispensed from POS"
          });
        });

        const results = await Promise.all(dispensingPromises);
        const err = results.find(r => r.error);
        if (err) throw err.error;

        // Create an unpaid invoice for this visit in cashier billing queue
        const newInvoiceId = `inv_pos_${Date.now()}`;
        const { error: invErr } = await supabase
          .from("invoices")
          .insert({
            id: newInvoiceId,
            facility_id: user.facility_id,
            visit_id: visitId,
            total_amount: amountPayable,
            amount_paid: 0.00,
            status: "unpaid",
            payment_method: "cash",
            receipt_number: `POS-BILL-${Date.now().toString().slice(-6)}`,
            created_at: new Date().toISOString()
          });

        if (invErr) throw invErr;

        showNotification("POS items successfully routed to Billing queue.", "success");
      } else {
        // Direct cash sale checkout
        const newInvoiceId = `inv_cash_${Date.now()}`;
        const finalPaid = amountPayable; // cash checkout settles entire bill

        // Deduck inventory quantities in DB
        const inventoryUpdates = cart.map((item) => {
          const invItem = inventory.find(i => i.id === item.id);
          const newQty = (invItem?.quantity_in_stock || item.qty) - item.qty;
          return supabase
            .from("inventory_items")
            .update({ quantity_in_stock: Math.max(0, newQty) })
            .eq("id", item.id);
        });

        await Promise.all(inventoryUpdates);

        // Save a paid invoice directly in DB
        const { error: invErr } = await supabase
          .from("invoices")
          .insert({
            id: newInvoiceId,
            facility_id: user.facility_id,
            total_amount: amountPayable,
            amount_paid: finalPaid,
            status: "paid",
            payment_method: paymentOption.toLowerCase(),
            receipt_number: `POS-SALE-${Date.now().toString().slice(-6)}`,
            checkout_id: narration || "Direct Cashier POS Sale",
            created_at: new Date().toISOString()
          });

        if (invErr) throw invErr;

        // Log cashier audit record
        await supabase.from("audit_logs").insert({
          facility_id: user.facility_id,
          user_id: user.id,
          action: "Direct POS Sale",
          details: `Processed direct ${paymentOption} sale of KES ${amountPayable.toFixed(2)}`
        });

        showNotification(`Checkout successfully paid via ${paymentOption}!`, "success");
      }

      handleClearCart();
      fetchInventory(); // refresh stock numbers
    } catch (err) {
      console.error("POS transaction failed:", err);
      showNotification(`Transaction failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-['DM_Sans',system-ui,sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-teal-500/15 p-5 rounded-2xl">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">POS Sales Console</div>
          <h1 className="font-['Instrument_Serif',serif] text-2xl sm:text-3xl text-slate-100 font-normal mt-0.5">Pharmacy Sales Entry</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Manage walk-in medicine sales, inventory checkouts, and custom invoice routing</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-xl flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Subtotal KES</span>
          <span className="font-['JetBrains_Mono',monospace] text-2xl font-black text-emerald-400 leading-none mt-1">
            KES {amountPayable.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Catalog and Search (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm">
            {/* Search Controls */}
            <div className="flex gap-2.5 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search item code, brand name, generic details..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-teal-500/15 rounded-xl text-slate-200 text-xs focus:border-teal-400/50 outline-none"
                />
              </div>
              <button 
                onClick={fetchInventory}
                className="flex items-center gap-1.5 bg-slate-950 border border-teal-500/20 text-teal-400 hover:bg-slate-950/80 font-semibold text-xs px-4 py-2 rounded-xl transition"
              >
                Refresh Inventory
              </button>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-teal-500/10 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Item Description</th>
                    <th className="py-3 px-3 text-center">Av_Qty</th>
                    <th className="py-3 px-3 text-center" style={{ width: "90px" }}>Qty</th>
                    <th className="py-3 px-3 text-right">Price (KES)</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/8 text-xs text-slate-300">
                  {currentItems.map((item) => {
                    const [qtyVal, setQtyVal] = useState("1");
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-teal-400/80">{item.code || item.id.slice(-6)}</td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-bold text-slate-100">{item.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{item.category}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-['JetBrains_Mono',monospace] text-[11px] font-bold ${
                            item.quantity_in_stock > 10 ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {item.quantity_in_stock} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.quantity_in_stock}
                            value={qtyVal}
                            onChange={(e) => setQtyVal(e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-950/60 border border-teal-500/15 rounded text-center text-xs font-semibold text-slate-200 outline-none focus:border-teal-400/50"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-['JetBrains_Mono',monospace] font-bold">
                          {item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleAddToCart(item, qtyVal)}
                            disabled={item.quantity_in_stock <= 0}
                            className="bg-teal-400 hover:bg-teal-300 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-bold px-3.5 py-1 rounded transition text-[11px] active:scale-[0.95]"
                          >
                            Select ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {currentItems.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-500">
                        No inventory matching search terms.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between border-t border-teal-500/10 pt-4 mt-4 text-[11px] text-slate-400 font-medium">
              <div>
                Showing page {currentPage} of {totalPages} (Total {filteredInventory.length} items)
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-slate-950 border border-teal-500/15 rounded hover:border-teal-400/30 disabled:opacity-40 transition"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-slate-950 border border-teal-500/15 rounded hover:border-teal-400/30 disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="px-3.5 py-1 bg-teal-500/10 border border-teal-500/25 text-teal-400 font-bold rounded">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-slate-950 border border-teal-500/15 rounded hover:border-teal-400/30 disabled:opacity-40 transition"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-slate-950 border border-teal-500/15 rounded hover:border-teal-400/30 disabled:opacity-40 transition"
                >
                  Last
                </button>
              </div>
            </div>
          </div>

          {/* Held Carts Section */}
          {heldCarts.length > 0 && (
            <div className="bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Held Invoices</div>
              <h3 className="font-['Instrument_Serif',serif] text-lg text-slate-100 font-normal mt-0.5">Suspended Sales Queue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3.5">
                {heldCarts.map((h) => (
                  <div key={h.id} className="border border-orange-500/20 bg-orange-500/5 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-bold text-orange-400 uppercase">Suspended ({h.time})</div>
                      <div className="text-slate-200 font-bold text-xs mt-0.5">Total KES {h.total.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{h.cart.length} items · {h.salesToType}</div>
                    </div>
                    <button
                      onClick={() => handleRestoreHeld(h)}
                      className="bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Cart and Payment details (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-teal-500/12 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-teal-500/10 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-teal-400" />
                <h2 className="font-['Instrument_Serif',serif] text-lg text-slate-100 font-normal">Cart Items</h2>
              </div>
              <button
                onClick={handleClearCart}
                className="text-[10px] font-bold uppercase text-rose-400 hover:text-rose-300 transition-colors"
              >
                Clear Cart
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="bg-slate-950/40 border border-teal-500/10 p-2.5 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-['JetBrains_Mono',monospace]">
                      {item.qty} x KES {item.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-['JetBrains_Mono',monospace] text-slate-200">
                      KES {item.subtotal.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-8 text-center text-slate-600 text-xs">
                  Cart is empty. Select items from the catalog.
                </div>
              )}
            </div>

            {/* Sales To Toggle */}
            <div className="border-t border-teal-500/10 pt-4 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales To</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-teal-500/10 p-1 rounded-xl">
                <button
                  onClick={() => { setSalesToType("General Client"); setSelectedPatient(null); }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    salesToType === "General Client" ? "bg-teal-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  General Client
                </button>
                <button
                  onClick={() => setSalesToType("Registered Patient")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    salesToType === "Registered Patient" ? "bg-teal-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Registered Patient
                </button>
              </div>
            </div>

            {/* Registered Patient Lookup */}
            {salesToType === "Registered Patient" && (
              <div className="bg-slate-950/40 border border-teal-500/10 p-3 rounded-xl space-y-2 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Patient Profile</span>
                  {selectedPatient && (
                    <button onClick={() => setSelectedPatient(null)} className="text-[9px] font-semibold text-rose-400 hover:text-rose-300">
                      Change
                    </button>
                  )}
                </div>

                {selectedPatient ? (
                  <div className="flex items-center gap-2 text-xs">
                    <User size={14} className="text-teal-400" />
                    <div>
                      <div className="font-bold text-slate-200">{selectedPatient.name}</div>
                      <div className="text-[9px] text-slate-400 font-['JetBrains_Mono',monospace]">
                        ID Code: {selectedPatient.facility_id_code} · {selectedPatient.phone}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Search patient name, ID, or phone..."
                      value={patientSearchQuery}
                      onChange={(e) => { setPatientSearchQuery(e.target.value); setShowPatientSearch(true); }}
                      onFocus={() => setShowPatientSearch(true)}
                      className="w-full px-3 py-2 bg-slate-950 border border-teal-500/15 rounded-lg text-xs text-slate-200 outline-none"
                    />

                    {showPatientSearch && patientSearchQuery && (
                      <div className="absolute left-0 right-0 bg-slate-950 border border-teal-500/20 rounded-xl mt-1 max-h-[150px] overflow-y-auto z-10 p-1 shadow-lg">
                        {patients
                          .filter((p) => 
                            p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
                            p.facility_id_code.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                            p.phone.includes(patientSearchQuery)
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedPatient(p); setShowPatientSearch(false); setPatientSearchQuery(""); }}
                              className="w-full text-left p-2 hover:bg-slate-800 rounded-lg text-xs text-slate-300 block transition-colors"
                            >
                              <span className="font-bold text-slate-200">{p.name}</span>
                              <span className="text-[10px] text-slate-500 ml-2">({p.facility_id_code})</span>
                            </button>
                          ))}
                        {patients.filter((p) => p.name.toLowerCase().includes(patientSearchQuery.toLowerCase())).length === 0 && (
                          <div className="p-2 text-center text-slate-600 text-[10px]">No patients found.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Discounting */}
            <div className="border-t border-teal-500/10 pt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0); }}
                  className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-300 outline-none"
                >
                  <option value="NONE">NONE</option>
                  <option value="PERCENTAGE">Percentage %</option>
                  <option value="FLAT">Flat KES</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Discount Value</label>
                <input
                  type="number"
                  min="0"
                  disabled={discountType === "NONE"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Transaction Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-300 outline-none"
                >
                  <option value="Bill Payment">Bill Payment</option>
                  <option value="Direct Cash Sale">Direct Cash Sale</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Options</label>
                <select
                  value={paymentOption}
                  onChange={(e) => setPaymentOption(e.target.value)}
                  className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-300 outline-none"
                >
                  <option value="CASH">CASH</option>
                  <option value="M-PESA">M-PESA</option>
                  <option value="CARD">CARD</option>
                  <option value="INSURANCE">INSURANCE</option>
                </select>
              </div>
            </div>

            {/* Amounts */}
            <div className="border-t border-teal-500/10 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Items:</span>
                <span className="font-bold text-slate-200">{cart.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-['JetBrains_Mono',monospace] font-bold text-slate-200">
                  KES {cartSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Discount Amount:</span>
                <span className="font-['JetBrains_Mono',monospace] font-bold text-rose-400">
                  - KES {discountAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-teal-500/10 pt-2 text-xs">
                <span className="font-bold text-slate-300">Amount Payable:</span>
                <span className="font-['JetBrains_Mono',monospace] font-extrabold text-teal-400 text-sm">
                  KES {amountPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inputs & Checkout Actions */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Narration / Ref</label>
                  <input
                    type="text"
                    placeholder="Enter ref/notes..."
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Amount to be Paid</label>
                  <input
                    type="text"
                    placeholder="Enter amount..."
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-slate-950 border border-teal-500/15 p-2 rounded-lg text-xs text-slate-200 outline-none font-['JetBrains_Mono',monospace]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-semibold">Balance Due:</span>
                <span className="font-['JetBrains_Mono',monospace] font-bold text-orange-400">
                  KES {balanceDue.toFixed(2)}
                </span>
              </div>

              {/* Bottom Actions */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleHoldCart}
                  className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold py-2.5 rounded-xl text-[11px] transition hover:bg-amber-500/25 active:scale-[0.97]"
                >
                  Hold Sale
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold py-2.5 rounded-xl text-[11px] transition hover:bg-rose-500/25 active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || cart.length === 0}
                  onClick={() => handleCheckout(salesToType === "Registered Patient")}
                  className="bg-teal-400 text-slate-950 font-black py-2.5 rounded-xl text-[11px] transition hover:bg-teal-300 disabled:bg-slate-800 disabled:text-slate-600 active:scale-[0.97] shadow-lg shadow-teal-500/10 col-span-1"
                >
                  {loading ? "Processing..." : salesToType === "Registered Patient" ? "Send to Billing" : "Pay & Print"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
