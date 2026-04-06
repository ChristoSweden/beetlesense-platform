# StoreNav — In-Store 3D Navigation for Gekås Ullared
## Product Requirements Document v1.0

**v1.0 | April 2026 | MVP CONCEPT | CONFIDENTIAL**
**Last updated: 6 April 2026**

---

## 1. Executive Summary

StoreNav is a mobile-first, 3D turn-by-turn in-store navigation app designed for **Gekås Ullared** — Sweden's largest department store (~50,000 m² of retail space in Halland, Sweden). Shoppers create a shopping list while driving to the store, and the app generates an optimised walking route through the aisles — complete with first-person 3D wayfinding, break suggestions, and facility waypoints.

**Problem**: Gekås is so large that shoppers routinely spend 4–8 hours inside, miss items they came for, walk redundant loops, and struggle to locate toilets, kids' areas, and restaurants. The store's remote location (Ullared, population ~800) means visitors travel long distances and want maximum efficiency once inside.

**Solution**: A mobile app that turns a shopping list into Google Maps-style 3D indoor navigation — aisle by aisle, item by item — with intelligent route optimisation, crowd-aware one-way aisle flow, and integrated break planning.

**Business model (initial)**: Free for shoppers. Gekås funds development and operation. Future B2B SaaS licensing to other large-format retailers (IKEA, Costco, Biltema, etc.) is a secondary opportunity.

---

## 2. Target Users

### 2.1 Primary: Gekås Shoppers
- Swedish families driving 1–4 hours to Ullared for a "shopping day"
- Norwegian and Danish day-trippers (Gekås draws ~5 million visitors/year)
- Age range 25–65, mixed tech comfort levels
- Typically shop in groups of 2–4 people

### 2.2 Secondary: Gekås Store Operations
- Floor managers who maintain product placement data
- Marketing team who may want to feature promotions along routes

---

## 3. User Journey

```
1. DRIVE PHASE (en route to Gekås)
   └─ Open app → Create shopping list (free-text + category browse)
   └─ App fuzzy-matches entries to known product locations
   └─ Optionally add: fika break, lunch, toilet stop, kids' play area
   └─ App generates optimised route preview (2D map overview)

2. ARRIVAL PHASE (entering the store)
   └─ App detects store entry (BLE beacon / manual "I'm here" tap)
   └─ Route activates in 3D first-person view
   └─ Turn-by-turn voice + visual directions begin

3. SHOPPING PHASE (navigating aisles)
   └─ 3D view guides shopper aisle-by-aisle
   └─ "Arrived at item" notification when reaching each product
   └─ Shopper taps "Got it" or "Skip" per item
   └─ Route dynamically recalculates on skip or ad-hoc additions
   └─ Break waypoints (café, toilet, kids' area) appear at optimal points

4. CHECKOUT PHASE
   └─ Route ends at nearest checkout / exit
   └─ Summary: items found, time spent, distance walked
```

---

## 4. Core Features (MVP)

### 4.1 Shopping List Builder
| Aspect | Detail |
|--------|--------|
| Input methods | Free-text entry, category browsing, voice input (stretch) |
| Matching | Fuzzy search against product-location catalog |
| Organisation | Auto-grouped by store zone after route generation |
| Sharing | Share list via link (stretch goal for MVP) |

### 4.2 Route Optimisation Engine
| Aspect | Detail |
|--------|--------|
| Algorithm | Modified Travelling Salesman with aisle-graph constraints |
| Aisle model | One-way flow enforced (reflects real crowd management at Gekås) |
| Multi-floor | Supports floor transitions via escalators, elevators, stairs |
| Re-routing | Dynamic recalculation when items are skipped or added mid-trip |
| Break insertion | Automatic suggestions + manual insertion of breaks at any point |
| Optimisation goal | Minimise total walking distance while respecting one-way flow |

### 4.3 3D Navigation View
| Aspect | Detail |
|--------|--------|
| Perspective | First-person point-of-view through aisles |
| Rendering | WebGL / Three.js-based 3D store model |
| Directions | Turn-by-turn overlays: arrows, distance indicators, aisle labels |
| Transitions | Smooth camera movement between waypoints |
| Fallback | 2D map view always available as toggle |
| Floor changes | Visual transition when moving between levels |

