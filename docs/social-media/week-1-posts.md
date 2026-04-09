# BeetleSense — Week 1 Social Media Posts

---

## Monday: Research Spotlight

### Post

**🔬 Did you know? Bark beetles in southern Sweden may now produce TWO generations per year.**

Jönsson et al. (2012) modeled the impact of climate warming on Ips typographus voltinism. Their Growing Degree-Day model shows that at 557 DD (base 5°C), the first swarming event begins. At 1,100 DD, a second generation becomes viable.

In 2025, Kronoberg county accumulated over 1,050 DD for the first time — meaning bivoltine beetle activity is no longer theoretical. It's happening.

BeetleSense tracks GDD accumulation in real-time using SMHI weather data and alerts forest owners before swarming thresholds are reached.

📄 Jönsson, A.M. et al. (2012). Modelling the potential impact of climate change on Ips typographus voltinism. Climatic Change, 109, 695–718.

🔗 Try BeetleSense: beetlesense.ai

#BeetleSense #BarkBeetle #Granbarkborre #ForestIntelligence #ClimateChange #Forestry #RemoteSensing

### Image Prompt (NotebookLM/NanoBanana)
Clean infographic style, forest green and white palette. Show a simple temperature timeline from April to September with two peaks labeled "1st Generation (557 DD)" and "2nd Generation (1,100 DD)". Include a small bark beetle silhouette icon. BeetleSense logo watermark bottom right. Professional, scientific feel — not cartoonish.

---

## Tuesday: Satellite Intelligence

### Post

**🛰️ One satellite isn't enough. Here's why we cross-validate with three.**

A single NDVI reading from Sentinel-2 can be misleading — cloud shadows, atmospheric noise, and seasonal variation all create false signals.

BeetleSense cross-validates vegetation health from THREE independent satellite sources:
• Sentinel-2 (10m, 5-day revisit — optical)
• Landsat 8/9 (30m, 16-day revisit — 40-year archive)
• MODIS (250m, daily — seasonal phenology)

When 2 of 3 sensors agree on an anomaly, confidence jumps from "indicated" to "probable." When all 3 agree plus ground observations confirm it: "confirmed."

This is multi-source data fusion. Not one satellite. A constellation.

📄 Qi, W. et al. (2023). Estimating forest above-ground biomass from GEDI and Sentinel data fusion. Remote Sensing of Environment.

#RemoteSensing #Sentinel2 #Landsat #MODIS #ForestTech #BeetleSense #DataFusion #ForestHealth

### Image Prompt
Split-screen showing 3 satellite views of the same forest area at different resolutions: Sentinel-2 (detailed, 10m), Landsat (medium, 30m), MODIS (coarse, 250m). Use green-yellow-red NDVI color gradient. A checkmark overlay where all three agree. Clean layout, dark background with green accents. Text: "3 sensors. 1 truth."

---

## Wednesday: Forest Owner Tip

### Post

**🌲 The 4-week rule could save your forest. Here's the checklist.**

Swedish regulation SKSFS 2011:7 requires that bark beetle-infested spruce must be removed or debarked within 4 WEEKS of detection during flight season (May–August).

Here's your spring inspection checklist:
✅ Walk your spruce stands — focus on south-facing edges first
✅ Look for bore dust (fine sawdust at trunk base)
✅ Check for 2mm entry holes in bark
✅ Note any crown browning or thinning
✅ Check wind-damaged trees — beetles target stressed wood first
✅ Log observations with GPS location and photos
✅ Contact Skogsstyrelsen if epidemic levels suspected

BeetleSense lets you log observations from your phone, cross-references them against satellite data, and alerts nearby owners.

📄 Skogsstyrelsens föreskrifter SKSFS 2011:7
📄 Weslien & Schroeder (1999). Population levels of bark beetles. Forest Ecology and Management, 115.

#Skogsbruk #BarkBeetle #Granbarkborre #ForestManagement #BeetleSense #SpringInspection #Skogsstyrelsen

