/**
 * HarvestLogisticsService — Machine coordination, extraction path planning,
 * and mill delivery optimization for Swedish forestry operations.
 *
 * Volumes in m3fub. Distances in km. Costs in SEK.
 */

// ─── Types ───

export type MachineType = 'harvester' | 'forwarder' | 'truck';
export type TerrainClass = 'flat_easy' | 'moderate_slope' | 'steep_wet';
export type SoilType = 'wet_clay' | 'moraine' | 'peat' | 'sand' | 'rock';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export interface StandInfo {
  id: string;
  name: string;
  areaHa: number;
  volumeM3fub: number;
  terrainClass: TerrainClass;
  soilType: SoilType;
  species: 'spruce' | 'pine' | 'birch' | 'mixed';
  distanceToRoadKm: number;
  hasWetlands: boolean;
  hasCulturalSites: boolean;
  hasSteepSlopes: boolean;
  /** Center coordinate [lng, lat] WGS84 */
  center: [number, number];
  /** Boundary polygon coordinates WGS84 */
  boundary: [number, number][];
}

export interface MachineScheduleBlock {
  machine: MachineType;
  machineLabel: string;
  startDay: number;
  endDay: number;
  /** Hours of active work */
  activeHours: number;
  /** Hours of idle/waiting */
  idleHours: number;
  costSEK: number;
  volumeM3fub: number;
}

export interface MachineScheduleResult {
  blocks: MachineScheduleBlock[];
  totalDays: number;
  totalMachineHours: number;
  totalIdleHours: number;
  totalCostSEK: number;
}

export interface ExtractionPath {
  id: string;
  type: 'basväg' | 'stickväg';
  /** Polyline coordinates [lng, lat] */
  coordinates: [number, number][];
  lengthM: number;
  soilDamageRisk: 'low' | 'medium' | 'high';
}

export interface LandingPoint {
  id: string;
  name: string;
  coordinate: [number, number];
  capacityM3: number;
}

export interface SensitiveArea {
  id: string;
  type: 'wetland' | 'cultural_site' | 'steep_slope';
  coordinates: [number, number][];
  bufferM: number;
}

export interface ExtractionPlan {
  paths: ExtractionPath[];
  landings: LandingPoint[];
  sensitiveAreas: SensitiveArea[];
  totalStripRoadLengthM: number;
  estimatedSoilDamageScore: number;
}

export interface MillOption {
  id: string;
  name: string;
  company: string;
  distanceKm: number;
  bidPrices: {
    sawlog: number;
    pulpwood: number;
    energyWood: number;
  };
  transportCostPerM3: number;
  netRevenuePerM3Sawlog: number;
  netRevenuePerM3Pulp: number;
  estimatedQueueDays: number;
  totalNetRevenue: number;
  isBestChoice: boolean;
}

export interface CostSummaryResult {
  revenue: {
    sawlog: number;
    pulpwood: number;
    energyWood: number;
    total: number;
  };
  costs: {
    harvester: number;
    forwarder: number;
    transport: number;
    planning: number;
    roadMaintenance: number;
    total: number;
  };
  netProfit: number;
  marginPercent: number;
  perHectare: number;
  perM3: number;
}

export interface SeasonRating {
  month: string;
  monthIndex: number;
  soilCondition: 'frozen' | 'good' | 'moderate' | 'poor';
  damageRisk: 'none' | 'low' | 'medium' | 'high';
  priceOutlook: 'strong' | 'normal' | 'weak';
  isOptimal: boolean;
}

export interface SeasonRecommendationResult {
  ratings: SeasonRating[];
  optimalWindow: string;
  reasoning: string;
  frozenGroundMonths: string[];
}

export interface HarvestPlan {
  stand: StandInfo;
  season: Season;
  schedule: MachineScheduleResult;
  extraction: ExtractionPlan;
  mills: MillOption[];
  costSummary: CostSummaryResult;
  seasonRecommendation: SeasonRecommendationResult;
}

// ─── Constants ───

/** Productivity rates by terrain class (m3/hour) */
const HARVESTER_PRODUCTIVITY: Record<TerrainClass, number> = {
  flat_easy: 25,
  moderate_slope: 18,
  steep_wet: 12,
};

/** Forwarder productivity is roughly 60-80% of harvester */
const FORWARDER_PRODUCTIVITY: Record<TerrainClass, number> = {
  flat_easy: 20,
  moderate_slope: 14,
  steep_wet: 9,
};

