import type { AnalysisModule, SurveyType } from '@beetlesense/shared'
import { CONFIDENCE_WEIGHTS } from '@beetlesense/shared'
import { logger } from '../../lib/logger.js'

/**
 * A data source contributing to an analysis module.
 */
export interface DataSource {
  /** Source identifier (e.g. 'drone_rgb', 'sentinel2_ndvi', 'lidar_chm') */
  id: string
  /** The survey type this source corresponds to */
  surveyType: SurveyType
  /** Self-reported data quality (0-1), if available */
  quality?: number
  /** Whether this source has valid data for the current parcel */
  available: boolean
}

/**
 * Computed weight for a data source.
 */
export interface SourceWeight {
  /** Source identifier */
  sourceId: string
  /** Survey type */
  surveyType: SurveyType
  /** Raw confidence weight from the PRD table */
  rawWeight: number
  /** Adjusted weight (accounting for quality and availability) */
  adjustedWeight: number
  /** Normalized weight (sums to 1.0 across all available sources) */
  normalizedWeight: number
}

/**
 * ConfidenceWeightingService — computes per-source weights for multi-source
 * data fusion based on the PRD confidence table.
 *
 * The confidence weights define how much each survey type (drone, smartphone,
 * satellite) contributes to each analysis module. When multiple data sources
 * are available for a parcel (e.g., both drone imagery and satellite NDVI
 * for beetle detection), this service computes the fusion weights.
 *
 * Weight computation:
 * 1. Look up raw weights from CONFIDENCE_WEIGHTS constant
 * 2. Adjust by data quality factor (if provided)
 * 3. Set unavailable sources to 0
 * 4. Normalize so weights sum to 1.0
 */
export class ConfidenceWeightingService {
  private readonly log = logger.child({ service: 'confidence-weighting' })

  /**
   * Compute fusion weights for a given analysis module and its data sources.
   *
   * @param module - The analysis module being processed
   * @param sources - Available data sources with their metadata
   * @returns Array of source weights, normalized to sum to 1.0
   */
  computeWeights(
    module: AnalysisModule,
    sources: DataSource[],
  ): SourceWeight[] {
    this.log.info(
      {
        module,
        sourceCount: sources.length,
        sourceIds: sources.map((s) => s.id),
      },
      'Computing confidence weights',
    )

    const moduleWeights = CONFIDENCE_WEIGHTS[module]

    if (!moduleWeights) {
      this.log.warn({ module }, 'No confidence weights defined for module')
      // Fall back to equal weights
      const equalWeight = 1.0 / sources.filter((s) => s.available).length
      return sources.map((s) => ({
        sourceId: s.id,
        surveyType: s.surveyType,
        rawWeight: s.available ? equalWeight : 0,
        adjustedWeight: s.available ? equalWeight : 0,
        normalizedWeight: s.available ? equalWeight : 0,
      }))
    }

    // Step 1: Get raw weights and adjust by quality
    const rawWeights = sources.map((source) => {
      const rawWeight = source.available
        ? moduleWeights[source.surveyType] ?? 0
        : 0

      // Adjust by data quality if provided (multiply by quality factor)
      const qualityFactor = source.quality ?? 1.0
      const adjustedWeight = rawWeight * qualityFactor

      return {
        sourceId: source.id,
        surveyType: source.surveyType,
        rawWeight,
        adjustedWeight,
        normalizedWeight: 0, // Will be computed in step 2
      }
    })

    // Step 2: Normalize so weights sum to 1.0
    const totalWeight = rawWeights.reduce((sum, w) => sum + w.adjustedWeight, 0)

    const normalizedWeights: SourceWeight[] = rawWeights.map((w) => ({
      ...w,
      normalizedWeight: totalWeight > 0 ? w.adjustedWeight / totalWeight : 0,
    }))

    this.log.info(
      {
        module,
        weights: normalizedWeights.map((w) => ({
          source: w.sourceId,
          type: w.surveyType,
          raw: w.rawWeight,
          normalized: Math.round(w.normalizedWeight * 1000) / 1000,
        })),
      },
      'Confidence weights computed',
    )

    return normalizedWeights
  }

  /**
   * Get the raw confidence weight for a specific module + survey type combination.
   * Useful for quick lookups without full weight computation.
   */
  getRawWeight(module: AnalysisModule, surveyType: SurveyType): number {
    const weights = CONFIDENCE_WEIGHTS[module]
    return weights?.[surveyType] ?? 0
  }

  /**
   * Determine the primary (highest weight) survey type for a module.
   */
  getPrimarySurveyType(module: AnalysisModule): SurveyType {
    const weights = CONFIDENCE_WEIGHTS[module]
    if (!weights) return 'drone'

    const entries = Object.entries(weights) as [SurveyType, number][]
    entries.sort((a, b) => b[1] - a[1])
    return entries[0]![0]
  }
}