### Image Prompt
A clean checklist graphic on a light sage background. Six items with checkbox icons. At the top, a spruce tree silhouette. Bottom: "Spring Bark Beetle Inspection Checklist" in DM Sans font. BeetleSense green accent color (#1A6B3C). Professional, printable feel — a forest owner could screenshot this and use it in the field.

---

## Thursday: AI in Forestry

### Post

**🤖 "How much carbon does my forest store?" We asked our AI — and it cited 4 papers.**

BeetleSense's AI Knowledge Wingman doesn't guess. It uses Retrieval-Augmented Generation (RAG) with 2,000+ peer-reviewed forestry papers to answer forest owner questions with cited, confidence-scored answers.

Here's what it said about carbon:
• Above-ground biomass calculated using Marklund (1988) biomass equations
• SLU expansion factors for Picea abies (BEF = 1.38) and Pinus sylvestris (BEF = 1.30)
• IPCC (2006) carbon fraction of 0.50 applied to dry biomass
• Height-calibrated estimate using GEDI LiDAR data (Alvites et al., 2025)

Result: 156.8 tonnes CO₂/ha — 10% higher than traditional methods because we use measured canopy height, not estimated.

Every answer includes inline citations. Every recommendation carries a verification disclaimer. This is AI that augments expertise — it never replaces professional judgment.

📄 Marklund (1988), IPCC (2006), Alvites et al. (2025)

#ForestAI #CarbonAccounting #RAG #BeetleSense #ForestIntelligence #ClimateAction #AIinForestry

### Image Prompt
A chat interface screenshot mockup showing the BeetleSense Wingman answering a carbon question. Light green background, clean UI with a sparkle icon for the AI. Show 2 citation pills below the answer (green "Research" badge, blue "IPCC" badge). At the bottom: "2,000+ sources. Every answer cited." Minimalist, modern design — like a ChatGPT interface but with forest branding.

---

## Friday: Data Insight

### Post

**📊 This week in Småland: beetle trap counts are 62% above the 10-year baseline.**

BeetleSense aggregates pheromone trap data from forest owners across Kronoberg and Jönköping counties. Here's this week's snapshot:

📈 Average trap count: 8,400 beetles/trap
📊 10-year regional baseline: 5,200 beetles/trap
⚠️ Epidemic threshold (Weslien & Schroeder): 15,000 beetles/trap
🌡️ GDD accumulation: 487/557 (87% to swarming)
🛰️ Sentinel-2 NDVI: 3 parcels showing early anomalies

The compound picture: rising temperatures + increasing trap counts + early NDVI stress signals = escalating risk over the next 2 weeks.

This is what multi-source data fusion looks like in practice. Not one metric. All of them, together.

📄 Weslien & Schroeder (1999). Forest Ecology and Management, 115.
📄 Netherer & Schopf (2010). Forest Ecology and Management, 259(5).

#DataDriven #BarkBeetle #ForestMonitoring #BeetleSense #Kronoberg #SmålandForest #ForestData

### Image Prompt
A clean data dashboard card showing 4 metrics in a 2x2 grid: Trap Count (8,400 with red upward arrow), Baseline (5,200 with grey line), GDD Progress (87% with amber circular gauge), NDVI Status (3 anomalies with yellow warning). Dark green header bar. White card on sage background. "Weekly Småland Forest Intelligence" title. Professional, data-forward, no clutter.

---

## Saturday: ForestWard / EU Policy

### Post

**🌍 The EU Deforestation Regulation (EUDR) takes effect this year. Is your forest documentation ready?**

EUDR (Regulation 2023/1115) requires that anyone placing timber on the EU market must provide:
📍 Geolocation data proving harvest origin
📅 Proof of no deforestation after December 31, 2020
📋 Due diligence statement for each timber batch

For Swedish forest owners, this means every harvest needs GPS-documented boundaries before timber reaches the mill.

BeetleSense automates EUDR documentation:
• Satellite-verified parcel boundaries
• Historical NDVI baselines proving forest continuity since 2020
• Automated due diligence report generation
• Compliance status tracking with deadline alerts

Don't wait for the mills to start asking. Get ahead of it.

📄 European Parliament (2023). Regulation 2023/1115 on deforestation-free products.
📄 EU Forest Strategy for 2030, COM(2021) 572 final.

#EUDR #Deforestation #ForestCompliance #SustainableForestry #BeetleSense #EURegulation #TimberTraceability

### Image Prompt
A compliance checklist graphic split into "Required" (left, red border) and "BeetleSense Automates" (right, green border). Left side: geolocation, deforestation proof, due diligence statement. Right side: satellite verification, NDVI baselines, auto-generated reports. EU flag icon at top. Clean, official-looking design — like a regulatory brief. White background with green accent.

---

## Sunday: Behind the Build

### Post

**💡 We built a cross-layer validator that determines threat confidence by counting how many data layers agree.**

Here's the logic:
• 1 data layer detects an issue → "Indicated" (low confidence)
• 2 layers agree → "Probable" (medium confidence)
• 3+ layers confirm → "Confirmed" (high confidence)

Example from this week:
🛰️ Sentinel-2 NDVI dropped 12% in Parcel Granudden NE → 1 layer
📊 GEDI canopy height shows -3.4m loss in same area → 2 layers
📷 Forest owner uploaded bore dust photo at GPS location → 3 layers
🪤 Nearby trap count 62% above baseline → 4 layers

Result: CONFIRMED beetle colonization. 4/6 data layers agree.

Compare this to a single satellite alert with no ground validation. That's the difference between data and intelligence.

BeetleSense doesn't just show you data. It tells you how confident it is — and shows its work.

#BuildInPublic #ForestTech #DataFusion #BeetleSense #AI #RemoteSensing #ForestIntelligence

### Image Prompt
A vertical funnel/pyramid graphic showing the confidence levels. Top (wide): "1 Layer — Indicated" in grey. Middle: "2 Layers — Probable" in amber. Bottom (narrow, bold): "3+ Layers — Confirmed" in green. To the right, 4 small icons representing the data sources that confirmed: satellite dish, height ruler, camera, trap. Clean, minimal, infographic style. BeetleSense green palette.
