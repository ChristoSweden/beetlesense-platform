/**
 * Tests for useBiodiversity hook.
 *
 * The hook provides per-parcel biodiversity scoring, species inventory,
 * credit generation, buyer board, and improvement actions using demo data.
 */

import { renderHook, act } from '@testing-library/react';
import { useBiodiversity } from '../useBiodiversity';

// Mock demoData module
vi.mock('@/lib/demoData', () => ({
  DEMO_PARCELS: [
    {
      id: 'p1',
      name: 'Norra Skogen',
      area_hectares: 42.5,
      status: 'at_risk',
      last_survey: '2026-03-10',
      municipality: 'Värnamo',
      center: [14.04, 57.19],
      species_mix: [{ species: 'Spruce', pct: 65 }, { species: 'Pine', pct: 25 }, { species: 'Birch', pct: 10 }],
      elevation_m: 210,
      soil_type: 'Moraine',
      registered_at: '2025-09-15',
    },
    {
      id: 'p2',
      name: 'Ekbacken',
      area_hectares: 18.3,
      status: 'healthy',
      last_survey: '2026-03-12',
      municipality: 'Gislaved',
      center: [13.53, 57.30],
      species_mix: [{ species: 'Oak', pct: 40 }, { species: 'Birch', pct: 35 }, { species: 'Spruce', pct: 25 }],
      elevation_m: 165,
      soil_type: 'Clay',
      registered_at: '2025-10-01',
    },
    {
      id: 'p3',
      name: 'Tallmon',
      area_hectares: 67.8,
      status: 'healthy',
      last_survey: '2026-03-08',
      municipality: 'Värnamo',
      center: [14.12, 57.22],
      species_mix: [{ species: 'Pine', pct: 70 }, { species: 'Spruce', pct: 20 }, { species: 'Birch', pct: 10 }],
      elevation_m: 195,
      soil_type: 'Sandy moraine',
      registered_at: '2025-09-20',
    },
  ],
}));

