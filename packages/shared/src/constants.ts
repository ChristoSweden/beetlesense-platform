import { AnalysisModule } from './types/modules'

/**
 * Confidence weights per module per survey type.
 * Values represent the relative weight (0-1) used when combining
 * multi-source analysis results for a given module.
 */
export const CONFIDENCE_WEIGHTS: Record<
  AnalysisModule,
  { drone: number; smartphone: number; satellite: number }
> = {
  [AnalysisModule.TREE_COUNT]: {
    drone: 0.85,
    smartphone: 0.4,
    satellite: 0.7,
  },
  [AnalysisModule.SPECIES_ID]: {
    drone: 0.9,
    smartphone: 0.75,
    satellite: 0.3,
  },
  [AnalysisModule.ANIMAL_INVENTORY]: {
    drone: 0.8,
    smartphone: 0.2,
    satellite: 0.1,
  },
  [AnalysisModule.BEETLE_DETECTION]: {
    drone: 0.95,
    smartphone: 0.5,
    satellite: 0.65,
  },
  [AnalysisModule.BOAR_DAMAGE]: {
    drone: 0.85,
    smartphone: 0.6,
    satellite: 0.35,
  },
  [AnalysisModule.MODULE_6]: {
    drone: 0.0,
    smartphone: 0.0,
    satellite: 0.0,
  },
}

/** Supported UI languages */
export const SUPPORTED_LANGUAGES = ['sv', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Maximum upload file size: 5 GB */
export const MAX_UPLOAD_SIZE_BYTES = 5_368_709_120

/** SLA hours by processing priority */
export const SLA_HOURS: Record<string, number> = {
  low: 72,
  normal: 24,
  high: 8,
  urgent: 2,
}

/** Default pagination values */
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

/** Supabase storage bucket names */
export const STORAGE_BUCKETS = {
  SURVEY_UPLOADS: 'survey-uploads',
  ANALYSIS_OUTPUTS: 'analysis-outputs',
  AVATARS: 'avatars',
} as const

/** Session and token configuration */
export const SESSION_CONFIG = {
  ACCESS_TOKEN_TTL_SECONDS: 3600,
  REFRESH_TOKEN_TTL_SECONDS: 604800,
  MAX_COMPANION_SESSIONS: 50,
  MAX_COMPANION_MESSAGES_PER_SESSION: 200,
} as const
