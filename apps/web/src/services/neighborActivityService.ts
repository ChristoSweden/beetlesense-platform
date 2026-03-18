// ─── Neighbor Activity Intelligence Service ───
// Monitors anonymized nearby forestry activity and assesses impact on user's parcels.
// Data sources: Skogsstyrelsen avverkningsanmälningar, satellite change detection,
// regional damage reports, and public road construction permits.

export type ActivityType =
  | 'felling_notification'   // Avverkningsanmälan
  | 'clearcut_detected'      // Satellite-detected clearcut
  | 'road_construction'      // Road building
  | 'planting'               // Planting activity
  | 'beetle_damage'          // Beetle damage reported
  | 'storm_damage'           // Wind/storm damage
  | 'thinning';              // Gallring

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high';

export type RiskType =
  | 'windthrow'
  | 'beetle_spread'
  | 'drainage_change'
  | 'access_change'
  | 'edge_exposure'
  | 'regional_awareness';

export interface NeighborActivity {
  id: string;
  type: ActivityType;
  /** WGS84 coordinates [lng, lat] */
  coordinates: [number, number];
  /** Distance from nearest user parcel in km */
  distanceKm: number;
  /** Compass bearing from nearest parcel (degrees, 0 = north) */
  bearingDeg: number;
  /** Cardinal direction label */
  direction: string;
  /** Date the activity was detected or filed */
  detectedDate: string;
  /** Estimated area in hectares */
  areaHa: number;
  /** Impact on user's forest */
  impactLevel: ImpactLevel;
  /** Which risk types this creates */
  riskTypes: RiskType[];
  /** Nearest affected stand in user's parcels */
  affectedStand: string | null;
  /** Human-readable impact explanation */
  impactExplanation: string;
  /** Recommended action, if any */
  recommendedAction: string | null;
  /** Short description */
  description: string;
}

export interface ImpactDetail {
  riskType: RiskType;
  riskLabel: string;
  affectedStands: string[];
  riskBefore: ImpactLevel;
  riskAfter: ImpactLevel;
  mitigation: string;
  peakRiskMonths: string;
  durationYears: number;
}

// ─── Helpers ───

const DIRECTION_LABELS: Record<string, string> = {
  N: 'north',
  NE: 'northeast',
  E: 'east',
  SE: 'southeast',
  S: 'south',
  SW: 'southwest',
  W: 'west',
  NW: 'northwest',
};

export function bearingToDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}

export function bearingToDirectionLabel(deg: number): string {
  return DIRECTION_LABELS[bearingToDirection(deg)] ?? 'unknown';
}

export function getActivityColor(type: ActivityType): string {
  switch (type) {
    case 'felling_notification': return '#f97316'; // orange
    case 'clearcut_detected': return '#ef4444';    // red
    case 'road_construction': return '#3b82f6';    // blue
    case 'planting': return '#4ade80';             // green
    case 'beetle_damage': return '#dc2626';        // dark red
    case 'storm_damage': return '#8b5cf6';         // purple
    case 'thinning': return '#fbbf24';             // amber
  }
}

export function getImpactColor(level: ImpactLevel): string {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#f97316';
    case 'low': return '#fbbf24';
    case 'none': return '#4ade80';
  }
}

export function getActivityTypeKey(type: ActivityType): string {
  return type;
}

// ─── Impact Details ───

export function getImpactDetails(activity: NeighborActivity): ImpactDetail[] {
  const details: ImpactDetail[] = [];

  for (const risk of activity.riskTypes) {
    switch (risk) {
      case 'windthrow':
        details.push({
          riskType: 'windthrow',
          riskLabel: 'neighbor.impact.windthrow',
          affectedStands: activity.affectedStand ? [activity.affectedStand] : [],
          riskBefore: 'low',
          riskAfter: activity.impactLevel,
          mitigation: 'neighbor.mitigation.windthrow',
          peakRiskMonths: 'Oct-Mar',
          durationYears: activity.type === 'clearcut_detected' || activity.type === 'felling_notification' ? 5 : 2,
        });
        break;
      case 'beetle_spread':
        details.push({
          riskType: 'beetle_spread',
          riskLabel: 'neighbor.impact.beetleSpread',
          affectedStands: activity.affectedStand ? [activity.affectedStand] : [],
          riskBefore: 'low',
          riskAfter: activity.impactLevel,
          mitigation: 'neighbor.mitigation.beetleSpread',
          peakRiskMonths: 'May-Aug',
          durationYears: 3,
        });
        break;
      case 'drainage_change':
        details.push({
          riskType: 'drainage_change',
          riskLabel: 'neighbor.impact.drainageChange',
          affectedStands: activity.affectedStand ? [activity.affectedStand] : [],
          riskBefore: 'none',
          riskAfter: activity.impactLevel,
          mitigation: 'neighbor.mitigation.drainageChange',
          peakRiskMonths: 'Spring thaw',
          durationYears: 10,
        });
        break;
      case 'access_change':
        details.push({
          riskType: 'access_change',
          riskLabel: 'neighbor.impact.accessChange',
          affectedStands: [],
          riskBefore: 'none',
          riskAfter: 'low',
          mitigation: 'neighbor.mitigation.accessChange',
          peakRiskMonths: 'Year-round',
          durationYears: 0,
        });
        break;
      case 'edge_exposure':
        details.push({
          riskType: 'edge_exposure',
          riskLabel: 'neighbor.impact.edgeExposure',
          affectedStands: activity.affectedStand ? [activity.affectedStand] : [],
          riskBefore: 'low',
          riskAfter: activity.impactLevel,
          mitigation: 'neighbor.mitigation.edgeExposure',
          peakRiskMonths: 'Oct-Mar',
          durationYears: 4,
        });
        break;
      case 'regional_awareness':
        details.push({
          riskType: 'regional_awareness',
          riskLabel: 'neighbor.impact.regionalAwareness',
          affectedStands: [],
          riskBefore: 'none',
          riskAfter: 'low',
          mitigation: 'neighbor.mitigation.regionalAwareness',
          peakRiskMonths: 'Varies',
          durationYears: 1,
        });
        break;
    }
  }

  return details;
}

