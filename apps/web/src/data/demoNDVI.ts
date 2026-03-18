/**
 * NDVI time-series data for demo parcels — 24 months of bi-weekly observations.
 * Sentinel-2 derived, realistic seasonal patterns for southern Sweden (Kronoberg/Smaland).
 *
 * Seasonal NDVI pattern for healthy conifer in Smaland:
 *   Jan-Feb: 0.25-0.40 (snow/dormant)
 *   Mar-Apr: 0.35-0.55 (spring green-up)
 *   May-Jun: 0.60-0.80 (peak growth)
 *   Jul-Aug: 0.70-0.85 (peak)
 *   Sep-Oct: 0.55-0.70 (senescence)
 *   Nov-Dec: 0.30-0.45 (dormant)
 *
 * Special parcels:
 *   p4 (Granudden) — shows decline from beetle damage starting mid-2025
 *   p6 (Mossebacken) — shows recovery after thinning in autumn 2024
 */

// ─── Types ───

export interface NDVIObservation {
  date: string; // ISO date YYYY-MM-DD
  ndviMean: number;
  ndviMin: number;
  ndviMax: number;
  /** Standard deviation across the parcel */
  ndviStd: number;
  /** Cloud cover percentage for this acquisition */
  cloudCoverPct: number;
  /** True if observation is partially clouded (>30%) and may be unreliable */
  cloudFlag: boolean;
  /** Source satellite */
  source: 'sentinel-2' | 'landsat-8' | 'landsat-9';
}

export interface ParcelNDVISeries {
  parcelId: string;
  parcelName: string;
  observations: NDVIObservation[];
}

// ─── NDVI generation helpers ───

/** Seasonal NDVI baseline for healthy conifer forest in southern Sweden */
function seasonalNDVI(date: Date): number {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  // Sinusoidal seasonal pattern peaking around day 200 (mid-July)
  const seasonal = 0.55 + 0.25 * Math.sin(((dayOfYear - 90) / 365) * 2 * Math.PI);
  return seasonal;
}

/** Generate a bi-weekly time series from 2024-04 to 2026-03 */
function generateDates(): Date[] {
  const dates: Date[] = [];
  const start = new Date('2024-04-01');
  const end = new Date('2026-03-15');
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 14); // bi-weekly
  }
  return dates;
}

/** Seeded pseudo-random for reproducible noise */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function generateSeries(
  parcelId: string,
  parcelName: string,
  options: {
    seed: number;
    /** Base offset from typical seasonal NDVI */
    ndviOffset?: number;
    /** Function to apply a trend/anomaly at a specific date */
    modifier?: (date: Date, baseNdvi: number) => number;
    /** Species type affects amplitude — deciduous has wider swing */
    deciduousFraction?: number;
  },
): ParcelNDVISeries {
  const dates = generateDates();
  const rand = seededRandom(options.seed);
  const offset = options.ndviOffset ?? 0;
  const decidFrac = options.deciduousFraction ?? 0.1;

  const observations: NDVIObservation[] = dates.map((date) => {
    let base = seasonalNDVI(date) + offset;

    // Deciduous trees have larger winter drop and summer peak
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    if (decidFrac > 0.2) {
      // Enhance seasonal amplitude for deciduous-heavy parcels
      const deciduousEffect = decidFrac * 0.15 * Math.sin(((dayOfYear - 90) / 365) * 2 * Math.PI);
      base += deciduousEffect;
      // Deeper winter drop for deciduous
      if (dayOfYear < 80 || dayOfYear > 310) {
        base -= decidFrac * 0.12;
      }
    }

    // Apply modifier (beetle damage, thinning recovery, etc.)
    if (options.modifier) {
      base = options.modifier(date, base);
    }

    // Add realistic noise
    const noise = (rand() - 0.5) * 0.04;
    const ndviMean = clamp(Number((base + noise).toFixed(3)), 0.10, 0.92);

    // Spatial variation within the parcel
    const std = Number((0.03 + rand() * 0.04).toFixed(3));
    const ndviMin = clamp(Number((ndviMean - std * 2.5 - rand() * 0.03).toFixed(3)), 0.05, ndviMean);
    const ndviMax = clamp(Number((ndviMean + std * 2.0 + rand() * 0.02).toFixed(3)), ndviMean, 0.95);

    // Cloud cover — more likely in winter, less in summer
    const winterFactor = dayOfYear < 80 || dayOfYear > 300 ? 1.8 : 0.6;
    const cloudCoverPct = Math.round(clamp(rand() * 35 * winterFactor, 0, 95));
    const cloudFlag = cloudCoverPct > 30;

    // Alternate between Sentinel-2 and Landsat occasionally
    const source: NDVIObservation['source'] =
      rand() < 0.85 ? 'sentinel-2' : rand() < 0.5 ? 'landsat-8' : 'landsat-9';

    return {
      date: date.toISOString().split('T')[0],
      ndviMean,
      ndviMin,
      ndviMax,
      ndviStd: std,
      cloudCoverPct,
      cloudFlag,
      source,
    };
  });

  return { parcelId, parcelName, observations };
}

