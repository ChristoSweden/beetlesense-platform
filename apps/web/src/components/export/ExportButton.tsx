import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  FileSpreadsheet,
  Globe,
  Map,
  Layers,
  TreePine,
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
  type ExportFormat,
} from '@/services/exportService';
import { ExportModal } from './ExportModal';

// ─── Types ───

export type ExportButtonVariant = 'default' | 'compact' | 'icon-only';

interface ExportButtonProps {
  /** Parcel data to export */
  parcels?: PortfolioParcel[];
  /** Alert data to export */
  alerts?: Alert[];
  /** Available export formats */
  formats?: ExportFormat[];
  /** Filename prefix for exports */
  filenamePrefix?: string;
  /** Show the full export modal instead of quick dropdown */
  useModal?: boolean;
  /** Visual variant */
  variant?: ExportButtonVariant;
  /** Additional CSS classes */
  className?: string;
}

// ─── Format config ───

const FORMAT_CONFIG: Record<ExportFormat, { icon: typeof FileSpreadsheet; label: string }> = {
  csv: { icon: FileSpreadsheet, label: 'CSV' },
  geojson: { icon: Globe, label: 'GeoJSON' },
  shapefile: { icon: Layers, label: 'Shapefile' },
  kml: { icon: Map, label: 'KML' },
};

// ─── Component ───

export function ExportButton({
  parcels = [],
  alerts = [],
  formats = ['csv', 'geojson', 'shapefile', 'kml'],
  filenamePrefix = 'beetlesense',
  useModal = false,
  variant = 'default',
  className = '',
}: ExportButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Quick export (no modal)
  const handleQuickExport = useCallback(
    (format: ExportFormat) => {
      setIsOpen(false);

      if (alerts.length > 0 && parcels.length === 0) {
        // Alert-specific export
        exportAlertsCSV(alerts, `${filenamePrefix}-alerts`);
        return;
      }

      switch (format) {
        case 'csv': {
          const data = parcels.map((p) => {
            const row: Record<string, unknown> = {};
            for (const col of PARCEL_COLUMNS) {
              row[col.key] = col.getValue(p);
            }
            return row;
          });
          exportToCSV({
            data,
            columns: PARCEL_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
            filename: filenamePrefix,
          });
          break;
        }
        case 'geojson':
          exportToGeoJSON(parcels, filenamePrefix);
          break;
        case 'shapefile':
          exportToShapefile(parcels, 'WGS84', filenamePrefix);
          break;
        case 'kml':
          exportToKML(parcels, filenamePrefix);
          break;
      }
    },
    [parcels, alerts, filenamePrefix],
  );

  // Button click handler
  const handleClick = useCallback(() => {
    if (useModal) {
      setModalOpen(true);
    } else if (formats.length === 1) {
      handleQuickExport(formats[0]);
    } else {
      setIsOpen(!isOpen);
    }
  }, [useModal, formats, isOpen, handleQuickExport]);

  // Render button content based on variant
  const buttonContent = () => {
    switch (variant) {
      case 'icon-only':
        return <Download size={16} />;
      case 'compact':
        return (
          <>
            <Download size={14} />
            {t('export.exportButton')}
          </>
        );
      default:
        return (
          <>
            <Download size={14} />
            {t('export.exportButton')}
            {formats.length > 1 && !useModal && <ChevronDown size={12} />}
          </>
        );
    }
  };

  const baseClasses =
    variant === 'icon-only'
      ? 'w-8 h-8 rounded-lg flex items-center justify-center'
      : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={handleClick}
        className={`${baseClasses} text-[var(--text2)] border border-[var(--border)] hover:text-[var(--green)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors`}
        title={t('export.exportButton')}
      >
        {buttonContent()}
      </button>

      {/* Dropdown */}
      {isOpen && !useModal && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xl overflow-hidden">
          <div className="py-1">
            {formats.map((format) => {
              const config = FORMAT_CONFIG[format];
              const Icon = config.icon;
              return (
                <button
                  key={format}
                  onClick={() => handleQuickExport(format)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[var(--text2)] hover:bg-[var(--green)]/10 hover:text-[var(--green)] transition-colors"
                >
                  <Icon size={14} className="opacity-60" />
                  <span className="font-medium">{t(`export.formats.${format}`)}</span>
                </button>
              );
            })}

            {/* Timber inventory option (for parcel data) */}
            {parcels.length > 0 && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    exportTimberInventory(parcels, `${filenamePrefix}-virkesforrad`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[var(--text2)] hover:bg-[var(--green)]/10 hover:text-[var(--green)] transition-colors"
                >
                  <TreePine size={14} className="opacity-60" />
                  <span className="font-medium">{t('export.dataTypes.timber')}</span>
                </button>
              </>
            )}

            {/* Advanced export link */}
            <div className="border-t border-[var(--border)] my-1" />
            <button
              onClick={() => {
                setIsOpen(false);
                setModalOpen(true);
              }}
              className="w-full px-4 py-2 text-[10px] text-[var(--text3)] hover:text-[var(--green)] transition-colors text-center"
            >
              {t('export.advancedExport')}
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ExportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          parcels={parcels}
          alerts={alerts}
        />
      )}
    </div>
  );
}
