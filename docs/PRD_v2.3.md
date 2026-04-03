# BeetleSense.ai — Forest Intelligence Platform
## Product Requirements Document v2.3

**v2.3 | April 2026 | INTERNAL + INVESTOR USE | CONFIDENTIAL**
**Last updated: 3 April 2026**

---

## 1. Executive Summary

BeetleSense.ai is an AI-powered, drone-native forest health intelligence platform. Version 2.0 introduces four foundational pillars:

1. **Multi-Source Data Fusion** — drone imagery, smartphone photos, and open satellite imagery unified into a single analysis engine.
2. **Open Data & Research Integration** — all available open forest damage datasets, grounded in peer-reviewed research from leading forestry institutions.
3. **Forest Expert AI Companion** — a conversational AI trained exclusively on forestry knowledge and each customer's own forest data.
4. **Community Intelligence** — peer observations, shared sightings, price transparency, and collective threat awareness from a network of forest owners.

**Mission**: Empower forest owners, service providers, and inspectors with the most complete, research-backed, multi-source forest intelligence platform — combining proprietary sensor technology, open global data, and expert AI into a single actionable service.

**Vision**: A world in which no forest owner is caught off-guard by beetle infestation, disease, or environmental damage — because BeetleSense sees it first, explains it clearly, and tells them exactly what to do.

### Current Status (April 2026)
- **v1.0 is LIVE** — the platform launched in March 2026 and is in production.
- **v1.1 SHIPPED** — AI Knowledge Wingman (full-page RAG), 3-store RAG architecture with Reciprocal Rank Fusion, Shannon-Wiener Biodiversity Service, Canadian FWI fire weather system, 5-source weighted fusion engine, ForestWard Observatory integration, Compound Threat Model, and 5-tab information architecture restructure.
- **Light theme is the default** — the app ships with a clean, light UI (dark theme available as an option).
- **EU FORWARDS grant banner removed** — the landing page no longer displays the EU FORWARDS grant banner.
- **No placeholder statistics** — fake/placeholder stats have been removed; only real industry data from verified sources is shown.
- **Bilingual** — the app supports Swedish and English with a working language toggle accessible from the top bar.
- **Demo mode** — the product can be fully explored without Supabase credentials; demo mode provides a complete walkthrough of all features with realistic sample data.

---

## 2. Problem Statement

### 2.1 The Forest Health Crisis
European forests face accelerating threats: bark beetle infestations, wild boar damage, storm events, drought stress, and climate-driven disease outbreaks. Late detection leads to catastrophic timber loss, legal liability, and ecological collapse.

### 2.2 The Data Fragmentation Problem
The data that could answer a forest owner's most pressing questions already exists — scattered across satellite providers, government datasets, academic repositories, and the owner's own drone flights. No platform synthesises these sources into a coherent, queryable intelligence layer.

### 2.3 The Knowledge Gap
Interpretation requires expertise most landowners don't possess. Research institutions publish critical findings in journals that never reach practitioners. There is no accessible expert system that translates data and research into plain-language guidance.

### 2.4 The BeetleSense Opportunity
BeetleSense has proven the core hardware and AI technology. The opportunity is to become the definitive intelligence layer for forest owners globally — by fusing proprietary sensor data with open data, grounding analysis in the world's best forestry research, and delivering it through an AI companion any forest owner can use.

**Market Position**: No platform combines proprietary e-nose hardware, multi-source data fusion, open dataset integration, and expert AI companionship. This combination is without precedent in forestry.

---

## 3. Goals & Non-Goals

### 3.1 Goals
- Unify all six analysis modules into a single platform
- Implement multi-source data fusion (drone + smartphone + satellite)
- Integrate all available open forest damage datasets as a live intelligence layer
- Build on peer-reviewed research from leading forestry institutions
- Launch the Forest Expert AI Companion as flagship feature
- Deliver via a single Progressive Web App (PWA) with PDF/email reports
- Establish a scalable, repeatable service model
- Maintain competitive moat through e-nose IP, fusion layer, and Module 6
- Reduce cognitive load from 100+ navigation items to a 5-tab architecture navigable in under 10 seconds
- Establish the AI Knowledge Wingman as the platform's hero feature and primary entry point for all forest intelligence
- Build the first community intelligence layer for Nordic forest owners

### 3.2 Non-Goals (v2.0)
- BeetleSense will NOT build drone hardware or flight-planning software
- Real-time in-flight processing is out of scope — analysis is post-flight batch
- Paid satellite imagery is out of scope; only open/free sources in v2.0
- Native iOS/Android apps — PWA serves all devices from one codebase
- BeetleSense will NOT replace cooperative membership apps (Sodra, SCA, Mellanskog) — it complements them as the intelligence layer

---

## 4. Target Users & Personas

| | Forest Owner | Forest Service Provider | Forest Inspector |
|---|---|---|---|
| **Profile** | Private landowner, 50–2,000 ha | Logging/forestry contractor | Valuation specialist or insurance assessor |
| **Primary Goal** | Protect forest health, maximise timber value | Prioritise harvest operations | Produce accurate, defensible valuations |
| **Key Pain Point** | Slow detection; no expert on call | Incomplete, outdated information | No standardised digital data |
| **AI Companion Use** | Beetle spread risk, harvest timing, treatment | Volume estimates, species mix, access routes | Cross-reference with legal valuation standards |
| **Data Inputs** | Drone + smartphone | Processed outputs; smartphone photos | Drone survey via BeetleSense; satellite context |

### 4.1 Customer Journey
1. **Contact** — via web, app, or referral
2. **Scoping** — survey area, module selection, data collection method
3. **Data Collection** — drone upload, smartphone capture, or BeetleSense pilot dispatch
4. **Data Fusion** — ingestion + satellite + open data auto-pull
5. **AI Processing** — module-specific models; georeferenced, confidence-scored
6. **Delivery** — PWA dashboard + PDF/email report
7. **Expert AI Conversation** — follow-up questions, deeper analysis, general guidance

---

## 4B. 5-Tab Information Architecture

The platform is organized into five primary tabs, replacing the previous multi-level navigation hierarchy. This architecture reduces cognitive load and ensures any feature is reachable within five taps.

### Tab 1 — Min Skog (My Forest)

The personal dashboard and entry point for the app. Displays:

- **Smart Alerts**: prioritized notifications (beetle risk changes, fire warnings, price movements, community sightings nearby)
- **Forest Health Score**: composite score aggregating NDVI, beetle risk, fire risk, and biodiversity metrics for each registered parcel
- **Parcel Overview**: map view of all registered parcels with color-coded health status
- **Weather**: local weather conditions and 7-day forecast from SMHI
- **Quick Actions**: one-tap access to start a new drone survey, capture smartphone photos, or ask the Wingman a question

### Tab 2 — Bevakning (Intel Center)

All monitoring and analysis presented as a live card grid. Each card shows a current value or status — not a menu label. Users see data at a glance before tapping for detail.

| Card | Data Shown | Source |
|---|---|---|
| **Beetle Forecast** | GDD accumulation + trap counts, days to swarming threshold | SMHI + Skogsstyrelsen |
| **Fire Risk** | Current FWI rating (Low/Moderate/High/Very High/Extreme) | Canadian FWI via SMHI + NASA FIRMS |
| **NDVI Health** | Latest NDVI value per parcel, trend arrow | Sentinel-2 |
| **Carbon Stock** | Estimated tonnes CO2e per parcel | Marklund biomass equations + IPCC emission factors |
| **Biodiversity** | Shannon-Wiener H' index, species richness | Field surveys + KNN Sverige |
| **Timber Market** | Current price range for dominant species (SEK/m3fub) | Aggregated market data |
| **ForestWard Observatory** | Latest EFI phenological alerts, BBOA status | EFI bidirectional pipeline |
| **Compliance** | Regulatory status (avverkningsanmalan, nyckelbiotop flags) | Skogsstyrelsen |
| **Growth Model** | Projected volume increment (m3/ha/year) | SLU growth functions |
| **Storm Risk** | Wind exposure rating from canopy height model | CHM + SMHI wind forecasts |

