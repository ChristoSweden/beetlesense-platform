import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Users,
  Calendar,
  Gavel,
  BarChart3,
  Map,
  Calculator,
  Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ASSORTMENTS, getPriceChange } from '@/services/timberMarketService';
import { PriceChart } from '@/components/market/PriceChart';
import { HarvestWindow } from '@/components/market/HarvestWindow';
import { MillMap } from '@/components/market/MillMap';
import { RevenueCalculator } from '@/components/market/RevenueCalculator';
import { BuyerComparison } from '@/components/market/BuyerComparison';
import { SellingWindow } from '@/components/market/SellingWindow';
import { AuctionBoard } from '@/components/market/AuctionBoard';
import { useTimberMarket, TIMBER_ASSORTMENTS } from '@/hooks/useTimberMarket';

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

type TabId = 'overview' | 'buyers' | 'timing' | 'auction';

interface TabDef {
  id: TabId;
  labelSv: string;
  labelEn: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', labelSv: 'Oversikt', labelEn: 'Overview', icon: <BarChart3 size={14} /> },
  { id: 'buyers', labelSv: 'Kopare', labelEn: 'Buyers', icon: <Users size={14} /> },
  { id: 'timing', labelSv: 'Saljfonster', labelEn: 'Timing', icon: <Calendar size={14} /> },
  { id: 'auction', labelSv: 'Auktion', labelEn: 'Auction', icon: <Gavel size={14} /> },
];

