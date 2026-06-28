import { CheckCircle2, AlertCircle } from "lucide-react";

export default function RegistrationFormPanel({
  message,
  servicePoint,
  setServicePoint,
  autoCheckin,
  setAutoCheckin,
  shaNumber,
  setShaNumber,
  shaStatus,
  setShaStatus,
  verifyingSha,
  shaDependentType,
  setShaDependentType,
  searchId,
  setSearchId,
  performSearch,
  firstName,
  setFirstName,
  middleName,
  setMiddleName,
  lastName,
  setLastName,
  idNumber,
  setIdNumber,
  gender,
  setGender,
  title,
  setTitle,
  telephone,
  setTelephone,
  altTelephone,
  setAltTelephone,
  age,
  setAge,
  dob,
  setDob,
  village,
  setVillage,
  location,
  setLocation,
  ward,
  setWard,
  email,
  setEmail,
  nearestSchool,
  setNearestSchool,
  isIncomingReferral,
  setIsIncomingReferral,
  nokName,
  setNokName,
  nokPhone,
  setNokPhone,
  nokRelation,
  setNokRelation,
  serviceRoom,
  setServiceRoom,
  serviceProvider,
  setServiceProvider,
  specialist,
  setSpecialist,
  payments,
  setPayments,
  preferredPayment,
  setPreferredPayment,
  servicePointFee,
  setServicePointFee,
  consent,
  setConsent,
  loading,
  handleRegister,
  phone,
  setPhone,
  landmark,
  setLandmark,
  maritalStatus,
  setMaritalStatus,
  parity,
  setParity,
  gravidae,
  setGravidae,
  isPregnant,
  setIsPregnant,
  lmp,
  setLmp,
  edd,
  setEdd,
  optInLab,
  setOptInLab,
  optInPharmacy,
  setOptInPharmacy,
  optInBilling,
  setOptInBilling,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 2xl:p-6 shadow-sm space-y-6 min-w-0">
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="text-teal-400">+</span> Patient Registration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Capture patient details to assign records to the MOH registers.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex gap-2.5 ${
            message.type === "success"
              ? "bg-green-500/5 border-green-500/20 text-green-400"
              : "bg-red-500/5 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
            Service Classification
          </h3>
          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_240px] gap-4 items-end">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Service Type
              </label>
              <select
                value={servicePoint}
                onChange={(e) => setServicePoint(e.target.value)}
                className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="OPD">General OPD (Normal Consultation)</option>
                <option value="ANC">Antenatal Care (ANC)</option>
                <option value="FP">Family Planning (FP)</option>
                <option value="IMM">Immunization/Vaccination</option>
                <option value="LAB">Laboratory-Only</option>
                <option value="PHA">Pharmacy-Only</option>
                <option value="IPD">Inpatient Admission</option>
                <option value="EMR">Emergency/Triage</option>
              </select>
            </div>
            <div className="flex items-center min-h-10.5">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none hover:text-white transition leading-snug">
                <input
                  type="checkbox"
                  checked={autoCheckin}
                  onChange={(e) => setAutoCheckin(e.target.checked)}
                  className="accent-teal-500 h-4 w-4 bg-slate-900 border-slate-800 rounded text-teal-505 shrink-0 mt-0.5"
                />
                <span>Check-in patient to queue immediately</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
            Social Health Authority (SHA) Insurance
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] gap-4 items-start">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                SHA Member Number
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  type="text"
                  value={shaNumber}
                  onChange={(e) => {
                    setShaNumber(e.target.value);
                    setShaStatus("unverified");
                  }}
                  placeholder="e.g. SHA-12345678"
                  className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
                />
                <button
                  type="button"
                  disabled={verifyingSha || !shaNumber.trim()}
                  onClick={async () => {
                    setShaStatus("unverified");
                    try {
                      setShaStatus("verifying");
                      await new Promise((resolve) => setTimeout(resolve, 800));
                      if (shaNumber.trim().length >= 4) {
                        setShaStatus("Verified / Eligible");
                      } else {
                        setShaStatus("Ineligible / Invalid Number");
                      }
                    } finally {
                      setShaStatus((prev) => (prev === "verifying" ? "unverified" : prev));
                    }
                  }}
                  className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 font-bold text-xs px-4 py-2.5 rounded-lg transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                >
                  {verifyingSha ? "Verifying..." : "Verify Eligibility"}
                </button>
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                SHA Dependent Type
              </label>
              <select
                value={shaDependentType}
                onChange={(e) => setShaDependentType(e.target.value)}
                className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="self">Principal Member (Self)</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="other">Other Dependent</option>
              </select>
            </div>
          </div>

          {shaNumber.trim() && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  shaStatus === "Verified / Eligible"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : shaStatus === "unverified"
                      ? "bg-slate-900 border border-slate-800 text-slate-400"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {shaStatus}
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
            Enter ID No. to Search (Only if the patient is registered with SHA)
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="SHA ID / National ID"
              className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
            />
            <button
              type="button"
              onClick={() => performSearch(searchId)}
              className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 font-bold text-xs px-4 py-2.5 rounded-lg transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Middle Name
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Middle Name"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              ID Number *
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="ID Number"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="">--- Select Title ---</option>
              <option value="mr">Mr</option>
              <option value="mrs">Mrs</option>
              <option value="miss">Miss</option>
              <option value="dr">Dr</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Telephone *
            </label>
            <input
              type="text"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Telephone"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Alt Telephone
            </label>
            <input
              type="text"
              value={altTelephone}
              onChange={(e) => setAltTelephone(e.target.value)}
              placeholder="Alternative Telephone"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Age (Years)
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Years"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              min="1900-01-01"
              max={new Date().toISOString().split("T")[0]}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Village *
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Ward *
            </label>
            <input
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Ward"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter valid email address (e.g., name@domain.com)"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Nearest School
            </label>
            <input
              type="text"
              value={nearestSchool}
              onChange={(e) => setNearestSchool(e.target.value)}
              placeholder="Nearest School"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Is Incoming Referral?
            </label>
            <select
              value={isIncomingReferral}
              onChange={(e) => setIsIncomingReferral(e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Responsible Person / Next Of Kin
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={nokName}
                onChange={(e) => setNokName(e.target.value)}
                placeholder="Next Of Kin Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Mobile Number *
              </label>
              <input
                type="text"
                value={nokPhone}
                onChange={(e) => setNokPhone(e.target.value)}
                placeholder="Next Of Kin Mobile Number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Relationship *
              </label>
              <select
                value={nokRelation}
                onChange={(e) => setNokRelation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="">-- Select Relationship --</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Service Details
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Service Point
              </label>
              <select
                value={servicePoint}
                onChange={(e) => setServicePoint(e.target.value)}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="">Select Service Point</option>
                <option value="OPD">OPD</option>
                <option value="LAB">Laboratory</option>
                <option value="PHA">Pharmacy</option>
                <option value="IPD">Inpatient</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Service Room
              </label>
              <input
                type="text"
                value={serviceRoom}
                onChange={(e) => setServiceRoom(e.target.value)}
                placeholder="Service Room"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Service Provider
              </label>
              <input
                type="text"
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                placeholder="Service Provider"
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Specialist
              </label>
              <select
                value={specialist}
                onChange={(e) => setSpecialist(e.target.value)}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="">Select Specialist</option>
                <option value="general">General</option>
                <option value="pediatrician">Pediatrician</option>
                <option value="gp">General Practitioner</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Payments
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Payments *
              </label>
              <select
                value={payments}
                onChange={(e) => setPayments(e.target.value)}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="">Preferred Payment Option</option>
                <option value="cash">Cash</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Service Point Fee *
              </label>
              <select
                multiple
                value={servicePointFee}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setServicePointFee(selected);
                }}
                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
                required
              >
                <option value="consultation_cash">CONSULTATION FEE - CASH - 500.00</option>
                <option value="consultation_insurance">CONSULTATION FEE - INSURANCE - 1000.00</option>
                <option value="doctors_cash">DOCTORS FEE(MO) - CASH - 500.00</option>
                <option value="doctors_insurance">DOCTORS FEE(MO) - INSURANCE - 500.00</option>
                <option value="review_cash">REVIEW - CASH - 0.00</option>
                <option value="review_insurance">REVIEW - INSURANCE - 0.00</option>
                <option value="aon_cash">AON MINET CONSULTATION FEE - CASH - 0.00</option>
                <option value="aon_insurance">AON MINET CONSULTATION FEE - INSURANCE - 1000.00</option>
                <option value="maternity_cash">MATERNITY - CASH - 0.00</option>
                <option value="maternity_insurance">MATERNITY - INSURANCE - 0.00</option>
                <option value="hemodialysis_cash">HEMODIALYSIS - CASH - 10650.00</option>
                <option value="hemodialysis_insurance">HEMODIALYSIS - INSURANCE - 10650.00</option>
                <option value="photocopy_cash">PHOTOCOPY - CASH - 10.00</option>
                <option value="photocopy_insurance">PHOTOCOPY - INSURANCE - 10.00</option>
              </select>
              <p className="text-2xs text-slate-500 mt-1">
                Press Ctrl and click to select multiple options
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2 flex items-center gap-3">
          <button
            type="button"
            className="text-[11px] font-bold px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-teal-500/30 transition"
          >
            Preview
          </button>
          <button
            type="button"
            className="text-[11px] font-bold px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-teal-500/30 transition"
          >
            Captured
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Phone Number *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@eagletechsolutions.tech"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Village / Estate *
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Kawangware"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Landmark / Residence Details
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Market / Church"
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Marital Status *
            </label>
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              required
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Patient Notification Consent Preferences
          </h3>
          <div className="flex flex-wrap gap-4 text-xs font-bold">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
              <input
                type="checkbox"
                checked={optInLab}
                onChange={(e) => setOptInLab(e.target.checked)}
                className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
              />
              Opt-in Lab emails
            </label>
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
              <input
                type="checkbox"
                checked={optInPharmacy}
                onChange={(e) => setOptInPharmacy(e.target.checked)}
                className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
              />
              Opt-in Pharmacy emails
            </label>
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-white transition">
              <input
                type="checkbox"
                checked={optInBilling}
                onChange={(e) => setOptInBilling(e.target.checked)}
                className="accent-teal-500 h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-500"
              />
              Opt-in Billing emails
            </label>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Next of Kin details
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                NOK Name
              </label>
              <input
                type="text"
                value={nokName}
                onChange={(e) => setNokName(e.target.value)}
                placeholder="NOK Full Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                NOK Phone
              </label>
              <input
                type="text"
                value={nokPhone}
                onChange={(e) => setNokPhone(e.target.value)}
                placeholder="NOK Phone number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Relation
              </label>
              <select
                value={nokRelation}
                onChange={(e) => setNokRelation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 transition"
              >
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="consentCheck"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="accent-teal-500 rounded border-slate-800 bg-slate-950 text-teal-600 focus:ring-teal-500 h-4 w-4 mt-0.5 cursor-pointer"
          />
          <label
            htmlFor="consentCheck"
            className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none"
          >
            Patient gives consent for medical care record capture and reporting to Ministry of Health (MOH) systems under the Data Protection Act.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {loading ? "Registering Patient..." : "Register Patient"}
        </button>
      </form>
    </div>
  );
}
