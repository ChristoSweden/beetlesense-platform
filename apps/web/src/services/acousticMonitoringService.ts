/**
 * Acoustic Monitoring Service
 *
 * Manages acoustic sensor nodes deployed in forest canopy to detect
 * woodpecker activity and bark beetle gallery sounds using BirdNET/OpenSoundscape
 * ML classification models.
 *
 * Key insight: Three-toed woodpeckers (Picoides tridactylus) follow bark beetle
 * infestations with remarkable precision. Elevated woodpecker drumming and
 * foraging activity is a reliable biological proxy for early-stage beetle
 * outbreaks — often detectable weeks BEFORE visual symptoms appear on drone
 * imagery. Acoustic detection enables targeted drone dispatch, reducing costs
 * and catching infestations earlier.
 *
 * Persistence: demo mode returns static data; production would hit Supabase.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AcousticNode {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  parcelId: string;
  status: 'online' | 'offline' | 'low_battery';
  batteryLevel: number;           // 0-100
  lastHeartbeat: string;          // ISO timestamp
  firmwareVersion: string;
  solarPowered: boolean;
}

export interface AcousticDetection {
  id: string;
  nodeId: string;
  timestamp: string;
  species: string;
  scientificName: string;
  confidence: number;             // 0-1
  signalType: 'vocalization' | 'drumming' | 'gallery_sound' | 'bark_cracking';
  frequencyRangeHz: [number, number];
  durationSec: number;
  spectrogramUrl?: string;
  beetleRelevance: 'direct' | 'proxy' | 'none';
  interpretation: string;
}

export interface AcousticSummary {
  nodeId: string;
  period: string;                 // e.g., "last_24h"
  totalDetections: number;
  woodpeckerDetections: number;
  beetleSoundDetections: number;
  alertLevel: 'normal' | 'elevated' | 'high';
  woodpeckerActivityTrend: 'increasing' | 'stable' | 'decreasing';
  beetleRiskSignal: number;       // 0-100
  topSpecies: { species: string; count: number; confidence: number }[];
  hourlyActivity: { hour: number; detections: number }[];
}

export interface AcousticNetworkStatus {
  totalNodes: number;
  onlineNodes: number;
  totalDetectionsToday: number;
  activeBeetleAlerts: number;
  networkHealthScore: number;     // 0-100
  coverageAreaHa: number;
}

// ─── Species Database ───────────────────────────────────────────────────────

interface SpeciesEntry {
  scientificName: string;
  swedishName: string;
  englishName: string;
  beetleRelevance: 'direct' | 'proxy' | 'none';
  description: string;
}

const SPECIES_DB: Record<string, SpeciesEntry> = {
  'tretaig_hackspett': {
    scientificName: 'Picoides tridactylus',
    swedishName: 'Tretåig hackspett',
    englishName: 'Three-toed Woodpecker',
    beetleRelevance: 'proxy',
    description: 'Primary beetle predator. Elevated activity strongly indicates bark beetle presence in nearby trees.',
  },
  'storre_hackspett': {
    scientificName: 'Dendrocopos major',
    swedishName: 'Större hackspett',
    englishName: 'Great Spotted Woodpecker',
    beetleRelevance: 'proxy',
    description: 'Common woodpecker that feeds on beetle larvae. Increased drumming may indicate beetle activity.',
  },
  'spillkraka': {
    scientificName: 'Dryocopus martius',
    swedishName: 'Spillkråka',
    englishName: 'Black Woodpecker',
    beetleRelevance: 'proxy',
    description: 'Large woodpecker. Presence suggests mature forest with potential beetle habitat.',
  },
  'ips_typographus': {
    scientificName: 'Ips typographus',
    swedishName: 'Granbarkborre',
    englishName: 'European Spruce Bark Beetle',
    beetleRelevance: 'direct',
    description: 'Gallery construction sounds detected at 2-8 kHz. Direct confirmation of active infestation.',
  },
  'taltrast': {
    scientificName: 'Turdus philomelos',
    swedishName: 'Taltrast',
    englishName: 'Song Thrush',
    beetleRelevance: 'none',
    description: 'Common forest songbird. No beetle relevance.',
  },
  'tradkrypare': {
    scientificName: 'Certhia familiaris',
    swedishName: 'Trädkrypare',
    englishName: 'Eurasian Treecreeper',
    beetleRelevance: 'none',
    description: 'Bark-foraging passerine. Occasionally feeds on surface beetles but not a reliable indicator.',
  },
};

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_PARCEL_ID = 'smaland-parcel-001';

const DEMO_NODES: AcousticNode[] = [
  {
    id: 'acn-001',
    name: 'Tallbacken Nord',
    location: { lat: 57.1842, lng: 15.2134 },
    parcelId: DEMO_PARCEL_ID,
    status: 'online',
    batteryLevel: 87,
    lastHeartbeat: '2026-04-05T06:12:00Z',
    firmwareVersion: '2.4.1',
    solarPowered: true,
  },
  {
    id: 'acn-002',
    name: 'Granberget Öst',
    location: { lat: 57.1798, lng: 15.2267 },
    parcelId: DEMO_PARCEL_ID,
    status: 'online',
    batteryLevel: 92,
    lastHeartbeat: '2026-04-05T06:14:00Z',
    firmwareVersion: '2.4.1',
    solarPowered: true,
  },
  {
    id: 'acn-003',
    name: 'Mossängen Syd',
    location: { lat: 57.1756, lng: 15.2189 },
    parcelId: DEMO_PARCEL_ID,
    status: 'low_battery',
    batteryLevel: 14,
    lastHeartbeat: '2026-04-05T05:48:00Z',
    firmwareVersion: '2.3.8',
    solarPowered: false,
  },
];

/** Node acn-002 (Granberget Öst) shows elevated woodpecker activity — beetle proxy signal */
const DEMO_DETECTIONS: AcousticDetection[] = [
  // ── Tallbacken Nord (acn-001): normal background activity ──
  {
    id: 'det-001',
    nodeId: 'acn-001',
    timestamp: '2026-04-05T05:22:00Z',
    species: 'Taltrast',
    scientificName: 'Turdus philomelos',
    confidence: 0.94,
    signalType: 'vocalization',
    frequencyRangeHz: [1800, 6500],
    durationSec: 12.4,
    beetleRelevance: 'none',
    interpretation: 'Song thrush dawn chorus. Normal spring activity.',
  },
  {
    id: 'det-002',
    nodeId: 'acn-001',
    timestamp: '2026-04-05T05:47:00Z',
    species: 'Större hackspett',
    scientificName: 'Dendrocopos major',
    confidence: 0.88,
    signalType: 'drumming',
    frequencyRangeHz: [800, 3200],
    durationSec: 1.8,
    beetleRelevance: 'proxy',
    interpretation: 'Territorial drumming, typical spring pattern. Single event — not elevated.',
  },
  {
    id: 'det-003',
    nodeId: 'acn-001',
    timestamp: '2026-04-05T06:03:00Z',
    species: 'Trädkrypare',
    scientificName: 'Certhia familiaris',
    confidence: 0.79,
    signalType: 'vocalization',
    frequencyRangeHz: [4500, 8200],
    durationSec: 3.1,
    beetleRelevance: 'none',
    interpretation: 'Treecreeper contact call. No beetle significance.',
  },

  // ── Granberget Öst (acn-002): ELEVATED woodpecker + beetle gallery sounds ──
  {
    id: 'det-004',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T04:58:00Z',
    species: 'Tretåig hackspett',
    scientificName: 'Picoides tridactylus',
    confidence: 0.93,
    signalType: 'drumming',
    frequencyRangeHz: [600, 2800],
    durationSec: 2.3,
    beetleRelevance: 'proxy',
    interpretation: 'Three-toed woodpecker foraging drumming. Slower cadence indicates bark-probing for larvae.',
  },
  {
    id: 'det-005',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T05:14:00Z',
    species: 'Tretåig hackspett',
    scientificName: 'Picoides tridactylus',
    confidence: 0.91,
    signalType: 'drumming',
    frequencyRangeHz: [600, 2900],
    durationSec: 3.7,
    beetleRelevance: 'proxy',
    interpretation: 'Repeated foraging event. Same individual, sustained bark-probing activity.',
  },
  {
    id: 'det-006',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T05:31:00Z',
    species: 'Granbarkborre',
    scientificName: 'Ips typographus',
    confidence: 0.72,
    signalType: 'gallery_sound',
    frequencyRangeHz: [2200, 7800],
    durationSec: 8.6,
    beetleRelevance: 'direct',
    interpretation: 'Possible gallery construction sounds detected. Low-amplitude broadband noise consistent with beetle boring in spruce bark.',
  },
  {
    id: 'det-007',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T05:42:00Z',
    species: 'Tretåig hackspett',
    scientificName: 'Picoides tridactylus',
    confidence: 0.87,
    signalType: 'vocalization',
    frequencyRangeHz: [1200, 4500],
    durationSec: 1.4,
    beetleRelevance: 'proxy',
    interpretation: 'Contact call. Bird remains in area — prolonged stay suggests reliable food source (beetles).',
  },
  {
    id: 'det-008',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T06:05:00Z',
    species: 'Spillkråka',
    scientificName: 'Dryocopus martius',
    confidence: 0.85,
    signalType: 'vocalization',
    frequencyRangeHz: [900, 3600],
    durationSec: 2.9,
    beetleRelevance: 'proxy',
    interpretation: 'Black woodpecker flight call. Additional woodpecker species in area supports beetle activity hypothesis.',
  },
  {
    id: 'det-009',
    nodeId: 'acn-002',
    timestamp: '2026-04-05T06:11:00Z',
    species: 'Granbarkborre',
    scientificName: 'Ips typographus',
    confidence: 0.68,
    signalType: 'bark_cracking',
    frequencyRangeHz: [3500, 9200],
    durationSec: 0.4,
    beetleRelevance: 'direct',
    interpretation: 'Short-duration bark micro-fracture event. Consistent with gallery expansion under bark.',
  },

  // ── Mossängen Syd (acn-003): sparse data due to low battery ──
  {
    id: 'det-010',
    nodeId: 'acn-003',
    timestamp: '2026-04-05T05:35:00Z',
    species: 'Större hackspett',
    scientificName: 'Dendrocopos major',
    confidence: 0.82,
    signalType: 'drumming',
    frequencyRangeHz: [800, 3100],
    durationSec: 1.5,
    beetleRelevance: 'proxy',
    interpretation: 'Great spotted woodpecker drumming. Single event — territorial behaviour.',
  },
  {
    id: 'det-011',
    nodeId: 'acn-003',
    timestamp: '2026-04-05T05:52:00Z',
    species: 'Taltrast',
    scientificName: 'Turdus philomelos',
    confidence: 0.91,
    signalType: 'vocalization',
    frequencyRangeHz: [2000, 7000],
    durationSec: 9.8,
    beetleRelevance: 'none',
    interpretation: 'Song thrush singing from exposed perch. Normal dawn activity.',
  },
];

