// ─── Insect Camera Trap Service ─────────────────────────────────────────────
// Camera trap integration for real-time beetle counting using pheromone-baited
// traps with YOLO classification. Each trap captures images at regular intervals,
// runs on-device or cloud inference to identify and count bark beetle species,
// and reports via cellular backhaul.
//
// Demo mode: 2 traps in Småland — one elevated (mass flight), one baseline.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CameraTrap {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  parcelId: string;
  status: 'active' | 'maintenance' | 'offline';
  batteryLevel: number;
  pheromoneType: string;
  pheromoneReplacementDate: string;
  lastImageTime: string;
  totalCaptures: number;
  cellularSignal: number;
}

export interface InsectCapture {
  id: string;
  trapId: string;
  timestamp: string;
  imageUrl?: string;
  species: string;
  scientificName: string;
  confidence: number;
  count: number;
  classificationModel: string;
  temperature: number;
  humidity: number;
}

export interface TrapDailySummary {
  trapId: string;
  date: string;
  totalCaptures: number;
  speciesBreakdown: { species: string; count: number }[];
  peakHour: number;
  avgTemperature: number;
  flightActivity: 'none' | 'low' | 'moderate' | 'high' | 'mass_flight';
  comparedToBaseline: number;
}

export interface SwarmAlert {
  id: string;
  trapId: string;
  timestamp: string;
  alertLevel: 'watch' | 'warning' | 'critical';
  beetleCount: number;
  hourlyRate: number;
  message: string;
  recommendation: string;
}

// ─── Source Metadata ────────────────────────────────────────────────────────

export const CAMERA_TRAP_SOURCE_INFO = {
  name: 'BeetleSense Camera Trap Network',
  description:
    'Pheromone-baited camera traps with on-device YOLOv8 classification for real-time bark beetle monitoring.',
  classificationModel: 'YOLOv8-bark-beetle-v2',
  detectedSpecies: [
    { common: 'Granbarkborre', scientific: 'Ips typographus' },
    { common: 'Sextandad barkborre', scientific: 'Pityogenes chalcographus' },
    { common: 'Snytbagge', scientific: 'Hylobius abietis' },
  ],
  captureInterval: '5 min during daylight (06:00–22:00)',
  imageResolution: '4032 × 3024 (12 MP)',
  connectivity: '4G LTE-M / NB-IoT',
  batteryLife: '~90 days (solar-assisted)',
  pheromoneLife: '8 weeks',
  dataLicense: 'Proprietary — BeetleSense subscribers',
  lastUpdated: '2026-04-05',
};

// ─── Demo Data ──────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const DEMO_TRAPS: CameraTrap[] = [
  {
    id: 'trap-sma-001',
    name: 'Eksjö Norr — Gran Ridge',
    location: { lat: 57.6721, lng: 14.9745 },
    parcelId: 'demo-parcel-1',
    status: 'active',
    batteryLevel: 78,
    pheromoneType: 'Ips typographus aggregation',
    pheromoneReplacementDate: '2026-05-15',
    lastImageTime: `${today}T15:32:00Z`,
    totalCaptures: 4287,
    cellularSignal: 72,
  },
  {
    id: 'trap-sma-002',
    name: 'Vetlanda Syd — Mixed Stand',
    location: { lat: 57.4289, lng: 15.0812 },
    parcelId: 'demo-parcel-1',
    status: 'active',
    batteryLevel: 91,
    pheromoneType: 'Ips typographus aggregation',
    pheromoneReplacementDate: '2026-05-20',
    lastImageTime: `${today}T15:27:00Z`,
    totalCaptures: 1034,
    cellularSignal: 85,
  },
];

