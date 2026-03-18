import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import {
  NOTIFICATION_DIGEST_QUEUE,
  type NotificationDigestJobData,
} from '../queues/notificationDigest.queue.js'

// ─── Types ───

interface NotificationRow {
  id: string
  category: string
  title: string
  message: string
  action_url: string | null
  created_at: string
}

interface UserDigestInfo {
  id: string
  email: string
  full_name: string | null
  preferred_language: string
}

// ─── Category display names ───

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: {
    alerts: 'Alerts',
    permits: 'Permits',
    surveys: 'Surveys',
    community: 'Community',
    system: 'System',
  },
  sv: {
    alerts: 'Varningar',
    permits: 'Tillstånd',
    surveys: 'Inventeringar',
    community: 'Gemenskap',
    system: 'System',
  },
}

// ─── Category colors for email ───

const CATEGORY_COLORS: Record<string, string> = {
  alerts: '#ef4444',
  permits: '#a78bfa',
  surveys: '#4ade80',
  community: '#60a5fa',
  system: '#f59e0b',
}

/**
 * Notification Digest Worker
 *
 * Aggregates unread notifications per user and sends an HTML email digest.
 * Runs daily at 07:00 UTC and weekly on Mondays at 08:00 UTC.
 *
 * Respects user email_frequency preference:
 * - Users with "daily" get the daily digest
 * - Users with "weekly" get the weekly digest
 * - Users with "immediate" skip digests (they already get individual emails)
 */
