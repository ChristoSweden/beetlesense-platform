/**
 * PipelineView — Visual horizontal pipeline for each autonomous monitoring event.
 * Shows 6 stages from satellite detection through to action triggered.
 */

import { useState } from 'react';
import {
  Satellite,
  Brain,
  Plane,
  Camera,
  Microscope,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Loader2,
  Circle,
  SkipForward,
  Bug,
  Wind,
  Droplets,
  ShieldQuestion,
  X,
} from 'lucide-react';
import type { PipelineEvent, PipelineStage, PipelineStageStatus, ThreatType } from '@/hooks/useAutoMonitor';

// ─── Helpers ───

const STAGE_ICONS: Record<string, React.ReactNode> = {
  satellite: <Satellite size={16} />,
  brain: <Brain size={16} />,
  plane: <Plane size={16} />,
  camera: <Camera size={16} />,
  microscope: <Microscope size={16} />,
  zap: <Zap size={16} />,
};

const STATUS_STYLES: Record<PipelineStageStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  complete: {
    bg: 'bg-[var(--green)]/15',
    border: 'border-[var(--green)]/40',
    text: 'text-[var(--green)]',
    icon: <CheckCircle2 size={12} className="text-[var(--green)]" />,
  },
  active: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: <Loader2 size={12} className="text-amber-400 animate-spin" />,
  },
  pending: {
    bg: 'bg-[var(--bg3)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--text3)]',
    icon: <Circle size={12} className="text-[var(--text3)]" />,
  },
  skipped: {
    bg: 'bg-[var(--bg3)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--text3)]',
    icon: <SkipForward size={12} className="text-[var(--text3)]" />,
  },
};

const THREAT_ICONS: Record<ThreatType, { icon: React.ReactNode; color: string; label: string }> = {
  beetle: { icon: <Bug size={14} />, color: '#ef4444', label: 'Barkborre' },
  storm: { icon: <Wind size={14} />, color: '#f59e0b', label: 'Stormskador' },
  drought: { icon: <Droplets size={14} />, color: '#f97316', label: 'Torkstress' },
  false_alarm: { icon: <ShieldQuestion size={14} />, color: '#6b7280', label: 'Falskt alarm' },
};

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-[var(--green)]/15', text: 'text-[var(--green)]', label: 'Klar' },
  active: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Aktiv' },
  pending: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Väntande' },
};

