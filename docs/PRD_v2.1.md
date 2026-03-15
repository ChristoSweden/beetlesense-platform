# BeetleSense.ai — Forest Intelligence Platform
## Product Requirements Document v2.1

**Q1 2026 | INTERNAL + INVESTOR USE | CONFIDENTIAL**
**Last updated: 15 March 2026**

---

## 1. Executive Summary

BeetleSense.ai is an AI-powered, drone-native forest health intelligence platform. Version 2.0 introduces three foundational pillars:

1. **Multi-Source Data Fusion** — drone imagery, smartphone photos, and open satellite imagery unified into a single analysis engine.
2. **Open Data & Research Integration** — all available open forest damage datasets, grounded in peer-reviewed research from leading forestry institutions.
3. **Forest Expert AI Companion** — a conversational AI trained exclusively on forestry knowledge and each customer's own forest data.

**Mission**: Empower forest owners, service providers, and inspectors with the most complete, research-backed, multi-source forest intelligence platform — combining proprietary sensor technology, open global data, and expert AI into a single actionable service.

**Vision**: A world in which no forest owner is caught off-guard by beetle infestation, disease, or environmental damage — because BeetleSense sees it first, explains it clearly, and tells them exactly what to do.

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

### 3.2 Non-Goals (v2.0)
- BeetleSense will NOT build drone hardware or flight-planning software
- Real-time in-flight processing is out of scope — analysis is post-flight batch
- Paid satellite imagery is out of scope; only open/free sources in v2.0
- Native iOS/Android apps — PWA serves all devices from one codebase

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

## 5. Multi-Source Data Fusion

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

---

## 6. QGIS Integration & Swedish Open Geospatial Data

### 6.1 QGIS as Geospatial Engine
- Open source (GNU GPL) — zero licensing cost
- QGIS Server exposes WMS/WFS/WCS web services consumed by the PWA map layer (MapLibre GL)
- PyQGIS API for custom spatial processing pipelines
- Processing Framework integrates GDAL, SAGA, GRASS, OTB
- **Pipelines**: LiDAR processing (DTM/CHM via PDAL), orthomosaic generation, spatial overlay analysis, change detection, report cartography

### 6.2 Swedish Open Datasets

**Lantmäteriet (Mapping Authority)**:
| Dataset | Application |
|---|---|
| Fastighetskartan (Property Map) | Parcel boundary auto-load by fastighets-ID |
| Höjdmodell 2 m (DTM) | Terrain slope, drainage, LiDAR co-registration |
| Nationella Marktäckedata (NMD) | Land cover classification (forest, wetland, open) |
| Ortofoto | Base map layer in dashboard |
| Transportnätet | Forest road network for harvest access routes |
| **Laserdata (National LiDAR)** | **0.5–1 pt/m² nationwide. CHM + DTM per parcel on registration. Key differentiator.** |

**Skogsstyrelsen (Forest Agency)**:
| Dataset | Application |
|---|---|
| KNN Sverige | Per-pixel basal area, volume, height, age, species |
| Avverkningsanmälningar | Harvest notifications — beetle pressure context |
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
- **Model**: YOLO v8/v9 with LiDAR CHM (Lantmäteriet) as height prior
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

## 9. Forest Expert AI Companion

### 9.1 Vision
Every forest owner deserves access to world-class forestry expertise. The Companion is not a general-purpose chatbot — it is a domain-expert AI, trained exclusively on forestry knowledge, calibrated to each customer's specific forest data.

### 9.2 Knowledge Architecture (Three Layers)

| Layer | Source | What It Provides |
|---|---|---|
| **Layer 1: Forest Science** | Peer-reviewed literature, EFI/SLU/NIBIO/Luke research, open-access textbooks | Beetle biology, species ecology, treatment protocols, silviculture, forest law |
| **Layer 2: Open Global Data** | EFFIS, BBOA, Global Forest Watch, Copernicus, national inventories, soil/climate | Regional risk context, seasonal alerts, NDVI trends |
| **Layer 3: Customer Forest Data** | Customer's own BeetleSense survey results, e-nose readings, species maps, history | Hyper-personalised answers tied to specific parcels and surveys |

### 9.3 Technical Implementation

**Architecture**: RAG (Retrieval-Augmented Generation) over three knowledge layers using pgvector in Supabase PostgreSQL.

```
User Query → Intent Classify → Query Embedding
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        Layer 1: research     Layer 2: regulatory   Layer 3: user data
        (pgvector top-5)      (pgvector top-3)      (pgvector top-5, RLS)
              └─────────────────────┼─────────────────────┘
                                    ▼
                          Context Assembly (~12k tokens)
                                    ▼
                          LLM (Claude API) — streaming SSE
                          Forest scientist persona + source citations
```

- **Foundation model**: Claude API with forestry system prompt
- **Vector store**: pgvector (HNSW index) in Supabase PostgreSQL
- **Embeddings**: text-embedding-3-small or Cohere Embed v3 (multilingual)
- **Customer data isolation**: RLS on `user_data_embeddings` — Companion only accesses authenticated customer's Layer 3
- **Guardrails**: Domain classifier rejects non-forestry queries; hallucination detection flags low-grounding responses
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
- Chat interface in PWA — adapts from desktop sidebar to mobile full-screen
- Threaded conversation history per forest project
- "Ask about this" contextual button on every map region, chart, report section
- Voice input for hands-free field queries
- Saved answers exportable as PDF addenda
- **Latency target**: < 5s for 90th percentile response time (first token)

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

| Phase | Timeline | Key Deliverables |
|---|---|---|
| **v1.0 LIVE** | March 2026 | Full platform. 5 active modules. Multi-source fusion. QGIS backbone. Swedish open data. LiDAR enrichment. Smartphone capture. AI Companion (EN + SV). PWA. Pilot + inspector portals. PDF reports. Pricing live. |
| **v1.1** | April 2026 | Module 6. AI scenario modelling. Landsat back-catalogue. Sentinel-1 SAR. Research citation explorer. DE + FI language. |
| **v1.2** | June 2026 | Multi-year trend dashboards. Inspector valuation template (audit-ready). API access tier. Pilot–owner scheduling. SOC 2 initiation. |
| **v2.0** | Q4 2026 | Automated change detection with push alerts. Partner portal. Finland/Norway registry APIs. Regulatory reporting. Paid satellite tier (PlanetScope 3 m). |

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

## Appendix: Changes from PRD v2.0 → v2.1

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
