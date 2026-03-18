/**
 * ContractOptimizerPage — Shows forest owners how much value they lose to
 * long-term contracts with Stora Enso, Södra, etc.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  TrendingDown,
  Scale,
  MessageSquare,
} from 'lucide-react';
import { useContractAnalysis } from '@/hooks/useContractAnalysis';
import { ContractPortfolio } from '@/components/contracts/ContractPortfolio';
import { ValueLeakageAnalysis } from '@/components/contracts/ValueLeakageAnalysis';
import { IndependenceCalculator } from '@/components/contracts/IndependenceCalculator';
import { RenegotiationAdvisor } from '@/components/contracts/RenegotiationAdvisor';

type Section = 'portfolio' | 'leakage' | 'independence' | 'renegotiation';

const TABS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'portfolio', label: 'Avtalsöversikt', icon: FileText },
  { id: 'leakage', label: 'Värdeanalys', icon: TrendingDown },
  { id: 'independence', label: 'Oberoende-kalkyl', icon: Scale },
  { id: 'renegotiation', label: 'Omförhandling', icon: MessageSquare },
];

export default function ContractOptimizerPage() {
  const [activeSection, setActiveSection] = useState<Section>('portfolio');

  const {
    contracts,
    valueLeakages,
    totalLeakage,
    independenceComparison,
    renegotiationWindows,
    riskTolerance,
    setRiskTolerance,
    selectedContractId,
    setSelectedContractId,
    selectedContract,
    selectedLeakage,
  } = useContractAnalysis();

  // When user clicks "Analysera" on a contract, switch to leakage tab
  const handleSelectContract = (id: string) => {
    setSelectedContractId(id);
    if (activeSection === 'portfolio') {
      setActiveSection('leakage');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/owner/dashboard"
              className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--text3)]" />
            </Link>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Kontraktsoptimerare
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Analysera dina virkesavtal och upptäck hur mycket värde du tappar
              </p>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-px -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-[var(--border)] text-[var(--green)] bg-[var(--bg)]'
                      : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                    }
                  `}
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Portfolio */}
        {activeSection === 'portfolio' && (
          <ContractPortfolio
            contracts={contracts}
            valueLeakages={valueLeakages}
            totalLeakage={totalLeakage}
            onSelectContract={handleSelectContract}
            selectedContractId={selectedContractId}
          />
        )}

        {/* Value Leakage Analysis */}
        {activeSection === 'leakage' && (
          <>
            {/* Contract selector if none selected */}
            {!selectedContract && (
              <div className="text-center py-12">
                <TrendingDown size={32} className="text-[var(--text3)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text2)] mb-2">Välj ett avtal att analysera</p>
                <p className="text-xs text-[var(--text3)] mb-4">
                  Gå till avtalsöversikten och klicka &quot;Analysera&quot; på ett avtal
                </p>
                <button
                  onClick={() => setActiveSection('portfolio')}
                  className="text-xs font-medium text-[var(--green)] hover:text-[var(--green)]/80"
                >
                  Visa avtal
                </button>
              </div>
            )}

            {selectedContract && selectedLeakage && (
              <>
                {/* Contract selector pills */}
                <div className="flex gap-2 mb-5">
                  {contracts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContractId(c.id)}
                      className={`
                        px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all
                        ${selectedContractId === c.id
                          ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                          : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                        }
                      `}
                    >
                      {c.buyer}
                    </button>
                  ))}
                </div>

                <ValueLeakageAnalysis
                  contract={selectedContract}
                  leakage={selectedLeakage}
                />
              </>
            )}
          </>
        )}

        {/* Independence Calculator */}
        {activeSection === 'independence' && (
          <IndependenceCalculator
            comparison={independenceComparison}
            riskTolerance={riskTolerance}
            onRiskChange={setRiskTolerance}
          />
        )}

        {/* Renegotiation Advisor */}
        {activeSection === 'renegotiation' && (
          <RenegotiationAdvisor windows={renegotiationWindows} />
        )}
      </div>
    </div>
  );
}
