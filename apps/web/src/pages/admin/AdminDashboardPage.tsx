import { useTranslation } from 'react-i18next';
import { useAdmin } from '@/hooks/useAdmin';
import {
  Users,
  TreePine,
  Scan,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  AlertTriangle,
  FileBarChart,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import type { ServiceHealth, ActivityItem } from '@/hooks/useAdmin';

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text)] font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

/* ─── SVG Line Chart ─── */
function UserGrowthChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null;
  const min = Math.min(...data.map((d) => d.count));
  const max = Math.max(...data.map((d) => d.count));
  const range = max - min || 1;
  const w = 600;
  const h = 200;
  const padX = 40;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((d.count - min) / range) * chartH;
    return `${x},${y}`;
  });

  const areaPoints = [`${padX},${padY + chartH}`, ...points, `${padX + chartW},${padY + chartH}`];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label="User growth chart">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padY + chartH - frac * chartH;
        const val = Math.round(min + frac * range);
        return (
          <g key={frac}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={padX - 6} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize={10} fontFamily="monospace">{val}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={areaPoints.join(' ')} fill="url(#growthGrad)" opacity={0.3} />
      {/* Line */}
      <polyline points={points.join(' ')} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots for first and last */}
      {[0, data.length - 1].map((i) => {
        const x = padX + (i / (data.length - 1)) * chartW;
        const y = padY + chartH - ((data[i].count - min) / range) * chartH;
        return <circle key={i} cx={x} cy={y} r={3} fill="var(--green)" />;
      })}
      {/* X-axis labels */}
      {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
        const x = padX + (i / (data.length - 1)) * chartW;
        return (
          <text key={i} x={x} y={h - 2} textAnchor="middle" fill="var(--text3)" fontSize={9} fontFamily="monospace">
            {data[i].date.slice(5)}
          </text>
        );
      })}
      <defs>
        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Service Health Indicator ─── */
function ServiceIndicator({ name, status, latency }: { name: string; status: ServiceHealth; latency: number }) {
  const colors: Record<ServiceHealth, string> = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${colors[status]}`} />
        <span className="text-sm text-[var(--text)]">{name}</span>
      </div>
      <span className="text-xs font-mono text-[var(--text3)]">{Math.round(latency)} ms</span>
    </div>
  );
}

/* ─── Activity Icon ─── */
function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  switch (type) {
    case 'signup': return <UserPlus size={14} className="text-emerald-400" />;
    case 'survey': return <Scan size={14} className="text-blue-400" />;
    case 'alert': return <AlertTriangle size={14} className="text-amber-400" />;
    case 'report': return <FileBarChart size={14} className="text-purple-400" />;
    case 'login': return <LogIn size={14} className="text-[var(--text3)]" />;
    default: return <Zap size={14} className="text-[var(--text3)]" />;
  }
}

/* ─── Main Page ─── */
export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const {
    loading,
    stats,
    userGrowth,
    queueStatus,
    services,
    recentActivity,
    refresh,
  } = useAdmin();

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  function timeAgo(ts: string) {
    const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">{t('admin.dashboard.title')}</h1>
          <p className="text-sm text-[var(--text3)] mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <RefreshCw size={14} />
          {t('admin.dashboard.refresh')}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('admin.dashboard.totalUsers')} value={stats.totalUsers} icon={<Users size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label={t('admin.dashboard.activeParcels')} value={stats.activeParcels} icon={<TreePine size={18} className="text-emerald-400" />} color="bg-emerald-500/10" />
        <StatCard label={t('admin.dashboard.surveysProcessed')} value={stats.surveysProcessed} icon={<Scan size={18} className="text-purple-400" />} color="bg-purple-500/10" />
        <StatCard label={t('admin.dashboard.apiCallsToday')} value={stats.apiCallsToday} icon={<Zap size={18} className="text-amber-400" />} color="bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User growth chart */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.dashboard.userGrowth')}</h2>
          <UserGrowthChart data={userGrowth} />
        </div>

        {/* Processing queue */}
        {queueStatus && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.dashboard.processingQueue')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span className="text-sm text-[var(--text2)]">{t('admin.dashboard.pending')}</span>
                </div>
                <span className="text-lg font-mono font-bold text-[var(--text)]">{queueStatus.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-sm text-[var(--text2)]">{t('admin.dashboard.active')}</span>
                </div>
                <span className="text-lg font-mono font-bold text-[var(--text)]">{queueStatus.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-sm text-[var(--text2)]">{t('admin.dashboard.completed')}</span>
                </div>
                <span className="text-lg font-mono font-bold text-[var(--text)]">{queueStatus.completed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-sm text-[var(--text2)]">{t('admin.dashboard.failed')}</span>
                </div>
                <span className="text-lg font-mono font-bold text-[var(--text)]">{queueStatus.failed}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System health */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.dashboard.systemHealth')}</h2>
          <div className="divide-y divide-[var(--border)]">
            {services.map((svc) => (
              <ServiceIndicator key={svc.name} name={svc.name} status={svc.status} latency={svc.latency} />
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.dashboard.recentActivity')}</h2>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-[var(--bg3)] flex items-center justify-center shrink-0">
                  <ActivityIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text2)] leading-snug">{item.message}</p>
                  <p className="text-xs text-[var(--text3)] mt-0.5">{timeAgo(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