export function createNotificationDigestWorker(): Worker<NotificationDigestJobData> {
  const worker = new Worker<NotificationDigestJobData>(
    NOTIFICATION_DIGEST_QUEUE,
    async (job: Job<NotificationDigestJobData>) => {
      const log = createJobLogger(job.id!, NOTIFICATION_DIGEST_QUEUE)
      const { digestType, userId, force } = job.data

      log.info({ digestType, userId, force }, 'Starting notification digest job')
      await job.updateProgress(5)

      const supabase = getSupabaseAdmin()

      // Determine the time window for this digest
      const now = new Date()
      let sinceDate: Date
      if (digestType === 'daily') {
        sinceDate = new Date(now.getTime() - 24 * 3600_000) // Last 24 hours
      } else {
        sinceDate = new Date(now.getTime() - 7 * 24 * 3600_000) // Last 7 days
      }

      await job.updateProgress(10)

      // Fetch users who have this digest frequency enabled
      let usersQuery = supabase
        .from('profiles')
        .select('id, email, full_name, preferred_language')

      if (userId) {
        usersQuery = usersQuery.eq('id', userId)
      }

      const { data: users, error: usersError } = await usersQuery

      if (usersError) {
        log.error({ err: usersError }, 'Failed to fetch users')
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      if (!users || users.length === 0) {
        log.info('No users found')
        await job.updateProgress(100)
        return { skipped: true, reason: 'no_users' }
      }

      await job.updateProgress(20)

      let emailsSent = 0
      let usersProcessed = 0

      for (const user of users as UserDigestInfo[]) {
        // Check user preferences
        const { data: prefData } = await supabase
          .from('user_preferences')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .single()

        const prefs = prefData?.notification_preferences as {
          email_frequency?: string
          categories?: Record<string, { email?: boolean }>
        } | null

        const userFrequency = prefs?.email_frequency ?? 'immediate'

        // Skip users who don't match this digest type
        if (!force && userFrequency !== digestType) {
          continue
        }

        // Fetch unread notifications in the time window
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('id, category, title, message, action_url, created_at')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .gte('created_at', sinceDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(50)

        if (notifError) {
          log.error(
            { err: notifError, userId: user.id },
            'Failed to fetch notifications',
          )
          continue
        }

        if (!notifications || notifications.length === 0) {
          continue
        }

        // Filter by categories that have email enabled
        const categoryPrefs = prefs?.categories ?? {}
        const filteredNotifications = notifications.filter((n: NotificationRow) => {
          const catPref = categoryPrefs[n.category]
          return catPref?.email !== false // Default to true if not set
        })

        if (filteredNotifications.length === 0) continue

        // Generate HTML email
        const lang = user.preferred_language === 'sv' ? 'sv' : 'en'
        const html = generateDigestHtml(
          user,
          filteredNotifications as NotificationRow[],
          digestType,
          lang,
        )

        const subject =
          lang === 'sv'
            ? `BeetleSense: ${digestType === 'daily' ? 'Daglig' : 'Veckovis'} sammanfattning — ${filteredNotifications.length} aviseringar`
            : `BeetleSense: ${digestType === 'daily' ? 'Daily' : 'Weekly'} digest — ${filteredNotifications.length} notifications`

        // Queue email for sending
        const { error: emailError } = await supabase.from('email_queue').insert({
          user_id: user.id,
          template: 'notification_digest',
          subject,
          data: {
            html,
            to: user.email,
            digest_type: digestType,
            notification_count: filteredNotifications.length,
          },
          status: 'pending',
          created_at: now.toISOString(),
        })

        if (emailError) {
          log.error(
            { err: emailError, userId: user.id },
            'Failed to queue digest email',
          )
        } else {
          emailsSent++
        }

        usersProcessed++
      }

      await job.updateProgress(100)

      const summary = {
        digestType,
        usersProcessed,
        emailsSent,
        totalUsers: users.length,
      }

      log.info(summary, 'Notification digest job completed')
      return summary
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, NOTIFICATION_DIGEST_QUEUE)
    log.info('Notification digest job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, NOTIFICATION_DIGEST_QUEUE)
    log.error({ err }, 'Notification digest job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', NOTIFICATION_DIGEST_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

// ─── HTML Email Generation ───

function generateDigestHtml(
  user: UserDigestInfo,
  notifications: NotificationRow[],
  digestType: 'daily' | 'weekly',
  lang: 'en' | 'sv',
): string {
  const labels = CATEGORY_LABELS[lang] ?? CATEGORY_LABELS['en']!
  const appUrl = 'https://app.beetlesense.ai'

  const greeting =
    lang === 'sv'
      ? `Hej ${user.full_name ?? 'där'}`
      : `Hi ${user.full_name ?? 'there'}`

  const intro =
    lang === 'sv'
      ? `Här är din ${digestType === 'daily' ? 'dagliga' : 'veckovisa'} sammanfattning med ${notifications.length} olästa aviseringar.`
      : `Here's your ${digestType} digest with ${notifications.length} unread notifications.`

  // Group by category
  const grouped = new Map<string, NotificationRow[]>()
  for (const n of notifications) {
    const existing = grouped.get(n.category) ?? []
    existing.push(n)
    grouped.set(n.category, existing)
  }

  let categoryBlocks = ''
  for (const [category, items] of grouped) {
    const color = CATEGORY_COLORS[category] ?? '#4ade80'
    const label = labels?.[category] ?? category

    categoryBlocks += `
      <tr>
        <td style="padding: 16px 0 8px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width: 4px; background: ${color}; border-radius: 2px;"></td>
              <td style="padding-left: 12px;">
                <strong style="color: #e0e0e0; font-size: 14px;">${label}</strong>
                <span style="color: #888; font-size: 12px; margin-left: 8px;">(${items.length})</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `

    for (const item of items) {
      const date = new Date(item.created_at).toLocaleDateString(
        lang === 'sv' ? 'sv-SE' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      )
      const actionLink = item.action_url
        ? `${appUrl}${item.action_url}`
        : `${appUrl}/owner/alerts`

      categoryBlocks += `
        <tr>
          <td style="padding: 6px 0 6px 16px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #0a1a0c; border-radius: 8px; padding: 12px;">
              <tr>
                <td>
                  <a href="${actionLink}" style="color: #e0e0e0; font-size: 13px; font-weight: 600; text-decoration: none;">${item.title}</a>
                  <p style="color: #999; font-size: 12px; margin: 4px 0 0 0; line-height: 1.4;">${item.message}</p>
                  <p style="color: #666; font-size: 11px; margin: 6px 0 0 0;">${date}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    }
  }

  const viewAllText = lang === 'sv' ? 'Visa alla aviseringar' : 'View all notifications'
  const unsubText =
    lang === 'sv'
      ? 'Du kan ändra dina aviseringsinställningar'
      : 'You can change your notification settings'
  const settingsText = lang === 'sv' ? 'här' : 'here'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #030d05; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #030d05;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background: #071a09; border-radius: 12px; border: 1px solid #1a3a1c;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 24px 16px 24px; border-bottom: 1px solid #1a3a1c;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <strong style="color: #4ade80; font-size: 16px;">BeetleSense.ai</strong>
                  </td>
                </tr>
              </table>
              <p style="color: #e0e0e0; font-size: 15px; margin: 12px 0 4px 0;">${greeting},</p>
              <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">${intro}</p>
            </td>
          </tr>

          <!-- Notifications -->
          <tr>
            <td style="padding: 8px 24px 16px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${categoryBlocks}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 8px 24px 24px 24px;">
              <a href="${appUrl}/owner/alerts" style="display: inline-block; padding: 10px 24px; background: #4ade80; color: #030d05; font-size: 13px; font-weight: 600; border-radius: 8px; text-decoration: none;">${viewAllText}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border-top: 1px solid #1a3a1c;">
              <p style="color: #666; font-size: 11px; margin: 0; text-align: center;">
                ${unsubText} <a href="${appUrl}/owner/notification-settings" style="color: #4ade80; text-decoration: none;">${settingsText}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
