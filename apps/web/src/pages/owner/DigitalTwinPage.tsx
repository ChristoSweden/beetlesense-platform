/**
 * DigitalTwinPage — Predictive Forest Digital Twin.
 *
 * A living simulation that projects the owner's forest to 2030, 2050, 2080
 * under 4 management scenarios with climate overlays.
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine,
  GitCompareArrows,
  Layers,
  Thermometer,
  ChevronLeft,
  Info,
  Box,
} from 'lucide-react';
import { useDigitalTwin } from '@/hooks/useDigitalTwin';
import { TimelineScrubber } from '@/components/twin/TimelineScrubber';
import { ForestStateCard } from '@/components/twin/ForestStateCard';
import { ScenarioComparison } from '@/components/twin/ScenarioComparison';
import { ClimateOverlay } from '@/components/twin/ClimateOverlay';

const CanopyView3D = lazy(() => import('@/components/map/CanopyView3D'));

type ViewTab = 'split' | 'compare' | 'climate' | '3d';

const TAB_CONFIG: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: 'split', label: 'Tidslinje', icon: <GitCompareArrows size={14} /> },
  { id: 'compare', label: 'Jämförelse', icon: <Layers size={14} /> },
  { id: 'climate', label: 'Klimat', icon: <Thermometer size={14} /> },
  { id: '3d', label: '3D Kronvy', icon: <Box size={14} /> },
];

export default function DigitalTwinPage() {
  const twin = useDigitalTwin();
  const [activeTab, setActiveTab] = useState<ViewTab>('split');

  const currentSnapshots = useMemo(
    () => twin.getSnapshotsForYear(twin.currentYear),
    [twin.currentYear, twin.getSnapshotsForYear],
  );

  const baselineSnapshots = useMemo(
    () => twin.getSnapshotsForYear(2026),
    [twin.getSnapshotsForYear],
  );

  const currentAggregate = useMemo(
    () => twin.getAggregateForYear(twin.currentYear),
    [twin.currentYear, twin.getAggregateForYear],
  );

  const baselineAggregate = useMemo(
    () => twin.getAggregateForYear(2026),
    [twin.getAggregateForYear],
  );

  const activeScenario = twin.scenarios.find(s => s.id === twin.selectedScenario);

  if (twin.isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <span className="text-sm text-[var(--text2)] font-mono">Bygger digital tvilling...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 lg:px-6 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          >
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
              <TreePine size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-base font-serif font-bold text-[var(--text)]">
                Prediktiv digital tvilling
              </h1>
              <p className="text-[10px] text-[var(--text3)]">
                Din skog 2026 — 2080 under olika scenarier
              </p>
            </div>
          </div>
        </div>

        {/* Scenario selector */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {twin.scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => twin.setSelectedScenario(s.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                background: twin.selectedScenario === s.id ? s.color : 'transparent',
                color: twin.selectedScenario === s.id ? '#000' : 'var(--text2)',
                borderColor: twin.selectedScenario === s.id ? s.color : 'var(--border)',
                boxShadow: twin.selectedScenario === s.id ? `0 0 16px ${s.color}30` : 'none',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Active scenario description */}
        {activeScenario && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg)' }}>
            <Info size={12} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[var(--text3)]">{activeScenario.description}</p>
          </div>
        )}
      </div>

      <div className="px-4 lg:px-6 py-4 space-y-4">
        {/* Timeline Scrubber */}
        <TimelineScrubber
          currentYear={twin.currentYear}
          events={twin.allEvents}
          isPlaying={twin.isPlaying}
          playSpeed={twin.playSpeed}
          onYearChange={twin.setCurrentYear}
          onTogglePlay={twin.togglePlay}
          onSpeedChange={twin.setPlaySpeed}
        />

        {/* Aggregate metrics bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <AggregateStat
            label="Total virkesvolym"
            value={`${Math.round(currentAggregate.totalVolume).toLocaleString()} m³`}
            baseline={`${Math.round(baselineAggregate.totalVolume).toLocaleString()} m³`}
            change={baselineAggregate.totalVolume > 0 ? ((currentAggregate.totalVolume - baselineAggregate.totalVolume) / baselineAggregate.totalVolume * 100) : 0}
          />
          <AggregateStat
            label="Kol lagrat"
            value={`${currentAggregate.totalCarbon.toLocaleString()} ton`}
            baseline={`${baselineAggregate.totalCarbon.toLocaleString()} ton`}
            change={baselineAggregate.totalCarbon > 0 ? ((currentAggregate.totalCarbon - baselineAggregate.totalCarbon) / baselineAggregate.totalCarbon * 100) : 0}
          />
          <AggregateStat
            label="Virkesvärde"
            value={formatSEK(currentAggregate.totalTimberValue)}
            baseline={formatSEK(baselineAggregate.totalTimberValue)}
            change={baselineAggregate.totalTimberValue > 0 ? ((currentAggregate.totalTimberValue - baselineAggregate.totalTimberValue) / baselineAggregate.totalTimberValue * 100) : 0}
          />
          <AggregateStat
            label="Skogshälsa"
            value={`${currentAggregate.avgHealthScore}/100`}
            baseline={`${baselineAggregate.avgHealthScore}/100`}
            change={baselineAggregate.avgHealthScore > 0 ? ((currentAggregate.avgHealthScore - baselineAggregate.avgHealthScore) / baselineAggregate.avgHealthScore * 100) : 0}
          />
          <AggregateStat
            label="Biodiversitet"
            value={`${(currentAggregate.avgBiodiversity * 100).toFixed(0)}%`}
            baseline={`${(baselineAggregate.avgBiodiversity * 100).toFixed(0)}%`}
            change={baselineAggregate.avgBiodiversity > 0 ? ((currentAggregate.avgBiodiversity - baselineAggregate.avgBiodiversity) / baselineAggregate.avgBiodiversity * 100) : 0}
          />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg2)' }}>
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center"
              style={{
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'split' && (
          <div className="space-y-4">
            {/* Split view: 2026 vs selected year */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[var(--green)]">2026</span>
              <span className="text-[10px] text-[var(--text3)]">vs</span>
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color: twin.currentYear < 2040 ? '#4ade80' : twin.currentYear < 2060 ? '#06b6d4' : '#6366f1',
                }}
              >
                {twin.currentYear}
              </span>
            </div>

            {currentSnapshots.map((snap, _idx) => {
              const baseline = baselineSnapshots.find(b => b.parcelId === snap.parcelId);
              return (
                <div key={snap.parcelId} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {baseline && (
                    <ForestStateCard snapshot={baseline} />
                  )}
                  <ForestStateCard
                    snapshot={snap}
                    baselineSnapshot={baseline}
                    showComparison
                  />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'compare' && (
          <ScenarioComparison
            scenarios={twin.scenarios}
            currentYear={twin.currentYear}
            getAggregateForYear={twin.getAggregateForYear}
          />
        )}

        {activeTab === 'climate' && (
          <ClimateOverlay
            projections={twin.climateProjections}
            selectedRCP={twin.selectedRCP}
            currentYear={twin.currentYear}
            onRCPChange={twin.setSelectedRCP}
          />
        )}

        {activeTab === '3d' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Box size={14} className="text-[var(--green)]" />
              <span className="text-xs text-[var(--text3)]">
                Interaktiv 3D-vy — dra för att rotera, scrolla för att zooma
              </span>
            </div>
            <div className="h-[500px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-[var(--bg2)] rounded-xl border border-[var(--border)]">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
                </div>
              }>
                <CanopyView3D parcelId="p1" />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MSEK`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} kSEK`;
  return `${value} SEK`;
}

function AggregateStat({ label, value, baseline, change }: {
  label: string;
  value: string;
  baseline: string;
  change: number;
}) {
  const isPositive = change >= 0;
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-mono font-bold text-[var(--text)]">{value}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[9px] text-[var(--text3)]">från {baseline}</span>
        {Math.abs(change) > 0.5 && (
          <span
            className="text-[9px] font-mono px-1 py-0.5 rounded"
            style={{
              background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: isPositive ? '#4ade80' : '#ef4444',
            }}
          >
            {isPositive ? '+' : ''}{change.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
