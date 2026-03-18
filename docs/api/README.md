# BeetleSense.ai API Reference

## Overview

The BeetleSense.ai API provides programmatic access to the forest intelligence platform. All API endpoints are implemented as Supabase Edge Functions (Deno) and follow consistent patterns for authentication, error handling, and response formatting.

For the full OpenAPI 3.1 specification, see [`openapi.yaml`](./openapi.yaml).

---

## Base URL

| Environment   | Base URL                                                        |
|---------------|-----------------------------------------------------------------|
| Production    | `https://<project-ref>.supabase.co/functions/v1`                |
| Local dev     | `http://localhost:54321/functions/v1`                            |

Replace `<project-ref>` with your Supabase project reference ID.

---

## Authentication

All API endpoints require a valid Supabase Auth JWT token, passed as a Bearer token in the `Authorization` header.

### Obtaining a token

**Option 1: Supabase Client SDK**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'your-password',
});

// The access token
const token = data.session.access_token;
```

**Option 2: Direct REST call**

```bash
curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}'
```

**Option 3: OAuth (Google, GitHub, etc.)**

```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
});
```

### Using the token

Include the token in every API request:

```
Authorization: Bearer <your-jwt-token>
```

Tokens expire after the configured session duration (default: 1 hour). Use `supabase.auth.refreshSession()` or the `/auth/v1/token?grant_type=refresh_token` endpoint to obtain a fresh token.

---

## Common Headers

| Header          | Value                            | Required | Notes                           |
|-----------------|----------------------------------|----------|---------------------------------|
| Authorization   | `Bearer <jwt>`                   | Yes      | Supabase Auth JWT               |
| Content-Type    | `application/json`               | Yes*     | Required for POST/PATCH/DELETE  |
| apikey          | `<supabase-anon-key>`            | No**     | Auto-included by Supabase SDK   |

\* GET requests do not require Content-Type.
\** The `apikey` header is required when calling the API directly (not through the Supabase client SDK, which adds it automatically).

---

## Error Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning             | When                                              |
|------|---------------------|----------------------------------------------------|
| 200  | OK                  | Successful GET, PATCH, DELETE                       |
| 201  | Created             | Successful resource creation (POST)                 |
| 400  | Bad Request         | Invalid or missing parameters                       |
| 401  | Unauthorized        | Missing or expired JWT token                        |
| 403  | Forbidden           | User lacks required role/org membership             |
| 404  | Not Found           | Resource does not exist or user lacks access         |
| 405  | Method Not Allowed  | Wrong HTTP method for the endpoint                  |
| 409  | Conflict            | Duplicate resource or invalid state transition       |
| 410  | Gone                | Expired share link                                  |
| 500  | Internal Error      | Server-side failure                                 |
| 502  | Bad Gateway         | Upstream service (AI, embeddings) unavailable        |
| 503  | Service Unavailable | Service temporarily unavailable                      |

---

## Response Format

### Success responses

All successful responses wrap the payload in a `data` field:

```json
{
  "data": {
    "parcel_id": "uuid-here",
    "status": "pending"
  }
}
```

### Streaming responses (SSE)

The `/companion-chat` endpoint returns a `text/event-stream` response. Events are formatted as standard Server-Sent Events:

```
event: message
data: {"type":"token","data":"The bark beetle..."}

event: message
data: {"type":"done","data":{"done":true,"sources":["SLU Report"]}}
```

**SSE Event Types:**

| Type         | Description                                             |
|--------------|---------------------------------------------------------|
| `session`    | Session ID and intent classification (first event)       |
| `token`      | Incremental text token from the AI                       |
| `citation`   | Array of cited source names                              |
| `confidence` | Confidence level (`high`/`medium`/`low`) and score       |
| `done`       | Final event with summary metadata                        |
| `error`      | Error during streaming                                   |

---

## Rate Limits

Rate limits are applied per authenticated user:

| Endpoint           | Limit               | Window   |
|--------------------|----------------------|----------|
| `/companion-chat`  | 30 requests          | 1 minute |
| `/knowledge-search`| 60 requests          | 1 minute |
| `/upload-presign`  | 20 requests          | 1 minute |
| All other endpoints| 120 requests         | 1 minute |

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header indicating seconds until the limit resets.

---

## Pagination

Endpoints that return lists (e.g., `/parcel-share?parcel_id=...`) currently return all matching records. Future versions will support cursor-based pagination:

```
?cursor=<last_item_id>&limit=20
```

Response will include:

```json
{
  "data": [...],
  "pagination": {
    "cursor": "next-cursor-value",
    "has_more": true
  }
}
```

---

## Endpoint Summary

| Method  | Endpoint            | Description                                |
|---------|---------------------|--------------------------------------------|
| POST    | `/companion-chat`   | Stream AI forestry advice (SSE)            |
| POST    | `/parcel-register`  | Register a new forestry parcel             |
| GET     | `/survey-status`    | Check survey processing status             |
| POST    | `/upload-presign`   | Get presigned URL for file upload          |
| POST    | `/upload-complete`  | Trigger post-upload validation             |
| POST    | `/knowledge-search` | RAG vector search over knowledge base      |
| GET     | `/parcel-share`     | List collaborators or shared parcels       |
| POST    | `/parcel-share`     | Create share invitation or link            |
| PATCH   | `/parcel-share`     | Update collaborator role                   |
| DELETE  | `/parcel-share`     | Remove collaborator                        |
| POST    | `/alerts-subscribe` | Store push notification subscription       |
| POST    | `/request-quote`    | Request a contractor quote                 |

---

## Worker API (Internal)

The BullMQ worker process exposes an HTTP health/metrics server on port 3002 (configurable via `HEALTH_PORT`).

| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/health`          | Liveness probe with dependency checks|
| GET    | `/ready`           | Readiness probe                      |
| GET    | `/health/ready`    | Alias for `/ready`                   |
| GET    | `/health/metrics`  | Prometheus-compatible metrics        |

These endpoints are not publicly exposed and are intended for infrastructure monitoring (Kubernetes probes, Prometheus scraping, Grafana dashboards).

---

## Quick Start

```bash
# 1. Set your environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# 2. Get an auth token
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# 3. Register a parcel
curl -X POST "${SUPABASE_URL}/functions/v1/parcel-register" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"fastighets_id":"VARNAMO KARDA 1:5","name":"My Forest"}'

# 4. Ask the AI companion
curl -N -X POST "${SUPABASE_URL}/functions/v1/companion-chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I detect bark beetle damage early?"}'
```