### 4.4 Facility & Break Waypoints
| Facility | Details |
|----------|---------|
| Restaurants / cafés | Gekås has multiple — app picks the one closest to route midpoint |
| Fika spots | Lighter café stops insertable at any route point |
| Toilets | Nearest toilet shown on demand + auto-suggested on long routes |
| Kids' play areas | "Barnlandet" and similar — insertable as route waypoint |
| Baby changing | Mapped and routable |
| ATMs / services | Info desk, returns, ATMs available as waypoints |

### 4.5 Indoor Positioning (MVP Approach)
| Approach | Detail |
|----------|--------|
| Primary (MVP) | **BLE beacon triangulation** — beacons placed at aisle intersections and key landmarks |
| Beacon density | ~1 per 100 m² → approximately 500 beacons for full coverage |
| Accuracy target | 2–3 metre precision (sufficient for aisle-level navigation) |
| Fallback | Manual "I'm at aisle X" correction + QR codes at aisle ends |
| Future | Wi-Fi RTT, UWB, or camera-based SLAM for sub-metre precision |

### 4.6 Offline Mode
| Aspect | Detail |
|--------|--------|
| Pre-cache | Store map, 3D assets, and product catalog cached on first load or when creating list |
| Route | Computed on-device once cached; no server dependency during shopping |
| Sync | List edits and route changes sync when connectivity resumes |
| Size estimate | ~50–100 MB for full 3D store model + catalog |

---

## 5. Product Catalog & Store Mapping (MVP Scope)

Since Gekås does not expose a public product API, the MVP catalog is **manually curated**.

### 5.1 MVP Catalog Scope
- **~500 representative products** across Gekås' main departments
- Departments covered: groceries, clothing, electronics, home & garden, toys, sports, kitchen, beauty, pets
- Each product entry contains:

```typescript
interface ProductLocation {
  id: string;
  name: string;                    // e.g. "Gevalia Mellanrost 500g"
  category: string;                // e.g. "Groceries > Coffee"
  department: string;              // e.g. "Livsmedel"
  floor: number;                   // 0 = ground, 1 = upper, -1 = lower
  aisle: string;                   // e.g. "A14"
  shelf_section: string;           // e.g. "A14-L3" (aisle 14, left side, section 3)
  coordinates: { x: number; y: number; z: number }; // 3D position in store model
  tags: string[];                  // search keywords
  image_url?: string;              // product photo (stretch)
}
```

### 5.2 Store Mapping Process
1. **Floor plan digitisation** — Convert Gekås architectural floor plans into a navigable graph
2. **Aisle graph construction** — Model each aisle as a directed edge (one-way), intersections as nodes
3. **Product placement** — Map ~500 products to specific shelf locations via on-site survey
4. **3D model creation** — Build simplified 3D store model from floor plans + reference photos
5. **Beacon placement plan** — Define optimal BLE beacon positions on the aisle graph

### 5.3 Store Map Data Model

```typescript
interface StoreGraph {
  floors: Floor[];
  nodes: NavNode[];          // intersections, entrances, facilities
  edges: NavEdge[];          // aisle segments (directed for one-way)
  facilities: Facility[];    // toilets, cafés, kids' areas, etc.
}

interface NavNode {
  id: string;
  floor: number;
  position: { x: number; y: number; z: number };
  type: 'intersection' | 'entrance' | 'exit' | 'escalator' | 'elevator' | 'stairs' | 'facility';
  facility_id?: string;      // links to Facility if type === 'facility'
}

interface NavEdge {
  id: string;
  from_node: string;
  to_node: string;
  distance_m: number;
  direction: 'one-way' | 'two-way';
  aisle_label?: string;
  floor: number;
  traversal_time_s: number;  // estimated walk time
  width_category: 'narrow' | 'standard' | 'wide'; // for future accessibility
}

interface Facility {
  id: string;
  type: 'toilet' | 'cafe' | 'restaurant' | 'kids_area' | 'baby_change' | 'atm' | 'info_desk' | 'returns';
  name: string;
  floor: number;
  position: { x: number; y: number; z: number };
  opening_hours?: string;
}
```

---

## 6. Technical Architecture

