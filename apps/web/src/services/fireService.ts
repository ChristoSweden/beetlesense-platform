// NASA FIRMS fire detection service
export interface FireDetection {
  latitude: number;
  longitude: number;
  brightness: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: 'MODIS' | 'VIIRS';
  instrument: string;
  confidence: 'low' | 'nominal' | 'high';
  frp: number; // Fire Radiative Power (MW)
  distanceKm?: number;
  bearing?: string;
}

export interface FireRisk {
  level: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  score: number; // 0-100
  factors: { name: string; value: number; weight: number }[];
  updatedAt: string;
}

export interface FireAlert {
  id: string;
  fire: FireDetection;
  distanceKm: number;
  bearing: string;
  severity: 'critical' | 'warning' | 'watch';
  message: string;
  timestamp: string;
}

// Mock fire detections — realistic Swedish coordinates
const MOCK_FIRES: FireDetection[] = [
  { latitude: 57.42, longitude: 15.08, brightness: 312.4, scan: 1.0, track: 1.0, acq_date: '2026-03-17', acq_time: '1342', satellite: 'VIIRS', instrument: 'VIIRS', confidence: 'high', frp: 8.2 },
  { latitude: 57.85, longitude: 14.92, brightness: 298.1, scan: 1.2, track: 1.1, acq_date: '2026-03-17', acq_time: '1015', satellite: 'MODIS', instrument: 'MODIS', confidence: 'nominal', frp: 3.5 },
  { latitude: 63.21, longitude: 17.45, brightness: 305.7, scan: 1.0, track: 1.0, acq_date: '2026-03-16', acq_time: '0830', satellite: 'VIIRS', instrument: 'VIIRS', confidence: 'nominal', frp: 5.1 },
  { latitude: 59.12, longitude: 16.88, brightness: 290.3, scan: 1.1, track: 1.0, acq_date: '2026-03-16', acq_time: '1420', satellite: 'MODIS', instrument: 'MODIS', confidence: 'low', frp: 1.8 },
  { latitude: 65.50, longitude: 18.22, brightness: 320.8, scan: 1.0, track: 1.0, acq_date: '2026-03-15', acq_time: '1130', satellite: 'VIIRS', instrument: 'VIIRS', confidence: 'high', frp: 12.4 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export async function getActiveFiresNearby(lat: number, lon: number, radiusKm: number): Promise<FireDetection[]> {
  await new Promise(r => setTimeout(r, 300));
  return MOCK_FIRES
    .map(f => ({ ...f, distanceKm: Math.round(haversineKm(lat, lon, f.latitude, f.longitude) * 10) / 10, bearing: bearing(lat, lon, f.latitude, f.longitude) }))
    .filter(f => f.distanceKm! <= radiusKm)
    .sort((a, b) => a.distanceKm! - b.distanceKm!);
}

export async function getFiresInSweden(days: number): Promise<FireDetection[]> {
  await new Promise(r => setTimeout(r, 200));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return MOCK_FIRES.filter(f => f.acq_date >= cutoff);
}

export async function getFireRiskIndex(_lat: number, _lon: number): Promise<FireRisk> {
  await new Promise(r => setTimeout(r, 150));
  // Simulate FWI-like calculation
  const tempFactor = { name: 'Temperatur', value: 14, weight: 0.25 };
  const humidityFactor = { name: 'Luftfuktighet', value: 45, weight: 0.2 };
  const windFactor = { name: 'Vindstyrka', value: 8, weight: 0.2 };
  const droughtFactor = { name: 'Dagar utan regn', value: 5, weight: 0.25 };
  const proximityFactor = { name: 'Närliggande bränder', value: 0, weight: 0.1 };

  const factors = [tempFactor, humidityFactor, windFactor, droughtFactor, proximityFactor];
  const score = Math.min(100, Math.round(
    (tempFactor.value / 40) * 100 * tempFactor.weight +
    ((100 - humidityFactor.value) / 100) * 100 * humidityFactor.weight +
    (windFactor.value / 25) * 100 * windFactor.weight +
    (droughtFactor.value / 14) * 100 * droughtFactor.weight +
    proximityFactor.value * 20 * proximityFactor.weight
  ));

  const level: FireRisk['level'] = score >= 75 ? 'EXTREME' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW';
  return { level, score, factors, updatedAt: new Date().toISOString() };
}
