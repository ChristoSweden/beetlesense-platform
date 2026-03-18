/**
 * BidManager — View, compare, and manage bids on a job posting.
 *
 * Shows job summary, bid cards, side-by-side comparison mode,
 * and accept/reject actions.
 */

import { useState } from 'react';
import {
  Star,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  MessageSquare,
  GitCompareArrows,
  ArrowLeft,
  Building2,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  SERVICE_LABELS,
  JOB_STATUS_LABELS,
  type JobPosting,
  type JobBid,
} from '@/hooks/useContractorMarketplace';

interface BidManagerProps {
  job: JobPosting;
  onAcceptBid: (jobId: string, bidId: string) => void;
  onRejectBid: (jobId: string, bidId: string) => void;
  onBack: () => void;
}

function BidCard({
  bid,
  isSelected,
  isComparing,
  onToggleCompare,
  onAccept,
  onReject,
  canAccept,
}: {
  bid: JobBid;
  isSelected: boolean;
  isComparing: boolean;
  onToggleCompare: () => void;
  onAccept: () => void;
  onReject: () => void;
  canAccept: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? 'border-[var(--green)]/50 bg-[var(--green)]/5'
          : isComparing
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-[var(--border)] hover:border-[var(--border2)]'
      }`}
      style={{ background: isSelected ? undefined : isComparing ? undefined : 'var(--bg2)' }}
    >
      {/* Contractor info */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-[var(--green)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text)] truncate">
            {bid.contractor_name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-medium text-[var(--text)]">
              {bid.contractor_rating.toFixed(1)}
            </span>
          </div>
        </div>
        {isSelected && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[var(--green)]/15 text-[var(--green)]">
            VALD
          </span>
        )}
      </div>

      {/* Price + Timeline */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign size={11} className="text-[var(--green)]" />
            <span className="text-[9px] font-mono text-[var(--text3)] uppercase">Pris</span>
          </div>
          <span className="text-sm font-semibold font-mono text-[var(--text)]">
            {bid.price_sek.toLocaleString('sv-SE')} kr
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <div className="flex items-center gap-1 mb-1">
            <Clock size={11} className="text-[var(--green)]" />
            <span className="text-[9px] font-mono text-[var(--text3)] uppercase">Tidplan</span>
          </div>
          <span className="text-xs font-medium text-[var(--text)]">{bid.timeline}</span>
        </div>
      </div>

      {/* Included services */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          <Layers size={11} className="text-[var(--text3)]" />
          <span className="text-[9px] font-mono text-[var(--text3)] uppercase">Ingår</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {bid.included_services.map((s, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md text-[10px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          <Wrench size={11} className="text-[var(--text3)]" />
          <span className="text-[9px] font-mono text-[var(--text3)] uppercase">Utrustning</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {bid.equipment.map((eq, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md text-[10px] text-[var(--text3)] bg-[var(--bg3)] border border-[var(--border)]"
            >
              {eq}
            </span>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] mb-3">
        <p className="text-[11px] text-[var(--text2)] leading-relaxed italic">
          &ldquo;{bid.message}&rdquo;
        </p>
        <span className="text-[9px] text-[var(--text3)] mt-1 block">
          {new Date(bid.submitted_at).toLocaleDateString('sv-SE')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {canAccept && !isSelected && (
          <>
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              <CheckCircle2 size={13} />
              Acceptera offert
            </button>
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <XCircle size={13} />
              Avböj
            </button>
          </>
        )}
        <button
          onClick={onToggleCompare}
          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
            isComparing
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
              : 'border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
          }`}
        >
          <GitCompareArrows size={13} />
          Jämför
        </button>
        <button
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors"
        >
          <MessageSquare size={13} />
          Meddelande
        </button>
      </div>
    </div>
  );
}

