import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDot, TrendingUp, TrendingDown, Minus, Snowflake, CloudRain, Sun, ThermometerSun } from 'lucide-react';
import { getHarvestRecommendation, formatSEK } from '@/services/timberMarketService';

const SIGNAL_CONFIG = {
  harvest: {
    colorBg: 'rgba(74, 222, 128, 0.1)',
    colorBorder: 'rgba(74, 222, 128, 0.3)',
    colorDot: '#4ade80',
    labelEn: 'Harvest Now',
    labelSv: 'Avverka nu',
    icon: TrendingUp,
  },
  wait: {
    colorBg: 'rgba(251, 191, 36, 0.1)',
    colorBorder: 'rgba(251, 191, 36, 0.3)',
    colorDot: '#fbbf24',
    labelEn: 'Wait',
    labelSv: 'Avvakta',
    icon: Minus,
  },
  poor: {
    colorBg: 'rgba(248, 113, 113, 0.1)',
    colorBorder: 'rgba(248, 113, 113, 0.3)',
    colorDot: '#f87171',
    labelEn: 'Poor Timing',
    labelSv: 'Dålig tajming',
    icon: TrendingDown,
  },
};

type WindowRating = 'optimal' | 'acceptable' | 'poor';

interface WeekWindow {
  weekLabel: string;
  monthLabel: string;
  rating: WindowRating;
  frost: boolean;
  rain: boolean;
  priceDirection: 'up' | 'flat' | 'down';
  groundCondition: 'frozen' | 'dry' | 'wet';
  reasonEn: string;
  reasonSv: string;
}

const RATING_COLORS: Record<WindowRating, string> = {
  optimal: '#4ade80',
  acceptable: '#fbbf24',
  poor: '#f87171',
};

const RATING_BG: Record<WindowRating, string> = {
  optimal: 'rgba(74, 222, 128, 0.25)',
  acceptable: 'rgba(251, 191, 36, 0.2)',
  poor: 'rgba(248, 113, 113, 0.2)',
};

const RATING_LABEL = {
  optimal: { en: 'Optimal', sv: 'Optimalt' },
  acceptable: { en: 'Acceptable', sv: 'Acceptabelt' },
  poor: { en: 'Poor', sv: 'Dåligt' },
};

/**
 * Generate 13 weekly windows covering ~3 months from mid-March 2026.
 * Factors: frost (good for ground bearing), rain (bad for roads),
 * price trends, and ground conditions.
 */
