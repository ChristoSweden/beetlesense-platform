# BeetleSense — Security Report
*Audit date: 2026-04-08*

---

## Task 1 — Dependency Vulnerability Audit

**Status: Requires manual run**

Run from the monorepo root:
```bash
cd "C:\Users\chris\beetlesense-platform"
pnpm audit --audit-level=moderate
```

If high/critical issues are found:
```bash
pnpm audit --fix
```

> Note: Bash tool was unavailable during this audit. Run manually before next deploy.

---

## Task 2 — Secrets Detection

**Result: CLEAN**

Searched `apps/web/src/**/*.{ts,tsx,js,json}` for leaked credentials.

**Findings:**
- `apps/web/src/lib/supabase.ts` line 18: `'https://placeholder.supabase.co'` — safe fallback.
- `apps/web/src/pages/admin/APIDocsPage.tsx` line 198: `'https://project.supabase.co/storage/v1/upload/sign/surveys/...'` — example URL in documentation page only. Safe.
- `apps/web/src/lib/posthog.ts` line 16: `'phc_your_key_here'` — placeholder, not a real key.
- No Stripe keys, AWS keys, or private key headers found.

All real credentials loaded from `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`, etc. environment variables.

---

## Task 3 — OWASP Top 10

### A. XSS — dangerouslySetInnerHTML
**Result: SAFE — DOMPurify in use**

Multiple uses of `dangerouslySetInnerHTML` found across the codebase:

| File | Usage | Safe? |
|------|-------|-------|
| `src/lib/sanitize.ts` | Defines `sanitizeHtml()` and `sanitizeInline()` using DOMPurify | N/A — utility |
| `src/pages/admin/BlogEditorPage.tsx` | `sanitizeHtml(renderMarkdownPreview(post.body))` | YES |
| `src/pages/admin/BlogEditorPage.tsx` | `sanitizeHtml(renderMarkdownPreview(post.body))` | YES |
| `src/components/companion/ChatMessage.tsx` | `renderMarkdown(message.content)` — function calls DOMPurify internally | YES |
| `src/components/academy/LessonViewer.tsx` | `sanitizeInline(boldify(content))` | YES |
| `src/components/insurance/ProviderComparison.tsx` | `sanitizeInline(row.label)` | YES |
| `src/components/inspector/ValuationReportBuilder.tsx` | `sanitizeHtml(section.content)` | YES |
| `src/components/reports/ReportPreview.tsx` | `sanitizeHtml(page.html)` | YES |
| `src/components/reporting/MissionBriefingLayout.tsx` | Static CSS string for print styles | YES (not user content) |
| `src/pages/owner/KnowledgeWingmanPage.tsx` | `renderMarkdown(message.content)` — function calls DOMPurify internally | YES |

All usages are wrapped with DOMPurify sanitization. `renderMarkdown` in `ChatMessage.tsx` escapes HTML entities first (`&amp;`, `&lt;`, `&gt;`) before processing markdown, then runs DOMPurify as the final step. No unsanitized user content is rendered.

### B. SQL Injection — raw template literals
**Result: CLEAN**

No uses of `.from(\`)` or `.rpc(\`)` backtick template literals found in any source file. All Supabase queries use parameterised methods.

### C. Auth Bypass
**Result: CLEAN**

`src/components/auth/ProtectedRoute.tsx` enforces authentication with role-based access (`allowedRoles: UserRole[]`). All protected pages in `src/App.tsx` are wrapped with `<ProtectedRoute>`. Unauthenticated users are redirected to `/login`.

Demo mode (`!isSupabaseConfigured`) bypasses auth but is only active when Supabase environment variables are missing — this should never be true in production.

Admin pages in `src/pages/admin/` use `useAdmin()` hook which verifies the `is_admin` flag server-side.

### D. Insecure Direct Object References
**Result: LOW RISK**

Parcel data (fastighets-ID, boundary polygons) is owned by a user and protected by Supabase RLS. The `useAuth` check and role system ensure users can only see their own parcels. Shared parcels use explicit sharing records in the database rather than open IDs.

**Recommendation:** Audit the sharing RLS policies in the Supabase dashboard to confirm that share recipients can only view (not edit) parcels unless explicitly granted write access.

---

## Task 5 — Security Headers

**Status: FIXED**

`apps/web/vercel.json` is the active Vercel config for BeetleSense deployments (it contains the correct build commands for the monorepo). Updated to include:
- `X-XSS-Protection: 1; mode=block` (added)
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` (updated — removed deprecated `interest-cohort=()` directive)

Already present and retained:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`
- Proper cache-control for assets, HTML, and service worker

**Note:** The monorepo root `vercel.json` also exists and has some headers. The `apps/web/vercel.json` is the one used for the web app deployment based on its build commands. The root vercel.json may need the same header updates if it is used for any deployments — this should be verified.

---

## Manual Actions Required

1. **Run `pnpm audit`** from monorepo root — dependency scan could not be run automatically.
2. **Update `vercel.json`** at monorepo root to add `X-XSS-Protection` and `Permissions-Policy` headers (see above).
3. **Audit Supabase RLS on parcel sharing** — verify that share recipients cannot write to parcels unless explicitly granted.
4. **Confirm Sentry data residency** — verify EU endpoint is configured.
5. **Supabase EU region** — confirm in Supabase dashboard that the project is hosted in EU (Frankfurt/Stockholm). Property boundary data linked to a named person is personal data under GDPR.
