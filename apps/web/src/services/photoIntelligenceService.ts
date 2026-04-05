/**
 * Photo Intelligence Service
 *
 * Photos from phones become ground-truth data points that validate satellite observations.
 * Supports upload, AI classification (demo: mock), and satellite cross-validation.
 *
 * Persistence: localStorage in demo mode.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type PhotoClassification =
  | 'bore_dust' | 'entry_holes' | 'crown_discoloration' | 'bark_damage'
  | 'wind_throw' | 'ground_damage' | 'healthy_tree' | 'fungal_body'
  | 'trap_reading' | 'harvest_site' | 'water_damage' | 'unknown';

export interface SatelliteValidation {
  ndviAtLocation: number;
  ndviAnomaly: boolean;
  lastSatellitePass: string;
  agreement: 'confirms' | 'contradicts' | 'inconclusive';
}

export interface PhotoIntelligence {
  id: string;
  userId: string;
  filename: string;
  uploadedAt: number;
  lat: number;
  lng: number;
  classification: PhotoClassification;
  confidence: number;
  aiDescription: string;
  linkedObservationId?: string;
  linkedParcelId?: string;
  satelliteValidation?: SatelliteValidation;
  metadata: {
    deviceModel?: string;
    focalLength?: number;
    timestamp: string;
    compass?: number;
  };
}

export interface PhotoStats {
  totalPhotos: number;
  classified: number;
  linkedToObservations: number;
  satelliteValidated: number;
}

// ── Classification labels ───────────────────────────────────────────────────

export const PHOTO_CLASS_LABELS: Record<PhotoClassification, string> = {
  bore_dust: 'Bore Dust',
  entry_holes: 'Entry Holes',
  crown_discoloration: 'Crown Discoloration',
  bark_damage: 'Bark Damage',
  wind_throw: 'Wind Throw',
  ground_damage: 'Ground Damage',
  healthy_tree: 'Healthy Tree',
  fungal_body: 'Fungal Body',
  trap_reading: 'Trap Reading',
  harvest_site: 'Harvest Site',
  water_damage: 'Water Damage',
  unknown: 'Unknown',
};

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'beetlesense-photos';

function loadPhotos(): PhotoIntelligence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePhotos(photos: PhotoIntelligence[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgo(n: number): number {
  return Date.now() - n * 86400000;
}

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ── AI Classification descriptions ──────────────────────────────────────────

const AI_DESCRIPTIONS: Record<PhotoClassification, string[]> = {
  bore_dust: [
    'Bore dust visible at base of spruce trunk, approximately 2mm entry holes detected. Consistent with Ips typographus initial colonization phase.',
    'Fine reddish-brown bore dust accumulation on bark surface and ground. Multiple boring sites indicate active infestation.',
  ],
  entry_holes: [
    'Multiple 2-3mm diameter entry holes identified on bark surface. Gallery pattern suggests Ips typographus. Bark lifting at margins.',
    'Dense entry hole pattern on spruce trunk. Holes show characteristic circular shape of bark beetle boring.',
  ],
  crown_discoloration: [
    'Crown showing progressive yellowing from top downward. Pattern consistent with bark beetle-induced mortality or severe drought stress.',
    'Red-brown crown discoloration in upper third of canopy. Adjacent trees showing early signs of same pattern.',
  ],
  bark_damage: [
    'Bark peeling in patches exposing gallery patterns underneath. Woodpecker activity also visible — secondary indicator of beetle presence.',
    'Mechanical bark damage, possibly from harvester contact. Exposed cambium creating potential beetle entry point.',
  ],
  wind_throw: [
    'Complete root plate failure with uprooted tree. Root system shallow, typical of waterlogged site. Fresh breakage.',
    'Multiple trees wind-thrown in same direction indicating directional storm damage. Stems intact — salvage potential.',
  ],
  ground_damage: [
    'Wild boar rooting damage in regeneration area. Seedlings uprooted and soil disturbed across approximately 20m2.',
    'Vehicle track damage on wet forest floor. Rut depth approximately 30cm, drainage pattern disrupted.',
  ],
  healthy_tree: [
    'Tree crown full and green with no visible stress indicators. Bark intact, good resin flow visible at branch scars.',
    'Healthy spruce with dense crown and normal needle color. No signs of biotic or abiotic damage.',
  ],
  fungal_body: [
    'Heterobasidion fruiting body identified on cut stump surface. Root rot infection likely spreading to adjacent trees.',
    'Bracket fungus (Fomes fomentarius) on birch trunk. Tree shows signs of heartwood decay.',
  ],
  trap_reading: [
    'Pheromone trap collection showing approximately 2,400 Ips typographus specimens. Trap funnel and collection container visible.',
    'Weekly trap count photograph. Estimated 800 beetles based on visual assessment of catch tray.',
  ],
  harvest_site: [
    'Sanitation felling site. Stumps treated with Rotstop. Landing area cleared and logs stacked for transport.',
    'Thinning operation in progress. Harvester tracks visible. Good spacing achieved between remaining trees.',
  ],
  water_damage: [
    'Standing water in depression following heavy rain. Several spruce showing root collar damage from prolonged waterlogging.',
    'Stream bank erosion threatening buffer zone trees. Root exposure visible on 3 trees nearest water course.',
  ],
  unknown: [
    'Image classification uncertain. Multiple features present that could indicate different conditions. Manual review recommended.',
    'Unable to determine primary classification with sufficient confidence. Photo may require higher resolution or different angle.',
  ],
};

// ── Weighted random classification ──────────────────────────────────────────

const CLASSIFICATION_WEIGHTS: [PhotoClassification, number][] = [
  ['bore_dust', 20],
  ['entry_holes', 15],
  ['crown_discoloration', 10],
  ['bark_damage', 8],
  ['wind_throw', 8],
  ['ground_damage', 5],
  ['healthy_tree', 15],
  ['fungal_body', 5],
  ['trap_reading', 3],
  ['harvest_site', 3],
  ['water_damage', 3],
  ['unknown', 5],
];

function weightedRandomClassification(): PhotoClassification {
  const totalWeight = CLASSIFICATION_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * totalWeight;
  for (const [cls, weight] of CLASSIFICATION_WEIGHTS) {
    r -= weight;
    if (r <= 0) return cls;
  }
  return 'unknown';
}

// ── Demo Data ───────────────────────────────────────────────────────────────

function generateDemoPhotos(): PhotoIntelligence[] {
  return [
    { id: 'photo_d01', userId: 'demo-user', filename: 'IMG_2024_bore_dust.jpg', uploadedAt: daysAgo(1), lat: 57.186, lng: 14.048, classification: 'bore_dust', confidence: 0.92, aiDescription: AI_DESCRIPTIONS.bore_dust[0], linkedObservationId: 'obs_d01', linkedParcelId: 'P001', satelliteValidation: { ndviAtLocation: 0.58, ndviAnomaly: true, lastSatellitePass: daysAgoISO(2), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 26, timestamp: daysAgoISO(1), compass: 145 } },
    { id: 'photo_d02', userId: 'demo-user', filename: 'IMG_2024_entry_holes.jpg', uploadedAt: daysAgo(3), lat: 57.192, lng: 14.062, classification: 'entry_holes', confidence: 0.88, aiDescription: AI_DESCRIPTIONS.entry_holes[0], linkedObservationId: 'obs_d02', linkedParcelId: 'P001', satelliteValidation: { ndviAtLocation: 0.52, ndviAnomaly: true, lastSatellitePass: daysAgoISO(3), agreement: 'confirms' }, metadata: { deviceModel: 'Samsung Galaxy S24', focalLength: 24, timestamp: daysAgoISO(3), compass: 220 } },
    { id: 'photo_d03', userId: 'demo-user', filename: 'IMG_2024_crown_brown.jpg', uploadedAt: daysAgo(7), lat: 57.220, lng: 14.150, classification: 'crown_discoloration', confidence: 0.79, aiDescription: AI_DESCRIPTIONS.crown_discoloration[0], linkedObservationId: 'obs_d05', linkedParcelId: 'P002', satelliteValidation: { ndviAtLocation: 0.61, ndviAnomaly: true, lastSatellitePass: daysAgoISO(5), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 26, timestamp: daysAgoISO(7) } },
    { id: 'photo_d04', userId: 'demo-user', filename: 'IMG_2024_windthrow.jpg', uploadedAt: daysAgo(4), lat: 57.781, lng: 14.163, classification: 'wind_throw', confidence: 0.95, aiDescription: AI_DESCRIPTIONS.wind_throw[0], linkedObservationId: 'obs_d07', linkedParcelId: 'P003', satelliteValidation: { ndviAtLocation: 0.35, ndviAnomaly: true, lastSatellitePass: daysAgoISO(3), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 13, timestamp: daysAgoISO(4), compass: 80 } },
    { id: 'photo_d05', userId: 'demo-user', filename: 'IMG_2024_boar_damage.jpg', uploadedAt: daysAgo(6), lat: 57.160, lng: 14.020, classification: 'ground_damage', confidence: 0.84, aiDescription: AI_DESCRIPTIONS.ground_damage[0], linkedObservationId: 'obs_d09', linkedParcelId: 'P004', metadata: { deviceModel: 'Samsung Galaxy S24', focalLength: 24, timestamp: daysAgoISO(6) } },
    { id: 'photo_d06', userId: 'demo-user', filename: 'IMG_2024_healthy.jpg', uploadedAt: daysAgo(2), lat: 57.230, lng: 14.120, classification: 'healthy_tree', confidence: 0.91, aiDescription: AI_DESCRIPTIONS.healthy_tree[0], linkedObservationId: 'obs_d13', linkedParcelId: 'P005', satelliteValidation: { ndviAtLocation: 0.82, ndviAnomaly: false, lastSatellitePass: daysAgoISO(1), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 26, timestamp: daysAgoISO(2), compass: 310 } },
    { id: 'photo_d07', userId: 'demo-user', filename: 'IMG_2024_fungus.jpg', uploadedAt: daysAgo(15), lat: 57.170, lng: 14.055, classification: 'fungal_body', confidence: 0.87, aiDescription: AI_DESCRIPTIONS.fungal_body[0], linkedObservationId: 'obs_d15', linkedParcelId: 'P001', metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 26, timestamp: daysAgoISO(15) } },
    { id: 'photo_d08', userId: 'demo-user', filename: 'IMG_2024_trap.jpg', uploadedAt: daysAgo(3), lat: 57.188, lng: 14.051, classification: 'trap_reading', confidence: 0.93, aiDescription: AI_DESCRIPTIONS.trap_reading[0], linkedParcelId: 'P001', metadata: { deviceModel: 'Samsung Galaxy S24', focalLength: 24, timestamp: daysAgoISO(3) } },
    { id: 'photo_d09', userId: 'demo-user', filename: 'IMG_2024_harvest.jpg', uploadedAt: daysAgo(10), lat: 57.195, lng: 14.075, classification: 'harvest_site', confidence: 0.90, aiDescription: AI_DESCRIPTIONS.harvest_site[0], linkedParcelId: 'P001', metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 13, timestamp: daysAgoISO(10) } },
    { id: 'photo_d10', userId: 'demo-user', filename: 'IMG_2024_drought.jpg', uploadedAt: daysAgo(12), lat: 57.200, lng: 14.090, classification: 'crown_discoloration', confidence: 0.72, aiDescription: 'Needle discoloration and slight drooping consistent with moisture deficit. Lower confidence — could be drought or early beetle damage.', linkedObservationId: 'obs_d11', linkedParcelId: 'P002', satelliteValidation: { ndviAtLocation: 0.64, ndviAnomaly: true, lastSatellitePass: daysAgoISO(8), agreement: 'confirms' }, metadata: { deviceModel: 'Samsung Galaxy S24', focalLength: 24, timestamp: daysAgoISO(12) } },
    { id: 'photo_d11', userId: 'user_erik', filename: 'erik_bore_dust_01.jpg', uploadedAt: daysAgo(2), lat: 57.175, lng: 14.030, classification: 'bore_dust', confidence: 0.85, aiDescription: AI_DESCRIPTIONS.bore_dust[1], linkedObservationId: 'obs_d04', metadata: { deviceModel: 'Google Pixel 8', focalLength: 25, timestamp: daysAgoISO(2) } },
    { id: 'photo_d12', userId: 'user_lars', filename: 'lars_storm_01.jpg', uploadedAt: daysAgo(3), lat: 57.795, lng: 14.190, classification: 'wind_throw', confidence: 0.96, aiDescription: AI_DESCRIPTIONS.wind_throw[1], linkedObservationId: 'obs_d08', satelliteValidation: { ndviAtLocation: 0.28, ndviAnomaly: true, lastSatellitePass: daysAgoISO(2), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 14', focalLength: 26, timestamp: daysAgoISO(3) } },
    { id: 'photo_d13', userId: 'user_anna', filename: 'anna_erosion_01.jpg', uploadedAt: daysAgo(20), lat: 57.760, lng: 14.140, classification: 'water_damage', confidence: 0.81, aiDescription: AI_DESCRIPTIONS.water_damage[0], linkedObservationId: 'obs_d19', metadata: { deviceModel: 'Samsung Galaxy S23', focalLength: 24, timestamp: daysAgoISO(20) } },
    { id: 'photo_d14', userId: 'user_maria', filename: 'maria_beetle_01.jpg', uploadedAt: daysAgo(2), lat: 57.165, lng: 14.005, classification: 'entry_holes', confidence: 0.89, aiDescription: AI_DESCRIPTIONS.entry_holes[1], linkedObservationId: 'obs_d22', satelliteValidation: { ndviAtLocation: 0.55, ndviAnomaly: true, lastSatellitePass: daysAgoISO(1), agreement: 'confirms' }, metadata: { deviceModel: 'iPhone 15', focalLength: 26, timestamp: daysAgoISO(2) } },
    { id: 'photo_d15', userId: 'demo-user', filename: 'IMG_2024_resin.jpg', uploadedAt: daysAgo(4), lat: 57.195, lng: 14.075, classification: 'healthy_tree', confidence: 0.76, aiDescription: 'Resin flow observed at branch scar. Tree appears to be actively defending. Crown healthy with normal color.', linkedObservationId: 'obs_d17', linkedParcelId: 'P001', metadata: { deviceModel: 'iPhone 15 Pro', focalLength: 26, timestamp: daysAgoISO(4), compass: 190 } },
  ];
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  const existing = loadPhotos();
  if (existing.length === 0) {
    savePhotos(generateDemoPhotos());
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function uploadPhoto(
  _file: File,
  lat: number,
  lng: number,
  parcelId?: string
): PhotoIntelligence {
  ensureInitialized();
  const classification = weightedRandomClassification();
  const descs = AI_DESCRIPTIONS[classification];
  const photo: PhotoIntelligence = {
    id: generateId(),
    userId: 'demo-user',
    filename: _file.name,
    uploadedAt: Date.now(),
    lat,
    lng,
    classification,
    confidence: 0.7 + Math.random() * 0.25,
    aiDescription: descs[Math.floor(Math.random() * descs.length)],
    linkedParcelId: parcelId,
    satelliteValidation: validateAgainstSatellite({
      lat, lng, classification,
    } as PhotoIntelligence),
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
  const all = loadPhotos();
  all.unshift(photo);
  savePhotos(all);
  return photo;
}

export function classifyPhoto(_photoId: string): PhotoClassification {
  return weightedRandomClassification();
}

export function linkPhotoToObservation(photoId: string, observationId: string): void {
  ensureInitialized();
  const all = loadPhotos();
  const photo = all.find(p => p.id === photoId);
  if (photo) {
    photo.linkedObservationId = observationId;
    savePhotos(all);
  }
}

export function validateAgainstSatellite(photo: Pick<PhotoIntelligence, 'lat' | 'lng' | 'classification'>): SatelliteValidation {
  const damageTypes: PhotoClassification[] = ['bore_dust', 'entry_holes', 'crown_discoloration', 'bark_damage', 'wind_throw'];
  const isDamage = damageTypes.includes(photo.classification);
  const ndvi = isDamage ? 0.35 + Math.random() * 0.3 : 0.65 + Math.random() * 0.2;
  const isAnomaly = ndvi < 0.6;

  let agreement: SatelliteValidation['agreement'] = 'inconclusive';
  if (isDamage && isAnomaly) agreement = 'confirms';
  else if (!isDamage && !isAnomaly) agreement = 'confirms';
  else if (isDamage && !isAnomaly) agreement = 'contradicts';
  else if (!isDamage && isAnomaly) agreement = 'contradicts';

  return {
    ndviAtLocation: Math.round(ndvi * 100) / 100,
    ndviAnomaly: isAnomaly,
    lastSatellitePass: new Date(Date.now() - Math.round(Math.random() * 5) * 86400000).toISOString(),
    agreement,
  };
}

export function getPhotosByParcel(parcelId: string): PhotoIntelligence[] {
  ensureInitialized();
  return loadPhotos().filter(p => p.linkedParcelId === parcelId);
}

export function getPhotoTimeline(parcelId: string): PhotoIntelligence[] {
  ensureInitialized();
  return loadPhotos()
    .filter(p => p.linkedParcelId === parcelId)
    .sort((a, b) => a.uploadedAt - b.uploadedAt);
}

export function getPhotoStats(): PhotoStats {
  ensureInitialized();
  const all = loadPhotos();
  return {
    totalPhotos: all.length,
    classified: all.filter(p => p.classification !== 'unknown').length,
    linkedToObservations: all.filter(p => p.linkedObservationId).length,
    satelliteValidated: all.filter(p => p.satelliteValidation).length,
  };
}

export function getAllPhotos(): PhotoIntelligence[] {
  ensureInitialized();
  return loadPhotos();
}