function formatTime(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Stage Detail Modal ───

function StageDetailPanel({ stage, onClose }: { stage: PipelineStage; onClose: () => void }) {
  const style = STATUS_STYLES[stage.status];
  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${style.bg} ${style.text}`}>
            {STAGE_ICONS[stage.icon]}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">{stage.name}</p>
            <p className="text-[10px] text-[var(--text3)]">{stage.nameEn}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg3)] transition-colors">
          <X size={14} className="text-[var(--text3)]" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] font-medium text-[var(--text3)] uppercase mb-1">Beskrivning</p>
          <p className="text-xs text-[var(--text2)]">{stage.detail}</p>
        </div>
        {stage.confidence !== null && (
          <div>
            <p className="text-[10px] font-medium text-[var(--text3)] uppercase mb-1">Konfidens</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${stage.confidence}%`,
                    background: stage.confidence > 80 ? '#4ade80' : stage.confidence > 60 ? '#fbbf24' : '#f97316',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-[var(--text)]">{stage.confidence}%</span>
            </div>
          </div>
        )}
        {stage.aiReasoning && (
          <div>
            <p className="text-[10px] font-medium text-[var(--text3)] uppercase mb-1">AI-resonemang</p>
            <p className="text-xs text-[var(--text2)] leading-relaxed">{stage.aiReasoning}</p>
          </div>
        )}
        {stage.rawData && (
          <div>
            <p className="text-[10px] font-medium text-[var(--text3)] uppercase mb-1">Rådata</p>
            <pre className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg2)] rounded-lg p-2 whitespace-pre-wrap">
              {stage.rawData}
            </pre>
          </div>
        )}
        <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
          {stage.timestamp && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatTime(stage.timestamp)}
            </span>
          )}
          {stage.duration && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {stage.duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Connector Line ───

function Connector({ fromStatus, toStatus }: { fromStatus: PipelineStageStatus; toStatus: PipelineStageStatus }) {
  const isActive = fromStatus === 'complete' && (toStatus === 'active' || toStatus === 'complete');
  const isPending = fromStatus === 'complete' && toStatus === 'pending';
  const isFlowing = fromStatus === 'complete' && toStatus === 'active';

  return (
    <div className="flex-1 flex items-center min-w-[20px] max-w-[48px] relative">
      <div
        className={`w-full h-[2px] rounded-full ${
          isActive ? 'bg-[var(--green)]/60' : isPending ? 'bg-[var(--border)]' : 'bg-[var(--border)]'
        }`}
      />
      {isFlowing && (
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse absolute" style={{ animation: 'flowDot 1.5s ease-in-out infinite' }} />
        </div>
      )}
    </div>
  );
}

// ─── Stage Node ───

function StageNode({
  stage,
  isSelected,
  onClick,
}: {
  stage: PipelineStage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const style = STATUS_STYLES[stage.status];
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 group cursor-pointer min-w-0 ${
        isSelected ? 'scale-105' : ''
      } transition-transform`}
      title={`${stage.name} — ${stage.detail}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${style.bg} ${style.border} ${style.text} group-hover:brightness-110 transition-all`}
      >
        {STAGE_ICONS[stage.icon]}
      </div>
      <div className="flex items-center gap-0.5">
        {style.icon}
      </div>
      <p className="text-[9px] text-[var(--text3)] text-center leading-tight max-w-[72px] truncate">
        {stage.name}
      </p>
      {stage.confidence !== null && (
        <span className={`text-[9px] font-mono ${style.text}`}>{stage.confidence}%</span>
      )}
      {stage.duration && stage.status === 'complete' && (
        <span className="text-[8px] text-[var(--text3)] font-mono">{stage.duration}</span>
      )}
    </button>
  );
}

// ─── Pipeline Card ───

export function PipelineView({ pipeline }: { pipeline: PipelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const threat = THREAT_ICONS[pipeline.threatType];
  const statusBadge = STATUS_BADGES[pipeline.status];
  const selected = pipeline.stages.find(s => s.id === selectedStage) ?? null;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg3)]/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${threat.color}15`, color: threat.color }}
          >
            {threat.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[var(--text)] truncate">{pipeline.parcel}</p>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}
              >
                {statusBadge.label}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${threat.color}15`, color: threat.color }}
              >
                {threat.label}
              </span>
            </div>
            <p className="text-xs text-[var(--text3)] truncate mt-0.5">{pipeline.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {pipeline.totalDuration && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-[var(--text3)]">Total tid</p>
              <p className="text-xs font-mono text-[var(--green)]">{pipeline.totalDuration}</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--text3)]" />
          )}
        </div>
      </button>

      {/* Expanded pipeline visualization */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]">
          {/* Pipeline flow */}
          <div className="flex items-start justify-between gap-0 py-4 overflow-x-auto">
            {pipeline.stages.map((stage, i) => (
              <div key={stage.id} className="contents">
                <StageNode
                  stage={stage}
                  isSelected={selectedStage === stage.id}
                  onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                />
                {i < pipeline.stages.length - 1 && (
                  <Connector
                    fromStatus={stage.status}
                    toStatus={pipeline.stages[i + 1].status}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Total pipeline time banner */}
          {pipeline.totalDuration && (
            <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20 mb-2">
              <Clock size={12} className="text-[var(--green)]" />
              <span className="text-xs font-medium text-[var(--green)]">
                Upptäckt → Åtgärd: {pipeline.totalDuration}
              </span>
            </div>
          )}

          {pipeline.status === 'active' && (
            <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-2">
              <Loader2 size={12} className="text-amber-400 animate-spin" />
              <span className="text-xs font-medium text-amber-400">
                Pipeline aktiv — väntar på nästa steg...
              </span>
            </div>
          )}

          {/* Stage detail panel */}
          {selected && (
            <StageDetailPanel stage={selected} onClose={() => setSelectedStage(null)} />
          )}

          {/* Timeline */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text3)]">
            <Clock size={10} />
            <span>Startad: {formatTime(pipeline.startedAt)}</span>
          </div>
        </div>
      )}

      {/* Inline CSS for flow animation */}
      <style>{`
        @keyframes flowDot {
          0% { left: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
