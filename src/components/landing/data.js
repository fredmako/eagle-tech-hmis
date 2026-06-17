import {
  Heart, Stethoscope, FlaskConical, Pill, DollarSign, FileSpreadsheet, Bed,
  Globe, Server, Coins, Activity, Shield, Zap, TrendingUp, Lock, Users,
} from 'lucide-react';

export const PHOTO_HERO =
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&h=1000&fit=crop&auto=format';
export const PHOTO_ABOUT =
  'https://images.unsplash.com/photo-1584516150909-c43483ee7932?w=900&h=700&fit=crop&auto=format';
export const PHOTO_ABOUT_SECONDARY =
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&h=400&fit=crop&auto=format';
export const PHOTO_PRICING_BAND =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1800&h=600&fit=crop&auto=format';

export const services = [
  { icon: Heart, title: 'Triage & Vital Signs', desc: 'Real-time logger for blood pressure, temperature, heart rate, and weight with automated BMI computation.', tag: 'Clinical', photo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=300&h=300&fit=crop&auto=format' },
  { icon: Stethoscope, title: 'OPD Consultation Desk', desc: 'Integrated SOAP clinical notes, drug prescriptions, and direct ICD-10 diagnostic coding search.', tag: 'Clinical', photo: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=300&h=300&fit=crop&auto=format' },
  { icon: FlaskConical, title: 'Laboratory Management', desc: 'Automated order placement, test record workflows, result verification, and digital receipt delivery.', tag: 'Diagnostics', photo: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=300&h=300&fit=crop&auto=format' },
  { icon: Pill, title: 'Pharmacy Stock Control', desc: 'Real-time stock decrementing on dispensing, low-level warning notifications, and inventory tracking.', tag: 'Operations', photo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop&auto=format' },
  { icon: DollarSign, title: 'Cashier & Billing Desk', desc: 'Flexible invoices, instant payment receipts, and automated payment status mapping.', tag: 'Finance', photo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=300&fit=crop&auto=format' },
  { icon: Bed, title: 'Inpatient Ward Operations', desc: 'Interactive bed allocation maps, vital signs monitoring logs, and discharge tracking.', tag: 'Inpatient', photo: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=300&h=300&fit=crop&auto=format' },
  { icon: FileSpreadsheet, title: 'MOH Daily Reporting', desc: 'Auto-compiled Ministry of Health registers (including MOH 717) with one-click data sheet export.', tag: 'Compliance', photo: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300&h=300&fit=crop&auto=format' },
];

export const stats = [
  { value: 1, suffix: '+', decimals: 0, label: 'Live Deployment', icon: Activity },
  { value: 7, suffix: '', decimals: 0, label: 'Clinical Modules', icon: Zap },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Uptime SLA', icon: TrendingUp },
  { value: null, suffix: '', decimals: 0, label: 'Compliant Reports', icon: Shield, text: 'MOH' },
];

export const budgetItems = [
  { icon: Globe, title: 'Custom Domain Setup', cost: 'Ksh 1,500', period: '/ year', desc: 'Registration of your custom web address (e.g. portal.yourhospital.com) with global DNS routing.', highlight: false },
  { icon: Server, title: 'Database & Server Infrastructure', cost: 'Ksh 2,900', period: '/ month', desc: 'Secure cloud hosting via dedicated Appwrite instances with automated daily backups and SSL certificates.', highlight: true },
  { icon: Coins, title: 'White-Label Branding', cost: 'Ksh 4,900', period: 'one-off', desc: 'Complete system styling: upload your logo, define custom dashboard templates, and configure roles.', highlight: false },
];

export const onboardingSteps = [
  'Submit hospital name & domain requirements',
  'Upload logo branding and configure staff roles',
  'Select Standard or Enterprise licensing',
  'Process setup fee & provision cloud database',
  'Lock workspace and launch live portal',
];

export const trustBadges = [
  { icon: Shield, label: 'MOH Compliant', sub: 'Reg. & reporting ready' },
  { icon: Lock, label: 'Encrypted at Rest', sub: 'AES-256 cloud storage' },
  { icon: Users, label: 'Multi-Role Access', sub: 'Staff permission tiers' },
  { icon: Zap, label: 'Same-Day Setup', sub: 'Portal live in 24 hrs' },
];
