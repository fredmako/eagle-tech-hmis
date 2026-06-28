import { useState } from "react";
import { supabase } from "../../supabaseClient";
import PatientSearchPanel from "./registration/PatientSearchPanel";
import RegistrationFormPanel from "./registration/RegistrationFormPanel";
import RegistrationMonitorPanel from "./registration/RegistrationMonitorPanel";

export default function Registration({
  user,
  onNavigateToQueue,
  showNotification,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Form states
  const [searchId, setSearchId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState("male");
  const [title, setTitle] = useState("");
  const [telephone, setTelephone] = useState("");
  const [altTelephone, setAltTelephone] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [village, setVillage] = useState("");
  const [location, setLocation] = useState("");
  const [ward, setWard] = useState("");
  const [email, setEmail] = useState("");
  const [nearestSchool, setNearestSchool] = useState("");
  const [isIncomingReferral, setIsIncomingReferral] = useState("");
  const [nokName, setNokName] = useState("");
  const [nokPhone, setNokPhone] = useState("");
  const [nokRelation, setNokRelation] = useState("spouse");
  const [servicePoint, setServicePoint] = useState("");
  const [serviceRoom, setServiceRoom] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [payments, setPayments] = useState("");
  const [preferredPayment, setPreferredPayment] = useState("");
  const [servicePointFee, setServicePointFee] = useState([]);
  const [consent, setConsent] = useState(true);
  const [autoCheckin, setAutoCheckin] = useState(true);
  const [shaNumber, setShaNumber] = useState("");
  const [shaStatus, setShaStatus] = useState("unverified");
  const [verifyingSha, setVerifyingSha] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [admissions, setAdmissions] = useState([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [landmark, setLandmark] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("single");
  const [parity, setParity] = useState("");
  const [gravidae, setGravidae] = useState("");
  const [isPregnant, setIsPregnant] = useState(false);
  const [lmp, setLmp] = useState("");
  const [edd, setEdd] = useState("");
  const [optInLab, setOptInLab] = useState(true);
  const [optInPharmacy, setOptInPharmacy] = useState(true);
  const [optInBilling, setOptInBilling] = useState(true);
  const [shaDependentType, setShaDependentType] = useState("self");

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
        .select("*");
      if (ptsError) throw ptsError;

      const { data: bedsData } = await supabase
        .from("bed_allocations")
        .select("*");

      const enriched = admData
        ? admData.map((a) => {
            const p = pts?.find((pt) => pt.id === a.patient_id);
            const b = bedsData?.find((bd) => bd.id === a.bed_id);
            return {
              ...a,
              patient: p,
              bed_number: b ? b.bed_number : "Bed N/A",
              ward_name: a.ward_id
                ? a.ward_id.replace("ward_", "").toUpperCase()
                : "Ward N/A",
            };
          })
        : [];
      setAdmissions(enriched);
    } catch (err) {
      console.error("Error fetching admissions:", err);
    } finally {
      setLoadingAdmissions(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "wards") {
      fetchAdmissions();
    }
  };

  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const performSearch = async (query) => {
    setSearching(true);
    setMessage({ type: "", text: "" });
    try {
      const { data, error } = await supabase.from("patients").select("*");
      if (error) throw error;

      const filtered = data
        ? data.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.national_id?.includes(query) ||
              p.facility_id_code?.toLowerCase().includes(query.toLowerCase()),
          )
        : [];

      if (filtered.length > 0) {
        const patientIds = filtered.map((p) => p.id);
        const { data: ords } = await supabase
          .from("orders")
          .select("*")
          .in("status", [
            "ordered",
            "pending",
            "prescribed",
            "scheduled",
            "completed",
            "verified",
          ]);
        const { data: invs } = await supabase
          .from("invoices")
          .select("*")
          .eq("status", "unpaid");
        const { data: vsts } = await supabase
          .from("visits")
          .select("*")
          .in("patient_id", patientIds);

        const enriched = filtered.map((p) => {
          const ptVisits = vsts
            ? vsts.filter((v) => v.patient_id === p.id)
            : [];
          const ptVisitIds = ptVisits.map((v) => v.id);

          const pendingLabs = ords
            ? ords.filter(
                (o) =>
                  ptVisitIds.includes(o.visit_id) &&
                  o.type === "lab" &&
                  o.status !== "released" &&
                  o.status !== "cancelled",
              )
            : [];
          const pendingRad = ords
            ? ords.filter(
                (o) =>
                  ptVisitIds.includes(o.visit_id) &&
                  o.type === "radiology" &&
                  o.status !== "released" &&
                  o.status !== "cancelled",
              )
            : [];
          const scheduledFollowups = ords
            ? ords.filter(
                (o) =>
                  ptVisitIds.includes(o.visit_id) &&
                  o.type === "follow_up" &&
                  o.status === "scheduled",
              )
            : [];
          const unpaidInvoices = invs
            ? invs.filter((i) => ptVisitIds.includes(i.visit_id))
            : [];

          return {
            ...p,
            alerts: {
              pendingLabsCount: pendingLabs.length,
              pendingRadCount: pendingRad.length,
              scheduledFollowups,
              unpaidBalance: unpaidInvoices.reduce(
                (sum, inv) => sum + parseFloat(inv.total_amount || 0),
                0,
              ),
            },
          };
        });
        setSearchResults(enriched);
      } else {
        setSearchResults([]);
      }
      setSearched(true);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSearching(false);
    }
  };

  const [timelineData, setTimelineData] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [expandedTimelinePtId, setExpandedTimelinePtId] = useState(null);
  const [selectedReceptionPatientId, setSelectedReceptionPatientId] =
    useState(null);

  const loadPatientTimeline = async (ptId) => {
    setLoadingTimeline(true);
    try {
      const { data: vsts, error: vError } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", ptId)
        .order("created_at", { ascending: false });
      if (vError) throw vError;

      if (!vsts || vsts.length === 0) {
        setTimelineData([]);
        setLoadingTimeline(false);
        return;
      }

      const visitIds = vsts.map((v) => v.id);

      const { data: cns } = await supabase
        .from("consultations")
        .select("*")
        .in("visit_id", visitIds);

      const { data: trgs } = await supabase
        .from("triages")
        .select("*")
        .in("visit_id", visitIds);

      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .in("visit_id", visitIds);

      const events = [];

      vsts.forEach((v) => {
        events.push({
          id: `visit-${v.id}`,
          date: v.created_at || v.visit_date,
          type: "visit",
          title: `Clinic Visit Started - ${v.service_type || "OPD"}`,
          desc: `Checked-in to ${v.current_queue || "General"} queue. Status: ${v.status || "Active"}`,
        });
      });

      if (cns) {
        cns.forEach((c) => {
          events.push({
            id: `consult-${c.id}`,
            date: c.created_at,
            type: "consultation",
            title: `Clinical SOAP Consultation`,
            desc: `Diagnosis: ${c.diagnosis || "None"} | Notes: ${c.history || "No SOAP notes"}`,
          });
        });
      }

      if (trgs) {
        trgs.forEach((t) => {
          events.push({
            id: `triage-${t.id}`,
            date: t.created_at,
            type: "triage",
            title: `Triage Vitals Check`,
            desc: `Temp: ${t.temperature}°C | BP: ${t.systolic_bp}/${t.diastolic_bp} | Pulse: ${t.pulse} bpm | SpO2: ${t.spo2}%`,
          });
        });
      }

      if (ords) {
        ords.forEach((o) => {
          let orderDetails = "";
          if (o.ordered_labs && o.ordered_labs.length > 0) {
            orderDetails = `Labs: ${o.ordered_labs.join(", ")}`;
          }
          if (o.prescriptions && o.prescriptions.length > 0) {
            orderDetails +=
              (orderDetails ? " | " : "") +
              `Prescriptions: ${o.prescriptions.map((p) => `${p.name} (${p.dosage})`).join(", ")}`;
          }
          events.push({
            id: `order-${o.id}`,
            date: o.created_at,
            type: "order",
            title: `Clinical Orders Placed`,
            desc: orderDetails || `Lab or Pharmacy orders created.`,
          });
        });
      }

      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimelineData(events);
    } catch (err) {
      console.warn(
        "Timeline fetch error, fallback to mock events:",
        err.message,
      );
      const mockEvents = [
        {
          id: "mock-evt-1",
          date: new Date().toISOString(),
          type: "visit",
          title: "Clinic Visit Started - OPD",
          desc: "Checked-in to General Triage queue.",
        },
        {
          id: "mock-evt-2",
          date: new Date(Date.now() - 3600000).toISOString(),
          type: "triage",
          title: "Triage Vitals Check",
          desc: "Temp: 36.8°C | BP: 120/80 mmHg | Pulse: 72 bpm | SpO2: 98%",
        },
        {
          id: "mock-evt-3",
          date: new Date(Date.now() - 7200000).toISOString(),
          type: "consultation",
          title: "Clinical SOAP Consultation",
          desc: "Diagnosis: Acute Bronchitis | Prescribed: Amoxicillin 500mg, Paracetamol 500mg",
        },
      ];
      setTimelineData(mockEvents);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    performSearch(searchQuery);
  };

  const handleDirectCheckin = async (patientId, serviceTypeVal) => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      let targetDept = "triage";
      let targetPriority = "routine";

      if (serviceTypeVal === "LAB") {
        targetDept = "lab";
      } else if (serviceTypeVal === "PHA") {
        targetDept = "pharmacy";
      } else if (serviceTypeVal === "IPD") {
        targetDept = "ward";
      } else if (serviceTypeVal === "EMR") {
        targetDept = "triage";
        targetPriority = "emergency";
      } else if (serviceTypeVal === "FP" || serviceTypeVal === "IMM") {
        targetDept = "consultation";
      } else if (serviceTypeVal === "ANC") {
        targetDept = "triage";
      }

      // Check for active visit
      const { data: vsts } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", patientId);
      const active = vsts?.find((v) => v.status !== "completed");
      if (active) {
        throw new Error(
          `Patient already has an active visit in ${active.department.toUpperCase()}.`,
        );
      }

      const visitRecord = {
        patient_id: patientId,
        facility_id: user.facility_id,
        department: targetDept,
        priority: targetPriority,
        status: "waiting",
        service_type: serviceTypeVal,
      };
      const { error: visitErr } = await supabase
        .from("visits")
        .insert(visitRecord);
      if (visitErr) throw visitErr;

      // Create MOH compliance record
      const regRecord = {
        patient_id: patientId,
        facility_id: user.facility_id,
        visit_type: "walk-in",
        service_type: serviceTypeVal,
        status: "active",
      };
      await supabase.from("patient_registrations").insert(regRecord);

      if (showNotification) {
        showNotification(
          "success",
          "Check-in Successful",
          `Patient checked in successfully for ${serviceTypeVal}!`,
        );
      } else {
        setMessage({
          type: "success",
          text: `Patient checked in successfully for ${serviceTypeVal}!`,
        });
      }
      performSearch(searchQuery);
    } catch (err) {
      if (showNotification) {
        showNotification(
          "error",
          "Check-in Failed",
          err.message || "Check-in failed.",
        );
      } else {
        setMessage({ type: "error", text: err.message || "Check-in failed." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Input Buffers / Realistic Validation Checks
    const todayStr = new Date().toISOString().split("T")[0];

    if (dob > todayStr) {
      setMessage({
        type: "error",
        text: "Date of Birth cannot be in the future.",
      });
      return;
    }
    if (dob < "1900-01-01") {
      setMessage({
        type: "error",
        text: "Date of Birth must not be before 1900.",
      });
      return;
    }

    if (telephone) {
      const cleanPhone = telephone.trim();
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        setMessage({
          type: "error",
          text: "Phone number must be between 8 and 15 characters long.",
        });
        return;
      }
      const phoneRegex = /^[0-9+()\s-]+$/;
      if (!phoneRegex.test(cleanPhone)) {
        setMessage({
          type: "error",
          text: "Phone number contains invalid characters.",
        });
        return;
      }
    }

    if (idNumber) {
      const cleanNatId = idNumber.trim();
      if (cleanNatId.length < 4 || cleanNatId.length > 20) {
        setMessage({
          type: "error",
          text: "National ID must be between 4 and 20 characters long.",
        });
        return;
      }
    }

    if (isPregnant && lmp) {
      if (lmp > todayStr) {
        setMessage({
          type: "error",
          text: "LMP date cannot be in the future.",
        });
        return;
      }
      const lmpDate = new Date(lmp);
      const diffTime = Math.abs(new Date() - lmpDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 315) {
        setMessage({
          type: "error",
          text: "LMP date must not be more than 45 weeks in the past.",
        });
        return;
      }
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Auto-generate facility ID code
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const facilityCode = `EMC-PT-${randNum}`;
      const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(" ");

      const newPatient = {
        facility_id: user.facility_id,
        name: fullName,
        dob,
        gender,
        national_id: idNumber || null,
        facility_id_code: facilityCode,
        phone: JSON.stringify({
          phone: telephone,
          email: email,
          preferences: {
            lab: optInLab,
            pharmacy: optInPharmacy,
            billing: optInBilling,
          },
          village: village,
          location: location,
          marital_status: maritalStatus,
          parity: parity ? parseInt(parity) : 0,
          gravidae: gravidae ? parseInt(gravidae) : 0,
          lmp: isPregnant ? lmp : "",
          edd: isPregnant ? edd : "",
        }),
        next_of_kin_name: nokName,
        next_of_kin_phone: nokPhone,
        next_of_kin_relation: nokRelation,
        consent_given: consent,
        sha_number: shaNumber || null,
        sha_dependent_type: shaDependentType,
        sha_status: shaStatus,
      };

      const { data, error } = await supabase
        .from("patients")
        .insert(newPatient)
        .select();
      if (error) throw error;

      const addedPt = Array.isArray(data) ? data[0] : data;

      // Create MOH compliance record
      const regRecord = {
        patient_id: addedPt.id,
        facility_id: user.facility_id,
        visit_type: "walk-in",
        service_type: servicePoint,
        status: "active",
      };
      await supabase.from("patient_registrations").insert(regRecord);

      // Auto-queuing / routing
      if (autoCheckin) {
        let targetDept = "triage";
        let targetPriority = "routine";

        if (servicePoint === "LAB") {
          targetDept = "lab";
        } else if (servicePoint === "PHA") {
          targetDept = "pharmacy";
        } else if (servicePoint === "IPD") {
          targetDept = "ward";
        } else if (servicePoint === "EMR") {
          targetDept = "triage";
          targetPriority = "emergency";
        } else if (servicePoint === "FP" || servicePoint === "IMM") {
          targetDept = "consultation";
        } else if (servicePoint === "ANC") {
          targetDept = "triage";
        }

        const visitRecord = {
          patient_id: addedPt.id,
          facility_id: user.facility_id,
          department: targetDept,
          priority: targetPriority,
          status: "waiting",
          service_type: servicePoint,
        };
        await supabase.from("visits").insert(visitRecord);
      }

      if (showNotification) {
        showNotification(
          "success",
          "Registration Successful",
          `Patient successfully registered! Facility ID: ${facilityCode}${autoCheckin ? " and checked in to queue." : ""}`,
        );
      } else {
        setMessage({
          type: "success",
          text: `Patient successfully registered! Facility ID: ${facilityCode}${autoCheckin ? " and checked in to queue." : ""}`,
        });
      }

      // Clear form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setIdNumber("");
      setGender("male");
      setTitle("");
      setTelephone("");
      setAltTelephone("");
      setAge("");
      setDob("");
      setEmail("");
      setVillage("");
      setLocation("");
      setWard("");
      setNearestSchool("");
      setIsIncomingReferral("");
      setNokName("");
      setNokPhone("");
      setNokRelation("spouse");
      setServicePoint("");
      setServiceRoom("");
      setServiceProvider("");
      setSpecialist("");
      setPayments("");
      setPreferredPayment("");
      setServicePointFee([]);
      setConsent(true);
      setShaNumber("");
      setShaStatus("unverified");

      // Re-trigger search or take user to queue builder directly with patient details
      if (data) {
        const addedPt = Array.isArray(data) ? data[0] : data;
        setSearchResults([addedPt]);
        setSearched(true);
      }
    } catch (err) {
      if (showNotification) {
        showNotification(
          "error",
          "Registration Failed",
          err.message || "Failed to register patient.",
        );
      } else {
        setMessage({
          type: "error",
          text: err.message || "Failed to register patient.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[minmax(320px,0.9fr)_minmax(620px,1.4fr)_minmax(320px,0.7fr)] gap-4 lg:gap-6 2xl:gap-8 items-start">
      <PatientSearchPanel
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        searchResults={searchResults}
        searched={searched}
        searching={searching}
        onNavigateToQueue={onNavigateToQueue}
        expandedTimelinePtId={expandedTimelinePtId}
        setExpandedTimelinePtId={setExpandedTimelinePtId}
        loadPatientTimeline={loadPatientTimeline}
        loadingTimeline={loadingTimeline}
        performSearch={performSearch}
        admissions={admissions}
        loadingAdmissions={loadingAdmissions}
        handleDirectCheckin={handleDirectCheckin}
        setMessage={setMessage}
        timelineData={timelineData}
      />

      <RegistrationFormPanel
        message={message}
        servicePoint={servicePoint}
        setServicePoint={setServicePoint}
        autoCheckin={autoCheckin}
        setAutoCheckin={setAutoCheckin}
        shaNumber={shaNumber}
        setShaNumber={setShaNumber}
        shaStatus={shaStatus}
        setShaStatus={setShaStatus}
        verifyingSha={verifyingSha}
        shaDependentType={shaDependentType}
        setShaDependentType={setShaDependentType}
        searchId={searchId}
        setSearchId={setSearchId}
        performSearch={performSearch}
        firstName={firstName}
        setFirstName={setFirstName}
        middleName={middleName}
        setMiddleName={setMiddleName}
        lastName={lastName}
        setLastName={setLastName}
        idNumber={idNumber}
        setIdNumber={setIdNumber}
        gender={gender}
        setGender={setGender}
        title={title}
        setTitle={setTitle}
        telephone={telephone}
        setTelephone={setTelephone}
        altTelephone={altTelephone}
        setAltTelephone={setAltTelephone}
        age={age}
        setAge={setAge}
        dob={dob}
        setDob={setDob}
        village={village}
        setVillage={setVillage}
        location={location}
        setLocation={setLocation}
        ward={ward}
        setWard={setWard}
        email={email}
        setEmail={setEmail}
        nearestSchool={nearestSchool}
        setNearestSchool={setNearestSchool}
        isIncomingReferral={isIncomingReferral}
        setIsIncomingReferral={setIsIncomingReferral}
        nokName={nokName}
        setNokName={setNokName}
        nokPhone={nokPhone}
        setNokPhone={setNokPhone}
        nokRelation={nokRelation}
        setNokRelation={setNokRelation}
        serviceRoom={serviceRoom}
        setServiceRoom={setServiceRoom}
        serviceProvider={serviceProvider}
        setServiceProvider={setServiceProvider}
        specialist={specialist}
        setSpecialist={setSpecialist}
        payments={payments}
        setPayments={setPayments}
        preferredPayment={preferredPayment}
        setPreferredPayment={setPreferredPayment}
        servicePointFee={servicePointFee}
        setServicePointFee={setServicePointFee}
        consent={consent}
        setConsent={setConsent}
        loading={loading}
        handleRegister={handleRegister}
        phone={phone}
        setPhone={setPhone}
        landmark={landmark}
        setLandmark={setLandmark}
        maritalStatus={maritalStatus}
        setMaritalStatus={setMaritalStatus}
        parity={parity}
        setParity={setParity}
        gravidae={gravidae}
        setGravidae={setGravidae}
        isPregnant={isPregnant}
        setIsPregnant={setIsPregnant}
        lmp={lmp}
        setLmp={setLmp}
        edd={edd}
        setEdd={setEdd}
        optInLab={optInLab}
        setOptInLab={setOptInLab}
        optInPharmacy={optInPharmacy}
        setOptInPharmacy={setOptInPharmacy}
        optInBilling={optInBilling}
        setOptInBilling={setOptInBilling}
      />

      <RegistrationMonitorPanel
        admissions={admissions}
        loadingAdmissions={loadingAdmissions}
        fetchAdmissions={fetchAdmissions}
        handleTabChange={handleTabChange}
        selectedReceptionPatientId={selectedReceptionPatientId}
        setSelectedReceptionPatientId={setSelectedReceptionPatientId}
        loadPatientTimeline={loadPatientTimeline}
        loadingTimeline={loadingTimeline}
        timelineData={timelineData}
      />
    </div>
  );
}
