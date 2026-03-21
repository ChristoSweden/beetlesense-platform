# BeetleSense.ai — Error Code Reference

Error codes follow the format `[MODULE]-[NUMBER]`. Every user-facing error must use one of these codes. Log entries and API responses include the code, a human-readable description, and suggested fix steps.

---

## AUTH — Authentication & Authorization

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| AUTH-001 | Magic link expired or invalid | User clicked the link more than 10 minutes after it was sent, or clicked it twice | Prompt user to request a new magic link. Check Supabase Auth email delivery latency. |
| AUTH-002 | Session expired, state preserved | JWT expired during an active session (default 1 hour). User was idle or on a slow connection. | Silently refresh using refresh token. If refresh fails, show login screen and restore saved form state from local storage after re-auth. |
| AUTH-003 | Unauthorized role access | User attempted to access a route or API endpoint restricted to a different role (e.g., forest owner trying to access pilot job board) | Return 403. Redirect user to their role-appropriate dashboard. Log the attempt for security monitoring. |
| AUTH-004 | Account not found | Email submitted for login does not match any registered account | Show: "No account found with this email. Would you like to sign up?" Do not reveal whether the email exists for security — use generic wording in production. |
| AUTH-005 | Email verification pending | User signed up but has not clicked the verification link yet | Show: "Please check your email and click the verification link." Offer resend button with rate limit (max 3 per 10 minutes). |
| AUTH-006 | Two-factor authentication failed | Incorrect TOTP code or recovery code entered | Allow 3 attempts, then lock account for 5 minutes. Show remaining attempts. Offer recovery code option. |
| AUTH-007 | Rate limit exceeded on login | More than 10 login attempts in 5 minutes from the same IP or email | Block further attempts for 15 minutes. Show: "Too many login attempts. Please try again in 15 minutes." Alert security monitoring. |

---

## DB — Database Operations

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| DB-001 | Record not found | Query returned no results for the given ID (parcel, survey, profile) | Return 404 with friendly message. Check if the record was soft-deleted. Verify the user has RLS access to the record. |
| DB-002 | Unique constraint violation | Attempted to insert a duplicate record (e.g., registering the same parcel twice) | Detect the constraint name from the Postgres error, show a user-friendly message: "This parcel is already registered." |
| DB-003 | Foreign key constraint violation | Attempted to create a record referencing a non-existent parent (e.g., survey for a deleted parcel) | Verify parent record exists before insert. If parent was deleted, inform user: "The parcel associated with this survey no longer exists." |
| DB-004 | Connection pool exhausted | All database connections in use, new queries cannot be served | Return 503. Retry with exponential backoff (3 attempts). Alert infrastructure team. Check for long-running queries or connection leaks. |
| DB-005 | PostGIS spatial query failed | Invalid geometry, SRID mismatch, or corrupted spatial data | Log the geometry that caused the failure. Return user-friendly message: "We couldn't process the map data for this area. Please try again." Validate SRID is EPSG:3006 before queries. |
| DB-006 | Migration failed | Database migration script encountered an error during deployment | Roll back the migration. Alert engineering. Do not expose migration details to users. Return 503 with "System maintenance in progress." |
| DB-007 | Row-level security denied | RLS policy blocked access to a row the user does not own | Return 403 with generic "Access denied." Log the user ID, table, and attempted operation for audit. Check if RLS policies are correctly configured for the user's role. |

---

