import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Bug,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import type { MarketIntelligenceData } from '@/services/benchmarkService';
import { formatNumber } from '@/services/benchmarkService';

interface MarketIntelligenceProps {
  data: MarketIntelligenceData;
  countyName: string;
}

export function MarketIntelligence({ data, countyName }: MarketIntelligenceProps) {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';

  const riskColors: Record<string, string> = {
    low: '#4ade80',
    moderate: '#fbbf24',
    high: '#ef4444',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('benchmark.marketIntelligence')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Harvest Volumes */}
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <TreePine size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text)]">
                {t('benchmark.harvestVolumes')}
              </h4>
              <p className="text-[10px] text-[var(--text3)]">{countyName}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono text-[var(--text)]">
              {formatNumber(data.harvestVolumes.currentSeason)}
            </span>
            <span className="text-xs text-[var(--text3)]">{data.harvestVolumes.unit}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[var(--text3)]">
              {t('benchmark.previousSeason')}: {formatNumber(data.harvestVolumes.previousSeason)}
            </span>
            <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp size={10} />
              +{data.harvestVolumes.changePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Beetle Damage */}
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${riskColors[data.beetleDamage.riskLevel]}15` }}>
              <Bug size={16} style={{ color: riskColors[data.beetleDamage.riskLevel] }} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text)]">
                {t('benchmark.beetleDamage')}
              </h4>
              <p className="text-[10px] text-[var(--text3)]">{countyName}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono text-[var(--text)]">
              {formatNumber(data.beetleDamage.affectedHectares)}
            </span>
            <span className="text-xs text-[var(--text3)]">ha</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[var(--text3)]">
              {t('benchmark.previousYear')}: {formatNumber(data.beetleDamage.previousYear)} ha
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ color: '#ef4444', background: '#ef444415' }}>
              <AlertTriangle size={10} />
              +{data.beetleDamage.changePercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                color: riskColors[data.beetleDamage.riskLevel],
                background: `${riskColors[data.beetleDamage.riskLevel]}15`,
              }}
            >
              {t(`benchmark.risk.${data.beetleDamage.riskLevel}`)}
            </span>
          </div>
        </div>

        {/* Timber Price Trends */}
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <TrendingUp size={16} className="text-[var(--green)]" />
            </div>
            <h4 className="text-xs font-semibold text-[var(--text)]">
              {t('benchmark.priceTrends')}
            </h4>
          </div>
          <div className="space-y-2">
            {data.priceTrends.map((price) => (
              <div key={price.species} className="flex items-center justify-between">
                <span className="text-xs text-[var(--text2)]">
                  {isSv ? price.speciesSv : price.species}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text)]">
                    {formatNumber(price.currentPrice)} {price.unit.split('/')[0]}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5"
                    style={{
                      color: price.changePercent >= 0 ? '#4ade80' : '#ef4444',
                      background: price.changePercent >= 0 ? '#4ade8015' : '#ef444415',
                    }}
                  >
                    {price.changePercent >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <CalendarDays size={16} className="text-[var(--green)]" />
            </div>
            <h4 className="text-xs font-semibold text-[var(--text)]">
              {t('benchmark.upcomingEvents')}
            </h4>
          </div>
          <div className="space-y-2.5">
            {data.events.map((event) => {
              const eventDate = new Date(event.date);
              const dateStr = eventDate.toLocaleDateString(isSv ? 'sv-SE' : 'en-GB', {
                day: 'numeric',
                month: 'short',
              });
              const typeColors: Record<string, string> = {
                auction: '#4ade80',
                seminar: '#60a5fa',
                inspection: '#fbbf24',
                market: '#a78bfa',
              };
              return (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="text-center min-w-[36px]">
                    <span className="text-[10px] font-mono text-[var(--text3)] block">{dateStr}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {isSv ? event.titleSv : event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text3)]">{event.location}</span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          color: typeColors[event.type] ?? 'var(--text3)',
                          background: `${typeColors[event.type] ?? 'var(--bg3)'}15`,
                        }}
                      >
                        {t(`benchmark.eventType.${event.type}`)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
