import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Clock,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Award,
} from 'lucide-react';
import { useTimberPrices, type PriceByAssortment } from '@/hooks/useTimberPrices';

/**
 * MarketAdvisor — market-aware advice panel for the fiduciary AI advisor.
 *
 * Wired to real timber price data via useTimberPrices hook.
 * Shows current market summary, per-assortment recommendations with best/worst
 * buyer analysis, regional price comparison, and timing recommendations.
 */

// ── Types ──

type Trend = 'up' | 'down' | 'stable';
type Recommendation = 'sälj' | 'vänta' | 'diversifiera';

interface AssortmentAnalysis {
  id: string;
  nameSv: string;
  currentPrice: number;
  bestBuyer: string;
  bestPrice: number;
  worstBuyer: string;
  worstPrice: number;
  average: number;
  priceUnit: string;
  trend: Trend;
  changePercent: number;
  recommendation: Recommendation;
  reasoning: string;
  buyerCount: number;
  priceSpread: number;
}

interface RiskItem {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
}

// ── Demo 12-month price history (for trend visualization) ──

const PRICE_HISTORY_12M: Record<string, { month: string; price: number }[]> = {
  'Talltimmer': [
    { month: 'Apr 25', price: 720 }, { month: 'Maj 25', price: 725 }, { month: 'Jun 25', price: 730 },
    { month: 'Jul 25', price: 740 }, { month: 'Aug 25', price: 745 }, { month: 'Sep 25', price: 755 },
    { month: 'Okt 25', price: 770 }, { month: 'Nov 25', price: 765 }, { month: 'Dec 25', price: 760 },
    { month: 'Jan 26', price: 770 }, { month: 'Feb 26', price: 775 }, { month: 'Mar 26', price: 780 },
  ],
  'Grantimmer': [
    { month: 'Apr 25', price: 680 }, { month: 'Maj 25', price: 690 }, { month: 'Jun 25', price: 685 },
    { month: 'Jul 25', price: 695 }, { month: 'Aug 25', price: 700 }, { month: 'Sep 25', price: 710 },
    { month: 'Okt 25', price: 720 }, { month: 'Nov 25', price: 715 }, { month: 'Dec 25', price: 710 },
    { month: 'Jan 26', price: 715 }, { month: 'Feb 26', price: 720 }, { month: 'Mar 26', price: 725 },
  ],
  'Massaved tall': [
    { month: 'Apr 25', price: 330 }, { month: 'Maj 25', price: 335 }, { month: 'Jun 25', price: 340 },
    { month: 'Jul 25', price: 345 }, { month: 'Aug 25', price: 350 }, { month: 'Sep 25', price: 355 },
    { month: 'Okt 25', price: 360 }, { month: 'Nov 25', price: 358 }, { month: 'Dec 25', price: 355 },
    { month: 'Jan 26', price: 360 }, { month: 'Feb 26', price: 365 }, { month: 'Mar 26', price: 370 },
  ],
  'Massaved gran': [
    { month: 'Apr 25', price: 310 }, { month: 'Maj 25', price: 315 }, { month: 'Jun 25', price: 318 },
    { month: 'Jul 25', price: 320 }, { month: 'Aug 25', price: 325 }, { month: 'Sep 25', price: 330 },
    { month: 'Okt 25', price: 335 }, { month: 'Nov 25', price: 338 }, { month: 'Dec 25', price: 340 },
    { month: 'Jan 26', price: 342 }, { month: 'Feb 26', price: 345 }, { month: 'Mar 26', price: 350 },
  ],
  'Bjorkmassa': [
    { month: 'Apr 25', price: 380 }, { month: 'Maj 25', price: 385 }, { month: 'Jun 25', price: 390 },
    { month: 'Jul 25', price: 395 }, { month: 'Aug 25', price: 400 }, { month: 'Sep 25', price: 405 },
    { month: 'Okt 25', price: 410 }, { month: 'Nov 25', price: 408 }, { month: 'Dec 25', price: 405 },
    { month: 'Jan 26', price: 400 }, { month: 'Feb 26', price: 398 }, { month: 'Mar 26', price: 395 },
  ],
};

// ── Regional average prices (demo data for comparison) ──

