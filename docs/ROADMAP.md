# BeetleSense.ai — Development Roadmap

## Sprint Overview

```
Week 1-2    ┃ Sprint 1: Foundation
            ┃ Monorepo · Supabase schema · Auth · RLS · Hetzner infra · CI/CD · PWA shell · Map
            ┃
Week 3-4    ┃ Sprint 2: Data Pipeline          ┃ Sprint 3F: Frontend PWA
            ┃ Parcel registration               ┃ Map dashboard
            ┃ Open data sync                    ┃ Smartphone capture
            ┃ LiDAR pipeline                    ┃ Survey management
            ┃ Satellite fetch                   ┃ AI Companion UI
            ┃ Upload pipeline                   ┃ Push notifications
            ┃ Fusion engine scaffold            ┃ Offline mode
            ┃ QGIS Server                       ┃
            ┃                                   ┃
Week 5-6    ┃ Sprint 3: AI/ML Modules           ┃ Sprint 5: Portals + Reports
            ┃ Inference runtime + registry       ┃ Pilot portal (apply, jobs, upload, earnings)
            ┃ Mod 1: Tree Count (YOLO+LiDAR)    ┃ Inspector portal (register, dashboard, reports)
            ┃ Mod 2: Species ID (ResNet+S2)      ┃ Report viewer (PDF preview, download, share)
            ┃ Mod 3: Animal Inventory (YOLO)     ┃ Settings (language, notifications, parcels)
            ┃ Mod 4: Beetle Detection (ensemble) ┃ PWA install prompt
            ┃ Mod 5: Boar Damage (DeepLab)       ┃
            ┃ Mod 6: Scaffold                    ┃
            ┃                                   ┃
Week 7-8    ┃ Sprint 4: AI Companion            ┃ Sprint 6: Integration + QA
            ┃ pgvector knowledge base (3 layers) ┃ End-to-end flow testing
            ┃ Paper ingestion (2,000+)           ┃ Performance optimization
            ┃ RAG retrieval pipeline             ┃ SLA enforcement verification
            ┃ Claude API + SSE streaming          ┃ Security audit
            ┃ Guardrails + hallucination detect  ┃ Accessibility pass
            ┃ Confidence scoring                 ┃ Translation completion (SV)
            ┃                                   ┃ Lighthouse optimization
            ┃                                   ┃
Week 9-10   ┃ Sprint 7: Launch Prep
            ┃ Staging environment validation
            ┃ Load testing (50 concurrent users)
            ┃ Monitoring + alerting setup (Grafana/Sentry)
            ┃ Documentation (API docs, user guides)
            ┃ Pricing tier enforcement
            ┃ Landing page → PWA integration
            ┃ DNS + SSL + domain setup
            ┃ Soft launch to beta users
```

---

## Sprint Dependency Map

```
Sprint 1: Foundation
    │
    ├──→ Sprint 2: Data Pipeline ──→ Sprint 3: AI/ML Modules ──→ Sprint 4: AI Companion
    │                                      │
    ├──→ Sprint 3F: Frontend PWA ──────────┤
    │                                      │
    │                               Sprint 5: Portals + Reports
    │                                      │
    └──────────────────────────────→ Sprint 6: Integration + QA
                                           │
                                    Sprint 7: Launch Prep
```

---

## Sprint Summary

### Sprint 1: Foundation (Week 1-2)
**8 work streams · 2-week duration**

| Stream | Tasks | Owner |
|---|---|---|
| 1.1 Monorepo (Turborepo + pnpm) | Package structure, turbo.json, tsconfig | Infra |
| 1.2 Shared types | TypeScript types + Zod schemas | Full-stack |
| 2.1–2.2 Supabase + schema | PostGIS + pgvector, 5 core tables, seed data | Backend |
| 3.1–3.2 Auth | Magic link + password + MFA, frontend auth UI | Backend + Frontend |
| 4.1 RLS policies | Multi-tenant isolation on all tables | Backend |
| 5.1–5.2 Hetzner infra | Docker Compose, Redis, BullMQ scaffold | Infra + Backend |
| 6.1 CI/CD | GitHub Actions: lint, typecheck, test, deploy | Infra |
| 7.1–8.1 PWA + Map | Vite+React+Tailwind, Workbox, MapLibre+ortofoto | Frontend |

**Exit criteria**: Clone → install → dev → PWA with map showing seeded parcels. Auth works. RLS enforced. CI rejects bad PRs.

---

### Sprint 2: Data Pipeline (Week 3-4)
**8 work streams · 64 story points**

| Stream | Key Deliverables |
|---|---|
| Parcel registration | Lantmäteriet lookup → boundary auto-load → BullMQ orchestrator |
| Open data sync | Nightly scheduler; Lantmäteriet, Skogsstyrelsen, SGU, SMHI fetchers |
| LiDAR pipeline | Tile download → PDAL → CHM/DTM/DSM as COG |
| Satellite fetch | Sentinel-2 discovery/download → cloud mask → NDVI/EVI/NDMI |
| File upload | Presigned URLs → validation worker → drone metadata extraction |
| Fusion engine | Spatial alignment to 1m grid → VRT stack builder |
| QGIS Server | Docker image → per-parcel project generator → WMS/WFS gateway |
| Object storage | 4 buckets, IAM, lifecycle policies |