// ─── Hourly Activity Patterns ───────────────────────────────────────────────

/** Dawn peak (5-7 AM), midday dip, dusk peak (7-9 PM) — typical boreal forest pattern */
function generateHourlyActivity(nodeId: string): { hour: number; detections: number }[] {
  const basePatterns: Record<string, number[]> = {
    'acn-001': [0, 0, 0, 0, 1, 4, 6, 3, 2, 1, 1, 1, 0, 1, 1, 1, 2, 3, 5, 7, 4, 1, 0, 0],
    'acn-002': [0, 0, 0, 1, 2, 8, 12, 7, 4, 3, 2, 2, 1, 2, 2, 3, 4, 6, 9, 11, 6, 2, 1, 0],
    'acn-003': [0, 0, 0, 0, 0, 2, 3, 2, 1, 1, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 2, 1, 0, 0],
  };

  const pattern = basePatterns[nodeId] ?? basePatterns['acn-001'];
  return pattern.map((detections, hour) => ({ hour, detections }));
}

// ─── Risk Calculation ───────────────────────────────────────────────────────

/**
 * Calculates beetle risk score (0-100) from a set of acoustic detections.
 *
 * Scoring factors:
 * - Direct beetle sounds (gallery_sound, bark_cracking): high weight
 * - Three-toed woodpecker activity: strong proxy signal
 * - Other woodpecker species: moderate proxy signal
 * - Cluster density: multiple detections in short time = higher risk
 */
