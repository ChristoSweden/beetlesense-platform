/**
 * useGroupSelling — Collective timber selling / auction hook.
 *
 * Enables small forest owners to pool timber volumes and run collective
 * auctions to achieve volume-tier pricing normally reserved for large suppliers.
 *
 * Falls back to comprehensive demo data when Supabase is not available.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDataMode } from '@/lib/dataMode';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───

export type PoolStatus = 'collecting' | 'full' | 'auction_live' | 'completed' | 'cancelled';
export type AuctionStatus = 'upcoming' | 'live' | 'closed' | 'awarded';
export type TimberAssortment = 'grantimmer' | 'talltimmer' | 'massaved' | 'bjorkmassa' | 'contorta';

export interface PoolMember {
  id: string;
  /** Anonymized — just initials */
  initials: string;
  volumeM3: number;
  qualityGrade: 'A' | 'B' | 'C';
  joinedAt: string;
  parcelName: string;
  deliveryFlexibility: 'strict' | 'flexible' | 'very_flexible';
}

export interface TimberPool {
  id: string;
  name: string;
  assortment: TimberAssortment;
  assortmentLabel: string;
  region: string;
  kommun: string;
  targetVolumeM3: number;
  currentVolumeM3: number;
  memberCount: number;
  status: PoolStatus;
  expectedPremiumMin: number;
  expectedPremiumMax: number;
  deadline: string;
  deliveryQuarter: string;
  minQuality: 'A' | 'B' | 'C';
  createdAt: string;
  members: PoolMember[];
  /** Whether the current user is a member */
  isMember: boolean;
}

export interface AuctionBid {
  id: string;
  buyerName: string;
  buyerType: 'major' | 'regional' | 'local';
  pricePerm3: number;
  totalValue: number;
  transportIncluded: boolean;
  conditions: string;
  submittedAt: string;
  isLeading: boolean;
}

export interface LiveAuction {
  id: string;
  poolId: string;
  poolName: string;
  assortment: TimberAssortment;
  assortmentLabel: string;
  volumeM3: number;
  region: string;
  deliveryTerms: string;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  minimumPriceM3: number;
  autoAcceptPriceM3: number;
  bids: AuctionBid[];
  memberVotes: { accept: number; reject: number; pending: number };
}

export interface PoolResult {
  id: string;
  poolName: string;
  assortment: TimberAssortment;
  assortmentLabel: string;
  volumeM3: number;
  memberCount: number;
  region: string;
  completedAt: string;
  achievedPriceM3: number;
  individualAvgPriceM3: number;
  premiumPercent: number;
  totalPremiumSEK: number;
  winnerBuyer: string;
  beetlesenseFeePercent: number;
  beetlesenseFeeSEK: number;
  testimonial?: string;
  rating?: number;
  /** Per-member breakdown sample (current user) */
  myVolumeM3?: number;
  myEarningsSEK?: number;
  myPremiumSEK?: number;
}

export interface VolumeCommitmentForm {
  poolId: string;
  selectedParcels: string[];
  volumeM3: number;
  qualityGrade: 'A' | 'B' | 'C';
  deliveryFlexibility: 'strict' | 'flexible' | 'very_flexible';
  deliveryEarliestDate: string;
  deliveryLatestDate: string;
  termsAccepted: boolean;
}

export interface CreatePoolForm {
  name: string;
  assortment: TimberAssortment;
  targetVolumeM3: number;
  region: string;
  deliveryQuarter: string;
  minQuality: 'A' | 'B' | 'C';
  autoInviteNearby: boolean;
}

// ─── Demo Data ───