// ─── Per-Parcel Series ───

/**
 * p1: Norra Skogen — Healthy spruce/pine, slight stress in NE sector.
 * NDVI generally healthy but minor dip in late summer 2025.
 */
const p1Series = generateSeries('p1', 'Norra Skogen', {
  seed: 1001,
  ndviOffset: 0.02,
  deciduousFraction: 0.10,
  modifier: (date, base) => {
    // Minor stress dip in Aug-Sep 2025
    if (date >= new Date('2025-07-15') && date <= new Date('2025-09-30')) {
      return base - 0.04;
    }
    return base;
  },
});

/**
 * p2: Ekbacken — Healthy oak/birch with strong seasonal amplitude.
 * Deciduous-dominated, healthy throughout.
 */
const p2Series = generateSeries('p2', 'Ekbacken', {
  seed: 2002,
  ndviOffset: 0.03,
  deciduousFraction: 0.75,
});

/**
 * p3: Tallmon — Healthy pine, slight drought stress in summer 2025.
 * Pine has lower peak NDVI than spruce.
 */
const p3Series = generateSeries('p3', 'Tallmon', {
  seed: 3003,
  ndviOffset: -0.03,
  deciduousFraction: 0.10,
  modifier: (date, base) => {
    // Slight drought stress Jul 2025
    if (date >= new Date('2025-06-20') && date <= new Date('2025-08-15')) {
      return base - 0.03;
    }
    return base;
  },
});

/**
 * p4: Granudden — BEETLE DAMAGE SIGNATURE
 * Normal until mid-2025, then progressive decline as Ips typographus
 * kills spruce. NDVI drops from ~0.72 to ~0.35 over 6 months.
 */
const p4Series = generateSeries('p4', 'Granudden', {
  seed: 4004,
  ndviOffset: 0.02,
  deciduousFraction: 0.05,
  modifier: (date, base) => {
    const damageStart = new Date('2025-06-01');
    if (date < damageStart) return base;

    // Progressive decline: beetle damage signature
    const daysSinceDamage = (date.getTime() - damageStart.getTime()) / 86400000;
    // Sigmoid-like curve: slow start, then accelerating, then leveling off
    const declineFactor = 0.40 * (1 / (1 + Math.exp(-0.012 * (daysSinceDamage - 120))));
    return base - declineFactor;
  },
});

/**
 * p5: Bjorklund — No survey, wetland-adjacent. Lower baseline NDVI.
 * Stable but noisy due to peat soil moisture variation.
 */
const p5Series = generateSeries('p5', 'Björklund', {
  seed: 5005,
  ndviOffset: -0.05,
  deciduousFraction: 0.50,
});

/**
 * p6: Mossebacken — RECOVERY AFTER THINNING
 * Thinning operation in Oct 2024 caused temporary NDVI drop.
 * Recovery visible from spring 2025 onwards.
 */
