import { useState, useMemo, useCallback } from 'react';
import { useAdmin, type AdminUser } from '@/hooks/useAdmin';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  ShieldCheck,
  Ban,
  Trash2,
  X,
  UserPlus,
  Scan,
  FileBarChart,
  Mail,
  KeyRound,
  ArrowUpDown,
  CreditCard,
  HardDrive,
  Activity,
  Clock,
  Building2,
  Plane,
  CheckSquare,
  Square,
  Users,
  Crown,
  Shield,
  Binoculars,
  LogIn,
  Send,
  ChevronRight,
  AlertTriangle,
  Zap,
  Database,
  Globe,
  Calendar,
  BarChart3,
} from 'lucide-react';

/* ─── Extended user type with full detail fields ─── */
interface ExtendedUser extends AdminUser {
  organization: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  paymentStatus: 'active' | 'overdue' | 'trial' | 'cancelled';
  storageUsedMB: number;
  storageLimitMB: number;
  apiCallsMonth: number;
  apiCallsLimit: number;
  lastLogin: string;
  drones: { model: string; serial: string; status: 'active' | 'maintenance' }[];
  recentActions: { action: string; timestamp: string; icon: string }[];
  phone: string;
  county: string;
}

type SortKey = 'fullName' | 'email' | 'role' | 'plan' | 'createdAt' | 'lastActive';
type SortDir = 'asc' | 'desc';
type RoleTab = 'all' | 'owner' | 'pilot' | 'inspector';

