/**
 * NegotiationPrep — AI-powered negotiation preparation center.
 * Shows intelligence briefing, fair price range, leverage points, timing advice, and talking points.
 */

import { useState } from 'react';
import {
  Shield,
  Target,
  Brain,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Zap,
  Scale,
  ArrowRight,
  Users,
  AlertTriangle,
} from 'lucide-react';
import type { MillWithDistance, NegotiationBrief } from '@/hooks/useMillDemand';

interface NegotiationPrepProps {
  mills: MillWithDistance[];
  getNegotiationBrief: (millId: string, assortment: string) => NegotiationBrief | null;
  initialMillId?: string | null;
  initialAssortment?: string | null;
}

export function NegotiationPrep({
  mills,
  getNegotiationBrief,
  initialMillId,
  initialAssortment,
}: NegotiationPrepProps) {
  const [selectedMill, setSelectedMill] = useState<string>(initialMillId ?? '');
  const [selectedAssortment, setSelectedAssortment] = useState<string>(initialAssortment ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['leverage', 'price', 'timing', 'script'])
  );

  const mill = mills.find((m) => m.id === selectedMill);
  const assortments = mill?.assortments ?? [];
  const brief = selectedMill && selectedAssortment ? getNegotiationBrief(selectedMill, selectedAssortment) : null;

  const toggleSection = (s: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  // Reset assortment when mill changes
  const handleMillChange = (id: string) => {
    setSelectedMill(id);
    setSelectedAssortment('');
  };

  return (
    <div className="space-y-5">
      {/* Selector */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Välj köpare & sortiment</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">Bruk/Sågverk</label>
            <select
              value={selectedMill}
              onChange={(e) => handleMillChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)]"
              style={{ background: 'var(--bg3)' }}
            >
              <option value="">Välj köpare...</option>
              {mills.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.company} {m.name} ({m.distanceKm} km)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">Sortiment</label>
            <select
              value={selectedAssortment}
              onChange={(e) => setSelectedAssortment(e.target.value)}
              disabled={!selectedMill}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] disabled:opacity-50"
              style={{ background: 'var(--bg3)' }}
            >
              <option value="">Välj sortiment...</option>
              {assortments.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.currentPrice} SEK/{a.unit})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!brief && selectedMill && selectedAssortment && (
        <div className="text-center py-8 text-sm text-[var(--text3)]">Laddar förhandlingsinformation...</div>
      )}

      {!brief && !selectedMill && (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center" style={{ background: 'var(--bg2)' }}>
          <Brain size={32} className="mx-auto text-[var(--text3)] mb-3" />
          <p className="text-sm text-[var(--text)]">Välj en köpare och ett sortiment ovan</p>
          <p className="text-xs text-[var(--text3)] mt-1">
            Så genererar vi en komplett förhandlingsbriefing med prisdata, hävstångspunkter och samtalsmanus.
          </p>
        </div>
      )}

      {brief && (
        <>
          {/* Buyer Needs You More indicator */}
          {brief.buyerNeedsYouMore && (
            <div
              className="rounded-xl border border-[var(--green)]/30 p-4 flex items-center gap-3"
              style={{ background: 'rgba(74,222,128,0.08)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--green)]/15">
                <Zap size={20} className="text-[var(--green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--green)]">
                  Köparen behöver ditt virke mer än du behöver deras pris
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  {brief.millName} kör på {mills.find((m) => m.id === brief.millId)?.utilization}% kapacitet med hög efterfrågan — du har övertaget.
                </p>
              </div>
            </div>
          )}

          {/* Intelligence Briefing */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-[var(--green)]" />
                <h3 className="text-sm font-semibold text-[var(--text)]">Underrättelsebriefing</h3>
              </div>
              <p className="text-xs text-[var(--text)] leading-relaxed">{brief.buyerPosition}</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-[var(--yellow)]" />
                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                  Köparens BATNA (bästa alternativ)
                </span>
              </div>
              <p className="text-xs text-[var(--text2)]">{brief.buyerBATNA}</p>
            </div>
          </div>

          {/* Leverage Points */}
          <CollapsibleSection
            title="Dina hävstångspunkter"
            icon={<Scale size={16} className="text-[var(--green)]" />}
            isOpen={expandedSections.has('leverage')}
            onToggle={() => toggleSection('leverage')}
          >
            <div className="space-y-2">
              {brief.yourLeverage.map((lev, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'var(--bg3)' }}>
                  <div className="w-5 h-5 rounded-full bg-[var(--green)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-mono text-[var(--green)]">{i + 1}</span>
                  </div>
                  <p className="text-xs text-[var(--text)]">{lev}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Fair Price Range */}
          <CollapsibleSection
            title="Rimlig prisintervall"
            icon={<Target size={16} className="text-[var(--green)]" />}
            isOpen={expandedSections.has('price')}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-3">
              <div className="flex items-stretch gap-1 h-16">
                {/* Low */}
                <div className="flex-1 rounded-l-lg flex flex-col items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <span className="text-[10px] text-[var(--text3)]">Lågt</span>
                  <span className="text-sm font-mono font-semibold text-[var(--red)]">{brief.fairPriceRange.low}</span>
                  <span className="text-[9px] text-[var(--text3)]">SEK/{brief.fairPriceRange.unit}</span>
                </div>
                {/* Mid */}
                <div className="flex-1 flex flex-col items-center justify-center border-y-2 border-[var(--green)]/30" style={{ background: 'rgba(251,191,36,0.1)' }}>
                  <span className="text-[10px] text-[var(--text3)]">Marknadspris</span>
                  <span className="text-sm font-mono font-semibold text-[var(--yellow)]">{brief.fairPriceRange.mid}</span>
                  <span className="text-[9px] text-[var(--text3)]">SEK/{brief.fairPriceRange.unit}</span>
                </div>
                {/* High */}
                <div className="flex-1 rounded-r-lg flex flex-col items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
                  <span className="text-[10px] text-[var(--text3)]">Mål</span>
                  <span className="text-sm font-mono font-semibold text-[var(--green)]">{brief.fairPriceRange.high}</span>
                  <span className="text-[9px] text-[var(--text3)]">SEK/{brief.fairPriceRange.unit}</span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text3)]">
                Baserat på aktuella marknadspriser, brukets beläggning, och konkurrerande bud.
              </p>

              {/* Competing offers */}
              {brief.competingOffers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-[var(--text3)]" />
                    <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                      Konkurrerande priser (hävstång)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {brief.competingOffers.map((co) => (
                      <div key={co.mill} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg3)' }}>
                        <span className="text-xs text-[var(--text)]">{co.mill}</span>
                        <span className="text-xs font-mono text-[var(--text)]">{co.price} SEK</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Timing Advice */}
          <CollapsibleSection
            title="Timing"
            icon={<Clock size={16} className="text-[var(--green)]" />}
            isOpen={expandedSections.has('timing')}
            onToggle={() => toggleSection('timing')}
          >
            <div className="p-3 rounded-lg border border-[var(--green)]/20" style={{ background: 'rgba(74,222,128,0.05)' }}>
              <p className="text-xs text-[var(--text)] leading-relaxed">{brief.timingAdvice}</p>
            </div>
          </CollapsibleSection>

          {/* Negotiation Script */}
          <CollapsibleSection
            title="Samtalsmanus (svenska)"
            icon={<MessageSquare size={16} className="text-[var(--green)]" />}
            isOpen={expandedSections.has('script')}
            onToggle={() => toggleSection('script')}
          >
            <div className="space-y-2">
              {brief.talkingPoints.map((tp, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
                  <ArrowRight size={12} className="text-[var(--green)] flex-shrink-0 mt-1" />
                  <p className="text-xs text-[var(--text)] italic leading-relaxed">{tp}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}

// ─── Collapsible section helper ───

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-4 hover:bg-[var(--bg3)]/50 transition-colors text-left"
      >
        {icon}
        <span className="text-sm font-semibold text-[var(--text)] flex-1">{title}</span>
        {isOpen ? (
          <ChevronDown size={14} className="text-[var(--text3)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--text3)]" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
