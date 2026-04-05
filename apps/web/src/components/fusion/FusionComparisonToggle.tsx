import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Satellite,
  Layers,
  Clock,
  Grid3X3,
  Radio,
  Wind,
  ChevronRight,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────── */

interface FusionComparisonToggleProps {
  parcelName: string;
  satelliteOnly: {
    ndvi: number;
    riskLevel: string;
    confidence: number;
    detectionDelay: string;
    resolution: string;
    sources: number;
  };
  beetlesenseFusion: {
    ndvi: number;
    riskLevel: string;
    confidence: number;
    detectionDelay: string;
    resolution: string;
    sources: number;
    eNoseActive: boolean;
  };
}

/* ── Risk color helper ─────────────────────────────────────────── */

function riskColor(level: string): string {
  const l = level.toLowerCase();
  if (l === 'low' || l === 'healthy') return 'var(--risk-low)';
  if (l === 'medium' || l === 'moderate') return 'var(--risk-mid)';
  return 'var(--risk-high)';
}

/* ── NDVI bar sub-component ────────────────────────────────────── */

function NdviBar({ value, muted }: { value: number; muted?: boolean }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden bg-[var(--bg3)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: muted
            ? '#8ca88c'
            : 'var(--grad-premium, linear-gradient(135deg, var(--green), var(--green-deep)))',
          opacity: muted ? 0.6 : 1,
        }}
      />
    </div>
  );
}

/* ── Metric row sub-component ──────────────────────────────────── */

function MetricRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon
        size={14}
        className={highlight ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
      />
      <span className="text-xs text-[var(--text3)] flex-1">{label}</span>
      <span
        className="text-xs font-semibold"
        style={{
          color: highlight ? 'var(--green)' : 'var(--text2)',
          fontFamily: 'var(--font-main)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */

export function FusionComparisonToggle({
  parcelName,
  satelliteOnly,
  beetlesenseFusion,
}: FusionComparisonToggleProps) {
  const { t } = useTranslation();
  const [showFusion, setShowFusion] = useState(false);

  return (
    <div
      className="noise-texture relative border border-[var(--border)] bg-[var(--bg2)] overflow-hidden"
      style={{ borderRadius: 'var(--radius-xl, 1.5rem)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3
          className="text-lg font-semibold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {t('fusion.toggle.title', { defaultValue: 'Why fusion matters' })}
        </h3>
        <p className="text-xs text-[var(--text3)] mt-0.5">
          {parcelName}
        </p>
      </div>

      {/* Toggle switch */}
      <div className="flex items-center justify-center gap-3 px-5 pb-4">
        <span
          className="text-xs font-medium transition-colors duration-300"
          style={{ color: !showFusion ? 'var(--text)' : 'var(--text3)' }}
        >
          {t('fusion.toggle.satelliteOnly', { defaultValue: 'Satellite Only' })}
        </span>

        <button
          type="button"
          onClick={() => setShowFusion((v) => !v)}
          className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)]"
          style={{
            backgroundColor: showFusion ? 'var(--green)' : 'var(--bg3)',
            border: `1px solid ${showFusion ? 'var(--green)' : 'var(--border2)'}`,
          }}
          aria-label="Toggle between satellite only and BeetleSense fusion"
        >
          <span
            className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300"
            style={{
              transform: showFusion ? 'translateX(30px)' : 'translateX(4px)',
            }}
          />
        </button>

        <span
          className="text-xs font-medium transition-colors duration-300"
          style={{ color: showFusion ? 'var(--green)' : 'var(--text3)' }}
        >
          {t('fusion.toggle.fusionLabel', { defaultValue: 'BeetleSense Fusion' })}
        </span>
      </div>

      {/* Comparison panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-px bg-[var(--border)]">
        {/* LEFT: Satellite Only */}
        <div
          className="p-5 transition-opacity duration-500"
          style={{
            backgroundColor: 'var(--bg3)',
            opacity: showFusion ? 0.45 : 1,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Satellite size={16} className="text-[var(--text3)]" />
            <span
              className="text-sm font-semibold uppercase tracking-wide text-[var(--text3)]"
              style={{ fontFamily: 'var(--font-main)' }}
            >
              {t('fusion.toggle.satelliteOnly', { defaultValue: 'Satellite Only' })}
            </span>
          </div>

          {/* NDVI */}
          <div className="mb-3">
            <div className="flex items-baseline gap-1 mb-1">
              <span
                className="text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text2)',
                  transition: 'all 0.5s ease',
                  transform: showFusion ? 'scale(0.95)' : 'scale(1)',
                  display: 'inline-block',
                }}
              >
                {satelliteOnly.ndvi.toFixed(2)}
              </span>
              <span className="text-[10px] text-[var(--text3)]">NDVI</span>
            </div>
            <NdviBar value={satelliteOnly.ndvi} muted />
          </div>

          {/* Risk */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text3)]">Risk:</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: riskColor(satelliteOnly.riskLevel), opacity: 0.7 }}
            >
              {satelliteOnly.riskLevel}
            </span>
          </div>

          {/* Confidence */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-[var(--text3)]">Confidence</span>
              <span className="text-[10px] text-[var(--text3)]">{satelliteOnly.confidence}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${satelliteOnly.confidence}%`,
                  backgroundColor: '#8ca88c',
                }}
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="border-t border-[var(--border)] pt-2 mt-2 space-y-0.5">
            <MetricRow icon={Clock} label="Detection delay" value={satelliteOnly.detectionDelay} />
            <MetricRow icon={Grid3X3} label="Resolution" value={satelliteOnly.resolution} />
          </div>

          {/* Source badge */}
          <div className="mt-3">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[var(--border2)] text-[var(--text3)] bg-[var(--bg)]"
            >
              <Satellite size={10} />
              {satelliteOnly.sources} source
            </span>
          </div>
        </div>

        {/* RIGHT: BeetleSense Fusion */}
        <div
          className="p-5 transition-opacity duration-500 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg2)',
            opacity: showFusion ? 1 : 0.55,
          }}
        >
          {/* Floating data particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: i % 2 === 0 ? 4 : 3,
                  height: i % 2 === 0 ? 4 : 3,
                  background: i < 2 ? 'var(--green)' : i < 4 ? 'var(--banana)' : 'var(--text3)',
                  opacity: 0.25 + (i * 0.05),
                  left: `${12 + i * 14}%`,
                  animation: `fct-float ${6 + i * 1.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-[var(--green)]" />
            <span
              className="text-sm font-semibold uppercase tracking-wide"
              style={{
                fontFamily: 'var(--font-main)',
                background: 'var(--grad-premium)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('fusion.toggle.fusionLabel', { defaultValue: 'BeetleSense Fusion' })}
            </span>
          </div>

          {/* NDVI */}
          <div className="mb-3">
            <div className="flex items-baseline gap-1 mb-1">
              <span
                className="text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text)',
                  transition: 'all 0.5s ease',
                  transform: showFusion ? 'scale(1)' : 'scale(0.95)',
                  display: 'inline-block',
                }}
              >
                {beetlesenseFusion.ndvi.toFixed(2)}
              </span>
              <span className="text-[10px] text-[var(--text3)]">NDVI</span>
            </div>
            <NdviBar value={beetlesenseFusion.ndvi} />
          </div>

          {/* Risk */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text3)]">Risk:</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: riskColor(beetlesenseFusion.riskLevel) }}
            >
              {beetlesenseFusion.riskLevel}
            </span>
          </div>

          {/* Confidence */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-[var(--text3)]">Confidence</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: 'var(--green)' }}
              >
                {beetlesenseFusion.confidence}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg3)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${beetlesenseFusion.confidence}%`,
                  background: 'var(--grad-premium)',
                }}
              />
            </div>
          </div>

          {/* Metrics — highlighted */}
          <div className="border-t border-[var(--border)] pt-2 mt-2 space-y-0.5">
            <MetricRow
              icon={Clock}
              label="Detection delay"
              value={beetlesenseFusion.detectionDelay}
              highlight
            />
            <MetricRow
              icon={Grid3X3}
              label="Resolution"
              value={beetlesenseFusion.resolution}
              highlight
            />
          </div>

          {/* Source badges */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
              style={{
                background: 'var(--grad-premium)',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Layers size={10} />
              {beetlesenseFusion.sources} sources
            </span>

            {beetlesenseFusion.eNoseActive && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{
                  background: 'var(--grad-banana)',
                  color: '#78350f',
                  boxShadow: '0 0 8px var(--banana-glow)',
                }}
              >
                <Wind size={10} />
                E-nose active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-[var(--green)] shrink-0" />
          <p
            className="text-[11px] text-[var(--text3)] leading-snug"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t('fusion.toggle.caption', {
              defaultValue:
                'Multi-source fusion identifies threats faster and with higher confidence than satellite alone.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FusionComparisonToggle;
