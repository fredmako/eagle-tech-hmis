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
} from "lucide-react";
import { medicineMaster } from "../../medicalMaster";

export default function Pharmacy({ user, onComplete }) {
  const [pharmVisits, setPharmVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);

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
  }, []);

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
        const stillExists = enrichedVisits.find(
          (v) => v.id === selectedVisit?.id,
        );
        if (!stillExists) {
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

        setMessage({
          type: "success",
          text: "All prescriptions dispensed. Visit successfully completed!",
        });
        setTimeout(() => {
          fetchPharmacyQueue();
          if (onComplete) onComplete();
        }, 1500);
      } else {
        setMessage({
          type: "success",
          text: `Successfully dispensed ${drugName}.`,
        });
        await handleSelectVisit(selectedVisit);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Dispensing failed." });
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

    setMessage({ type: "success", text: `Inventory updated successfully for ${finalDrugName}!` });
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
      {/* Sidebar: Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Pill size={14} className="text-teal-400" /> Prescriptions Queue
          </h2>
          <button
            onClick={fetchPharmacyQueue}
            className="text-slate-500 hover:text-white transition"
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
              className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                selectedVisit?.id === item.id
                  ? "border-teal-500/60 bg-teal-500/5"
                  : "border-slate-800/80 bg-slate-950 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[65%]">
                  {item.patient?.name}
                </span>
                <span
                  className={`text-[8px] px-1 rounded uppercase font-bold ${
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
            <div className="text-xs text-slate-650 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No prescriptions in queue.
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Interactive Dispensary */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-32 text-center my-auto">
            <Pill size={54} className="text-slate-700 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wide">
              No Prescription Loaded
            </h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">
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
                      className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-bold text-slate-200 text-xs block">
                            {drugName}
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Sig: {presc.instructions}
                          </p>
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
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] py-1.5 px-3 rounded shadow transition"
                                >
                                  Approve Prescription
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReviewStatus(presc.id, "cancelled")
                                  }
                                  className="bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-bold text-[9px] py-1.5 px-3 rounded transition"
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
                                  className="text-slate-400 text-[9px] hover:underline"
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
                                    className="rounded bg-slate-900 border-slate-800 text-teal-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  Double-checked
                                </label>

                                {/* Dispense action */}
                                <button
                                  type="button"
                                  disabled={!isChecked || loading}
                                  onClick={() => handleDispense(presc.id)}
                                  className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-[10px] py-1.5 px-4 rounded shadow transition active:scale-[0.98]"
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
                  <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center">
                    No active prescriptions found for this patient.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Panel: Live Inventory, Search & Expiries */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-teal-400" /> Formulary
              Inventory
            </h3>
            <p className="text-[10px] text-slate-550 mt-0.5">
              FEFO Stock Lot Rotations
            </p>
          </div>
          <button
            onClick={() => setShowRestockModal(true)}
            className="text-[9px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 border border-teal-500/20 px-2 py-0.5 rounded hover:bg-teal-500/5 transition"
          >
            <RefreshCw size={8} /> Restock
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
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
              className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-2"
            >
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold text-slate-200 text-xs truncate max-w-[75%]">
                  {item.name}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    item.isLow
                      ? "text-red-400 bg-red-500/5 border border-red-500/15"
                      : "text-slate-405 bg-slate-850"
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
                            : "text-slate-400"
                        }
                      >
                        {b.stock}u {isNearExpiry(b.expiry) && "⚠️ EXPIRY"}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Warning Tags */}
              {item.isLow && (
                <div className="bg-red-500/5 border border-red-500/15 text-[8px] text-red-400 font-bold uppercase tracking-wider py-0.5 px-1.5 rounded flex items-center gap-1 w-fit">
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
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <Package size={16} className="text-teal-400" /> Restock Medicine Inventory
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Add a new batch or top up existing lots</p>
              </div>
              <button 
                onClick={() => setShowRestockModal(false)}
                className="text-slate-500 hover:text-white text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4 text-[11px]">
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
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-2 px-4 rounded-lg shadow-md transition active:scale-[0.98]"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
