# BeetleSense — GDPR Data Audit
*Audit date: 2026-04-08*

BeetleSense is a forest intelligence platform for Swedish forest owners.
It processes property data (fastighets-ID, boundary coordinates), satellite
imagery results, and personal identity data. Under Swedish and EU GDPR,
property boundary data linked to a named person is personal data.

This app is also relevant to the EFI ForestWard Observatory Grant (G-01-2026),
which requires explicit, withdrawable consent for data contribution to the
EFI pipeline.

---

## Personal Data Collected

| Category | Specific data | Source |
|----------|--------------|--------|
| Identity | Name, email address | Sign-up / Supabase Auth |
| Property | Fastighets-ID (property registration number) | Parcel onboarding |
| Property | Boundary coordinates (GeoJSON polygons) | Parcel setup / Lantmäteriet import |
| Property | Property name, area (hectares) | User input |
| Survey | Field survey results (health observations, photos) | Survey wizard |
| Satellite | AI analysis results per parcel (beetle forecast, health index) | BeetleSense AI pipeline |
| Carbon | Carbon stock calculations per parcel | Carbon calculator |
| Knowledge | Field notes, voice recordings (if RecordNote used) | Knowledge Wing |
| Documents | Uploaded PDF/image files (felling plans, permits) | Document Vault |
| Behavioural | Login timestamps, feature usage | PostHog analytics |

---

## Where It Is Stored

### Supabase (primary store)
All Supabase data is stored in the EU region. **Verify this in the Supabase dashboard — this is a requirement for Swedish personal data.**

| Table | Data |
|-------|------|
| `auth.users` | Email, password hash |
| `profiles` | Name, role, preferences |
| `parcels` | Fastighets-ID, boundary GeoJSON, name, area |
| `surveys` | Field observations, photos, health scores |
| `satellite_analyses` | AI results, indices, timestamps |
| `carbon_records` | Calculations per parcel |
| `documents` | File metadata (files stored in Supabase Storage) |
| `knowledge_notes` | Field notes, audio file references |
| `notifications` | User notifications |
| `shares` | Who has access to which parcels |

### localStorage / sessionStorage (device)
| Key pattern | Data | Notes |
|-------------|------|-------|
| `beetlesense-*` | User preferences, tour state | Non-sensitive |
| `sb-*` (Supabase) | Auth session token | Standard Supabase pattern |

### Third-party processors

| Service | Data sent | Purpose | EU? |
|---------|----------|---------|-----|
| Supabase | All DB data | Storage + Auth | Verify EU region |
| PostHog | Page events (no property IDs sent by default) | Analytics | Yes (EU endpoint) |
| Sentry | Error logs (stack traces) | Error monitoring | Verify |
| OpenAI / Anthropic (via backend) | Parcel descriptions, survey text for AI features | AI companion | No — US-based |
| Copernicus/Sentinel | Parcel coordinates (for satellite query) | Satellite data | EU |

**Gap — AI Data Transfer:** If AI features (Knowledge Wingman, beetle forecast) send parcel descriptions or property identifiers to OpenAI/Anthropic servers in the US, this is a cross-border data transfer under GDPR Chapter V. This requires either:
- Standard Contractual Clauses (SCCs) in place with the AI provider
- User consent to the transfer
- Data minimisation (strip identifiers before sending)

**Recommendation:** Review what data is sent to AI APIs. Consider anonymising parcel data (replace fastighets-ID with internal UUIDs) in prompts.

---

## Swedish GDPR Specifics (IMY — Integritetsskyddsmyndigheten)

Sweden's data protection authority is IMY (formerly Datainspektionen). Key Swedish specifics:
- Personal number (personnummer) must never be collected unless strictly necessary. BeetleSense does not appear to collect personnummer — confirm this.
- Fastighets-ID linked to a named owner is personal data under Swedish interpretation of GDPR.
- Property boundary data (GPS coordinates) that can identify an individual's land is personal data.
- IMY requires clear lawful basis for processing. For BeetleSense, the lawful basis is **contract** (Art. 6(1)(b)) — the service agreement to provide forest monitoring to the named forest owner.

---

## EFI ForestWard Observatory Grant — Data Consent Requirements

The EFI grant (G-01-2026) requires that any data contributed to the EFI forest monitoring pipeline must be:
1. **Explicitly consented to** — a specific opt-in for EFI data contribution, separate from the app's general terms.
2. **Withdrawable** — users must be able to withdraw EFI data consent at any time, with a process to remove previously contributed data.

**Current status:** No EFI-specific consent mechanism exists in the codebase as of this audit.

**Action required:** Add an EFI Data Contribution consent toggle to Settings. Text suggestion:
> "Contribute anonymised forest health data to the European Forest Institute's ForestWard Observatory. Your property boundaries are never shared — only aggregated, anonymised health indices."
> [Toggle: ON / OFF]

Implement: store consent in `profiles.efi_consent: boolean`, checked before any EFI pipeline calls. Include withdrawal: when disabled, call an EFI API endpoint to request data removal (or note in the EFI agreement that you will handle this manually).

---

## Right to Erasure

There is no "Delete my account" flow visible in the BeetleSense codebase at audit time. A proper erasure flow must:
1. Delete all Supabase rows for the user (parcels, surveys, analyses, documents, notes, shares, profile)
2. Delete all files from Supabase Storage for the user
3. Delete the Supabase Auth record (requires admin SDK or Edge Function)
4. Return a confirmation to the user

**Action required:** Implement a `deleteAccount` function in the settings area, similar to the `deleteAllUserData` function added to Gravity.

---

## Data Retention Policy

No documented retention policy exists for BeetleSense data at time of audit.

**Recommended policy:**
- Active user data: retained until account deletion
- Deleted account data: purged within 30 days
- Satellite analysis results: retained for 3 years (forest management planning cycle)
- Error logs (Sentry): 90 days
- Analytics (PostHog): 12 months

This should be documented in the Privacy Policy (not yet published for BeetleSense).

---

## Manual Actions Required

1. **Verify Supabase project is in EU region** — log in to app.supabase.com, check Project Settings > Infrastructure.
2. **Review AI API data transfers** — audit what is sent to OpenAI/Anthropic. Apply data minimisation and add SCCs to contracts.
3. **Implement EFI consent toggle** in Settings with explicit opt-in wording and withdrawal mechanism.
4. **Implement "Delete my account"** flow (cascade delete + Edge Function for auth record).
5. **Publish Privacy Policy** for BeetleSense covering: data collected, retention, third parties, user rights, contact.
6. **Confirm no personnummer is collected** anywhere in the onboarding or survey flows.
7. **Add Permissions-Policy header** to `vercel.json` (see security-report.md).
8. **Sentry EU data residency** — verify or configure EU data storage in Sentry dashboard.
9. **PostHog EU endpoint confirmed** — `src/lib/posthog.ts` uses `https://eu.i.posthog.com` by default. No action needed.
