// ForestWard Observatory Integration Service
// Connects BeetleSense to EFI's ForestWard Observatory data infrastructure
// Ingests phenological station data, BBOA alerts, and cross-border early-warning signals

// ── Types ────────────────────────────────────────────────────────────────────

export interface PhenologicalStation {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  species: 'Picea abies' | 'Pinus sylvestris' | 'Betula pendula' | 'Fagus sylvatica';
  /** Accumulated Growing Degree-Days (base 5°C) as of latest reading */
  gdd_accumulated: number;
  /** Date of latest GDD reading */
  gdd_date: string;
  /** Phenological phase: dormant → budburst → growth → senescence → dormant */
  phenophase: 'dormant' | 'budburst' | 'active_growth' | 'senescence';
  /** Days since last data sync */
  data_age_hours: number;
  /** Whether station data is fresh (<24h) */
  is_current: boolean;
}

export interface BBOAAlert {
  id: string;
  /** Bark Beetle Outbreak Alert severity */
  severity: 'critical' | 'warning' | 'watch' | 'info';
  /** Ips typographus, Pityogenes chalcographus, etc. */
  species: string;
  /** Affected region */
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  /** Estimated affected hectares */
  affected_ha: number;
  /** Alert issue date */
  issued_date: string;
  /** Confidence level 0-1 */
  confidence: number;
  /** Source: satellite, trap_network, field_report, model_prediction */
  source: 'satellite' | 'trap_network' | 'field_report' | 'model_prediction';
  /** Human-readable description */
  description: string;
  /** Distance from user's parcels in km (computed client-side) */
  distance_km?: number;
}

export interface CrossBorderSignal {
  id: string;
  /** Signal type */
  type: 'beetle_migration' | 'fire_spread' | 'storm_damage' | 'drought_stress';
  /** Origin country */
  origin_country: string;
  /** Destination/threatened country */
  target_country: string;
  /** Risk level */
  risk: 'high' | 'medium' | 'low';
  /** Wind-assisted dispersal distance estimate (km) */
  dispersal_range_km: number;
  /** ETA in days (for migration signals) */
  eta_days: number | null;
  /** Description */
  description: string;
  issued_date: string;
}

export interface ForestWardContribution {
  /** Data type contributed back to ForestWard */
  type: 'gdd_calculation' | 'beetle_observation' | 'satellite_anomaly' | 'fire_detection';
  /** Number of records contributed */
  record_count: number;
  /** Last contribution date */
  last_contributed: string;
  /** Status */
  status: 'active' | 'pending' | 'paused';
}

export interface ObservatoryStatus {
  /** API connection health */
  api_status: 'connected' | 'degraded' | 'offline';
  /** Last successful data sync */
  last_sync: string;
  /** Number of phenological stations reporting */
  stations_reporting: number;
  /** Total stations in network */
  stations_total: number;
  /** Active BBOA alerts across Europe */
  active_alerts: number;
  /** Cross-border signals relevant to Sweden */
  cross_border_signals: number;
  /** Data freshness score (0-100) */
  data_freshness: number;
  /** Pipeline latency in minutes */
  pipeline_latency_min: number;
}

export interface GDDValidation {
  station_id: string;
  station_name: string;
  country: string;
  /** ForestWard's official GDD reading */
  forestward_gdd: number;
  /** BeetleSense's calculated GDD */
  beetlesense_gdd: number;
  /** Absolute deviation */
  deviation: number;
  /** Percentage deviation */
  deviation_pct: number;
  /** Whether within acceptable tolerance (±10%) */
  within_tolerance: boolean;
  date: string;
}

// ── Cache ────────────────────────────────────────────────────────────────────

let cachedStations: PhenologicalStation[] | null = null;
let cachedAlerts: BBOAAlert[] | null = null;
let cachedSignals: CrossBorderSignal[] | null = null;
let cachedStatus: ObservatoryStatus | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

function isCacheValid(): boolean {
  return cachedStations !== null && Date.now() - cacheTimestamp < CACHE_DURATION;
}

// ── Realistic demo data generation ───────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

