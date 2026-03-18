/**
 * TimberPriceService — Swedish timber price data and value calculation.
 *
 * Prices are per m3fub (cubic meter solid under bark) and based on
 * current Swedish market rates (updated quarterly). Source references:
 * Virkesbörsen, Biometria, SDC statistics.
 *
 * Conversion note: m3sk (cubic meter standing) to m3fub uses species-specific
 * bark and top deduction factors (typically 0.80-0.85 for conifers).
 */

// ─── Types ───

export type TimberSpecies = 'spruce' | 'pine' | 'birch' | 'oak' | 'alder';

export interface TimberPrice {
  /** Swedish name */
  nameSv: string;
  /** English name */
  nameEn: string;
  /** Sawlog price per m3fub in SEK */
  sawlogPrice: number;
  /** Pulpwood price per m3fub in SEK */
  pulpPrice: number;
  /** Biofuel (GROT) price per m3fub in SEK */
  biofuelPrice: number;
  /** Conversion factor from m3sk to m3fub */
  skToFubFactor: number;
}

export interface SpeciesVolume {
  species: TimberSpecies;
  /** Volume in m3sk (cubic meter standing / skogskubikmeter) */
  volumeM3sk: number;
  /** Proportion of volume that is sawlog quality (0-1) */
  sawlogRatio: number;
  /** Proportion of volume that is pulpwood quality (0-1) */
  pulpRatio: number;
}

export interface SpeciesValuation {
  species: TimberSpecies;
  nameSv: string;
  nameEn: string;
  volumeM3sk: number;
  sawlogRatio: number;
  pulpRatio: number;
  sawlogValue: number;
  pulpValue: number;
  totalValue: number;
}

export interface TimberValuation {
  totalValue: number;
  speciesBreakdown: SpeciesValuation[];
  priceDate: string;
}

// ─── Current Prices (Q1 2026) ───

export const TIMBER_PRICES: Record<TimberSpecies, TimberPrice> = {
  spruce: {
    nameSv: 'Gran',
    nameEn: 'Spruce',
    sawlogPrice: 650,
    pulpPrice: 350,
    biofuelPrice: 120,
    skToFubFactor: 0.83,
  },
  pine: {
    nameSv: 'Tall',
    nameEn: 'Pine',
    sawlogPrice: 600,
    pulpPrice: 320,
    biofuelPrice: 115,
    skToFubFactor: 0.82,
  },
  birch: {
    nameSv: 'Björk',
    nameEn: 'Birch',
    sawlogPrice: 500,
    pulpPrice: 300,
    biofuelPrice: 110,
    skToFubFactor: 0.80,
  },
  oak: {
    nameSv: 'Ek',
    nameEn: 'Oak',
    sawlogPrice: 900,
    pulpPrice: 280,
    biofuelPrice: 130,
    skToFubFactor: 0.78,
  },
  alder: {
    nameSv: 'Al',
    nameEn: 'Alder',
    sawlogPrice: 400,
    pulpPrice: 260,
    biofuelPrice: 100,
    skToFubFactor: 0.79,
  },
};

/** Date these prices were last updated */
export const PRICE_DATE = '2026-01-15';

// ─── Calculation ───

/**
 * Calculate the estimated timber value for a set of species volumes.
 *
 * Formula per species:
 *   volumeFub = volumeM3sk * skToFubFactor
 *   sawlogValue = volumeFub * sawlogRatio * sawlogPrice
 *   pulpValue = volumeFub * pulpRatio * pulpPrice
 *   totalValue = sawlogValue + pulpValue
 */
export function calculateTimberValue(
  speciesVolumes: SpeciesVolume[],
): TimberValuation {
  const speciesBreakdown: SpeciesValuation[] = speciesVolumes.map((sv) => {
    const prices = TIMBER_PRICES[sv.species];
    if (!prices) {
      return {
        species: sv.species,
        nameSv: sv.species,
        nameEn: sv.species,
        volumeM3sk: sv.volumeM3sk,
        sawlogRatio: sv.sawlogRatio,
        pulpRatio: sv.pulpRatio,
        sawlogValue: 0,
        pulpValue: 0,
        totalValue: 0,
      };
    }

    const volumeFub = sv.volumeM3sk * prices.skToFubFactor;
    const sawlogValue = Math.round(volumeFub * sv.sawlogRatio * prices.sawlogPrice);
    const pulpValue = Math.round(volumeFub * sv.pulpRatio * prices.pulpPrice);

    return {
      species: sv.species,
      nameSv: prices.nameSv,
      nameEn: prices.nameEn,
      volumeM3sk: sv.volumeM3sk,
      sawlogRatio: sv.sawlogRatio,
      pulpRatio: sv.pulpRatio,
      sawlogValue,
      pulpValue,
      totalValue: sawlogValue + pulpValue,
    };
  });

  const totalValue = speciesBreakdown.reduce((sum, s) => sum + s.totalValue, 0);

  return {
    totalValue,
    speciesBreakdown,
    priceDate: PRICE_DATE,
  };
}

/**
 * Format a number as Swedish krona with thousand separators.
 * Example: 2400000 -> "2 400 000 kr"
 */
export function formatSEK(value: number): string {
  return (
    new Intl.NumberFormat('sv-SE', {
      maximumFractionDigits: 0,
    }).format(value) + ' kr'
  );
}

/**
 * Calculate value at risk — the estimated loss if beetle damage
 * spreads to a given volume of spruce.
 */
export function calculateValueAtRisk(
  affectedVolumeM3sk: number,
  species: TimberSpecies = 'spruce',
  sawlogRatio: number = 0.65,
): number {
  const prices = TIMBER_PRICES[species];
  if (!prices) return 0;

  const volumeFub = affectedVolumeM3sk * prices.skToFubFactor;
  // Damaged timber sells at ~60% discount on sawlog, pulp stays similar
  const normalSawlogValue = volumeFub * sawlogRatio * prices.sawlogPrice;
  const damagedSawlogValue = normalSawlogValue * 0.4; // 60% loss
  const loss = Math.round(normalSawlogValue - damagedSawlogValue);

  return loss;
}