/** Machine hourly costs in SEK */
const MACHINE_HOURLY_COST: Record<MachineType, number> = {
  harvester: 1850,
  forwarder: 1450,
  truck: 950,
};

/** Soil damage risk by soil type */
const SOIL_DAMAGE_RISK: Record<SoilType, 'low' | 'medium' | 'high'> = {
  wet_clay: 'high',
  peat: 'high',
  sand: 'low',
  moraine: 'low',
  rock: 'low',
};

/** Season impact on soil damage */
const _SEASON_DAMAGE_MULTIPLIER: Record<Season, number> = {
  summer: 1.5,
  spring: 1.3,
  autumn: 1.0,
  winter: 0.2,
};

/** Truck capacity and speed */
const TRUCK_CAPACITY_M3 = 38;
const TRUCK_SPEED_KPH = 55;
const TRUCK_LOAD_UNLOAD_HOURS = 1.5;

const PLANNING_COST_PER_HA = 650;
const ROAD_MAINTENANCE_PER_HA = 350;

// ─── Demo Data ───

export function getDemoStand(): StandInfo {
  return {
    id: 'stand-demo-1',
    name: 'Norra Gran (avd. 12)',
    areaHa: 85,
    volumeM3fub: 4500,
    terrainClass: 'moderate_slope',
    soilType: 'moraine',
    species: 'spruce',
    distanceToRoadKm: 0.8,
    hasWetlands: true,
    hasCulturalSites: true,
    hasSteepSlopes: false,
    center: [14.815, 57.785],
    boundary: [
      [14.805, 57.780],
      [14.825, 57.780],
      [14.828, 57.790],
      [14.810, 57.792],
      [14.803, 57.785],
      [14.805, 57.780],
    ],
  };
}

function getDemoMills(stand: StandInfo): MillOption[] {
  const mills = [
    {
      id: 'mill-1',
      name: 'Vida Nybro',
      company: 'Vida AB',
      distanceKm: 42,
      bidPrices: { sawlog: 785, pulpwood: 345, energyWood: 155 },
      estimatedQueueDays: 2,
    },
    {
      id: 'mill-2',
      name: 'Södra Mönsterås',
      company: 'Södra Skogsägarna',
      distanceKm: 68,
      bidPrices: { sawlog: 820, pulpwood: 360, energyWood: 160 },
      estimatedQueueDays: 4,
    },
    {
      id: 'mill-3',
      name: 'Holmen Braviken',
      company: 'Holmen Skog',
      distanceKm: 155,
      bidPrices: { sawlog: 845, pulpwood: 375, energyWood: 170 },
      estimatedQueueDays: 3,
    },
    {
      id: 'mill-4',
      name: 'SCA Munksund',
      company: 'SCA Skog',
      distanceKm: 210,
      bidPrices: { sawlog: 810, pulpwood: 380, energyWood: 165 },
      estimatedQueueDays: 5,
    },
    {
      id: 'mill-5',
      name: 'Derome Veddige',
      company: 'Derome Timber',
      distanceKm: 95,
      bidPrices: { sawlog: 800, pulpwood: 350, energyWood: 150 },
      estimatedQueueDays: 1,
    },
  ];

  return mills.map((m) => {
    const transportCostPerM3 = 45 + m.distanceKm * 0.85;
    const sawlogVolume = stand.volumeM3fub * 0.55;
    const pulpVolume = stand.volumeM3fub * 0.35;
    const energyVolume = stand.volumeM3fub * 0.10;

    const netRevenuePerM3Sawlog = m.bidPrices.sawlog - transportCostPerM3;
    const netRevenuePerM3Pulp = m.bidPrices.pulpwood - transportCostPerM3;

    const totalNetRevenue = Math.round(
      sawlogVolume * netRevenuePerM3Sawlog +
      pulpVolume * netRevenuePerM3Pulp +
      energyVolume * (m.bidPrices.energyWood - transportCostPerM3)
    );

    return {
      ...m,
      transportCostPerM3: Math.round(transportCostPerM3),
      netRevenuePerM3Sawlog: Math.round(netRevenuePerM3Sawlog),
      netRevenuePerM3Pulp: Math.round(netRevenuePerM3Pulp),
      totalNetRevenue,
      isBestChoice: false,
    };
  });
}

// ─── Scheduling Engine ───