function generateWeeklyWindows(): WeekWindow[] {
  // Weeks starting mid-March through mid-June 2026
  const weeks: WeekWindow[] = [
    // Late March — frozen ground, high prices, ideal
    { weekLabel: 'v12', monthLabel: 'Mar', rating: 'optimal', frost: true, rain: false, priceDirection: 'up', groundCondition: 'frozen',
      reasonEn: 'Frozen ground, excellent bearing capacity. Prices at seasonal high.',
      reasonSv: 'Frusen mark, utmärkt bärighet. Priserna på säsongshögsta.' },
    { weekLabel: 'v13', monthLabel: 'Mar', rating: 'optimal', frost: true, rain: false, priceDirection: 'up', groundCondition: 'frozen',
      reasonEn: 'Still frozen. Last chance for optimal frost conditions this season.',
      reasonSv: 'Fortfarande frusen mark. Sista chansen för optimala frostförhållanden.' },
    // Early April — thaw begins, spring break-up (tjällossning)
    { weekLabel: 'v14', monthLabel: 'Apr', rating: 'poor', frost: false, rain: true, priceDirection: 'flat', groundCondition: 'wet',
      reasonEn: 'Spring thaw (tjällossning). Soft ground, high risk of road damage.',
      reasonSv: 'Tjällossning. Mjuk mark, hög risk för vägskador.' },
    { weekLabel: 'v15', monthLabel: 'Apr', rating: 'poor', frost: false, rain: true, priceDirection: 'flat', groundCondition: 'wet',
      reasonEn: 'Continued thaw period. Most forest roads have weight restrictions.',
      reasonSv: 'Fortsatt tjällossning. De flesta skogsvägarna har viktbegränsningar.' },
    { weekLabel: 'v16', monthLabel: 'Apr', rating: 'poor', frost: false, rain: true, priceDirection: 'down', groundCondition: 'wet',
      reasonEn: 'Wet conditions persist. Transport difficult, prices softening.',
      reasonSv: 'Blöta förhållanden. Transport svårt, priserna mjuknar.' },
    { weekLabel: 'v17', monthLabel: 'Apr', rating: 'acceptable', frost: false, rain: false, priceDirection: 'down', groundCondition: 'wet',
      reasonEn: 'Ground drying. Some roads reopening. Still soft in places.',
      reasonSv: 'Marken torkar upp. Vissa vägar öppnar. Fortfarande mjukt ställvis.' },
    // May — drying out, acceptable conditions
    { weekLabel: 'v18', monthLabel: 'Maj', rating: 'acceptable', frost: false, rain: false, priceDirection: 'down', groundCondition: 'dry',
      reasonEn: 'Dry conditions returning. Good road access, but prices seasonal low.',
      reasonSv: 'Torra förhållanden. Bra vägåtkomst, men priserna säsongsläge.' },
    { weekLabel: 'v19', monthLabel: 'Maj', rating: 'acceptable', frost: false, rain: true, priceDirection: 'flat', groundCondition: 'dry',
      reasonEn: 'Occasional rain but ground remains firm. Sap rising in birch.',
      reasonSv: 'Enstaka regn men marken håller. Savstigning i björk.' },
    { weekLabel: 'v20', monthLabel: 'Maj', rating: 'optimal', frost: false, rain: false, priceDirection: 'flat', groundCondition: 'dry',
      reasonEn: 'Excellent dry conditions. Good bearing. Avoid nesting bird areas.',
      reasonSv: 'Utmärkta torra förhållanden. Bra bärighet. Undvik häckningsområden.' },
    { weekLabel: 'v21', monthLabel: 'Maj', rating: 'optimal', frost: false, rain: false, priceDirection: 'up', groundCondition: 'dry',
      reasonEn: 'Dry ground, construction season demand increasing prices.',
      reasonSv: 'Torr mark, byggsäsongen driver upp priserna.' },
    // June — summer conditions
    { weekLabel: 'v22', monthLabel: 'Jun', rating: 'acceptable', frost: false, rain: false, priceDirection: 'flat', groundCondition: 'dry',
      reasonEn: 'Good conditions but bark beetle risk high. Process timber quickly.',
      reasonSv: 'Bra förhållanden men hög risk för granbarkborre. Kör snabbt till industri.' },
    { weekLabel: 'v23', monthLabel: 'Jun', rating: 'acceptable', frost: false, rain: true, priceDirection: 'flat', groundCondition: 'dry',
      reasonEn: 'Summer rain expected. Plan around weather windows.',
      reasonSv: 'Sommarregn väntas. Planera kring väderfönster.' },
    { weekLabel: 'v24', monthLabel: 'Jun', rating: 'poor', frost: false, rain: true, priceDirection: 'down', groundCondition: 'wet',
      reasonEn: 'Heavy rain, wet ground. High bark beetle swarming risk.',
      reasonSv: 'Kraftigt regn, blöt mark. Hög risk för barkborresvärmning.' },
  ];

  return weeks;
}

interface HarvestWindowProps {
  /** Estimated gross revenue at current prices, for "diff" calculation */
  estimatedRevenue?: number;
}