const REGIONAL_AVERAGES: Record<string, Record<string, number>> = {
  'Götaland': { 'Talltimmer': 780, 'Grantimmer': 725, 'Massaved tall': 370, 'Massaved gran': 350, 'Bjorkmassa': 400 },
  'Svealand': { 'Talltimmer': 762, 'Grantimmer': 711, 'Massaved tall': 358, 'Massaved gran': 339, 'Bjorkmassa': 388 },
  'Norrland': { 'Talltimmer': 730, 'Grantimmer': 680, 'Massaved tall': 340, 'Massaved gran': 320, 'Bjorkmassa': 370 },
};

// ── Analysis helpers ──

function determineTrend(assortment: string): { trend: Trend; changePct: number } {
  const history = PRICE_HISTORY_12M[assortment];
  if (!history || history.length < 2) return { trend: 'stable', changePct: 0 };

  const firstPrice = history[0].price;
  const lastPrice = history[history.length - 1].price;
  const changePct = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (changePct > 3) return { trend: 'up', changePct: Math.round(changePct * 10) / 10 };
  if (changePct < -3) return { trend: 'down', changePct: Math.round(changePct * 10) / 10 };
  return { trend: 'stable', changePct: Math.round(changePct * 10) / 10 };
}

function deriveRecommendation(trend: Trend, changePct: number, priceVsAvg: number): { rec: Recommendation; reasoning: string } {
  // Price is well above average and trend peaking
  if (priceVsAvg > 5 && (trend === 'stable' || trend === 'down')) {
    return {
      rec: 'sälj',
      reasoning: `Priset ligger ${priceVsAvg.toFixed(0)}% över genomsnittet och trenden planar ut. Historiskt höga nivåer motiverar försäljning. Risk för prisnedgång.`,
    };
  }
  // Strong uptrend
  if (trend === 'up' && changePct > 5) {
    return {
      rec: 'vänta',
      reasoning: `Stark uppåttrend (+${changePct.toFixed(1)}% senaste 12 mån). Trenden tyder på fortsatt prisökning. Avvakta för bättre pris, men sätt en målnivå.`,
    };
  }
  // Moderate uptrend
  if (trend === 'up' && changePct > 0) {
    return {
      rec: 'vänta',
      reasoning: `Försiktig uppåttrend (+${changePct.toFixed(1)}%). Marknaden utvecklas positivt men utan dramatiska svängningar.`,
    };
  }
  // Downtrend
  if (trend === 'down') {
    return {
      rec: 'diversifiera',
      reasoning: `Vikande marknad (${changePct.toFixed(1)}% senaste 12 mån). Överväg att sälja delvolymer nu och behålla resten för eventuell återhämtning.`,
    };
  }
  // Stable at good level
  if (priceVsAvg > 0) {
    return {
      rec: 'sälj',
      reasoning: `Stabil marknad nära genomsnittet med gott pris. Omedelbar försäljning ger säker avkastning utan väsentlig uppåtpotential.`,
    };
  }
  return {
    rec: 'vänta',
    reasoning: `Priset ligger under genomsnittet. Avvakta för bättre marknadsläge om inte likviditetsbehov kräver omedelbar försäljning.`,
  };
}

// ── Utility ──

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: 0,
  }).format(value);
}

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  up: '#4ade80',
  down: '#ef4444',
  stable: '#fbbf24',
};

const REC_COLORS: Record<Recommendation, string> = {
  'sälj': '#4ade80',
  'vänta': '#fbbf24',
  'diversifiera': '#818cf8',
};

const REC_LABELS: Record<Recommendation, string> = {
  'sälj': 'Sälj nu',
  'vänta': 'Vänta',
  'diversifiera': 'Diversifiera',
};

const SEVERITY_COLORS = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#ef4444',
};

// ── Component ──