export function calculateMachineSchedule(
  stand: StandInfo,
  _season: Season,
): MachineScheduleResult {
  const volume = stand.volumeM3fub;
  const terrain = stand.terrainClass;

  // Harvester
  const harvesterProductivity = HARVESTER_PRODUCTIVITY[terrain];
  const harvesterHours = Math.ceil(volume / harvesterProductivity);
  const harvesterDays = Math.ceil(harvesterHours / 8);

  // Forwarder starts 2 days after harvester (needs material on ground)
  const forwarderProductivity = FORWARDER_PRODUCTIVITY[terrain];
  const forwarderHours = Math.ceil(volume / forwarderProductivity);
  const forwarderDays = Math.ceil(forwarderHours / 8);
  const forwarderStart = 2;
  const forwarderIdleHours = Math.max(0, forwarderStart * 8);

  // Trucks: start after forwarder has 1 day of material at landing
  const truckStart = forwarderStart + 1;
  const tripsNeeded = Math.ceil(volume / TRUCK_CAPACITY_M3);
  const bestMill = 68; // default demo distance
  const tripHours = (bestMill * 2) / TRUCK_SPEED_KPH + TRUCK_LOAD_UNLOAD_HOURS;
  const tripsPerDayPerTruck = Math.floor(8 / tripHours);
  const truckDaysNeeded = Math.ceil(tripsNeeded / (tripsPerDayPerTruck * 2));
  const truck1Trips = Math.ceil(tripsNeeded / 2);
  const truck2Trips = tripsNeeded - truck1Trips;
  const truck1Hours = Math.round(truck1Trips * tripHours);
  const truck2Hours = Math.round(truck2Trips * tripHours);
  const truck1IdleHours = Math.max(0, truckStart * 8);
  const truck2IdleHours = Math.max(0, (truckStart + 1) * 8);

  const blocks: MachineScheduleBlock[] = [
    {
      machine: 'harvester',
      machineLabel: 'Skördare',
      startDay: 0,
      endDay: harvesterDays,
      activeHours: harvesterHours,
      idleHours: 0,
      costSEK: harvesterHours * MACHINE_HOURLY_COST.harvester,
      volumeM3fub: volume,
    },
    {
      machine: 'forwarder',
      machineLabel: 'Skotare',
      startDay: forwarderStart,
      endDay: forwarderStart + forwarderDays,
      activeHours: forwarderHours,
      idleHours: forwarderIdleHours,
      costSEK: forwarderHours * MACHINE_HOURLY_COST.forwarder,
      volumeM3fub: volume,
    },
    {
      machine: 'truck',
      machineLabel: 'Lastbil 1',
      startDay: truckStart,
      endDay: truckStart + truckDaysNeeded,
      activeHours: truck1Hours,
      idleHours: truck1IdleHours,
      costSEK: truck1Hours * MACHINE_HOURLY_COST.truck,
      volumeM3fub: truck1Trips * TRUCK_CAPACITY_M3,
    },
    {
      machine: 'truck',
      machineLabel: 'Lastbil 2',
      startDay: truckStart + 1,
      endDay: truckStart + 1 + truckDaysNeeded,
      activeHours: truck2Hours,
      idleHours: truck2IdleHours,
      costSEK: truck2Hours * MACHINE_HOURLY_COST.truck,
      volumeM3fub: truck2Trips * TRUCK_CAPACITY_M3,
    },
  ];

  const totalDays = Math.max(...blocks.map((b) => b.endDay));
  const totalMachineHours = blocks.reduce((s, b) => s + b.activeHours, 0);
  const totalIdleHours = blocks.reduce((s, b) => s + b.idleHours, 0);
  const totalCostSEK = blocks.reduce((s, b) => s + b.costSEK, 0);

  return { blocks, totalDays, totalMachineHours, totalIdleHours, totalCostSEK };
}

// ─── Extraction Path Planning ───

