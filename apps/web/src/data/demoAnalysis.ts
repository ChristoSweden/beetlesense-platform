/**
 * Per-stand analysis results for demo parcels.
 * Includes health score breakdowns, timber volume estimates,
 * risk assessments, change detection, and satellite vs drone comparison.
 *
 * All values are internally consistent with demoNDVI.ts and demoSurveys.ts.
 */

// ─── Types ───

export interface HealthBreakdown {
  /** Canopy density percentage */
  canopyDensity: number;
  /** Normalized vegetation color index 0-100 */
  colorIndex: number;
  /** Soil/canopy moisture index 0-100 */
  moistureIndex: number;
  /** Beetle indicator score 0-100 (0 = no indicators, 100 = severe) */
  beetleIndicators: number;
  /** Crown transparency percentage (higher = worse) */
  crownTransparency: number;
}

export interface StandAnalysis {
  standId: string;
  standLabel: string;
  parcelId: string;
  /** Overall health score 0-100 */
  healthScore: number;
  /** Health score breakdown */
  healthBreakdown: HealthBreakdown;
  /** Timber volume by species */
  timberVolume: TimberVolumeBySpecies[];
  /** Risk assessment */
  risks: RiskAssessment;
  /** Change from previous survey (null if first survey) */
  changeDetection: ChangeDetection | null;
}

export interface TimberVolumeBySpecies {
  species: string;
  /** Standing volume in m3sk */
  volumeM3sk: number;
  /** Assortment breakdown */
  assortments: {
    sawlog: number; // m3fub
    pulpwood: number; // m3fub
    energywood: number; // m3fub
  };
  /** Mean annual increment m3sk/ha/year */
  mai: number;
}

export interface RiskAssessment {
  /** Bark beetle risk 0-100 */
  beetle: { score: number; trend: 'increasing' | 'stable' | 'decreasing'; factors: string[] };
  /** Storm damage risk 0-100 */
  storm: { score: number; factors: string[] };
  /** Drought stress risk 0-100 */
  drought: { score: number; factors: string[] };
  /** Fire risk 0-100 */
  fire: { score: number; factors: string[] };
}

export interface ChangeDetection {
  /** Previous survey date */
  previousDate: string;
  /** Current survey date */
  currentDate: string;
  /** NDVI change */
  ndviChange: number;
  /** Canopy cover change (percentage points) */
  canopyCoverChange: number;
  /** New damage area in hectares */
  newDamageHa: number;
  /** Volume loss estimate m3sk */
  volumeLossM3sk: number;
  /** Classification of change */
  changeType: 'improvement' | 'stable' | 'minor_decline' | 'significant_decline' | 'severe_decline';
}

export interface SatelliteDroneComparison {
  parcelId: string;
  parcelName: string;
  /** Sentinel-2 NDVI (10m resolution) */
  satelliteNdvi: number;
  satelliteDate: string;
  satelliteResolutionM: number;
  /** Drone-derived NDVI (sub-5cm resolution) */
  droneNdvi: number;
  droneDate: string;
  droneResolutionCm: number;
  /** How much earlier drone detected the issue (days) */
  earlyDetectionDays: number;
  /** Accuracy comparison */
  accuracyComparison: {
    /** Satellite detection accuracy for this parcel */
    satelliteAccuracyPct: number;
    /** Drone detection accuracy for this parcel */
    droneAccuracyPct: number;
    /** What satellite missed */
    satelliteMissedAreas: string[];
  };
}

export interface ParcelAnalysisSummary {
  parcelId: string;
  parcelName: string;
  municipality: string;
  areaHectares: number;
  /** Aggregate health score across all stands */
  overallHealthScore: number;
  /** Weighted by stand area */
  stands: StandAnalysis[];
  /** Total timber volume across all stands */
  totalVolumeM3sk: number;
  /** Total value at current market prices (SEK) */
  estimatedValueSEK: number;
  /** Satellite vs drone comparison */
  satelliteDroneComparison: SatelliteDroneComparison | null;
  /** Last analysis date */
  analysisDate: string;
}

// ─── Per-Parcel Analysis ───

/**
 * p1: Norra Skogen — at_risk, moderate beetle pressure in Avd. 2
 */
