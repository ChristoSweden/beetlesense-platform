# BeetleSense User Guide

## Getting Started

### Signing Up

1. Visit [beetlesense.ai](https://beetlesense.ai) and click **Create Account**.
2. Enter your email address and choose your role:
   - **Forest Owner** (Skogsagare) — manage your forest, order surveys, view reports.
   - **Drone Pilot** (Dronaroperator) — browse and accept survey flight jobs.
   - **Inspector** (Inspektorer) — perform timber valuations and share reports with clients.
3. Check your inbox for a magic link, or set a password directly.
4. Complete your profile: name, phone, and (for owners) your preferred region.

### Installing as a PWA

BeetleSense works as a native-like Progressive Web App on any device:

**Android (Chrome):** Tap the "Add to Home screen" banner, or open the browser menu and tap "Install app".

**iOS (Safari):** Tap the Share button, then scroll down and tap "Add to Home Screen".

**Desktop (Chrome/Edge):** Click the install icon in the address bar and click Install.

### Offline mode

BeetleSense caches key data for offline use:
- Your dashboard, parcel list, and recent survey results remain accessible.
- Actions performed offline (photos, chat messages) are queued and synced when connectivity returns.
- A banner at the top of the screen indicates offline status.

### Switching language

BeetleSense supports **Swedish** (sv) and **English** (en):
1. Go to **Settings** from the sidebar.
2. Find the **Language** (Sprak) setting.
3. Select your preferred language -- the interface updates immediately.
4. Your preference is remembered across sessions.

---

### Adding Your First Parcel

1. Navigate to **Parcels** (Fastigheter) in the sidebar.
2. Click **Add Parcel** (Lagg till fastighet).
3. Enter your Swedish property designation (fastighetsbeteckning), for example: `Varnamo Horda 1:23`.
4. BeetleSense fetches the official boundary from Lantmateriet and displays it on the map.
5. Optionally give the parcel a friendly label (e.g., "Nordskogen").

---

## Creating Your First Survey

1. Go to **Surveys** (Inventeringar) and click **New Survey** (Ny inventering).
2. Select the parcel you want surveyed.
3. Choose analysis modules:
   - **Bark Beetle Detection** — identifies Ips typographus infestations from aerial and satellite imagery.
   - **Forest Health Index** — overall canopy health assessment using NDVI trends.
   - **Timber Volume** — estimates standing volume (m3sk) from LiDAR + imagery fusion.
   - **Biodiversity** — detects deadwood, water features, and key habitats.
   - **Storm Damage** — post-storm assessment of windthrown areas.
   - **Growth Forecast** — 5-year growth projection using Swedish site index curves.
4. Choose priority: **Normal** (processed within 48h) or **Urgent** (expedited, additional cost).
5. Click **Confirm** — the survey enters the processing pipeline.

### Survey Status Tracker

Each survey progresses through these stages:
- **Queued** — waiting for available processing capacity.
- **Data Collection** — satellite imagery fetched, open data synced, or drone job posted.
- **Processing** — AI models analyzing your data.
- **Quality Check** — automated confidence validation.
- **Complete** — results ready for viewing.

You will receive push notifications (if enabled) at each stage transition.

---

## Understanding Your Results

Survey results are displayed on your **Dashboard** as map overlays and summary cards.

### Map Overlays
- **Red zones** — high-risk bark beetle areas (click for details).
- **Yellow zones** — moderate risk, recommended for monitoring.
- **Green zones** — healthy forest.
- Each zone includes a confidence percentage and the data sources that contributed to the assessment.

### Reports
Navigate to **Reports** (Rapporter) to view or download PDF reports. Each report includes:
- Executive summary in plain Swedish.
- Detailed per-module findings with maps.
- Recommended actions (sorted by urgency).
- Data sources and methodology transparency.

---

## Using the AI Companion

The AI Companion (AI-assistenten) is your personal forestry advisor, available throughout the app.

### How to Use
1. Click the chat icon in the bottom-right corner (or press `Ctrl+K`).
2. Ask any forestry question in Swedish or English:
   - "How do I identify bark beetle damage?"
   - "What does my NDVI trend mean?"
   - "When is the best time to thin my stand?"
3. The companion streams its response in real time with citations to authoritative sources (Skogsstyrelsen, SLU, etc.).

### Context-Aware Questions
When viewing a specific parcel or survey, click **Ask about this** (Fraga om detta) to pre-fill context. The companion will answer using your actual parcel data.

---

## Smartphone Capture Guide

BeetleSense supports ground-level photo capture from your smartphone for enhanced analysis.

### Setup
1. Open BeetleSense on your phone (it works as a PWA — add to home screen for the best experience).
2. Navigate to your survey and tap **Capture Photos** (Fota).

### Capture Tips
- **Minimum 20 photos** for meaningful ground-truth data.
- **Walk in a zigzag pattern** through the stand, photographing tree trunks at chest height.
- **Include close-ups** of any suspected beetle entry holes (bore dust on bark).
- **GPS is automatic** — each photo is geotagged.
- The quality gate will tell you if a photo is too blurry, too dark, or a duplicate.

### Offline Support
Photos can be captured offline and will sync automatically when you regain connectivity. A sync indicator shows queued uploads.

---

## For Drone Pilots: Joining the Network

### Application Process
1. Sign up with the **Drone Pilot** role.
2. Complete the application form:
   - Drone model and sensor specifications.
   - Operating certificate / EASA certification number.
   - Insurance documentation.
   - Portfolio or flight log (optional).
3. Applications are reviewed within 3 business days.

### Browsing and Accepting Jobs
1. Navigate to the **Job Board** (Uppdragstavlan).
2. Filter by distance from your location, payment amount, or deadline.
3. Click a job to see details: parcel location, required flight parameters, deliverables.
4. Click **Accept Job** — you'll see a pre-flight checklist:
   - Weather check (wind speed, precipitation).
   - Battery charge verification.
   - Flight plan review (altitude, overlap, area).
   - Legal airspace clearance confirmation.
5. After flying, upload your data through the **Upload** page. Supported formats: JPEG, TIFF, LAZ/LAS.

### Earnings
Track your completed jobs and payments on the **Earnings** (Intakter) page.

---

## For Inspectors: Creating Valuation Reports

### Getting Started
Inspector accounts are activated immediately upon registration.

### Creating a Valuation Report
1. Navigate to **Valuations** (Varderingar) and click **New Report** (Ny rapport).
2. Select a client and their parcel.
3. BeetleSense pre-fills the report with available survey data:
   - Standing timber volume estimates.
   - Species composition.
   - Health and damage assessments.
4. Add your professional observations, adjust values, and add photos.
5. Click **Generate** — a PDF report is created.

### Sharing with Clients
1. Open a completed report.
2. Click **Share** (Dela) — the client receives a notification and can view the report in their BeetleSense account.
3. Reports can also be downloaded as PDF for offline sharing.
