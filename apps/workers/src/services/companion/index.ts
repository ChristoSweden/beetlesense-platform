export { IntentClassifier } from './intentClassifier.js'
export type {
  Intent,
  ClassificationResult,
  LlmClassifyFn,
} from './intentClassifier.js'

export { RetrievalService } from './retrievalService.js'
export type {
  RetrievalResult,
  RetrievalContext,
  SourceCitation,
  StructuredContext,
} from './retrievalService.js'

export { ContextAssembler } from './contextAssembler.js'
export type { Message, AssembledContext } from './contextAssembler.js'

export { GuardrailService } from './guardrails.js'
export type {
  ConfidenceLevel,
  ConfidenceResult,
  GuardrailCheckResult,
  ValidationResult,
} from './guardrails.js'

export { CompanionAnalyticsService } from './analyticsService.js'
export type {
  InteractionLog,
  LatencyBreakdown,
} from './analyticsService.js'

export { AnalyticsLogger, getAnalyticsLogger } from './analyticsLogger.js'
export type { CompanionInteraction } from './analyticsLogger.js'