const p1Analysis: ParcelAnalysisSummary = {
  parcelId: 'p1',
  parcelName: 'Norra Skogen',
  municipality: 'Värnamo',
  areaHectares: 42.5,
  overallHealthScore: 72,
  totalVolumeM3sk: 2740,
  estimatedValueSEK: 1_580_000,
  analysisDate: '2026-03-06',
  satelliteDroneComparison: {
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    satelliteNdvi: 0.68,
    satelliteDate: '2026-03-10',
    satelliteResolutionM: 10,
    droneNdvi: 0.62,
    droneDate: '2026-03-06',
    droneResolutionCm: 2.1,
    earlyDetectionDays: 18,
    accuracyComparison: {
      satelliteAccuracyPct: 72,
      droneAccuracyPct: 94,
      satelliteMissedAreas: ['Small stress cluster in NE Avd. 2 (< 20m diameter)', 'Early-stage crown discoloration in Avd. 1 border'],
    },
  },
  stands: [
    {
      standId: 'p1-s1', standLabel: 'Avd. 1', parcelId: 'p1',
      healthScore: 78,
      healthBreakdown: { canopyDensity: 82, colorIndex: 74, moistureIndex: 76, beetleIndicators: 15, crownTransparency: 18 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 520, assortments: { sawlog: 210, pulpwood: 130, energywood: 25 }, mai: 8.2 },
        { species: 'Pine', volumeM3sk: 85, assortments: { sawlog: 32, pulpwood: 28, energywood: 8 }, mai: 5.5 },
      ],
      risks: {
        beetle: { score: 35, trend: 'increasing', factors: ['Adjacent to stressed stand Avd. 2', 'Warm spring forecast'] },
        storm: { score: 20, factors: ['Sheltered position', 'Good rooting depth'] },
        drought: { score: 30, factors: ['South-facing slope section', 'Moraine soil drains well'] },
        fire: { score: 15, factors: ['Mixed species reduces risk'] },
      },
      changeDetection: {
        previousDate: '2025-09-22', currentDate: '2026-03-06',
        ndviChange: -0.04, canopyCoverChange: -2, newDamageHa: 0.3, volumeLossM3sk: 15,
        changeType: 'minor_decline',
      },
    },
    {
      standId: 'p1-s2', standLabel: 'Avd. 2', parcelId: 'p1',
      healthScore: 62,
      healthBreakdown: { canopyDensity: 75, colorIndex: 58, moistureIndex: 65, beetleIndicators: 42, crownTransparency: 28 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 680, assortments: { sawlog: 265, pulpwood: 175, energywood: 35 }, mai: 7.8 },
      ],
      risks: {
        beetle: { score: 68, trend: 'increasing', factors: ['Active stress detected', 'High spruce proportion', 'Windthrow damage from Nov storm'] },
        storm: { score: 45, factors: ['Thinned canopy edges exposed', 'Storm damage present'] },
        drought: { score: 40, factors: ['Reduced canopy moisture', 'Competition stress'] },
        fire: { score: 20, factors: ['Dense understory'] },
      },
      changeDetection: {
        previousDate: '2025-09-22', currentDate: '2026-03-06',
        ndviChange: -0.08, canopyCoverChange: -5, newDamageHa: 1.2, volumeLossM3sk: 65,
        changeType: 'significant_decline',
      },
    },
    {
      standId: 'p1-s3', standLabel: 'Avd. 3', parcelId: 'p1',
      healthScore: 85,
      healthBreakdown: { canopyDensity: 78, colorIndex: 82, moistureIndex: 80, beetleIndicators: 8, crownTransparency: 15 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 540, assortments: { sawlog: 198, pulpwood: 160, energywood: 30 }, mai: 6.2 },
        { species: 'Spruce', volumeM3sk: 120, assortments: { sawlog: 48, pulpwood: 32, energywood: 8 }, mai: 7.0 },
      ],
      risks: {
        beetle: { score: 15, trend: 'stable', factors: ['Pine-dominated, lower beetle preference'] },
        storm: { score: 25, factors: ['Elevated position', 'Mature trees'] },
        drought: { score: 20, factors: ['Sandy moraine, good drainage'] },
        fire: { score: 25, factors: ['Pine dominant, drier understory'] },
      },
      changeDetection: {
        previousDate: '2025-09-22', currentDate: '2026-03-06',
        ndviChange: 0.01, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
    {
      standId: 'p1-s4', standLabel: 'Avd. 4', parcelId: 'p1',
      healthScore: 88,
      healthBreakdown: { canopyDensity: 84, colorIndex: 86, moistureIndex: 82, beetleIndicators: 5, crownTransparency: 12 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 480, assortments: { sawlog: 195, pulpwood: 120, energywood: 22 }, mai: 9.5 },
      ],
      risks: {
        beetle: { score: 12, trend: 'stable', factors: ['Young vigorous stand'] },
        storm: { score: 15, factors: ['Dense stand provides mutual support'] },
        drought: { score: 25, factors: ['Good moisture retention'] },
        fire: { score: 10, factors: ['Moist site'] },
      },
      changeDetection: {
        previousDate: '2025-09-22', currentDate: '2026-03-06',
        ndviChange: 0.02, canopyCoverChange: 1, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'improvement',
      },
    },
    {
      standId: 'p1-s5', standLabel: 'Avd. 5', parcelId: 'p1',
      healthScore: 80,
      healthBreakdown: { canopyDensity: 70, colorIndex: 78, moistureIndex: 75, beetleIndicators: 10, crownTransparency: 22 },
      timberVolume: [
        { species: 'Birch', volumeM3sk: 210, assortments: { sawlog: 35, pulpwood: 105, energywood: 20 }, mai: 5.0 },
        { species: 'Spruce', volumeM3sk: 105, assortments: { sawlog: 42, pulpwood: 28, energywood: 6 }, mai: 7.5 },
      ],
      risks: {
        beetle: { score: 18, trend: 'stable', factors: ['Birch-dominated, less beetle habitat'] },
        storm: { score: 30, factors: ['Birch more wind-susceptible'] },
        drought: { score: 20, factors: ['Mixed species provides resilience'] },
        fire: { score: 15, factors: ['Deciduous canopy'] },
      },
      changeDetection: {
        previousDate: '2025-09-22', currentDate: '2026-03-06',
        ndviChange: 0.00, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
  ],
};