export function HarvestWindow({ estimatedRevenue = 500000 }: HarvestWindowProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  const rec = useMemo(() => getHarvestRecommendation(), []);
  const config = SIGNAL_CONFIG[rec.signal];
  const Icon = config.icon;

  const revDiff = Math.round(estimatedRevenue * (rec.revenueDiffPercent / 100));
  const diffLabel = rec.revenueDiffPercent > 0
    ? `+${formatSEK(revDiff)}`
    : formatSEK(revDiff);

  const weeks = useMemo(() => generateWeeklyWindows(), []);

  // Group weeks by month for header display
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let current = '';
    for (const w of weeks) {
      if (w.monthLabel !== current) {
        groups.push({ label: w.monthLabel, count: 1 });
        current = w.monthLabel;
      } else {
        groups[groups.length - 1].count++;
      }
    }
    return groups;
  }, [weeks]);

  const optimalCount = weeks.filter((w) => w.rating === 'optimal').length;
  const acceptableCount = weeks.filter((w) => w.rating === 'acceptable').length;
  const poorCount = weeks.filter((w) => w.rating === 'poor').length;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Signal header */}
      <div
        className="p-4 border-b border-[var(--border)]"
        style={{
          background: config.colorBg,
          borderBottomColor: config.colorBorder,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: config.colorBg, border: `2px solid ${config.colorDot}` }}
          >
            <CircleDot size={20} style={{ color: config.colorDot }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('market.harvestWindow.title')}
            </h3>
            <div className="flex items-center gap-1.5">
              <Icon size={14} style={{ color: config.colorDot }} />
              <span
                className="text-xs font-semibold"
                style={{ color: config.colorDot }}
              >
                {lang === 'sv' ? config.labelSv : config.labelEn}
              </span>
            </div>
          </div>
          {/* Revenue comparison */}
          <div className="text-right">
            <p className="text-[10px] uppercase font-mono text-[var(--text3)] tracking-wider">
              {t('market.harvestWindow.revenueDiff')}
            </p>
            <span
              className="text-lg font-semibold font-mono"
              style={{ color: rec.revenueDiffPercent >= 0 ? '#4ade80' : '#f87171' }}
            >
              {diffLabel}
            </span>
            <p className="text-[10px] text-[var(--text3)]">
              {t('market.harvestWindow.vsWait3Months')}
            </p>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-xs text-[var(--text2)] leading-relaxed">
          {lang === 'sv' ? rec.reasonSv : rec.reasonEn}
        </p>
      </div>

      {/* 3-month timeline */}
      <div className="p-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)]">
            {lang === 'sv' ? '3 MÅNADERS AVVERKNINGSFÖNSTER' : '3-MONTH HARVEST WINDOW'}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            {(['optimal', 'acceptable', 'poor'] as WindowRating[]).map((r) => (
              <div key={r} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: RATING_COLORS[r] }}
                />
                <span className="text-[10px] text-[var(--text3)]">
                  {lang === 'sv' ? RATING_LABEL[r].sv : RATING_LABEL[r].en}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Month headers */}
        <div className="flex mb-1">
          {monthGroups.map((mg, i) => (
            <div
              key={`${mg.label}-${i}`}
              className="text-[10px] font-mono font-semibold text-[var(--text2)] text-center"
              style={{ width: `${(mg.count / weeks.length) * 100}%` }}
            >
              {mg.label}
            </div>
          ))}
        </div>

        {/* Week bars */}
        <div className="flex gap-1 mb-2">
          {weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 group relative"
            >
              {/* Bar */}
              <div
                className="h-10 rounded-md transition-all cursor-pointer hover:opacity-80"
                style={{ backgroundColor: RATING_BG[w.rating], border: `1px solid ${RATING_COLORS[w.rating]}40` }}
              >
                <div className="h-full flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[8px] font-mono text-[var(--text3)]">{w.weekLabel}</span>
                  <div className="flex gap-0.5">
                    {w.frost && <Snowflake size={8} style={{ color: '#93c5fd' }} />}
                    {w.rain && <CloudRain size={8} style={{ color: '#94a3b8' }} />}
                    {!w.frost && !w.rain && <Sun size={8} style={{ color: '#fbbf24' }} />}
                  </div>
                </div>
              </div>

              {/* Tooltip on hover */}
              <div
                className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 rounded-lg border border-[var(--border2)] p-2.5 shadow-xl text-[11px] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-semibold text-[var(--text)]">{w.weekLabel} {w.monthLabel}</span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: RATING_BG[w.rating], color: RATING_COLORS[w.rating] }}
                  >
                    {lang === 'sv' ? RATING_LABEL[w.rating].sv : RATING_LABEL[w.rating].en}
                  </span>
                </div>
                <div className="space-y-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {w.groundCondition === 'frozen' ? (
                      <Snowflake size={10} style={{ color: '#93c5fd' }} />
                    ) : w.groundCondition === 'wet' ? (
                      <CloudRain size={10} style={{ color: '#94a3b8' }} />
                    ) : (
                      <ThermometerSun size={10} style={{ color: '#fbbf24' }} />
                    )}
                    <span className="text-[var(--text2)]">
                      {lang === 'sv'
                        ? w.groundCondition === 'frozen' ? 'Frusen mark' : w.groundCondition === 'wet' ? 'Blöt mark' : 'Torr mark'
                        : w.groundCondition === 'frozen' ? 'Frozen ground' : w.groundCondition === 'wet' ? 'Wet ground' : 'Dry ground'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {w.priceDirection === 'up' ? (
                      <TrendingUp size={10} style={{ color: '#4ade80' }} />
                    ) : w.priceDirection === 'down' ? (
                      <TrendingDown size={10} style={{ color: '#f87171' }} />
                    ) : (
                      <Minus size={10} style={{ color: 'var(--text3)' }} />
                    )}
                    <span className="text-[var(--text2)]">
                      {lang === 'sv'
                        ? w.priceDirection === 'up' ? 'Priser uppåt' : w.priceDirection === 'down' ? 'Priser nedåt' : 'Stabila priser'
                        : w.priceDirection === 'up' ? 'Prices rising' : w.priceDirection === 'down' ? 'Prices falling' : 'Prices stable'
                      }
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                  {lang === 'sv' ? w.reasonSv : w.reasonEn}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Factor rows below timeline */}
        <div className="space-y-1 mb-4">
          {/* Ground condition row */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[var(--text3)] w-16 flex-shrink-0 text-right">
              {lang === 'sv' ? 'MARK' : 'GROUND'}
            </span>
            <div className="flex gap-1 flex-1">
              {weeks.map((w, i) => (
                <div
                  key={`g-${i}`}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    backgroundColor:
                      w.groundCondition === 'frozen' ? 'rgba(147, 197, 253, 0.4)' :
                      w.groundCondition === 'dry' ? 'rgba(74, 222, 128, 0.3)' :
                      'rgba(248, 113, 113, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Rain row */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[var(--text3)] w-16 flex-shrink-0 text-right">
              {lang === 'sv' ? 'REGN' : 'RAIN'}
            </span>
            <div className="flex gap-1 flex-1">
              {weeks.map((w, i) => (
                <div
                  key={`r-${i}`}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    backgroundColor: w.rain
                      ? 'rgba(248, 113, 113, 0.3)'
                      : 'rgba(74, 222, 128, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Price trend row */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[var(--text3)] w-16 flex-shrink-0 text-right">
              {lang === 'sv' ? 'PRIS' : 'PRICE'}
            </span>
            <div className="flex gap-1 flex-1">
              {weeks.map((w, i) => (
                <div
                  key={`p-${i}`}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    backgroundColor:
                      w.priceDirection === 'up' ? 'rgba(74, 222, 128, 0.3)' :
                      w.priceDirection === 'flat' ? 'rgba(251, 191, 36, 0.3)' :
                      'rgba(248, 113, 113, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-lg font-semibold font-mono" style={{ color: RATING_COLORS.optimal }}>{optimalCount}</p>
            <p className="text-[10px] text-[var(--text3)]">
              {lang === 'sv' ? 'Optimala veckor' : 'Optimal weeks'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-lg font-semibold font-mono" style={{ color: RATING_COLORS.acceptable }}>{acceptableCount}</p>
            <p className="text-[10px] text-[var(--text3)]">
              {lang === 'sv' ? 'Acceptabla veckor' : 'Acceptable weeks'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-lg font-semibold font-mono" style={{ color: RATING_COLORS.poor }}>{poorCount}</p>
            <p className="text-[10px] text-[var(--text3)]">
              {lang === 'sv' ? 'Dåliga veckor' : 'Poor weeks'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
