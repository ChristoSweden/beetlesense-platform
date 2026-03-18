/**
 * Branded email templates for BeetleSense.ai
 *
 * Generates HTML emails with consistent branding: dark green theme,
 * beetle logo, proper footer with unsubscribe.
 */

const BRAND = {
  name: 'BeetleSense.ai',
  color: '#4ade80',
  bgDark: '#030d05',
  bgCard: '#0a1f0d',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  borderColor: '#1a3a1f',
  url: 'https://beetlesense.ai',
};

const CATEGORY_COLORS: Record<string, string> = {
  alerts: '#ef4444',
  permits: '#3b82f6',
  surveys: '#8b5cf6',
  community: '#06b6d4',
  system: '#6b7280',
};

/**
 * Inline SVG beetle icon for email (base64 encoded for max compatibility)
 */
const BEETLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <rect width="40" height="40" rx="8" fill="${BRAND.bgDark}"/>
  <g transform="translate(20,20) scale(0.065)">
    <ellipse cx="0" cy="10" rx="72" ry="95" fill="#1a5c2e" stroke="#22c55e" stroke-width="4"/>
    <line x1="0" y1="-85" x2="0" y2="105" stroke="#030d05" stroke-width="3"/>
    <circle cx="0" cy="-100" r="35" fill="#1a5c2e" stroke="#22c55e" stroke-width="3"/>
    <circle cx="-14" cy="-108" r="6" fill="#22c55e"/>
    <circle cx="14" cy="-108" r="6" fill="#22c55e"/>
    <path d="M-12,-130 Q-30,-165 -50,-170" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
    <path d="M12,-130 Q30,-165 50,-170" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;

/**
 * Render a branded notification email.
 */