Tapping any card opens the full detail page with charts, historical data, methodology, and recommended actions.

### Tab 3 — Wingman (AI Knowledge)

The hero feature. A full-page, ChatGPT-like RAG interface where forest owners ask questions and receive research-backed, parcel-specific answers.

- **Conversation Sessions**: persistent chat history, organized by topic or date
- **Suggested Prompts**: contextual suggestions based on current alerts and season (e.g., "What is my beetle risk this week?", "When should I harvest parcel 3?")
- **Inline Citations**: every claim links to its source (research paper, regulation, or user data)
- **Confidence Scoring**: High / Medium / Low indicator on every response
- **Streaming Responses**: real-time token streaming via SSE

See Section 9 for full specification.

### Tab 4 — Skogsforumet (Forum)

Community discussions organized into four channels:

- **Sightings**: beetle observations with GPS coordinates, photos, severity ratings
- **Alerts**: community-sourced early warning (storm damage, illegal logging, wildfire smoke)
- **Reviews**: equipment and contractor reviews from verified forest owners
- **Prices**: anonymous timber price reports, aggregated and displayed as regional ranges

See Section 15B for full specification.

### Tab 5 — Mer (More)

Settings, learning resources, reports, compliance tools, and account management:

- Account settings and profile
- Language toggle (SV / EN)
- Learning center (field guides, tutorial videos, seasonal checklists)
- Report archive (downloadable PDFs)
- Compliance dashboard (regulatory deadlines, certification status)
- Notification preferences
- Data export
- Help and support

### Desktop vs. Mobile Behavior

| | Mobile | Desktop |
|---|---|---|
| **Navigation** | 5-icon bottom navigation bar, always visible | 64px icon rail on the left edge, expands to 240px on hover or click |
| **Tab switching** | Single tap on bottom bar icon | Click icon or expanded label in rail |
| **Content area** | Full-width, single-column | Multi-column layout with optional side panels (e.g., Wingman + map) |
| **Intel Center cards** | Single-column stacked cards, swipeable | 2-3 column responsive grid |
| **Wingman** | Full-screen chat | 720px centered column with optional map context panel |

---

## 5. Multi-Source Data Fusion Engine

### 5.1 Data Source Comparison

| Attribute | Drone | Smartphone | Satellite (Open) |
|---|---|---|---|
| Resolution | 1–5 cm/pixel | High at close range | 10 m (Sentinel-2) to 3 m |
| Coverage | 10–500 ha/flight | Point samples | Unlimited |
| Frequency | On demand | Instant | Sentinel-2: 5-day revisit |
| 3D Data | Excellent (photogrammetry) | Single viewpoint | None (optical) |
| Cost | Moderate–high | Zero | Zero (open access) |
| Primary Strength | Highest detail; e-nose | Ground truth; zero cost | Temporal change detection |
| Primary Weakness | Cost/logistics | No canopy coverage | Insufficient for individual trees |

### 5.2 Fusion Engine

**Spatial Alignment**: All inputs reprojected to SWEREF99 TM (EPSG:3006) for Swedish parcels, WGS 84 (EPSG:4326) for display. Drone imagery processed via SfM/MVS pipeline. Satellite pre-aligned to ESA tile grids with automatic cloud masking. Smartphone images geotagged via device GPS + compass.

**Confidence Weighting by Module**:

| Module | Drone | Smartphone | Satellite |
|---|---|---|---|
| Beetle Damage Detection | Primary (70%) | Supplementary (20%) | Context (10%) |
| Tree Count Inventory | Primary (80%) | Validation (5%) | Baseline (15%) |
| Species Identification | Primary (65%) | Ground truth (25%) | Phenology (10%) |
| Wild Boar Damage | Primary (60%) | Evidence (30%) | Extent (10%) |
| Animal Inventory | Primary (75%) | Sighting logs (20%) | Habitat (5%) |
| Temporal Change Detection | Current state (40%) | Field notes (10%) | Change signal (50%) |

### 5.3 Smartphone Capture Module
- Guided in-app capture with framing prompts (tree trunk, canopy, ground damage)
- Automatic quality gate: blur detection, minimum resolution, lighting adequacy
- GPS + compass metadata extraction for georeferencing
- Batch upload with offline queue for low-connectivity field conditions
- Results clearly confidence-weighted: drone-verified vs. smartphone-indicated

### 5.4 Satellite Integration (Open Sources)
- **Copernicus Sentinel-2** (ESA): 10 m multispectral, 5-day revisit — NDVI, change detection, phenology
- **Sentinel-1 SAR**: Cloud-penetrating radar for canopy structure changes
- **NASA Landsat 8/9**: Historical baselines back to 1972
- **MODIS**: Daily global land surface for seasonal context
- Auto-pulled for each customer's parcel on project creation

### 5.5 5-Source Weighted Architecture

The fusion engine draws from five distinct data source categories, each with defined reliability weights and update cadences:

| # | Source Category | Examples | Weight Range | Update Cadence |
|---|---|---|---|---|
| 1 | **Drone** | BeetleSense e-nose flights, RGB/multispectral orthomosaics, LiDAR | 0.60–0.80 | On demand (per survey) |
| 2 | **Smartphone** | In-app guided capture, field photos, GPS-tagged observations | 0.05–0.30 | Real-time (user-initiated) |
| 3 | **Satellite** | Sentinel-2 (10 m optical), Sentinel-1 (SAR), Landsat 8/9, MODIS | 0.10–0.50 | 1–5 day revisit |
| 4 | **Open Government Data** | Skogsstyrelsen (KNN, avverkningsanmalningar, skaderegistret), SMHI (weather, climate), Lantmateriet (LiDAR, property boundaries, terrain) | 0.10–0.25 | Daily to annual depending on dataset |
| 5 | **Community Observations** | Skogsforumet sightings, verified beetle reports, anonymous price data | 0.05–0.15 | Real-time (community-sourced) |

Weights are dynamically adjusted per module and per analysis context. When a higher-confidence source is available (e.g., fresh drone survey), lower-confidence sources serve as corroboration rather than primary signal. When no drone data exists, satellite and government data carry higher effective weight.

### 5.6 Cascading Threat Detection

When any single source triggers a threat signal above its module-specific threshold, the fusion engine automatically queries all other available sources for corroboration:

1. **Trigger**: One source exceeds alert threshold (e.g., Sentinel-2 NDVI drops below parcel baseline by > 1 standard deviation)
2. **Fan-out**: Engine queries remaining four source categories for the same geographic area and time window
3. **Corroboration scoring**: Each corroborating source adds to a compound confidence score using Bayesian updating
4. **Alert classification**: Single-source alerts are flagged as "Possible" (requires verification); two-source as "Probable"; three or more as "Confirmed"
5. **Notification**: Alert severity and recommended action escalate with corroboration level

This ensures that a satellite anomaly alone does not trigger unnecessary alarm, but when combined with a community beetle sighting and government harvest notification nearby, the system elevates to a high-priority alert.

### 5.7 Compound Threat Model

Forest threats rarely occur in isolation. The Compound Threat Model captures interaction effects between simultaneous stressors:

**Beetle-Drought Interaction**: Drought-stressed trees (identified via NDVI decline and SMHI precipitation deficit) produce fewer defensive resins, increasing susceptibility to Ips typographus attack by 2-4x (Netherer et al., 2019; Jactel et al., 2012). The model applies a drought multiplier to beetle risk scores when SMHI data shows cumulative precipitation deficit exceeding 30% of the 10-year parcel average.

