import {
  classifyRisk,
  getWindAlertLevel,
  getStandRiskData,
  getOverallPropertyRisk,
  getStormHistory,
  getWindConditions,
  type RiskFactors,
} from '../stormRiskService';

describe('stormRiskService', () => {
  describe('risk score is 0-100', () => {
    it('all demo stands have scores in 0-100 range', () => {
      const stands = getStandRiskData();
      for (const stand of stands) {
        expect(stand.overallScore).toBeGreaterThanOrEqual(0);
        expect(stand.overallScore).toBeLessThanOrEqual(100);
      }
    });

    it('classifyRisk returns correct classifications', () => {
      expect(classifyRisk(0)).toBe('low');
      expect(classifyRisk(29)).toBe('low');
      expect(classifyRisk(30)).toBe('moderate');
      expect(classifyRisk(49)).toBe('moderate');
      expect(classifyRisk(50)).toBe('high');
      expect(classifyRisk(74)).toBe('high');
      expect(classifyRisk(75)).toBe('critical');
      expect(classifyRisk(100)).toBe('critical');
    });
  });

  describe('hilltop spruce scores higher than sheltered pine', () => {
    it('Stand A (hilltop spruce) has higher score than Stand B (sheltered pine)', () => {
      const stands = getStandRiskData();
      const standA = stands.find(s => s.standId === 'stand-a')!;
      const standB = stands.find(s => s.standId === 'stand-b')!;

      expect(standA.overallScore).toBeGreaterThan(standB.overallScore);
    });

    it('Stand A is classified as high or critical risk', () => {
      const stands = getStandRiskData();
      const standA = stands.find(s => s.standId === 'stand-a')!;

      expect(['high', 'critical']).toContain(standA.classification);
    });

    it('Stand B is classified as low risk', () => {
      const stands = getStandRiskData();
      const standB = stands.find(s => s.standId === 'stand-b')!;

      expect(standB.classification).toBe('low');
    });
  });

  describe('recently thinned stands score higher', () => {
    it('Stand A (recently thinned, factor 10) has high recentThinning', () => {
      const stands = getStandRiskData();
      const standA = stands.find(s => s.standId === 'stand-a')!;
      const standB = stands.find(s => s.standId === 'stand-b')!;

      expect(standA.factors.recentThinning).toBe(10);
      expect(standB.factors.recentThinning).toBe(1);
    });

    it('Stand C (edge thinned 2 years ago) has elevated thinning factor', () => {
      const stands = getStandRiskData();
      const standC = stands.find(s => s.standId === 'stand-c')!;

      expect(standC.factors.recentThinning).toBeGreaterThanOrEqual(7);
    });
  });

  describe('factor weights sum correctly', () => {
    it('weighted factor sum produces the overall score', () => {
      const stands = getStandRiskData();
      // Verify the score is computed from weighted factors
      for (const stand of stands) {
        const weights: Record<keyof RiskFactors, number> = {
          terrainExposure: 0.20,
          edgeEffect: 0.18,
          heightDiameterRatio: 0.18,
          soilAnchoring: 0.16,
          speciesVulnerability: 0.15,
          recentThinning: 0.13,
        };

        let computed = 0;
        for (const key of Object.keys(weights) as (keyof RiskFactors)[]) {
          computed += stand.factors[key] * weights[key] * 10;
        }
        computed = Math.round(Math.min(100, Math.max(0, computed)));

        expect(stand.overallScore).toBe(computed);
      }
    });

    it('weights sum to 1.0', () => {
      const weights = [0.20, 0.18, 0.18, 0.16, 0.15, 0.13];
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('wind alert levels', () => {
    it('classifies calm wind correctly', () => {
      expect(getWindAlertLevel(5)).toBe('calm');
    });

    it('classifies moderate wind correctly', () => {
      expect(getWindAlertLevel(10)).toBe('moderate');
    });

    it('classifies strong wind correctly', () => {
      expect(getWindAlertLevel(20)).toBe('strong');
    });

    it('classifies storm warning correctly', () => {
      expect(getWindAlertLevel(30)).toBe('storm_warning');
    });
  });

  describe('overall property risk', () => {
    it('returns max score from all stands', () => {
      const stands = getStandRiskData();
      const result = getOverallPropertyRisk(stands);
      const maxScore = Math.max(...stands.map(s => s.overallScore));

      expect(result.score).toBe(maxScore);
    });

    it('returns low for empty array', () => {
      const result = getOverallPropertyRisk([]);
      expect(result.score).toBe(0);
      expect(result.classification).toBe('low');
    });
  });

  describe('storm history', () => {
    it('returns historical storm events', () => {
      const history = getStormHistory();
      expect(history.length).toBeGreaterThan(0);

      // Gudrun should be there
      const gudrun = history.find(e => e.id === 'gudrun');
      expect(gudrun).toBeDefined();
      expect(gudrun!.year).toBe(2005);
      expect(gudrun!.damageMCubicMeters).toBe(75);
    });
  });

  describe('wind conditions', () => {
    it('returns 48-hour forecast', () => {
      const conditions = getWindConditions();
      expect(conditions.forecast48h).toHaveLength(48);
      expect(conditions.currentSpeed).toBeGreaterThan(0);
      expect(['calm', 'moderate', 'strong', 'storm_warning']).toContain(
        conditions.alertLevel,
      );
    });
  });
});