const DEMO_POOL_MEMBERS: PoolMember[] = [
  { id: 'm1', initials: 'AL', volumeM3: 220, qualityGrade: 'A', joinedAt: '2026-02-01', parcelName: 'Norra Skogen', deliveryFlexibility: 'flexible' },
  { id: 'm2', initials: 'BK', volumeM3: 180, qualityGrade: 'A', joinedAt: '2026-02-03', parcelName: 'Ekbacken', deliveryFlexibility: 'strict' },
  { id: 'm3', initials: 'CS', volumeM3: 340, qualityGrade: 'B', joinedAt: '2026-02-05', parcelName: 'Tallmon', deliveryFlexibility: 'flexible' },
  { id: 'm4', initials: 'DE', volumeM3: 160, qualityGrade: 'A', joinedAt: '2026-02-07', parcelName: 'Granudden', deliveryFlexibility: 'very_flexible' },
  { id: 'm5', initials: 'EF', volumeM3: 200, qualityGrade: 'B', joinedAt: '2026-02-08', parcelName: 'Björklund', deliveryFlexibility: 'flexible' },
  { id: 'm6', initials: 'FG', volumeM3: 150, qualityGrade: 'A', joinedAt: '2026-02-10', parcelName: 'Åsmon', deliveryFlexibility: 'strict' },
  { id: 'm7', initials: 'GH', volumeM3: 280, qualityGrade: 'A', joinedAt: '2026-02-12', parcelName: 'Stockaberg', deliveryFlexibility: 'flexible' },
  { id: 'm8', initials: 'HI', volumeM3: 190, qualityGrade: 'B', joinedAt: '2026-02-14', parcelName: 'Kullaberg', deliveryFlexibility: 'very_flexible' },
  { id: 'm9', initials: 'IJ', volumeM3: 310, qualityGrade: 'A', joinedAt: '2026-02-16', parcelName: 'Mosselund', deliveryFlexibility: 'flexible' },
];

const DEMO_POOLS: TimberPool[] = [
  {
    id: 'pool-1',
    name: 'Värnamo Grantimmer Q3 2026',
    assortment: 'grantimmer',
    assortmentLabel: 'Grantimmer (spruce sawlog)',
    region: 'Småland',
    kommun: 'Värnamo',
    targetVolumeM3: 3000,
    currentVolumeM3: 2400,
    memberCount: 14,
    status: 'collecting',
    expectedPremiumMin: 8,
    expectedPremiumMax: 12,
    deadline: '2026-04-15',
    deliveryQuarter: 'Q3 2026',
    minQuality: 'B',
    createdAt: '2026-01-15',
    members: DEMO_POOL_MEMBERS.slice(0, 7),
    isMember: true,
  },
  {
    id: 'pool-2',
    name: 'Jönköping Talltimmer Q3 2026',
    assortment: 'talltimmer',
    assortmentLabel: 'Talltimmer (pine sawlog)',
    region: 'Småland',
    kommun: 'Jönköping',
    targetVolumeM3: 2500,
    currentVolumeM3: 1600,
    memberCount: 9,
    status: 'collecting',
    expectedPremiumMin: 6,
    expectedPremiumMax: 10,
    deadline: '2026-05-01',
    deliveryQuarter: 'Q3 2026',
    minQuality: 'B',
    createdAt: '2026-02-01',
    members: DEMO_POOL_MEMBERS.slice(2, 8),
    isMember: false,
  },
  {
    id: 'pool-3',
    name: 'Gislaved Massaved Q2 2026',
    assortment: 'massaved',
    assortmentLabel: 'Massaved (pulpwood)',
    region: 'Småland',
    kommun: 'Gislaved',
    targetVolumeM3: 2000,
    currentVolumeM3: 2000,
    memberCount: 11,
    status: 'full',
    expectedPremiumMin: 10,
    expectedPremiumMax: 15,
    deadline: '2026-03-20',
    deliveryQuarter: 'Q2 2026',
    minQuality: 'C',
    createdAt: '2026-01-10',
    members: DEMO_POOL_MEMBERS.slice(0, 6),
    isMember: true,
  },
  {
    id: 'pool-4',
    name: 'Nässjö Björkmassa Q4 2026',
    assortment: 'bjorkmassa',
    assortmentLabel: 'Björkmassa (birch pulpwood)',
    region: 'Småland',
    kommun: 'Nässjö',
    targetVolumeM3: 1200,
    currentVolumeM3: 450,
    memberCount: 5,
    status: 'collecting',
    expectedPremiumMin: 5,
    expectedPremiumMax: 9,
    deadline: '2026-06-30',
    deliveryQuarter: 'Q4 2026',
    minQuality: 'C',
    createdAt: '2026-03-01',
    members: DEMO_POOL_MEMBERS.slice(4, 9),
    isMember: false,
  },
];

