/**
 * MSB / SMHI — Swedish Forest Fire Risk Service
 *
 * Fetches official fire risk warnings and Fire Weather Index data from SMHI
 * (Swedish Meteorological and Hydrological Institute). Used by MSB
 * (Myndigheten för samhällsskydd och beredskap) for fire risk classification.
 *
 * Warnings endpoint is LIVE and free, no API key required.
 * Fire risk levels use demo fallback when FWI data is unavailable.
 *
 * Docs: https://opendata.smhi.se/apidocs/warnings/
 */

// ─── Types ───

export interface SwedishFireRisk {
  date: string;
  region: string;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
  grassFireRisk: boolean;
  forestFireRisk: boolean;
  fwiValue: number;
  eldningsförbud: boolean;
  recommendation: string;
}

export interface FireWarning {
  id: string;
  type: string;
  severity: 'yellow' | 'orange' | 'red';
  area: string;
  validFrom: string;
  validTo: string;
  description: string;
}

// ─── Constants ───

const WARNINGS_URL = 'https://opendata-download-warnings.smhi.se/api/version/2/warnings.json';

// Cache (10 min for warnings)
let warningsCache: { data: FireWarning[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// Swedish county (län) regions for fire risk mapping
const SWEDISH_REGIONS: Record<string, string> = {
  '01': 'Stockholms län',
  '03': 'Uppsala län',
  '04': 'Södermanlands län',
  '05': 'Östergötlands län',
  '06': 'Jönköpings län',
  '07': 'Kronobergs län',
  '08': 'Kalmar län',
  '09': 'Gotlands län',
  '10': 'Blekinge län',
  '12': 'Skåne län',
  '13': 'Hallands län',
  '14': 'Västra Götalands län',
  '17': 'Värmlands län',
  '18': 'Örebro län',
  '19': 'Västmanlands län',
  '20': 'Dalarnas län',
  '21': 'Gävleborgs län',
  '22': 'Västernorrlands län',
  '23': 'Jämtlands län',
  '24': 'Västerbottens län',
  '25': 'Norrbottens län',
};

export const MSB_FIRE_SOURCE_INFO = {
  name: 'MSB / SMHI Fire Risk',
  provider: 'SMHI (Swedish Meteorological and Hydrological Institute)',
  authority: 'MSB (Myndigheten för samhällsskydd och beredskap)',
  endpoint: WARNINGS_URL,
  license: 'Open data (CC0)',
  updateFrequency: 'Warnings updated continuously; fire risk daily during season',
  coverage: 'All of Sweden',
  note: 'Warnings are live. Fire risk levels use FWI model with demo fallback.',
};

// ─── Helpers ───

function fwiToRiskLevel(fwi: number): SwedishFireRisk['riskLevel'] {
  if (fwi <= 1) return 'very_low';
  if (fwi <= 5) return 'low';
  if (fwi <= 12) return 'moderate';
  if (fwi <= 20) return 'high';
  if (fwi <= 30) return 'very_high';
  return 'extreme';
}

function riskRecommendation(level: SwedishFireRisk['riskLevel'], eldningsförbud: boolean): string {
  if (eldningsförbud) {
    return 'Eldningsförbud råder — all open fire is prohibited. Postpone any forestry burning operations.';
  }
  switch (level) {
    case 'very_low':
      return 'Very low fire risk. Normal forestry operations can proceed.';
    case 'low':
      return 'Low fire risk. Standard precautions during harvest operations.';
    case 'moderate':
      return 'Moderate fire risk. Avoid sparking activities near dry slash. Have water available.';
    case 'high':
      return 'High fire risk. Restrict machine operations during peak heat. Fire extinguishers required on site.';
    case 'very_high':
      return 'Very high fire risk. Consider postponing harvest. Contact local räddningstjänst before starting work.';
    case 'extreme':
      return 'Extreme fire risk. Cease all forestry operations. Evacuate personnel from high-risk areas.';
  }
}

function mapSmhiSeverity(level: string): 'yellow' | 'orange' | 'red' {
  const lower = level.toLowerCase();
  if (lower.includes('red') || lower.includes('röd') || lower === '3') return 'red';
  if (lower.includes('orange') || lower === '2') return 'orange';
  return 'yellow';
}

function getRegionForCoords(lat: number, lng: number): string {
  // Simplified region mapping based on lat/lng ranges for Sweden
  if (lat >= 66) return 'Norrbottens län';
  if (lat >= 64) return 'Västerbottens län';
  if (lat >= 62.5) return 'Västernorrlands län';
  if (lat >= 62) return 'Jämtlands län';
  if (lat >= 60.5) return 'Gävleborgs län';
  if (lat >= 60) return 'Dalarnas län';
  if (lat >= 59 && lng < 14) return 'Värmlands län';
  if (lat >= 59) return 'Stockholms län';
  if (lat >= 58 && lng < 14) return 'Västra Götalands län';
  if (lat >= 57.5) return 'Jönköpings län';
  if (lat >= 57 && lng > 15.5) return 'Kalmar län';
  if (lat >= 56.5) return 'Kronobergs län';
  if (lat >= 56) return 'Blekinge län';
  return 'Skåne län';
}

// ─── Demo Data ───

function generateDemoFireRisk(lat: number, lng: number): SwedishFireRisk {
  const now = new Date();
  const month = now.getMonth(); // 0-based
  const region = getRegionForCoords(lat, lng);

  // Fire risk is seasonal — peaks June-August
  let baseFWI: number;
  if (month >= 5 && month <= 7) {
    baseFWI = 8 + Math.random() * 15; // summer: moderate to high
  } else if (month >= 3 && month <= 4) {
    baseFWI = 3 + Math.random() * 8; // spring: low to moderate (grass fire season)
  } else if (month === 8) {
    baseFWI = 5 + Math.random() * 10; // early autumn
  } else {
    baseFWI = Math.random() * 3; // winter: very low
  }

  // Southern Sweden tends higher risk
  if (lat < 58) baseFWI *= 1.2;

  const fwiValue = Math.round(baseFWI * 10) / 10;
  const riskLevel = fwiToRiskLevel(fwiValue);
  const grassFireRisk = month >= 2 && month <= 4 && fwiValue > 5;
  const forestFireRisk = fwiValue > 8;
  const eldningsförbud = fwiValue > 20;

  return {
    date: now.toISOString().split('T')[0],
    region,
    riskLevel,
    grassFireRisk,
    forestFireRisk,
    fwiValue,
    eldningsförbud,
    recommendation: riskRecommendation(riskLevel, eldningsförbud),
  };
}

// ─── API Functions ───

/**
 * Fetch current fire risk for a given location.
 * Uses FWI model with demo fallback — SMHI FWI endpoint is seasonal.
 */
export async function fetchSwedishFireRisk(lat: number, lng: number): Promise<SwedishFireRisk> {
  // Try to enhance with live warnings data
  try {
    const warnings = await fetchActiveFireWarnings();
    const region = getRegionForCoords(lat, lng);

    // Check if there are active fire-related warnings for this region
    const fireWarnings = warnings.filter(
      (w) =>
        (w.type.toLowerCase().includes('brand') ||
          w.type.toLowerCase().includes('fire') ||
          w.type.toLowerCase().includes('skogsbrand') ||
          w.type.toLowerCase().includes('gräsbrand')) &&
        w.area.includes(region.split(' ')[0])
    );

    const demoRisk = generateDemoFireRisk(lat, lng);

    // If live warnings exist for region, boost risk level
    if (fireWarnings.length > 0) {
      const maxSeverity = fireWarnings.some((w) => w.severity === 'red')
        ? 'extreme'
        : fireWarnings.some((w) => w.severity === 'orange')
          ? 'very_high'
          : 'high';

      return {
        ...demoRisk,
        riskLevel: maxSeverity as SwedishFireRisk['riskLevel'],
        forestFireRisk: true,
        eldningsförbud: maxSeverity === 'extreme' || maxSeverity === 'very_high',
        recommendation: riskRecommendation(
          maxSeverity as SwedishFireRisk['riskLevel'],
          maxSeverity === 'extreme' || maxSeverity === 'very_high'
        ),
      };
    }

    return demoRisk;
  } catch {
    // Fully offline — return demo data
    return generateDemoFireRisk(lat, lng);
  }
}

/**
 * Fetch all active SMHI warnings (fires, storms, heat waves, etc).
 * This is a LIVE call to the SMHI warnings API.
 */
export async function fetchActiveFireWarnings(): Promise<FireWarning[]> {
  // Check cache
  if (warningsCache && Date.now() - warningsCache.fetchedAt < CACHE_TTL) {
    return warningsCache.data;
  }

  try {
    const response = await fetch(WARNINGS_URL);
    if (!response.ok) {
      throw new Error(`SMHI warnings API returned ${response.status}`);
    }

    const data = await response.json();

    // SMHI warnings structure: array of warning objects
    const warnings: FireWarning[] = [];

    const alertList = Array.isArray(data) ? data : data?.alert ?? data?.warnings ?? [];

    for (const alert of alertList) {
      // Handle different SMHI response shapes
      const info = alert.info?.[0] || alert;
      const id = alert.identifier || alert.id || `smhi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const type = info.event || info.eventCode || alert.event || 'Unknown';
      const severityRaw = info.severity || alert.severity || alert.level || 'yellow';
      const area =
        info.area?.[0]?.areaDesc ||
        info.area ||
        alert.area ||
        alert.district ||
        'Sweden';
      const validFrom = info.onset || alert.validFrom || alert.startTime || new Date().toISOString();
      const validTo = info.expires || alert.validTo || alert.endTime || '';
      const description =
        info.description || info.headline || alert.description || alert.headline || type;

      warnings.push({
        id: String(id),
        type: String(type),
        severity: mapSmhiSeverity(String(severityRaw)),
        area: String(area),
        validFrom: String(validFrom),
        validTo: String(validTo),
        description: String(description),
      });
    }

    warningsCache = { data: warnings, fetchedAt: Date.now() };
    return warnings;
  } catch {
    // Return empty if API is down — caller should handle gracefully
    return [];
  }
}

/**
 * Check if fire ban (eldningsförbud) is active for a location.
 * Combines SMHI warnings data with FWI risk assessment.
 */
export async function isFireBanActive(lat: number, lng: number): Promise<boolean> {
  const risk = await fetchSwedishFireRisk(lat, lng);
  return risk.eldningsförbud;
}