const p6Series = generateSeries('p6', 'Mossebacken', {
  seed: 6006,
  ndviOffset: 0.0,
  deciduousFraction: 0.15,
  modifier: (date, base) => {
    const thinningDate = new Date('2024-10-15');
    const recoveryStart = new Date('2025-03-01');

    if (date >= thinningDate && date < recoveryStart) {
      // Immediate post-thinning drop — canopy opened up
      return base - 0.12;
    }
    if (date >= recoveryStart) {
      // Gradual recovery as remaining trees fill in
      const daysSinceRecovery = (date.getTime() - recoveryStart.getTime()) / 86400000;
      const recovery = Math.min(0.12, daysSinceRecovery * 0.00035);
      return base - 0.12 + recovery + 0.02; // slight boost from reduced competition
    }
    return base;
  },
});

/**
 * p7: Stensjo — Stable mixed conifer, healthy.
 */
const p7Series = generateSeries('p7', 'Stensjö', {
  seed: 7007,
  ndviOffset: -0.01,
  deciduousFraction: 0.15,
});

/**
 * p8: Askaremala — Young plantation, lower NDVI due to open canopy.
 * Steadily increasing as trees grow.
 */
const p8Series = generateSeries('p8', 'Askaremåla', {
  seed: 8008,
  ndviOffset: -0.15,
  deciduousFraction: 0.10,
  modifier: (date, base) => {
    // Young trees growing — slow upward trend
    const baseDate = new Date('2024-04-01');
    const daysSinceStart = (date.getTime() - baseDate.getTime()) / 86400000;
    const growthBonus = daysSinceStart * 0.00008; // ~0.03 per year
    return base + growthBonus;
  },
});

// ─── Exports ───

export const DEMO_NDVI_SERIES: ParcelNDVISeries[] = [
  p1Series,
  p2Series,
  p3Series,
  p4Series,
  p5Series,
  p6Series,
  p7Series,
  p8Series,
];

/** Get NDVI series for a specific parcel */
export function getNDVISeries(parcelId: string): ParcelNDVISeries | undefined {
  return DEMO_NDVI_SERIES.find((s) => s.parcelId === parcelId);
}

/** Get the latest NDVI value for a parcel */
export function getLatestNDVI(parcelId: string): NDVIObservation | undefined {
  const series = getNDVISeries(parcelId);
  if (!series) return undefined;
  // Find most recent non-clouded observation
  for (let i = series.observations.length - 1; i >= 0; i--) {
    if (!series.observations[i].cloudFlag) {
      return series.observations[i];
    }
  }
  return series.observations[series.observations.length - 1];
}

/** Get NDVI observations within a date range */
export function getNDVIRange(
  parcelId: string,
  startDate: string,
  endDate: string,
): NDVIObservation[] {
  const series = getNDVISeries(parcelId);
  if (!series) return [];
  return series.observations.filter((o) => o.date >= startDate && o.date <= endDate);
}

/**
 * Calculate rolling average NDVI for anomaly detection.
 * Returns the 3-month rolling mean for each observation.
 */
export function getNDVIRollingAverage(
  parcelId: string,
  windowDays: number = 90,
): Array<{ date: string; ndviMean: number; rollingMean: number }> {
  const series = getNDVISeries(parcelId);
  if (!series) return [];

  return series.observations.map((obs, _i) => {
    const obsDate = new Date(obs.date);
    const windowStart = new Date(obsDate.getTime() - windowDays * 86400000);
    const windowObs = series.observations.filter((o) => {
      const d = new Date(o.date);
      return d >= windowStart && d <= obsDate && !o.cloudFlag;
    });
    const rollingMean =
      windowObs.length > 0
        ? Number((windowObs.reduce((sum, o) => sum + o.ndviMean, 0) / windowObs.length).toFixed(3))
        : obs.ndviMean;

    return { date: obs.date, ndviMean: obs.ndviMean, rollingMean };
  });
}