**Beetle-Fire Interaction**: Post-fire salvage logging deadlines create time pressure that compounds beetle risk. Standing dead timber from fire becomes beetle breeding substrate within 4-6 weeks in warm conditions (Wermelinger, 2004). The model flags parcels within 10 km of active FIRMS fire detections and applies accelerated swarming timeline estimates.

**Drought-Fire-Beetle Cascade**: The most severe compound scenario. Extended drought (>60 days below normal precipitation) simultaneously increases fire risk (elevated FWI), beetle reproduction rates (faster degree-day accumulation), and tree vulnerability (reduced resin pressure). When all three conditions co-occur, the model generates a "Compound Threat Alert" with specific intervention priorities:
1. Immediate: remove infested timber before beetle flight
2. Short-term: establish firebreaks around high-value stands
3. Seasonal: adjust harvest plan to prioritize stressed parcels

**Storm-Beetle Interaction**: Windthrow events create fresh breeding substrate for bark beetles. The model monitors SMHI storm warnings and Sentinel-1 SAR for canopy disturbance, flagging affected parcels for accelerated beetle monitoring in the 6 weeks following any storm event (Stadelmann et al., 2013).

**Scientific References**:
- Netherer, S., et al. (2019). Acute drought as a predisposing factor for Ips typographus. *New Phytologist*, 221(4), 2065-2078.
- Jactel, H., et al. (2012). Drought effects on damage by forest insects and pathogens. *Forest Ecology and Management*, 267, 89-105.
- Wermelinger, B. (2004). Ecology and management of the spruce bark beetle Ips typographus. *Forest Ecology and Management*, 202(1-3), 67-82.
- Stadelmann, G., et al. (2013). Effects of salvage logging and sanitation felling on bark beetle dynamics. *Forest Ecology and Management*, 305, 273-281.

---

## 6. QGIS Integration & Swedish Open Geospatial Data

### 6.1 QGIS as Geospatial Engine
- Open source (GNU GPL) — zero licensing cost
- QGIS Server exposes WMS/WFS/WCS web services consumed by the PWA map layer (MapLibre GL)
- PyQGIS API for custom spatial processing pipelines
- Processing Framework integrates GDAL, SAGA, GRASS, OTB
- **Pipelines**: LiDAR processing (DTM/CHM via PDAL), orthomosaic generation, spatial overlay analysis, change detection, report cartography

### 6.2 Swedish Open Datasets

**Lantmateriet (Mapping Authority)**:
| Dataset | Application |
|---|---|
| Fastighetskartan (Property Map) | Parcel boundary auto-load by fastighets-ID |
| Hojdmodell 2 m (DTM) | Terrain slope, drainage, LiDAR co-registration |
| Nationella Marktackedata (NMD) | Land cover classification (forest, wetland, open) |
| Ortofoto | Base map layer in dashboard |
| Transportnatet | Forest road network for harvest access routes |
| **Laserdata (National LiDAR)** | **0.5–1 pt/m2 nationwide. CHM + DTM per parcel on registration. Key differentiator.** |

**Skogsstyrelsen (Forest Agency)**:
| Dataset | Application |
|---|---|
| KNN Sverige | Per-pixel basal area, volume, height, age, species |
| Avverkningsanmalningar | Harvest notifications — beetle pressure context |
| Nyckelbiotoper | Protected habitats — flagged in AI Companion |
| Skaderegistret | Historical damage — risk scoring |

**SGU (Geological Survey)**: Soil type (beetle/root rot risk modelling), groundwater depth (drought stress)
**SMHI (Meteorological Institute)**: Historical climate data, drought index, RCP climate projections
**SLU (National Forest Inventory)**: Growing stock, species, increment, damage — validation benchmarks

### 6.3 Integration Architecture
- **Geospatial Data Sync Service**: scheduled microservice that monitors, fetches, caches per parcel
- QGIS Server exposes processed layers as WMS/WFS → PWA map (MapLibre GL)
- Toggleable overlays in customer dashboard — no GIS expertise required
- Offline caching: property boundaries, LiDAR DTM, land cover cached per parcel for field PWA
- All APIs respect open data licences (CC0 / open government / PSI-compatible)

---

## 7. Open Data & Research Integration

### 7.1 Open Forest Damage Datasets

| Dataset | Coverage | Application |
|---|---|---|
| EFFIS (EU Forest Fire) | Pan-European | Historical fire damage; risk zones |
| BBOA (EFI Bark Beetle) | Europe | Outbreak polygons; regional risk modelling |
| Global Forest Watch (WRI) | Global | Tree cover loss alerts; deforestation baseline |
| Copernicus Forest Service (CLMS) | Pan-European | Forest type, tree cover density, disturbance |
| Swedish Forest Agency (Skogsstyrelsen) | Sweden | Inventory plots, protected areas, insect damage |
| NIBIO | Norway/Nordics | Bark beetle survey, health monitoring, species models |
| USFS FIA | USA (methods) | Methodology reference; pre-training data |
| SoilGrids (ISRIC) + ERA5 (ECMWF) | Global | Soil + climate as contextual variables |

### 7.2 Research Foundation

**Core Research Institutions**: EFI, SLU, Luke (Finland), NIBIO, ETH Zurich, TU Dresden, INRAE, ESA Phi-Lab, JRC

**Requirements**:
- Curated Research Knowledge Base: full-text papers, abstracts, structured data
- Model training pipelines cite source papers
- AI Companion trained on and retrieves from this knowledge base
- Quarterly review of new publications; knowledge base updated
- Research attribution surfaced in dashboard: *"This finding is consistent with research from EFI, 2023"*

**Design Principle**: BeetleSense synthesises the best available science for a specific parcel. Every insight is traceable to data or research.

---

## 8. Analysis Modules

All modules share a common ingestion pipeline, fusion engine, and output format. Each can be ordered individually or bundled.

### 8.1 Tree Count Inventory
- Automated per-tree detection from fused drone + satellite data
- **Model**: YOLO v8/v9 with LiDAR CHM (Lantmateriet) as height prior
- Outputs: total count, density heatmap, georeferenced point cloud, comparison vs. national average
- Enrichment: Copernicus Tree Cover Density baseline; SLU inventory data

### 8.2 Species Identification
- AI classification from multispectral drone imagery + Sentinel-2 phenological time-series
- **Model**: ResNet-50 + temporal attention layer
- Smartphone ground-truth photos validate canopy-level classification
- Outputs: species map, percentage breakdown, confidence scores, regional comparison
- Research: ETH Zurich methods; SLU Nordic models

### 8.3 Animal Inventory
- Large mammal detection from drone thermal/RGB imagery
- **Model**: YOLO v8 fine-tuned on Nordic wildlife aerial datasets
- Habitat context from Copernicus land cover
- Outputs: species count, location map, habitat corridor overlays

### 8.4 Beetle Damage Detection (Flagship)
- Computer vision + proprietary electronic nose sensor array
- **Model**: Ensemble — spectral anomaly CNN (visual) + 1D-CNN/XGBoost (e-nose VOC), learned fusion weighting
- Satellite NDVI time-series detects stress onset pre-survey; drone + e-nose confirm and grade
- Historical outbreak polygons from BBOA/NIBIO as regional context
- Outputs: infestation probability map, severity grading, intervention zones, regional outbreak risk
- Research: EFI beetle ecology; INRAE climate-vulnerability indices

### 8.5 Wild Boar Damage Detection
- Soil disturbance identification from drone imagery
- **Model**: DeepLabv3+ semantic segmentation
- Smartphone field photos as supplementary evidence
- Outputs: damage extent map, severity score, affected area (ha), timestamped evidence package

