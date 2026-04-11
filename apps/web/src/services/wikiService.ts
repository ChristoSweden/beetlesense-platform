/**
 * wikiService — frontend access to the per-parcel LLM wiki (Karpathy pattern).
 *
 * The wiki is a persistent, compounding markdown knowledge base maintained by
 * the AI for each forest parcel. Pages are created from surveys, alerts, and
 * high-confidence companion answers. The companion reads the wiki first.
 *
 * Operations:
 *  - listPages(parcelId)          — all wiki pages for a parcel (index excluded)
 *  - getPage(parcelId, slug)      — a single page
 *  - getIndex(parcelId)           — the auto-maintained index page
 *  - getLog(parcelId)             — the append-only ingest log
 *  - triggerIngest(parcelId, ...) — kick off a wiki ingest (survey / manual)
 *  - search(parcelId, query)      — keyword search over page content
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WikiCategory =
  | 'health'
  | 'threat'
  | 'observation'
  | 'plan'
  | 'financial'
  | 'regulatory'
  | 'insight'
  | 'index'
  | 'log';

export type WikiSourceType =
  | 'ai_generated'
  | 'survey_compiled'
  | 'query_filed'
  | 'user_authored';

export interface WikiPage {
  id: string;
  parcel_id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  content: string;
  source_type: WikiSourceType;
  tags: string[];
  related_slugs: string[];
  inbound_links: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export type WikiPageSummary = Omit<WikiPage, 'content'>;

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_PAGES: WikiPage[] = [
  {
    id: 'demo-1',
    parcel_id: 'demo',
    slug: 'forest-health-overview',
    title: 'Forest Health Overview',
    category: 'health',
    content: `Last updated: 2026-04-06

## Current Status
The **Björkskogen** parcel is in **moderate health** with a composite health score of **72/100**. NDVI readings from the March 2026 drone survey indicate slightly below-seasonal average canopy greenness, consistent with early spring conditions.

## Key Metrics
- **NDVI mean**: 0.741 (slightly below regional average of 0.768)
- **Anomaly area**: 2.3 ha showing NDVI < 0.65 in the north-east sector
- **Tree count**: 4,847 trees inventoried
- **Average health score**: 74/100
- **Stressed trees**: 312 (6.4%)

## Trends
The north-east sector has shown gradual NDVI decline over three consecutive surveys. This area warrants close monitoring as bark beetle pressure typically increases in weakened stands.

## Related
- [[threat-assessment]] — current threat ranking
- [[recent-observations]] — survey timeline`,
    source_type: 'survey_compiled',
    tags: ['health', 'ndvi', 'overview'],
    related_slugs: ['threat-assessment', 'recent-observations'],
    inbound_links: 2,
    view_count: 14,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-06T09:40:00Z',
  },
  {
    id: 'demo-2',
    parcel_id: 'demo',
    slug: 'threat-assessment',
    title: 'Threat Assessment',
    category: 'threat',
    content: `Last updated: 2026-04-06

## Active Threats (ranked by severity)

### 1. Bark Beetle Risk — ELEVATED
**Ips typographus** (European spruce bark beetle) risk is elevated for the current season. Spring swarming typically begins when accumulated temperatures exceed 200 degree-days above 8°C threshold.

**Risk factors:**
- 2.3 ha of NDVI-anomalous spruce in the north-east sector
- 312 stressed trees (crown temp anomaly z-score > 1.5)
- Regional beetle pressure index: 0.67 (above average)
- Recent storm damage (March 12) created fresh breeding substrate

**Recommended actions:**
1. Deploy pheromone traps (PHEROCON® IP) at 3 sites by April 15
2. Priority inspection of the north-east sector
3. Remove or delimb wind-thrown spruce before May 1

### 2. Storm Damage — MODERATE
March 12 storm (wind speed 18 m/s) caused localised windthrow in the western edge. Estimated volume: 12–18 m³.

### 3. Drought Stress — LOW–MODERATE
SMHIs soil moisture index for Kronoberg County: 0.42 (below seasonal average). Monitor closely if May remains dry.

## Related
- [[forest-health-overview]] — health context
- [[recent-observations]] — observation log`,
    source_type: 'survey_compiled',
    tags: ['threat', 'beetle', 'storm', 'drought'],
    related_slugs: ['forest-health-overview', 'recent-observations'],
    inbound_links: 3,
    view_count: 22,
    created_at: '2026-04-01T10:05:00Z',
    updated_at: '2026-04-06T09:40:00Z',
  },
  {
    id: 'demo-3',
    parcel_id: 'demo',
    slug: 'recent-observations',
    title: 'Recent Observations',
    category: 'observation',
    content: `Last updated: 2026-04-06

## Survey Timeline

### 2026-03-28 — Multispectral Drone Survey
- **NDVI mean**: 0.741 | **Anomaly area**: 2.3 ha
- **Beetle detections**: 0 (below detection threshold)
- **Tree count**: 4,847
- Notable: North-east sector flagged for follow-up — NDVI anomaly cluster

### 2026-03-12 — Storm Event
- Wind speed 18 m/s, gusts to 23 m/s
- Windthrow estimated 12–18 m³ spruce in western edge
- Alert triggered: **[CRITICAL] storm_damage**

### 2026-02-14 — Winter Drone Survey
- **NDVI mean**: 0.718 (expected lower in winter)
- **Tree count**: 4,831 (16 fewer than spring count — likely snow obstruction)
- No significant anomalies detected

### 2025-09-02 — Late Season Inspection
- **NDVI mean**: 0.789 — healthy late-summer reading
- **Beetle detections**: 2 trees with crown temp anomaly > 2.5σ
- Both flagged trees inspected on-ground: early-stage blue stain detected on 1

## Related
- [[forest-health-overview]] — current health status
- [[threat-assessment]] — threat analysis`,
    source_type: 'survey_compiled',
    tags: ['observation', 'survey', 'timeline'],
    related_slugs: ['forest-health-overview', 'threat-assessment'],
    inbound_links: 2,
    view_count: 18,
    created_at: '2026-04-01T10:10:00Z',
    updated_at: '2026-04-06T09:40:00Z',
  },
  {
    id: 'demo-4',
    parcel_id: 'demo',
    slug: 'insight-2026-04-05-ab3f2',
    title: 'When should I deploy pheromone traps this spring?',
    category: 'insight',
    content: `Last updated: 2026-04-05

## Question
When should I deploy pheromone traps this spring?

## Answer
For Björkskogen's location in Kronoberg County, pheromone trap deployment should begin **when accumulated degree-days above 8°C reach 100–150 DD**, which typically corresponds to **late April** based on SMHI historical data for your region.

**Practical guidance:**
- Set traps **before** the main beetle flight begins (200 DD threshold)
- Place traps at the **forest edge**, especially near fresh windthrow and the north-east NDVI anomaly sector
- Recommended spacing: one trap per 3–5 ha in high-risk areas
- Check traps every 7–10 days during peak flight

**This season's outlook:** Given the storm damage from March 12 creating fresh breeding substrate, and the existing NDVI anomaly in the north-east sector, we recommend deploying earlier than average — target **April 10–15**.

[Source: Skogsstyrelsen — Åtgärder mot granbarkborre, 2023] [Source: SLU — Barkborrens biologi och bekämpning, Jönsson 2012]

---
*This insight was generated by the BeetleSense AI companion and filed to the wiki because it received high confidence.*`,
    source_type: 'query_filed',
    tags: ['insight', 'beetle', 'pheromone', 'companion-answer'],
    related_slugs: ['threat-assessment', 'forest-health-overview'],
    inbound_links: 0,
    view_count: 5,
    created_at: '2026-04-05T14:22:00Z',
    updated_at: '2026-04-05T14:22:00Z',
  },
];

const DEMO_INDEX: WikiPage = {
  id: 'demo-index',
  parcel_id: 'demo',
  slug: 'index',
  title: 'Wiki Index — Björkskogen',
  category: 'index',
  content: `# Wiki Index — Björkskogen
Last updated: 2026-04-06

This is the auto-maintained index for the **Björkskogen** forest parcel wiki.
The BeetleSense AI writes and updates all pages. You read; the AI maintains.

## Pages (4 total)

### Health
- [[forest-health-overview]] — Forest Health Overview *(updated 2026-04-06)*

### Threat
- [[threat-assessment]] — Threat Assessment *(updated 2026-04-06)*

### Observation
- [[recent-observations]] — Recent Observations *(updated 2026-04-06)*

### Insight
- [[insight-2026-04-05-ab3f2]] — When should I deploy pheromone traps this spring? *(updated 2026-04-05)*

---
*Wiki maintained by BeetleSense AI using the Karpathy LLM Wiki pattern.*`,
  source_type: 'ai_generated',
  tags: ['index'],
  related_slugs: [],
  inbound_links: 0,
  view_count: 0,
  created_at: '2026-04-01T10:00:00Z',
  updated_at: '2026-04-06T09:40:00Z',
};

// ── Service ────────────────────────────────────────────────────────────────────

/**
 * List all content wiki pages for a parcel (excludes index and log).
 */
