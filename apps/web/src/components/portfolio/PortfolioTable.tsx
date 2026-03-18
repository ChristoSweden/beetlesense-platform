import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from 'lucide-react';
import type { PortfolioParcel, SortField, SortDirection } from '@/hooks/usePortfolio';

function healthColor(score: number): string {
  if (score >= 80) return 'text-green-400 bg-green-400/10';
  if (score >= 60) return 'text-yellow-400 bg-yellow-400/10';
  if (score >= 40) return 'text-orange-400 bg-orange-400/10';
  return 'text-red-400 bg-red-400/10';
}

function formatKr(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })}M`;
  }
  return value.toLocaleString('sv-SE');
}

function formatDate(date: string | null): string {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  onToggleDirection: () => void;
}

function SortHeader({ label, field, currentField, direction, onSort, onToggleDirection }: SortHeaderProps) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => {
        if (isActive) {
          onToggleDirection();
        } else {
          onSort(field);
        }
      }}
      className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] hover:text-[var(--text)] transition-colors group"
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUp size={12} className="text-[var(--green)]" />
        ) : (
          <ArrowDown size={12} className="text-[var(--green)]" />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

interface Props {
  parcels: PortfolioParcel[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onToggleSortDirection: () => void;
  onExportCsv: () => void;
}

export function PortfolioTable({
  parcels,
  isLoading,
  searchQuery,
  onSearchChange,
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleSortDirection,
  onExportCsv,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border-b border-[var(--border)]">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            placeholder={t('portfolio.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
          />
        </div>
        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
        >
          <Download size={14} />
          {t('portfolio.exportCsv')}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.name')}
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-left px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.municipality')}
                  field="municipality"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.area')}
                  field="area_hectares"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.health')}
                  field="health_score"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.value')}
                  field="timber_value_kr"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.warnings')}
                  field="warnings"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader
                  label={t('portfolio.table.lastSurvey')}
                  field="last_survey_date"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSortFieldChange}
                  onToggleDirection={onToggleSortDirection}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]/50 animate-pulse">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-[var(--bg3)]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : parcels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--text3)]">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              parcels.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/owner/parcels/${p.id}`)}
                  className="border-b border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg3)]/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text)]">{p.name}</span>
                      <span className="text-[10px] text-[var(--text3)]">{p.county}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text2)]">{p.municipality}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] text-right font-mono">
                    {p.area_hectares.toLocaleString('sv-SE')} <span className="text-[var(--text3)]">ha</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${healthColor(p.health_score)}`}
                    >
                      {p.health_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] text-right font-mono">
                    {formatKr(p.timber_value_kr)} <span className="text-[var(--text3)]">kr</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.warnings > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-amber-400 bg-amber-400/10">
                        {p.warnings}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text3)]">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text2)] text-right font-mono">
                    {formatDate(p.last_survey_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {parcels.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-[10px] font-mono text-[var(--text3)]">
            {t('portfolio.showingParcels', { count: parcels.length })}
          </p>
        </div>
      )}
    </div>
  );
}
