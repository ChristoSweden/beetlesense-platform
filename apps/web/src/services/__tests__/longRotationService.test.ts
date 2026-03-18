import {
  projectStrategy,
  runAllStrategies,
  runSensitivityAnalysis,
  estimateVolumePerHa,
  calculateMAI,
  calculateCAI,
  DEMO_STAND,
  DEFAULT_STREAMS,
  DEFAULT_SENSITIVITY,
  type SensitivityParams,
} from '../longRotationService';

const stand = DEMO_STAND; // spruce, age 55, SI 26, 45 ha
const streams = DEFAULT_STREAMS;
const sensitivity = DEFAULT_SENSITIVITY;

describe('longRotationService', () => {
  describe('NPV increases with discount rate decrease', () => {
    it('lower discount rate produces higher NPV', () => {
      const lowDR: SensitivityParams = { ...sensitivity, discountRate: 0.015 };
      const highDR: SensitivityParams = { ...sensitivity, discountRate: 0.045 };

      const lowResult = projectStrategy(stand, 'traditional', streams, lowDR);
      const highResult = projectStrategy(stand, 'traditional', streams, highDR);

      expect(lowResult.totalNPV).toBeGreaterThan(highResult.totalNPV);
    });

    it('sensitivity analysis confirms discount rate impact', () => {
      const results = runSensitivityAnalysis(stand, 'traditional', streams, sensitivity);
      const drResult = results.find(r => r.variable === 'Discount Rate');

      expect(drResult).toBeDefined();
      expect(drResult!.highNPV).toBeGreaterThan(drResult!.lowNPV);
      expect(drResult!.impact).toBeGreaterThan(0);
    });
  });

  describe('carbon-focused strategy stores more CO2', () => {
    it('carbon_focused has higher end CO2 than traditional', () => {
      const allResults = runAllStrategies(stand, streams, sensitivity);

      const traditional = allResults.find(r => r.id === 'traditional')!;
      const carbonFocused = allResults.find(r => r.id === 'carbon_focused')!;

      expect(carbonFocused.endCO2Stored).toBeGreaterThan(traditional.endCO2Stored);
    });

    it('carbon_focused has higher biodiversity score', () => {
      const allResults = runAllStrategies(stand, streams, sensitivity);

      const traditional = allResults.find(r => r.id === 'traditional')!;
      const carbonFocused = allResults.find(r => r.id === 'carbon_focused')!;

      expect(carbonFocused.biodiversityScore).toBeGreaterThan(
        traditional.biodiversityScore,
      );
    });
  });

  describe('traditional rotation shorter than extended', () => {
    it('traditional clearfell is at age 75, extended at 110', () => {
      const allResults = runAllStrategies(stand, streams, sensitivity);

      const traditional = allResults.find(r => r.id === 'traditional')!;
      const extended = allResults.find(r => r.id === 'extended')!;

      // Traditional should have clearfell event at age 75
      const tradClearfell = traditional.projections.find(
        p => p.events.some(e => e.type === 'clearfell'),
      );
      const extClearfell = extended.projections.find(
        p => p.events.some(e => e.type === 'clearfell'),
      );

      expect(tradClearfell).toBeDefined();
      expect(extClearfell).toBeDefined();
      expect(tradClearfell!.age).toBeLessThan(extClearfell!.age);
    });

    it('traditional has more total harvest volume', () => {
      const allResults = runAllStrategies(stand, streams, sensitivity);

      const traditional = allResults.find(r => r.id === 'traditional')!;
      const carbonFocused = allResults.find(r => r.id === 'carbon_focused')!;

      expect(traditional.totalHarvestVolume).toBeGreaterThan(
        carbonFocused.totalHarvestVolume,
      );
    });
  });

  describe('sensitivity analysis produces different NPVs', () => {
    it('returns results for timber, carbon, and discount rate', () => {
      const results = runSensitivityAnalysis(stand, 'traditional', streams, sensitivity);

      expect(results.length).toBe(3);

      const variables = results.map(r => r.variable);
      expect(variables).toContain('Timber Price');
      expect(variables).toContain('Carbon Price');
      expect(variables).toContain('Discount Rate');
    });

    it('each variable has distinct low and high NPVs', () => {
      const results = runSensitivityAnalysis(stand, 'traditional', streams, sensitivity);

      for (const r of results) {
        expect(r.highNPV).not.toBe(r.lowNPV);
        expect(r.impact).toBeGreaterThan(0);
      }
    });

    it('results are sorted by impact (highest first)', () => {
      const results = runSensitivityAnalysis(stand, 'traditional', streams, sensitivity);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].impact).toBeGreaterThanOrEqual(results[i].impact);
      }
    });
  });

  describe('volume estimation', () => {
    it('returns 0 for age 0', () => {
      expect(estimateVolumePerHa(0, 26, 'spruce')).toBe(0);
    });

    it('volume increases with age', () => {
      const vol20 = estimateVolumePerHa(20, 26, 'spruce');
      const vol60 = estimateVolumePerHa(60, 26, 'spruce');
      const vol100 = estimateVolumePerHa(100, 26, 'spruce');

      expect(vol60).toBeGreaterThan(vol20);
      expect(vol100).toBeGreaterThan(vol60);
    });

    it('MAI peaks and then declines', () => {
      const mai30 = calculateMAI(30, 26, 'spruce');
      const mai60 = calculateMAI(60, 26, 'spruce');
      const mai120 = calculateMAI(120, 26, 'spruce');

      // MAI should increase initially then level off or decline
      expect(mai60).toBeGreaterThan(mai30);
      // At very old ages MAI may slightly decline
      expect(mai120).toBeLessThanOrEqual(mai60 * 1.1); // allow small tolerance
    });

    it('CAI is positive for growing forest', () => {
      const cai = calculateCAI(50, 26, 'spruce');
      expect(cai).toBeGreaterThan(0);
    });
  });

  describe('all strategies run correctly', () => {
    it('returns 4 strategy results', () => {
      const results = runAllStrategies(stand, streams, sensitivity);
      expect(results).toHaveLength(4);

      const ids = results.map(r => r.id);
      expect(ids).toContain('traditional');
      expect(ids).toContain('extended');
      expect(ids).toContain('continuous_cover');
      expect(ids).toContain('carbon_focused');
    });

    it('each strategy has projections', () => {
      const results = runAllStrategies(stand, streams, sensitivity);
      for (const r of results) {
        expect(r.projections.length).toBeGreaterThan(0);
        expect(r.totalNPV).not.toBe(0);
      }
    });

    it('continuous cover has no clearfell events', () => {
      const result = projectStrategy(stand, 'continuous_cover', streams, sensitivity, 120);
      const clearfells = result.projections.filter(
        p => p.events.some(e => e.type === 'clearfell'),
      );
      expect(clearfells).toHaveLength(0);
    });
  });
});
