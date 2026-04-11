import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ArrowRight,
  Satellite,
  Thermometer,
  Bug,
  BarChart3,
  Sparkles,
  FileText,
  GitCompareArrows,
  Layers,
  Activity,
  Grid3x3,
  Radar,
} from 'lucide-react';
import { ForestFusionView } from '@/components/fusion/ForestFusionView';
import type { ParcelData } from '@/components/fusion/ForestFusionView';

/* ═══════════════════════════════════════════════════════════════
   FusionDashboardPage — The hero page for multi-source data fusion.
   Now integrates: Forest Fusion View, Temporal Timeline, Correlation
   Matrix, Signal Convergence Radar, and Data Confidence Matrix.
   ═══════════════════════════════════════════════════════════════ */

// ─── Lazy-loaded fusion components ───

const TemporalFusionTimeline = lazy(
  () => import('@/components/fusion/TemporalFusionTimeline'),
);
const MultiSourceCorrelationPanel = lazy(
  () => import('@/components/fusion/MultiSourceCorrelationPanel'),
);
const SignalConvergenceRadar = lazy(
  () => import('@/components/fusion/SignalConvergenceRadar'),
);
const DataConfidenceMatrix = lazy(
  () => import('@/components/fusion/DataConfidenceMatrix'),
);

// ─── Demo data imports (lazy — only used for demo) ───

import {
  DEMO_TEMPORAL_DATA,
  DEMO_CORRELATION_EVENTS,
} from '@/components/fusion/TemporalFusionTimeline';
import {
  DEMO_SOURCES,
  DEMO_CORRELATIONS,
} from '@/components/fusion/MultiSourceCorrelationPanel';
import {
  DEMO_AXES,
  DEMO_PREVIOUS_AXES,
} from '@/components/fusion/SignalConvergenceRadar';
import {
  DEMO_ZONES,
  DEMO_SOURCES as DEMO_MATRIX_SOURCES,
} from '@/components/fusion/DataConfidenceMatrix';

// ─── Demo Parcels ───

const DEMO_PARCELS: ParcelData[] = [
  {
    id: 'norra',
    name: 'Norra Skiftet',
    healthPercent: 92,
    timberValueKr: '12.4M kr',
    hotspots: [
      {
        id: 'ns-1',
        cx: 150,
        cy: 310,
        riskLevel: 'high',
        label: 'Beetle risk: High',
        locationName: 'SW Corner',
        riskType: 'Bark beetle (Ips typographus)',
        severity: 'High — active boring detected',
        financialImpact: '520,000 kr at risk',
        action: 'Schedule drone survey within 48h',
      },
    ],
    healthProfile: 'healthy',
    fusionSentence:
      'Your forest is **92% healthy**. Beetle risk is concentrated in the **southwest corner** near Ekbacken. Timber value: **12.4M kr**. **No action needed this week.**',
    actionState: 'healthy',
  },
  {
    id: 'ekbacken',
    name: 'Ekbacken',
    healthPercent: 71,
    timberValueKr: '8.2M kr',
    hotspots: [
      {
        id: 'ek-1',
        cx: 170,
        cy: 290,
        riskLevel: 'high',
        label: 'Beetle risk: High',
        locationName: 'South Ridge',
        riskType: 'Bark beetle (Ips typographus)',
        severity: 'High — confirmed infestation',
        financialImpact: '840,000 kr at risk',
        action: 'Immediate sanitation harvest recommended',
      },
      {
        id: 'ek-2',
        cx: 310,
        cy: 180,
        riskLevel: 'moderate',
        label: 'Beetle risk: Moderate',
        locationName: 'East Slope',
        riskType: 'Bark beetle (early stress)',
        severity: 'Moderate — NDVI decline detected',
        financialImpact: '320,000 kr at risk',
        action: 'Monitor weekly; drone verification advised',
      },
    ],
    healthProfile: 'moderate',
    fusionSentence:
      'Ekbacken shows **71% health** with **two active hotspots**. The south ridge has confirmed beetle activity — **840,000 kr at risk**. **Book a drone survey this week.**',
    actionState: 'at-risk',
  },
  {
    id: 'tallmon',
    name: 'Tallmon',
    healthPercent: 97,
    timberValueKr: '15.1M kr',
    hotspots: [],
    healthProfile: 'healthy',
    fusionSentence:
      'Tallmon is in **excellent condition** at **97% health**. No beetle activity detected. High-value mature timber: **15.1M kr**. **No action needed.**',
    actionState: 'healthy',
  },
];

// ─── Section Tabs ───

type SectionId = 'overview' | 'temporal' | 'correlation' | 'radar' | 'confidence';

interface SectionTab {
  id: SectionId;
  labelKey: string;
  fallback: string;
  icon: typeof Layers;
}

const SECTIONS: SectionTab[] = [
  { id: 'overview', labelKey: 'fusion.overview', fallback: 'Spatial Overview', icon: Layers },
  { id: 'temporal', labelKey: 'fusion.temporalTitle', fallback: 'Temporal Fusion', icon: Activity },
  { id: 'correlation', labelKey: 'fusion.correlationMatrix', fallback: 'Signal Correlation', icon: Grid3x3 },
  { id: 'radar', labelKey: 'signalRadar.title', fallback: 'Signal Convergence', icon: Radar },
  { id: 'confidence', labelKey: 'fusion.confidenceMatrix', fallback: 'Source Agreement', icon: BarChart3 },
];

// ─── Helpers ───

