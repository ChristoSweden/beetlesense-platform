/**
 * Field Observation Intake Service
 *
 * Forest owners submit structured field observations that feed the intelligence loop.
 * Observations are cross-referenced with satellite data and can be verified by
 * nearby community members to build a trusted ground-truth network.
 *
 * Persistence: localStorage in demo mode.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ObservationType =
  | 'beetle_bore_dust' | 'beetle_entry_holes' | 'crown_browning' | 'crown_thinning'
  | 'wind_damage' | 'storm_fell' | 'wild_boar_rooting' | 'drought_stress'
  | 'fungal_infection' | 'bark_peeling' | 'resin_flow' | 'healthy_stand'
  | 'wet_area' | 'erosion' | 'fire_damage' | 'other';

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface SatelliteCrossRef {
  ndviAnomaly: boolean;
  sarChange: boolean;
  firmsDetection: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface FieldObservation {
  id: string;
  userId: string;
  type: ObservationType;
  severity: Severity;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  photoIds: string[];
  notes: string;
  parcelId?: string;
  verified: boolean;
  verificationCount: number;
  satelliteCrossRef?: SatelliteCrossRef;
}

export interface ObservationStats {
  total: number;
  verified: number;
  byType: Record<string, number>;
  last30Days: number;
}

// ── Observation type labels ─────────────────────────────────────────────────

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, string> = {
  beetle_bore_dust: 'Bore Dust',
  beetle_entry_holes: 'Entry Holes',
  crown_browning: 'Crown Browning',
  crown_thinning: 'Crown Thinning',
  wind_damage: 'Wind Damage',
  storm_fell: 'Storm Fell',
  wild_boar_rooting: 'Wild Boar Rooting',
  drought_stress: 'Drought Stress',
  fungal_infection: 'Fungal Infection',
  bark_peeling: 'Bark Peeling',
  resin_flow: 'Resin Flow',
  healthy_stand: 'Healthy Stand',
  wet_area: 'Wet Area',
  erosion: 'Erosion',
  fire_damage: 'Fire Damage',
  other: 'Other',
};

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'beetlesense-observations';

function loadObservations(): FieldObservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveObservations(obs: FieldObservation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obs));
}

// ── Haversine ───────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgo(n: number): number {
  return Date.now() - n * 86400000;
}

// ── Demo Data ───────────────────────────────────────────────────────────────

function generateDemoObservations(): FieldObservation[] {
  const userId = 'demo-user';
  const observations: FieldObservation[] = [
    // Beetle sightings — Värnamo area
    { id: 'obs_d01', userId, type: 'beetle_bore_dust', severity: 4, lat: 57.186, lng: 14.048, accuracy: 5, timestamp: daysAgo(1), photoIds: ['ph_d01'], notes: 'Fresh bore dust at base of 3 mature spruce. Trees approx 60 years old, south-facing slope.', parcelId: 'P001', verified: true, verificationCount: 3, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: false, confidence: 'high' } },
    { id: 'obs_d02', userId, type: 'beetle_entry_holes', severity: 5, lat: 57.192, lng: 14.062, accuracy: 8, timestamp: daysAgo(3), photoIds: ['ph_d02', 'ph_d03'], notes: 'Multiple 2mm entry holes on 5 spruce trees. Brown dust accumulation visible. Bark flaking in places.', parcelId: 'P001', verified: true, verificationCount: 4, satelliteCrossRef: { ndviAnomaly: true, sarChange: true, firmsDetection: false, confidence: 'high' } },
    { id: 'obs_d03', userId, type: 'beetle_bore_dust', severity: 3, lat: 57.210, lng: 14.105, accuracy: 12, timestamp: daysAgo(5), photoIds: [], notes: 'Traces of bore dust on one tree. Neighbouring trees appear healthy. Monitoring.', parcelId: 'P002', verified: false, verificationCount: 0, satelliteCrossRef: { ndviAnomaly: false, sarChange: false, firmsDetection: false, confidence: 'low' } },
    { id: 'obs_d04', userId: 'user_erik', type: 'beetle_bore_dust', severity: 4, lat: 57.175, lng: 14.030, accuracy: 6, timestamp: daysAgo(2), photoIds: ['ph_d04'], notes: 'Bore dust on spruce stand near logging road. 8 affected trees.', verified: true, verificationCount: 2, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: false, confidence: 'medium' } },

    // Crown damage
    { id: 'obs_d05', userId, type: 'crown_browning', severity: 3, lat: 57.220, lng: 14.150, accuracy: 10, timestamp: daysAgo(7), photoIds: ['ph_d05'], notes: 'Cluster of 4 spruce with browning crowns on ridge top. Possible beetle or drought stress.', parcelId: 'P002', verified: false, verificationCount: 0, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: false, confidence: 'medium' } },
    { id: 'obs_d06', userId: 'user_anna', type: 'crown_thinning', severity: 2, lat: 57.245, lng: 14.180, accuracy: 15, timestamp: daysAgo(10), photoIds: [], notes: 'Slight crown thinning observed in older pine stand. May be age-related.', verified: false, verificationCount: 0 },

    // Wind damage — Jönköping area
    { id: 'obs_d07', userId, type: 'wind_damage', severity: 4, lat: 57.781, lng: 14.163, accuracy: 5, timestamp: daysAgo(4), photoIds: ['ph_d06', 'ph_d07'], notes: 'Approx 15 trees wind-thrown from last week storm. Mix of spruce and pine. Access road partially blocked.', parcelId: 'P003', verified: true, verificationCount: 3, satelliteCrossRef: { ndviAnomaly: false, sarChange: true, firmsDetection: false, confidence: 'high' } },
    { id: 'obs_d08', userId: 'user_lars', type: 'storm_fell', severity: 5, lat: 57.795, lng: 14.190, accuracy: 4, timestamp: daysAgo(3), photoIds: ['ph_d08'], notes: 'Major wind-throw area. Estimated 50+ trees down across 2 hectares.', verified: true, verificationCount: 5, satelliteCrossRef: { ndviAnomaly: true, sarChange: true, firmsDetection: false, confidence: 'high' } },

    // Wild boar
    { id: 'obs_d09', userId, type: 'wild_boar_rooting', severity: 2, lat: 57.160, lng: 14.020, accuracy: 20, timestamp: daysAgo(6), photoIds: ['ph_d09'], notes: 'Wild boar rooting damage in recently planted regeneration area. About 30 seedlings destroyed.', parcelId: 'P004', verified: false, verificationCount: 0 },
    { id: 'obs_d10', userId: 'user_maria', type: 'wild_boar_rooting', severity: 3, lat: 57.155, lng: 14.010, accuracy: 15, timestamp: daysAgo(8), photoIds: [], notes: 'Extensive boar damage in oak regeneration. Need fencing.', verified: false, verificationCount: 0 },

    // Drought stress
    { id: 'obs_d11', userId, type: 'drought_stress', severity: 3, lat: 57.200, lng: 14.090, accuracy: 10, timestamp: daysAgo(12), photoIds: ['ph_d10'], notes: 'Wilting observed in young spruce plantation (10 yr). Soil very dry. No rain for 3 weeks.', parcelId: 'P002', verified: false, verificationCount: 0, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: false, confidence: 'medium' } },
    { id: 'obs_d12', userId: 'user_ola', type: 'drought_stress', severity: 2, lat: 57.310, lng: 14.250, accuracy: 25, timestamp: daysAgo(14), photoIds: [], notes: 'Sandy soil site showing early drought symptoms. Pine regeneration area.', verified: false, verificationCount: 0 },

    // Healthy stands
    { id: 'obs_d13', userId, type: 'healthy_stand', severity: 1, lat: 57.230, lng: 14.120, accuracy: 8, timestamp: daysAgo(2), photoIds: ['ph_d11'], notes: 'Mixed spruce/birch stand in excellent health. Good crown density, no signs of stress.', parcelId: 'P005', verified: false, verificationCount: 0, satelliteCrossRef: { ndviAnomaly: false, sarChange: false, firmsDetection: false, confidence: 'high' } },
    { id: 'obs_d14', userId, type: 'healthy_stand', severity: 1, lat: 57.250, lng: 14.165, accuracy: 6, timestamp: daysAgo(9), photoIds: [], notes: 'Mature pine stand with excellent vitality indicators. Good resin flow.', parcelId: 'P005', verified: false, verificationCount: 0 },

    // Fungal and misc
    { id: 'obs_d15', userId, type: 'fungal_infection', severity: 3, lat: 57.170, lng: 14.055, accuracy: 10, timestamp: daysAgo(15), photoIds: ['ph_d12'], notes: 'Heterobasidion root rot visible on cut stump. Adjacent living trees may be infected.', parcelId: 'P001', verified: false, verificationCount: 0 },
    { id: 'obs_d16', userId: 'user_erik', type: 'bark_peeling', severity: 2, lat: 57.280, lng: 14.200, accuracy: 12, timestamp: daysAgo(11), photoIds: [], notes: 'Bark peeling on 2 birch trees. Likely frost crack damage from winter.', verified: false, verificationCount: 0 },
    { id: 'obs_d17', userId, type: 'resin_flow', severity: 1, lat: 57.195, lng: 14.075, accuracy: 5, timestamp: daysAgo(4), photoIds: ['ph_d13'], notes: 'Strong resin flow on spruce. Healthy defence response. Monitoring for beetle pressure.', parcelId: 'P001', verified: false, verificationCount: 0 },

    // Water and erosion
    { id: 'obs_d18', userId, type: 'wet_area', severity: 2, lat: 57.215, lng: 14.130, accuracy: 15, timestamp: daysAgo(18), photoIds: [], notes: 'Wet depression forming near forest road. Drainage channel may be blocked.', parcelId: 'P002', verified: false, verificationCount: 0 },
    { id: 'obs_d19', userId: 'user_anna', type: 'erosion', severity: 3, lat: 57.760, lng: 14.140, accuracy: 10, timestamp: daysAgo(20), photoIds: ['ph_d14'], notes: 'Erosion along stream bank after heavy rains. Buffer zone trees at risk.', verified: false, verificationCount: 0 },

    // Fire damage
    { id: 'obs_d20', userId: 'user_lars', type: 'fire_damage', severity: 4, lat: 57.320, lng: 14.280, accuracy: 8, timestamp: daysAgo(25), photoIds: ['ph_d15'], notes: 'Small ground fire damage from last month. Approx 0.3 ha affected. Regeneration needed.', verified: true, verificationCount: 2, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: true, confidence: 'high' } },

    // More beetle observations from community
    { id: 'obs_d21', userId: 'user_ola', type: 'beetle_bore_dust', severity: 3, lat: 57.300, lng: 14.240, accuracy: 10, timestamp: daysAgo(6), photoIds: [], notes: 'Minor bore dust on 2 trees along powerline clearing. Trees were previously wind-damaged.', verified: false, verificationCount: 0 },
    { id: 'obs_d22', userId: 'user_maria', type: 'beetle_entry_holes', severity: 4, lat: 57.165, lng: 14.005, accuracy: 7, timestamp: daysAgo(2), photoIds: ['ph_d16'], notes: 'Entry holes and galleries visible under bark. At least 10 trees colonized.', verified: true, verificationCount: 2, satelliteCrossRef: { ndviAnomaly: true, sarChange: false, firmsDetection: false, confidence: 'medium' } },

    // Other
    { id: 'obs_d23', userId, type: 'other', severity: 2, lat: 57.240, lng: 14.155, accuracy: 20, timestamp: daysAgo(8), photoIds: [], notes: 'Moose browsing damage on young pine. About 20% of leaders clipped.', parcelId: 'P005', verified: false, verificationCount: 0 },
    { id: 'obs_d24', userId: 'user_erik', type: 'wind_damage', severity: 3, lat: 57.290, lng: 14.220, accuracy: 12, timestamp: daysAgo(5), photoIds: [], notes: 'Several topped spruces from recent gusty winds. Snow crown breakage.', verified: false, verificationCount: 0 },
    { id: 'obs_d25', userId, type: 'healthy_stand', severity: 1, lat: 57.205, lng: 14.100, accuracy: 5, timestamp: daysAgo(1), photoIds: [], notes: 'Post-thinning check. Stand responding well, good spacing. No issues.', parcelId: 'P002', verified: false, verificationCount: 0 },
  ];

  return observations;
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  const existing = loadObservations();
  if (existing.length === 0) {
    saveObservations(generateDemoObservations());
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function submitObservation(
  obs: Omit<FieldObservation, 'id' | 'verified' | 'verificationCount' | 'satelliteCrossRef'>
): FieldObservation {
  ensureInitialized();
  const fullObs: FieldObservation = {
    ...obs,
    id: generateId(),
    verified: false,
    verificationCount: 0,
    satelliteCrossRef: crossReferenceWithSatellite({
      ...obs,
      id: '',
      verified: false,
      verificationCount: 0,
    }),
  };
  const all = loadObservations();
  all.unshift(fullObs);
  saveObservations(all);
  return fullObs;
}

export function getObservationsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  daysBack: number = 30
): FieldObservation[] {
  ensureInitialized();
  const cutoff = Date.now() - daysBack * 86400000;
  return loadObservations().filter(obs => {
    if (obs.timestamp < cutoff) return false;
    return haversineKm(lat, lng, obs.lat, obs.lng) <= radiusKm;
  });
}

export function getObservationsByParcel(parcelId: string): FieldObservation[] {
  ensureInitialized();
  return loadObservations().filter(o => o.parcelId === parcelId);
}

export function verifyObservation(observationId: string, _userId: string): void {
  ensureInitialized();
  const all = loadObservations();
  const obs = all.find(o => o.id === observationId);
  if (obs) {
    obs.verificationCount += 1;
    if (obs.verificationCount >= 2) obs.verified = true;
    saveObservations(all);
  }
}

export function crossReferenceWithSatellite(obs: FieldObservation): SatelliteCrossRef {
  // Demo: simulate satellite cross-reference based on observation type
  const beetleTypes: ObservationType[] = ['beetle_bore_dust', 'beetle_entry_holes', 'crown_browning', 'crown_thinning'];
  const isBeetle = beetleTypes.includes(obs.type);
  const isHighSeverity = obs.severity >= 4;

  return {
    ndviAnomaly: isBeetle && isHighSeverity ? Math.random() > 0.2 : Math.random() > 0.7,
    sarChange: obs.type === 'wind_damage' || obs.type === 'storm_fell' ? Math.random() > 0.3 : Math.random() > 0.85,
    firmsDetection: obs.type === 'fire_damage',
    confidence: isBeetle && isHighSeverity ? 'high' : isHighSeverity ? 'medium' : 'low',
  };
}

export function getObservationStats(): ObservationStats {
  ensureInitialized();
  const all = loadObservations();
  const cutoff = Date.now() - 30 * 86400000;
  const byType: Record<string, number> = {};
  for (const obs of all) {
    byType[obs.type] = (byType[obs.type] ?? 0) + 1;
  }
  return {
    total: all.length,
    verified: all.filter(o => o.verified).length,
    byType,
    last30Days: all.filter(o => o.timestamp >= cutoff).length,
  };
}

export function getAllObservations(): FieldObservation[] {
  ensureInitialized();
  return loadObservations();
}

export function getUserObservations(userId: string): FieldObservation[] {
  ensureInitialized();
  return loadObservations().filter(o => o.userId === userId);
}
