import {
  calculateScenario,
  getParcelTotalValue,
  fairSplit,
  calculateSplitResults,
  TRANSFER_METHODS,
  DEMO_PARCELS,
  type ScenarioInput,
  type Heir,
} from '../successionService';

describe('successionService', () => {
  describe('gift transfer has 0% stamp tax', () => {
    it('gava (gift) produces zero stamp duty', () => {
      const input: ScenarioInput = {
        method: 'gava',
        propertyValue: 5_000_000,
        taxBasis: 2_000_000,
        skogskontoBalance: 500_000,
        skogsavdragUsed: 200_000,
        numberOfHeirs: 2,
      };

      const result = calculateScenario(input);

      expect(result.stampDuty).toBe(0);
      expect(result.capitalGainsTax).toBe(0);
      expect(result.totalTaxCost).toBe(0);
    });

    it('gava stamp duty rate in method info is 0', () => {
      expect(TRANSFER_METHODS.gava.stampDutyRate).toBe(0);
    });

    it('inheritance also has 0% stamp duty', () => {
      const input: ScenarioInput = {
        method: 'arv',
        propertyValue: 5_000_000,
        taxBasis: 2_000_000,
        skogskontoBalance: 500_000,
        skogsavdragUsed: 200_000,
        numberOfHeirs: 3,
      };

      const result = calculateScenario(input);
      expect(result.stampDuty).toBe(0);
      expect(result.capitalGainsTax).toBe(0);
    });
  });

  describe('sale transfer has 1.5% stamp tax', () => {
    it('kop (sale) produces 1.5% stamp duty', () => {
      const propertyValue = 5_000_000;
      const input: ScenarioInput = {
        method: 'kop',
        propertyValue,
        taxBasis: 2_000_000,
        skogskontoBalance: 500_000,
        skogsavdragUsed: 200_000,
        numberOfHeirs: 1,
      };

      const result = calculateScenario(input);

      expect(result.stampDuty).toBe(Math.round(propertyValue * 0.015));
      expect(result.stampDuty).toBe(75_000);
    });

    it('kop stamp duty rate in method info is 0.015', () => {
      expect(TRANSFER_METHODS.kop.stampDutyRate).toBe(0.015);
    });

    it('kop also triggers capital gains tax when value exceeds tax basis', () => {
      const input: ScenarioInput = {
        method: 'kop',
        propertyValue: 5_000_000,
        taxBasis: 2_000_000,
        skogskontoBalance: 0,
        skogsavdragUsed: 0,
        numberOfHeirs: 1,
      };

      const result = calculateScenario(input);

      // Gain = 5M - 2M = 3M, taxable = 3M * 22/30, tax = taxable * 0.30
      const expectedGain = 3_000_000;
      const taxablePortion = expectedGain * (22 / 30);
      const expectedTax = Math.round(taxablePortion * 0.30);

      expect(result.capitalGainsTax).toBe(expectedTax);
    });

    it('kop has no capital gains when tax basis equals property value', () => {
      const input: ScenarioInput = {
        method: 'kop',
        propertyValue: 3_000_000,
        taxBasis: 3_000_000,
        skogskontoBalance: 0,
        skogsavdragUsed: 0,
        numberOfHeirs: 1,
      };

      const result = calculateScenario(input);
      expect(result.capitalGainsTax).toBe(0);
    });
  });

  describe('fair split algorithm produces balanced values', () => {
    it('splits parcels among 2 heirs with roughly equal values', () => {
      const assignments = fairSplit(DEMO_PARCELS, 2);

      expect(assignments.size).toBe(2);

      // Calculate total value per heir
      const parcelMap = new Map(DEMO_PARCELS.map(p => [p.id, p]));
      const heirValues: number[] = [];

      for (const [, parcelIds] of assignments) {
        const value = parcelIds.reduce(
          (s, id) => s + getParcelTotalValue(parcelMap.get(id)!),
          0,
        );
        heirValues.push(value);
      }

      // Values should be within 30% of each other
      const min = Math.min(...heirValues);
      const max = Math.max(...heirValues);
      expect(max / min).toBeLessThan(1.5);
    });

    it('splits parcels among 3 heirs with all parcels assigned', () => {
      const assignments = fairSplit(DEMO_PARCELS, 3);

      const allAssigned: string[] = [];
      for (const [, ids] of assignments) {
        allAssigned.push(...ids);
      }

      expect(allAssigned.length).toBe(DEMO_PARCELS.length);

      // Each parcel assigned exactly once
      const unique = new Set(allAssigned);
      expect(unique.size).toBe(DEMO_PARCELS.length);
    });

    it('single heir gets all parcels', () => {
      const assignments = fairSplit(DEMO_PARCELS, 1);
      const heir0Parcels = assignments.get(0)!;
      expect(heir0Parcels.length).toBe(DEMO_PARCELS.length);
    });
  });

  describe('total value equals sum of parcel values', () => {
    it('getParcelTotalValue returns sum of all value components', () => {
      const parcel = DEMO_PARCELS[0]; // Norra Granåsen
      const expected =
        parcel.timberValueSEK +
        parcel.landValueSEK +
        parcel.huntingRightsValueSEK +
        parcel.carbonCreditsValueSEK;

      expect(getParcelTotalValue(parcel)).toBe(expected);
    });

    it('split results total value equals sum of all parcel values', () => {
      const heirs: Heir[] = [
        { id: 'h1', name: 'Anna', assignedParcelIds: ['sp-1', 'sp-3'] },
        { id: 'h2', name: 'Erik', assignedParcelIds: ['sp-2', 'sp-4', 'sp-5'] },
      ];

      const results = calculateSplitResults(DEMO_PARCELS, heirs);

      const totalFromResults = results.reduce((s, r) => s + r.totalValue, 0);
      const totalFromParcels = DEMO_PARCELS.reduce(
        (s, p) => s + getParcelTotalValue(p),
        0,
      );

      expect(totalFromResults).toBe(totalFromParcels);
    });

    it('percentages sum to 100', () => {
      const heirs: Heir[] = [
        { id: 'h1', name: 'Anna', assignedParcelIds: ['sp-1', 'sp-2'] },
        { id: 'h2', name: 'Erik', assignedParcelIds: ['sp-3', 'sp-4', 'sp-5'] },
      ];

      const results = calculateSplitResults(DEMO_PARCELS, heirs);
      const totalPercent = results.reduce((s, r) => s + r.percentOfTotal, 0);

      expect(totalPercent).toBeCloseTo(100, 1);
    });
  });

  describe('transfer method properties', () => {
    it('all methods have required properties', () => {
      for (const method of Object.values(TRANSFER_METHODS)) {
        expect(method.id).toBeTruthy();
        expect(method.nameSv).toBeTruthy();
        expect(method.nameEn).toBeTruthy();
        expect(typeof method.stampDutyRate).toBe('number');
        expect(typeof method.complexity).toBe('number');
        expect(method.legalRequirementsSv.length).toBeGreaterThan(0);
      }
    });

    it('gava has continuity principle', () => {
      expect(TRANSFER_METHODS.gava.continuityPrinciple).toBe(true);
    });

    it('kop does not have continuity principle', () => {
      expect(TRANSFER_METHODS.kop.continuityPrinciple).toBe(false);
    });

    it('gava allows skogskonto transfer', () => {
      expect(TRANSFER_METHODS.gava.skogskontoTransferable).toBe(true);
    });

    it('kop does not allow skogskonto transfer', () => {
      expect(TRANSFER_METHODS.kop.skogskontoTransferable).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero property value', () => {
      const input: ScenarioInput = {
        method: 'kop',
        propertyValue: 0,
        taxBasis: 0,
        skogskontoBalance: 0,
        skogsavdragUsed: 0,
        numberOfHeirs: 1,
      };

      const result = calculateScenario(input);
      expect(result.stampDuty).toBe(0);
      expect(result.capitalGainsTax).toBe(0);
      expect(result.totalTaxCost).toBe(0);
    });

    it('delat_agande (co-ownership) has no stamp duty', () => {
      const input: ScenarioInput = {
        method: 'delat_agande',
        propertyValue: 5_000_000,
        taxBasis: 2_000_000,
        skogskontoBalance: 0,
        skogsavdragUsed: 0,
        numberOfHeirs: 3,
      };

      const result = calculateScenario(input);
      expect(result.stampDuty).toBe(0);
    });
  });
});