**Exit criteria**: Register a fastighets_id → auto-loads all Swedish data layers. LiDAR/satellite pipelines produce valid COGs. QGIS serves styled WMS tiles.

---

### Sprint 3: AI/ML Analysis Modules (Week 5-6)
**26 tasks · 3 roles (ML Engineer, Data Scientist, Backend)**

| Module | Model | Key Metric |
|---|---|---|
| Tree Count | YOLO v8 + LiDAR CHM fusion | mAP >= 0.82, F1 +5% with LiDAR |
| Species ID | ResNet-50 + temporal attention + Sentinel-2 | Top-1 accuracy >= 78% |
| Animal Inventory | YOLO v8 thermal/RGB dual-stream | mAP >= 0.75 thermal, 0.80 RGB |
| Beetle Detection | Spectral CNN + 1D-CNN/XGBoost VOC ensemble | Fusion AUC >= 0.92 |
| Wild Boar Damage | DeepLabv3+ segmentation | mIoU >= 0.72 |
| Module 6 | Scaffold only | Interface complete |

Plus: model registry, BullMQ dispatcher, GPU memory management, benchmarks.

---

### Sprint 3F: Frontend PWA (Week 3-4, parallel with Sprint 2)
**6 feature areas · 21 days total effort**

| Feature | Estimate |
|---|---|
| Map dashboard (MapLibre + 7 subtasks) | 5 days |
| Smartphone capture (camera + quality gates + GPS + offline queue) | 4 days |
| Survey management (wizard + list + real-time status) | 3 days |
| AI Companion chat (streaming + citations + voice + context buttons) | 4 days |
| Push notifications (VAPID + job alerts) | 2 days |
| Offline mode (Workbox + tile cache + sync) | 3 days |

---

### Sprint 4: AI Companion (Week 7-8)
**22 tasks · 3 roles**

| Area | Key Deliverables |
|---|---|
| Knowledge base | 3-layer pgvector schema; 2,000+ papers ingested; domain rules curated |
| Retrieval | Intent classifier; parallel pgvector search across layers; cross-encoder re-ranking |
| Generation | Claude API + SSE streaming; conversation memory; citation injection |
| Safety | Domain guardrails; NLI hallucination detection; confidence scoring; rate limiting |
| Quality | E2E test; 50-session load test; analytics logging; OpenAPI docs |

**Target**: Recall@5 >= 0.80, P95 TTFT < 1.5s, >= 80% claims cited.

---

### Sprint 5: Portals + Reports (Week 5-6, parallel with Sprint 3)
**8 feature areas**

| Feature | Estimate |
|---|---|
| Pilot application flow | 3 days |
| Pilot job board + operations | 4 days |
| Pilot public profile | 1 day |
| Inspector registration + dashboard | 3 days |
| Report viewer (PDF) | 2 days |
| Report generation trigger | 1 day |
| Settings (language, notifications, parcels) | 2 days |
| PWA install prompt | 1.5 days |

---

### Sprint 6: Integration + QA (Week 7-8)
- End-to-end flow: register parcel → upload drone data → process → view results → AI Companion Q&A
- Performance: Lighthouse > 90, FCP < 2s, API p95 < 500ms
- SLA: verify 24h/4h processing enforcement with BullMQ priority queues
- Security: OWASP top 10 review, RLS audit, JWT expiry validation
- Accessibility: WCAG 2.1 AA, keyboard navigation, screen reader
- i18n: complete Swedish translations
- Browser: Chrome, Safari, Firefox, Edge (latest 2)

### Sprint 7: Launch Prep (Week 9-10)
- Staging environment with production-like data
- Load test: 50 concurrent users, 10 parallel processing jobs
- Monitoring: Grafana dashboards, Sentry error tracking, UptimeRobot
- Documentation: API docs (OpenAPI), user guides (EN + SV), pilot capture SOP
- Pricing enforcement: Supabase RLS + Edge Function checks per tier
- Landing page integration: sign-up flows link to PWA auth
- DNS: beetlesense.ai → Vercel (PWA) + Cloudflare (WAF)
- Beta: invite 5-10 forest owners for soft launch feedback

---

## Team Size Estimate

| Role | Sprint 1 | S2 | S3 | S3F | S4 | S5 | S6 | S7 |
|---|---|---|---|---|---|---|---|---|
| Infra | ██ | █ | | | | | █ | █ |
| Backend | ██ | ██ | █ | | ███ | | █ | █ |
| Frontend | ██ | | | ███ | | ███ | █ | █ |
| ML Engineer | █ | | ███ | | █ | | | |
| Data Scientist | | | ██ | | █ | | | |
| Designer | | | | █ | | █ | | █ |

**Minimum viable team**: 2 full-stack + 1 ML engineer + 1 designer (part-time)
**Optimal team**: 1 infra + 2 backend + 2 frontend + 1 ML engineer + 1 data scientist + 1 designer

---

## Critical Path

```
Sprint 1 → Sprint 2 → Sprint 3 (AI/ML) → Sprint 4 (AI Companion) → Sprint 6 → Sprint 7
                                                                          ↑
Sprint 1 → Sprint 3F (Frontend) → Sprint 5 (Portals) ────────────────────┘
```

**Total timeline**: ~10 weeks from start to soft launch.
**Parallel tracks**: Frontend (3F + 5) runs independently of Data/AI (2 + 3 + 4) after Sprint 1.
