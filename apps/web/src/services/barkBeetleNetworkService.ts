// Bark Beetle Regional Network Service
// Simulates national monitoring network data (real: integrate Skogsstyrelsen API when available)

import { isDemo } from '@/lib/demoData';

export interface RegionalBeetleAlert {
  id: string
  lat: number
  lng: number
  severity: 'watch' | 'warning' | 'critical'
  reportedAt: string
  distanceKm: number
  affectedSpecies: string
  source: 'skogsstyrelsen' | 'community' | 'satellite'
  description: string
}

export interface BeetleObservationPayload {
  parcelId: string
  severity: string
  speciesAffected: string
  treesAffected: number
  photos: string[]
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Demo alerts seeded around central Sweden (near typical demo parcel coordinates)
const DEMO_ALERTS_BASE: Omit<RegionalBeetleAlert, 'distanceKm'>[] = [
  {
    id: 'rba-001',
    lat: 57.18,
    lng: 14.95,
    severity: 'critical',
    reportedAt: '2026-04-06T09:15:00Z',
    affectedSpecies: 'Picea abies (Norway Spruce)',
    source: 'skogsstyrelsen',
    description:
      'Confirmed Ips typographus outbreak detected in spruce stand. Approximately 3 ha affected. Satellite imagery shows distinctive crown browning pattern consistent with active infestation.',
  },
  {
    id: 'rba-002',
    lat: 57.09,
    lng: 15.12,
    severity: 'warning',
    reportedAt: '2026-04-05T14:30:00Z',
    affectedSpecies: 'Picea abies (Norway Spruce)',
    source: 'community',
    description:
      'Community-reported fresh bore dust and resin flow observed on multiple spruce trees. Early-stage infestation suspected. Skogsstyrelsen notified for verification.',
  },
  {
    id: 'rba-003',
    lat: 57.22,
    lng: 14.78,
    severity: 'watch',
    reportedAt: '2026-04-04T11:00:00Z',
    affectedSpecies: 'Picea abies (Norway Spruce)',
    source: 'satellite',
    description:
      'Sentinel-2 NDVI analysis shows early stress signal in 1.2 ha spruce area. No ground confirmation yet. Monitoring elevated to watch status.',
  },
  {
    id: 'rba-004',
    lat: 57.31,
    lng: 14.60,
    severity: 'warning',
    reportedAt: '2026-04-03T08:45:00Z',
    affectedSpecies: 'Pityogenes chalcographus (Six-toothed Spruce Bark Beetle)',
    source: 'skogsstyrelsen',
    description:
      'Trap catches exceeding threshold (>3000 beetles/week) reported in Jönköping county. Forest owners in adjacent municipalities advised to inspect vulnerable stands.',
  },
  {
    id: 'rba-005',
    lat: 57.05,
    lng: 14.85,
    severity: 'watch',
    reportedAt: '2026-04-02T16:00:00Z',
    affectedSpecies: 'Hylobius abietis (Pine Weevil)',
    source: 'community',
    description:
      'Pine weevil damage reported near recent clearcut. Seedlings on adjacent replanting areas at elevated risk. Consider protective measures before spring planting.',
  },
  {
    id: 'rba-006',
    lat: 57.38,
    lng: 15.20,
    severity: 'critical',
    reportedAt: '2026-04-01T07:30:00Z',
    affectedSpecies: 'Ips typographus (European Spruce Bark Beetle)',
    source: 'satellite',
    description:
      'Large-scale outbreak confirmed by drone survey and Sentinel analysis. Approximately 8 ha severely affected. Emergency harvesting of infested trees recommended to halt spread.',
  },
  {
    id: 'rba-007',
    lat: 56.98,
    lng: 15.05,
    severity: 'watch',
    reportedAt: '2026-03-30T12:00:00Z',
    affectedSpecies: 'Picea abies (Norway Spruce)',
    source: 'skogsstyrelsen',
    description:
      'Seasonal risk alert issued for Kronoberg county. Warm April forecasted — expected to accelerate bark beetle flight period by 2–3 weeks. Increased monitoring recommended.',
  },
];

/**
 * Get nearby beetle alerts within radiusKm of the given coordinates.
 * In demo mode: returns realistic seeded alerts with computed distances.
 * In live mode: would call Skogsstyrelsen API + community_beetle_alerts table.
 */
export async function getNearbyBeetleAlerts(
  lat: number,
  lng: number,
  radiusKm = 25
): Promise<RegionalBeetleAlert[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400));

  if (isDemo()) {
    return DEMO_ALERTS_BASE.map((a) => ({
      ...a,
      distanceKm: parseFloat(haversineKm(lat, lng, a.lat, a.lng).toFixed(1)),
    }))
      .filter((a) => a.distanceKm <= radiusKm)
      .sort((a, b) => {
        // Sort by severity then distance
        const sev = { critical: 0, warning: 1, watch: 2 };
        const diff = sev[a.severity] - sev[b.severity];
        return diff !== 0 ? diff : a.distanceKm - b.distanceKm;
      });
  }

  // Live mode: fetch from Supabase
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('community_beetle_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data ?? [])
      .map((row) => ({
        id: row.id as string,
        lat: row.lat as number,
        lng: row.lng as number,
        severity: row.severity as RegionalBeetleAlert['severity'],
        reportedAt: row.created_at as string,
        distanceKm: parseFloat(
          haversineKm(lat, lng, row.lat as number, row.lng as number).toFixed(1)
        ),
        affectedSpecies: (row.affected_species as string) ?? 'Unknown species',
        source: 'community' as const,
        description: (row.description as string) ?? '',
      }))
      .filter((a) => a.distanceKm <= radiusKm)
      .sort((a, b) => {
        const sev = { critical: 0, warning: 1, watch: 2 };
        const diff = sev[a.severity] - sev[b.severity];
        return diff !== 0 ? diff : a.distanceKm - b.distanceKm;
      });
  } catch (err) {
    console.error('[barkBeetleNetworkService] fetch error:', err);
    return [];
  }
}

/**
 * Submit a community beetle observation.
 * Saves to community_alerts table and (in live mode) triggers notifications
 * to nearby forest owners within 5 km.
 */
export async function submitBeetleObservation(
  payload: BeetleObservationPayload
): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 600));

  if (isDemo()) {
    // In demo mode, just simulate success
    return { success: true };
  }

  try {
    const { supabase } = await import('@/lib/supabase');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('community_beetle_alerts').insert({
      reporter_id: user.id,
      parcel_id: payload.parcelId,
      severity: payload.severity,
      affected_species: payload.speciesAffected,
      trees_affected: payload.treesAffected,
      description: `Community report: ${payload.speciesAffected} — ${payload.treesAffected} trees affected.`,
      photos: payload.photos,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