/**
 * p4: Granudden — infested, severe beetle damage
 */
const p4Analysis: ParcelAnalysisSummary = {
  parcelId: 'p4',
  parcelName: 'Granudden',
  municipality: 'Värnamo',
  areaHectares: 31.9,
  overallHealthScore: 45,
  totalVolumeM3sk: 2410,
  estimatedValueSEK: 980_000,
  analysisDate: '2026-03-02',
  satelliteDroneComparison: {
    parcelId: 'p4',
    parcelName: 'Granudden',
    satelliteNdvi: 0.48,
    satelliteDate: '2026-03-10',
    satelliteResolutionM: 10,
    droneNdvi: 0.31,
    droneDate: '2026-03-02',
    droneResolutionCm: 1.8,
    earlyDetectionDays: 28,
    accuracyComparison: {
      satelliteAccuracyPct: 65,
      droneAccuracyPct: 96,
      satelliteMissedAreas: [
        'Early-stage infestation in Avd. 1 border (mixed pixels at 10m)',
        'Individual infested trees in Avd. 4 scattered pattern',
        'Dead standing trees under partial canopy in Avd. 2',
      ],
    },
  },
  stands: [
    {
      standId: 'p4-s1', standLabel: 'Avd. 1', parcelId: 'p4',
      healthScore: 55,
      healthBreakdown: { canopyDensity: 65, colorIndex: 48, moistureIndex: 55, beetleIndicators: 58, crownTransparency: 35 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 420, assortments: { sawlog: 145, pulpwood: 125, energywood: 40 }, mai: 7.5 },
      ],
      risks: {
        beetle: { score: 78, trend: 'increasing', factors: ['Adjacent to active infestation in Avd. 3', 'Stress visible in crown color', 'Favorable microclimate for beetle'] },
        storm: { score: 35, factors: ['Weakened trees at infestation edge'] },
        drought: { score: 45, factors: ['Beetle-stressed trees more drought-vulnerable'] },
        fire: { score: 20, factors: ['Dead material accumulation'] },
      },
      changeDetection: {
        previousDate: '2025-08-15', currentDate: '2026-03-02',
        ndviChange: -0.15, canopyCoverChange: -12, newDamageHa: 1.8, volumeLossM3sk: 95,
        changeType: 'severe_decline',
      },
    },
    {
      standId: 'p4-s2', standLabel: 'Avd. 2', parcelId: 'p4',
      healthScore: 48,
      healthBreakdown: { canopyDensity: 58, colorIndex: 42, moistureIndex: 48, beetleIndicators: 65, crownTransparency: 42 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 480, assortments: { sawlog: 140, pulpwood: 155, energywood: 55 }, mai: 6.8 },
      ],
      risks: {
        beetle: { score: 85, trend: 'increasing', factors: ['Active secondary infestation', 'Old exit holes + new bore dust observed', 'High tree density favors spread'] },
        storm: { score: 40, factors: ['Dead trees creating windthrow risk'] },
        drought: { score: 50, factors: ['Canopy gaps increasing soil evaporation'] },
        fire: { score: 25, factors: ['Dry dead wood accumulation'] },
      },
      changeDetection: {
        previousDate: '2025-08-15', currentDate: '2026-03-02',
        ndviChange: -0.22, canopyCoverChange: -18, newDamageHa: 2.5, volumeLossM3sk: 145,
        changeType: 'severe_decline',
      },
    },
    {
      standId: 'p4-s3', standLabel: 'Avd. 3', parcelId: 'p4',
      healthScore: 28,
      healthBreakdown: { canopyDensity: 42, colorIndex: 25, moistureIndex: 30, beetleIndicators: 88, crownTransparency: 58 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 680, assortments: { sawlog: 120, pulpwood: 220, energywood: 120 }, mai: 4.2 },
      ],
      risks: {
        beetle: { score: 95, trend: 'increasing', factors: ['Primary infestation epicenter', '38% of trees actively infested', 'Brood trees present — next generation emerging'] },
        storm: { score: 55, factors: ['Severe canopy loss', 'Standing dead trees'] },
        drought: { score: 60, factors: ['Minimal canopy protection'] },
        fire: { score: 35, factors: ['High dead wood load'] },
      },
      changeDetection: {
        previousDate: '2025-08-15', currentDate: '2026-03-02',
        ndviChange: -0.35, canopyCoverChange: -30, newDamageHa: 4.2, volumeLossM3sk: 320,
        changeType: 'severe_decline',
      },
    },
    {
      standId: 'p4-s4', standLabel: 'Avd. 4', parcelId: 'p4',
      healthScore: 68,
      healthBreakdown: { canopyDensity: 72, colorIndex: 65, moistureIndex: 68, beetleIndicators: 28, crownTransparency: 22 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 410, assortments: { sawlog: 175, pulpwood: 105, energywood: 18 }, mai: 8.5 },
      ],
      risks: {
        beetle: { score: 52, trend: 'increasing', factors: ['Downwind from Avd. 3 infestation', 'Young vigorous trees more resistant'] },
        storm: { score: 20, factors: ['Sheltered by terrain'] },
        drought: { score: 30, factors: ['Good site conditions'] },
        fire: { score: 15, factors: ['Moist valley position'] },
      },
      changeDetection: {
        previousDate: '2025-08-15', currentDate: '2026-03-02',
        ndviChange: -0.05, canopyCoverChange: -3, newDamageHa: 0.4, volumeLossM3sk: 20,
        changeType: 'minor_decline',
      },
    },
    {
      standId: 'p4-s5', standLabel: 'Avd. 5', parcelId: 'p4',
      healthScore: 82,
      healthBreakdown: { canopyDensity: 76, colorIndex: 80, moistureIndex: 78, beetleIndicators: 8, crownTransparency: 16 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 260, assortments: { sawlog: 95, pulpwood: 85, energywood: 15 }, mai: 5.8 },
        { species: 'Spruce', volumeM3sk: 160, assortments: { sawlog: 68, pulpwood: 42, energywood: 8 }, mai: 7.2 },
      ],
      risks: {
        beetle: { score: 15, trend: 'stable', factors: ['Pine-dominated, lower beetle pressure'] },
        storm: { score: 25, factors: ['Exposed hill position'] },
        drought: { score: 22, factors: ['Well-drained site'] },
        fire: { score: 28, factors: ['Pine and dry ground vegetation'] },
      },
      changeDetection: {
        previousDate: '2025-08-15', currentDate: '2026-03-02',
        ndviChange: -0.01, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
  ],
};

