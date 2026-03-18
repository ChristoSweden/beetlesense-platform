import { useState } from 'react';

/* ─── Types ─── */
export interface DataSource {
  name: string;
  type: 'sensor' | 'satellite' | 'scientific' | 'historical' | 'model' | 'opendata';
}

export interface DataConfidenceProps {
  /** Confidence percentage (0-100) */
  confidence: number;
  /** Data sources that contributed to this prediction */
  sources?: DataSource[];
  /** Number of scientific sources referenced */
  scientificSources?: number;
  /** Number of sensor layers used */
  sensorLayers?: number;
  /** History depth (e.g. "4 manaders historik") */
  historyDepth?: string;
  /** Model version identifier */
  modelVersion?: string;
  /** Explanation of what could increase confidence */
  increaseFactors?: string[];
  /** Explanation of what could decrease confidence */
  decreaseFactors?: string[];
  /** Compact mode: shows only the bar, no text */
  compact?: boolean;
  className?: string;
}

function getConfidenceColor(confidence: number): {
  text: string;
  bg: string;
  fill: string;
  label: string;
} {
  if (confidence >= 80) {
    return {
      text: 'text-green-400',
      bg: 'bg-green-400/15',
      fill: 'bg-green-400',
      label: 'Hog konfidens',
    };
  }
  if (confidence >= 60) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-400/15',
      fill: 'bg-amber-400',
      label: 'Medel konfidens',
    };
  }
  return {
    text: 'text-red-400',
    bg: 'bg-red-400/15',
    fill: 'bg-red-400',
    label: 'Lag konfidens',
  };
}

const SOURCE_TYPE_LABELS: Record<DataSource['type'], string> = {
  sensor: 'Sensor',
  satellite: 'Satellit',
  scientific: 'Vetenskaplig',
  historical: 'Historisk',
  model: 'ML-modell',
  opendata: 'Oppen data',
};

export function DataConfidence({
  confidence,
  sources = [],
  scientificSources,
  sensorLayers,
  historyDepth,
  modelVersion,
  increaseFactors = [],
  decreaseFactors = [],
  compact = false,
  className = '',
}: DataConfidenceProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const color = getConfidenceColor(confidence);
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  // Build summary line
  const summaryParts: string[] = [];
  if (sensorLayers != null) summaryParts.push(`${sensorLayers} sensorlager`);
  if (scientificSources != null) summaryParts.push(`${scientificSources} vetenskapliga kallor`);
  if (historyDepth) summaryParts.push(historyDepth);
  const summaryText = summaryParts.length > 0 ? `Baserat pa: ${summaryParts.join(', ')}` : null;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={`Konfidens: ${clampedConfidence}% \u2014 ${color.label}`}
      >
        <div className="h-1.5 w-10 rounded-full bg-[var(--border)]">
          <div
            className={`h-full rounded-full ${color.fill} transition-all`}
            style={{ width: `${clampedConfidence}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono ${color.text}`}>{clampedConfidence}%</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${color.text}`}>
            Konfidens
          </span>
          <span className={`text-sm font-mono font-semibold ${color.text}`}>
            {clampedConfidence}%
          </span>
        </div>

        {modelVersion && (
          <span className="text-[10px] font-mono text-[var(--text3)]">
            v{modelVersion}
          </span>
        )}
      </div>

      {/* Fill bar */}
      <div className="mt-2 h-2 w-full rounded-full bg-[var(--border)]">
        <div
          className={`h-full rounded-full ${color.fill} transition-all duration-500`}
          style={{ width: `${clampedConfidence}%` }}
        />
      </div>

      {/* Summary hover area */}
      {summaryText && (
        <button
          className="mt-1.5 w-full text-left"
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
          onClick={() => setShowDetails(!showDetails)}
        >
          <p className="text-[10px] text-[var(--text3)] leading-relaxed">{summaryText}</p>
        </button>
      )}

      {/* Expanded data sources */}
      {showDetails && sources.length > 0 && (
        <div className="mt-2 border-t border-[var(--border)] pt-2">
          <p className="mb-1 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">
            Datakallor
          </p>
          <div className="flex flex-wrap gap-1">
            {sources.map((source, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-md ${color.bg} px-2 py-0.5 text-[10px] ${color.text}`}
              >
                <span className="opacity-60">{SOURCE_TYPE_LABELS[source.type]}</span>
                <span className="font-medium">{source.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* "Varfor denna konfidens?" expandable */}
      {(increaseFactors.length > 0 || decreaseFactors.length > 0) && (
        <div className="mt-2">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-[10px] text-[var(--green-dim)] transition-colors hover:text-[var(--green)]"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showExplanation ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Varfor denna konfidens?
          </button>

          {showExplanation && (
            <div className="mt-1.5 space-y-1.5 pl-4">
              {increaseFactors.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-green-400/70">
                    Okar konfidens:
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {increaseFactors.map((f, i) => (
                      <li key={i} className="text-[10px] text-[var(--text3)] flex items-start gap-1">
                        <span className="text-green-400/50 mt-0.5">+</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {decreaseFactors.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-amber-400/70">
                    Minskar konfidens:
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {decreaseFactors.map((f, i) => (
                      <li key={i} className="text-[10px] text-[var(--text3)] flex items-start gap-1">
                        <span className="text-amber-400/50 mt-0.5">\u2013</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
