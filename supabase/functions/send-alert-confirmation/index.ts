/**
 * send-alert-confirmation — BeetleSense Alert Activation Email
 *
 * Sent once when a user first activates beetle/forest alerts for a parcel.
 * Confirms which alert types are now active so the user knows what to expect.
 *
 * POST /functions/v1/send-alert-confirmation
 * Body: { email, parcelName, alertTypes }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // Verify service-role key for server-to-server calls
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let email: string
  let parcelName: string
  let alertTypes: string[]

  try {
    const body = await req.json()
    email = body.email
    parcelName = body.parcelName
    alertTypes = body.alertTypes
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  if (!email || !parcelName || !Array.isArray(alertTypes) || alertTypes.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: email, parcelName, alertTypes' }),
      { status: 400 },
    )
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), { status: 500 })
  }

  const checklistItems = alertTypes
    .map((a) => `
      <tr>
        <td style="padding:6px 0;vertical-align:top;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:20px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:16px;height:16px;background:#1B5E20;border-radius:50%;text-align:center;line-height:16px;font-size:10px;color:#fff;font-weight:bold;">✓</span>
              </td>
              <td style="color:#1A1A1A;font-size:14px;padding-left:8px;">${a}</td>
            </tr>
          </table>
        </td>
      </tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerts activated — BeetleSense</title>
</head>
<body style="margin:0;padding:0;background:#F5F7F4;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background:#1B5E20;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:-0.3px;">BeetleSense</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Forest Intelligence Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:40px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">

              <!-- Status badge -->
              <div style="display:inline-block;background:#E8F5E9;border:1px solid #A5D6A7;border-radius:20px;padding:4px 12px;margin-bottom:24px;">
                <span style="color:#1B5E20;font-size:12px;font-weight:600;">Alerts active</span>
              </div>

              <h2 style="margin:0 0 12px;color:#1A1A1A;font-size:20px;font-weight:600;">
                Your forest is now being monitored
              </h2>
              <p style="margin:0 0 24px;color:#4A4A4A;font-size:14px;line-height:1.6;">
                We'll notify you when we detect changes to <strong style="color:#1B5E20;">${parcelName}</strong>. The following alert types are now active:
              </p>

              <!-- Checklist -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:28px;">
                <tr><td style="padding:0 16px 0;">
                  <table cellpadding="0" cellspacing="0" style="width:100%;">
                    ${checklistItems}
                  </table>
                </td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#1B5E20;border-radius:6px;">
                    <a href="https://app.beetlesense.ai/owner/dashboard"
                       style="display:inline-block;padding:12px 28px;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;">
                      View your forest →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.5;">
                To manage notifications, visit <strong>Settings → Notifications</strong> at any time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F5F7F4;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#9CA3AF;font-size:11px;">
                BeetleSense.ai — Forest Intelligence Platform
              </p>
              <p style="margin:0;color:#9CA3AF;font-size:11px;">
                <a href="https://app.beetlesense.ai/privacy" style="color:#1B5E20;text-decoration:none;">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
                GDPR: To manage notifications, visit Settings → Notifications
                &nbsp;&bull;&nbsp;
                <a href="https://app.beetlesense.ai/unsubscribe" style="color:#1B5E20;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BeetleSense <alerts@beetlesense.ai>',
        to: email,
        subject: `✅ Alerts activated for ${parcelName}`,
        html,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error(`Resend error (${res.status}):`, detail)
      return new Response(JSON.stringify({ error: 'Email delivery failed' }), { status: 502 })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    console.error('send-alert-confirmation error:', e)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