/**
 * p2: Ekbacken — healthy oak/birch
 */
const p2Analysis: ParcelAnalysisSummary = {
  parcelId: 'p2',
  parcelName: 'Ekbacken',
  municipality: 'Gislaved',
  areaHectares: 18.3,
  overallHealthScore: 89,
  totalVolumeM3sk: 890,
  estimatedValueSEK: 720_000,
  analysisDate: '2026-03-12',
  satelliteDroneComparison: {
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    satelliteNdvi: 0.78,
    satelliteDate: '2026-03-10',
    satelliteResolutionM: 10,
    droneNdvi: 0.78,
    droneDate: '2026-03-12',
    droneResolutionCm: 2.4,
    earlyDetectionDays: 0,
    accuracyComparison: {
      satelliteAccuracyPct: 88,
      droneAccuracyPct: 95,
      satelliteMissedAreas: [],
    },
  },
  stands: [
    {
      standId: 'p2-s1', standLabel: 'Avd. 1', parcelId: 'p2',
      healthScore: 92,
      healthBreakdown: { canopyDensity: 85, colorIndex: 90, moistureIndex: 88, beetleIndicators: 2, crownTransparency: 10 },
      timberVolume: [
        { species: 'Oak', volumeM3sk: 420, assortments: { sawlog: 210, pulpwood: 80, energywood: 15 }, mai: 4.5 },
      ],
      risks: {
        beetle: { score: 5, trend: 'stable', factors: ['Oak not a target for Ips typographus'] },
        storm: { score: 15, factors: ['Deep rooting oak'] },
        drought: { score: 18, factors: ['Clay soil retains moisture'] },
        fire: { score: 8, factors: ['Deciduous canopy, moist site'] },
      },
      changeDetection: {
        previousDate: '2025-06-18', currentDate: '2026-03-12',
        ndviChange: 0.03, canopyCoverChange: 2, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'improvement',
      },
    },
    {
      standId: 'p2-s2', standLabel: 'Avd. 2', parcelId: 'p2',
      healthScore: 89,
      healthBreakdown: { canopyDensity: 80, colorIndex: 86, moistureIndex: 84, beetleIndicators: 3, crownTransparency: 14 },
      timberVolume: [
        { species: 'Birch', volumeM3sk: 280, assortments: { sawlog: 56, pulpwood: 140, energywood: 20 }, mai: 5.2 },
      ],
      risks: {
        beetle: { score: 5, trend: 'stable', factors: ['Birch not a target'] },
        storm: { score: 22, factors: ['Birch more wind-susceptible'] },
        drought: { score: 15, factors: ['Good moisture availability'] },
        fire: { score: 8, factors: ['Deciduous'] },
      },
      changeDetection: {
        previousDate: '2025-06-18', currentDate: '2026-03-12',
        ndviChange: 0.01, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
    {
      standId: 'p2-s3', standLabel: 'Avd. 3', parcelId: 'p2',
      healthScore: 86,
      healthBreakdown: { canopyDensity: 82, colorIndex: 82, moistureIndex: 80, beetleIndicators: 8, crownTransparency: 16 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 190, assortments: { sawlog: 76, pulpwood: 52, energywood: 10 }, mai: 7.8 },
      ],
      risks: {
        beetle: { score: 18, trend: 'stable', factors: ['Small spruce component', 'Surrounded by deciduous buffer'] },
        storm: { score: 20, factors: ['Sheltered by surrounding forest'] },
        drought: { score: 22, factors: ['Spruce more drought-sensitive than deciduous'] },
        fire: { score: 12, factors: ['Mixed species'] },
      },
      changeDetection: {
        previousDate: '2025-06-18', currentDate: '2026-03-12',
        ndviChange: 0.02, canopyCoverChange: 1, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'improvement',
      },
    },
  ],
};

/**
 * p6: Mossebacken — recovery after thinning
 */
const p6Analysis: ParcelAnalysisSummary = {
  parcelId: 'p6',
  parcelName: 'Mossebacken',
  municipality: 'Alvesta',
  areaHectares: 24.7,
  overallHealthScore: 76,
  totalVolumeM3sk: 1550,
  estimatedValueSEK: 850_000,
  analysisDate: '2026-02-22',
  satelliteDroneComparison: {
    parcelId: 'p6',
    parcelName: 'Mossebacken',
    satelliteNdvi: 0.62,
    satelliteDate: '2026-02-15',
    satelliteResolutionM: 10,
    droneNdvi: 0.68,
    droneDate: '2026-02-22',
    droneResolutionCm: 2.2,
    earlyDetectionDays: 0,
    accuracyComparison: {
      satelliteAccuracyPct: 78,
      droneAccuracyPct: 92,
      satelliteMissedAreas: ['Post-thinning recovery areas appear lower in satellite due to mixed pixel effect with bare ground'],
    },
  },
  stands: [
    {
      standId: 'p6-s1', standLabel: 'Avd. 1', parcelId: 'p6',
      healthScore: 75,
      healthBreakdown: { canopyDensity: 62, colorIndex: 76, moistureIndex: 72, beetleIndicators: 5, crownTransparency: 20 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 480, assortments: { sawlog: 185, pulpwood: 130, energywood: 22 }, mai: 8.8 },
      ],
      risks: {
        beetle: { score: 22, trend: 'decreasing', factors: ['Thinning reduced competition stress', 'Better wind circulation in canopy'] },
        storm: { score: 35, factors: ['Recently thinned — exposed to wind'] },
        drought: { score: 28, factors: ['Open canopy increases soil evaporation'] },
        fire: { score: 18, factors: ['Logging residues on ground'] },
      },
      changeDetection: {
        previousDate: '2024-09-10', currentDate: '2026-02-22',
        ndviChange: -0.08, canopyCoverChange: -18, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'minor_decline', // Expected from thinning, not damage
      },
    },
    {
      standId: 'p6-s2', standLabel: 'Avd. 2', parcelId: 'p6',
      healthScore: 82,
      healthBreakdown: { canopyDensity: 70, colorIndex: 80, moistureIndex: 78, beetleIndicators: 4, crownTransparency: 16 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 450, assortments: { sawlog: 165, pulpwood: 135, energywood: 18 }, mai: 6.0 },
      ],
      risks: {
        beetle: { score: 12, trend: 'stable', factors: ['Pine-dominated'] },
        storm: { score: 28, factors: ['Mature pines on exposed ridge'] },
        drought: { score: 20, factors: ['Pine tolerates drought well'] },
        fire: { score: 22, factors: ['Pine litter, dry understory'] },
      },
      changeDetection: {
        previousDate: '2024-09-10', currentDate: '2026-02-22',
        ndviChange: -0.02, canopyCoverChange: -5, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
    {
      standId: 'p6-s3', standLabel: 'Avd. 3', parcelId: 'p6',
      healthScore: 72,
      healthBreakdown: { canopyDensity: 58, colorIndex: 72, moistureIndex: 68, beetleIndicators: 6, crownTransparency: 24 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 500, assortments: { sawlog: 190, pulpwood: 140, energywood: 25 }, mai: 9.2 },
        { species: 'Birch', volumeM3sk: 120, assortments: { sawlog: 18, pulpwood: 68, energywood: 12 }, mai: 4.8 },
      ],
      risks: {
        beetle: { score: 18, trend: 'decreasing', factors: ['Recovering well from thinning', 'Good spacing'] },
        storm: { score: 38, factors: ['Most recently thinned, most exposed'] },
        drought: { score: 32, factors: ['Young spruce with shallow roots'] },
        fire: { score: 15, factors: ['Logging residue being colonized by moss'] },
      },
      changeDetection: {
        previousDate: '2024-09-10', currentDate: '2026-02-22',
        ndviChange: -0.10, canopyCoverChange: -22, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'minor_decline', // Thinning-related
      },
    },
  ],
};