const DEMO_AUCTIONS: LiveAuction[] = [
  {
    id: 'auction-1',
    poolId: 'pool-3',
    poolName: 'Gislaved Massaved Q2 2026',
    assortment: 'massaved',
    assortmentLabel: 'Massaved (pulpwood)',
    volumeM3: 2000,
    region: 'Småland / Gislaved',
    deliveryTerms: 'Fritt bilväg, leverans Q2 2026',
    status: 'live',
    startsAt: '2026-03-14T08:00:00Z',
    endsAt: '2026-03-19T18:00:00Z',
    minimumPriceM3: 350,
    autoAcceptPriceM3: 400,
    bids: [
      { id: 'bid-1', buyerName: 'Södra Skogsägarna', buyerType: 'major', pricePerm3: 385, totalValue: 770000, transportIncluded: true, conditions: 'Standardvillkor, betalning 30 dagar', submittedAt: '2026-03-15T09:00:00Z', isLeading: true },
      { id: 'bid-2', buyerName: 'Stora Enso', buyerType: 'major', pricePerm3: 378, totalValue: 756000, transportIncluded: true, conditions: 'Volymbonus vid >2500 m³', submittedAt: '2026-03-15T11:30:00Z', isLeading: false },
      { id: 'bid-3', buyerName: 'Vida Skog', buyerType: 'regional', pricePerm3: 370, totalValue: 740000, transportIncluded: false, conditions: 'Transport ej inkluderat, hämtning Gislaved', submittedAt: '2026-03-14T14:00:00Z', isLeading: false },
      { id: 'bid-4', buyerName: 'Holmen Skog', buyerType: 'major', pricePerm3: 365, totalValue: 730000, transportIncluded: true, conditions: 'Betalning 14 dagar, FSC-certifiering krävs', submittedAt: '2026-03-14T10:00:00Z', isLeading: false },
    ],
    memberVotes: { accept: 7, reject: 1, pending: 3 },
  },
  {
    id: 'auction-2',
    poolId: 'pool-completed-x',
    poolName: 'Värnamo Grantimmer Q1 2026',
    assortment: 'grantimmer',
    assortmentLabel: 'Grantimmer (spruce sawlog)',
    volumeM3: 3200,
    region: 'Småland / Värnamo',
    deliveryTerms: 'Fritt bilväg, leverans Q1 2026',
    status: 'live',
    startsAt: '2026-03-10T08:00:00Z',
    endsAt: '2026-03-20T18:00:00Z',
    minimumPriceM3: 740,
    autoAcceptPriceM3: 800,
    bids: [
      { id: 'bid-5', buyerName: 'Stora Enso', buyerType: 'major', pricePerm3: 785, totalValue: 2512000, transportIncluded: true, conditions: 'Standardvillkor, kvalitetssortering vid industri', submittedAt: '2026-03-16T08:00:00Z', isLeading: true },
      { id: 'bid-6', buyerName: 'Södra Skogsägarna', buyerType: 'major', pricePerm3: 775, totalValue: 2480000, transportIncluded: true, conditions: 'Betalning 21 dagar', submittedAt: '2026-03-15T16:00:00Z', isLeading: false },
      { id: 'bid-7', buyerName: 'SCA Skog', buyerType: 'major', pricePerm3: 760, totalValue: 2432000, transportIncluded: false, conditions: 'Hämtning Värnamo terminal', submittedAt: '2026-03-14T12:00:00Z', isLeading: false },
      { id: 'bid-8', buyerName: 'Nydala Sågverk', buyerType: 'local', pricePerm3: 790, totalValue: 2528000, transportIncluded: false, conditions: 'Max 1500 m³, hämtning egen, betalning 7 dagar', submittedAt: '2026-03-16T14:00:00Z', isLeading: false },
    ],
    memberVotes: { accept: 12, reject: 2, pending: 4 },
  },
];

