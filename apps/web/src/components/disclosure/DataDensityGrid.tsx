import { useState, useCallback } from 'react';
import { MetricPill, type MetricPillProps, type MetricStatus } from './MetricPill';

export interface DataGroup {
  id: string;
  label: string;
  status: MetricStatus;
  metrics: (MetricPillProps & { id: string })[];
}

export interface DataDensityGridProps {
  groups: DataGroup[];
  columns?: 3 | 4;
  defaultExpanded?: boolean;
  className?: string;
}

const STATUS_DOT: Record<MetricStatus, string> = {
  good: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

function deriveGroupStatus(metrics: { status?: MetricStatus }[]): MetricStatus {
  if (metrics.some((m) => m.status === 'critical')) return 'critical';
  if (metrics.some((m) => m.status === 'warning')) return 'warning';
  return 'good';
}

export function DataDensityGrid({
  groups,
  columns = 3,
  defaultExpanded = false,
  className = '',
}: DataDensityGridProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (defaultExpanded) return new Set(groups.map((g) => g.id));
    // Auto-expand groups with warnings or critical
    return new Set(
      groups.filter((g) => g.status !== 'good').map((g) => g.id),
    );
  });

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const allGreen = groups.every(
    (g) => deriveGroupStatus(g.metrics) === 'good',
  );

  const gridCols = columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* All-green summary */}
      {allGreen && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/20">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-green-300">
            Allt ser bra ut
          </span>
          <span className="text-xs text-green-500/50 ml-auto">
            {groups.length} grupper
          </span>
        </div>
      )}

      {/* Groups */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.id);
        const effectiveStatus = deriveGroupStatus(group.metrics);

        return (
          <div
            key={group.id}
            className="rounded-lg border border-green-800/20 bg-green-950/30 overflow-hidden"
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="
                w-full flex items-center gap-2.5 px-3 py-2
                text-left transition-colors
                hover:bg-green-900/20
                group
              "
              aria-expanded={isExpanded}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[effectiveStatus]}`}
              />
              <span className="text-sm font-medium text-green-200 flex-1">
                {group.label}
              </span>
              <span className="text-[10px] text-green-600/50">
                {group.metrics.length} mätvärden
              </span>
              <svg
                className={`w-3.5 h-3.5 text-green-600 transition-transform duration-200
                  ${isExpanded ? 'rotate-180' : ''}
                  group-hover:text-green-400
                `}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Group content — metric pills grid */}
            <div
              className={`
                transition-all duration-300 ease-out
                ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                overflow-hidden
              `}
            >
              <div
                className={`grid ${gridCols} gap-2 px-3 pb-3`}
              >
                {group.metrics.map((metric) => (
                  <MetricPill
                    key={metric.id}
                    value={metric.value}
                    unit={metric.unit}
                    trend={metric.trend}
                    status={metric.status}
                    sparkData={metric.sparkData}
                    sparkVariant={metric.sparkVariant}
                    positiveDirection={metric.positiveDirection}
                    context={metric.context}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default DataDensityGrid;
