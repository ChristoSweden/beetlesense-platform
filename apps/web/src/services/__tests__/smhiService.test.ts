import {
  getWeatherInfo,
  sweref99tmToWgs84,
  computeHarvestWindows,
  computeSprayWindows,
  computeGrowingDegreeDays,
  computeStormAlerts,
  computeFrostDates,
  estimateSoilMoisture,
  computeMachineAccessibility,
  assessDroughtRisk,
  assessBeetleConditions,
  assessGroundFrost,
  getDemoWeatherData,
  type DailyForecast,
  type WeatherPoint,
} from '../smhiService';

// ─── Helper: build a daily forecast day ───
function makeDay(overrides: Partial<DailyForecast> = {}): DailyForecast {
  return {
    date: '2026-03-18',
    minTemp: 2,
    maxTemp: 10,
    weatherSymbol: 2,
    totalPrecipitation: 0,
    avgWindSpeed: 4,
    maxWindGust: 8,
    avgHumidity: 70,
    avgCloudCover: 3,
    avgPressure: 1013,
    ...overrides,
  };
}

function makeHourlyPoint(overrides: Partial<WeatherPoint> = {}): WeatherPoint {
  return {
    time: '2026-03-18T12:00:00Z',
    temperature: 8,
    windSpeed: 3,
    windDirection: 200,
    windGust: 6,
    precipitation: 0,
    humidity: 65,
    pressure: 1013,
    weatherSymbol: 2,
    cloudCover: 3,
    visibility: 30,
    thunderProbability: 0,
    ...overrides,
  };
}

