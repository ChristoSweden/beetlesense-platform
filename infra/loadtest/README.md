# BeetleSense Load Tests

Performance tests using [k6](https://grafana.com/docs/k6/latest/) by Grafana Labs.

## Install k6

**macOS:**

```bash
brew install k6
```

**Windows:**

```bash
winget install k6 --source winget
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

**Docker:**

```bash
docker pull grafana/k6
```

## Environment Variables

All scripts require the following environment variables. Pass them with `-e`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `http://localhost:54321`) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service-role key — needed to auto-provision test users in `setup()` |
| `BASE_URL` | No | Frontend URL (default `http://localhost:5173`). Not used by most scripts. |

## Test Scripts

### `k6-survey-flow.js` — Survey Lifecycle

Full survey workflow: authenticate, register parcel, upload images, poll status, view results.

```bash
k6 run k6-survey-flow.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Stage | Duration | VUs |
|-------|----------|-----|
| Ramp up | 2 min | 0 -> 50 |
| Sustain | 5 min | 50 |
| Ramp down | 1 min | 50 -> 0 |

**Thresholds:** p95 < 2 s, error rate < 1%

---

### `k6-dashboard.js` — Dashboard Browsing

Simulates 200 users loading the owner dashboard with concurrent API calls (parcels, alerts, health scores, weather), then navigating to a parcel detail page.

```bash
k6 run k6-dashboard.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Stage | Duration | VUs |
|-------|----------|-----|
| Ramp up | 2 min | 0 -> 200 |
| Sustain | 10 min | 200 |
| Ramp down | 2 min | 200 -> 0 |

**Thresholds:** p95 < 1 s, p99 < 3 s, error rate < 1%

---

### `k6-companion-chat.js` — AI Companion Chat

Concurrent chat sessions: initial message + follow-up, measuring time to first token.

```bash
k6 run k6-companion-chat.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Stage | Duration | VUs |
|-------|----------|-----|
| Ramp up | 1 min | 0 -> 30 |
| Sustain | 5 min | 30 |
| Ramp down | 1 min | 30 -> 0 |

**Thresholds:** time to first token p95 < 3 s, follow-up p95 < 5 s

---

### `k6-edge-functions.js` — Edge Function Stress Test

Round-robin hits all Edge Function endpoints at up to 100 RPS using the `ramping-arrival-rate` executor.

```bash
k6 run k6-edge-functions.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Stage | Duration | Target RPS |
|-------|----------|------------|
| Ramp | 1 min | 0 -> 50 |
| Ramp | 1 min | 50 -> 100 |
| Sustain | 5 min | 100 |
| Ramp down | 1 min | 100 -> 0 |

**Thresholds:** p95 < 500 ms for non-AI endpoints, p95 < 5 s for companion-chat

---

### `load-test.js` — Combined (Legacy)

All-in-one script with browsing, survey, and chat scenarios. Kept for backward compatibility.

```bash
k6 run load-test.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Shared Configuration

All new scripts import from `k6-config.js`, which provides:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BASE_URL` — from env vars
- `login(vuId)` — authenticate and return an access token
- `authGet(token, path, name)` / `authPost(token, path, body, name)` — tagged requests
- `authHeaders(token)` — header object for `http.batch()`
- `provisionTestUsers(vuIds)` — create test users via admin API
- Shared metrics: `errorRate`, `apiLatency`, `companionFirstToken`

## Reading Results

k6 prints a summary table after each run. Key metrics to watch:

| Metric | What it tells you |
|--------|-------------------|
| `http_req_duration` | Overall request latency (p50, p90, p95, p99) |
| `api_latency` | Same, via custom trend (useful for filtering) |
| `dashboard_load_time` | Time for the full batch of dashboard API calls |
| `companion_first_token` | Time until AI companion returns a response |
| `errors` | Custom error rate (application-level failures) |
| `http_req_failed` | HTTP-level failures (non-2xx responses) |
| `edge_*` | Per-endpoint latency in the edge-function stress test |

### Export to JSON

```bash
k6 run k6-survey-flow.js -e SUPABASE_URL=... --out json=results.json
```

### Export to Grafana Cloud

```bash
export K6_CLOUD_TOKEN=your-cloud-token
k6 run k6-dashboard.js -e SUPABASE_URL=... --out cloud
```

See [k6 Cloud docs](https://grafana.com/docs/grafana-cloud/testing/k6/) for setup.

### Export to InfluxDB (local Grafana stack)

```bash
k6 run k6-survey-flow.js -e SUPABASE_URL=... --out influxdb=http://localhost:8086/k6
```

## Tips

- **Test users:** Scripts auto-provision test users in `setup()` when `SUPABASE_SERVICE_ROLE_KEY` is set. Without it, you must create users manually.
- **Against staging:** Replace `SUPABASE_URL` with your staging project URL and use the corresponding keys.
- **Dry run:** Use `--iterations 1 --vus 1` to verify a script works before running the full load.
- **Think time:** All scripts include realistic `sleep()` calls between steps. Do not remove them, or you will generate unrealistic traffic patterns.
- **CI integration:** Add `k6 run ... --quiet` to your CI pipeline with strict thresholds to catch regressions.