### 6.1 High-Level Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile app | React Native + Expo | Cross-platform iOS/Android from single codebase |
| 3D rendering | Three.js via react-three-fiber | First-person 3D navigation view |
| State management | Zustand | Lightweight, familiar from BeetleSense stack |
| Routing algorithm | On-device TypeScript | TSP solver + A* pathfinding on aisle graph |
| Offline storage | SQLite (expo-sqlite) + MMKV | Product catalog + app state |
| 3D assets | glTF 2.0 | Compressed store model, lazy-loaded per floor |
| BLE positioning | expo-ble / react-native-ble-plx | Beacon triangulation for indoor positioning |
| Backend API | Supabase (Postgres + Auth + Storage) | User accounts, list sync, analytics |
| Admin tool | React web app | For store staff to update product locations |

### 6.2 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                      │
│                                                           │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Shopping  │  │   Route      │  │   3D Navigation    │ │
│  │ List UI   │──│   Engine     │──│   View (Three.js)  │ │
│  └──────────┘  │  (TSP + A*)  │  └────────────────────┘ │
│                 └──────────────┘                          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ BLE      │  │   Offline    │  │   Floor / Map      │ │
│  │ Position │──│   Cache      │──│   Manager          │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ Sync (when online)
              ┌────────▼────────┐
              │   Supabase      │
              │  - Auth         │
              │  - Postgres     │
              │  - Storage      │
              └─────────────────┘
              ┌─────────────────┐
              │  Admin Web App  │
              │  (Product &     │
              │   Map Editor)   │
              └─────────────────┘
```

### 6.3 Route Optimisation Algorithm

```
Input:  List of N product locations + optional facility waypoints
Output: Ordered route minimising total walking distance

1. Build weighted directed graph from store aisle data
2. For each item pair, compute shortest path (A* on aisle graph)
3. Solve TSP variant:
   - Nearest-neighbour heuristic for initial solution
   - 2-opt local search improvement
   - Respect one-way aisle constraints (directed edges)
   - Inject facility waypoints at optimal positions
4. For N < 20 items: runs in <100ms on-device
5. For N > 20 items: apply greedy clustering by zone, then TSP per cluster
6. Output: ordered list of NavNodes with walking directions between each
```

### 6.4 3D Navigation Rendering

```
- Store model: simplified low-poly glTF (aisles, shelves, signage, floors)
- Camera: first-person perspective at ~1.6m height
- Navigation cues:
  - Floating arrows along path
  - Highlighted floor path (glowing line)
  - Distance countdown ("15m to next item")
  - Aisle labels floating above shelves
  - Item beacon (pulsing highlight at destination shelf)
- Transitions:
  - Smooth dolly between waypoints
  - Floor-change animation (elevator/escalator visual)
