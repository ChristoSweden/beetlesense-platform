/**
 * k6-config.js — Shared configuration for BeetleSense load tests
 *
 * Import this module in all test scripts for consistent auth, headers,
 * and environment variable handling.
 */

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Environment ─────────────────────────────────────────────────────────────

export const BASE_URL       = __ENV.BASE_URL       || 'http://localhost:5173';
export const SUPABASE_URL   = __ENV.SUPABASE_URL   || 'http://localhost:54321';
export const SUPABASE_ANON_KEY          = __ENV.SUPABASE_ANON_KEY          || '';
export const SUPABASE_SERVICE_ROLE_KEY  = __ENV.SUPABASE_SERVICE_ROLE_KEY  || '';

// ── Shared custom metrics ───────────────────────────────────────────────────

export const errorRate          = new Rate('errors');
export const apiLatency         = new Trend('api_latency', true);
export const companionFirstToken = new Trend('companion_first_token', true);

// ── Common headers ──────────────────────────────────────────────────────────

export function anonHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

// ── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Authenticate a virtual user against Supabase Auth.
 *
 * @param {number} vuId  — unique identifier used to derive the test email
 * @returns {string|null} access token, or null on failure
 */
export function login(vuId) {
  const email    = `loadtest-user-${vuId}@beetlesense.test`;
  const password = 'LoadTest2026!';

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: anonHeaders(),
      tags: { name: 'auth_login' },
    },
  );

  apiLatency.add(res.timings.duration);

  const ok = check(res, {
    'login returns 200': (r) => r.status === 200,
    'login has access_token': (r) => {
      try {
        return JSON.parse(r.body).access_token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  return JSON.parse(res.body).access_token;
}

// ── Authenticated request helpers ───────────────────────────────────────────

export function authGet(token, path, name) {
  const res = http.get(`${SUPABASE_URL}${path}`, {
    headers: authHeaders(token),
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

export function authPost(token, path, body, name) {
  const res = http.post(`${SUPABASE_URL}${path}`, JSON.stringify(body), {
    headers: authHeaders(token),
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

// ── Test-user provisioning ──────────────────────────────────────────────────

/**
 * Create test users via the Supabase admin API.
 * Call from a setup() function. Requires SUPABASE_SERVICE_ROLE_KEY.
 *
 * @param {number[]} vuIds — array of VU ids to provision
 * @returns {number} count of successfully created users
 */
export function provisionTestUsers(vuIds) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping test-user provisioning');
    return 0;
  }

  let created = 0;
  for (const id of vuIds) {
    const email = `loadtest-user-${id}@beetlesense.test`;
    const res = http.post(
      `${SUPABASE_URL}/auth/v1/admin/users`,
      JSON.stringify({
        email,
        password: 'LoadTest2026!',
        email_confirm: true,
        user_metadata: { full_name: `Load Test User ${id}`, role: 'owner' },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    if (res.status === 200 || res.status === 201) created++;
  }

  console.log(`Provisioned ${created} / ${vuIds.length} test users`);
  return created;
}
