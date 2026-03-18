/**
 * LiveAuction — Real-time auction interface for collective timber pools.
 */

import { useState, useEffect } from 'react';
import { Gavel, Clock, TrendingUp, Truck, AlertCircle, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { LiveAuction as LiveAuctionType, AuctionBid } from '@/hooks/useGroupSelling';

interface LiveAuctionProps {
  auction: LiveAuctionType;
  onVote: (auctionId: string, accept: boolean) => void;
}

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Avslutad';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatSEK(n: number): string {
  return n.toLocaleString('sv-SE') + ' SEK';
}

function BidRow({ bid, volumeM3: _volumeM3 }: { bid: AuctionBid; volumeM3: number }) {
  const date = new Date(bid.submittedAt);
  const timeStr = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) + ' ' + date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        bid.isLeading
          ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
          : 'border-[var(--border)] bg-[var(--bg)]'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text)]">{bid.buyerName}</span>
          {bid.isLeading && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--green)]/15 text-[var(--green)]">
              Ledande bud
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)]">
            {bid.buyerType === 'major' ? 'Stor' : bid.buyerType === 'regional' ? 'Regional' : 'Lokal'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <p className="text-[10px] text-[var(--text3)]">Pris/m³</p>
          <p className="text-sm font-mono font-semibold text-[var(--text)]">{bid.pricePerm3} SEK</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)]">Totalvärde</p>
          <p className="text-sm font-mono text-[var(--text)]">{formatSEK(bid.totalValue)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)]">Transport</p>
          <div className="flex items-center gap-1">
            <Truck size={11} className={bid.transportIncluded ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
            <p className="text-xs text-[var(--text2)]">{bid.transportIncluded ? 'Inkl.' : 'Ej inkl.'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[var(--text3)] italic flex-1">{bid.conditions}</p>
        <p className="text-[10px] text-[var(--text3)] ml-2 flex-shrink-0">{timeStr}</p>
      </div>
    </div>
  );
}

export function LiveAuctionCard({ auction, onVote }: LiveAuctionProps) {
  const [countdown, setCountdown] = useState(formatCountdown(auction.endsAt));
  const [expanded, setExpanded] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(formatCountdown(auction.endsAt)), 60000);
    return () => clearInterval(iv);
  }, [auction.endsAt]);

  const bestBid = auction.bids.find((b) => b.isLeading);
  const sortedBids = [...auction.bids].sort((a, b) => b.pricePerm3 - a.pricePerm3);
  const totalVotes = auction.memberVotes.accept + auction.memberVotes.reject + auction.memberVotes.pending;
  const acceptPct = totalVotes > 0 ? Math.round((auction.memberVotes.accept / totalVotes) * 100) : 0;

  const handleVote = (accept: boolean) => {
    if (hasVoted) return;
    setHasVoted(true);
    onVote(auction.id, accept);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Auction header */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gavel size={16} className="text-[var(--yellow)]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">{auction.poolName}</h3>
            </div>
            <p className="text-xs text-[var(--text3)]">{auction.assortmentLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--yellow)]/10">
            <Clock size={12} className="text-[var(--yellow)]" />
            <span className="text-xs font-mono font-medium text-[var(--yellow)]">{countdown}</span>
          </div>
        </div>

        {/* Pool summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-lg bg-[var(--bg)]">
            <p className="text-[10px] text-[var(--text3)]">Volym</p>
            <p className="text-sm font-mono font-medium text-[var(--text)]">{auction.volumeM3.toLocaleString('sv-SE')} m³</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg)]">
            <p className="text-[10px] text-[var(--text3)]">Minimipris</p>
            <p className="text-sm font-mono font-medium text-[var(--text)]">{auction.minimumPriceM3} SEK/m³</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg)]">
            <p className="text-[10px] text-[var(--text3)]">Auto-accept</p>
            <p className="text-sm font-mono font-medium text-[var(--green)]">{auction.autoAcceptPriceM3} SEK/m³</p>
          </div>
        </div>

        <p className="text-[10px] text-[var(--text3)] mt-2">{auction.region} — {auction.deliveryTerms}</p>
      </div>

      {/* Best bid highlight */}
      {bestBid && (
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--green)]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[var(--green)]" />
              <span className="text-xs font-medium text-[var(--green)]">Ledande bud</span>
            </div>
            <span className="text-base font-mono font-bold text-[var(--green)]">
              {bestBid.pricePerm3} SEK/m³
            </span>
          </div>
          <p className="text-xs text-[var(--text2)] mt-0.5">
            {bestBid.buyerName} — totalt {formatSEK(bestBid.totalValue)}
          </p>
        </div>
      )}

      {/* Bid list */}
      <div className="p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="text-xs font-semibold text-[var(--text2)]">
            {auction.bids.length} bud mottagna
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </button>

        {expanded && (
          <div className="space-y-2 mb-4">
            {sortedBids.map((bid) => (
              <BidRow key={bid.id} bid={bid} volumeM3={auction.volumeM3} />
            ))}
          </div>
        )}

        {/* Member voting */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text)]">Omröstning bland poolmedlemmar</span>
            <span className="text-[10px] text-[var(--text3)]">{acceptPct}% accepterar</span>
          </div>

          {/* Vote bar */}
          <div className="h-2 rounded-full flex overflow-hidden mb-3" style={{ background: 'var(--bg3)' }}>
            <div
              className="h-full bg-[var(--green)] transition-all"
              style={{ width: `${(auction.memberVotes.accept / totalVotes) * 100}%` }}
            />
            <div
              className="h-full bg-[var(--red)] transition-all"
              style={{ width: `${(auction.memberVotes.reject / totalVotes) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--text3)] mb-3">
            <span>{auction.memberVotes.accept} accepterar</span>
            <span>{auction.memberVotes.pending} väntar</span>
            <span>{auction.memberVotes.reject} avslår</span>
          </div>

          {!hasVoted ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleVote(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20 border border-[var(--green)]/20 transition-colors"
              >
                <ThumbsUp size={12} />
                Acceptera bud
              </button>
              <button
                onClick={() => handleVote(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 border border-[var(--red)]/20 transition-colors"
              >
                <ThumbsDown size={12} />
                Avslå
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--bg3)]">
              <AlertCircle size={12} className="text-[var(--text3)]" />
              <span className="text-xs text-[var(--text3)]">Din röst har registrerats</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