describe('smhiService', () => {
  describe('getWeatherInfo (Wsymb2 mapping)', () => {
    it('returns clear-day for code 1', () => {
      const info = getWeatherInfo(1);
      expect(info.icon).toBe('clear-day');
      expect(info.descEn).toBe('Clear sky');
    });

    it('returns fog for code 7', () => {
      expect(getWeatherInfo(7).icon).toBe('fog');
    });

    it('returns heavy-rain for code 10', () => {
      expect(getWeatherInfo(10).icon).toBe('heavy-rain');
    });

    it('returns thunder for code 11', () => {
      expect(getWeatherInfo(11).icon).toBe('thunder');
    });

    it('returns snow for code 15', () => {
      expect(getWeatherInfo(15).icon).toBe('snow');
    });

    it('returns cloudy fallback for unknown code', () => {
      const info = getWeatherInfo(999);
      expect(info.icon).toBe('cloudy');
      expect(info.descEn).toBe('Unknown');
    });

    it('covers all codes 1-27', () => {
      for (let code = 1; code <= 27; code++) {
        const info = getWeatherInfo(code);
        expect(info.icon).toBeTruthy();
        expect(info.descEn.length).toBeGreaterThan(0);
        expect(info.descSv.length).toBeGreaterThan(0);
      }
    });
  });

  describe('sweref99tmToWgs84', () => {
    it('converts a known SWEREF99 TM coordinate near Stockholm', () => {
      const result = sweref99tmToWgs84(674032, 6580821);
      expect(result.lat).toBeGreaterThan(59.0);
      expect(result.lat).toBeLessThan(60.0);
      expect(result.lon).toBeGreaterThan(17.5);
      expect(result.lon).toBeLessThan(19.0);
    });

    it('converts a known point near Vaxjo', () => {
      const result = sweref99tmToWgs84(483000, 6310000);
      expect(result.lat).toBeGreaterThan(56.0);
      expect(result.lat).toBeLessThan(58.0);
      expect(result.lon).toBeGreaterThan(13.5);
      expect(result.lon).toBeLessThan(16.0);
    });

    it('returns at most 6 decimal places of precision', () => {
      const result = sweref99tmToWgs84(500000, 6500000);
      const latDecimals = result.lat.toString().split('.')[1]?.length ?? 0;
      const lonDecimals = result.lon.toString().split('.')[1]?.length ?? 0;
      expect(latDecimals).toBeLessThanOrEqual(6);
      expect(lonDecimals).toBeLessThanOrEqual(6);
    });
  });

  describe('computeHarvestWindows', () => {
    it('identifies a harvest window when days are dry and calm', () => {
      const daily = [
        makeDay({ date: '2026-03-18', totalPrecipitation: 0, avgWindSpeed: 3 }),
        makeDay({ date: '2026-03-19', totalPrecipitation: 0.2, avgWindSpeed: 4 }),
        makeDay({ date: '2026-03-20', totalPrecipitation: 0, avgWindSpeed: 2 }),
        makeDay({ date: '2026-03-21', totalPrecipitation: 5, avgWindSpeed: 10 }),
      ];

      const windows = computeHarvestWindows(daily);
      expect(windows.length).toBeGreaterThanOrEqual(1);
      expect(windows[0].days).toBe(3);
      expect(windows[0].startDate).toBe('2026-03-18');
      expect(windows[0].endDate).toBe('2026-03-20');
    });

    it('returns empty when all days are windy or rainy', () => {
      const daily = [
        makeDay({ totalPrecipitation: 10, avgWindSpeed: 12 }),
        makeDay({ totalPrecipitation: 8, avgWindSpeed: 15 }),
      ];
      expect(computeHarvestWindows(daily)).toHaveLength(0);
    });

    it('rates multi-day dry windows as excellent', () => {
      const daily = [
        makeDay({ date: '2026-03-18', totalPrecipitation: 0, avgWindSpeed: 3 }),
        makeDay({ date: '2026-03-19', totalPrecipitation: 0, avgWindSpeed: 4 }),
        makeDay({ date: '2026-03-20', totalPrecipitation: 0, avgWindSpeed: 3 }),
        makeDay({ date: '2026-03-21', totalPrecipitation: 10, avgWindSpeed: 12 }),
      ];

      const windows = computeHarvestWindows(daily);
      expect(windows.length).toBeGreaterThanOrEqual(1);
      expect(windows[0].quality).toBe('excellent');
    });

    it('includes both English and Swedish recommendations', () => {
      const daily = [
        makeDay({ date: '2026-03-18', totalPrecipitation: 0, avgWindSpeed: 3 }),
        makeDay({ date: '2026-03-19', totalPrecipitation: 0, avgWindSpeed: 4 }),
        makeDay({ date: '2026-03-20', totalPrecipitation: 0, avgWindSpeed: 3 }),
        makeDay({ date: '2026-03-21', totalPrecipitation: 10, avgWindSpeed: 12 }),
      ];

      const windows = computeHarvestWindows(daily);
      expect(windows[0].recommendation.length).toBeGreaterThan(0);
      expect(windows[0].recommendationSv.length).toBeGreaterThan(0);
    });
  });

  describe('computeSprayWindows', () => {
    it('finds a suitable spray window on a calm dry day', () => {
      const hourly: WeatherPoint[] = [];
      for (let h = 5; h <= 20; h++) {
        hourly.push(
          makeHourlyPoint({
            time: `2026-03-18T${h.toString().padStart(2, '0')}:00:00Z`,
            windSpeed: 2,
            precipitation: 0,
            temperature: 12,
          }),
        );
      }

      const windows = computeSprayWindows(hourly);
      expect(windows.length).toBeGreaterThanOrEqual(1);
      expect(windows[0].suitable).toBe(true);
    });

    it('marks day as unsuitable when wind is too strong', () => {
      const hourly: WeatherPoint[] = [];
      for (let h = 5; h <= 20; h++) {
        hourly.push(
          makeHourlyPoint({
            time: `2026-03-18T${h.toString().padStart(2, '0')}:00:00Z`,
            windSpeed: 8,
            precipitation: 0,
            temperature: 12,
          }),
        );
      }

      const windows = computeSprayWindows(hourly);
      expect(windows.length).toBeGreaterThanOrEqual(1);
      expect(windows[0].suitable).toBe(false);
    });
  });

  describe('computeGrowingDegreeDays', () => {
    it('returns 0 when all temps are below 5C', () => {
      const daily = [
        makeDay({ minTemp: -2, maxTemp: 3 }),
        makeDay({ minTemp: -5, maxTemp: 2 }),
      ];
      expect(computeGrowingDegreeDays(daily)).toBe(0);
    });

    it('accumulates degrees above 5C base temperature', () => {
      const daily = [
        makeDay({ minTemp: 5, maxTemp: 15 }),
        makeDay({ minTemp: 10, maxTemp: 20 }),
      ];
      expect(computeGrowingDegreeDays(daily)).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(computeGrowingDegreeDays([])).toBe(0);
    });
  });

  describe('computeStormAlerts', () => {
    it('returns no alerts for calm days', () => {
      const daily = [
        makeDay({ avgWindSpeed: 5, maxWindGust: 10 }),
        makeDay({ avgWindSpeed: 7, maxWindGust: 12 }),
      ];
      expect(computeStormAlerts(daily)).toHaveLength(0);
    });

    it('returns warning for gusts > 21 m/s', () => {
      const daily = [makeDay({ avgWindSpeed: 14, maxWindGust: 22 })];
      const alerts = computeStormAlerts(daily);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('returns severe for extreme gusts > 28 m/s', () => {
      const daily = [makeDay({ avgWindSpeed: 20, maxWindGust: 30 })];
      const alerts = computeStormAlerts(daily);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('severe');
    });

    it('alert includes Swedish description and stable ID', () => {
      const daily = [makeDay({ date: '2026-03-18', avgWindSpeed: 16, maxWindGust: 25 })];
      const alerts = computeStormAlerts(daily);
      expect(alerts[0].titleSv.length).toBeGreaterThan(0);
      expect(alerts[0].descriptionSv.length).toBeGreaterThan(0);
      expect(alerts[0].id).toBe('storm-2026-03-18');
    });
  });

  describe('computeFrostDates', () => {
    it('returns dates where minTemp < 0', () => {
      const daily = [
        makeDay({ date: '2026-03-18', minTemp: -2 }),
        makeDay({ date: '2026-03-19', minTemp: 3 }),
        makeDay({ date: '2026-03-20', minTemp: -0.5 }),
      ];
      expect(computeFrostDates(daily)).toEqual(['2026-03-18', '2026-03-20']);
    });

    it('returns empty for no frost days', () => {
      const daily = [makeDay({ minTemp: 5 }), makeDay({ minTemp: 8 })];
      expect(computeFrostDates(daily)).toHaveLength(0);
    });
  });

  describe('estimateSoilMoisture', () => {
    it('returns value between 0 and 100', () => {
      const daily = [makeDay(), makeDay(), makeDay()];
      const moisture = estimateSoilMoisture(daily);
      expect(moisture).toBeGreaterThanOrEqual(0);
      expect(moisture).toBeLessThanOrEqual(100);
    });

    it('increases with heavy precipitation', () => {
      const dryDays = [makeDay({ totalPrecipitation: 0, maxTemp: 20 })];
      const wetDays = [makeDay({ totalPrecipitation: 20, maxTemp: 10 })];
      expect(estimateSoilMoisture(wetDays)).toBeGreaterThan(estimateSoilMoisture(dryDays));
    });

    it('caps at 100', () => {
      const veryWet = Array.from({ length: 5 }, () =>
        makeDay({ totalPrecipitation: 50, maxTemp: 5, avgWindSpeed: 2 }),
      );
      expect(estimateSoilMoisture(veryWet)).toBeLessThanOrEqual(100);
    });
  });

  describe('computeMachineAccessibility', () => {
    it('returns high score when frozen ground', () => {
      const daily = [
        makeDay({ minTemp: -5, totalPrecipitation: 0 }),
        makeDay({ minTemp: -4, totalPrecipitation: 0 }),
      ];
      expect(computeMachineAccessibility(daily)).toBe(95);
    });

    it('returns low score when very wet', () => {
      const daily = Array.from({ length: 5 }, () =>
        makeDay({ totalPrecipitation: 20, maxTemp: 15, avgWindSpeed: 2 }),
      );
      expect(computeMachineAccessibility(daily)).toBeLessThanOrEqual(35);
    });
  });

  describe('assessDroughtRisk', () => {
    it('returns low when there is adequate precipitation', () => {
      const daily = Array.from({ length: 5 }, () =>
        makeDay({ totalPrecipitation: 5, maxTemp: 15 }),
      );
      expect(assessDroughtRisk(daily)).toBe('low');
    });

    it('returns high when dry and hot with low humidity', () => {
      const daily = Array.from({ length: 7 }, () =>
        makeDay({ totalPrecipitation: 0, maxTemp: 25, avgHumidity: 40 }),
      );
      expect(assessDroughtRisk(daily)).toBe('high');
    });

    it('returns medium for borderline conditions', () => {
      const daily = Array.from({ length: 5 }, () =>
        makeDay({ totalPrecipitation: 0.5, maxTemp: 20 }),
      );
      expect(assessDroughtRisk(daily)).toBe('medium');
    });
  });

  describe('assessBeetleConditions', () => {
    it('returns true when warm and dry (favorable for beetles)', () => {
      const current = makeHourlyPoint({ temperature: 22 });
      const daily = Array.from({ length: 3 }, () =>
        makeDay({ maxTemp: 22, totalPrecipitation: 0 }),
      );
      expect(assessBeetleConditions(current, daily)).toBe(true);
    });

    it('returns false when cold', () => {
      const current = makeHourlyPoint({ temperature: 5 });
      const daily = Array.from({ length: 3 }, () =>
        makeDay({ maxTemp: 10, totalPrecipitation: 0 }),
      );
      expect(assessBeetleConditions(current, daily)).toBe(false);
    });

    it('returns false when rainy', () => {
      const current = makeHourlyPoint({ temperature: 20, precipitation: 2, windSpeed: 8 });
      const daily = Array.from({ length: 3 }, () =>
        makeDay({ maxTemp: 22, totalPrecipitation: 5, avgWindSpeed: 8 }),
      );
      expect(assessBeetleConditions(current, daily)).toBe(false);
    });
  });

  describe('assessGroundFrost', () => {
    it('returns true when any of next 3 days has minTemp <= 0', () => {
      const daily = [
        makeDay({ minTemp: 5 }),
        makeDay({ minTemp: -1 }),
        makeDay({ minTemp: 3 }),
      ];
      expect(assessGroundFrost(daily)).toBe(true);
    });

    it('returns false when all days are above 0', () => {
      const daily = [
        makeDay({ minTemp: 3 }),
        makeDay({ minTemp: 5 }),
        makeDay({ minTemp: 8 }),
      ];
      expect(assessGroundFrost(daily)).toBe(false);
    });
  });

  describe('getDemoWeatherData', () => {
    it('returns a complete WeatherData structure', () => {
      const data = getDemoWeatherData();
      expect(data.current).toBeDefined();
      expect(data.current.temperature).toBeDefined();
      expect(data.hourly.length).toBeGreaterThan(0);
      expect(data.daily.length).toBeGreaterThan(0);
      expect(data.daily.length).toBeLessThanOrEqual(10);
      expect(data.approvedTime).toBeTruthy();
      expect(data.fetchedAt).toBeTruthy();
    });

    it('hourly data has 240 points (10 days x 24 hours)', () => {
      const data = getDemoWeatherData();
      expect(data.hourly).toHaveLength(240);
    });

    it('temperatures are in a realistic Swedish March range', () => {
      const data = getDemoWeatherData();
      for (const day of data.daily) {
        expect(day.minTemp).toBeGreaterThan(-15);
        expect(day.maxTemp).toBeLessThan(25);
        expect(day.maxTemp).toBeGreaterThanOrEqual(day.minTemp);
      }
    });
  });
});
