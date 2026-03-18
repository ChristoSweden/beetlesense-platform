import { useState } from 'react';
import {
  Shield,
  FileText,
  History,
  GitCompare,
  AlertTriangle,
  Bug,
} from 'lucide-react';
import { useInsurance } from '@/hooks/useInsurance';
import { CoverageOverview } from '@/components/insurance/CoverageOverview';
import { ClaimBuilder } from '@/components/insurance/ClaimBuilder';
import { ClaimHistory } from '@/components/insurance/ClaimHistory';
import { ProviderComparison } from '@/components/insurance/ProviderComparison';

type Tab = 'overview' | 'claim' | 'history' | 'compare';

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Översikt', icon: <Shield size={14} /> },
  { key: 'claim', label: 'Skaderapport', icon: <FileText size={14} /> },
  { key: 'history', label: 'Historik', icon: <History size={14} /> },
  { key: 'compare', label: 'Jämför', icon: <GitCompare size={14} /> },
];

export default function InsurancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    policy,
    claims,
    damageAlerts,
    providers,
    parcels,
    totalHistoricalPayouts,
    potentialSavings,
    builder,
    setStep,
    setDamageType,
    toggleParcel,
    calculateEvidence,
    resetBuilder,
  } = useInsurance();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Shield size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Försäkring & Skaderapporter
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Automatiserad skadehantering med satellitbevis
              </p>
            </div>
          </div>
        </div>

        {/* Active damage alert banner */}
        {damageAlerts.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-500/30 p-4" style={{ background: 'rgba(251,191,36,0.05)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 mb-1">Aktiv skadedetektering</p>
                {damageAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 mt-1">
                    <Bug size={12} className="text-amber-400" />
                    <p className="text-xs text-[var(--text)]">
                      <span className="font-medium">{alert.parcelName}</span> — {alert.estimatedAreaHa} ha drabbad, {alert.estimatedDamagePct}% skadegrad
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('claim');
                        setDamageType('beetle');
                        toggleParcel(alert.parcelId);
                      }}
                      className="ml-auto text-[10px] font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap"
                    >
                      Starta skaderapport &rarr;
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-[var(--text3)] mt-2">
                  BeetleSense upptäckte skadan 2 veckor innan ditt försäkringsbolag kände till den.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20'
                  : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <CoverageOverview
            policy={policy}
            potentialSavings={potentialSavings}
            onCompare={() => setActiveTab('compare')}
          />
        )}

        {activeTab === 'claim' && (
          <ClaimBuilder
            builder={builder}
            parcels={parcels}
            onSetStep={setStep}
            onSetDamageType={setDamageType}
            onToggleParcel={toggleParcel}
            onCalculateEvidence={calculateEvidence}
            onReset={resetBuilder}
          />
        )}

        {activeTab === 'history' && (
          <ClaimHistory
            claims={claims}
            totalHistoricalPayouts={totalHistoricalPayouts}
          />
        )}

        {activeTab === 'compare' && (
          <ProviderComparison
            providers={providers}
            currentPolicy={policy}
            potentialSavings={potentialSavings}
          />
        )}
      </div>
    </div>
  );
}
