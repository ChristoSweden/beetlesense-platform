# BeetleSense Security Audit Checklist

Last reviewed: ____-__-__
Reviewer: ______________

---

## OWASP Top 10 Review

- [ ] **A01 — Broken Access Control**
  - [ ] All API routes require authentication (no unauthenticated access to protected data)
  - [ ] Role-based access enforced server-side (owner cannot call pilot endpoints, etc.)
  - [ ] Supabase RLS policies prevent cross-tenant data access
  - [ ] Direct object reference checks: users can only access their own parcels/surveys/reports
  - [ ] Admin endpoints protected with service role key, never exposed to client

- [ ] **A02 — Cryptographic Failures**
  - [ ] All traffic over HTTPS (HSTS headers set)
  - [ ] JWT secrets are strong (>256 bits) and rotated
  - [ ] No secrets in client-side code or source control
  - [ ] Supabase anon key has minimal privileges (safe to expose)
  - [ ] Service role key never sent to client

- [ ] **A03 — Injection**
  - [ ] All database queries use parameterized statements (Supabase client handles this)
  - [ ] No raw SQL concatenation in Edge Functions or workers
  - [ ] HTML output escaped (React handles by default)
  - [ ] File names sanitized before storage

- [ ] **A04 — Insecure Design**
  - [ ] Rate limiting on authentication endpoints
  - [ ] Survey creation limited per user (prevent abuse)
  - [ ] AI Companion has token-per-minute caps
  - [ ] File upload size limits enforced server-side

- [ ] **A05 — Security Misconfiguration**
  - [ ] Default Supabase credentials changed in production
  - [ ] Debug mode disabled in production builds
  - [ ] Stack traces not exposed in API error responses
  - [ ] Unnecessary HTTP methods disabled
  - [ ] Security headers set (X-Content-Type-Options, X-Frame-Options, CSP)

- [ ] **A06 — Vulnerable and Outdated Components**
  - [ ] `pnpm audit` shows 0 critical/high vulnerabilities
  - [ ] Python dependencies scanned with `pip-audit` or `safety`
  - [ ] Docker base images are latest stable versions
  - [ ] No deprecated TLS versions allowed

- [ ] **A07 — Identification and Authentication Failures**
  - [ ] Password policy enforced (min 8 chars, complexity)
  - [ ] Magic link tokens expire within 10 minutes
  - [ ] Failed login attempts rate-limited (Supabase GoTrue config)
  - [ ] Session tokens expire appropriately (access: 1h, refresh: 7d)
  - [ ] Refresh token rotation enabled

- [ ] **A08 — Software and Data Integrity Failures**
  - [ ] CI/CD pipeline uses pinned dependency versions
  - [ ] Docker images built in CI (not pulled from unverified sources)
  - [ ] Supabase migrations reviewed before applying
  - [ ] Edge Function deployments require code review

- [ ] **A09 — Security Logging and Monitoring Failures**
  - [ ] Authentication events logged (login, logout, failed attempts)
  - [ ] Authorization failures logged with user ID and resource
  - [ ] File upload events logged (user, file type, size)
  - [ ] Logs shipped to centralized system (Loki)
  - [ ] Alerts configured for anomalous patterns

- [ ] **A10 — Server-Side Request Forgery (SSRF)**
  - [ ] External API calls (Sentinel Hub, Lantmateriet, SMHI) use allowlisted URLs
  - [ ] User-supplied URLs are not used in server-side fetches
  - [ ] Docker network isolation prevents internal service probing

---

## Row-Level Security (RLS) Verification

Run these queries against the production database to verify RLS is active and correct:

```sql
-- 1. Verify RLS is enabled on all application tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'parcels', 'surveys', 'survey_modules',
    'uploads', 'reports', 'pilot_applications', 'jobs',
    'inspector_clients', 'valuation_reports', 'chat_messages'
  );
-- ALL rows should show rowsecurity = true

-- 2. Verify policies exist for each table
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Cross-tenant isolation test (run as user A, verify no data from user B)
-- SET request.jwt.claims = '{"sub": "<user_a_id>", "role": "authenticated"}';
-- SELECT * FROM parcels; -- Should only return user A's parcels
-- SELECT * FROM surveys; -- Should only return user A's surveys
```

---

## JWT Configuration Validation

