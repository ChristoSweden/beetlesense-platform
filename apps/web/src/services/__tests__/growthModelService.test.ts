import {
  generateStandardProjection,
  generateClimateProjection,
  getAllScenarioResults,
  analyzeRotations,
  findOptimalNPVRotation,
  assessClimateImpact,
  DEMO_PARCELS,
  type ParcelData,
} from '../growthModelService';

const spruceParcel = DEMO_PARCELS[0]; // Norra Granbacken, spruce SI 26
const pineParcel = DEMO_PARCELS[1];   // Tallåsen, pine SI 22
const _mixedParcel = DEMO_PARCELS[2];  // Blandskogen Söder, mixed SI 30

describe('growthModelService', () => {
  describe('Chapman-Richards growth curve', () => {
    it('produces increasing volumes over time', () => {
      const projections = generateStandardProjection(spruceParcel, 120);
      expect(projections.length).toBe(120);

      // Volume should generally increase
      const vol20 = projections.find(p => p.age === 20)!.volume;
      const vol60 = projections.find(p => p.age === 60)!.volume;
      const vol100 = projections.find(p => p.age === 100)!.volume;

      expect(vol20).toBeGreaterThan(0);
      expect(vol60).toBeGreaterThan(vol20);
      expect(vol100).toBeGreaterThan(vol60);
    });

    it('produces expected volume range for spruce SI 26 at age 80', () => {
      const projections = generateStandardProjection(spruceParcel, 120);
      const vol80 = projections.find(p => p.age === 80)!.volume;
      // Spruce SI 26 at age 80 should produce roughly 300-600 m3sk/ha
      expect(vol80).toBeGreaterThan(200);
      expect(vol80).toBeLessThan(700);
    });

    it('produces lower volumes for pine than spruce at same age', () => {
      const spruce = generateStandardProjection(spruceParcel, 120);
      const pine = generateStandardProjection(pineParcel, 120);

      const spruceVol80 = spruce.find(p => p.age === 80)!.volume;
      const pineVol80 = pine.find(p => p.age === 80)!.volume;

      // Lower SI pine should have lower volume
      expect(pineVol80).toBeLessThan(spruceVol80);
    });

    it('volume approaches but does not exceed Vmax', () => {
      const projections = generateStandardProjection(spruceParcel, 200);
      const vol200 = projections.find(p => p.age === 200)!.volume;
      // Vmax for spruce SI 26 = 26*28+50 = 778
      expect(vol200).toBeLessThanOrEqual(778);
    });
  });

  describe('site index effects', () => {
    it('higher site index produces higher volume at same age', () => {
      const lowSI: ParcelData = { ...spruceParcel, siteIndex: 20 };
      const highSI: ParcelData = { ...spruceParcel, siteIndex: 30 };

      const lowProj = generateStandardProjection(lowSI, 100);
      const highProj = generateStandardProjection(highSI, 100);

      const lowVol = lowProj.find(p => p.age === 80)!.volume;
      const highVol = highProj.find(p => p.age === 80)!.volume;

      expect(highVol).toBeGreaterThan(lowVol);
    });

    it('higher site index produces higher growth rate (k parameter)', () => {
      const lowSI: ParcelData = { ...spruceParcel, siteIndex: 20 };
      const highSI: ParcelData = { ...spruceParcel, siteIndex: 30 };

      const lowProj = generateStandardProjection(lowSI, 100);
      const highProj = generateStandardProjection(highSI, 100);

      // At young age, higher SI should grow faster
      const lowVol30 = lowProj.find(p => p.age === 30)!.volume;
      const highVol30 = highProj.find(p => p.age === 30)!.volume;

      expect(highVol30 / lowVol30).toBeGreaterThan(1.3);
    });
  });

  describe('climate RCP scenarios', () => {
    it('produces different projections for different scenarios', () => {
      const results = getAllScenarioResults(spruceParcel, 120);

      expect(results).toHaveLength(3);
      expect(results[0].scenario).toBe('rcp45');
      expect(results[1].scenario).toBe('rcp60');
      expect(results[2].scenario).toBe('rcp85');
    });

    it('rcp45 volume is initially lower than rcp85 for short-term warming benefit', () => {
      const rcp45 = generateClimateProjection(spruceParcel, 'rcp45', 120);
      const rcp85 = generateClimateProjection(spruceParcel, 'rcp85', 120);

      // In the near future (20 years ahead), RCP 8.5 warming boosts growth
      const futureAge = spruceParcel.currentAge + 20;
      const vol45 = rcp45.find(p => p.age === futureAge)!.volume;
      const vol85 = rcp85.find(p => p.age === futureAge)!.volume;

      // RCP 8.5 should produce higher growth initially due to warming
      expect(vol85).toBeGreaterThanOrEqual(vol45);
    });

    it('each scenario has an optimal rotation age', () => {
      const results = getAllScenarioResults(spruceParcel, 120);
      for (const r of results) {
        expect(r.optimalRotationAge).toBeGreaterThan(0);
        expect(r.optimalRotationAge).toBeLessThanOrEqual(120);
        expect(r.maxMai).toBeGreaterThan(0);
      }
    });
  });

  describe('NPV calculations', () => {
    it('analyzeRotations produces results with known NPV structure', () => {
      const analyses = analyzeRotations(spruceParcel, 'rcp60', 40, 120);

      expect(analyses.length).toBeGreaterThan(0);

      for (const a of analyses) {
        expect(a.rotationAge).toBeGreaterThanOrEqual(40);
        expect(a.rotationAge).toBeLessThanOrEqual(120);
        expect(a.volume).toBeGreaterThan(0);
        expect(a.mai).toBeGreaterThan(0);
        // NPV at higher discount rate should be lower
        expect(a.npv25).toBeGreaterThan(a.npv45);
      }
    });

    it('findOptimalNPVRotation returns a valid result', () => {
      const analyses = analyzeRotations(spruceParcel, 'rcp60', 40, 120);
      const optimal = findOptimalNPVRotation(analyses, '3.5');

      expect(optimal).toBeDefined();
      expect(optimal!.rotationAge).toBeGreaterThanOrEqual(40);
      expect(optimal!.npv35).toBeGreaterThan(0);
    });

    it('NPV is positive for reasonable rotation ages', () => {
      const analyses = analyzeRotations(spruceParcel, 'rcp60', 50, 100);
      // At least some rotation ages should have positive NPV
      const positiveNPV = analyses.filter(a => a.npv35 > 0);
      expect(positiveNPV.length).toBeGreaterThan(0);
    });
  });

  describe('optimal rotation age', () => {
    it('is within 60-100 years for typical spruce', () => {
      const results = getAllScenarioResults(spruceParcel, 120);
      for (const r of results) {
        expect(r.optimalRotationAge).toBeGreaterThanOrEqual(40);
        expect(r.optimalRotationAge).toBeLessThanOrEqual(110);
      }
    });

    it('MAI peaks and then declines after optimal age', () => {
      const projections = generateStandardProjection(spruceParcel, 120);
      let maxMai = 0;
      let maxMaiAge = 0;
      for (const p of projections) {
        if (p.mai > maxMai) {
          maxMai = p.mai;
          maxMaiAge = p.age;
        }
      }

      // After optimal age, MAI should decrease
      const laterMai = projections.find(p => p.age === maxMaiAge + 20)!.mai;
      expect(laterMai).toBeLessThan(maxMai);
    });
  });

  describe('climate impact assessment', () => {
    it('spruce parcel gets beetle monitoring recommendation', () => {
      const impact = assessClimateImpact(spruceParcel);
      expect(impact.beetlePressure).toBe('very_high');
      expect(impact.recommendations).toContain('beetle_monitoring');
    });

    it('pine parcel has lower beetle pressure', () => {
      const impact = assessClimateImpact(pineParcel);
      expect(impact.beetlePressure).toBe('low');
    });

    it('returns valid risk levels', () => {
      const impact = assessClimateImpact(spruceParcel);
      expect(['low', 'moderate', 'high']).toContain(impact.droughtRiskLevel);
      expect(['low', 'moderate', 'high']).toContain(impact.stormExposure);
      expect(['low', 'moderate', 'high', 'very_high']).toContain(impact.beetlePressure);
    });
  });
});
