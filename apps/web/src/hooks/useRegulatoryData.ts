import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type RegulatoryZoneType =
  | 'nyckelbiotop'
  | 'natura2000'
  | 'strandskydd'
  | 'vattenskydd'
  | 'avverkningsanmalan';

export interface RegulatoryRequirement {
  action: string;
  deadline?: string;
  authority: string;
}

export interface RegulatoryZone {
  id: string;
  type: RegulatoryZoneType;
  name: string;
  description: string;
  geometry: GeoJSON.Geometry;
  requirements: RegulatoryRequirement[];
  skogsstyrelsenUrl: string;
  areaHectares?: number;
  reviewed: boolean;
}

export interface UseRegulatoryDataResult {
  zones: RegulatoryZone[];
  constraintCount: number;
  unreviewedCount: number;
  isLoading: boolean;
  error: string | null;
  markReviewed: (zoneId: string) => void;
}

// ─── Zone metadata ───

export const ZONE_COLORS: Record<RegulatoryZoneType, string> = {
  nyckelbiotop: '#a855f7',   // purple
  natura2000: '#3b82f6',     // blue
  strandskydd: '#06b6d4',    // cyan
  vattenskydd: '#2563eb',    // darker blue
  avverkningsanmalan: '#f97316', // orange
};

export const ZONE_ICONS: Record<RegulatoryZoneType, string> = {
  nyckelbiotop: 'leaf',
  natura2000: 'globe',
  strandskydd: 'waves',
  vattenskydd: 'droplets',
  avverkningsanmalan: 'axe',
};

// ─── Demo regulatory data ───

