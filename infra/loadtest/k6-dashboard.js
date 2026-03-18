/**
 * k6-dashboard.js — Dashboard load test for BeetleSense.ai
 *
 * Simulates a user loading the owner dashboard:
 *   1. Authenticate
 *   2. Load dashboard page data (multiple concurrent API calls)
 *   3. Load health score, weather, alerts, parcels
 *   4. Navigate to parcel detail
 *
 * Stages: ramp to 200 users, hold 10 min
 * Thresholds: p95 < 1 s for dashboard, p99 < 3 s
 *
 * Usage:
 *   k6 run k6-dashboard.js \
 *     -e SUPABASE_URL=http://localhost:54321 \
 *     -e SUPABASE_ANON_KEY=... \
 *     -e SUPABASE_SERVICE_ROLE_KEY=...
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import {
  SUPABASE_URL,
  login,
  authGet,
  authHeaders,
  errorRate,
  apiLatency,
  provisionTestUsers,
} from './k6-config.js';

// ── Custom metrics ──────────────────────────────────────────────────────────

const dashboardLoad = new Trend('dashboard_load_time', true);
const parcelDetailLoad = new Trend('parcel_detail_load_time', true);

// ── Options ─────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    dashboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 200 },  // ramp up
        { duration: '10m', target: 200 },  // sustained load
        { duration: '2m',  target: 0 },    // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    dashboard_load_time:   ['p(95)<1000', 'p(99)<3000'],
    parcel_detail_load_time: ['p(95)<1000', 'p(99)<3000'],
    api_latency:           ['p(95)<1000'],
    errors:                ['rate<0.01'],
    http_req_failed:       ['rate<0.01'],
  },
};

// ── Setup ───────────────────────────────────────────────────────────────────

export function setup() {
  const vuIds = Array.from({ length: 200 }, (_, i) => i + 1);
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

  sleep(1); // think time after login

  // ---- Step 2: Load dashboard — batch of concurrent requests ---------------
  group('02_load_dashboard', () => {
    const start = Date.now();
    const hdrs = authHeaders(token);

    // Fire multiple requests in parallel (k6 http.batch)
    const responses = http.batch([
      ['GET', `${SUPABASE_URL}/rest/v1/parcels?select=id,name,area_ha,status&limit=20`,       null, { headers: hdrs, tags: { name: 'dash_parcels' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/alerts?select=id,severity,title,created_at&is_read=eq.false&limit=10`, null, { headers: hdrs, tags: { name: 'dash_alerts' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/surveys?select=id,status,parcel_id&order=created_at.desc&limit=5`, null, { headers: hdrs, tags: { name: 'dash_surveys' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/health_scores?select=parcel_id,score,updated_at&limit=20`, null, { headers: hdrs, tags: { name: 'dash_health' } }],
    ]);

    const elapsed = Date.now() - start;
    dashboardLoad.add(elapsed);

    for (const res of responses) {
      apiLatency.add(res.timings.duration);
    }

    const allOk = check(responses, {
      'all dashboard requests 2xx': (rs) => rs.every((r) => r.status >= 200 && r.status < 300),
    });
    errorRate.add(allOk ? 0 : 1);
  });

  sleep(3); // user reads dashboard

  // ---- Step 3: Load additional widgets (health score, weather) -------------
  group('03_dashboard_widgets', () => {
    // Fetch weather data (SMHI proxy or edge function)
    const weatherRes = authGet(
      token,
      '/rest/v1/weather_cache?select=parcel_id,temperature,precipitation,wind_speed&limit=5',
      'dash_weather',
    );
    check(weatherRes, {
      'weather non-5xx': (r) => r.status < 500,
    });

    // Fetch aggregated health score
    const healthRes = authGet(
      token,
      '/rest/v1/health_scores?select=parcel_id,score,risk_level&order=score.asc&limit=20',
      'dash_health_detail',
    );
    check(healthRes, {
      'health scores 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(2); // user reviews widgets

  // ---- Step 4: Navigate to parcel detail -----------------------------------
  group('04_parcel_detail', () => {
    // First get a parcel ID from the list
    const listRes = authGet(token, '/rest/v1/parcels?select=id&limit=1', 'parcels_first');
    let parcelId = null;
    try {
      const rows = JSON.parse(listRes.body);
      if (rows.length > 0) parcelId = rows[0].id;
    } catch {
      // ignore
    }

    if (!parcelId) {
      parcelId = 'load-test-parcel';
    }

    const start = Date.now();
    const hdrs = authHeaders(token);

    // Batch-load parcel detail page
    const responses = http.batch([
      ['GET', `${SUPABASE_URL}/rest/v1/parcels?id=eq.${parcelId}&select=*`,                     null, { headers: hdrs, tags: { name: 'parcel_detail' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/surveys?parcel_id=eq.${parcelId}&select=*&order=created_at.desc&limit=10`, null, { headers: hdrs, tags: { name: 'parcel_surveys' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/health_scores?parcel_id=eq.${parcelId}&select=*`,        null, { headers: hdrs, tags: { name: 'parcel_health' } }],
      ['GET', `${SUPABASE_URL}/rest/v1/alerts?parcel_id=eq.${parcelId}&select=*&limit=20`,      null, { headers: hdrs, tags: { name: 'parcel_alerts' } }],
    ]);

    const elapsed = Date.now() - start;
    parcelDetailLoad.add(elapsed);

    for (const res of responses) {
      apiLatency.add(res.timings.duration);
    }

    const allOk = check(responses, {
      'all parcel-detail requests 2xx': (rs) => rs.every((r) => r.status >= 200 && r.status < 300),
    });
    errorRate.add(allOk ? 0 : 1);
  });

  sleep(2); // end-of-iteration think time
}

// ── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Dashboard load test complete. ${data.userCount || 0} test users provisioned.`);
}
