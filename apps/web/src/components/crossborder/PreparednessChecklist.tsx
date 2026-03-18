/**
 * PreparednessChecklist — What to do BEFORE beetles arrive.
 * Actionable checklist with status, deadline, and priority.
 */

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  TreePine,
  Bug,
  Eye,
  Users,
  Landmark,
  Wrench,
} from 'lucide-react';
import type { PreparednessItem } from '@/hooks/useCrossBorderAlert';

const PRIORITY_CONFIG = {
  critical: { color: '#ef4444', label: 'Kritisk', bg: 'rgba(239,68,68,0.12)' },
  high: { color: '#f97316', label: 'Hög', bg: 'rgba(249,115,22,0.12)' },
  medium: { color: '#eab308', label: 'Medel', bg: 'rgba(234,179,8,0.12)' },
  low: { color: '#4ade80', label: 'Låg', bg: 'rgba(74,222,128,0.12)' },
};

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: '#4ade80', label: 'Klart' },
  in_progress: { icon: Clock, color: '#eab308', label: 'Pågår' },
  not_started: { icon: Circle, color: '#6b7280', label: 'Ej påbörjat' },
};

const CATEGORY_ICONS: Record<string, typeof TreePine> = {
  'Förebyggande avverkning': TreePine,
  'Fångst och övervakning': Bug,
  'Långsiktig resiliens': Shield,
  Övervakning: Eye,
  'Ekonomiskt skydd': Landmark,
  Samverkan: Users,
  Beredskap: Wrench,
};

interface PreparednessChecklistProps {
  items: PreparednessItem[];
}

export function PreparednessChecklist({ items }: PreparednessChecklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(items);

  const completedCount = localItems.filter((i) => i.status === 'completed').length;
  const totalCount = localItems.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const toggleStatus = (id: string) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === 'completed'
                  ? 'not_started'
                  : item.status === 'not_started'
                    ? 'in_progress'
                    : 'completed',
            }
          : item,
      ),
    );
  };

  // Group by category
  const categories = localItems.reduce<Record<string, PreparednessItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Shield size={16} className="text-[var(--green)]" />
              Beredskapschecklista
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              Vad du ska göra INNAN barkborren anländer
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-[var(--text)]">
              {completedCount}/{totalCount}
            </div>
            <div className="text-[10px] text-[var(--text3)]">åtgärder klara</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background:
                progressPct >= 75
                  ? '#4ade80'
                  : progressPct >= 50
                    ? '#eab308'
                    : progressPct >= 25
                      ? '#f97316'
                      : '#ef4444',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">{progressPct}% genomfört</span>
          <span className="text-[10px] text-[var(--text3)]">
            {localItems.filter((i) => i.priority === 'critical' && i.status !== 'completed').length} kritiska kvar
          </span>
        </div>
      </div>

      {/* Categorized items */}
      <div className="divide-y divide-[var(--border)]">
        {Object.entries(categories).map(([category, categoryItems]) => {
          const CatIcon = CATEGORY_ICONS[category] || Shield;
          return (
            <div key={category}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'var(--bg)' }}>
                <CatIcon size={12} className="text-[var(--green)]" />
                <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {category}
                </span>
                <span className="text-[10px] text-[var(--text3)] ml-auto">
                  {categoryItems.filter((i) => i.status === 'completed').length}/{categoryItems.length}
                </span>
              </div>
              {categoryItems.map((item) => {
                const priority = PRIORITY_CONFIG[item.priority];
                const status = STATUS_CONFIG[item.status];
                const StatusIcon = status.icon;
                const isExpanded = expandedId === item.id;
                const isOverdue =
                  item.status !== 'completed' &&
                  new Date(item.deadline) < new Date('2026-03-17');

                return (
                  <div
                    key={item.id}
                    className="border-t border-[var(--border)] first:border-t-0"
                  >
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg3)] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {/* Status toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(item.id);
                        }}
                        className="mt-0.5 flex-shrink-0 transition-colors"
                        style={{ color: status.color }}
                        aria-label={`Toggle ${item.title} status`}
                      >
                        <StatusIcon size={18} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-medium ${
                              item.status === 'completed'
                                ? 'line-through text-[var(--text3)]'
                                : 'text-[var(--text)]'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                            style={{ background: priority.bg, color: priority.color }}
                          >
                            {priority.label}
                          </span>
                          {isOverdue && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-red-500/20 text-red-400 flex items-center gap-0.5">
                              <AlertTriangle size={8} />
                              Förfallen
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-[var(--text3)]">
                            Deadline: {new Date(item.deadline).toLocaleDateString('sv-SE')}
                          </span>
                          <span className="text-[10px]" style={{ color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 mt-1 text-[var(--text3)]">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pl-11">
                        <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
