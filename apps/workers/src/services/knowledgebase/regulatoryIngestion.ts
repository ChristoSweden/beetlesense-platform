/**
 * Regulatory and domain-rules ingestion service.
 *
 * Handles chunking and embedding of regulatory documents, forestry
 * guidelines (Skogsstyrelsen, EU), and domain reference material.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { RecursiveTextSplitter } from './chunkingService.js'
import { EmbeddingService } from './embeddingService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface RegulatoryDocument {
  content: string
  source: string
  jurisdiction: string
  topic: string
  title?: string
  effectiveDate?: string
  version?: string
}

export interface RegulatoryIngestionResult {
  source: string
  chunksStored: number
  totalTokens: number
  durationMs: number
}

// ── Constants ─────────────────────────────────────────────────────────────

const CHUNK_MAX_TOKENS = 512
const CHUNK_OVERLAP = 64
const BATCH_INSERT_SIZE = 50

// ── Service ───────────────────────────────────────────────────────────────

export class RegulatoryIngestionService {
  private readonly splitter: RecursiveTextSplitter
  private readonly embedder: EmbeddingService

  constructor(embedder?: EmbeddingService) {
    this.splitter = new RecursiveTextSplitter(CHUNK_MAX_TOKENS, CHUNK_OVERLAP)
    this.embedder = embedder ?? new EmbeddingService()
  }

  /**
   * Ingest a single regulatory document: chunk → embed → store.
   */
  async ingestDocument(
    content: string,
    source: string,
    jurisdiction: string,
    topic: string,
    extra?: { title?: string; effectiveDate?: string; version?: string },
  ): Promise<RegulatoryIngestionResult> {
    const start = Date.now()
    const log = logger.child({ source, jurisdiction, topic })

    log.info('Starting regulatory document ingestion')

    if (!content || content.trim().length < 50) {
      throw new Error(`Document content too short for source: ${source}`)
    }

    // Chunk with metadata
    const metadata: Record<string, unknown> = {
      source,
      jurisdiction,
      topic,
      documentType: 'regulatory',
      title: extra?.title ?? source,
      effectiveDate: extra?.effectiveDate ?? null,
      version: extra?.version ?? null,
    }

    const chunks = this.splitter.createChunksWithContext(content, metadata)
    log.info({ chunkCount: chunks.length }, 'Document chunked')

    // Embed
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await this.embedder.embedTexts(chunkTexts)

    // Store — delete old data for this source first (idempotent)
    const supabase = getSupabaseAdmin()
    await supabase
      .from('regulatory_embeddings')
      .delete()
      .eq('source', source)

    for (let i = 0; i < chunks.length; i += BATCH_INSERT_SIZE) {
      const batch = chunks.slice(i, i + BATCH_INSERT_SIZE)
      const rows = batch.map((chunk, batchIdx) => {
        const globalIdx = i + batchIdx
        return {
          content: chunk.content,
          embedding: JSON.stringify(embeddings[globalIdx]!.embedding),
          source,
          jurisdiction,
          topic,
          chunk_index: chunk.index,
          token_count: chunk.tokenEstimate,
          metadata: chunk.metadata,
        }
      })

      const { error } = await supabase
        .from('regulatory_embeddings')
        .insert(rows)

      if (error) {
        throw new Error(
          `Failed to insert regulatory embeddings (offset ${i}): ${error.message}`,
        )
      }
    }

    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokenCount, 0)
    const duration = Date.now() - start

    log.info(
      { chunksStored: chunks.length, totalTokens, durationMs: duration },
      'Regulatory document ingested',
    )

    return {
      source,
      chunksStored: chunks.length,
      totalTokens,
      durationMs: duration,
    }
  }

  /**
   * Ingest multiple regulatory documents sequentially.
   */
  async ingestBatch(
    documents: RegulatoryDocument[],
  ): Promise<RegulatoryIngestionResult[]> {
    const results: RegulatoryIngestionResult[] = []

    for (const doc of documents) {
      try {
        const result = await this.ingestDocument(
          doc.content,
          doc.source,
          doc.jurisdiction,
          doc.topic,
          {
            title: doc.title,
            effectiveDate: doc.effectiveDate,
            version: doc.version,
          },
        )
        results.push(result)
      } catch (err) {
        logger.error(
          { source: doc.source, err },
          'Failed to ingest regulatory document, continuing batch',
        )
        results.push({
          source: doc.source,
          chunksStored: 0,
          totalTokens: 0,
          durationMs: 0,
        })
      }
    }

    return results
  }

  /**
   * Placeholder: Ingest Swedish Forest Agency (Skogsstyrelsen) guidelines.
   *
   * In production this would fetch from Skogsstyrelsen's public API or
   * pre-downloaded document store.  For now it provides the ingestion
   * structure that can be populated with real content.
   */
  async ingestSkogsstyrelsenGuidelines(): Promise<RegulatoryIngestionResult[]> {
    const log = logger.child({ source: 'skogsstyrelsen' })
    log.info('Ingesting Skogsstyrelsen guidelines (placeholder)')

    const guidelines: RegulatoryDocument[] = [
      {
        source: 'skogsstyrelsen:skogsvardslag',
        jurisdiction: 'SE',
        topic: 'forestry_law',
        title: 'Skogsvårdslagen (Forestry Act)',
        content: `
# Skogsvårdslagen (1979:429)

## Syfte och tillämpningsområde
Skogsvårdslagen reglerar skogsbruket i Sverige. Lagen syftar till att skogen ska
skötas så att den uthålligt ger god avkastning samtidigt som den biologiska
mångfalden behålls.

## Avverkning
Vid föryngringsavverkning ska hänsyn tas till naturvårdens och kulturmiljövårdens
intressen. Anmälan om avverkning ska göras till Skogsstyrelsen senast sex veckor
innan avverkning påbörjas för arealer överstigande 0,5 hektar.

## Återplantering
Skyldighet att anlägga ny skog föreligger efter avverkning. Återplantering ska
ske senast inom tre år efter avverkning. Godkända trädslag och planteringsmetoder
specificeras i Skogsstyrelsens föreskrifter.

## Hänsyn
Generell hänsyn vid skogsbruk inkluderar bevarande av hänsynskrävande biotoper,
skyddszoner mot vatten, och kvarlämnade träd och trädgrupper.
        `.trim(),
        effectiveDate: '1979-01-01',
        version: 'SFS 1979:429 (senast ändrad 2023)',
      },
      {
        source: 'skogsstyrelsen:bark_beetle_guidelines',
        jurisdiction: 'SE',
        topic: 'pest_management',
        title: 'Riktlinjer för bekämpning av granbarkborre',
        content: `
# Riktlinjer för bekämpning av granbarkborre (Ips typographus)

## Identifiering
Granbarkborren angriper primärt gran (Picea abies). Tecken på angrepp inkluderar:
- Brunt borrljöl vid stambasen
- Avfallande bark
- Gulnande krona (sent stadium)
- Hackspettskador (fågeln letar efter larver)

## Förebyggande åtgärder
- Undvik att lämna färskt granvirke i skogen under flygtid (maj-augusti)
- Upparbeta stormfällt virke snarast
- Fångstvirke kan användas men måste barkas eller transporteras före svärmning

## Åtgärder vid angrepp
- Identifiera och markera angripna träd
- Avverka och transportera bort angripna träd före nästa svärmningsperiod
- Anmäl större angrepp till Skogsstyrelsen

## Övervakning
Regelbunden inventering rekommenderas under maj-september. Feromonbaserade
övervakningssystem kan komplettera visuell inspektion.
        `.trim(),
        effectiveDate: '2023-01-01',
        version: '2023.1',
      },
    ]

    return this.ingestBatch(guidelines)
  }

  /**
   * Placeholder: Ingest EU forestry and environmental regulations.
   *
   * In production, this would process the EU Timber Regulation (EUTR),
   * EU Deforestation Regulation (EUDR), Habitats Directive, etc.
   */
  async ingestEURegulations(): Promise<RegulatoryIngestionResult[]> {
    const log = logger.child({ source: 'eu_regulations' })
    log.info('Ingesting EU regulations (placeholder)')

    const regulations: RegulatoryDocument[] = [
      {
        source: 'eu:eudr_2023_1115',
        jurisdiction: 'EU',
        topic: 'deforestation_regulation',
        title: 'EU Deforestation Regulation (EUDR)',
        content: `
# EU Deforestation Regulation (EU) 2023/1115

## Scope
The EUDR applies to operators and traders placing certain commodities on the EU
market or exporting them. Relevant commodities include wood and wood products.

## Due Diligence Requirements
Operators must ensure products are:
1. Deforestation-free (no deforestation after 31 December 2020)
2. Produced in accordance with relevant legislation of the country of production
3. Covered by a due diligence statement

## Geolocation Requirements
For plots of land used for production of relevant commodities, operators must
provide geolocation coordinates. For plots exceeding four hectares, sufficient
geolocation points to describe the perimeter.

## Traceability
Full supply chain traceability from forest to market is required. Digital
tools and satellite monitoring support verification.

## Penalties
Member States shall determine penalties that are effective, proportionate, and
dissuasive. Maximum fines of at least 4% of total annual EU-wide turnover.
        `.trim(),
        effectiveDate: '2024-12-30',
        version: 'Regulation (EU) 2023/1115',
      },
      {
        source: 'eu:habitats_directive',
        jurisdiction: 'EU',
        topic: 'biodiversity',
        title: 'Habitats Directive (92/43/EEC)',
        content: `
# Habitats Directive (Council Directive 92/43/EEC)

## Objective
Conservation of natural habitats and of wild fauna and flora within the EU.
Aims to ensure biodiversity through conservation of natural habitats.

## Natura 2000 Network
Establishes a network of protected areas (Special Areas of Conservation).
Forest habitats listed in Annex I include:
- 9010 Western Taiga
- 9020 Fennoscandian hemiboreal natural old broadleaved forests
- 9030 Natural forests of primary succession stages
- 9060 Coniferous forests on glaciofluvial eskers
- 91D0 Bog woodland

## Species Protection
Annex II species requiring conservation in their habitats (relevant to
Scandinavian forestry):
- Various bat species
- Beetles (e.g., Osmoderma eremita)
- Woodland birds

## Impact Assessment
Any plan or project likely to have a significant effect on a Natura 2000 site
must undergo an appropriate assessment of its implications.
        `.trim(),
        effectiveDate: '1992-05-21',
        version: 'Consolidated 2013',
      },
    ]

    return this.ingestBatch(regulations)
  }
}