### 8.6 Module 6 [Confidential]
- Details withheld. See Appendix A (access-restricted).
- Fusion engine designed to accommodate Module 6 inputs from day one.

---

## 8.7 Dashboard Intelligence Widgets

The owner dashboard includes three predictive intelligence widgets that synthesise module outputs, open data, and climate models into actionable recommendations.

**BeetleForecast** -- Bark Beetle Swarming Prediction
- Predicts Ips typographus swarming probability using a degree-day accumulation model (base 5 C) fed by SMHI temperature data and the owner's parcel coordinates.
- Displays a risk gauge (Low / Moderate / High / Critical) with the estimated days until swarming threshold is reached.
- Sources: SMHI hourly temperature, EFI beetle phenology research, historical outbreak data from Skogsstyrelsen Skaderegistret.
- Updates daily; push notification triggered when risk transitions to High or Critical.

**HarvestOptimizer** -- Per-Parcel Harvest Timing Recommendations
- Recommends optimal harvest windows for each registered parcel based on species mix, timber market prices, soil bearing capacity (seasonal frost/thaw), and regulatory constraints (avverkningsanmalan lead times).
- Combines KNN Sverige volume/species data, current timber price indices, SMHI frost forecasts, and Lantmateriet terrain slope.
- Outputs a ranked list of parcels with suggested harvest month and estimated revenue impact of delaying.

**InsuranceRisk** -- Portfolio Risk Scoring & Insurance Recommendations
- Scores each parcel on a 0-100 risk index combining beetle exposure, storm vulnerability (canopy height + wind exposure from CHM), fire risk (EFFIS), and wild boar damage history.
- Aggregates parcel scores into a portfolio-level risk rating.
- Provides insurance recommendations: suggested coverage types, estimated premium ranges (based on Swedish forest insurance benchmarks), and risk-reduction actions that could lower premiums.

### Planned Modules (v1.1)

The following modules are designed and scheduled for the v1.1 release (May 2026):

- **Animal Inventory** -- Large mammal detection from drone thermal/RGB imagery (see Section 8.3). Deferred from v1.0 to allow additional training data collection from Nordic wildlife aerial datasets.
- **Wild Boar Damage** -- Soil disturbance identification from drone imagery (see Section 8.5). Deferred from v1.0 pending field validation with Swedish forest owners.

---

## 9. AI Knowledge Wingman — Hero Feature

### 9.1 Vision

The AI Knowledge Wingman is THE reason forest owners open BeetleSense every day. It is not a chatbot tucked into a sidebar — it is the platform's hero feature and primary entry point for forest intelligence. Every forest owner deserves access to world-class forestry expertise. The Wingman is a domain-expert AI, trained exclusively on forestry knowledge, calibrated to each customer's specific forest data, and designed to be the first place users go when they have a question about their forest.

The Wingman answers questions that previously required hiring a consultant, calling the county forester, or spending hours searching government databases. It does this in seconds, with citations, in the owner's language.

### 9.2 Knowledge Architecture (Three Stores)

| Store | Source | Content | Scale |
|---|---|---|---|
| **Store 1: Research** | Peer-reviewed literature from SLU, EFI, NIBIO, Luke (Finland), ETH Zurich, INRAE, ESA Phi-Lab, TU Dresden, JRC | Beetle biology, species ecology, treatment protocols, silviculture, climate adaptation, forest pathology, remote sensing methodology | 2,000+ papers at launch |
| **Store 2: Regulatory** | Swedish Forestry Act (Skogsvardslag), SJVFS regulations, Skogsstyrelsen guidelines, EUDR (EU Deforestation Regulation), FSC/PEFC certification standards | Legal requirements, reporting obligations, certification criteria, harvest notification rules, protected habitat regulations | Complete Swedish regulatory corpus + EU forestry regulations |
| **Store 3: User-Specific** | Customer's own BeetleSense survey results, e-nose readings, species maps, parcel history, uploaded documents | Hyper-personalised answers tied to specific parcels, surveys, and historical trends | Per-user, RLS-isolated in Supabase |

### 9.3 Technical Implementation

**Architecture**: 3-store RAG (Retrieval-Augmented Generation) with Reciprocal Rank Fusion (RRF) over pgvector in Supabase PostgreSQL.

```
User Query → Intent Classify → Query Embedding
                                    |
              +---------------------+---------------------+
              v                     v                     v
        Store 1: Research     Store 2: Regulatory   Store 3: User Data
        (pgvector top-K)      (pgvector top-K)      (pgvector top-K, RLS)
              +---------------------+---------------------+
                                    v
                          Reciprocal Rank Fusion (k=60)
                                    v
                          Context Assembly (~12k tokens)
                                    v
                          Confidence Scoring
                                    v
                          LLM (Claude API) — streaming SSE
                          Forest scientist persona + source citations
                                    v
                          Post-Processing
                          Citation rendering + EU AI Act disclaimer
```

- **Foundation model**: Claude API with forestry system prompt
- **Vector store**: pgvector (HNSW index) in Supabase PostgreSQL, three separate collections
- **Embeddings**: text-embedding-3-small or Cohere Embed v3 (multilingual)
- **Retrieval merging**: Reciprocal Rank Fusion (k=60) across all three stores to produce a single ranked context
- **Confidence scoring**: Based on retrieval similarity scores, source authority, and answer grounding (see Section 9B)
- **Customer data isolation**: RLS on `user_data_embeddings` — Wingman only accesses authenticated customer's Store 3
- **Guardrails**: Domain classifier rejects non-forestry queries; hallucination detection flags low-grounding responses
- **Streaming**: Server-Sent Events (SSE) for real-time token delivery
- **EU AI Act compliance**: Mandatory disclaimer on every response: "AI-generated analysis. Verify critical decisions with a certified forestry professional."
- **Audit**: Every interaction logged with sources for compliance

### 9.4 Core Capabilities

**Natural Language Q&A**
- Plain language forestry questions; no technical expertise required
- Every answer cites sources: *"According to EFI (2022) and your June survey data..."*
- English and Swedish at launch; German and Finnish in v2.1

**Data-Driven Insights**
- Proactive anomaly flagging without being asked
- Cross-forest benchmarking against regional averages
- Seasonal advisories (beetle flight season, harvest window, fungal risk)

**Scenario Modelling**
- *"If I don't treat Plot B for 30 days, what's the likely spread?"* — probabilistic model using EFI data + parcel topology
- Timber value impact estimates from species, damage, and market price data
- Outputs labelled as model estimates with confidence ranges

**Report Interpretation**
- Ask questions about delivered reports in plain language
- Links findings to published research

**Action Recommendations**
- Concrete next steps: *"Remove affected trees in Plot B within 14 days, apply pheromone traps at grid points 4 and 7"*
- Tiered: Immediate / Within 30 Days / Seasonal
- Swedish/EU regulatory requirements attached where relevant

### 9.5 Trust & Transparency
- Never fabricates data or references — says so explicitly when it cannot answer
- All sources cited; expandable citations in UI
- Confidence indicator: High / Medium / Low
- Clear distinction between "what the science says" vs "what your data shows"
- Customer data NEVER used for shared model training without explicit opt-in

### 9.6 Interface

**Layout**: Full-page chat interface occupying the entire content area (Tab 3). Content column capped at 720px width, centered, with comfortable reading margins.

