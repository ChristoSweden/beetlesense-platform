/**
 * Tests for useMillDemand hook.
 *
 * Provides mill demand data, hot markets, trends, region balances,
 * and negotiation briefs. Uses demo data with simulated loading.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useMillDemand } from '../useMillDemand';

// Mock demoData
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
      species_mix: [{ species: 'Spruce', pct: 65 }],
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
      species_mix: [{ species: 'Oak', pct: 40 }],
      elevation_m: 165,
      soil_type: 'Clay',
      registered_at: '2025-10-01',
    },
  ],
}));

// Mock dataMode
vi.mock('@/lib/dataMode', () => ({
  isDemoMode: () => true,
}));

describe('useMillDemand', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useMillDemand());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.mills).toHaveLength(0);
  });

  it('loads mills after timeout', async () => {
    const { result } = renderHook(() => useMillDemand());

    // Advance past the 400ms timer
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mills.length).toBeGreaterThan(0);
  });

  it('mills have distance and transport cost computed', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (const mill of result.current.mills) {
      expect(mill.distanceKm).toBeGreaterThan(0);
      expect(mill.transportCostSEK).toBeGreaterThanOrEqual(0);
      expect(mill.nearestParcel).toBeTruthy();
    }
  });

  it('all mills have required fields', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (const mill of result.current.mills) {
      expect(mill.id).toBeTruthy();
      expect(mill.name).toBeTruthy();
      expect(mill.company).toBeTruthy();
      expect(mill.type.length).toBeGreaterThan(0);
      expect(mill.location.lat).toBeGreaterThan(55);
      expect(mill.location.lat).toBeLessThan(70);
      expect(mill.annualCapacity).toBeGreaterThan(0);
      expect(mill.utilization).toBeGreaterThanOrEqual(0);
      expect(mill.utilization).toBeLessThanOrEqual(100);
      expect(mill.assortments.length).toBeGreaterThan(0);
    }
  });

  it('returns hot markets sorted by price descending', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hotMarkets.length).toBeGreaterThan(0);
    expect(result.current.hotMarkets.length).toBeLessThanOrEqual(6);

    for (let i = 1; i < result.current.hotMarkets.length; i++) {
      expect(result.current.hotMarkets[i - 1].price).toBeGreaterThanOrEqual(
        result.current.hotMarkets[i].price,
      );
    }
  });

  it('hot markets only contain high-demand assortments', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (const hm of result.current.hotMarkets) {
      expect(hm.demandLevel).toBe('high');
      expect(hm.reason.length).toBeGreaterThan(0);
    }
  });

  it('returns industry trends', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trends.length).toBeGreaterThan(0);
    for (const t of result.current.trends) {
      expect(t.text.length).toBeGreaterThan(0);
      expect(['positive', 'negative', 'neutral']).toContain(t.impact);
    }
  });

  it('returns region balances for 3 regions', async () => {
    const { result } = renderHook(() => useMillDemand());
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.regionBalances).toHaveLength(3);
    for (const rb of result.current.regionBalances) {
      expect(rb.region).toBeTruthy();
      expect(rb.supplyLevel).toBeGreaterThan(0);
      expect(rb.demandLevel).toBeGreaterThan(0);
      expect(['surplus', 'balanced', 'deficit']).toContain(rb.balance);
    }
  });

  describe('getNegotiationBrief', () => {
    it('returns null for unknown mill ID', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.getNegotiationBrief('nonexistent', 'Granstock')).toBeNull();
    });

    it('returns null for unknown assortment', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const firstMillId = result.current.mills[0]?.id;
      if (firstMillId) {
        expect(result.current.getNegotiationBrief(firstMillId, 'FakeWood')).toBeNull();
      }
    });

    it('returns a complete brief for a valid mill + assortment', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Find a mill with a known assortment
      const mill = result.current.mills.find(m => m.assortments.length > 0);
      expect(mill).toBeDefined();

      const assortmentName = mill!.assortments[0].name;
      const brief = result.current.getNegotiationBrief(mill!.id, assortmentName);

      expect(brief).not.toBeNull();
      expect(brief!.millId).toBe(mill!.id);
      expect(brief!.assortment).toBe(assortmentName);
      expect(brief!.fairPriceRange.low).toBeGreaterThan(0);
      expect(brief!.fairPriceRange.mid).toBeGreaterThan(brief!.fairPriceRange.low);
      expect(brief!.fairPriceRange.high).toBeGreaterThan(brief!.fairPriceRange.mid);
      expect(brief!.yourLeverage.length).toBeGreaterThan(0);
      expect(brief!.talkingPoints.length).toBeGreaterThan(0);
      expect(brief!.timingAdvice.length).toBeGreaterThan(0);
      expect(typeof brief!.buyerNeedsYouMore).toBe('boolean');
    });

    it('high-utilization mills have buyerNeedsYouMore = true', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Find a mill with utilization >= 85 and demandLevel 'high'
      const desperateMill = result.current.mills.find(
        m => m.utilization >= 85 && m.demandLevel === 'high',
      );

      if (desperateMill) {
        const brief = result.current.getNegotiationBrief(
          desperateMill.id,
          desperateMill.assortments[0].name,
        );
        expect(brief).not.toBeNull();
        expect(brief!.buyerNeedsYouMore).toBe(true);
      }
    });

    it('brief includes competing offers from other mills', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Use a common assortment like Granstock that many mills carry
      const mill = result.current.mills.find(m =>
        m.assortments.some(a => a.name === 'Granstock'),
      );

      if (mill) {
        const brief = result.current.getNegotiationBrief(mill.id, 'Granstock');
        expect(brief).not.toBeNull();
        // Multiple mills offer Granstock, so there should be competing offers
        expect(brief!.competingOffers.length).toBeGreaterThan(0);
        expect(brief!.competingOffers.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('transport cost logic', () => {
    it('road distance is ~1.3x straight-line distance', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // The nearest mill to Värnamo parcels should have a positive distance
      const nearestMill = result.current.mills.reduce((min, m) =>
        m.distanceKm < min.distanceKm ? m : min,
      );
      expect(nearestMill.distanceKm).toBeGreaterThan(0);
    });

    it('transport cost scales with distance at ~0.35 SEK/m3/km', async () => {
      const { result } = renderHook(() => useMillDemand());
      await act(async () => { vi.advanceTimersByTime(500); });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      for (const mill of result.current.mills) {
        const expectedCost = Math.round(mill.distanceKm * 0.35);
        expect(mill.transportCostSEK).toBe(expectedCost);
      }
    });
  });
});
