/**
 * Swedish Forestry Economics — Cost benchmarks and tax rules (2026).
 *
 * Sources: Skogforsk cost norms, Skogsstyrelsen statistics,
 * Skatteverket forest taxation rules. Prices in SEK.
 */

// ─── Types ───

export type OperationType = 'thinning' | 'finalHarvest' | 'preCommercialThinning' | 'planting';
export type TerrainType = 'flat' | 'hilly' | 'steep';
export type StemSize = 'small' | 'medium' | 'large';

export interface HarvesterCost {
  /** kr per m3fub */
  flat: { small: number; medium: number; large: number };
  hilly: { small: number; medium: number; large: number };
  steep: { small: number; medium: number; large: number };
}

export interface ForwarderCost {
  /** kr per m3fub, indexed by distance bracket (km) */
  short: number;   // 0-1 km
  medium: number;   // 1-3 km
  long: number;     // 3-5 km
}

export interface TransportCost {
  /** kr per m3fub, base + distance factor */
  baseCost: number;
  perKmCost: number;
  /** Average distance to mill in km if not specified */
  defaultDistanceKm: number;
}

export interface SilvicultureCost {
  /** Planting cost in kr/ha */
  planting: { min: number; max: number; typical: number };
  /** Pre-commercial thinning (rojning) in kr/ha */
  preCommercialThinning: { min: number; max: number; typical: number };
  /** Site preparation (markberedning) in kr/ha */
  sitePreparation: { min: number; max: number; typical: number };
}

export interface PlanningCost {
  /** kr per hectare */
  perHectare: number;
  /** Minimum cost per operation */
  minimumCost: number;
}

export interface RoadMaintenanceCost {
  /** kr per hectare of operation area */
  perHectare: number;
}

// ─── Cost Benchmarks (2026) ───

/**
 * Harvester costs per m3fub, varying by terrain and stem size.
 * Small stems (<0.15 m3fub avg) cost more per unit.
 */
export const HARVESTER_COSTS: HarvesterCost = {
  flat:  { small: 145, medium: 120, large: 110 },
  hilly: { small: 155, medium: 135, large: 125 },
  steep: { small: 160, medium: 150, large: 140 },
};

/**
 * Forwarder costs per m3fub by forwarding distance.
 */
export const FORWARDER_COSTS: Record<TerrainType, ForwarderCost> = {
  flat:  { short: 60, medium: 72, long: 85 },
  hilly: { short: 68, medium: 78, long: 90 },
  steep: { short: 75, medium: 85, long: 95 },
};

/**
 * Transport costs to mill. Base + per-km.
 * Typical total: 80-120 kr/m3fub depending on distance.
 */
export const TRANSPORT_COSTS: TransportCost = {
  baseCost: 55,
  perKmCost: 0.65,
  defaultDistanceKm: 60,
};

/**
 * Silviculture costs per hectare.
 */
export const SILVICULTURE_COSTS: SilvicultureCost = {
  planting:                { min: 5000, max: 8000, typical: 6500 },
  preCommercialThinning:   { min: 3000, max: 6000, typical: 4500 },
  sitePreparation:         { min: 2500, max: 4000, typical: 3200 },
};

/**
 * Forest operation planning costs.
 */
export const PLANNING_COSTS: PlanningCost = {
  perHectare: 250,
  minimumCost: 3000,
};

/**
 * Road maintenance allocation per operation.
 */
export const ROAD_MAINTENANCE_COSTS: RoadMaintenanceCost = {
  perHectare: 500,
};

// ─── Volume Estimates ───

/**
 * Typical harvest volumes per hectare (m3fub) by operation type.
 * Used as defaults when parcel-specific data is not available.
 */
export const TYPICAL_VOLUMES_PER_HA: Record<'thinning' | 'finalHarvest', number> = {
  thinning: 50,        // ~50 m3fub/ha for a typical thinning
  finalHarvest: 200,   // ~200 m3fub/ha for a final harvest in southern Sweden
};

/**
 * Stem size classification based on operation type.
 */
export const DEFAULT_STEM_SIZE: Record<'thinning' | 'finalHarvest', StemSize> = {
  thinning: 'small',
  finalHarvest: 'large',
};

// ─── Tax Rules (Swedish Forest Taxation 2026) ───

export interface TaxBracket {
  /** Upper limit of the bracket in SEK (Infinity for the last bracket) */
  upTo: number;
  /** Municipal tax rate (kommunalskatt) — average ~32% */
  municipalRate: number;
  /** State tax rate for this bracket */
  stateRate: number;
  /** Total marginal rate */
  totalRate: number;
}

/**
 * Swedish income tax brackets for 2026.
 * Municipal tax averages ~32%. State tax applies above certain thresholds.
 */
export const TAX_BRACKETS: TaxBracket[] = [
  { upTo: 614000,   municipalRate: 0.32, stateRate: 0.00, totalRate: 0.32 },
  { upTo: 919000,   municipalRate: 0.32, stateRate: 0.20, totalRate: 0.52 },
  { upTo: Infinity,  municipalRate: 0.32, stateRate: 0.25, totalRate: 0.57 },
];

/**
 * Skogskonto rules — a tax deferral mechanism for forest owners.
 *
 * - Max 60% of net income from timber sales can be deposited.
 * - Max 40% of the property's tax assessment value (taxeringsvarde).
 * - Funds must be withdrawn within 10 years.
 * - Interest accrues at a low rate (currently ~0.5% after tax).
 * - Tax is paid when withdrawn, at whatever marginal rate applies then.
 */
export const SKOGSKONTO_RULES = {
  /** Maximum share of net timber income that can be deposited */
  maxShareOfIncome: 0.60,
  /** Maximum share of property tax assessment value */
  maxShareOfTaxValue: 0.40,
  /** Default property tax assessment value if not provided (SEK) */
  defaultTaxAssessmentValue: 2_000_000,
  /** Maximum deposit period in years */
  maxYears: 10,
  /** Approximate annual interest rate on skogskonto deposits */
  interestRate: 0.005,
};

/**
 * Rantefordelning — interest allocation for sole proprietors.
 * Allows allocation of capital income from the forest property
 * at a lower tax rate (30% capital gains tax instead of marginal income tax).
 *
 * The positive interest allocation is calculated as:
 * (adjusted equity in the business) x (government bond rate + 6 percentage points)
 */
export const RANTEFORDELNING = {
  /** Government bond rate + 6% (approximate, 2026) */
  allocationRate: 0.085,
  /** Capital income tax rate */
  capitalTaxRate: 0.30,
  /** Default adjusted equity if not provided (SEK) */
  defaultEquity: 500_000,
};

// ─── Annual Growth Rate ───

/**
 * Average annual volume growth per hectare (m3sk) for Swedish forests.
 * Varies by region. Used for "what if we defer 1 year" calculations.
 */
export const ANNUAL_GROWTH_M3SK_PER_HA: Record<string, number> = {
  south: 8.5,    // Gotaland
  central: 6.0,  // Svealand
  north: 3.5,    // Norrland
  default: 6.0,
};

/**
 * Expected annual timber price change (real terms).
 * Historical average ~1-2% real growth for Swedish timber.
 */
export const ANNUAL_PRICE_CHANGE_PERCENT = 1.5;
