/**
 * k6-edge-functions.js — Edge Function stress test for BeetleSense.ai
 *
 * Hits each Supabase Edge Function endpoint under sustained load:
 *   - parcel-register
 *   - survey-status
 *   - upload-presign
 *   - companion-chat
 *   - satellite-timeseries
 *   - alerts-subscribe
 *   - vision-identify
 *
 * Stages: ramp to 100 RPS using constant-arrival-rate executor
 * Thresholds: p95 < 500 ms for non-AI endpoints
 *
 * Usage:
 *   k6 run k6-edge-functions.js \
 *     -e SUPABASE_URL=http://localhost:54321 \
 *     -e SUPABASE_ANON_KEY=... \
 *     -e SUPABASE_SERVICE_ROLE_KEY=...
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  SUPABASE_URL,
  login,
  authGet,
  authPost,
  authHeaders,
  errorRate,
  apiLatency,
  provisionTestUsers,
} from './k6-config.js';

// ── Custom metrics per endpoint ─────────────────────────────────────────────

const parcelRegisterLatency   = new Trend('edge_parcel_register', true);
const surveyStatusLatency     = new Trend('edge_survey_status', true);
const uploadPresignLatency    = new Trend('edge_upload_presign', true);
const companionChatLatency    = new Trend('edge_companion_chat', true);
const satelliteLatency        = new Trend('edge_satellite_timeseries', true);
const alertsSubscribeLatency  = new Trend('edge_alerts_subscribe', true);
const visionIdentifyLatency   = new Trend('edge_vision_identify', true);
const totalRequests           = new Counter('edge_total_requests');

// ── Options ─────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    edge_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 120,
      maxVUs: 200,
      stages: [
        { duration: '1m',  target: 50 },   // ramp to 50 RPS
        { duration: '1m',  target: 100 },  // ramp to 100 RPS
        { duration: '5m',  target: 100 },  // hold at 100 RPS
        { duration: '1m',  target: 0 },    // ramp down
      ],
    },
  },
  thresholds: {
    // Non-AI endpoints should be fast
    edge_parcel_register:       ['p(95)<500'],
    edge_survey_status:         ['p(95)<500'],
    edge_upload_presign:        ['p(95)<500'],
    edge_satellite_timeseries:  ['p(95)<500'],
    edge_alerts_subscribe:      ['p(95)<500'],
    // AI endpoints get more headroom
    edge_companion_chat:        ['p(95)<5000'],
    edge_vision_identify:       ['p(95)<3000'],
    // Global
    errors:                     ['rate<0.01'],
    http_req_failed:            ['rate<0.02'],
  },
};

// ── Setup ───────────────────────────────────────────────────────────────────

export function setup() {
  const vuIds = Array.from({ length: 200 }, (_, i) => i + 500);
  const created = provisionTestUsers(vuIds);
  return { userCount: created };
}

// ── Main VU function — round-robin through endpoints ────────────────────────

export default function () {
  const token = login(__VU + 500);
  if (!token) {
    sleep(0.5);
    return;
  }

  // Cycle through endpoints based on iteration number
  const endpoint = __ITER % 7;

  switch (endpoint) {
    case 0:
      hitParcelRegister(token);
      break;
    case 1:
      hitSurveyStatus(token);
      break;
    case 2:
      hitUploadPresign(token);
      break;
    case 3:
      hitCompanionChat(token);
      break;
    case 4:
      hitSatelliteTimeseries(token);
      break;
    case 5:
      hitAlertsSubscribe(token);
      break;
    case 6:
      hitVisionIdentify(token);
      break;
  }

  totalRequests.add(1);
  sleep(0.2); // minimal pause between requests
}

// ── Endpoint functions ──────────────────────────────────────────────────────

function hitParcelRegister(token) {
  group('parcel-register', () => {
    const res = authPost(
      token,
      '/functions/v1/parcel-register',
      {
        fastighets_id: `STRESS TEST ${__VU}:${__ITER}`,
        name: `Stress Parcel ${__VU}-${__ITER}`,
      },
      'edge_parcel_register',
    );
    parcelRegisterLatency.add(res.timings.duration);

    const ok = check(res, {
      'parcel-register non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitSurveyStatus(token) {
  group('survey-status', () => {
    const res = authGet(
      token,
      '/functions/v1/survey-status?survey_id=load-test-survey',
      'edge_survey_status',
    );
    surveyStatusLatency.add(res.timings.duration);

    const ok = check(res, {
      'survey-status non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitUploadPresign(token) {
  group('upload-presign', () => {
    const res = authPost(
      token,
      '/functions/v1/upload-presign',
      {
        survey_id: 'load-test-survey',
        filename: `stress-${__VU}-${__ITER}.tiff`,
        content_type: 'image/tiff',
        file_size_bytes: 5_242_880,
      },
      'edge_upload_presign',
    );
    uploadPresignLatency.add(res.timings.duration);

    const ok = check(res, {
      'upload-presign non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitCompanionChat(token) {
  group('companion-chat', () => {
    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      {
        message: 'Quick bark beetle check on my parcel.',
        parcel_id: 'load-test-parcel',
        stream: false,
      },
      'edge_companion_chat',
    );
    companionChatLatency.add(res.timings.duration);

    const ok = check(res, {
      'companion-chat non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitSatelliteTimeseries(token) {
  group('satellite-timeseries', () => {
    const res = authGet(
      token,
      '/functions/v1/satellite-timeseries?parcel_id=load-test-parcel&date_from=2025-06-01&date_to=2026-03-17',
      'edge_satellite_timeseries',
    );
    satelliteLatency.add(res.timings.duration);

    const ok = check(res, {
      'satellite-timeseries non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitAlertsSubscribe(token) {
  group('alerts-subscribe', () => {
    const res = authPost(
      token,
      '/functions/v1/alerts-subscribe',
      {
        parcel_id: 'load-test-parcel',
        channels: ['email'],
      },
      'edge_alerts_subscribe',
    );
    alertsSubscribeLatency.add(res.timings.duration);

    const ok = check(res, {
      'alerts-subscribe non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

function hitVisionIdentify(token) {
  group('vision-identify', () => {
    const res = authPost(
      token,
      '/functions/v1/vision-identify',
      {
        image_url: 'https://example.com/test-bark-sample.jpg',
        parcel_id: 'load-test-parcel',
      },
      'edge_vision_identify',
    );
    visionIdentifyLatency.add(res.timings.duration);

    const ok = check(res, {
      'vision-identify non-5xx': (r) => r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);
  });
}

// ── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Edge function stress test complete. ${data.userCount || 0} test users provisioned.`);
}
