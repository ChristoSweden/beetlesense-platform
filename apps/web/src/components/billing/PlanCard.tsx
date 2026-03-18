import { useState } from 'react';
import { Check, Crown, Sparkles, Building2 } from 'lucide-react';
import type { PlanId } from '@/stores/billingStore';

interface PlanCardProps {
  planId: PlanId;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
}

const PLAN_ICONS: Record<PlanId, typeof Crown> = {
  gratis: Sparkles,
  pro: Crown,
  enterprise: Building2,
};

export default function PlanCard({
  planId,
  name,
  price,
  currency,
  interval,
  features,
  isCurrent,
  isPopular,
  onSelect,
  disabled,
}: PlanCardProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = PLAN_ICONS[planId];

  const isEnterprise = planId === 'enterprise';
  const isUpgrade =
    !isCurrent &&
    (planId === 'pro' || planId === 'enterprise');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative flex flex-col rounded-2xl border p-6 transition-all duration-200
        ${isCurrent
          ? 'border-emerald-500/60 bg-emerald-950/30 shadow-lg shadow-emerald-900/20'
          : hovered
            ? 'border-emerald-600/40 bg-[#071a0b] -translate-y-1 shadow-xl shadow-emerald-900/10'
            : 'border-[var(--border)] bg-[var(--bg2)]'
        }
      `}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-[#030d05] text-[10px] font-bold uppercase tracking-wider">
          Populärast
        </div>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
          Nuvarande plan
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-2 mb-4 mt-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isCurrent ? 'bg-emerald-500/20' : 'bg-emerald-900/30'
        }`}>
          <Icon size={18} className={isCurrent ? 'text-emerald-400' : 'text-emerald-600'} />
        </div>
        <h3 className="text-lg font-serif font-bold text-[var(--text)]">{name}</h3>
      </div>

      {/* Price */}
      <div className="mb-5">
        {isEnterprise ? (
          <p className="text-2xl font-bold text-[var(--text)]">Kontakta oss</p>
        ) : price === 0 ? (
          <p className="text-2xl font-bold text-[var(--text)]">
            Gratis
          </p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[var(--text)]">{price}</span>
            <span className="text-sm text-[var(--text3)]">{currency}/{interval}</span>
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2.5 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-[var(--text2)]">
            <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action button */}
      <button
        onClick={() => onSelect(planId)}
        disabled={disabled || isCurrent}
        className={`
          w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
          ${isCurrent
            ? 'bg-emerald-900/30 text-emerald-500/60 cursor-default'
            : isEnterprise
              ? 'bg-white/10 text-[var(--text)] hover:bg-white/15 border border-[var(--border)]'
              : isUpgrade
                ? 'bg-emerald-500 text-[#030d05] hover:bg-emerald-400 shadow-lg shadow-emerald-900/30'
                : 'bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--bg3)]/80 border border-[var(--border)]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isCurrent
          ? 'Nuvarande plan'
          : isEnterprise
            ? 'Kontakta sälj'
            : isUpgrade
              ? 'Uppgradera'
              : 'Nedgradera'}
      </button>
    </div>
  );
}
