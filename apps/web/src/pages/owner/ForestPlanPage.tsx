import { useState } from 'react';
import {
  TreePine,
  Sparkles,
  Calendar,
  TrendingUp,
  ShieldAlert,
  FileText,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForestPlan } from '@/hooks/useForestPlan';
import { GoalWizard } from '@/components/plan/GoalWizard';
import { PlanTimeline } from '@/components/plan/PlanTimeline';
import { ProjectedOutcomes } from '@/components/plan/ProjectedOutcomes';
import { ContingencyPlan } from '@/components/plan/ContingencyPlan';
import { PlanExport } from '@/components/plan/PlanExport';

type Tab = 'goals' | 'timeline' | 'outcomes' | 'contingency' | 'export';

const PLAN_TABS: { key: Tab; label: string; icon: typeof TreePine; requiresPlan: boolean }[] = [
  { key: 'goals', label: 'Målprofil', icon: Sparkles, requiresPlan: false },
  { key: 'timeline', label: 'Åtgärdskalender', icon: Calendar, requiresPlan: true },
  { key: 'outcomes', label: 'Prognoser', icon: TrendingUp, requiresPlan: true },
  { key: 'contingency', label: 'Beredskap', icon: ShieldAlert, requiresPlan: true },
  { key: 'export', label: 'Exportera', icon: FileText, requiresPlan: true },
];

