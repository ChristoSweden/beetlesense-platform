// Skogsstyrelsen (Swedish Forest Agency) beetle monitoring and regulation data
import { useApiHealthStore } from './apiHealthService';
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

// Live pest zone data from Skogsstyrelsen WFS (fallback to mock if unavailable)
let CACHED_PEST_ZONES: PestZone[] | null = null;
let CACHED_HARVEST_NOTIFICATIONS: HarvestNotification[] | null = null;

// Mock data as fallback
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

async function fetchPestZonesFromWFS(): Promise<PestZone[]> {
  try {
    // Skogsstyrelsen WFS endpoint for pest notifications
    // https://www.skogsstyrelsen.se/sjalvservice/karttjanster/geodatatjanster/
    const wfsUrl = 'https://geodpags.skogsstyrelsen.se/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typename=skotselhuvud&outputFormat=application/json';
    const response = await fetch(wfsUrl);
    if (!response.ok) {
       useApiHealthStore.getState().setServiceStatus('skogsstyrelsen', 'degraded');
       throw new Error(`WFS request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.features || !Array.isArray(data.features)) {
      console.warn('Unexpected WFS response format, using fallback');
      return MOCK_PEST_ZONES;
    }

    useApiHealthStore.getState().setServiceStatus('skogsstyrelsen', 'online');
    const zones: PestZone[] = data.features
      .filter((f: Record<string, unknown>) => f.properties && (f.geometry as Record<string, unknown>)?.coordinates)
      .map((f: Record<string, unknown>, idx: number) => {
        const geometry = f.geometry as Record<string, unknown>;
        const [lon, lat] = geometry.coordinates as [number, number];
        const props = f.properties as Record<string, string | undefined>;
        const severityRaw = props.allvarlighetsgrad?.toLowerCase() || 'normal';
        const severity: PestZone['severity'] = severityRaw === 'outbreak' ? 'outbreak' : severityRaw === 'elevated' ? 'elevated' : 'normal';
        return {
          id: `wfs-pz-${idx}`,
          county: props.län || 'Unknown',
          municipality: props.kommun || 'Unknown',
          severity,
          species: 'Ips typographus',
          affectedHa: parseFloat(props.area_ha || '') || 10,
          reportedDate: props.datum ? props.datum.split('T')[0] : new Date().toISOString().split('T')[0],
          lat,
          lon,
        };
      })
      .slice(0, 20);

    return zones.length > 0 ? zones : MOCK_PEST_ZONES;
  } catch (error) {
    console.error('Error fetching pest zones from WFS:', error);
    return MOCK_PEST_ZONES;
  }
}

async function fetchHarvestNotificationsFromWFS(bbox: BBox): Promise<HarvestNotification[]> {
  try {
    // Skogsstyrelsen harvest notifications endpoint
    const wfsUrl = `https://geodpags.skogsstyrelsen.se/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typename=anslagningar&outputFormat=application/json&bbox=${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    const response = await fetch(wfsUrl);
    if (!response.ok) throw new Error(`WFS request failed: ${response.status}`);

    const data = await response.json();
    if (!data.features || !Array.isArray(data.features)) {
      console.warn('Unexpected harvest WFS response, using fallback');
      return MOCK_HARVEST_NOTIFICATIONS.filter(
        h => h.lon >= bbox[0] && h.lat >= bbox[1] && h.lon <= bbox[2] && h.lat <= bbox[3]
      );
    }

    // Parse WFS features into harvest notifications
    const notifications: HarvestNotification[] = data.features
      .filter((f: Record<string, unknown>) => f.properties && (f.geometry as Record<string, unknown>)?.coordinates)
      .map((f: Record<string, unknown>, idx: number) => {
        const geometry = f.geometry as Record<string, unknown>;
        const [lon, lat] = geometry.coordinates as [number, number];
        const props = f.properties as Record<string, string | undefined>;
        const methodRaw = props.method?.toLowerCase() || 'gallring';
        const method: HarvestNotification['method'] = methodRaw === 'kalavverkning' ? 'kalavverkning' : methodRaw === 'slutavverkning' ? 'slutavverkning' : 'gallring';
        return {
          id: `wfs-hn-${idx}`,
          lat,
          lon,
          area_ha: parseFloat(props.area || '') || 5,
          method,
          species: props.species || 'Gran',
          registeredDate: props.registered_date ? props.registered_date.split('T')[0] : new Date().toISOString().split('T')[0],
          owner: props.owner || 'Unknown',
          municipality: props.kommun || 'Unknown',
        };
      });

    return notifications.length > 0 ? notifications : MOCK_HARVEST_NOTIFICATIONS.filter(
      h => h.lon >= bbox[0] && h.lat >= bbox[1] && h.lon <= bbox[2] && h.lat <= bbox[3]
    );
  } catch (error) {
    console.error('Error fetching harvest notifications from WFS:', error);
    return MOCK_HARVEST_NOTIFICATIONS.filter(
      h => h.lon >= bbox[0] && h.lat >= bbox[1] && h.lon <= bbox[2] && h.lat <= bbox[3]
    );
  }
}

export async function getHarvestNotifications(bbox: BBox): Promise<HarvestNotification[]> {
  if (!CACHED_HARVEST_NOTIFICATIONS) {
    CACHED_HARVEST_NOTIFICATIONS = await fetchHarvestNotificationsFromWFS(bbox);
  }
  return CACHED_HARVEST_NOTIFICATIONS.filter(
    h => h.lon >= bbox[0] && h.lat >= bbox[1] && h.lon <= bbox[2] && h.lat <= bbox[3]
  );
}

export async function getPestZones(): Promise<PestZone[]> {
  if (!CACHED_PEST_ZONES) {
    CACHED_PEST_ZONES = await fetchPestZonesFromWFS();
  }
  return CACHED_PEST_ZONES;
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
