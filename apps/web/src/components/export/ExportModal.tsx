import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  FileSpreadsheet,
  Globe,
  Map,
  Layers,
  TreePine,
  Bell,
  Users,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import type { PortfolioParcel } from '@/hooks/usePortfolio';
import type { Alert } from '@/hooks/useAlerts';
import {
  exportToCSV,
  exportToGeoJSON,
  exportToShapefile,
  exportToKML,
  exportTimberInventory,
  exportAlertsCSV,
  PARCEL_COLUMNS,
  estimateExportSize,
  formatFileSize,
  type ExportFormat,
  type ExportDataType,
  type CoordinateSystem,
} from '@/services/exportService';

// ─── Types ───

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcels?: PortfolioParcel[];
  alerts?: Alert[];
  /** Pre-select a data type */
  defaultDataType?: ExportDataType;
  /** Pre-select a format */
  defaultFormat?: ExportFormat;
}

// ─── Constants ───

const FORMAT_OPTIONS: { id: ExportFormat; icon: typeof FileSpreadsheet; extensions: string }[] = [
  { id: 'csv', icon: FileSpreadsheet, extensions: '.csv' },
  { id: 'geojson', icon: Globe, extensions: '.geojson' },
  { id: 'shapefile', icon: Layers, extensions: '.zip (SHP)' },
  { id: 'kml', icon: Map, extensions: '.kml' },
];

const DATA_TYPE_OPTIONS: { id: ExportDataType; icon: typeof TreePine }[] = [
  { id: 'parcels', icon: TreePine },
  { id: 'timber', icon: TreePine },
  { id: 'alerts', icon: Bell },
  { id: 'community', icon: Users },
];

// ─── Component ───

