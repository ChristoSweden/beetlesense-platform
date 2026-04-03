/**
 * Harvest & Treatment Records Service
 *
 * Tracks what actions owners take — sanitation felling, trap deployment,
 * regeneration planting, etc. This closes the feedback loop by recording
 * outcomes and effectiveness of forest management interventions.
 *
 * Persistence: localStorage in demo mode.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type TreatmentType =
  | 'sanitation_felling' | 'preventive_thinning' | 'final_felling'
  | 'pheromone_trap_deployment' | 'trap_tree_setup' | 'debarking'
  | 'regeneration_planting' | 'pre_commercial_thinning'
  | 'buffer_zone_creation' | 'dead_wood_removal' | 'other';

export type Effectiveness = 'effective' | 'partially_effective' | 'ineffective' | 'too_early_to_tell';

export interface TreatmentRecord {
  id: string;
  userId: string;
  parcelId: string;
  type: TreatmentType;
  date: string;
  area_ha?: number;
  volume_m3?: number;
  species?: string;
  contractor?: string;
  cost_sek?: number;
  notes: string;
  effectiveness?: Effectiveness;
  followUpDate?: string;
  beforePhotoId?: string;
  afterPhotoId?: string;
}

export interface TreatmentStats {
  totalTreatments: number;
  volumeRemoved: number;
  areasTreated: number;
  mostCommonType: string;
}

// ── Labels ───────────────────────────────────────────────────────────────────

export const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  sanitation_felling: 'Sanitation Felling',
  preventive_thinning: 'Preventive Thinning',
  final_felling: 'Final Felling',
  pheromone_trap_deployment: 'Pheromone Trap Deployment',
  trap_tree_setup: 'Trap Tree Setup',
  debarking: 'Debarking',
  regeneration_planting: 'Regeneration Planting',
  pre_commercial_thinning: 'Pre-commercial Thinning',
  buffer_zone_creation: 'Buffer Zone Creation',
  dead_wood_removal: 'Dead Wood Removal',
  other: 'Other',
};

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'beetlesense-treatments';

function loadTreatments(): TreatmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTreatments(records: TreatmentRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId(): string {
  return `treat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysLaterDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Demo Data ───────────────────────────────────────────────────────────────

function generateDemoTreatments(): TreatmentRecord[] {
  return [
    {
      id: 'treat_d01', userId: 'demo-user', parcelId: 'P001', type: 'sanitation_felling',
      date: daysAgoDate(14), area_ha: 1.5, volume_m3: 180, species: 'Picea abies',
      contractor: 'Södra Skogsägarna', cost_sek: 45000,
      notes: 'Removed 45 beetle-infested spruce. Stumps treated with Rotstop. Logs transported same day to prevent beetle emergence.',
      effectiveness: 'effective', followUpDate: daysLaterDate(30), beforePhotoId: 'ph_d02', afterPhotoId: 'photo_d09',
    },
    {
      id: 'treat_d02', userId: 'demo-user', parcelId: 'P001', type: 'pheromone_trap_deployment',
      date: daysAgoDate(90), area_ha: undefined, volume_m3: undefined, species: undefined,
      contractor: undefined, cost_sek: 2400,
      notes: 'Deployed 3 pheromone traps (Ips typographus) along south-facing edge. 50m spacing per Skogsstyrelsen guidelines.',
      effectiveness: 'effective',
    },
    {
      id: 'treat_d03', userId: 'demo-user', parcelId: 'P002', type: 'preventive_thinning',
      date: daysAgoDate(45), area_ha: 3.2, volume_m3: 95, species: 'Picea abies',
      contractor: 'Local contractor AB', cost_sek: 28000,
      notes: 'Thinning to reduce stand density and improve wind stability. Target basal area 24 m2/ha achieved.',
      effectiveness: 'too_early_to_tell', followUpDate: daysLaterDate(60),
    },
    {
      id: 'treat_d04', userId: 'demo-user', parcelId: 'P003', type: 'dead_wood_removal',
      date: daysAgoDate(7), area_ha: 2.0, volume_m3: 65, species: 'Mixed',
      contractor: 'Södra Skogsägarna', cost_sek: 18000,
      notes: 'Cleared wind-thrown timber from February storm. Access road reopened. Retained 5 logs/ha for biodiversity.',
      effectiveness: 'effective',
    },
    {
      id: 'treat_d05', userId: 'demo-user', parcelId: 'P004', type: 'regeneration_planting',
      date: daysAgoDate(30), area_ha: 1.8, volume_m3: undefined, species: 'Mixed — spruce/birch',
      contractor: undefined, cost_sek: 15000,
      notes: 'Planted 2,200 seedlings (70% spruce, 30% birch). Tube protectors on all seedlings for boar protection.',
      effectiveness: 'too_early_to_tell', followUpDate: daysLaterDate(90),
    },
    {
      id: 'treat_d06', userId: 'demo-user', parcelId: 'P001', type: 'trap_tree_setup',
      date: daysAgoDate(60), area_ha: undefined, volume_m3: 8, species: 'Picea abies',
      contractor: undefined, cost_sek: 3500,
      notes: 'Set up 4 trap trees (fresh-felled spruce) along forest edge. Will debark before beetle emergence in May.',
      effectiveness: 'partially_effective',
    },
    {
      id: 'treat_d07', userId: 'demo-user', parcelId: 'P005', type: 'pre_commercial_thinning',
      date: daysAgoDate(120), area_ha: 4.5, volume_m3: undefined, species: 'Pinus sylvestris',
      contractor: 'Youth summer crew', cost_sek: 22000,
      notes: 'Pre-commercial thinning of 15-year pine plantation. Reduced from 4000 to 2200 stems/ha. Good response expected.',
      effectiveness: 'effective',
    },
    {
      id: 'treat_d08', userId: 'demo-user', parcelId: 'P002', type: 'buffer_zone_creation',
      date: daysAgoDate(200), area_ha: 0.6, volume_m3: 12, species: 'Mixed',
      contractor: undefined, cost_sek: 5000,
      notes: 'Established 15m riparian buffer along stream per updated Skogsstyrelsen guidelines. Retained all deciduous trees.',
      effectiveness: 'effective',
    },
  ];
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  if (loadTreatments().length === 0) {
    saveTreatments(generateDemoTreatments());
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function logTreatment(record: Omit<TreatmentRecord, 'id'>): TreatmentRecord {
  ensureInitialized();
  const full: TreatmentRecord = { ...record, id: generateId() };
  const all = loadTreatments();
  all.unshift(full);
  saveTreatments(all);
  return full;
}

export function getTreatmentsByParcel(parcelId: string): TreatmentRecord[] {
  ensureInitialized();
  return loadTreatments().filter(t => t.parcelId === parcelId);
}

export function getTreatmentTimeline(userId: string): TreatmentRecord[] {
  ensureInitialized();
  return loadTreatments()
    .filter(t => t.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function assessEffectiveness(recordId: string, effectiveness: Effectiveness): void {
  ensureInitialized();
  const all = loadTreatments();
  const record = all.find(t => t.id === recordId);
  if (record) {
    record.effectiveness = effectiveness;
    saveTreatments(all);
  }
}

export function getRegionalTreatmentActivity(
  _lat: number,
  _lng: number,
  _radiusKm: number,
  daysBack: number = 30
): { type: string; count: number }[] {
  ensureInitialized();
  const cutoff = daysAgoDate(daysBack);
  const all = loadTreatments().filter(t => t.date >= cutoff);
  const counts: Record<string, number> = {};
  for (const t of all) {
    counts[t.type] = (counts[t.type] ?? 0) + 1;
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count }));
}

export function getTreatmentStats(): TreatmentStats {
  ensureInitialized();
  const all = loadTreatments();
  const volumeRemoved = all.reduce((s, t) => s + (t.volume_m3 ?? 0), 0);
  const areasTreated = all.reduce((s, t) => s + (t.area_ha ?? 0), 0);

  const typeCounts: Record<string, number> = {};
  for (const t of all) {
    typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1;
  }
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

  return {
    totalTreatments: all.length,
    volumeRemoved: Math.round(volumeRemoved),
    areasTreated: Math.round(areasTreated * 10) / 10,
    mostCommonType,
  };
}

export function getAllTreatments(): TreatmentRecord[] {
  ensureInitialized();
  return loadTreatments();
}
