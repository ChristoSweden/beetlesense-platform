/**
 * k6-companion-chat.js — AI companion chat load test for BeetleSense.ai
 *
 * Simulates concurrent chat sessions with the AI companion:
 *   1. Authenticate
 *   2. Send initial chat message
 *   3. Measure time to first token (full response, since k6 has no native SSE)
 *   4. Send follow-up message
 *
 * Stages: ramp to 30 concurrent chats
 * Thresholds: time to first token < 3 s (p95)
 *
 * Usage:
 *   k6 run k6-companion-chat.js \
 *     -e SUPABASE_URL=http://localhost:54321 \
 *     -e SUPABASE_ANON_KEY=... \
 *     -e SUPABASE_SERVICE_ROLE_KEY=...
 */

import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import {
  login,
  authPost,
  errorRate,
  apiLatency,
  companionFirstToken,
  provisionTestUsers,
} from './k6-config.js';

// ── Custom metrics ──────────────────────────────────────────────────────────

const followupLatency = new Trend('companion_followup_latency', true);

// ── Test prompts (Swedish + English, varying complexity) ────────────────────

const CHAT_PROMPTS = [
  'Hur identifierar jag granbarkborre i mina tallar?',
  'What is the best time to harvest spruce in southern Sweden?',
  'Vilka tecken visar att min skog har stressade granar?',
  'How do I interpret NDVI changes in my satellite data?',
  'Kan du sammanfatta Skogsstyrelsens rekommendationer for barkborrebekampning?',
  'What preventive measures can I take against bark beetle outbreaks?',
  'Hur paverkar klimatforandringar barkborreangrepp i Smaland?',
  'Explain the relationship between drought stress and beetle susceptibility.',
];

const FOLLOWUP_PROMPTS = [
  'Can you give me more details on that?',
  'Kan du ge mer specifika rekommendationer for min fastighet?',
  'What tools or equipment do I need?',
  'Hur snabbt maste jag agera?',
  'Are there any government subsidies available for this?',
];

// ── Options ─────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    companion_chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 30 },   // ramp up
        { duration: '5m',  target: 30 },   // sustained load
        { duration: '1m',  target: 0 },    // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    companion_first_token:        ['p(95)<3000'],   // first token under 3 s
    companion_followup_latency:   ['p(95)<5000'],   // follow-ups under 5 s
    errors:                       ['rate<0.01'],
    http_req_failed:              ['rate<0.05'],     // AI endpoints may occasionally timeout
  },
};

// ── Setup ───────────────────────────────────────────────────────────────────

export function setup() {
  const vuIds = Array.from({ length: 30 }, (_, i) => i + 300);
  const created = provisionTestUsers(vuIds);
  return { userCount: created };
}

// ── Main VU function ────────────────────────────────────────────────────────

export default function () {
  // ---- Step 1: Authenticate ------------------------------------------------
  const token = group('01_authenticate', () => login(__VU + 300));

  if (!token) {
    sleep(2);
    return;
  }

  sleep(1);

  // ---- Step 2: Send initial chat message -----------------------------------
  let sessionId = null;

  group('02_initial_message', () => {
    const prompt = CHAT_PROMPTS[__ITER % CHAT_PROMPTS.length];
    const startTime = Date.now();

    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      {
        message: prompt,
        parcel_id: 'load-test-parcel',
        stream: false,   // k6 does not support SSE natively
      },
      'companion_initial',
    );

    const firstTokenMs = Date.now() - startTime;
    companionFirstToken.add(firstTokenMs);

    const ok = check(res, {
      'companion initial 2xx': (r) => r.status >= 200 && r.status < 300,
      'companion returns content': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (body.message || body.response || body.content || '').length > 0;
        } catch {
          return r.body && r.body.length > 20;
        }
      },
    });
    errorRate.add(ok ? 0 : 1);

    // Extract session ID for follow-up
    try {
      const body = JSON.parse(res.body);
      sessionId = body.session_id || body.conversation_id || null;
    } catch {
      // Try regex fallback
      try {
        const match = (res.body || '').match(/"session_id"\s*:\s*"([^"]+)"/);
        if (match) sessionId = match[1];
      } catch {
        // ignore
      }
    }
  });

  sleep(3); // user reads the response

  // ---- Step 3: Send follow-up message --------------------------------------
  group('03_followup_message', () => {
    const followup = FOLLOWUP_PROMPTS[__ITER % FOLLOWUP_PROMPTS.length];
    const startTime = Date.now();

    const body = {
      message: followup,
      parcel_id: 'load-test-parcel',
      stream: false,
    };
    if (sessionId) body.session_id = sessionId;

    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      body,
      'companion_followup',
    );

    followupLatency.add(Date.now() - startTime);

    const ok = check(res, {
      'followup 2xx': (r) => r.status >= 200 && r.status < 300,
      'followup has content': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (body.message || body.response || body.content || '').length > 0;
        } catch {
          return r.body && r.body.length > 10;
        }
      },
    });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(2); // end-of-iteration think time
}

// ── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Companion chat load test complete. ${data.userCount || 0} test users provisioned.`);
}