export function calculateBeetleRiskFromAcoustics(detections: AcousticDetection[]): number {
  if (detections.length === 0) return 0;

  let score = 0;

  const directDetections = detections.filter((d) => d.beetleRelevance === 'direct');
  const proxyDetections = detections.filter((d) => d.beetleRelevance === 'proxy');

  // Direct beetle sound detections: 25 points each, max 60
  score += Math.min(directDetections.length * 25, 60);

  // Confidence-weighted direct signals
  const avgDirectConfidence =
    directDetections.length > 0
      ? directDetections.reduce((sum, d) => sum + d.confidence, 0) / directDetections.length
      : 0;
  score += avgDirectConfidence * 10;

  // Three-toed woodpecker proxy: strongest biological indicator
  const threeToedCount = proxyDetections.filter(
    (d) => d.scientificName === 'Picoides tridactylus'
  ).length;
  score += Math.min(threeToedCount * 8, 30);

  // Other woodpecker proxy signals
  const otherWoodpeckerCount = proxyDetections.filter(
    (d) => d.scientificName !== 'Picoides tridactylus'
  ).length;
  score += Math.min(otherWoodpeckerCount * 3, 12);

  // Temporal clustering bonus: multiple detections within 1 hour
  const timestamps = detections
    .filter((d) => d.beetleRelevance !== 'none')
    .map((d) => new Date(d.timestamp).getTime())
    .sort((a, b) => a - b);

  for (let i = 1; i < timestamps.length; i++) {
    const gapMinutes = (timestamps[i] - timestamps[i - 1]) / 60000;
    if (gapMinutes < 60) {
      score += 3;
    }
  }

  return Math.min(Math.round(score), 100);
}