/**
 * p3: Tallmon — healthy pine (partial, survey in progress)
 */
const p3Analysis: ParcelAnalysisSummary = {
  parcelId: 'p3',
  parcelName: 'Tallmon',
  municipality: 'Jönköping',
  areaHectares: 67.1,
  overallHealthScore: 82,
  totalVolumeM3sk: 3850,
  estimatedValueSEK: 2_050_000,
  analysisDate: '2026-03-14',
  satelliteDroneComparison: null, // Survey still in progress
  stands: [
    {
      standId: 'p3-s1', standLabel: 'Avd. 1', parcelId: 'p3',
      healthScore: 86,
      healthBreakdown: { canopyDensity: 80, colorIndex: 84, moistureIndex: 78, beetleIndicators: 6, crownTransparency: 14 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 820, assortments: { sawlog: 310, pulpwood: 250, energywood: 35 }, mai: 5.8 },
      ],
      risks: {
        beetle: { score: 10, trend: 'stable', factors: ['Pine-dominated'] },
        storm: { score: 30, factors: ['Elevated terrain, exposed to westerly winds'] },
        drought: { score: 25, factors: ['Sandy soil, well-drained'] },
        fire: { score: 30, factors: ['Pine-dominated, dry understory'] },
      },
      changeDetection: null,
    },
    {
      standId: 'p3-s2', standLabel: 'Avd. 2', parcelId: 'p3',
      healthScore: 83,
      healthBreakdown: { canopyDensity: 78, colorIndex: 80, moistureIndex: 76, beetleIndicators: 8, crownTransparency: 16 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 940, assortments: { sawlog: 365, pulpwood: 280, energywood: 40 }, mai: 5.5 },
        { species: 'Spruce', volumeM3sk: 180, assortments: { sawlog: 72, pulpwood: 50, energywood: 10 }, mai: 7.2 },
      ],
      risks: {
        beetle: { score: 15, trend: 'stable', factors: ['Low spruce proportion'] },
        storm: { score: 28, factors: ['Good canopy structure'] },
        drought: { score: 22, factors: ['Pine drought-tolerant'] },
        fire: { score: 28, factors: ['Pine litter accumulation'] },
      },
      changeDetection: null,
    },
    // Remaining stands — estimated from satellite only (drone survey in progress)
    {
      standId: 'p3-s3', standLabel: 'Avd. 3', parcelId: 'p3',
      healthScore: 80,
      healthBreakdown: { canopyDensity: 76, colorIndex: 78, moistureIndex: 74, beetleIndicators: 12, crownTransparency: 18 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 880, assortments: { sawlog: 350, pulpwood: 240, energywood: 35 }, mai: 8.0 },
      ],
      risks: {
        beetle: { score: 25, trend: 'stable', factors: ['Spruce-dominated stand', 'Drought stress in summer 2025'] },
        storm: { score: 22, factors: ['Sheltered by surrounding pine'] },
        drought: { score: 35, factors: ['Summer 2025 drought stress detected in NDVI'] },
        fire: { score: 18, factors: ['Mixed canopy'] },
      },
      changeDetection: null,
    },
    {
      standId: 'p3-s4', standLabel: 'Avd. 4', parcelId: 'p3',
      healthScore: 79,
      healthBreakdown: { canopyDensity: 74, colorIndex: 76, moistureIndex: 72, beetleIndicators: 10, crownTransparency: 20 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 680, assortments: { sawlog: 250, pulpwood: 210, energywood: 30 }, mai: 5.2 },
      ],
      risks: {
        beetle: { score: 12, trend: 'stable', factors: ['Pine-dominated'] },
        storm: { score: 35, factors: ['Ridge position'] },
        drought: { score: 28, factors: ['Thin soil over rock'] },
        fire: { score: 32, factors: ['Dry exposed site'] },
      },
      changeDetection: null,
    },
    {
      standId: 'p3-s5', standLabel: 'Avd. 5', parcelId: 'p3',
      healthScore: 78,
      healthBreakdown: { canopyDensity: 68, colorIndex: 75, moistureIndex: 70, beetleIndicators: 5, crownTransparency: 22 },
      timberVolume: [
        { species: 'Birch', volumeM3sk: 350, assortments: { sawlog: 55, pulpwood: 180, energywood: 30 }, mai: 5.0 },
      ],
      risks: {
        beetle: { score: 5, trend: 'stable', factors: ['Birch stand'] },
        storm: { score: 28, factors: ['Birch more wind-susceptible'] },
        drought: { score: 20, factors: ['Valley position, moist'] },
        fire: { score: 12, factors: ['Deciduous'] },
      },
      changeDetection: null,
    },
  ],
};

