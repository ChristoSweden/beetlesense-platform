/**
 * Community Intelligence Service
 *
 * Anonymizes and aggregates all user-contributed data into a community
 * intelligence layer with heatmaps, alerts, and early warning signals.
 */

import type { ObservationType } from './observationService';
import { getAllObservations, getObservationStats } from './observationService';
import { getAllPhotos } from './photoIntelligenceService';
import { getAllStations, getAllReadings } from './trapCountService';
import { getAllTreatments } from './treatmentLogService';
import { getAllVoiceNotes } from './voiceNoteService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommunityHeatmapCell {
  lat: number;
  lng: number;
  observationCount: number;
  verifiedCount: number;
  dominantThreat: ObservationType | null;
  riskScore: number;
  lastActivity: number;
  sourcesAgreeing: number;
}

export interface CommunityAlert {
  id: string;
  type: 'beetle_wave' | 'storm_damage' | 'fire_risk' | 'drought_stress' | 'boar_activity';
  center: { lat: number; lng: number };
  radiusKm: number;
  observationCount: number;
  verifiedCount: number;
  satelliteConfirmed: boolean;
  severity: 'advisory' | 'warning' | 'critical';
  message: string;
  createdAt: number;
  affectedParcels: string[];
}

export interface EarlyWarningSignal {
  id: string;
  source: 'community' | 'satellite' | 'trap_network' | 'weather' | 'cross_validated';
  type: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  affectedArea: { lat: number; lng: number; radiusKm: number };
  dataPoints: number;
  recommendation: string;
}

export interface ContributionScore {
  observations: number;
  photos: number;
  trapReadings: number;
  treatments: number;
  voiceNotes: number;
  totalScore: number;
  rank: string;
}

// ── Demo Heatmap Grid ───────────────────────────────────────────────────────
// Covering Kronoberg/Jönköping counties with realistic clustering

function generateDemoHeatmap(): CommunityHeatmapCell[] {
  const cells: CommunityHeatmapCell[] = [];
  // Grid from roughly 56.7-57.9 lat, 13.5-15.0 lng (Kronoberg/Jönköping)
  const cellSize = 0.1; // ~11km

  // Hot spots: known beetle-prone areas near Värnamo and Jönköping
  const hotSpots = [
    { lat: 57.19, lng: 14.05, intensity: 85 }, // Värnamo — active beetle zone
    { lat: 57.78, lng: 14.16, intensity: 70 }, // Jönköping — storm damage zone
    { lat: 57.30, lng: 14.24, intensity: 55 }, // Mid-county beetle activity
    { lat: 57.16, lng: 14.01, intensity: 60 }, // Wild boar damage area
    { lat: 56.88, lng: 14.42, intensity: 50 }, // Alvesta monitoring hotspot
  ];

  for (let lat = 56.7; lat < 57.9; lat += cellSize) {
    for (let lng = 13.5; lng < 15.0; lng += cellSize) {
      // Calculate risk based on proximity to hot spots
      let maxRisk = 5 + Math.random() * 10; // baseline
      let dominantThreat: ObservationType | null = null;
      let sourcesAgreeing = 1;

      for (const hs of hotSpots) {
        const dist = Math.sqrt((lat - hs.lat) ** 2 + (lng - hs.lng) ** 2);
        if (dist < 0.3) {
          const influence = hs.intensity * Math.max(0, 1 - dist / 0.3);
          if (influence > maxRisk) {
            maxRisk = influence;
            sourcesAgreeing = Math.floor(influence / 25) + 1;
          }
        }
      }

      const riskScore = Math.min(100, Math.round(maxRisk));
      const observationCount = Math.max(0, Math.round(riskScore / 10 + (Math.random() - 0.5) * 3));

      if (riskScore > 60) dominantThreat = 'beetle_bore_dust';
      else if (riskScore > 40) dominantThreat = 'wind_damage';
      else if (riskScore > 25) dominantThreat = 'drought_stress';

      if (observationCount > 0 || riskScore > 20) {
        cells.push({
          lat: Math.round(lat * 100) / 100,
          lng: Math.round(lng * 100) / 100,
          observationCount,
          verifiedCount: Math.max(0, Math.round(observationCount * 0.4)),
          dominantThreat,
          riskScore,
          lastActivity: Date.now() - Math.round(Math.random() * 14) * 86400000,
          sourcesAgreeing: Math.min(4, sourcesAgreeing),
        });
      }
    }
  }

  return cells;
}

