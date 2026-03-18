import {
  runScenario,
  getScenarioPreview,
  DEFAULT_PARCEL_INPUT,
  type ParcelInput,
} from '../scenarioEngine';

const input = DEFAULT_PARCEL_INPUT;

describe('scenarioEngine', () => {
  describe('baseline projection grows over time', () => {
    it('volume increases each year in do-nothing scenario', () => {
      const result = runScenario('do_nothing_5y', input);
      const baseline = result.baseline;

      expect(baseline.length).toBe(6); // years 0-5

      for (let i = 1; i < baseline.length; i++) {
        expect(baseline[i].volume).toBeGreaterThan(baseline[i - 1].volume);
      }
    });

    it('timber value increases with volume growth', () => {
      const result = runScenario('do_nothing_5y', input);

      expect(result.baseline[5].timberValue).toBeGreaterThan(
        result.baseline[0].timberValue,
      );
    });

    it('carbon sequestration is positive', () => {
      const result = runScenario('do_nothing_5y', input);

      for (const p of result.baseline) {
        expect(p.carbonSeq).toBeGreaterThan(0);
      }
    });

    it('baseline and action are identical for do_nothing', () => {
      const result = runScenario('do_nothing_5y', input);

      for (let i = 0; i < result.baseline.length; i++) {
        expect(result.baseline[i].volume).toBe(result.action[i].volume);
      }
    });
  });

  describe('beetle scenario reduces volume', () => {
    it('beetle_unchecked has lower volume than baseline at year 5', () => {
      const result = runScenario('beetle_unchecked', input);

      const baselineVol5 = result.baseline[5].volume;
      const actionVol5 = result.action[5].volume;

      expect(actionVol5).toBeLessThan(baselineVol5);
    });

    it('beetle scenario degrades health significantly', () => {
      const result = runScenario('beetle_unchecked', input);

      expect(result.action[5].health).toBeLessThan(result.action[0].health);
      // Health should drop significantly
      expect(result.action[0].health - result.action[5].health).toBeGreaterThan(20);
    });

    it('beetle risk escalates over time', () => {
      const result = runScenario('beetle_unchecked', input);

      expect(result.action[5].beetleRisk).toBeGreaterThan(result.action[0].beetleRisk);
    });

    it('timber value drops due to beetle damage', () => {
      const result = runScenario('beetle_unchecked', input);

      // Beetle damage reduces effective price, so value should drop or grow slower
      const baselineGain = result.baseline[5].timberValue - result.baseline[0].timberValue;
      const actionGain = result.action[5].timberValue - result.action[0].timberValue;

      expect(actionGain).toBeLessThan(baselineGain);
    });
  });

  describe('thinning reduces then increases volume', () => {
    it('thinning starts with lower volume (30% removal)', () => {
      const result = runScenario('thin_30_spruce', input);

      // Year 0 of action should have ~70% of baseline volume
      const expectedVolume = Math.round(input.volumeM3sk * 0.70);
      expect(result.action[0].volume).toBe(expectedVolume);
    });

    it('thinned volume recovers over 5 years', () => {
      const result = runScenario('thin_30_spruce', input);

      // Volume should increase from the thinned starting point
      expect(result.action[5].volume).toBeGreaterThan(result.action[0].volume);
    });

    it('thinning improves health', () => {
      const result = runScenario('thin_30_spruce', input);

      expect(result.action[5].health).toBeGreaterThan(result.baseline[5].health);
    });

    it('thinning reduces beetle risk', () => {
      const result = runScenario('thin_30_spruce', input);

      expect(result.action[5].beetleRisk).toBeLessThan(result.baseline[5].beetleRisk);
    });

    it('thinning improves biodiversity', () => {
      const result = runScenario('thin_30_spruce', input);

      expect(result.action[5].biodiversity).toBeGreaterThan(
        result.baseline[5].biodiversity,
      );
    });
  });

  describe('climate scenario differs from baseline', () => {
    it('climate_2c produces different results than baseline', () => {
      const result = runScenario('climate_2c', input);

      // At year 5, climate action should differ from baseline
      expect(result.action[5].health).not.toBe(result.baseline[5].health);
    });

    it('climate warming increases beetle risk', () => {
      const result = runScenario('climate_2c', input);

      expect(result.action[5].beetleRisk).toBeGreaterThan(
        result.baseline[5].beetleRisk,
      );
    });

    it('climate scenario starts with slight growth boost then declines', () => {
      const result = runScenario('climate_2c', input);

      // Year 1 volume growth should be slightly boosted (warming benefit initially)
      const baselineGrowth1 = result.baseline[1].volume - result.baseline[0].volume;
      const actionGrowth1 = result.action[1].volume - result.action[0].volume;

      // Initially climate warming helps
      expect(actionGrowth1).toBeGreaterThanOrEqual(baselineGrowth1);
    });

    it('health degrades faster under climate stress', () => {
      const result = runScenario('climate_2c', input);

      const baselineHealthDrop = result.baseline[0].health - result.baseline[5].health;
      const actionHealthDrop = result.action[0].health - result.action[5].health;

      expect(actionHealthDrop).toBeGreaterThan(baselineHealthDrop);
    });
  });

  describe('mixed species scenario', () => {
    it('starts with reduced volume after harvest/replant', () => {
      const result = runScenario('mixed_species', input);

      expect(result.action[0].volume).toBeLessThan(input.volumeM3sk);
    });

    it('biodiversity improves significantly', () => {
      const result = runScenario('mixed_species', input);

      expect(result.action[5].biodiversity).toBeGreaterThan(
        result.baseline[5].biodiversity,
      );
    });

    it('beetle risk is very low', () => {
      const result = runScenario('mixed_species', input);

      expect(result.action[5].beetleRisk).toBeLessThan(20);
    });
  });

  describe('custom scenario', () => {
    it('runs with custom parameters', () => {
      const result = runScenario('custom', input, {
        thinningPercent: 25,
        targetSpecies: 'mixed',
        yearsToProject: 10,
        climateWarmingC: 1.5,
        beetleIntervention: true,
      });

      expect(result.action.length).toBe(11); // years 0-10
      expect(result.baseline.length).toBe(11);
    });
  });

  describe('scenario previews', () => {
    it('returns directional indicators for each scenario', () => {
      const preview = getScenarioPreview('beetle_unchecked');
      expect(preview.health).toBeTruthy();
      expect(preview.value).toBeTruthy();
      expect(preview.risk).toBeTruthy();
    });
  });

  describe('confidence bands', () => {
    it('confidence bands widen over time', () => {
      const result = runScenario('do_nothing_5y', input);

      const firstYear = result.baseline[0];
      const lastYear = result.baseline[5];

      const firstSpread = firstYear.confidenceHigh - firstYear.confidenceLow;
      const lastSpread = lastYear.confidenceHigh - lastYear.confidenceLow;

      expect(lastSpread).toBeGreaterThan(firstSpread);
    });
  });

  describe('edge cases', () => {
    it('handles parcel with zero beetle risk', () => {
      const safeInput: ParcelInput = { ...input, beetleRisk: 0 };
      const result = runScenario('do_nothing_5y', safeInput);

      expect(result.baseline[0].beetleRisk).toBe(0);
    });

    it('handles fully broadleaf parcel', () => {
      const broadleafInput: ParcelInput = {
        ...input,
        spruceFraction: 0,
        pineFraction: 0,
        broadleafFraction: 1.0,
      };
      const result = runScenario('do_nothing_5y', broadleafInput);

      expect(result.baseline.length).toBe(6);
      expect(result.baseline[0].volume).toBe(input.volumeM3sk);
    });
  });
});
