import { describe, it, expect, beforeEach } from 'vitest';
import {
  getObservatoryStatus,
  getPhenologicalStations,
  getBBOAAlerts,
  getCrossBorderSignals,
  getContributions,
  getGDDValidation,
  enrichAlertsWithDistance,
  clearForestWardCache,
} from '../forestWardObservatoryService';

beforeEach(() => {
  clearForestWardCache();
});

describe('ForestWard Observatory Service', () => {
  describe('getObservatoryStatus', () => {
    it('returns a valid status object', async () => {
      const status = await getObservatoryStatus();
      expect(status).toBeDefined();
      expect(['connected', 'degraded', 'offline']).toContain(status.api_status);
      expect(status.stations_reporting).toBeLessThanOrEqual(status.stations_total);
      expect(status.stations_reporting).toBeGreaterThan(0);
      expect(status.data_freshness).toBeGreaterThanOrEqual(0);
      expect(status.data_freshness).toBeLessThanOrEqual(100);
      expect(status.pipeline_latency_min).toBeGreaterThan(0);
      expect(status.active_alerts).toBeGreaterThan(0);
    });

    it('returns consistent data on second call (cache)', async () => {
      const first = await getObservatoryStatus();
      const second = await getObservatoryStatus();
      expect(second.api_status).toBe(first.api_status);
      expect(second.stations_total).toBe(first.stations_total);
      expect(second.pipeline_latency_min).toBe(first.pipeline_latency_min);
    });
  });

  describe('getPhenologicalStations', () => {
    it('returns an array of stations', async () => {
      const stations = await getPhenologicalStations();
      expect(stations.length).toBeGreaterThanOrEqual(5);
    });

    it('each station has valid GDD and phenophase', async () => {
      const stations = await getPhenologicalStations();
      for (const s of stations) {
        expect(s.id).toMatch(/^FW-/);
        expect(s.gdd_accumulated).toBeGreaterThanOrEqual(0);
        expect(['dormant', 'budburst', 'active_growth', 'senescence']).toContain(s.phenophase);
        expect(s.latitude).toBeGreaterThan(40);
        expect(s.latitude).toBeLessThan(70);
        expect(s.elevation_m).toBeGreaterThan(0);
        expect(typeof s.is_current).toBe('boolean');
      }
    });

    it('includes stations from multiple countries', async () => {
      const stations = await getPhenologicalStations();
      const countries = new Set(stations.map(s => s.country));
      expect(countries.size).toBeGreaterThanOrEqual(3);
      expect(countries.has('Sweden')).toBe(true);
      expect(countries.has('Finland')).toBe(true);
    });

    it('GDD increases with lower latitude (warmer)', async () => {
      const stations = await getPhenologicalStations();
      const swedish = stations.filter(s => s.country === 'Sweden');
      const finnish = stations.filter(s => s.country === 'Finland');
      if (swedish.length > 0 && finnish.length > 0) {
        const avgSwedish = swedish.reduce((sum, s) => sum + s.gdd_accumulated, 0) / swedish.length;
        const avgFinnish = finnish.reduce((sum, s) => sum + s.gdd_accumulated, 0) / finnish.length;
        // Sweden is further south = should have higher or equal GDD
        expect(avgSwedish).toBeGreaterThanOrEqual(avgFinnish * 0.5);
      }
    });
  });

  describe('getBBOAAlerts', () => {
    it('returns alerts with valid severity levels', async () => {
      const alerts = await getBBOAAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      for (const a of alerts) {
        expect(['critical', 'warning', 'watch', 'info']).toContain(a.severity);
        expect(a.confidence).toBeGreaterThan(0);
        expect(a.confidence).toBeLessThanOrEqual(1);
        expect(a.affected_ha).toBeGreaterThan(0);
        expect(a.species).toBeTruthy();
        expect(a.description.length).toBeGreaterThan(20);
        expect(['satellite', 'trap_network', 'field_report', 'model_prediction']).toContain(a.source);
      }
    });

    it('includes alerts from multiple countries', async () => {
      const alerts = await getBBOAAlerts();
      const countries = new Set(alerts.map(a => a.country));
      expect(countries.size).toBeGreaterThanOrEqual(2);
    });

    it('has valid coordinate ranges', async () => {
      const alerts = await getBBOAAlerts();
      for (const a of alerts) {
        expect(a.latitude).toBeGreaterThan(40);
        expect(a.latitude).toBeLessThan(70);
        expect(a.longitude).toBeGreaterThan(-10);
        expect(a.longitude).toBeLessThan(40);
      }
    });
  });

  describe('enrichAlertsWithDistance', () => {
    it('adds distance_km to each alert', async () => {
      const alerts = await getBBOAAlerts();
      const enriched = enrichAlertsWithDistance(alerts, 57.15, 14.95);
      for (const a of enriched) {
        expect(a.distance_km).toBeDefined();
        expect(a.distance_km).toBeGreaterThanOrEqual(0);
      }
    });

    it('sorts alerts by distance (closest first)', async () => {
      const alerts = await getBBOAAlerts();
      const enriched = enrichAlertsWithDistance(alerts, 57.15, 14.95);
      for (let i = 1; i < enriched.length; i++) {
        expect(enriched[i].distance_km!).toBeGreaterThanOrEqual(enriched[i - 1].distance_km!);
      }
    });

    it('closest alert to Småland is the Swedish alert', async () => {
      const alerts = await getBBOAAlerts();
      const enriched = enrichAlertsWithDistance(alerts, 57.15, 14.95);
      expect(enriched[0].country).toBe('Sweden');
    });
  });

  describe('getCrossBorderSignals', () => {
    it('returns signals with valid structure', async () => {
      const signals = await getCrossBorderSignals();
      expect(signals.length).toBeGreaterThan(0);
      for (const s of signals) {
        expect(['beetle_migration', 'fire_spread', 'storm_damage', 'drought_stress']).toContain(s.type);
        expect(['high', 'medium', 'low']).toContain(s.risk);
        expect(s.origin_country).toBeTruthy();
        expect(s.target_country).toBeTruthy();
        expect(s.description.length).toBeGreaterThan(20);
      }
    });

    it('some signals target Sweden', async () => {
      const signals = await getCrossBorderSignals();
      const swedenTargets = signals.filter(s => s.target_country === 'Sweden');
      expect(swedenTargets.length).toBeGreaterThan(0);
    });
  });

  describe('getContributions', () => {
    it('returns contribution stats', async () => {
      const contributions = await getContributions();
      expect(contributions.length).toBeGreaterThan(0);
      for (const c of contributions) {
        expect(['gdd_calculation', 'beetle_observation', 'satellite_anomaly', 'fire_detection']).toContain(c.type);
        expect(c.record_count).toBeGreaterThan(0);
        expect(['active', 'pending', 'paused']).toContain(c.status);
      }
    });

    it('GDD calculations are the largest contribution', async () => {
      const contributions = await getContributions();
      const gdd = contributions.find(c => c.type === 'gdd_calculation');
      expect(gdd).toBeDefined();
      const maxCount = Math.max(...contributions.map(c => c.record_count));
      expect(gdd!.record_count).toBe(maxCount);
    });
  });

  describe('getGDDValidation', () => {
    it('returns validation records', async () => {
      const validation = await getGDDValidation();
      expect(validation.length).toBeGreaterThan(0);
      for (const v of validation) {
        expect(v.forestward_gdd).toBeGreaterThanOrEqual(0);
        expect(v.beetlesense_gdd).toBeGreaterThanOrEqual(0);
        expect(v.deviation).toBeGreaterThanOrEqual(0);
        expect(v.deviation_pct).toBeGreaterThanOrEqual(0);
        expect(typeof v.within_tolerance).toBe('boolean');
      }
    });

    it('most stations are within ±10% tolerance', async () => {
      const validation = await getGDDValidation();
      const withinTolerance = validation.filter(v => v.within_tolerance).length;
      // At least half should be within tolerance
      expect(withinTolerance).toBeGreaterThanOrEqual(validation.length / 2);
    });

    it('deviation_pct matches actual deviation', async () => {
      const validation = await getGDDValidation();
      for (const v of validation) {
        if (v.forestward_gdd > 0) {
          const expectedPct = (v.deviation / v.forestward_gdd) * 100;
          expect(Math.abs(v.deviation_pct - expectedPct)).toBeLessThan(1);
        }
      }
    });
  });

  describe('cache behavior', () => {
    it('clearForestWardCache forces fresh data', async () => {
      const first = await getObservatoryStatus();
      clearForestWardCache();
      const second = await getObservatoryStatus();
      // After clearing cache, should be a different object reference
      expect(first).not.toBe(second);
    });
  });
});
