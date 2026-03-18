import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type AirspaceStatus = 'green' | 'yellow' | 'red';

export type ZoneType = 'CTR' | 'ATZ' | 'R' | 'P' | 'D' | 'NATURE_RESERVE' | 'NOTAM';

export interface AirspaceRestriction {
  id: string;
  type: ZoneType;
  name: string;
  description: string;
  maxAltitudeM: number | null;
  requiresPermit: boolean;
  permitAuthority?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  geometry?: GeoJSON.Polygon;
}

export interface AirspaceCheckResult {
  status: AirspaceStatus;
  allowed: boolean;
  restrictions: AirspaceRestriction[];
  warnings: string[];
  maxAltitudeM: number;
  requiresPermit: boolean;
  permitAuthorities: string[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Swedish Zone Type Labels ───

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  CTR: 'Kontrollzon (CTR)',
  ATZ: 'Flygplatstrafikzon (ATZ)',
  R: 'Restriktionsområde (R)',
  P: 'Förbjudet område (P)',
  D: 'Fareområde (D)',
  NATURE_RESERVE: 'Naturreservat',
  NOTAM: 'Tillfällig restriktion (NOTAM)',
};

export const ZONE_STATUS_COLORS: Record<ZoneType, string> = {
  CTR: '#ef4444',       // red
  ATZ: '#f97316',       // orange
  R: '#ef4444',         // red
  P: '#dc2626',         // dark red
  D: '#f59e0b',         // amber
  NATURE_RESERVE: '#22c55e', // green
  NOTAM: '#eab308',     // yellow
};

// ─── Demo Data — Realistic Swedish Restrictions ───

const DEMO_RESTRICTIONS: AirspaceRestriction[] = [
  {
    id: 'ctr-vaxjo',
    type: 'CTR',
    name: 'Växjö Kronoberg CTR',
    description: 'Kontrollzon runt Växjö Kronoberg flygplats (ESMX). Drönare kräver tillstånd från LFV för flygning inom CTR.',
    maxAltitudeM: 0,
    requiresPermit: true,
    permitAuthority: 'LFV',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.68, 56.95], [14.78, 56.95], [14.78, 56.87],
        [14.68, 56.87], [14.68, 56.95],
      ]],
    },
  },
  {
    id: 'atz-jonkoping',
    type: 'ATZ',
    name: 'Jönköping ATZ',
    description: 'Flygplatstrafikzon runt Jönköpings flygplats (ESGJ). Max 50m höjd utan samordning med flygledningen.',
    maxAltitudeM: 50,
    requiresPermit: true,
    permitAuthority: 'LFV',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.03, 57.77], [14.13, 57.77], [14.13, 57.73],
        [14.03, 57.73], [14.03, 57.77],
      ]],
    },
  },
  {
    id: 'atz-kalmar',
    type: 'ATZ',
    name: 'Kalmar ATZ',
    description: 'Flygplatstrafikzon runt Kalmar Öland Airport (ESMQ). Samordning krävs.',
    maxAltitudeM: 50,
    requiresPermit: true,
    permitAuthority: 'LFV',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [16.24, 56.70], [16.34, 56.70], [16.34, 56.64],
        [16.24, 56.64], [16.24, 56.70],
      ]],
    },
  },
  {
    id: 'r81-karlsborg',
    type: 'R',
    name: 'R81 Karlsborg',
    description: 'Restriktionsområde: Militärt övningsområde Karlsborg. Flygning förbjuden utan tillstånd från Försvarsmakten.',
    maxAltitudeM: 0,
    requiresPermit: true,
    permitAuthority: 'LFV / Försvarsmakten',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.45, 58.56], [14.58, 58.56], [14.58, 58.50],
        [14.45, 58.50], [14.45, 58.56],
      ]],
    },
  },
  {
    id: 'nr-store-mosse',
    type: 'NATURE_RESERVE',
    name: 'Store Mosse nationalpark',
    description: 'Naturreservat/nationalpark. Drönare kan kräva tillstånd från Länsstyrelsen. Störning av djurliv ska undvikas.',
    maxAltitudeM: 120,
    requiresPermit: true,
    permitAuthority: 'Länsstyrelsen Jönköping',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [13.85, 57.32], [14.00, 57.32], [14.00, 57.25],
        [13.85, 57.25], [13.85, 57.32],
      ]],
    },
  },
  {
    id: 'nr-tiveden',
    type: 'NATURE_RESERVE',
    name: 'Tivedens nationalpark',
    description: 'Nationalpark. Flygning med drönare kan vara begränsad. Kontakta Länsstyrelsen för aktuella regler.',
    maxAltitudeM: 120,
    requiresPermit: true,
    permitAuthority: 'Länsstyrelsen Örebro',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.55, 58.90], [14.70, 58.90], [14.70, 58.82],
        [14.55, 58.82], [14.55, 58.90],
      ]],
    },
  },
  {
    id: 'notam-2026-0342',
    type: 'NOTAM',
    name: 'NOTAM A0342/26 — Militärövning Småland',
    description: 'Tillfällig restriktion pga militärövning söder om Vetlanda. GND-300m. 18-20 mars 2026.',
    maxAltitudeM: 0,
    requiresPermit: true,
    permitAuthority: 'LFV',
    validFrom: '2026-03-18T06:00:00Z',
    validUntil: '2026-03-20T18:00:00Z',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [15.20, 57.20], [15.35, 57.20], [15.35, 57.10],
        [15.20, 57.10], [15.20, 57.20],
      ]],
    },
  },
  {
    id: 'd-ravlunda',
    type: 'D',
    name: 'D16 Ravlunda',
    description: 'Fareområde: Ravlunda skjutfält. Aktiv under övningstider. Kontrollera med Försvarsmakten.',
    maxAltitudeM: 0,
    requiresPermit: false,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.05, 55.76], [14.15, 55.76], [14.15, 55.72],
        [14.05, 55.72], [14.05, 55.76],
      ]],
    },
  },
];

