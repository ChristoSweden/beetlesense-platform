/**
 * k6-survey-flow.js — Survey lifecycle load test for BeetleSense.ai
 *
 * Simulates the complete survey workflow:
 *   1. Sign up / authenticate
 *   2. Register a parcel
 *   3. Upload survey images (presign + complete)
 *   4. Check survey processing status
 *   5. View analysis results
 *
 * Stages: ramp up to 50 users over 2 min, hold 5 min, ramp down 1 min
 * Thresholds: p95 < 2 s, error rate < 1%
 *
 * Usage:
 *   k6 run k6-survey-flow.js \
 *     -e SUPABASE_URL=http://localhost:54321 \
 *     -e SUPABASE_ANON_KEY=... \
 *     -e SUPABASE_SERVICE_ROLE_KEY=...
 */

import { check, sleep, group } from 'k6';
import {
  login,
  authGet,
  authPost,
  errorRate,
  apiLatency,
  provisionTestUsers,
} from './k6-config.js';

// ── Options ─────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    survey_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // ramp up
        { duration: '5m', target: 50 },   // sustained load
        { duration: '1m', target: 0 },    // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],     // 95th percentile under 2 s
    api_latency:       ['p(95)<2000'],
    errors:            ['rate<0.01'],       // error rate under 1%
    http_req_failed:   ['rate<0.01'],
  },
};

// ── Setup: provision test users ─────────────────────────────────────────────

export function setup() {
  const vuIds = Array.from({ length: 50 }, (_, i) => i + 1);
  const created = provisionTestUsers(vuIds);
  return { userCount: created };
}

// ── Main VU function ────────────────────────────────────────────────────────

export default function () {
  // ---- Step 1: Authenticate ------------------------------------------------
  const token = group('01_authenticate', () => login(__VU));

  if (!token) {
    sleep(1);
    return;
  }

  sleep(1); // think time

  // ---- Step 2: Register a parcel -------------------------------------------
  let parcelId = null;

  group('02_register_parcel', () => {
    const res = authPost(
      token,
      '/functions/v1/parcel-register',
      {
        fastighets_id: `LOADTEST TRACT ${__VU}:${__ITER}`,
        name: `Load Test Parcel ${__VU}-${__ITER}`,
      },
      'parcel_register',
    );

    const ok = check(res, {
      'register parcel 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    errorRate.add(ok ? 0 : 1);

    try {
      const body = JSON.parse(res.body);
      parcelId = body.data?.parcel_id || body.id || null;
    } catch {
      // ignore
    }
  });

  sleep(2); // user reviews parcel

  // ---- Step 3: Upload survey images (presign + complete) -------------------
  let uploadId = null;

  group('03_upload_images', () => {
    // 3a. Request a presigned upload URL
    const presignRes = authPost(
      token,
      '/functions/v1/upload-presign',
      {
        parcel_id: parcelId || 'load-test-parcel',
        filename: `drone-image-${__VU}-${__ITER}.tiff`,
        content_type: 'image/tiff',
        file_size_bytes: 10_485_760,
      },
      'upload_presign',
    );

    const presignOk = check(presignRes, {
      'presign 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    errorRate.add(presignOk ? 0 : 1);

    try {
      const body = JSON.parse(presignRes.body);
      uploadId = body.upload_id || body.id || null;
    } catch {
      // ignore
    }

    sleep(1); // simulated file upload time

    // 3b. Mark upload complete
    const completeRes = authPost(
      token,
      '/functions/v1/upload-complete',
      { upload_id: uploadId || 'load-test-upload' },
      'upload_complete',
    );

    const completeOk = check(completeRes, {
      'upload complete 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    errorRate.add(completeOk ? 0 : 1);
  });

  sleep(2); // user waits for processing

  // ---- Step 4: Check survey processing status (poll 3 times) ---------------
  group('04_check_processing', () => {
    for (let i = 0; i < 3; i++) {
      const res = authGet(
        token,
        `/functions/v1/survey-status?parcel_id=${parcelId || 'load-test-parcel'}`,
        'survey_status_poll',
      );

      check(res, {
        'survey status 2xx': (r) => r.status >= 200 && r.status < 300,
      });

      sleep(2); // poll interval
    }
  });

  sleep(1);

  // ---- Step 5: View analysis results ---------------------------------------
  group('05_view_results', () => {
    // Fetch survey list for the parcel
    const surveysRes = authGet(
      token,
      `/rest/v1/surveys?parcel_id=eq.${parcelId || 'load-test-parcel'}&select=id,status,created_at&order=created_at.desc&limit=5`,
      'surveys_list',
    );

    check(surveysRes, {
      'surveys list 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);

    // Fetch satellite timeseries for the parcel
    const tsRes = authGet(
      token,
      `/functions/v1/satellite-timeseries?parcel_id=${parcelId || 'load-test-parcel'}&date_from=2025-01-01&date_to=2026-03-17`,
      'satellite_timeseries',
    );

    check(tsRes, {
      'timeseries non-5xx': (r) => r.status < 500,
    });
  });

  sleep(1); // end-of-iteration think time
}

// ── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Survey-flow load test complete. ${data.userCount || 0} test users provisioned.`);
}