const DEMO_RESULTS: PoolResult[] = [
  {
    id: 'result-1',
    poolName: 'Värnamo Grantimmer Q4 2025',
    assortment: 'grantimmer',
    assortmentLabel: 'Grantimmer (spruce sawlog)',
    volumeM3: 3200,
    memberCount: 18,
    region: 'Småland / Värnamo',
    completedAt: '2025-12-15',
    achievedPriceM3: 785,
    individualAvgPriceM3: 710,
    premiumPercent: 10.6,
    totalPremiumSEK: 240000,
    winnerBuyer: 'Stora Enso',
    beetlesenseFeePercent: 2,
    beetlesenseFeeSEK: 50240,
    testimonial: 'Fantastiskt resultat! Ensam hade jag aldrig fått det priset. BeetleSense gjorde hela processen enkel.',
    rating: 5,
    myVolumeM3: 220,
    myEarningsSEK: 172700,
    myPremiumSEK: 16500,
  },
  {
    id: 'result-2',
    poolName: 'Gislaved Massaved Q3 2025',
    assortment: 'massaved',
    assortmentLabel: 'Massaved (pulpwood)',
    volumeM3: 1800,
    memberCount: 12,
    region: 'Småland / Gislaved',
    completedAt: '2025-10-20',
    achievedPriceM3: 385,
    individualAvgPriceM3: 340,
    premiumPercent: 13.2,
    totalPremiumSEK: 81000,
    winnerBuyer: 'Södra Skogsägarna',
    beetlesenseFeePercent: 2,
    beetlesenseFeeSEK: 13860,
    testimonial: 'Första gången jag kände att jag hade förhandlingskraft som liten skogsägare.',
    rating: 5,
    myVolumeM3: 150,
    myEarningsSEK: 57750,
    myPremiumSEK: 6750,
  },
  {
    id: 'result-3',
    poolName: 'Jönköping Talltimmer Q2 2025',
    assortment: 'talltimmer',
    assortmentLabel: 'Talltimmer (pine sawlog)',
    volumeM3: 2100,
    memberCount: 15,
    region: 'Småland / Jönköping',
    completedAt: '2025-08-10',
    achievedPriceM3: 720,
    individualAvgPriceM3: 665,
    premiumPercent: 8.3,
    totalPremiumSEK: 115500,
    winnerBuyer: 'Holmen Skog',
    beetlesenseFeePercent: 2,
    beetlesenseFeeSEK: 30240,
    rating: 4,
    myVolumeM3: 180,
    myEarningsSEK: 129600,
    myPremiumSEK: 9900,
  },
  {
    id: 'result-4',
    poolName: 'Nässjö Björkmassa Q1 2025',
    assortment: 'bjorkmassa',
    assortmentLabel: 'Björkmassa (birch pulpwood)',
    volumeM3: 950,
    memberCount: 8,
    region: 'Småland / Nässjö',
    completedAt: '2025-05-22',
    achievedPriceM3: 310,
    individualAvgPriceM3: 280,
    premiumPercent: 10.7,
    totalPremiumSEK: 28500,
    winnerBuyer: 'Vida Skog',
    beetlesenseFeePercent: 2,
    beetlesenseFeeSEK: 5890,
    rating: 4,
  },
  {
    id: 'result-5',
    poolName: 'Värnamo Massaved Q4 2024',
    assortment: 'massaved',
    assortmentLabel: 'Massaved (pulpwood)',
    volumeM3: 2400,
    memberCount: 16,
    region: 'Småland / Värnamo',
    completedAt: '2025-02-14',
    achievedPriceM3: 355,
    individualAvgPriceM3: 315,
    premiumPercent: 12.7,
    totalPremiumSEK: 96000,
    winnerBuyer: 'Södra Skogsägarna',
    beetlesenseFeePercent: 2,
    beetlesenseFeeSEK: 17040,
    testimonial: 'Varje skogsägare borde vara med i en pool. Skillnaden mot att sälja själv är enorm.',
    rating: 5,
    myVolumeM3: 200,
    myEarningsSEK: 71000,
    myPremiumSEK: 8000,
  },
];

// ─── Supabase row → domain type mappers ───

