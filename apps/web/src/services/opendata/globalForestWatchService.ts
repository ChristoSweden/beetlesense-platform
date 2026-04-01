/**
 * Global Forest Watch (WRI) — Tree Cover Loss Alerts
 *
 * Provides deforestation alerts and tree cover loss data.
 * API: https://www.globalforestwatch.org/
 *
 * TODO: Register for GFW API key for live data
 * The free API provides near-real-time deforestation alerts.
 * For now, uses realistic data modeled on actual Swedish forest patterns.
 */

// ─── Types ───

export interface TreeCoverAlert {
  id: string;
  lat: number;
  lon: number;
  date: string;
  confidence: 'nominal' | 'high' | 'highest';
  alertType: 'deforestation' | 'degradation' | 'fire';
  areaSqKm: number;
  source: 'GLAD' | 'RADD' | 'GLAD-S2';
}

export interface ForestCoverStats {
  totalForestAreaHa: number;
  treeCoverPct: number;
  annualLossHa: number;
  annualGainHa: number;
  netChangeHa: number;
  co2EmissionsTonnes: number;
  intactForestPct: number;
  lastUpdated: string;
}

export interface GFWOverview {
  recentAlerts: TreeCoverAlert[];
  stats: ForestCoverStats;
  alertCount30d: number;
  alertTrend: 'increasing' | 'stable' | 'decreasing';
  isLive: boolean;
}

// ─── Realistic Data ───

// Based on actual forest patterns in Kronoberg/Jönköping counties
function generateRecentAlerts(): TreeCoverAlert[] {
  const now = new Date();
  const alerts: TreeCoverAlert[] = [];

  // Generate 5-12 recent alerts (typical for a Swedish county in spring)
  const count = 5 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // Coordinates in Småland region (lat 56.5-57.5, lon 14-15.5)
    const lat = 56.7 + Math.random() * 0.8;
    const lon = 14.0 + Math.random() * 1.5;

    alerts.push({
      id: `gfw-${i}-${date.getTime()}`,
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      date: date.toISOString().split('T')[0],
      confidence: (['nominal', 'high', 'highest'] as const)[Math.floor(Math.random() * 3)],
      alertType: Math.random() > 0.85 ? 'fire' : Math.random() > 0.5 ? 'degradation' : 'deforestation',
      areaSqKm: Math.round((0.01 + Math.random() * 0.5) * 1000) / 1000,
      source: (['GLAD', 'RADD', 'GLAD-S2'] as const)[Math.floor(Math.random() * 3)],
    });
  }

  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}

function generateForestStats(): ForestCoverStats {
  // Real-ish numbers for Kronoberg county
  // Total area ~8,500 km², ~75% forested
  return {
    totalForestAreaHa: 637500,
    treeCoverPct: 75,
    annualLossHa: Math.round(1200 + Math.random() * 800),
    annualGainHa: Math.round(1800 + Math.random() * 600),
    netChangeHa: Math.round(300 + Math.random() * 400),
    co2EmissionsTonnes: Math.round(45000 + Math.random() * 15000),
    intactForestPct: 12,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

// ─── Public API ───

let cached: { data: GFWOverview; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function getGlobalForestWatchOverview(): Promise<GFWOverview> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // Simulate API delay
  await new Promise(r => setTimeout(r, 200));

  const alerts = generateRecentAlerts();

  const result: GFWOverview = {
    recentAlerts: alerts,
    stats: generateForestStats(),
    alertCount30d: alerts.length,
    alertTrend: alerts.length > 8 ? 'increasing' : alerts.length < 5 ? 'decreasing' : 'stable',
    isLive: false, // TODO: Set to true when GFW API key is configured
  };

  cached = { data: result, fetchedAt: Date.now() };
  return result;
}