- **Conversation Sessions**: persistent chat history organized by topic or date; users can start new sessions or continue previous ones
- **Suggested Prompts**: contextual prompt suggestions displayed when the session is empty or after a response, based on current alerts, season, and parcel data (e.g., "What is my beetle risk this week?", "Should I harvest parcel 3 this autumn?", "Explain my latest NDVI change")
- **Citation Pills**: inline citation markers color-coded by source type — green for research papers, blue for regulatory sources, amber for user-specific data. Tapping a pill expands the full citation with link
- **Confidence Badge**: displayed on every response (High / Medium / Low) with tooltip explaining the scoring basis
- Voice input for hands-free field queries
- Saved answers exportable as PDF addenda
- "Ask about this" contextual button on every map region, chart, and report section (launches Wingman with pre-filled context)
- **Latency target**: < 5s for 90th percentile response time (first token)

---

## 9B. RAG Knowledge Service Architecture

### 9B.1 3-Store Vector Architecture

Each knowledge store is a separate pgvector collection in Supabase PostgreSQL with independent embedding pipelines:

| Store | Table | Embedding Model | Chunk Size | Overlap | Index Type | Approximate Vectors |
|---|---|---|---|---|---|---|
| Research | `research_embeddings` | text-embedding-3-small (1536d) | 512 tokens | 64 tokens | HNSW (ef=200, m=16) | ~200,000 |
| Regulatory | `regulatory_embeddings` | text-embedding-3-small (1536d) | 256 tokens | 32 tokens | HNSW (ef=200, m=16) | ~15,000 |
| User-Specific | `user_data_embeddings` | text-embedding-3-small (1536d) | 256 tokens | 32 tokens | HNSW (ef=200, m=16) | Variable per user |

User-Specific store is protected by Supabase Row-Level Security (RLS) — each user can only retrieve their own embeddings.

### 9B.2 7-Step Retrieval Pipeline

1. **Query Embedding**: User query is embedded using the same model as the stores (text-embedding-3-small)
2. **Parallel Top-K Retrieval**: Query is sent simultaneously to all three stores. Each returns its top-K most similar chunks (K=10 for Research, K=5 for Regulatory, K=10 for User-Specific)
3. **Reciprocal Rank Fusion (RRF)**: Results from all three stores are merged using RRF with k=60: `score(d) = SUM(1 / (k + rank_i(d)))` where `rank_i(d)` is the rank of document `d` in result list `i`
4. **Context Assembly**: Top-ranked chunks after RRF are assembled into a context window of approximately 12,000 tokens, preserving source metadata (store origin, document title, publication date)
5. **Claude API Call**: Context + user query + system prompt sent to Claude API with streaming enabled
6. **Streaming SSE**: Response tokens streamed to the client via Server-Sent Events for real-time display
7. **Post-Processing**: Citations are extracted and rendered as interactive pills; confidence score is calculated; EU AI Act disclaimer is appended

### 9B.3 Confidence Thresholds

| Level | Score Range | Behavior |
|---|---|---|
| **High** | >= 0.85 | Green confidence badge. Answer delivered with full citations. |
| **Medium** | 0.60 – 0.84 | Amber confidence badge. Answer delivered with caveat: "Based on available sources, but you may want to verify with a local expert." |
| **Low** | 0.30 – 0.59 | Red confidence badge. Answer delivered with strong caveat: "Limited source support. Recommend consulting a certified forestry professional." |
| **Decline** | < 0.30 | No answer generated. Response: "I don't have enough reliable information to answer this question confidently. Please consult a forestry professional." |

Confidence score is computed as a weighted combination of: highest retrieval similarity score (40%), number of corroborating sources (30%), source recency (15%), and source authority tier (15%).

---

## 9C. Ecological Calculation Services

### 9C.1 Shannon-Wiener Biodiversity Service

BeetleSense calculates biodiversity metrics for each registered parcel using field survey data and KNN Sverige species composition.

**Primary Index — Shannon-Wiener Diversity (H')**:

`H' = -SUM(pi * ln(pi))`

Where `pi` is the proportion of individuals belonging to species `i`. Higher values indicate greater diversity; typical boreal forest values range from 0.5 (monoculture plantation) to 2.5 (species-rich mixed forest).

**Supporting Indices**:
- **Simpson's Diversity (1 - D)**: `1 - D = 1 - SUM(pi^2)`. Probability that two randomly selected individuals belong to different species. Range 0–1; higher = more diverse.
- **Pielou's Evenness (J')**: `J' = H' / ln(S)` where S is species richness. Measures how evenly individuals are distributed among species. Range 0–1; 1 = perfectly even distribution.
- **Species Richness (S)**: Simple count of distinct species observed.

**EU Biodiversity Strategy 2030 Alignment**: The biodiversity service maps calculated indices to EU Biodiversity Strategy 2030 targets, specifically the goal to protect 30% of EU land area and restore degraded ecosystems. Parcels are flagged if they fall below regional biodiversity benchmarks derived from SLU National Forest Inventory reference plots.

**Data Sources**: Field survey species lists (smartphone capture + professional surveys), KNN Sverige per-pixel species composition, Skogsstyrelsen nyckelbiotop data for protected habitat context.

### 9C.2 Canadian Forest Fire Weather Index (FWI) System

BeetleSense implements the complete Canadian FWI system adapted for Swedish conditions, using SMHI weather data.

**Moisture Codes (fuel moisture tracking)**:
- **FFMC (Fine Fuel Moisture Code)**: Moisture content of surface litter and fine fuels. Indicates ease of ignition. Updated daily from temperature, relative humidity, wind speed, and 24h precipitation.
- **DMC (Duff Moisture Code)**: Moisture content of loosely compacted organic layers. Indicates fuel consumption in moderate duff layers. Responds to temperature, relative humidity, and precipitation over days to weeks.
- **DC (Drought Code)**: Moisture content of deep compact organic layers. Indicates seasonal drought effects on deep fuel availability. Responds over weeks to months.

**Fire Behavior Indices**:
- **ISI (Initial Spread Index)**: Combines FFMC and wind speed to estimate rate of fire spread. `ISI = f(FFMC, wind_speed)`.
- **BUI (Buildup Index)**: Combines DMC and DC to estimate total fuel available for combustion. `BUI = f(DMC, DC)`.
- **FWI (Fire Weather Index)**: Combines ISI and BUI into a single numeric rating of fire intensity. `FWI = f(ISI, BUI)`.

**Swedish MSB Threshold Mapping**:

| FWI Range | Risk Level | Color | Swedish MSB Equivalent |
|---|---|---|---|
| 0–5 | Low | Green | Ingen risk |
| 5–12 | Moderate | Yellow | Viss risk |
| 12–20 | High | Orange | Stor risk |
| 20–30 | Very High | Red | Mycket stor risk |
| 30+ | Extreme | Dark Red | Extrem risk |

**Data Source**: SMHI open weather API (temperature, relative humidity, wind speed, precipitation) polled daily for each registered parcel's coordinates.

### 9C.3 ForestWard Observatory Integration

BeetleSense maintains a bidirectional data pipeline with the European Forest Institute (EFI) ForestWard Observatory.

**Inbound from EFI**:
- **Phenological Data**: Satellite-derived green-up dates, leaf senescence timing, growing season length per parcel region. Used to calibrate beetle swarming predictions and harvest window recommendations.
- **BBOA Alerts**: Bark Beetle Outbreak Assessment polygons — active and historical outbreak areas across Europe. Ingested as risk context layers in the Intel Center.
- **Forest Disturbance Maps**: Pan-European disturbance detection products at 20 m resolution, identifying storm damage, fire scars, and defoliation events.

**Outbound to EFI** (with user consent):
- Anonymized, aggregated beetle detection data from BeetleSense surveys
- Community-sourced sighting data from Skogsforumet (aggregated, no PII)

**Pipeline Architecture**: Scheduled daily sync via EFI REST API. ForestWard data cached per parcel in the Geospatial Data Sync Service. Alerts surfaced as cards in the Intel Center (Tab 2) and available to the Wingman (Tab 3) as context for answering regional risk questions.

