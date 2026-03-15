# BeetleSense.ai — Sprint 3 & Sprint 4 Plans

---

## Sprint 3: AI/ML Analysis Modules

**Duration:** 2 weeks (Days 1–14)
**Depends on:** Sprint 1 (Infrastructure & DevOps), Sprint 2 (Core Platform Backend)
**Assumed complete:** Hetzner GPU server provisioned (RTX 4000 SFF Ada), BullMQ job queue operational, PostGIS + S3 storage layer live, ONNX Runtime and TorchServe serving infrastructure deployed, authentication and project CRUD in place.

---

### 3.1 — Inference Runtime & Model Registry

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.1.1 | Build unified model registry service (`/api/models`) that tracks model name, version, framework (ONNX/TorchServe), input schema, and health status in PostgreSQL | Backend | Registry exposes GET/POST/PATCH endpoints; models table includes `name`, `version`, `framework`, `input_schema_json`, `status`, `s3_artifact_path`, `created_at`; unit tests pass |
| 3.1.2 | Implement ONNX Runtime inference wrapper — loads `.onnx` model from S3, runs batch inference, returns numpy-compatible tensors | ML Engineer | Wrapper accepts arbitrary batch size up to 16; latency < 200ms for single 1024x1024 image on RTX 4000 SFF Ada; memory-mapped model loading verified |
| 3.1.3 | Implement TorchServe inference wrapper — MAR packaging script, health check, and batch inference endpoint | ML Engineer | TorchServe starts with `--models` flag; `/predictions/{model}` returns valid JSON; GPU utilization confirmed via `nvidia-smi` during inference |
| 3.1.4 | Create abstract `BaseModule` class that all 6 modules inherit: `preprocess()`, `infer()`, `postprocess()`, `to_geojson()`, `to_raster()` | ML Engineer | All methods have type hints and docstrings; `to_geojson()` outputs valid GeoJSON FeatureCollection; `to_raster()` outputs confidence-scored GeoTIFF with CRS metadata |
| 3.1.5 | Wire BullMQ job handler to dispatch module jobs — job payload includes `module_id`, `project_id`, `input_refs[]` (S3 keys), `parameters` | Backend | Job created via `POST /api/analysis/run`; BullMQ picks up job within 2s; job status transitions: `queued → processing → completed/failed`; parallel dispatch of up to 4 modules confirmed |
| 3.1.6 | Implement result persistence — module output GeoJSON written to PostGIS (`analysis_results` table with geometry column), rasters uploaded to S3 with presigned URL generation | Backend | GeoJSON insertable and queryable via `ST_Within` / `ST_Intersects`; raster S3 key stored in `analysis_results.raster_s3_key`; presigned URLs valid for 1 hour |

**Dependencies:** 3.1.4 blocks all module tasks (3.2–3.6). 3.1.5 depends on 3.1.2 and 3.1.3. 3.1.6 depends on Sprint 2 PostGIS schema.

---

### 3.2 — Module 1: Tree Count

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.2.1 | Train/fine-tune YOLOv8-nano on labeled tree crown dataset (min 5,000 annotations); export to ONNX | Data Scientist | mAP@0.5 >= 0.82 on validation set; ONNX export runs without errors; model size < 25MB |
| 3.2.2 | Implement LiDAR CHM (Canopy Height Model) prior — rasterize LiDAR point cloud to 1m CHM, extract local maxima as candidate tree positions | ML Engineer | CHM raster generated from `.las`/`.laz` input; local maxima detected using configurable window size (default 3m); output: GeoJSON points with `height_m` attribute |
| 3.2.3 | Fuse YOLO detections with CHM priors — match detections within 2m radius, boost confidence for corroborated detections, flag orphans | ML Engineer | Fused output contains `confidence`, `source` (yolo/lidar/fused), `height_m`; corroborated detections have confidence >= 0.85; F1-score improvement >= 5% over YOLO-only baseline |
| 3.2.4 | Implement `TreeCountModule(BaseModule)` — full pipeline from S3 inputs to GeoJSON points stored in PostGIS | ML Engineer | End-to-end test: upload test ortho + LiDAR → trigger job → GeoJSON with per-tree points written to PostGIS within 60s for 50-hectare area |

