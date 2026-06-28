import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { sendNotification } from "../notificationService";
import { useAuth } from "../context/AuthContext";

import {
  Activity,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
  Eye,
  Heart,
  ShieldAlert,
  Upload,
} from "lucide-react";

export default function SaaSOnboarding({ onBackToLogin }) {
  const { signup, login, verifyOtp } = useAuth();

  // Form steps: 1 (Hospital Details & Admin Acc), 2 (Plan Selection), 3 (Payment & Verification), 4 (Complete)
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("Growth");

  // Hospital details
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalCode, setHospitalCode] = useState("");
  const [logoOption, setLogoOption] = useState("preset");
  const [customLogoUrl, setCustomLogoUrl] = useState("");

  // Admin account details
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [googleUser, setGoogleUser] = useState(null);
  const [existingHospitals, setExistingHospitals] = useState([]);
  const [onboardingWarningType, setOnboardingWarningType] = useState("");

  // OTP Verification states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Kenyan Hospital Registration Details
  const [kmpdcRegNumber, setKmpdcRegNumber] = useState("");
  const [mflCode, setMflCode] = useState("");
  const [regulatoryCategory, setRegulatoryCategory] = useState("Level 2 - Medical Clinic");
  const [county, setCounty] = useState("Nairobi");
  const [subCounty, setSubCounty] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [eCitizenVerifying, setECitizenVerifying] = useState(false);
  const [eCitizenVerified, setECitizenVerified] = useState(false);
  const [eCitizenError, setECitizenError] = useState("");

  const handleCancelAndBack = () => {
    sessionStorage.removeItem("egesa_health_onboarding_saved_state");
    sessionStorage.removeItem("egesa_health_onboarding_google_user");
    sessionStorage.removeItem("egesa_health_onboarding_redirect");
    onBackToLogin?.();
  };

  const checkExistingFacilities = async (email) => {
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*, facility:facilities(*)')
        .eq('email', email.toLowerCase().trim());
        
      if (profErr) throw profErr;
      
      if (profiles && profiles.length > 0) {
        const hps = profiles
          .map(p => p.facility)
          .filter(Boolean);
          
        setExistingHospitals(hps);
        
        if (profiles.length >= 2) {
          setOnboardingWarningType("limit_reached");
        } else if (profiles.length === 1) {
          setOnboardingWarningType("has_one");
        }
      }
    } catch (err) {
      console.error('Error checking existing facilities:', err);
    }
  };

  const handleRegisterSecond = () => {
    setOnboardingWarningType("");
    setStep(2); // Go straight to tier & plan selection
  };

  const handleECitizenVerify = async () => {
    if (!kmpdcRegNumber.trim() || !mflCode.trim()) {
      setECitizenError("Please enter both KMPDC Reg Number and MFL Code first.");
      return;
    }
    setECitizenVerifying(true);
    setECitizenError("");
    setECitizenVerified(false);

    // Simulate calling the e-Citizen / Master Facility List API
    setTimeout(() => {
      try {
        const codeNum = mflCode.trim();
        let resolvedName = "";
        let resolvedCategory = "";
        let resolvedCounty = "";
        let resolvedSubCounty = "";
        let resolvedAddress = "";

        if (codeNum === "12345") {
          resolvedName = "Nairobi West Medical Center";
          resolvedCategory = "Level 4 - Sub-County Hospital";
          resolvedCounty = "Nairobi";
          resolvedSubCounty = "Lang'ata";
          resolvedAddress = "Gandhi Avenue, Nairobi West, Nairobi";
        } else if (codeNum === "23456") {
          resolvedName = "Mombasa Coast Health Centre";
          resolvedCategory = "Level 3 - Health Centre";
          resolvedCounty = "Mombasa";
          resolvedSubCounty = "Mvita";
          resolvedAddress = "Coast Avenue, Mombasa";
        } else if (codeNum === "34567") {
          resolvedName = "Kisumu Specialist Hospital";
          resolvedCategory = "Level 5 - County Referral Hospital";
          resolvedCounty = "Kisumu";
          resolvedSubCounty = "Kisumu Central";
          resolvedAddress = "Jomo Kenyatta Highway, Kisumu";
        } else {
          // Dynamic generation based on code
          resolvedName = `Kenya Health Services [MFL-${codeNum}]`;
          resolvedCategory = "Level 2 - Medical Clinic";
          resolvedCounty = county || "Nairobi";
          resolvedSubCounty = subCounty || "Nairobi Central";
          resolvedAddress = `${resolvedSubCounty}, ${resolvedCounty} County, Kenya`;
        }

        setHospitalName(resolvedName);
        setRegulatoryCategory(resolvedCategory);
        setCounty(resolvedCounty);
        setSubCounty(resolvedSubCounty);
        setHospitalAddress(resolvedAddress);
        setECitizenVerified(true);
      } catch (err) {
        setECitizenError("Failed to verify details with e-Citizen. Check your network or credentials.");
      } finally {
        setECitizenVerifying(false);
      }
    }, 1500);
  };

  useEffect(() => {
    const savedStateStr = sessionStorage.getItem(
      "egesa_health_onboarding_saved_state",
    );
    if (savedStateStr) {
      try {
        const saved = JSON.parse(savedStateStr);
        if (saved.selectedPlan) setSelectedPlan(saved.selectedPlan);
        if (saved.hospitalName) setHospitalName(saved.hospitalName);
        if (saved.hospitalAddress) setHospitalAddress(saved.hospitalAddress);
        if (saved.hospitalCode) setHospitalCode(saved.hospitalCode);
        if (saved.logoOption) setLogoOption(saved.logoOption);
        if (saved.customLogoUrl) setCustomLogoUrl(saved.customLogoUrl);
        if (saved.adminName) setAdminName(saved.adminName);
        if (saved.adminEmail) setAdminEmail(saved.adminEmail);
        if (saved.adminPhone) setAdminPhone(saved.adminPhone);
        if (saved.adminPassword) setAdminPassword(saved.adminPassword);
        if (saved.step) setStep(saved.step);
      } catch (e) {
        console.error("Failed to restore onboarding state:", e);
      }
    }

    // 2. Check if a Google user was stored on redirect callback
    const googleUserStr = sessionStorage.getItem(
      "egesa_health_onboarding_google_user",
    );
    if (googleUserStr) {
      try {
        const gUser = JSON.parse(googleUserStr);
        setGoogleUser(gUser);
        setAdminName((prev) => prev || gUser.name || "");
        setAdminEmail((prev) => prev || gUser.email || "");
        checkExistingFacilities(gUser.email);
      } catch (e) {
        console.error("Failed to parse Google user details:", e);
      }
    }
  }, []);

  // Save onboarding state changes in real-time to survive refreshes
  useEffect(() => {
    if (step < 5) {
      const stateToSave = {
        selectedPlan,
        hospitalName,
        hospitalAddress,
        hospitalCode,
        logoOption,
        customLogoUrl,
        adminName,
        adminEmail,
        adminPhone,
        adminPassword,
        step,
      };
      sessionStorage.setItem(
        "egesa_health_onboarding_saved_state",
        JSON.stringify(stateToSave),
      );
    }
  }, [
    selectedPlan,
    hospitalName,
    hospitalAddress,
    hospitalCode,
    logoOption,
    customLogoUrl,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
    step,
  ]);

  // Payment form state
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Success states
  const [createdFacilityCode, setCreatedFacilityCode] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState("");

  // Preset Logos with clean medical styles
  const logoPresets = {
    heart: {
      name: "Teal Heart Pulse",
      color: "text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/20",
      icon: (cls) => <Heart className={cls} fill="currentColor" />,
    },
    shield: {
      name: "Blue Care Shield",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      icon: (cls) => <ShieldCheck className={cls} fill="currentColor" />,
    },
    cross: {
      name: "Red Clinic Cross",
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      icon: (cls) => <Activity className={cls} />,
    },
  };

  const getActiveLogoUrl = () => {
    if (logoOption === "custom") {
      return (
        customLogoUrl ||
        "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60"
      );
    }
    return `preset:${logoOption}`;
  };

  const renderActiveLogo = (size = 20, border = true) => {
    if (logoOption === "custom" && customLogoUrl) {
      return (
        <img
          src={customLogoUrl}
          alt="Custom Logo"
          className={`rounded-lg object-cover ${border ? "border border-slate-700" : ""}`}
          style={{ width: size, height: size }}
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=128&auto=format&fit=crop&q=60";
          }}
        />
      );
    }
    const preset = logoPresets[logoOption] || logoPresets["heart"];
    return (
      <div
        className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${preset.bg} ${preset.color}`}
      >
        {preset.icon(`w-${Math.floor(size / 4)}.5 h-${Math.floor(size / 4)}.5`)}
      </div>
    );
  };

  // Dynamic Image compression to lightweight base64 string
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (PNG, JPEG, SVG).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const max_size = 80; // Small size fits sidebar and complies with DB size attributes
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // 80% compression ensures high quality but tiny string size
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          setCustomLogoUrl(compressedBase64);
          setError("");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const plans = [
    {
      id: "pharmacy",
      name: "Independent Pharmacy",
      price: "Ksh 3,900",
      billing: "per month",
      description:
        "Designed exclusively for standalone pharmacies to manage stock, sales, and walk-in dispensing.",
      features: [
        "Up to 5 staff accounts",
        "Direct Walk-in Dispensing (POS) Desk",
        "FEFO Batch Stock & Inventory Control",
        "Invoice & Payment Receipt generation",
        "Sales, stock levels & low stock alerts",
      ],
    },
    {
      id: "clinic",
      name: "Basic Clinic",
      price: "Ksh 6,500",
      billing: "per month",
      description:
        "Ideal for small clinics and standalone outpatient triage stations.",
      features: [
        "Up to 5 healthcare staff accounts",
        "Triage & OPD Consultation modules",
        "Basic local queue management",
        "Email customer support",
        "Standard daily audit logging",
      ],
    },
    {
      id: "hospital",
      name: "Standard Hospital",
      price: "Ksh 19,500",
      billing: "per month",
      description:
        "Perfect for mid-size hospitals requiring ward operations and lab/pharmacy integration.",
      features: [
        "Up to 30 healthcare staff accounts",
        "All 11 modules (Lab, Pharmacy, Billing, etc.)",
        "Inpatient Ward Bed Visualizer",
        "MOH 717 auto-reporting engines",
        "Priority email/chat support",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise System",
      price: "Ksh 52,000",
      billing: "per month",
      description:
        "Built for large referral networks and multi-facility hospital groups.",
      features: [
        "Unlimited staff accounts & facilities",
        "Custom domain names (e.g. portal.yourhospital.com)",
        "Full HIPAA / local compliance database configurations",
        "Dedicated account manager & 24/7 SLA hotline",
        "Custom reporting integrations",
      ],
    },
  ];

  const handleGoogleOnboardingAuth = async () => {
    setError("");

    // Save current form inputs so they are restored after redirect
    const savedState = {
      selectedPlan,
      hospitalName,
      hospitalAddress,
      hospitalCode,
      logoOption,
      customLogoUrl,
      adminPhone,
      step: 2, // After Google redirect, land directly on Step 2 (pricing plan select)
    };
    sessionStorage.setItem(
      "egesa_health_onboarding_saved_state",
      JSON.stringify(savedState),
    );
    sessionStorage.setItem("egesa_health_onboarding_redirect", "true");

    try {
      if (supabase.isSandbox) {
        // Sandbox mode: immediately mock google login
        const mockGoogleUser = {
          id: "u_mock_google_onboarding",
          email: "google.admin@egesa.com",
          name: "Google Admin",
        };
        setGoogleUser(mockGoogleUser);
        setAdminName(mockGoogleUser.name);
        setAdminEmail(mockGoogleUser.email);
        sessionStorage.removeItem("egesa_health_onboarding_saved_state");
        sessionStorage.removeItem("egesa_health_onboarding_redirect");
      } else {
        // Use proper Supabase redirect URL format
        const redirectUrl = `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (error) throw new Error(error.message);
      }
    } catch (err) {
      setError(err.message || "Google Authentication failed.");
    }
  };

  const handleNextStep = async () => {
    setError("");

    if (step === 1) {
      const isPasswordMissing = !googleUser && !adminPassword.trim();
      if (
        !adminName.trim() ||
        !adminEmail.trim() ||
        !adminPhone.trim() ||
        isPasswordMissing
      ) {
        setError("Please fill in all administrator account details.");
        return;
      }
      if (!googleUser && adminPassword.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      // 1. Create Auth account manually if not already registered and not using Google
      if (!googleUser && !registeredUserId) {
        setLoading(true);
        try {
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email: adminEmail,
              password: adminPassword,
              name: adminName,
            });

          if (authError) throw new Error(authError);
          setRegisteredUserId(authData.user.id);
        } catch (err) {
          setError(err.message || "Failed to create administrator account.");
          setLoading(false);
          return;
        } finally {
          setLoading(false);
        }
      }

      // After successful signup, show OTP verification screen (skip for Google auth)
      if (!googleUser) {
        setShowOtpVerification(true);
        // Start resend cooldown timer
        setResendCooldown(30);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Google users skip OTP verification
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      // Plan Selection is always valid (defaults to 'hospital')
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!hospitalName.trim() || !hospitalAddress.trim()) {
        setError("Please fill in all hospital profile details.");
        return;
      }
      if (logoOption === "custom" && !customLogoUrl) {
        setError(
          "Please upload a custom Logo File or choose one of the presets.",
        );
        return;
      }

      const cleanName = hospitalName.trim().replace(/[^a-zA-Z ]/g, "");
      const words = cleanName.split(" ");
      let code = "";
      if (words.length >= 2) {
        code = (
          words[0][0] +
          words[1][0] +
          (words[2] ? words[2][0] : "H")
        ).toUpperCase();
      } else {
        code = cleanName.substring(0, 3).toUpperCase();
      }
      setHospitalCode(`${code}-${Math.floor(100 + Math.random() * 900)}`);

      setStep(4);
      return;
    }

    if (step === 4) {
      setStep(5);
      return;
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setOtpError("Please enter a valid 6-digit code.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const result = await verifyOtp(adminEmail, otpCode.trim(), 'signup');
      console.log('[SaaSOnboarding:handleVerifyOtp] verifyOtp() resolved with status:', result?.status);

      if (result?.status === 'success') {
        setShowOtpVerification(false);
        setStep(2);
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      console.error('[SaaSOnboarding:handleVerifyOtp] Error:', err.message);
      setOtpError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      // Resend OTP via Supabase
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: adminEmail,
      });

      if (error) throw error;

      // Reset cooldown
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setOtpError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleProvisionPortal = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      let userId;
      if (googleUser) {
        userId = googleUser.id;
      } else if (registeredUserId) {
        userId = registeredUserId;
      } else {
        // Fallback in case Step 1 was somehow bypassed
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: adminEmail,
            password: adminPassword,
            name: adminName,
          },
        );

        if (authError) throw new Error(authError.message || authError);
        userId = authData.user.id;
      }

      const facilityId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      const logoUrl = getActiveLogoUrl();

      // Map selectedPlan to license_tier: pharmacy -> pharmacy, clinic -> basic, hospital/enterprise -> extensive
      const licenseTier =
        selectedPlan === "pharmacy"
          ? "pharmacy"
          : selectedPlan === "clinic"
          ? "basic"
          : "extensive";

      // 2. Upsert new facility document including logo_url & address
      const { error: facError } = await supabase.from("facilities").upsert({
        id: facilityId,
        name: hospitalName,
        code: hospitalCode,
        logo_url: logoUrl,
        address: hospitalAddress,
        license_tier: licenseTier,
        is_verified: false,
        kmpdc_reg_number: kmpdcRegNumber,
        mfl_code: mflCode,
        regulatory_category: regulatoryCategory,
        county: county,
        sub_county: subCounty,
        lr_number: lrNumber,
      });

      if (facError) throw new Error(facError.message || facError);

      // 2b. Seed default departments for the new facility
      let defaultDepts = [];
      if (licenseTier === "pharmacy") {
        defaultDepts = [
          {
            name: "Pharmacy",
            code: "PHA",
            type: "pharmacy",
            specialty: "general",
          },
          {
            name: "Billing Desk",
            code: "BIL",
            type: "billing",
            specialty: "general",
          },
        ];
      } else {
        defaultDepts = [
          {
            name: "Triage (Vitals)",
            code: "TRI",
            type: "triage",
            specialty: "general",
          },
          {
            name: "OPD Consult",
            code: "CON",
            type: "consultation",
            specialty: "general",
          },
          { name: "Laboratory", code: "LAB", type: "lab", specialty: "general" },
          {
            name: "Pharmacy",
            code: "PHA",
            type: "pharmacy",
            specialty: "general",
          },
          {
            name: "Billing Desk",
            code: "BIL",
            type: "billing",
            specialty: "general",
          },
        ];
      }

      // If Extensive Plan (hospital/enterprise), add advanced departments
      if (licenseTier === "extensive") {
        defaultDepts.push(
          {
            name: "Radiology",
            code: "RAD",
            type: "radiology",
            specialty: "general",
          },
          {
            name: "Theatre",
            code: "SUR",
            type: "surgery",
            specialty: "general",
          },
          {
            name: "Inpatient Ward",
            code: "WAR",
            type: "ward",
            specialty: "general",
          },
        );
      }

      const deptRows = defaultDepts.map((d) => ({
        facility_id: facilityId,
        name: d.name,
        code: d.code,
        type: d.type,
        specialty: d.specialty,
        is_active: true,
      }));

      const { error: deptError } = await supabase
        .from("departments")
        .insert(deptRows);
      if (deptError) throw new Error(deptError.message || deptError);

      // 3. Upsert admin profile document
      const { error: profError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: adminName,
        role: "admin",
        facility_id: facilityId,
        email: adminEmail,
      });

      if (profError) throw new Error(profError.message || profError);

      // 4. Trigger welcome email notification (non-blocking, should not crash onboarding if SMTP fails)
      try {
        await sendNotification(
          "USER_SIGNUP",
          {
            adminName,
            adminEmail,
            recipientEmail: adminEmail,
          },
          facilityId,
        );
      } catch (emailErr) {
        console.warn(
          "[SaaSOnboarding] Welcome email notification dispatch failed:",
          emailErr.message || emailErr,
        );
      }

      // 4b. Trigger verification email notification to super admin (non-blocking)
      try {
        await sendNotification(
          "NEW_HOSPITAL_REGISTRATION",
          {
            hospitalName,
            hospitalCode,
            hospitalAddress,
            selectedPlan,
            adminName,
            adminEmail,
            adminPhone,
            recipientEmail: "fredrickmakori102@gmail.com",
          },
          facilityId,
        );
      } catch (emailErr) {
        console.warn(
          "[SaaSOnboarding] Super Admin verification email notification dispatch failed:",
          emailErr.message || emailErr,
        );
      }

      // Cache details for redirect auto-fill
      sessionStorage.setItem("egesa_health_new_facility_id", facilityId);
      sessionStorage.setItem("egesa_health_new_facility_code", hospitalCode);
      sessionStorage.setItem("egesa_health_new_admin_email", adminEmail);

      setCreatedFacilityCode(hospitalCode);
      setStep(5);
    } catch (err) {
      setError(err.message || "Onboarding failed during server configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-955 flex flex-col justify-center items-center p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-slate-955 border border-slate-900 p-1.5 rounded-xl shadow-lg shadow-teal-500/5">
          <img
            src="/logo.png"
            alt="Eagle Tech Logo"
            className="w-8 h-8 object-contain"
          />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wider uppercase">
            Eagle Tech
          </h1>
          <p className="text-[9px] text-teal-400 font-bold tracking-widest uppercase block">
            HMIS Outsource Solutions
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        {/* Step Indicators */}
        {step < 5 && !onboardingWarningType && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <div
              className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 1 ? "border-teal-500 text-teal-400" : "border-transparent text-slate-500"}`}
            >
              <span className="text-xs font-bold font-mono">01.</span>
              <span className="text-xs font-semibold">Account Signup</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div
              className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 2 ? "border-teal-500 text-teal-400" : "border-transparent text-slate-500"}`}
            >
              <span className="text-xs font-bold font-mono">02.</span>
              <span className="text-xs font-semibold">Tiers & Pricing</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div
              className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 3 ? "border-teal-500 text-teal-400" : "border-transparent text-slate-500"}`}
            >
              <span className="text-xs font-bold font-mono">03.</span>
              <span className="text-xs font-semibold">Branding & Setup</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800"></div>
            <div
              className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === 4 ? "border-teal-500 text-teal-400" : "border-transparent text-slate-500"}`}
            >
              <span className="text-xs font-bold font-mono">04.</span>
              <span className="text-xs font-semibold">Secure Checkout</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3.5 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* EXISTING HOSPITAL WARNINGS */}
        {onboardingWarningType === "limit_reached" && (
          <div className="space-y-6 max-w-lg mx-auto text-center py-6">
            <div className="flex justify-center mb-2">
              <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-full text-red-400">
                <AlertCircle size={40} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide font-sans">
                Registration Limit Reached
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You already have registered 2 hospitals under the email <strong>{adminEmail}</strong>:
              </p>
            </div>
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-2 text-xs text-left font-sans">
              {existingHospitals.map((h, i) => (
                <div key={i} className="flex justify-between border-b border-slate-900 last:border-b-0 pb-1.5 pt-1.5 first:pt-0 last:pb-0">
                  <span className="font-bold text-slate-350">{h?.name}</span>
                  <span className="font-mono text-teal-400 font-bold">[{h?.code}]</span>
                </div>
              ))}
            </div>
            <p className="text-2xs text-slate-500 font-sans leading-relaxed">
              To comply with Eagle Tech HMIS policies, a single account cannot register more than 2 facilities. Please proceed to your dashboard workspace to manage your existing facilities.
            </p>
            <button
              onClick={handleCancelAndBack}
              className="bg-teal-400 hover:bg-teal-500 text-slate-950 font-black text-xs py-2.5 px-6 rounded-lg shadow-lg transition w-full cursor-pointer font-sans"
            >
              Proceed to Dashboard Workspace
            </button>
          </div>
        )}

        {onboardingWarningType === "has_one" && (
          <div className="space-y-6 max-w-lg mx-auto text-center py-6">
            <div className="flex justify-center mb-2">
              <div className="bg-yellow-500/10 border border-yellow-500/25 p-3 rounded-full text-yellow-400 animate-pulse">
                <Sparkles size={40} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide font-sans">
                Hospital Already Registered
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You already have registered a hospital under the email <strong>{adminEmail}</strong>:
              </p>
            </div>
            <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl text-xs text-left font-sans flex justify-between">
              <span className="font-bold text-slate-300">{existingHospitals[0]?.name}</span>
              <span className="font-mono text-teal-400 font-bold">[{existingHospitals[0]?.code}]</span>
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
              Would you like to proceed to your dashboard or register another hospital under this account? (Maximum 2)
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleCancelAndBack}
                className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-lg hover:bg-slate-800 transition flex-1 cursor-pointer font-sans"
              >
                Proceed to Dashboard
              </button>
              <button
                onClick={handleRegisterSecond}
                className="bg-teal-400 hover:bg-teal-500 text-slate-950 font-black text-xs py-2.5 px-4 rounded-lg shadow-lg transition flex-1 cursor-pointer font-sans"
              >
                Register Another Hospital
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: ADMINISTRATOR ACCOUNT SIGNUP */}
        {!onboardingWarningType && step === 1 && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5 font-sans">
                <User size={18} className="text-teal-400" /> Create
                Administrator Account
              </h2>
              <p className="text-xs text-slate-400">
                Sign up to configure and launch your dedicated hospital
                workspace portal.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-855 p-6 rounded-xl space-y-6 font-sans">
              {/* Google Sign Up Option */}
              {!googleUser ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleOnboardingAuth}
                    className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition font-bold text-xs cursor-pointer active:scale-[0.99]"
                  >
                    <svg
                      className="w-4 h-4 text-teal-400 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center justify-center gap-3">
                    <div className="h-[1px] bg-slate-800 flex-1"></div>
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider">
                      or sign up with email
                    </span>
                    <div className="h-[1px] bg-slate-800 flex-1"></div>
                  </div>
                </div>
              ) : (
                <div className="bg-teal-500/5 border border-teal-500/20 p-3.5 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-teal-500/10 p-1.5 rounded-full text-teal-400">
                      <Check size={14} />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-200 block leading-snug font-sans">
                        Authenticated with Google
                      </span>
                      <span className="text-2xs text-slate-450 block font-medium truncate font-sans">
                        {adminEmail}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleUser(null);
                      setAdminName("");
                      setAdminEmail("");
                    }}
                    className="text-2xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 py-1 px-3 rounded-lg transition font-bold cursor-pointer font-sans"
                  >
                    Use Another Account
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Dr. Frank Meso"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+254 712 345678"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@yourhospital.com"
                    disabled={!!googleUser}
                    className={`w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition ${
                      googleUser ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={googleUser ? "" : adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={
                      googleUser
                        ? "Not required (Google Auth)"
                        : "Min 8 characters"
                    }
                    disabled={!!googleUser}
                    className={`w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition ${
                      googleUser ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                    required={!googleUser}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={handleCancelAndBack}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
              <button
                onClick={handleNextStep}
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
              >
                {loading ? "Registering..." : "Create Account & Continue"}{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* OTP VERIFICATION SCREEN */}
        {showOtpVerification && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5 font-sans">
                <Mail size={18} className="text-teal-400" /> Verify Your Email
              </h2>
              <p className="text-xs text-slate-400">
                A 6-digit confirmation code was sent to{" "}
                <strong className="text-slate-200">{adminEmail}</strong>
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-855 p-6 rounded-xl space-y-6 font-sans">
              {otpError && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-4 text-center text-2xl font-mono text-slate-100 tracking-[0.5em] focus:outline-none focus:border-teal-500 transition"
                  autoFocus
                />
                <p className="text-2xs text-slate-500 mt-2 text-center">
                  Sandbox mode: use code <span className="font-mono text-teal-400">123456</span>
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowOtpVerification(false);
                  setStep(1);
                }}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Change Email
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="text-[11px] font-semibold text-teal-400 hover:underline transition disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length !== 6}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {otpLoading ? "Verifying..." : "Verify & Continue"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PLAN SELECTOR */}
        {!onboardingWarningType && step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5 font-sans">
                <Sparkles size={16} className="text-teal-400" /> Choose
                Licensing Plan
              </h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Select a licensing tier to match your clinical management
                workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`bg-slate-955 border rounded-xl p-5 cursor-pointer relative transition-all duration-200 hover:border-teal-500/40 flex flex-col justify-between ${
                    selectedPlan === p.id
                      ? "border-teal-500 shadow-lg shadow-teal-500/5 ring-1 ring-teal-500"
                      : "border-slate-850"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        {p.name}
                      </span>
                      {selectedPlan === p.id && (
                        <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] py-0.5 px-2 rounded-full font-bold uppercase">
                          Selected
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-2xl font-black text-white">
                        {p.price}
                      </span>
                      <span className="text-2xs text-slate-500 ml-1.5">
                        {p.billing}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed min-h-[44px]">
                      {p.description}
                    </p>
                    <div className="border-t border-slate-900 pt-4 space-y-2">
                      {p.features.map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-2xs text-slate-400 font-medium"
                        >
                          <Check size={12} className="text-teal-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={handlePrevStep}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handleNextStep}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
              >
                Configure Branding <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BRANDING SETUP & PREVIEW */}
        {!onboardingWarningType && step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5 mb-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5 font-sans">
                Portal White-Label Branding Setup
              </h2>
              <p className="text-xs text-slate-400">
                Design your custom medical portal. Define your Hospital Name,
                physical address, and upload your custom logo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form: Inputs (7/12 width) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-slate-955 border border-slate-850 p-5 rounded-xl space-y-4">
                  {/* e-Citizen Registration & Verification */}
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Kenyan Health Facility Registry (e-Citizen Verification)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        KMPDC Reg Number
                      </label>
                      <input
                        type="text"
                        value={kmpdcRegNumber}
                        onChange={(e) => setKmpdcRegNumber(e.target.value)}
                        placeholder="e.g. KMPDC/2026/F/88921"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        MFL Code (5-Digit)
                      </label>
                      <input
                        type="text"
                        value={mflCode}
                        onChange={(e) => setMflCode(e.target.value)}
                        placeholder="e.g. 12345"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition font-mono"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                      type="button"
                      onClick={handleECitizenVerify}
                      disabled={eCitizenVerifying || !kmpdcRegNumber || !mflCode}
                      className="w-full sm:w-auto bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-4 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer"
                    >
                      {eCitizenVerifying ? "Verifying with KMFL..." : "Verify via e-Citizen Registry"}
                    </button>
                    {eCitizenVerified && (
                      <span className="text-2xs text-green-400 font-extrabold flex items-center gap-1">
                        <CheckCircle size={14} /> Verified via e-Citizen Portal (MOH Kenya)
                      </span>
                    )}
                    {eCitizenError && (
                      <span className="text-2xs text-red-400 font-bold">
                        {eCitizenError}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        KMFL Regulatory Category
                      </label>
                      <select
                        value={regulatoryCategory}
                        onChange={(e) => setRegulatoryCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                      >
                        <option value="Level 2 - Medical Clinic">Level 2 - Medical Clinic</option>
                        <option value="Level 3 - Health Centre">Level 3 - Health Centre</option>
                        <option value="Level 4 - Sub-County Hospital">Level 4 - Sub-County / District Hospital</option>
                        <option value="Level 5 - County Referral Hospital">Level 5 - County Referral Hospital</option>
                        <option value="Level 6 - National Referral Hospital">Level 6 - National Referral Hospital</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        LR Number (Land Reference)
                      </label>
                      <input
                        type="text"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        placeholder="e.g. LR 209/13405"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        County (Kenya)
                      </label>
                      <select
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                      >
                        <option value="Nairobi">Nairobi</option>
                        <option value="Mombasa">Mombasa</option>
                        <option value="Kisumu">Kisumu</option>
                        <option value="Nakuru">Nakuru</option>
                        <option value="Kiambu">Kiambu</option>
                        <option value="Uasin Gishu">Uasin Gishu</option>
                        <option value="Nyeri">Nyeri</option>
                        <option value="Machakos">Machakos</option>
                        <option value="Meru">Meru</option>
                        <option value="Kakamega">Kakamega</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Sub-County / Constituency
                      </label>
                      <input
                        type="text"
                        value={subCounty}
                        onChange={(e) => setSubCounty(e.target.value)}
                        placeholder="e.g. Lang'ata"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-105 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5 pt-4">
                    <Building2 size={14} /> Hospital Identification
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Hospital Name
                      </label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g. St. Luke Referral Hospital"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-555 uppercase tracking-wider mb-1">
                        Hospital Address
                      </label>
                      <input
                        type="text"
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        placeholder="e.g. Avenue Rd, Nairobi, Kenya"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Choose Hospital Logo
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {Object.keys(logoPresets).map((presetKey) => {
                        const preset = logoPresets[presetKey];
                        return (
                          <button
                            key={presetKey}
                            type="button"
                            onClick={() => setLogoOption(presetKey)}
                            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                              logoOption === presetKey
                                ? "border-teal-500 bg-teal-500/5 text-teal-400"
                                : "border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800 hover:text-slate-200"
                            }`}
                          >
                            {preset.icon("w-5 h-5")}
                            <span className="text-[8px] font-bold tracking-wide uppercase truncate max-w-full">
                              {presetKey}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setLogoOption("custom")}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                          logoOption === "custom"
                            ? "border-teal-500 bg-teal-500/5 text-teal-400"
                            : "border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-800"
                        }`}
                      >
                        <Upload size={16} />
                        <span className="text-[8px] font-bold tracking-wide uppercase">
                          Custom Upload
                        </span>
                      </button>
                    </div>

                    {logoOption === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 hover:border-teal-500/50 transition">
                            <div className="flex flex-col items-center justify-center pt-4 pb-3">
                              <Upload
                                size={24}
                                className="mb-2 text-slate-400"
                              />
                              <p className="text-2xs text-slate-400 font-bold uppercase">
                                <span className="text-teal-400">
                                  Click to upload
                                </span>{" "}
                                logo image
                              </p>
                              <p className="text-[8px] text-slate-500 mt-0.5">
                                PNG, JPG or SVG (Auto-compressed)
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                        {customLogoUrl && (
                          <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-lg">
                            <img
                              src={customLogoUrl}
                              alt="Uploaded Logo Preview"
                              className="w-8 h-8 rounded object-cover border border-slate-700"
                            />
                            <div className="truncate flex-1">
                              <span className="text-2xs text-slate-450 block font-bold">
                                Logo Uploaded Successfully
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono block truncate">
                                {customLogoUrl.substring(0, 50)}...
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCustomLogoUrl("")}
                              className="text-[9px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Live Sidebar & Portal Preview (5/12 width) */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={13} className="text-teal-400" /> Live Sidebar
                  Branding Preview
                </h3>

                {/* Glassmorphic Mock Sidebar widget */}
                <div className="bg-slate-950 border border-slate-855 rounded-xl p-5 shadow-inner relative overflow-hidden space-y-6 min-h-[300px] flex flex-col justify-between">
                  <div className="absolute top-1 right-2 text-[8px] text-slate-800 font-bold font-mono tracking-widest uppercase">
                    Eagle Tech HMIS Preview
                  </div>

                  {/* Header Branding Widget */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                      {renderActiveLogo(32, true)}
                      <div className="truncate flex-1">
                        <span className="font-bold tracking-wide text-xs text-white block uppercase truncate">
                          {hospitalName.trim() || "Your Hospital Name"}
                        </span>
                        <span className="text-[8px] text-slate-400 block truncate mt-0.5 leading-none">
                          {hospitalAddress.trim() || "Your Facility Address"}
                        </span>
                        <span className="text-[9px] text-teal-400 font-semibold tracking-wider uppercase block truncate leading-none mt-2">
                          HMIS PORTAL
                        </span>
                      </div>
                    </div>

                    {/* Mock Navigation Menu items */}
                    <div className="space-y-1.5 opacity-60">
                      <div className="w-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs font-bold">
                        <Activity size={12} /> Dashboard View
                      </div>
                      <div className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-550 text-2xs font-bold">
                        <User size={12} /> Patient Register
                      </div>
                      <div className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-555 text-2xs font-bold">
                        <Lock size={12} /> Security Configuration
                      </div>
                    </div>
                  </div>

                  {/* Powered By Eagle Tech Footer */}
                  <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-[9px] text-slate-655 font-bold">
                    <span>Facility Code: {hospitalCode || "MOCK-001"}</span>
                    <span className="text-teal-500/60 uppercase font-mono tracking-wider">
                      Eagle Tech Solutions
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={handlePrevStep}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handleNextStep}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
              >
                Go to Payment Portal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: MOCK CHECKOUT */}
        {!onboardingWarningType && step === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Left Column: Order Summary & Brand Confirmation */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-850 flex items-center gap-1.5">
                Branding & Licensing Summary
              </h3>

              {/* White label preview details */}
              <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  {renderActiveLogo(28, true)}
                  <div className="truncate">
                    <span className="font-bold text-slate-200 block text-xs truncate uppercase">
                      {hospitalName}
                    </span>
                    <span className="text-[9px] text-slate-550 block font-semibold">
                      Custom Portal Layout Activated
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-3 space-y-1.5 text-2xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Parent Outsourced Engine:</span>
                    <span className="font-bold text-slate-300">
                      Eagle Tech Solutions
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operational Licensing Tier:</span>
                    <span className="font-bold text-teal-400">
                      {plans.find((p) => p.id === selectedPlan)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MOH Identifier Code:</span>
                    <span className="font-mono text-teal-500 font-bold">
                      {hospitalCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Facility Address:</span>
                    <span
                      className="font-bold text-slate-300 truncate max-w-[180px]"
                      title={hospitalAddress}
                    >
                      {hospitalAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order total amount card */}
              <div className="bg-teal-500/5 border border-teal-500/10 p-4 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">
                  Subscription Total:
                </span>
                <span className="text-lg font-black text-teal-400">
                  {plans.find((p) => p.id === selectedPlan)?.price}{" "}
                  <span className="text-2xs text-slate-500 font-medium">
                    / month
                  </span>
                </span>
              </div>
            </div>

            {/* Right Column: Simulated checkout form */}
            <div className="bg-slate-950 border border-slate-855 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
                <CreditCard size={14} className="text-teal-400" /> Secure
                Payment portal
              </h3>

              <form onSubmit={handleProvisionPortal} className="space-y-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-550 uppercase tracking-wider mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                    <CreditCard
                      size={14}
                      className="absolute right-3 top-2.5 text-slate-650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold text-slate-555 uppercase tracking-wider mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-slate-555 uppercase tracking-wider mb-1">
                      CVC Code
                    </label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-2 bg-slate-900/60 border border-slate-805 p-2.5 rounded-lg text-[9px] text-slate-500 font-medium">
                  <ShieldCheck
                    size={18}
                    className="text-teal-400 shrink-0 mt-0.5"
                  />
                  <span>
                    Eagle Tech billing processes transactions over TLS. Clicking
                    pay now constructs your database profile and facility
                    credentials immediately.
                  </span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={loading}
                    className="text-xs font-bold text-slate-455 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/20 text-slate-950 font-bold text-xs py-2 px-6 rounded-lg flex items-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
                  >
                    {loading ? "Registering..." : `Pay & Activate Portal`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS */}
        {!onboardingWarningType && step === 5 && (
          <div className="space-y-6 max-w-lg mx-auto text-center py-4">
            <div className="flex justify-center mb-2">
              <div className="bg-teal-500/10 border border-teal-500/25 p-3 rounded-full text-teal-400">
                <CheckCircle2 size={40} className="animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide font-sans">
                Portal Provisioned Successfully!
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Hospital **{hospitalName}** has been registered in Eagle Tech
                HMIS databases. A dedicated operational workspace and your
                Administrator profile are active.
              </p>
            </div>

            {/* Configured details */}
            <div className="bg-slate-955 border border-slate-855 p-5 rounded-xl space-y-3 text-xs text-left max-w-md mx-auto font-sans">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-900">
                {renderActiveLogo(24, true)}
                <span className="font-bold text-slate-100 uppercase">
                  {hospitalName}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-500 font-bold">
                  MOH Facility Code
                </span>
                <span className="font-mono text-teal-400 font-black">
                  {createdFacilityCode}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-bold">
                  Hospital Address
                </span>
                <span className="text-slate-300 font-semibold">
                  {hospitalAddress}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-bold">
                  Admin Login Email
                </span>
                <span className="text-slate-300 font-semibold">
                  {adminEmail}
                </span>
              </div>
              <div className="border-t border-slate-900 pt-3 flex gap-2 text-2xs text-slate-550 leading-relaxed">
                <Check size={14} className="text-teal-400 shrink-0" />
                <span>
                  You can now log in using these credentials to add users, run
                  consultations, and access the MOH daily portal.
                </span>
              </div>
            </div>

            <button
              onClick={handleCancelAndBack}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg shadow-lg active:scale-[0.98] transition w-full max-w-md cursor-pointer font-sans"
            >
              Go to Hospital Login Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