/**
 * p7: Stensjo — healthy mixed conifer
 */
const p7Analysis: ParcelAnalysisSummary = {
  parcelId: 'p7',
  parcelName: 'Stensjö',
  municipality: 'Ljungby',
  areaHectares: 38.2,
  overallHealthScore: 81,
  totalVolumeM3sk: 2580,
  estimatedValueSEK: 1_320_000,
  analysisDate: '2026-02-17',
  satelliteDroneComparison: {
    parcelId: 'p7',
    parcelName: 'Stensjö',
    satelliteNdvi: 0.71,
    satelliteDate: '2026-02-15',
    satelliteResolutionM: 10,
    droneNdvi: 0.72,
    droneDate: '2026-02-17',
    droneResolutionCm: 2.2,
    earlyDetectionDays: 0,
    accuracyComparison: {
      satelliteAccuracyPct: 85,
      droneAccuracyPct: 93,
      satelliteMissedAreas: ['Minor browsing damage patches in Avd. 4 (< 5m)'],
    },
  },
  stands: [
    {
      standId: 'p7-s1', standLabel: 'Avd. 1', parcelId: 'p7',
      healthScore: 84,
      healthBreakdown: { canopyDensity: 78, colorIndex: 82, moistureIndex: 80, beetleIndicators: 5, crownTransparency: 14 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 880, assortments: { sawlog: 340, pulpwood: 260, energywood: 35 }, mai: 5.0 },
      ],
      risks: {
        beetle: { score: 8, trend: 'stable', factors: ['Pine-dominated'] },
        storm: { score: 22, factors: ['Rocky terrain anchors roots'] },
        drought: { score: 20, factors: ['Pine tolerant'] },
        fire: { score: 28, factors: ['Mature pine, lichen ground cover'] },
      },
      changeDetection: {
        previousDate: '2025-02-20', currentDate: '2026-02-17',
        ndviChange: 0.01, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
    {
      standId: 'p7-s2', standLabel: 'Avd. 2', parcelId: 'p7',
      healthScore: 81,
      healthBreakdown: { canopyDensity: 80, colorIndex: 78, moistureIndex: 76, beetleIndicators: 10, crownTransparency: 16 },
      timberVolume: [
        { species: 'Spruce', volumeM3sk: 720, assortments: { sawlog: 290, pulpwood: 195, energywood: 28 }, mai: 7.5 },
      ],
      risks: {
        beetle: { score: 20, trend: 'stable', factors: ['Spruce component monitored'] },
        storm: { score: 25, factors: ['Northeast-facing slope'] },
        drought: { score: 25, factors: ['Deeper soil moisture'] },
        fire: { score: 15, factors: ['Moist north-facing'] },
      },
      changeDetection: {
        previousDate: '2025-02-20', currentDate: '2026-02-17',
        ndviChange: 0.02, canopyCoverChange: 1, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'improvement',
      },
    },
    {
      standId: 'p7-s3', standLabel: 'Avd. 3', parcelId: 'p7',
      healthScore: 79,
      healthBreakdown: { canopyDensity: 75, colorIndex: 76, moistureIndex: 74, beetleIndicators: 8, crownTransparency: 18 },
      timberVolume: [
        { species: 'Pine', volumeM3sk: 800, assortments: { sawlog: 300, pulpwood: 250, energywood: 32 }, mai: 4.8 },
      ],
      risks: {
        beetle: { score: 10, trend: 'stable', factors: ['Pine-dominated'] },
        storm: { score: 30, factors: ['Exposed hilltop position'] },
        drought: { score: 28, factors: ['Thin soil layer over rock'] },
        fire: { score: 32, factors: ['Driest sub-stand'] },
      },
      changeDetection: {
        previousDate: '2025-02-20', currentDate: '2026-02-17',
        ndviChange: 0.00, canopyCoverChange: 0, newDamageHa: 0, volumeLossM3sk: 0,
        changeType: 'stable',
      },
    },
    {
      standId: 'p7-s4', standLabel: 'Avd. 4', parcelId: 'p7',
      healthScore: 76,
      healthBreakdown: { canopyDensity: 68, colorIndex: 74, moistureIndex: 72, beetleIndicators: 4, crownTransparency: 24 },
      timberVolume: [
        { species: 'Birch', volumeM3sk: 180, assortments: { sawlog: 28, pulpwood: 100, energywood: 18 }, mai: 4.5 },
      ],
      risks: {
        beetle: { score: 3, trend: 'stable', factors: ['Birch stand'] },
        storm: { score: 25, factors: ['Young birch flexible'] },
        drought: { score: 18, factors: ['Valley moisture'] },
        fire: { score: 10, factors: ['Deciduous'] },
      },
      changeDetection: {
        previousDate: '2025-02-20', currentDate: '2026-02-17',
        ndviChange: -0.01, canopyCoverChange: -1, newDamageHa: 0.2, volumeLossM3sk: 5,
        changeType: 'stable',
      },
    },
  ],
};

// ─── Exports ───

export const DEMO_ANALYSES: ParcelAnalysisSummary[] = [
  p1Analysis,
  p2Analysis,
  p3Analysis,
  p4Analysis,
  p6Analysis,
  p7Analysis,
];

/** Get analysis for a specific parcel */
export function getParcelAnalysis(parcelId: string): ParcelAnalysisSummary | undefined {
  return DEMO_ANALYSES.find((a) => a.parcelId === parcelId);
}

/** Get stand analysis by stand ID */
export function getStandAnalysis(standId: string): StandAnalysis | undefined {
  for (const parcel of DEMO_ANALYSES) {
    const stand = parcel.stands.find((s) => s.standId === standId);
    if (stand) return stand;
  }
  return undefined;
}

/** Get all satellite vs drone comparisons */
export function getSatelliteDroneComparisons(): SatelliteDroneComparison[] {
  return DEMO_ANALYSES
    .filter((a) => a.satelliteDroneComparison !== null)
    .map((a) => a.satelliteDroneComparison!);
}

/** Get parcels sorted by beetle risk (highest first) */
export function getParcelsByBeetleRisk(): Array<{ parcelId: string; parcelName: string; maxBeetleRisk: number }> {
  return DEMO_ANALYSES
    .map((a) => ({
      parcelId: a.parcelId,
      parcelName: a.parcelName,
      maxBeetleRisk: Math.max(...a.stands.map((s) => s.risks.beetle.score)),
    }))
    .sort((a, b) => b.maxBeetleRisk - a.maxBeetleRisk);
}

/** Get total timber value across all analyzed parcels */
export function getTotalTimberValue(): { totalM3sk: number; totalSEK: number; parcelCount: number } {
  return {
    totalM3sk: DEMO_ANALYSES.reduce((sum, a) => sum + a.totalVolumeM3sk, 0),
    totalSEK: DEMO_ANALYSES.reduce((sum, a) => sum + a.estimatedValueSEK, 0),
    parcelCount: DEMO_ANALYSES.length,
  };
}
