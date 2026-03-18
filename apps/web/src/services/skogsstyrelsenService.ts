// Skogsstyrelsen (Swedish Forest Agency) beetle monitoring and regulation data
export interface TrapReading {
  county: string;
  week: number;
  year: number;
  count: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  threshold: number;
  exceedsThreshold: boolean;
}

export interface HarvestNotification {
  id: string;
  lat: number;
  lon: number;
  area_ha: number;
  method: 'kalavverkning' | 'gallring' | 'slutavverkning';
  species: string;
  registeredDate: string;
  owner: string;
  municipality: string;
}

export interface PestZone {
  id: string;
  county: string;
  municipality: string;
  severity: 'outbreak' | 'elevated' | 'normal';
  species: 'Ips typographus' | 'Pityogenes chalcographus' | 'Hylobius abietis';
  affectedHa: number;
  reportedDate: string;
  lat: number;
  lon: number;
}

export interface Regulation {
  id: string;
  type: 'biotope_protection' | 'natura2000' | 'nyckelbiotop' | 'water_protection' | 'cultural';
  name: string;
  description: string;
  restrictions: string[];
  area_ha: number;
}

export type BBox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

const COUNTIES = ['Kronoberg', 'Jönköping', 'Kalmar', 'Östergötland', 'Västra Götaland', 'Halland', 'Skåne', 'Blekinge', 'Södermanland', 'Stockholm'];

// Realistic trap data — peaks in July-August, Götaland highest
function generateTrapData(county: string): TrapReading[] {
  const baseMultiplier = ['Kronoberg', 'Jönköping', 'Kalmar', 'Östergötland'].includes(county) ? 1.5 : 1.0;
  const weeks: TrapReading[] = [];
  for (let w = 1; w <= 12; w++) {
    const seasonal = Math.sin((w - 3) * Math.PI / 10) * 0.8 + 0.5;
    const count = Math.max(0, Math.round(1200 * seasonal * baseMultiplier + (Math.random() - 0.5) * 400));
    const prev = weeks.length > 0 ? weeks[weeks.length - 1].count : count;
    weeks.push({
      county,
      week: w,
      year: 2026,
      count,
      trend: count > prev * 1.1 ? 'increasing' : count < prev * 0.9 ? 'decreasing' : 'stable',
      threshold: 3000,
      exceedsThreshold: count > 3000,
    });
  }
  return weeks;
}

const MOCK_PEST_ZONES: PestZone[] = [
  { id: 'pz-1', county: 'Kronoberg', municipality: 'Alvesta', severity: 'outbreak', species: 'Ips typographus', affectedHa: 45, reportedDate: '2026-03-10', lat: 56.90, lon: 14.55 },
  { id: 'pz-2', county: 'Jönköping', municipality: 'Vetlanda', severity: 'elevated', species: 'Ips typographus', affectedHa: 22, reportedDate: '2026-03-12', lat: 57.43, lon: 15.08 },
  { id: 'pz-3', county: 'Kalmar', municipality: 'Nybro', severity: 'elevated', species: 'Pityogenes chalcographus', affectedHa: 15, reportedDate: '2026-03-08', lat: 56.74, lon: 15.91 },
  { id: 'pz-4', county: 'Östergötland', municipality: 'Kinda', severity: 'normal', species: 'Ips typographus', affectedHa: 8, reportedDate: '2026-03-14', lat: 58.00, lon: 15.63 },
];

const MOCK_HARVEST_NOTIFICATIONS: HarvestNotification[] = [
  { id: 'hn-1', lat: 57.12, lon: 14.88, area_ha: 3.2, method: 'slutavverkning', species: 'Gran', registeredDate: '2026-03-05', owner: 'Privat', municipality: 'Värnamo' },
  { id: 'hn-2', lat: 57.18, lon: 14.92, area_ha: 5.8, method: 'gallring', species: 'Tall/Gran', registeredDate: '2026-03-08', owner: 'Privat', municipality: 'Värnamo' },
  { id: 'hn-3', lat: 57.08, lon: 15.01, area_ha: 8.1, method: 'kalavverkning', species: 'Gran', registeredDate: '2026-03-01', owner: 'Södra', municipality: 'Gislaved' },
  { id: 'hn-4', lat: 57.25, lon: 14.78, area_ha: 2.4, method: 'gallring', species: 'Tall', registeredDate: '2026-03-11', owner: 'Privat', municipality: 'Gnosjö' },
];

export async function getBeetleTrapData(county: string): Promise<TrapReading[]> {
  await new Promise(r => setTimeout(r, 200));
  return generateTrapData(county);
}

export async function getAllCountyTrapData(): Promise<Record<string, TrapReading[]>> {
  await new Promise(r => setTimeout(r, 300));
  const result: Record<string, TrapReading[]> = {};
  for (const county of COUNTIES) {
    result[county] = generateTrapData(county);
  }
  return result;
}

export async function getHarvestNotifications(bbox: BBox): Promise<HarvestNotification[]> {
  await new Promise(r => setTimeout(r, 150));
  return MOCK_HARVEST_NOTIFICATIONS.filter(
    h => h.lon >= bbox[0] && h.lat >= bbox[1] && h.lon <= bbox[2] && h.lat <= bbox[3]
  );
}

export async function getPestZones(): Promise<PestZone[]> {
  await new Promise(r => setTimeout(r, 150));
  return MOCK_PEST_ZONES;
}

export async function getRegulations(_parcelId: string): Promise<Regulation[]> {
  await new Promise(r => setTimeout(r, 100));
  return [
    { id: 'reg-1', type: 'nyckelbiotop', name: 'Nyckelbiotop K-2341', description: 'Äldre granskog med höga naturvärden', restrictions: ['Ingen avverkning tillåten', 'Naturvårdsavtal krävs'], area_ha: 1.2 },
    { id: 'reg-2', type: 'water_protection', name: 'Skyddszon Lagan', description: 'Skyddszon mot vattendrag', restrictions: ['10m skyddszon', 'Ingen markberedning'], area_ha: 0.4 },
  ];
}

export function getCounties(): string[] {
  return COUNTIES;
}
