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

  const alertListItems = alertTypes
    .map((a) => `<li style="margin: 4px 0; color: #374151;">${a}</li>`)
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Alerts activated</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F7F4; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 40px; border: 1px solid #E5E7EB;">
        <div style="margin-bottom: 24px;">
          <span style="display: inline-block; width: 40px; height: 40px; background: #E8F5E9; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">🌲</span>
        </div>
        <h2 style="color: #1B5E20; font-size: 20px; margin: 0 0 8px 0;">Your beetle alerts are active</h2>
        <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px 0;">
          You'll be notified when we detect changes to <strong style="color: #111827;">${parcelName}</strong>.
        </p>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #374151; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">Active alert types:</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px;">
            ${alertListItems}
          </ul>
        </div>
        <p style="color: #6B7280; font-size: 13px; margin: 0 0 20px 0;">
          You can manage your alert preferences at any time in Settings.
        </p>
        <a href="https://app.beetlesense.ai/owner/notifications"
           style="display: inline-block; background: #1B5E20; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;">
          Manage Notifications →
        </a>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;">
        <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
          BeetleSense.ai — Forest Intelligence Platform<br>
          <a href="https://app.beetlesense.ai/unsubscribe" style="color: #9CA3AF;">Unsubscribe from alert emails</a>
        </p>
      </div>
    </body>
    </html>
  `

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
