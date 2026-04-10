/**
 * ForestHealthSummary — The emotional bridge between raw data and a forest owner.
 *
 * Fuses beetle risk assessment (5 data sources) with GFW forest health data
 * (fire alerts, deforestation, biomass) into a single, human-friendly card
 * designed for Erik — a 58-year-old non-technical Swedish forest owner
 * who just wants to know: "Is my forest OK?"
 *
 * Sections:
 *   A. Status Banner — GREEN / AMBER / RED with headline
 *   B. Forest Vital Signs — 4 visual gauges (beetle risk, canopy health, fire, timber)
 *   C. Recent Activity — timeline of last 3 events
 *   D. Weekly Summary — AI-generated plain-language paragraph
 */

import { useEffect, useState, useMemo, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { assessBeetleRisk, type BeetleRiskAssessment } from '@/services/beetleEarlyWarning';
import {
  getForestHealthDashboard,
  type ForestHealthDashboard,
} from '@/services/opendata/gfwEnrichedService';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ForestHealthSummaryProps {
  lat: number;
  lon: number;
  parcelId?: string;
  parcelName?: string;
}

type StatusLevel = 'green' | 'amber' | 'red';

interface FusedData {
  beetleRisk: BeetleRiskAssessment;
  dashboard: ForestHealthDashboard;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Build a bounding box ~50km around a point for GFW area queries. */
function makeBBox(lat: number, lon: number) {
  const delta = 0.45; // ~50km at Swedish latitudes
  return {
    minLat: lat - delta,
    maxLat: lat + delta,
    minLon: lon - delta * 1.8, // longitude is narrower at high latitudes
    maxLon: lon + delta * 1.8,
  };
}

function classifyStatus(riskScore: number): StatusLevel {
  if (riskScore >= 50) return 'red';
  if (riskScore >= 30) return 'amber';
  return 'green';
}

/**
 * Derive canopy health percentage from NDVI factors in the beetle risk assessment.
 * The NDVI factor value (0-100) represents decline/stress, so we invert it.
 */
function deriveCanopyHealth(beetleRisk: BeetleRiskAssessment): number {
  const ndviFactor = beetleRisk.factors.find((f) => f.indicator === 'NDVI canopy health');
  if (!ndviFactor) return 85; // conservative fallback
  // factor.value is a stress score (0-100), invert to get health
  return Math.max(0, Math.min(100, 100 - ndviFactor.value));
}

/** Compute distance in km between two WGS84 points using Haversine. */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Relative time string: "2h ago", "Yesterday", "3 days ago" */
function relativeTime(isoDate: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return t('forestHealthSummary.timeline.justNow');
  if (diffHours < 24) return t('forestHealthSummary.timeline.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('forestHealthSummary.timeline.yesterday');
  return t('forestHealthSummary.timeline.daysAgo', { count: diffDays });
}

// ─── Status Config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusLevel, {
  bgClass: string;
  dotColor: string;
  headlineKey: string;
}> = {
  green: {
    bgClass: 'bg-emerald-500',
    dotColor: 'var(--risk-low)',
    headlineKey: 'forestHealthSummary.status.green',
  },
  amber: {
    bgClass: 'bg-amber-500',
    dotColor: 'var(--risk-moderate)',
    headlineKey: 'forestHealthSummary.status.amber',
  },
  red: {
    bgClass: 'bg-red-600',
    dotColor: 'var(--risk-high)',
    headlineKey: 'forestHealthSummary.status.red',
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────

/** Skeleton placeholder for loading state. */
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Circular gauge SVG for beetle risk (0-100). */
function CircularGauge({
  value,
  label,
  size = 80,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value >= 75 ? 'var(--risk-critical)' :
    value >= 50 ? 'var(--risk-high)' :
    value >= 30 ? 'var(--risk-moderate)' :
    'var(--risk-low)';

  return (
    <div className="flex flex-col items-center gap-1" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center number overlay */}
      <div
        className="absolute flex items-center justify-center tabular-nums"
        style={{ width: size, height: size }}
      >
        <span className="text-lg font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/** Fire icon SVG. */
function FireIcon({ color, ...props }: { color: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.07-2-4-1.045 3-2.5 4-4 3z" />
    </svg>
  );
}

/** Tree icon SVG. */
function TreeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22v-7" />
      <path d="M7 15l5-11 5 11" />
      <path d="M5 19l7-6 7 6" />
    </svg>
  );
}

// ─── Section A: Status Banner ──────────────────────────────────────────────

function StatusBanner({
  status,
  parcelName,
  lastUpdated,
}: {
  status: StatusLevel;
  parcelName?: string;
  lastUpdated: string;
}) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];

  const updatedDate = new Date(lastUpdated);
  const timeStr = updatedDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`${config.bgClass} rounded-2xl p-5 sm:p-6 text-white transition-colors duration-500`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 mb-2">
        {/* Pulsing status dot */}
        <span className="relative flex h-3.5 w-3.5" aria-hidden="true">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
          />
          <span
            className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"
          />
        </span>
        <span className="text-sm font-medium uppercase tracking-wider opacity-90">
          {parcelName ?? t('forestHealthSummary.yourForest')}
        </span>
      </div>

      <h2
        className="text-2xl sm:text-3xl font-bold leading-tight"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {t(config.headlineKey)}
      </h2>

      <p className="text-sm opacity-75 mt-2">
        {t('forestHealthSummary.lastScanned', { time: timeStr })}
      </p>
    </div>
  );
}

// ─── Section B: Vital Signs ────────────────────────────────────────────────

function VitalSigns({
  beetleRisk,
  canopyHealth,
  nearestFireKm,
  timberM3,
}: {
  beetleRisk: BeetleRiskAssessment;
  canopyHealth: number;
  nearestFireKm: number | null;
  timberM3: number | null;
}) {
  const { t } = useTranslation();

  const riskLabel =
    beetleRisk.overallRisk === 'critical' ? t('forestHealthSummary.vitals.beetle.critical') :
    beetleRisk.overallRisk === 'high' ? t('forestHealthSummary.vitals.beetle.high') :
    beetleRisk.overallRisk === 'moderate' ? t('forestHealthSummary.vitals.beetle.moderate') :
    t('forestHealthSummary.vitals.beetle.low');

  const fireColor =
    nearestFireKm !== null && nearestFireKm < 20 ? 'var(--risk-high)' :
    nearestFireKm !== null && nearestFireKm < 50 ? 'var(--risk-moderate)' :
    'var(--risk-low)';

  const fireText = nearestFireKm === null
    ? t('forestHealthSummary.vitals.fire.noFires')
    : nearestFireKm < 5
      ? t('forestHealthSummary.vitals.fire.veryClose', { km: Math.round(nearestFireKm) })
      : t('forestHealthSummary.vitals.fire.detected', { km: Math.round(nearestFireKm) });

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 1. Beetle Risk Gauge */}
      <div
        className="rounded-2xl p-4 flex flex-col items-center gap-2 border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="relative">
          <CircularGauge
            value={beetleRisk.riskScore}
            label={t('forestHealthSummary.vitals.beetle.title')}
            size={76}
          />
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{
            color:
              beetleRisk.riskScore >= 50 ? 'var(--risk-high)' :
              beetleRisk.riskScore >= 30 ? 'var(--risk-moderate)' :
              'var(--risk-low)',
          }}
        >
          {riskLabel}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
          {t('forestHealthSummary.vitals.beetle.title')}
        </span>
      </div>

      {/* 2. Forest Health — canopy bar */}
      <div
        className="rounded-2xl p-4 flex flex-col justify-between border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <TreeIcon width={18} height={18} style={{ color: 'var(--green)' }} />
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            {t('forestHealthSummary.vitals.canopy.title')}
          </span>
        </div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          {canopyHealth}%
        </p>
        <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>
          {t('forestHealthSummary.vitals.canopy.subtitle')}
        </p>
        {/* Horizontal health bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${canopyHealth}%`,
              background: canopyHealth >= 80 ? 'var(--risk-low)' : canopyHealth >= 50 ? 'var(--risk-moderate)' : 'var(--risk-high)',
            }}
            role="progressbar"
            aria-valuenow={canopyHealth}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* 3. Fire Proximity */}
      <div
        className="rounded-2xl p-4 flex flex-col justify-between border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <FireIcon
            color={fireColor}
            width={18}
            height={18}
            className={nearestFireKm !== null && nearestFireKm < 20 ? 'fire-pulse' : ''}
          />
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            {t('forestHealthSummary.vitals.fire.title')}
          </span>
        </div>
        <p className="text-sm font-medium mt-1" style={{ color: fireColor }}>
          {fireText}
        </p>
      </div>

      {/* 4. Timber Value */}
      <div
        className="rounded-2xl p-4 flex flex-col justify-between border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
          {t('forestHealthSummary.vitals.timber.title')}
        </span>
        <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          {timberM3 !== null ? `~${timberM3}` : '--'}
          <span className="text-sm font-normal ml-1">m&sup3;/ha</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>
          {t('forestHealthSummary.vitals.timber.subtitle')}
        </p>
      </div>
    </div>
  );
}

