/**
 * ExportCategoryCard — per-category card for the Data Export hub.
 * Shows icon, name, item count, size, format selector, date filter, checkbox.
 */

import { useState } from 'react';
import {
  Map,
  TreePine,
  Satellite,
  Eye,
  Wallet,
  Sparkles,
  FileText,
  Scan,
  Check,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import type { ExportCategory, ExportCategoryId, ExportFormat } from '@/hooks/useDataExport';
import { formatFileSize, formatLabel } from '@/hooks/useDataExport';

// ─── Icon mapping ───

const ICON_MAP: Record<string, typeof Map> = {
  Map,
  TreePine,
  Satellite,
  Eye,
  Wallet,
  Sparkles,
  FileText,
  Scan,
};

interface ExportCategoryCardProps {
  category: ExportCategory;
  onToggle: (id: ExportCategoryId) => void;
  onFormatChange: (id: ExportCategoryId, format: ExportFormat) => void;
  onDateChange: (id: ExportCategoryId, from: string, to: string) => void;
}

export function ExportCategoryCard({
  category,
  onToggle,
  onFormatChange,
  onDateChange,
}: ExportCategoryCardProps) {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const Icon = ICON_MAP[category.icon] ?? FileText;

  return (
    <div
      className={`rounded-xl border p-4 transition-all cursor-pointer ${
        category.selected
          ? 'border-[var(--green)]/40 bg-[var(--green)]/5 ring-1 ring-[var(--green)]/20'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
      }`}
      onClick={() => onToggle(category.id)}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
            category.selected
              ? 'border-[var(--green)] bg-[var(--green)]'
              : 'border-[var(--border2)] bg-transparent'
          }`}
        >
          {category.selected && <Check size={12} className="text-white" />}
        </div>

        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            category.selected
              ? 'bg-[var(--green)]/15 text-[var(--green)]'
              : 'bg-[var(--bg3)] text-[var(--text3)]'
          }`}
        >
          <Icon size={18} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${category.selected ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>
            {category.nameSv}
          </h3>
          <p className="text-[11px] text-[var(--text3)] mt-0.5">{category.descriptionSv}</p>
        </div>

        {/* Size badge */}
        <div className="text-right flex-shrink-0">
          <span className="text-xs font-mono text-[var(--text3)]">
            {formatFileSize(category.estimatedSizeBytes)}
          </span>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">{category.itemCount} objekt</p>
        </div>
      </div>

      {/* Details (shown when selected) */}
      {category.selected && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--text3)] w-14 flex-shrink-0">Format:</span>
            <div className="relative flex-1">
              <select
                value={category.selectedFormat}
                onChange={(e) => onFormatChange(category.id, e.target.value as ExportFormat)}
                className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 pr-7"
              >
                {category.availableFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {formatLabel(fmt)}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
            </div>
          </div>

          {/* Date range toggle */}
          <div>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-1.5 text-[11px] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
            >
              <Calendar size={11} />
              {showDateFilter ? 'Dölj datumfilter' : 'Filtrera på datum'}
            </button>

            {showDateFilter && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={category.dateFrom}
                  onChange={(e) => onDateChange(category.id, e.target.value, category.dateTo)}
                  className="flex-1 px-2 py-1 rounded-lg text-[11px] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50"
                />
                <span className="text-[10px] text-[var(--text3)]">-</span>
                <input
                  type="date"
                  value={category.dateTo}
                  onChange={(e) => onDateChange(category.id, category.dateFrom, e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg text-[11px] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50"
                />
              </div>
            )}
          </div>

          {/* Last exported */}
          {category.lastExported && (
            <p className="text-[10px] text-[var(--text3)]">
              Senast exporterad: {new Date(category.lastExported).toLocaleDateString('sv-SE')}{' '}
              {new Date(category.lastExported).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