- [ ] Access token expiry: **3600 seconds** (1 hour)
- [ ] Refresh token expiry: **604800 seconds** (7 days)
- [ ] Refresh token rotation: **enabled**
- [ ] JWT secret length: minimum 256 bits
- [ ] Token validation checks `iss`, `aud`, and `exp` claims
- [ ] Expired tokens rejected by all Edge Functions (verify with curl)

```bash
# Test expired token rejection
curl -H "Authorization: Bearer <expired_token>" \
  https://<project>.supabase.co/functions/v1/companion-chat \
  -w "%{http_code}"
# Expected: 401
```

---

## Input Sanitization Checks

- [ ] Parcel names: alphanumeric + Swedish characters, max 200 chars
- [ ] Survey descriptions: max 2000 chars, HTML tags stripped
- [ ] Chat messages: max 4000 chars, no script injection
- [ ] File names: sanitized to `[a-zA-Z0-9_.-]`, max 255 chars
- [ ] Coordinate inputs: validated as numbers within Sweden bounding box
  - Latitude: 55.0 - 69.5
  - Longitude: 10.5 - 24.5
- [ ] GeoJSON inputs: validated schema, max 10MB
- [ ] Query parameters: type-checked with Zod schemas

---

## CORS Configuration Review

- [ ] Allowed origins explicitly listed (no wildcard `*` in production)
  ```
  Allowed: https://beetlesense.ai, https://app.beetlesense.ai
  Staging: https://staging.beetlesense.ai
  Local:   http://localhost:5173 (dev only)
  ```
- [ ] Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- [ ] Allowed headers: `Authorization, Content-Type, X-Request-ID, apikey`
- [ ] Credentials: `true`
- [ ] Max age: `86400` (24h preflight cache)
- [ ] Edge Functions use the shared CORS helper (`_shared/cors.ts`)

---

## File Upload Security

- [ ] **MIME type validation** — server-side validation, not just extension:
  - Images: `image/jpeg`, `image/png`, `image/tiff`, `image/webp`
  - LiDAR: `application/octet-stream` (with `.laz`/`.las` extension check)
  - GeoJSON: `application/json`, `application/geo+json`
- [ ] **File size limits**:
  - Smartphone photos: max 50 MB per file
  - Drone data packages: max 5 GB per upload session
  - LiDAR point clouds: max 2 GB per file
  - Report PDFs: max 100 MB
- [ ] **Content scanning**: uploaded images are validated (not just renamed executables)
- [ ] **Storage path**: files stored in user-scoped paths (`{user_id}/{survey_id}/...`)
- [ ] **Presigned URLs**: expire in 15 minutes, single-use
- [ ] **Virus scanning**: Supabase storage hooks or post-upload worker validation

---

## API Rate Limiting Verification

| Endpoint                  | Limit          | Window | Verified |
|---------------------------|----------------|--------|----------|
| `POST /auth/signup`       | 5 req          | 1h     | [ ]      |
| `POST /auth/token`        | 10 req         | 15m    | [ ]      |
| `POST /companion-chat`    | 30 req         | 1h     | [ ]      |
| `POST /upload-presign`    | 100 req        | 1h     | [ ]      |
| `POST /survey-status`     | 60 req         | 1m     | [ ]      |
| `POST /parcel-register`   | 20 req         | 1h     | [ ]      |
| `GET  /satellite-timeseries` | 30 req      | 1m     | [ ]      |
| Worker internal APIs      | No public access (internal network only) | [ ] |

```bash
# Test rate limiting (should get 429 after threshold)
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://<project>.supabase.co/functions/v1/companion-chat \
    -H "Authorization: Bearer <token>" \
    -d '{"message":"test"}'
done
```

---

## Secrets Management Audit

- [ ] No secrets in source code (`git log --all -p | grep -i "secret\|password\|api_key"`)
- [ ] `.env` files listed in `.gitignore`
- [ ] Production secrets stored in:
  - [ ] Supabase Dashboard (Edge Function secrets)
  - [ ] Docker Swarm secrets or environment injection
  - [ ] CI/CD secrets (GitHub Actions encrypted secrets)
- [ ] Secrets rotated on schedule:
  - JWT secret: every 90 days
  - API keys (Sentinel Hub, etc.): every 180 days
  - Database password: every 90 days
- [ ] Service accounts have minimal required permissions
- [ ] Supabase service role key only used in server-side workers, never in Edge Functions

---

## Sign-off

| Role             | Name | Date | Signature |
|------------------|------|------|-----------|
| Lead Developer   |      |      |           |
| Security Reviewer|      |      |           |
| DevOps           |      |      |           |