function renderFusionSentence(raw: string) {
  const parts = raw.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-[var(--green)] font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function SectionLoader() {
  return (
    <div
      className="flex items-center justify-center py-20"
      style={{ color: 'var(--text3)' }}
    >
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin mr-3"
        style={{
          borderColor: 'var(--border)',
          borderTopColor: 'var(--green)',
        }}
      />
      Loading...
    </div>
  );
}

// ─── Component ───

export default function FusionDashboardPage() {
  const { t } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedZone, setSelectedZone] = useState<string | undefined>();
  const parcel = DEMO_PARCELS[selectedIdx];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* ─── Header Row ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-semibold text-[var(--text)]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t('fusion.dashboardTitle', 'Forest Intelligence Fusion')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-0.5">
            {t('fusion.dashboardSubtitle', 'All data sources, correlated and visualized')}
          </p>
        </div>

        {/* Parcel Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text)] border border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--green)] transition-colors press-effect"
          >
            <span>{parcel.name}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-xl z-30 overflow-hidden animate-fade-in">
              {DEMO_PARCELS.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    idx === selectedIdx
                      ? 'bg-[var(--green)]/10 text-[var(--green)] font-medium'
                      : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <span className="block">{p.name}</span>
                  <span className="text-[10px] text-[var(--text3)]">
                    {p.healthPercent}% healthy
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section Navigation Tabs ─── */}
      <div
        className="flex items-center gap-1 overflow-x-auto px-1 py-1 rounded-lg"
        style={{ background: 'var(--bg3)' }}
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all press-effect"
              style={{
                background: isActive ? 'var(--bg2)' : 'transparent',
                color: isActive ? 'var(--green)' : 'var(--text3)',
                border: isActive
                  ? '1px solid var(--border)'
                  : '1px solid transparent',
                boxShadow: isActive
                  ? '0 1px 3px rgba(0,0,0,0.12)'
                  : 'none',
              }}
            >
              <Icon size={13} />
              {t(section.labelKey, section.fallback)}
            </button>
          );
        })}
      </div>

      {/* ─── Active Section Content ─── */}
      <Suspense fallback={<SectionLoader />}>
        {/* Overview: existing ForestFusionView + summary */}
        {activeSection === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            <ForestFusionView parcel={parcel} />

            {/* Fusion Summary Panel */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-5 space-y-4">
              <p
                className="text-base leading-relaxed text-[var(--text)]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '1.15rem',
                  lineHeight: 1.7,
                }}
              >
                {renderFusionSentence(parcel.fusionSentence)}
              </p>

              {/* Source Attribution */}
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                  Sources
                </span>
                <SourceBadge icon={<Satellite size={12} />} label="Sentinel-2" />
                <SourceBadge icon={<Thermometer size={12} />} label="SMHI" />
                <SourceBadge icon={<Bug size={12} />} label="Skogsstyrelsen" />
                <SourceBadge icon={<BarChart3 size={12} />} label="BeetleSense AI" />
                <span className="text-[10px] text-[var(--text3)] ml-auto">
                  Updated 2 hours ago
                </span>
              </div>

              {/* Quick Actions */}
              <div
                className="flex flex-wrap gap-2 pt-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {parcel.actionState === 'healthy' ? (
                  <>
                    <ActionButton to="/owner/reports" icon={<FileText size={14} />} label="Export Report" />
                    <ActionButton to="/owner/timber-market" icon={<BarChart3 size={14} />} label="Check Timber Prices" />
                    <ActionButton to="/owner/wingman" icon={<Sparkles size={14} />} label="Ask Wingman" primary />
                  </>
                ) : (
                  <>
                    <ActionButton to="/owner/surveys" icon={<Satellite size={14} />} label="Book Drone Survey" primary />
                    <ActionButton to="/owner/microclimate" icon={<Bug size={14} />} label="View Beetle Forecast" />
                    <ActionButton to="/owner/avverkningsanmalan" icon={<FileText size={14} />} label="Report to Skogsstyrelsen" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Temporal Fusion Timeline */}
        {activeSection === 'temporal' && (
          <div className="animate-fade-in">
            <TemporalFusionTimeline
              data={DEMO_TEMPORAL_DATA}
              correlationEvents={DEMO_CORRELATION_EVENTS}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>
        )}

        {/* Multi-Source Correlation Panel */}
        {activeSection === 'correlation' && (
          <div className="animate-fade-in">
            <MultiSourceCorrelationPanel
              sources={DEMO_SOURCES}
              correlations={DEMO_CORRELATIONS}
            />
          </div>
        )}

        {/* Signal Convergence Radar */}
        {activeSection === 'radar' && (
          <div className="animate-fade-in flex justify-center">
            <SignalConvergenceRadar
              axes={DEMO_AXES}
              compoundRisk={62}
              previousAxes={DEMO_PREVIOUS_AXES}
              animateIn
            />
          </div>
        )}

        {/* Data Confidence Matrix */}
        {activeSection === 'confidence' && (
          <div className="animate-fade-in">
            <DataConfidenceMatrix
              zones={DEMO_ZONES}
              sources={DEMO_MATRIX_SOURCES}
              selectedZone={selectedZone}
              onZoneSelect={setSelectedZone}
            />
          </div>
        )}
      </Suspense>

      {/* ─── Compare Over Time Link ─── */}
      <div className="flex justify-end">
        <Link
          to="/owner/satellite-compare"
          className="flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
        >
          <GitCompareArrows size={13} />
          Compare over time
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SourceBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
      {icon}
      {label}
    </span>
  );
}

function ActionButton({
  to,
  icon,
  label,
  primary,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors press-effect ${
        primary
          ? 'bg-[var(--green)] text-white hover:brightness-110'
          : 'bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
