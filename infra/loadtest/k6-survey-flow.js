import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------- Custom metrics ----------
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const companionFirstToken = new Trend('companion_first_token', true);

// ---------- Configuration ----------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

export const options = {
  scenarios: {
    survey_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // ramp up to 50 users over 2 minutes
        { duration: '5m', target: 50 },  // sustain 50 users for 5 minutes
        { duration: '1m', target: 0 },   // ramp down over 1 minute
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],           // 95% of API calls under 2s
    api_latency: ['p(95)<2000'],                  // custom metric confirms
    companion_first_token: ['p(95)<5000'],        // companion first token under 5s
    errors: ['rate<0.05'],                        // error rate under 5%
    http_req_failed: ['rate<0.05'],               // HTTP failures under 5%
  },
};

// ---------- Helper: login and get auth token ----------
function login() {
  const vuId = __VU;
  const email = `loadtest-user-${vuId}@beetlesense.test`;
  const password = 'LoadTest2026!';

  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      tags: { name: 'login' },
    },
  );

  apiLatency.add(loginRes.timings.duration);

  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns access_token': (r) => {
      try { return JSON.parse(r.body).access_token !== undefined; } catch { return false; }
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  return JSON.parse(loginRes.body).access_token;
}

// ---------- Helper: authenticated request ----------
function authGet(token, path, name) {
  const res = http.get(`${SUPABASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

function authPost(token, path, body, name) {
  const res = http.post(`${SUPABASE_URL}${path}`, JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    tags: { name },
  });
  apiLatency.add(res.timings.duration);
  return res;
}

// ---------- Main test flow ----------
export default function () {
  // Step 1: Login
  const token = group('01_login', () => {
    return login();
  });

  if (!token) {
    sleep(1);
    return; // Skip rest if login failed
  }

  sleep(1); // Think time

  // Step 2: List parcels
  group('02_list_parcels', () => {
    const res = authGet(token, '/rest/v1/parcels?select=*&limit=20', 'list_parcels');

    const ok = check(res, {
      'parcels status is 200': (r) => r.status === 200,
      'parcels returns array': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
    });

    errorRate.add(ok ? 0 : 1);
  });

  sleep(2); // Think time — user browses parcel list

  // Step 3: Create survey
  let surveyId = null;
  group('03_create_survey', () => {
    const res = authPost(
      token,
      '/functions/v1/survey-status',
      {
        action: 'create',
        parcel_id: 'load-test-parcel',
        modules: ['bark_beetle_detection', 'forest_health'],
        priority: 'normal',
      },
      'create_survey',
    );

    const ok = check(res, {
      'create survey status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    errorRate.add(ok ? 0 : 1);

    try {
      const body = JSON.parse(res.body);
      surveyId = body.id || body.survey_id || null;
    } catch {
      // ignore parse errors
    }
  });

  sleep(2);

  // Step 4: Poll survey status (simulates checking progress)
  group('04_poll_survey_status', () => {
    for (let i = 0; i < 3; i++) {
      const endpoint = surveyId
        ? `/functions/v1/survey-status?survey_id=${surveyId}`
        : '/functions/v1/survey-status?survey_id=load-test-survey';

      const res = authGet(token, endpoint, 'poll_survey_status');

      check(res, {
        'poll status 2xx': (r) => r.status >= 200 && r.status < 300,
      });

      sleep(1); // Poll interval
    }
  });

  sleep(1);

  // Step 5: Open companion chat — measure time to first token
  group('05_companion_chat', () => {
    const startTime = Date.now();

    const res = authPost(
      token,
      '/functions/v1/companion-chat',
      {
        message: 'Hur identifierar jag granbarkborre i mina tallar?',
        context: { parcel_id: 'load-test-parcel' },
        stream: false, // k6 doesn't support SSE natively, so use non-streaming
      },
      'companion_chat',
    );

    const firstTokenTime = Date.now() - startTime;
    companionFirstToken.add(firstTokenTime);

    const ok = check(res, {
      'companion status 2xx': (r) => r.status >= 200 && r.status < 300,
      'companion returns response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (body.message || body.response || body.content || '').length > 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(ok ? 0 : 1);
  });

  sleep(1);
}

// ---------- Setup: create test users ----------
export function setup() {
  const users = [];

  for (let i = 1; i <= 50; i++) {
    const email = `loadtest-user-${i}@beetlesense.test`;
    const password = 'LoadTest2026!';

    // Try to create user via Supabase admin API (requires service role key)
    const serviceKey = __ENV.SUPABASE_SERVICE_ROLE_KEY || '';

    if (serviceKey) {
      http.post(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `Load Test User ${i}`, role: 'owner' },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
        },
      );
    }

    users.push({ email, password });
  }

  return { users };
}

// ---------- Teardown: log summary ----------
export function teardown(data) {
  console.log(`Load test complete. ${data.users ? data.users.length : 0} test users were provisioned.`);
}
