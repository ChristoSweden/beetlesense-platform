/**
 * ArcGISExportButton — button component for exporting data to ArcGIS Online.
 *
 * Shows an ArcGIS logo, progress indicator during export, and a direct
 * link to the ArcGIS Map Viewer once complete. Swedish labels.
 */

import { useState } from 'react'
import { ExternalLink, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useArcGISExport, type ArcGISExportType } from '@/hooks/useArcGISExport'

// ─── Types ───

interface ArcGISExportButtonProps {
  /** Type of data to export */
  exportType: ArcGISExportType
  /** ID of the resource (parcel ID, survey ID) */
  resourceId: string
  /** Additional CSS classes */
  className?: string
}

// ─── ArcGIS Logo (inline SVG) ───

function ArcGISLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Export type labels (Swedish) ───

const EXPORT_LABELS: Record<ArcGISExportType, string> = {
  parcel: 'Skiftesgräns och analys',
  sensor_products: 'Ortomosaik och sensorer',
  tree_inventory: 'Trädbestånd',
  beetle_risk: 'Barkborre-riskkarta',
}

// ─── Component ───

export function ArcGISExportButton({
  exportType,
  resourceId,
  className = '',
}: ArcGISExportButtonProps) {
  const { exportToArcGIS, status, result, error, reset } = useArcGISExport()
  const [hasExported, setHasExported] = useState(false)

  const handleExport = async () => {
    setHasExported(true)
    await exportToArcGIS(exportType, resourceId)
  }

  const handleReset = () => {
    reset()
    setHasExported(false)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main export button */}
      {status === 'idle' && !hasExported && (
        <button
          onClick={handleExport}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-all text-sm font-medium group"
        >
          <ArcGISLogo className="w-5 h-5 text-[var(--text3)] group-hover:text-[var(--green)] transition-colors" />
          <span>Exportera till ArcGIS Online</span>
        </button>
      )}

      {/* Exporting — progress indicator */}
      {status === 'exporting' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 text-sm">
          <Loader2 size={18} className="text-[var(--green)] animate-spin" />
          <div className="flex flex-col">
            <span className="text-[var(--green)] font-medium">Exporterar till ArcGIS...</span>
            <span className="text-[10px] text-[var(--text3)]">
              {EXPORT_LABELS[exportType]}
            </span>
          </div>
        </div>
      )}

      {/* Complete — show link to Map Viewer */}
      {status === 'complete' && result && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--green)]" />
            <span className="text-sm text-[var(--green)] font-medium">
              Exporterad till ArcGIS Online
            </span>
          </div>

          <div className="text-[10px] text-[var(--text3)] ml-6">
            {result.featureCount}{' '}
            {result.featureCount === 1 ? 'objekt' : 'objekt'} exporterade
          </div>

          <a
            href={result.mapViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 ml-6 text-xs text-[var(--green)] hover:underline"
          >
            <ExternalLink size={12} />
            <span>Visa i ArcGIS Map Viewer</span>
          </a>

          <button
            onClick={handleReset}
            className="ml-6 mt-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors self-start"
          >
            Exportera igen
          </button>
        </div>
      )}

      {/* Error state */}
      {status === 'failed' && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-400 font-medium">
              Export misslyckades
            </span>
          </div>

          {error && (
            <div className="text-[10px] text-red-300/70 ml-6 break-words">
              {error}
            </div>
          )}

          <button
            onClick={handleReset}
            className="ml-6 mt-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors self-start"
          >
            Försök igen
          </button>
        </div>
      )}
    </div>
  )
}
