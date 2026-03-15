# Sprint 2: Data Pipeline

**Duration:** 2 weeks (Mar 30 – Apr 12, 2026)
**Predecessor:** Sprint 1 (Foundation)
**Goal:** Establish all data ingestion, processing, and serving pipelines so parcels have rich geospatial context for Sprint 3 (Analysis Engine).

---

## 1. Parcel Registration Flow

### 1.1 Lantmäteriet Fastighet Lookup Service
**Owner:** Backend | **Estimate:** 3 pts

- POST `/api/parcels/register` accepts `{ fastighets_id }`, queries Lantmäteriet REST API
- Returns `{ parcel_id, kommun, area_ha, centroid_sweref99 }`
- Handles 404/invalid gracefully, response < 3s
- Unit tests: valid ID, invalid ID, API-down

### 1.2 Boundary Geometry Auto-Load
**Owner:** Backend | **Estimate:** 3 pts | **Depends on:** 1.1

- Fetch boundary polygon from Fastighetsgränser WFS/GML
- Store as `geometry(MultiPolygon, 3006)`, validate with `ST_IsValid()`, repair with `ST_MakeValid()`
- WGS 84 derivative column via trigger for PWA display
- Integration test: assert `ST_Area()` matches expected hectarage ±1%

### 1.3 Registration BullMQ Orchestrator
**Owner:** Backend | **Estimate:** 2 pts | **Depends on:** 1.1, 1.2

- POST returns `202 Accepted` with job ID, processes async
- 3 retries with exponential backoff; sets status `active` or `error`
- Client polls or receives Supabase Realtime update
- Duplicate registration → 409 Conflict

---

## 2. Open Data Sync Service

### 2.1 Sync Scheduler and Job Framework
**Owner:** Data Engineering | **Estimate:** 3 pts

- BullMQ repeatable job at 02:00 CET nightly
- Fans out per-parcel `open-data.sync.parcel` child jobs
- Concurrency: 4 parallel to respect API rate limits
- Manual trigger: `POST /api/admin/sync/trigger`

### 2.2 Lantmäteriet Layer Fetcher
**Owner:** Data Engineering | **Estimate:** 5 pts | **Depends on:** 2.1

Layers: Property map (WFS), Ortofoto (WMTS), DTM (GeoTIFF), LiDAR (LAZ)

- Fetch with parcel bbox + 100m buffer
- Store in `data/{parcel_id}/lantmateriet/{layer}/`
- Clip to boundary as Cloud Optimized GeoTIFF (COG)
- Handle HTTP 429 with backoff; skip if < 90 days old

### 2.3 Skogsstyrelsen WFS Fetcher
**Owner:** Data Engineering | **Estimate:** 3 pts | **Depends on:** 2.1

Datasets: KNN (WCS), Avverkningsanmälningar (WFS), Nyckelbiotoper (WFS), Natura 2000 (WFS)

- KNN raster via WCS `GetCoverage`, clipped to bbox
- Vector layers as GeoJSON via WFS `GetFeature` with BBOX filter
- Empty results stored with `no_data: true` flag

### 2.4 SGU Soil + SMHI Climate Fetchers
**Owner:** Data Engineering | **Estimate:** 3 pts | **Depends on:** 2.1

- SGU: Jordarter 1:25,000 WMS/WFS → GeoJSON
- SMHI: nearest station temp/precip/growing season (monthly, 12 months) → JSON
- Warn if nearest SMHI station > 50 km
- Idempotent: ETag/Last-Modified check

---

## 3. LiDAR Processing Pipeline

### 3.1 LiDAR Tile Download Worker
**Owner:** Data Engineering | **Estimate:** 3 pts | **Depends on:** 2.2

- Resolve Lantmäteriet 2.5×2.5 km tile IDs from parcel bbox
- Download LAZ to `data/{parcel_id}/lidar/raw/`
- Verify integrity; skip if cached < 90 days
- Emit `lidar.download.complete` event

### 3.2 CHM and DTM Generation (PDAL)
**Owner:** Data Engineering | **Estimate:** 5 pts | **Depends on:** 3.1

PDAL pipeline produces:
- **DTM**: ground-classified → 1m GeoTIFF
- **DSM**: first returns → 1m GeoTIFF
- **CHM**: DSM - DTM → 1m GeoTIFF

- EPSG:3006, clipped to boundary + 50m, stored as COG
- CHM < 0 clamped to 0; > 60m flagged as anomaly
- < 10 min for 100 ha parcel
- Runs in Docker with PDAL 2.6+ / GDAL 3.8+

---

## 4. Satellite Fetch Worker

### 4.1 Sentinel-2 Scene Discovery and Download
**Owner:** Data Engineering | **Estimate:** 5 pts

- Query Copernicus CDSE OData API for L2A scenes intersecting parcel
- Filters: cloud < 30%, last 12 months, max 1 per 2-week period
- Download bands B02, B03, B04, B08, B11, B12, SCL
- CDSE OAuth2 token auto-refresh

### 4.2 Cloud Masking and NDVI Calculation
**Owner:** Data Engineering | **Estimate:** 3 pts | **Depends on:** 4.1

- Cloud/shadow mask from SCL (classes 3, 8, 9, 10)
- NDVI: `(B08 - B04) / (B08 + B04)` as Float32 GeoTIFF
- Additional: EVI, NDMI
- Clipped to parcel, EPSG:3006, 10m, stored as COG
- If > 70% cloud → `quality: 'poor'`

### 4.3 Sentinel-1 SAR Stub
**Owner:** Data Engineering | **Estimate:** 1 pt

- Placeholder BullMQ job, returns 501
- README documents planned SAR processing steps

---

