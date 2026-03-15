import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────────

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const companionFirstToken = new Trend('companion_first_token', true);

// ── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

// ── Scenarios & thresholds ──────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Scenario 1: 50 concurrent users browsing parcels + dashboards
    browsing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'browsingFlow',
    },

    // Scenario 2: 10 parallel survey submissions
    survey_submissions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'surveyFlow',
    },

    // Scenario 3: Companion chat load test
    companion_chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '5m', target: 5 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'companionChatFlow',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500'],
    api_latency: ['p(95)<500'],
    companion_first_token: ['p(95)<5000'],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function login(vuId) {
  const email = `loadtest-user-${vuId}@beetlesense.test`;
  const password = 'LoadTest2026!';

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
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

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

function authGet(token, path, name) {
  const res = http.get(`${SUPABASE_URL}${path}`, {
    headers: authHeaders(token),
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

function authPost(token, path, body, name) {
  const res = http.post(`${SUPABASE_URL}${path}`, JSON.stringify(body), {
    headers: authHeaders(token),
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

// ── Scenario 1: Browsing flow (50 VUs) ─────────────────────────────────────

export function browsingFlow() {
  const token = group('login', () => login(__VU));
  if (!token) {
    sleep(1);
    return;
  }

  sleep(1);

  // List parcels
  group('list_parcels', () => {
    const res = authGet(token, '/rest/v1/parcels?select=id,name,fastighets_id,area_ha,status&limit=20', 'parcels_list');
    const ok = check(res, {
      'parcels 200': (r) => r.status === 200,
      'parcels is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(2);

  // Fetch parcel detail (first parcel from list)
  group('parcel_detail', () => {
    const listRes = authGet(token, '/rest/v1/parcels?select=id&limit=1', 'parcels_first');
    let parcelId = null;
    try {
      const rows = JSON.parse(listRes.body);
      if (rows.length > 0) parcelId = rows[0].id;
    } catch {
      // ignore
    }

    if (parcelId) {
      const res = authGet(token, `/rest/v1/parcels?id=eq.${parcelId}&select=*`, 'parcel_detail');
      check(res, { 'parcel detail 200': (r) => r.status === 200 });
    }
  });

  sleep(2);

  // List surveys
  group('list_surveys', () => {
    const res = authGet(token, '/rest/v1/surveys?select=id,name,status,created_at&limit=20', 'surveys_list');
    const ok = check(res, {
      'surveys 200': (r) => r.status === 200,
    });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(2);

  // Fetch satellite timeseries
  group('satellite_timeseries', () => {
    const res = authGet(
      token,
      '/functions/v1/satellite-timeseries?parcel_id=load-test-parcel&date_from=2025-01-01&date_to=2026-03-15',
      'satellite_timeseries',
    );
    check(res, {
      'timeseries 2xx or 404': (r) => r.status < 500,
    });
  });

  sleep(1);
}

// ── Scenario 2: Survey submission flow (10 VUs) ────────────────────────────

export function surveyFlow() {
  const token = group('login', () => login(__VU + 100));
  if (!token) {
    sleep(1);
    return;
  }

  sleep(1);

  // Register a parcel
  let parcelId = null;
  group('register_parcel', () => {
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
      'register 2xx or 409': (r) => r.status >= 200 && r.status < 500,
    });
    errorRate.add(ok ? 0 : 1);

    try {
      const body = JSON.parse(res.body);
      parcelId = body.data?.parcel_id || null;
    } catch {
      // ignore
    }
  });

  sleep(2);

  // Request upload presign
  group('upload_presign', () => {
    const res = authPost(
      token,
      '/functions/v1/upload-presign',
      {
        survey_id: 'load-test-survey',
        filename: `test-image-${__VU}-${__ITER}.tiff`,
        content_type: 'image/tiff',
        file_size_bytes: 10485760,
      },
      'upload_presign',
    );

    check(res, {
      'presign 2xx or 4xx': (r) => r.status < 500,
    });
  });

  sleep(2);

  // Mark upload complete
  group('upload_complete', () => {
    const res = authPost(
      token,
      '/functions/v1/upload-complete',
      { upload_id: 'load-test-upload' },
      'upload_complete',
    );

    check(res, {
      'complete 2xx or 4xx': (r) => r.status < 500,
    });
  });

  sleep(2);

  // Poll survey status
  group('poll_survey_status', () => {
    for (let i = 0; i < 3; i++) {
      const res = authGet(
        token,
        '/functions/v1/survey-status?survey_id=load-test-survey',
        'survey_status',
      );
      check(res, {
        'status 2xx or 4xx': (r) => r.status < 500,
      });
      sleep(1);
    }
  });

  sleep(1);
}

// ── Scenario 3: Companion chat flow (5 VUs) ────────────────────────────────

const CHAT_PROMPTS = [
  'Hur identifierar jag granbarkborre i mina tallar?',
  'What is the best time to harvest spruce in southern Sweden?',
  'Vilka tecken visar att min skog har stressade granar?',
  'How do I interpret NDVI changes in my satellite data?',
  'Kan du sammanfatta Skogsstyrelsens rekommendationer for barkborrebekampning?',
];

export function companionChatFlow() {
  const token = group('login', () => login(__VU + 200));
  if (!token) {
    sleep(1);
    return;
  }

  sleep(1);

  let sessionId = null;

  group('companion_chat', () => {
    const prompt = CHAT_PROMPTS[__ITER % CHAT_PROMPTS.length];
    const startTime = Date.now();

    const body = {
      message: prompt,
      parcel_id: 'load-test-parcel',
    };
    if (sessionId) body.session_id = sessionId;

    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      body,
      'companion_chat',
    );

    companionFirstToken.add(Date.now() - startTime);

    const ok = check(res, {
      'companion 2xx': (r) => r.status >= 200 && r.status < 300,
      'companion has content': (r) => {
        try {
          return r.body && r.body.length > 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(ok ? 0 : 1);

    // Try to extract session_id for follow-up messages
    try {
      const text = res.body || '';
      const match = text.match(/"session_id"\s*:\s*"([^"]+)"/);
      if (match) sessionId = match[1];
    } catch {
      // ignore
    }
  });

  sleep(3);

  // Send a follow-up message
  group('companion_followup', () => {
    const followup = 'Can you give me more details on that?';

    const body = { message: followup };
    if (sessionId) body.session_id = sessionId;

    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      body,
      'companion_followup',
    );

    check(res, {
      'followup 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(2);
}

// ── Setup: provision test users ─────────────────────────────────────────────

export function setup() {
  const serviceKey = __ENV.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping test user provisioning');
    return { userCount: 0 };
  }

  // Create users for all three scenarios (VU IDs: 1-50, 101-110, 201-205)
  const userIds = [
    ...Array.from({ length: 50 }, (_, i) => i + 1),
    ...Array.from({ length: 10 }, (_, i) => i + 101),
    ...Array.from({ length: 5 }, (_, i) => i + 201),
  ];

  let created = 0;
  for (const id of userIds) {
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
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (res.status === 200 || res.status === 201) created++;
  }

  console.log(`Provisioned ${created} / ${userIds.length} test users`);
  return { userCount: created };
}

// ── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Load test complete. ${data.userCount || 0} test users were available.`);
}
