import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf,
  Banknote,
  TreePine,
  Award,
  Sparkles,
  ShoppingCart,
  Satellite,
} from 'lucide-react';
import { DEMO_PARCELS, analyzeParcel } from '@/services/carbonService';
import { CarbonDashboard } from '@/components/carbon/CarbonDashboard';
import { RevenueCalculator } from '@/components/carbon/RevenueCalculator';
import { BiodiversityCredits } from '@/components/carbon/BiodiversityCredits';
import { CertificationWizard } from '@/components/carbon/CertificationWizard';
import { CarbonChart } from '@/components/carbon/CarbonChart';
import { CarbonMarketplace } from '@/components/carbon/CarbonMarketplace';
import { CarbonVerification } from '@/components/carbon/CarbonVerification';

type Tab = 'overview' | 'marketplace' | 'verification' | 'revenue' | 'biodiversity' | 'certification' | 'chart';

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  overview: <Leaf size={14} />,
  marketplace: <ShoppingCart size={14} />,
  verification: <Satellite size={14} />,
  revenue: <Banknote size={14} />,
  biodiversity: <TreePine size={14} />,
  certification: <Award size={14} />,
  chart: <Sparkles size={14} />,
};

export default function CarbonPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const results = useMemo(
    () => DEMO_PARCELS.map(analyzeParcel),
    [],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('carbon.tabs.overview') },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'verification', label: 'Verification' },
    { key: 'revenue', label: t('carbon.tabs.revenue') },
    { key: 'biodiversity', label: t('carbon.tabs.biodiversity') },
    { key: 'chart', label: t('carbon.tabs.chart') },
    { key: 'certification', label: t('carbon.tabs.certification') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Leaf size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {t('carbon.page.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('carbon.page.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all
                whitespace-nowrap -mb-px border-b-2
                ${activeTab === tab.key
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              <span className={activeTab === tab.key ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                {TAB_ICONS[tab.key]}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[60vh]">
          {activeTab === 'overview' && <CarbonDashboard results={results} />}
          {activeTab === 'marketplace' && <CarbonMarketplace />}
          {activeTab === 'verification' && <CarbonVerification />}
          {activeTab === 'revenue' && <RevenueCalculator results={results} />}
          {activeTab === 'biodiversity' && <BiodiversityCredits parcels={DEMO_PARCELS} />}
          {activeTab === 'chart' && <CarbonChart parcels={DEMO_PARCELS} />}
          {activeTab === 'certification' && <CertificationWizard parcels={DEMO_PARCELS} />}
        </div>
      </div>
    </div>
  );
}
