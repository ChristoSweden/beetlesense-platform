import {
  HISTORICAL_PRICES,
  MILLS,
  estimateTransportCost,
  haversineDistance,
  calculateMillRevenue,
  getHarvestRecommendation,
  getPriceChange,
  getAssortment,
  type Assortment,
} from '../timberMarketService';

describe('timberMarketService', () => {
  describe('historical price data returns 12 months', () => {
    it('has exactly 12 months of data', () => {
      expect(HISTORICAL_PRICES).toHaveLength(12);
    });

    it('each month has prices for all assortments', () => {
      const assortmentIds: Assortment[] = [
        'gran_timmer', 'gran_massa', 'tall_timmer',
        'tall_massa', 'bjork_massa', 'lov_massa',
      ];

      for (const month of HISTORICAL_PRICES) {
        for (const id of assortmentIds) {
          expect(month.prices[id]).toBeGreaterThan(0);
        }
      }
    });

    it('prices are in a reasonable range (100-1000 kr/m3fub)', () => {
      for (const month of HISTORICAL_PRICES) {
        for (const [, price] of Object.entries(month.prices)) {
          expect(price).toBeGreaterThan(100);
          expect(price).toBeLessThan(1000);
        }
      }
    });

    it('months are ordered chronologically', () => {
      for (let i = 1; i < HISTORICAL_PRICES.length; i++) {
        expect(HISTORICAL_PRICES[i].month > HISTORICAL_PRICES[i - 1].month).toBe(true);
      }
    });
  });

  describe('transport cost increases with distance', () => {
    it('returns 0 for zero distance', () => {
      expect(estimateTransportCost(0)).toBe(0);
    });

    it('cost increases monotonically with distance', () => {
      const cost20 = estimateTransportCost(20);
      const cost50 = estimateTransportCost(50);
      const cost100 = estimateTransportCost(100);
      const cost200 = estimateTransportCost(200);

      expect(cost50).toBeGreaterThan(cost20);
      expect(cost100).toBeGreaterThan(cost50);
      expect(cost200).toBeGreaterThan(cost100);
    });

    it('has a base cost component', () => {
      const cost1 = estimateTransportCost(1);
      // Base cost is 45, plus small per-km
      expect(cost1).toBeGreaterThanOrEqual(45);
    });

    it('typical cost for 60km is reasonable (75-100 kr)', () => {
      const cost = estimateTransportCost(60);
      expect(cost).toBeGreaterThanOrEqual(70);
      expect(cost).toBeLessThanOrEqual(100);
    });
  });

  describe('revenue calculator produces positive numbers', () => {
    it('calculates positive gross revenue for typical volumes', () => {
      const volumes: Partial<Record<Assortment, number>> = {
        gran_timmer: 200,
        gran_massa: 150,
      };
      const mill = MILLS[0]; // Sodra Vaxjo
      const result = calculateMillRevenue(volumes, mill, 50);

      expect(result.grossRevenue).toBeGreaterThan(0);
      expect(result.netRevenue).toBeGreaterThan(0);
      expect(result.transportCost).toBeGreaterThan(0);
      expect(result.netRevenue).toBe(result.grossRevenue - result.transportCost);
    });

    it('breakdown sums to gross revenue', () => {
      const volumes: Partial<Record<Assortment, number>> = {
        gran_timmer: 100,
        tall_timmer: 50,
      };
      const mill = MILLS.find(m => m.id === 'vida-alvesta')!;
      const result = calculateMillRevenue(volumes, mill, 30);

      const breakdownSum = result.breakdown.reduce((s, b) => s + b.revenue, 0);
      expect(breakdownSum).toBe(result.grossRevenue);
    });

    it('returns empty breakdown for assortments not accepted by mill', () => {
      const volumes: Partial<Record<Assortment, number>> = {
        bjork_massa: 100, // SCA Tunadal only accepts sawlogs
      };
      const mill = MILLS.find(m => m.id === 'sca-sundsvall')!;
      const result = calculateMillRevenue(volumes, mill, 100);

      expect(result.grossRevenue).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it('net revenue decreases with distance', () => {
      const volumes: Partial<Record<Assortment, number>> = {
        gran_timmer: 200,
      };
      const mill = MILLS[0];

      const near = calculateMillRevenue(volumes, mill, 20);
      const far = calculateMillRevenue(volumes, mill, 200);

      expect(near.netRevenue).toBeGreaterThan(far.netRevenue);
    });
  });

  describe('harvest recommendation returns valid signals', () => {
    it('returns a valid signal', () => {
      const rec = getHarvestRecommendation();

      expect(['harvest', 'wait', 'poor']).toContain(rec.signal);
      expect(rec.reasonEn.length).toBeGreaterThan(0);
      expect(rec.reasonSv.length).toBeGreaterThan(0);
      expect(typeof rec.revenueDiffPercent).toBe('number');
    });
  });

  describe('haversine distance', () => {
    it('returns 0 for same point', () => {
      expect(haversineDistance(57.0, 15.0, 57.0, 15.0)).toBe(0);
    });

    it('Stockholm to Gothenburg is roughly 400 km', () => {
      const dist = haversineDistance(59.33, 18.07, 57.71, 11.97);
      expect(dist).toBeGreaterThan(350);
      expect(dist).toBeLessThan(500);
    });
  });

  describe('price changes', () => {
    it('detects price increases', () => {
      const assortment = getAssortment('gran_timmer');
      const change = getPriceChange(assortment);

      // Current 700, previous 672 — should be up
      expect(change.direction).toBe('up');
      expect(change.percent).toBeGreaterThan(0);
    });
  });

  describe('mills data', () => {
    it('has multiple mills with assortment prices', () => {
      expect(MILLS.length).toBeGreaterThan(3);

      for (const mill of MILLS) {
        expect(mill.id).toBeTruthy();
        expect(mill.name).toBeTruthy();
        expect(Object.keys(mill.assortments).length).toBeGreaterThan(0);
      }
    });
  });
});
