/**
 * useArcGISExport — hook for exporting BeetleSense data to ArcGIS Online.
 *
 * Triggers a server-side export via the worker API and tracks progress.
 * In demo mode, returns mock ArcGIS URLs without making API calls.
 */

import { useState, useCallback } from 'react'
import { isDemoMode } from '@/lib/dataMode'

// ─── Types ───

export type ArcGISExportType = 'parcel' | 'sensor_products' | 'tree_inventory' | 'beetle_risk'

export type ArcGISExportStatus = 'idle' | 'exporting' | 'complete' | 'failed'

export interface ArcGISExportResult {
  itemId: string
  serviceUrl: string
  mapViewerUrl: string
  featureCount: number
}

// ─── Demo mocks ───

const DEMO_RESULTS: Record<ArcGISExportType, ArcGISExportResult> = {
  parcel: {
    itemId: 'demo-parcel-item-001',
    serviceUrl: 'https://services.arcgis.com/demo/arcgis/rest/services/BeetleSense_Parcel/FeatureServer',
    mapViewerUrl: 'https://www.arcgis.com/home/webmap/viewer.html?useExisting=1&layers=demo-parcel-item-001',
    featureCount: 1,
  },
  sensor_products: {
    itemId: 'demo-sensor-item-002',
    serviceUrl: 'https://services.arcgis.com/demo/arcgis/rest/services/BeetleSense_Ortho/ImageServer',
    mapViewerUrl: 'https://www.arcgis.com/home/webmap/viewer.html?useExisting=1&layers=demo-sensor-item-002',
    featureCount: 3,
  },
  tree_inventory: {
    itemId: 'demo-trees-item-003',
    serviceUrl: 'https://services.arcgis.com/demo/arcgis/rest/services/BeetleSense_Trees/FeatureServer',
    mapViewerUrl: 'https://www.arcgis.com/home/webmap/viewer.html?useExisting=1&layers=demo-trees-item-003',
    featureCount: 847,
  },
  beetle_risk: {
    itemId: 'demo-beetle-item-004',
    serviceUrl: 'https://services.arcgis.com/demo/arcgis/rest/services/BeetleSense_BeetleRisk/FeatureServer',
    mapViewerUrl: 'https://www.arcgis.com/home/webmap/viewer.html?useExisting=1&layers=demo-beetle-item-004',
    featureCount: 12,
  },
}

// ─── Hook ───

export function useArcGISExport() {
  const [status, setStatus] = useState<ArcGISExportStatus>('idle')
  const [result, setResult] = useState<ArcGISExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportToArcGIS = useCallback(
    async (type: ArcGISExportType, id: string): Promise<ArcGISExportResult | null> => {
      setStatus('exporting')
      setResult(null)
      setError(null)

      // Demo mode: simulate export with delay
      if (isDemoMode()) {
        await new Promise((resolve) => setTimeout(resolve, 1800))
        const demoResult = DEMO_RESULTS[type]
        setResult(demoResult)
        setStatus('complete')
        return demoResult
      }

      // Live mode: call worker API
      try {
        const workerUrl = import.meta.env.VITE_WORKER_API_URL || 'http://localhost:3002'
        const resp = await fetch(`${workerUrl}/api/arcgis/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, id }),
        })

        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(`Export failed (${resp.status}): ${text.slice(0, 200)}`)
        }

        const data = (await resp.json()) as ArcGISExportResult
        setResult(data)
        setStatus('complete')
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Okänt fel vid ArcGIS-export'
        setError(message)
        setStatus('failed')
        return null
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return {
    exportToArcGIS,
    status,
    result,
    error,
    reset,
    isDemo: isDemoMode(),
  }
}
