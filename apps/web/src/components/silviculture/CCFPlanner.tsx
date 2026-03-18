/**
 * CCFPlanner — Continuous Cover Forestry transition planner.
 *
 * Shows current vs target diameter distribution (reverse-J curve),
 * selective harvest plan, income projections, and a 15-20 year
 * transition roadmap from clearcut system to CCF.
 */

import { useState } from 'react';
import {
  TreePine,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { CCFPlan, DiameterClass } from '@/hooks/useSilviculture';

interface Props {
  plan: CCFPlan;
  parcelName: string;
  areaHa: number;
}

function formatSEK(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M SEK`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k SEK`;
  return `${value} SEK`;
}

function DiameterChart({
  current,
  target,
  harvest,
  label,
}: {
  current: DiameterClass[];
  target: DiameterClass[];
  harvest: DiameterClass[];
  label: 'current' | 'target' | 'harvest';
}) {
  const data = label === 'current' ? current : label === 'target' ? target : harvest;
  const maxTrees = Math.max(
    ...current.map(d => d.treesPerHa),
    ...target.map(d => d.treesPerHa),
  );

  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          const h = maxTrees > 0 ? (d.treesPerHa / maxTrees) * 100 : 0;
          const color = label === 'current'
            ? 'var(--yellow)'
            : label === 'target'
            ? 'var(--green)'
            : 'var(--red)';

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              <span className="text-[8px] text-[var(--text3)] mb-0.5">
                {d.treesPerHa > 0 ? d.treesPerHa : ''}
              </span>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${h}%`,
                  background: color,
                  opacity: d.treesPerHa > 0 ? 0.7 : 0.1,
                  minHeight: d.treesPerHa > 0 ? '2px' : '0',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[8px] text-[var(--text3)]">
            {d.diameterCm}
          </div>
        ))}
      </div>
      <p className="text-center text-[9px] text-[var(--text3)] mt-0.5">Diameter (cm)</p>
    </div>
  );
}

export function CCFPlanner({ plan, parcelName, areaHa }: Props) {
  const [activeTab, setActiveTab] = useState<'distribution' | 'roadmap'>('distribution');

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <TreePine size={16} className="text-[var(--green)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Hyggesfritt / CCF Planner
        </h2>
      </div>
      <p className="text-[10px] text-[var(--text3)] mb-4">
        {parcelName} &middot; {areaHa} ha &middot; Transition: {plan.transitionYears} years
      </p>

      {/* Key message */}
      <div className="p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 mb-4">
        <p className="text-xs font-medium text-[var(--green)]">
          &ldquo;Arlig inkomst utan att forstora din skog&rdquo;
        </p>
        <p className="text-[10px] text-[var(--text2)] mt-1">
          Expected annual yield: <span className="font-mono font-semibold">{plan.annualYield} m3/ha/yr</span>
          {' '}&middot;{' '}
          Annual income: <span className="font-mono font-semibold">{formatSEK(plan.annualIncome)}/ha</span>
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-0.5 rounded-lg bg-[var(--bg3)]">
        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex-1 text-[10px] py-1.5 rounded-md transition-colors ${
            activeTab === 'distribution'
              ? 'bg-[var(--surface)] text-[var(--text)] font-medium shadow-sm'
              : 'text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          Diameter Distribution
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex-1 text-[10px] py-1.5 rounded-md transition-colors ${
            activeTab === 'roadmap'
              ? 'bg-[var(--surface)] text-[var(--text)] font-medium shadow-sm'
              : 'text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          Transition Roadmap
        </button>
      </div>

      {activeTab === 'distribution' && (
        <div>
          {/* Current vs Target */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-medium text-[var(--yellow)] mb-1">Current (Even-aged)</p>
              <DiameterChart
                current={plan.currentDistribution}
                target={plan.targetDistribution}
                harvest={plan.harvestPlan}
                label="current"
              />
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--green)] mb-1">Target (Reverse-J)</p>
              <DiameterChart
                current={plan.currentDistribution}
                target={plan.targetDistribution}
                harvest={plan.harvestPlan}
                label="target"
              />
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center justify-center gap-2 mb-4 text-[var(--text3)]">
            <span className="text-[10px]">Even-aged plantation</span>
            <ArrowRight size={14} className="text-[var(--green)]" />
            <span className="text-[10px]">Multi-aged CCF</span>
          </div>

          {/* Harvest plan */}
          <div className="mb-3">
            <p className="text-[10px] font-medium text-[var(--red)] mb-1">Trees to Remove (Harvest Plan)</p>
            <DiameterChart
              current={plan.currentDistribution}
              target={plan.targetDistribution}
              harvest={plan.harvestPlan}
              label="harvest"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg3)] mt-3">
            <Info size={12} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[var(--text3)]">
              The reverse-J curve ensures continuous regeneration with many small trees and
              progressively fewer large ones. This mimics natural forest dynamics and provides
              harvestable timber at every intervention.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--border)]" />

            <div className="space-y-3">
              {plan.transitionSteps.map((step, i) => {
                const isPositive = step.revenueSEK > 0;
                return (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-[9px] font-mono font-semibold"
                      style={{
                        background: step.volumeM3 > 0 ? 'var(--green)' : 'var(--bg3)',
                        color: step.volumeM3 > 0 ? '#030d05' : 'var(--text3)',
                        border: `1px solid ${step.volumeM3 > 0 ? 'var(--green)' : 'var(--border)'}`,
                      }}
                    >
                      {step.year}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[var(--text)]">
                        {step.actionSv}
                      </p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {step.action}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {step.volumeM3 > 0 && (
                          <span className="text-[10px] font-mono text-[var(--text2)]">
                            {step.volumeM3} m3
                          </span>
                        )}
                        {step.revenueSEK !== 0 && (
                          <span className={`text-[10px] font-mono ${isPositive ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                            {isPositive ? '+' : ''}{formatSEK(step.revenueSEK)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total summary */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--text3)]">Total harvest (transition)</p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">
                {plan.transitionSteps.reduce((s, step) => s + step.volumeM3, 0)} m3
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)]">Total revenue (transition)</p>
              <p className="text-sm font-mono font-semibold text-[var(--green)]">
                {formatSEK(plan.transitionSteps.reduce((s, step) => s + Math.max(0, step.revenueSEK), 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
