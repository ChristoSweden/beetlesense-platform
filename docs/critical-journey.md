# BeetleSense.ai — Critical User Journey: Forest Owner

This document maps the complete critical path for a forest owner (persona: Erik) from first contact to meaningful value delivery. This is the journey that determines whether a customer stays or leaves.

---

## The Journey

### Step 1: Signup

**What happens**: Erik taps "Kom igång" (Get Started) on the landing page. He enters his email, receives a magic link, and taps it on his phone. He is now logged in with a session.

**Emotional state**: Cautious optimism. He is curious but sceptical. He has signed up for digital tools before and abandoned them. He is giving BeetleSense one chance.

**Key design requirement**: Zero-friction entry. No credit card. No password to remember. Magic link only. The signup form must work flawlessly on a mid-range Android phone in portrait mode. No CAPTCHA — it fails too often on mobile.

**Success criteria**: From landing page to logged-in dashboard in under 60 seconds.

---

### Step 2: Onboarding (Role + Language + First Parcel)

**What happens**: A 3-screen onboarding flow:
1. **Role selection**: "I am a forest owner" (large tappable card with icon). This determines the entire UI layout and feature set.
2. **Language**: Swedish is pre-selected based on browser locale. Erik confirms.
3. **First parcel prompt**: "Add your first forest parcel to get started." Two options: enter a fastighetsbeteckning (Swedish property ID like "Eksjö Fårhult 3:7") or drop a pin on the map.

**Emotional state**: Engaged but impatient. He wants to see something relevant to HIS forest, not a generic demo. Every screen that is not about his forest feels like a waste of time.

**Key design requirement**: The fastighetsbeteckning input must have autocomplete powered by Lantmäteriet property search. When he starts typing "Eksjö," matching properties appear. The map pin alternative must work without zooming — use GPS to centre the map on his current location.

**Success criteria**: Onboarding completed in under 2 minutes. Erik sees a map with his property boundary.

---

### Step 3: First Parcel Registered

**What happens**: Erik enters his fastighetsbeteckning. The system:
1. Looks up the property boundary from Lantmäteriet Fastighetskartan
2. Draws the boundary on the map
3. Auto-pulls open data layers: LiDAR DTM/CHM (Lantmäteriet), KNN forest data (Skogsstyrelsen), soil type (SGU), recent weather (SMHI)
4. Shows a parcel summary card: area (ha), estimated dominant species, average tree height, land cover breakdown
5. Displays the latest Sentinel-2 satellite image as the base layer

**Emotional state**: This is the first "wow" moment. Erik sees his actual forest on a real map with real data — tree heights, species mix, terrain — all without uploading anything. He thinks: "They already know things about my forest."

**Key design requirement**: The open data pull must feel instant (< 3 seconds for the boundary; background-load the rest with skeleton placeholders). The parcel summary must use plain Swedish, not technical jargon. "Granskog, medelålder ca 65 år, 18 m medelhöjd" — not "EPSG:3006 CHM raster mean: 18.2 m."

**Success criteria**: Erik sees his property boundary and at least 3 data points about his forest within 10 seconds of entering his property ID.

**This is the "first win" moment.** Erik gets value before spending any money or uploading any data. The platform already knows his forest better than he expected. This is what converts a sceptic into a user.

---

### Step 4: First Survey Ordered

**What happens**: Erik taps "Beställ undersökning" (Order Survey). He sees a module picker:
- Beetle Damage Detection (recommended, highlighted)
- Tree Count Inventory
- Species Identification
- Wild Boar Damage
- Animal Inventory