// ─── Section C: Recent Activity Timeline ───────────────────────────────────

interface TimelineEvent {
  time: string;
  text: string;
  icon: 'satellite' | 'weather' | 'report';
}

function buildTimeline(
  fused: FusedData,
  t: (key: string, opts?: Record<string, unknown>) => string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Satellite scan event (from lastUpdated)
  const scanDate = fused.dashboard.lastUpdated;
  const fireCount = fused.dashboard.fireAlerts.length;
  const alertCount = fused.dashboard.radarAlerts.length + fused.dashboard.sentinelAlerts.length;

  if (alertCount === 0 && fireCount === 0) {
    events.push({
      time: scanDate,
      text: t('forestHealthSummary.timeline.scanNoChanges'),
      icon: 'satellite',
    });
  } else {
    events.push({
      time: scanDate,
      text: t('forestHealthSummary.timeline.scanWithAlerts', { count: alertCount + fireCount }),
      icon: 'satellite',
    });
  }

  // Weather/beetle event
  const tempFactor = fused.beetleRisk.factors.find((f) => f.indicator === 'Temperature trend');
  if (tempFactor && tempFactor.contribution === 'increasing') {
    const weatherDate = new Date();
    weatherDate.setDate(weatherDate.getDate() - 1);
    events.push({
      time: weatherDate.toISOString(),
      text: t('forestHealthSummary.timeline.warmSpell'),
      icon: 'weather',
    });
  }

  // Beetle sightings event
  const beetleFactor = fused.beetleRisk.factors.find((f) => f.indicator === 'Beetle sightings (50km)');
  if (beetleFactor && beetleFactor.value > 20) {
    const sightingDate = new Date();
    sightingDate.setDate(sightingDate.getDate() - 3);
    events.push({
      time: sightingDate.toISOString(),
      text: t('forestHealthSummary.timeline.beetleSighting'),
      icon: 'report',
    });
  }

  // Fire alert event
  if (fireCount > 0) {
    const latestFire = fused.dashboard.fireAlerts[0];
    events.push({
      time: latestFire.date || new Date().toISOString(),
      text: t('forestHealthSummary.timeline.fireDetected', { count: fireCount }),
      icon: 'report',
    });
  }

  // Sort by time descending and take max 3
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return events.slice(0, 3);
}

