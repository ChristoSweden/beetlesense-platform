/**
 * AutomationRules — Configurable automation rules with trigger → condition → action pattern.
 * Toggle, edit thresholds, view execution history.
 */

import { useState } from 'react';
import {
  Satellite,
  Bug,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Clock,
  Zap,
  Plus,
  Settings2,
  AlertTriangle,
  Shield,
  Eye,
} from 'lucide-react';
import type { AutomationRule } from '@/hooks/useAutoMonitor';

// ─── Helpers ───

const CATEGORY_STYLES: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  detection: { icon: <Satellite size={14} />, color: '#4ade80', label: 'Detektering' },
  response: { icon: <Bug size={14} />, color: '#ef4444', label: 'Respons' },
  emergency: { icon: <AlertTriangle size={14} />, color: '#f59e0b', label: 'Akut' },
  monitoring: { icon: <Eye size={14} />, color: '#3b82f6', label: 'Övervakning' },
};

function formatDate(ts: string | null): string {
  if (!ts) return 'Aldrig';
  return new Date(ts).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Rule Card ───

function RuleCard({
  rule,
  onToggle,
  onUpdateThreshold,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onUpdateThreshold: (field: 'triggerThreshold' | 'conditionThreshold', value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_STYLES[rule.category] ?? CATEGORY_STYLES.detection;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        rule.enabled
          ? 'border-[var(--border)] hover:border-[var(--green)]/30'
          : 'border-[var(--border)] opacity-60'
      }`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${cat.color}15`, color: cat.color }}
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--text)] truncate">{rule.name}</p>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${cat.color}15`, color: cat.color }}
            >
              {cat.label}
            </span>
          </div>
          {/* Trigger → Condition → Action flow */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] font-mono bg-[var(--bg3)] px-1.5 py-0.5 rounded text-[var(--text2)]">
              {rule.trigger}
            </span>
            <ArrowRight size={10} className="text-[var(--text3)] flex-shrink-0" />
            <span className="text-[10px] font-mono bg-[var(--bg3)] px-1.5 py-0.5 rounded text-[var(--text2)]">
              {rule.condition}
            </span>
            <ArrowRight size={10} className="text-[var(--text3)] flex-shrink-0" />
            <span className="text-[10px] font-mono bg-[var(--green)]/10 px-1.5 py-0.5 rounded text-[var(--green)]">
              {rule.action}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggle}
            className="p-1 rounded transition-colors"
            title={rule.enabled ? 'Inaktivera regel' : 'Aktivera regel'}
          >
            {rule.enabled ? (
              <ToggleRight size={24} className="text-[var(--green)]" />
            ) : (
              <ToggleLeft size={24} className="text-[var(--text3)]" />
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-[var(--bg3)] transition-colors"
          >
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text3)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text3)]" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded: thresholds + history */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-4">
          {/* Threshold sliders */}
          <div className="space-y-3">
            <p className="text-[10px] font-medium text-[var(--text3)] uppercase flex items-center gap-1">
              <Settings2 size={10} /> Tröskelvärden
            </p>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text2)]">Triggervärde</span>
                <span className="text-xs font-mono text-[var(--text)]">{rule.triggerThreshold}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rule.triggerThreshold}
                onChange={(e) => onUpdateThreshold('triggerThreshold', Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)] cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text2)]">Villkorsvärde</span>
                <span className="text-xs font-mono text-[var(--text)]">{rule.conditionThreshold}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rule.conditionThreshold}
                onChange={(e) => onUpdateThreshold('conditionThreshold', Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)] cursor-pointer"
              />
            </div>
          </div>

          {/* Execution stats */}
          <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-[var(--green)]" />
              Körningar: <span className="font-mono text-[var(--text)]">{rule.executionCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Senast: <span className="font-mono text-[var(--text2)]">{formatDate(rule.lastExecuted)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AutomationRules Component ───

export function AutomationRules({
  rules,
  onToggle,
  onUpdateThreshold,
}: {
  rules: AutomationRule[];
  onToggle: (ruleId: string) => void;
  onUpdateThreshold: (ruleId: string, field: 'triggerThreshold' | 'conditionThreshold', value: number) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  const enabledCount = rules.filter(r => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + r.executionCount, 0);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Shield size={16} className="text-[var(--green)]" />
            Automationsregler
          </h3>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {enabledCount} aktiva regler, {totalExecutions} körningar totalt
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--green)] hover:text-[var(--green)] bg-[var(--green)]/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Ny regel
        </button>
      </div>

      {/* New rule form placeholder */}
      {showCreate && (
        <div className="rounded-xl border border-dashed border-[var(--green)]/30 p-4 mb-4" style={{ background: 'var(--bg)' }}>
          <p className="text-xs font-semibold text-[var(--text)] mb-3">Skapa ny regel</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Trigger</label>
              <select className="w-full text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] px-2 py-1.5">
                <option>NDVI-avvikelse</option>
                <option>Barkborre bekräftad</option>
                <option>Stormskador</option>
                <option>Torkstress</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Villkor</label>
              <select className="w-full text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] px-2 py-1.5">
                <option>Konfidens &gt;70%</option>
                <option>Allvarlighetsgrad &gt;50%</option>
                <option>Yta &gt;2 ha</option>
                <option>GDD &gt;800</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Åtgärd</label>
              <select className="w-full text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] px-2 py-1.5">
                <option>Dispatcha drönare</option>
                <option>Varna grannar</option>
                <option>Starta försäkringsärende</option>
                <option>Öka övervakningsfrekvens</option>
                <option>Kontakta entreprenör</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button className="text-xs font-medium text-white bg-[var(--green)] px-3 py-1.5 rounded-lg hover:brightness-110 transition-colors">
              Skapa
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-[var(--text3)] hover:text-[var(--text2)] px-3 py-1.5 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Rule cards */}
      <div className="space-y-3">
        {rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onToggle={() => onToggle(rule.id)}
            onUpdateThreshold={(field, value) => onUpdateThreshold(rule.id, field, value)}
          />
        ))}
      </div>
    </div>
  );
}
