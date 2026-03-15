# BeetleSense API Documentation

All endpoints are deployed as Supabase Edge Functions. Base URL:

```
https://<project-ref>.supabase.co/functions/v1
```

Every request (except OPTIONS) requires a valid JWT in the `Authorization: Bearer <token>` header, obtained via Supabase Auth. The `apikey` header must also be set to the project's anon key.

---

## parcel-register

Register a new forestry parcel by Swedish property identifier.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/functions/v1/parcel-register` |
| **Auth** | Bearer token (user must belong to an organisation) |

### Request body

```json
{
  "fastighets_id": "VARNAMO KARDA 1:5",
  "name": "Norra skiftet"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fastighets_id` | string | yes | Swedish property ID (3-100 chars) |
| `name` | string | no | Human-friendly parcel name |

### Response `201 Created`

```json
{
  "data": {
    "parcel_id": "uuid",
    "fastighets_id": "VARNAMO KARDA 1:5",
    "name": "Norra skiftet",
    "status": "pending",
    "area_ha": 42.5,
    "boundary": { "type": "Polygon", "coordinates": [...], "srid": 3006 }
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid or missing `fastighets_id` |
| 403 | User not in an organisation |
| 409 | Parcel with this `fastighets_id` already exists in the organisation |
| 500 | Database error |

---

## upload-presign

Generate a presigned URL for uploading survey files (imagery, LiDAR, shapefiles).

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/functions/v1/upload-presign` |
| **Auth** | Bearer token (user must own the survey's parcel) |

### Request body

```json
{
  "survey_id": "uuid",
  "filename": "drone-capture-001.tiff",
  "content_type": "image/tiff",
  "file_size_bytes": 52428800
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `survey_id` | string | yes | UUID of the target survey |
| `filename` | string | yes | Original filename (sanitised server-side) |
| `content_type` | string | yes | MIME type (see allowed list below) |
| `file_size_bytes` | number | yes | File size in bytes (max 500 MB) |

**Allowed content types:** `image/tiff`, `image/geotiff`, `application/geo+json`, `application/vnd.las`, `application/vnd.laszip`, `application/octet-stream`, `application/zip`, `application/x-zip-compressed`, `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/pdf`, `image/jpeg`, `image/png`

### Response `200 OK`

```json
{
  "data": {
    "upload_id": "uuid",
    "upload_url": "https://storage.supabase.co/...",
    "expires_at": "2026-03-15T14:00:00.000Z"
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing field, invalid content type, or file too large |
| 403 | User does not own the survey's parcel |
| 404 | Survey not found |
| 500 | Storage or database error |

---

## upload-complete

Mark a file upload as complete and trigger server-side validation.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/functions/v1/upload-complete` |
| **Auth** | Bearer token (user must own the upload's survey) |

### Request body

```json
{
  "upload_id": "uuid"
}
```

### Response `200 OK`

```json
{
  "data": {
    "upload_id": "uuid",
    "status": "validating",
    "message": "Upload marked as complete. Validation has been triggered."
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing `upload_id` |
| 403 | User does not own this upload |
| 404 | Upload not found |
| 409 | Upload is not in `pending` state |
| 500 | Database or worker communication error |

---

## companion-chat

Stream a conversation with the BeetleSense Forest Advisor (RAG + Claude). Returns Server-Sent Events.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/functions/v1/companion-chat` |
| **Auth** | Bearer token |

### Request body

```json
{
  "message": "Hur identifierar jag granbarkborre?",
  "session_id": "uuid",
  "parcel_id": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | yes | User message (max 4 000 chars) |
| `session_id` | string | no | Existing session UUID (creates new if omitted) |
| `parcel_id` | string | no | Parcel UUID for context-aware retrieval |

### Response `200 OK` (SSE stream)

Content-Type: `text/event-stream`

```
event: session
data: {"session_id": "uuid"}

event: delta
data: {"text": "Granbarkborren"}

event: delta
data: {"text": " (Ips typographus)..."}

event: done
data: {"done": true, "sources": ["Skogsstyrelsen 2024", "SLU Research Brief"]}
```

**SSE event types:**

| Event | Description |
|-------|-------------|
| `session` | Sent first, contains the `session_id` |
| `delta` | Incremental text chunk from the assistant |
| `done` | Final event with cited sources |
| `error` | Stream error (non-fatal) |

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid `message` |
| 404 | Session not found or access denied |
| 500 | Internal error |
| 502 | Claude API unavailable |

---

## survey-status

Get processing status and per-module progress for a survey.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/functions/v1/survey-status?survey_id=<uuid>` |
| **Auth** | Bearer token (user must own the survey's parcel) |

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `survey_id` | string | yes | UUID of the survey |

### Response `200 OK`

```json
{
  "data": {
    "survey": {
      "id": "uuid",
      "name": "Spring Survey 2026",
      "status": "processing",
      "created_at": "2026-03-10T08:00:00Z",
      "started_at": "2026-03-10T08:05:00Z",
      "completed_at": null,
      "parcel": {
        "id": "uuid",
        "fastighets_id": "VARNAMO KARDA 1:5",
        "name": "Norra skiftet"
      }
    },
    "uploads": [
      {
        "id": "uuid",
        "filename": "drone-001.tiff",
        "content_type": "image/tiff",
        "file_size_bytes": 52428800,
        "status": "validated",
        "uploaded_at": "2026-03-10T08:02:00Z"
      }
    ],
    "modules": [
      {
        "id": "uuid",
        "module": "bark_beetle_detection",
        "status": "completed",
        "progress": 100,
        "started_at": "2026-03-10T08:05:00Z",
        "completed_at": "2026-03-10T08:12:00Z",
        "error_message": null
      }
    ],
    "progress": {
      "aggregate_percent": 67,
      "completed": 2,
      "failed": 0,
      "total": 3
    }
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing `survey_id` |
| 403 | User does not own the survey's parcel |
| 404 | Survey not found |

---

## satellite-timeseries

Retrieve NDVI time-series data for a parcel from Sentinel-2 satellite observations.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/functions/v1/satellite-timeseries` |
| **Auth** | Bearer token (user must own the parcel) |

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `parcel_id` | string | yes | UUID of the parcel |
| `date_from` | string | no | Start date `YYYY-MM-DD` |
| `date_to` | string | no | End date `YYYY-MM-DD` |

### Response `200 OK`

```json
{
  "data": {
    "parcel_id": "uuid",
    "count": 24,
    "dates": ["2025-04-01", "2025-04-15", "..."],
    "ndvi_mean": [0.72, 0.74, "..."],
    "ndvi_min": [0.58, 0.61, "..."],
    "ndvi_max": [0.85, 0.87, "..."]
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing `parcel_id` or invalid date format |
| 403 | User does not own this parcel |
| 404 | Parcel not found |
| 500 | Database query error |

---

## alerts-subscribe

Store a Web Push subscription and set notification preferences.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/functions/v1/alerts-subscribe` |
| **Auth** | Bearer token |

### Request body

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "BASE64...",
      "auth": "BASE64..."
    }
  },
  "preferences": {
    "survey_complete": true,
    "new_job": true,
    "report_shared": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscription` | object | yes | Standard Web Push PushSubscription |
| `subscription.endpoint` | string | yes | Must start with `https://` |
| `subscription.keys.p256dh` | string | yes | Client public key |
| `subscription.keys.auth` | string | yes | Auth secret |
| `preferences.survey_complete` | boolean | yes | Notify when a survey finishes |
| `preferences.new_job` | boolean | yes | Notify on new drone pilot jobs |
| `preferences.report_shared` | boolean | yes | Notify when a report is shared |

### Response `200 OK`

```json
{
  "data": {
    "subscription_id": "uuid",
    "status": "created",
    "preferences": {
      "survey_complete": true,
      "new_job": true,
      "report_shared": false
    }
  }
}
```

`status` is `"created"` for new subscriptions or `"updated"` if the endpoint already existed (keys are refreshed).

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid subscription object or missing preference fields |
| 401 | Missing or invalid auth token |
| 500 | Database error |

---

## Common patterns

### Error response format

All endpoints return errors in this shape:

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_CODE",
  "details": {}
}
```

### CORS

All endpoints handle `OPTIONS` preflight requests and return appropriate `Access-Control-Allow-*` headers.

### Authentication flow

1. Sign up or log in via Supabase Auth (`/auth/v1/token?grant_type=password`)
2. Use the returned `access_token` as `Authorization: Bearer <token>`
3. Include `apikey: <anon-key>` header on all requests
