import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { sendNotification } from "../../notificationService";
import {
  Pill,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Layers,
  Sliders,
  CheckSquare,
  Calendar,
  ShieldAlert,
  Package,
  FileText,
  Search,
  CornerDownRight,
  ShoppingCart,
  Trash2,
  Plus,
  Printer,
  ArrowRight,
  User,
  Phone,
  DollarSign,
  Tag,
  CreditCard,
  Play,
  Pause,
  X
} from "lucide-react";
import { medicineMaster } from "../../medicalMaster";

export default function Pharmacy({ user, onComplete, showNotification, initialSubTab }) {
  const [pharmVisits, setPharmVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [facilityServices, setFacilityServices] = useState([]);
  const [selectedWalkinDrug, setSelectedWalkinDrug] = useState('');
  const [addingWalkin, setAddingWalkin] = useState(false);

  // Sub-tabs & POS Workspace state
  const [activeSubTab, setActiveSubTab] = useState(
    initialSubTab || (user?.license_tier === "pharmacy" ? "sell" : "dispensing")
  );
  
  // Cart & POS state variables
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState("NONE"); // NONE, PERCENTAGE, FLAT
  const [discountValue, setDiscountValue] = useState(0);
  const [transactionType, setTransactionType] = useState("Bill Payment");
  const [paymentOption, setPaymentOption] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [narration, setNarration] = useState("");
  const [salesToType, setSalesToType] = useState("General Client"); // "General Client" or "Registered Patient"

  // Registered patient lookup states
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Held carts and transactions states
  const [heldCarts, setHeldCarts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState("cash");
  const [posSearchQuery, setPosSearchQuery] = useState("");
  const [posSearchResults, setPosSearchResults] = useState([]);
  const [posTransactions, setPosTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [posInvoices, setPosInvoices] = useState([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStartDate, setInvoiceStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [invoiceEndDate, setInvoiceEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Stock batches with specific lot code and expiries
  const [batches, setBatches] = useState([
    {
      name: "Artemether-Lumefantrine (AL)",
      batch: "AL-B902",
      stock: 50,
      expiry: "2026-10-15",
      unit: "doses",
    },
    {
      name: "Artemether-Lumefantrine (AL)",
      batch: "AL-B903",
      stock: 70,
      expiry: "2027-04-20",
      unit: "doses",
    },
    {
      name: "Paracetamol 500mg",
      batch: "PARA-L02",
      stock: 450,
      expiry: "2026-08-01",
      unit: "tabs",
    },
    {
      name: "Paracetamol 500mg",
      batch: "PARA-L03",
      stock: 400,
      expiry: "2027-02-10",
      unit: "tabs",
    },
    {
      name: "Amoxicillin 500mg",
      batch: "AMOX-B12",
      stock: 240,
      expiry: "2026-12-05",
      unit: "tabs",
    },
    {
      name: "Amoxicillin 500mg",
      batch: "AMOX-B13",
      stock: 100,
      expiry: "2027-09-18",
      unit: "tabs",
    },
    {
      name: "Metronidazole 400mg",
      batch: "MET-K90",
      stock: 410,
      expiry: "2027-03-30",
      unit: "tabs",
    },
    {
      name: "ORS + Zinc",
      batch: "ORS-Z01",
      stock: 95,
      expiry: "2026-09-10",
      unit: "sachets",
    },
    {
      name: "Ciprofloxacin 500mg",
      batch: "CIP-C44",
      stock: 180,
      expiry: "2027-01-15",
      unit: "tabs",
    },
  ]);

  const [prescriptionStates, setPrescriptionStates] = useState({}); // orderId -> 'prescribed'/'approved'/'cancelled'
  const [doubleChecked, setDoubleChecked] = useState({}); // orderId -> bool
  const [searchQuery, setSearchQuery] = useState("");
  const [customInstructions, setCustomInstructions] = useState({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockForm, setRestockForm] = useState({
    drugName: '',
    customName: '',
    batch: '',
    qty: '',
    expiry: ''
  });

  const getPatientAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    fetchPharmacyQueue();
    loadLocalInventory();
    fetchPosTransactions();
    fetchFacilityServices();
    fetchInventory();
    fetchPatients();
    fetchPosInvoices();
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
        const mockInventory = medicineMaster.slice(0, 30).map((med, idx) => ({
          id: `inv_mock_${idx}`,
          name: med.name || `${med.genericName} ${med.strength || ''}`,
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

  const fetchPosInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("facility_id", user?.facility_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosInvoices(data || []);
    } catch (err) {
      console.error("Error fetching POS invoices:", err);
    }
  };

  const handleAddToCart = (item, qtyInput) => {
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      if (showNotification) showNotification("error", "Invalid Quantity", "Please enter a valid quantity.");
      return;
    }

    if (qty > item.quantity_in_stock) {
      if (showNotification) showNotification("warning", "Low Stock", `Insufficient stock. Only ${item.quantity_in_stock} available.`);
      return;
    }

    const existingIdx = cart.findIndex((i) => i.id === item.id);
    if (existingIdx > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIdx].qty + qty;
      if (newQty > item.quantity_in_stock) {
        if (showNotification) showNotification("warning", "Low Stock", `Cannot exceed available stock of ${item.quantity_in_stock}.`);
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
        subtotal: qty * item.unit_price,
        unit: item.unit_of_measure || "units"
      }]);
    }
    if (showNotification) showNotification("success", "Added to Cart", `${item.name} added to cart.`);
  };

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

  const handleHoldCart = () => {
    if (cart.length === 0) {
      if (showNotification) showNotification("warning", "Empty Cart", "Cart is empty. Cannot hold.");
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
    if (showNotification) showNotification("info", "Cart Held", "Cart successfully placed on Hold.");
  };

  const handleRestoreHeld = (held) => {
    setCart(held.cart);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setSalesToType(held.salesToType);
    setSelectedPatient(held.selectedPatient);
    setHeldCarts(heldCarts.filter((c) => c.id !== held.id));
    setActiveSubTab("sell");
    if (showNotification) showNotification("success", "Cart Restored", "Held cart restored.");
  };

  const handleCheckout = async (sendToBilling = false) => {
    if (cart.length === 0) {
      if (showNotification) showNotification("warning", "Empty Cart", "Cart is empty.");
      return;
    }

    if (salesToType === "Registered Patient" && !selectedPatient) {
      if (showNotification) showNotification("warning", "Required Patient", "Please select a registered patient first.");
      return;
    }

    setLoading(true);
    try {
      if (sendToBilling) {
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
            payment_method: paymentOption.toLowerCase(),
            receipt_number: `POS-BILL-${Date.now().toString().slice(-6)}`,
            created_at: new Date().toISOString()
          });

        if (invErr) throw invErr;

        if (showNotification) showNotification("success", "Sent to Billing", "POS items successfully routed to Billing queue.");
      } else {
        const newInvoiceId = `inv_cash_${Date.now()}`;
        const finalPaid = amountPayable;

        const inventoryUpdates = cart.map((item) => {
          const invItem = inventory.find(i => i.id === item.id);
          const newQty = (invItem?.quantity_in_stock || item.qty) - item.qty;
          return supabase
            .from("inventory_items")
            .update({ quantity_in_stock: Math.max(0, newQty) })
            .eq("id", item.id);
        });

        await Promise.all(inventoryUpdates);

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

        await supabase.from("audit_logs").insert({
          facility_id: user.facility_id,
          user_id: user.id,
          action: "Direct POS Sale",
          details: `Processed direct ${paymentOption} sale of KES ${amountPayable.toFixed(2)}`
        });

        if (showNotification) showNotification("success", "Sale Complete", `Checkout successfully paid via ${paymentOption}!`);
      }

      // Generate receipt object for printable modal
      const receiptNumberVal = `POS-SALE-${Date.now().toString().slice(-6)}`;
      const cartDetails = cart.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        unit: item.unit,
        subtotal: item.qty * item.price
      }));

      setSelectedReceipt({
        id: `inv_cash_${Date.now()}`,
        facility_id: user.facility_id,
        total_amount: amountPayable,
        amount_paid: amountPayable,
        payment_method: paymentOption,
        receipt_number: receiptNumberVal,
        created_at: new Date().toISOString(),
        customer_name: selectedPatient ? selectedPatient.name : (posCustomerName || "Walk-in Customer"),
        customer_phone: selectedPatient ? selectedPatient.phone : (posCustomerPhone || "N/A"),
        items: cartDetails
      });
      setShowReceiptModal(true);

      handleClearCart();
      fetchInventory();
      fetchPosInvoices();
    } catch (err) {
      console.error("POS transaction failed:", err);
      if (showNotification) showNotification("error", "Transaction Failed", `Transaction failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityServices = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('services_list')
        .eq('id', user.facility_id)
        .single();
      if (!error && data) {
        setFacilityServices(data.services_list || []);
      }
    } catch (err) {
      console.error('Error fetching facility services:', err);
    }
  };

  const handleAddWalkinPrescription = async (e) => {
    e.preventDefault();
    if (!selectedWalkinDrug || !selectedVisit) return;
    setAddingWalkin(true);
    setMessage({ type: '', text: '' });
    
    try {
      const service = facilityServices.find(s => s.name === selectedWalkinDrug);
      const charge = service ? service.charge : 200;
      
      const newOrder = {
        visit_id: selectedVisit.id,
        type: 'prescription',
        item_name: selectedWalkinDrug,
        status: 'prescribed',
        price: charge
      };
      
      const { error } = await supabase.from('orders').insert(newOrder);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Walk-in Prescription Created',
        details: `Created direct walk-in prescription for ${selectedWalkinDrug} for patient ${selectedVisit?.patient?.name}.`
      });

      setMessage({ type: 'success', text: `Walk-in drug '${selectedWalkinDrug}' added successfully!` });
      setSelectedWalkinDrug('');
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      console.error('Error adding walkin prescription:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add walk-in prescription.' });
    } finally {
      setAddingWalkin(false);
    }
  };

  const fetchPosTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("facility_id", user?.facility_id)
        .is("visit_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosTransactions(data || []);
    } catch (err) {
      console.error("Error fetching POS transactions:", err);
    }
  };

  const getDrugStock = (drugName) => {
    return batches
      .filter((b) => b.name.toLowerCase() === drugName.toLowerCase())
      .reduce((sum, b) => sum + b.stock, 0);
  };



  const loadLocalInventory = () => {
    const savedInv = localStorage.getItem("egesa_pharmacy_batches");
    if (savedInv) {
      setBatches(JSON.parse(savedInv));
    } else {
      localStorage.setItem("egesa_pharmacy_batches", JSON.stringify(batches));
    }
  };

  const fetchPharmacyQueue = async () => {
    try {
      // Fetch visits waiting in pharmacy
      const { data: vsts } = await supabase
        .from("visits")
        .select("*")
        .eq("department", "pharmacy");
      const { data: pts } = await supabase.from("patients").select("*");

      // Also fetch visits that have pending prescriptions from EMR
      const { data: prescOrders } = await supabase
        .from("orders")
        .select("visit_id")
        .eq("type", "prescription")
        .eq("status", "prescribed");

      const prescVisitIds = prescOrders ? [...new Set(prescOrders.map(o => o.visit_id))] : [];

      let allVisits = vsts ? [...vsts] : [];
      const missingVisitIds = prescVisitIds.filter(id => !allVisits.some(v => v.id === id));

      if (missingVisitIds.length > 0) {
        const { data: extraVisits } = await supabase
          .from("visits")
          .select("*")
          .in("id", missingVisitIds);
        if (extraVisits) {
          allVisits = [...allVisits, ...extraVisits];
        }
      }

      const enrichedVisits = allVisits.map((v) => {
        const p = pts?.find((pt) => pt.id === v.patient_id);
        const hasPending = prescVisitIds.includes(v.id);
        return { ...v, patient: p, hasPendingPresc: hasPending };
      });

      setPharmVisits(enrichedVisits);

      if (enrichedVisits.length > 0) {
        const savedVisitId = sessionStorage.getItem('egesa_selected_visit_id_pharmacy');
        const matchedVisit = enrichedVisits.find(v => v.id === savedVisitId);
        const stillExists = enrichedVisits.find(
          (v) => v.id === selectedVisit?.id,
        );
        if (matchedVisit) {
          handleSelectVisit(matchedVisit);
        } else if (!stillExists) {
          handleSelectVisit(enrichedVisits[0]);
        } else {
          handleSelectVisit(stillExists);
        }
      } else {
        setSelectedVisit(null);
        setPendingPrescriptions([]);
      }
    } catch (err) {
      console.error("Error fetching pharmacy queue:", err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: "", text: "" });
    setDoubleChecked({});
    if (visit) {
      sessionStorage.setItem('egesa_selected_visit_id_pharmacy', visit.id);
    } else {
      sessionStorage.removeItem('egesa_selected_visit_id_pharmacy');
    }

    try {
      // Fetch pending and active prescriptions
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .eq("visit_id", visit.id)
        .eq("type", "prescription");

      setPendingPrescriptions(ords || []);

      // Initialize prescription statuses
      const initialStates = {};
      ords?.forEach((o) => {
        let statusVal = o.status || "prescribed";
        if (statusVal === "pending") statusVal = "prescribed";
        initialStates[o.id] = statusVal;
      });
      setPrescriptionStates(initialStates);
    } catch (err) {
      console.error("Error loading prescriptions:", err);
    }
  };

  // Perform FEFO batch allocation calculation dynamically
  const allocateStockFEFO = (drugName, qtyNeeded) => {
    // 1. Get all batches for this drug
    const drugBatches = batches.filter(
      (b) => b.name.toLowerCase() === drugName.toLowerCase(),
    );
    if (drugBatches.length === 0)
      return { allocated: [], status: "out_of_stock" };

    // 2. Sort by expiry ascending (earliest expiring first)
    const sorted = [...drugBatches].sort(
      (a, b) => new Date(a.expiry) - new Date(b.expiry),
    );

    let remainingNeeded = qtyNeeded;
    const allocated = [];

    for (const b of sorted) {
      if (b.stock <= 0) continue;

      if (b.stock >= remainingNeeded) {
        allocated.push({
          batch: b.batch,
          qty: remainingNeeded,
          expiry: b.expiry,
        });
        remainingNeeded = 0;
        break;
      } else {
        allocated.push({ batch: b.batch, qty: b.stock, expiry: b.expiry });
        remainingNeeded -= b.stock;
      }
    }

    if (remainingNeeded === qtyNeeded) {
      return { allocated: [], status: "out_of_stock" };
    }
    if (remainingNeeded > 0) {
      return {
        allocated,
        status: "partially_filled",
        remaining: remainingNeeded,
      };
    }
    return { allocated, status: "approved" };
  };

  const handleReviewStatus = async (orderId, newStatus) => {
    setPrescriptionStates({
      ...prescriptionStates,
      [orderId]: newStatus,
    });

    // Reset double check if status shifts
    setDoubleChecked({
      ...doubleChecked,
      [orderId]: false,
    });
  };

  const handleDispense = async (orderId) => {
    if (!doubleChecked[orderId]) {
      setMessage({
        type: "error",
        text: "Double-check verification required before release!",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const activeOrder = pendingPrescriptions.find((o) => o.id === orderId);
      const drugName = activeOrder?.item_name;
      // Default dispense units
      const qtyNeeded =
        drugName.includes("Paracetamol") || drugName.includes("Amoxicillin")
          ? 10
          : 1;

      // 1. Run FEFO stock checks and batch deduction
      const allocation = allocateStockFEFO(drugName, qtyNeeded);

      if (allocation.status === "out_of_stock") {
        throw new Error(
          `Medication ${drugName} is currently out of stock in inventory!`,
        );
      }

      // Deduct stock from the batches in local storage
      const updatedBatches = batches.map((b) => {
        const allocatedBatch = allocation.allocated.find(
          (a) => a.batch === b.batch,
        );
        if (allocatedBatch) {
          return { ...b, stock: Math.max(0, b.stock - allocatedBatch.qty) };
        }
        return b;
      });

      setBatches(updatedBatches);
      localStorage.setItem(
        "egesa_pharmacy_batches",
        JSON.stringify(updatedBatches),
      );

      // Serialize dispensing allocations inside results
      const dispenseMeta = {
        dispensed_batch: allocation.allocated
          .map((a) => `${a.batch} (${a.qty}u)`)
          .join(", "),
        dispensed_qty: `${qtyNeeded} ${updatedBatches.find((b) => b.name === drugName)?.unit || "units"}`,
        dispensed_at: new Date().toISOString(),
        dispensed_by: user.full_name,
        custom_instructions: customInstructions[orderId] || activeOrder.instructions
      };

      // 2. Mark order as completed/dispensed
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "dispensed",
          results: JSON.stringify(dispenseMeta),
        })
        .eq("id", orderId);

      if (orderErr) throw orderErr;

      // Log inventory decrement to audit log
      await supabase.from("audit_logs").insert({
        action: "Medication Dispense",
        details: `Dispensed ${qtyNeeded} units of ${drugName} for patient ${selectedVisit?.patient?.name} (Batches: ${dispenseMeta.dispensed_batch}).`,
      });

      // Trigger Notification
      try {
        await sendNotification(
          "PRESCRIPTION_DISPENSED",
          {
            patientName: selectedVisit?.patient?.name || "Patient",
            drugName,
            qtyDispensed: dispenseMeta.dispensed_qty,
            batches: dispenseMeta.dispensed_batch,
            pharmacist: user.full_name,
            recipientEmail: "patient@eagletechsolutions.tech",
          },
          user.facility_id,
        );
      } catch (e) {
        console.error("Pharmacy email trigger failed:", e);
      }

      // 3. Check if all prescriptions for this visit are completed/dispensed
      const updatedOrders = pendingPrescriptions.map((o) =>
        o.id === orderId ? { ...o, status: "dispensed" } : o,
      );
      const allDispensed = updatedOrders.every(
        (o) => o.status === "dispensed" || o.status === "cancelled",
      );

      if (allDispensed) {
        // Move visit to completed
        const { error: visitErr } = await supabase
          .from("visits")
          .update({
            department: "completed",
            status: "completed",
          })
          .eq("id", selectedVisit.id);
        if (visitErr) throw visitErr;

        if (showNotification) {
          showNotification('success', 'Prescriptions Dispensed', "All prescriptions dispensed. Visit successfully completed!");
        } else {
          setMessage({
            type: "success",
            text: "All prescriptions dispensed. Visit successfully completed!",
          });
        }
        setTimeout(() => {
          sessionStorage.removeItem('egesa_selected_visit_id_pharmacy');
          fetchPharmacyQueue();
          if (onComplete) onComplete();
        }, 1500);
      } else {
        if (showNotification) {
          showNotification('success', 'Drug Dispensed', `Successfully dispensed ${drugName}.`);
        } else {
          setMessage({
            type: "success",
            text: `Successfully dispensed ${drugName}.`,
          });
        }
        await handleSelectVisit(selectedVisit);
      }
    } catch (err) {
      if (showNotification) {
        showNotification('error', 'Dispense Failed', err.message || "Dispensing failed.");
      } else {
        setMessage({ type: "error", text: err.message || "Dispensing failed." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRestock = async (e) => {
    e.preventDefault();
    const { drugName, customName, batch, qty, expiry } = restockForm;
    
    const finalDrugName = drugName === "Custom" ? customName : drugName;
    if (!finalDrugName || !batch || !qty || !expiry) {
      setMessage({ type: "error", text: "Please fill in all restocking fields." });
      return;
    }

    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive quantity." });
      return;
    }

    // Find if medicine details exist to get the unit
    const medSchema = medicineMaster.find(m => 
      finalDrugName.toLowerCase().includes(m.genericName.toLowerCase()) ||
      m.genericName.toLowerCase().includes(finalDrugName.toLowerCase())
    );
    const unit = medSchema?.unit || "units";

    // Create new batch object
    const newBatch = {
      name: finalDrugName,
      batch: batch.toUpperCase(),
      stock: parsedQty,
      expiry: expiry,
      unit: unit
    };

    // Check if batch already exists in our batches list
    let updatedBatches;
    const existingIdx = batches.findIndex(b => b.name === finalDrugName && b.batch === newBatch.batch);
    if (existingIdx > -1) {
      // Add quantity to existing batch
      updatedBatches = batches.map((b, idx) => 
        idx === existingIdx ? { ...b, stock: b.stock + parsedQty, expiry: expiry } : b
      );
    } else {
      // Prepend new batch
      updatedBatches = [newBatch, ...batches];
    }

    setBatches(updatedBatches);
    localStorage.setItem("egesa_pharmacy_batches", JSON.stringify(updatedBatches));
    
    // Reset form and close modal
    setRestockForm({
      drugName: '',
      customName: '',
      batch: '',
      qty: '',
      expiry: ''
    });
    setShowRestockModal(false);

    // Add audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "Inventory Restocked",
        details: `Restocked ${parsedQty} ${unit} of ${finalDrugName} (Batch: ${newBatch.batch}, Expiry: ${expiry}) by ${user.full_name}.`
      });
    } catch (err) {
      console.error("Error logging restock to audit logs:", err);
    }

    if (showNotification) {
      showNotification('success', 'Stock Updated', `Inventory updated successfully for ${finalDrugName}!`);
    } else {
      setMessage({ type: "success", text: `Inventory updated successfully for ${finalDrugName}!` });
    }
  };

  // Determine low stock (< 100 units total) and near expiry (< 6 months)
  const isNearExpiry = (expiryStr) => {
    const expiryDate = new Date(expiryStr);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return expiryDate <= sixMonthsFromNow;
  };

  // Group batch data for total stock lookup
  const getAggregatedFormulary = () => {
    const map = {};
    batches.forEach((b) => {
      if (!map[b.name]) {
        map[b.name] = {
          name: b.name,
          totalStock: 0,
          unit: b.unit,
          isLow: false,
          nearExpiryBatches: [],
        };
      }
      map[b.name].totalStock += b.stock;
      if (isNearExpiry(b.expiry) && b.stock > 0) {
        map[b.name].nearExpiryBatches.push(b.batch);
      }
    });

    Object.keys(map).forEach((key) => {
      map[key].isLow = map[key].totalStock < 100;
    });

    return Object.values(map);
  };

  const aggregatedFormulary = getAggregatedFormulary();
  const filteredFormulary = aggregatedFormulary.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderDispensingView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Queue (Dispensing) or Ledger (POS) */}
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1 ${selectedVisit ? 'hidden lg:block' : 'block'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Pill size={14} className="text-teal-400" /> Prescriptions Queue
            </h2>
            <button
              onClick={fetchPharmacyQueue}
              className="text-slate-500 hover:text-white transition cursor-pointer"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Queue Items */}
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {pharmVisits.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectVisit(item)}
                className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                  selectedVisit?.id === item.id
                    ? "border-teal-500/60 bg-teal-500/5"
                    : "border-slate-800/80 bg-slate-950 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                    <span className="font-semibold text-slate-200 text-xs truncate font-sans">
                      {item.patient?.name}
                    </span>
                    {item.hasPendingPresc && (
                      <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[7px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0">
                        e-Presc
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[8px] px-1 rounded uppercase font-bold font-sans ${
                      item.priority === "emergency"
                        ? "bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse"
                        : "bg-slate-850 text-slate-400"
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 w-full font-mono">
                  <span>{item.patient?.facility_id_code}</span>
                  <span>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </button>
            ))}

            {pharmVisits.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-16 border border-dashed border-slate-800 rounded-xl font-sans">
                No prescriptions in queue.
              </div>
            )}
          </div>
        </div>

        {/* Main Panel: Interactive Dispensary */}
        <div className={`lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[550px] ${!selectedVisit ? 'hidden lg:block' : 'block'}`}>
          {selectedVisit && (
            <button
              type="button"
              onClick={() => setSelectedVisit(null)}
              className="lg:hidden w-full mb-4 py-2 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-[0.98]"
            >
              ← Back to Prescription Queue
            </button>
          )}
          {!selectedVisit ? (
            <div className="flex flex-col items-center justify-center py-32 text-center my-auto">
              <Pill size={54} className="text-slate-700 mb-2 animate-bounce" />
              <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wide">
                No Prescription Loaded
              </h3>
              <p className="text-slate-650 text-xs max-w-xs mt-1 font-sans">
                Select a patient from the pharmacy queue to review clinical
                suitability, inspect batches, and double-check dispensing records.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-800 gap-4">
                <div>
                  <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">
                    Clinical Prescriptions Dispensary Desk
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5">
                    {selectedVisit.patient?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedVisit.patient?.facility_id_code} | DOB:{" "}
                    {selectedVisit.patient?.dob}
                  </p>
                </div>
              </div>

              {message.text && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex gap-2.5 ${
                    message.type === "success"
                      ? "bg-green-500/5 border-green-500/20 text-green-400"
                      : "bg-red-500/5 border-red-500/20 text-red-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Prescription Items */}
              <div className="space-y-4">
                {pendingPrescriptions.map((presc) => {
                  const drugName = presc.item_name;
                  const state = prescriptionStates[presc.id] || "prescribed";
                  const isDispensed = presc.status === "dispensed";

                  // FEFO stock allocations lookups
                  const qtyNeeded = drugName.includes("Paracetamol") || drugName.includes("Amoxicillin") ? 10 : 1;
                  const allocation = allocateStockFEFO(drugName, qtyNeeded);

                  const parseOrderMeta = (metaStr) => {
                    try {
                      if (metaStr) return JSON.parse(metaStr);
                    } catch (e) {}
                    return {};
                  };

                  return (
                    <div
                      key={presc.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDispensed
                          ? "border-green-500/20 bg-green-500/5"
                          : state === "cancelled"
                            ? "border-red-500/10 bg-slate-950/40 opacity-60"
                            : "border-slate-800 bg-slate-950/60"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                          <h4 className="font-bold text-slate-100 text-sm">
                            {drugName}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-450 uppercase font-semibold">
                            <span>Qty Prescribed: {qtyNeeded}</span>
                            <span>·</span>
                            <span>Prescribed on: {new Date(presc.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Warning and Alerts */}
                          {(() => {
                            const itemInventory = aggregatedFormulary.find(
                              (i) => i.name.toLowerCase() === drugName.toLowerCase()
                            );
                            return (
                              itemInventory && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 font-mono block">
                                    Current Stock: {itemInventory.totalStock} {itemInventory.unit}
                                  </span>
                                  {itemInventory.nearExpiryBatches.length > 0 && (
                                    <span className="text-[9px] font-bold text-yellow-500 flex items-center gap-1">
                                      ⚠️ EXPIRE WARNING: Batches ({itemInventory.nearExpiryBatches.join(', ')}) expire in &lt; 6 months.
                                    </span>
                                  )}
                                </div>
                              )
                            );
                          })()}

                          {/* Dispensing Instructions Input */}
                          {!isDispensed && state === "approved" && (
                            <div className="space-y-2 mt-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-850 w-full max-w-sm">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Custom Printed Directions Label</label>
                              <input
                                type="text"
                                value={customInstructions[presc.id] !== undefined ? customInstructions[presc.id] : presc.instructions}
                                onChange={(e) => setCustomInstructions({
                                  ...customInstructions,
                                  [presc.id]: e.target.value
                                })}
                                placeholder="Take 1 tablet..."
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                              />
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[
                                  "1x3 (Take 1 tab 3 times a day for 5 days after food)",
                                  "1x2 (Take 1 tab twice a day for 7 days after food)",
                                  "1x1 (Take 1 tab once daily at bedtime)",
                                  "3x1 (Take 1 cap 3 times a day for 5 days before food)",
                                  "Sip 1 sachet ORS after every loose stool"
                                ].map((tpl) => (
                                  <button
                                    key={tpl}
                                    type="button"
                                    onClick={() => setCustomInstructions({
                                      ...customInstructions,
                                      [presc.id]: tpl
                                    })}
                                    className="text-[8px] font-bold bg-slate-955 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  >
                                    {tpl.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isDispensed && parseOrderMeta(presc.results).custom_instructions && (
                            <p className="text-[10px] text-teal-400 font-semibold mt-1.5">
                              Printed label directions: "{parseOrderMeta(presc.results).custom_instructions}"
                            </p>
                          )}

                          {/* Safety Alerts */}
                          {(() => {
                            const medDetails = medicineMaster.find(m => 
                              drugName.toLowerCase().includes(m.genericName.toLowerCase()) || 
                              m.genericName.toLowerCase().includes(drugName.toLowerCase())
                            );
                            if (!medDetails) return null;
                            
                            const age = getPatientAge(selectedVisit.patient?.dob);
                            const isFemale = selectedVisit.patient?.gender?.toLowerCase() === 'female';
                            const alerts = [];

                            if (medDetails.controlledDrugFlag) {
                              alerts.push({
                                text: "Controlled Substance - Secure Storage Required",
                                type: "controlled"
                              });
                            }
                            if (!medDetails.childSafeFlag && age < 12) {
                              alerts.push({
                                text: `Pediatric Warning: Avoid in children <12 yrs (Patient is ${age} yrs)`,
                                type: "pediatric"
                              });
                            }
                            if (!medDetails.pregnancySafeFlag && isFemale) {
                              alerts.push({
                                text: "Pregnancy Contraindication: Verify pregnancy/lactation status",
                                type: "pregnancy"
                              });
                            }

                            if (alerts.length === 0) return null;

                            return (
                              <div className="flex flex-col gap-1 mt-1.5">
                                {alerts.map((alert, idx) => {
                                  let badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                                  if (alert.type === "pregnancy") {
                                    badgeColor = "bg-yellow-550/10 text-yellow-455 border-yellow-500/20";
                                  } else if (alert.type === "controlled") {
                                    badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                  }
                                  return (
                                    <div key={idx} className={`text-[8px] px-1.5 py-0.5 rounded border ${badgeColor} font-bold w-fit flex items-center gap-1 uppercase tracking-wider`}>
                                      <ShieldAlert size={10} /> {alert.text}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                              isDispensed
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : state === "approved"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : state === "cancelled"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-yellow-500/10 text-yellow-455 border-yellow-500/20"
                            }`}
                          >
                            {isDispensed ? "dispensed" : state}
                          </span>

                          {/* FEFO Allocation Output */}
                          {!isDispensed && state !== "cancelled" && (
                            <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/60 text-[10px] space-y-1.5 font-sans">
                              <span className="font-bold text-teal-400 flex items-center gap-1">
                                <CornerDownRight size={10} /> Automated FEFO Rotation Allocation:
                              </span>

                              {allocation.status === "out_of_stock" ? (
                                <p className="text-red-400 font-semibold flex items-center gap-1">
                                  <ShieldAlert size={10} /> Out of stock! Cannot dispense.
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {allocation.allocated.map((a, idx) => (
                                    <p key={idx} className="text-slate-300 font-mono text-[9px]">
                                      Allocate <span className="font-bold text-teal-400">{a.qty}u</span> from Batch <span className="font-bold text-slate-100">{a.batch}</span> (Exp: {a.expiry})
                                    </p>
                                  ))}
                                  {allocation.status === "partially_filled" && (
                                    <p className="text-yellow-500 font-bold text-[9px] flex items-center gap-0.5">
                                      ⚠️ Partial Fill: {allocation.remaining} units short.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Workflow Actions */}
                          {!isDispensed && (
                            <div className="flex gap-1.5 mt-2">
                              {state === "prescribed" && (
                                <>
                                  <button
                                    onClick={() => handleReviewStatus(presc.id, "approved")}
                                    className="bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 font-bold py-1 px-2.5 rounded text-[10px] transition cursor-pointer"
                                  >
                                    Approve Review
                                  </button>
                                  <button
                                    onClick={() => handleReviewStatus(presc.id, "cancelled")}
                                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold py-1 px-2.5 rounded text-[10px] transition cursor-pointer"
                                  >
                                    Cancel Order
                                  </button>
                                </>
                              )}

                              {state === "approved" && (
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={doubleChecked[presc.id] || false}
                                      onChange={(e) => setDoubleChecked({ ...doubleChecked, [presc.id]: e.target.checked })}
                                      className="rounded bg-slate-900 border-slate-800 text-teal-400 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                                    />
                                    Verify Double-Check
                                  </label>

                                  <button
                                    onClick={() => handleDispense(presc.id)}
                                    disabled={!doubleChecked[presc.id] || allocation.status === "out_of_stock"}
                                    className="bg-teal-400 hover:bg-teal-300 disabled:opacity-40 disabled:pointer-events-none text-slate-955 font-extrabold py-1.5 px-3 rounded text-[10px] shadow transition active:scale-[0.97] cursor-pointer"
                                  >
                                    Dispense & Release
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Panel: Live Inventory */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Package size={14} className="text-teal-400" /> Formulary Inventory
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">FEFO Stock Lot Rotations</p>
            </div>
            <button
              onClick={() => setShowRestockModal(true)}
              className="text-[9px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 border border-teal-500/20 px-2 py-0.5 rounded hover:bg-teal-500/5 transition cursor-pointer font-sans"
            >
              <RefreshCw size={8} /> Restock
            </button>
          </div>

          <div className="relative font-sans">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medications..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
            />
            <Search size={11} className="absolute left-2.5 top-2.5 text-slate-600" />
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {filteredFormulary.map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-2">
                <div className="flex justify-between items-start gap-1 font-sans">
                  <span className="font-bold text-slate-200 text-xs truncate max-w-[75%]">{item.name}</span>
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    item.isLow ? "text-red-400 bg-red-500/5 border border-red-500/15" : "text-slate-400 bg-slate-850"
                  }`}>
                    {item.totalStock} {item.unit}
                  </span>
                </div>
                <div className="space-y-1 border-t border-slate-900 pt-1.5">
                  {batches.filter((b) => b.name === item.name).map((b, bIdx) => (
                    <div key={bIdx} className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Lot {b.batch} (exp: {b.expiry})</span>
                      <span className={isNearExpiry(b.expiry) ? "text-red-400 font-bold" : "text-slate-450"}>
                        {b.stock}u {isNearExpiry(b.expiry) && "⚠️ EXPIRY"}
                      </span>
                    </div>
                  ))}
                </div>
                {item.isLow && (
                  <div className="bg-red-500/5 border border-red-500/15 text-[8px] text-red-400 font-bold uppercase tracking-wider py-0.5 px-1.5 rounded flex items-center gap-1 w-fit font-sans">
                    <ShieldAlert size={10} /> Low Stock Alert!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSellView = () => {
    const filteredInventory = inventory.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(posSearchQuery.toLowerCase());
      const codeMatch = (item.code || "").toLowerCase().includes(posSearchQuery.toLowerCase());
      return nameMatch || codeMatch;
    });

    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);

    return (
      <div className="space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-teal-500/15 p-5 rounded-2xl">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">POS Sales Console</div>
            <h1 className="font-['Instrument_Serif',serif] text-2xl sm:text-3xl text-slate-100 font-normal mt-0.5">Pharmacy Sales Entry</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Manage walk-in medicine sales, inventory checkouts, and custom invoice routing</p>
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              {/* Search Controls */}
              <div className="flex gap-2.5 mb-5">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search item code, brand name, generic details..."
                    value={posSearchQuery}
                    onChange={(e) => { setPosSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-teal-400/50 outline-none"
                  />
                </div>
                <button 
                  onClick={fetchInventory}
                  className="flex items-center gap-1.5 bg-slate-955 border border-slate-805 text-teal-400 hover:bg-slate-950/80 font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Refresh Inventory
                </button>
              </div>

              {/* Catalog Table */}
              <div className="overflow-x-auto min-h-[380px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Item Description</th>
                      <th className="py-3 px-3 text-center">Av_Qty</th>
                      <th className="py-3 px-3 text-center" style={{ width: "90px" }}>Qty</th>
                      <th className="py-3 px-3 text-right">Price (KES)</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                    {currentItems.map((item) => {
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
                              defaultValue="1"
                              id={`qty_${item.id}`}
                              className="w-16 px-2 py-1 bg-slate-950/60 border border-slate-800 rounded text-center text-xs font-semibold text-slate-200 outline-none focus:border-teal-400/50"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-['JetBrains_Mono',monospace] font-bold">
                            {parseFloat(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                const input = document.getElementById(`qty_${item.id}`);
                                const qtyVal = input ? input.value : "1";
                                handleAddToCart(item, qtyVal);
                              }}
                              disabled={item.quantity_in_stock <= 0}
                              className="bg-teal-400 hover:bg-teal-300 disabled:bg-slate-800 text-slate-955 disabled:text-slate-655 font-bold px-3.5 py-1 rounded transition text-[11px] active:scale-[0.95] cursor-pointer"
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
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4 text-[11px] text-slate-400 font-medium">
                <div>
                  Showing page {currentPage} of {totalPages} (Total {filteredInventory.length} items)
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:border-teal-400/30 disabled:opacity-40 transition cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:border-teal-400/30 disabled:opacity-40 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-3.5 py-1 bg-teal-500/10 border border-teal-500/25 text-teal-400 font-bold rounded">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:border-teal-400/30 disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:border-teal-400/30 disabled:opacity-40 transition cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Cart and Payment details (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={15} className="text-teal-400" />
                  <h2 className="font-['Instrument_Serif',serif] text-lg text-slate-100 font-normal">Cart Items</h2>
                </div>
                <button
                  onClick={handleClearCart}
                  className="text-[10px] font-bold uppercase text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-sans"
                >
                  Clear Cart
                </button>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl flex justify-between items-center text-xs">
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
                        className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
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
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales To</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => { setSalesToType("General Client"); setSelectedPatient(null); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salesToType === "General Client" ? "bg-teal-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    General Client
                  </button>
                  <button
                    onClick={() => setSalesToType("Registered Patient")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salesToType === "Registered Patient" ? "bg-teal-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Registered Patient
                  </button>
                </div>
              </div>

              {/* Registered Patient Lookup */}
              {salesToType === "Registered Patient" && (
                <div className="bg-slate-950/40 border border-slate-805 p-3 rounded-xl space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Patient Profile</span>
                    {selectedPatient && (
                      <button onClick={() => setSelectedPatient(null)} className="text-[9px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer">
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
                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                      />

                      {showPatientSearch && patientSearchQuery && (
                        <div className="absolute left-0 right-0 bg-slate-950 border border-slate-800 rounded-xl mt-1 max-h-[150px] overflow-y-auto z-10 p-1 shadow-lg">
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
                                className="w-full text-left p-2 hover:bg-slate-800 rounded-lg text-xs text-slate-300 block transition-colors cursor-pointer"
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
              <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0); }}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 outline-none font-mono font-bold"
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
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 outline-none font-bold"
                  >
                    <option value="CASH">CASH</option>
                    <option value="M-PESA">M-PESA</option>
                    <option value="CARD">CARD</option>
                    <option value="INSURANCE">INSURANCE</option>
                  </select>
                </div>
              </div>

              {/* Amounts */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
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
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-xs">
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
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Amount to be Paid</label>
                    <input
                      type="text"
                      placeholder="Enter amount..."
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 outline-none font-['JetBrains_Mono',monospace]"
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
                    className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold py-2.5 rounded-xl text-[11px] transition hover:bg-amber-500/25 active:scale-[0.97] cursor-pointer"
                  >
                    Hold Sale
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold py-2.5 rounded-xl text-[11px] transition hover:bg-rose-500/25 active:scale-[0.97] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading || cart.length === 0}
                    onClick={() => handleCheckout(salesToType === "Registered Patient")}
                    className="bg-teal-400 text-slate-955 font-black py-2.5 rounded-xl text-[11px] transition hover:bg-teal-300 disabled:bg-slate-800 disabled:text-slate-655 active:scale-[0.97] shadow-lg shadow-teal-500/10 col-span-1 cursor-pointer"
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
  };

  const renderModifyView = () => {
    return (
      <div className="space-y-6 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Held Invoices</div>
          <h2 className="font-['Instrument_Serif',serif] text-xl sm:text-2xl text-slate-100 font-normal mt-0.5">Suspended Sales Queue</h2>
          <p className="text-[11px] text-slate-500 mt-1 font-sans">Review sales placed on hold, restore them to active cart, or discard them</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {heldCarts.map((h) => (
              <div key={h.id} className="border border-orange-500/20 bg-orange-500/5 p-4 rounded-xl flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Suspended Cart</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">{h.time}</span>
                  </div>
                  <div className="text-slate-100 font-extrabold text-base mt-2 font-mono">KES {h.total.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans">
                    {h.cart.length} items · {h.salesToType}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 line-clamp-2">
                    Items: {h.cart.map(item => `${item.name} (${item.qty})`).join(', ')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestoreHeld(h)}
                    className="flex-1 bg-orange-400 hover:bg-orange-300 text-slate-955 font-bold text-xs py-1.5 rounded-lg transition text-center cursor-pointer"
                  >
                    Restore Cart
                  </button>
                  <button
                    onClick={() => setHeldCarts(heldCarts.filter(c => c.id !== h.id))}
                    className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
            {heldCarts.length === 0 && (
              <div className="col-span-full border border-dashed border-slate-800 rounded-xl p-16 text-center text-slate-500 text-xs">
                No suspended sales on hold.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPaidView = () => {
    const filteredInvoices = posInvoices.filter((inv) => {
      const date = new Date(inv.created_at).toISOString().split('T')[0];
      const isInDateRange = date >= invoiceStartDate && date <= invoiceEndDate;
      
      const query = invoiceSearchQuery.toLowerCase();
      const refMatch = (inv.receipt_number || "").toLowerCase().includes(query);
      const nameMatch = (inv.checkout_id && inv.checkout_id.toLowerCase().includes(query)) || (inv.customer_name && inv.customer_name.toLowerCase().includes(query)) || false;
      const amountMatch = String(inv.total_amount).includes(query);
      
      return isInDateRange && (query === "" || refMatch || nameMatch || amountMatch);
    });

    return (
      <div className="space-y-6 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Billing Log</div>
          <h2 className="font-['Instrument_Serif',serif] text-xl sm:text-2xl text-slate-100 font-normal mt-0.5">Pharmacy POS Receive Cash</h2>
          <p className="text-[11px] text-slate-500 mt-1 font-sans">Review all settled payments, verify transaction receipts, or export logs</p>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Receipt / Ref / Narration</label>
              <input
                type="text"
                placeholder="Search receipt, ref, narration..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder:text-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Start Date</label>
              <input
                type="date"
                value={invoiceStartDate}
                onChange={(e) => setInvoiceStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">End Date</label>
              <input
                type="date"
                value={invoiceEndDate}
                onChange={(e) => setInvoiceEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={fetchPosInvoices}
                className="bg-teal-400 hover:bg-teal-300 text-slate-955 font-bold text-xs py-2 rounded-lg transition cursor-pointer"
              >
                Search Receipts
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Patient/Customer</th>
                  <th className="py-3 px-3">Ref/Receipt</th>
                  <th className="py-3 px-3">Txn Type</th>
                  <th className="py-3 px-3">Option</th>
                  <th className="py-3 px-3 text-right">Amount Payable</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Process Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInvoices.map((inv) => {
                  const itemsList = parseCheckoutItems(inv.checkout_id);
                  const isPaid = inv.status?.toLowerCase() === 'paid';
                  const dateStr = new Date(inv.created_at).toLocaleString();
                  const custName = inv.customer_name || (inv.visit_id ? "Enrolled Patient" : "General Client");

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{dateStr}</td>
                      <td className="py-3 px-3 font-bold text-slate-100">{custName}</td>
                      <td className="py-3 px-3 font-mono text-teal-400">{inv.receipt_number || inv.id.slice(-6)}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-450 font-sans">CASH SALE</td>
                      <td className="py-3 px-3 uppercase font-mono text-[10px] text-slate-400">{inv.payment_method || "CASH"}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono">KES {parseFloat(inv.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500 font-bold">
                        KES {Math.max(0, parseFloat(inv.total_amount) - parseFloat(inv.amount_paid)).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isPaid ? 'bg-green-500/10 text-green-400 font-extrabold' : 'bg-red-500/10 text-red-400 font-extrabold'
                        }`}>
                          {isPaid ? 'PAID' : 'NOT PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedReceipt({
                              ...inv,
                              customer_name: custName,
                              items: itemsList.length > 0 ? itemsList : [{ name: "Walk-in Drug Sale", qty: 1, price: inv.total_amount, unit: "units", subtotal: inv.total_amount }]
                            });
                            setShowReceiptModal(true);
                          }}
                          className="bg-teal-500/15 border border-teal-500/35 hover:bg-teal-500/25 text-teal-400 font-bold px-3 py-1 rounded transition text-[11px] cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No invoices found for this date range/query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeSubTab) {
      case "dispensing":
        return renderDispensingView();
      case "sell":
        return renderSellView();
      case "modify":
        return renderModifyView();
      case "paid":
        return renderPaidView();
      default:
        return renderDispensingView();
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none md:flex-row flex-col min-h-screen">
      {/* Inner Secondary Sidebar */}
      <div className="w-full md:w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill size={16} className="text-teal-400" />
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">Pharmacy Desk</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("dispensing");
              setMessage({ type: "", text: "" });
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              activeSubTab === "dispensing"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="text-[10px]">✳</span> Dispense Queue
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("sell");
              setMessage({ type: "", text: "" });
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              activeSubTab === "sell"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="text-[10px]">✳</span> Sell Drug(s)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("modify");
              setMessage({ type: "", text: "" });
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              activeSubTab === "modify"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="text-[10px]">✳</span> Modify Sale
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("paid");
              setMessage({ type: "", text: "" });
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              activeSubTab === "paid"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-extrabold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="text-[10px]">✳</span> Paid Drugs
          </button>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-slate-950">
        {renderActiveView()}
      </div>

      {/* Restocking Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                  <Package size={16} className="text-teal-400" /> Restock Medicine Inventory
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Add a new batch or top up existing lots</p>
              </div>
              <button 
                onClick={() => setShowRestockModal(false)}
                className="text-slate-500 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4 text-[11px] font-sans">
              {/* Select Medicine */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Select Medication</label>
                <select
                  value={restockForm.drugName}
                  onChange={(e) => setRestockForm({ ...restockForm, drugName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 w-full text-xs"
                  required
                >
                  <option value="">-- Choose Medication --</option>
                  {medicineMaster.map((m) => {
                    const nameWithStrength = `${m.genericName} ${m.strength || ""}`.trim();
                    return (
                      <option key={m.id} value={nameWithStrength}>
                        {nameWithStrength} ({m.therapeuticClass})
                      </option>
                    );
                  })}
                  <option value="Custom">-- Custom / Other Drug --</option>
                </select>
              </div>

              {/* Custom Name if chosen */}
              {restockForm.drugName === "Custom" && (
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Custom Drug Name</label>
                  <input
                    type="text"
                    value={restockForm.customName || ''}
                    onChange={(e) => setRestockForm({ ...restockForm, customName: e.target.value })}
                    placeholder="Enter generic and strength (e.g. Ciprofloxacin 500mg)"
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 w-full text-xs"
                    required
                  />
                </div>
              )}

              {/* Batch Code & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Batch / Lot Code</label>
                  <input
                    type="text"
                    value={restockForm.batch}
                    onChange={(e) => setRestockForm({ ...restockForm, batch: e.target.value })}
                    placeholder="e.g. PARA-L04"
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 w-full text-xs"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Quantity</label>
                  <input
                    type="number"
                    value={restockForm.qty}
                    onChange={(e) => setRestockForm({ ...restockForm, qty: e.target.value })}
                    placeholder="e.g. 200"
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 w-full text-xs"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Expiry Date</label>
                <input
                  type="date"
                  value={restockForm.expiry}
                  onChange={(e) => setRestockForm({ ...restockForm, expiry: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500 w-full text-xs"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2 px-4 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-bold py-2 px-4 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide font-sans">
                  Payment Receipt
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Receipt #{selectedReceipt.receipt_number || "Draft"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="text-slate-500 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Slip */}
            <div
              id="printable-receipt-area"
              className="bg-white text-slate-900 p-5 rounded-xl border border-slate-200 font-sans text-xs space-y-4 shadow-inner animate-in fade-in duration-100"
            >
              {/* Style block for print layout */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-receipt-area, #printable-receipt-area * {
                    visibility: visible !important;
                  }
                  #printable-receipt-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                }
              `}} />

              {/* Facility Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <h4 className="text-sm font-black uppercase tracking-wide text-slate-955">
                  {user?.facility_name || "Egesa Pharmacy"}
                </h4>
                {user?.facility_address && (
                  <p className="text-[10px] text-slate-500">{user.facility_address}</p>
                )}
                <p className="text-[9px] text-slate-450">
                  Tel: +254 700 000 000 | Email: contact@eagletechsolutions.tech
                </p>
              </div>

              {/* Invoice Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[10px] py-1">
                <div>
                  <p className="text-slate-450">Customer Details:</p>
                  <p className="font-semibold text-slate-805">
                    {selectedReceipt.customer_name || "Walk-in Customer"}
                  </p>
                  {selectedReceipt.customer_phone && selectedReceipt.customer_phone !== "N/A" && (
                    <p className="text-slate-450">{selectedReceipt.customer_phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-450">Receipt No:</p>
                  <p className="font-bold text-slate-905">
                    #{selectedReceipt.receipt_number || "N/A"}
                  </p>
                  <p className="text-slate-450">
                    {new Date(selectedReceipt.created_at).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {/* Table of Items */}
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-455 uppercase tracking-wider font-bold">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedReceipt.items?.map((item, idx) => (
                    <tr key={idx} className="text-slate-800">
                      <td className="py-1.5 pr-2 font-medium">{item.name}</td>
                      <td className="py-1.5 text-center font-mono">{item.qty}</td>
                      <td className="py-1.5 text-right font-mono">
                        {parseFloat(item.price).toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {parseFloat(item.subtotal || item.qty * item.price).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-right text-[10px]">
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    KES {parseFloat(selectedReceipt.total_amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-xs">
                  <span>Amount Paid:</span>
                  <span className="font-mono">
                    KES {parseFloat(selectedReceipt.amount_paid).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-450">
                  <span>Payment Method:</span>
                  <span className="uppercase font-semibold">
                    {selectedReceipt.payment_method}
                  </span>
                </div>
              </div>

              {/* Footer message */}
              <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-3 space-y-1">
                <p className="font-bold text-slate-700">Thank you for your business!</p>
                <p>Medicines once sold cannot be returned.</p>
                <p className="text-[8px] text-slate-400">Powered by Egesa Tech HMIS</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-bold py-2 px-4 rounded-lg text-xs shadow-md transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
