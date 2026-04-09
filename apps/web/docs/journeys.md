# BeetleSense — User Journey Maps

## Primary Journey: Forest Owner (Gunnar)

### Stage 1: Landing (0–60 seconds)
- Arrives at beetlesense.ai via Google search ("bark beetle Sweden", "barkborrar skog")
- Sees hero with his outcome: "Know before your trees die"
- Reads 3 feature highlights (satellite monitoring, beetle risk score, AI companion)
- Clicks "Try Demo" or "Create Free Account"

### Stage 2: First session — Demo mode (60 seconds – 2 minutes)
- Demo mode activates immediately — no signup gate
- Demo parcel loads on the map (Dalarna region, realistic risk data)
- Sees beetle risk score (e.g. MODERATE — shown in amber)
- Views one alert notification
- Explores Wingman AI companion with a sample question

### Stage 3: Signup (2–3 minutes)
- Prompted to create an account to save progress and add own parcel
- Email + magic link — no password friction
- Lands on onboarding flow

### Stage 4: Onboarding — First Win (3–5 minutes)
- Step 1: Enter fastighets-ID → parcel boundary loads on map
- Step 2: First beetle risk score generated for their parcel
- Step 3: Enable notifications (optional)
- Step 4: Short "what's next" screen with 3 next actions

### Stage 5: Repeat use (weekly)
- Returns to check satellite data after weather events (storms, warm spells)
- Creates first survey when risk score turns amber or red
- Uses Wingman to interpret results
- Downloads PDF report for insurance or bank meeting

### Stage 6: Retention hook
- Weekly risk digest email (automated)
- Alert fires when beetle risk changes level
- Community forum — sees neighbour activity in same region

---

## Primary Journey: Drone Pilot (Maja)

### Stage 1: Landing
- Arrives via forestry professional networks or word of mouth
- Sees pilot-specific messaging ("Turn your drone licence into a forest intelligence business")
- Clicks "Pilot signup"

### Stage 2: Pilot onboarding (< 3 minutes)
- Drone licence verification (document upload)
- Service area selection (county level)
- Equipment declaration

### Stage 3: First win — Job board
- Sees available missions in her region with: forest size, beetle risk level, required drone spec, estimated pay
- Applies with one tap

### Stage 4: Mission lifecycle
- Receives mission assignment notification
- Reviews mission brief (parcel map, access notes, required modules)
- Completes flight, uploads images in field via mobile
- Processing status visible in real time
- Invoice generated automatically on completion

---

## 5 Edge Cases & Drop-Off Risks

### Edge Case 1: Fastighets-ID lookup fails
**Risk**: Parcel not found (PARCEL-002/004) — user gives up immediately
**Fix**: Show clear error "We couldn't find this property ID. Check the format: 12:3456 or contact Lantmäteriet." Offer manual boundary draw as fallback. Never show a blank state.

### Edge Case 2: User skips onboarding
**Risk**: Lands on empty dashboard with no demo data — sees nothing useful
**Fix**: Dashboard must always load demo data if no parcel is registered. Add a persistent "Add your first parcel" banner above demo content — never hide it.

### Edge Case 3: Satellite data not yet available for user's region
**Risk**: Parcel registers but no satellite data loads — user thinks the product is broken
**Fix**: Show "Satellite data for this region updates every 5 days. Your first analysis will be ready by [date]." with an email notification opt-in.

### Edge Case 4: User on slow 4G in the field
**Risk**: Map tiles don't load, app appears broken
**Fix**: MAP-001 error state with "Switch to offline view" option. Skeleton loaders on all map components. Critical data (risk score, alerts) loads before map tiles.

### Edge Case 5: Non-Swedish speaker trying the app
**Risk**: Swedish forest owner shares with a non-Swedish colleague/buyer — they can't navigate
**Fix**: Language toggle is visible in the top bar on the landing page and all app screens. Default to browser language detection. English is fully implemented via i18next.