**Dependencies:** 3.2.1 and 3.2.2 can run in parallel. 3.2.3 depends on both. 3.2.4 depends on 3.1.4 and 3.2.3.

---

### 3.3 — Module 2: Species Identification

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.3.1 | Fine-tune ResNet-50 backbone on multispectral tree species dataset (target: 15+ species common to Central European forests); add temporal attention head for Sentinel-2 phenology bands | Data Scientist | Top-1 accuracy >= 78% on held-out test set; temporal attention uses 6-month Sentinel-2 NDVI timeseries (12 timesteps); model exported to ONNX |
| 3.3.2 | Build Sentinel-2 phenology data pipeline — fetch cloud-free composites via Copernicus API for project AOI, compute NDVI/EVI timeseries, align to drone orthomosaic grid | Backend | Pipeline fetches last 12 months of Sentinel-2 L2A; cloud mask applied (SCL band); NDVI raster stack aligned to project CRS; cached in S3 per project |
| 3.3.3 | Implement `SpeciesIDModule(BaseModule)` — tile-based inference on multispectral ortho + phenology stack, majority-vote per tree crown (using Module 1 polygons), output species classification map | ML Engineer | Species map is a GeoJSON polygon layer with `species`, `confidence`, `crown_area_m2`; per-species confidence >= 0.6 threshold (below = "unclassified"); processing < 90s for 50-hectare area |

**Dependencies:** 3.3.1 and 3.3.2 can run in parallel. 3.3.3 depends on both, plus 3.1.4 and optionally 3.2.4 (for tree crown polygons).

---

### 3.4 — Module 3: Animal Inventory

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.4.1 | Fine-tune YOLOv8-medium on thermal + RGB wildlife dataset (target species: deer, wild boar, fox, hare, birds of prey — min 8 classes) | Data Scientist | mAP@0.5 >= 0.75 on thermal, >= 0.80 on RGB; ONNX export functional; false positive rate on non-animal objects < 5% |
| 3.4.2 | Implement dual-stream preprocessing — thermal normalization (14-bit to 8-bit with dynamic range), RGB-thermal spatial alignment using homography | ML Engineer | Thermal images normalized to 0–255 with 98th percentile clipping; RGB-thermal alignment error < 3 pixels (validated on calibration targets) |
| 3.4.3 | Implement `AnimalInventoryModule(BaseModule)` — detect, classify, deduplicate (NMS + temporal tracking across frames), output species count + location GeoJSON | ML Engineer | Output GeoJSON points with `species`, `confidence`, `timestamp`, `body_temp_estimate` (thermal only); deduplication reduces double-counts by >= 40% vs raw detections; summary JSON includes per-species count |

**Dependencies:** 3.4.1 and 3.4.2 parallel. 3.4.3 depends on both + 3.1.4.

---