## 5. File Upload Pipeline

### 5.1 Presigned URL Generation
**Owner:** Backend | **Estimate:** 2 pts

- POST `/api/uploads/presign` → `{ upload_url, upload_id, expires_at }`
- Validates: user owns parcel, allowlisted MIME types, < 500 MB
- Creates pending `survey_uploads` row
- 15-minute URL expiry

### 5.2 Upload Validation Worker
**Owner:** Backend | **Estimate:** 3 pts | **Depends on:** 5.1

- MIME type verification, GDAL validation for rasters/vectors
- Extract metadata: CRS, extent, resolution, feature count, EXIF GPS
- Reproject to EPSG:3006 if needed
- ClamAV scan on non-geospatial files
- Status → `ready` or `invalid` with reason

### 5.3 Drone Imagery Metadata Extraction
**Owner:** Data Engineering | **Estimate:** 2 pts | **Depends on:** 5.2

- Extract: flight altitude, GSD, camera model, timestamp, GPS from EXIF/XMP
- Convert to COG if not already, generate overview pyramids
- Thumbnail (256px) stored alongside
- Metadata in `survey_uploads.metadata` JSONB

---

## 6. Data Fusion Engine Scaffold

### 6.1 Spatial Alignment Module
**Owner:** Data Engineering | **Estimate:** 5 pts | **Depends on:** 2.2, 3.2, 4.2

- Align all rasters to common grid: EPSG:3006, 1m base resolution
- Resampling: bilinear (continuous), nearest-neighbor (categorical)
- Rasterize vector datasets where needed
- Output manifest: `data/{parcel_id}/fusion/manifest.json`
- Function: `align_parcel(parcel_id) → manifest`

### 6.2 Virtual Raster Stack Builder
**Owner:** Data Engineering | **Estimate:** 2 pts | **Depends on:** 6.1

- GDAL VRT combining all aligned layers as multi-band stack
- Deterministic band order (CHM, DTM, NDVI, etc.)
- Stored at `data/{parcel_id}/fusion/stack.vrt`
- Band metadata embedded in VRT XML

---

## 7. QGIS Server Setup

### 7.1 QGIS Server Docker Image
**Owner:** Infra | **Estimate:** 3 pts

- Based on `qgis/qgis-server:3.36-jammy` + GDAL 3.8+ + PDAL
- Nginx FastCGI with 4 QGIS worker processes
- Health check, resource limits (2 CPU, 4 GB RAM)

### 7.2 Dynamic QGIS Project Generator
**Owner:** Data Engineering | **Estimate:** 3 pts | **Depends on:** 7.1, 6.1

- Per-parcel `.qgs` with layers: boundary, ortofoto, CHM, NDVI, soil, KNN species
- Styled: parcel outline dashed, CHM green gradient, NDVI RdYlGn, soil categorical
- WMS `GetMap` returns 256×256 tiles; WFS `GetFeature` returns GeoJSON
- Regenerated on new data arrival

### 7.3 WMS/WFS API Gateway Integration
**Owner:** Infra | **Estimate:** 2 pts | **Depends on:** 7.1

- `/api/map/wms?parcel_id={id}` and `/api/map/wfs?parcel_id={id}` proxy to QGIS Server
- JWT auth; user can only access own parcels
- CORS for PWA domain; WMS tiles cached 1h at gateway

---

## 8. Object Storage Structure

### 8.1 Bucket Structure and IAM
**Owner:** Infra | **Estimate:** 2 pts

Buckets: `beetlesense-data`, `beetlesense-uploads`, `beetlesense-cache`, `beetlesense-qgis`

```
data/{parcel_id}/
  lantmateriet/{layer}/
  skogsstyrelsen/{dataset}/
  sgu/ · smhi/
  lidar/raw/ · lidar/products/
  satellite/sentinel2/{date}/ · satellite/sentinel2/{date}/products/
  fusion/
  uploads/{upload_id}/
```

IAM: workers R/W all; API R data + W uploads; QGIS R-only. No public access.

### 8.2 Lifecycle Policies
**Owner:** Infra | **Estimate:** 1 pt | **Depends on:** 8.1

- Cache: expire 90 days
- Uploads pending: expire 7 days
- Data: no expiry, versioning enabled
- Incomplete multipart: expire 24h

---

## Dependency Graph

```
8.1 → 8.2
1.1 → 1.2 → 1.3
               ↓
           2.1 → 2.2 → 3.1 → 3.2 ─┐
            ├→ 2.3                   ├→ 6.1 → 6.2
            ├→ 2.4                   │
           4.1 → 4.2 ───────────────┘
           4.3 (independent)
5.1 → 5.2 → 5.3
7.1 → 7.2 (needs 6.1) → 7.3
```

---

## Team Allocation

| Role | Person-Days | Tasks |
|---|---|---|
| Backend | 10 | 1.1, 1.2, 1.3, 5.1, 5.2 |
| Data Engineering | 16 | 2.1–2.4, 3.1–3.2, 4.1–4.3, 5.3, 6.1–6.2, 7.2 |
| Infra | 7 | 7.1, 7.3, 8.1, 8.2 |

**Total:** 64 story points

---

## Sprint Exit Criteria

1. Registering a fastighets_id auto-loads boundary + all open data layers
2. LiDAR → CHM/DTM pipeline produces valid COGs for any Swedish parcel
3. Sentinel-2 scenes downloaded, cloud-masked, NDVI computed
4. File uploads validated, reprojected, thumbnailed
5. Fusion engine aligns all layers to common 1m grid
6. QGIS Server serves styled WMS tiles for any parcel
7. All data stored in EPSG:3006 internally; WGS 84 only at display boundary
