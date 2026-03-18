import {
  getAgeModifier,
  getSiteIndexModifier,
  calculateCarbonStock,
  calculateAnnualSequestration,
  calculateRevenue,
  getEquivalences,
  analyzeParcel,
  assessBiodiversity,
  CARBON_COEFFICIENTS,
  CERTIFICATION_PROGRAMS,
  SEK_PER_EUR,
  DEMO_PARCELS,
  type CarbonParcel,
} from '../carbonService';

const spruceParcel = DEMO_PARCELS[0]; // spruce, 85ha, SI 26, age 55

describe('carbonService', () => {
  describe('carbon sequestration calculations', () => {
    it('spruce peaks at ~8 ton CO2/ha/yr', () => {
      expect(CARBON_COEFFICIENTS.spruce.peakSequestration).toBe(8.0);
    });

    it('annual sequestration is positive for productive parcels', () => {
      const seq = calculateAnnualSequestration(spruceParcel);
      expect(seq).toBeGreaterThan(0);
    });

    it('annual sequestration scales with area', () => {
      const smallParcel: CarbonParcel = { ...spruceParcel, areaHa: 10 };
      const largeParcel: CarbonParcel = { ...spruceParcel, areaHa: 100 };

      const smallSeq = calculateAnnualSequestration(smallParcel);
      const largeSeq = calculateAnnualSequestration(largeParcel);

      expect(largeSeq).toBeGreaterThan(smallSeq);
      // Should roughly scale with area (proportional)
      expect(largeSeq / smallSeq).toBeCloseTo(10, 0);
    });

    it('carbon stock increases with parcel age', () => {
      const youngParcel: CarbonParcel = { ...spruceParcel, ageYears: 20 };
      const oldParcel: CarbonParcel = { ...spruceParcel, ageYears: 80 };

      const youngStock = calculateCarbonStock(youngParcel);
      const oldStock = calculateCarbonStock(oldParcel);

      expect(oldStock.totalCO2).toBeGreaterThan(youngStock.totalCO2);
    });

    it('carbon stock includes all three pools', () => {
      const stock = calculateCarbonStock(spruceParcel);

      expect(stock.aboveGroundCO2).toBeGreaterThan(0);
      expect(stock.belowGroundCO2).toBeGreaterThan(0);
      expect(stock.soilCO2).toBeGreaterThan(0);
      expect(stock.totalCO2).toBe(
        stock.aboveGroundCO2 + stock.belowGroundCO2 + stock.soilCO2,
      );
    });
  });

  describe('age modifier curve', () => {
    it('returns 0 for age 0', () => {
      expect(getAgeModifier(0)).toBe(0);
    });

    it('is low for very young stands (age 5)', () => {
      const mod = getAgeModifier(5);
      expect(mod).toBeGreaterThan(0);
      expect(mod).toBeLessThan(0.8);
    });

    it('peaks between age 30 and 60', () => {
      const mod30 = getAgeModifier(30);
      const mod40 = getAgeModifier(40);
      const mod50 = getAgeModifier(50);

      // Should be at or near 1.0
      expect(mod30).toBeGreaterThanOrEqual(0.95);
      expect(mod40).toBe(1.0);
      expect(mod50).toBe(1.0);
    });

    it('declines for mature stands (age > 60)', () => {
      const modPeak = getAgeModifier(50);
      const mod80 = getAgeModifier(80);
      const mod120 = getAgeModifier(120);

      expect(mod80).toBeLessThan(modPeak);
      expect(mod120).toBeLessThan(mod80);
    });

    it('returns 0.5 for old-growth (age > 120)', () => {
      expect(getAgeModifier(150)).toBe(0.5);
    });

    it('follows expected progression from young to old', () => {
      const ages = [5, 15, 25, 40, 70, 100, 130];
      const mods = ages.map(getAgeModifier);

      // Young increases
      expect(mods[1]).toBeGreaterThan(mods[0]);
      expect(mods[2]).toBeGreaterThan(mods[1]);
      // Peak
      expect(mods[3]).toBeGreaterThanOrEqual(mods[2]);
      // Decline
      expect(mods[4]).toBeLessThan(mods[3]);
      expect(mods[5]).toBeLessThan(mods[4]);
    });
  });

  describe('site index modifier', () => {
    it('baseline SI 20 returns 1.0', () => {
      expect(getSiteIndexModifier(20)).toBe(1.0);
    });

    it('higher SI returns higher modifier', () => {
      expect(getSiteIndexModifier(26)).toBeGreaterThan(1.0);
      expect(getSiteIndexModifier(30)).toBeGreaterThan(getSiteIndexModifier(26));
    });

    it('lower SI returns lower modifier', () => {
      expect(getSiteIndexModifier(16)).toBeLessThan(1.0);
    });
  });

  describe('revenue calculations', () => {
    it('gold standard gives higher revenue than verra', () => {
      const seq = 100; // 100 ton CO2
      const goldRevenue = calculateRevenue(seq, 'gold_standard');
      const verraRevenue = calculateRevenue(seq, 'verra');

      expect(goldRevenue).toBeGreaterThan(verraRevenue);
    });

    it('revenue scales with sequestration', () => {
      const rev50 = calculateRevenue(50, 'gold_standard');
      const rev100 = calculateRevenue(100, 'gold_standard');

      expect(rev100).toBe(rev50 * 2);
    });

    it('revenue is calculated correctly: seq * price * SEK_PER_EUR', () => {
      const seq = 10;
      const program = 'verra';
      const expected = Math.round(seq * CERTIFICATION_PROGRAMS[program].priceEurPerTon * SEK_PER_EUR);
      expect(calculateRevenue(seq, program)).toBe(expected);
    });

    it('analyzeParcel returns revenue for all programs', () => {
      const result = analyzeParcel(spruceParcel);

      expect(result.revenueByProgram.gold_standard).toBeGreaterThan(0);
      expect(result.revenueByProgram.verra).toBeGreaterThan(0);
      expect(result.revenueByProgram.plan_vivo).toBeGreaterThan(0);

      // Gold > Plan Vivo > Verra (by price per ton)
      expect(result.revenueByProgram.gold_standard).toBeGreaterThan(
        result.revenueByProgram.verra,
      );
    });
  });

  describe('equivalence calculations', () => {
    it('calculates flight equivalences correctly', () => {
      const eq = getEquivalences(12);
      // 12 / 0.12 = 100 flights
      expect(eq.flights).toBe(100);
    });

    it('calculates car equivalences correctly', () => {
      const eq = getEquivalences(9);
      // 9 / 1.8 = 5 cars
      expect(eq.carsPerYear).toBe(5);
    });

    it('calculates household equivalences correctly', () => {
      const eq = getEquivalences(2);
      // 2 / 0.4 = 5 households
      expect(eq.households).toBe(5);
    });

    it('all equivalences are positive for positive input', () => {
      const eq = getEquivalences(100);
      expect(eq.flights).toBeGreaterThan(0);
      expect(eq.carsPerYear).toBeGreaterThan(0);
      expect(eq.households).toBeGreaterThan(0);
    });
  });

  describe('biodiversity assessment', () => {
    it('old growth qualifies for LONA', () => {
      const parcels: CarbonParcel[] = [
        { ...spruceParcel, ageYears: 90 },
      ];
      const bio = assessBiodiversity(parcels);
      expect(bio.lonaEligible).toBe(true);
    });

    it('set-aside recommendation is ~7% of total area', () => {
      const bio = assessBiodiversity(DEMO_PARCELS);
      const totalArea = DEMO_PARCELS.reduce((s, p) => s + p.areaHa, 0);
      expect(bio.setAsideRecommendationHa).toBeCloseTo(totalArea * 0.07, 0);
    });
  });
});