## API — Edge Functions & API Layer

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| API-001 | Invalid request body | Request JSON does not match the expected Zod schema (missing required fields, wrong types) | Return 400 with specific validation errors. List which fields failed and why. Client should show inline validation errors on the form. |
| API-002 | Rate limit exceeded | User or IP has exceeded the allowed request rate for the endpoint | Return 429 with `Retry-After` header. Client should show: "Please wait a moment and try again." Log for abuse monitoring. |
| API-003 | External API timeout | A downstream API (Lantmäteriet, Sentinel Hub, SMHI, Claude) did not respond within the timeout window | Return 504. Retry once automatically. If retry fails, return cached data if available, or show: "External data is temporarily unavailable. Your request has been queued." |
| API-004 | External API error | Downstream API returned a non-2xx status | Log the external API name, status code, and response. Return user-friendly fallback. If Lantmäteriet is down, show cached property boundaries. If Claude is down, disable Companion with message. |
| API-005 | Payload too large | Request body exceeds the 6 MB Edge Function limit or the configured maximum | Return 413. Show: "The data you're sending is too large. Please reduce file size or split into multiple uploads." |
| API-006 | CORS rejected | Request origin not in the allowed origins list | Return 403. This should never happen for legitimate users. Log and alert for potential misconfiguration or attack. |
| API-007 | Internal server error | Unhandled exception in an Edge Function | Return 500 with error code and a generic message: "Something went wrong. We've been notified." Log full stack trace. Alert on-call. |

---

## UI — Frontend / User Interface

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| UI-001 | Map failed to load | MapLibre GL initialization failed — WebGL not supported, tile server unreachable, or memory limit exceeded | Show a fallback static image of the area. Display: "Interactive map unavailable. Showing a simplified view." Check browser WebGL support. |
| UI-002 | Service worker registration failed | Browser does not support service workers (very old browser) or HTTPS is not available | Fall back to online-only mode. Show a subtle banner: "Offline mode is not available in this browser." |
| UI-003 | Offline — action queued | User attempted an action that requires network connectivity while offline | Store the action in IndexedDB. Show: "You're offline. This action will complete when you're back online." Show a sync indicator when connectivity returns. |
| UI-004 | Camera access denied | User declined the camera permission prompt, or the device has no camera | Show: "Camera access is needed for photo capture. Please enable it in your browser settings." Provide a manual file upload fallback. |
| UI-005 | Geolocation unavailable | GPS not available or user denied location permission | Allow manual location entry or map pin drop. Show: "Location access is needed for accurate geotagging. You can also place a pin on the map manually." |
| UI-006 | Local storage full | IndexedDB or localStorage quota exceeded (usually from cached offline data) | Prompt user to clear old cached projects. Automatically evict oldest cached data that is not from the current project. |
| UI-007 | Push notification permission denied | User declined push notifications | Show a one-time explanation of why notifications are useful ("Get alerts when your survey results are ready"). Do not re-prompt until next session. Allow enabling later in settings. |

---

## FEED — Data Feed & Open Data Sync

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| FEED-001 | Sentinel-2 tile not available | No cloud-free Sentinel-2 tile available for the requested area and date range | Show the most recent available tile with its date. Display: "Latest cloud-free satellite image is from [date]." Fall back to Sentinel-1 SAR if available. |
| FEED-002 | Lantmäteriet API unavailable | The Lantmäteriet WMS/WFS service is down or returning errors | Use cached property boundaries and LiDAR data. Display data freshness date. Alert the open data sync service to retry. |
| FEED-003 | KNN data missing for parcel | Skogsstyrelsen KNN raster does not cover the requested parcel (rare — edge of coverage or water body) | Show: "Forest inventory data is not available for this area." Offer to proceed with drone/satellite data only. Log the gap for data team review. |
| FEED-004 | Open data sync job failed | The scheduled sync worker encountered an error pulling updated data from an external source | Retry with exponential backoff (max 3 retries). If all retries fail, mark the data source as "stale" in the dashboard. Alert data engineering. |
| FEED-005 | SMHI weather data timeout | SMHI climate/weather API did not respond in time | Use cached weather data. Display: "Weather data may not be current. Last updated: [date]." This is non-critical — proceed with analysis. |
| FEED-006 | LiDAR data processing failed | The LiDAR point cloud from Lantmäteriet could not be processed into DTM/CHM (corrupt file, unexpected format) | Retry download. If corruption persists, fall back to the lower-resolution national DTM (50 m). Log for manual investigation. |
| FEED-007 | Data source licence change | An open data source has changed its licence terms or access requirements | Immediately disable the affected data source. Alert legal/product team. Show users: "This data layer is temporarily unavailable due to a provider change." |

