import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wind, ExternalLink, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { getStormHistory } from '@/services/stormRiskService';

export function StormHistory() {
  const { t } = useTranslation();
  const storms = getStormHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpanded(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function getDamageColor(damage: number): string {
    if (damage >= 50) return '#ef4444';
    if (damage >= 10) return '#f97316';
    if (damage >= 5) return '#fbbf24';
    return '#4ade80';
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              {t('storm.history.title')}
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('storm.history.subtitle')}
            </p>
          </div>
          <Wind size={16} className="text-[var(--text3)]" />
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 space-y-2">
        {storms.map((storm) => {
          const isExpanded = expandedId === storm.id;
          const dmgColor = getDamageColor(storm.damageMCubicMeters);

          return (
            <div key={storm.id}>
              <button
                onClick={() => toggleExpanded(storm.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors text-left"
              >
                {/* Year marker */}
                <div className="flex flex-col items-center flex-shrink-0 w-10">
                  <span className="text-xs font-bold font-mono text-[var(--text)]">
                    {storm.year}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full mt-1"
                    style={{ backgroundColor: dmgColor }}
                  />
                </div>

                {/* Storm info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text)]">
                      {storm.name}
                    </span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ color: dmgColor, background: `${dmgColor}15` }}
                    >
                      {storm.damageMCubicMeters}M m³
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text3)]">
                      {t('storm.history.maxWind')}: {storm.maxWindSpeed} m/s
                    </span>
                  </div>
                </div>

                {/* Expand arrow */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp size={14} className="text-[var(--text3)]" />
                  ) : (
                    <ChevronDown size={14} className="text-[var(--text3)]" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="ml-[52px] mt-1 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                  <p className="text-[11px] text-[var(--text2)] leading-relaxed mb-2">
                    {storm.description}
                  </p>
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                      {t('storm.history.yourParcel')}
                    </p>
                    <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                      {storm.parcelImpactEstimate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={10} className="text-[var(--text3)]" />
                    <span className="text-[10px] text-[var(--text3)]">{storm.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {storm.affectedRegions.map((region) => (
                      <span
                        key={region}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg2)] border border-[var(--border)] text-[var(--text3)]"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SLU link */}
      <div className="px-4 pb-3">
        <a
          href="https://www.slu.se/centrumbildningar-och-projekt/riksskogstaxeringen/statistik-om-skog/stormskador/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
        >
          <ExternalLink size={10} />
          {t('storm.history.sluLink')}
        </a>
      </div>
    </div>
  );
}