### 3.5 — Module 4: Beetle Detection (Flagship)

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.5.1 | Train spectral anomaly CNN — 2D-CNN on multispectral drone imagery targeting chlorophyll-a degradation patterns (bands: Red Edge, NIR, SWIR) | Data Scientist | Binary classification (healthy/stressed) AUC >= 0.88; model generalizes across 3+ forest sites in validation; ONNX export < 50MB |
| 3.5.2 | Train 1D-CNN + XGBoost ensemble on e-nose VOC (volatile organic compound) sensor data — features: monoterpene ratios, ethanol peaks, temporal gradients | Data Scientist | XGBoost AUC >= 0.83 on tabular VOC features; 1D-CNN AUC >= 0.80 on raw VOC timeseries; ensemble (average logits) AUC >= 0.90 |
| 3.5.3 | Implement dual-modality fusion layer — late fusion of spectral CNN probability map + VOC ensemble predictions; spatial interpolation of point-source VOC to raster grid via kriging | ML Engineer | Fusion output is a continuous risk heatmap (0.0–1.0) at 5m resolution; kriging variogram fitted automatically; fusion AUC >= 0.92 (improvement over either modality alone) |
| 3.5.4 | Implement severity grading — threshold risk heatmap into 4 grades: `none` (< 0.2), `early` (0.2–0.5), `active` (0.5–0.8), `severe` (>= 0.8); vectorize grade boundaries to polygons | ML Engineer | Output GeoJSON polygons with `severity_grade`, `mean_risk_score`, `area_m2`; polygons simplified (Douglas-Peucker, tolerance 2m) to reduce size; severity grades validated against ground-truth on 2+ test sites |
| 3.5.5 | Implement `BeetleDetectionModule(BaseModule)` — orchestrate both modalities, handle missing modality gracefully (VOC-only or spectral-only fallback), persist heatmap raster + severity polygons | ML Engineer | Full dual-modality run completes in < 120s for 100-hectare area; single-modality fallback produces valid output with degraded confidence flag; heatmap raster (GeoTIFF, float32) + severity GeoJSON both written to PostGIS/S3 |

**Dependencies:** 3.5.1 and 3.5.2 parallel (Data Scientist). 3.5.3 depends on both. 3.5.4 depends on 3.5.3. 3.5.5 depends on 3.5.4 + 3.1.4.

---

### 3.6 — Module 5: Wild Boar Damage Assessment

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.6.1 | Fine-tune DeepLabv3+ (ResNet-101 backbone) on labeled ground disturbance dataset — classes: `undamaged`, `rooting_damage`, `wallowing`, `trail` | Data Scientist | mIoU >= 0.72 on validation set; per-class IoU for `rooting_damage` >= 0.68; ONNX export functional |
| 3.6.2 | Implement `WildBoarDamageModule(BaseModule)` — tile-based semantic segmentation, stitch predictions, polygonize damage extents, compute area statistics | ML Engineer | Output GeoJSON polygons with `damage_type`, `confidence`, `area_m2`; small polygons (< 2m2) filtered; total processing < 60s for 50-hectare area; area statistics JSON includes per-type totals |

**Dependencies:** 3.6.1 then 3.6.2. 3.6.2 depends on 3.1.4.

---

### 3.7 — Module 6: Placeholder Scaffold

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.7.1 | Create `PlaceholderModule(BaseModule)` — implements all abstract methods with no-op stubs, returns empty GeoJSON and dummy raster; includes TODO markers for future implementation | ML Engineer | Module registers in model registry with `status: scaffold`; BullMQ job completes with `result: placeholder`; all `BaseModule` interface methods implemented (no `NotImplementedError` at runtime) |

---

### 3.8 — Integration & Quality

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 3.8.1 | Write integration tests — for each module: upload test data to S3, trigger BullMQ job, assert output GeoJSON schema + PostGIS write + S3 raster existence | Backend | 5 modules + 1 scaffold pass integration tests in CI; tests run in < 5 minutes total; test fixtures stored in `tests/fixtures/` |
| 3.8.2 | Implement GPU memory management — model loading/unloading, VRAM monitoring, OOM recovery (retry with smaller batch) | ML Engineer | VRAM usage logged per job; OOM triggers automatic batch-size halving + retry (max 2 retries); no zombie GPU processes after job failure |
| 3.8.3 | Add `/api/analysis/status/{job_id}` and `/api/analysis/results/{job_id}` endpoints with proper error payloads | Backend | Status endpoint returns `{ status, progress_pct, module, started_at, completed_at, error? }`; results endpoint returns GeoJSON + raster presigned URL; 404 for unknown job_id |
| 3.8.4 | Benchmark all modules — document inference latency, VRAM usage, and throughput per module on RTX 4000 SFF Ada | ML Engineer | Benchmark report includes p50/p95/p99 latency for each module at 50-hectare and 200-hectare scales; VRAM peak usage documented; report stored in repo |

