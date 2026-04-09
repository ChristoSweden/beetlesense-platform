# BeetleSense — Error Code Reference

*Source: `src/lib/errorCodes.ts`*

Every error in BeetleSense carries a unique structured code: `[MODULE]-[NUMBER]`

## Format
When shown to users: `[Human explanation]. ([ERROR-CODE]) [Specific next action].`

Example: `We couldn't load your data. (DB-001) Refresh the page. If it persists, contact support.`

---

## AUTH — Authentication Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| AUTH-001 | Login failed | We couldn't sign you in. | Check your email and password, then try again. |
| AUTH-002 | Session expired | Your session has expired. | Please sign in again to continue. |
| AUTH-003 | Signup failed | We couldn't create your account. | Check your details and try again. |
| AUTH-004 | Unauthorized | You don't have access to this page. | Contact your admin if you think this is wrong. |
| AUTH-005 | Password reset failed | We couldn't reset your password. | Try again or contact support. |

---

## DB — Database Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| DB-001 | Query failed | We couldn't load your data. | Refresh the page. If it persists, contact support. |
| DB-002 | Save failed | We couldn't save your changes. | Try again in a moment. |
| DB-003 | Delete failed | We couldn't delete that item. | Refresh and try again. |
| DB-004 | Connection lost | Lost connection to the server. | Check your internet and refresh. |
| DB-005 | RLS violation | You don't have permission for this action. | Contact your admin. |

---

## API — Edge Function / External API Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| API-001 | Request failed | Something went wrong with the request. | Try again in a moment. |
| API-002 | Rate limited | Too many requests. | Wait a moment and try again. |
| API-003 | Timeout | The request took too long. | Check your connection and try again. |
| API-004 | Invalid response | We got an unexpected response. | Try again. If it persists, contact support. |
| API-005 | Service unavailable | This service is temporarily unavailable. | We're working on it. Try again shortly. |

---

## UI — Frontend Component Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| UI-001 | Component crash | Something broke on this page. | Refresh the page to continue. |
| UI-002 | Form validation failed | Some fields need your attention. | Check the highlighted fields. |
| UI-003 | Navigation error | We couldn't open that page. | Go back and try again. |
| UI-004 | Render error | This content couldn't be displayed. | Refresh the page. |
| UI-005 | Clipboard failed | Couldn't copy to clipboard. | Try selecting and copying manually. |

---

## MAP — Map / GIS Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| MAP-001 | Tile load failed | Map tiles couldn't load. | Check your connection. Offline maps may be available. |
| MAP-002 | Layer render failed | A map layer couldn't be displayed. | Try toggling the layer off and on. |
| MAP-003 | Geolocation failed | We couldn't find your location. | Enable location services in your browser settings. |
| MAP-004 | WMS layer failed | External map data couldn't load. | The data source may be temporarily down. Try again later. |
| MAP-005 | Coordinate transform failed | Couldn't display this location. | Check that the parcel coordinates are correct. |

---

## PARCEL — Property Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| PARCEL-001 | Registration failed | We couldn't register your parcel. | Check the property ID and try again. |
| PARCEL-002 | Boundary fetch failed | Couldn't load parcel boundaries. | The property registry may be temporarily unavailable. |
| PARCEL-003 | LiDAR fetch failed | Couldn't load terrain data for this parcel. | Try again later — Lantmäteriet may be slow. |
| PARCEL-004 | Parcel not found | This property couldn't be found. | Double-check the fastighets-ID. |
| PARCEL-005 | Satellite pull failed | Couldn't fetch satellite imagery. | Sentinel Hub may be temporarily down. Try again later. |

---

## SURVEY — Survey Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| SURVEY-001 | Survey creation failed | We couldn't create your survey. | Check your inputs and try again. |
| SURVEY-002 | Processing failed | Survey processing encountered an error. | We'll retry automatically. Contact support if it persists. |
| SURVEY-003 | Results load failed | Couldn't load survey results. | Refresh the page. |
| SURVEY-004 | Survey not found | This survey doesn't exist. | Check the URL or go back to your surveys list. |
| SURVEY-005 | Status update failed | Couldn't update survey status. | Try again. |

---

## COMPANION — AI Companion Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| COMPANION-001 | Chat failed | The AI Companion couldn't respond. | Try asking again in a moment. |
| COMPANION-002 | Context too large | Your conversation got too long. | Start a new conversation to continue. |
| COMPANION-003 | Knowledge retrieval failed | Couldn't search the knowledge base. | Try rephrasing your question. |
| COMPANION-004 | Streaming error | The response was interrupted. | Try sending your message again. |
| COMPANION-005 | Domain rejection | I can only help with forestry-related questions. | Ask about forest health, beetles, timber, or your parcels. |

---

## UPLOAD — File Upload Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| UPLOAD-001 | File too large | This file is too large to upload. | Maximum file size is 500 MB. Try a smaller file. |
| UPLOAD-002 | Invalid file type | This file type isn't supported. | Upload TIFF, JPEG, PNG, or GeoJSON files. |
| UPLOAD-003 | Upload failed | The upload didn't complete. | Check your connection and try again. |
| UPLOAD-004 | Presign failed | Couldn't prepare the upload. | Try again in a moment. |
| UPLOAD-005 | Quality check failed | This image didn't pass quality checks. | Ensure good lighting and focus, then retake. |

---

## REPORT — Report Errors

| Code | Message | User Message | Fix Action |
|---|---|---|---|
| REPORT-001 | Generation failed | We couldn't generate your report. | Try again. If it keeps failing, contact support. |
| REPORT-002 | PDF export failed | Couldn't create the PDF. | Try downloading again. |
| REPORT-003 | Email delivery failed | Couldn't send the report by email. | Check the email address and try again. |
| REPORT-004 | Report not found | This report doesn't exist. | Go back to your reports list. |
| REPORT-005 | Template error | There was a problem with the report format. | Contact support — we'll fix this quickly. |

---

## FEED, ADMIN — Other Modules

See `src/lib/errorCodes.ts` for FEED-001–003 and ADMIN-001–003.

---

## Helper Functions

```typescript
import { formatError, getError } from '@/lib/errorCodes';

// Get user-facing string
formatError('PARCEL-004')
// → "This property couldn't be found. (PARCEL-004) Double-check the fastighets-ID."

// Get full error object
getError('SURVEY-002')
// → { code, module, message, userMessage, action }
```