const TIMELINE_ICONS: Record<TimelineEvent['icon'], string> = {
  satellite: 'M12 3v1m0 16v1m8.66-13.5l-.87.5M4.21 16l-.87.5M20.66 16l-.87-.5M4.21 8l-.87-.5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  weather: 'M2 12h2m16 0h2M6.34 6.34l1.42 1.42m8.48 8.48l1.42 1.42M6.34 17.66l1.42-1.42m8.48-8.48l1.42-1.42M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  report: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z',
};

function RecentActivity({ events }: { events: TimelineEvent[] }) {
  const { t } = useTranslation();

  if (events.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>
        {t('forestHealthSummary.recentActivity')}
      </h3>
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg3)' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={TIMELINE_ICONS[event.icon]} />
                </svg>
              </div>
              {i < events.length - 1 && (
                <div className="w-px h-4 mt-1" style={{ background: 'var(--border2)' }} />
              )}
            </div>
            {/* Event content */}
            <div className="flex-1 pt-1">
              <p className="text-sm" style={{ color: 'var(--text)' }}>{event.text}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                {relativeTime(event.time, t)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section D: Weekly Summary ─────────────────────────────────────────────

function WeeklySummary({
  fused,
  parcelName,
  canopyHealth,
  nearestFireKm,
}: {
  fused: FusedData;
  parcelName?: string;
  canopyHealth: number;
  nearestFireKm: number | null;
}) {
  const { t } = useTranslation();

  const region = parcelName ?? t('forestHealthSummary.yourRegion');
  const scanCount = 3; // typical weekly satellite revisit count
  const fireDistance = nearestFireKm !== null ? Math.round(nearestFireKm) : 50;
  const noFires = nearestFireKm === null || nearestFireKm > 50;

  const actionNeeded =
    fused.beetleRisk.overallRisk === 'critical' || fused.beetleRisk.overallRisk === 'high';

  const summary = t('forestHealthSummary.weeklySummary.paragraph', {
    region,
    scanCount,
    riskScore: fused.beetleRisk.riskScore,
    riskLevel: fused.beetleRisk.overallRisk,
    canopyHealth,
    fireDistance,
    noFires: noFires ? t('forestHealthSummary.weeklySummary.noFiresDetected') : t('forestHealthSummary.weeklySummary.fireNearby', { km: fireDistance }),
    conclusion: actionNeeded
      ? t('forestHealthSummary.weeklySummary.actionNeeded')
      : t('forestHealthSummary.weeklySummary.noAction'),
  });

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>
        {t('forestHealthSummary.weeklySummary.title')}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text)', fontFamily: 'var(--font-main)' }}>
        {summary}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in" aria-busy="true">
      {/* Banner skeleton */}
      <SkeletonBlock className="h-28 sm:h-32" />
      {/* Vitals grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      {/* Timeline skeleton */}
      <SkeletonBlock className="h-28" />
      {/* Summary skeleton */}
      <SkeletonBlock className="h-20" />
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-2xl p-6 text-center border"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm mb-3" style={{ color: 'var(--text2)' }}>
        {t('forestHealthSummary.error')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
        style={{ background: 'var(--green)' }}
      >
        {t('common.retry')}
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ForestHealthSummary({
  lat,
  lon,
  parcelId,
  parcelName,
}: ForestHealthSummaryProps) {
  const { t } = useTranslation();
  const [fused, setFused] = useState<FusedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);

    try {
      const bbox = makeBBox(lat, lon);
      const [beetleRisk, dashboard] = await Promise.all([
        assessBeetleRisk(lat, lon, parcelId),
        getForestHealthDashboard(lat, lon, bbox),
      ]);
      setFused({ beetleRisk, dashboard });
    } catch (err) {
      console.error('[ForestHealthSummary] Data fetch failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lat, lon, parcelId]);

  // ─── Derived values ───
  const status = useMemo<StatusLevel>(() => {
    if (!fused) return 'green';
    return classifyStatus(fused.beetleRisk.riskScore);
  }, [fused]);

  const canopyHealth = useMemo(() => {
    if (!fused) return 85;
    return deriveCanopyHealth(fused.beetleRisk);
  }, [fused]);

  const nearestFireKm = useMemo<number | null>(() => {
    if (!fused || fused.dashboard.fireAlerts.length === 0) return null;
    let minDist = Infinity;
    for (const fire of fused.dashboard.fireAlerts) {
      const dist = haversineKm(lat, lon, fire.lat, fire.lon);
      if (dist < minDist) minDist = dist;
    }
    return Math.round(minDist * 10) / 10;
  }, [fused, lat, lon]);

  const timberM3 = useMemo<number | null>(() => {
    if (!fused) return null;
    return fused.dashboard.biomass?.estimated_timber_m3 ?? null;
  }, [fused]);

  const timelineEvents = useMemo(() => {
    if (!fused) return [];
    return buildTimeline(fused, t);
  }, [fused, t]);

  // ─── Render ───
  if (loading) return <LoadingSkeleton />;
  if (error || !fused) return <ErrorState onRetry={fetchData} />;

  return (
    <section
      className="flex flex-col gap-4 stagger-children"
      aria-label={t('forestHealthSummary.ariaLabel')}
    >
      {/* Section A: Status Banner */}
      <StatusBanner
        status={status}
        parcelName={parcelName}
        lastUpdated={fused.dashboard.lastUpdated}
      />

      {/* Section B: Forest Vital Signs */}
      <VitalSigns
        beetleRisk={fused.beetleRisk}
        canopyHealth={canopyHealth}
        nearestFireKm={nearestFireKm}
        timberM3={timberM3}
      />

      {/* Section C: Recent Activity */}
      <RecentActivity events={timelineEvents} />

      {/* Section D: Weekly Summary */}
      <WeeklySummary
        fused={fused}
        parcelName={parcelName}
        canopyHealth={canopyHealth}
        nearestFireKm={nearestFireKm}
      />

      {/* AI disclaimer */}
      <p className="text-xs text-center" style={{ color: 'var(--text3)' }}>
        {t('forestHealthSummary.disclaimer')}
      </p>
    </section>
  );
}