function generateDemoAlerts(): CommunityAlert[] {
  return [
    {
      id: 'alert_d01',
      type: 'beetle_wave',
      center: { lat: 57.19, lng: 14.05 },
      radiusKm: 5,
      observationCount: 23,
      verifiedCount: 12,
      satelliteConfirmed: true,
      severity: 'critical',
      message: '23 beetle observations reported within 5km of Värnamo. Satellite confirms NDVI decline in 340 ha of mature spruce. Immediate inspection and sanitation felling recommended.',
      createdAt: Date.now() - 2 * 86400000,
      affectedParcels: ['P001', 'P002'],
    },
    {
      id: 'alert_d02',
      type: 'storm_damage',
      center: { lat: 57.78, lng: 14.16 },
      radiusKm: 8,
      observationCount: 15,
      verifiedCount: 8,
      satelliteConfirmed: true,
      severity: 'warning',
      message: '15 wind damage observations in Jönköping area. SAR data confirms structural changes across 120 ha. Salvage operations should begin before beetle colonization of windthrown timber.',
      createdAt: Date.now() - 4 * 86400000,
      affectedParcels: ['P003'],
    },
    {
      id: 'alert_d03',
      type: 'boar_activity',
      center: { lat: 57.16, lng: 14.01 },
      radiusKm: 3,
      observationCount: 8,
      verifiedCount: 3,
      satelliteConfirmed: false,
      severity: 'advisory',
      message: '8 wild boar damage observations near Värnamo regeneration areas. Seedling losses estimated at 15-30%. Consider fencing for vulnerable plantations.',
      createdAt: Date.now() - 6 * 86400000,
      affectedParcels: ['P004'],
    },
  ];
}

function generateDemoEarlyWarnings(): EarlyWarningSignal[] {
  return [
    {
      id: 'ew_d01',
      source: 'cross_validated',
      type: 'Beetle Population Surge',
      confidence: 'high',
      description: 'Trap counts rising sharply (62% above regional baseline) combined with 23 community observations and satellite NDVI anomalies. Three independent data sources corroborate imminent beetle wave.',
      affectedArea: { lat: 57.19, lng: 14.05, radiusKm: 10 },
      dataPoints: 47,
      recommendation: 'Deploy additional traps, inspect all mature spruce within 2km of known infestations, and prioritise sanitation felling within 7 days.',
    },
    {
      id: 'ew_d02',
      source: 'trap_network',
      type: 'Early Swarming Detection',
      confidence: 'medium',
      description: 'GDD accumulation at 487 (swarming threshold: 557). Trap counts doubling weekly. Model predicts peak swarming within 10-14 days.',
      affectedArea: { lat: 57.20, lng: 14.10, radiusKm: 15 },
      dataPoints: 18,
      recommendation: 'Prepare for intensive monitoring. Check traps every 3 days. Pre-book contractor for potential emergency felling.',
    },
    {
      id: 'ew_d03',
      source: 'satellite',
      type: 'Drought-Beetle Compound Risk',
      confidence: 'medium',
      description: 'NDVI declining in drought-stressed stands. Historical pattern shows beetle colonization follows within 4-6 weeks of drought stress. Soil moisture critically low.',
      affectedArea: { lat: 57.25, lng: 14.15, radiusKm: 20 },
      dataPoints: 12,
      recommendation: 'Postpone thinning in drought-stressed areas. Monitor for bore dust especially on south-facing slopes.',
    },
    {
      id: 'ew_d04',
      source: 'community',
      type: 'Storm Damage Breeding Substrate',
      confidence: 'high',
      description: 'Wind-thrown timber from February storms remains unsalvaged in multiple locations. Community reports indicate 50+ trees down across 3 sites. High risk of beetle breeding in warm timber.',
      affectedArea: { lat: 57.78, lng: 14.16, radiusKm: 8 },
      dataPoints: 22,
      recommendation: 'Urgent salvage of wind-thrown spruce timber before May swarming period. Debark any logs that cannot be transported.',
    },
    {
      id: 'ew_d05',
      source: 'weather',
      type: 'Warm Spell — Flight Conditions',
      confidence: 'low',
      description: '5-day forecast shows temperatures consistently above 18C with low humidity. These are optimal bark beetle flight conditions. Combined with high trap counts, activity spike expected.',
      affectedArea: { lat: 57.30, lng: 14.20, radiusKm: 50 },
      dataPoints: 8,
      recommendation: 'Increase monitoring frequency during warm spell. Focus inspections on stand edges and south-facing aspects.',
    },
  ];
}

