import { useState } from 'react';
import {
  Scale,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  Download,
  Trash2,
  Clock,
  Eye,
  ShieldCheck,
} from 'lucide-react';

// ─── Types ───

interface RiskScoreWeight {
  factor: string;
  weight: number;
  source: string;
}

interface ScarfFairnessProps {
  riskScoreWeights?: RiskScoreWeight[];
  processingQueuePosition?: number;
  totalInQueue?: number;
  methodologyUrl?: string;
  onExportData?: () => void;
  onDeleteData?: () => void;
  className?: string;
}

// ─── Default data ───

function defaultWeights(): RiskScoreWeight[] {
  return [
    { factor: 'Sensordata (NDVI, termisk)', weight: 35, source: 'Sentinel-2 + Drönarbilder' },
    { factor: 'Väderförhållanden', weight: 25, source: 'SMHI Open Data' },
    { factor: 'Historiska utbrott', weight: 20, source: 'Skogsstyrelsen' },
    { factor: 'Beståndsdata', weight: 12, source: 'SLU Riksskogstaxeringen' },
    { factor: 'Markförhållanden', weight: 8, source: 'SGU Jordartskarta' },
  ];
}

// ─── Component ───

export function ScarfFairness(props: ScarfFairnessProps) {
  const {
    riskScoreWeights,
    processingQueuePosition,
    totalInQueue,
    methodologyUrl = '/docs/methodology',
    onExportData,
    onDeleteData,
    className = '',
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const weights = riskScoreWeights ?? defaultWeights();

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 ${className}`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Scale size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">Transparens och rättvisa</h3>
            <span className="text-[10px] text-[var(--text3)]">
              Öppet, rättvist och under din kontroll
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          aria-label={expanded ? 'Dölj detaljer' : 'Visa detaljer'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Fairness statements */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
          <ShieldCheck size={12} className="text-[var(--green)] flex-shrink-0" />
          <span>Samma algoritm för alla — ingen förtur, inga dolda regler</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
          <Eye size={12} className="text-[var(--green)] flex-shrink-0" />
          <span>Du får samma marknadsdata som storbolagen</span>
        </div>
        {processingQueuePosition != null && totalInQueue != null && (
          <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
            <Clock size={12} className="text-[var(--green)] flex-shrink-0" />
            <span>
              Alla undersökningar bearbetas i turordning — plats{' '}
              <span className="font-mono font-semibold text-[var(--green)]">
                {processingQueuePosition}
              </span>{' '}
              av {totalInQueue}
            </span>
          </div>
        )}
      </div>

      {/* Risk score formula */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
          Så beräknar vi din riskpoäng
        </p>
        <div className="space-y-1">
          {weights.map((w) => (
            <div key={w.factor} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[var(--text)]">{w.factor}</span>
                  <span className="text-[10px] font-mono text-[var(--green)]">{w.weight}%</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
                    style={{ width: `${w.weight}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-[var(--text3)] mt-1.5">
          Källa per faktor visas nedan i expanderat läge
        </p>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-[var(--border)] space-y-3">
          {/* Detailed sources */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
              Datakällor
            </p>
            <div className="space-y-1.5">
              {weights.map((w) => (
                <div
                  key={w.factor}
                  className="flex items-center justify-between text-[10px] p-1.5 rounded bg-[var(--bg3)]"
                >
                  <span className="text-[var(--text)]">{w.factor}</span>
                  <span className="text-[var(--text3)]">{w.source}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology link */}
          <a
            href={methodologyUrl}
            className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg3)] text-xs text-[var(--text)] hover:bg-[var(--bg3)]/80 transition-colors"
          >
            <ExternalLink size={12} className="text-[var(--green)]" />
            <span>Öppen metodik — läs vår fullständiga metodbeskrivning</span>
          </a>

          {/* Data ownership */}
          <div className="p-3 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
            <div className="flex items-center gap-2 mb-2">
              <Database size={12} className="text-[var(--green)]" />
              <p className="text-xs font-medium text-[var(--text)]">
                Dina data tillhör dig
              </p>
            </div>
            <p className="text-[10px] text-[var(--text3)] mb-3">
              Exportera eller radera dina data när som helst. Vi säljer aldrig dina data till
              tredje part.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onExportData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)]/10 text-[var(--green)] text-[10px] font-medium hover:bg-[var(--green)]/20 transition-colors"
              >
                <Download size={10} />
                Exportera alla data
              </button>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-medium hover:bg-[#ef4444]/20 transition-colors"
                >
                  <Trash2 size={10} />
                  Radera mina data
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onDeleteData?.();
                      setShowDeleteConfirm(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#ef4444] text-white text-[10px] font-medium hover:bg-[#ef4444]/90 transition-colors"
                  >
                    Bekräfta radering
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg3)] text-[var(--text3)] text-[10px] hover:bg-[var(--bg3)]/80 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ScarfFairness;
