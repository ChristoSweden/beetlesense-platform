import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, TrendingDown, ArrowRight } from 'lucide-react';
import {
  frameLossAversion,
  estimateTimberValue,
  type LossAversionFrame,
} from '@/services/behavioralFraming';

interface LossAversionCardProps {
  /** Total timber value in SEK */
  totalValue?: number;
  /** Area in hectares (used to estimate value if totalValue not provided) */
  areaHa?: number;
  /** Percentage of value at risk (0-1), default 0.06 */
  riskFraction?: number;
  /** 12-month projected loss fraction if no action, default 0.14 */
  inactionLossFraction?: number;
  /** Trend direction */
  trend?: 'rising' | 'stable' | 'falling';
  /** CTA click handler */
  onProtect?: () => void;
}

function useCountUp(target: number, duration: number = 1400): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    startRef.current = null;
    setValue(0);

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export function LossAversionCard({
  totalValue,
  areaHa = 42.5,
  riskFraction = 0.06,
  inactionLossFraction = 0.14,
  trend = 'stable',
  onProtect,
}: LossAversionCardProps) {
  const value = totalValue ?? estimateTimberValue(areaHa);
  const atRisk = Math.round(value * riskFraction);
  const inactionLoss = Math.round(value * inactionLossFraction);

  const frame: LossAversionFrame = frameLossAversion('timberValue', value, { trend });

  const animatedValue = useCountUp(value);
  const animatedRisk = useCountUp(atRisk);

  const urgencyColor =
    frame.urgency === 'high'
      ? 'var(--red, #ef4444)'
      : frame.urgency === 'medium'
        ? 'var(--amber, #f59e0b)'
        : 'var(--green, #22c55e)';

  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{
        background: 'var(--bg2, #0a1f0d)',
        borderColor: 'var(--border, #1a3a1f)',
      }}
    >
      {/* Subtle gradient accent based on urgency */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: urgencyColor }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#22c55e15', color: '#22c55e' }}
        >
          <ShieldAlert size={18} />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3, #6b7280)' }}>
          Ditt virkesvärde
        </span>
      </div>

      {/* Total value — big green number */}
      <div className="mb-4">
        <p
          className="text-3xl font-bold font-mono tracking-tight"
          style={{ color: '#22c55e' }}
        >
          {animatedValue.toLocaleString('sv-SE')} kr
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text3, #6b7280)' }}>
          Uppskattat virkesvärde
        </p>
      </div>

      {/* Divider */}
      <div className="h-px w-full mb-4" style={{ background: 'var(--border, #1a3a1f)' }} />

      {/* At risk — amber/red */}
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown size={14} style={{ color: urgencyColor }} />
        <p className="text-lg font-semibold font-mono" style={{ color: urgencyColor }}>
          {animatedRisk.toLocaleString('sv-SE')} kr hotat
        </p>
      </div>

      {/* Inaction consequence — red small text */}
      <p className="text-xs mb-5" style={{ color: 'var(--red, #ef4444)', opacity: 0.85 }}>
        Utan åtgärd: {inactionLoss.toLocaleString('sv-SE')} kr förlorat inom 12 månader
      </p>

      {/* CTA */}
      <button
        onClick={onProtect}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          color: '#fff',
        }}
      >
        Skydda ditt värde
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