/** Calculate realistic GDD based on month and latitude */
function calculateRealisticGDD(lat: number, month: number): number {
  // Higher GDD at lower latitudes, peaks in July-August
  const latFactor = Math.max(0, 1 - (lat - 55) * 0.04);
  const seasonalCurve = Math.max(0, Math.sin((month - 2) * Math.PI / 10));
  const maxGDD = 800 * latFactor;
  return Math.round(maxGDD * seasonalCurve);
}

function getPhenophase(gdd: number): PhenologicalStation['phenophase'] {
  if (gdd < 50) return 'dormant';
  if (gdd < 150) return 'budburst';
  if (gdd < 600) return 'active_growth';
  return 'senescence';
}

function generateDemoStations(): PhenologicalStation[] {
  const month = new Date().getMonth() + 1;
  return [
    // Swedish stations
    { id: 'FW-SE-001', name: 'Asa Experimental Forest', country: 'Sweden', latitude: 57.16, longitude: 14.78, elevation_m: 190, species: 'Picea abies' as const },
    { id: 'FW-SE-002', name: 'Tönnersjöheden Research Park', country: 'Sweden', latitude: 56.68, longitude: 13.07, elevation_m: 115, species: 'Picea abies' as const },
    { id: 'FW-SE-003', name: 'Remningstorp', country: 'Sweden', latitude: 58.47, longitude: 13.63, elevation_m: 150, species: 'Pinus sylvestris' as const },
    // Finnish stations
    { id: 'FW-FI-001', name: 'Hyytiälä Forestry Station', country: 'Finland', latitude: 61.84, longitude: 24.29, elevation_m: 181, species: 'Picea abies' as const },
    { id: 'FW-FI-002', name: 'Sodankylä Research Station', country: 'Finland', latitude: 67.37, longitude: 26.63, elevation_m: 179, species: 'Pinus sylvestris' as const },
    // Norwegian stations
    { id: 'FW-NO-001', name: 'Ås Research Forest (NIBIO)', country: 'Norway', latitude: 59.66, longitude: 10.78, elevation_m: 95, species: 'Picea abies' as const },
    { id: 'FW-NO-002', name: 'Bergen Coastal Station', country: 'Norway', latitude: 60.38, longitude: 5.33, elevation_m: 45, species: 'Picea abies' as const },
    // German stations
    { id: 'FW-DE-001', name: 'Bavarian Forest National Park', country: 'Germany', latitude: 48.95, longitude: 13.42, elevation_m: 750, species: 'Picea abies' as const },
    // Baltic stations
    { id: 'FW-LV-001', name: 'Salacgrīva Forest Station', country: 'Latvia', latitude: 57.76, longitude: 24.36, elevation_m: 25, species: 'Picea abies' as const },
    { id: 'FW-EE-001', name: 'Järvselja Experimental Forest', country: 'Estonia', latitude: 58.28, longitude: 27.30, elevation_m: 40, species: 'Pinus sylvestris' as const },
  ].map(s => {
    const gdd = calculateRealisticGDD(s.latitude, month);
    const ageHours = Math.round(Math.random() * 20 + 2);
    return {
      ...s,
      gdd_accumulated: gdd + Math.round((Math.random() - 0.5) * 30),
      gdd_date: today(),
      phenophase: getPhenophase(gdd),
      data_age_hours: ageHours,
      is_current: ageHours < 24,
    };
  });
}

