import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, Clock, FileText, ChevronRight } from 'lucide-react';

interface ComplianceItem {
  id: string;
  title: string;
  regulation: string;
  status: 'compliant' | 'action_needed' | 'pending' | 'not_applicable';
  deadline?: string;
  description: string;
  actionUrl?: string;
}

const DEMO_ITEMS: ComplianceItem[] = [
  {
    id: '1',
    title: 'Replanting obligation',
    regulation: 'Skogsvardslagen 6 \u00A7',
    status: 'compliant',
    description: 'All harvested areas from 2023 have been replanted. Next check: areas harvested in 2024 (deadline 2027).',
  },
  {
    id: '2',
    title: 'Harvesting notification',
    regulation: 'Skogsvardslagen 14 \u00A7',
    status: 'action_needed',
    deadline: '2026-05-15',
    description: 'You plan to harvest Norra Skiftet this autumn. File your avverkningsanmalan at least 6 weeks before.',
    actionUrl: '/owner/avverkningsanmalan',
  },
  {
    id: '3',
    title: 'EUDR compliance',
    regulation: 'EU Deforestation Regulation',
    status: 'pending',
    deadline: '2026-12-30',
    description: 'Due diligence statement and geolocation data must be filed. Parcel coordinates are uploaded; statement needs completion.',
    actionUrl: '/owner/eudr-compliance',
  },
  {
    id: '4',
    title: 'Buffer zone requirements',
    regulation: 'Skogsvardslagen 30 \u00A7',
    status: 'compliant',
    description: '15m buffer zones maintained along all watercourses. Last verified: March 2026 drone survey.',
  },
  {
    id: '5',
    title: 'Key habitat preservation',
    regulation: 'Miljobalken 12 kap',
    status: 'compliant',
    description: 'Identified key habitats (nyckelbiotoper) are excluded from harvest plans. 2 registered habitats on your property.',
  },
  {
    id: '6',
    title: 'FSC/PEFC certification',
    regulation: 'Voluntary certification',
    status: 'action_needed',
    deadline: '2026-09-01',
    description: 'Annual audit due in September. Ensure documentation of all harvesting and environmental measures is up to date.',
    actionUrl: '/owner/certifications',
  },
  {
    id: '7',
    title: 'Fire preparedness',
    regulation: 'Raddningstjanstlagen',
    status: 'not_applicable',
    description: 'No active harvesting during fire season. Requirement applies during machine operations in dry conditions.',
  },
  {
    id: '8',
    title: 'Timber transport documentation',
    regulation: 'EU Timber Regulation',
    status: 'compliant',
    description: 'All timber sales include species, volume, and origin documentation. Chain of custody maintained.',
    actionUrl: '/owner/provenance',
  },
];

const STATUS_CONFIG = {
  compliant: { label: 'Compliant', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={14} /> },
  action_needed: { label: 'Action needed', color: '#ef4444', bg: '#fef2f2', icon: <AlertTriangle size={14} /> },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={14} /> },
  not_applicable: { label: 'N/A', color: '#9ca3af', bg: '#f3f4f6', icon: <FileText size={14} /> },
};

export default function ComplianceDashboardPage() {
  const [filter, setFilter] = useState<'all' | 'action_needed' | 'pending' | 'compliant'>('all');

  const filtered = filter === 'all'
    ? DEMO_ITEMS
    : DEMO_ITEMS.filter(item => item.status === filter);

  const counts = {
    compliant: DEMO_ITEMS.filter(i => i.status === 'compliant').length,
    action_needed: DEMO_ITEMS.filter(i => i.status === 'action_needed').length,
    pending: DEMO_ITEMS.filter(i => i.status === 'pending').length,
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-500/10">
              <Shield size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Compliance Dashboard</h1>
              <p className="text-[11px] text-[var(--text3)]">Regulatory status and deadlines</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3 border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
            <p className="text-xl font-bold text-[var(--green)]" style={{ fontFamily: "'DM Mono', monospace" }}>{counts.compliant}</p>
            <p className="text-[10px] text-[var(--text3)]">Compliant</p>
          </div>
          <div className="rounded-xl p-3 border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
            <p className="text-xl font-bold text-red-500" style={{ fontFamily: "'DM Mono', monospace" }}>{counts.action_needed}</p>
            <p className="text-[10px] text-[var(--text3)]">Action needed</p>
          </div>
          <div className="rounded-xl p-3 border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
            <p className="text-xl font-bold text-amber-500" style={{ fontFamily: "'DM Mono', monospace" }}>{counts.pending}</p>
            <p className="text-[10px] text-[var(--text3)]">Pending</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'action_needed' as const, label: 'Action needed' },
            { key: 'pending' as const, label: 'Pending' },
            { key: 'compliant' as const, label: 'Compliant' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[var(--green)] text-white'
                  : 'border border-[var(--border)] text-[var(--text3)]'
              }`}
              style={filter !== f.key ? { background: 'var(--bg2)' } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-3">
          {filtered.map(item => {
            const sc = STATUS_CONFIG[item.status];
            return (
              <div
                key={item.id}
                className="rounded-xl p-4 border border-[var(--border)] hover-lift-premium"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: sc.color }}>{sc.icon}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: sc.color, background: sc.bg }}
                    >
                      {sc.label}
                    </span>
                  </div>
                  {item.deadline && (
                    <span className="text-[10px] text-[var(--text3)]">Due: {item.deadline}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{item.title}</h3>
                <p className="text-[10px] text-[var(--text3)] mb-2">{item.regulation}</p>
                <p className="text-xs text-[var(--text2)] leading-relaxed">{item.description}</p>
                {item.actionUrl && item.status !== 'compliant' && (
                  <Link
                    to={item.actionUrl}
                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-[var(--green)] hover:underline"
                  >
                    Take action <ChevronRight size={10} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-6 italic">
          Demo data for illustration. Actual compliance status requires professional legal review.
        </p>
      </div>
    </div>
  );
}