export default function ForestPlanPage() {
  const {
    goals,
    updateGoal,
    profileLabel,
    activePreset,
    applyPreset,
    planState,
    plan,
    generate,
    reset,
    formatSEK,
  } = useForestPlan();

  const [activeTab, setActiveTab] = useState<Tab>('goals');

  // When plan is generated, auto-switch to timeline
  const handleGenerate = () => {
    generate();
    // After generation completes, switch tab (the hook has a 2.2s delay)
    setTimeout(() => setActiveTab('timeline'), 2300);
  };

  const hasPlan = planState === 'ready' && plan !== null;

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 lg:px-6 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/owner/dashboard"
              className="text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            >
              <ChevronLeft size={16} />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74, 222, 128, 0.12)' }}>
              <TreePine size={16} className="text-[#4ade80]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Skogsbruksplan AI
              </h1>
              <p className="text-[10px] text-[var(--text3)]">
                Generativ AI som skapar kompletta 50-åriga förvaltningsplaner
              </p>
            </div>
          </div>

          {hasPlan && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ borderColor: 'rgba(74, 222, 128, 0.2)', background: 'rgba(74, 222, 128, 0.05)' }}>
                <Sparkles size={11} className="text-[#4ade80]" />
                <span className="text-[10px] text-[#4ade80] font-medium">{plan.profileDescription}</span>
              </div>
              <button
                onClick={() => { reset(); setActiveTab('goals'); }}
                className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] transition-colors underline"
              >
                Ny plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-[var(--border)] px-4 lg:px-6" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {PLAN_TABS.map((tab) => {
            const disabled = tab.requiresPlan && !hasPlan;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => !disabled && setActiveTab(tab.key)}
                disabled={disabled}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#4ade80] text-[#4ade80]'
                    : disabled
                      ? 'border-transparent text-[var(--text3)]/40 cursor-not-allowed'
                      : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Goals tab - wizard layout */}
          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Wizard sidebar */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#4ade80]" />
                    <h2 className="text-sm font-serif font-bold text-[var(--text)]">
                      Dina prioriteringar
                    </h2>
                  </div>
                  <GoalWizard
                    goals={goals}
                    activePreset={activePreset}
                    profileLabel={profileLabel}
                    planState={planState}
                    onUpdateGoal={updateGoal}
                    onApplyPreset={applyPreset}
                    onGenerate={handleGenerate}
                  />
                </div>
              </div>

              {/* Preview / info */}
              <div className="lg:col-span-3 space-y-5">
                {/* What you get */}
                <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <h3 className="text-sm font-serif font-bold text-[var(--text)] mb-3">
                    Vad du får
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: Calendar, label: '50-årig åtgärdskalender', desc: 'Årliga insatser per skifte med tidslinje' },
                      { icon: TrendingUp, label: 'Intäkts- & värdeprognoser', desc: 'Virke, kol, ekosystem och rekreation' },
                      { icon: ShieldAlert, label: 'Beredskapsplaner', desc: 'Barkborre, storm, marknadskrasch' },
                      { icon: FileText, label: 'Exporterbar rapport', desc: 'PDF, Excel, GIS — dela med bank eller familj' },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--bg)]">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
                          <Icon size={13} className="text-[#4ade80]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-[var(--text)]">{label}</p>
                          <p className="text-[9px] text-[var(--text3)] mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your forest parcels */}
                <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <h3 className="text-sm font-serif font-bold text-[var(--text)] mb-3">
                    Dina skiften
                  </h3>
                  <div className="space-y-2">
                    {['Norra Skogen', 'Ekbacken', 'Tallmon', 'Granudden', 'Björklund'].map((name) => {
                      const parcel = useForestPlan().parcels?.find(p => p.name === name);
                      return (
                        <div key={name} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)]">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: name === 'Granudden' ? '#f97316' : name === 'Norra Skogen' ? '#fbbf24' : '#4ade80',
                              }}
                            />
                            <span className="text-[11px] font-medium text-[var(--text)]">{name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text3)]">
                            {parcel?.area_hectares ?? '—'} ha
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text3)]">Total areal</span>
                    <span className="text-[11px] font-mono font-semibold text-[var(--text)]">214.8 ha</span>
                  </div>
                </div>

                {/* How it works */}
                <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <h3 className="text-sm font-serif font-bold text-[var(--text)] mb-3">
                    Så fungerar det
                  </h3>
                  <div className="flex items-center gap-2">
                    {[
                      { step: '1', label: 'Ange mål' },
                      { step: '2', label: 'AI analyserar' },
                      { step: '3', label: 'Granska plan' },
                      { step: '4', label: 'Exportera' },
                    ].map(({ step, label }, idx) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80' }}>
                            {step}
                          </div>
                          <span className="text-[10px] text-[var(--text2)]">{label}</span>
                        </div>
                        {idx < 3 && <ArrowRight size={12} className="text-[var(--text3)]" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && hasPlan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-[#4ade80]" />
                <h2 className="text-sm font-serif font-bold text-[var(--text)]">
                  50-årig åtgärdskalender (2026-2076)
                </h2>
                <span className="text-[10px] text-[var(--text3)]">
                  {plan.actions.length} planerade åtgärder
                </span>
              </div>
              <PlanTimeline plan={plan} formatSEK={formatSEK} />
            </div>
          )}

          {/* Outcomes tab */}
          {activeTab === 'outcomes' && hasPlan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[#4ade80]" />
                <h2 className="text-sm font-serif font-bold text-[var(--text)]">
                  Projekterade utfall
                </h2>
                <span className="text-[10px] text-[var(--text3)]">
                  Vad händer om du följer planen
                </span>
              </div>
              <ProjectedOutcomes plan={plan} formatSEK={formatSEK} />
            </div>
          )}

          {/* Contingency tab */}
          {activeTab === 'contingency' && hasPlan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={16} className="text-[#f97316]" />
                <h2 className="text-sm font-serif font-bold text-[var(--text)]">
                  Beredskapsplaner
                </h2>
                <span className="text-[10px] text-[var(--text3)]">
                  Tänk-om-scenarier och beredskap
                </span>
              </div>
              <ContingencyPlan plan={plan} formatSEK={formatSEK} />
            </div>
          )}

          {/* Export tab */}
          {activeTab === 'export' && hasPlan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-[#4ade80]" />
                <h2 className="text-sm font-serif font-bold text-[var(--text)]">
                  Exportera & dela
                </h2>
                <span className="text-[10px] text-[var(--text3)]">
                  Ladda ner eller dela din skogsbruksplan
                </span>
              </div>
              <PlanExport plan={plan} formatSEK={formatSEK} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
