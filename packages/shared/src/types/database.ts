import type { UserRole } from './auth'

/** Row type for the `organizations` table */
export interface OrganizationRow {
  id: string
  name: string
  org_number: string | null
  billing_email: string | null
  plan: 'free' | 'pro' | 'enterprise'
  max_parcels: number
  max_storage_bytes: number
  created_at: string
  updated_at: string
}

/** Row type for the `profiles` table */
export interface ProfileRow {
  id: string
  user_id: string
  organization_id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  preferred_language: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

/** Row type for the `parcels` table */
export interface ParcelRow {
  id: string
  organization_id: string
  name: string
  description: string | null
  /** GeoJSON Polygon geometry serialized as string */
  geometry: string
  /** GeoJSON Point geometry serialized as string */
  centroid: string
  area_hectares: number
  crs: string
  county: string | null
  municipality: string | null
  property_designation: string | null
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
}

/** Row type for the `surveys` table */
export interface SurveyRow {
  id: string
  parcel_id: string
  organization_id: string
  name: string
  status: 'draft' | 'uploading' | 'processing' | 'completed' | 'failed'
  survey_type: 'drone' | 'smartphone' | 'satellite'
  modules: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_by: string
  created_at: string
  updated_at: string
}

/** Row type for the `survey_uploads` table */
export interface SurveyUploadRow {
  id: string
  survey_id: string
  organization_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
  mime_type: string
  upload_status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  /** EXIF or capture metadata stored as JSONB */
  metadata: Record<string, unknown>
  /** GeoJSON Point geometry of capture location */
  capture_location: string | null
  captured_at: string | null
  checksum_sha256: string | null
  created_at: string
  updated_at: string
}

/** Row type for the `analysis_results` table */
export interface AnalysisResultRow {
  id: string
  survey_id: string
  parcel_id: string
  organization_id: string
  module: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  /** Structured result data as JSONB */
  result_data: Record<string, unknown>
  confidence_score: number | null
  processing_time_ms: number | null
  model_version: string | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** Row type for the `companion_sessions` table */
export interface CompanionSessionRow {
  id: string
  user_id: string
  organization_id: string
  title: string | null
  context_parcel_id: string | null
  context_survey_id: string | null
  model: string
  total_tokens_used: number
  created_at: string
  updated_at: string
}

/** Row type for the `companion_messages` table */
export interface CompanionMessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Tool calls and structured outputs as JSONB */
  metadata: Record<string, unknown>
  tokens_used: number
  created_at: string
}

/** Row type for the `pilot_profiles` table */
export interface PilotProfileRow {
  id: string
  user_id: string
  organization_id: string | null
  license_number: string | null
  license_expiry: string | null
  drone_models: string[]
  certifications: string[]
  hourly_rate: number | null
  currency: string
  availability_status: 'available' | 'busy' | 'offline'
  /** GeoJSON Point geometry of pilot's base location */
  base_location: string | null
  operating_radius_km: number | null
  rating: number | null
  total_flights: number
  created_at: string
  updated_at: string
}

/** Row type for the `satellite_observations` table */
export interface SatelliteObservationRow {
  id: string
  parcel_id: string
  organization_id: string
  source: 'sentinel-2' | 'landsat-9' | 'planet'
  /** GeoJSON Polygon of the observation footprint */
  footprint: string
  acquisition_date: string
  cloud_cover_percent: number | null
  resolution_meters: number
  bands_available: string[]
  /** NDVI and other index data stored as JSONB */
  index_data: Record<string, unknown>
  storage_path: string | null
  processing_level: string | null
  created_at: string
  updated_at: string
}

/** Row type for the `alerts` table */
export interface AlertsRow {
  id: string
  user_id: string
  organization_id: string | null
  category: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metadata: Record<string, unknown>
  parcel_id: string | null
  parcel_name: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}

/** Row type for the `parcel_shares` table */
export interface ParcelShareRow {
  id: string
  parcel_id: string
  user_id: string | null
  invited_email: string
  role: 'viewer' | 'commenter' | 'editor' | 'admin'
  status: 'pending' | 'accepted' | 'rejected'
  invited_by: string
  share_token: string | null
  password_hash: string | null
  expires_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

/** Aggregate database types for Supabase-style generic usage */
export interface Database {
  public: {
    Tables: {
      organizations: { Row: OrganizationRow }
      profiles: { Row: ProfileRow }
      parcels: { Row: ParcelRow }
      surveys: { Row: SurveyRow }
      survey_uploads: { Row: SurveyUploadRow }
      analysis_results: { Row: AnalysisResultRow }
      companion_sessions: { Row: CompanionSessionRow }
      companion_messages: { Row: CompanionMessageRow }
      pilot_profiles: { Row: PilotProfileRow }
      satellite_observations: { Row: SatelliteObservationRow }
      alerts: { Row: AlertsRow }
      parcel_shares: { Row: ParcelShareRow }
    }
  }
}
