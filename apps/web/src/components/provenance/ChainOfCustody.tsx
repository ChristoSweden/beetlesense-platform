import { useState } from 'react';
import {
  TreePine,
  Axe,
  Truck,
  Warehouse,
  MapPin,
  Factory,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Navigation,
  Leaf,
} from 'lucide-react';
import type { CustodyStep, CustodyStepId } from '@/hooks/useProvenance';

// ─── Step icon mapping ───

const STEP_ICONS: Record<CustodyStepId, React.ReactNode> = {
  standing: <TreePine size={15} />,
  felling: <Axe size={15} />,
  forwarding: <Truck size={15} />,
  landing: <Warehouse size={15} />,
  transport: <Navigation size={15} />,
  reception: <Factory size={15} />,
};

const STATUS_COLORS: Record<string, { dot: string; line: string; text: string; bg: string }> = {
  completed: { dot: '#4ade80', line: '#4ade80', text: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  in_progress: { dot: '#fbbf24', line: '#fbbf24', text: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  pending: { dot: '#475569', line: '#334155', text: '#64748b', bg: 'rgba(71,85,105,0.1)' },
};

interface ChainOfCustodyProps {
  chain: CustodyStep[];
  transportDistance: number;
  carbonFootprint: number;
  anomalies: string[];
  compact?: boolean;
}

export function ChainOfCustody({
  chain,
  transportDistance,
  carbonFootprint,
  anomalies,
  compact = false,
}: ChainOfCustodyProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Timeline */}
      <div className="relative">
        {chain.map((step, i) => {
          const colors = STATUS_COLORS[step.status];
          const isExpanded = expanded.has(step.id);
          const isLast = i === chain.length - 1;
          const hasDetail = step.timestamp || step.operator || step.gps;

          return (
            <div key={step.id} className="relative flex gap-3">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[15px] top-[30px] w-[2px]"
                  style={{
                    background: colors.line,
                    height: isExpanded ? 'calc(100% - 12px)' : 'calc(100% - 8px)',
                    opacity: 0.3,
                  }}
                />
              )}

              {/* Icon circle */}
              <div
                className="flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center z-10"
                style={{ background: colors.bg, color: colors.dot, border: `2px solid ${colors.dot}` }}
              >
                {STEP_ICONS[step.id]}
              </div>

              {/* Content */}
              <div className={`flex-1 ${isLast ? '' : 'pb-3'}`}>
                <button
                  onClick={() => hasDetail && toggleExpand(step.id)}
                  className="flex items-center gap-1.5 w-full text-left group"
                  disabled={!hasDetail}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: colors.text }}
                  >
                    {step.label_sv}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color: colors.text, background: colors.bg }}
                  >
                    {step.status === 'completed' ? 'Klar' : step.status === 'in_progress' ? 'Pågår' : 'Väntande'}
                  </span>
                  {hasDetail && (
                    <span className="text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors ml-auto">
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                  )}
                </button>

                {/* Timestamp on collapsed */}
                {step.timestamp && !isExpanded && (
                  <p className="text-[10px] text-[var(--text3)] font-mono mt-0.5">
                    {new Date(step.timestamp).toLocaleString('sv-SE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}

                {/* Expanded detail */}
                {isExpanded && hasDetail && (
                  <div
                    className="mt-2 rounded-lg border border-[var(--border)] p-3 space-y-2"
                    style={{ background: 'var(--bg2)' }}
                  >
                    {step.timestamp && (
                      <DetailRow label="Tidpunkt" value={new Date(step.timestamp).toLocaleString('sv-SE')} />
                    )}
                    {step.gps && (
                      <DetailRow
                        label="GPS"
                        value={`${step.gps.lat.toFixed(4)}, ${step.gps.lng.toFixed(4)}`}
                        icon={<MapPin size={11} className="text-[var(--green)]" />}
                      />
                    )}
                    {step.operator && <DetailRow label="Operatör" value={step.operator} />}
                    {step.verificationMethod && <DetailRow label="Verifieringsmetod" value={step.verificationMethod} />}
                    {step.volume_m3 !== null && <DetailRow label="Volym" value={`${step.volume_m3} m³`} />}
                    {step.notes && (
                      <p className="text-[10px] text-[var(--text2)] italic mt-1 border-t border-[var(--border)] pt-1.5">
                        {step.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border)]">
          <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] flex items-center gap-1">
              <Navigation size={10} /> Transportavstånd
            </p>
            <p className="text-sm font-mono font-semibold text-[var(--text)]">{transportDistance} km</p>
          </div>
          <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] flex items-center gap-1">
              <Leaf size={10} /> CO₂-utsläpp
            </p>
            <p className="text-sm font-mono font-semibold text-[var(--text)]">
              {carbonFootprint > 0 ? `${carbonFootprint} kg` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {anomalies.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg p-2.5 border border-[#fbbf24]/30"
              style={{ background: 'rgba(251,191,36,0.05)' }}
            >
              <AlertTriangle size={13} className="text-[#fbbf24] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#fbbf24]">{a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper ───

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5">{icon}</span>}
      <div>
        <p className="text-[10px] text-[var(--text3)]">{label}</p>
        <p className="text-[11px] font-mono text-[var(--text)]">{value}</p>
      </div>
    </div>
  );
}
