import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { 
  Building2, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Clock, 
  Lock, 
  Unlock,
  AlertCircle,
  MessageSquare,
  Mail,
  Send,
  User,
  TrendingUp,
  CreditCard,
  Layers,
  Sparkles,
  Phone,
  ExternalLink,
  Search,
  ArrowUpDown,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import KnowledgeBasePanel from './admin/KnowledgeBasePanel';

const HEALTH_COLORS = {
  strong: '#2dd4bf',
  watch: '#38bdf8',
  warning: '#fb923c',
  critical: '#ef4444'
};

const getUrlOperationsState = () => {
  if (typeof window === 'undefined') {
    return {
      range: '30d',
      metric: 'health',
      tier: 'all',
      status: 'all',
      sort: 'risk_desc',
      search: '',
      facility: ''
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    range: params.get('range') || '30d',
    metric: params.get('metric') || 'health',
    tier: params.get('tier') || 'all',
    status: params.get('status') || 'all',
    sort: params.get('sort') || 'risk_desc',
    search: params.get('q') || '',
    facility: params.get('facility') || ''
  };
};

const parseAmount = (value) => Number.parseFloat(value || 0) || 0;
const normalizeTier = (tier) => tier || 'basic';
const isWithinDays = (dateValue, days) => {
  if (!dateValue) return false;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
};

const getHealthTone = (score) => {
  if (score < 45) return 'critical';
  if (score < 65) return 'warning';
  if (score < 80) return 'watch';
  return 'strong';
};

const getRiskLabel = (row) => {
  if (!row.verified) return 'Verification lock';
  if (row.openSupport > 0) return 'Support backlog';
  if (row.pendingReceivables > 0) return 'Receivables delay';
  if (row.labVerificationRate < 50 && row.labOrders > 0) return 'Lab sign-off';
  if (row.triageComplianceRate < 60 && row.consultVisits > 0) return 'Triage bypass';
  if (row.digitalPaymentRate < 25 && row.paidInvoices > 0) return 'Low digital pay';
  return 'Stable operations';
};

const makeSparklinePoints = (items, days) => {
  const bucketCount = days <= 7 ? 7 : 6;
  const bucketSize = Math.ceil(days / bucketCount);
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = days - bucketSize * (bucketCount - index);
    const end = days - bucketSize * (bucketCount - index - 1);
    const count = items.filter((item) => {
      if (!item.created_at) return false;
      const age = (Date.now() - new Date(item.created_at).getTime()) / (24 * 60 * 60 * 1000);
      return age >= Math.max(0, start) && age < end;
    }).length;
    return { label: `${Math.max(0, start)}-${end}d`, visits: count };
  });
};

const buildClientOperationsRows = ({ facilities, supportTickets, systemStats, rangeDays }) => {
  return facilities.map((facility) => {
    const facilityId = facility.id;
    const visits = systemStats.visits.filter((v) => v.facility_id === facilityId && isWithinDays(v.created_at, rangeDays));
    const allVisits = systemStats.visits.filter((v) => v.facility_id === facilityId);
    const orders = systemStats.orders.filter((o) => o.facility_id === facilityId && isWithinDays(o.created_at, rangeDays));
    const invoices = systemStats.invoices.filter((i) => i.facility_id === facilityId && isWithinDays(i.created_at, rangeDays));
    const profiles = systemStats.profiles.filter((p) => p.facility_id === facilityId);
    const tickets = supportTickets.filter((t) => t.facility_id === facilityId);
    const consultVisits = visits.filter((v) => v.department?.toLowerCase().includes('consult')).length;
    const triageVisits = visits.filter((v) => v.department?.toLowerCase() === 'triage').length;
    const labOrders = orders.filter((o) => o.type?.toLowerCase() === 'lab' || o.type?.toLowerCase() === 'laboratory');
    const verifiedLabOrders = labOrders.filter((o) => ['authorized', 'verified', 'completed'].includes(o.status));
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const digitalPayments = paidInvoices.filter((i) => ['mpesa', 'stk', 'paypal', 'card'].includes(i.payment_method?.toLowerCase()));
    const pendingOrders = orders.filter((o) => !['completed', 'dispensed', 'verified', 'authorized'].includes(o.status)).length;
    const pendingReceivables = invoices
      .filter((i) => i.status === 'unpaid' || i.status === 'partially_paid')
      .reduce((sum, invoice) => sum + Math.max(0, parseAmount(invoice.total_amount) - parseAmount(invoice.amount_paid)), 0);
    const settledRevenue = paidInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount_paid), 0);
    const openSupport = tickets.filter((t) => t.status === 'pending').length;
    const triageComplianceRate = consultVisits > 0 ? Math.min(100, Math.round((triageVisits / consultVisits) * 100)) : 100;
    const labVerificationRate = labOrders.length > 0 ? Math.round((verifiedLabOrders.length / labOrders.length) * 100) : 100;
    const digitalPaymentRate = paidInvoices.length > 0 ? Math.round((digitalPayments.length / paidInvoices.length) * 100) : 100;
    const receivablePenalty = pendingReceivables > 0 ? Math.min(20, Math.log10(pendingReceivables + 1) * 4) : 0;
    const healthScore = Math.max(0, Math.round(
      100
      - (facility.is_verified ? 0 : 25)
      - Math.min(24, openSupport * 8)
      - Math.min(18, pendingOrders * 3)
      - receivablePenalty
      - Math.max(0, (70 - triageComplianceRate) * 0.25)
      - Math.max(0, (70 - labVerificationRate) * 0.25)
      - Math.max(0, (40 - digitalPaymentRate) * 0.2)
    ));

    const row = {
      facilityId,
      facilityName: facility.name,
      code: facility.code,
      licenseTier: normalizeTier(facility.license_tier),
      verified: Boolean(facility.is_verified),
      createdAt: facility.created_at,
      visits: visits.length,
      lifetimeVisits: allVisits.length,
      orders: orders.length,
      pendingOrders,
      invoices: invoices.length,
      paidInvoices: paidInvoices.length,
      pendingReceivables,
      settledRevenue,
      openSupport,
      staff: profiles.length,
      triageComplianceRate,
      labVerificationRate,
      labOrders: labOrders.length,
      digitalPaymentRate,
      healthScore,
      trend: makeSparklinePoints(visits, rangeDays)
    };

    return {
      ...row,
      healthTone: getHealthTone(healthScore),
      topRisk: getRiskLabel(row)
    };
  });
};