---

## ADMIN — Administration & Account Management

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| ADMIN-001 | Organization not found | Referenced organization ID does not exist or has been deactivated | Return 404. Check if the org was soft-deleted. If user should belong to an org, contact support. |
| ADMIN-002 | Billing plan limit reached | User attempted an action exceeding their plan limits (e.g., Starter plan trying to order a 6th module) | Show the specific limit hit and the plan that would resolve it: "Your Starter plan includes 2 modules per survey. Upgrade to Professional for all modules." |
| ADMIN-003 | Payment failed | Stripe payment intent failed (card declined, insufficient funds, expired card) | Show: "Payment could not be processed. Please check your card details or try a different payment method." Do not expose the specific decline reason from Stripe. |
| ADMIN-004 | Account deactivated | User's account has been deactivated by admin (non-payment, ToS violation) | Show: "Your account is currently inactive. Please contact support at support@beetlesense.ai." Block all actions except viewing support contact. |
| ADMIN-005 | Export limit exceeded | User requested more data exports than their plan allows in the billing period | Show the limit and reset date: "You've used all 5 exports this month. Your limit resets on [date], or upgrade for unlimited exports." |

---

## MAP — Map & Geospatial Display

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| MAP-001 | Tile layer failed to load | Map tile server (Lantmäteriet ortofoto, Sentinel-2 tiles, or vector tiles) is unreachable or returning errors | Fall back to OpenStreetMap base tiles. Show: "High-resolution map tiles are temporarily unavailable." Retry loading the original tiles after 30 seconds. |
| MAP-002 | GeoJSON parsing failed | A GeoJSON layer (parcel boundary, analysis results) contains invalid geometry | Log the invalid GeoJSON. Show the other layers that loaded successfully. Display: "Some map data could not be displayed. We're looking into it." |
| MAP-003 | Coordinate transform failed | Reprojection between SWEREF99 TM (EPSG:3006) and WGS 84 (EPSG:4326) produced invalid coordinates | Log the input coordinates and transformation parameters. Fall back to approximate positioning. Alert engineering — this indicates a data integrity issue. |
| MAP-004 | Layer overlay limit reached | User enabled too many map layers simultaneously, causing performance degradation | Automatically disable the oldest overlay when a new one is added (max 8 concurrent). Show: "Maximum layers reached. Disable a layer to add a new one." |
| MAP-005 | Offline map tiles not cached | User is offline and the requested map area has not been previously loaded | Show: "Map tiles for this area are not available offline. Last cached area shown." Offer to download tiles for offline use when back online. |

---

## SURVEY — Survey Lifecycle

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| SURVEY-001 | No pilots available in region | A drone survey was ordered but no registered, active pilot covers the parcel's geographic area | Show: "No drone pilots are available in your area yet. Would you like to use smartphone capture instead, or be notified when a pilot becomes available?" Queue a notification for when a pilot registers in that region. |
| SURVEY-002 | Pilot assignment timeout | A survey was posted to the job board but no pilot accepted within 48 hours | Re-post with increased visibility. Notify customer: "We're having trouble finding a pilot for your area. We'll keep trying or you can switch to self-upload." |
| SURVEY-003 | Flight cancelled (weather) | Assigned pilot cancelled due to weather conditions (rain, high wind, fog) | Automatically reschedule. Notify customer with new estimated date: "Your drone flight was postponed due to weather. New estimated date: [date]." No charge to customer. |
| SURVEY-004 | Processing SLA breach | Survey results were not delivered within the committed SLA window | Auto-issue credit to customer. Notify customer with apology and updated ETA. Trigger incident review. Alert engineering and operations. |
| SURVEY-005 | Module processing failed | One of the AI analysis modules failed during processing (model error, input data issue) | Retry the failed module (max 3 retries). If all retries fail, deliver partial results with: "Module [name] encountered an error. We're reprocessing. You'll be notified when it's ready." |
| SURVEY-006 | Insufficient image quality | Uploaded drone imagery failed quality validation (blur, resolution, coverage gaps) | Notify uploader with specific issues: "3 images failed quality checks: blurry (IMG_0342), low resolution (IMG_0355), GPS missing (IMG_0361). Please re-upload these images." |
| SURVEY-007 | Survey cancelled by customer | Customer cancelled a survey that was already in progress (pilot assigned or flight completed) | Apply cancellation policy. If pilot was already dispatched, apply partial charge. Confirm cancellation to customer. Release pilot for other jobs. |