// ─── Helpers ───

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPolygonCentroid(coords: number[][]): { lat: number; lng: number } {
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  return { lat, lng };
}

function determineStatus(restrictions: AirspaceRestriction[], altitudeM: number): AirspaceStatus {
  if (restrictions.length === 0) return 'green';

  const hasProhibited = restrictions.some(
    r => r.type === 'P' || (r.type === 'CTR' && r.maxAltitudeM === 0) || (r.type === 'R' && r.maxAltitudeM === 0),
  );
  if (hasProhibited) return 'red';

  const hasAltitudeIssue = restrictions.some(
    r => r.maxAltitudeM !== null && r.maxAltitudeM > 0 && altitudeM > r.maxAltitudeM,
  );
  if (hasAltitudeIssue) return 'red';

  const hasWarning = restrictions.some(
    r => r.type === 'ATZ' || r.type === 'D' || r.type === 'NATURE_RESERVE' || r.type === 'NOTAM',
  );
  if (hasWarning) return 'yellow';

  return 'green';
}

// ─── Hook ───

/**
 * useAirspaceCheck — check Swedish drone airspace restrictions for a coordinate.
 *
 * Returns airspace status (green/yellow/red), active restrictions, and warnings.
 * Uses demo data when Supabase is not configured.
 *
 * @param lat Latitude (WGS84)
 * @param lng Longitude (WGS84)
 * @param altitudeM Planned flight altitude AGL in meters (default: 120)
 * @param radiusKm Search radius in km (default: 15)
 */
export function useAirspaceCheck(
  lat: number | null,
  lng: number | null,
  altitudeM: number = 120,
  radiusKm: number = 15,
): AirspaceCheckResult {
  const [restrictions, setRestrictions] = useState<AirspaceRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (lat === null || lng === null) {
      setRestrictions([]);
      return;
    }

    let cancelled = false;

    async function fetchAirspace() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured()) {
          // Use demo data — filter by distance
          const radiusM = radiusKm * 1000;
          const nearby = DEMO_RESTRICTIONS.filter(r => {
            if (!r.geometry?.coordinates?.[0]) return false;
            const centroid = getPolygonCentroid(r.geometry.coordinates[0]);
            return haversineM(lat!, lng!, centroid.lat, centroid.lng) <= radiusM;
          });

          // Simulate network delay
          await new Promise(res => setTimeout(res, 300));
          if (!cancelled) setRestrictions(nearby);
        } else {
          // Production: query Supabase cached airspace zones
          const { data, error: dbError } = await supabase
            .from('airspace_zones')
            .select('*')
            .eq('active', true);

          if (dbError) throw new Error(dbError.message);

          if (!cancelled && data) {
            setRestrictions(
              data.map((z: any) => ({
                id: z.id,
                type: z.zone_type as ZoneType,
                name: z.name,
                description: z.description ?? '',
                maxAltitudeM: z.max_altitude_m,
                requiresPermit: z.requires_permit,
                permitAuthority: z.permit_authority,
                validFrom: z.active_from,
                validUntil: z.active_until,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Kunde inte kontrollera luftrum');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAirspace();
    return () => { cancelled = true; };
  }, [lat, lng, altitudeM, radiusKm, refreshKey]);

  const status = useMemo(
    () => determineStatus(restrictions, altitudeM),
    [restrictions, altitudeM],
  );

  const warnings = useMemo(() => {
    const w: string[] = [];
    for (const r of restrictions) {
      if (r.type === 'CTR') w.push(`Inom ${r.name} — tillstånd krävs från ${r.permitAuthority}`);
      if (r.type === 'ATZ' && r.maxAltitudeM !== null && altitudeM > r.maxAltitudeM)
        w.push(`${r.name}: Max ${r.maxAltitudeM}m utan samordning`);
      if (r.type === 'NOTAM') w.push(`Aktiv NOTAM: ${r.name}`);
      if (r.type === 'NATURE_RESERVE') w.push(`Naturreservat: ${r.name} — kontrollera lokala regler`);
      if (r.type === 'R') w.push(`Restriktionsområde: ${r.name} — flygning förbjuden`);
      if (r.type === 'P') w.push(`Förbjudet område: ${r.name}`);
    }
    return w;
  }, [restrictions, altitudeM]);

  const maxAltitudeM = useMemo(() => {
    const limits = restrictions
      .map(r => r.maxAltitudeM)
      .filter((a): a is number => a !== null && a > 0);
    return limits.length > 0 ? Math.min(...limits) : 120;
  }, [restrictions]);

  const requiresPermit = useMemo(
    () => restrictions.some(r => r.requiresPermit),
    [restrictions],
  );

  const permitAuthorities = useMemo(
    () => [...new Set(restrictions.filter(r => r.requiresPermit && r.permitAuthority).map(r => r.permitAuthority!))],
    [restrictions],
  );

  return {
    status,
    allowed: status !== 'red',
    restrictions,
    warnings,
    maxAltitudeM,
    requiresPermit,
    permitAuthorities,
    loading,
    error,
    refresh,
  };
}
