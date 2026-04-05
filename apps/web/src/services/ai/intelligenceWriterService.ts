/**
 * Intelligence Writer Service
 *
 * Generates plain-language intelligence briefs that appear on Status and
 * Threats pages. Writes in accessible, Swedish-forest-owner-friendly language.
 *
 * TODO: Replace demo responses with actual Claude API calls when API key is configured.
 *
 * Aligned with EFI ForestWard Observatory grant: automated intelligence
 * generation from multi-source data fusion.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface IntelligenceBrief {
  id: string;
  generatedAt: number;
  type: 'status_update' | 'threat_brief' | 'weekly_summary' | 'parcel_report' | 'community_digest';
  title: string;
  content: string;
  sources: string[];
  citations: string[];
  confidence: number;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'informational';
  parcelId?: string;
  actions: { action: string; deadline: string; priority: 'high' | 'medium' | 'low' }[];
}

export interface WeeklySummary {
  id: string;
  weekOf: string;
  parcelSummaries: { parcelId: string; healthScore: number; keyChange: string; action: string }[];
  communityHighlights: string[];
  satelliteUpdates: string[];
  modelUpdates: string[];
  upcomingActions: string[];
  overallAssessment: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateId(): string {
  return `brief_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hoursAgo(n: number): number {
  return Date.now() - n * 3600000;
}

// ─── Demo Status Updates ──────────────────────────────────────────────────

const DEMO_STATUS_UPDATES: IntelligenceBrief[] = [
  {
    id: 'brief_sat_001',
    generatedAt: hoursAgo(2),
    type: 'status_update',
    title: 'Sentinel-2 pass completed — NDVI stable across 3 of 4 parcels',
    content: 'The latest Sentinel-2 satellite pass shows vegetation health within normal seasonal range for Bjorkbacken, Tallmon, and Mossebacken. However, Granudden NE continues to show a -12% NDVI anomaly compared to the 5-year average. This decline has been consistent over the last 3 passes (6 weeks) and correlates with elevated beetle trap counts in the area. Landsat data from last week confirms the trend. Recommend ground-truth inspection of the affected 2.3 ha zone within the next 7 days.',
    sources: ['Sentinel-2', 'Landsat-9', 'Historical NDVI baseline'],
    citations: [],
    confidence: 0.88,
    urgency: 'this_week',
    parcelId: 'P002',
    actions: [
      { action: 'Ground-truth inspect Granudden NE NDVI anomaly zone', deadline: '7 days', priority: 'high' },
      { action: 'Compare NDVI trend with Sentinel-1 SAR for structural changes', deadline: '3 days', priority: 'medium' },
    ],
  },
  {
    id: 'brief_wx_001',
    generatedAt: hoursAgo(3),
    type: 'status_update',
    title: 'GDD accumulation at 487/557 — swarming threshold approaching',
    content: 'Growing degree day (GDD) accumulation has reached 487 out of 557 (87% of the standard swarming threshold). At the current rate of +12 DD/day, the threshold will be reached in approximately 6 days. However, recent research (Lindstrom et al. 2026) suggests the effective threshold may have shifted to 520-540 DD, meaning swarming could begin within 3-4 days. SMHI forecasts warm conditions (18-22°C) for the next 5 days with no significant rain. This combination of high GDD and warm, dry weather creates optimal beetle flight conditions.',
    sources: ['SMHI weather data', 'ForestWard GDD tracker', 'EUMETSAT soil moisture'],
    citations: ['Lindstrom et al. (2026) — revised GDD thresholds'],
    confidence: 0.85,
    urgency: 'immediate',
    actions: [
      { action: 'Check pheromone traps every 2-3 days instead of weekly', deadline: '2 days', priority: 'high' },
      { action: 'Inspect mature spruce stands for bore dust', deadline: '4 days', priority: 'high' },
    ],
  },
  {
    id: 'brief_comm_001',
    generatedAt: hoursAgo(6),
    type: 'status_update',
    title: '5 beetle observations verified within 5 km — community alert level rising',
    content: 'The community observation network has logged 5 verified beetle sightings within 5 km of your properties in the last 7 days. Three observations include bore dust photos verified by 2+ community members. The highest concentration is 2.3 km southwest of Bjorkbacken, where 8 mature spruce trees show active colonization. This aligns with your trap station data showing 8,400 beetles/week (62% above the Kronoberg regional baseline of 5,200).',
    sources: ['Community observations', 'Photo intelligence AI', 'Trap network'],
    citations: [],
    confidence: 0.82,
    urgency: 'this_week',
    actions: [
      { action: 'Walk southwestern boundary of Bjorkbacken to check for spread', deadline: '3 days', priority: 'high' },
      { action: 'Contact neighbors for coordinated monitoring', deadline: '7 days', priority: 'medium' },
    ],
  },
  {
    id: 'brief_trap_001',
    generatedAt: hoursAgo(8),
    type: 'status_update',
    title: 'Trap counts peaked at 11,200 — now declining but still elevated',
    content: 'Your Bjorkbacken South trap station recorded peak counts of 11,200 Ips typographus beetles/week two weeks ago. Current counts have declined to 9,600 but remain well above the regional baseline of 5,200. The decline likely represents the end of the first swarming wave. A second wave is expected in 3-4 weeks if temperatures stay above 18°C. Granåsen Ridge station shows moderate counts at 5,460, suggesting the pressure is concentrated around the southern parcels.',
    sources: ['Your trap stations (3)', 'Skogsstyrelsen regional baseline', 'Historical trap curves'],
    citations: ['Bakke et al. (1977) — pheromone trap methodology'],
    confidence: 0.90,
    urgency: 'this_week',
    actions: [
      { action: 'Maintain trap monitoring at twice-weekly frequency', deadline: 'Ongoing', priority: 'medium' },
      { action: 'Prepare for second swarming wave — have sanitation felling contractor on standby', deadline: '3 weeks', priority: 'high' },
    ],
  },
  {
    id: 'brief_research_001',
    generatedAt: hoursAgo(24),
    type: 'status_update',
    title: 'New research: Marklund biomass estimates may undercount carbon stocks by 8-12%',
    content: 'A newly published study by Nilsson et al. (2026) in Forest Ecology and Management compares traditional Marklund allometric BEFs with height-calibrated biomass estimates using GEDI satellite data. Results show traditional estimates undercount above-ground biomass by 8-12% in mature spruce stands over 25m. This could affect your carbon accounting: estimated carbon stock increase of 15-25 t CO2/ha for Bjorkbacken and Tallmon. The AI Knowledge Curator has flagged this as a contradiction with the existing Marklund (1988) entry in the knowledge base.',
    sources: ['AI Knowledge Curator', 'RAG knowledge base'],
    citations: ['Nilsson et al. (2026) — Forest Ecology and Management', 'Marklund (1988) — SLU'],
    confidence: 0.75,
    urgency: 'informational',
    actions: [
      { action: 'Review carbon calculations using updated biomass estimates', deadline: 'This month', priority: 'low' },
    ],
  },
];

// ─── Demo Threat Briefs ───────────────────────────────────────────────────

const DEMO_THREAT_BRIEFS: IntelligenceBrief[] = [
  {
    id: 'brief_threat_beetle',
    generatedAt: hoursAgo(4),
    type: 'threat_brief',
    title: 'Bark beetle risk HIGH — 4 data layers confirm active colonization',
    content: 'Cross-layer validation confirms bark beetle colonization threat at HIGH confidence. Evidence from 4 independent data layers:\n\n1. **Trap data**: 8,400 beetles/week at Bjorkbacken (62% above baseline)\n2. **Satellite**: NDVI anomaly (-12%) at Granudden NE persisting 6 weeks\n3. **Community**: 5 verified bore dust observations within 5 km\n4. **Weather**: GDD at 487 (87% of swarming threshold), drought stress active\n\nThe drought-beetle cascade is amplifying risk: drought stress reduces spruce resin production by 40-60%, lowering natural defences. Compound threat score: 62/100.',
    sources: ['Trap network', 'Sentinel-2', 'Community observations', 'SMHI weather'],
    citations: ['Netherer & Schopf (2010) — drought-beetle interaction', 'Jonsson et al. (2007) — outbreak dynamics'],
    confidence: 0.88,
    urgency: 'immediate',
    actions: [
      { action: 'Sanitation felling of confirmed infested trees within 7 days', deadline: '7 days', priority: 'high' },
      { action: 'Debark logs on site or transport within 24h', deadline: 'Ongoing', priority: 'high' },
      { action: 'Deploy 2 additional pheromone traps at Granudden edges', deadline: '5 days', priority: 'medium' },
    ],
  },
  {
    id: 'brief_threat_fire',
    generatedAt: hoursAgo(12),
    type: 'threat_brief',
    title: 'Fire risk MODERATE — FWI elevated but no active fires detected',
    content: 'Fire Weather Index at 22.6 (High danger class) with Drought Code at 280. EUMETSAT shows soil moisture at 18% (below critical 20% threshold). However, no active fires detected within 100 km by NASA FIRMS. MSB has not issued regional fire restrictions yet. Risk will increase if dry conditions persist through the weekend as forecast by SMHI.',
    sources: ['SMHI', 'NASA FIRMS', 'EUMETSAT HSAF', 'MSB'],
    citations: ['Granstrom et al. (2026) — FWI + soil moisture fusion'],
    confidence: 0.80,
    urgency: 'this_week',
    actions: [
      { action: 'Verify firebreak condition along forest roads', deadline: '5 days', priority: 'medium' },
      { action: 'Check water source availability for emergency response', deadline: '7 days', priority: 'low' },
    ],
  },
  {
    id: 'brief_threat_ndvi',
    generatedAt: hoursAgo(18),
    type: 'threat_brief',
    title: 'NDVI anomaly persistent at Granudden — ground truth needed',
    content: 'Sentinel-2 and Landsat both show a -12% NDVI deviation at Granudden NE (2.3 ha area) over 3 consecutive satellite passes spanning 6 weeks. SAR data shows stable canopy structure (no windthrow detected), suggesting the stress is physiological rather than structural. This pattern is consistent with early-stage bark beetle damage or drought stress. Without ground-truth data from this specific zone, confidence remains at PROBABLE rather than CONFIRMED.',
    sources: ['Sentinel-2', 'Landsat-9', 'Sentinel-1 SAR'],
    citations: [],
    confidence: 0.72,
    urgency: 'this_week',
    parcelId: 'P002',
    actions: [
      { action: 'Walk the 2.3 ha anomaly zone and log field observations', deadline: '5 days', priority: 'high' },
      { action: 'Take close-up photos of bark for AI classification', deadline: '5 days', priority: 'medium' },
    ],
  },
];

// ─── Demo Weekly Summary ──────────────────────────────────────────────────

function getDemoWeeklySummary(): WeeklySummary {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  return {
    id: `weekly_${Date.now()}`,
    weekOf: weekStart.toISOString().slice(0, 10),
    parcelSummaries: [
      { parcelId: 'P001', healthScore: 72, keyChange: 'Beetle trap counts declining from peak', action: 'Maintain twice-weekly trap monitoring' },
      { parcelId: 'P002', healthScore: 58, keyChange: 'NDVI anomaly persists at -12%', action: 'Ground-truth inspection this week' },
      { parcelId: 'P003', healthScore: 45, keyChange: 'Wind damage from last week + beetle risk', action: 'Salvage wind-thrown timber urgently' },
      { parcelId: 'P005', healthScore: 89, keyChange: 'No changes, healthy condition maintained', action: 'Continue routine monitoring' },
    ],
    communityHighlights: [
      '5 verified beetle sightings within 5 km — concentrated southwest of your properties',
      '2 neighbors have begun sanitation felling in adjacent stands',
      '1 new community member joined the local observation network',
    ],
    satelliteUpdates: [
      'Sentinel-2: 2 passes this week, cloud cover 25-40%',
      'Landsat-9: 1 pass confirming NDVI trend at Granudden',
      'NASA FIRMS: No fire detections within 100 km',
    ],
    modelUpdates: [
      'GDD model: 487/557 DD — swarming threshold approaching',
      'FWI: Elevated (22.6) but below extreme threshold',
      'New research flagged: GDD threshold may be 520-540 DD (lower than current model)',
    ],
    upcomingActions: [
      'Ground-truth Granudden NDVI anomaly (priority: high)',
      'Prepare sanitation felling contractor for beetle response',
      'Review EUDR geolocation documentation for Tallmon and Mossebacken',
      'Submit weekly trap readings to Skogsstyrelsen portal',
    ],
    overallAssessment: 'Elevated risk week. Beetle pressure remains high despite declining trap counts. The GDD threshold is approaching and warm weather is forecast. Focus this week on ground-truthing the Granudden anomaly and preparing for potential sanitation felling. Fire risk is moderate but manageable. Overall portfolio health score: 66/100.',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a status update intelligence brief for a parcel.
 */
