import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Plus,
  Pencil,
  XCircle,
  RefreshCw,
  ChevronDown,
  Target,
  Trees,
  Cherry,
  Tent,
  HelpCircle,
  DollarSign,
  Calendar,
  Users,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

/* ─── Types ─── */

export type LeaseType = 'hunting' | 'recreation' | 'grazing' | 'berry_picking' | 'other';
export type LeaseStatus = 'draft' | 'active' | 'expired' | 'terminated';

export interface Lease {
  id: string;
  user_id: string;
  parcel_id: string | null;
  type: LeaseType;
  lessee_name: string;
  lessee_email: string;
  lessee_phone: string;
  annual_fee: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  status: LeaseStatus;
  terms: string;
  area_ha: number | null;
  created_at: string;
  updated_at: string;
}

/* ─── Demo Data ─── */

const DEMO_LEASES: Lease[] = [
  {
    id: 'lease-1',
    user_id: 'demo-user-1',
    parcel_id: 'p1',
    type: 'hunting',
    lessee_name: 'Erik Johansson',
    lessee_email: 'erik.johansson@jaktlaget.se',
    lessee_phone: '+46 70 123 4567',
    annual_fee: 15000,
    currency: 'SEK',
    start_date: '2025-07-01',
    end_date: '2026-06-30',
    auto_renew: true,
    status: 'active',
    terms: 'Jakträtt gäller älg, vildsvin och rådjur. Max 8 jägare. Respektera friluftsområden.',
    area_ha: 42.5,
    created_at: '2025-06-15T10:00:00Z',
    updated_at: '2025-06-15T10:00:00Z',
  },
  {
    id: 'lease-2',
    user_id: 'demo-user-1',
    parcel_id: 'p2',
    type: 'recreation',
    lessee_name: 'Värnamo Orienteringsklubb',
    lessee_email: 'kontakt@varnamoOK.se',
    lessee_phone: '+46 370 123 456',
    annual_fee: 5000,
    currency: 'SEK',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    auto_renew: false,
    status: 'active',
    terms: 'Rätt att arrangera max 4 orienteringstävlingar per år. Ingen motoriserad trafik.',
    area_ha: 18.3,
    created_at: '2025-12-01T08:00:00Z',
    updated_at: '2025-12-01T08:00:00Z',
  },
  {
    id: 'lease-3',
    user_id: 'demo-user-1',
    parcel_id: 'p1',
    type: 'grazing',
    lessee_name: 'Anna Lindqvist',
    lessee_email: 'anna@lindqvistgard.se',
    lessee_phone: '+46 70 987 6543',
    annual_fee: 8000,
    currency: 'SEK',
    start_date: '2026-05-01',
    end_date: '2026-09-30',
    auto_renew: true,
    status: 'active',
    terms: 'Bete for 12 Highland Cattle. Stängsel underhålls av arrendator. Max belastning 0.5 djurenheter/ha.',
    area_ha: 12.0,
    created_at: '2026-03-15T14:00:00Z',
    updated_at: '2026-03-15T14:00:00Z',
  },
];

/* ─── Helpers ─── */

const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  hunting: 'Hunting',
  recreation: 'Recreation',
  grazing: 'Grazing',
  berry_picking: 'Berry Picking',
  other: 'Other',
};

function leaseTypeIcon(type: LeaseType, size = 16) {
  switch (type) {
    case 'hunting': return <Target size={size} />;
    case 'recreation': return <Tent size={size} />;
    case 'grazing': return <Trees size={size} />;
    case 'berry_picking': return <Cherry size={size} />;
    case 'other': return <HelpCircle size={size} />;
  }
}

const STATUS_STYLES: Record<LeaseStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  expired: { bg: 'bg-red-100', text: 'text-red-700' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  terminated: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('sv-SE');
}

/* ─── Revenue Chart (pure CSS bars) ─── */