---

### Sprint 3 Summary

| Role | Task Count | Key Deliverables |
|------|-----------|-----------------|
| ML Engineer | 14 | BaseModule framework, 5 module implementations, fusion layer, GPU memory management |
| Data Scientist | 6 | 5 trained + exported models (YOLO tree, ResNet species, YOLO animal, spectral CNN + VOC ensemble, DeepLabv3+) |
| Backend | 6 | Model registry, BullMQ dispatcher, result persistence, API endpoints, integration tests |

---
---

## Sprint 4: AI Companion (RAG + Conversational Intelligence)

**Duration:** 2 weeks (Days 15–28)
**Depends on:** Sprint 2 (Core Platform — PostGIS, auth, API layer), Sprint 3 (analysis module outputs used as retrieval context)
**Assumed complete:** pgvector extension enabled, Claude API key provisioned, SSE streaming infrastructure in place from Sprint 2, analysis results in PostGIS/S3.

---

### 4.1 — Knowledge Base & Embedding Infrastructure

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 4.1.1 | Design and create the 3-layer pgvector schema: `kb_research_papers` (academic knowledge), `kb_domain_rules` (forestry regulations, pest identification guides), `kb_project_context` (per-project analysis results, user notes) | Backend | 3 tables created with `embedding vector(1536)` columns; HNSW index on each (`lists=100, probes=10`); `document_id`, `chunk_id`, `chunk_text`, `metadata_jsonb`, `source_url`, `created_at` columns present; migration script idempotent |
| 4.1.2 | Build text chunking pipeline — PDF/DOCX parser, recursive text splitter (target 512 tokens, 64-token overlap), metadata extraction (title, authors, year, DOI, section headings) | Backend | Parser handles PDF (PyMuPDF) and DOCX; chunks average 480–540 tokens; metadata extracted for 90%+ of papers with DOI; pipeline processes 100 papers/minute on single core |
| 4.1.3 | Build embedding service — batch embed chunks using `text-embedding-3-small` (OpenAI) or equivalent; rate-limit aware; write to pgvector | Backend | Embedding dimension = 1536; batch size = 100 chunks per API call; rate limiter respects 3,000 RPM; upsert on `(document_id, chunk_id)` prevents duplicates; embedding latency logged |
| 4.1.4 | Ingest initial research knowledge base — process 2,000+ forestry/entomology papers; validate embedding coverage | Data Scientist | 2,000+ papers ingested into `kb_research_papers`; total chunks >= 40,000; spot-check: 10 random semantic queries return relevant chunks in top-5 results; ingestion completes within 8 hours |
| 4.1.5 | Populate `kb_domain_rules` — curate and ingest forestry regulations (EU/national), bark beetle identification guides, treatment protocols, safety data sheets | Data Scientist | Minimum 200 rule documents ingested; each chunk tagged with `jurisdiction`, `topic`, `authority` metadata; semantic search for "bark beetle treatment spruce" returns relevant regulatory content |
| 4.1.6 | Build `kb_project_context` auto-population — when analysis modules complete, extract key findings (species counts, beetle severity, damage areas) as natural-language summaries and embed into project context layer | ML Engineer | Analysis completion webhook triggers summary generation; summary includes module name, key metrics, spatial extent description; embedded within 30s of job completion; retrievable by project_id filter |

**Dependencies:** 4.1.1 first. 4.1.2 and 4.1.3 depend on 4.1.1. 4.1.4 and 4.1.5 depend on 4.1.2 + 4.1.3. 4.1.6 depends on 4.1.1 + Sprint 3 modules.

---