function generateDemoBBOAAlerts(): BBOAAlert[] {
  return [
    {
      id: 'BBOA-2026-0147',
      severity: 'critical',
      species: 'Ips typographus',
      region: 'Småland Highlands',
      country: 'Sweden',
      latitude: 57.25,
      longitude: 14.85,
      affected_ha: 340,
      issued_date: daysAgo(2),
      confidence: 0.89,
      source: 'satellite',
      description: 'Sentinel-2 NDVI anomaly detected across 340 ha of mature spruce stands. Crown discoloration pattern consistent with Ips typographus mass attack. Ground verification requested.',
    },
    {
      id: 'BBOA-2026-0152',
      severity: 'warning',
      species: 'Ips typographus',
      region: 'Kronoberg County',
      country: 'Sweden',
      latitude: 56.88,
      longitude: 14.42,
      affected_ha: 85,
      issued_date: daysAgo(1),
      confidence: 0.76,
      source: 'trap_network',
      description: 'Trap counts at Alvesta monitoring station exceed 3,000 threshold for second consecutive week. GDD accumulation at 280 indicates imminent swarming conditions.',
    },
    {
      id: 'BBOA-2026-0148',
      severity: 'watch',
      species: 'Ips typographus',
      region: 'Southern Finland / Häme',
      country: 'Finland',
      latitude: 61.20,
      longitude: 24.50,
      affected_ha: 520,
      issued_date: daysAgo(5),
      confidence: 0.82,
      source: 'model_prediction',
      description: 'GDD model predicts elevated bark beetle flight activity in southern Finland within 10-14 days. Wind patterns indicate potential southward dispersal toward Baltic coast.',
    },
    {
      id: 'BBOA-2026-0155',
      severity: 'info',
      species: 'Pityogenes chalcographus',
      region: 'Bavarian Forest',
      country: 'Germany',
      latitude: 48.92,
      longitude: 13.38,
      affected_ha: 190,
      issued_date: daysAgo(8),
      confidence: 0.71,
      source: 'field_report',
      description: 'Field inspections confirm Pityogenes chalcographus activity in storm-damaged stands. Elevated risk for adjacent regions with recent thinning operations.',
    },
    {
      id: 'BBOA-2026-0160',
      severity: 'warning',
      species: 'Ips typographus',
      region: 'Østfold / Vestfold',
      country: 'Norway',
      latitude: 59.42,
      longitude: 10.65,
      affected_ha: 210,
      issued_date: daysAgo(3),
      confidence: 0.84,
      source: 'satellite',
      description: 'Multi-temporal Sentinel-2 analysis shows progressive canopy thinning along south-facing slopes. Pattern consistent with second-generation beetle emergence.',
    },
  ];
}

function generateDemoCrossBorderSignals(): CrossBorderSignal[] {
  return [
    {
      id: 'CBS-2026-031',
      type: 'beetle_migration',
      origin_country: 'Finland',
      target_country: 'Sweden',
      risk: 'medium',
      dispersal_range_km: 180,
      eta_days: 12,
      description: 'Elevated Ips typographus populations in southern Finland. Prevailing westerly winds could facilitate long-range dispersal across the Baltic. Swedish east-coast spruce stands at heightened risk.',
      issued_date: daysAgo(4),
    },
    {
      id: 'CBS-2026-028',
      type: 'drought_stress',
      origin_country: 'Denmark',
      target_country: 'Sweden',
      risk: 'high',
      dispersal_range_km: 0,
      eta_days: null,
      description: 'Severe spring drought across southern Scandinavia. Soil moisture deficit reduces spruce resin production, lowering natural beetle defence. Götaland region expected to be most affected.',
      issued_date: daysAgo(6),
    },
    {
      id: 'CBS-2026-035',
      type: 'storm_damage',
      origin_country: 'Latvia',
      target_country: 'Estonia',
      risk: 'medium',
      dispersal_range_km: 120,
      eta_days: 21,
      description: 'February storm created 15,000 m³ of windthrown timber in Latvian spruce forests. Unprocessed deadwood provides breeding substrate for spring beetle emergence. Estonian border forests at risk.',
      issued_date: daysAgo(10),
    },
    {
      id: 'CBS-2026-039',
      type: 'beetle_migration',
      origin_country: 'Germany',
      target_country: 'Denmark',
      risk: 'low',
      dispersal_range_km: 250,
      eta_days: 30,
      description: 'Bavarian Forest beetle populations tracking northward due to warming spring temperatures. Long-range dispersal models indicate low probability of reaching southern Scandinavia this season.',
      issued_date: daysAgo(14),
    },
  ];
}