function mapPoolRow(row: Record<string, unknown>): TimberPool {
  return {
    id: row.id as string,
    name: row.name as string,
    assortment: row.assortment as TimberAssortment,
    assortmentLabel: (row.assortment_label as string) ?? row.assortment as string,
    region: row.region as string,
    kommun: (row.kommun as string) ?? '',
    targetVolumeM3: row.target_volume_m3 as number,
    currentVolumeM3: row.current_volume_m3 as number,
    memberCount: (row.member_count as number) ?? 0,
    status: row.status as PoolStatus,
    expectedPremiumMin: (row.expected_premium_min as number) ?? 0,
    expectedPremiumMax: (row.expected_premium_max as number) ?? 0,
    deadline: row.deadline as string,
    deliveryQuarter: (row.delivery_quarter as string) ?? '',
    minQuality: (row.min_quality as 'A' | 'B' | 'C') ?? 'C',
    createdAt: row.created_at as string,
    members: Array.isArray(row.members) ? (row.members as PoolMember[]) : [],
    isMember: (row.is_member as boolean) ?? false,
  };
}

function mapAuctionRow(row: Record<string, unknown>): LiveAuction {
  return {
    id: row.id as string,
    poolId: row.pool_id as string,
    poolName: (row.pool_name as string) ?? '',
    assortment: row.assortment as TimberAssortment,
    assortmentLabel: (row.assortment_label as string) ?? row.assortment as string,
    volumeM3: row.volume_m3 as number,
    region: (row.region as string) ?? '',
    deliveryTerms: (row.delivery_terms as string) ?? '',
    status: row.status as AuctionStatus,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    minimumPriceM3: (row.minimum_price_m3 as number) ?? 0,
    autoAcceptPriceM3: (row.auto_accept_price_m3 as number) ?? 0,
    bids: Array.isArray(row.bids) ? (row.bids as AuctionBid[]) : [],
    memberVotes: (row.member_votes as { accept: number; reject: number; pending: number }) ?? { accept: 0, reject: 0, pending: 0 },
  };
}

function mapResultRow(row: Record<string, unknown>): PoolResult {
  return {
    id: row.id as string,
    poolName: (row.pool_name as string) ?? '',
    assortment: row.assortment as TimberAssortment,
    assortmentLabel: (row.assortment_label as string) ?? row.assortment as string,
    volumeM3: row.volume_m3 as number,
    memberCount: (row.member_count as number) ?? 0,
    region: (row.region as string) ?? '',
    completedAt: row.completed_at as string,
    achievedPriceM3: row.achieved_price_m3 as number,
    individualAvgPriceM3: (row.individual_avg_price_m3 as number) ?? 0,
    premiumPercent: (row.premium_percent as number) ?? 0,
    totalPremiumSEK: (row.total_premium_sek as number) ?? 0,
    winnerBuyer: (row.winner_buyer as string) ?? '',
    beetlesenseFeePercent: (row.beetlesense_fee_percent as number) ?? 2,
    beetlesenseFeeSEK: (row.beetlesense_fee_sek as number) ?? 0,
    testimonial: row.testimonial as string | undefined,
    rating: row.rating as number | undefined,
    myVolumeM3: row.my_volume_m3 as number | undefined,
    myEarningsSEK: row.my_earnings_sek as number | undefined,
    myPremiumSEK: row.my_premium_sek as number | undefined,
  };
}

// ─── Hook ───

