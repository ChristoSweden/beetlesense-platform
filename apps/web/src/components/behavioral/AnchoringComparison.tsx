import { Check, Clock, Scan, ArrowRight } from 'lucide-react';
import { frameAnchoring, type AnchoringFrame } from '@/services/behavioralFraming';

interface AnchoringComparisonProps {
  /** Cost of manual field inspection in SEK */
  manualCost?: number;
  /** Cost of BeetleSense scan in SEK */
  beetlesenseCost?: number;
  /** Manual inspection time in days */
  manualDays?: number;
  /** BeetleSense scan time in minutes */
  beetleSenseMinutes?: number;
  /** Number of trees scanned */
  treeCount?: number;
  /** CTA click handler */
  onGetStarted?: () => void;
}

export function AnchoringComparison({
  manualCost = 48000,
  beetlesenseCost = 4900,
  manualDays = 22,
  beetleSenseMinutes = 30,
  treeCount = 14200,
  onGetStarted,
}: AnchoringComparisonProps) {
  const frame: AnchoringFrame = frameAnchoring(manualCost, beetlesenseCost);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--bg2, #0a1f0d)',
        borderColor: 'var(--border, #1a3a1f)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#22c55e15', color: '#22c55e' }}
        >
          <Scan size={18} />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3, #6b7280)' }}>
          Jämförelse: manuell vs. BeetleSense
        </span>
      </div>

      {/* Cost comparison */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Manual — anchor (big, struck-through) */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3, #6b7280)' }}>
            Manuell inspektion
          </p>
          <p
            className="text-2xl font-bold font-mono line-through"
            style={{ color: 'rgba(239, 68, 68, 0.7)', textDecorationThickness: '2px' }}
          >
            {frame.anchor}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2" style={{ color: 'var(--text3, #6b7280)' }}>
            <Clock size={12} />
            <span className="text-xs font-mono">{manualDays} dagar</span>
          </div>
        </div>

        {/* BeetleSense — solution (green, compelling) */}
        <div
          className="rounded-xl p-4 text-center relative"
          style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
        >
          {/* "Popular" badge */}
          <div
            className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: '#16a34a', color: '#fff' }}
          >
            Smart val
          </div>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3, #6b7280)' }}>
            BeetleSense
          </p>
          <p className="text-2xl font-bold font-mono" style={{ color: '#22c55e' }}>
            {frame.solution}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2" style={{ color: '#22c55e' }}>
            <Clock size={12} />
            <span className="text-xs font-mono">{beetleSenseMinutes} minuter</span>
          </div>
        </div>
      </div>

      {/* Savings callout */}
      <div
        className="rounded-xl px-4 py-3 mb-4 text-center"
        style={{ background: 'rgba(34, 197, 94, 0.08)' }}
      >
        <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
          {frame.savings}
        </p>
      </div>

      {/* Tree X-ray count */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2">
          <Scan size={14} style={{ color: '#22c55e' }} />
          <span className="text-xs" style={{ color: 'var(--text3, #6b7280)' }}>
            Trädröntgen
          </span>
        </div>
        <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text, #e5e7eb)' }}>
          {treeCount.toLocaleString('sv-SE')} träd analyserade
        </span>
      </div>

      {/* Feature checklist */}
      <div className="space-y-2 mb-5">
        {[
          'Automatisk trädräkning med AI',
          'Stressdetektion i realtid',
          'Virkesvärdeskattning',
          'Granbarkborre-riskanalys',
        ].map((feat) => (
          <div key={feat} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#16a34a', color: '#fff' }}
            >
              <Check size={10} strokeWidth={3} />
            </div>
            <span className="text-xs" style={{ color: 'var(--text2, #a1a1aa)' }}>{feat}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          color: '#fff',
        }}
      >
        Boka din trädröntgen
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
export default AnchoringComparison;
