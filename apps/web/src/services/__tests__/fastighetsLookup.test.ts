import {
  parseFastighetsId,
  isValidFastighetsId,
  lookupFastighet,
  loadParcelWithProgress,
  type LoadingStep,
} from '../fastighetsLookup';

// Mock the Lantmateriet cadastral service so tests don't make real network calls
vi.mock('../opendata/lantmaterietCadastralService', () => ({
  queryPropertyAtPoint: vi.fn().mockRejectedValue(new Error('mocked: no network in tests')),
}));

describe('fastighetsLookup', () => {
  describe('parseFastighetsId', () => {
    it('parses full format "County Municipality Block:Unit"', () => {
      const result = parseFastighetsId('Kronoberg Vaxjo 1:23');
      expect(result).toEqual({
        county: 'Kronoberg',
        municipality: 'Vaxjo',
        block: '1',
        unit: '23',
      });
    });

    it('parses short format "Municipality Block:Unit"', () => {
      const result = parseFastighetsId('Vaxjo 1:23');
      expect(result).toEqual({
        county: undefined,
        municipality: 'Vaxjo',
        block: '1',
        unit: '23',
      });
    });

    it('is case-insensitive', () => {
      const result = parseFastighetsId('KRONOBERG VAXJO 1:23');
      expect(result).not.toBeNull();
      expect(result!.county).toBe('KRONOBERG');
      expect(result!.municipality).toBe('VAXJO');
    });

    it('trims whitespace', () => {
      const result = parseFastighetsId('  Vaxjo 1:23  ');
      expect(result).not.toBeNull();
      expect(result!.municipality).toBe('Vaxjo');
    });

    it('returns null for empty string', () => {
      expect(parseFastighetsId('')).toBeNull();
    });

    it('returns null for malformed input (no colon)', () => {
      expect(parseFastighetsId('Vaxjo 123')).toBeNull();
    });

    it('returns null for missing block:unit', () => {
      expect(parseFastighetsId('Kronoberg Vaxjo')).toBeNull();
    });

    it('returns null for just a colon', () => {
      expect(parseFastighetsId(':')).toBeNull();
    });

    it('returns null for non-numeric block/unit', () => {
      expect(parseFastighetsId('Vaxjo abc:def')).toBeNull();
    });

    it('parses multi-digit block and unit', () => {
      const result = parseFastighetsId('Varnamo 123:456');
      expect(result).toEqual({
        county: undefined,
        municipality: 'Varnamo',
        block: '123',
        unit: '456',
      });
    });
  });

  describe('isValidFastighetsId', () => {
    it('returns true for valid full format', () => {
      expect(isValidFastighetsId('Kronoberg Vaxjo 1:23')).toBe(true);
    });

    it('returns true for valid short format', () => {
      expect(isValidFastighetsId('Vaxjo 1:23')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidFastighetsId('')).toBe(false);
    });

    it('returns false for malformed input', () => {
      expect(isValidFastighetsId('not a real id')).toBe(false);
    });
  });

  describe('lookupFastighet', () => {
    it('throws on invalid fastighets-ID', async () => {
      await expect(lookupFastighet('invalid')).rejects.toThrow(
        'Invalid fastighets-ID format',
      );
    });

    it('returns default demo data for a valid ID', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      expect(result).toBeDefined();
      expect(result.lookup).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.lookup.fastighetId).toBe('Kronoberg Vaxjo 1:23');
    });

    it('returns healthy analysis for default parcel', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      expect(result.analysis.ndviStatus).toBe('healthy');
      expect(result.analysis.riskLevel).toBe('low');
      expect(result.analysis.ndvi).toBeGreaterThan(0.5);
    });

    it('returns at-risk data when ID contains "varnamo"', async () => {
      const result = await lookupFastighet('Jonkoping Varnamo 5:12');
      expect(result.analysis.riskLevel).toBe('high');
      expect(result.analysis.ndviStatus).toBe('stressed');
      expect(result.analysis.ndvi).toBeLessThan(0.5);
    });

    it('returns at-risk data when ID contains "risk"', async () => {
      const result = await lookupFastighet('Risk 1:1');
      expect(result.analysis.riskLevel).toBe('high');
    });

    it('preserves the user-entered fastighets-ID in the result', async () => {
      const customId = 'Uppsala Stockholm 99:88';
      const result = await lookupFastighet(customId);
      expect(result.lookup.fastighetId).toBe(customId);
    });

    it('result includes valid boundary GeoJSON', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      expect(result.lookup.boundaryGeoJSON.type).toBe('Polygon');
      expect(result.lookup.boundaryGeoJSON.coordinates).toBeDefined();
      expect((result.lookup.boundaryGeoJSON.coordinates[0] as number[][]).length).toBeGreaterThan(3);
    });

    it('result includes centroid in WGS84 range', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      const [lng, lat] = result.lookup.centroid;
      expect(lat).toBeGreaterThan(55);
      expect(lat).toBeLessThan(69);
      expect(lng).toBeGreaterThan(11);
      expect(lng).toBeLessThan(24);
    });

    it('result includes positive area', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      expect(result.lookup.areaHa).toBeGreaterThan(0);
    });

    it('analysis includes species mix summing to 100%', async () => {
      const result = await lookupFastighet('Kronoberg Vaxjo 1:23');
      const totalPct = result.analysis.speciesMix.reduce((s, sp) => s + sp.pct, 0);
      expect(totalPct).toBe(100);
    });
  });

  describe('loadParcelWithProgress', () => {
    it('throws on invalid fastighets-ID', async () => {
      await expect(
        loadParcelWithProgress('bad', vi.fn()),
      ).rejects.toThrow('Invalid fastighets-ID format');
    });

    it('calls onStepComplete for all four steps in order', async () => {
      const steps: LoadingStep[] = [];
      const onStep = (step: LoadingStep) => steps.push(step);

      await loadParcelWithProgress('Vaxjo 1:23', onStep);

      expect(steps).toEqual(['boundaries', 'satellite', 'species', 'risk']);
    }, 10000);

    it('returns parcel data after all steps complete', async () => {
      const result = await loadParcelWithProgress('Vaxjo 1:23', vi.fn());

      expect(result).toBeDefined();
      expect(result.lookup).toBeDefined();
      expect(result.analysis).toBeDefined();
    }, 10000);
  });
});
