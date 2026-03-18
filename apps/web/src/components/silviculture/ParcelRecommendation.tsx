/**
 * ParcelRecommendation — Per-parcel strategy recommendation.
 *
 * Shows suitability scores per strategy, recommended strategy with reasoning,
 * "Varfor inte trakthygge har?" explanation, and 20-year intervention timeline.
 */

import { useState } from 'react';
import {
  MapPin,
  TreePine,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
} from 'lucide-react';
import type {
  Strategy,
  ParcelSuitability,
} from '@/hooks/useSilviculture';

interface Props {
  suitabilities: ParcelSuitability[];
  strategies: Strategy[];
  selectedParcelId: string;
  onSelectParcel: (id: string) => void;
}

function formatSEK(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M SEK`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k SEK`;
  return `${value} SEK`;
}

function ScoreBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text3)] w-20 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--bg3)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--text2)] w-8 text-right">{score}</span>
    </div>
  );
}

export function ParcelRecommendation({
  suitabilities,
  strategies,
  selectedParcelId,
  onSelectParcel,
}: Props) {
  const [showTimeline, setShowTimeline] = useState(true);
  const [showWhyNot, setShowWhyNot] = useState(false);

  const selected = suitabilities.find(s => s.parcelId === selectedParcelId) ?? suitabilities[0];
  const recStrat = strategies.find(s => s.id === selected.recommended)!;

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={16} className="text-[var(--green)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Parcel Recommendations</h2>
      </div>
      <p className="text-[10px] text-[var(--text3)] mb-4">
        Per-parcel strategy suitability based on species, soil, terrain, and size
      </p>

      {/* Parcel selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {suitabilities.map(suit => {
          const isActive = suit.parcelId === selected.parcelId;
          return (
            <button
              key={suit.parcelId}
              onClick={() => onSelectParcel(suit.parcelId)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg border text-left transition-all ${
                isActive
                  ? 'border-[var(--green)] bg-[var(--green)]/10'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
              style={{ background: isActive ? undefined : 'var(--bg3)' }}
            >
              <p className="text-[11px] font-medium text-[var(--text)]">{suit.parcelName}</p>
              <p className="text-[9px] text-[var(--text3)]">
                {suit.areaHa} ha &middot; {suit.species.split(',')[0]}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected parcel info */}
      <div className="p-3 rounded-lg bg-[var(--bg3)] mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">{selected.parcelName}</p>
            <p className="text-[10px] text-[var(--text3)]">
              {selected.areaHa} ha &middot; {selected.species}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${recStrat.color}20` }}>
            <Star size={10} style={{ color: recStrat.color }} />
            <span className="text-[10px] font-medium" style={{ color: recStrat.color }}>
              {recStrat.shortName}
            </span>
          </div>
        </div>
      </div>

      {/* Suitability scores */}
      <div className="space-y-2 mb-4">
        <p className="text-[10px] font-medium text-[var(--text2)]">Suitability Scores</p>
        {strategies.map(strat => (
          <ScoreBar
            key={strat.id}
            score={selected.scores[strat.id]}
            color={strat.color}
            label={strat.shortName}
          />
        ))}
      </div>

      {/* Recommendation reasoning */}
      <div className="p-3 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5 mb-3">
        <div className="flex items-start gap-2">
          <TreePine size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-[var(--text)]">
              Recommended: {recStrat.nameSv}
            </p>
            <p className="text-[10px] text-[var(--text2)] mt-1">{selected.reasoningSv}</p>
          </div>
        </div>
      </div>

      {/* Why not clearcut */}
      <button
        onClick={() => setShowWhyNot(!showWhyNot)}
        className="flex items-center gap-1.5 w-full p-2.5 rounded-lg border border-[var(--red)]/20 hover:bg-[var(--red)]/5 transition-colors mb-3"
      >
        <AlertCircle size={14} className="text-[var(--red)]" />
        <span className="text-[11px] font-medium text-[var(--text)] flex-1 text-left">
          Varfor inte trakthygge har?
        </span>
        {showWhyNot ? <ChevronUp size={14} className="text-[var(--text3)]" /> : <ChevronDown size={14} className="text-[var(--text3)]" />}
      </button>
      {showWhyNot && (
        <div className="p-3 rounded-lg bg-[var(--red)]/5 border border-[var(--red)]/15 mb-3">
          <p className="text-[10px] text-[var(--text2)]">{selected.whyNotClearcutSv}</p>
          <p className="text-[9px] text-[var(--text3)] mt-2 italic">{selected.whyNotClearcut}</p>
        </div>
      )}

      {/* Generate management plan button */}
      <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-semibold hover:opacity-90 transition-opacity mb-4">
        <FileText size={14} />
        Generera skotselplan
      </button>

      {/* 20-year intervention timeline */}
      <div>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center gap-1.5 mb-3"
        >
          <Calendar size={14} className="text-[var(--text3)]" />
          <span className="text-[11px] font-medium text-[var(--text)]">
            20-Year Intervention Timeline
          </span>
          {showTimeline ? <ChevronUp size={12} className="text-[var(--text3)]" /> : <ChevronDown size={12} className="text-[var(--text3)]" />}
        </button>

        {showTimeline && (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--border)]" />

            <div className="space-y-2.5">
              {selected.interventions.map((intervention, i) => {
                const net = intervention.estimatedRevenueSEK - intervention.estimatedCostSEK;
                const isPositive = net > 0;

                return (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-[9px] font-mono font-semibold border"
                      style={{
                        background: isPositive ? 'var(--green)' : 'var(--bg3)',
                        color: isPositive ? '#030d05' : 'var(--text3)',
                        borderColor: isPositive ? 'var(--green)' : 'var(--border)',
                      }}
                    >
                      {intervention.year}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[var(--text)]">
                        {intervention.actionSv}
                      </p>
                      <p className="text-[9px] text-[var(--text3)]">{intervention.detailsSv}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {intervention.estimatedCostSEK > 0 && (
                          <span className="text-[9px] font-mono text-[var(--red)]">
                            -{formatSEK(intervention.estimatedCostSEK)}
                          </span>
                        )}
                        {intervention.estimatedRevenueSEK > 0 && (
                          <span className="text-[9px] font-mono text-[var(--green)]">
                            +{formatSEK(intervention.estimatedRevenueSEK)}
                          </span>
                        )}
                        {net !== 0 && (
                          <span className={`text-[9px] font-mono font-semibold ${isPositive ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                            Net: {isPositive ? '+' : ''}{formatSEK(net)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
