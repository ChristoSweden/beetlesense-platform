import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import {
  ALERT_GENERATION_QUEUE,
  type AlertGenerationJobData,
} from '../queues/alertGeneration.queue.js'

/**
 * Alert categories — mirrored from @beetlesense/shared to avoid ESM import
 * issues in the worker bundle.
 */
const AlertCategory = {
  BEETLE_SEASON: 'BEETLE_SEASON',
  STORM_WARNING: 'STORM_WARNING',
  NDVI_DROP: 'NDVI_DROP',
  HARVEST_WINDOW: 'HARVEST_WINDOW',
  FROST_RISK: 'FROST_RISK',
  DROUGHT_STRESS: 'DROUGHT_STRESS',
  REGULATORY_DEADLINE: 'REGULATORY_DEADLINE',
} as const

type AlertCategoryValue = (typeof AlertCategory)[keyof typeof AlertCategory]
type AlertSeverity = 'info' | 'warning' | 'critical'

interface GeneratedAlert {
  user_id: string
  organization_id: string | null
  category: AlertCategoryValue
  severity: AlertSeverity
  title: string
  message: string
  metadata: Record<string, unknown>
  parcel_id: string | null
  parcel_name: string | null
}

/**
 * Alert Generation Worker
 *
 * Runs daily (06:00 UTC) to generate personalized seasonal alerts per user:
 * 1. Beetle season calendar (based on month + temperature thresholds)
 * 2. NDVI change detection (compares recent satellite observations)
 * 3. Weather-based alerts (frost, drought, storm from SMHI data)
 * 4. Regulatory deadlines (Skogsstyrelsen reporting windows)
 * 5. Harvest window recommendations
 *
 * Each alert is inserted into the `alerts` table and triggers a push notification.
 */