export default function TimberMarketPage() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const market = useTimberMarket();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            {t('common.back')}
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {lang === 'sv' ? 'Virkesmarknad — Alla kopare' : 'Timber Market — All Buyers'}
              </h1>
              <p className="text-sm text-[var(--text3)] mt-1">
                {lang === 'sv'
                  ? 'Jamfor priser fran 6 kopare. Hitta basta nettopriset efter transport.'
                  : 'Compare prices from 6 buyers. Find the best net price after transport.'}
              </p>
            </div>

            {/* Best price badge */}
            {!market.isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
                <Crown size={14} className="text-[var(--green)]" />
                <div className="text-[10px]">
                  <p className="text-[var(--text3)]">{lang === 'sv' ? 'Basta netto just nu' : 'Best net price now'}</p>
                  <p className="font-mono font-semibold text-[var(--green)]">
                    {market.bestPrices.talltimmer?.price ?? '—'} kr/m&sup3;fub
                    <span className="text-[var(--text3)] font-normal ml-1">
                      ({lang === 'sv' ? 'Talltimmer' : 'Pine sawlog'})
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                }
              `}
            >
              {tab.icon}
              {lang === 'sv' ? tab.labelSv : tab.labelEn}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            {/* Multi-buyer price summary cards */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <Users size={14} className="text-[var(--green)]" />
                {lang === 'sv' ? 'Basta pris per sortiment (netto efter transport)' : 'Best price per assortment (net after transport)'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {TIMBER_ASSORTMENTS.map((a) => {
                  const best = market.bestPrices[a.id];
                  const buyer = market.buyers.find((b) => b.id === best?.buyerId);
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[var(--green)]/20 p-3 bg-[var(--green)]/5"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                        <span className="text-[10px] font-medium text-[var(--text2)]">
                          {lang === 'sv' ? a.nameSv : a.nameEn}
                        </span>
                      </div>
                      <p className="text-lg font-semibold font-mono text-[var(--green)]">
                        {best?.price ?? '—'}
                      </p>
                      <p className="text-[9px] text-[var(--text3)] font-mono">
                        kr/m&sup3;fub netto
                      </p>
                      {buyer && (
                        <p className="text-[9px] text-[var(--text3)] mt-1 flex items-center gap-1">
                          <Crown size={8} className="text-[var(--green)]" />
                          {buyer.name} ({buyer.distanceKm} km)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current average prices */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
                {t('market.currentPrices')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {ASSORTMENTS.map((a) => {
                  const change = getPriceChange(a);
                  const Icon = TREND_ICONS[change.direction];
                  const changeColor =
                    change.direction === 'up'
                      ? '#4ade80'
                      : change.direction === 'down'
                      ? '#f87171'
                      : 'var(--text3)';

                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[var(--border)] p-3"
                      style={{ background: 'var(--bg2)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="text-[10px] font-medium text-[var(--text2)] truncate">
                          {lang === 'sv' ? a.nameSv : a.nameEn}
                        </span>
                      </div>
                      <p className="text-lg font-semibold font-mono text-[var(--text)]">
                        {a.currentPrice}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Icon size={12} style={{ color: changeColor }} />
                        <span className="text-[10px] font-mono" style={{ color: changeColor }}>
                          {change.direction === 'flat'
                            ? '0%'
                            : `${change.direction === 'up' ? '+' : '-'}${change.percent}%`}
                        </span>
                      </div>
                      <p className="text-[9px] text-[var(--text3)] font-mono mt-0.5">kr/m&sup3;fub</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price chart */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
                {t('market.priceHistory')}
              </h2>
              <PriceChart />
            </div>

            {/* Harvest window recommendation */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
                {t('market.optimalHarvest')}
              </h2>
              <HarvestWindow />
            </div>

            {/* Mill proximity map */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <Map size={14} className="text-[var(--green)]" />
                {t('market.millProximity')}
              </h2>
              <MillMap />
            </div>

            {/* Revenue calculator */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <Calculator size={14} className="text-[var(--green)]" />
                {t('market.estimateRevenue')}
              </h2>
              <RevenueCalculator />
            </div>
          </>
        )}

        {/* ═══ BUYERS TAB ═══ */}
        {activeTab === 'buyers' && (
          <>
            <BuyerComparison buyers={market.buyers} prices={market.prices} />

            {/* Volume tier explanation */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-2">
                {lang === 'sv' ? 'Volymbaserade pristillagg' : 'Volume-Based Price Tiers'}
              </h3>
              <p className="text-xs text-[var(--text3)] mb-3">
                {lang === 'sv'
                  ? 'Storre leveranser ger hogre pris per m3fub. Expandera en kopare i tabellen ovan for att se deras volymbonusar.'
                  : 'Larger deliveries yield higher price per m3fub. Expand a buyer in the table above to see their volume bonuses.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '< 200 m\u00B3', desc: lang === 'sv' ? 'Baspris' : 'Base price', color: 'var(--text3)' },
                  { label: '200-500 m\u00B3', desc: '+10 kr/m\u00B3', color: '#fbbf24' },
                  { label: '500-1000 m\u00B3', desc: '+25 kr/m\u00B3', color: '#f59e0b' },
                  { label: '> 1000 m\u00B3', desc: '+40 kr/m\u00B3', color: '#4ade80' },
                ].map((tier) => (
                  <div key={tier.label} className="text-center p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs font-mono font-semibold" style={{ color: tier.color }}>
                      {tier.desc}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-1">{tier.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ TIMING TAB ═══ */}
        {activeTab === 'timing' && (
          <>
            <SellingWindow sellingWindow={market.sellingWindow} />

            {/* Seasonal insight */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-2">
                {lang === 'sv' ? 'Sasongsmonster i svenska virkesmarknaden' : 'Seasonal Patterns in Swedish Timber'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--text2)]">
                <div>
                  <p className="font-semibold text-[var(--green)] mb-1">
                    {lang === 'sv' ? 'Hogsasong (nov-feb)' : 'Peak Season (Nov-Feb)'}
                  </p>
                  <p className="text-[var(--text3)]">
                    {lang === 'sv'
                      ? 'Byggefterfragen driver upp timmerpriser. Massavedspriser ocksa uppat pga energiefterfragen.'
                      : 'Construction demand drives sawlog prices up. Pulpwood prices also rise due to energy demand.'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-red-400 mb-1">
                    {lang === 'sv' ? 'Lagsasong (jun-aug)' : 'Low Season (Jun-Aug)'}
                  </p>
                  <p className="text-[var(--text3)]">
                    {lang === 'sv'
                      ? 'Sagverksstopp, semestrar och hogt utbud pressar priserna nedat.'
                      : 'Mill shutdowns, holidays, and high supply push prices down.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ AUCTION TAB ═══ */}
        {activeTab === 'auction' && (
          <>
            <AuctionBoard />

            {/* How it works */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
                {lang === 'sv' ? 'Hur virkesauktionen fungerar' : 'How the Timber Auction Works'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: '1',
                    titleSv: 'Lagg upp ditt virke',
                    titleEn: 'Post your timber',
                    descSv: 'Valj sortiment, volym och plats. Starta auktionen.',
                    descEn: 'Choose assortment, volume and location. Start the auction.',
                  },
                  {
                    step: '2',
                    titleSv: 'Kopare bjuder',
                    titleEn: 'Buyers bid',
                    descSv: 'Kopare tackar mot varandra i realtid. Priserna stiger.',
                    descEn: 'Buyers compete in real-time. Prices rise.',
                  },
                  {
                    step: '3',
                    titleSv: 'Acceptera basta bud',
                    titleEn: 'Accept best bid',
                    descSv: 'Valj det bud som passar dig bast. Kontakt skapas automatiskt.',
                    descEn: 'Choose the bid that suits you best. Contact is created automatically.',
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-8 h-8 rounded-full bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center mx-auto mb-2 text-sm font-semibold">
                      {item.step}
                    </div>
                    <p className="text-xs font-semibold text-[var(--text)] mb-1">
                      {lang === 'sv' ? item.titleSv : item.titleEn}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {lang === 'sv' ? item.descSv : item.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center pb-4">
          {t('market.disclaimer')}
        </p>
      </div>
    </div>
  );
}