export function ExportModal({
  isOpen,
  onClose,
  parcels = [],
  alerts = [],
  defaultDataType = 'parcels',
  defaultFormat = 'csv',
}: ExportModalProps) {
  const { t } = useTranslation();

  // State
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [selectedDataType, setSelectedDataType] = useState<ExportDataType>(defaultDataType);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(PARCEL_COLUMNS.map((c) => c.key)),
  );
  const [coordinateSystem, setCoordinateSystem] = useState<CoordinateSystem>('WGS84');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Available formats depend on data type
  const availableFormats = useMemo(() => {
    if (selectedDataType === 'alerts' || selectedDataType === 'community') {
      return FORMAT_OPTIONS.filter((f) => f.id === 'csv');
    }
    return FORMAT_OPTIONS;
  }, [selectedDataType]);

  // Filtered data by date range
  const filteredParcels = useMemo(() => {
    if (!dateFrom && !dateTo) return parcels;
    return parcels.filter((p) => {
      if (!p.last_survey_date) return !dateFrom && !dateTo;
      const d = new Date(p.last_survey_date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo)) return false;
      return true;
    });
  }, [parcels, dateFrom, dateTo]);

  const filteredAlerts = useMemo(() => {
    if (!dateFrom && !dateTo) return alerts;
    return alerts.filter((a) => {
      const d = new Date(a.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo)) return false;
      return true;
    });
  }, [alerts, dateFrom, dateTo]);

  // Record count for current selection
  const recordCount = useMemo(() => {
    switch (selectedDataType) {
      case 'parcels':
      case 'timber':
        return filteredParcels.length;
      case 'alerts':
        return filteredAlerts.length;
      case 'community':
        return 0;
      default:
        return 0;
    }
  }, [selectedDataType, filteredParcels, filteredAlerts]);

  // File size estimate
  const sizeEstimate = useMemo(() => {
    const fmt = selectedDataType === 'timber' ? 'timber' : selectedFormat;
    return formatFileSize(estimateExportSize(fmt as any, recordCount, selectedColumns.size));
  }, [selectedFormat, selectedDataType, recordCount, selectedColumns.size]);

  // Preview rows
  const previewRows = useMemo(() => {
    if (selectedDataType === 'alerts') {
      return filteredAlerts.slice(0, 5).map((a) => ({
        id: a.id,
        category: a.category,
        severity: a.severity,
        title: a.title,
        parcel: a.parcel_name ?? '-',
        date: new Date(a.created_at).toLocaleDateString('sv-SE'),
      }));
    }
    const cols = PARCEL_COLUMNS.filter((c) => selectedColumns.has(c.key));
    return filteredParcels.slice(0, 5).map((p) => {
      const row: Record<string, string> = {};
      for (const col of cols) {
        row[col.key] = col.getValue(p);
      }
      return row;
    });
  }, [selectedDataType, filteredParcels, filteredAlerts, selectedColumns]);

  // Column toggle
  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Export handler
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Small delay for UX feedback
      await new Promise((r) => setTimeout(r, 300));

      if (selectedDataType === 'alerts') {
        exportAlertsCSV(filteredAlerts);
      } else if (selectedDataType === 'timber') {
        exportTimberInventory(filteredParcels);
      } else if (selectedDataType === 'community') {
        // Placeholder for community export
        return;
      } else {
        // Parcels export
        switch (selectedFormat) {
          case 'csv': {
            const cols = PARCEL_COLUMNS.filter((c) => selectedColumns.has(c.key));
            const data = filteredParcels.map((p) => {
              const row: Record<string, unknown> = {};
              for (const col of cols) {
                row[col.key] = col.getValue(p);
              }
              return row;
            });
            exportToCSV({
              data,
              columns: cols.map((c) => ({ key: c.key, label: c.label })),
              filename: 'beetlesense-parcels',
            });
            break;
          }
          case 'geojson':
            exportToGeoJSON(filteredParcels);
            break;
          case 'shapefile':
            exportToShapefile(filteredParcels, coordinateSystem);
            break;
          case 'kml':
            exportToKML(filteredParcels);
            break;
        }
      }

      onClose();
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFormat,
    selectedDataType,
    selectedColumns,
    coordinateSystem,
    filteredParcels,
    filteredAlerts,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <Download size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('export.title')}
              </h2>
              <p className="text-xs text-[var(--text3)]">{t('export.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Data type selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-2">
              {t('export.dataType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DATA_TYPE_OPTIONS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedDataType(id);
                    // Reset format if incompatible
                    if (
                      (id === 'alerts' || id === 'community') &&
                      selectedFormat !== 'csv'
                    ) {
                      setSelectedFormat('csv');
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedDataType === id
                      ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                      : 'text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <Icon size={14} />
                  {t(`export.dataTypes.${id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-2">
              {t('export.format')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableFormats.map(({ id, icon: Icon, extensions }) => (
                <button
                  key={id}
                  onClick={() => setSelectedFormat(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                    selectedFormat === id
                      ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                      : 'text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-semibold uppercase">
                    {t(`export.formats.${id}`)}
                  </span>
                  <span className="text-[10px] opacity-60">{extensions}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Column picker (CSV only, parcels only) */}
          {selectedFormat === 'csv' && selectedDataType === 'parcels' && (
            <div>
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--text2)] mb-2"
              >
                {t('export.columns')}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showColumnPicker ? 'rotate-180' : ''}`}
                />
                <span className="text-[10px] font-normal text-[var(--text3)]">
                  ({selectedColumns.size}/{PARCEL_COLUMNS.length})
                </span>
              </button>
              {showColumnPicker && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
                  {PARCEL_COLUMNS.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                        selectedColumns.has(col.key)
                          ? 'text-[var(--green)] bg-[var(--green)]/10'
                          : 'text-[var(--text3)] hover:text-[var(--text2)]'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          selectedColumns.has(col.key)
                            ? 'border-[var(--green)] bg-[var(--green)]'
                            : 'border-[var(--border2)]'
                        }`}
                      >
                        {selectedColumns.has(col.key) && (
                          <Check size={10} className="text-white" />
                        )}
                      </div>
                      {col.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coordinate system (Shapefile and GeoJSON) */}
          {(selectedFormat === 'shapefile') &&
            (selectedDataType === 'parcels' || selectedDataType === 'timber') && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text2)] mb-2">
                  {t('export.coordinateSystem')}
                </label>
                <div className="flex gap-2">
                  {(['WGS84', 'SWEREF99'] as const).map((crs) => (
                    <button
                      key={crs}
                      onClick={() => setCoordinateSystem(crs)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        coordinateSystem === crs
                          ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                          : 'text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                      }`}
                    >
                      {crs === 'WGS84' ? 'WGS84 (EPSG:4326)' : 'SWEREF99 TM (EPSG:3006)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Date range filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-2">
              {t('export.dateRange')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50"
                placeholder={t('export.from')}
              />
              <span className="text-xs text-[var(--text3)]">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50"
                placeholder={t('export.to')}
              />
            </div>
          </div>

          {/* Preview */}
          {recordCount > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text2)] mb-2">
                {t('export.preview')} ({Math.min(5, recordCount)} / {recordCount})
              </label>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[var(--bg2)]">
                      {Object.keys(previewRows[0] ?? {}).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left font-semibold text-[var(--text3)] uppercase tracking-wider whitespace-nowrap"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-[var(--border)] hover:bg-[var(--bg2)]/50"
                      >
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-3 py-1.5 text-[var(--text2)] whitespace-nowrap max-w-[200px] truncate"
                          >
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer: file size estimate + export button */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--text3)]">
              {recordCount > 0 ? (
                <>
                  {t('export.estimatedSize')}: <span className="font-mono">{sizeEstimate}</span>
                  {' / '}
                  {recordCount} {t('export.records')}
                </>
              ) : (
                t('export.noData')
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || recordCount === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('export.exporting')}
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    {t('export.exportButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