export interface UseGroupSellingReturn {
  // Data
  pools: TimberPool[];
  myPools: TimberPool[];
  auctions: LiveAuction[];
  results: PoolResult[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  joinPool: (form: VolumeCommitmentForm) => Promise<void>;
  createPool: (form: CreatePoolForm) => Promise<void>;
  voteOnAuction: (auctionId: string, accept: boolean) => Promise<void>;
  refreshData: () => void;

  // Computed
  totalSavedSEK: number;
  avgPremiumPercent: number;
  estimatedEligibleOwners: (region: string) => number;
}

export function useGroupSelling(): UseGroupSellingReturn {
  const [pools, setPools] = useState<TimberPool[]>([]);
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [results, setResults] = useState<PoolResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (getDataMode() === 'demo') {
        setPools(DEMO_POOLS);
        setAuctions(DEMO_AUCTIONS);
        setResults(DEMO_RESULTS);
      } else {
        // Live mode: fetch from Supabase
        const [poolsRes, auctionsRes, resultsRes] = await Promise.all([
          supabase.from('timber_pools').select('*').order('created_at', { ascending: false }),
          supabase.from('live_auctions').select('*').order('starts_at', { ascending: false }),
          supabase.from('pool_results').select('*').order('completed_at', { ascending: false }),
        ]);

        if (poolsRes.error) throw poolsRes.error;
        if (auctionsRes.error) throw auctionsRes.error;
        if (resultsRes.error) throw resultsRes.error;

        setPools((poolsRes.data ?? []).map((r) => mapPoolRow(r as Record<string, unknown>)));
        setAuctions((auctionsRes.data ?? []).map((r) => mapAuctionRow(r as Record<string, unknown>)));
        setResults((resultsRes.data ?? []).map((r) => mapResultRow(r as Record<string, unknown>)));
      }
    } catch (err: unknown) {
      console.error('Group selling data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load group selling data');
      // Fall back to demo data on error so the UI is never empty
      setPools(DEMO_POOLS);
      setAuctions(DEMO_AUCTIONS);
      setResults(DEMO_RESULTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up realtime subscriptions for live mode
  useEffect(() => {
    loadData();

    if (getDataMode() !== 'live') return;

    // Subscribe to timber_pools changes
    const poolsChannel = supabase
      .channel('group-selling-pools')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timber_pools' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            const pool = mapPoolRow(newRow as Record<string, unknown>);
            setPools((prev) => [pool, ...prev]);
          } else if (eventType === 'UPDATE') {
            const pool = mapPoolRow(newRow as Record<string, unknown>);
            setPools((prev) => prev.map((p) => (p.id === pool.id ? pool : p)));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>).id as string;
            setPools((prev) => prev.filter((p) => p.id !== deletedId));
          }
        },
      )
      .subscribe();

