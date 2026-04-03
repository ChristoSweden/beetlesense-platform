import { useState } from 'react';
import {
  Clock,
  Bug,
  Satellite,
  CloudSun,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Shield,
} from 'lucide-react';

// ─── Types ───

interface TimelineItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  date: string;
  detail?: string;
  urgency: 'normal' | 'soon' | 'urgent';
}

interface Prediction {
  label: string;
  confidence: number;
  explanation: string;
}

interface ScarfCertaintyProps {
  lastScannedDays?: number;
  sensorCount?: number;
  hasRtkPrecision?: boolean;
  timelineItems?: TimelineItem[];
  predictions?: Prediction[];
  scientificSources?: number;
  sensorLayers?: number;
  className?: string;
}

// ─── Default data ───

function defaultTimeline(): TimelineItem[] {
  const today = new Date();
  const addDays = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };

  return [
    {
      id: 'action',
      icon: <CheckCircle2 size={14} />,
      label: 'Rekommenderad åtgärd: Kontrollera fällor',
      date: addDays(2),
      detail: 'Baserat på temperaturprognos och svärmningsrisk',
      urgency: 'soon',
    },
    {
      id: 'swarming',
      icon: <Bug size={14} />,
      label: 'Nästa svärmningsriskfönster',
      date: `${addDays(5)} – ${addDays(12)}`,
      detail: 'Temperatur >18°C i 3+ dagar → hög svärmningsrisk',
      urgency: 'urgent',
    },
    {
      id: 'satellite',
      icon: <Satellite size={14} />,
      label: 'Nästa Sentinel-2-uppdatering',
      date: addDays(3),
      detail: 'Multispektral analys av NDVI-förändringar',
      urgency: 'normal',
    },
    {
      id: 'weather',
      icon: <CloudSun size={14} />,
      label: 'Nästa väderföns för drönarflygning',
      date: addDays(4),
      detail: 'Vindstyrka <5 m/s, ingen nederbörd, god sikt',
      urgency: 'normal',
    },
  ];
}

function defaultPredictions(): Prediction[] {
  return [
    {
      label: 'Barkborrerisknivå nästa 14 dagar',
      confidence: 87,
      explanation: 'Baserat på 2 000+ vetenskapliga källor + 3 sensorlager',
    },
    {
      label: 'Volymtillväxt denna säsong',
      confidence: 92,
      explanation: 'Baserat på historisk data, markfuktighet och temperatur',
    },
  ];
}

// ─── Helpers ───

function urgencyColor(urgency: TimelineItem['urgency']): string {
  switch (urgency) {
    case 'urgent':
      return '#ef4444';
    case 'soon':
      return '#eab308';
    default:
      return 'var(--green)';
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return '#4ade80';
  if (confidence >= 65) return '#eab308';
  return '#ef4444';
}

// ─── Component ───

export function ScarfCertainty(props: ScarfCertaintyProps) {
  const {
    lastScannedDays = 4,
    sensorCount = 3,
    hasRtkPrecision = true,
    timelineItems,
    predictions,
    scientificSources = 2000,
    sensorLayers = 3,
    className = '',
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);

  const timeline = timelineItems ?? defaultTimeline();
  const preds = predictions ?? defaultPredictions();

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 ${className}`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Clock size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">Vad händer härnäst?</h3>
            <span className="text-[10px] text-[var(--text3)]">Kommande händelser och prognoser</span>
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

      {/* Freshness + data quality */}
      <div className="flex items-center gap-3 mb-3 text-[10px]">
        <div className="flex items-center gap-1 text-[var(--text2)]">
          <Satellite size={10} className="text-[var(--green)]" />
          <span>
            Senast skannad:{' '}
            <span className={lastScannedDays <= 5 ? 'text-[var(--green)]' : 'text-[#eab308]'}>
              {lastScannedDays} dagar sedan
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)]">
          <Shield size={8} />
          <span>
            Hög datakvalitet — {sensorCount} sensorer{hasRtkPrecision ? ', RTK-precision' : ''}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2 mb-3">
        {timeline.map((item) => (
          <div key={item.id} className="flex items-start gap-2 group">
            <div className="relative flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${urgencyColor(item.urgency)}20`,
                  color: urgencyColor(item.urgency),
                }}
              >
                {item.icon}
              </div>
              {/* Timeline connector */}
              <div className="w-px h-full bg-[var(--border)] absolute top-7" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--text)]">{item.label}</span>
                <span
                  className="text-[10px] font-mono flex-shrink-0 ml-2"
                  style={{ color: urgencyColor(item.urgency) }}
                >
                  {item.date}
                </span>
              </div>
              {item.detail && (
                <p className="text-[10px] text-[var(--text3)] mt-0.5">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Predictions with confidence */}
      {expanded && (
        <div className="pt-3 border-t border-[var(--border)] space-y-2">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
            AI-prognoser
          </p>
          {preds.map((pred) => (
            <div key={pred.label} className="p-2 rounded-lg bg-[var(--bg3)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text)]">{pred.label}</span>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: confidenceColor(pred.confidence) }}
                >
                  {pred.confidence}% säkerhet
                </span>
              </div>
              {/* Confidence bar */}
              <div className="h-1 rounded-full bg-[var(--bg2)] overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pred.confidence}%`,
                    backgroundColor: confidenceColor(pred.confidence),
                  }}
                />
              </div>
              <button
                onClick={() =>
                  setExpandedTooltip(expandedTooltip === pred.label ? null : pred.label)
                }
                className="flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
              >
                <Info size={10} />
                {expandedTooltip === pred.label ? 'Dölj förklaring' : 'Varför denna prognos?'}
              </button>
              {expandedTooltip === pred.label && (
                <p className="mt-1 text-[10px] text-[var(--text3)] pl-3.5 border-l border-[var(--green)]/30">
                  {pred.explanation}
                </p>
              )}
            </div>
          ))}

          <p className="text-[10px] text-[var(--text3)] mt-2">
            <Info size={10} className="inline mr-1" />
            Baserat på {scientificSources} vetenskapliga källor + {sensorLayers} sensorlager
          </p>
        </div>
      )}
    </div>
  );
}
export default ScarfCertainty;