export function renderNotificationEmail(options: {
  title: string;
  body: string;
  category: string;
  actionUrl?: string;
  actionLabel?: string;
  userName?: string;
}): string {
  const { title, body, category, actionUrl, actionLabel, userName } = options;
  const categoryColor = CATEGORY_COLORS[category] ?? BRAND.color;
  const greeting = userName ? `Hej ${userName},` : 'Hej,';

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgDark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgDark};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:24px 0 16px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    ${BEETLE_ICON}
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:${BRAND.color};font-size:20px;font-weight:700;letter-spacing:-0.5px;">
                      ${BRAND.name}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:12px;overflow:hidden;">

                <!-- Category badge + title -->
                <tr>
                  <td style="padding:28px 28px 0;">
                    <span style="display:inline-block;background-color:${categoryColor}20;color:${categoryColor};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:4px;margin-bottom:12px;">
                      ${escapeHtml(category)}
                    </span>
                    <h1 style="color:${BRAND.textPrimary};font-size:22px;font-weight:600;margin:12px 0 0;line-height:1.3;">
                      ${escapeHtml(title)}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:16px 28px;">
                    <p style="color:${BRAND.textSecondary};font-size:15px;line-height:1.6;margin:0 0 8px;">
                      ${escapeHtml(greeting)}
                    </p>
                    <p style="color:${BRAND.textPrimary};font-size:15px;line-height:1.6;margin:0;">
                      ${escapeHtml(body)}
                    </p>
                  </td>
                </tr>

                ${actionUrl ? `
                <!-- CTA Button -->
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:${BRAND.color};border-radius:8px;">
                          <a href="${escapeHtml(actionUrl)}" target="_blank"
                            style="display:inline-block;padding:12px 28px;color:#030d05;font-size:14px;font-weight:600;text-decoration:none;">
                            ${escapeHtml(actionLabel ?? 'Visa i BeetleSense')} →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="color:${BRAND.textSecondary};font-size:12px;line-height:1.5;margin:0;">
                Du får detta mejl eftersom du har aviseringar aktiverade i
                <a href="${BRAND.url}" style="color:${BRAND.color};text-decoration:none;">BeetleSense.ai</a>.
              </p>
              <p style="color:${BRAND.textSecondary};font-size:12px;line-height:1.5;margin:8px 0 0;">
                <a href="${BRAND.url}/owner/notification-settings" style="color:${BRAND.textSecondary};text-decoration:underline;">
                  Ändra aviseringsinställningar
                </a>
                &nbsp;·&nbsp;
                <a href="${BRAND.url}/owner/settings" style="color:${BRAND.textSecondary};text-decoration:underline;">
                  Avsluta prenumeration
                </a>
              </p>
              <p style="color:#4b5563;font-size:11px;margin:16px 0 0;">
                © ${new Date().getFullYear()} BeetleSense.ai — AI-Powered Forest Intelligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render a digest email with multiple notifications.
 */
export function renderDigestEmail(options: {
  userName?: string;
  period: 'daily' | 'weekly';
  notifications: Array<{
    title: string;
    body: string;
    category: string;
    actionUrl?: string;
    createdAt: string;
  }>;
}): string {
  const { userName, period, notifications } = options;
  const greeting = userName ? `Hej ${userName},` : 'Hej,';
  const periodLabel = period === 'daily' ? 'Daglig' : 'Veckovis';

  const notificationRows = notifications.map((n) => {
    const categoryColor = CATEGORY_COLORS[n.category] ?? BRAND.color;
    const time = new Date(n.createdAt).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${BRAND.borderColor};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:6px;background-color:${categoryColor};border-radius:3px;" width="6"></td>
            <td style="padding-left:12px;">
              <p style="color:${BRAND.textPrimary};font-size:14px;font-weight:600;margin:0;line-height:1.3;">
                ${n.actionUrl ? `<a href="${escapeHtml(n.actionUrl)}" style="color:${BRAND.textPrimary};text-decoration:none;">${escapeHtml(n.title)}</a>` : escapeHtml(n.title)}
              </p>
              <p style="color:${BRAND.textSecondary};font-size:13px;margin:4px 0 0;line-height:1.4;">
                ${escapeHtml(n.body.slice(0, 120))}${n.body.length > 120 ? '…' : ''}
              </p>
              <p style="color:#6b7280;font-size:11px;margin:4px 0 0;">
                ${escapeHtml(time)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${periodLabel} sammanfattning — BeetleSense.ai</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgDark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgDark};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:24px 0 16px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">${BEETLE_ICON}</td>
                  <td style="vertical-align:middle;">
                    <span style="color:${BRAND.color};font-size:20px;font-weight:700;">${BRAND.name}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:12px;overflow:hidden;">

                <tr>
                  <td style="padding:28px 28px 16px;">
                    <p style="color:${BRAND.textSecondary};font-size:15px;margin:0 0 4px;">${escapeHtml(greeting)}</p>
                    <h1 style="color:${BRAND.textPrimary};font-size:20px;font-weight:600;margin:0;line-height:1.3;">
                      ${periodLabel} sammanfattning
                    </h1>
                    <p style="color:${BRAND.textSecondary};font-size:14px;margin:8px 0 0;">
                      ${notifications.length} ${notifications.length === 1 ? 'avisering' : 'aviseringar'} sedan senaste sammanfattningen.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${notificationRows}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:${BRAND.color};border-radius:8px;">
                          <a href="${BRAND.url}/owner/notifications" target="_blank"
                            style="display:inline-block;padding:12px 28px;color:#030d05;font-size:14px;font-weight:600;text-decoration:none;">
                            Visa alla aviseringar →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="color:${BRAND.textSecondary};font-size:12px;line-height:1.5;margin:0;">
                <a href="${BRAND.url}/owner/notification-settings" style="color:${BRAND.textSecondary};text-decoration:underline;">Ändra aviseringsinställningar</a>
                &nbsp;·&nbsp;
                <a href="${BRAND.url}/owner/settings" style="color:${BRAND.textSecondary};text-decoration:underline;">Avsluta prenumeration</a>
              </p>
              <p style="color:#4b5563;font-size:11px;margin:16px 0 0;">
                © ${new Date().getFullYear()} BeetleSense.ai — AI-Powered Forest Intelligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