function buildDemoZones(parcelId: string): RegulatoryZone[] {
  const parcel = DEMO_PARCELS.find((p) => p.id === parcelId);
  if (!parcel) return [];

  const center = parcel.center;

  // Build polygon around parcel center for demo
  const makePolygon = (offsetLng: number, offsetLat: number, size: number): GeoJSON.Geometry => ({
    type: 'Polygon',
    coordinates: [[
      [center[0] + offsetLng, center[1] + offsetLat],
      [center[0] + offsetLng + size, center[1] + offsetLat],
      [center[0] + offsetLng + size, center[1] + offsetLat + size * 0.6],
      [center[0] + offsetLng, center[1] + offsetLat + size * 0.6],
      [center[0] + offsetLng, center[1] + offsetLat],
    ]],
  });

  const zones: RegulatoryZone[] = [];

  // p1 (Norra Skogen): nyckelbiotop + avverkningsanmälan
  if (parcelId === 'p1') {
    zones.push(
      {
        id: 'rz-p1-1',
        type: 'nyckelbiotop',
        name: 'Nyckelbiotop N-4521',
        description: 'Identified key habitat with high conservation value. Contains old-growth spruce and rare lichen species.',
        geometry: makePolygon(-0.005, 0.002, 0.008),
        requirements: [
          {
            action: 'No forestry operations permitted within key habitat boundary',
            authority: 'Skogsstyrelsen',
          },
          {
            action: 'Contact Skogsstyrelsen before any activity within 50m buffer zone',
            authority: 'Skogsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/nyckelbiotoper/',
        areaHectares: 2.3,
        reviewed: false,
      },
      {
        id: 'rz-p1-2',
        type: 'avverkningsanmalan',
        name: 'Avverkningsanmälan krävs',
        description: 'Harvest notification must be filed with Skogsstyrelsen at least 6 weeks before any felling operations.',
        geometry: makePolygon(-0.01, -0.005, 0.02),
        requirements: [
          {
            action: 'File avverkningsanmälan 6 weeks before harvest',
            deadline: '6 weeks before planned felling',
            authority: 'Skogsstyrelsen',
          },
          {
            action: 'Include detailed harvest plan with species and volume estimates',
            authority: 'Skogsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/aga-skog/avverka/avverkningsanmalan/',
        areaHectares: 42.5,
        reviewed: false,
      },
    );
  }

  // p2 (Ekbacken): natura 2000 + strandskydd
  if (parcelId === 'p2') {
    zones.push(
      {
        id: 'rz-p2-1',
        type: 'natura2000',
        name: 'Natura 2000 — Ekbackens lövskogsområde',
        description: 'EU Natura 2000 site protecting deciduous forest habitat. Part of the Habitats Directive network.',
        geometry: makePolygon(-0.003, -0.002, 0.01),
        requirements: [
          {
            action: 'Permit required from Länsstyrelsen for any activity that may affect the site',
            authority: 'Länsstyrelsen',
          },
          {
            action: 'Environmental impact assessment required for forestry operations',
            authority: 'Länsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.naturvardsverket.se/amnesomraden/skyddad-natur/natura-2000/',
        areaHectares: 8.1,
        reviewed: false,
      },
      {
        id: 'rz-p2-2',
        type: 'strandskydd',
        name: 'Strandskydd — Gislaån',
        description: 'Shore protection zone along Gislaån. Protects biodiversity and public access along waterways.',
        geometry: makePolygon(-0.008, 0.003, 0.016),
        requirements: [
          {
            action: 'No new buildings or structures within 100m of shoreline',
            authority: 'Kommunen',
          },
          {
            action: 'Dispens required from Länsstyrelsen for forestry within shore protection zone',
            authority: 'Länsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.naturvardsverket.se/amnesomraden/strandskydd/',
        areaHectares: 4.5,
        reviewed: false,
      },
    );
  }

  // p3 (Tallmon): vattenskydd
  if (parcelId === 'p3') {
    zones.push({
      id: 'rz-p3-1',
      type: 'vattenskydd',
      name: 'Vattenskyddsområde — Jönköpings kommun',
      description: 'Water protection area safeguarding municipal drinking water supply. Restrictions on chemical use and ground disturbance.',
      geometry: makePolygon(-0.006, -0.004, 0.012),
      requirements: [
        {
          action: 'No use of chemical pesticides or fertilizers within protection zone',
          authority: 'Kommunen',
        },
        {
          action: 'Minimize soil disturbance during forestry operations',
          authority: 'Kommunen',
        },
        {
          action: 'Report any spills or contamination immediately',
          authority: 'Kommunen',
        },
      ],
      skogsstyrelsenUrl: 'https://www.havochvatten.se/vagledning-foreskrifter-och-lagar/vagledningar/vattenskyddsomraden.html',
      areaHectares: 12.8,
      reviewed: false,
    });
  }

  // p4 (Granudden): nyckelbiotop + avverkningsanmälan + strandskydd
  if (parcelId === 'p4') {
    zones.push(
      {
        id: 'rz-p4-1',
        type: 'nyckelbiotop',
        name: 'Nyckelbiotop N-4602',
        description: 'Key habitat with dead wood and indicator species. Located in the eastern section of the parcel.',
        geometry: makePolygon(0.002, 0.001, 0.006),
        requirements: [
          {
            action: 'No forestry operations permitted within key habitat boundary',
            authority: 'Skogsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/nyckelbiotoper/',
        areaHectares: 1.8,
        reviewed: false,
      },
      {
        id: 'rz-p4-2',
        type: 'avverkningsanmalan',
        name: 'Avverkningsanmälan krävs',
        description: 'Harvest notification must be filed with Skogsstyrelsen at least 6 weeks before any felling operations.',
        geometry: makePolygon(-0.008, -0.005, 0.016),
        requirements: [
          {
            action: 'File avverkningsanmälan 6 weeks before harvest',
            deadline: '6 weeks before planned felling',
            authority: 'Skogsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/aga-skog/avverka/avverkningsanmalan/',
        areaHectares: 31.9,
        reviewed: false,
      },
      {
        id: 'rz-p4-3',
        type: 'strandskydd',
        name: 'Strandskydd — Lagan',
        description: 'Shore protection zone along Lagan river. 100m buffer restricting construction and certain forestry operations.',
        geometry: makePolygon(-0.01, 0.003, 0.012),
        requirements: [
          {
            action: 'Dispens required from Länsstyrelsen for operations within shore protection zone',
            authority: 'Länsstyrelsen',
          },
        ],
        skogsstyrelsenUrl: 'https://www.naturvardsverket.se/amnesomraden/strandskydd/',
        areaHectares: 3.2,
        reviewed: false,
      },
    );
  }

  // p5 (Björklund): no constraints
  return zones;
}

// ─── Hook ───

export function useRegulatoryData(parcelId: string | undefined): UseRegulatoryDataResult {
  const [zones, setZones] = useState<RegulatoryZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parcelId) {
      setZones([]);
      return;
    }

    let cancelled = false;

    async function fetchZones() {
      setIsLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          // Demo mode: use static data
          const demoZones = buildDemoZones(parcelId!);
          if (!cancelled) {
            setZones(demoZones);
          }
        } else {
          // Production: fetch from regulatory_zones table
          const { data, error: dbError } = await supabase
            .from('regulatory_zones')
            .select('*')
            .eq('parcel_id', parcelId);

          if (dbError) throw dbError;

          if (!cancelled && data) {
            setZones(
              data.map((row: Record<string, unknown>) => ({
                id: row.id as string,
                type: row.zone_type as RegulatoryZoneType,
                name: row.name as string,
                description: row.description as string,
                geometry: row.geometry_wgs84 as GeoJSON.Geometry,
                requirements: (row.requirements as RegulatoryRequirement[]) ?? [],
                skogsstyrelsenUrl: (row.external_url as string) ?? '',
                areaHectares: row.area_hectares as number | undefined,
                reviewed: (row.reviewed as boolean) ?? false,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load regulatory data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchZones();
    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  const markReviewed = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, reviewed: true } : z)),
    );
  };

  return {
    zones,
    constraintCount: zones.length,
    unreviewedCount: zones.filter((z) => !z.reviewed).length,
    isLoading,
    error,
    markReviewed,
  };
}

// ─── Hook for all parcels (dashboard alert) ───

export function useRegulatoryAlerts(): {
  affectedParcelCount: number;
  totalConstraints: number;
  isLoading: boolean;
  dismissed: boolean;
  dismiss: () => void;
} {
  const [affectedParcelCount, setAffectedParcelCount] = useState(0);
  const [totalConstraints, setTotalConstraints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('beetlesense-regulatory-alert-dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (dismissed) {
      setIsLoading(false);
      return;
    }

    if (isDemo() || !isSupabaseConfigured) {
      // Demo: parcels p1, p2, p3, p4 have constraints
      const parcelsWithConstraints = ['p1', 'p2', 'p3', 'p4'];
      const allZones = parcelsWithConstraints.flatMap((pid) => buildDemoZones(pid));
      setAffectedParcelCount(parcelsWithConstraints.length);
      setTotalConstraints(allZones.length);
      setIsLoading(false);
      return;
    }

    async function fetchAlerts() {
      try {
        const { data, error } = await supabase
          .from('regulatory_zones')
          .select('parcel_id')
          .eq('reviewed', false);

        if (error) {
          console.warn('Failed to load regulatory alerts:', error.message);
          return;
        }

        if (data) {
          const uniqueParcels = new Set(data.map((r: { parcel_id: string }) => r.parcel_id));
          setAffectedParcelCount(uniqueParcels.size);
          setTotalConstraints(data.length);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlerts();
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('beetlesense-regulatory-alert-dismissed', 'true');
  };

  return { affectedParcelCount, totalConstraints, isLoading, dismissed, dismiss };
}