/* ─── 25 realistic Swedish demo users ─── */
function generateDemoUsers(): ExtendedUser[] {
  const data: {
    first: string; last: string; role: ExtendedUser['role']; org: string;
    plan: ExtendedUser['plan']; billing: ExtendedUser['billingCycle'];
    payment: ExtendedUser['paymentStatus']; status: ExtendedUser['status'];
    county: string; phone: string;
    drones?: { model: string; serial: string; status: 'active' | 'maintenance' }[];
  }[] = [
    { first: 'Erik', last: 'Andersson', role: 'owner', org: 'Anderssons Skog AB', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Kronoberg', phone: '+46 70 123 4501' },
    { first: 'Anna', last: 'Johansson', role: 'owner', org: 'Johansson & Döttrar Skogbruk', plan: 'enterprise', billing: 'yearly', payment: 'active', status: 'active', county: 'Jönköping', phone: '+46 70 123 4502' },
    { first: 'Lars', last: 'Karlsson', role: 'pilot', org: 'SkyForest Drönar AB', plan: 'professional', billing: 'monthly', payment: 'active', status: 'active', county: 'Västra Götaland', phone: '+46 70 123 4503', drones: [{ model: 'DJI Matrice 350 RTK', serial: 'M350-2024-0847', status: 'active' }, { model: 'DJI Mavic 3 Multispectral', serial: 'M3M-2024-1293', status: 'active' }] },
    { first: 'Maria', last: 'Nilsson', role: 'owner', org: 'Nilssons Gård & Skog', plan: 'starter', billing: 'monthly', payment: 'active', status: 'active', county: 'Kalmar', phone: '+46 70 123 4504' },
    { first: 'Johan', last: 'Eriksson', role: 'inspector', org: 'Skogsstyrelsen', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Östergötland', phone: '+46 70 123 4505' },
    { first: 'Eva', last: 'Larsson', role: 'owner', org: 'Larssons Skogsfastigheter', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Dalarna', phone: '+46 70 123 4506' },
    { first: 'Karl', last: 'Olsson', role: 'pilot', org: 'DrönTek Sverige AB', plan: 'enterprise', billing: 'yearly', payment: 'active', status: 'active', county: 'Gävleborg', phone: '+46 70 123 4507', drones: [{ model: 'DJI Matrice 300 RTK', serial: 'M300-2023-0612', status: 'active' }, { model: 'senseFly eBee X', serial: 'EBX-2024-0891', status: 'maintenance' }, { model: 'DJI Mavic 3 Enterprise', serial: 'M3E-2024-0445', status: 'active' }] },
    { first: 'Karin', last: 'Persson', role: 'owner', org: 'Persson Skogsförvaltning', plan: 'free', billing: 'monthly', payment: 'trial', status: 'active', county: 'Värmland', phone: '+46 70 123 4508' },
    { first: 'Anders', last: 'Svensson', role: 'owner', org: 'Svensson & Son Skogbruk', plan: 'starter', billing: 'yearly', payment: 'active', status: 'active', county: 'Halland', phone: '+46 70 123 4509' },
    { first: 'Ingrid', last: 'Gustafsson', role: 'inspector', org: 'Skogsstyrelsen', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Skåne', phone: '+46 70 123 4510' },
    { first: 'Sven', last: 'Lindberg', role: 'owner', org: 'Lindbergs Skog & Mark HB', plan: 'professional', billing: 'monthly', payment: 'overdue', status: 'active', county: 'Norrbotten', phone: '+46 70 123 4511' },
    { first: 'Birgitta', last: 'Holm', role: 'owner', org: 'Holms Skogsfastigheter', plan: 'enterprise', billing: 'yearly', payment: 'active', status: 'active', county: 'Västernorrland', phone: '+46 70 123 4512' },
    { first: 'Gustaf', last: 'Forsberg', role: 'pilot', org: 'NorrFlyg Drönare AB', plan: 'starter', billing: 'monthly', payment: 'active', status: 'active', county: 'Norrbotten', phone: '+46 70 123 4513', drones: [{ model: 'DJI Phantom 4 RTK', serial: 'P4R-2023-0334', status: 'active' }] },
    { first: 'Margareta', last: 'Ekström', role: 'owner', org: 'Ekströms Familjskog', plan: 'starter', billing: 'monthly', payment: 'active', status: 'active', county: 'Kronoberg', phone: '+46 70 123 4514' },
    { first: 'Olof', last: 'Bergström', role: 'owner', org: 'Bergström Timber AB', plan: 'professional', billing: 'yearly', payment: 'active', status: 'suspended', county: 'Dalarna', phone: '+46 70 123 4515' },
    { first: 'Helena', last: 'Nyström', role: 'inspector', org: 'Länsstyrelsen Jönköping', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Jönköping', phone: '+46 70 123 4516' },
    { first: 'Per', last: 'Lundqvist', role: 'pilot', org: 'SkogScan Sverige AB', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Västra Götaland', phone: '+46 70 123 4517', drones: [{ model: 'DJI Matrice 350 RTK', serial: 'M350-2024-1102', status: 'active' }, { model: 'Autel EVO II Pro RTK', serial: 'AE2P-2024-0277', status: 'active' }] },
    { first: 'Lena', last: 'Sjöberg', role: 'owner', org: 'Sjöbergs Mark & Skog', plan: 'enterprise', billing: 'yearly', payment: 'active', status: 'active', county: 'Östergötland', phone: '+46 70 123 4518' },
    { first: 'Nils', last: 'Lindqvist', role: 'owner', org: 'Lindqvists Skogsbruk', plan: 'free', billing: 'monthly', payment: 'trial', status: 'pending', county: 'Kalmar', phone: '+46 70 123 4519' },
    { first: 'Sofia', last: 'Wallin', role: 'owner', org: 'Wallins Gröna Skog', plan: 'starter', billing: 'monthly', payment: 'active', status: 'active', county: 'Halland', phone: '+46 70 123 4520' },
    { first: 'Björn', last: 'Hedlund', role: 'pilot', org: 'AirView Skogskartläggning', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Gävleborg', phone: '+46 70 123 4521', drones: [{ model: 'DJI Mavic 3 Multispectral', serial: 'M3M-2025-0031', status: 'active' }] },
    { first: 'Astrid', last: 'Bergman', role: 'owner', org: 'Bergman Naturskog AB', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Värmland', phone: '+46 70 123 4522' },
    { first: 'Gunnar', last: 'Ström', role: 'inspector', org: 'Skogsstyrelsen', plan: 'professional', billing: 'yearly', payment: 'active', status: 'active', county: 'Kronoberg', phone: '+46 70 123 4523' },
    { first: 'Elisabet', last: 'Fransson', role: 'owner', org: 'Franssons Skog & Jakt', plan: 'starter', billing: 'yearly', payment: 'cancelled', status: 'suspended', county: 'Västernorrland', phone: '+46 70 123 4524' },
    { first: 'Mikael', last: 'Nordin', role: 'owner', org: 'Nordins Skogsgård', plan: 'professional', billing: 'monthly', payment: 'active', status: 'active', county: 'Dalarna', phone: '+46 70 123 4525' },
  ];

  const storageLimits: Record<string, number> = { free: 500, starter: 2048, professional: 10240, enterprise: 51200 };
  const apiLimits: Record<string, number> = { free: 100, starter: 1000, professional: 10000, enterprise: 100000 };

  const actionPool = [
    'Loggade in', 'Laddade upp drönarsökning', 'Genererade rapport', 'Registrerade nytt skifte',
    'Ändrade profilinställningar', 'Exporterade data', 'Startade AI-analys', 'Kommenterade rapport',
    'Bjöd in teammedlem', 'Aktiverade varningsprenumeration', 'Beställde satellitbild',
    'Tog bort skifte', 'Uppdaterade betalningsmetod', 'Begärde dataexport',
  ];

  const now = Date.now();

  return data.map((d, i) => {
    const createdDaysAgo = 30 + Math.floor(Math.random() * 335);
    const lastActiveDaysAgo = Math.floor(Math.random() * 14);
    const lastLoginDaysAgo = lastActiveDaysAgo + Math.floor(Math.random() * 3);
    const parcels = d.role === 'owner' ? Math.floor(Math.random() * 18) + 1 : d.role === 'inspector' ? Math.floor(Math.random() * 5) : 0;
    const surveys = d.role === 'pilot' ? Math.floor(Math.random() * 60) + 5 : Math.floor(Math.random() * 20);
    const reports = Math.floor(Math.random() * 25);
    const storagePct = 0.1 + Math.random() * 0.85;
    const apiPct = 0.05 + Math.random() * 0.7;

    const recentActions = Array.from({ length: 5 }, (_, j) => ({
      action: actionPool[Math.floor(Math.random() * actionPool.length)],
      timestamp: new Date(now - (j * 1 + Math.random() * 3) * 86400000).toISOString(),
      icon: ['login', 'upload', 'report', 'parcel', 'settings', 'export', 'ai', 'comment', 'invite', 'alert', 'satellite', 'delete', 'payment', 'gdpr'][Math.floor(Math.random() * 14)],
    }));

    return {
      id: `user-${String(i + 1).padStart(3, '0')}`,
      fullName: `${d.first} ${d.last}`,
      email: `${d.first.toLowerCase()}.${d.last.toLowerCase().replace(/[öäåé]/g, (c) => ({ ö: 'o', ä: 'a', å: 'a', é: 'e' }[c] || c))}@${d.org ? d.org.split(' ')[0].toLowerCase().replace(/[öäåé]/g, (c) => ({ ö: 'o', ä: 'a', å: 'a', é: 'e' }[c] || c)) : 'example'}.se`,
      role: d.role,
      organization: d.org,
      plan: d.plan,
      billingCycle: d.billing,
      paymentStatus: d.payment,
      status: d.status,
      county: d.county,
      phone: d.phone,
      parcelsCount: parcels,
      surveysCount: surveys,
      reportsCount: reports,
      storageUsedMB: Math.round(storageLimits[d.plan] * storagePct),
      storageLimitMB: storageLimits[d.plan],
      apiCallsMonth: Math.round(apiLimits[d.plan] * apiPct),
      apiCallsLimit: apiLimits[d.plan],
      createdAt: new Date(now - createdDaysAgo * 86400000).toISOString(),
      lastActive: new Date(now - lastActiveDaysAgo * 86400000).toISOString(),
      lastLogin: new Date(now - lastLoginDaysAgo * 86400000).toISOString(),
      drones: d.drones || [],
      recentActions,
    };
  });
}

const DEMO_USERS = generateDemoUsers();

/* ─── Plan label & colors ─── */
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', starter: 'Start', professional: 'Professionell', enterprise: 'Företag',
};
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  enterprise: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const PAYMENT_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  overdue: 'text-red-400',
  trial: 'text-amber-400',
  cancelled: 'text-gray-400',
};
const PAYMENT_LABELS: Record<string, string> = {
  active: 'Aktiv', overdue: 'Förfallen', trial: 'Provperiod', cancelled: 'Avbruten',
};

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    active: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Aktiv' },
    suspended: { cls: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Avstängd' },
    pending: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Väntande' },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ─── Role Badge ─── */
function RoleBadge({ role }: { role: AdminUser['role'] }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    owner: { cls: 'bg-blue-500/10 text-blue-400', label: 'Ägare' },
    pilot: { cls: 'bg-purple-500/10 text-purple-400', label: 'Pilot' },
    inspector: { cls: 'bg-cyan-500/10 text-cyan-400', label: 'Inspektör' },
    admin: { cls: 'bg-amber-500/10 text-amber-400', label: 'Admin' },
  };
  const c = cfg[role];
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ─── Plan Badge ─── */
function PlanBadge({ plan }: { plan: ExtendedUser['plan'] }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${PLAN_COLORS[plan]}`}>
      {PLAN_LABELS[plan]}
    </span>
  );
}

/* ─── Usage bar ─── */
function UsageBar({ used, limit, label, unit }: { used: number; limit: number; label: string; unit: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const formatVal = (v: number) => v >= 1024 ? `${(v / 1024).toFixed(1)} G${unit === 'MB' ? 'B' : unit}` : `${v.toLocaleString('sv-SE')} ${unit}`;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-[var(--text3)] uppercase tracking-wider">{label}</span>
        <span className="text-[var(--text2)] font-mono">{formatVal(used)} / {formatVal(limit)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Action confirmation toast ─── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium shadow-2xl animate-in slide-in-from-bottom-4 backdrop-blur-lg">
      <CheckSquare size={16} />
      {message}
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-emerald-500/20">
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── User Detail Panel ─── */
function UserDetailPanel({
  user,
  onClose,
  onAction,
}: {
  user: ExtendedUser;
  onClose: () => void;
  onAction: (action: string, userId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'usage' | 'activity' | 'drones'>('profile');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPlanMenu, setShowPlanMenu] = useState(false);

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'profile', label: 'Profil', icon: <Users size={14} />, show: true },
    { key: 'subscription', label: 'Prenumeration', icon: <CreditCard size={14} />, show: true },
    { key: 'usage', label: 'Användning', icon: <BarChart3 size={14} />, show: true },
    { key: 'activity', label: 'Aktivitet', icon: <Activity size={14} />, show: true },
    { key: 'drones', label: 'Drönare', icon: <Plane size={14} />, show: user.role === 'pilot' && user.drones.length > 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[var(--bg2)] border-l border-[var(--border)] shadow-2xl overflow-y-auto animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg2)]/95 backdrop-blur-sm border-b border-[var(--border)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center">
                <span className="text-lg font-bold text-[var(--green)]">{user.fullName.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">{user.fullName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <RoleBadge role={user.role} />
                  <PlanBadge plan={user.plan} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pb-0">
            {tabs.filter(t => t.show).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                    : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 space-y-6">
          {/* ── Profile tab ── */}
          {activeTab === 'profile' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Namn', value: user.fullName, icon: <Users size={14} /> },
                  { label: 'E-post', value: user.email, icon: <Mail size={14} /> },
                  { label: 'Telefon', value: user.phone, icon: <Globe size={14} /> },
                  { label: 'Organisation', value: user.organization, icon: <Building2 size={14} /> },
                  { label: 'Roll', value: <RoleBadge role={user.role} />, icon: <ShieldCheck size={14} /> },
                  { label: 'Län', value: user.county, icon: <Globe size={14} /> },
                  { label: 'Registrerad', value: new Date(user.createdAt).toLocaleDateString('sv-SE'), icon: <Calendar size={14} /> },
                  { label: 'Status', value: <StatusBadge status={user.status} />, icon: <Activity size={14} /> },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg bg-[var(--bg3)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[var(--text3)]">{item.icon}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">{item.label}</span>
                    </div>
                    <div className="text-sm text-[var(--text)]">{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Subscription tab ── */}
          {activeTab === 'subscription' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">Aktuell plan</p>
                  <PlanBadge plan={user.plan} />
                </div>
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">Faktureringsperiod</p>
                  <p className="text-sm text-[var(--text)]">{user.billingCycle === 'yearly' ? 'Årsvis' : 'Månadsvis'}</p>
                </div>
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">Betalningsstatus</p>
                  <span className={`text-sm font-medium ${PAYMENT_COLORS[user.paymentStatus]}`}>
                    {PAYMENT_LABELS[user.paymentStatus]}
                  </span>
                  {user.paymentStatus === 'overdue' && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400">
                      <AlertTriangle size={10} /> Förfallen sedan 14 dagar
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">Nästa faktura</p>
                  <p className="text-sm text-[var(--text)] font-mono">
                    {new Date(Date.now() + (user.billingCycle === 'yearly' ? 120 : 18) * 86400000).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              </div>

              {/* Plan change */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)]/50 p-4">
                <p className="text-xs font-semibold text-[var(--text2)] mb-3">Ändra plan</p>
                <div className="relative">
                  <button
                    onClick={() => setShowPlanMenu(!showPlanMenu)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] hover:border-[var(--green)]/50 transition-colors"
                  >
                    <span>{PLAN_LABELS[user.plan]}</span>
                    <ChevronDown size={14} className="text-[var(--text3)]" />
                  </button>
                  {showPlanMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-xl z-10 overflow-hidden">
                      {(['free', 'starter', 'professional', 'enterprise'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => { setShowPlanMenu(false); onAction(`Ändrade plan till ${PLAN_LABELS[p]} för`, user.id); }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg3)] transition-colors flex items-center justify-between ${
                            p === user.plan ? 'text-[var(--green)]' : 'text-[var(--text)]'
                          }`}
                        >
                          <span>{PLAN_LABELS[p]}</span>
                          {p === user.plan && <span className="text-[10px] text-[var(--text3)]">Nuvarande</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Usage tab ── */}
          {activeTab === 'usage' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Skiften', value: user.parcelsCount, icon: <Globe size={14} /> },
                  { label: 'Sökningar', value: user.surveysCount, icon: <Scan size={14} /> },
                  { label: 'Rapporter', value: user.reportsCount, icon: <FileBarChart size={14} /> },
                ].map((s, i) => (
                  <div key={i} className="text-center rounded-lg bg-[var(--bg3)] p-4">
                    <div className="flex justify-center text-[var(--green)] mb-2">{s.icon}</div>
                    <p className="text-2xl font-bold font-mono text-[var(--text)]">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-lg bg-[var(--bg3)] p-4">
                <UsageBar used={user.storageUsedMB} limit={user.storageLimitMB} label="Lagring" unit="MB" />
                <UsageBar used={user.apiCallsMonth} limit={user.apiCallsLimit} label="API-anrop denna månad" unit="" />
              </div>
            </>
          )}

          {/* ── Activity tab ── */}
          {activeTab === 'activity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <LogIn size={14} className="text-[var(--text3)]" />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Senaste inloggning</span>
                  </div>
                  <p className="text-sm text-[var(--text)] font-mono">{new Date(user.lastLogin).toLocaleString('sv-SE')}</p>
                </div>
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock size={14} className="text-[var(--text3)]" />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Senast aktiv</span>
                  </div>
                  <p className="text-sm text-[var(--text)] font-mono">{new Date(user.lastActive).toLocaleString('sv-SE')}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Senaste aktiviteter</h3>
                <div className="space-y-1">
                  {user.recentActions.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg3)] transition-colors">
                      <div className="w-6 h-6 rounded-full bg-[var(--green)]/10 flex items-center justify-center shrink-0">
                        <Zap size={10} className="text-[var(--green)]" />
                      </div>
                      <span className="text-sm text-[var(--text2)] flex-1">{a.action}</span>
                      <span className="text-[10px] font-mono text-[var(--text3)]">{new Date(a.timestamp).toLocaleDateString('sv-SE')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Historik</h3>
                <div className="space-y-1">
                  {[
                    { icon: <UserPlus size={12} />, text: 'Konto skapat', date: user.createdAt, color: 'text-emerald-400' },
                    { icon: <Scan size={12} />, text: `${user.surveysCount} sökningar uppladdade`, date: user.lastActive, color: 'text-blue-400' },
                    { icon: <FileBarChart size={12} />, text: `${user.reportsCount} rapporter genererade`, date: user.lastActive, color: 'text-purple-400' },
                  ].map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg3)]">
                      <span className={entry.color}>{entry.icon}</span>
                      <span className="text-sm text-[var(--text2)] flex-1">{entry.text}</span>
                      <span className="text-[10px] font-mono text-[var(--text3)]">{new Date(entry.date).toLocaleDateString('sv-SE')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Drones tab ── */}
          {activeTab === 'drones' && user.drones.length > 0 && (
            <div className="space-y-3">
              {user.drones.map((drone, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-[var(--bg3)] p-4 border border-[var(--border)]">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Plane size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{drone.model}</p>
                    <p className="text-[10px] font-mono text-[var(--text3)] mt-0.5">{drone.serial}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                    drone.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {drone.status === 'active' ? 'Aktiv' : 'Underhåll'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--bg2)]/95 backdrop-blur-sm px-6 py-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-3">Administratörsåtgärder</p>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <ShieldCheck size={12} /> Ändra roll
              </button>
              {showRoleMenu && (
                <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-xl z-10 overflow-hidden min-w-[140px]">
                  {(['owner', 'pilot', 'inspector'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => { setShowRoleMenu(false); onAction(`Ändrade roll till ${r === 'owner' ? 'Ägare' : r === 'pilot' ? 'Pilot' : 'Inspektör'} för`, user.id); }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg3)] transition-colors text-[var(--text)] flex items-center gap-2"
                    >
                      <RoleBadge role={r} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onAction(user.status === 'suspended' ? 'Aktiverade kontot för' : 'Inaktiverade kontot för', user.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Ban size={12} />
              {user.status === 'suspended' ? 'Aktivera' : 'Inaktivera'}
            </button>
            <button
              onClick={() => onAction('Skickade notifikation till', user.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
            >
              <Send size={12} /> Skicka notis
            </button>
            <button
              onClick={() => onAction('Återställde lösenord för', user.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
            >
              <KeyRound size={12} /> Återställ lösenord
            </button>
            <button
              onClick={() => onAction('Impersonerar', user.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Eye size={12} /> Visa som användare
            </button>
            <button
              onClick={() => onAction('Tog bort kontot för', user.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors ml-auto"
            >
              <Trash2 size={12} /> Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk Action Bar ─── */
function BulkActionBar({
  count,
  onClear,
  onAction,
}: {
  count: number;
  onClear: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--green)]">
        <CheckSquare size={16} />
        <span>{count} valda</span>
      </div>
      <div className="h-4 w-px bg-[var(--green)]/20" />
      <button
        onClick={() => onAction(`Skickade massutskick till ${count} användare`)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
      >
        <Mail size={12} /> Massutskick
      </button>
      <button
        onClick={() => onAction(`Ändrade roll för ${count} användare`)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
      >
        <ShieldCheck size={12} /> Ändra roll
      </button>
      <button
        onClick={() => onAction(`Inaktiverade ${count} konton`)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
      >
        <Ban size={12} /> Inaktivera
      </button>
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text3)] bg-[var(--bg3)] hover:bg-[var(--bg3)]/80 transition-colors ml-auto"
      >
        <X size={12} /> Avmarkera
      </button>
    </div>
  );
}

/* ─── Main Page ─── */
export default function UserManagementPage() {
  const { loading } = useAdmin();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const users = DEMO_USERS;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAction = useCallback((action: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    showToast(`${action} ${user?.fullName || userId}`);
  }, [users, showToast]);

  const handleBulkAction = useCallback((action: string) => {
    showToast(action);
    setSelected(new Set());
  }, [showToast]);

  const filtered = useMemo(() => {
    let list = [...users];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.organization.toLowerCase().includes(q)
      );
    }

    if (roleTab !== 'all') {
      list = list.filter((u) => u.role === roleTab);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'fullName': cmp = a.fullName.localeCompare(b.fullName, 'sv'); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'role': cmp = a.role.localeCompare(b.role); break;
        case 'plan': {
          const order = { free: 0, starter: 1, professional: 2, enterprise: 3 };
          cmp = order[a.plan] - order[b.plan];
          break;
        }
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'lastActive': cmp = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [users, search, sortKey, sortDir, roleTab]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-[var(--text3)] opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-[var(--green)]" />
      : <ChevronDown size={12} className="text-[var(--green)]" />;
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.id)));
    }
  }

  const roleTabs: { key: RoleTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Alla', icon: <Users size={14} />, count: users.length },
    { key: 'owner', label: 'Ägare', icon: <Crown size={14} />, count: users.filter(u => u.role === 'owner').length },
    { key: 'pilot', label: 'Piloter', icon: <Plane size={14} />, count: users.filter(u => u.role === 'pilot').length },
    { key: 'inspector', label: 'Inspektörer', icon: <Binoculars size={14} />, count: users.filter(u => u.role === 'inspector').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">Användarhantering</h1>
          <p className="text-sm text-[var(--text3)] mt-1">Hantera användare, roller, prenumerationer och behörigheter</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[var(--text2)] font-mono">{users.filter(u => u.status === 'active').length}</span>
            <span className="text-[var(--text3)]">aktiva</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
            <Users size={14} className="text-[var(--text3)]" />
            <span className="text-[var(--text2)] font-mono">{users.length}</span>
            <span className="text-[var(--text3)]">totalt</span>
          </div>
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] w-fit">
        {roleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setRoleTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              roleTab === tab.key
                ? 'bg-[var(--green)]/15 text-[var(--green)] shadow-sm'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              roleTab === tab.key ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök på namn, e-post eller organisation..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onAction={handleBulkAction}
        />
      )}

      {/* Count */}
      <p className="text-xs text-[var(--text3)]">
        Visar <span className="font-semibold text-[var(--text2)]">{filtered.length}</span> av {users.length} användare
      </p>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg3)]/50">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleSelectAll} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare size={16} className="text-[var(--green)]" />
                    : <Square size={16} />
                  }
                </button>
              </th>
              {([
                ['fullName', 'Namn'],
                ['email', 'E-post'],
                ['role', 'Roll'],
                ['plan', 'Plan'],
                ['createdAt', 'Registrerad'],
                ['lastActive', 'Senast aktiv'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon col={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((user) => (
              <tr
                key={user.id}
                className={`transition-colors cursor-pointer ${
                  selected.has(user.id)
                    ? 'bg-[var(--green)]/5'
                    : 'hover:bg-[var(--bg3)]/30'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleSelect(user.id)} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                    {selected.has(user.id)
                      ? <CheckSquare size={16} className="text-[var(--green)]" />
                      : <Square size={16} />
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-[var(--green)]">{user.fullName.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text)] block">{user.fullName}</span>
                      <span className="text-[10px] text-[var(--text3)]">{user.organization}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text2)] text-xs">{user.email}</td>
                <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                <td className="px-4 py-3"><PlanBadge plan={user.plan} /></td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text3)]">{new Date(user.createdAt).toLocaleDateString('sv-SE')}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text3)]">{new Date(user.lastActive).toLocaleDateString('sv-SE')}</td>
                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                      title="Visa detaljer"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleAction('Ändrade roll för', user.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-blue-400 transition-colors"
                      title="Ändra roll"
                    >
                      <ShieldCheck size={14} />
                    </button>
                    <button
                      onClick={() => handleAction(user.status === 'suspended' ? 'Aktiverade' : 'Inaktiverade', user.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-amber-400 transition-colors"
                      title={user.status === 'suspended' ? 'Aktivera' : 'Inaktivera'}
                    >
                      <Ban size={14} />
                    </button>
                    <button
                      onClick={() => handleAction('Skickade notifikation till', user.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-purple-400 transition-colors"
                      title="Skicka notis"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => handleAction('Impersonerar', user.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-emerald-400 transition-colors"
                      title="Visa som användare"
                    >
                      <LogIn size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-50" />
          <p className="text-sm text-[var(--text3)]">Inga användare matchar din sökning</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={handleAction}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