export async function listWikiPages(parcelId: string): Promise<WikiPageSummary[]> {
  if (!isSupabaseConfigured) {
    return DEMO_PAGES.map(({ content: _c, ...rest }) => rest);
  }

  const { data, error } = await supabase
    .from('parcel_wiki')
    .select('id, parcel_id, slug, title, category, source_type, tags, related_slugs, inbound_links, view_count, created_at, updated_at')
    .eq('parcel_id', parcelId)
    .not('category', 'in', '("index","log")')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WikiPageSummary[];
}

/**
 * Fetch a single wiki page by slug.
 */
export async function getWikiPage(parcelId: string, slug: string): Promise<WikiPage | null> {
  if (!isSupabaseConfigured) {
    if (slug === 'index') return DEMO_INDEX;
    return DEMO_PAGES.find((p) => p.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from('parcel_wiki')
    .select('*')
    .eq('parcel_id', parcelId)
    .eq('slug', slug)
    .single();

  if (error) return null;

  // Increment view count (fire-and-forget)
  supabase.rpc('increment_wiki_view', { p_id: data.id }).then(() => {}, () => {});

  return data as WikiPage;
}

/**
 * Fetch the wiki index page.
 */
export async function getWikiIndex(parcelId: string): Promise<WikiPage | null> {
  return getWikiPage(parcelId, 'index');
}

/**
 * Keyword search over wiki page titles and content.
 */
export async function searchWikiPages(parcelId: string, query: string): Promise<WikiPageSummary[]> {
  if (!isSupabaseConfigured) {
    const q = query.toLowerCase();
    return DEMO_PAGES
      .filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
      .map(({ content: _c, ...rest }) => rest);
  }

  const { data, error } = await supabase
    .from('parcel_wiki')
    .select('id, parcel_id, slug, title, category, source_type, tags, related_slugs, inbound_links, view_count, created_at, updated_at')
    .eq('parcel_id', parcelId)
    .not('category', 'in', '("index","log")')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as WikiPageSummary[];
}

/**
 * Trigger a wiki ingest for a parcel.
 * Called after survey completion, or manually from the UI.
 */
export async function triggerWikiIngest(
  parcelId: string,
  trigger: 'survey' | 'alert' | 'manual' = 'manual',
  sourceId?: string,
): Promise<{ success: boolean; pages_written: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/wiki-ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parcel_id: parcelId, trigger, source_id: sourceId }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Wiki ingest failed: ${err}`);
  }

  return res.json();
}

/** Category labels for display */
export const WIKI_CATEGORY_LABELS: Record<WikiCategory, string> = {
  health: 'Forest Health',
  threat: 'Threats',
  observation: 'Observations',
  plan: 'Management Plan',
  financial: 'Financial',
  regulatory: 'Regulatory',
  insight: 'AI Insights',
  index: 'Index',
  log: 'Log',
};

/** Source type labels */
export const WIKI_SOURCE_LABELS: Record<WikiSourceType, string> = {
  ai_generated: 'AI Generated',
  survey_compiled: 'From Survey',
  query_filed: 'Companion Insight',
  user_authored: 'User Written',
};
