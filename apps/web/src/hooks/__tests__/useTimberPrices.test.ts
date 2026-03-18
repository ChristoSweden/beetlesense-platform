/**
 * Tests for useTimberPrices hook.
 *
 * The hook fetches timber prices from an Edge Function, falling back to
 * demo data. We test the data processing logic (grouping, stats, filtering)
 * by mocking Supabase as unconfigured so the hook always uses demo data.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTimberPrices } from '../useTimberPrices';

// Mock Supabase as unconfigured so the hook uses demo data
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn() })) })),
  },
  isSupabaseConfigured: false,
}));

describe('useTimberPrices', () => {
  it('loads demo data when Supabase is not configured', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDemo).toBe(true);
    expect(result.current.prices.length).toBeGreaterThan(0);
  });

  it('returns prices from all 8 major buyers', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const expectedBuyers = ['Holmen', 'Moelven', 'SCA', 'Setra', 'Sodra', 'Stora Enso', 'Sveaskog', 'Vida'];
    expect(result.current.buyers.sort()).toEqual(expectedBuyers);
  });

  it('returns all 5 standard assortments', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assortments).toContain('Talltimmer');
    expect(result.current.assortments).toContain('Grantimmer');
    expect(result.current.assortments).toContain('Massaved tall');
    expect(result.current.assortments).toContain('Massaved gran');
    expect(result.current.assortments).toContain('Bjorkmassa');
  });

  it('computes byAssortment with best, worst, average, and range', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.byAssortment.length).toBe(5);
    for (const a of result.current.byAssortment) {
      expect(a.best.price).toBeGreaterThanOrEqual(a.worst.price);
      expect(a.average).toBeGreaterThan(0);
      expect(a.range[0]).toBeLessThanOrEqual(a.range[1]);
      expect(a.buyers.length).toBeGreaterThan(0);
    }
  });

  it('best price for Talltimmer is the highest among all buyers', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const talltimmer = result.current.byAssortment.find(a => a.assortment === 'Talltimmer');
    expect(talltimmer).toBeDefined();
    // Vida offers highest at 790 in demo data
    expect(talltimmer!.best.buyer).toBe('Vida');
    expect(talltimmer!.best.price).toBe(790);
  });

  it('computes byBuyer with assortment prices', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.byBuyer.length).toBe(8);
    for (const b of result.current.byBuyer) {
      expect(b.buyer).toBeTruthy();
      expect(Object.keys(b.assortments).length).toBeGreaterThan(0);
    }
  });

  it('bestPrices contains an entry for each assortment', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const keys = Object.keys(result.current.bestPrices);
    expect(keys).toContain('Talltimmer');
    expect(keys).toContain('Grantimmer');
    expect(keys).toContain('Massaved tall');
    expect(keys).toContain('Massaved gran');
    expect(keys).toContain('Bjorkmassa');
  });

  it('lastUpdated is a valid ISO date string', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastUpdated).toBeTruthy();
    const date = new Date(result.current.lastUpdated!);
    expect(date.getTime()).not.toBeNaN();
  });

  it('timber prices are in a realistic range (200-900 SEK/m3fub)', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (const p of result.current.prices) {
      expect(p.price_sek_per_m3fub).toBeGreaterThan(200);
      expect(p.price_sek_per_m3fub).toBeLessThan(900);
    }
  });

  it('sawlog prices are higher than pulpwood prices', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const talltimmer = result.current.byAssortment.find(a => a.assortment === 'Talltimmer');
    const massavedTall = result.current.byAssortment.find(a => a.assortment === 'Massaved tall');
    expect(talltimmer!.average).toBeGreaterThan(massavedTall!.average);
  });

  it('provides a refresh function', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refresh).toBe('function');
  });

  it('error is null when using demo data', async () => {
    const { result } = renderHook(() => useTimberPrices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });
});
