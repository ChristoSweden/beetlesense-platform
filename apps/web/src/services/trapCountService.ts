/**
 * Pheromone Trap Tracking Service
 *
 * Forest owners log weekly beetle trap counts that feed hyper-local predictions.
 * Data is compared against regional Skogsstyrelsen baselines and epidemic thresholds.
 *
 * Persistence: localStorage in demo mode.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrapStation {
  id: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  parcelId?: string;
  trapType: 'pheromone_ips' | 'pheromone_chalcograph' | 'window_trap';
  installedDate: string;
  active: boolean;
}

export interface TrapReading {
  id: string;
  stationId: string;
  date: string;
  count: number;
  species: 'ips_typographus' | 'pityogenes_chalcographus' | 'mixed';
  weatherConditions?: string;
  notes?: string;
}

export interface TrapAnalysis {
  currentCount: number;
  weeklyTrend: 'rising' | 'stable' | 'falling';
  regionalAverage: number;
  percentAboveBaseline: number;
  epidemicThreshold: number;
  daysToThreshold?: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'epidemic';
  recommendation: string;
}

// ── Storage ─────────────────────────────────────────────────────────────────

const STATIONS_KEY = 'beetlesense-trap-stations';
const READINGS_KEY = 'beetlesense-trap-readings';

function loadStations(): TrapStation[] {
  try {
    const raw = localStorage.getItem(STATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStations(stations: TrapStation[]): void {
  localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
}

function loadReadings(): TrapReading[] {
  try {
    const raw = localStorage.getItem(READINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReadings(readings: TrapReading[]): void {
  localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function weeksAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Demo Data ───────────────────────────────────────────────────────────────
// 3 trap stations with 12 weeks of readings showing spring swarming curve

function generateDemoStations(): TrapStation[] {
  return [
    { id: 'trap_s01', userId: 'demo-user', name: 'Björkbacken South', lat: 57.188, lng: 14.051, parcelId: 'P001', trapType: 'pheromone_ips', installedDate: weeksAgoDate(14), active: true },
    { id: 'trap_s02', userId: 'demo-user', name: 'Granåsen Ridge', lat: 57.210, lng: 14.105, parcelId: 'P002', trapType: 'pheromone_ips', installedDate: weeksAgoDate(14), active: true },
    { id: 'trap_s03', userId: 'demo-user', name: 'Tallmon East', lat: 57.230, lng: 14.120, parcelId: 'P005', trapType: 'pheromone_chalcograph', installedDate: weeksAgoDate(12), active: true },
  ];
}

function generateDemoReadings(): TrapReading[] {
  // Realistic spring swarming curve for southern Sweden
  // Ips typographus: low → rising sharply → peak → slight decline
  const ipsSwarmCurve = [120, 280, 620, 1400, 2800, 5200, 8400, 11200, 9600, 7800, 6100, 4500];
  // Chalcographus: similar but lower numbers
  const chalcCurve = [40, 90, 180, 350, 650, 980, 1200, 1500, 1350, 1100, 900, 700];

  const readings: TrapReading[] = [];
  const conditions = [
    'Sunny, 18°C, light wind',
    'Overcast, 15°C, calm',
    'Warm, 22°C, gentle breeze',
    'Cloudy, 16°C, moderate wind',
    'Clear, 20°C, calm',
    'Partly cloudy, 19°C, light wind',
    'Warm and humid, 24°C, calm',
    'Clear, 21°C, light wind',
    'Overcast, 17°C, moderate wind',
    'Sunny, 23°C, calm',
    'Partly cloudy, 20°C, light wind',
    'Clear, 19°C, gentle breeze',
  ];

  for (let week = 0; week < 12; week++) {
    // Station 1 — Ips, highest counts (south-facing, near infested area)
    readings.push({
      id: `read_s01_w${week}`,
      stationId: 'trap_s01',
      date: weeksAgoDate(11 - week),
      count: ipsSwarmCurve[week] + Math.round((Math.random() - 0.5) * ipsSwarmCurve[week] * 0.15),
      species: 'ips_typographus',
      weatherConditions: conditions[week],
      notes: week === 6 ? 'Record catch — peak swarming period' : undefined,
    });

    // Station 2 — Ips, moderate counts
    readings.push({
      id: `read_s02_w${week}`,
      stationId: 'trap_s02',
      date: weeksAgoDate(11 - week),
      count: Math.round(ipsSwarmCurve[week] * 0.65 + (Math.random() - 0.5) * ipsSwarmCurve[week] * 0.12),
      species: 'ips_typographus',
      weatherConditions: conditions[week],
    });

    // Station 3 — Chalcographus
    readings.push({
      id: `read_s03_w${week}`,
      stationId: 'trap_s03',
      date: weeksAgoDate(11 - week),
      count: chalcCurve[week] + Math.round((Math.random() - 0.5) * chalcCurve[week] * 0.2),
      species: 'pityogenes_chalcographus',
      weatherConditions: conditions[week],
    });
  }

  return readings;
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  if (loadStations().length === 0) {
    saveStations(generateDemoStations());
    saveReadings(generateDemoReadings());
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function registerTrap(station: Omit<TrapStation, 'id'>): TrapStation {
  ensureInitialized();
  const full: TrapStation = { ...station, id: generateId('trap') };
  const all = loadStations();
  all.push(full);
  saveStations(all);
  return full;
}

export function logReading(reading: Omit<TrapReading, 'id'>): TrapReading {
  ensureInitialized();
  const full: TrapReading = { ...reading, id: generateId('read') };
  const all = loadReadings();
  all.push(full);
  saveReadings(all);
  return full;
}

export function getReadingsForStation(stationId: string, dateRange?: { start: string; end: string }): TrapReading[] {
  ensureInitialized();
  return loadReadings().filter(r => {
    if (r.stationId !== stationId) return false;
    if (dateRange) {
      return r.date >= dateRange.start && r.date <= dateRange.end;
    }
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function analyzeTrapData(stationId: string): TrapAnalysis {
  ensureInitialized();
  const readings = getReadingsForStation(stationId);
  if (readings.length === 0) {
    return {
      currentCount: 0,
      weeklyTrend: 'stable',
      regionalAverage: 5200,
      percentAboveBaseline: 0,
      epidemicThreshold: 15000,
      riskLevel: 'low',
      recommendation: 'No readings recorded yet. Log your first trap reading.',
    };
  }

  const sorted = [...readings].sort((a, b) => b.date.localeCompare(a.date));
  const currentCount = sorted[0].count;
  const prevCount = sorted.length > 1 ? sorted[1].count : currentCount;

  const ratio = prevCount > 0 ? currentCount / prevCount : 1;
  const weeklyTrend: TrapAnalysis['weeklyTrend'] =
    ratio > 1.15 ? 'rising' : ratio < 0.85 ? 'falling' : 'stable';

  // Regional Skogsstyrelsen baseline for Kronoberg/Jönköping
  const regionalAverage = 5200;
  const percentAboveBaseline = Math.round(((currentCount - regionalAverage) / Math.max(regionalAverage, 1)) * 100);

  const epidemicThreshold = 15000;

  // Calculate days to threshold if rising
  let daysToThreshold: number | undefined;
  if (weeklyTrend === 'rising' && currentCount < epidemicThreshold && sorted.length >= 2) {
    const weeklyGrowth = currentCount - prevCount;
    if (weeklyGrowth > 0) {
      const weeksToThreshold = (epidemicThreshold - currentCount) / weeklyGrowth;
      daysToThreshold = Math.round(weeksToThreshold * 7);
    }
  }

  let riskLevel: TrapAnalysis['riskLevel'] = 'low';
  if (currentCount >= epidemicThreshold) riskLevel = 'epidemic';
  else if (currentCount >= 8000) riskLevel = 'high';
  else if (currentCount >= 3000) riskLevel = 'moderate';

  let recommendation: string;
  switch (riskLevel) {
    case 'epidemic':
      recommendation = 'CRITICAL: Trap counts exceed epidemic threshold (15,000). Immediate sanitation felling recommended. Contact Skogsstyrelsen for coordinated regional response.';
      break;
    case 'high':
      recommendation = 'High beetle pressure. Inspect all mature spruce within 500m of trap for bore dust. Prioritise salvage operations. Consider additional traps.';
      break;
    case 'moderate':
      recommendation = 'Elevated counts above regional baseline. Increase inspection frequency to twice weekly. Check wind-damaged or stressed trees first.';
      break;
    default:
      recommendation = 'Counts within normal range. Continue weekly monitoring. Log any bore dust observations separately.';
  }

  return {
    currentCount,
    weeklyTrend,
    regionalAverage,
    percentAboveBaseline,
    epidemicThreshold,
    daysToThreshold,
    riskLevel,
    recommendation,
  };
}

export function getRegionalTrapMap(lat: number, lng: number, radiusKm: number): TrapStation[] {
  ensureInitialized();
  return loadStations().filter(s => {
    return s.active && haversineKm(lat, lng, s.lat, s.lng) <= radiusKm;
  });
}

export function compareWithSkogsstyrelsen(county: string): { userAvg: number; officialAvg: number; ratio: number } {
  ensureInitialized();
  // Demo: regional baselines by county
  const officialBaselines: Record<string, number> = {
    'Kronoberg': 5200,
    'Jönköping': 4800,
    'Kalmar': 4500,
    'Östergötland': 3900,
  };
  const officialAvg = officialBaselines[county] ?? 5000;

  const readings = loadReadings();
  const recentReadings = readings
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const userAvg = recentReadings.length > 0
    ? Math.round(recentReadings.reduce((s, r) => s + r.count, 0) / recentReadings.length)
    : 0;

  return {
    userAvg,
    officialAvg,
    ratio: officialAvg > 0 ? Math.round((userAvg / officialAvg) * 100) / 100 : 0,
  };
}

export function getAllStations(): TrapStation[] {
  ensureInitialized();
  return loadStations();
}

export function getAllReadings(): TrapReading[] {
  ensureInitialized();
  return loadReadings();
}