Each module has a one-sentence plain-language description and a price. Erik selects "Beetle Damage Detection" (his primary concern after last year's loss).

He chooses a data collection method:
- **Option A**: "I'll take photos with my phone" (free, lower confidence)
- **Option B**: "Send a drone pilot" (paid, highest confidence + e-nose)
- **Option C**: "I have drone data to upload" (intermediate)

Erik picks Option B. The system shows available drone pilots in his area, estimated scheduling, and total cost. He confirms with a single tap.

**Emotional state**: Slight anxiety about cost. But also excitement — he is doing something proactive about beetle risk for the first time. He feels in control.

**Key design requirement**: Module descriptions must avoid jargon. The price must be visible before confirmation. "Send a drone pilot" must feel like ordering a taxi — not like procurement. No multi-step checkout. One confirmation screen, one tap.

**Success criteria**: From "Order Survey" tap to confirmed order in under 90 seconds.

---

### Step 5: Waiting for Results

**What happens**: Erik receives a confirmation push notification. His dashboard shows a status tracker:
1. Order received (done)
2. Pilot assigned (in progress / done)
3. Flight completed (pending)
4. Data processing (pending)
5. Results ready (pending)

He can check status anytime. When the pilot is assigned, he gets a notification with the pilot's name and estimated flight date. When the flight is done, another notification. When processing starts, another.

**Emotional state**: Anticipation mixed with impatience. This is the most dangerous phase for churn — if he forgets about BeetleSense during the wait, he may never come back. Notifications keep him engaged.

**Key design requirement**: Status updates must be push notifications (not just in-app). Each status change should include a human-readable message: "Anna har flugit över din skog idag. Datan bearbetas nu." (Anna flew over your forest today. Data is being processed now.)

**Success criteria**: Erik checks his dashboard at least once during the wait. Processing completes within the 24-hour SLA.

---

### Step 6: Results Viewed

**What happens**: Erik gets a push notification: "Dina resultat är klara!" (Your results are ready!). He opens the app and sees:

1. **Hero summary**: A traffic-light indicator (green / yellow / red) for overall forest health. For Erik's first survey, perhaps: "Gul — Tidig barkborreaktivitet upptäckt i ett delområde." (Yellow — Early bark beetle activity detected in one sub-area.)
2. **Map view**: His parcel with a heat map overlay showing beetle damage probability. One area glows orange.
3. **Detail card**: Tapping the orange zone shows: severity grade, estimated affected area (ha), confidence score, satellite NDVI trend (showing stress onset 3 weeks before the drone flight).
4. **Action recommendations**: "Ta bort angripna träd inom 14 dagar. Kontakta Skogsstyrelsen för anmälan." (Remove affected trees within 14 days. Contact Skogsstyrelsen for reporting.)
5. **PDF report**: Download button for the full branded report.

**Emotional state**: Mixed. Relief that most of the forest is green. Alarm about the orange zone. But also empowerment — he caught it early this time. He knows exactly where to go, what to do, and how urgent it is. He feels: "This is what I needed last year."

**Key design requirement**: The traffic-light summary must be the first thing Erik sees — not the map, not the data table. Lead with the answer, not the evidence. The map is for "show me where." The action recommendations are for "tell me what to do." All in Swedish. All in sentences, not bullet points of technical parameters.

**Success criteria**: Erik understands his forest health status within 5 seconds of opening the results. He can explain the result to his wife at dinner without jargon.

---

### Step 7: AI Companion Consulted

**What happens**: Erik taps "Fråga skogsexperten" (Ask the Forest Expert) — a persistent button on the results page. The AI Companion opens as a chat panel. Erik types (or speaks via voice input):

"Hur allvarligt är det här? Kan det sprida sig till resten av skogen?"

The Companion responds in plain Swedish:
> "Baserat på din undersökning den 15 mars har jag identifierat tidig barkborreaktivitet på 2,3 hektar i den nordöstra delen av din skog. Enligt forskning från SLU (2023) sprider sig granbarkborren snabbast i maj-juni under varma, torra förhållanden. Med nuvarande väderprognos från SMHI rekommenderar jag åtgärd inom 14 dagar. Om du väntar 30 dagar uppskattar jag att det drabbade området kan växa till 5-8 hektar, med ett potentiellt virkesvärdesförlust på ca 120 000-200 000 kr."
>
> *Källor: SLU (2023), SMHI väderdata, din BeetleSense-undersökning 15 mars 2026*

**Emotional state**: This is the peak emotional moment. Erik is talking to a forest expert — in Swedish, on his phone, in his kitchen — about HIS specific forest, with real data and real research citations. He feels heard, informed, and empowered. This is the moment BeetleSense becomes indispensable.

**Key design requirement**: The Companion must respond in under 5 seconds (first token). It must ALWAYS cite sources. It must use the customer's own survey data (Layer 3) combined with research (Layer 1) and regional context (Layer 2). Voice input must work reliably in Swedish. The response must be conversational, not robotic.

**Success criteria**: Erik gets a useful, cited, personalised answer to his question. He asks at least one follow-up question.

---

## Emotional Arc Summary

```
Step 1 (Signup)      → Cautious optimism          ░░░░░░░░░░
Step 2 (Onboarding)  → Impatient, engaged          ░░░░░░░░░
Step 3 (Parcel)      → Surprised delight  ★         ░░░░░░░░░░░░░░
Step 4 (Order)       → Nervous excitement            ░░░░░░░░░░░
Step 5 (Waiting)     → Impatient, at risk of churn   ░░░░░░░
Step 6 (Results)     → Relief + alarm + empowerment   ░░░░░░░░░░░░░
Step 7 (Companion)   → Trust + indispensable  ★★      ░░░░░░░░░░░░░░░░
```

**First Win**: Step 3 — parcel registered, open data visible, Erik's forest is on the screen with real data.
**Peak Value**: Step 7 — AI Companion gives personalised, cited, actionable advice about Erik's specific forest.

---

## Eight Real-World Edge Cases

### Edge Case 1: Wrong Property ID Input

**Scenario**: Erik types "Eksjö Fåhult" but misspells it as "Eksjö Fårhalt" or enters a fastighetsbeteckning format the system does not recognise (e.g., without the colon: "Eksjö Fårhult 37" instead of "3:7").

**Required behaviour**:
- Fuzzy matching on the property search API. Show the 3 closest matches: "Menade du: Eksjö Fårhult 3:7?"
- If no match at all, show a friendly error in Swedish: "Vi kunde inte hitta den fastigheten. Kontrollera stavningen eller peka på kartan istället." (We couldn't find that property. Check the spelling or point on the map instead.)
- Always offer the map-pin fallback. Never dead-end.

**Error code**: `PARCEL-001` (Property ID not found)

---

### Edge Case 2: Slow or No Connection in the Forest

**Scenario**: Erik is standing in his forest with 1 bar of EDGE/2G coverage. He opens the app to check his results or take a smartphone photo.

**Required behaviour**:
- Service worker caches the last-loaded project data, map tiles, and results. Erik can view his latest results offline.
- Smartphone capture works offline: photos are queued in IndexedDB with GPS metadata and uploaded when connectivity returns.
- A clear offline indicator appears at the top: "Offline — dina ändringar sparas och synkas automatiskt." (Offline — your changes are saved and sync automatically.)
- If he tries to order a new survey offline, show: "Du behöver internetanslutning för att beställa. Vi sparar ditt val och slutför när du är online igen." (You need an internet connection to order. We'll save your choice and complete when you're online again.)

**Error code**: `UI-003` (Offline mode — action queued)

---

### Edge Case 3: Session Expiry Mid-Task

**Scenario**: Erik starts filling in a survey order, gets distracted by a phone call, comes back 45 minutes later, and taps "Confirm." His JWT has expired.

**Required behaviour**:
- NEVER discard form state on session expiry. Store the complete form state in local storage before every meaningful interaction.
- Silently refresh the token if the refresh token is still valid.
- If refresh fails, show a login screen with the message: "Din session gick ut. Logga in igen — din beställning är sparad." (Your session expired. Log in again — your order is saved.)
- After re-authentication, automatically restore the form state and return Erik to exactly where he was. One tap to confirm.

**Error code**: `AUTH-002` (Session expired, state preserved)

---

### Edge Case 4: Wrong File Type Uploaded

**Scenario**: Anna (drone pilot) or Erik tries to upload a file the system does not accept — a .docx report, a .png screenshot instead of a GeoTIFF, or a corrupt ZIP file.

**Required behaviour**:
- Validate file type on the client side BEFORE upload starts. Accepted types displayed clearly: "GeoTIFF, JPEG, PNG, LAS, LAZ, ZIP (containing GeoTIFF/LAS)."
- If validation fails, show immediately: "Den här filtypen stöds inte. Vi accepterar: GeoTIFF, JPEG, PNG, LAS, LAZ, ZIP."
- If a ZIP is uploaded and contains unsupported files, validate server-side after extraction and return a specific error listing which files were rejected and which were accepted.
- Never silently drop files. Always tell the user exactly what happened.

**Error code**: `UPLOAD-002` (Unsupported file type)

---

### Edge Case 5: Back Button Breaks the Flow

**Scenario**: Erik is on step 3 of onboarding, presses the browser/phone back button, and lands on step 1 or the landing page. He tries to go forward again and gets confused.

**Required behaviour**:
- Onboarding state is persisted to local storage after each step. The back button should navigate to the previous onboarding step, not out of the flow.
- Use the History API to push each onboarding step as a route (`/onboarding/role`, `/onboarding/language`, `/onboarding/parcel`).
- If Erik leaves onboarding entirely (closes app, navigates away), when he returns, resume from the last completed step. Show: "Välkommen tillbaka! Du var på väg att lägga till din första skog." (Welcome back! You were about to add your first forest.)
- Never make the user repeat a completed step.

**Error code**: N/A (UX handling, no error state)

---

### Edge Case 6: Skips Onboarding

**Scenario**: Erik closes the onboarding flow after role selection but before registering a parcel. Maybe he was interrupted, or maybe the parcel input confused him. He comes back to the app later.

**Required behaviour**:
- The dashboard renders even without a parcel, but it is nearly empty. Show a prominent, friendly prompt: "Du har inte lagt till någon skog ännu. Lägg till din första skog för att komma igång!" (You haven't added any forest yet. Add your first forest to get started!) with a single action button.
- Do NOT re-run the full onboarding wizard. Drop directly into the "Add parcel" screen (step 3 only).
- The prompt should appear every time he opens the app until he adds a parcel. It should not be dismissible permanently — only dismissible until next session.
- Track this in analytics as "onboarding_incomplete" with the drop-off step.

**Error code**: N/A (Onboarding incomplete state)

---

### Edge Case 7: Returns After a Week

**Scenario**: Erik signed up, registered a parcel, saw his open data, but did not order a survey. A week later he opens the app again. He has forgotten where he was.

**Required behaviour**:
- Dashboard shows his parcel with the latest satellite data (auto-refreshed).
- A contextual nudge appears: "Det har gått en vecka sedan du la till Fårhult 3:7. Vill du beställa en undersökning för att se hur din skog mår?" (It's been a week since you added Fårhult 3:7. Want to order a survey to see how your forest is doing?)
- If new satellite imagery has been captured since his last visit, highlight it: "Ny satellitbild tillgänglig (17 mars). NDVI ser stabilt ut." (New satellite image available (17 March). NDVI looks stable.)
- The AI Companion could offer a proactive greeting: "Hej Erik! Jag har hållit koll på din skog. Vill du att jag sammanfattar vad som hänt sedan sist?" (Hi Erik! I've been keeping an eye on your forest. Want me to summarise what's happened since last time?)
- Never show a cold, empty state to a returning user.

**Error code**: N/A (Re-engagement state)

---

### Edge Case 8: Keyboard-Only User

**Scenario**: Magnus (inspector) navigates the entire platform using keyboard only — Tab, Enter, arrow keys, Escape. He does this because it is faster for him on desktop with two monitors. Some users may also rely on keyboard for accessibility reasons (screen reader, motor impairment).

**Required behaviour**:
- Every interactive element must be reachable via Tab in a logical order.
- Focus indicators must be visible (not the browser default faint outline — use a high-contrast green ring matching the BeetleSense design system).
- The map component (MapLibre GL) must support keyboard navigation: arrow keys to pan, +/- to zoom, Enter to select a feature, Escape to close popups.
- Modal dialogs must trap focus (Tab cycles within the modal, Escape closes it).
- The AI Companion chat input must be focusable via keyboard shortcut (e.g., `/` or `Ctrl+K`).
- All dropdown menus must be navigable with arrow keys.
- Skip-to-content link at the top of every page for screen reader users.
- WCAG 2.1 AA compliance minimum. Test with axe-core in CI.

**Error code**: N/A (Accessibility requirement)
