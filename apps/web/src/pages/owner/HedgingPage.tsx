import { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Shield,
  BarChart3,
  BookOpen,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHedging } from '@/hooks/useHedging';
import { ExposureAnalysis } from '@/components/hedging/ExposureAnalysis';
import { ForwardContracts } from '@/components/hedging/ForwardContracts';
import { PriceInsurance } from '@/components/hedging/PriceInsurance';
import { ActiveHedges } from '@/components/hedging/ActiveHedges';
import { HedgingEducation } from '@/components/hedging/HedgingEducation';

type TabId = 'exposure' | 'forwards' | 'insurance' | 'active' | 'education';

interface TabDef {
  id: TabId;
  labelSv: string;
  labelEn: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'exposure', labelSv: 'Exponering', labelEn: 'Exposure', icon: <BarChart3 size={14} /> },
  { id: 'forwards', labelSv: 'Terminskontrakt', labelEn: 'Forward Contracts', icon: <TrendingUp size={14} /> },
  { id: 'insurance', labelSv: 'Prisforsakring', labelEn: 'Price Insurance', icon: <Shield size={14} /> },
  { id: 'active', labelSv: 'Aktiva Hedgar', labelEn: 'Active Hedges', icon: <Activity size={14} /> },
  { id: 'education', labelSv: 'Utbildning', labelEn: 'Education', icon: <BookOpen size={14} /> },
];

function TabContent({ tabId, hedging }: { tabId: TabId; hedging: ReturnType<typeof useHedging> }) {
  switch (tabId) {
    case 'exposure':
      return (
        <ExposureAnalysis
          exposures={hedging.exposures}
          totalUnhedgedM3={hedging.totalUnhedgedM3}
          totalHedgedM3={hedging.totalHedgedM3}
          totalUnhedgedValueSEK={hedging.totalUnhedgedValueSEK}
          valueAtRisk10={hedging.valueAtRisk10}
          valueAtRisk20={hedging.valueAtRisk20}
          valueAtRisk30={hedging.valueAtRisk30}
        />
      );
    case 'forwards':
      return (
        <ForwardContracts
          contracts={hedging.forwardContracts}
          onSign={hedging.signForwardContract}
        />
      );
    case 'insurance':
      return (
        <PriceInsurance
          quotes={hedging.insuranceQuotes}
          onPurchase={hedging.purchaseInsurance}
        />
      );
    case 'active':
      return (
        <ActiveHedges
          hedges={hedging.activeHedges}
          hedgeRatioPct={hedging.hedgeRatioPct}
          totalPnlSEK={hedging.totalPnlSEK}
          pnlHistory={hedging.pnlHistory}
          onClose={hedging.closeHedge}
          onRollForward={hedging.rollForward}
        />
      );
    case 'education':
      return <HedgingEducation />;
    default:
      return null;
  }
}

export default function HedgingPage() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const [activeTab, setActiveTab] = useState<TabId>('exposure');
  const hedging = useHedging();

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
                <Shield size={20} className="text-[var(--green)]" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                  {lang === 'sv' ? 'Prishedging' : 'Timber Price Hedging'}
                </h1>
                <p className="text-sm text-[var(--text3)] mt-0.5">
                  {lang === 'sv'
                    ? 'Skydda ditt virkespris med terminskontrakt och prisforsakring.'
                    : 'Protect your timber price with forward contracts and price insurance.'}
                </p>
              </div>
            </div>

            {/* Summary badge */}
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <div className="text-center">
                <p className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Hedgekvot' : 'Hedge ratio'}</p>
                <p className="text-sm font-mono font-semibold text-[var(--green)]">{hedging.hedgeRatioPct}%</p>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div className="text-center">
                <p className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Ohedgat' : 'Unhedged'}</p>
                <p className="text-sm font-mono font-semibold text-amber-400">
                  {hedging.totalUnhedgedM3} m³
                </p>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div className="text-center">
                <p className="text-[10px] text-[var(--text3)]">P&L</p>
                <p className={`text-sm font-mono font-semibold ${hedging.totalPnlSEK >= 0 ? 'text-[var(--green)]' : 'text-red-400'}`}>
                  {hedging.totalPnlSEK >= 0 ? '+' : ''}{hedging.totalPnlSEK.toLocaleString('sv-SE')} SEK
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations banner */}
        {hedging.recommendations.length > 0 && (
          <div className="space-y-2">
            {hedging.recommendations
              .filter((r) => r.urgency === 'high')
              .map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-amber-500/30 p-4"
                  style={{ background: 'rgba(251,191,36,0.05)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 mb-1">{rec.title}</p>
                      <p className="text-xs text-[var(--text2)]">{rec.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (rec.action.toLowerCase().includes('termin')) setActiveTab('forwards');
                        else if (rec.action.toLowerCase().includes('forsakring')) setActiveTab('insurance');
                      }}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition whitespace-nowrap"
                    >
                      {rec.action}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

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

        {/* Tab content */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <TabContent tabId={activeTab} hedging={hedging} />
        </Suspense>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center pb-4">
          {lang === 'sv'
            ? 'Hedging-instrumenten ar simulerade i demoversion. Faktiska kontrakt och forsakringar tecknas via certifierade motparter.'
            : 'Hedging instruments are simulated in the demo version. Actual contracts and insurance are signed through certified counterparties.'}
        </p>
      </div>
    </div>
  );
}
