/**
 * Alert types, categories, and template definitions for BeetleSense proactive alerts.
 * Used by both the alert generation worker and the frontend notification center.
 */

// ─── Alert Category Enum ───

export enum AlertCategory {
  BEETLE_SEASON = 'BEETLE_SEASON',
  STORM_WARNING = 'STORM_WARNING',
  NDVI_DROP = 'NDVI_DROP',
  HARVEST_WINDOW = 'HARVEST_WINDOW',
  FROST_RISK = 'FROST_RISK',
  DROUGHT_STRESS = 'DROUGHT_STRESS',
  REGULATORY_DEADLINE = 'REGULATORY_DEADLINE',
}

// ─── Severity ───

export type AlertSeverity = 'info' | 'warning' | 'critical'

// ─── Alert Metadata per Category ───

export interface AlertCategoryMeta {
  severity: AlertSeverity
  /** Lucide icon name */
  icon: string
  /** CSS color variable or hex */
  color: string
  /** i18n template key for title */
  titleKey: string
  /** i18n template key for message body (supports interpolation) */
  templateKey: string
}

export const ALERT_CATEGORY_META: Record<AlertCategory, AlertCategoryMeta> = {
  [AlertCategory.BEETLE_SEASON]: {
    severity: 'critical',
    icon: 'Bug',
    color: 'var(--red, #ef4444)',
    titleKey: 'alerts.types.beetleSeason.title',
    templateKey: 'alerts.types.beetleSeason.template',
  },
  [AlertCategory.STORM_WARNING]: {
    severity: 'warning',
    icon: 'CloudLightning',
    color: 'var(--amber, #f59e0b)',
    titleKey: 'alerts.types.stormWarning.title',
    templateKey: 'alerts.types.stormWarning.template',
  },
  [AlertCategory.NDVI_DROP]: {
    severity: 'warning',
    icon: 'TrendingDown',
    color: 'var(--amber, #f59e0b)',
    titleKey: 'alerts.types.ndviDrop.title',
    templateKey: 'alerts.types.ndviDrop.template',
  },
  [AlertCategory.HARVEST_WINDOW]: {
    severity: 'info',
    icon: 'TreePine',
    color: 'var(--green, #4ade80)',
    titleKey: 'alerts.types.harvestWindow.title',
    templateKey: 'alerts.types.harvestWindow.template',
  },
  [AlertCategory.FROST_RISK]: {
    severity: 'warning',
    icon: 'Snowflake',
    color: '#60a5fa',
    titleKey: 'alerts.types.frostRisk.title',
    templateKey: 'alerts.types.frostRisk.template',
  },
  [AlertCategory.DROUGHT_STRESS]: {
    severity: 'warning',
    icon: 'Droplets',
    color: '#fb923c',
    titleKey: 'alerts.types.droughtStress.title',
    templateKey: 'alerts.types.droughtStress.template',
  },
  [AlertCategory.REGULATORY_DEADLINE]: {
    severity: 'info',
    icon: 'FileText',
    color: '#a78bfa',
    titleKey: 'alerts.types.regulatoryDeadline.title',
    templateKey: 'alerts.types.regulatoryDeadline.template',
  },
}

// ─── Alert Row (database shape) ───

export interface AlertRow {
  id: string
  user_id: string
  organization_id: string | null
  category: AlertCategory
  severity: AlertSeverity
  title: string
  message: string
  /** JSON metadata for template interpolation & context */
  metadata: Record<string, unknown>
  parcel_id: string | null
  parcel_name: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}

// ─── Severity ordering for sort/filter ───

export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

// ─── All categories as ordered array ───

export const ALL_ALERT_CATEGORIES = Object.values(AlertCategory)
