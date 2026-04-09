import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, TreePine, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import {
  generateDemoForestPlan,
  getPlanFinancials,
  formatSEK,
  generatePlanPDF,
  type ForestPlan,
  type PlanRecommendation,
} from '@/services/forestPlanService';

const ACTION_LABELS: Record<string, string> = {
  final_felling: 'Final felling',
  thinning: 'Thinning',
  planting: 'Planting',
  monitoring: 'Monitoring',
  no_action: 'No action',
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  high: { color: '#ef4444', bg: '#fef2f2' },
  medium: { color: '#f59e0b', bg: '#fffbeb' },
  low: { color: '#22c55e', bg: '#f0fdf4' },
};

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  high: { color: '#ef4444', bg: '#fef2f2' },
  medium: { color: '#f59e0b', bg: '#fffbeb' },
  low: { color: '#22c55e', bg: '#f0fdf4' },
};

export default function ForestPlanGeneratorPage() {
  const [plan] = useState<ForestPlan>(() => generateDemoForestPlan());
  const financials = useMemo(() => getPlanFinancials(plan), [plan]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'harvest' | 'risks'>('overview');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <FileText size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Forest Management Plan</h1>
              <p className="text-[11px] text-[var(--text3)]">AI-generated skogsbruksplan</p>
            </div>
          </div>
        </div>

        {/* Plan header */}
        <div className="rounded-xl p-5 border border-[var(--border)] mb-5" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">Property</p>
          <p className="text-sm font-semibold text-[var(--text)]">{plan.owner.fastighetsbeteckning}</p>
          <p className="text-xs text-[var(--text2)]">{plan.owner.name}</p>
          <p className="text-[10px] text-[var(--text3)] mt-2">Plan period: {plan.planPeriod.start}--{plan.planPeriod.end}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Total area', value: `${plan.totalArea} ha`, icon: TreePine },
            { label: 'Total volume', value: `${plan.totalVolume.toLocaleString('sv-SE')} m\u00B3`, icon: TreePine },
            { label: 'Estimated value', value: formatSEK(plan.totalValue), icon: TrendingUp },
            { label: 'Carbon stock', value: `${plan.carbonStock.toLocaleString('sv-SE')} t CO\u2082`, icon: TreePine },
          ].map((m, i) => (
            <div key={i} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">{m.label}</p>
              <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-lg p-1 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          {(['overview', 'recommendations', 'harvest', 'risks'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--green)] text-white'
                  : 'text-[var(--text2)] hover:text-[var(--text)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {plan.parcels.map((p, i) => (
              <div key={i} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-2">{p.name}</h3>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-[var(--text3)]">Species</span><span className="text-[var(--text)]">{p.dominantSpecies}</span>
                  <span className="text-[var(--text3)]">Area</span><span className="text-[var(--text)]">{p.area} ha</span>
                  <span className="text-[var(--text3)]">Age</span><span className="text-[var(--text)]">{p.age} years</span>
                  <span className="text-[var(--text3)]">Site index</span><span className="text-[var(--text)]">T{p.siteIndex}</span>
                  <span className="text-[var(--text3)]">Volume</span><span className="text-[var(--text)]">{p.volume} m\u00B3/ha</span>
                  <span className="text-[var(--text3)]">Growth</span><span className="text-[var(--text)]">{p.annualGrowth} m\u00B3/ha/yr</span>
                  <span className="text-[var(--text3)]">Health</span><span className="text-[var(--text)]">{p.healthScore}/100</span>
                  <span className="text-[var(--text3)]">Soil</span><span className="text-[var(--text)]">{p.soilType}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {[...plan.recommendations]
              .sort((a, b) => a.year - b.year)
              .map((rec, i) => {
                const pc = PRIORITY_COLORS[rec.priority];
                return (
                  <div key={i} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-[var(--text3)]" />
                        <span className="text-xs font-semibold text-[var(--text)]">{rec.year}</span>
                        <span className="text-xs text-[var(--text2)]">{rec.parcel}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: pc.color, background: pc.bg }}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--text)] mb-1">{ACTION_LABELS[rec.action] ?? rec.action}</p>
                    <p className="text-xs text-[var(--text3)] leading-relaxed">{rec.reasoning}</p>
                    {(rec.estimatedRevenue || rec.estimatedCost) && (
                      <div className="flex gap-4 mt-2 text-xs">
                        {rec.estimatedRevenue && <span className="text-[var(--green)]">+{formatSEK(rec.estimatedRevenue)}</span>}
                        {rec.estimatedCost && <span className="text-red-500">-{formatSEK(rec.estimatedCost)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === 'harvest' && (
          <div className="space-y-3">
            {/* Financial summary */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Total revenue</p>
                <p className="text-lg font-bold text-[var(--green)]" style={{ fontFamily: "'DM Mono', monospace" }}>{formatSEK(financials.totalRevenue)}</p>
              </div>
              <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Net income</p>
                <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>{formatSEK(financials.netIncome)}</p>
              </div>
            </div>
            {plan.harvestSchedule.map((h, i) => (
              <div key={i} className="rounded-xl p-4 border border-[var(--border)] flex items-center justify-between" style={{ background: 'var(--bg2)' }}>
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">{h.year} -- {h.parcel}</p>
                  <p className="text-[10px] text-[var(--text3)]">{h.type} {h.volume > 0 ? `| ${h.volume.toLocaleString('sv-SE')} m\u00B3` : ''}</p>
                </div>
                {h.estimatedRevenue > 0 && (
                  <span className="text-xs font-semibold text-[var(--green)]">{formatSEK(h.estimatedRevenue)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-3">
            {plan.riskAssessment.map((r, i) => {
              const rc = RISK_COLORS[r.level];
              return (
                <div key={i} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} style={{ color: rc.color }} />
                      <span className="text-xs font-semibold text-[var(--text)]">{r.riskType}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: rc.color, background: rc.bg }}>
                      {r.level}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text2)] mb-1">{r.parcel}</p>
                  <p className="text-xs text-[var(--text3)] leading-relaxed mb-2">{r.description}</p>
                  <p className="text-xs text-[var(--text2)]"><strong>Mitigation:</strong> {r.mitigation}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Export button */}
        <button
          onClick={() => generatePlanPDF(plan)}
          className="w-full mt-6 py-3 rounded-xl bg-[var(--green)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
        >
          <Download size={16} />
          Export as PDF
        </button>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-4 italic">
          AI-generated plan for decision support. Consult a certified forest planner before major operations.
        </p>
      </div>
    </div>
  );
}