// ─── User parcel center (demo: Lessebo/Kronoberg area) ───

export const USER_PARCEL_CENTER: [number, number] = [15.27, 56.75];

export const USER_PARCELS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Norra Skogen', id: 'p1' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[15.255, 56.755], [15.275, 56.755], [15.275, 56.765], [15.255, 56.765], [15.255, 56.755]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ekbacken', id: 'p2' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[15.275, 56.742], [15.295, 56.742], [15.295, 56.755], [15.275, 56.755], [15.275, 56.742]]],
      },
    },
  ],
};

// ─── Demo data: 8 activities around Lessebo/Växjö, Kronoberg ───

const DEMO_ACTIVITIES: NeighborActivity[] = [
  {
    id: 'na-1',
    type: 'felling_notification',
    coordinates: [15.26, 56.758],
    distanceKm: 0.8,
    bearingDeg: 270,
    direction: 'west',
    detectedDate: '2026-03-10',
    areaHa: 4.5,
    impactLevel: 'high',
    riskTypes: ['windthrow', 'edge_exposure'],
    affectedStand: 'Stand 3 (Norra Skogen)',
    impactExplanation: 'neighbor.demo.fellingWestExplanation',
    recommendedAction: 'neighbor.demo.fellingWestAction',
    description: 'neighbor.demo.fellingWestDesc',
  },
  {
    id: 'na-2',
    type: 'clearcut_detected',
    coordinates: [15.285, 56.77],
    distanceKm: 2.1,
    bearingDeg: 15,
    direction: 'north',
    detectedDate: '2026-03-05',
    areaHa: 8.2,
    impactLevel: 'medium',
    riskTypes: ['beetle_spread'],
    affectedStand: 'Stand 1 (Norra Skogen)',
    impactExplanation: 'neighbor.demo.clearcutNorthExplanation',
    recommendedAction: 'neighbor.demo.clearcutNorthAction',
    description: 'neighbor.demo.clearcutNorthDesc',
  },
  {
    id: 'na-3',
    type: 'road_construction',
    coordinates: [15.28, 56.735],
    distanceKm: 1.5,
    bearingDeg: 180,
    direction: 'south',
    detectedDate: '2026-02-28',
    areaHa: 0.8,
    impactLevel: 'low',
    riskTypes: ['access_change'],
    affectedStand: null,
    impactExplanation: 'neighbor.demo.roadSouthExplanation',
    recommendedAction: 'neighbor.demo.roadSouthAction',
    description: 'neighbor.demo.roadSouthDesc',
  },
  {
    id: 'na-4',
    type: 'planting',
    coordinates: [15.31, 56.75],
    distanceKm: 3.0,
    bearingDeg: 90,
    direction: 'east',
    detectedDate: '2026-03-12',
    areaHa: 6.0,
    impactLevel: 'none',
    riskTypes: [],
    affectedStand: null,
    impactExplanation: 'neighbor.demo.plantingEastExplanation',
    recommendedAction: null,
    description: 'neighbor.demo.plantingEastDesc',
  },
  {
    id: 'na-5',
    type: 'beetle_damage',
    coordinates: [15.295, 56.765],
    distanceKm: 1.8,
    bearingDeg: 45,
    direction: 'northeast',
    detectedDate: '2026-03-14',
    areaHa: 2.3,
    impactLevel: 'high',
    riskTypes: ['beetle_spread'],
    affectedStand: 'Stand 2 (Norra Skogen)',
    impactExplanation: 'neighbor.demo.beetleNEExplanation',
    recommendedAction: 'neighbor.demo.beetleNEAction',
    description: 'neighbor.demo.beetleNEDesc',
  },
  {
    id: 'na-6',
    type: 'storm_damage',
    coordinates: [15.22, 56.78],
    distanceKm: 4.0,
    bearingDeg: 315,
    direction: 'northwest',
    detectedDate: '2026-03-08',
    areaHa: 12.0,
    impactLevel: 'low',
    riskTypes: ['regional_awareness'],
    affectedStand: null,
    impactExplanation: 'neighbor.demo.stormNWExplanation',
    recommendedAction: null,
    description: 'neighbor.demo.stormNWDesc',
  },
  {
    id: 'na-7',
    type: 'felling_notification',
    coordinates: [15.29, 56.7],
    distanceKm: 5.2,
    bearingDeg: 170,
    direction: 'south',
    detectedDate: '2026-03-01',
    areaHa: 7.0,
    impactLevel: 'none',
    riskTypes: [],
    affectedStand: null,
    impactExplanation: 'neighbor.demo.fellingSouthExplanation',
    recommendedAction: null,
    description: 'neighbor.demo.fellingSouthDesc',
  },
  {
    id: 'na-8',
    type: 'thinning',
    coordinates: [15.278, 56.755],
    distanceKm: 0.6,
    bearingDeg: 90,
    direction: 'east',
    detectedDate: '2026-03-15',
    areaHa: 3.2,
    impactLevel: 'medium',
    riskTypes: ['edge_exposure', 'windthrow'],
    affectedStand: 'Stand 5 (Ekbacken)',
    impactExplanation: 'neighbor.demo.thinningEastExplanation',
    recommendedAction: 'neighbor.demo.thinningEastAction',
    description: 'neighbor.demo.thinningEastDesc',
  },
];