function RevenueChart({ leases }: { leases: Lease[] }) {
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i, revenue: 0 }));
    for (const lease of leases) {
      if (lease.status !== 'active') continue;
      const start = new Date(lease.start_date);
      const end = lease.end_date ? new Date(lease.end_date) : new Date(start.getFullYear(), 11, 31);
      const durationMonths = Math.max(1,
        (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1
      );
      const monthlyFee = lease.annual_fee / Math.min(durationMonths, 12);
      for (let m = start.getMonth(); m <= Math.min(end.getMonth(), 11); m++) {
        months[m].revenue += monthlyFee;
      }
    }
    return months;
  }, [leases]);

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
        <DollarSign size={14} className="text-[var(--green)]" />
        Monthly Lease Revenue ({new Date().getFullYear()})
      </h3>
      <div className="flex items-end gap-1 h-24">
        {monthlyRevenue.map((m, i) => {
          const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  background: m.revenue > 0 ? 'var(--green)' : 'var(--border)',
                  opacity: m.revenue > 0 ? 0.7 : 0.3,
                }}
                title={`${monthNames[i]}: ${formatSEK(m.revenue)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {monthNames.map((name) => (
          <span key={name} className="flex-1 text-center text-[9px] text-[var(--text3)]">{name}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Add/Edit Lease Form ─── */

interface LeaseFormData {
  type: LeaseType;
  lessee_name: string;
  lessee_email: string;
  lessee_phone: string;
  parcel_id: string;
  area_ha: string;
  annual_fee: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  terms: string;
}

const EMPTY_FORM: LeaseFormData = {
  type: 'hunting',
  lessee_name: '',
  lessee_email: '',
  lessee_phone: '',
  parcel_id: '',
  area_ha: '',
  annual_fee: '',
  start_date: '',
  end_date: '',
  auto_renew: false,
  terms: '',
};

function LeaseForm({
  onSubmit,
  onCancel,
  initial,
}: {
  onSubmit: (data: LeaseFormData) => void;
  onCancel: () => void;
  initial?: LeaseFormData;
}) {
  const [form, setForm] = useState<LeaseFormData>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaseFormData, string>>>({});

  const parcels = DEMO_PARCELS;

  const validate = (): boolean => {
    const e: Partial<Record<keyof LeaseFormData, string>> = {};
    if (!form.lessee_name.trim()) e.lessee_name = 'Name is required';
    if (!form.annual_fee || Number(form.annual_fee) <= 0) e.annual_fee = 'Fee must be positive';
    if (!form.start_date) e.start_date = 'Start date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition-colors';
  const labelCls = 'text-xs font-medium text-[var(--text2)] mb-1 block';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
        <Plus size={14} className="text-[var(--green)]" />
        {initial ? 'Edit Lease' : 'Create New Lease'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className={labelCls}>Lease Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as LeaseType })}
            className={inputCls}
          >
            {(Object.keys(LEASE_TYPE_LABELS) as LeaseType[]).map((t) => (
              <option key={t} value={t}>{LEASE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Parcel */}
        <div>
          <label className={labelCls}>Parcel</label>
          <select
            value={form.parcel_id}
            onChange={(e) => setForm({ ...form, parcel_id: e.target.value })}
            className={inputCls}
          >
            <option value="">-- Select parcel --</option>
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.area_hectares} ha)</option>
            ))}
          </select>
        </div>

        {/* Lessee Name */}
        <div>
          <label className={labelCls}>Lessee Name *</label>
          <input
            type="text"
            value={form.lessee_name}
            onChange={(e) => setForm({ ...form, lessee_name: e.target.value })}
            className={inputCls}
            placeholder="Erik Johansson"
          />
          {errors.lessee_name && <span className="text-[10px] text-red-500">{errors.lessee_name}</span>}
        </div>

        {/* Lessee Email */}
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={form.lessee_email}
            onChange={(e) => setForm({ ...form, lessee_email: e.target.value })}
            className={inputCls}
            placeholder="erik@example.se"
          />
        </div>

        {/* Lessee Phone */}
        <div>
          <label className={labelCls}>Phone</label>
          <input
            type="tel"
            value={form.lessee_phone}
            onChange={(e) => setForm({ ...form, lessee_phone: e.target.value })}
            className={inputCls}
            placeholder="+46 70 123 4567"
          />
        </div>

        {/* Area */}
        <div>
          <label className={labelCls}>Area (hectares)</label>
          <input
            type="number"
            value={form.area_ha}
            onChange={(e) => setForm({ ...form, area_ha: e.target.value })}
            className={inputCls}
            placeholder="12.5"
            step="0.1"
            min="0"
          />
        </div>

        {/* Annual Fee */}
        <div>
          <label className={labelCls}>Annual Fee (SEK) *</label>
          <input
            type="number"
            value={form.annual_fee}
            onChange={(e) => setForm({ ...form, annual_fee: e.target.value })}
            className={inputCls}
            placeholder="15000"
            min="0"
          />
          {errors.annual_fee && <span className="text-[10px] text-red-500">{errors.annual_fee}</span>}
        </div>

        {/* Start Date */}
        <div>
          <label className={labelCls}>Start Date *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className={inputCls}
          />
          {errors.start_date && <span className="text-[10px] text-red-500">{errors.start_date}</span>}
        </div>

        {/* End Date */}
        <div>
          <label className={labelCls}>End Date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Auto-renew */}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, auto_renew: !form.auto_renew })}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              form.auto_renew ? 'bg-[var(--green)]' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={form.auto_renew}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
              form.auto_renew ? 'translate-x-5' : ''
            }`} />
          </button>
          <span className="text-xs text-[var(--text2)]">Auto-renew when lease expires</span>
        </div>

        {/* Terms */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Terms and Conditions</label>
          <textarea
            value={form.terms}
            onChange={(e) => setForm({ ...form, terms: e.target.value })}
            className={`${inputCls} min-h-[80px] resize-y`}
            placeholder="Describe lease terms, restrictions, and special conditions..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
        >
          {initial ? 'Save Changes' : 'Create Lease'}
        </button>
      </div>
    </form>
  );
}

