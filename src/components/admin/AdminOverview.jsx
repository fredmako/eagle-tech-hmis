import React from 'react';
import {
  Shield,
  Mail,
  Server,
  CreditCard,
  Building,
  UserPlus,
  UserCheck,
  PhoneCall,
  Users,
  ShoppingBag,
  Activity,
  Globe,
  Bed,
  LayoutGrid,
  Calendar,
  Bell,
  Wrench,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { hasAccess } from '../../utils/permissions';

export default function AdminOverview({
  setActiveSubTab,
  user,
  invitationsList = [],
  roleRequests = [],
  supportTicketsCount = 0,
  afyalinkLogs = [],
  emailLogs = [],
  adminDelegation = {},
  onNavigate
}) {
  // Count pending items
  const pendingInvitations = invitationsList.filter(i => i.status === 'pending').length;
  const pendingRoles = roleRequests.filter(r => r.status === 'pending').length;
  const pendingTickets = supportTicketsCount;
  const failedAfyaLink = afyalinkLogs.filter(l => {
    try {
      return JSON.parse(l.details).status === 'failed';
    } catch (e) { return false; }
  }).length;
  const openAdminTasks = pendingInvitations + pendingRoles + pendingTickets + failedAfyaLink;
  const overviewMetrics = [
    {
      label: 'Open admin tasks',
      value: openAdminTasks,
      detail: `${pendingInvitations} invites, ${pendingRoles} role reviews`,
      icon: Bell,
      tone: 'amber'
    },
    {
      label: 'Support queue',
      value: pendingTickets,
      detail: 'Patient and staff inquiries awaiting response',
      icon: PhoneCall,
      tone: 'rose'
    },
    {
      label: 'Integration issues',
      value: failedAfyaLink,
      detail: 'AfyaLink records needing attention',
      icon: Activity,
      tone: 'red'
    },
    {
      label: 'Email volume',
      value: emailLogs.length,
      detail: 'Transactional email delivery events',
      icon: Mail,
      tone: 'blue'
    }
  ];

  const analyticsRows = [
    { label: 'Invitations', value: pendingInvitations },
    { label: 'Role requests', value: pendingRoles },
    { label: 'Support tickets', value: pendingTickets },
    { label: 'Email logs', value: emailLogs.length },
    { label: 'AfyaLink alerts', value: failedAfyaLink }
  ];
  const analyticsPeak = Math.max(1, ...analyticsRows.map(row => row.value));

  const sections = [
    {
      title: "Facility Configuration & Branding",
      cards: [
        {
          id: 'facility_profile',
          title: "Hospital Profile",
          desc: "Manage clinic info, address, KMPDC number, and official identity logo.",
          icon: Building,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40",
          show: hasAccess('facility_profile', user.role, adminDelegation)
        },
        {
          id: 'domain',
          title: "Domain & Branding",
          desc: "Configure public-facing custom subdomains and clinic logo routing.",
          icon: Globe,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20 hover:border-teal-500/40",
          show: hasAccess('domain', user.role, adminDelegation)
        },
        {
          id: 'payment_settings',
          title: "Payment & Landing Config",
          desc: "Configure Stripe, PayPal, M-Pesa merchant keys and medical service catalogs.",
          icon: CreditCard,
          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40",
          show: hasAccess('payment_settings', user.role, adminDelegation)
        },
        {
          id: 'ward_settings',
          title: "Ward & Bed Settings",
          desc: "Create inpatient wards, build custom room bed grids, and track bed states.",
          icon: Bed,
          color: "text-sky-400 bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40",
          show: hasAccess('ward_settings', user.role, adminDelegation)
        }
      ]
    },
    {
      title: "Staff & Role Management",
      cards: [
        {
          id: 'staff_onboarding',
          route: 'hr',
          subTab: 'onboarding',
          title: "Staff Onboarding",
          desc: "Draft and dispatch email invitations to new healthcare clinicians.",
          icon: UserPlus,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40",
          badge: pendingInvitations,
          badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          show: hasAccess('staff_onboarding', user.role, adminDelegation)
        },
        {
          id: 'role_requests',
          route: 'hr',
          subTab: 'requests',
          title: "Role Requests",
          desc: "Authorize, delegate or restrict employee clearance updates.",
          icon: UserCheck,
          color: "text-orange-400 bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40",
          badge: pendingRoles,
          badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
          show: hasAccess('role_requests', user.role, adminDelegation)
        },
        {
          id: 'hr',
          route: 'hr',
          subTab: 'directory',
          title: "Human Resources",
          desc: "Manage profiles, contacts, and active access parameters for staff.",
          icon: Users,
          color: "text-pink-400 bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40",
          show: hasAccess('hr', user.role, adminDelegation)
        },
        {
          id: 'roster',
          route: 'hr',
          subTab: 'roster',
          title: "Duty Roster & Attendance",
          desc: "Allocate weekly clinician shifts, and monitor real-time clock-in/out logs.",
          icon: Calendar,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20 hover:border-teal-500/40",
          show: hasAccess('roster', user.role, adminDelegation)
        },
        {
          id: 'broadcasts',
          title: "Alerts & Broadcasts",
          desc: "Broadcast notifications to staff, role groups, or platform support.",
          icon: Bell,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
          show: hasAccess('broadcasts', user.role, adminDelegation)
        }
      ]
    },
    {
      title: "Operations & Patient Support",
      cards: [
        {
          id: 'procurement',
          route: 'procurement',
          title: "Procurement Desk",
          desc: "Track clinic purchases, inventory balances, and recurring utility invoices.",
          icon: ShoppingBag,
          color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40",
          show: hasAccess('procurement', user.role, adminDelegation)
        },
        {
          id: 'maintenance',
          route: 'maintenance',
          title: "Assets Maintenance",
          desc: "Track clinic assets, equipment calibrations, and medical machinery repairs.",
          icon: Wrench,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20 hover:border-teal-500/40",
          show: hasAccess('maintenance', user.role, adminDelegation)
        },
        {
          id: 'help_desk',
          title: "Help Desk Support",
          desc: "Respond to patient inquiries and technical requests submitted online.",
          icon: PhoneCall,
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40",
          badge: pendingTickets,
          badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          show: hasAccess('help_desk', user.role, adminDelegation)
        }
      ]
    },
    {
      title: "Integrations & Logs",
      cards: [
        {
          id: 'afyalink',
          title: "AfyaLink Integration",
          desc: "Monitor standard health insurance data logs and integration stats.",
          icon: Activity,
          color: "text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/40",
          badge: failedAfyaLink,
          badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
          show: hasAccess('afyalink', user.role, adminDelegation)
        },
        {
          id: 'smtp_settings',
          title: "SMTP Server Settings",
          desc: "Manage custom SMTP outbound email credentials and timeout limits.",
          icon: Server,
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40",
          show: hasAccess('smtp_settings', user.role, adminDelegation)
        },
        {
          id: 'email_logs',
          title: "Email Delivery Logs",
          desc: "View transactional mail statuses, debug codes, and server responses.",
          icon: Mail,
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
          badge: emailLogs.length,
          badgeColor: "bg-slate-955 text-slate-400 border-slate-800",
          show: hasAccess('email_logs', user.role, adminDelegation)
        },
        {
          id: 'audit',
          title: "Audit Trail logs",
          desc: "Track secure clinic logs, provider check-ins, and critical change histories.",
          icon: Shield,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20 hover:border-teal-500/40",
          show: hasAccess('audit', user.role, adminDelegation)
        },
        {
          id: 'licensing',
          title: "Licensing & Billing",
          desc: "Check clinic licensing status, usage limits, and SaaS package invoices.",
          icon: CreditCard,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
          show: hasAccess('licensing', user.role, adminDelegation)
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-4 animate-fadeIn">
      <div className="flex items-center gap-2.5 pb-1 border-b border-slate-800/60">
        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
          <LayoutGrid size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Facility Control Overview</h2>
          <p className="text-[10.5px] text-slate-500 font-medium">Quick access to administrative panels, active logs, and configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={14} className="text-teal-400" />
                Facility Analytics Snapshot
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-1">
                A quick read on admin load, support demand, and integration health.
              </p>
            </div>
            <div className="flex items-center gap-2 text-2xs font-bold text-slate-400">
              <TrendingUp size={13} className="text-emerald-400" />
              Live overview
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {overviewMetrics.map((metric) => {
              const Icon = metric.icon;
              const toneMap = {
                amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                red: 'text-red-400 bg-red-500/10 border-red-500/20',
                blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
              };
              return (
                <div key={metric.label} className="bg-slate-950/70 border border-slate-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                    <div className={`p-1.5 rounded-md border ${toneMap[metric.tone]}`}>
                      <Icon size={12} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-100">{metric.value}</div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">{metric.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-teal-400" />
                Workload Distribution
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-1">
                The busiest admin queues, scaled against the highest count.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {analyticsRows.map((row, idx) => {
              const width = `${Math.max(6, Math.round((row.value / analyticsPeak) * 100))}%`;
              const rowTones = [
                'bg-teal-500/80',
                'bg-amber-500/80',
                'bg-rose-500/80',
                'bg-blue-500/80',
                'bg-purple-500/80'
              ];
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-slate-500">
                    <span>{row.label}</span>
                    <span className="text-slate-300">{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 border border-slate-850 overflow-hidden">
                    <div className={`h-full rounded-full ${rowTones[idx % rowTones.length]}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, sIdx) => {
          const visibleCards = section.cards.filter(c => c.show);
          if (visibleCards.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-3">
              <h3 className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span>{section.title}</span>
                <span className="flex-1 h-px bg-slate-850" />
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {visibleCards.map((card, cIdx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={cIdx}
                      onClick={() => {
                        if (card.route && onNavigate) {
                          onNavigate(card.route, card.subTab || null);
                        } else {
                          setActiveSubTab(card.id);
                        }
                      }}
                      className="group flex items-start gap-3.5 p-3.5 bg-slate-900/40 hover:bg-slate-850/30 border border-slate-850 hover:border-slate-700/80 rounded-xl transition-all duration-300 text-left hover:translate-y-[-1px] hover:shadow-lg hover:shadow-slate-950/20 w-full active:scale-[0.99] cursor-pointer"
                    >
                      <div className={`p-2.5 rounded-lg border transition-all duration-300 group-hover:scale-105 shrink-0 ${card.color}`}>
                        <Icon size={16} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[11.5px] font-bold text-slate-200 group-hover:text-slate-100 transition-colors uppercase tracking-wide">
                            {card.title}
                          </span>
                          {card.badge > 0 && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${card.badgeColor}`}>
                              {card.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-400 group-hover:text-slate-350 transition-colors font-sans leading-normal">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
