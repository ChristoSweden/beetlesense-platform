export { RecursiveTextSplitter, estimateTokens } from './chunkingService.js'
export type { TextChunk } from './chunkingService.js'

export { EmbeddingService } from './embeddingService.js'
export type { EmbeddingResult } from './embeddingService.js'

export { PaperIngestionService } from './paperIngestion.js'
export type {
  PaperMetadata,
  EmbeddedChunk,
  IngestionResult,
} from './paperIngestion.js'

export { RegulatoryIngestionService } from './regulatoryIngestion.js'
export type {
  RegulatoryDocument,
  RegulatoryIngestionResult,
} from './regulatoryIngestion.js'

export { ProjectContextService } from './projectContextService.js'
export type {
  AnalysisResultSummary,
  SatelliteObservation,
} from './projectContextService.js'