### 4.2 — Retrieval Pipeline

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 4.2.1 | Implement intent classifier — classify user query into intents: `analysis_question`, `regulatory_lookup`, `how_to`, `data_request`, `general_chat`, `out_of_scope` | ML Engineer | Classifier uses few-shot Claude prompt (no fine-tuned model needed); accuracy >= 90% on 100-query test set; latency < 300ms; `out_of_scope` catches non-forestry queries |
| 4.2.2 | Implement query embedding + parallel retrieval — embed user query, fan out to all 3 knowledge layers simultaneously, return top-k chunks per layer (k configurable, default 5) | Backend | Retrieval queries all 3 pgvector tables in parallel (Promise.all); total retrieval latency < 150ms; results include `chunk_text`, `similarity_score`, `source`, `metadata`; results merged and re-ranked by score |
| 4.2.3 | Implement context-aware re-ranking — cross-encoder re-ranker or reciprocal rank fusion across the 3 layers; inject active project context (current AOI, recent analyses) as retrieval filter | ML Engineer | Re-ranked results differ from raw similarity ranking in >= 30% of cases; project context filter narrows results to relevant project when `project_id` is provided; re-ranking adds < 100ms overhead |
| 4.2.4 | Build retrieval evaluation harness — 50 golden question-answer pairs with expected source documents; measure Recall@5, MRR, and answer relevance | Data Scientist | Recall@5 >= 0.80; MRR >= 0.65; evaluation runs as CLI command; results logged to file for tracking over time |

**Dependencies:** 4.2.1 and 4.2.2 can be parallel. 4.2.3 depends on 4.2.2. 4.2.4 depends on 4.2.2 + 4.1.4.

---

### 4.3 — Generation & Streaming

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 4.3.1 | Implement Claude API generation service — system prompt with domain persona ("BeetleSense Forest Advisor"), retrieved context injection, structured output mode for data-bearing answers | Backend | Claude API called with `claude-sonnet-4-20250514` (or latest); system prompt < 2,000 tokens; context window budget: 4,000 tokens for retrieved chunks, 2,000 for conversation history; temperature = 0.3 for factual, 0.7 for creative suggestions |
| 4.3.2 | Implement SSE streaming endpoint `GET /api/companion/chat/stream` — streams Claude response tokens in real-time; supports `conversation_id` for multi-turn context | Backend | First token arrives within 800ms of request; stream completes for typical response (300 tokens) in < 5s; SSE format: `data: {"token": "...", "done": false}`; final event includes `usage` metadata; connection gracefully handles client disconnect |
| 4.3.3 | Implement conversation memory — store conversation turns in PostgreSQL, trim to last 10 turns for context window, support conversation branching (fork from any turn) | Backend | Conversations persisted with `conversation_id`, `project_id`, `user_id`; max 10 turns injected into prompt (most recent); branching creates new `conversation_id` with parent reference; conversation list endpoint returns user's recent conversations |
| 4.3.4 | Implement citation injection — each generated claim backed by source reference `[1]`, `[2]`; response includes `sources[]` array with document title, chunk excerpt, similarity score, and link | Backend | >= 80% of factual claims in generated response have citations; `sources[]` array present in every response; source links resolve to viewable document (presigned S3 URL or DOI link) |

**Dependencies:** 4.3.1 depends on 4.2.2 (retrieval). 4.3.2 depends on 4.3.1. 4.3.3 independent of retrieval. 4.3.4 depends on 4.3.1.

---

### 4.4 — Safety & Guardrails

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 4.4.1 | Implement domain guardrails — reject or redirect queries outside forestry/environmental domain; block prompt injection attempts; sanitize user input | Backend | Out-of-scope queries return polite redirect ("I specialize in forest management..."); known prompt injection patterns (ignore instructions, system prompt leak) blocked with < 1% false positive rate on legitimate queries; input sanitized (HTML stripped, length capped at 2,000 chars) |
| 4.4.2 | Implement hallucination detection — compare generated claims against retrieved source chunks using NLI (natural language inference); flag unsupported claims | ML Engineer | NLI check runs post-generation; claims with entailment score < 0.5 flagged as `[unverified]`; flagging latency < 500ms for typical response; false negative rate < 15% on test set of 50 known hallucinations |
| 4.4.3 | Implement confidence scoring — each response tagged with overall confidence (`high`/`medium`/`low`) based on retrieval similarity scores + NLI scores + intent classification certainty | ML Engineer | Confidence score computed as weighted average: retrieval similarity (0.4) + NLI entailment (0.4) + intent confidence (0.2); `low` confidence triggers disclaimer prepended to response; scoring logic unit-tested with 20+ scenarios |
| 4.4.4 | Implement rate limiting and abuse prevention — per-user rate limit (30 req/min), conversation length limit (50 turns), token budget per conversation (50,000 tokens) | Backend | Rate limit returns HTTP 429 with `Retry-After` header; conversation limit returns friendly message suggesting new conversation; token budget tracked per conversation and enforced; admin override available |