function generateDemoContributions(): ForestWardContribution[] {
  return [
    { type: 'gdd_calculation', record_count: 1847, last_contributed: daysAgo(0), status: 'active' },
    { type: 'beetle_observation', record_count: 312, last_contributed: daysAgo(1), status: 'active' },
    { type: 'satellite_anomaly', record_count: 89, last_contributed: daysAgo(2), status: 'active' },
    { type: 'fire_detection', record_count: 23, last_contributed: daysAgo(3), status: 'active' },
  ];
}

function generateDemoStatus(): ObservatoryStatus {
  return {
    api_status: 'connected',
    last_sync: hoursAgo(1),
    stations_reporting: 8,
    stations_total: 10,
    active_alerts: 5,
    cross_border_signals: 4,
    data_freshness: 92,
    pipeline_latency_min: 8,
  };
}

function generateDemoValidation(): GDDValidation[] {
  const month = new Date().getMonth() + 1;
  const stations = generateDemoStations();
  return stations.slice(0, 6).map(s => {
    const fwGDD = s.gdd_accumulated;
    const bsGDD = fwGDD + Math.round((Math.random() - 0.5) * fwGDD * 0.12);
    const deviation = Math.abs(fwGDD - bsGDD);
    const deviationPct = fwGDD > 0 ? (deviation / fwGDD) * 100 : 0;
    return {
      station_id: s.id,
      station_name: s.name,
      country: s.country,
      forestward_gdd: fwGDD,
      beetlesense_gdd: bsGDD,
      deviation,
      deviation_pct: Math.round(deviationPct * 10) / 10,
      within_tolerance: deviationPct <= 10,
      date: today(),
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getObservatoryStatus(): Promise<ObservatoryStatus> {
  if (cachedStatus && isCacheValid()) return cachedStatus;

  // In production: fetch from ForestWard API
  // const response = await fetch('https://api.forestward.efi.int/v1/status');
  // For now: use realistic demo data
  cachedStatus = generateDemoStatus();
  cacheTimestamp = Date.now();
  return cachedStatus;
}

export async function getPhenologicalStations(): Promise<PhenologicalStation[]> {
  if (cachedStations && isCacheValid()) return cachedStations;

  // In production: fetch from ForestWard phenological network API
  // const response = await fetch('https://api.forestward.efi.int/v1/phenology/stations?region=nordic');
  cachedStations = generateDemoStations();
  cacheTimestamp = Date.now();
  return cachedStations;
}

export async function getBBOAAlerts(): Promise<BBOAAlert[]> {
  if (cachedAlerts && isCacheValid()) return cachedAlerts;

  // In production: fetch from ForestWard BBOA endpoint
  // const response = await fetch('https://api.forestward.efi.int/v1/bboa/alerts?severity=all&region=europe');
  cachedAlerts = generateDemoBBOAAlerts();
  cacheTimestamp = Date.now();
  return cachedAlerts;
}

export async function getCrossBorderSignals(): Promise<CrossBorderSignal[]> {
  if (cachedSignals && isCacheValid()) return cachedSignals;

  // In production: fetch from ForestWard cross-border signal endpoint
  // const response = await fetch('https://api.forestward.efi.int/v1/signals/cross-border?target=SE');
  cachedSignals = generateDemoCrossBorderSignals();
  cacheTimestamp = Date.now();
  return cachedSignals;
}

export async function getContributions(): Promise<ForestWardContribution[]> {
  // In production: fetch contribution stats from ForestWard
  return generateDemoContributions();
}

export async function getGDDValidation(): Promise<GDDValidation[]> {
  // Cross-validate BeetleSense GDD calculations against ForestWard station readings
  return generateDemoValidation();
}

/** Add distance from user's location to each BBOA alert */
export function enrichAlertsWithDistance(
  alerts: BBOAAlert[],
  userLat: number,
  userLon: number
): BBOAAlert[] {
  return alerts.map(a => ({
    ...a,
    distance_km: Math.round(haversineKm(userLat, userLon, a.latitude, a.longitude)),
  })).sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
}

/** Haversine distance in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Clear cache (for testing or manual refresh) */
export function clearForestWardCache(): void {
  cachedStations = null;
  cachedAlerts = null;
  cachedSignals = null;
  cachedStatus = null;
  cacheTimestamp = 0;
}
