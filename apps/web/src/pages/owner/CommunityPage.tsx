import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Bell,
  Star,
  TrendingUp,
  Sparkles,
  Users,
} from 'lucide-react';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import { SightingsFeed } from '@/components/community/SightingsFeed';
import { NeighborAlerts } from '@/components/community/NeighborAlerts';
import { ContractorReviews } from '@/components/community/ContractorReviews';
import { PriceSharing } from '@/components/community/PriceSharing';
import { useCommunity } from '@/hooks/useCommunity';

type Tab = 'sightings' | 'alerts' | 'reviews' | 'prices';

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function CommunityPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('sightings');
  const [companionOpen, setCompanionOpen] = useState(false);

  const community = useCommunity();

  const tabs: TabConfig[] = [
    {
      id: 'sightings',
      label: 'Observationer',
      icon: <Eye size={14} />,
      badge: community.sightings.length,
    },
    {
      id: 'alerts',
      label: 'Grannvarningar',
      icon: <Bell size={14} />,
      badge: community.alerts.filter((a) => a.severity === 'critical').length || undefined,
    },
    {
      id: 'reviews',
      label: 'Recensioner',
      icon: <Star size={14} />,
    },
    {
      id: 'prices',
      label: 'Prisdelning',
      icon: <TrendingUp size={14} />,
    },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: '#4ade8015', color: '#4ade80' }}
              >
                <Users size={18} />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                  Kunskapsnätverk
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  Crowdsourcad skogsintelligens — som Waze for skogsbruk
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompanionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/10 transition-colors"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">{t('owner.dashboard.askAi')}</span>
            </button>
          </div>

          {/* Tab bar */}
          <div className="mt-5 flex border-b border-[var(--border)] overflow-x-auto -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--green)] text-[var(--green)]'
                    : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    className={`ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-[var(--green)]/15 text-[var(--green)]'
                        : tab.id === 'alerts'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-[var(--bg3)] text-[var(--text3)]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-5">
            {activeTab === 'sightings' && (
              <SightingsFeed
                sightings={community.sightings}
                isLoading={community.sightingsLoading}
                verifiedSet={community.verifiedSet}
                onVerify={community.verifySighting}
                onAdd={community.addSighting}
              />
            )}

            {activeTab === 'alerts' && (
              <NeighborAlerts
                alerts={community.alerts}
                isLoading={community.alertsLoading}
                alertRadius={community.alertRadius}
                onRadiusChange={community.setAlertRadius}
              />
            )}

            {activeTab === 'reviews' && (
              <ContractorReviews
                contractors={community.contractors}
                isLoading={community.contractorsLoading}
                sort={community.contractorSort}
                onSortChange={community.setContractorSort}
              />
            )}

            {activeTab === 'prices' && (
              <PriceSharing
                priceReports={community.priceReports}
                aggregatedPrices={community.aggregatedPrices}
                isLoading={community.pricesLoading}
                onAddPrice={community.addPriceReport}
              />
            )}
          </div>
        </div>
      </div>

      {/* AI Companion Panel */}
      <CompanionPanel
        isOpen={companionOpen}
        onToggle={() => setCompanionOpen(!companionOpen)}
      />
    </div>
  );
}