// ─── Alert Level ────────────────────────────────────────────────────────────

function determineAlertLevel(riskScore: number): 'normal' | 'elevated' | 'high' {
  if (riskScore >= 65) return 'high';
  if (riskScore >= 35) return 'elevated';
  return 'normal';
}

function determineWoodpeckerTrend(
  detections: AcousticDetection[]
): 'increasing' | 'stable' | 'decreasing' {
  const woodpeckerDets = detections.filter((d) => d.beetleRelevance === 'proxy');
  // In a real system this would compare multi-day trends.
  // For demo: >3 woodpecker events in 24h = increasing.
  if (woodpeckerDets.length >= 4) return 'increasing';
  if (woodpeckerDets.length >= 2) return 'stable';
  return 'decreasing';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns network-wide status for all nodes on a parcel.
 */
export function getAcousticNetworkStatus(parcelId: string): AcousticNetworkStatus {
  const nodes = DEMO_NODES.filter((n) => n.parcelId === parcelId);
  const onlineNodes = nodes.filter((n) => n.status === 'online').length;
  const nodeDetections = DEMO_DETECTIONS.filter((d) =>
    nodes.some((n) => n.id === d.nodeId)
  );

  const beetleAlerts = nodes.filter((n) => {
    const dets = DEMO_DETECTIONS.filter((d) => d.nodeId === n.id);
    const risk = calculateBeetleRiskFromAcoustics(dets);
    return risk >= 35;
  }).length;

  const healthFactors = nodes.map((n) => {
    if (n.status === 'offline') return 0;
    if (n.status === 'low_battery') return 50;
    return 100;
  });
  const healthScore =
    healthFactors.length > 0
      ? Math.round(healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length)
      : 0;

  return {
    totalNodes: nodes.length,
    onlineNodes,
    totalDetectionsToday: nodeDetections.length,
    activeBeetleAlerts: beetleAlerts,
    networkHealthScore: healthScore,
    coverageAreaHa: nodes.length * 12.5, // ~12.5 ha effective radius per node
  };
}

/**
 * Returns a 24-hour summary for a specific node, including hourly activity
 * pattern, top species, and beetle risk assessment.
 */
export function getAcousticSummary(
  nodeId: string,
  period: string = 'last_24h'
): AcousticSummary {
  const detections = DEMO_DETECTIONS.filter((d) => d.nodeId === nodeId);

  const woodpeckerDetections = detections.filter((d) => d.beetleRelevance === 'proxy').length;
  const beetleSoundDetections = detections.filter((d) => d.beetleRelevance === 'direct').length;
  const beetleRiskSignal = calculateBeetleRiskFromAcoustics(detections);

  // Aggregate top species
  const speciesCounts = new Map<string, { count: number; totalConf: number }>();
  for (const det of detections) {
    const entry = speciesCounts.get(det.species) ?? { count: 0, totalConf: 0 };
    entry.count += 1;
    entry.totalConf += det.confidence;
    speciesCounts.set(det.species, entry);
  }

  const topSpecies = Array.from(speciesCounts.entries())
    .map(([species, { count, totalConf }]) => ({
      species,
      count,
      confidence: Math.round((totalConf / count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    nodeId,
    period,
    totalDetections: detections.length,
    woodpeckerDetections,
    beetleSoundDetections,
    alertLevel: determineAlertLevel(beetleRiskSignal),
    woodpeckerActivityTrend: determineWoodpeckerTrend(detections),
    beetleRiskSignal,
    topSpecies,
    hourlyActivity: generateHourlyActivity(nodeId),
  };
}

/**
 * Returns the most recent detections for a given node.
 */
export function getRecentDetections(
  nodeId: string,
  limit: number = 10
): AcousticDetection[] {
  return DEMO_DETECTIONS
    .filter((d) => d.nodeId === nodeId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ─── Source Metadata ────────────────────────────────────────────────────────

export const ACOUSTIC_SOURCE_INFO = {
  name: 'BeetleSense Acoustic Monitoring Network',
  description:
    'Canopy-mounted acoustic sensor nodes running BirdNET and OpenSoundscape ML models ' +
    'for real-time detection of woodpecker activity and bark beetle gallery sounds.',
  mlModels: [
    {
      name: 'BirdNET v2.4',
      purpose: 'Bird species identification from vocalizations and drumming',
      url: 'https://birdnet.cornell.edu/',
    },
    {
      name: 'OpenSoundscape',
      purpose: 'Custom classifier for bark beetle gallery sounds and bark cracking events',
      url: 'https://opensoundscape.org/',
    },
  ],
  scientificBasis:
    'Fayt, P. et al. (2005) demonstrated that three-toed woodpecker (Picoides tridactylus) ' +
    'density is a reliable indicator of bark beetle (Ips typographus) outbreaks in boreal ' +
    'spruce forests. Acoustic monitoring extends this biological relationship to continuous, ' +
    'automated surveillance.',
  nodeSpecs: {
    microphone: 'MEMS omnidirectional, 20 Hz – 20 kHz',
    sampleRate: 48000,
    bitDepth: 16,
    effectiveRadius: '~200 m in forest canopy',
    powerSource: 'Solar panel + 18650 LiFePO4 battery',
    connectivity: 'LoRa to gateway, then 4G backhaul',
  },
  dataRefreshInterval: 'Continuous recording, ML classification every 5 seconds',
  license: 'Proprietary sensor data. ML model outputs shared under CC BY-NC 4.0.',
} as const;