export function generateStatusUpdate(
  _parcelId?: string,
  _satelliteData?: unknown,
  _weatherData?: unknown,
  _communityData?: unknown,
): IntelligenceBrief {
  // Demo: return a relevant status update
  return DEMO_STATUS_UPDATES[0];
}

/**
 * Generate a threat brief for a specific threat type.
 */
export function generateThreatBrief(
  _threatType?: string,
  _evidence?: unknown,
  _crossValidation?: unknown,
): IntelligenceBrief {
  return DEMO_THREAT_BRIEFS[0];
}

/**
 * Generate a weekly summary for a user.
 */
export function generateWeeklySummary(_userId?: string): WeeklySummary {
  return getDemoWeeklySummary();
}

/**
 * Generate a comprehensive parcel health report.
 */
export function generateParcelReport(_parcelId?: string): IntelligenceBrief {
  return {
    ...DEMO_STATUS_UPDATES[0],
    id: generateId(),
    type: 'parcel_report',
    generatedAt: Date.now(),
  };
}

/**
 * Generate a community activity digest.
 */
export function generateCommunityDigest(
  _lat?: number,
  _lng?: number,
  _radiusKm?: number,
): IntelligenceBrief {
  return {
    ...DEMO_STATUS_UPDATES[2],
    id: generateId(),
    type: 'community_digest',
    generatedAt: Date.now(),
  };
}

/**
 * Get recent intelligence briefs.
 */
export function getRecentBriefs(_userId?: string, _limit?: number): IntelligenceBrief[] {
  const all = [...DEMO_STATUS_UPDATES, ...DEMO_THREAT_BRIEFS];
  return all.sort((a, b) => b.generatedAt - a.generatedAt);
}

/**
 * Get demo threat briefs only.
 */
export function getThreatBriefs(): IntelligenceBrief[] {
  return DEMO_THREAT_BRIEFS;
}

/**
 * Get demo status updates only.
 */
export function getStatusUpdates(): IntelligenceBrief[] {
  return DEMO_STATUS_UPDATES;
}