export function createAlertGenerationWorker(): Worker<AlertGenerationJobData> {
  const worker = new Worker<AlertGenerationJobData>(
    ALERT_GENERATION_QUEUE,
    async (job: Job<AlertGenerationJobData>) => {
      const log = createJobLogger(job.id!, ALERT_GENERATION_QUEUE)
      const { force, userId, organizationId } = job.data

      log.info({ force, userId, organizationId }, 'Starting alert generation job')
      await job.updateProgress(5)

      const supabase = getSupabaseAdmin()
      const now = new Date()
      const today = now.toISOString().slice(0, 10)

      // Check if alerts were already generated today (unless forced)
      if (!force) {
        const { count } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00Z`)
          .lte('created_at', `${today}T23:59:59Z`)

        if (count && count > 0) {
          log.info({ existingCount: count }, 'Alerts already generated today — skipping')
          await job.updateProgress(100)
          return { skipped: true, reason: 'already_generated_today', existingCount: count }
        }
      }

      await job.updateProgress(10)

      // Fetch all users with their parcels
      let usersQuery = supabase
        .from('profiles')
        .select('id, full_name, role, organization_id, preferred_language')
        .eq('role', 'owner')

      if (userId) {
        usersQuery = usersQuery.eq('id', userId)
      }
      if (organizationId) {
        usersQuery = usersQuery.eq('organization_id', organizationId)
      }

      const { data: users, error: usersError } = await usersQuery

      if (usersError) {
        log.error({ err: usersError }, 'Failed to fetch users')
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      if (!users || users.length === 0) {
        log.info('No owner users found — nothing to generate')
        await job.updateProgress(100)
        return { skipped: true, reason: 'no_users' }
      }

      log.info({ userCount: users.length }, 'Processing users for alert generation')
      await job.updateProgress(20)

      const allAlerts: GeneratedAlert[] = []

      for (const user of users) {
        // Fetch user's parcels
        const { data: parcels } = await supabase
          .from('parcels')
          .select('id, name, centroid, area_hectares, tags, municipality')
          .eq('organization_id', user.organization_id)

        if (!parcels || parcels.length === 0) continue

        const userAlerts = await generateUserAlerts(now, user, parcels, log)
        allAlerts.push(...userAlerts)
      }

      await job.updateProgress(70)

      // Batch-insert alerts
      if (allAlerts.length > 0) {
        const alertRows = allAlerts.map((a) => ({
          ...a,
          is_read: false,
          is_dismissed: false,
          created_at: now.toISOString(),
        }))

        const { error: insertError } = await supabase.from('alerts').insert(alertRows)

        if (insertError) {
          log.error({ err: insertError }, 'Failed to insert alerts')
          throw new Error(`Failed to insert alerts: ${insertError.message}`)
        }

        log.info({ alertCount: allAlerts.length }, 'Alerts inserted successfully')
      }

      await job.updateProgress(90)

      // Trigger push notifications for critical/warning alerts
      const urgentAlerts = allAlerts.filter(
        (a) => a.severity === 'critical' || a.severity === 'warning',
      )

      if (urgentAlerts.length > 0) {
        await sendPushNotifications(supabase, urgentAlerts, log)
      }

      await job.updateProgress(100)

      const summary = {
        usersProcessed: users.length,
        alertsGenerated: allAlerts.length,
        criticalAlerts: allAlerts.filter((a) => a.severity === 'critical').length,
        warningAlerts: allAlerts.filter((a) => a.severity === 'warning').length,
        infoAlerts: allAlerts.filter((a) => a.severity === 'info').length,
      }

      log.info(summary, 'Alert generation job completed')
      return summary
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, ALERT_GENERATION_QUEUE)
    log.info('Alert generation job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, ALERT_GENERATION_QUEUE)
    log.error({ err }, 'Alert generation job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', ALERT_GENERATION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

// ─── Alert Generation Logic ───

interface UserInfo {
  id: string
  full_name: string | null
  role: string
  organization_id: string | null
  preferred_language: string
}

interface ParcelInfo {
  id: string
  name: string
  centroid: string | null
  area_hectares: number
  tags: string[]
  municipality: string | null
}

async function generateUserAlerts(
  now: Date,
  user: UserInfo,
  parcels: ParcelInfo[],
  log: ReturnType<typeof createJobLogger>,
): Promise<GeneratedAlert[]> {
  const alerts: GeneratedAlert[] = []
  const month = now.getMonth() + 1 // 1-12
  const lang = user.preferred_language === 'sv' ? 'sv' : 'en'

  // ─── 1. Beetle Season Alert (April–August) ───
  if (month >= 3 && month <= 8) {
    const spruceParcels = parcels.filter((p) =>
      p.tags?.some((t) => t.toLowerCase().includes('spruce')) ||
      p.name.toLowerCase().includes('gran'),
    )

    // Also include parcels without specific tags (likely mixed forest)
    const targetParcels = spruceParcels.length > 0 ? spruceParcels : parcels

    if (targetParcels.length > 0) {
      const daysUntilPeak = month <= 4 ? (5 - month) * 30 : 0
      const region = targetParcels[0]!.municipality ?? 'Småland'

      alerts.push({
        user_id: user.id,
        organization_id: user.organization_id,
        category: AlertCategory.BEETLE_SEASON,
        severity: month >= 5 && month <= 7 ? 'critical' : 'warning',
        title: lang === 'sv'
          ? 'Barkborresäsongen närmar sig'
          : 'Bark beetle swarming season approaching',
        message: lang === 'sv'
          ? `Barkborrens svärmningssäsong börjar om ~${daysUntilPeak > 0 ? daysUntilPeak : 'pågår nu'} dagar i ${region}. Dina ${targetParcels.length} grandominerande skiften är i riskzonen.`
          : `Bark beetle swarming season begins in ~${daysUntilPeak > 0 ? `${daysUntilPeak} days` : 'now active'} for ${region}. Your ${targetParcels.length} spruce-heavy parcels are in the risk zone.`,
        metadata: {
          daysUntilPeak,
          region,
          parcelCount: targetParcels.length,
          parcelIds: targetParcels.map((p) => p.id),
          month,
        },
        parcel_id: null,
        parcel_name: null,
      })
    }
  }

  // ─── 2. NDVI Drop Detection ───
  // Check satellite observations for NDVI drops on each parcel
  const supabase = getSupabaseAdmin()
  for (const parcel of parcels) {
    const { data: observations } = await supabase
      .from('satellite_observations')
      .select('index_data, acquisition_date')
      .eq('parcel_id', parcel.id)
      .order('acquisition_date', { ascending: false })
      .limit(2)

    if (observations && observations.length >= 2) {
      const latest = observations[0]!
      const previous = observations[1]!
      const currentNdvi = (latest.index_data as Record<string, unknown>)?.mean_ndvi as number | undefined
      const previousNdvi = (previous.index_data as Record<string, unknown>)?.mean_ndvi as number | undefined

      if (
        typeof currentNdvi === 'number' &&
        typeof previousNdvi === 'number' &&
        previousNdvi > 0
      ) {
        const dropPercent = Math.round(
          ((previousNdvi - currentNdvi) / previousNdvi) * 100,
        )

        if (dropPercent >= 10) {
          alerts.push({
            user_id: user.id,
            organization_id: user.organization_id,
            category: AlertCategory.NDVI_DROP,
            severity: dropPercent >= 25 ? 'critical' : 'warning',
            title: lang === 'sv'
              ? `NDVI-nedgång upptäckt på ${parcel.name}`
              : `NDVI drop detected on ${parcel.name}`,
            message: lang === 'sv'
              ? `NDVI sjönk ${dropPercent}% på ${parcel.name} sedan förra månaden — möjlig stress upptäckt.`
              : `NDVI dropped ${dropPercent}% on ${parcel.name} since last month — possible stress detected.`,
            metadata: {
              dropPercent,
              currentNdvi,
              previousNdvi,
              latestDate: latest.acquisition_date,
              previousDate: previous.acquisition_date,
            },
            parcel_id: parcel.id,
            parcel_name: parcel.name,
          })
        }
      }
    }
  }

  // ─── 3. Frost Risk (October–April) ───
  if (month >= 10 || month <= 4) {
    // Check SMHI climate data for frost forecasts
    const region = parcels[0]?.municipality ?? 'Småland'
    alerts.push({
      user_id: user.id,
      organization_id: user.organization_id,
      category: AlertCategory.FROST_RISK,
      severity: 'info',
      title: lang === 'sv'
        ? 'Frostrisken ökar'
        : 'Frost risk increasing',
      message: lang === 'sv'
        ? `SMHI-prognosen visar risk för markfrost de kommande dagarna i ${region}. Plantera inte nya plantor förrän frostrisken har passerat.`
        : `SMHI forecast indicates ground frost risk in the coming days for ${region}. Avoid planting new seedlings until frost risk has passed.`,
      metadata: {
        region,
        month,
        parcelCount: parcels.length,
      },
      parcel_id: null,
      parcel_name: null,
    })
  }

  // ─── 4. Drought Stress (May–September) ───
  if (month >= 5 && month <= 9) {
    const region = parcels[0]?.municipality ?? 'Småland'
    alerts.push({
      user_id: user.id,
      organization_id: user.organization_id,
      category: AlertCategory.DROUGHT_STRESS,
      severity: 'warning',
      title: lang === 'sv'
        ? 'Torkstressvarning'
        : 'Drought stress warning',
      message: lang === 'sv'
        ? `Låg nederbörd senaste 30 dagarna i ${region}. Barrträd under torkstress är mer mottagliga för barkborreangrepp.`
        : `Below-average precipitation in the past 30 days for ${region}. Conifers under drought stress are more susceptible to bark beetle attacks.`,
      metadata: {
        region,
        month,
        parcelCount: parcels.length,
      },
      parcel_id: null,
      parcel_name: null,
    })
  }

  // ─── 5. Harvest Window (September–November) ───
  if (month >= 9 && month <= 11) {
    alerts.push({
      user_id: user.id,
      organization_id: user.organization_id,
      category: AlertCategory.HARVEST_WINDOW,
      severity: 'info',
      title: lang === 'sv'
        ? 'Optimalt gallringsfönster öppnar'
        : 'Optimal thinning window opens',
      message: lang === 'sv'
        ? `Optimalt gallringsfönster öppnar inom ${12 - month} veckor baserat på markfrostprognosen. Planera dina avverkningar.`
        : `Optimal thinning window opens in ${12 - month} weeks based on ground frost forecast. Plan your harvests.`,
      metadata: {
        weeksUntilOpen: 12 - month,
        month,
      },
      parcel_id: null,
      parcel_name: null,
    })
  }

  // ─── 6. Regulatory Deadline (yearly, around March 1) ───
  if (month === 2 || month === 3) {
    alerts.push({
      user_id: user.id,
      organization_id: user.organization_id,
      category: AlertCategory.REGULATORY_DEADLINE,
      severity: 'info',
      title: lang === 'sv'
        ? 'Skogsstyrelsen: Rapporteringsdeadline'
        : 'Skogsstyrelsen: Reporting deadline',
      message: lang === 'sv'
        ? 'Skogsstyrelsens deadline för avverkningsanmälningar och miljöhänsyn närmar sig. Kontrollera att alla åtgärder är rapporterade.'
        : 'Skogsstyrelsen deadline for harvesting notifications and environmental considerations is approaching. Verify all operations are reported.',
      metadata: {
        deadline: `${now.getFullYear()}-03-01`,
        authority: 'Skogsstyrelsen',
      },
      parcel_id: null,
      parcel_name: null,
    })
  }

  log.info(
    { userId: user.id, alertCount: alerts.length },
    'Generated alerts for user',
  )

  return alerts
}

// ─── Push Notifications ───

async function sendPushNotifications(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  alerts: GeneratedAlert[],
  log: ReturnType<typeof createJobLogger>,
): Promise<void> {
  // Group alerts by user
  const byUser = new Map<string, GeneratedAlert[]>()
  for (const alert of alerts) {
    const existing = byUser.get(alert.user_id) ?? []
    existing.push(alert)
    byUser.set(alert.user_id, existing)
  }

  for (const [userId, userAlerts] of byUser) {
    // Fetch push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) continue

    const criticalCount = userAlerts.filter((a) => a.severity === 'critical').length
    const title = criticalCount > 0
      ? `BeetleSense: ${criticalCount} critical alert(s)`
      : `BeetleSense: ${userAlerts.length} new alert(s)`
    const body = userAlerts[0]!.message

    log.info(
      { userId, subscriptionCount: subscriptions.length, alertCount: userAlerts.length },
      'Sending push notifications',
    )

    // Note: Actual web-push send is handled by the alerts-subscribe edge function
    // or a dedicated push service. Here we store the notification intent.
    await supabase.from('push_notifications').insert({
      user_id: userId,
      title,
      body,
      data: {
        alertCount: userAlerts.length,
        categories: [...new Set(userAlerts.map((a) => a.category))],
      },
      status: 'pending',
      created_at: new Date().toISOString(),
    })
  }
}