---

## COMPANION — AI Companion

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| COMPANION-001 | Claude API unavailable | Anthropic API is down or unreachable | Show: "The Forest Expert is temporarily unavailable. Please try again in a few minutes." Cache the user's message and retry when API recovers. Display recent conversation history from cache. |
| COMPANION-002 | Query rejected by domain classifier | User asked a non-forestry question that the guardrail system flagged | Respond: "I'm specialised in forestry and forest management. I can help with questions about your forest, trees, pests, timber, and related topics. What would you like to know about your forest?" |
| COMPANION-003 | Low-confidence response detected | The hallucination detector flagged the generated response as having low grounding in retrieved sources | Add a visible disclaimer: "I'm not fully confident in this answer. I'd recommend verifying with a certified forest advisor." Flag for human review queue. |
| COMPANION-004 | No relevant sources found | RAG retrieval returned no relevant documents from any of the three knowledge layers | Respond honestly: "I don't have enough information to answer this question reliably. This might be outside my current knowledge, or your forest data may not cover this topic yet." |
| COMPANION-005 | Customer data layer empty | User asks a question that requires Layer 3 (their own survey data) but no surveys have been completed yet | Respond: "I don't have survey data for your forest yet. I can answer general forestry questions, but for personalised advice about your specific parcels, order your first survey." Include a link to the survey order page. |
| COMPANION-006 | Response generation timeout | Claude API did not return a first token within 10 seconds | Show: "The Forest Expert is taking longer than usual. Please wait..." Retry once. If second attempt also times out, show COMPANION-001 message. |
| COMPANION-007 | Conversation history too long | The conversation thread exceeds the context window limit (token budget exhausted) | Automatically summarise older messages and start a fresh context with the summary. Show: "I've summarised our earlier conversation to keep things running smoothly. You can always scroll up to see the full history." |

---

## UPLOAD — File Upload & Processing

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| UPLOAD-001 | Presigned URL generation failed | The S3 presigned URL could not be generated (storage service error, bucket misconfiguration) | Retry once. If retry fails, show: "Upload service is temporarily unavailable. Please try again in a few minutes." Alert infrastructure. |
| UPLOAD-002 | Unsupported file type | User uploaded a file type not in the accepted list (expected: GeoTIFF, JPEG, PNG, LAS, LAZ, ZIP) | Show immediately (client-side validation): "This file type is not supported. Accepted formats: GeoTIFF, JPEG, PNG, LAS, LAZ, ZIP." |
| UPLOAD-003 | File too large | Uploaded file exceeds the maximum allowed size (2 GB for drone data, 50 MB for smartphone photos) | Show before upload starts: "This file is too large ([size]). Maximum size: [limit]. Try compressing the file or splitting it into smaller parts." |
| UPLOAD-004 | Upload interrupted | Network connection dropped during file upload | Store upload progress. When connectivity returns, resume from the last successful chunk (resumable upload via tus protocol). Show: "Upload paused. It will resume automatically when you're back online." |
| UPLOAD-005 | GPS metadata missing | Uploaded image lacks GPS coordinates in EXIF data | Show: "This image has no location data. Please place it on the map manually." Show a map with a pin-drop interface. Allow batch placement for multiple un-geotagged images. |
| UPLOAD-006 | Corrupt or unreadable file | Server-side validation determined the file is corrupt, truncated, or unreadable | Show: "This file appears to be damaged and cannot be processed. Please try uploading the original file again." List the specific files that failed in a batch upload. |
| UPLOAD-007 | Storage quota exceeded | User's storage allocation for their plan has been reached | Show: "Your storage is full ([used] of [limit]). Delete old survey data or upgrade your plan to continue uploading." Link to storage management and plan upgrade pages. |

