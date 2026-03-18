import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Clock, DollarSign, Play } from 'lucide-react';
import type { MachineScheduleResult } from '@/services/harvestLogisticsService';

interface MachineScheduleProps {
  schedule: MachineScheduleResult;
  onOptimize?: () => void;
}

const MACHINE_COLORS: Record<string, string> = {
  harvester: '#4ade80',
  forwarder: '#60a5fa',
  truck: '#fbbf24',
};

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 28;
const LEFT_LABEL_WIDTH = 110;
const DAY_WIDTH = 48;

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value);
}

export function MachineSchedule({ schedule, onOptimize }: MachineScheduleProps) {
  const { t } = useTranslation();
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const { blocks, totalDays } = schedule;
  const chartWidth = LEFT_LABEL_WIDTH + (totalDays + 2) * DAY_WIDTH;
  const chartHeight = HEADER_HEIGHT + blocks.length * ROW_HEIGHT + 8;

  const dayLabels = Array.from({ length: totalDays + 2 }, (_, i) => i);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('logistics.schedule.title')}
          </h3>
        </div>
        {onOptimize && (
          <button
            onClick={onOptimize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors"
          >
            <Zap size={12} />
            {t('logistics.schedule.autoOptimize')}
          </button>
        )}
      </div>

      {/* Gantt Chart SVG */}
      <div className="overflow-x-auto -mx-1 px-1">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="font-mono"
          role="img"
          aria-label={t('logistics.schedule.chartLabel')}
        >
          {/* Day header labels */}
          {dayLabels.map((day) => (
            <text
              key={`day-${day}`}
              x={LEFT_LABEL_WIDTH + day * DAY_WIDTH + DAY_WIDTH / 2}
              y={HEADER_HEIGHT - 8}
              textAnchor="middle"
              className="fill-[var(--text3)]"
              fontSize={10}
            >
              {t('logistics.schedule.day')} {day + 1}
            </text>
          ))}

          {/* Grid lines */}
          {dayLabels.map((day) => (
            <line
              key={`grid-${day}`}
              x1={LEFT_LABEL_WIDTH + day * DAY_WIDTH}
              y1={HEADER_HEIGHT}
              x2={LEFT_LABEL_WIDTH + day * DAY_WIDTH}
              y2={chartHeight}
              stroke="var(--border)"
              strokeWidth={0.5}
              strokeDasharray="2,4"
            />
          ))}

          {/* Machine rows */}
          {blocks.map((block, idx) => {
            const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
            const x = LEFT_LABEL_WIDTH + block.startDay * DAY_WIDTH;
            const width = (block.endDay - block.startDay) * DAY_WIDTH;
            const color = MACHINE_COLORS[block.machine] ?? '#4ade80';
            const isHovered = hoveredBlock === block.machineLabel;

            return (
              <g key={block.machineLabel}>
                {/* Row background */}
                <rect
                  x={0}
                  y={y}
                  width={chartWidth}
                  height={ROW_HEIGHT}
                  fill={idx % 2 === 0 ? 'transparent' : 'var(--bg)'}
                  opacity={0.3}
                />

                {/* Machine label */}
                <text
                  x={8}
                  y={y + ROW_HEIGHT / 2 + 4}
                  className="fill-[var(--text2)]"
                  fontSize={11}
                  fontWeight={500}
                >
                  {block.machineLabel}
                </text>

                {/* Idle period (red tint) */}
                {block.startDay > 0 && (
                  <rect
                    x={LEFT_LABEL_WIDTH}
                    y={y + 8}
                    width={block.startDay * DAY_WIDTH}
                    height={ROW_HEIGHT - 16}
                    rx={4}
                    fill="#ef4444"
                    opacity={0.15}
                  />
                )}

                {/* Active block */}
                <rect
                  x={x}
                  y={y + 8}
                  width={width}
                  height={ROW_HEIGHT - 16}
                  rx={6}
                  fill={color}
                  opacity={isHovered ? 0.9 : 0.7}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredBlock(block.machineLabel)}
                  onMouseLeave={() => setHoveredBlock(null)}
                />

                {/* Active block text */}
                {width > 80 && (
                  <text
                    x={x + width / 2}
                    y={y + ROW_HEIGHT / 2 + 3}
                    textAnchor="middle"
                    fill="#030d05"
                    fontSize={10}
                    fontWeight={600}
                  >
                    {block.activeHours}h / {formatSEK(block.costSEK)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-[var(--green)]" />
          <div>
            <p className="text-lg font-semibold font-mono text-[var(--text)]">{schedule.totalDays}</p>
            <p className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.totalDays')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#60a5fa]" />
          <div>
            <p className="text-lg font-semibold font-mono text-[var(--text)]">{schedule.totalMachineHours}</p>
            <p className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.machineHours')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#ef4444]" />
          <div>
            <p className="text-lg font-semibold font-mono text-[var(--text)]">{schedule.totalIdleHours}</p>
            <p className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.idleHours')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-[#fbbf24]" />
          <div>
            <p className="text-lg font-semibold font-mono text-[var(--text)]">{formatSEK(schedule.totalCostSEK)}</p>
            <p className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.totalCost')}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#4ade80] opacity-70" />
          <span className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.harvester')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#60a5fa] opacity-70" />
          <span className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.forwarder')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#fbbf24] opacity-70" />
          <span className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.truck')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444] opacity-15 border border-[#ef4444]/30" />
          <span className="text-[10px] text-[var(--text3)]">{t('logistics.schedule.idle')}</span>
        </div>
      </div>
    </div>
  );
}
