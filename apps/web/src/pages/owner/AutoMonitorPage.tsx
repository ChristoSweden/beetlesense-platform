/**
 * AutoMonitorPage — Autonomous Monitoring Orchestration dashboard.
 * Mission control for zero-intervention forest intelligence.
 * Route: /owner/auto-monitor
 */

import { useState } from 'react';
import {
  Radio,
  Activity,
  CheckCircle2,
  Loader2,
  Clock,
  Shield,
  BarChart3,
  Workflow,
  Satellite,
  Brain,
  Zap,
} from 'lucide-react';
import { useAutoMonitor } from '@/hooks/useAutoMonitor';
import { PipelineView } from '@/components/automonitor/PipelineView';
import { AutomationRules } from '@/components/automonitor/AutomationRules';
import { EventFeed } from '@/components/automonitor/EventFeed';
import { PerformanceMetrics } from '@/components/automonitor/PerformanceMetrics';

type Tab = 'pipelines' | 'events' | 'rules' | 'performance';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'pipelines', label: 'Pipelines', icon: <Workflow size={14} /> },
  { id: 'events', label: 'Händelser', icon: <Radio size={14} /> },
  { id: 'rules', label: 'Regler', icon: <Shield size={14} /> },
  { id: 'performance', label: 'Prestanda', icon: <BarChart3 size={14} /> },
];

export default function AutoMonitorPage() {
  const {
    pipelines,
    rules,
    feedEvents,
    performance,
    isLoading,
    toggleRule,
    updateRuleThreshold,
    stats,
  } = useAutoMonitor();

  const [activeTab, setActiveTab] = useState<Tab>('pipelines');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-[var(--green)] animate-spin" />
          <p className="text-xs text-[var(--text3)]">Laddar autonom övervakning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── Header ─── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
              <Activity size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Autonom övervakning
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Detektering → Analys → Dispatch → Åtgärd. Noll mänsklig intervention.
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-[10px] font-medium text-[var(--green)]">System aktivt</span>
            </div>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
              <Satellite size={10} /> Sentinel-2 senast: 15 mar 07:30
            </span>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
              <Brain size={10} /> AI-modell v3.2
            </span>
          </div>
        </div>

        {/* ─── Quick Stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--border)] p-3 flex items-center gap-3" style={{ background: 'var(--bg2)' }}>
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono text-[var(--text)]">{stats.completedCount}</p>
              <p className="text-[10px] text-[var(--text3)]">Klara pipelines</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3 flex items-center gap-3" style={{ background: 'var(--bg2)' }}>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Loader2 size={16} className="text-amber-400 animate-spin" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono text-[var(--text)]">{stats.activeCount}</p>
              <p className="text-[10px] text-[var(--text3)]">Aktiva pipelines</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3 flex items-center gap-3" style={{ background: 'var(--bg2)' }}>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono text-[var(--text)]">
                {performance?.avgDetectionToAction.toFixed(1) ?? '—'}h
              </p>
              <p className="text-[10px] text-[var(--text3)]">Snitt detektering→åtgärd</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3 flex items-center gap-3" style={{ background: 'var(--bg2)' }}>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Zap size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono text-[var(--text)]">
                {rules.filter(r => r.enabled).length}
              </p>
              <p className="text-[10px] text-[var(--text3)]">Aktiva regler</p>
            </div>
          </div>
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'pipelines' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Workflow size={16} className="text-[var(--green)]" />
                  Övervakningspipelines
                </h3>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  Klicka för att expandera. Klicka på ett steg för detaljer.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {pipelines.map(pipeline => (
                <PipelineView key={pipeline.id} pipeline={pipeline} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <EventFeed events={feedEvents} />
        )}

        {activeTab === 'rules' && (
          <AutomationRules
            rules={rules}
            onToggle={toggleRule}
            onUpdateThreshold={updateRuleThreshold}
          />
        )}

        {activeTab === 'performance' && performance && (
          <PerformanceMetrics stats={performance} />
        )}
      </div>
    </div>
  );
}
