import { useTranslation } from 'react-i18next';
import { useAdmin, type ServiceHealth, type SensorQueueStats } from '@/hooks/useAdmin';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Wifi,
  HardDrive,
  RefreshCw,
  Cloud,
  Cpu,
  Clock,
  Activity,
} from 'lucide-react';

/* ─── Service Status Card ─── */
function ServiceCard({ name, status, latency, uptime, lastCheck }: {
  name: string;
  status: ServiceHealth;
  latency: number;
  uptime: number;
  lastCheck: string;
}) {
  const config: Record<ServiceHealth, { icon: React.ReactNode; border: string; bg: string; label: string }> = {
    healthy: {
      icon: <CheckCircle2 size={20} className="text-emerald-400" />,
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      label: 'Healthy',
    },
    degraded: {
      icon: <AlertTriangle size={20} className="text-amber-400" />,
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      label: 'Degraded',
    },
    down: {
      icon: <XCircle size={20} className="text-red-400" />,
      border: 'border-red-500/20',
      bg: 'bg-red-500/5',
      label: 'Down',
    },
  };

  const c = config[status];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {c.icon}
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{name}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold mt-0.5" style={{
              color: status === 'healthy' ? 'rgb(52, 211, 153)' : status === 'degraded' ? 'rgb(251, 191, 36)' : 'rgb(248, 113, 113)'
            }}>
              {c.label}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Latency</p>
          <p className="text-sm font-mono font-bold text-[var(--text)] mt-0.5">{Math.round(latency)} ms</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Uptime</p>
          <p className="text-sm font-mono font-bold text-[var(--text)] mt-0.5">{uptime}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Last check</p>
          <p className="text-xs font-mono text-[var(--text3)] mt-0.5">{new Date(lastCheck).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Response Time Graph (SVG) ─── */
function ResponseTimeGraph({ data }: { data: { hour: string; supabase: number; redis: number; inference: number; qgis: number }[] }) {
  if (!data.length) return null;
  const w = 700;
  const h = 220;
  const padX = 45;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const allValues = data.flatMap((d) => [d.supabase, d.redis, d.inference, d.qgis]);
  const max = Math.max(...allValues);

  const series = [
    { key: 'supabase' as const, color: '#34d399', label: 'Supabase' },
    { key: 'redis' as const, color: '#60a5fa', label: 'Redis' },
    { key: 'inference' as const, color: '#f59e0b', label: 'Inference' },
    { key: 'qgis' as const, color: '#a78bfa', label: 'QGIS' },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padY + chartH - frac * chartH;
          return (
            <g key={frac}>
              <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={padX - 6} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize={9} fontFamily="monospace">
                {Math.round(frac * max)}
              </text>
            </g>
          );
        })}
        {/* Series */}
        {series.map((s) => {
          const points = data.map((d, i) => {
            const x = padX + (i / (data.length - 1)) * chartW;
            const y = padY + chartH - (d[s.key] / max) * chartH;
            return `${x},${y}`;
          });
          return (
            <polyline
              key={s.key}
              points={points.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              opacity={0.8}
            />
          );
        })}
        {/* X-axis labels */}
        {data.filter((_, i) => i % 4 === 0).map((d, idx) => {
          const i = idx * 4;
          const x = padX + (i / (data.length - 1)) * chartW;
          return (
            <text key={i} x={x} y={h - 2} textAnchor="middle" fill="var(--text3)" fontSize={9} fontFamily="monospace">
              {d.hour}
            </text>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pl-12">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-[var(--text3)]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Error Rate Graph (SVG bar chart) ─── */
function ErrorRateGraph({ data }: { data: { hour: string; count: number; rate: number }[] }) {
  if (!data.length) return null;
  const w = 700;
  const h = 150;
  const padX = 45;
  const padY = 15;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const max = Math.max(...data.map((d) => d.count), 1);
  const dataLen = Math.max(data.length, 1);
  const barW = chartW / dataLen * 0.6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {data.map((d, i) => {
        const x = padX + (i / dataLen) * chartW + (chartW / dataLen * 0.2);
        const barH = (d.count / max) * chartH;
        const y = padY + chartH - barH;
        const fill = d.count > 8 ? '#f87171' : d.count > 4 ? '#fbbf24' : '#34d399';
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill={fill} opacity={0.7} />
            {i % 4 === 0 && (
              <text x={x + barW / 2} y={h - 2} textAnchor="middle" fill="var(--text3)" fontSize={9} fontFamily="monospace">
                {d.hour}
              </text>
            )}
          </g>
        );
      })}
      {/* Y-axis */}
      {[0, 0.5, 1].map((frac) => {
        const y = padY + chartH - frac * chartH;
        return (
          <text key={frac} x={padX - 6} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize={9} fontFamily="monospace">
            {Math.round(frac * max)}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── Sensor Processing Queue Section ─── */
function SensorQueueSection({ data }: { data: SensorQueueStats }) {
  const sensorLabels: Record<string, string> = {
    multispectral: 'Multispektral',
    thermal: 'Termisk',
    RGB: 'RGB',
  };
  const sensorColors: Record<string, string> = {
    multispectral: '#a78bfa',
    thermal: '#f59e0b',
    RGB: '#34d399',
  };

  const total = data.waiting + data.active + data.completed + data.failed;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Väntar', value: data.waiting, color: 'text-blue-400' },
          { label: 'Aktiva', value: data.active, color: 'text-amber-400' },
          { label: 'Slutförda', value: data.completed, color: 'text-emerald-400' },
          { label: 'Misslyckade', value: data.failed, color: 'text-red-400' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-[var(--bg3)] p-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{item.label}</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${item.color}`}>
              {item.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        ))}
      </div>

      {/* Per sensor type breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Per sensortyp</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Sensortyp</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Väntar</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Aktiva</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Slutförda</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Misslyckade</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Snitt tid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.perSensorType.map((s) => (
                <tr key={s.sensorType} className="hover:bg-[var(--bg3)]/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sensorColors[s.sensorType] }} />
                      <span className="font-medium text-[var(--text)]">{sensorLabels[s.sensorType]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{s.waiting}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-amber-400">{s.active}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{s.completed.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-400">{s.failed}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono text-[var(--text2)]">{Math.floor(s.avgProcessingTimeSec / 60)}m {s.avgProcessingTimeSec % 60}s</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual bar for queue distribution */}
        <div className="mt-4 space-y-2">
          {data.perSensorType.map((s) => {
            const sTotal = s.waiting + s.active + s.completed + s.failed;
            const maxTotal = Math.max(...data.perSensorType.map((st) => st.waiting + st.active + st.completed + st.failed));
            return (
              <div key={s.sensorType} className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--text3)] w-24 text-right">{sensorLabels[s.sensorType]}</span>
                <div className="flex-1 h-3 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(sTotal / maxTotal) * 100}%`,
                      backgroundColor: sensorColors[s.sensorType],
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--text3)] w-14 text-right">{sTotal.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent completions timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Senaste slutförda jobb</h3>
        </div>
        <div className="space-y-1">
          {data.recentCompletions.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg3)]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sensorColors[job.sensorType] }} />
                <div>
                  <p className="text-sm text-[var(--text)]">
                    <span className="font-mono text-[var(--text3)] text-xs mr-2">{job.id}</span>
                    {sensorLabels[job.sensorType]}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">{job.parcelName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-[var(--text2)]">
                  {Math.floor(job.durationSec / 60)}m {job.durationSec % 60}s
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {new Date(job.completedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SystemHealthPage() {
  const { t } = useTranslation();
  const {
    loading,
    services,
    responseTimes,
    errorRates,
    dbStats,
    workerQueues,
    edgeFunctions,
    sensorQueueStats,
    refresh,
  } = useAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">{t('admin.health.title')}</h1>
          <p className="text-sm text-[var(--text3)] mt-1">{t('admin.health.subtitle')}</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <RefreshCw size={14} />
          {t('admin.dashboard.refresh')}
        </button>
      </div>

      {/* Service status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <ServiceCard key={svc.name} {...svc} />
        ))}
      </div>

      {/* Response times */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.health.responseTimes')}</h2>
        <ResponseTimeGraph data={responseTimes} />
      </div>

      {/* Error rates */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('admin.health.errorRates')}</h2>
        <ErrorRateGraph data={errorRates} />
      </div>

      {/* Sensor Processing Queue */}
      {sensorQueueStats && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-[var(--text3)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Sensorbearbetning</h2>
          </div>
          <SensorQueueSection data={sensorQueueStats} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database stats */}
        {dbStats && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={16} className="text-[var(--text3)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">{t('admin.health.database')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[var(--bg3)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{t('admin.health.dbSize')}</p>
                <p className="text-lg font-mono font-bold text-[var(--text)] mt-1">{dbStats.sizeGB} GB</p>
              </div>
              <div className="rounded-lg bg-[var(--bg3)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{t('admin.health.connections')}</p>
                <p className="text-lg font-mono font-bold text-[var(--text)] mt-1">
                  {dbStats.connections} / {dbStats.maxConnections}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--green)]"
                    style={{ width: `${(dbStats.connections / dbStats.maxConnections) * 100}%` }}
                  />
                </div>
              </div>
              <div className="col-span-2 rounded-lg bg-[var(--bg3)] p-3 flex items-center gap-3">
                <HardDrive size={16} className="text-[var(--text3)]" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{t('admin.health.totalRows')}</p>
                  <p className="text-lg font-mono font-bold text-[var(--text)]">{dbStats.rowCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Worker queues */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={16} className="text-[var(--text3)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">{t('admin.health.workerQueues')}</h2>
          </div>
          <div className="space-y-3">
            {workerQueues.map((q) => (
              <div key={q.name} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{q.name}</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    {q.processing} processing {q.failed > 0 && <span className="text-red-400">/ {q.failed} failed</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-[var(--text)]">{q.depth}</span>
                  <span className="text-[10px] text-[var(--text3)]">queued</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edge Functions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={16} className="text-[var(--text3)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">{t('admin.health.edgeFunctions')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">{t('admin.health.functionName')}</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">{t('admin.health.invocations')}</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">{t('admin.health.avgLatency')}</th>
                <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">{t('admin.health.errorRate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {edgeFunctions.map((fn) => (
                <tr key={fn.name} className="hover:bg-[var(--bg3)]/30">
                  <td className="px-4 py-2.5 font-mono text-[var(--text)]">{fn.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text2)]">{fn.invocations.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text2)]">{fn.avgLatency} ms</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono ${fn.errorRate > 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {fn.errorRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