- Performance target: 60fps on mid-range phones (2023+)
- LOD system: reduce detail for distant aisles
```

---

## 7. Internationalisation

| Priority | Language | MVP | Notes |
|----------|----------|-----|-------|
| 1 | English | Yes | Development language, international tourists |
| 2 | Swedish | Yes | Primary market — all UI strings via i18next |
| 3 | Norwegian | Post-MVP | Large share of Gekås visitors |
| 4 | Danish | Post-MVP | Significant visitor group |

- All UI strings through i18next (consistent with BeetleSense conventions)
- Product names stored in Swedish with English aliases
- Voice directions in selected language (stretch goal)

---

## 8. Accessibility

### 8.1 MVP
- High-contrast UI and large tap targets
- Screen reader compatible navigation list
- 2D map fallback (less GPU-intensive)
- Font scaling support

### 8.2 Post-MVP (Planned)
- Wheelchair-accessible routing (uses `width_category` on edges, avoids stairs)
- Elevator-preferred floor transitions
- Audio-described navigation for visually impaired users
- Reduced-motion mode (no 3D animations)

> **Note**: The data model already includes `width_category` on aisle edges to support accessible routing when added. The NavNode type system already distinguishes escalators, elevators, and stairs for floor transitions.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| App cold start | < 3 seconds |
| Route calculation | < 500ms for 20 items |
| 3D frame rate | 60fps on iPhone 13 / Samsung Galaxy S22 equivalent |
| Offline capability | Full navigation after initial cache (~50–100 MB) |
| Position accuracy | 2–3m with BLE beacons |
| Battery impact | < 15% drain per hour of active navigation |
| Supported OS | iOS 16+, Android 13+ |
| App size | < 30 MB (excluding cached store data) |

---

## 10. MVP Scope & Phasing

### Phase 1 — Proof of Concept (4–6 weeks)
- [ ] Digitise Gekås floor plan into navigable aisle graph (1 floor)
- [ ] Build product catalog (~200 items, 1 floor)
- [ ] Shopping list builder with fuzzy search
- [ ] Route optimisation engine (TSP + A* on aisle graph)
- [ ] 2D map view with route overlay
- [ ] Basic facility waypoints (toilets, cafés)
- [ ] English UI

### Phase 2 — 3D Navigation MVP (4–6 weeks)
- [ ] Simplified 3D store model (ground floor)
- [ ] First-person camera navigation along route
- [ ] Turn-by-turn direction overlays
- [ ] BLE beacon integration (positioning)
- [ ] Dynamic re-routing (skip/add items)
- [ ] Break insertion (manual + auto-suggested)
- [ ] Swedish language
- [ ] Offline mode

### Phase 3 — Full Store Coverage (4–6 weeks)
- [ ] All floors modelled (3D + graph)
- [ ] Full product catalog (~500 items)
- [ ] Floor transition animations
- [ ] Kids' area / baby change waypoints
- [ ] Admin tool for store staff to update product locations
- [ ] Norwegian & Danish languages
- [ ] Wheelchair-accessible routing

### Phase 4 — Production & Polish (ongoing)
- [ ] Performance optimisation & device testing
- [ ] Analytics dashboard for Gekås (heatmaps, popular routes)
- [ ] Promotional waypoints (featured products / offers)
- [ ] Expanded catalog (Gekås has ~100,000+ SKUs)
- [ ] B2B SaaS packaging for other retailers

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| BLE beacon installation requires Gekås cooperation | High | MVP can work with manual position input + QR fallback; demonstrate value with simulated positioning first |
| 3D model accuracy vs real store | Medium | Start with simplified model; iterate with on-site photo matching |
| Product locations change frequently | Medium | Admin tool for store staff; date-stamp locations; flag stale data |
| Gekås may not share floor plans | High | Use publicly available info + on-site measurement as fallback |
| TSP computation too slow for large lists | Low | Clustering heuristic keeps it <500ms for 50+ items |
| Mobile GPU limitations for 3D | Medium | LOD system + 2D fallback always available |
| App store review delays | Medium | PWA as interim distribution while native apps are reviewed |

---

## 12. Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| App downloads | 50,000 |
| Monthly active users | 15,000 |
| Average items per shopping list | 8+ |
| Route completion rate | > 60% of started routes |
| Time saved per visit (self-reported) | 30+ minutes |
| App store rating | 4.2+ stars |
| Gekås NPS improvement | Measurable uplift in customer satisfaction |

---

## 13. Open Questions

1. **Gekås partnership** — What level of cooperation can we secure? Floor plans, product data feeds, beacon installation rights?
2. **Product data freshness** — How frequently do product locations change? Weekly? Seasonally?
3. **In-store Wi-Fi** — Does Gekås offer public Wi-Fi? What coverage and bandwidth?
4. **Beacon hardware** — Which BLE beacon vendor? (Estimote, Kontakt.io, RadBeacon — each has trade-offs on battery life, range, and cost)
5. **Legal/privacy** — BLE positioning data retention policy; GDPR compliance for location tracking
6. **Monetisation timeline** — When does Gekås expect ROI? Free pilot period before paid?

---

## 14. Competitive Landscape

| Competitor | Approach | Gap StoreNav fills |
|------------|----------|--------------------|
| Google Maps (Indoor) | Basic floor plans, no item-level nav | No shopping list integration, no 3D, no route optimisation |
| MazeMap | Enterprise indoor navigation | B2B focus, no retail shopping list, expensive |
| Aisle411 (now Instacart) | Grocery aisle lookup | US-only, no 3D, no multi-department store support |
| IKEA app | Department-level map | No item-level routing, no 3D walkthrough, single-brand |
| PointInside | Retail indoor maps | Shut down; market gap exists |

**StoreNav's unique value**: First-person 3D navigation + shopping list route optimisation + facility planning — no existing product combines all three for large-format retail.

---

## 15. Summary

StoreNav transforms the overwhelming Gekås Ullared shopping experience into a guided, efficient, and enjoyable trip. By combining shopping list intelligence with 3D indoor navigation and smart break planning, we reduce shopper frustration, increase purchase completion, and create a platform that can scale to any large-format retailer worldwide.

**Next step**: Secure a preliminary meeting with Gekås management to discuss floor plan access and a pilot beacon installation for one floor section.