// ─── Wind rose data (prevailing SW winds typical for Småland) ───

export interface WindRoseEntry {
  direction: number; // degrees
  label: string;
  frequency: number; // percentage
}

export function getWindRose(): WindRoseEntry[] {
  return [
    { direction: 0, label: 'N', frequency: 6 },
    { direction: 45, label: 'NE', frequency: 5 },
    { direction: 90, label: 'E', frequency: 7 },
    { direction: 135, label: 'SE', frequency: 9 },
    { direction: 180, label: 'S', frequency: 12 },
    { direction: 225, label: 'SW', frequency: 24 },
    { direction: 270, label: 'W', frequency: 22 },
    { direction: 315, label: 'NW', frequency: 15 },
  ];
}

// ─── Public API ───

export function getDemoActivities(): NeighborActivity[] {
  return DEMO_ACTIVITIES;
}

export function getActivitiesWithinRadius(radiusKm: number): NeighborActivity[] {
  return DEMO_ACTIVITIES.filter((a) => a.distanceKm <= radiusKm);
}

export function getActivitiesByType(activities: NeighborActivity[], types: ActivityType[]): NeighborActivity[] {
  if (types.length === 0) return activities;
  return activities.filter((a) => types.includes(a.type));
}

export function getActivitiesByImpact(activities: NeighborActivity[], levels: ImpactLevel[]): NeighborActivity[] {
  if (levels.length === 0) return activities;
  return activities.filter((a) => levels.includes(a.impactLevel));
}

export function countHighImpact(activities: NeighborActivity[]): number {
  return activities.filter((a) => a.impactLevel === 'high').length;
}

export function getActivityTypes(): ActivityType[] {
  return [
    'felling_notification',
    'clearcut_detected',
    'road_construction',
    'planting',
    'beetle_damage',
    'storm_damage',
    'thinning',
  ];
}

export type SortField = 'distance' | 'date' | 'impact';

const IMPACT_ORDER: Record<ImpactLevel, number> = { high: 0, medium: 1, low: 2, none: 3 };

export function sortActivities(activities: NeighborActivity[], field: SortField): NeighborActivity[] {
  const sorted = [...activities];
  switch (field) {
    case 'distance':
      sorted.sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case 'date':
      sorted.sort((a, b) => new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime());
      break;
    case 'impact':
      sorted.sort((a, b) => IMPACT_ORDER[a.impactLevel] - IMPACT_ORDER[b.impactLevel]);
      break;
  }
  return sorted;
}

/**
 * Convert activities to GeoJSON FeatureCollection for map rendering
 */
export function activitiesToGeoJSON(activities: NeighborActivity[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: activities.map((a) => ({
      type: 'Feature' as const,
      id: a.id,
      properties: {
        id: a.id,
        type: a.type,
        impactLevel: a.impactLevel,
        distanceKm: a.distanceKm,
        direction: a.direction,
        areaHa: a.areaHa,
        color: getActivityColor(a.type),
        description: a.description,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: a.coordinates,
      },
    })),
  };
}