---

## 10. Platform Architecture

### 10.1 High-Level Components

| Component | Technology | Description |
|---|---|---|
| PWA Frontend | React 19 + Vite 6 + Tailwind + MapLibre GL | Single responsive app for all device sizes and user roles |
| Auth & Database | Supabase (PostGIS + pgvector) | Auth, RLS, real-time subscriptions, edge functions |
| API Layer | Supabase Edge Functions (Deno) | Auth-gated CRUD, AI Companion proxy, webhook handlers |
| Processing Workers | Node.js on Hetzner (Docker/k3s) | Ingestion, fusion, report generation, open data sync |
| AI Inference | Python (ONNX/TorchServe) on Hetzner GPU | Module-specific ML models, GPU-accelerated batch inference |
| Geospatial Engine | QGIS Server (Docker) on Hetzner | WMS/WFS rendering, spatial analysis, report cartography |
| Job Orchestration | BullMQ + Redis (Valkey) | Priority queues, parent-child jobs, retry, progress |
| Object Storage | Hetzner S3-compatible | Drone imagery, processed outputs, reports, open data cache |
| CDN / Hosting | Vercel (PWA) + Cloudflare (DNS/WAF) | Edge-distributed static assets, DDoS protection |

### 10.2 Data Flow
1. Customer submits imagery via PWA (any device) or pilot submits on behalf
2. Ingestion validates files, extracts GPS/altitude metadata, creates processing job
3. Open Data Sync auto-attaches Sentinel-2 tiles, NDVI composites, damage dataset polygons
4. Fusion Engine co-registers and merges all sources; confidence weights per module
5. Module-specific AI models process fused dataset; outputs as GeoJSON + raster
6. Dashboard updated, push notification sent, PDF report generated, email delivered
7. AI Companion immediately available to answer questions about new results

### 10.3 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Processing SLA (standard) | < 24 hours post-landing (hard commitment) |
| Processing SLA (priority) | < 4 hours (Enterprise add-on) |
| SLA breach | Full credit + proactive notification |
| Satellite enrichment | < 1 hour of job creation |
| Uptime | 99.5% customer-facing services |
| Data residency | EU-based (Hetzner DE/FI + Supabase EU) |
| Encryption | TLS 1.3 in transit, AES-256 at rest |
| Auth | JWT, magic link + password + 2FA, RLS |
| Image retention | 12 months default; configurable |
| AI Companion latency | < 5s for P90 (first token) |
| PWA Lighthouse score | > 90 |
| Default theme | Light (nature-inspired palette; dark theme available via toggle) |
| First Contentful Paint | < 2s on 4G |
| SOC 2 Type II | Scoped for v2.1 |

---

## 11. PWA — Single Platform, All Devices

**Technical Decision**: PWA over native apps eliminates three codebases, removes app store dependency, ensures every customer always has the latest version.

### 11.1 Desktop
- Full-width multi-layer interactive map with module toggles
- Side-by-side: map + AI Companion chat panel
- Project management, bulk upload, download centre, research citations

### 11.2 Tablet
- Collapsible side panels, touch-optimised map controls
- In-office review and client-facing walkthroughs

### 11.3 Mobile (Field Use)
- Single-column, thumb-friendly layout
- Guided smartphone capture: framing prompts, quality gate, GPS tagging
- Push notifications on job completion
- Offline mode: service worker caches last-loaded project data and maps
- Voice input to AI Companion
- Home screen install prompt

### 11.4 Technical Requirements
- **Framework**: React 19 + Vite 6, mobile-first responsive (CSS Grid / Flexbox)
- **Service Worker**: Workbox — offline map tiles, project data, AI Companion history
- **Camera**: Web MediaDevices API
- **Push**: Web Push API + VAPID
- **Maps**: MapLibre GL JS (open-source, no vendor lock)
- **State**: Zustand (lightweight, offline-first sync)
- **i18n**: i18next (EN + SV launch; DE + FI in v2.1)
- **Browser support**: Latest 2 versions of Chrome, Safari, Firefox, Edge

---

## 12. Reports
- Auto-generated branded PDF: cover, executive summary, module findings, satellite context, research citations, optional AI Companion export
- Persona-adaptive: inspector reports include valuation tables; service provider reports include action maps
- Rendered via Puppeteer (HTML → PDF) in worker container
- Language: EN + SV (v2.0); DE + FI (v2.1)

---

## 13. Network Sign-Up Portals

### 13.1 Drone Pilot Portal
**Application Flow**: Register → Upload credentials (EU drone operator registration, licence, insurance) → Log equipment → Submit sample orthomosaics → Review (5 business days) → Activation

**Portal Features**: Job board (area, parcel size, modules, fee), capture guidelines (altitude, overlap, GCP, e-nose mounting), secure upload to customer project, earnings dashboard, public profile

### 13.2 Forest Inspector Portal
**Application Flow**: Register → Declare professional role → Immediate activation on email verification → Guided onboarding

**Portal Features**: Inspector dashboard, valuation report template (Skogsstyrelsen guidelines), client project sharing, inspector directory listing

---

## 14. Product Roadmap

### 14.1 Development Sprints (10 weeks to soft launch)

| Sprint | Weeks | Focus |
|---|---|---|
| **S1: Foundation** | 1–2 | Monorepo, Supabase schema, auth+RLS, Hetzner infra, CI/CD, PWA shell, map |
| **S2: Data Pipeline** | 3–4 | Parcel registration, open data sync, LiDAR/satellite pipelines, fusion scaffold, QGIS |
| **S3F: Frontend** | 3–4 | Map dashboard, smartphone capture, survey management, AI Companion UI, offline |
| **S3: AI/ML Modules** | 5–6 | 6 analysis modules (YOLO, ResNet, DeepLab, beetle ensemble), inference runtime |
| **S5: Portals** | 5–6 | Pilot portal, inspector portal, reports, settings, PWA install |
| **S4: AI Companion** | 7–8 | pgvector knowledge base, RAG pipeline, Claude API, guardrails, confidence scoring |
| **S6: Integration** | 7–8 | E2E testing, performance, security audit, accessibility, i18n |
| **S7: Launch Prep** | 9–10 | Staging, load testing, monitoring, docs, beta |

Full sprint plans with task-level detail: [ROADMAP.md](./ROADMAP.md)

### 14.2 Post-Launch Phases

| Phase | Timeline | Status | Key Deliverables |
|---|---|---|---|
| **v1.0 LIVE** | March 2026 | SHIPPED | Full platform. 5 active modules. Multi-source fusion. QGIS backbone. Swedish open data. LiDAR enrichment. Smartphone capture. AI Companion (EN + SV). PWA with light theme default. Pilot + inspector portals. PDF reports. Demo mode. Pricing live. |
| **v1.1** | May 2026 | SHIPPED | AI Knowledge Wingman (full-page RAG). 3-store RAG architecture with Reciprocal Rank Fusion. Shannon-Wiener Biodiversity Service. Canadian FWI fire weather system. 5-source weighted fusion engine. ForestWard Observatory integration. Compound Threat Model. 5-tab information architecture restructure. |
| **v1.2** | July 2026 | IN PROGRESS | 5-tab IA restructure. Intel Center card grid. Mobile bottom nav redesign. Forum launch. Design token refresh. |
| **v2.0** | Q4 2026 | PLANNED | Automated change detection with push alerts. Compound threat alerting. Community-sourced early warning. Partner portal. Finland/Norway registry APIs. Regulatory reporting. Paid satellite tier (PlanetScope 3 m). |

---

## 15. Success Metrics

