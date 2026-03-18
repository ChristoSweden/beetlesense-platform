/**
 * SuccessionPlanPage — Full succession & estate planning tool.
 *
 * Helps Swedish forest owners plan tax-optimal generational transfers.
 * Four sections: Estate Overview, Transfer Strategy, Tax Simulator, Timeline.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  Building2,
  GitCompare,
  Calculator,
  Calendar,
} from 'lucide-react';
import { useSuccessionPlan } from '@/hooks/useSuccessionPlan';
import { EstateOverview } from '@/components/succession/EstateOverview';
import { TransferStrategy } from '@/components/succession/TransferStrategy';
import { TaxSimulator } from '@/components/succession/TaxSimulator';
import { SuccessionTimeline } from '@/components/succession/SuccessionTimeline';

type Section = 'overview' | 'strategy' | 'tax' | 'timeline';

const SECTION_ICONS: Record<Section, React.ReactNode> = {
  overview: <Building2 size={14} />,
  strategy: <GitCompare size={14} />,
  tax: <Calculator size={14} />,
  timeline: <Calendar size={14} />,
};

export default function SuccessionPlanPage() {
  const { i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const plan = useSuccessionPlan();

  const sections: { key: Section; label: string }[] = [
    { key: 'overview', label: isSv ? 'Fastighetsoversikt' : 'Estate Overview' },
    { key: 'strategy', label: isSv ? 'Overlatelsestrategi' : 'Transfer Strategy' },
    { key: 'tax', label: isSv ? 'Skattesimulator' : 'Tax Simulator' },
    { key: 'timeline', label: isSv ? 'Tidsplan' : 'Timeline' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Hero Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <HeartHandshake size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {isSv ? 'Generationsvaxling & Arvplanering' : 'Succession & Estate Planning'}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {isSv
                  ? 'Planera skatteoptimal overlatelse av din skogsfastighet'
                  : 'Plan tax-optimal generational transfer of your forest property'}
              </p>
            </div>
          </div>
        </div>

        {/* Key stats banner */}
        <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
                {isSv
                  ? 'Sverige har inga arv- eller gavoskatter sedan 2005'
                  : 'Sweden has no inheritance or gift tax since 2005'}
              </h2>
              <p className="text-xs text-[var(--text2)]">
                {isSv
                  ? 'Men kapitalvinstskatt vid forsaljning, stampelskatt pa lagfart och skogsspecifika regler gor det viktigt att valja ratt overlatelseform.'
                  : 'But capital gains tax on sale, stamp duty on title registration, and forest-specific rules make choosing the right transfer method critical.'}
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs flex-shrink-0">
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--green)]">0%</p>
                <p className="text-[10px] text-[var(--text3)]">
                  {isSv ? 'Gavoskatt' : 'Gift tax'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--green)]">0%</p>
                <p className="text-[10px] text-[var(--text3)]">
                  {isSv ? 'Arvsskatt' : 'Inheritance tax'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--text)]">22%</p>
                <p className="text-[10px] text-[var(--text3)]">
                  {isSv ? 'Kap.vinst (eff.)' : 'Cap. gains (eff.)'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--text)]">1.5%</p>
                <p className="text-[10px] text-[var(--text3)]">
                  {isSv ? 'Stampelskatt' : 'Stamp duty'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estate summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div
            className="rounded-xl border border-[var(--border)] p-3"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Totalt varde' : 'Total value'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--green)]">
              {plan.formatSEK(plan.estate.totalValue)}
            </p>
          </div>
          <div
            className="rounded-xl border border-[var(--border)] p-3"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Skiften' : 'Parcels'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {plan.estate.parcels.length} st
            </p>
          </div>
          <div
            className="rounded-xl border border-[var(--border)] p-3"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Skogsareal' : 'Forest area'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {plan.estate.totalAreaHa} ha
            </p>
          </div>
          <div
            className="rounded-xl border border-[var(--border)] p-3"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Arvingar' : 'Heirs'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {plan.heirs.length} st
            </p>
          </div>
        </div>

        {/* Section navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all
                whitespace-nowrap -mb-px border-b-2
                ${
                  activeSection === section.key
                    ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                    : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              <span
                className={
                  activeSection === section.key
                    ? 'text-[var(--green)]'
                    : 'text-[var(--text3)]'
                }
              >
                {SECTION_ICONS[section.key]}
              </span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="min-h-[60vh]">
          {activeSection === 'overview' && <EstateOverview estate={plan.estate} />}

          {activeSection === 'strategy' && (
            <TransferStrategy
              taxSimulations={plan.taxSimulations}
              selectedMethod={plan.selectedMethod}
              onSelectMethod={plan.setSelectedMethod}
              estateValue={plan.estate.totalValue}
              heirCount={plan.heirs.length}
            />
          )}

          {activeSection === 'tax' && (
            <TaxSimulator
              estateValue={plan.estate.totalValue}
              taxBasis={plan.taxBasis}
              setTaxBasis={plan.setTaxBasis}
              skogskontoBalance={plan.skogskontoBalance}
              setSkogskontoBalance={plan.setSkogskontoBalance}
              heirs={plan.heirs}
              addHeir={plan.addHeir}
              removeHeir={plan.removeHeir}
              updateHeir={plan.updateHeir}
              taxSimulations={plan.taxSimulations}
              currentSimulation={plan.currentSimulation}
              selectedMethod={plan.selectedMethod}
              setSelectedMethod={plan.setSelectedMethod}
              stagedTransferYears={plan.stagedTransferYears}
              setStagedTransferYears={plan.setStagedTransferYears}
            />
          )}

          {activeSection === 'timeline' && (
            <SuccessionTimeline
              timeline={plan.timeline}
              toggleMilestoneStatus={plan.toggleMilestoneStatus}
              toggleChecklistItem={plan.toggleChecklistItem}
              completedMilestones={plan.completedMilestones}
              totalMilestones={plan.totalMilestones}
              isComplete={plan.isComplete}
            />
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)]">
            {isSv
              ? 'Obs: Denna berakning ar en forenklad modell och ersatter inte professionell skatte- eller juridisk radgivning. Kontakta alltid en kvalificerad jurist och skatteradgivare innan overlatelse genomfors. Skatteregler kan andras. Senast uppdaterad: mars 2026.'
              : 'Note: This calculation is a simplified model and does not replace professional tax or legal advice. Always consult a qualified lawyer and tax advisor before executing a transfer. Tax rules may change. Last updated: March 2026.'}
          </p>
        </div>
      </div>
    </div>
  );
}
