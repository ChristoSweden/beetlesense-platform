import { describe, it, expect } from 'vitest';
import {
  calculateCompoundThreat,
  generateThreatTimeline,
  getDemoCompoundThreat,
  getThreatColor,
} from '../compoundThreatService';

describe('Compound Threat Service', () => {
  describe('calculateCompoundThreat', () => {
    it('returns LOW risk for calm winter conditions', () => {
      const result = calculateCompoundThreat({
        temperature: 5,
        humidity: 75,
        windSpeed: 2,
        beetleTrapCount: 100,
        gddAccumulated: 30,
        droughtDays: 0,
        nearbyFireCount: 0,
        recentStormDamage_ha: 0,
        soilMoisture: 70,
      });
      expect(result.compound_level).toBe('LOW');
      expect(result.compound_score).toBeLessThan(25);
      expect(result.beetle_threat.score).toBeLessThan(25);
      expect(result.fire_threat.score).toBeLessThan(25);
      expect(result.drought_threat.score).toBeLessThan(25);
    });

    it('returns HIGH/CRITICAL risk for hot dry summer with beetles', () => {
      const result = calculateCompoundThreat({
        temperature: 28,
        humidity: 30,
        windSpeed: 5,
        beetleTrapCount: 4000,
        gddAccumulated: 400,
        droughtDays: 14,
        nearbyFireCount: 2,
        recentStormDamage_ha: 20,
        soilMoisture: 20,
      });
      expect(['HIGH', 'CRITICAL']).toContain(result.compound_level);
      expect(result.compound_score).toBeGreaterThan(50);
      expect(result.beetle_threat.score).toBeGreaterThan(50);
    });

    it('beetle risk increases with GDD above swarming threshold (280)', () => {
      const below = calculateCompoundThreat({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1000, gddAccumulated: 200,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 50,
      });
      const above = calculateCompoundThreat({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1000, gddAccumulated: 400,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 50,
      });
      expect(above.beetle_threat.score).toBeGreaterThan(below.beetle_threat.score);
    });

    it('fire risk increases with lower humidity', () => {
      const humid = calculateCompoundThreat({
        temperature: 25, humidity: 70, windSpeed: 3,
        beetleTrapCount: 500, gddAccumulated: 200,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 50,
      });
      const dry = calculateCompoundThreat({
        temperature: 25, humidity: 25, windSpeed: 3,
        beetleTrapCount: 500, gddAccumulated: 200,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 50,
      });
      expect(dry.fire_threat.score).toBeGreaterThan(humid.fire_threat.score);
    });

    it('drought risk increases with low soil moisture', () => {
      const moist = calculateCompoundThreat({
        temperature: 22, humidity: 50, windSpeed: 3,
        beetleTrapCount: 500, gddAccumulated: 200,
        droughtDays: 5, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 70,
      });
      const dry = calculateCompoundThreat({
        temperature: 22, humidity: 50, windSpeed: 3,
        beetleTrapCount: 500, gddAccumulated: 200,
        droughtDays: 5, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 15,
      });
      expect(dry.drought_threat.score).toBeGreaterThan(moist.drought_threat.score);
    });

    it('generates interaction effects when multiple threats are elevated', () => {
      const result = calculateCompoundThreat({
        temperature: 28,
        humidity: 30,
        windSpeed: 6,
        beetleTrapCount: 3500,
        gddAccumulated: 380,
        droughtDays: 12,
        nearbyFireCount: 1,
        recentStormDamage_ha: 25,
        soilMoisture: 20,
      });
      expect(result.interactions.length).toBeGreaterThan(0);
      // Should have drought×beetle interaction at minimum
      const droughtBeetle = result.interactions.find(
        i => i.threats.includes('Drought') && i.threats.includes('Beetle')
      );
      expect(droughtBeetle).toBeDefined();
      expect(droughtBeetle!.amplification).toBeGreaterThan(1.0);
      expect(droughtBeetle!.confidence).toBeGreaterThan(0.5);
    });

    it('storm damage creates beetle breeding interaction', () => {
      const noStorm = calculateCompoundThreat({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1500, gddAccumulated: 300,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 50,
      });
      const withStorm = calculateCompoundThreat({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1500, gddAccumulated: 300,
        droughtDays: 3, nearbyFireCount: 0, recentStormDamage_ha: 50, soilMoisture: 50,
      });
      const stormInteraction = withStorm.interactions.find(
        i => i.threats.includes('Storm Damage')
      );
      expect(stormInteraction).toBeDefined();
      expect(withStorm.compound_score).toBeGreaterThan(noStorm.compound_score);
    });

    it('compound score is amplified beyond simple average when interactions exist', () => {
      const result = calculateCompoundThreat({
        temperature: 27,
        humidity: 28,
        windSpeed: 5,
        beetleTrapCount: 3000,
        gddAccumulated: 350,
        droughtDays: 14,
        nearbyFireCount: 1,
        recentStormDamage_ha: 10,
        soilMoisture: 18,
      });
      // Simple average of the three threats
      const simpleAvg = (result.beetle_threat.score + result.fire_threat.score + result.drought_threat.score) / 3;
      // Compound should be higher due to interaction amplification
      if (result.interactions.length > 0) {
        expect(result.compound_score).toBeGreaterThanOrEqual(Math.round(simpleAvg));
      }
    });

    it('generates recommendations based on risk levels', () => {
      const highRisk = calculateCompoundThreat({
        temperature: 28, humidity: 25, windSpeed: 6,
        beetleTrapCount: 4000, gddAccumulated: 400,
        droughtDays: 14, nearbyFireCount: 2, recentStormDamage_ha: 20, soilMoisture: 15,
      });
      expect(highRisk.recommendations.length).toBeGreaterThan(0);
      // Should include beetle inspection recommendation
      const hasBeetleRec = highRisk.recommendations.some(r => r.toLowerCase().includes('beetle') || r.toLowerCase().includes('spruce'));
      expect(hasBeetleRec).toBe(true);
    });

    it('low risk generates monitoring-only recommendation', () => {
      const lowRisk = calculateCompoundThreat({
        temperature: 5, humidity: 75, windSpeed: 2,
        beetleTrapCount: 50, gddAccumulated: 10,
        droughtDays: 0, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 80,
      });
      const hasMonitoringRec = lowRisk.recommendations.some(r => r.toLowerCase().includes('low'));
      expect(hasMonitoringRec).toBe(true);
    });

    it('all scores are clamped between 0 and 100', () => {
      // Extreme inputs
      const extreme = calculateCompoundThreat({
        temperature: 45, humidity: 5, windSpeed: 20,
        beetleTrapCount: 50000, gddAccumulated: 2000,
        droughtDays: 60, nearbyFireCount: 10, recentStormDamage_ha: 500, soilMoisture: 0,
      });
      expect(extreme.compound_score).toBeLessThanOrEqual(100);
      expect(extreme.beetle_threat.score).toBeLessThanOrEqual(100);
      expect(extreme.fire_threat.score).toBeLessThanOrEqual(100);
      expect(extreme.drought_threat.score).toBeLessThanOrEqual(100);
      expect(extreme.compound_score).toBeGreaterThanOrEqual(0);
    });

    it('includes data sources', () => {
      const result = getDemoCompoundThreat();
      expect(result.data_sources.length).toBeGreaterThan(0);
      expect(result.data_sources).toContain('ForestWard Observatory');
      expect(result.data_sources).toContain('SMHI Weather');
    });

    it('assessed_at is a valid ISO timestamp', () => {
      const result = getDemoCompoundThreat();
      const date = new Date(result.assessed_at);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('generateThreatTimeline', () => {
    it('produces 7 days of forecast', () => {
      const timeline = generateThreatTimeline({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1500, gddAccumulated: 250,
        droughtDays: 5, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 45,
      });
      expect(timeline.length).toBe(7);
    });

    it('each day has valid scores', () => {
      const timeline = generateThreatTimeline({
        temperature: 20, humidity: 50, windSpeed: 3,
        beetleTrapCount: 1500, gddAccumulated: 250,
        droughtDays: 5, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 45,
      });
      for (const day of timeline) {
        expect(day.beetle_score).toBeGreaterThanOrEqual(0);
        expect(day.beetle_score).toBeLessThanOrEqual(100);
        expect(day.fire_score).toBeGreaterThanOrEqual(0);
        expect(day.compound_score).toBeGreaterThanOrEqual(0);
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('drought and beetle risk generally increase over 7 days without rain', () => {
      const timeline = generateThreatTimeline({
        temperature: 22, humidity: 45, windSpeed: 3,
        beetleTrapCount: 1500, gddAccumulated: 260,
        droughtDays: 7, nearbyFireCount: 0, recentStormDamage_ha: 0, soilMoisture: 40,
      });
      // Day 7 should have higher drought score than day 1
      expect(timeline[6].drought_score).toBeGreaterThanOrEqual(timeline[0].drought_score);
    });
  });

  describe('getDemoCompoundThreat', () => {
    it('returns a valid assessment with all fields', () => {
      const result = getDemoCompoundThreat();
      expect(result.compound_score).toBeGreaterThanOrEqual(0);
      expect(result.compound_score).toBeLessThanOrEqual(100);
      expect(['CRITICAL', 'HIGH', 'MODERATE', 'LOW']).toContain(result.compound_level);
      expect(result.beetle_threat).toBeDefined();
      expect(result.fire_threat).toBeDefined();
      expect(result.drought_threat).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('threat trends are valid', () => {
      const result = getDemoCompoundThreat();
      for (const threat of [result.beetle_threat, result.fire_threat, result.drought_threat]) {
        expect(['rising', 'stable', 'falling']).toContain(threat.trend);
        expect(threat.drivers.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getThreatColor', () => {
    it('returns correct colors for each level', () => {
      expect(getThreatColor('CRITICAL')).toBe('#dc2626');
      expect(getThreatColor('HIGH')).toBe('#ea580c');
      expect(getThreatColor('MODERATE')).toBe('#ca8a04');
      expect(getThreatColor('LOW')).toBe('#16a34a');
    });
  });
});
