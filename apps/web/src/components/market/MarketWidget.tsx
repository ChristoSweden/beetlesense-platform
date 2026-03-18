import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { ASSORTMENTS, getPriceChange, getHarvestRecommendation } from '@/services/timberMarketService';

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const SIGNAL_COLORS = {
  harvest: '#4ade80',
  wait: '#fbbf24',
  poor: '#f87171',
};

export function MarketWidget() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  // Show top 2 assortments
  const topAssortments = ASSORTMENTS.slice(0, 2);
  const rec = getHarvestRecommendation();
  const signalColor = SIGNAL_COLORS[rec.signal];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('market.widget.title')}
          </h3>
        </div>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold"
          style={{
            background: `${signalColor}15`,
            color: signalColor,
          }}
        >
          {lang === 'sv'
            ? rec.signal === 'harvest' ? 'Gynnsamt' : rec.signal === 'wait' ? 'Avvakta' : 'Ogynnsamt'
            : rec.signal === 'harvest' ? 'Favorable' : rec.signal === 'wait' ? 'Wait' : 'Unfavorable'
          }
        </span>
      </div>

      {/* Price cards */}
      <div className="space-y-2 mb-3">
        {topAssortments.map((a) => {
          const change = getPriceChange(a);
          const Icon = TREND_ICONS[change.direction];
          const changeColor =
            change.direction === 'up' ? '#4ade80' : change.direction === 'down' ? '#f87171' : 'var(--text3)';

          return (
            <div
              key={a.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--bg)' }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[11px] font-medium text-[var(--text)]">
                  {lang === 'sv' ? a.nameSv : a.nameEn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--text)]">
                  {a.currentPrice} kr
                </span>
                <div className="flex items-center gap-0.5" style={{ color: changeColor }}>
                  <Icon size={12} />
                  <span className="text-[10px] font-mono">
                    {change.direction === 'flat' ? '0%' : `${change.percent}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to full market page */}
      <Link
        to="/owner/timber-market"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('market.widget.viewMarket')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