---

## PARCEL — Parcel Management

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| PARCEL-001 | Property ID not found | The fastighetsbeteckning entered does not match any record in Lantmäteriet | Show fuzzy matches: "Did you mean: [suggestions]?" Offer map-pin fallback: "Or place a pin on the map to define your parcel manually." |
| PARCEL-002 | Parcel boundary fetch failed | Lantmäteriet Fastighetskartan API returned an error or timeout for the requested property | Retry once. If retry fails, offer manual boundary drawing on the map. Show: "We couldn't load the property boundary automatically. You can draw it on the map instead." |
| PARCEL-003 | Parcel already registered | User tried to register a parcel that is already in their account | Show: "This parcel is already in your account. Go to [parcel name] →" with a link. |
| PARCEL-004 | Parcel area exceeds plan limit | The registered parcel exceeds the hectare limit for the user's current plan | Show: "This parcel is [X] ha, which exceeds your plan's [Y] ha limit. Upgrade to Professional or Enterprise to manage larger parcels." |
| PARCEL-005 | Parcel outside supported region | The parcel is located outside Sweden (or outside the currently supported geographic area) | Show: "BeetleSense currently supports forests in Sweden. We're expanding to Finland and Norway soon — sign up for the waitlist." |
| PARCEL-006 | Manual boundary invalid | User drew a parcel boundary on the map that is self-intersecting, too small, or not a valid polygon | Show: "The boundary you drew has an issue: [specific problem]. Please redraw it as a simple shape." Highlight the problematic area on the map. |
| PARCEL-007 | Open data enrichment partial | Some open data layers loaded successfully but others failed for this parcel | Show which layers loaded and which did not: "Property boundary: loaded. LiDAR data: loaded. Forest inventory (KNN): unavailable for this area." Proceed with available data. |

---

## REPORT — Report Generation

| Code | Description | Likely Cause | Fix Steps |
|---|---|---|---|
| REPORT-001 | PDF generation failed | Puppeteer HTML-to-PDF rendering encountered an error (memory, timeout, template error) | Retry once. If retry fails, offer raw data download: "PDF report is being regenerated. In the meantime, you can view results in the dashboard." Alert engineering. |
| REPORT-002 | Report data incomplete | One or more required data sections are missing from the report (module results, satellite context, parcel metadata) | Generate report with available data. Mark missing sections clearly: "[Section: Satellite Context] — Data unavailable. This section will be added when data becomes available." |
| REPORT-003 | Email delivery failed | Report email could not be delivered (invalid email, mailbox full, spam filter) | Show in-app notification: "We couldn't send the report to [email]. You can download it here." Offer to update email address. |
| REPORT-004 | Report language not available | User requested a report in a language not yet supported (e.g., German before v2.1) | Show: "Reports in [language] are coming soon. This report is available in Swedish and English." Generate in the fallback language. |
| REPORT-005 | Inspector template validation failed | An inspector-format report failed validation against Skogsstyrelsen guidelines (missing required fields) | List the specific missing fields. Prompt the inspector to provide the missing data or override with a justification note. Do not deliver an incomplete valuation report. |