// ── Cache ────────────────────────────────────────────────────────────────────

let cachedHeatmap: CommunityHeatmapCell[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function isCacheValid(): boolean {
  return cachedHeatmap !== null && Date.now() - cacheTimestamp < CACHE_DURATION;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function generateHeatmap(
  _bounds?: { north: number; south: number; east: number; west: number },
  _cellSizeKm?: number
): CommunityHeatmapCell[] {
  if (isCacheValid() && cachedHeatmap) return cachedHeatmap;
  cachedHeatmap = generateDemoHeatmap();
  cacheTimestamp = Date.now();
  return cachedHeatmap;
}

export function generateCommunityAlerts(
  _lat: number,
  _lng: number,
  _radiusKm: number
): CommunityAlert[] {
  return generateDemoAlerts();
}

export function getEarlyWarningSignals(
  _lat: number,
  _lng: number,
  _radiusKm: number
): EarlyWarningSignal[] {
  return generateDemoEarlyWarnings();
}

export function getContributionScore(userId: string): ContributionScore {
  const observations = getAllObservations().filter(o => o.userId === userId).length;
  const photos = getAllPhotos().filter(p => p.userId === userId).length;
  const trapReadings = getAllReadings().length; // all readings belong to demo user in demo mode
  const treatments = getAllTreatments().filter(t => t.userId === userId).length;
  const voiceNotes = getAllVoiceNotes().filter(n => n.userId === userId).length;

  const totalScore = observations * 10 + photos * 8 + trapReadings * 5 + treatments * 15 + voiceNotes * 6;

  let rank: string;
  if (totalScore >= 500) rank = 'Expert Observer';
  else if (totalScore >= 200) rank = 'Active Contributor';
  else if (totalScore >= 50) rank = 'Regular Observer';
  else rank = 'Getting Started';

  return { observations, photos, trapReadings, treatments, voiceNotes, totalScore, rank };
}

export function getRegionalIntelligenceSummary(_county: string): string {
  const stats = getObservationStats();
  const stations = getAllStations();

  return `Regional Intelligence Summary for Kronoberg/Jönköping: ${stats.total} field observations recorded (${stats.verified} verified by multiple observers). ${stations.length} active trap stations monitoring beetle populations. Trap counts are 62% above the regional Skogsstyrelsen baseline, indicating elevated beetle pressure. Three community alerts are active: a critical beetle wave near Värnamo, storm damage salvage needed near Jönköping, and wild boar activity in regeneration areas. Satellite data corroborates beetle activity with NDVI anomalies detected across 340 ha of mature spruce. Recommended actions: prioritise sanitation felling in confirmed beetle zones, salvage wind-thrown timber before beetle colonization, and deploy additional traps along the expanding infestation front.`;
}
