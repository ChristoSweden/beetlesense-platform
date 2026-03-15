/**
 * Auto-populate user_data_embeddings from analysis results and satellite
 * observations.  Converts structured data into natural-language summaries,
 * embeds them, and stores with user_id isolation so each user's companion
 * only retrieves their own project context.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { EmbeddingService } from './embeddingService.js'
import { estimateTokens } from './chunkingService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface AnalysisResultSummary {
  surveyId: string
  parcelId: string
  parcelName?: string
  module: string
  status: 'completed' | 'failed'
  completedAt: string
  resultData: Record<string, unknown>
  confidenceScore?: number
}

export interface SatelliteObservation {
  observationId: string
  parcelId: string
  parcelName?: string
  source: string
  acquisitionDate: string
  cloudCoverPercent?: number
  indexData: {
    ndvi_mean?: number
    ndvi_min?: number
    ndvi_max?: number
    ndvi_trend?: 'increasing' | 'decreasing' | 'stable'
    previous_ndvi_mean?: number
    change_percent?: number
    [key: string]: unknown
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export class ProjectContextService {
  private readonly embedder: EmbeddingService

  constructor(embedder?: EmbeddingService) {
    this.embedder = embedder ?? new EmbeddingService()
  }

  /**
   * Called when an analysis module completes.  Generates a human-readable
   * summary, embeds it, and stores in user_data_embeddings.
   */
  async onAnalysisComplete(
    userId: string,
    organizationId: string,
    surveyId: string,
    module: string,
    results: AnalysisResultSummary,
  ): Promise<void> {
    const log = logger.child({ userId, surveyId, module })
    log.info('Generating context embedding for analysis result')

    const summary = this.generateAnalysisSummary(module, results)
    if (!summary) {
      log.warn('Empty summary generated, skipping embedding')
      return
    }

    const embedding = await this.embedder.embedQuery(summary)

    const supabase = getSupabaseAdmin()

    // Upsert: delete any existing embedding for this survey+module
    const source = `analysis:${surveyId}:${module}`
    await supabase
      .from('user_data_embeddings')
      .delete()
      .eq('source', source)
      .eq('user_id', userId)

    const { error } = await supabase
      .from('user_data_embeddings')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        parcel_id: results.parcelId,
        content: summary,
        embedding: JSON.stringify(embedding),
        source,
        token_count: estimateTokens(summary),
        metadata: {
          module,
          surveyId,
          parcelId: results.parcelId,
          parcelName: results.parcelName ?? null,
          completedAt: results.completedAt,
          confidenceScore: results.confidenceScore ?? null,
          dataType: 'analysis_result',
        },
      })

    if (error) {
      throw new Error(
        `Failed to store analysis context embedding: ${error.message}`,
      )
    }

    log.info(
      { source, summaryLength: summary.length },
      'Analysis context embedding stored',
    )
  }

  /**
   * Called when a new satellite observation is processed for a parcel.
   * Generates an NDVI trend summary and embeds it.
   */
  async onSatelliteUpdate(
    userId: string,
    organizationId: string,
    parcelId: string,
    observation: SatelliteObservation,
  ): Promise<void> {
    const log = logger.child({ userId, parcelId, observationId: observation.observationId })
    log.info('Generating context embedding for satellite observation')

    const summary = this._generateSatelliteSummary(observation)
    if (!summary) {
      log.warn('Empty satellite summary, skipping embedding')
      return
    }

    const embedding = await this.embedder.embedQuery(summary)
    const supabase = getSupabaseAdmin()

    // Upsert: keep latest observation for this parcel+source
    const source = `satellite:${parcelId}:${observation.source}:latest`
    await supabase
      .from('user_data_embeddings')
      .delete()
      .eq('source', source)
      .eq('user_id', userId)

    const { error } = await supabase
      .from('user_data_embeddings')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        parcel_id: parcelId,
        content: summary,
        embedding: JSON.stringify(embedding),
        source,
        token_count: estimateTokens(summary),
        metadata: {
          observationId: observation.observationId,
          parcelId,
          parcelName: observation.parcelName ?? null,
          acquisitionDate: observation.acquisitionDate,
          satelliteSource: observation.source,
          dataType: 'satellite_observation',
          indexData: observation.indexData,
        },
      })

    if (error) {
      throw new Error(
        `Failed to store satellite context embedding: ${error.message}`,
      )
    }

    log.info(
      { source, summaryLength: summary.length },
      'Satellite context embedding stored',
    )
  }

  /**
   * Convert structured analysis results into a readable text summary.
   * The LLM can reference this when answering user questions about their
   * parcels and surveys.
   */
  generateAnalysisSummary(
    module: string,
    results: AnalysisResultSummary,
  ): string {
    const parcelLabel = results.parcelName
      ? `"${results.parcelName}" parcel`
      : `parcel ${results.parcelId.slice(0, 8)}`
    const date = results.completedAt.split('T')[0] ?? results.completedAt
    const data = results.resultData

    switch (module) {
      case 'tree_count':
        return this._summarizeTreeCount(parcelLabel, date, data)
      case 'species_id':
        return this._summarizeSpeciesId(parcelLabel, date, data)
      case 'beetle_detection':
        return this._summarizeBeetleDetection(parcelLabel, date, data)
      case 'animal_inventory':
        return this._summarizeAnimalInventory(parcelLabel, date, data)
      case 'boar_damage':
        return this._summarizeBoarDamage(parcelLabel, date, data)
      default:
        return this._summarizeGeneric(module, parcelLabel, date, data)
    }
  }

  // ── Module-specific summary generators ────────────────────────────────

  private _summarizeTreeCount(
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    const totalTrees = data['total_trees'] ?? data['tree_count'] ?? 'unknown'
    const areaHa = data['area_hectares'] ?? data['area_ha'] ?? null
    const density = data['trees_per_hectare'] ?? data['density'] ?? null
    const dominantSpecies = data['dominant_species'] as string | undefined
    const avgHeight = data['average_height_m'] ?? data['avg_height'] ?? null
    const flaggedAreas = data['flagged_areas'] as unknown[] | undefined

    let summary = `Tree count analysis of ${parcel} completed on ${date}. `
    summary += `Found ${totalTrees} trees`
    if (areaHa) summary += ` across ${areaHa} hectares`
    if (density) summary += ` (${density} trees/ha)`
    summary += '. '
    if (dominantSpecies) summary += `Dominant species: ${dominantSpecies}. `
    if (avgHeight) summary += `Average height: ${avgHeight}m. `
    if (flaggedAreas && flaggedAreas.length > 0) {
      summary += `${flaggedAreas.length} areas flagged with below-average density. `
    }
    if (data['confidence_score']) {
      summary += `Analysis confidence: ${(Number(data['confidence_score']) * 100).toFixed(0)}%.`
    }

    return summary.trim()
  }

  private _summarizeSpeciesId(
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    const speciesBreakdown = data['species_breakdown'] as
      | Record<string, number>
      | undefined
    const totalClassified = data['total_classified'] ?? data['total_trees'] ?? 'unknown'

    let summary = `Species identification analysis of ${parcel} completed on ${date}. `
    summary += `Classified ${totalClassified} trees. `

    if (speciesBreakdown) {
      const sorted = Object.entries(speciesBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
      const breakdown = sorted
        .map(([species, pct]) => `${species} (${typeof pct === 'number' && pct < 1 ? (pct * 100).toFixed(0) + '%' : pct + '%'})`)
        .join(', ')
      summary += `Species distribution: ${breakdown}. `
    }

    return summary.trim()
  }

  private _summarizeBeetleDetection(
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    const infestationLevel = data['infestation_level'] ?? data['severity'] ?? 'unknown'
    const affectedTrees = data['affected_trees'] ?? data['detected_count'] ?? null
    const affectedAreaHa = data['affected_area_hectares'] ?? data['affected_area_ha'] ?? null
    const riskZones = data['risk_zones'] as unknown[] | undefined

    let summary = `Bark beetle detection analysis of ${parcel} completed on ${date}. `
    summary += `Infestation level: ${infestationLevel}. `
    if (affectedTrees) summary += `${affectedTrees} trees showing signs of infestation. `
    if (affectedAreaHa) summary += `Affected area: ${affectedAreaHa} hectares. `
    if (riskZones && riskZones.length > 0) {
      summary += `${riskZones.length} high-risk zones identified for monitoring. `
    }

    return summary.trim()
  }

  private _summarizeAnimalInventory(
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    const totalDetected = data['total_detected'] ?? data['animal_count'] ?? 0
    const speciesDetected = data['species_detected'] as string[] | undefined

    let summary = `Animal inventory analysis of ${parcel} completed on ${date}. `
    summary += `Detected ${totalDetected} animals. `
    if (speciesDetected && speciesDetected.length > 0) {
      summary += `Species observed: ${speciesDetected.join(', ')}. `
    }

    return summary.trim()
  }

  private _summarizeBoarDamage(
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    const damageLevel = data['damage_level'] ?? data['severity'] ?? 'unknown'
    const affectedAreaHa = data['affected_area_hectares'] ?? null
    const damageType = data['damage_type'] ?? null

    let summary = `Wild boar damage assessment of ${parcel} completed on ${date}. `
    summary += `Damage level: ${damageLevel}. `
    if (affectedAreaHa) summary += `Affected area: ${affectedAreaHa} hectares. `
    if (damageType) summary += `Primary damage type: ${damageType}. `

    return summary.trim()
  }

  private _summarizeGeneric(
    module: string,
    parcel: string,
    date: string,
    data: Record<string, unknown>,
  ): string {
    let summary = `${module} analysis of ${parcel} completed on ${date}. `
    const keys = Object.keys(data).slice(0, 5)
    if (keys.length > 0) {
      const details = keys
        .map((k) => `${k}: ${JSON.stringify(data[k])}`)
        .join('; ')
      summary += `Results: ${details}.`
    }
    return summary.trim()
  }

  // ── Satellite summary ─────────────────────────────────────────────────

  private _generateSatelliteSummary(obs: SatelliteObservation): string {
    const parcelLabel = obs.parcelName
      ? `"${obs.parcelName}" parcel`
      : `parcel ${obs.parcelId.slice(0, 8)}`
    const { indexData } = obs

    let summary = `Satellite observation for ${parcelLabel} from ${obs.source} `
    summary += `acquired on ${obs.acquisitionDate}. `

    if (obs.cloudCoverPercent !== undefined) {
      summary += `Cloud cover: ${obs.cloudCoverPercent}%. `
    }

    if (indexData.ndvi_mean !== undefined) {
      summary += `NDVI mean: ${indexData.ndvi_mean.toFixed(3)}`
      if (indexData.ndvi_min !== undefined && indexData.ndvi_max !== undefined) {
        summary += ` (range: ${indexData.ndvi_min.toFixed(3)} – ${indexData.ndvi_max.toFixed(3)})`
      }
      summary += '. '
    }

    if (indexData.ndvi_trend) {
      summary += `NDVI trend: ${indexData.ndvi_trend}. `
    }

    if (
      indexData.previous_ndvi_mean !== undefined &&
      indexData.change_percent !== undefined
    ) {
      const direction = indexData.change_percent >= 0 ? 'increase' : 'decrease'
      summary += `Compared to previous observation: ${Math.abs(indexData.change_percent).toFixed(1)}% ${direction} `
      summary += `(previous NDVI mean: ${indexData.previous_ndvi_mean.toFixed(3)}). `
    }

    if (
      indexData.ndvi_trend === 'decreasing' &&
      indexData.change_percent !== undefined &&
      indexData.change_percent < -10
    ) {
      summary +=
        'Significant vegetation decline detected — may indicate drought stress, ' +
        'insect damage, or recent harvesting activity. Recommend ground inspection. '
    }

    return summary.trim()
  }
}