| Metric | v2.0 Target |
|---|---|
| Active customer projects / month | 40 |
| AI Companion sessions per customer / month | > 5 |
| AI Companion answer quality (thumbs-up) | > 85% |
| Smartphone captures as % of jobs | > 30% |
| Open data enrichment applied | 100% of parcels |
| Avg processing time (standard, fused) | < 24 hours |
| Report accuracy (no re-runs) | > 95% |
| CSAT | > 4.3 / 5.0 |
| Avg modules per order | > 3.0 |
| Research papers indexed | > 2,000 at launch |
| Platform uptime | > 99.5% |

---

## 15B. Community Forum (Skogsforumet)

### 15B.1 Vision

Skogsforumet is the first peer intelligence network for Nordic forest owners. While BeetleSense provides satellite data, AI analysis, and scientific research, the forum adds the one data source no algorithm can replace: what neighboring forest owners are seeing on the ground right now.

The forum transforms isolated forest owners into a connected early-warning network. A beetle sighting reported by one owner benefits every owner within 50 km.

### 15B.2 Channels

**Sightings**
- Beetle observations with GPS coordinates, photos, and severity rating (1-5 scale)
- Observations are geocoded and displayed on the Intel Center map layer
- Proximity alerts: owners within a configurable radius (default 20 km) receive push notifications when a new sighting is posted nearby
- Photo upload with automatic species identification assistance (links to Wingman for confirmation)
- Observation verification: other users can confirm or dispute sightings with their own evidence

**Alerts**
- Community-sourced early warning for acute events: storm damage, illegal logging activity, wildfire smoke, flooding, unusual wildlife behavior
- Alert posts require GPS location and category tag
- High-severity alerts (fire, illegal activity) are flagged for immediate review
- Alerts feed into the Cascading Threat Detection system (Section 5.6) as a community data source

**Reviews**
- Equipment reviews: chainsaws, harvesters, drones, protective gear, software
- Contractor reviews: logging companies, planting services, drone pilots
- Rating system (1-5 stars) with structured review fields (quality, reliability, value, communication)
- Only verified forest owners (with at least one registered parcel) can post reviews
- Contractors/equipment manufacturers can respond to reviews

**Prices**
- Anonymous timber price reports: species, assortment, volume, price (SEK/m3fub), buyer, region, date
- Reports are aggregated and displayed as regional price ranges — no individual transactions are visible
- Price trends charted over time by species and region
- Helps forest owners benchmark offers against market reality
- All price data is anonymous by design — no buyer or seller names are ever displayed

### 15B.3 Moderation & Trust

- **Real-name policy**: Forum participation requires a verified BeetleSense account with at least one registered parcel
- **Observation verification scoring**: Sightings gain credibility when confirmed by multiple independent observers. Score displayed as verification level (Unverified / Community-Verified / Expert-Verified)
- **Expert badges**: Certified foresters (skogsvardare), forest inspectors, and researchers can apply for verified expert badges. Expert confirmations carry higher verification weight.
- **Content moderation**: Automated spam filtering + community flagging. Flagged content reviewed within 24 hours.
- **Geographic relevance**: Users see content from their region first, with option to expand to national view

### 15B.4 Privacy

- Price reports are always anonymous — aggregated into regional ranges before display
- Sighting locations are shown at approximate level (within 1 km) to non-owners; exact coordinates visible only to the reporting user and verified experts
- Users can choose to display their name or a pseudonym on forum posts (real identity always known to platform for moderation)
- No personal data is shared with third parties from forum activity

---

## 16. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| AI Companion hallucination | High | Strict RAG; confidence indicators; domain classifier; human review queue |
| Open data API breakage | Medium | Local cache; graceful degradation; flag missing layers |
| Satellite cloud cover | Medium | Sentinel-1 SAR fallback; communicate staleness dates |
| Smartphone image quality | Medium | In-app quality gate; confidence weighting; supplements, never replaces drone |
| Model accuracy in new geographies | High | Active learning; expert review; geographic coverage map |
| Over-reliance on AI advice | Medium | Disclosures; "consult certified manager" caveat; never auto-recommend regulatory actions |
| E-nose supply chain disruption | Medium | Vision-only fallback mode; component buffer; second-source evaluation |
| Competitor copying open data approach | Low | Moat = fusion engine + e-nose IP + research curation + Module 6 |

---

## 17. Commercial Model

### 17.1 Pricing Tiers

| | Starter | Professional | Enterprise |
|---|---|---|---|
| **Best For** | Small owners, first survey | Active owners, service providers, inspectors | Large estates, forestry companies |
| **Pricing** | Per-survey, per-hectare | Monthly subscription (500 ha/month included) | Annual contract, unlimited ha |
| **Modules** | Choose 1–2 per survey | All modules, bundle pricing | All + Module 6 + API access |
| **AI Companion** | Basic (10 sessions/month) | Full, unlimited | Full + white-label option |
| **Reports** | PDF per survey | PDF + GIS exports + branded | Custom templates + regulatory |
| **SLA** | 24h standard | 24h + priority 4h available | Priority 4h guaranteed |

### 17.2 Drone Pilot Network
Open partner network of certified pilots. Sign up via Pilot Portal. Vetting: EU drone operator registration, A2/A3 certification, survey experience. Paid per mission.

### 17.3 Inspector Network
Self-service sign-up. Professional tier from day one. Inspector-specific report templates. Listed in regional directory.

### 17.4 Open Questions
- AI Companion liability disclaimers (Sweden, Germany, Finland) — legal review in progress
- Research knowledge base licensing (open-access derivative commercial use) — legal review in progress
- Satellite premium tier trigger point — evaluate at 100 enterprise parcels

---

## 17B. Competitive Positioning

### 17B.1 Intelligence Layer vs. Administration Layer

BeetleSense occupies a fundamentally different position in the forest owner's toolkit compared to cooperative membership apps. Cooperative apps (Sodra, SCA, Mellanskog) serve as the ADMINISTRATION layer — managing contracts, finances, inspector communication, and member services. BeetleSense serves as the INTELLIGENCE layer — providing AI-powered analysis, multi-source data fusion, scientific models, and decision support.

These roles are complementary, not competitive. A forest owner uses their cooperative app to manage their timber contract and check payment status. They use BeetleSense to understand what is happening in their forest, what it means, and what to do about it.

### 17B.2 Feature Comparison Matrix

| Capability | BeetleSense | Sodra / SCA / Mellanskog |
|---|---|---|
| AI advisor (RAG, research-backed) | Yes | No |
| Multi-source data fusion (drone + satellite + smartphone + government + community) | Yes | No |
| Compound threat detection (beetle-fire-drought interaction) | Yes | No |
| Scientific ecological models (Shannon-Wiener, FWI, Marklund) | Yes | No |
| Community peer intelligence (sightings, alerts, price transparency) | Yes | No |
| Research knowledge base (2,000+ papers) | Yes | No |
| Timber contracts and payment management | No | Yes |
| Member financial services (loans, insurance via cooperative) | No | Yes |
| Inspector messaging and scheduling | No | Yes |
| BankID authentication for official transactions | No | Yes |
| Established user base (50,000+ members per cooperative) | No | Yes |
| Regulatory filings on behalf of owner | No | Yes |

### 17B.3 Positioning Statement

BeetleSense is the intelligence partner that makes cooperative membership more valuable — not a replacement for it. Forest owners who understand their forest better make better decisions about when to harvest, which contractor to hire, and what price to accept. BeetleSense provides the understanding; the cooperative provides the execution infrastructure.

**Go-to-market implication**: BeetleSense should seek partnership conversations with cooperatives, not compete for their users. A cooperative that offers BeetleSense intelligence to its members differentiates itself from competing cooperatives.

---

## 18. Technical Architecture Reference

