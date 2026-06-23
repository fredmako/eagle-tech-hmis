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
  DollarSign
} from "lucide-react";
import { medicineMaster } from "../../medicalMaster";

export default function Pharmacy({ user, onComplete, showNotification }) {
  const [pharmVisits, setPharmVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [facilityServices, setFacilityServices] = useState([]);
  const [selectedWalkinDrug, setSelectedWalkinDrug] = useState('');
  const [addingWalkin, setAddingWalkin] = useState(false);

  // Sub-tabs & POS Workspace state
  const [activeSubTab, setActiveSubTab] = useState(
    user?.license_tier === "pharmacy" ? "pos" : "dispensing"
  );
  const [posCart, setPosCart] = useState([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState("cash");
  const [posSearchQuery, setPosSearchQuery] = useState("");
  const [posSearchResults, setPosSearchResults] = useState([]);
  const [posTransactions, setPosTransactions] = useState([]);
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
  }, []);

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

  const handleAddToCart = (drug) => {
    const drugName = `${drug.genericName} ${drug.strength || ""}`.trim();
    const existing = posCart.find((item) => item.name === drugName);
    if (existing) {
      handleUpdateCartQty(existing.id, existing.qty + 1);
    } else {
      const defaultPrice = drug.price || 10;
      const unit = drug.unit || "units";
      const newItem = {
        id: drug.id || `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: drugName,
        qty: 1,
        price: defaultPrice,
        unit: unit,
      };
      setPosCart([...posCart, newItem]);
    }
    setPosSearchQuery("");
    setPosSearchResults([]);
  };

  const handleUpdateCartQty = (id, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty <= 0) return;
    setPosCart(
      posCart.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const handleUpdateCartPrice = (id, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    setPosCart(
      posCart.map((item) => (item.id === id ? { ...item, price } : item))
    );
  };

  const handleRemoveFromCart = (id) => {
    setPosCart(posCart.filter((item) => item.id !== id));
  };

  const parseCheckoutItems = (checkoutIdVal) => {
    try {
      if (checkoutIdVal) {
        return JSON.parse(checkoutIdVal);
      }
    } catch (e) {
      console.error("Failed to parse checkout items:", e);
    }
    return [];
  };

  const handleCheckoutPOS = async (e) => {
    e.preventDefault();
    if (posCart.length === 0) {
      setMessage({ type: "error", text: "Cart is empty. Please add items before checking out." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Validate stock for each item using FEFO allocation
      const allocations = [];
      for (const item of posCart) {
        const allocation = allocateStockFEFO(item.name, item.qty);
        if (allocation.status === "out_of_stock") {
          throw new Error(`Insufficient stock for ${item.name}. Total stock available is ${getDrugStock(item.name)} ${item.unit}.`);
        }
        if (allocation.status === "partially_filled") {
          throw new Error(`Insufficient stock for ${item.name}. Only ${item.qty - allocation.remaining} units can be allocated from batches.`);
        }
        allocations.push({ item, allocation });
      }

      // 2. All items have sufficient stock. Deduct stock from batches.
      let updatedBatches = [...batches];
      allocations.forEach(({ item, allocation }) => {
        updatedBatches = updatedBatches.map((b) => {
          const allocatedBatch = allocation.allocated.find((a) => a.batch === b.batch);
          if (allocatedBatch) {
            return { ...b, stock: Math.max(0, b.stock - allocatedBatch.qty) };
          }
          return b;
        });
      });

      // 3. Save updated batches to State and LocalStorage
      setBatches(updatedBatches);
      localStorage.setItem("egesa_pharmacy_batches", JSON.stringify(updatedBatches));

      // 4. Generate transaction invoice in database
      const invoiceId = `inv_${Math.random().toString(36).substring(2, 15)}`;
      const receiptNumber = Math.floor(100000 + Math.random() * 900000).toString();
      const totalAmount = posCart.reduce((sum, item) => sum + item.qty * item.price, 0);

      // Serialize cart details
      const cartDetails = posCart.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        unit: item.unit,
        subtotal: item.qty * item.price
      }));

      const { error: invoiceErr } = await supabase.from("invoices").insert({
        id: invoiceId,
        facility_id: user?.facility_id,
        visit_id: null,
        total_amount: totalAmount,
        amount_paid: totalAmount,
        status: "paid",
        payment_method: posPaymentMethod,
        receipt_number: receiptNumber,
        checkout_id: JSON.stringify(cartDetails)
      });

      if (invoiceErr) throw invoiceErr;

      // 5. Insert audit log
      const itemsSummary = posCart.map(item => `${item.name} (${item.qty} ${item.unit} @ KES ${item.price})`).join(", ");
      await supabase.from("audit_logs").insert({
        facility_id: user?.facility_id,
        user_id: user?.id,
        action: "POS Walk-in Sale",
        details: `Recorded POS Walk-in Sale. Total: KES ${totalAmount} via ${posPaymentMethod.toUpperCase()} (Receipt: ${receiptNumber}, Items: ${itemsSummary}).`
      });

      // 6. Set receipt details for printable modal
      const transactionRecord = {
        id: invoiceId,
        facility_id: user?.facility_id,
        total_amount: totalAmount,
        amount_paid: totalAmount,
        payment_method: posPaymentMethod,
        receipt_number: receiptNumber,
        created_at: new Date().toISOString(),
        customer_name: posCustomerName || "Walk-in Customer",
        customer_phone: posCustomerPhone || "N/A",
        items: cartDetails
      };

      setSelectedReceipt(transactionRecord);
      setShowReceiptModal(true);

      // 7. Reset POS state
      setPosCart([]);
      setPosCustomerName("");
      setPosCustomerPhone("");
      setPosPaymentMethod("cash");
      setMessage({ type: "success", text: `POS Sale completed! Receipt #${receiptNumber} generated.` });

      // 8. Refresh POS transaction history list
      fetchPosTransactions();
    } catch (err) {
      console.error("POS Sale Error:", err);
      setMessage({ type: "error", text: err.message || "Failed to process POS sale." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!posSearchQuery.trim()) {
      setPosSearchResults([]);
      return;
    }
    const query = posSearchQuery.toLowerCase();
    const filtered = medicineMaster.filter(
      (m) =>
        m.genericName.toLowerCase().includes(query) ||
        (m.brandName && m.brandName.toLowerCase().includes(query))
    );
    setPosSearchResults(filtered.slice(0, 10));
  }, [posSearchQuery]);

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

      const enrichedVisits = vsts
        ? vsts.map((v) => {
            const p = pts?.find((pt) => pt.id === v.patient_id);
            return { ...v, patient: p };
          })
        : [];

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Queue (Dispensing) or Ledger (POS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        {activeSubTab === "dispensing" ? (
          <>
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
                    <span className="font-semibold text-slate-200 text-xs truncate max-w-[65%] font-sans">
                      {item.patient?.name}
                    </span>
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
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <ShoppingCart size={14} className="text-teal-400" /> POS Sales Ledger
              </h2>
              <button
                onClick={fetchPosTransactions}
                className="text-slate-500 hover:text-white transition cursor-pointer"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Today's Transactions */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {posTransactions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const parsedItems = parseCheckoutItems(item.checkout_id);
                    setSelectedReceipt({
                      ...item,
                      customer_name: item.customer_name || "Walk-in Customer",
                      customer_phone: item.customer_phone || "N/A",
                      items: parsedItems.length > 0 ? parsedItems : [{ name: "Walk-in Drug Sale", qty: 1, price: item.total_amount, unit: "units", subtotal: item.total_amount }]
                    });
                    setShowReceiptModal(true);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-800/80 bg-slate-950 hover:bg-slate-800/50 transition flex flex-col gap-1.5 cursor-pointer"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-slate-200 text-xs truncate max-w-[65%] font-sans">
                      Receipt #{item.receipt_number || item.id.substring(0, 8)}
                    </span>
                    <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                      {item.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 w-full font-mono">
                    <span>KES {parseFloat(item.total_amount).toLocaleString()}</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </button>
              ))}

              {posTransactions.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-16 border border-dashed border-slate-800 rounded-xl font-sans">
                  No sales recorded today.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Panel: Interactive Dispensary & POS Cart */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[550px]">
        <div>
          {/* Subtab selection header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("dispensing");
                  setMessage({ type: "", text: "" });
                }}
                className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeSubTab === "dispensing"
                    ? "bg-teal-400 text-slate-955 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Prescription Dispensing
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("pos");
                  setMessage({ type: "", text: "" });
                }}
                className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeSubTab === "pos"
                    ? "bg-teal-400 text-slate-955 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Walk-in POS Sales
              </button>
            </div>
            {activeSubTab === "pos" && (
              <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono">
                Active POS Cart: {posCart.length} items
              </span>
            )}
          </div>

          {activeSubTab === "pos" ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider font-sans">
                  Direct OTC & Walk-in Sale Cart
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5 font-sans">
                  New Walk-in Transaction
                </h3>
                <p className="text-[11px] text-slate-500 font-sans">
                  Search drugs from Master List, verify FEFO batch inventory, and record direct client settlements.
                </p>
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-xl border text-xs flex gap-2.5 font-sans ${
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

              {/* Autocomplete Search input */}
              <div className="relative font-sans">
                <label className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block mb-1">Search & Add Medicine</label>
                <div className="relative">
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Search by generic or brand name (e.g. Paracetamol)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
                  />
                  <Search
                    size={13}
                    className="absolute left-2.5 top-3 text-slate-600"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {posSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                    {posSearchResults.map((m) => {
                      const name = `${m.genericName} ${m.strength || ""}`.trim();
                      const stock = getDrugStock(name);
                      const isOutOfStock = stock <= 0;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleAddToCart(m)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 transition flex items-center justify-between text-xs border-b border-slate-850/50 cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-200 block">
                              {name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {m.brandName ? `${m.brandName} · ` : ""}{m.therapeuticClass}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-teal-400 block font-mono">KES {m.price || 10}</span>
                            <span className={`text-[10px] font-mono ${isOutOfStock ? "text-red-400 font-bold" : "text-slate-500"}`}>
                              {stock} {m.unit || "units"} available
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart size={13} /> Selected Cart Items
                </h4>

                {posCart.length === 0 ? (
                  <div className="border border-dashed border-slate-850 rounded-xl p-8 text-center text-slate-500 text-xs">
                    Cart is empty. Search and select medications above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {posCart.map((item) => {
                      const allocation = allocateStockFEFO(item.name, item.qty);
                      const isStockExceeded = allocation.status === "out_of_stock" || allocation.status === "partially_filled";
                      const available = getDrugStock(item.name);

                      return (
                        <div key={item.id} className="bg-slate-950 border border-slate-855 p-3 rounded-xl flex flex-col gap-2 transition hover:border-slate-800">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-200 text-xs block truncate">{item.name}</span>
                              <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
                                <span>Unit: {item.unit}</span>
                                <span className="font-mono">In Stock: {available}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="text-red-400 hover:text-red-300 transition p-1 hover:bg-red-500/10 rounded cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-3 items-center">
                            {/* Quantity */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateCartQty(item.id, e.target.value)}
                                className="bg-slate-900 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500 font-mono w-full"
                              />
                            </div>
                            {/* Selling Price */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Price (KES)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.price}
                                onChange={(e) => handleUpdateCartPrice(item.id, e.target.value)}
                                className="bg-slate-900 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500 font-mono w-full"
                              />
                            </div>
                            {/* Subtotal */}
                            <div className="flex flex-col gap-1 text-right">
                              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider pr-1">Total</label>
                              <span className="text-xs font-bold text-slate-200 font-mono py-1 pr-1">
                                KES {(item.qty * item.price).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* FEFO allocation display inside cart */}
                          <div className="bg-slate-900/40 p-2 rounded border border-slate-900/60 text-[9px] space-y-1">
                            {isStockExceeded ? (
                              <p className="text-red-400 font-bold flex items-center gap-1">
                                <ShieldAlert size={10} /> Insufficient stock! (Only {available}u available)
                              </p>
                            ) : (
                              <div className="space-y-0.5 font-mono text-slate-500">
                                <span className="font-bold text-teal-400/80 block">FEFO Allocation:</span>
                                {allocation.allocated.map((a, i) => (
                                  <p key={i}>
                                    Deduct <span className="text-slate-300 font-bold">{a.qty}u</span> from Batch <span className="text-teal-400 font-bold">{a.batch}</span> (exp {a.expiry})
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer details & Checkout panel */}
              {posCart.length > 0 && (
                <form onSubmit={handleCheckoutPOS} className="border-t border-slate-850 pt-4 space-y-4 font-sans">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Client Name (Optional)</label>
                      <input
                        type="text"
                        value={posCustomerName}
                        onChange={(e) => setPosCustomerName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Phone (Optional)</label>
                      <input
                        type="text"
                        value={posCustomerPhone}
                        onChange={(e) => setPosCustomerPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-850/60">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Payment Method</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-1.5 text-xs text-slate-350 font-semibold cursor-pointer select-none">
                          <input
                            type="radio"
                            name="posPayment"
                            value="cash"
                            checked={posPaymentMethod === "cash"}
                            onChange={() => setPosPaymentMethod("cash")}
                            className="bg-slate-900 border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          Cash
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-355 font-semibold cursor-pointer select-none">
                          <input
                            type="radio"
                            name="posPayment"
                            value="mpesa"
                            checked={posPaymentMethod === "mpesa"}
                            onChange={() => setPosPaymentMethod("mpesa")}
                            className="bg-slate-900 border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          M-Pesa
                        </label>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-550 uppercase font-bold block">Gross Total</span>
                      <span className="font-['JetBrains_Mono',monospace] text-xl font-black text-teal-400">
                        KES {posCart.reduce((sum, item) => sum + item.qty * item.price, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || posCart.some(item => allocateStockFEFO(item.name, item.qty).status !== "approved")}
                    className="w-full bg-teal-400 hover:bg-teal-300 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg transition active:scale-[0.98] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer animate-in fade-in duration-200"
                  >
                    <DollarSign size={14} /> Record POS Sale & Print Receipt
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Prescription Dispensing UI */
            !selectedVisit ? (
              <div className="flex flex-col items-center justify-center py-32 text-center my-auto">
                <Pill size={54} className="text-slate-700 mb-2 animate-bounce" />
                <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wide">
                  No Prescription Loaded
                </h3>
                <p className="text-slate-650 text-xs max-w-xs mt-1">
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

                {/* Prescribed Items */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Prescribed Meds & FEFO Stock Checker
                  </h4>

                  <div className="space-y-4">
                    {pendingPrescriptions.map((presc) => {
                      const state = prescriptionStates[presc.id] || "prescribed";
                      const isDispensed = presc.status === "dispensed";
                      const drugName = presc.item_name;
                      const qtyNeeded =
                        drugName.includes("Paracetamol") ||
                        drugName.includes("Amoxicillin")
                          ? 10
                          : 1;

                      // Calculate dynamic batch allocation
                      const allocation = allocateStockFEFO(drugName, qtyNeeded);
                      const isChecked = doubleChecked[presc.id];

                      return (
                        <div
                          key={presc.id}
                          className="bg-slate-950 border border-slate-855 p-4 rounded-xl space-y-3"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="font-bold text-slate-200 text-xs block">
                                {drugName}
                              </span>
                              <p className="text-[10px] text-slate-500 font-medium">
                                Sig: {presc.instructions}
                              </p>
                              {/* Stock Warning Indicators */}
                              {(() => {
                                const itemInventory = aggregatedFormulary.find(i => i.name === drugName);
                                const hasLowStock = itemInventory ? itemInventory.isLow : false;
                                const hasNearExpiry = itemInventory ? itemInventory.nearExpiryBatches.length > 0 : false;
                                return (
                                  (hasLowStock || hasNearExpiry) && (
                                    <div className="flex flex-col gap-1 mt-1.5 bg-slate-900/60 p-2 rounded-lg border border-red-500/10">
                                      {hasLowStock && (
                                        <span className="text-[9px] text-red-450 font-bold flex items-center gap-1">
                                          ⚠️ LOW STOCK: Only {itemInventory.totalStock} units available in inventory.
                                        </span>
                                      )}
                                      {hasNearExpiry && (
                                        <span className="text-[9px] text-yellow-450 font-bold flex items-center gap-1">
                                          ⚠️ EXPIRE WARNING: Batches ({itemInventory.nearExpiryBatches.join(', ')}) expire in &lt; 6 months.
                                        </span>
                                      )}
                                    </div>
                                  )
                                );
                              })()}

                              {/* Dispensing Instructions Input & Templates */}
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
                                    className="w-full bg-slate-950 border border-slate-805 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
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
                                        className="text-[8px] font-bold bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-teal-500/20 text-slate-400 hover:text-teal-400 px-1.5 py-0.5 rounded transition"
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
                                        badgeColor = "bg-yellow-550/10 text-yellow-450 border-yellow-500/20";
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
                            <span
                              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                isDispensed
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : state === "approved"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : state === "cancelled"
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : "bg-yellow-500/10 text-yellow-450 border-yellow-500/20"
                              }`}
                            >
                              {isDispensed ? "dispensed" : state}
                            </span>
                          </div>

                          {/* FEFO Allocation Output */}
                          {!isDispensed && state !== "cancelled" && (
                            <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/60 text-[10px] space-y-1.5">
                              <span className="font-bold text-teal-400 flex items-center gap-1">
                                <CornerDownRight size={10} /> Automated FEFO
                                Rotation Allocation:
                              </span>

                              {allocation.status === "out_of_stock" ? (
                                <p className="text-red-400 font-semibold flex items-center gap-1">
                                  <ShieldAlert size={10} /> Out of stock! Cannot
                                  dispense.
                                </p>
                              ) : (
                                <div className="space-y-1 pl-3 font-mono text-[9px] text-slate-400">
                                  {allocation.allocated.map((a, i) => (
                                    <p key={i}>
                                      Deduct{" "}
                                      <span className="text-white font-bold">
                                        {a.qty}u
                                      </span>{" "}
                                      from Batch{" "}
                                      <span className="text-teal-400 font-bold">
                                        {a.batch}
                                      </span>{" "}
                                      (expires {a.expiry})
                                    </p>
                                  ))}
                                  {allocation.status === "partially_filled" && (
                                    <p className="text-yellow-450 font-bold">
                                      Warning: Partially filled. Deficit of{" "}
                                      {allocation.remaining} units.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dispensing details if completed */}
                          {isDispensed && (
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850/50 text-[10px] space-y-1">
                              <p className="text-slate-400">
                                Dispensed Batch:{" "}
                                <span className="font-mono text-slate-200">
                                  {parseOrderMeta(presc.results).dispensed_batch}
                                </span>
                              </p>
                              <p className="text-slate-500 text-[9px]">
                                Dispensed by{" "}
                                {parseOrderMeta(presc.results).dispensed_by} at{" "}
                                {new Date(
                                  parseOrderMeta(presc.results).dispensed_at,
                                ).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {/* Controls */}
                          {!isDispensed && (
                            <div className="border-t border-slate-900/60 pt-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                              <div className="flex gap-2">
                                {state === "prescribed" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReviewStatus(presc.id, "approved")
                                      }
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] py-1.5 px-3 rounded shadow transition cursor-pointer"
                                    >
                                      Approve Prescription
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReviewStatus(presc.id, "cancelled")
                                      }
                                      className="bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-bold text-[9px] py-1.5 px-3 rounded transition cursor-pointer"
                                    >
                                      Cancel Presc
                                    </button>
                                  </>
                                )}
                                {state !== "prescribed" &&
                                  state !== "dispensed" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReviewStatus(presc.id, "prescribed")
                                      }
                                      className="text-slate-450 text-[9px] hover:underline cursor-pointer"
                                    >
                                      ← Reset Review State
                                    </button>
                                  )}
                              </div>

                              {state === "approved" &&
                                allocation.status !== "out_of_stock" && (
                                  <div className="flex items-center gap-3">
                                    {/* Double check checkbox */}
                                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={!!isChecked}
                                        onChange={(e) =>
                                          setDoubleChecked({
                                            ...doubleChecked,
                                            [presc.id]: e.target.checked,
                                          })
                                        }
                                        className="rounded bg-slate-900 border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                      />
                                      Double-checked
                                    </label>

                                    {/* Dispense action */}
                                    <button
                                      type="button"
                                      disabled={!isChecked || loading}
                                      onClick={() => handleDispense(presc.id)}
                                      className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-[10px] py-1.5 px-4 rounded shadow transition active:scale-[0.98] cursor-pointer"
                                    >
                                      Dispense & Deduct
                                    </button>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {pendingPrescriptions.length === 0 && (
                      <div className="space-y-4 w-full">
                        <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center font-semibold">
                          No active prescriptions found for this patient.
                        </div>
                        
                        <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-3 shadow-md">
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                            <Pill size={14} className="text-teal-400" /> Issue Direct/Walk-in Prescription
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                            This patient checked in directly without going through a clinician consultation. Select a custom pharmacy service / drug from your facility's catalog.
                          </p>
                          
                          <form onSubmit={handleAddWalkinPrescription} className="flex flex-col sm:flex-row gap-3 pt-1">
                            <div className="flex-1">
                              <select
                                value={selectedWalkinDrug}
                                onChange={(e) => setSelectedWalkinDrug(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                                required
                              >
                                <option value="">-- Select Pharmacy Service / Medicine --</option>
                                {facilityServices
                                  .filter(s => s.category === 'Pharmacy' || s.category === 'Other')
                                  .map((svc, i) => (
                                    <option key={i} value={svc.name}>
                                      {svc.name} - KES {svc.charge}/-
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={addingWalkin || !selectedWalkinDrug}
                              className="bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-6 rounded-lg shadow-lg active:scale-[0.98] transition cursor-pointer shrink-0"
                            >
                              {addingWalkin ? 'Adding...' : 'Add Medicine'}
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Sidebar Panel: Live Inventory, Search & Expiries */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Package size={14} className="text-teal-400" /> Formulary
              Inventory
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
              FEFO Stock Lot Rotations
            </p>
          </div>
          <button
            onClick={() => setShowRestockModal(true)}
            className="text-[9px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 border border-teal-500/20 px-2 py-0.5 rounded hover:bg-teal-500/5 transition cursor-pointer font-sans"
          >
            <RefreshCw size={8} /> Restock
          </button>
        </div>

        {/* Search bar */}
        <div className="relative font-sans">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medications..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 transition"
          />
          <Search
            size={11}
            className="absolute left-2.5 top-2.5 text-slate-600"
          />
        </div>

        {/* Stock List with Warning Badges */}
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          {filteredFormulary.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-855 p-2.5 rounded-xl space-y-2"
            >
              <div className="flex justify-between items-start gap-1 font-sans">
                <span className="font-bold text-slate-200 text-xs truncate max-w-[75%]">
                  {item.name}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    item.isLow
                      ? "text-red-400 bg-red-500/5 border border-red-500/15"
                      : "text-slate-400 bg-slate-850"
                  }`}
                >
                  {item.totalStock} {item.unit}
                </span>
              </div>

              {/* Batches Sub-list & Warning alerts */}
              <div className="space-y-1 border-t border-slate-900 pt-1.5">
                {batches
                  .filter((b) => b.name === item.name)
                  .map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex justify-between text-[9px] text-slate-500 font-mono"
                    >
                      <span>
                        Lot {b.batch} (exp: {b.expiry})
                      </span>
                      <span
                        className={
                          isNearExpiry(b.expiry)
                            ? "text-red-400 font-bold"
                            : "text-slate-450"
                        }
                      >
                        {b.stock}u {isNearExpiry(b.expiry) && "⚠️ EXPIRY"}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Warning Tags */}
              {item.isLow && (
                <div className="bg-red-500/5 border border-red-500/15 text-[8px] text-red-400 font-bold uppercase tracking-wider py-0.5 px-1.5 rounded flex items-center gap-1 w-fit font-sans">
                  <ShieldAlert size={10} /> Low Stock Alert!
                </div>
              )}
            </div>
          ))}
        </div>
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