export function MarketAdvisor() {
  const [expandedAssortment, setExpandedAssortment] = useState<string | null>(null);
  const [showRegional, setShowRegional] = useState(false);

  // Real price data
  const { byAssortment, byBuyer, isLoading, isDemo, lastUpdated } = useTimberPrices('Gotaland');

  // Build analysis from real price data
  const analyses = useMemo((): AssortmentAnalysis[] => {
    return byAssortment
      .filter(a => a.best.price > 0) // skip empty assortments
      .map((a: PriceByAssortment) => {
        const { trend, changePct } = determineTrend(a.assortment);
        const priceVsAvg = ((a.best.price - a.average) / a.average) * 100;
        const { rec, reasoning } = deriveRecommendation(trend, changePct, priceVsAvg);

        return {
          id: a.assortment.toLowerCase().replace(/\s+/g, '-'),
          nameSv: a.assortment,
          currentPrice: a.best.price,
          bestBuyer: a.best.buyer,
          bestPrice: a.best.price,
          worstBuyer: a.worst.buyer,
          worstPrice: a.worst.price,
          average: a.average,
          priceUnit: 'SEK/m3fub',
          trend,
          changePercent: changePct,
          recommendation: rec,
          reasoning,
          buyerCount: a.buyers.length,
          priceSpread: a.best.price - a.worst.price,
        };
      });
  }, [byAssortment]);

  // Risks derived from market data
  const risks = useMemo((): RiskItem[] => {
    const items: RiskItem[] = [
      {
        id: 'beetle',
        name: 'Barkborrerisk',
        severity: 'high',
        description: 'Tidig svärmning rapporterad i Småland/Götaland. Granbestånd med exponering mot söder särskilt utsatta.',
        impact: 'Kan tvinga fram nödavverkning till lägre pris (-15 till -25%)',
      },
      {
        id: 'volatility',
        name: 'Prisvolatilitet',
        severity: 'medium',
        description: 'Marknaden visar ökad osäkerhet p.g.a. EU-regulering (EUDR) och globala handelsflöden.',
        impact: 'Svårbedömd prisriktning bortom 6 månader',
      },
    ];

    // Add market-specific risks from actual data
    const downtrending = analyses.filter(a => a.trend === 'down');
    if (downtrending.length > 0) {
      items.push({
        id: 'declining-prices',
        name: 'Vikande priser',
        severity: 'medium',
        description: `${downtrending.map(a => a.nameSv).join(', ')} visar negativ pristrend.`,
        impact: `Ytterligare prisfall möjligt — överväg försäljning av delvolymer`,
      });
    }

    const bigSpreads = analyses.filter(a => a.priceSpread > 50);
    if (bigSpreads.length > 0) {
      items.push({
        id: 'price-spread',
        name: 'Stor prisspridning',
        severity: 'low',
        description: `${bigSpreads.map(a => `${a.nameSv} (${a.priceSpread} SEK)`).join(', ')} — stor skillnad mellan köpare.`,
        impact: 'Möjlighet att förhandla — jämför alltid flera köpare',
      });
    }

    return items;
  }, [analyses]);

  // Market overview stats
  const upCount = analyses.filter(a => a.trend === 'up').length;
  const downCount = analyses.filter(a => a.trend === 'down').length;
  const stableCount = analyses.filter(a => a.trend === 'stable').length;

  const overallTrend: Trend =
    upCount > downCount ? 'up' : downCount > upCount ? 'down' : 'stable';
  const OverallIcon = TREND_ICONS[overallTrend];

  // Timing recommendation
  const timingRec = useMemo(() => {
    const sellNow = analyses.filter(a => a.recommendation === 'sälj');
    const wait = analyses.filter(a => a.recommendation === 'vänta');
    if (sellNow.length > wait.length) {
      return {
        label: 'Gynnsamt säljläge',
        detail: `${sellNow.map(a => a.nameSv).join(', ')} — bra priser just nu. Överväg att sälja dessa sortiment.`,
        color: '#4ade80',
      };
    }
    if (wait.length > sellNow.length) {
      return {
        label: 'Avvakta',
        detail: `${wait.map(a => a.nameSv).join(', ')} — priserna stiger. Vänta till Q2/Q3 för bästa pris.`,
        color: '#fbbf24',
      };
    }
    return {
      label: 'Blandat läge',
      detail: 'Sälj selektivt — vissa sortiment gynnsamma, andra bör avvaktas.',
      color: '#818cf8',
    };
  }, [analyses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-[#4ade80] border-t-transparent rounded-full" />
        <span className="ml-2 text-xs text-[var(--text3)]">Laddar marknadspriser...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Market summary */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: '#4ade80' }} />
            <h3 className="text-sm font-serif font-bold text-[var(--text)]">
              Marknadsläge
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[#fbbf24]/15 text-[#fbbf24]">
                Demo
              </span>
            )}
            <span className="text-[10px] text-[var(--text3)] font-mono">
              {lastUpdated ? new Date(lastUpdated).toLocaleDateString('sv-SE') : 'Mars 2026'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <OverallIcon size={14} style={{ color: TREND_COLORS[overallTrend] }} />
            <span className="text-xs font-medium text-[var(--text)]">
              {overallTrend === 'up'
                ? 'Marknaden stiger totalt sett'
                : overallTrend === 'down'
                  ? 'Marknaden sjunker'
                  : 'Blandat marknadsläge'}
            </span>
          </div>
          <div className="flex gap-3 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <TrendingUp size={10} style={{ color: '#4ade80' }} />
              {upCount} upp
            </span>
            <span className="flex items-center gap-1">
              <Minus size={10} style={{ color: '#fbbf24' }} />
              {stableCount} stabil
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown size={10} style={{ color: '#ef4444' }} />
              {downCount} ned
            </span>
          </div>
        </div>

        {/* Timing recommendation */}
        <div className="p-2.5 rounded-lg border" style={{ borderColor: `${timingRec.color}30`, background: `${timingRec.color}08` }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} style={{ color: timingRec.color }} />
            <span className="text-[11px] font-medium" style={{ color: timingRec.color }}>{timingRec.label}</span>
          </div>
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">{timingRec.detail}</p>
        </div>
      </div>

      {/* Per-assortment recommendations */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
          Rekommendation per sortiment ({byBuyer.length} köpare)
        </h4>

        {analyses.map((assortment) => {
          const TrendIcon = TREND_ICONS[assortment.trend];
          const isExpanded = expandedAssortment === assortment.id;

          return (
            <div
              key={assortment.id}
              className="rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--bg2)' }}
            >
              <button
                onClick={() =>
                  setExpandedAssortment(isExpanded ? null : assortment.id)
                }
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--bg3)] transition-colors"
                aria-expanded={isExpanded}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${TREND_COLORS[assortment.trend]}15` }}
                >
                  <TrendIcon size={14} style={{ color: TREND_COLORS[assortment.trend] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text)]">
                    {assortment.nameSv}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">
                    {formatSEK(assortment.currentPrice)} {assortment.priceUnit}
                    <span className="ml-1.5" style={{ color: TREND_COLORS[assortment.trend] }}>
                      {assortment.changePercent > 0 ? '+' : ''}{assortment.changePercent}%
                    </span>
                    <span className="ml-1.5 text-[var(--text3)]">
                      (snitt: {formatSEK(assortment.average)})
                    </span>
                  </p>
                </div>

                <span
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium flex-shrink-0"
                  style={{
                    background: `${REC_COLORS[assortment.recommendation]}15`,
                    color: REC_COLORS[assortment.recommendation],
                  }}
                >
                  {assortment.recommendation === 'sälj' && <ShoppingCart size={10} />}
                  {assortment.recommendation === 'vänta' && <Clock size={10} />}
                  {REC_LABELS[assortment.recommendation]}
                </span>

                {isExpanded ? (
                  <ChevronUp size={12} className="text-[var(--text3)]" />
                ) : (
                  <ChevronDown size={12} className="text-[var(--text3)]" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border)] p-3 space-y-3">
                  <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                    {assortment.reasoning}
                  </p>

                  {/* Best vs worst buyer */}
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                      Bästa & sämsta köpare
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="px-2.5 py-2 rounded-lg border border-[#4ade80]/20 bg-[rgba(74,222,128,0.05)]">
                        <div className="flex items-center gap-1 mb-1">
                          <Award size={10} style={{ color: '#4ade80' }} />
                          <p className="text-[9px] text-[#4ade80] font-medium">Bäst pris</p>
                        </div>
                        <p className="text-xs font-medium text-[var(--text)]">{assortment.bestBuyer}</p>
                        <p className="text-[11px] font-mono font-bold" style={{ color: '#4ade80' }}>
                          {formatSEK(assortment.bestPrice)} SEK/m3fub
                        </p>
                      </div>
                      <div className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <p className="text-[9px] text-[var(--text3)] font-medium mb-1">Lägst pris</p>
                        <p className="text-xs font-medium text-[var(--text)]">{assortment.worstBuyer}</p>
                        <p className="text-[11px] font-mono text-[var(--text2)]">
                          {formatSEK(assortment.worstPrice)} SEK/m3fub
                        </p>
                      </div>
                    </div>
                    <p className="text-[9px] text-[var(--text3)] mt-1">
                      Prisspridning: {assortment.priceSpread} SEK mellan {assortment.buyerCount} köpare
                    </p>
                  </div>

                  {/* 12-month price trend */}
                  {PRICE_HISTORY_12M[assortment.nameSv] && (
                    <div>
                      <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                        Pristrend 12 månader
                      </p>
                      <div className="space-y-1">
                        {(() => {
                          const history = PRICE_HISTORY_12M[assortment.nameSv];
                          const min = Math.min(...history.map(h => h.price));
                          const max = Math.max(...history.map(h => h.price));
                          const range = max - min || 1;

                          return history.map((h, idx) => {
                            const barWidth = ((h.price - min) / range) * 70 + 30;
                            const isLast = idx === history.length - 1;

                            return (
                              <div key={h.month} className="flex items-center gap-1.5">
                                <span className="text-[8px] text-[var(--text3)] w-12 text-right font-mono flex-shrink-0">
                                  {h.month}
                                </span>
                                <div className="flex-1 h-2.5 rounded-sm bg-[var(--bg3)] overflow-hidden">
                                  <div
                                    className="h-full rounded-sm"
                                    style={{
                                      width: `${barWidth}%`,
                                      background: isLast ? '#4ade80' : 'rgba(74, 222, 128, 0.4)',
                                    }}
                                  />
                                </div>
                                <span className={`text-[8px] font-mono w-8 flex-shrink-0 ${isLast ? 'text-[#4ade80] font-bold' : 'text-[var(--text3)]'}`}>
                                  {h.price}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Regional price comparison */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => setShowRegional(!showRegional)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: '#818cf8' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Regional prisjämförelse
            </h4>
          </div>
          {showRegional ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {showRegional && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-left text-[var(--text3)]">
                  <th className="pb-2 font-medium">Sortiment</th>
                  {Object.keys(REGIONAL_AVERAGES).map(region => (
                    <th key={region} className="pb-2 font-medium text-right">{region}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Talltimmer', 'Grantimmer', 'Massaved tall', 'Massaved gran', 'Bjorkmassa'].map(assort => {
                  const prices = Object.entries(REGIONAL_AVERAGES).map(([r, p]) => ({ region: r, price: p[assort] ?? 0 }));
                  const maxPrice = Math.max(...prices.map(p => p.price));

                  return (
                    <tr key={assort} className="border-t border-[var(--border)]">
                      <td className="py-1.5 text-[var(--text)] font-medium">{assort}</td>
                      {prices.map(p => (
                        <td
                          key={p.region}
                          className="py-1.5 text-right font-mono"
                          style={{ color: p.price === maxPrice ? '#4ade80' : 'var(--text2)' }}
                        >
                          {formatSEK(p.price)}
                          {p.price === maxPrice && <span className="ml-0.5 text-[8px]"> *</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[8px] text-[var(--text3)] mt-2">* Bäst regionalt pris. SEK/m3fub. Götaland-priser dominerar för södra skogsägare.</p>
          </div>
        )}
      </div>

      {/* Risk assessment */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-[var(--amber, #fbbf24)]" />
          <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
            Riskbedömning
          </h4>
        </div>

        <div className="space-y-2">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[risk.severity] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[11px] font-medium text-[var(--text)]">
                    {risk.name}
                  </p>
                  <span
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${SEVERITY_COLORS[risk.severity]}15`,
                      color: SEVERITY_COLORS[risk.severity],
                    }}
                  >
                    {risk.severity === 'low' ? 'Låg' : risk.severity === 'medium' ? 'Medel' : 'Hög'}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                  {risk.description}
                </p>
                <p className="text-[10px] text-[var(--text2)] mt-1 italic">
                  Effekt: {risk.impact}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data source note */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)]">
        <Info size={12} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-[var(--text3)] leading-relaxed">
          {isDemo
            ? 'Uppskattade priser visas (Södra, SCA, Holmen, Stora Enso, Sveaskog, Vida, Setra, Moelven). När riktig marknadsdata integreras uppdateras priser i realtid.'
            : `Priser hämtade från ${byBuyer.length} köpare. Senast uppdaterat: ${lastUpdated ? new Date(lastUpdated).toLocaleString('sv-SE') : '-'}.`}
          {' '}Alla rekommendationer utgår enbart från skogsägarens intresse.
        </p>
      </div>
    </div>
  );
}