export function planExtractionPaths(stand: StandInfo): ExtractionPlan {
  const cx = stand.center[0];
  const cy = stand.center[1];
  const soilRisk = SOIL_DAMAGE_RISK[stand.soilType];

  // Generate demo basvägar (main strip roads)
  const basvägar: ExtractionPath[] = [
    {
      id: 'bas-1',
      type: 'basväg',
      coordinates: [
        [cx - 0.008, cy - 0.004],
        [cx - 0.002, cy - 0.003],
        [cx + 0.004, cy - 0.001],
        [cx + 0.010, cy + 0.001],
      ],
      lengthM: 1850,
      soilDamageRisk: soilRisk,
    },
    {
      id: 'bas-2',
      type: 'basväg',
      coordinates: [
        [cx - 0.006, cy + 0.003],
        [cx, cy + 0.002],
        [cx + 0.006, cy + 0.003],
        [cx + 0.010, cy + 0.001],
      ],
      lengthM: 1620,
      soilDamageRisk: soilRisk,
    },
  ];

  // Generate stickvägar (branch roads) perpendicular to basvägar
  const stickvägar: ExtractionPath[] = [];
  for (let i = 0; i < 8; i++) {
    const offsetX = -0.006 + i * 0.002;
    stickvägar.push({
      id: `stick-${i + 1}`,
      type: 'stickväg',
      coordinates: [
        [cx + offsetX, cy - 0.003 + (i % 2) * 0.001],
        [cx + offsetX + 0.001, cy + 0.002 - (i % 2) * 0.001],
      ],
      lengthM: 280 + Math.round(Math.random() * 120),
      soilDamageRisk: i >= 6 && stand.hasWetlands ? 'high' : soilRisk,
    });
  }

  const landings: LandingPoint[] = [
    {
      id: 'landing-1',
      name: 'Avlägg Norr',
      coordinate: [cx + 0.011, cy + 0.001],
      capacityM3: 300,
    },
    {
      id: 'landing-2',
      name: 'Avlägg Syd',
      coordinate: [cx - 0.009, cy - 0.004],
      capacityM3: 250,
    },
  ];

  const sensitiveAreas: SensitiveArea[] = [];
  if (stand.hasWetlands) {
    sensitiveAreas.push({
      id: 'sa-1',
      type: 'wetland',
      coordinates: [
        [cx + 0.005, cy + 0.004],
        [cx + 0.008, cy + 0.004],
        [cx + 0.008, cy + 0.006],
        [cx + 0.005, cy + 0.006],
        [cx + 0.005, cy + 0.004],
      ],
      bufferM: 15,
    });
  }
  if (stand.hasCulturalSites) {
    sensitiveAreas.push({
      id: 'sa-2',
      type: 'cultural_site',
      coordinates: [
        [cx - 0.003, cy + 0.005],
        [cx - 0.001, cy + 0.005],
        [cx - 0.001, cy + 0.006],
        [cx - 0.003, cy + 0.006],
        [cx - 0.003, cy + 0.005],
      ],
      bufferM: 25,
    });
  }
  if (stand.hasSteepSlopes) {
    sensitiveAreas.push({
      id: 'sa-3',
      type: 'steep_slope',
      coordinates: [
        [cx - 0.007, cy - 0.002],
        [cx - 0.004, cy - 0.002],
        [cx - 0.004, cy],
        [cx - 0.007, cy],
        [cx - 0.007, cy - 0.002],
      ],
      bufferM: 10,
    });
  }

  const allPaths = [...basvägar, ...stickvägar];
  const totalStripRoadLengthM = allPaths.reduce((s, p) => s + p.lengthM, 0);
  const highRiskCount = allPaths.filter((p) => p.soilDamageRisk === 'high').length;
  const estimatedSoilDamageScore = Math.round(
    (highRiskCount / Math.max(allPaths.length, 1)) * 100,
  );

  return { paths: allPaths, landings, sensitiveAreas, totalStripRoadLengthM, estimatedSoilDamageScore };
}

// ─── Mill Comparison ───

export function compareMillOptions(stand: StandInfo): MillOption[] {
  const mills = getDemoMills(stand);

  // Mark best choice (highest total net revenue)
  let bestIdx = 0;
  let bestRevenue = -Infinity;
  mills.forEach((m, i) => {
    if (m.totalNetRevenue > bestRevenue) {
      bestRevenue = m.totalNetRevenue;
      bestIdx = i;
    }
  });
  mills[bestIdx].isBestChoice = true;

  return mills.sort((a, b) => b.totalNetRevenue - a.totalNetRevenue);
}

// ─── Cost Summary ───