export default function SuperAdminDashboard({ user, onSignOut, onLogoClick }) {
  const { setUser } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores facilityId or request ID during action
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'registry';
    return new URLSearchParams(window.location.search).get('tab') || 'registry';
  }); // 'registry' | 'audit' | 'requests' | 'support' | 'demo' | 'insights' | 'knowledge'
  const [supportTickets, setSupportTickets] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [supportFilter, setSupportFilter] = useState('all');
  const [supportSearch, setSupportSearch] = useState('');
  const [systemStats, setSystemStats] = useState({
    profiles: [],
    patients: [],
    visits: [],
    orders: [],
    invoices: []
  });
  const [operationsState, setOperationsState] = useState(getUrlOperationsState);

  const handleResolveSupportTicket = async (ticketId) => {
    if (!responseText.trim()) return;
    setReplyLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const ticket = supportTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/db/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'support_tickets',
          column: 'id',
          value: ticketId,
          values: {
            status: 'addressed',
            response: responseText.trim()
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resolve support ticket.');
      }

      // Send email notification of the reply
      try {
        await fetch(`${apiBase}/email/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ticket.user_email,
            subject: `Support Ticket Addressed: [#${ticket.id.substring(7, 13)}] - ${ticket.subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0d9488; margin-top: 0;">Support Ticket Reply</h2>
                <p>Hello <strong>${ticket.user_name}</strong>,</p>
                <p>Our platform administration team has addressed your support request (Reference: <strong>#${ticket.id.substring(7, 13)}</strong>).</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #475569; margin: 20px 0; border-radius: 4px;">
                  <strong>Your Ticket Message:</strong><br/>
                  <p style="color: #475569; font-style: italic; margin-top: 5px;">"${ticket.message}"</p>
                </div>

                <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px;">
                  <strong>Administrator Response:</strong><br/>
                  <p style="color: #166534; font-weight: bold; margin-top: 5px;">"${responseText.trim()}"</p>
                </div>

                <p>If you have any further questions, please do not hesitate to contact us again.</p>
                <p>Thank you,</p>
                <p><strong>Eagle Tech HMIS Systems</strong></p>
                <p style="color: #64748b; font-size: 11px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
                  This is an automated platform alert. Please do not reply directly to this notification.
                </p>
              </div>
            `
          })
        });
      } catch (mailErr) {
        console.warn('[Support Reply Email] Notification skipped/failed:', mailErr);
      }

      setResponseText('');
      setSelectedTicketId(null);
      setSupportTickets(prev => prev.map(t => (
        t.id === ticketId
          ? { ...t, status: 'addressed', response: responseText.trim() }
          : t
      )));
      setMessage({ type: 'success', text: `Support ticket #${ticketId.substring(7, 13)} resolved and response sent successfully!` });
    } catch (err) {
      console.error('Resolve ticket failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to resolve support ticket.' });
    } finally {
      setReplyLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const rangeDays = operationsState.range === '7d' ? 7 : operationsState.range === '90d' ? 90 : 30;

  const clientOperationsRows = useMemo(() => buildClientOperationsRows({
    facilities,
    supportTickets,
    systemStats,
    rangeDays
  }), [facilities, supportTickets, systemStats, rangeDays]);

  const filteredClientOperationsRows = useMemo(() => {
    const query = operationsState.search.trim().toLowerCase();
    return clientOperationsRows
      .filter((row) => operationsState.tier === 'all' || row.licenseTier === operationsState.tier)
      .filter((row) => {
        if (operationsState.status === 'all') return true;
        if (operationsState.status === 'verified') return row.verified;
        if (operationsState.status === 'locked') return !row.verified;
        if (operationsState.status === 'risk') return row.healthScore < 65 || row.openSupport > 0;
        return true;
      })
      .filter((row) => !query || row.facilityName.toLowerCase().includes(query) || row.code?.toLowerCase().includes(query))
      .sort((a, b) => {
        if (operationsState.sort === 'revenue_desc') return b.settledRevenue - a.settledRevenue;
        if (operationsState.sort === 'visits_desc') return b.visits - a.visits;
        if (operationsState.sort === 'support_desc') return b.openSupport - a.openSupport;
        if (operationsState.sort === 'name_asc') return a.facilityName.localeCompare(b.facilityName);
        return a.healthScore - b.healthScore;
      });
  }, [clientOperationsRows, operationsState]);

  const selectedOperationsRow = useMemo(() => (
    clientOperationsRows.find((row) => row.facilityId === operationsState.facility)
    || filteredClientOperationsRows[0]
    || null
  ), [clientOperationsRows, filteredClientOperationsRows, operationsState.facility]);

  const tierVerificationChart = useMemo(() => {
    const tiers = ['basic', 'standard', 'extensive'];
    return tiers.map((tier) => {
      const rows = clientOperationsRows.filter((row) => row.licenseTier === tier);
      return {
        tier: tier === 'extensive' ? 'elite' : tier,
        verified: rows.filter((row) => row.verified).length,
        locked: rows.filter((row) => !row.verified).length
      };
    });
  }, [clientOperationsRows]);

  const riskChartData = useMemo(() => (
    [...clientOperationsRows]
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 8)
      .map((row) => ({
        name: row.facilityName?.length > 18 ? `${row.facilityName.slice(0, 18)}...` : row.facilityName,
        score: row.healthScore,
        tone: row.healthTone
      }))
  ), [clientOperationsRows]);

  const operationsSummary = useMemo(() => ({
    atRisk: clientOperationsRows.filter((row) => row.healthScore < 65 || row.openSupport > 0).length,
    openSupport: clientOperationsRows.reduce((sum, row) => sum + row.openSupport, 0),
    pendingReceivables: clientOperationsRows.reduce((sum, row) => sum + row.pendingReceivables, 0),
    settledRevenue: clientOperationsRows.reduce((sum, row) => sum + row.settledRevenue, 0)
  }), [clientOperationsRows]);

  const updateOperationsState = (updates) => {
    setOperationsState((prev) => ({ ...prev, ...updates }));
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (activeTab === 'insights') {
      params.set('range', operationsState.range);
      params.set('metric', operationsState.metric);
      params.set('tier', operationsState.tier);
      params.set('status', operationsState.status);
      params.set('sort', operationsState.sort);
      if (operationsState.search) params.set('q', operationsState.search);
      else params.delete('q');
      if (operationsState.facility) params.set('facility', operationsState.facility);
      else params.delete('facility');
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [activeTab, operationsState]);

  async function fetchSuperAdminData() {
    setLoading(true);
    try {
      // Fetch all facilities
      const { data: facs, error: facErr } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (facErr) throw facErr;
      setFacilities(facs || []);

      // Fetch global audit logs
      const { data: logs, error: logErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (logErr) throw logErr;
      setAuditLogs(logs || []);

      // Fetch all support tickets
      const { data: tickets, error: ticketErr } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketErr) throw ticketErr;
      setSupportTickets(tickets || []);

      // Fetch demo requests
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      let demoList = [];
      try {
        const res = await fetch(`${apiBase}/demo/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const resData = await res.json();
          demoList = resData.data || [];
        }
      } catch (err) {
        console.error('Failed to load demo requests:', err);
      }
      setDemoRequests(demoList);

      // Fetch all platform users (profiles)
      setLoadingUsers(true);
      try {
        const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, email, role, facility_id, access_status, created_at');
        setUsers(allProfiles || []);
      } catch (userErr) {
        console.error('Failed to load users:', userErr);
      } finally {
        setLoadingUsers(false);
      }
      // Fetch all platform users (profiles)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, facility_id, access_status, created_at')
        .order('created_at', { ascending: false });

      if (allProfiles) {
        setPlatformUsers(allProfiles);
      }

      // Fetch platform usage statistics
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: patients } = await supabase.from('patients').select('*');
      const { data: visits } = await supabase.from('visits').select('*');
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: invoices } = await supabase.from('invoices').select('*');

      setSystemStats({
        profiles: profiles || [],
        patients: patients || [],
        visits: visits || [],
        orders: orders || [],
        invoices: invoices || []
      });

    } catch (err) {
      console.error('[SuperAdminDashboard] Error loading data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load system control records.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleUpdateDemoStatus = async (id, newStatus) => {
    setActionLoading(id);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('egesa_health_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiBase}/demo/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status.');
      }

      setDemoRequests(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      setMessage({ type: 'success', text: `Demo prospect status updated to ${newStatus} successfully!` });
    } catch (err) {
      console.error('Failed to update demo status:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    } finally {
      setActionLoading(null);
    }
  };

  const getDiagnosticRecommendations = () => {
    const recs = [];
    
    // Rule 1: Triage vs Consultation ratio (are doctors bypassing triage?)
    const triageCount = systemStats.visits.filter(v => v.department?.toLowerCase() === 'triage').length;
    const consultCount = systemStats.visits.filter(v => v.department?.toLowerCase().includes('consult')).length;
    if (consultCount > 0 && triageCount / consultCount < 0.5) {
      recs.push({
        id: 'triage_bypass',
        title: 'High Triage Bypass Pattern Detected',
        severity: 'warning',
        description: 'Fewer triage records than clinical consultation logs are registered. Facilities may be bypassing nurse vitals. Suggest sending a recommendation to enforce triage entry before consultation routing.',
        action: 'Notify Facility Admins'
      });
    }

    // Rule 2: Automatic lab pathology verification
    const labOrders = systemStats.orders.filter(o => o.type?.toLowerCase() === 'lab' || o.type?.toLowerCase() === 'laboratory');
    const pathVerified = labOrders.filter(o => o.status === 'authorized' || o.status === 'verified').length;
    if (labOrders.length > 5 && pathVerified / labOrders.length < 0.4) {
      recs.push({
        id: 'lab_pathology_pending',
        title: 'Laboratory Pathologist Backlog Alert',
        severity: 'danger',
        description: 'More than 60% of laboratory test runs remain in "technician draft" state without Pathologist authorization sign-off. Recommend contacting facility admins to verify pathology delegation roles.',
        action: 'Review Lab Staff Roles'
      });
    }

    // Rule 3: Subdomain & White-Label Setup
    const standardOrElite = facilities.filter(f => f.license_tier === 'standard' || f.license_tier === 'extensive');
    const unconfiguredSubdomains = standardOrElite.filter(f => !f.code || f.code.includes('EMC')); 
    if (unconfiguredSubdomains.length > 0) {
      recs.push({
        id: 'dns_unconfigured',
        title: 'Pending White-Label Subdomain Setups',
        severity: 'info',
        description: `${unconfiguredSubdomains.length} premium client facilities have not finalized custom DNS subdomain mappings. Suggest emailing configuration templates to facility IT leads.`,
        action: 'Send DNS Guide'
      });
    }

    // Rule 4: STK Push Payment volume vs Cash
    const mobilePayments = systemStats.invoices.filter(i => i.payment_method?.toLowerCase() === 'mpesa' || i.payment_method?.toLowerCase() === 'stk').length;
    const totalInvPaid = systemStats.invoices.filter(i => i.status === 'paid').length;
    if (totalInvPaid > 0 && mobilePayments / totalInvPaid < 0.2) {
      recs.push({
        id: 'stk_promotion',
        title: 'Low Digital Payment Adoption Rate',
        severity: 'info',
        description: 'Cash accounts for over 80% of settled patient checkout invoices. Recommend promoting mobile payment integrations (M-Pesa STK Push / PayPal checkout portals) to reduce clinic cashier overhead.',
        action: 'Suggest Payment Promo'
      });
    }

    // Default fallback recommendation
    if (recs.length === 0) {
      recs.push({
        id: 'all_good',
        title: 'All Operations Standardized',
        severity: 'success',
        description: 'All system metrics (triage compliance, billing cycles, pathologist verifications, and custom subdomains) fall within optimal parameters.',
        action: 'System Healthy'
      });
    }

    return recs;
  };

  const handleToggleVerification = async (facilityId, currentStatus) => {
    setActionLoading(facilityId);
    setMessage({ type: '', text: '' });
    const newStatus = !currentStatus;

    try {
      // 1. Update facility status
      const { error: updateErr } = await supabase
        .from('facilities')
        .update({ is_verified: newStatus })
        .eq('id', facilityId);

      if (updateErr) throw updateErr;

      // 2. Insert audit log
      const details = newStatus 
        ? `Verified facility registration for ID ${facilityId}.`
        : `Suspended/Deactivated facility registration for ID ${facilityId}.`;
      
      await supabase.from('audit_logs').insert({
        facility_id: facilityId,
        user_id: user.id,
        action: newStatus ? 'Facility Verified' : 'Facility Suspended',
        details
      });

      // Update state locally
      setFacilities(prev => prev.map(f => f.id === facilityId ? { ...f, is_verified: newStatus } : f));
      setMessage({ 
        type: 'success', 
        text: `Facility status successfully updated to ${newStatus ? 'VERIFIED (Unlocked)' : 'SUSPENDED (Locked)'}!` 
      });

      // Refresh audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (logs) setAuditLogs(logs);

    } catch (err) {
      console.error('[SuperAdminDashboard] Action failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update facility verification.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccessPortal = () => {
    const targetFacility = facilities.find(f => f.id === 'f1') || facilities[0];
    if (!targetFacility) {
      alert("No facilities onboarded yet to access.");
      return;
    }
    const updatedUser = {
      ...user,
      role: 'admin',
      facility_id: targetFacility.id,
      facility_name: targetFacility.name,
      facility_logo: targetFacility.logo_url,
      facility_is_verified: true
    };
    setUser(updatedUser);
    sessionStorage.setItem('egesa_health_active_user', JSON.stringify(updatedUser));
  };

  // Role requests approved/rejected directly by facility administrators

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuperAdminData();
  };

  // Calculate stats
  const totalFacilities = facilities.length;
  const verifiedCount = facilities.filter(f => f.is_verified).length;
  const pendingCount = totalFacilities - verifiedCount;

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans">
      {/* Super Admin Top Control Bar */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-700/50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl backdrop-blur-sm">
        <div onClick={onLogoClick} className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all duration-300 group">
          <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 p-2 rounded-2xl shadow-lg shadow-teal-500/10 group-hover:shadow-teal-500/20 transition-all duration-300">
            <img src="/logo.png" alt="Eagle Tech Logo" className="w-10 h-10 object-contain filter brightness-110" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white uppercase leading-tight">Eagle Tech Systems Control</h1>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest block mt-0.5 bg-teal-500/10 px-2 py-0.5 rounded-full inline-block">Super Admin Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAccessPortal}
            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <Building2 size={12} />
            <span>Access Egesa Clinic Portal</span>
          </button>

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Console</span>
          </button>
          
          <div className="h-6 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-teal-500/10 border border-teal-500/25 flex items-center justify-center font-bold text-teal-400 text-xs shadow-inner">
              SA
            </div>
            <div className="text-left leading-none hidden sm:block">
              <span className="text-xs font-bold text-slate-200 block">{user.full_name}</span>
              <span className="text-[9px] text-teal-500 font-semibold uppercase tracking-wider block mt-0.5">SUPER ADMIN</span>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="border border-slate-800 hover:border-red-500/25 bg-slate-900/50 hover:bg-red-500/5 hover:text-red-400 p-2 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Verification Status Alerts */}
        {message.text && (
          <div className={`p-4 rounded-xl text-xs flex gap-3 ${
            message.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wider">{message.type === 'success' ? 'Operation Success' : 'Error Alert'}</span>
              <p className="text-slate-300 font-semibold">{message.text}</p>
            </div>
          </div>
        )}

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <button 
            onClick={() => switchTab('registry')}
            className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md transition cursor-pointer hover:bg-slate-850 hover:border-slate-700/80 active:scale-[0.98] w-full text-left"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered Facilities</span>
              <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{totalFacilities}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Building2 size={24} />
            </div>
          </button>

          <button 
            onClick={() => switchTab('registry')}
            className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md transition cursor-pointer hover:bg-slate-850 hover:border-slate-700/80 active:scale-[0.98] w-full text-left"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Verified Facilities</span>
              <h3 className="text-2xl font-black text-teal-400 mt-1.5 font-mono">{verifiedCount}</h3>
            </div>
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
          </button>

          <button 
            onClick={() => switchTab('registry')}
            className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md transition cursor-pointer hover:bg-slate-850 hover:border-slate-700/80 active:scale-[0.98] w-full text-left"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Verification Review</span>
              <h3 className={`text-2xl font-black mt-1.5 font-mono ${pendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>{pendingCount}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${pendingCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              <Clock size={24} />
            </div>
          </button>

          <button 
            onClick={() => switchTab('support')}
            className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-md transition cursor-pointer hover:bg-slate-850 hover:border-slate-700/80 active:scale-[0.98] w-full text-left"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unaddressed Support Queries</span>
              <h3 className={`text-2xl font-black mt-1.5 font-mono ${supportTickets.filter(t => t.status === 'pending').length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>{supportTickets.filter(t => t.status === 'pending').length}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${supportTickets.filter(t => t.status === 'pending').length > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-455' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              <AlertCircle size={24} />
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-850">
          <button
            onClick={() => switchTab('registry')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'registry' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Facility Onboarding Registry
          </button>
          <button
            onClick={() => switchTab('audit')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'audit' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Security Audit Trail
          </button>
          <button
            onClick={() => switchTab('users')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'users' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Platform Users
          </button>
          <button
            onClick={() => switchTab('support')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'support' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Support Queries</span>
            {supportTickets.filter(t => t.status === 'pending').length > 0 && (
              <span className="bg-amber-500/20 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25 animate-pulse">
                {supportTickets.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => switchTab('demo')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'demo' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Demo Prospects</span>
            {demoRequests.filter(d => d.status === 'pending').length > 0 && (
              <span className="bg-teal-500/20 text-[10px] text-teal-400 font-bold px-1.5 py-0.5 rounded-full border border-teal-500/25 animate-pulse">
                {demoRequests.filter(d => d.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab('knowledge')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'knowledge' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag size={12} className={activeTab === 'knowledge' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Knowledge Base</span>
          </button>
          <button
            onClick={() => switchTab('insights')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'insights' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={12} className={activeTab === 'insights' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Client Operations</span>
          </button>
        </div>

        {/* Console loading state */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-850 p-10 rounded-2xl text-center space-y-3 shadow-md">
            <div className="h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Retrieving System Logs & Entities...</p>
          </div>
        ) : activeTab === 'registry' ? (
          /* REGISTRY PANEL */
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-850 bg-slate-900/60 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Registered Facilities Directories</h4>
                <p className="text-[10px] text-slate-500 mt-1">Review credentials and toggle verification locks to allow/deny access to tenant portal dashboards.</p>
              </div>
            </div>

            {facilities.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                <AlertCircle size={32} className="mx-auto mb-2 text-slate-600" />
                <span>No facilities registered in systems control.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-bold border-b border-slate-850 text-[10px] uppercase">
                      <th className="py-3 px-4">Hospital Name & Code</th>
                      <th className="py-3 px-4">Address Context</th>
                      <th className="py-3 px-4">Subscription Tier</th>
                      <th className="py-3 px-4">Registration Date</th>
                      <th className="py-3 px-4 text-center">Status Lock</th>
                      <th className="py-3 px-4 text-center">Action Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-semibold text-slate-300">
                    {facilities.map((fac) => (
                      <tr key={fac.id} className="hover:bg-slate-950/20 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center font-bold text-teal-400 text-xs">
                              {fac.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-100 block text-xs uppercase">{fac.name}</span>
                              <span className="font-mono text-[10px] text-teal-400 font-black block mt-0.5">{fac.code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-350 text-[11px] font-sans">
                          {fac.address || 'Nairobi, Kenya'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            fac.license_tier === 'extensive' 
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {fac.license_tier || 'basic'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-450 font-mono text-[10px]">
                          {new Date(fac.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            fac.is_verified 
                              ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' 
                              : 'bg-amber-500/5 border border-amber-500/20 text-amber-400 animate-pulse'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${fac.is_verified ? 'bg-teal-400' : 'bg-amber-400'}`}></span>
                            {fac.is_verified ? 'Verified (Unlocked)' : 'Awaiting Review'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleVerification(fac.id, fac.is_verified)}
                              disabled={actionLoading === fac.id}
                              className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase py-1.5 px-3 rounded-lg shadow transition active:scale-[0.98] cursor-pointer ${
                                fac.is_verified
                                  ? 'bg-slate-800 hover:bg-slate-750 text-red-400 border border-slate-700 hover:border-red-500/25'
                                  : 'bg-teal-500 hover:bg-teal-600 text-slate-950 font-black'
                              }`}
                            >
                              {actionLoading === fac.id ? (
                                <RefreshCw size={10} className="animate-spin" />
                              ) : fac.is_verified ? (
                                <Lock size={10} />
                              ) : (
                                <Unlock size={10} />
                              )}
                              <span>
                                {actionLoading === fac.id 
                                  ? 'Processing...' 
                                  : fac.is_verified ? 'Suspend Portal' : 'Verify Facility'}
                              </span>
                            </button>

                            {fac.is_verified && (
                              <button
                                onClick={() => {
                                  const updatedUser = {
                                    ...user,
                                    role: 'admin',
                                    facility_id: fac.id,
                                    facility_name: fac.name,
                                    facility_logo: fac.logo_url,
                                    facility_is_verified: true
                                  };
                                  setUser(updatedUser);
                                  sessionStorage.setItem('egesa_health_active_user', JSON.stringify(updatedUser));
                                }}
                                className="inline-flex items-center gap-1.5 font-bold text-[10px] uppercase py-1.5 px-3 rounded-lg shadow bg-teal-500 hover:bg-teal-600 text-slate-950 transition active:scale-[0.98] cursor-pointer"
                              >
                                <Building2 size={10} />
                                <span>Access Portal</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'audit' ? (
          /* SYSTEM AUDIT PANEL */
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5 font-sans">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Platform System-Wide Audit Log Stream</h4>
              <p className="text-[10px] text-slate-500 mt-1">Observe real-time security events, administrator configurations, and data mutations logged across all clinics.</p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                <span>No audit events registered.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="bg-slate-955 border border-slate-855 p-3 rounded-xl flex justify-between items-center gap-4 text-xs font-mono">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          log.action.includes('Verification') || log.action.includes('Verify')
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : log.action.includes('Delete')
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-550">Facility context: <span className="text-slate-300 font-bold">{log.facility_id || 'System'}</span></span>
                      </div>
                      <p className="text-[10.5px] text-slate-350 truncate">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-550 block">{new Date(log.created_at).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-600 block mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'support' ? (
          /* SUPPORT QUERIES PANEL */
          <div className="space-y-4 animate-fadeIn font-sans">
            {/* Filter and Search actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow">
              <div className="flex gap-2">
                {['all', 'pending', 'addressed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSupportFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
                      supportFilter === f
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-extrabold'
                        : 'border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f} ({
                      f === 'all' 
                        ? supportTickets.length 
                        : supportTickets.filter(t => t.status === f).length
                    })
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search user name, email, or subject..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* Tickets table */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-350">
                  <thead className="bg-slate-955 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850">
                    <tr>
                      <th className="px-5 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-5 py-3.5">Submitted</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 bg-slate-900/40">
                    {supportTickets
                      .filter(t => supportFilter === 'all' || t.status === supportFilter)
                      .filter(t => {
                        const s = supportSearch.toLowerCase();
                        return (
                          t.user_name.toLowerCase().includes(s) ||
                          t.user_email.toLowerCase().includes(s) ||
                          t.subject.toLowerCase().includes(s)
                        );
                      })
                      .map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-950/20 transition">
                          <td className="px-5 py-4 font-mono font-bold text-teal-400">
                            #{ticket.id.substring(7, 13)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-white block">{ticket.user_name}</span>
                            <span className="text-[10px] text-slate-500 block">{ticket.user_email}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-200 font-sans">
                            {ticket.subject}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(ticket.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              ticket.status === 'addressed'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-amber-500/10 text-amber-450 border-amber-500/20 animate-pulse'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicketId(ticket.id);
                                setResponseText(ticket.response || '');
                              }}
                              className="bg-slate-800 hover:bg-slate-750 text-teal-400 border border-slate-700 hover:border-teal-500/20 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition cursor-pointer"
                            >
                              {ticket.status === 'addressed' ? 'View Details' : 'Address Query'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    {supportTickets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-500 italic">
                          No support tickets logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected ticket details modal drawer */}
            {selectedTicketId && (() => {
              const ticket = supportTickets.find(t => t.id === selectedTicketId);
              if (!ticket) return null;

              return (
                <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
                  <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b border-slate-850">
                      <div>
                        <span className="text-[9px] font-mono text-teal-400 font-bold block">REF: #{ticket.id.substring(7, 13)}</span>
                        <h3 className="text-sm font-black text-white">{ticket.subject}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTicketId(null);
                          setResponseText('');
                        }}
                        className="text-slate-500 hover:text-white transition text-xs font-bold border border-slate-800 px-2.5 py-1 rounded cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/45 border border-slate-850 p-3 rounded-xl">
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Submitted By</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User size={12} className="text-slate-400" />
                          <span className="text-slate-200 font-bold">{ticket.user_name}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] block font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} className="text-slate-400" />
                          <span className="text-slate-200 font-bold font-mono">{ticket.user_email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl text-xs space-y-2">
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">Query Message</span>
                      <p className="text-slate-350 leading-relaxed italic">"{ticket.message}"</p>
                      <span className="text-[8px] text-slate-550 block font-mono text-right">{new Date(ticket.created_at).toLocaleString()}</span>
                    </div>

                    {ticket.status === 'addressed' ? (
                      <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl text-xs space-y-2 animate-fadeIn">
                        <span className="text-[9px] font-bold text-green-400 block uppercase">Resolution Response</span>
                        <p className="text-green-300 leading-relaxed">"{ticket.response}"</p>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reply Message</label>
                          <textarea
                            rows={4}
                            required
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition resize-none"
                            placeholder="Type support reply details here. An email will be dispatched to the user automatically..."
                          />
                        </div>
                        <button
                          onClick={() => handleResolveSupportTicket(ticket.id)}
                          disabled={replyLoading || !responseText.trim()}
                          className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-black text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98]"
                        >
                          {replyLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                          Send Response & Resolve Ticket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : activeTab === 'demo' ? (
          <>
            <div className="space-y-4 animate-fadeIn font-sans">
              {/* DEMO PROSPECTS PANEL */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/25">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Demo Prospects & Bookings</h3>
                  <p className="text-[10px] text-slate-550 mt-0.5">Collect requests from prospective clients, check WhatsApp numbers, and manage follow-ups.</p>
                </div>
                <button
                  onClick={fetchSuperAdminData}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Refresh List"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-300 font-sans">
                  <thead className="bg-slate-950/45 text-[9px] uppercase tracking-wider text-slate-455 border-b border-slate-850">
                    <tr>
                      <th className="py-3 px-4 font-bold">Prospect Info</th>
                      <th className="py-3 px-4 font-bold">Contact Details</th>
                      <th className="py-3 px-4 text-center font-bold">Scheduled Slot</th>
                      <th className="py-3 px-4 text-center font-bold">Date Booked</th>
                      <th className="py-3 px-4 text-center font-bold">Status</th>
                      <th className="py-3 px-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {demoRequests.map((prospect) => (
                      <tr key={prospect.id} className="hover:bg-slate-955/10 transition">
                        <td className="py-3 px-4 font-bold text-slate-100">{prospect.name}</td>
                        <td className="py-3 px-4 space-y-1">
                          <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-teal-400 hover:underline hover:text-teal-355 font-bold">
                            <Mail size={11} /> {prospect.email}
                          </a>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono">{prospect.phone}</span>
                            <a 
                              href={`https://wa.me/${prospect.phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9.5px] font-bold text-teal-400 hover:text-teal-355 flex items-center gap-0.5"
                              title="Chat on WhatsApp"
                            >
                              <Phone size={10} /> Chat <ExternalLink size={8} />
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="block font-bold text-slate-205">{prospect.preferred_date}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{prospect.preferred_time}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-[10px] text-slate-550 font-mono">
                          {new Date(prospect.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                            prospect.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' :
                            prospect.status === 'confirmed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-450' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-450 animate-pulse'
                          }`}>
                            {prospect.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {prospect.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateDemoStatus(prospect.id, 'confirmed')}
                                disabled={actionLoading === prospect.id}
                                className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold text-[9px] uppercase px-2 py-1 rounded transition cursor-pointer"
                              >
                                Confirm
                              </button>
                            )}
                            {prospect.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdateDemoStatus(prospect.id, 'completed')}
                                disabled={actionLoading === prospect.id}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase px-2 py-1 rounded transition cursor-pointer"
                              >
                                Complete
                              </button>
                            )}
                            {prospect.status === 'completed' && (
                              <span className="text-[10px] text-slate-600 font-semibold italic">Archived</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {demoRequests.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-500 italic">
                          No demo bookings registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
              {/* PLATFORM USERS PANEL */}
            <div className="p-5 border-b border-slate-850">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                Platform Users Directory
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">All staff members across all facilities ({platformUsers.length} total)</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-300 font-sans">
                <thead className="bg-slate-950/45 text-[9px] uppercase tracking-wider text-slate-455 border-b border-slate-850">
                  <tr>
                    <th className="py-3 px-4 font-bold">Staff Member</th>
                    <th className="py-3 px-4 font-bold">Email</th>
                    <th className="py-3 px-4 font-bold">Role</th>
                    <th className="py-3 px-4 font-bold">Facility</th>
                    <th className="py-3 px-4 text-center font-bold">Status</th>
                    <th className="py-3 px-4 text-center font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {platformUsers.map((userItem) => {
                    const facility = facilities.find(f => f.id === userItem.facility_id);
                    const roleColors = {
                      admin: 'bg-red-500/10 text-red-400 border-red-500/20',
                      super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                      facility_admin: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                      hr_manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      clinician: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      nurse: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                      lab_technician: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                      pharmacist: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                      receptionist: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                    };
                    const roleBadge = roleColors[userItem.role?.toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                    
                    return (
                      <tr key={userItem.id} className="hover:bg-slate-955/10 transition">
                        <td className="py-3 px-4 font-bold text-slate-100">{userItem.full_name}</td>
                        <td className="py-3 px-4">
                          <a href={`mailto:${userItem.email}`} className="flex items-center gap-1 text-teal-400 hover:underline font-bold">
                            <Mail size={11} /> {userItem.email}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${roleBadge}`}>
                            {userItem.role?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {facility ? facility.name : <span className="text-slate-600 italic">No facility</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {userItem.access_status === 'active' ? (
                            <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Active
                            </span>
                          ) : (
                            <span className="text-red-400 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono text-[10px]">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {platformUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-500 italic">
                        No platform users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        ) : activeTab === 'knowledge' ? (
          <KnowledgeBasePanel />
        ) : (
          /* CLIENT OPERATIONS WORKSPACE */
          <div className="space-y-5 animate-fadeIn font-sans">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-850 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-teal-400" />
                    Client Operations Command Board
                  </h4>
                  <p className="text-[10px] text-slate-500">Ranked facility health, support pressure, clinical workflow gaps, and billing exposure across active clients.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={operationsState.search}
                      onChange={(e) => updateOperationsState({ search: e.target.value })}
                      placeholder="Search client"
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[190px]"
                    />
                  </div>

                  <select
                    value={operationsState.range}
                    onChange={(e) => updateOperationsState({ range: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                  </select>

                  <select
                    value={operationsState.tier}
                    onChange={(e) => updateOperationsState({ tier: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="all">All tiers</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="extensive">Elite</option>
                  </select>

                  <select
                    value={operationsState.status}
                    onChange={(e) => updateOperationsState({ status: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="all">All status</option>
                    <option value="verified">Verified</option>
                    <option value="locked">Locked</option>
                    <option value="risk">At risk</option>
                  </select>

                  <select
                    value={operationsState.sort}
                    onChange={(e) => updateOperationsState({ sort: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="risk_desc">Risk first</option>
                    <option value="support_desc">Support first</option>
                    <option value="revenue_desc">Revenue first</option>
                    <option value="visits_desc">Visits first</option>
                    <option value="name_asc">Name A-Z</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-850">
                {[
                  { label: 'At-Risk Clients', value: operationsSummary.atRisk, icon: ShieldAlert, color: 'text-amber-400' },
                  { label: 'Open Support', value: operationsSummary.openSupport, icon: MessageSquare, color: 'text-blue-400' },
                  { label: 'Pending Receivables', value: `Ksh ${Math.round(operationsSummary.pendingReceivables).toLocaleString()}`, icon: CreditCard, color: 'text-orange-400' },
                  { label: 'Settled Revenue', value: `Ksh ${Math.round(operationsSummary.settledRevenue).toLocaleString()}`, icon: TrendingUp, color: 'text-teal-400' }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="p-4 border-r border-b lg:border-b-0 border-slate-850 last:border-r-0">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon size={12} className={item.color} />
                        {item.label}
                      </span>
                      <span className="text-xl font-black text-white font-mono block mt-1">{item.value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
                <div className="min-w-0 border-r border-slate-850">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/50 text-slate-450 font-bold border-b border-slate-850 text-[10px] uppercase">
                          <th className="py-3 px-4">Client</th>
                          <th className="py-3 px-4">Health</th>
                          <th className="py-3 px-4">Visits Trend</th>
                          <th className="py-3 px-4 text-right">Orders</th>
                          <th className="py-3 px-4 text-right">Receivables</th>
                          <th className="py-3 px-4 text-right">Support</th>
                          <th className="py-3 px-4">Top Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredClientOperationsRows.map((row) => (
                          <tr
                            key={row.facilityId}
                            onClick={() => updateOperationsState({ facility: row.facilityId })}
                            className={`cursor-pointer transition ${
                              selectedOperationsRow?.facilityId === row.facilityId
                                ? 'bg-teal-500/10'
                                : 'hover:bg-slate-850/40'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${
                                  row.verified ? 'border-teal-500/25 bg-teal-500/10 text-teal-400' : 'border-red-500/25 bg-red-500/10 text-red-400'
                                }`}>
                                  {row.verified ? <Unlock size={14} /> : <Lock size={14} />}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-200 block truncate max-w-[220px]">{row.facilityName}</span>
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">{row.code || row.facilityId} · {row.licenseTier}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-white">{row.healthScore}</span>
                                <div className="h-2 w-20 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      row.healthTone === 'critical' ? 'bg-red-500' : row.healthTone === 'warning' ? 'bg-orange-500' : row.healthTone === 'watch' ? 'bg-blue-500' : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${row.healthScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 w-[150px]">
                              <div className="h-10">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={row.trend}>
                                    <Line type="monotone" dataKey="visits" stroke={HEALTH_COLORS[row.healthTone]} strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              <span className="text-[9px] text-slate-550">{row.visits} visits in range</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-slate-200 font-bold">{row.pendingOrders}</span>
                              <span className="text-[10px] text-slate-550 block">pending / {row.orders}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-slate-200 font-bold">Ksh {Math.round(row.pendingReceivables).toLocaleString()}</span>
                              <span className="text-[10px] text-slate-550 block">settled {Math.round(row.settledRevenue).toLocaleString()}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-mono font-bold ${row.openSupport > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{row.openSupport}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-bold ${
                                row.healthTone === 'critical'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : row.healthTone === 'warning'
                                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                  : row.healthTone === 'watch'
                                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                  : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                              }`}>
                                {row.topRisk}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredClientOperationsRows.length === 0 && (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-500">
                              No clients match the current operations filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="p-5 space-y-5 bg-slate-950/25">
                  {selectedOperationsRow ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Selected Client</span>
                            <h4 className="text-base font-black text-white mt-1">{selectedOperationsRow.facilityName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{selectedOperationsRow.licenseTier} · {selectedOperationsRow.verified ? 'Verified' : 'Locked'}</p>
                          </div>
                          <span className={`text-2xl font-black font-mono ${
                            selectedOperationsRow.healthTone === 'critical' ? 'text-red-400' : selectedOperationsRow.healthTone === 'warning' ? 'text-orange-400' : selectedOperationsRow.healthTone === 'watch' ? 'text-blue-400' : 'text-teal-400'
                          }`}>
                            {selectedOperationsRow.healthScore}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['Visits', selectedOperationsRow.visits],
                            ['Staff', selectedOperationsRow.staff],
                            ['Open Support', selectedOperationsRow.openSupport],
                            ['Pending Orders', selectedOperationsRow.pendingOrders]
                          ].map(([label, value]) => (
                            <div key={label} className="bg-slate-900 border border-slate-850 rounded-xl p-3">
                              <span className="text-[9px] text-slate-500 font-bold uppercase block">{label}</span>
                              <span className="text-lg font-black text-white font-mono">{value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 space-y-3">
                          {[
                            ['Triage compliance', selectedOperationsRow.triageComplianceRate],
                            ['Lab verification', selectedOperationsRow.labVerificationRate],
                            ['Digital payments', selectedOperationsRow.digitalPaymentRate]
                          ].map(([label, value]) => (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                <span>{label}</span>
                                <span>{value}%</span>
                              </div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowUpDown size={12} className="text-teal-400" />
                          Facility Visit Trend
                        </h5>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedOperationsRow.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ background: '#0d1523', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                              />
                              <Line type="monotone" dataKey="visits" stroke="#2dd4bf" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Select a facility to inspect operating signals.
                    </div>
                  )}
                </aside>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4 lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-205 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-teal-400" />
                  Lowest Health Clients
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskChartData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: '#0d1523', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }} />
                      <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                        {riskChartData.map((entry) => (
                          <Cell key={entry.name} fill={HEALTH_COLORS[entry.tone]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-205 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-teal-400" />
                  Tier Verification Mix
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tierVerificationChart} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="tier" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#0d1523', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }} />
                      <Bar dataKey="verified" stackId="a" fill="#2dd4bf" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="locked" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-205 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-teal-400" />
                  Diagnostic Improvement Recommendations
                </h4>
                <p className="text-[10px] text-slate-550 mt-1">Rule-based checks suggesting training, setup, or workflow interventions across clients.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {getDiagnosticRecommendations().map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      rec.severity === 'danger'
                        ? 'bg-red-500/5 border-red-500/20 text-red-400'
                        : rec.severity === 'warning'
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        : rec.severity === 'info'
                        ? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
                        : 'bg-teal-500/5 border-teal-500/25 text-teal-450'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          rec.severity === 'danger' ? 'bg-red-400' : rec.severity === 'warning' ? 'bg-amber-400' : rec.severity === 'info' ? 'bg-blue-400' : 'bg-teal-400'
                        }`} />
                        <h5 className="text-xs font-bold text-slate-200">{rec.title}</h5>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed pl-3.5">{rec.description}</p>
                    </div>

                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      rec.severity === 'danger'
                        ? 'bg-red-500/20 text-red-400'
                        : rec.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : rec.severity === 'info'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-teal-500/20 text-teal-400'
                    }`}>
                      {rec.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
