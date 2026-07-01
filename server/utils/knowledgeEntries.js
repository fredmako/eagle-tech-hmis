const knowledgeEntries = [
  {
    id: "ui-flow-system-entry-auth-tenant-routing",
    title: "UI Flow: System entry, authentication, and tenant routing",
    tags: ["ui-flow", "auth", "tenant", "login", "onboarding"],
    content:
      "Users enter through the public landing page unless already authenticated. Public routes include the marketing landing page, business cards view (#cards), auth callback, facility landing pages via /hospital/:id or facility subdomain, public queue board, and patient portal. Login supports Supabase-backed sign-in, OTP/session restore, role requests, password recovery, and invitation acceptance. If the logged-in user is a patient, the app redirects to /patient-portal. If a URL contains a facility subdomain or /hospital/:facility, the app resolves that facility and logs out users from a different facility context. Special platform users can enter Systems Control Console for super_admin or platform_support workflows.",
  },
  {
    id: "ui-flow-main-shell-navigation",
    title: "UI Flow: Main authenticated shell and navigation behavior",
    tags: ["ui-flow", "navigation", "sidebar", "dashboard", "modules"],
    content:
      "After login, the app opens the authenticated shell with activeTab persisted in localStorage as egesa_active_tab. The shell contains facility branding, sidebar or topbar layout, module search, notification bell, theme toggle, profile/preferences, onboarding tour, and sign out. Main tabs render modules by activeTab: dashboard, reception, consultation, orders, radiology, surgery, pharmacy, pos, billing, reports, patient_dashboard, ward, maternity, mch, admin, procurement, hr, payroll, maintenance, appointments, settings, and support. Facility active_modules can disable modules; disabled modules show a Module Disabled screen and return users to Dashboard. Unknown activeTab values show an in-app 404 with Return to Dashboard.",
  },
  {
    id: "ui-flow-dashboard-patient-journey",
    title: "UI Flow: Dashboard and high-level patient journey",
    tags: ["ui-flow", "dashboard", "patient-flow", "clinical-flow"],
    content:
      "Dashboard is the landing workspace for authenticated facility users and links into clinical and administrative modules. The normal patient journey is Reception Hub -> Registration/New Patient -> auto-checkin and queue routing -> Triage -> OPD Consultation -> Orders/Laboratory/Radiology/Surgery as needed -> Pharmacy dispensing or POS sale -> Cashier/Billing -> Reports/MOH outputs. Dashboard navigation can jump directly into module tabs and pass sub-tabs such as pharmacy dispensing/sell, billing desk/preauth/setup, maternity sections, MCH sections, admin subtabs, and HR subtabs.",
  },
  {
    id: "ui-flow-reception-registration-triage-queue-appointments",
    title: "UI Flow: Reception Hub, registration, triage, queue, and appointments",
    tags: ["ui-flow", "reception", "registration", "triage", "queue", "appointments", "sha"],
    content:
      "Reception Hub has three direct sub-tabs: Registration, Triage, and Queue. Sidebar reception sub-items route to these workspaces or related modules. Registration sub-items include New patient, Update patient, Patient insurance, Patients in wards, SHA registrations, SHA eligibility, and Patient eligibility. Triage sub-items include Triage, Checkin patient, Checkin dependant, and SHA checkins. Queue sub-items include Reprint ticket and Manage queue. Support sub-items Send SMS, Send email, and SMS templates route to Help & Support. Appointment sub-items Patients calendar, Doctors calendar, Schedule appointments, and Appointment reminders route to Appointments. Hospital form shortcuts route Referral and Sick offs to OPD Consultation, Surgeon and Anesthetist to Surgery, and Radiology to Radiology desk.",
  },
  {
    id: "ui-flow-registration-insurance",
    title: "UI Flow: Patient registration and insurance workflow",
    tags: ["ui-flow", "registration", "patients", "insurance", "sha", "queue"],
    content:
      "Patient Registration manages patient creation, updates, insurance, admitted patient lookup, and queue routing. The form can create or edit patient records, search existing patients, fetch/fill simulated SHA details, save insurance provider/card/dependent information, and optionally auto-check in the patient to the queue. Registration captures visit routing details and can direct the patient to triage or queue. Patient lists support search by name, email, phone, or IP/OP number. Patients in wards view admitted patients and allows insurance management or moving an admitted patient back to queue.",
  },
  {
    id: "ui-flow-triage-consultation-handoff",
    title: "UI Flow: Triage and consultation handoff",
    tags: ["ui-flow", "triage", "vitals", "consultation", "etat", "clinical"],
    content:
      "Triage shows a queue of patients awaiting triage. A clinician selects a visit, records vitals and clinical assessment, uses ETAT+/ABC/AVPU emergency checklist where applicable, sets queue priority, records chief complaint, saves triage, prints a triage vitals card, and moves the patient to consultation. The triage module stores drafts and reloads the queue after save. Consultation is the OPD clinician workspace for diagnosis, notes, AI diagnosis/report support, orders, referral/sick-off flows, and completion back to dashboard or the next service point.",
  },
  {
    id: "ui-flow-lab-radiology-surgery-orders",
    title: "UI Flow: Laboratory, radiology, surgery, and orders",
    tags: ["ui-flow", "orders", "laboratory", "radiology", "surgery", "clinical"],
    content:
      "Clinical specialty navigation includes Laboratory desk (orders), Radiology desk, and Surgery desk. Orders is the laboratory workflow for lab requests, host/query style logs, acknowledgement responses, lab processing, and status handling. Radiology handles radiology queue and imaging workflow. Surgery handles surgical queue/workspace and is also reached from reception shortcuts such as Surgeon and Anesthetist. These modules are downstream from consultation and can feed billing, reporting, and audit records.",
  },
  {
    id: "ui-flow-pharmacy-pos",
    title: "UI Flow: Pharmacy desk and POS sales",
    tags: ["ui-flow", "pharmacy", "pos", "dispensing", "inventory", "sales"],
    content:
      "Pharmacy has sub-tabs Dispense queue, Sell drug(s), Modify sale, and Paid drugs. Dispense queue handles prescribed medicines awaiting pharmacy action. Sell drug(s) opens the POS sales console for selecting medications, custom drug names, batch/lot, quantity, discounts, transaction type, payment option, narration/reference, suspended carts, and cash sale or patient-linked sale. Modify sale supports sale adjustment. Paid drugs shows billing logs and completed drug sales. The separate POS main tab opens Pharmacy with initialSubTab='sell'. Pharmacy also supports medication inventory concepts such as stock, expiry, unit of measure, reorder alerts, and printed directions labels.",
  },
  {
    id: "ui-flow-billing-payments-preauth",
    title: "UI Flow: Cashier, billing, insurance, pre-auth, and payments",
    tags: ["ui-flow", "billing", "cashier", "payments", "insurance", "preauth", "sha"],
    content:
      "Billing has sub-tabs Billing desk, Pre-auth claims, and Billing setup. Billing desk selects a patient/invoice, displays invoice details and fee summary, supports ad-hoc/custom service charges, primary payment option, Tuma Pay mobile number, cash amount received, insurance authorization and co-pay split, insurance provider/member ID/pre-auth code/coverage, patient co-pay, co-pay method, and reversal reason/audit notes. Pre-auth claims records patient, insurance provider, member ID, pre-auth code, approved limit, mock letter upload, diagnosis/notes, and claim status. Billing setup manages billable services, categories, and prices. Billing integrates with M-Pesa/Tuma Pay, pharmacy/POS, SHA claims, and financial reporting.",
  },
  {
    id: "ui-flow-ward-maternity-mch",
    title: "UI Flow: Ward, maternity, and MCH modules",
    tags: ["ui-flow", "ward", "inpatient", "maternity", "mch", "anc", "family-planning"],
    content:
      "Ward handles inpatient ward operations, admissions context, bed status, ward care records/observations, caretakers, visitor logs, discharge workflows, and inpatient bed-status API integration. Maternity module sub-tabs are Maternity dashboard, Blocks setup, Wards setup, Bed classifications, Beds setup, Patient register, Treatment queue, Maternal drugs, and Outcome stats. MCH Clinic sub-tabs are MCH dashboard, Antenatal care, Family planning, Child welfare, and MCH reports. Maternity access is limited to admins or maternity department users; MCH access is limited to admins or MCH/ANC/antenatal department users.",
  },
  {
    id: "ui-flow-reports-moh-dhis2-ai",
    title: "UI Flow: Reports, MOH compliance, DHIS2-ready outputs, and AI reports",
    tags: ["ui-flow", "reports", "moh", "dhis2", "compliance", "ai-report"],
    content:
      "Reports has four tabs: Operational Dashboard, Department Reports, Compliance & MOH, and Custom Report Builder. Department report types include registration daily, clinical encounter, lab order/results, pharmacy prescription/dispense/revenue/stock, billing receipts, ward admissions, and audit logs. Compliance/MOH outputs include MOH 204A Under 5, MOH 204B Over 5, MOH 405 ANC, MOH 512 FP, MOH 240 Lab, MOH 705A, MOH 705B, Kenyan MOH Daily Patient Register, and MOH Monthly Aggregate Submission Report/MOH 717. Reports support data quality checks, MOH consent audit overrides, printable/exportable summaries, custom columns, facility branding/outsource branding, and AI report generation via backend /ai-report.",
  },
  {
    id: "ui-flow-admin-settings-configuration",
    title: "UI Flow: Facility admin settings and configuration",
    tags: ["ui-flow", "admin", "configuration", "modules", "forms", "domains", "payments"],
    content:
      "Admin Settings uses activeSubTab persisted as egesa_active_admin_subtab. Admin subtabs include Overview, Modules Config, Dynamic Forms, Department Activation, Laboratory Services, Audit logs, Email logs, SMTP settings, Licensing & Billing, Facility profile, Help desk, AfyaLink HIE Integration, Domain & Branding, Ward & Bed Settings, Payment & Landing Config, and Alerts & Broadcasts. Admin-only areas include Modules Config, Dynamic Forms, and delegation-like controls; other subtabs can be delegated by facility admin settings. Domain & Branding manages subdomain prefix, optional custom domain, DNS verification, and email/domain branding. AfyaLink HIE handles SHA/DHA claims with patient/visit/invoice/member/claim reference and document URLs for claim form, diagnosis report, invoice, and discharge summary.",
  },
  {
    id: "ui-flow-hr-payroll-procurement-maintenance",
    title: "UI Flow: Human resources, payroll, procurement, and maintenance",
    tags: ["ui-flow", "hr", "payroll", "procurement", "maintenance", "operations"],
    content:
      "Management department navigation includes Human resources, Payroll console, Procurement desk, and Assets maintenance. HR subtabs include Staff directory, Duty roster, Staff on-boarding, Role requests, and Access delegation settings. Payroll manages payroll records and employee payment workflows. Procurement desk manages suppliers, purchase orders, purchase order items, store requisitions, stock receipts, stock receipt items, and AI procurement report support. Assets maintenance manages facility assets and maintenance operations. These management modules are separate from clinical flow but feed operational oversight and auditability.",
  },
  {
    id: "ui-flow-super-admin-systems-control",
    title: "UI Flow: Super Admin Systems Control Console",
    tags: ["ui-flow", "super-admin", "platform-support", "systems-control", "knowledge-base"],
    content:
      "Systems Control Console is available to super_admin/platform_support users. Tabs include Registry, Audit, Requests, Support, Demo, Insights, and Knowledge. Registry manages facilities/verification/locks and facility status. Audit shows platform audit logs. Requests handles role/access requests. Support manages support tickets, replies, and resolution emails. Demo manages demo requests. Insights shows client operations analytics including health score, visits, orders, invoices, support, receivables, triage compliance, lab verification, digital payments, risk labels, client trends, lowest-health clients, tier verification mix, and diagnostic recommendations. Knowledge opens KnowledgeBasePanel for adding and reviewing AI knowledge entries used by EagleBot.",
  },
  {
    id: "ui-flow-preferences-notifications-support-onboarding",
    title: "UI Flow: Preferences, notifications, support, and onboarding help",
    tags: ["ui-flow", "preferences", "notifications", "support", "onboarding", "accessibility"],
    content:
      "Manage Profile/Preferences controls theme color, light/dark mode, menu layout, language, font, brightness, night vision, and user profile context. NotificationBell provides contextual alerts and can navigate into modules. OnboardingTour appears for first-time users and can be reopened from the shell. Help & Support opens SupportPanel for user support workflows and can receive routed actions from reception support shortcuts such as Send SMS, Send email, and SMS templates. The system uses toast/modal confirmations for success and error feedback across clinical and admin modules.",
  },
  {
    id: "ui-flow-public-patient-facing-views",
    title: "UI Flow: Public facility pages and patient-facing views",
    tags: ["ui-flow", "public", "patient-portal", "facility-page", "queue-board"],
    content:
      "Public/patient-facing views include the marketing landing page, facility landing page for a subdomain or /hospital/:facility route, public queue board, business cards page, auth callback, and patient portal. Patient users are redirected to /patient-portal after login. Facility landing pages depend on subdomain or path facility resolution and show facility-specific context. QueueBoardPublic is for public queue display. Business cards are shown via #cards. These public views sit outside the authenticated facility shell except for patient portal, which uses patient role routing.",
  },
];

module.exports = { knowledgeEntries };
