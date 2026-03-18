/**
 * ForestFinancePage — Green Finance Gateway: the Bloomberg Terminal for forest assets.
 * Real-time valuations, green loan finder, collateral certificates, and investment analysis.
 *
 * Route: /owner/forest-finance
 */

import {
  Landmark,
  BarChart3,
  FileCheck,
  TrendingUp,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForestFinance } from '@/hooks/useForestFinance';
import { ValuationDashboard } from '@/components/finance/ValuationDashboard';
import { GreenLoanFinder } from '@/components/finance/GreenLoanFinder';
import { CollateralCertificate } from '@/components/finance/CollateralCertificate';
import { InvestmentAnalysis } from '@/components/finance/InvestmentAnalysis';

const TABS = [
  { key: 'valuation' as const, label: 'Värdering', icon: BarChart3 },
  { key: 'loans' as const, label: 'Gröna lån', icon: Landmark },
  { key: 'certificate' as const, label: 'Intyg', icon: FileCheck },
  { key: 'investment' as const, label: 'Investering', icon: TrendingUp },
];

export default function ForestFinancePage() {
  const finance = useForestFinance();

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 sm:px-6 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/owner/dashboard"
              className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--text3)]" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Landmark size={20} className="text-[var(--green)]" />
                <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                  Green Finance Gateway
                </h1>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[var(--green)]/10 text-[var(--green)]">
                  <Sparkles size={10} />
                  Bloomberg f&ouml;r skog
                </span>
              </div>
              <p className="text-xs text-[var(--text3)] mt-0.5">
                Realtidsvärdering &middot; Gröna lån &middot; Bankbara intyg &middot; Investeringsanalys
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = finance.activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => finance.setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Quick stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <QuickStat
            label="Totalt fastighetsvärde"
            value="12.5 MSEK"
            change="+1.2%"
            positive
          />
          <QuickStat
            label="Bästa gröna ränta"
            value="2.1%"
            change="-2.1 pp vs standard"
            positive
          />
          <QuickStat
            label="Max låneutrymme"
            value="9.4 MSEK"
            change="75% LTV"
          />
          <QuickStat
            label="Årlig avkastning"
            value="9.8%"
            change="20-års snitt"
          />
        </div>

        {/* Tab panels */}
        {finance.activeTab === 'valuation' && (
          <ValuationDashboard
            totalValue={finance.totalValue}
            confidenceInterval={finance.confidenceInterval}
            breakdown={finance.breakdown}
            quarterlyHistory={finance.quarterlyHistory}
            parcelValuations={finance.parcelValuations}
            lastUpdated={finance.lastUpdated}
          />
        )}

        {finance.activeTab === 'loans' && (
          <GreenLoanFinder
            loanOffers={finance.loanOffers}
            selectedLoanAmount={finance.selectedLoanAmount}
            setSelectedLoanAmount={finance.setSelectedLoanAmount}
            selectedTerm={finance.selectedTerm}
            setSelectedTerm={finance.setSelectedTerm}
            greenPayment={finance.greenPayment}
            standardPayment={finance.standardPayment}
            interestSavings={finance.interestSavings}
            calculateMonthlyPayment={finance.calculateMonthlyPayment}
            totalValue={finance.totalValue}
          />
        )}

        {finance.activeTab === 'certificate' && (
          <CollateralCertificate certificate={finance.certificate} />
        )}

        {finance.activeTab === 'investment' && (
          <InvestmentAnalysis
            investmentMetrics={finance.investmentMetrics}
            assetComparisons={finance.assetComparisons}
          />
        )}
      </div>
    </div>
  );
}

// ─── Quick Stat ───

function QuickStat({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <p className="text-[10px] text-[var(--text3)] mb-1">{label}</p>
      <p className="text-lg font-bold font-mono text-[var(--text)]">{value}</p>
      <p
        className={`text-[10px] font-mono mt-0.5 ${
          positive ? 'text-[var(--green)]' : 'text-[var(--text3)]'
        }`}
      >
        {change}
      </p>
    </div>
  );
}
