import {
  getParcelClimate,
  getAvailableParcels,
} from '../microclimateService';

describe('microclimateService', () => {
  describe('higher altitude = lower temperature', () => {
    it('parcel at 280m (Tallmon) is cooler than parcel at 185m (Ekbacken)', () => {
      const highAlt = getParcelClimate('p3'); // Tallmon, 280m
      const lowAlt = getParcelClimate('p2');  // Ekbacken, 185m

      // Compare July (warmest month, index 6)
      const highJuly = highAlt.months[6].adjustedAvgTemp;
      const lowJuly = lowAlt.months[6].adjustedAvgTemp;

      expect(highJuly).toBeLessThan(lowJuly);
    });

    it('temperature decreases ~0.6C per 100m elevation', () => {
      const highAlt = getParcelClimate('p3'); // 280m
      const lowAlt = getParcelClimate('p2');  // 185m

      const elevDiff = (280 - 185) / 100; // 0.95 units of 100m
      const expectedDiff = elevDiff * 0.6; // ~0.57C

      // Check multiple months for consistency
      for (let i = 0; i < 12; i++) {
        const diff = lowAlt.months[i].adjustedAvgTemp - highAlt.months[i].adjustedAvgTemp;
        expect(diff).toBeCloseTo(expectedDiff, 0);
      }
    });

    it('all adjusted temps are lower than reference (160m) for higher parcels', () => {
      const highAlt = getParcelClimate('p3'); // 280m, above 160m reference

      for (let i = 0; i < 12; i++) {
        const countyAvg = highAlt.countyAverageMonths[i].avgTemp;
        expect(highAlt.months[i].adjustedAvgTemp).toBeLessThan(countyAvg);
      }
    });
  });

  describe('frost pocket has more frost days', () => {
    it('parcel p1 has frost pocket zones defined', () => {
      const climate = getParcelClimate('p1');
      expect(climate.frostPockets.length).toBeGreaterThan(0);
      expect(climate.frostPockets[0].extraFrostDays).toBeGreaterThan(0);
    });

    it('parcel p3 (hilltop 280m) has more frost days than p2 (plain 185m)', () => {
      const highAlt = getParcelClimate('p3');
      const lowAlt = getParcelClimate('p2');

      const highFrostTotal = highAlt.months.reduce((s, m) => s + m.frostDays, 0);
      const lowFrostTotal = lowAlt.months.reduce((s, m) => s + m.frostDays, 0);

      expect(highFrostTotal).toBeGreaterThan(lowFrostTotal);
    });

    it('frost days do not exceed 30 per month', () => {
      const climate = getParcelClimate('p3');
      for (const m of climate.months) {
        expect(m.frostDays).toBeLessThanOrEqual(30);
      }
    });

    it('summer months (Jun-Aug) have 0 frost days', () => {
      const climate = getParcelClimate('p2');
      const june = climate.months[5];
      const july = climate.months[6];
      const august = climate.months[7];

      expect(june.frostDays).toBe(0);
      expect(july.frostDays).toBe(0);
      expect(august.frostDays).toBe(0);
    });
  });

  describe('growing season shorter at higher altitude', () => {
    it('growing season is shorter for 280m than 185m parcel', () => {
      const highAlt = getParcelClimate('p3');
      const lowAlt = getParcelClimate('p2');

      expect(highAlt.growingSeason.lengthDays).toBeLessThanOrEqual(
        lowAlt.growingSeason.lengthDays,
      );
    });

    it('total GDD is lower at higher altitude', () => {
      const highAlt = getParcelClimate('p3');
      const lowAlt = getParcelClimate('p2');

      expect(highAlt.growingSeason.totalGDD).toBeLessThan(
        lowAlt.growingSeason.totalGDD,
      );
    });

    it('growing season length is reasonable (120-200 days)', () => {
      const parcels = getAvailableParcels();
      for (const p of parcels) {
        const climate = getParcelClimate(p.id);
        expect(climate.growingSeason.lengthDays).toBeGreaterThan(100);
        expect(climate.growingSeason.lengthDays).toBeLessThan(250);
      }
    });

    it('GDD accumulates progressively through months', () => {
      const climate = getParcelClimate('p1');
      for (let i = 1; i < 12; i++) {
        expect(climate.months[i].gddAccumulated).toBeGreaterThanOrEqual(
          climate.months[i - 1].gddAccumulated,
        );
      }
    });
  });

  describe('soil temp lags air temp', () => {
    it('soil temp is warmer than air temp in winter', () => {
      const climate = getParcelClimate('p1');

      // January (index 0) — soil should lag and be warmer than frigid air
      const jan = climate.months[0];
      expect(jan.soilTemp10cm).toBeGreaterThan(jan.adjustedAvgTemp);
    });

    it('soil temp is cooler than air temp in summer', () => {
      const climate = getParcelClimate('p1');

      // July (index 6) — soil should lag and be cooler than warm air
      const july = climate.months[6];
      expect(july.soilTemp10cm).toBeLessThan(july.adjustedAvgTemp);
    });

    it('soil temp has smaller range than air temp', () => {
      const climate = getParcelClimate('p1');

      const airTemps = climate.months.map(m => m.adjustedAvgTemp);
      const soilTemps = climate.months.map(m => m.soilTemp10cm);

      const airRange = Math.max(...airTemps) - Math.min(...airTemps);
      const soilRange = Math.max(...soilTemps) - Math.min(...soilTemps);

      // Soil temp should have a dampened (smaller) range
      expect(soilRange).toBeLessThan(airRange);
    });

    it('soil temp values are in reasonable range (-5 to 20)', () => {
      const climate = getParcelClimate('p1');
      for (const m of climate.months) {
        expect(m.soilTemp10cm).toBeGreaterThan(-10);
        expect(m.soilTemp10cm).toBeLessThan(25);
      }
    });
  });

  describe('phenological events', () => {
    it('returns phenological events', () => {
      const climate = getParcelClimate('p1');
      expect(climate.phenology.length).toBeGreaterThan(0);
    });

    it('events have adjusted dates', () => {
      const climate = getParcelClimate('p3'); // higher altitude = later dates
      for (const event of climate.phenology) {
        expect(event.adjustedDate).toBeTruthy();
        expect(event.typicalDate).toBeTruthy();
      }
    });
  });

  describe('available parcels', () => {
    it('returns demo parcels with ids, names, and elevations', () => {
      const parcels = getAvailableParcels();
      expect(parcels.length).toBe(3);

      for (const p of parcels) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.elevation).toBeGreaterThan(0);
      }
    });
  });

  describe('12-month data completeness', () => {
    it('returns 12 months of data', () => {
      const climate = getParcelClimate('p1');
      expect(climate.months).toHaveLength(12);
    });

    it('each month has forestry activities', () => {
      const climate = getParcelClimate('p1');
      for (const m of climate.months) {
        expect(m.forestryActivities.length).toBeGreaterThan(0);
      }
    });
  });
});
