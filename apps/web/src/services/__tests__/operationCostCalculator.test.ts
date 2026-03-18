import {
  calculateOperation,
  type SimulatorInput,
  type SpeciesMix,
} from '../operationCostCalculator';

const standardSpeciesMix: SpeciesMix[] = [
  { species: 'spruce', proportion: 0.65, sawlogRatio: 0.60, pulpRatio: 0.35 },
  { species: 'pine', proportion: 0.25, sawlogRatio: 0.55, pulpRatio: 0.40 },
  { species: 'birch', proportion: 0.10, sawlogRatio: 0.30, pulpRatio: 0.60 },
];

const standardHarvestInput: SimulatorInput = {
  operationType: 'finalHarvest',
  areaHa: 20,
  speciesMix: standardSpeciesMix,
  terrain: 'flat',
  distanceToRoadKm: 1.0,
  distanceToMillKm: 60,
  otherAnnualIncome: 400_000,
  skogskontoPercent: 0,
};

describe('operationCostCalculator', () => {
  describe('revenue positive for standard harvest', () => {
    it('produces positive revenue for final harvest', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.revenue.total).toBeGreaterThan(0);
      expect(result.revenue.sawlogRevenue).toBeGreaterThan(0);
      expect(result.revenue.pulpRevenue).toBeGreaterThan(0);
    });

    it('produces positive net before tax', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.netBeforeTax).toBeGreaterThan(0);
    });

    it('revenue breakdown has entries for each species', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.revenue.bySpecies.length).toBe(3);
      for (const sp of result.revenue.bySpecies) {
        expect(sp.total).toBeGreaterThan(0);
        expect(sp.volumeM3fub).toBeGreaterThan(0);
      }
    });

    it('thinning also produces positive revenue', () => {
      const thinningInput: SimulatorInput = {
        ...standardHarvestInput,
        operationType: 'thinning',
      };
      const result = calculateOperation(thinningInput);

      expect(result.revenue.total).toBeGreaterThan(0);
      expect(result.netBeforeTax).toBeGreaterThan(0);
    });

    it('planting has zero revenue', () => {
      const plantingInput: SimulatorInput = {
        ...standardHarvestInput,
        operationType: 'planting',
      };
      const result = calculateOperation(plantingInput);

      expect(result.revenue.total).toBe(0);
      expect(result.costs.total).toBeGreaterThan(0);
      expect(result.netBeforeTax).toBeLessThan(0);
    });
  });

  describe('costs increase with difficult terrain', () => {
    it('steep terrain costs more than flat', () => {
      const flatResult = calculateOperation(standardHarvestInput);
      const steepResult = calculateOperation({
        ...standardHarvestInput,
        terrain: 'steep',
      });

      expect(steepResult.costs.total).toBeGreaterThan(flatResult.costs.total);
    });

    it('hilly terrain costs more than flat but less than steep', () => {
      const flatResult = calculateOperation(standardHarvestInput);
      const hillyResult = calculateOperation({
        ...standardHarvestInput,
        terrain: 'hilly',
      });
      const steepResult = calculateOperation({
        ...standardHarvestInput,
        terrain: 'steep',
      });

      expect(hillyResult.costs.harvester).toBeGreaterThan(flatResult.costs.harvester);
      expect(steepResult.costs.harvester).toBeGreaterThan(hillyResult.costs.harvester);
    });

    it('longer distance to road increases forwarder costs', () => {
      const shortResult = calculateOperation({
        ...standardHarvestInput,
        distanceToRoadKm: 0.5,
      });
      const longResult = calculateOperation({
        ...standardHarvestInput,
        distanceToRoadKm: 4.0,
      });

      expect(longResult.costs.forwarder).toBeGreaterThan(shortResult.costs.forwarder);
    });

    it('longer distance to mill increases transport costs', () => {
      const nearResult = calculateOperation({
        ...standardHarvestInput,
        distanceToMillKm: 30,
      });
      const farResult = calculateOperation({
        ...standardHarvestInput,
        distanceToMillKm: 150,
      });

      expect(farResult.costs.transport).toBeGreaterThan(nearResult.costs.transport);
    });
  });

  describe('tax calculation with skogskonto reduces tax', () => {
    it('using skogskonto reduces income tax', () => {
      const noSkogskonto = calculateOperation({
        ...standardHarvestInput,
        skogskontoPercent: 0,
        otherAnnualIncome: 500_000,
      });
      const withSkogskonto = calculateOperation({
        ...standardHarvestInput,
        skogskontoPercent: 50,
        otherAnnualIncome: 500_000,
      });

      expect(withSkogskonto.tax.incomeTax).toBeLessThan(noSkogskonto.tax.incomeTax);
      expect(withSkogskonto.tax.skogskontoDeposit).toBeGreaterThan(0);
      expect(withSkogskonto.tax.taxSavedBySkogskonto).toBeGreaterThan(0);
    });

    it('skogskonto deposit does not exceed limits', () => {
      const result = calculateOperation({
        ...standardHarvestInput,
        skogskontoPercent: 100, // try to deposit everything
        otherAnnualIncome: 500_000,
      });

      // Max is 60% of income or 40% of tax assessment value
      expect(result.tax.skogskontoDeposit).toBeLessThanOrEqual(
        result.tax.skogskontoMax,
      );
    });

    it('effective tax rate is between 0 and 1', () => {
      const result = calculateOperation({
        ...standardHarvestInput,
        otherAnnualIncome: 400_000,
      });

      expect(result.tax.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.tax.effectiveRate).toBeLessThanOrEqual(1);
    });

    it('no tax when net before tax is zero or negative', () => {
      // Planting operation has negative net
      const result = calculateOperation({
        ...standardHarvestInput,
        operationType: 'planting',
      });

      expect(result.tax.incomeTax).toBe(0);
      expect(result.tax.skogskontoDeposit).toBe(0);
    });
  });

  describe('net result = revenue - costs - tax', () => {
    it('netAfterTax = netBeforeTax - incomeTax', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.netAfterTax).toBe(
        Math.round(result.netBeforeTax - result.tax.incomeTax),
      );
    });

    it('netBeforeTax = revenue.total - costs.total', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.netBeforeTax).toBe(
        Math.round(result.revenue.total - result.costs.total),
      );
    });

    it('costs total = sum of all cost components', () => {
      const result = calculateOperation(standardHarvestInput);
      const c = result.costs;

      expect(c.total).toBe(
        c.harvester + c.forwarder + c.transport + c.planning + c.roadMaintenance + c.silviculture,
      );
    });
  });

  describe('deferral comparison', () => {
    it('produces a deferral result for harvest operations', () => {
      const result = calculateOperation(standardHarvestInput);

      expect(result.deferral).toBeDefined();
      expect(result.deferral.additionalGrowthM3fub).toBeGreaterThan(0);
      expect(result.deferral.priceChangePercent).toBeGreaterThan(0);
    });

    it('deferred net is different from current net', () => {
      const result = calculateOperation(standardHarvestInput);

      // With growth and price increase, deferred should differ
      expect(result.deferral.deferredNetAfterTax).not.toBe(
        result.deferral.currentNetAfterTax,
      );
    });

    it('planting deferral has zero growth and equal values', () => {
      const result = calculateOperation({
        ...standardHarvestInput,
        operationType: 'planting',
      });

      expect(result.deferral.additionalGrowthM3fub).toBe(0);
      expect(result.deferral.difference).toBe(0);
    });
  });

  describe('volume calculations', () => {
    it('total volume scales with area for final harvest', () => {
      const small = calculateOperation({ ...standardHarvestInput, areaHa: 10 });
      const large = calculateOperation({ ...standardHarvestInput, areaHa: 40 });

      expect(large.totalVolumeM3fub).toBe(small.totalVolumeM3fub * 4);
    });

    it('uses default volume per ha when not specified', () => {
      const result = calculateOperation(standardHarvestInput);
      // Default for finalHarvest is 200 m3fub/ha
      expect(result.totalVolumeM3fub).toBe(20 * 200);
    });

    it('uses custom volume per ha when specified', () => {
      const result = calculateOperation({
        ...standardHarvestInput,
        volumePerHaM3fub: 250,
      });
      expect(result.totalVolumeM3fub).toBe(20 * 250);
    });
  });
});