export function calculateCostSummary(
  stand: StandInfo,
  schedule: MachineScheduleResult,
  bestMill: MillOption,
): CostSummaryResult {
  const sawlogVolume = stand.volumeM3fub * 0.55;
  const pulpVolume = stand.volumeM3fub * 0.35;
  const energyVolume = stand.volumeM3fub * 0.10;

  const revenue = {
    sawlog: Math.round(sawlogVolume * bestMill.bidPrices.sawlog),
    pulpwood: Math.round(pulpVolume * bestMill.bidPrices.pulpwood),
    energyWood: Math.round(energyVolume * bestMill.bidPrices.energyWood),
    total: 0,
  };
  revenue.total = revenue.sawlog + revenue.pulpwood + revenue.energyWood;

  const harvesterBlock = schedule.blocks.find((b) => b.machine === 'harvester');
  const forwarderBlock = schedule.blocks.find((b) => b.machine === 'forwarder');
  const truckBlocks = schedule.blocks.filter((b) => b.machine === 'truck');

  const costs = {
    harvester: harvesterBlock?.costSEK ?? 0,
    forwarder: forwarderBlock?.costSEK ?? 0,
    transport: truckBlocks.reduce((s, b) => s + b.costSEK, 0),
    planning: Math.round(stand.areaHa * PLANNING_COST_PER_HA),
    roadMaintenance: Math.round(stand.areaHa * ROAD_MAINTENANCE_PER_HA),
    total: 0,
  };
  costs.total = costs.harvester + costs.forwarder + costs.transport + costs.planning + costs.roadMaintenance;

  const netProfit = revenue.total - costs.total;
  const marginPercent = revenue.total > 0 ? Math.round((netProfit / revenue.total) * 100) : 0;
  const perHectare = stand.areaHa > 0 ? Math.round(netProfit / stand.areaHa) : 0;
  const perM3 = stand.volumeM3fub > 0 ? Math.round(netProfit / stand.volumeM3fub) : 0;

  return { revenue, costs, netProfit, marginPercent, perHectare, perM3 };
}

// ─── Season Recommendation ───

export function getSeasonRecommendation(stand: StandInfo): SeasonRecommendationResult {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const frozenMonths = ['Dec', 'Jan', 'Feb', 'Mar'];
  const wetSoil = stand.soilType === 'wet_clay' || stand.soilType === 'peat';

  const ratings: SeasonRating[] = months.map((month, idx) => {
    const isFrozen = frozenMonths.includes(month);
    let soilCondition: SeasonRating['soilCondition'];
    let damageRisk: SeasonRating['damageRisk'];

    if (isFrozen) {
      soilCondition = 'frozen';
      damageRisk = 'none';
    } else if (idx >= 3 && idx <= 4) {
      // spring thaw
      soilCondition = 'poor';
      damageRisk = wetSoil ? 'high' : 'medium';
    } else if (idx >= 5 && idx <= 7) {
      // summer
      soilCondition = wetSoil ? 'moderate' : 'good';
      damageRisk = wetSoil ? 'high' : 'medium';
    } else {
      // autumn
      soilCondition = wetSoil ? 'moderate' : 'good';
      damageRisk = wetSoil ? 'medium' : 'low';
    }

    // Price outlook: typically stronger in winter/spring, weaker in late summer
    let priceOutlook: SeasonRating['priceOutlook'] = 'normal';
    if (idx <= 2 || idx === 11) priceOutlook = 'strong';
    if (idx >= 6 && idx <= 8) priceOutlook = 'weak';

    const isOptimal = isFrozen && priceOutlook === 'strong';

    return { month, monthIndex: idx, soilCondition, damageRisk, priceOutlook, isOptimal };
  });

  const optimalMonths = ratings.filter((r) => r.isOptimal).map((r) => r.month);
  const optimalWindow = optimalMonths.length > 0
    ? `${optimalMonths[0]}–${optimalMonths[optimalMonths.length - 1]}`
    : 'Jan–Mar';

  const reasoning = wetSoil
    ? 'Wet clay/peat soil requires frozen ground to avoid compaction damage. Winter harvest with frozen ground gives best bearing capacity and highest timber prices.'
    : 'Moraine soil has good bearing capacity year-round, but frozen ground in winter eliminates soil damage risk and coincides with peak timber prices.';

  return {
    ratings,
    optimalWindow,
    reasoning,
    frozenGroundMonths: frozenMonths,
  };
}

// ─── Full Harvest Plan ───

export function generateHarvestPlan(
  stand: StandInfo,
  season: Season = 'winter',
): HarvestPlan {
  const schedule = calculateMachineSchedule(stand, season);
  const extraction = planExtractionPaths(stand);
  const mills = compareMillOptions(stand);
  const bestMill = mills.find((m) => m.isBestChoice) ?? mills[0];
  const costSummary = calculateCostSummary(stand, schedule, bestMill);
  const seasonRecommendation = getSeasonRecommendation(stand);

  return { stand, season, schedule, extraction, mills, costSummary, seasonRecommendation };
}