/** Hourly capture pattern — peaks at 14:00–16:00 on warm afternoons */
function generateHourlyCaptures(
  trapId: string,
  date: string,
  elevated: boolean
): InsectCapture[] {
  const basePattern: Record<number, number> = {
    6: 1,
    7: 2,
    8: 4,
    9: 7,
    10: 12,
    11: 18,
    12: 24,
    13: 32,
    14: 45,
    15: 48,
    16: 38,
    17: 22,
    18: 12,
    19: 5,
    20: 2,
    21: 1,
  };

  const multiplier = elevated ? 4.5 : 1.0;
  const captures: InsectCapture[] = [];
  let captureIdx = 0;

  for (const [hourStr, base] of Object.entries(basePattern)) {
    const hour = Number(hourStr);
    const count = Math.round(base * multiplier * (0.85 + Math.random() * 0.3));
    if (count === 0) continue;

    // Distribute species: ~70% Ips typographus, ~20% Pityogenes, ~10% Hylobius
    const ipsCount = Math.round(count * 0.7);
    const pitCount = Math.round(count * 0.2);
    const hylCount = Math.max(0, count - ipsCount - pitCount);

    const baseTemp = 14 + Math.sin(((hour - 6) / 16) * Math.PI) * 8;

    if (ipsCount > 0) {
      captures.push({
        id: `cap-${trapId}-${date}-${captureIdx++}`,
        trapId,
        timestamp: `${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
        species: 'Granbarkborre',
        scientificName: 'Ips typographus',
        confidence: 0.92 + Math.random() * 0.07,
        count: ipsCount,
        classificationModel: 'YOLOv8-bark-beetle-v2',
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: 55 + Math.round(Math.random() * 20),
      });
    }

    if (pitCount > 0) {
      captures.push({
        id: `cap-${trapId}-${date}-${captureIdx++}`,
        trapId,
        timestamp: `${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
        species: 'Sextandad barkborre',
        scientificName: 'Pityogenes chalcographus',
        confidence: 0.88 + Math.random() * 0.1,
        count: pitCount,
        classificationModel: 'YOLOv8-bark-beetle-v2',
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: 55 + Math.round(Math.random() * 20),
      });
    }

    if (hylCount > 0) {
      captures.push({
        id: `cap-${trapId}-${date}-${captureIdx++}`,
        trapId,
        timestamp: `${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
        species: 'Snytbagge',
        scientificName: 'Hylobius abietis',
        confidence: 0.85 + Math.random() * 0.12,
        count: hylCount,
        classificationModel: 'YOLOv8-bark-beetle-v2',
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: 55 + Math.round(Math.random() * 20),
      });
    }
  }

  return captures;
}

function buildDailySummary(
  trapId: string,
  date: string,
  captures: InsectCapture[]
): TrapDailySummary {
  const totalCaptures = captures.reduce((sum, c) => sum + c.count, 0);

  // Species breakdown
  const speciesMap = new Map<string, number>();
  for (const c of captures) {
    speciesMap.set(c.species, (speciesMap.get(c.species) ?? 0) + c.count);
  }
  const speciesBreakdown = Array.from(speciesMap.entries()).map(
    ([species, count]) => ({ species, count })
  );

  // Find peak hour
  const hourCounts = new Map<number, number>();
  for (const c of captures) {
    const hour = new Date(c.timestamp).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + c.count);
  }
  let peakHour = 14;
  let peakCount = 0;
  for (const [hour, count] of hourCounts.entries()) {
    if (count > peakCount) {
      peakHour = hour;
      peakCount = count;
    }
  }

  const avgTemperature =
    captures.length > 0
      ? Math.round(
          (captures.reduce((s, c) => s + c.temperature, 0) / captures.length) *
            10
        ) / 10
      : 0;

  const flightActivity = calculateFlightActivity(captures);

  // Baseline: trap-sma-001 elevated is ~4.5x normal, trap-sma-002 is ~1x
  const isElevated = trapId === 'trap-sma-001';
  const comparedToBaseline = isElevated ? 347 : 5;

  return {
    trapId,
    date,
    totalCaptures,
    speciesBreakdown,
    peakHour,
    avgTemperature,
    flightActivity,
    comparedToBaseline,
  };
}

// ─── Flight Activity Classification ────────────────────────────────────────

export function calculateFlightActivity(
  captures: InsectCapture[]
): 'none' | 'low' | 'moderate' | 'high' | 'mass_flight' {
  const total = captures.reduce((sum, c) => sum + c.count, 0);

  // Thresholds based on Swedish bark beetle monitoring guidelines
  if (total === 0) return 'none';
  if (total < 50) return 'low';
  if (total < 200) return 'moderate';
  if (total < 800) return 'high';
  return 'mass_flight';
}

// ─── Demo Swarm Alerts ─────────────────────────────────────────────────────

function getDemoSwarmAlerts(trapId: string): SwarmAlert[] {
  if (trapId !== 'trap-sma-001') return [];

  return [
    {
      id: 'alert-001',
      trapId: 'trap-sma-001',
      timestamp: `${today}T15:00:00Z`,
      alertLevel: 'critical',
      beetleCount: 1248,
      hourlyRate: 210,
      message:
        'Mass flight detected — Ips typographus captures 347% above 7-day baseline. Temperature 22°C with sustained easterly wind.',
      recommendation:
        'Immediate inspection of surrounding spruce stands within 500 m. Consider emergency sanitation felling of any visually infested trees. Contact Skogsstyrelsen if infestation confirmed.',
    },
    {
      id: 'alert-002',
      trapId: 'trap-sma-001',
      timestamp: `${today}T12:30:00Z`,
      alertLevel: 'warning',
      beetleCount: 620,
      hourlyRate: 124,
      message:
        'Elevated beetle activity — captures rising sharply since 10:00. Current rate suggests mass flight event beginning.',
      recommendation:
        'Monitor trap readings closely over the next 4 hours. Prepare for field inspection if counts continue rising.',
    },
  ];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * List all camera traps for a parcel.
 */
export async function getTrapNetwork(parcelId: string): Promise<CameraTrap[]> {
  await delay(180);
  return DEMO_TRAPS.filter((t) => t.parcelId === parcelId);
}

/**
 * Get daily summary for a trap — species breakdown, peak hour, flight activity.
 */
export async function getTrapDailySummary(
  trapId: string,
  date?: string
): Promise<TrapDailySummary> {
  await delay(220);
  const targetDate = date ?? today;
  const isElevated = trapId === 'trap-sma-001';
  const captures = generateHourlyCaptures(trapId, targetDate, isElevated);
  return buildDailySummary(trapId, targetDate, captures);
}

/**
 * Get recent classified captures from a trap.
 */
export async function getRecentCaptures(
  trapId: string,
  limit: number = 20
): Promise<InsectCapture[]> {
  await delay(150);
  const isElevated = trapId === 'trap-sma-001';
  const captures = generateHourlyCaptures(trapId, today, isElevated);
  // Return most recent first
  return captures
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}

/**
 * Check active swarm alerts for a trap.
 */
export async function checkSwarmAlerts(
  trapId: string
): Promise<SwarmAlert[]> {
  await delay(130);
  return getDemoSwarmAlerts(trapId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
