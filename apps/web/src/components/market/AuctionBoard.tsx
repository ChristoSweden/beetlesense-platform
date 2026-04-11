/**
 * AuctionBoard — Simulated timber auction / bidding interface.
 *
 * Forest owner posts available timber volume + species + location.
 * Buyers place bids (demo: auto-generated competing bids).
 * Features countdown timer, bid history, and "Accept best bid" button.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gavel,
  Timer,
  TreePine,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import {
  TIMBER_ASSORTMENTS,
  type TimberAssortment,
} from '@/hooks/useTimberMarket';

// ─── Types ───

interface AuctionLot {
  assortment: TimberAssortment;
  volumeM3: number;
}

interface Bid {
  id: string;
  buyerName: string;
  buyerType: 'major' | 'regional' | 'local';
  pricePerM3: number;
  totalValue: number;
  timestamp: Date;
  isNew?: boolean;
}

type AuctionState = 'setup' | 'live' | 'completed';

// ─── Demo buyer pool ───

const DEMO_BIDDERS = [
  { name: 'Sodra', type: 'major' as const },
  { name: 'SCA', type: 'major' as const },
  { name: 'Holmen', type: 'major' as const },
  { name: 'Stora Enso', type: 'major' as const },
  { name: 'Sveaskog', type: 'major' as const },
  { name: 'Varnamo Sagverk', type: 'local' as const },
  { name: 'Vida Timber', type: 'regional' as const },
  { name: 'Setra Group', type: 'regional' as const },
];

const BASE_BID_RANGES: Record<TimberAssortment, [number, number]> = {
  talltimmer: [680, 830],
  grantimmer: [640, 790],
  massaved_tall: [310, 410],
  massaved_gran: [290, 390],
  bjorkmassa: [330, 440],
};

function randomBid(lot: AuctionLot, existingBids: Bid[]): Bid {
  const [minPrice, maxPrice] = BASE_BID_RANGES[lot.assortment];
  const bidder = DEMO_BIDDERS[Math.floor(Math.random() * DEMO_BIDDERS.length)];

  // Bids tend to climb: use existing max as floor (with some randomness)
  const currentMax = existingBids.length > 0
    ? Math.max(...existingBids.map((b) => b.pricePerM3))
    : minPrice;

  const floor = Math.max(minPrice, currentMax - 10);
  const ceiling = Math.min(maxPrice, currentMax + 25);
  const price = Math.round(floor + Math.random() * (ceiling - floor));

  return {
    id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    buyerName: bidder.name,
    buyerType: bidder.type,
    pricePerM3: price,
    totalValue: Math.round(price * lot.volumeM3),
    timestamp: new Date(),
    isNew: true,
  };
}

// ─── Countdown timer formatting ───

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ───

export function AuctionBoard() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  // Auction setup
  const [lots, setLots] = useState<AuctionLot[]>([
    { assortment: 'talltimmer', volumeM3: 120 },
  ]);
  const [location, setLocation] = useState('Varnamo, Smaland');
  const [durationMinutes, setDurationMinutes] = useState(3);

  // Auction state
  const [auctionState, setAuctionState] = useState<AuctionState>('setup');
  const [bids, setBids] = useState<Bid[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [acceptedBid, setAcceptedBid] = useState<Bid | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bidTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeLot = lots[0]; // Single-lot auction for simplicity

  // ─── Lot management ───

  function addLot() {
    const unused = TIMBER_ASSORTMENTS.find(
      (a) => !lots.some((l) => l.assortment === a.id),
    );
    if (unused) {
      setLots((prev) => [...prev, { assortment: unused.id, volumeM3: 80 }]);
    }
  }

  function removeLot(idx: number) {
    if (lots.length > 1) {
      setLots((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function updateLot(idx: number, field: keyof AuctionLot, value: AuctionLot[keyof AuctionLot]) {
    setLots((prev) => prev.map((lot, i) => (i === idx ? { ...lot, [field]: value } : lot)));
  }

  // ─── Start auction ───

  const startAuction = useCallback(() => {
    setAuctionState('live');
    setBids([]);
    setAcceptedBid(null);
    setTimeLeft(durationMinutes * 60);

    // Generate initial bids (2-3 immediate bids)
    const initialBids: Bid[] = [];
    const numInitial = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numInitial; i++) {
      initialBids.push(randomBid(activeLot, initialBids));
    }
    setBids(initialBids);
  }, [durationMinutes, activeLot]);

  // ─── Timer countdown ───

  useEffect(() => {
    if (auctionState !== 'live') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAuctionState('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auctionState]);

  // ─── Auto-generate competing bids ───

  useEffect(() => {
    if (auctionState !== 'live') return;

    bidTimerRef.current = setInterval(() => {
      setBids((prev) => {
        // Clear "new" flag from previous bids
        const updated = prev.map((b) => ({ ...b, isNew: false }));
        const newBid = randomBid(activeLot, updated);
        return [...updated, newBid];
      });
    }, 4000 + Math.random() * 6000); // Random 4-10s interval

    return () => {
      if (bidTimerRef.current) clearInterval(bidTimerRef.current);
    };
  }, [auctionState, activeLot]);

  // ─── Accept bid ───

  function handleAcceptBid(bid: Bid) {
    setAcceptedBid(bid);
    setAuctionState('completed');
    if (timerRef.current) clearInterval(timerRef.current);
    if (bidTimerRef.current) clearInterval(bidTimerRef.current);
  }

  // Sort bids by price descending
  const sortedBids = [...bids].sort((a, b) => b.pricePerM3 - a.pricePerM3);
  const bestBid = sortedBids[0] ?? null;

  // Timer urgency
  const timerUrgent = timeLeft < 30;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel size={16} className="text-[var(--green)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {lang === 'sv' ? 'Virkesauktion' : 'Timber Auction'}
            </h3>
            <p className="text-[10px] text-[var(--text3)]">
              {lang === 'sv'
                ? 'Lat kopare bjuda pa ditt virke — demo-lage'
                : 'Let buyers bid on your timber — demo mode'}
            </p>
          </div>
        </div>

        {auctionState === 'live' && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timerUrgent ? 'bg-red-500/10' : 'bg-[var(--bg3)]'}`}>
            <Timer size={14} className={timerUrgent ? 'text-red-400 animate-pulse' : 'text-[var(--text3)]'} />
            <span className={`font-mono text-sm font-semibold ${timerUrgent ? 'text-red-400' : 'text-[var(--text)]'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* ═══ SETUP STATE ═══ */}
      {auctionState === 'setup' && (
        <div className="p-4 space-y-4">
          {/* Lots */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
              {lang === 'sv' ? 'Virke att auktionera' : 'Timber to auction'}
            </p>
            <div className="space-y-2">
              {lots.map((lot, idx) => {
                const meta = TIMBER_ASSORTMENTS.find((a) => a.id === lot.assortment)!;
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <TreePine size={14} style={{ color: meta.color }} />
                    <select
                      value={lot.assortment}
                      onChange={(e) => updateLot(idx, 'assortment', e.target.value as TimberAssortment)}
                      className="text-xs bg-transparent text-[var(--text)] border-none outline-none flex-1 cursor-pointer"
                    >
                      {TIMBER_ASSORTMENTS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {lang === 'sv' ? a.nameSv : a.nameEn}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={lot.volumeM3}
                        onChange={(e) => updateLot(idx, 'volumeM3', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg2)] text-xs font-mono text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-[var(--text3)] font-mono pointer-events-none">
                        m&sup3;
                      </span>
                    </div>
                    {lots.length > 1 && (
                      <button onClick={() => removeLot(idx)} className="text-[var(--text3)] hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {lots.length < 5 && (
                <button
                  onClick={addLot}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--green)] hover:text-[var(--green)] px-3 py-2 rounded-lg border border-dashed border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors w-full justify-center"
                >
                  <Plus size={12} /> {lang === 'sv' ? 'Lagg till sortiment' : 'Add assortment'}
                </button>
              )}
            </div>
          </div>

          {/* Location + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
                <MapPin size={10} className="inline mr-1" />
                {lang === 'sv' ? 'Plats' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
                <Timer size={10} className="inline mr-1" />
                {lang === 'sv' ? 'Varaktighet' : 'Duration'}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 cursor-pointer"
              >
                <option value={1}>1 min (demo)</option>
                <option value={3}>3 min</option>
                <option value={5}>5 min</option>
              </select>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startAuction}
            className="w-full py-3 rounded-lg bg-[var(--green)] text-[#030d05] font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Gavel size={16} />
            {lang === 'sv' ? 'Starta auktion' : 'Start Auction'}
          </button>
        </div>
      )}

      {/* ═══ LIVE / COMPLETED STATE ═══ */}
      {(auctionState === 'live' || auctionState === 'completed') && (
        <div className="p-4 space-y-4">
          {/* Auction info bar */}
          <div className="flex items-center gap-4 text-[10px] text-[var(--text3)] flex-wrap">
            <span className="flex items-center gap-1">
              <TreePine size={10} />
              {activeLot.volumeM3} m&sup3;fub {TIMBER_ASSORTMENTS.find((a) => a.id === activeLot.assortment)?.nameSv}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {location}
            </span>
            <span className="flex items-center gap-1">
              {sortedBids.length} {lang === 'sv' ? 'bud' : 'bids'}
            </span>
          </div>

          {/* Accepted bid banner */}
          {acceptedBid && (
            <div className="rounded-lg border border-[var(--green)]/40 bg-[var(--green)]/10 p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-[var(--green)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--green)]">
                  {lang === 'sv' ? 'Bud accepterat!' : 'Bid Accepted!'}
                </p>
                <p className="text-xs text-[var(--text2)]">
                  {acceptedBid.buyerName} &middot; {acceptedBid.pricePerM3} kr/m&sup3;fub &middot;
                  <span className="font-mono font-semibold ml-1">
                    {new Intl.NumberFormat('sv-SE').format(acceptedBid.totalValue)} kr
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Best bid highlight */}
          {bestBid && !acceptedBid && (
            <div className="rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-[var(--green)]">
                  {lang === 'sv' ? 'Hogsta bud' : 'Highest bid'}
                </p>
                <p className="text-lg font-mono font-semibold text-[var(--text)]">
                  {bestBid.pricePerM3} <span className="text-xs text-[var(--text3)]">kr/m&sup3;fub</span>
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {bestBid.buyerName} &middot; {new Intl.NumberFormat('sv-SE').format(bestBid.totalValue)} kr totalt
                </p>
              </div>
              {auctionState === 'live' && (
                <button
                  onClick={() => handleAcceptBid(bestBid)}
                  className="px-4 py-2 rounded-lg bg-[var(--green)] text-[#030d05] font-semibold text-xs hover:brightness-110 transition-all"
                >
                  {lang === 'sv' ? 'Acceptera' : 'Accept'}
                </button>
              )}
            </div>
          )}

          {/* Bid list */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
              {lang === 'sv' ? 'Budhistorik' : 'Bid history'}
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {sortedBids.map((bid, i) => {
                const isTop = i === 0;
                return (
                  <div
                    key={bid.id}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all
                      ${bid.isNew ? 'animate-pulse border-[var(--green)]/40 bg-[var(--green)]/5' : 'border-[var(--border)]'}
                      ${isTop ? 'border-[var(--green)]/30' : ''}
                      ${acceptedBid?.id === bid.id ? 'border-[var(--green)] bg-[var(--green)]/10' : ''}
                    `}
                    style={!bid.isNew && !isTop && acceptedBid?.id !== bid.id ? { background: 'var(--bg)' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {isTop && <TrendingUp size={12} className="text-[var(--green)]" />}
                      <span className={`font-medium ${isTop ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>
                        {bid.buyerName}
                      </span>
                      <span className="text-[8px] text-[var(--text3)] px-1.5 py-0.5 rounded bg-[var(--bg3)]">
                        {bid.buyerType === 'major'
                          ? (lang === 'sv' ? 'Stor' : 'Major')
                          : bid.buyerType === 'local'
                          ? (lang === 'sv' ? 'Lokal' : 'Local')
                          : (lang === 'sv' ? 'Regional' : 'Regional')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--text2)]">
                        {new Intl.NumberFormat('sv-SE').format(bid.totalValue)} kr
                      </span>
                      <span className={`font-mono font-semibold ${isTop ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {bid.pricePerM3} kr/m&sup3;
                      </span>
                      {auctionState === 'live' && !acceptedBid && (
                        <button
                          onClick={() => handleAcceptBid(bid)}
                          className="text-[9px] px-2 py-0.5 rounded border border-[var(--green)]/30 text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                        >
                          {lang === 'sv' ? 'Acceptera' : 'Accept'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedBids.length === 0 && (
                <p className="text-center text-[var(--text3)] text-xs py-4">
                  {lang === 'sv' ? 'Vantar pa bud...' : 'Waiting for bids...'}
                </p>
              )}
            </div>
          </div>

          {/* Auction ended: restart */}
          {auctionState === 'completed' && (
            <button
              onClick={() => { setAuctionState('setup'); setBids([]); setAcceptedBid(null); }}
              className="w-full py-2.5 rounded-lg border border-[var(--border)] text-[var(--text2)] text-xs hover:bg-[var(--bg3)] transition-colors"
            >
              {lang === 'sv' ? 'Ny auktion' : 'New Auction'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