**Dependencies:** 4.4.1 independent. 4.4.2 depends on 4.3.1. 4.4.3 depends on 4.4.2 + 4.2.1. 4.4.4 independent.

---

### 4.5 — Integration & Quality

| # | Task | Role | Acceptance Criteria |
|---|------|------|---------------------|
| 4.5.1 | End-to-end integration test — user asks about beetle risk in their project → companion retrieves project analysis results + research papers → generates cited response with risk assessment | Backend | Test covers full flow: auth → project context → intent classification → parallel retrieval → generation → citations → streaming; response references actual module outputs; completes in < 8s |
| 4.5.2 | Load test SSE streaming — 50 concurrent streaming sessions on Hetzner server | Backend | All 50 sessions receive complete responses; p95 time-to-first-token < 1.5s; no dropped connections; server CPU < 80% during test |
| 4.5.3 | Build companion analytics logging — log every query with intent, retrieval scores, response confidence, latency breakdown, user feedback (thumbs up/down) | Backend | Logs written to `companion_analytics` table; queryable for daily metrics (queries/day, avg confidence, avg latency, feedback ratio); PII (user message text) encrypted at rest |
| 4.5.4 | Write API documentation for all companion endpoints — OpenAPI spec with examples for chat, conversation management, and feedback | Backend | OpenAPI spec validates; all endpoints documented with request/response examples; Swagger UI accessible at `/api/docs` |

**Dependencies:** 4.5.1 depends on all 4.1–4.4 tasks. 4.5.2 depends on 4.3.2. 4.5.3 and 4.5.4 independent.

---

### Sprint 4 Summary

| Role | Task Count | Key Deliverables |
|------|-----------|-----------------|
| ML Engineer | 4 | Intent classifier, re-ranker, hallucination detector, confidence scoring |
| Data Scientist | 3 | 2,000+ papers ingested, domain rules curated, retrieval evaluation harness |
| Backend | 15 | pgvector schema, chunking + embedding pipeline, retrieval, Claude integration, SSE streaming, conversation memory, citations, guardrails, rate limiting, analytics, tests, docs |

---
---

## Cross-Sprint Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| RTX 4000 SFF Ada VRAM (20GB) insufficient for concurrent module inference | Module jobs queue instead of parallelize | Implement model loading/unloading in 3.8.2; max 2 models loaded simultaneously; ONNX preferred over TorchServe for lower VRAM footprint |
| Beetle detection training data insufficient for dual-modality fusion | Fusion AUC target missed | Maintain single-modality fallback (3.5.5); collect field data during sprint; augment spectral data with synthetic stressed-tree samples |
| 2,000-paper ingestion takes longer than budgeted 8 hours | Knowledge base incomplete at companion launch | Start ingestion on Day 1 of Sprint 4; parallelize with 4 workers; accept partial coverage (1,500+ papers) as minimum viable |
| Claude API latency spikes degrade companion UX | Time-to-first-token exceeds 2s | Implement response caching for repeated queries; pre-compute embeddings for common questions; SSE streaming masks generation latency |
| pgvector HNSW index rebuild time on 40,000+ chunks | Index updates block retrieval during ingestion | Use IVFFlat index during bulk ingestion, rebuild HNSW index once after initial load; incremental inserts acceptable after initial build |
