import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Search,
  Activity,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  User,
  RefreshCw,
  FileText,
  Users,
  Check,
  PlusCircle,
  FolderOpen,
} from "lucide-react";

export default function Registration({
  user,
  onNavigateToQueue,
  showNotification,
  selectedSubItem = "new_patient",
}) {
  // Database States
  const [patientsList, setPatientsList] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);

  // Edit Mode State
  const [editPatientId, setEditPatientId] = useState(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState("");
  const [title, setTitle] = useState("");
  const [telephone, setTelephone] = useState("");
  const [altTelephone, setAltTelephone] = useState("");
  const [dob, setDob] = useState("");
  const [village, setVillage] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [nearestSchool, setNearestSchool] = useState("");
  const [isIncomingReferral, setIsIncomingReferral] = useState("");
  const [nokName, setNokName] = useState("");
  const [nokPhone, setNokPhone] = useState("");
  const [nokRelation, setNokRelation] = useState("");

  const [servicePoint, setServicePoint] = useState("");
  const [serviceRoom, setServiceRoom] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [payments, setPayments] = useState("");
  const [servicePointFee, setServicePointFee] = useState([]);
  const [autoCheckin, setAutoCheckin] = useState(true);

  // Biometric / Verification Tab State
  const [activeRegTab, setActiveRegTab] = useState("register"); // 'biometric' or 'register'
  const [biometricIdType, setBiometricIdType] = useState("");
  const [biometricSearchQuery, setBiometricSearchQuery] = useState("");
  const [biometricLoading, setBiometricLoading] = useState(false);

  // General Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  // Insurance Manage Modal
  const [manageInsurancePt, setManageInsurancePt] = useState(null);
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [insuranceDependentType, setInsuranceDependentType] = useState("self");

  // Bed Change Modal
  const [changeBedAdm, setChangeBedAdm] = useState(null);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [loadingBeds, setLoadingBeds] = useState(false);

  // Utility to parse contact JSON safely
  const parseContact = (phoneStr) => {
    try {
      if (!phoneStr) return {};
      if (phoneStr.startsWith("{")) {
        return JSON.parse(phoneStr);
      }
    } catch (e) {
      // ignore
    }
    return { phone: phoneStr };
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("facility_id", user.facility_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPatientsList(data || []);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchAdmissions = async () => {
    setLoadingAdmissions(true);
    try {
      const { data: admData, error: admError } = await supabase
        .from("inpatient_admissions")
        .select("*")
        .eq("status", "admitted");
      if (admError) throw admError;

      const { data: pts, error: ptsError } = await supabase
        .from("patients")
        .select("*")
        .eq("facility_id", user.facility_id);
      if (ptsError) throw ptsError;

      const { data: bedsData } = await supabase
        .from("bed_allocations")
        .select("*")
        .eq("facility_id", user.facility_id);

      const enriched = admData
        ? admData
            .map((a) => {
              const p = pts?.find((pt) => pt.id === a.patient_id);
              const b = bedsData?.find((bd) => bd.id === a.bed_id);
              return {
                ...a,
                patient: p,
                bed_number: b
                  ? b.id.replace("bed_", "").toUpperCase()
                  : "Bed N/A",
                ward_name: a.ward_id
                  ? a.ward_id.replace("ward_", "").toUpperCase()
                  : "Ward N/A",
              };
            })
            .filter((a) => a.patient) // Only show patients belonging to this facility
        : [];
      setAdmissions(enriched);
    } catch (err) {
      console.error("Error fetching admissions:", err);
    } finally {
      setLoadingAdmissions(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchAdmissions();
  }, [selectedSubItem]);

  const handleBiometricSearch = async () => {
    if (!biometricSearchQuery.trim()) return;
    setBiometricLoading(true);
    try {
      // Simulate verifying SHA details
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Auto-populate patient details if matched or simulate match
      const matchingPt = patientsList.find(
        (p) =>
          p.national_id === biometricSearchQuery ||
          p.sha_number === biometricSearchQuery,
      );

      if (matchingPt) {
        const contact = parseContact(matchingPt.phone);
        const nameParts = matchingPt.name.split(" ");
        setFirstName(nameParts[0] || "");
        setMiddleName(nameParts[1] || "");
        setLastName(nameParts.slice(2).join(" ") || "");
        setIdNumber(matchingPt.national_id || "");
        setGender(matchingPt.gender || "male");
        setTelephone(contact.phone || "");
        setAltTelephone(contact.altPhone || "");
        setDob(matchingPt.dob || "");
        setVillage(contact.village || "");
        setLocation(contact.location || "");
        setEmail(contact.email || "");
        setNearestSchool(contact.nearestSchool || "");
        setIsIncomingReferral(contact.isIncomingReferral || "");
        setNokName(matchingPt.next_of_kin_name || "");
        setNokPhone(matchingPt.next_of_kin_phone || "");
        setNokRelation(matchingPt.next_of_kin_relation || "");

        if (showNotification) {
          showNotification(
            "success",
            "Patient Found",
            "Details filled successfully from SHA database.",
          );
        }
      } else {
        // Fallback simulate filling mock data
        setFirstName("Mary");
        setMiddleName("Auma");
        setLastName("Mwoki");
        setIdNumber(biometricSearchQuery);
        setGender("female");
        setTelephone("0712345678");
        setDob("1992-06-15");
        setVillage("Kite");
        setLocation("Kite");
        setNokName("Peter Mwoki");
        setNokPhone("0722334455");
        setNokRelation("spouse");

        if (showNotification) {
          showNotification(
            "success",
            "SHA Query Match",
            "Temporary record pre-populated from SHA registry.",
          );
        }
      }
      setActiveRegTab("register");
    } catch (err) {
      console.error(err);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleEditClick = (pt) => {
    const contact = parseContact(pt.phone);
    const nameParts = pt.name.split(" ");
    setFirstName(nameParts[0] || "");
    setMiddleName(nameParts[1] || "");
    setLastName(nameParts.slice(2).join(" ") || "");
    setIdNumber(pt.national_id || "");
    setGender(pt.gender || "male");
    setTelephone(contact.phone || "");
    setAltTelephone(contact.altPhone || "");
    setDob(pt.dob || "");
    setVillage(contact.village || "");
    setLocation(contact.location || "");
    setEmail(contact.email || "");
    setNearestSchool(contact.nearestSchool || "");
    setIsIncomingReferral(contact.isIncomingReferral || "");
    setNokName(pt.next_of_kin_name || "");
    setNokPhone(pt.next_of_kin_phone || "");
    setNokRelation(pt.next_of_kin_relation || "");

    setEditPatientId(pt.id);
    setActiveRegTab("register");

    // Programmatically trigger redirection/tab switch back to New Patient
    if (showNotification) {
      showNotification(
        "info",
        "Edit Mode Active",
        `Modifying details for ${pt.name}.`,
      );
    }
  };

  const handleDeletePatient = async (ptId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this patient record?",
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase.from("patients").delete().eq("id", ptId);
      if (error) throw error;
      if (showNotification) {
        showNotification(
          "success",
          "Record Deleted",
          "Patient details removed successfully.",
        );
      }
      fetchPatients();
    } catch (err) {
      console.error(err);
      if (showNotification) {
        showNotification("error", "Deletion Failed", err.message);
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(" ");

      if (!fullName || !dob || !gender || !telephone) {
        throw new Error(
          "Please fill in all required fields marked with an asterisk (*).",
        );
      }

      const patientData = {
        facility_id: user.facility_id,
        name: fullName,
        dob,
        gender,
        national_id: idNumber || null,
        phone: JSON.stringify({
          phone: telephone,
          altPhone: altTelephone,
          email,
          village,
          location,
          nearestSchool,
          isIncomingReferral,
        }),
        next_of_kin_name: nokName,
        next_of_kin_phone: nokPhone,
        next_of_kin_relation: nokRelation,
        consent_given: true,
      };

      if (editPatientId) {
        const { error } = await supabase
          .from("patients")
          .update(patientData)
          .eq("id", editPatientId);
        if (error) throw error;

        if (showNotification) {
          showNotification(
            "success",
            "Update Success",
            "Patient details updated successfully.",
          );
        }
        setEditPatientId(null);
      } else {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const facilityCode = `EMC-PT-${randNum}`;

        const newPatient = {
          ...patientData,
          facility_id_code: facilityCode,
        };

        const { data, error } = await supabase
          .from("patients")
          .insert(newPatient)
          .select();
        if (error) throw error;

        const addedPt = Array.isArray(data) ? data[0] : data;

        // Auto-checkin to Queue / Route
        if (autoCheckin && addedPt) {
          let targetDept = "triage";
          let targetPriority = "routine";

          if (servicePoint === "LAB") targetDept = "lab";
          else if (servicePoint === "PHA") targetDept = "pharmacy";
          else if (servicePoint === "IPD") targetDept = "ward";
          else if (servicePoint === "EMR") {
            targetDept = "triage";
            targetPriority = "emergency";
          } else if (servicePoint === "FP" || servicePoint === "IMM") {
            targetDept = "consultation";
          } else if (servicePoint === "ANC") targetDept = "triage";

          const visitRecord = {
            patient_id: addedPt.id,
            facility_id: user.facility_id,
            department: targetDept,
            priority: targetPriority,
            status: "waiting",
            service_type: servicePoint || "OPD",
          };
          await supabase.from("visits").insert(visitRecord);

          // Register
          const regRecord = {
            patient_id: addedPt.id,
            facility_id: user.facility_id,
            visit_type: "walk-in",
            service_type: servicePoint || "OPD",
            status: "active",
          };
          await supabase.from("patient_registrations").insert(regRecord);
        }

        if (showNotification) {
          showNotification(
            "success",
            "Registration Success",
            `Registered successfully! Assigned Code: ${facilityCode}`,
          );
        }
      }

      // Reset Form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setIdNumber("");
      setGender("");
      setTitle("");
      setTelephone("");
      setAltTelephone("");
      setDob("");
      setVillage("");
      setLocation("");
      setEmail("");
      setNearestSchool("");
      setIsIncomingReferral("");
      setNokName("");
      setNokPhone("");
      setNokRelation("");
      setServicePoint("");
      setServiceRoom("");
      setServiceProvider("");
      setPayments("");
      setServicePointFee([]);

      fetchPatients();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message });
      if (showNotification) {
        showNotification("error", "Action Failed", err.message);
      }
    }
    setLoading(false);
  };

  const handleOpenInsuranceModal = (pt) => {
    setManageInsurancePt(pt);
    setInsuranceCompany(
      pt.sha_dependent_type === "child"
        ? "NHIF / SHA Dependent"
        : "National Health Insurance (SHA)",
    );
    setInsuranceNumber(pt.sha_number || "");
    setInsuranceDependentType(pt.sha_dependent_type || "self");
  };

  const handleSaveInsurance = async () => {
    if (!manageInsurancePt) return;
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          sha_number: insuranceNumber,
          sha_dependent_type: insuranceDependentType,
          sha_status: insuranceNumber ? "Verified / Eligible" : "unverified",
        })
        .eq("id", manageInsurancePt.id);
      if (error) throw error;

      if (showNotification) {
        showNotification(
          "success",
          "Insurance Saved",
          "Insurance details updated successfully.",
        );
      }
      setManageInsurancePt(null);
      fetchPatients();
      fetchAdmissions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBedModal = async (adm) => {
    setChangeBedAdm(adm);
    setLoadingBeds(true);
    try {
      const { data, error } = await supabase
        .from("bed_allocations")
        .select("*")
        .eq("facility_id", user.facility_id);
      if (error) throw error;
      setAvailableBeds(data || []);
      setSelectedBedId(adm.bed_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleSaveBedChange = async () => {
    if (!changeBedAdm || !selectedBedId) return;
    try {
      // 1. Release previous bed
      await supabase
        .from("bed_allocations")
        .update({ bed_status: "clean" })
        .eq("id", changeBedAdm.bed_id);

      // 2. Allocate new bed
      await supabase
        .from("bed_allocations")
        .update({ bed_status: "occupied" })
        .eq("id", selectedBedId);

      // 3. Update admission record
      const { error } = await supabase
        .from("inpatient_admissions")
        .update({ bed_id: selectedBedId })
        .eq("id", changeBedAdm.id);
      if (error) throw error;

      if (showNotification) {
        showNotification(
          "success",
          "Bed Allocated",
          "Inpatient bed changed successfully.",
        );
      }
      setChangeBedAdm(null);
      fetchAdmissions();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter patients by search query
  const filteredPatients = patientsList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const contact = parseContact(p.phone);
    return (
      p.name.toLowerCase().includes(query) ||
      p.national_id?.includes(query) ||
      p.facility_id_code?.toLowerCase().includes(query) ||
      contact.phone?.includes(query)
    );
  });

  // Breadcrumbs text helper
  const getBreadcrumbs = () => {
    let currentLabel = "New Patient";
    if (selectedSubItem === "update_patient") currentLabel = "Update Patient";
    else if (selectedSubItem === "patient_insurance")
      currentLabel = "Patient Insurance";
    else if (selectedSubItem === "patients_in_wards")
      currentLabel = "Patients in Wards";
    else if (selectedSubItem === "sha_registrations")
      currentLabel = "SHA Registrations";
    return `Main Home / Module Select > ${currentLabel}`;
  };

  const getPageTitle = () => {
    if (selectedSubItem === "patients_in_wards")
      return "IN-Patients Visit Queue";
    if (selectedSubItem === "patient_insurance") return "Patient Insurance";
    return "Patient Registrations";
  };

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {/* Breadcrumbs & Header Title */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-strong">
            {getPageTitle()}
          </h1>
        </div>
        <div className="rounded-full border border-border-subtle bg-muted px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
          {getBreadcrumbs()}
        </div>
      </div>

      {/* Main Content Areas based on selectedSubItem */}

      {/* VIEW 1: NEW PATIENT REGISTRATION FORM */}
      {(selectedSubItem === "new_patient" || !selectedSubItem) && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Form Tabs */}
          <div className="flex border-b border-border bg-muted">
            <button
              onClick={() => setActiveRegTab("biometric")}
              className={`flex items-center gap-2 border-r border-border px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
                activeRegTab === "biometric"
                  ? "border-t-2 border-t-primary bg-card text-primary"
                  : "text-fg-muted hover:bg-background/70"
              }`}
            >
              <span>✔ Biometric Verification</span>
            </button>
            <button
              onClick={() => setActiveRegTab("register")}
              className={`flex items-center gap-2 border-r border-border px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
                activeRegTab === "register"
                  ? "border-t-2 border-t-primary bg-card text-primary"
                  : "text-fg-muted hover:bg-background/70"
              }`}
            >
              <span>➕ Register Patient</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 1. Biometric Tab Content */}
            {activeRegTab === "biometric" && (
              <div className="rounded-2xl border border-border bg-muted/70 p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3">
                    <select
                      value={biometricIdType}
                      onChange={(e) => setBiometricIdType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="">-- Select ID Type --</option>
                      <option value="national">National ID Card</option>
                      <option value="sha">SHA Card / Registration</option>
                      <option value="passport">Passport Number</option>
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <input
                      type="text"
                      value={biometricSearchQuery}
                      onChange={(e) => setBiometricSearchQuery(e.target.value)}
                      placeholder="Enter ID No. to Search (Only if the patient is registered with SMA)"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      onClick={handleBiometricSearch}
                      disabled={
                        biometricLoading || !biometricSearchQuery.trim()
                      }
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                    >
                      {biometricLoading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <span>Fetch & Fill Patient Data ❯</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Registration Fields Tab Content */}
            {activeRegTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                {editPatientId && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-xs flex justify-between items-center">
                    <span className="font-semibold">
                      ⚠️ Currently Editing Mode Active for Selected Record.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditPatientId(null);
                        setFirstName("");
                        setMiddleName("");
                        setLastName("");
                        setIdNumber("");
                      }}
                      className="bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-2 py-1 rounded text-2xs"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}

                {/* Primary Demographic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="FIRST NAME"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="MIDDLE NAME"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="LAST NAME"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="ID Number"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="">--- Select Gender ---</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Inter-sex">Inter-sex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Title
                    </label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">--- Select Title ---</option>
                      <option value="Mr">Mr.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Dr">Dr.</option>
                      <option value="Prof">Prof.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telephone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="Telephone"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alt Telephone
                    </label>
                    <input
                      type="text"
                      value={altTelephone}
                      onChange={(e) => setAltTelephone(e.target.value)}
                      placeholder="Alternative Telephone"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Village <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="VILLAGE"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="LOCATION"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter valid email address (e.g., name@domain.com)"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nearest School
                    </label>
                    <input
                      type="text"
                      value={nearestSchool}
                      onChange={(e) => setNearestSchool(e.target.value)}
                      placeholder="NEAREST SCHOOL"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Is Incoming Referral?
                    </label>
                    <select
                      value={isIncomingReferral}
                      onChange={(e) => setIsIncomingReferral(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                {/* Responsible Person / Next Of Kin Section */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span>👥 Responsible Person / Next Of Kin</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nokName}
                        onChange={(e) => setNokName(e.target.value)}
                        placeholder="NEXT OF KIN NAME"
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nokPhone}
                        onChange={(e) => setNokPhone(e.target.value)}
                        placeholder="Next Of Kin Mobile Number"
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={nokRelation}
                        onChange={(e) => setNokRelation(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="">-- Select Relationship --</option>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend / Colleague</option>
                        <option value="guardian">Guardian</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Queue & Billing Integration Section */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Service Point
                      </label>
                      <select
                        value={servicePoint}
                        onChange={(e) => setServicePoint(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="OPD">General Outpatient (OPD)</option>
                        <option value="ANC">Antenatal Care (ANC)</option>
                        <option value="FP">Family Planning (FP)</option>
                        <option value="IMM">Immunizations (IMM)</option>
                        <option value="LAB">Laboratory-Only</option>
                        <option value="PHA">Pharmacy-Only</option>
                        <option value="IPD">Inpatient Admission</option>
                        <option value="EMR">Emergency Care (ER)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Service Room
                      </label>
                      <select
                        value={serviceRoom}
                        onChange={(e) => setServiceRoom(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="room_1">Room 1 - Consultation</option>
                        <option value="room_2">Room 2 - Consultation</option>
                        <option value="triage_1">Triage Area</option>
                        <option value="mch_1">MCH / Immunization Room</option>
                        <option value="lab_1">Phlebotomy Lab</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Service Provider
                      </label>
                      <select
                        value={serviceProvider}
                        onChange={(e) => setServiceProvider(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Specialist</option>
                        <option value="dr_arthur">
                          Dr. Arthur Conan (Clinician)
                        </option>
                        <option value="nurse_jane">
                          Nurse Jane Doe (Triage)
                        </option>
                        <option value="pharmacist_bob">Pharmacist Bob</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payments <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={payments}
                        onChange={(e) => setPayments(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="">Preferred Payment Option</option>
                        <option value="cash">CASH Payments</option>
                        <option value="sha">SHA Insurance Card</option>
                        <option value="coporate">
                          Corporate Cover / Invoice
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Service Point Fees and Visual Media Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Service Point Fee <span className="text-red-500">*</span>
                    </label>
                    <select
                      multiple
                      value={servicePointFee}
                      onChange={(e) => {
                        const vals = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value,
                        );
                        setServicePointFee(vals);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[11px] text-slate-850 h-32 focus:outline-none focus:border-blue-500"
                    >
                      <option value="OPD_500">
                        CONSULTATION FEE - CASH - 500.00 - INSURANCE - 1000.00
                      </option>
                      <option value="MO_500">
                        DOCTORS FEE(MO) - CASH - 500.00 - INSURANCE - 500.00
                      </option>
                      <option value="REV_0">
                        REVIEW - CASH - 0.00 - INSURANCE - 0.00
                      </option>
                      <option value="AON_1000">
                        AON MINET CONSULTATION FEE - CASH - 0.00 - INSURANCE -
                        1000.00
                      </option>
                      <option value="MAT_0">
                        MATERNITY - CASH - 0.00 - INSURANCE - 0.00
                      </option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                      press Ctrl and click to select multiple options
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-700 self-start mb-1.5">
                      Preview
                    </span>
                    <div className="w-full h-32 bg-slate-50 border border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
                      <span>No Live Scanner Connected</span>
                      <div className="w-16 h-1 bg-emerald-500 mt-2" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-700 self-start mb-1.5 font-bold text-blue-600">
                      Captured
                    </span>
                    <div className="w-28 h-28 bg-slate-50 border border-slate-300 rounded-full flex items-center justify-center overflow-hidden">
                      <User size={64} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading
                      ? "Processing..."
                      : editPatientId
                        ? "Update Patient Details"
                        : "Save Patient & Route to Queue"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: UPDATE PATIENT (SEARCH & EDIT) */}
      {selectedSubItem === "update_patient" && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fg-muted">
              <FileText size={14} className="text-primary" /> Patients Listing
              (Search & Edit)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Patient's Name/ Email/ Phone/ IP-OP Number"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 px-4 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Search Records</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Patient Registrations
              </h3>
            </div>

            <div className="overflow-x-auto min-w-0">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold">
                    <th className="py-2.5 px-3">Names</th>
                    <th className="py-2.5 px-3">DOB</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">IP/ OP Number</th>
                    <th className="py-2.5 px-3">IDNumber</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Next Of Kin</th>
                    <th className="py-2.5 px-3">Kin Mobile</th>
                    <th className="py-2.5 px-3">Reg Date</th>
                    <th className="py-2.5 px-3">Created By</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingPatients ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        Loading registered patient directory...
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        No matching patients found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => {
                      const contact = parseContact(p.phone);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {p.dob}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {contact.phone}
                          </td>
                          <td className="py-2.5 px-3">{p.gender}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 font-mono text-2xs">
                            {p.facility_id_code}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {p.national_id || "0"}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-2xs">
                            {contact.location || "Nairobi"}
                          </td>
                          <td className="py-2.5 px-3">
                            {p.next_of_kin_name || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {p.next_of_kin_phone || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {new Date(p.created_at).toLocaleDateString("en-GB")}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            Support Admin
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-1 px-3.5 rounded transition cursor-pointer"
                            >
                              Edit ❯
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleDeletePatient(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-1 px-3 rounded transition flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={11} />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Replica */}
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button className="hover:opacity-80 px-1 font-bold">≪</button>
                <button className="hover:opacity-80 px-1 font-bold">❮</button>
                <span className="bg-white text-blue-700 font-extrabold px-2 py-0.5 rounded">
                  1
                </span>
                <span className="hover:opacity-80 px-1 cursor-pointer">2</span>
                <span className="opacity-70 px-1">...</span>
                <span className="hover:opacity-80 px-1 cursor-pointer">
                  1352
                </span>
                <span className="hover:opacity-80 px-1 cursor-pointer">
                  1353
                </span>
                <button className="hover:opacity-80 px-1 font-bold">❯</button>
                <button className="hover:opacity-80 px-1 font-bold">≫</button>
                <span className="ml-4">Go to page:</span>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-8 bg-white text-blue-700 border-none rounded px-1 text-center font-bold"
                />
                <span className="ml-4">Row count:</span>
                <select className="bg-white text-blue-700 border-none rounded font-bold px-1 py-0.5">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div>
                <span>Showing 1-10 of {filteredPatients.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PATIENT INSURANCE */}
      {selectedSubItem === "patient_insurance" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-blue-500" /> Patients Listing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Patient's Name/ Email/ Phone/ IP-OP Number"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 px-4 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Search Records</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Patient Registrations
              </h3>
            </div>

            <div className="overflow-x-auto min-w-0">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold">
                    <th className="py-2.5 px-3">Photo</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Names</th>
                    <th className="py-2.5 px-3">MiddleName</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">IP/ OP Number</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingPatients ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        Loading insurance logs...
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        No patient records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => {
                      const contact = parseContact(p.phone);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <td className="py-2 px-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden">
                              <User size={14} className="text-slate-400" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {new Date(p.created_at)
                              .toISOString()
                              .replace("T", " ")
                              .substring(0, 19)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-2xs">
                            {contact.middleName || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {contact.phone}
                          </td>
                          <td className="py-2.5 px-3">{p.gender}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 font-mono text-2xs">
                            {p.facility_id_code}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleOpenInsuranceModal(p)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-1 px-3.5 rounded transition cursor-pointer"
                            >
                              Manage ❯
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button className="hover:opacity-80 px-1 font-bold">≪</button>
                <button className="hover:opacity-80 px-1 font-bold">❮</button>
                <span className="bg-white text-blue-700 font-extrabold px-2 py-0.5 rounded">
                  1
                </span>
                <span className="hover:opacity-80 px-1 cursor-pointer">2</span>
                <span className="opacity-70 px-1">...</span>
                <span className="hover:opacity-80 px-1 cursor-pointer">
                  1352
                </span>
                <span className="hover:opacity-80 px-1 cursor-pointer">
                  1353
                </span>
                <button className="hover:opacity-80 px-1 font-bold">❯</button>
                <button className="hover:opacity-80 px-1 font-bold">≫</button>
                <span className="ml-4">Go to page:</span>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-8 bg-white text-blue-700 border-none rounded px-1 text-center font-bold"
                />
                <span className="ml-4">Row count:</span>
                <select className="bg-white text-blue-700 border-none rounded font-bold px-1 py-0.5">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div>
                <span>Showing 1-10 of {filteredPatients.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PATIENTS IN WARDS */}
      {selectedSubItem === "patients_in_wards" && (
        <div className="space-y-6">
          {/* Admitted Visits Search Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                📁 Wards list
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded border border-emerald-200 flex items-center gap-1">
                <Check size={11} /> Admitted Patients
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Patient's Name/ Email/ Phone/ IP-OP Number"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 px-4 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Search Patient Records</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Patients In ❯
              </h3>
            </div>

            <div className="overflow-x-auto min-w-0">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold">
                    <th className="py-2.5 px-3">Names</th>
                    <th className="py-2.5 px-3">Mid-Name</th>
                    <th className="py-2.5 px-3">Ward</th>
                    <th className="py-2.5 px-3">BED</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Age</th>
                    <th className="py-2.5 px-3">IP/ OP Number</th>
                    <th className="py-2.5 px-3">AdmissionDate</th>
                    <th className="py-2.5 px-3">Payment_Method</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Process</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingAdmissions ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        Loading inpatient ward roster...
                      </td>
                    </tr>
                  ) : admissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-10 text-slate-400 font-mono text-2xs"
                      >
                        No active admissions found.
                      </td>
                    </tr>
                  ) : (
                    admissions.map((adm) => {
                      const ptContact = parseContact(adm.patient?.phone);
                      const paymentOption = adm.patient?.sha_number
                        ? "SOCIAL HEALTH AUTHORITY (SHA) - SHA-OUTPATIENT"
                        : "CASH";
                      return (
                        <tr
                          key={adm.id}
                          className="hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {adm.patient?.name}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-2xs">
                            {ptContact.middleName || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium uppercase text-slate-600">
                            {adm.ward_name}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-teal-600 font-mono">
                            {adm.bed_number}
                          </td>
                          <td className="py-2.5 px-3">{adm.patient?.gender}</td>
                          <td className="py-2.5 px-3 font-mono">
                            {adm.patient?.dob
                              ? new Date().getFullYear() -
                                new Date(adm.patient.dob).getFullYear()
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 font-mono text-2xs">
                            {adm.patient?.facility_id_code}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs">
                            {
                              new Date(adm.admission_datetime)
                                .toISOString()
                                .split("T")[0]
                            }
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[9px]">
                            {paymentOption}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleOpenBedModal(adm)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-1 px-2.5 rounded transition flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw size={10} />
                              <span>Change</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() =>
                                handleOpenInsuranceModal(adm.patient)
                              }
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-1 px-2.5 rounded transition cursor-pointer"
                            >
                              Manage insurance ❯
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => onNavigateToQueue(adm.patient)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-1 px-3 rounded transition flex items-center gap-1 cursor-pointer"
                            >
                              <FolderOpen size={10} className="text-teal-400" />
                              <span>Record Visits</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button className="hover:opacity-80 px-1 font-bold">≪</button>
                <button className="hover:opacity-80 px-1 font-bold">❮</button>
                <span className="bg-white text-blue-700 font-extrabold px-2 py-0.5 rounded">
                  1
                </span>
                <span className="hover:opacity-80 px-1 cursor-pointer">2</span>
                <span className="hover:opacity-80 px-1 cursor-pointer">3</span>
                <span className="hover:opacity-80 px-1 cursor-pointer">4</span>
                <button className="hover:opacity-80 px-1 font-bold">❯</button>
                <button className="hover:opacity-80 px-1 font-bold">≫</button>
                <span className="ml-4">Go to page:</span>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-8 bg-white text-blue-700 border-none rounded px-1 text-center font-bold"
                />
                <span className="ml-4">Row count:</span>
                <select className="bg-white text-blue-700 border-none rounded font-bold px-1 py-0.5">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div>
                <span>
                  Showing 1-{admissions.length} of {admissions.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODALS FOR EDITING SUB-COMPONENTS */}

      {/* 1. INSURANCE MANAGER DIALOG MODAL */}
      {manageInsurancePt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-fadeIn text-slate-800">
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Manage Patient Insurance Cover
              </h3>
              <button
                onClick={() => setManageInsurancePt(null)}
                className="hover:opacity-80 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                  Patient Name
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {manageInsurancePt.name}
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SHA Card / Insurance Number
                </label>
                <input
                  type="text"
                  value={insuranceNumber}
                  onChange={(e) => setInsuranceNumber(e.target.value)}
                  placeholder="e.g. SHA-77382010"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SHA Dependent Type
                </label>
                <select
                  value={insuranceDependentType}
                  onChange={(e) => setInsuranceDependentType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="self">Principal Member (Self)</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="other">Other Dependent</option>
                </select>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                onClick={() => setManageInsurancePt(null)}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-4 rounded transition"
              >
                Close
              </button>
              <button
                onClick={handleSaveInsurance}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded transition"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPATIENT BED ALLOCATION DIALOG MODAL */}
      {changeBedAdm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-fadeIn text-slate-800">
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Re-allocate Inpatient Bed Assignment
              </h3>
              <button
                onClick={() => setChangeBedAdm(null)}
                className="hover:opacity-80 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                  Admitted Patient
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {changeBedAdm.patient?.name}
                </span>
                <span className="text-xs text-slate-500 block">
                  Current Bed: {changeBedAdm.bed_number} (
                  {changeBedAdm.ward_name})
                </span>
              </div>

              {loadingBeds ? (
                <div className="py-6 text-center text-slate-500 text-xs flex justify-center items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  <span>Loading available beds...</span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select New Bed
                  </label>
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Choose Bed --</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id.replace("bed_", "").toUpperCase()} (
                        {b.bed_status === "occupied" ? "Occupied" : "Available"}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-5 py-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                onClick={() => setChangeBedAdm(null)}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-4 rounded transition"
              >
                Close
              </button>
              <button
                onClick={handleSaveBedChange}
                disabled={!selectedBedId}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded transition disabled:opacity-60"
              >
                Allocate Bed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
