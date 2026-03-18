/**
 * EventFeed — Real-time chronological event stream for autonomous monitoring.
 * Filterable by type, severity, date. Expandable detail per event.
 */

import { useState, useMemo } from 'react';
import {
  Satellite,
  Brain,
  Plane,
  Camera,
  Microscope,
  Zap,
  Settings2,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
  Radio,
  Server,
} from 'lucide-react';
import type { FeedEvent, EventType, EventSeverity } from '@/hooks/useAutoMonitor';

// ─── Config ───

const TYPE_CONFIG: Record<EventType, { icon: React.ReactNode; label: string; color: string }> = {
  detection: { icon: <Satellite size={14} />, label: 'Detektering', color: '#3b82f6' },
  analysis: { icon: <Brain size={14} />, label: 'AI-analys', color: '#a855f7' },
  dispatch: { icon: <Plane size={14} />, label: 'Dispatch', color: '#f59e0b' },
  scan: { icon: <Camera size={14} />, label: 'Skanning', color: '#06b6d4' },
  classification: { icon: <Microscope size={14} />, label: 'Klassificering', color: '#ec4899' },
  action: { icon: <Zap size={14} />, label: 'Åtgärd', color: '#4ade80' },
  rule_triggered: { icon: <Settings2 size={14} />, label: 'Regel', color: '#8b5cf6' },
  system: { icon: <Server size={14} />, label: 'System', color: '#6b7280' },
};

const SEVERITY_CONFIG: Record<EventSeverity, { label: string; color: string; dot: string }> = {
  critical: { label: 'Kritisk', color: '#ef4444', dot: 'bg-red-500' },
  high: { label: 'Hög', color: '#f97316', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: '#fbbf24', dot: 'bg-amber-400' },
  low: { label: 'Låg', color: '#4ade80', dot: 'bg-green-400' },
  info: { label: 'Info', color: '#6b7280', dot: 'bg-gray-400' },
};

function formatRelativeTime(ts: string): string {
  const now = new Date('2026-03-17T10:00:00Z');
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `${diffMin}min sedan`;
  if (diffH < 24) return `${diffH}h sedan`;
  if (diffD < 7) return `${diffD}d sedan`;
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('sv-SE', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Event Card ───

function EventCard({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = TYPE_CONFIG[event.type];
  const sevConf = SEVERITY_CONFIG[event.severity];

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--border)] transition-colors"
      style={{ background: 'var(--bg2)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${typeConf.color}15`, color: typeConf.color }}
        >
          {typeConf.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-[var(--text)] truncate">{event.title}</p>
            {event.isRecent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 animate-pulse">
                DIREKT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-[var(--text3)]">{event.parcel}</span>
            <span className="text-[8px] text-[var(--text3)]">|</span>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${sevConf.color}15`, color: sevConf.color }}
            >
              {sevConf.label}
            </span>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${typeConf.color}15`, color: typeConf.color }}
            >
              {typeConf.label}
            </span>
          </div>
        </div>

        {/* Time + expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-[var(--text3)] font-mono">{formatRelativeTime(event.timestamp)}</span>
          {expanded ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)] pt-2">
          <p className="text-xs text-[var(--text2)] leading-relaxed">{event.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatTimestamp(event.timestamp)}
            </span>
            {event.pipelineId && (
              <span className="flex items-center gap-1">
                <Radio size={10} className="text-[var(--green)]" /> Pipeline: {event.pipelineId}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EventFeed Component ───

export function EventFeed({ events }: { events: FeedEvent[] }) {
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      return true;
    });
  }, [events, typeFilter, severityFilter]);

  const criticalCount = events.filter(e => e.severity === 'critical').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Radio size={16} className="text-[var(--green)]" />
            Händelseflöde
          </h3>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {events.length} händelser, {criticalCount} kritiska
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
            title={soundEnabled ? 'Ljudnotiser: PÅ' : 'Ljudnotiser: AV'}
          >
            {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              showFilters || typeFilter !== 'all' || severityFilter !== 'all'
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
          >
            <Filter size={12} /> Filter
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--border)] p-3 mb-4 flex flex-wrap gap-3" style={{ background: 'var(--bg)' }}>
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">Typ</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
              className="text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] px-2 py-1.5"
            >
              <option value="all">Alla typer</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">Allvarlighetsgrad</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | 'all')}
              className="text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] px-2 py-1.5"
            >
              <option value="all">Alla nivåer</option>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {(typeFilter !== 'all' || severityFilter !== 'all') && (
            <button
              onClick={() => { setTypeFilter('all'); setSeverityFilter('all'); }}
              className="self-end text-[10px] text-[var(--green)] hover:underline mb-1"
            >
              Rensa filter
            </button>
          )}
        </div>
      )}

      {/* Event list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--text3)]">Inga händelser matchar filtret</p>
          </div>
        ) : (
          filtered.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
