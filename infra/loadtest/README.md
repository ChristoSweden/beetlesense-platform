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

## Run the tests

### Full load test (all 3 scenarios)

```bash
k6 run load-test.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Survey flow only (legacy script)

```bash
k6 run k6-survey-flow.js \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key
```

### Against staging

```bash
k6 run load-test.js \
  -e SUPABASE_URL=https://your-staging-project.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Thresholds

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500 ms |
| Companion first token (p95) | < 5 000 ms |
| Error rate | < 1% |

## Output to Grafana Cloud

```bash
k6 run load-test.js \
  -e SUPABASE_URL=... \
  -o cloud
```

Set `K6_CLOUD_TOKEN` in your environment first. See [k6 Cloud docs](https://grafana.com/docs/grafana-cloud/testing/k6/).