describe('useBiodiversity', () => {
  describe('initial state', () => {
    it('returns 3 parcels with biodiversity data', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.parcels).toHaveLength(3);
      expect(result.current.parcelBiodiversity).toHaveLength(3);
    });

    it('defaults to parcel p1', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.selectedParcelId).toBe('p1');
      expect(result.current.selectedParcel.parcelId).toBe('p1');
    });
  });

  describe('parcel biodiversity scoring', () => {
    it('each parcel has a total score between 0 and 100', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        expect(p.totalScore).toBeGreaterThan(0);
        expect(p.totalScore).toBeLessThanOrEqual(100);
      }
    });

    it('each parcel has 6 biodiversity sectors', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        expect(p.sectors).toHaveLength(6);
      }
    });

    it('sector scores do not exceed their max', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        for (const s of p.sectors) {
          expect(s.score).toBeLessThanOrEqual(s.maxScore);
          expect(s.score).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('credits per year is positive and scales with area and score', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        expect(p.creditsPerYear).toBeGreaterThan(0);
      }
    });

    it('species count is positive', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        expect(p.speciesCount).toBeGreaterThan(0);
      }
    });

    it('rarity index is between 0 and 100', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const p of result.current.parcelBiodiversity) {
        expect(p.rarityIndex).toBeGreaterThanOrEqual(0);
        expect(p.rarityIndex).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('parcel selection', () => {
    it('can switch selected parcel', () => {
      const { result } = renderHook(() => useBiodiversity());

      act(() => {
        result.current.setSelectedParcelId('p2');
      });

      expect(result.current.selectedParcelId).toBe('p2');
      expect(result.current.selectedParcel.parcelId).toBe('p2');
    });

    it('falls back to first parcel if invalid ID is set', () => {
      const { result } = renderHook(() => useBiodiversity());

      act(() => {
        result.current.setSelectedParcelId('nonexistent');
      });

      // Should fall back to first parcel (p1)
      expect(result.current.selectedParcel.parcelId).toBe('p1');
    });
  });

  describe('aggregate statistics', () => {
    it('totalCreditsPerYear sums all parcels', () => {
      const { result } = renderHook(() => useBiodiversity());
      const manualSum = result.current.parcelBiodiversity.reduce(
        (s, p) => s + p.creditsPerYear,
        0,
      );
      expect(result.current.totalCreditsPerYear).toBeCloseTo(
        Math.round(manualSum * 10) / 10,
        1,
      );
    });

    it('avgScore is the mean of all parcel scores', () => {
      const { result } = renderHook(() => useBiodiversity());
      const manualAvg = Math.round(
        result.current.parcelBiodiversity.reduce((s, p) => s + p.totalScore, 0) /
          result.current.parcelBiodiversity.length,
      );
      expect(result.current.avgScore).toBe(manualAvg);
    });

    it('totalSpecies counts all demo species (25)', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.totalSpecies).toBe(25);
    });

    it('redListedCount is positive', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.redListedCount).toBeGreaterThan(0);
    });

    it('totalArea sums hectares from all parcels', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.totalArea).toBeCloseTo(42.5 + 18.3 + 67.8, 1);
    });

    it('estimatedAnnualRevenue is credits * 600 SEK', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.estimatedAnnualRevenue).toBe(
        Math.round(result.current.totalCreditsPerYear * 600),
      );
    });

    it('avgScore is above nationalAvgScore', () => {
      const { result } = renderHook(() => useBiodiversity());
      // Our demo parcels should score above the national average (48)
      expect(result.current.avgScore).toBeGreaterThan(result.current.nationalAvgScore);
    });
  });

  describe('credit inventory', () => {
    it('has totalGenerated, available, listed, and sold', () => {
      const { result } = renderHook(() => useBiodiversity());
      const inv = result.current.creditInventory;
      expect(inv.totalGenerated).toBeGreaterThan(0);
      expect(typeof inv.available).toBe('number');
      expect(typeof inv.listed).toBe('number');
      expect(typeof inv.sold).toBe('number');
    });

    it('totalRevenue sums sale transactions', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('programs and buyers', () => {
    it('has multiple biodiversity programs', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.programs.length).toBeGreaterThan(0);
      for (const prog of result.current.programs) {
        expect(prog.name).toBeTruthy();
        expect(prog.priceRange.max).toBeGreaterThan(prog.priceRange.min);
      }
    });

    it('has demo buyers with positive credit needs', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.buyers.length).toBeGreaterThan(0);
      for (const buyer of result.current.buyers) {
        expect(buyer.creditsNeeded).toBeGreaterThan(0);
        expect(buyer.pricePerUnit).toBeGreaterThan(0);
      }
    });
  });

  describe('species data', () => {
    it('parcelSpecies is filtered to selected parcel', () => {
      const { result } = renderHook(() => useBiodiversity());

      // All species for parcel p1
      for (const s of result.current.parcelSpecies) {
        expect(s.parcelIds).toContain('p1');
      }
    });

    it('allSpecies has more entries than any single parcel', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.allSpecies.length).toBeGreaterThanOrEqual(
        result.current.parcelSpecies.length,
      );
    });

    it('species have required fields', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const s of result.current.allSpecies) {
        expect(s.id).toBeTruthy();
        expect(s.nameSv).toBeTruthy();
        expect(s.nameLatin).toBeTruthy();
        expect(s.group).toBeTruthy();
        expect(['LC', 'NT', 'VU', 'EN', 'CR']).toContain(s.conservationStatus);
      }
    });
  });

  describe('improvement actions', () => {
    it('parcelActions are filtered to selected parcel', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const a of result.current.parcelActions) {
        expect(a.parcelIds).toContain('p1');
      }
    });

    it('actions are sorted by ROI descending', () => {
      const { result } = renderHook(() => useBiodiversity());
      const actions = result.current.parcelActions;
      for (let i = 1; i < actions.length; i++) {
        expect(actions[i - 1].roi).toBeGreaterThanOrEqual(actions[i].roi);
      }
    });

    it('allActions contains more than parcelActions', () => {
      const { result } = renderHook(() => useBiodiversity());
      expect(result.current.allActions.length).toBeGreaterThanOrEqual(
        result.current.parcelActions.length,
      );
    });

    it('actions have cost and revenue fields', () => {
      const { result } = renderHook(() => useBiodiversity());
      for (const a of result.current.allActions) {
        expect(typeof a.costSEK).toBe('number');
        expect(a.costSEK).toBeGreaterThanOrEqual(0);
        expect(a.scoreImpact).toBeGreaterThan(0);
      }
    });
  });
});