export function BidManager({ job, onAcceptBid, onRejectBid, onBack }: BidManagerProps) {
  const [comparingIds, setComparingIds] = useState<string[]>([]);

  const toggleCompare = (bidId: string) => {
    setComparingIds((prev) => {
      if (prev.includes(bidId)) return prev.filter((id) => id !== bidId);
      if (prev.length >= 3) return prev; // Max 3
      return [...prev, bidId];
    });
  };

  const comparingBids = job.bids.filter((b) => comparingIds.includes(b.id));
  const canAccept = job.status === 'bids_received' || job.status === 'posted';

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Tillbaka
      </button>

      {/* Job summary */}
      <div className="rounded-xl border border-[var(--border)] p-4 mb-4" style={{ background: 'var(--bg)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{job.parcel_name}</h3>
            <p className="text-[11px] text-[var(--text3)]">
              {job.area_ha} ha
              {job.estimated_volume_m3 && ` · ${job.estimated_volume_m3} m³`}
              {' · '}{job.preferred_timeline}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[var(--green)]/10 text-[var(--green)]">
            {JOB_STATUS_LABELS[job.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {job.services.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
            >
              {SERVICE_LABELS[s]}
            </span>
          ))}
        </div>
        {job.description && (
          <p className="text-[11px] text-[var(--text2)] leading-relaxed">{job.description}</p>
        )}
        {(job.budget_min || job.budget_max) && (
          <p className="text-[11px] text-[var(--text3)] mt-1 font-mono">
            Budget: {job.budget_min?.toLocaleString('sv-SE') ?? '–'} – {job.budget_max?.toLocaleString('sv-SE') ?? '–'} SEK
          </p>
        )}
      </div>

      {/* Comparison table (when 2-3 bids selected) */}
      {comparingBids.length >= 2 && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-4 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <GitCompareArrows size={14} className="text-blue-400" />
            <h4 className="text-xs font-semibold text-blue-400">Jämförelse</h4>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[var(--text3)]">
                <th className="pb-2 pr-3 font-mono uppercase text-[9px]">Aspekt</th>
                {comparingBids.map((b) => (
                  <th key={b.id} className="pb-2 px-2 font-medium text-[var(--text)]">
                    {b.contractor_name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr>
                <td className="py-2 pr-3 text-[var(--text3)]">Pris</td>
                {comparingBids.map((b) => (
                  <td key={b.id} className="py-2 px-2 font-mono font-semibold text-[var(--text)]">
                    {b.price_sek.toLocaleString('sv-SE')} kr
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-[var(--text3)]">Tidplan</td>
                {comparingBids.map((b) => (
                  <td key={b.id} className="py-2 px-2 text-[var(--text)]">{b.timeline}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-[var(--text3)]">Betyg</td>
                {comparingBids.map((b) => (
                  <td key={b.id} className="py-2 px-2 text-[var(--text)]">
                    <span className="flex items-center gap-1">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      {b.contractor_rating.toFixed(1)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-[var(--text3)]">Inkluderat</td>
                {comparingBids.map((b) => (
                  <td key={b.id} className="py-2 px-2 text-[var(--text)]">
                    {b.included_services.length} tjänster
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Bid count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--text)]">
          {job.bids.length} {job.bids.length === 1 ? 'offert' : 'offerter'}
        </span>
        {comparingIds.length > 0 && (
          <button
            onClick={() => setComparingIds([])}
            className="text-[10px] text-blue-400 hover:text-blue-300"
          >
            Rensa jämförelse
          </button>
        )}
      </div>

      {/* Bids */}
      {job.bids.length === 0 ? (
        <div className="py-12 text-center">
          <Clock size={32} className="text-[var(--text3)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text)] font-medium mb-1">Inga offerter ännu</p>
          <p className="text-xs text-[var(--text3)]">
            Entreprenörer kan se din förfrågan och lämna offerter
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {job.bids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              isSelected={job.selected_bid_id === bid.id}
              isComparing={comparingIds.includes(bid.id)}
              onToggleCompare={() => toggleCompare(bid.id)}
              onAccept={() => onAcceptBid(job.id, bid.id)}
              onReject={() => onRejectBid(job.id, bid.id)}
              canAccept={canAccept}
            />
          ))}
        </div>
      )}
    </div>
  );
}