/* ─── Main Page ─── */

export default function LeaseManagementPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [leases, setLeases] = useState<Lease[]>(DEMO_LEASES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<LeaseType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<LeaseStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return leases.filter((l) => {
      if (filterType !== 'all' && l.type !== filterType) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    });
  }, [leases, filterType, filterStatus]);

  // Summary stats
  const activeLeases = leases.filter((l) => l.status === 'active');
  const totalRevenue = activeLeases.reduce((sum, l) => sum + l.annual_fee, 0);
  const now = new Date();
  const renewalCutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = activeLeases.filter((l) => {
    if (!l.end_date) return false;
    const end = new Date(l.end_date);
    return end <= renewalCutoff && end >= now;
  });

  const handleCreate = (data: LeaseFormData) => {
    const newLease: Lease = {
      id: `lease-${Date.now()}`,
      user_id: 'demo-user-1',
      parcel_id: data.parcel_id || null,
      type: data.type,
      lessee_name: data.lessee_name,
      lessee_email: data.lessee_email,
      lessee_phone: data.lessee_phone,
      annual_fee: Number(data.annual_fee),
      currency: 'SEK',
      start_date: data.start_date,
      end_date: data.end_date || null,
      auto_renew: data.auto_renew,
      status: 'active',
      terms: data.terms,
      area_ha: data.area_ha ? Number(data.area_ha) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLeases([newLease, ...leases]);
    setShowForm(false);
    toast('Lease created successfully', 'success');
  };

  const handleEdit = (data: LeaseFormData) => {
    setLeases(leases.map((l) =>
      l.id === editingId
        ? {
            ...l,
            type: data.type,
            lessee_name: data.lessee_name,
            lessee_email: data.lessee_email,
            lessee_phone: data.lessee_phone,
            parcel_id: data.parcel_id || null,
            annual_fee: Number(data.annual_fee),
            start_date: data.start_date,
            end_date: data.end_date || null,
            auto_renew: data.auto_renew,
            terms: data.terms,
            area_ha: data.area_ha ? Number(data.area_ha) : null,
            updated_at: new Date().toISOString(),
          }
        : l
    ));
    setEditingId(null);
    toast('Lease updated', 'success');
  };

  const handleTerminate = (id: string) => {
    setLeases(leases.map((l) =>
      l.id === id ? { ...l, status: 'terminated' as LeaseStatus, updated_at: new Date().toISOString() } : l
    ));
    toast('Lease terminated', 'warning');
  };

  const handleRenew = (id: string) => {
    setLeases(leases.map((l) => {
      if (l.id !== id) return l;
      const newStart = l.end_date ? new Date(l.end_date) : new Date();
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setFullYear(newEnd.getFullYear() + 1);
      return {
        ...l,
        status: 'active' as LeaseStatus,
        start_date: newStart.toISOString().split('T')[0],
        end_date: newEnd.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };
    }));
    toast('Lease renewed for another year', 'success');
  };

  const editingLease = editingId ? leases.find((l) => l.id === editingId) : null;
  const editFormData: LeaseFormData | undefined = editingLease
    ? {
        type: editingLease.type,
        lessee_name: editingLease.lessee_name,
        lessee_email: editingLease.lessee_email,
        lessee_phone: editingLease.lessee_phone,
        parcel_id: editingLease.parcel_id ?? '',
        area_ha: editingLease.area_ha?.toString() ?? '',
        annual_fee: editingLease.annual_fee.toString(),
        start_date: editingLease.start_date,
        end_date: editingLease.end_date ?? '',
        auto_renew: editingLease.auto_renew,
        terms: editingLease.terms,
      }
    : undefined;

  const parcelNameMap = Object.fromEntries(DEMO_PARCELS.map((p) => [p.id, p.name]));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={20} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Lease Management
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              Manage hunting, recreation, and other land leases
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
          >
            <Plus size={14} />
            New Lease
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-[var(--green)]" />
              <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Active Leases</span>
            </div>
            <span className="text-2xl font-bold text-[var(--text)]">{activeLeases.length}</span>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-[var(--green)]" />
              <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Annual Revenue</span>
            </div>
            <span className="text-2xl font-bold text-[var(--text)]">{formatSEK(totalRevenue)}</span>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-amber-500" />
              <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Renewals (90d)</span>
            </div>
            <span className="text-2xl font-bold text-[var(--text)]">{upcomingRenewals.length}</span>
          </div>
        </div>

        {/* Form */}
        {(showForm || editingId) && (
          <div className="mb-6">
            <LeaseForm
              onSubmit={editingId ? handleEdit : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
              initial={editFormData}
            />
          </div>
        )}

        {/* Revenue Chart */}
        <div className="mb-6">
          <RevenueChart leases={leases} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LeaseType | 'all')}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          >
            <option value="all">All Types</option>
            {(Object.keys(LEASE_TYPE_LABELS) as LeaseType[]).map((t) => (
              <option key={t} value={t}>{LEASE_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LeaseStatus | 'all')}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        {/* Lease Table */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={32} className="text-[var(--text3)] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[var(--text3)]">No leases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 text-[var(--text3)] font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-[var(--text3)] font-medium">Lessee</th>
                    <th className="text-left px-4 py-3 text-[var(--text3)] font-medium hidden sm:table-cell">Parcel</th>
                    <th className="text-right px-4 py-3 text-[var(--text3)] font-medium">Annual Fee</th>
                    <th className="text-center px-4 py-3 text-[var(--text3)] font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-[var(--text3)] font-medium hidden sm:table-cell">Period</th>
                    <th className="text-right px-4 py-3 text-[var(--text3)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lease) => (
                    <tr
                      key={lease.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg3)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--green)]">{leaseTypeIcon(lease.type, 14)}</span>
                          <span className="font-medium text-[var(--text)]">{LEASE_TYPE_LABELS[lease.type]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--text)] font-medium">{lease.lessee_name}</div>
                        {lease.lessee_email && (
                          <div className="text-[10px] text-[var(--text3)]">{lease.lessee_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-[var(--text2)]">
                        {lease.parcel_id ? parcelNameMap[lease.parcel_id] ?? 'Unknown' : '--'}
                        {lease.area_ha && (
                          <span className="text-[var(--text3)]"> ({lease.area_ha} ha)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--text)]">
                        {formatSEK(lease.annual_fee)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[lease.status].bg} ${STATUS_STYLES[lease.status].text}`}>
                          {lease.status}
                        </span>
                        {lease.auto_renew && lease.status === 'active' && (
                          <div className="text-[9px] text-[var(--green)] mt-0.5">auto-renew</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-[var(--text2)]">
                        {formatDate(lease.start_date)}
                        {lease.end_date && <> — {formatDate(lease.end_date)}</>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditingId(lease.id); setShowForm(false); }}
                            className="p-1.5 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          {lease.status === 'active' && (
                            <button
                              onClick={() => handleTerminate(lease.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-[var(--text3)] hover:text-red-500 transition-colors"
                              title="Terminate"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                          {(lease.status === 'expired' || lease.status === 'terminated') && (
                            <button
                              onClick={() => handleRenew(lease.id)}
                              className="p-1.5 rounded hover:bg-[var(--green)]/10 text-[var(--text3)] hover:text-[var(--green)] transition-colors"
                              title="Renew"
                            >
                              <RefreshCw size={13} />
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
      </div>
    </div>
  );
}