    // Subscribe to live_auctions changes
    const auctionsChannel = supabase
      .channel('group-selling-auctions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_auctions' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            const auction = mapAuctionRow(newRow as Record<string, unknown>);
            setAuctions((prev) => [auction, ...prev]);
          } else if (eventType === 'UPDATE') {
            const auction = mapAuctionRow(newRow as Record<string, unknown>);
            setAuctions((prev) => prev.map((a) => (a.id === auction.id ? auction : a)));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>).id as string;
            setAuctions((prev) => prev.filter((a) => a.id !== deletedId));
          }
        },
      )
      .subscribe();

    // Subscribe to pool_results changes
    const resultsChannel = supabase
      .channel('group-selling-results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pool_results' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            const result = mapResultRow(newRow as Record<string, unknown>);
            setResults((prev) => [result, ...prev]);
          } else if (eventType === 'UPDATE') {
            const result = mapResultRow(newRow as Record<string, unknown>);
            setResults((prev) => prev.map((r) => (r.id === result.id ? result : r)));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>).id as string;
            setResults((prev) => prev.filter((r) => r.id !== deletedId));
          }
        },
      )
      .subscribe();

    channelsRef.current = [poolsChannel, auctionsChannel, resultsChannel];

    // Cleanup: unsubscribe from all channels on unmount
    return () => {
      for (const channel of channelsRef.current) {
        supabase.removeChannel(channel);
      }
      channelsRef.current = [];
    };
  }, [loadData]);

  const myPools = useMemo(() => pools.filter((p) => p.isMember), [pools]);

  const totalSavedSEK = useMemo(
    () => results.reduce((sum, r) => sum + r.totalPremiumSEK, 0),
    [results],
  );

  const avgPremiumPercent = useMemo(() => {
    if (results.length === 0) return 0;
    return +(results.reduce((s, r) => s + r.premiumPercent, 0) / results.length).toFixed(1);
  }, [results]);

  const joinPool = useCallback(async (form: VolumeCommitmentForm) => {
    if (getDataMode() === 'live') {
      const { error: rpcError } = await supabase.rpc('join_timber_pool', {
        p_pool_id: form.poolId,
        p_volume_m3: form.volumeM3,
        p_quality_grade: form.qualityGrade,
        p_delivery_flexibility: form.deliveryFlexibility,
        p_delivery_earliest: form.deliveryEarliestDate,
        p_delivery_latest: form.deliveryLatestDate,
        p_selected_parcels: form.selectedParcels,
      });
      if (rpcError) throw rpcError;
      // Realtime will update the pool state automatically
      return;
    }

    // Demo: update state locally
    setPools((prev) =>
      prev.map((p) =>
        p.id === form.poolId
          ? {
              ...p,
              currentVolumeM3: p.currentVolumeM3 + form.volumeM3,
              memberCount: p.memberCount + 1,
              isMember: true,
              status: p.currentVolumeM3 + form.volumeM3 >= p.targetVolumeM3 ? 'full' as const : p.status,
            }
          : p,
      ),
    );
  }, []);

  const createPool = useCallback(async (form: CreatePoolForm) => {
    const assortmentLabels: Record<TimberAssortment, string> = {
      grantimmer: 'Grantimmer (spruce sawlog)',
      talltimmer: 'Talltimmer (pine sawlog)',
      massaved: 'Massaved (pulpwood)',
      bjorkmassa: 'Björkmassa (birch pulpwood)',
      contorta: 'Contorta (lodgepole pine)',
    };

    if (getDataMode() === 'live') {
      const { error: insertError } = await supabase.from('timber_pools').insert({
        name: form.name,
        assortment: form.assortment,
        assortment_label: assortmentLabels[form.assortment],
        region: 'Småland',
        kommun: form.region,
        target_volume_m3: form.targetVolumeM3,
        current_volume_m3: 0,
        member_count: 1,
        status: 'collecting',
        expected_premium_min: 6,
        expected_premium_max: 12,
        delivery_quarter: form.deliveryQuarter,
        min_quality: form.minQuality,
        is_member: true,
      });
      if (insertError) throw insertError;
      // Realtime will add the new pool to state automatically
      return;
    }

    // Demo: add locally
    const newPool: TimberPool = {
      id: `pool-new-${Date.now()}`,
      name: form.name,
      assortment: form.assortment,
      assortmentLabel: assortmentLabels[form.assortment],
      region: 'Småland',
      kommun: form.region,
      targetVolumeM3: form.targetVolumeM3,
      currentVolumeM3: 0,
      memberCount: 1,
      status: 'collecting',
      expectedPremiumMin: 6,
      expectedPremiumMax: 12,
      deadline: '2026-06-30',
      deliveryQuarter: form.deliveryQuarter,
      minQuality: form.minQuality,
      createdAt: new Date().toISOString().split('T')[0],
      members: [],
      isMember: true,
    };
    setPools((prev) => [newPool, ...prev]);
  }, []);

  const voteOnAuction = useCallback(async (auctionId: string, accept: boolean) => {
    if (getDataMode() === 'live') {
      const { error: rpcError } = await supabase.rpc('vote_on_auction', {
        p_auction_id: auctionId,
        p_accept: accept,
      });
      if (rpcError) throw rpcError;
      // Realtime will update vote counts automatically
      return;
    }

    // Demo: update locally
    setAuctions((prev) =>
      prev.map((a) =>
        a.id === auctionId
          ? {
              ...a,
              memberVotes: {
                ...a.memberVotes,
                accept: a.memberVotes.accept + (accept ? 1 : 0),
                reject: a.memberVotes.reject + (accept ? 0 : 1),
                pending: Math.max(0, a.memberVotes.pending - 1),
              },
            }
          : a,
      ),
    );
  }, []);

  const estimatedEligibleOwners = useCallback((region: string) => {
    const map: Record<string, number> = {
      Värnamo: 34,
      Jönköping: 28,
      Gislaved: 19,
      Nässjö: 22,
      Vaggeryd: 15,
    };
    return map[region] ?? 12;
  }, []);

  return {
    pools,
    myPools,
    auctions,
    results,
    isLoading,
    error,
    joinPool,
    createPool,
    voteOnAuction,
    refreshData: loadData,
    totalSavedSEK,
    avgPremiumPercent,
    estimatedEligibleOwners,
  };
}