Full technical architecture documented in [ARCHITECTURE.md](./ARCHITECTURE.md), covering:
- System component diagram
- Complete tech stack (frontend, backend, AI/ML)
- Database schema (PostgreSQL + PostGIS + pgvector)
- API design (Edge Functions + internal worker APIs)
- AI/ML processing pipeline
- Infrastructure & deployment (Hetzner + Supabase + Vercel)
- Key architectural decisions and trade-offs
- Security architecture
- Cost estimates (~650–1,000 EUR/month at launch)

---

## 19. Differentiated UX Strategy

### 19.1 Design Philosophy: "Quiet Confidence"

BeetleSense's design language communicates authority without intimidation. The platform handles complex scientific data, ecological models, and regulatory information — but presents it all with the warmth and clarity of a trusted advisor sitting across the kitchen table. The aesthetic is authoritative but welcoming: a professional tool that doesn't feel like enterprise software.

### 19.2 Key UX Principles

**1. Five Taps to Any Feature**

Every feature in the platform is reachable within five taps from any starting point. The 5-tab architecture (Section 4B) ensures that the top-level navigation is always one tap away (bottom bar on mobile, icon rail on desktop), and no detail page is more than three levels deep within any tab.

**2. Cards Over Menus (Show Live Data, Not Labels)**

The Intel Center (Tab 2) replaces traditional menu-driven navigation with live data cards. Each card displays a current value — a beetle risk level, an NDVI reading, a price range — not a label like "Beetle Module" or "Fire Risk Settings." Users see what matters at a glance without navigating into anything. The card surface IS the information.

**3. Progressive Disclosure (Dashboard → Card → Detail)**

Information is layered in three tiers:
- **Dashboard** (Tab 1): aggregated health score and top alerts — the 10-second daily check
- **Card** (Tab 2): current value per monitoring dimension — the 30-second scan
- **Detail page**: full historical charts, methodology, raw data, recommended actions — the deep dive

Users choose their depth. Most daily visits stay at Tier 1 or Tier 2. Tier 3 is always available but never forced.

**4. Wingman as Default Entry Point**

The Wingman (Tab 3) is positioned as the platform's front door for new users and the daily starting point for returning users. Suggested prompts on the empty state guide first-time users toward their most pressing questions. The Wingman can link to any other section of the platform in its responses, making it a natural hub for discovery.

**5. Swedish-First Design**

The visual language reflects Nordic forest culture:
- **Natural palette**: cream backgrounds (#F5F7F4), forest greens, earth tones — no harsh corporate blues
- **Typography**: DM Sans for body text (clean, modern, highly legible), Cormorant Garamond for serif accents (warmth, tradition, authority)
- **Imagery**: forest photography, hand-drawn botanical illustrations for empty states, seasonal color shifts in the UI
- **Language**: Swedish is the primary language; UI copy is written in Swedish first, then translated. Swedish forestry terminology (avverkningsanmalan, nyckelbiotop, skogsvardare) is used natively, not anglicized.
- **Spacing and density**: generous whitespace, comfortable tap targets (minimum 44px), breathing room around data — the design should feel like a walk in the forest, not a cockpit

---

## Appendix C: Changes from PRD v2.2 → v2.3

1. **Updated Executive Summary** (Section 1) — Version bumped to v2.3. Added 4th foundational pillar: Community Intelligence. Updated Current Status to document v1.1 SHIPPED milestone with all 8 new capabilities.
2. **Expanded Goals** (Section 3.1) — Added three new goals: 5-tab architecture cognitive load reduction, AI Knowledge Wingman as hero feature, and community intelligence layer for Nordic forest owners.
3. **Expanded Non-Goals** (Section 3.2) — Added: BeetleSense will not replace cooperative membership apps.
4. **NEW Section 4B: 5-Tab Information Architecture** — Complete specification of Min Skog, Bevakning, Wingman, Skogsforumet, and Mer tabs with desktop vs. mobile behavior.
5. **Renamed Section 5** to "Multi-Source Data Fusion Engine" — Added subsections 5.5 (5-Source Weighted Architecture), 5.6 (Cascading Threat Detection), and 5.7 (Compound Threat Model with scientific references).
6. **Major rewrite of Section 9** — Renamed to "AI Knowledge Wingman — Hero Feature." Repositioned as platform hero feature (9.1). Upgraded to 3-store RAG architecture (9.2). Updated technical architecture with RRF, confidence scoring, citation rendering, streaming SSE, and EU AI Act disclaimer (9.3). Redesigned interface as full-page layout with 720px content column, conversation sessions, suggested prompts, and color-coded citation pills (9.6).
7. **NEW Section 9B: RAG Knowledge Service Architecture** — 3-store vector architecture specification, 7-step retrieval pipeline, and confidence threshold definitions.
8. **NEW Section 9C: Ecological Calculation Services** — Shannon-Wiener biodiversity service with H', Simpson 1-D, Pielou J', and EU Biodiversity Strategy 2030 alignment. Canadian FWI system with all six components and Swedish MSB thresholds. ForestWard Observatory bidirectional EFI pipeline.
9. **Updated Roadmap** (Section 14.2) — v1.1 status changed to SHIPPED with 8 new capabilities listed. v1.2 updated to include 5-tab IA restructure, Intel Center card grid, mobile bottom nav redesign, forum launch, and design token refresh. v2.0 updated to include compound threat alerting and community-sourced early warning.
10. **NEW Section 15B: Community Forum (Skogsforumet)** — Vision, four channels (Sightings, Alerts, Reviews, Prices), moderation and trust framework, and privacy protections.
11. **NEW Section 17B: Competitive Positioning** — Intelligence layer vs. administration layer framing, feature comparison matrix (BeetleSense vs. Sodra/SCA/Mellanskog), and positioning statement with go-to-market implications.
12. **NEW Section 19: Differentiated UX Strategy** — "Quiet Confidence" design philosophy and five key UX principles: Five Taps to Any Feature, Cards Over Menus, Progressive Disclosure, Wingman as Default Entry Point, and Swedish-First Design.

---

## Appendix B: Changes from PRD v2.1 → v2.2

1. **Added Current Status section** (Section 1) — documents v1.0 launch, light theme default, demo mode, bilingual support, removal of placeholder stats and EU FORWARDS banner
2. **Updated roadmap** (Section 14.2) — v1.0 marked as SHIPPED, v1.1 moved to May 2026, v1.2 moved to July 2026, added status column
3. **Added light theme requirement** (Section 10.3) — light theme is the default; dark theme available via toggle
4. **Document version bumped** to v2.2 (April 2026)

---

## Appendix A: Changes from PRD v2.0 → v2.1

1. **Added Technical Architecture Reference** (Section 18) — links to full architecture doc with tech stack decisions
2. **Specified AI model choices** per module (Section 8) — YOLO v8, ResNet-50, DeepLabv3+, ensemble beetle detection
3. **Clarified AI Companion architecture** (Section 9.3) — RAG pipeline, pgvector, Claude API, streaming SSE
4. **Added coordinate reference system** — SWEREF99 TM (EPSG:3006) for Swedish parcels, WGS 84 for display
5. **Specified MapLibre GL** as map component (replacing generic "Leaflet / MapLibre" mention)
6. **Added state management** — Zustand for offline-first sync
7. **Added job orchestration details** — BullMQ with priority queues for SLA enforcement
8. **Clarified PWA technical stack** — React 19 + Vite 6 + Workbox + Web Push API
9. **Added infrastructure choices** — Hetzner (EU) for compute, Supabase for platform, Vercel for CDN
10. **Added cost estimate** — ~650–1,000 EUR/month at launch scale
11. **Added non-goal**: no native iOS/Android apps
12. **Consolidated Section numbering** — fixed inconsistent numbering from v2.0
13. **Added latency clarification** — AI Companion <5s is first-token, not full response
