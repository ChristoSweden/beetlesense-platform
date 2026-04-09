/**
 * contextBuilder.ts — Build structured context from the user's data for LLM injection.
 *
 * Gathers parcel summaries, active alerts, seasonal activities, and recent survey
 * results, then formats them as a structured context block.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCurrentSeason } from "./systemPrompt.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface ParcelSummary {
  id: string;
  name: string;
  municipality: string | null;
  area_ha: number;
  primary_species: string | null;
  health_score: number | null;
  beetle_risk: string | null;
  last_survey_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ActiveAlert {
  id: string;
  parcel_id: string;
  parcel_name: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  created_at: string;
}

interface SurveyResult {
  id: string;
  parcel_id: string;
  parcel_name: string;
  survey_type: string;
  status: string;
  completed_at: string | null;
  ndvi_mean: number | null;
  ndvi_anomaly_area_ha: number | null;
  tree_count: number | null;
  species_distribution: Record<string, number> | null;
  beetle_detections: number | null;
}

interface SensorProductSummary {
  parcel_id: string;
  parcel_name: string;
  sensor_type: string;
  product_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TreeInventorySummary {
  parcel_id: string;
  parcel_name: string;
  total_trees: number;
  avg_height_m: number | null;
  avg_dbh_cm: number | null;
  avg_ndvi: number | null;
  avg_ndre: number | null;
  avg_crown_temp_c: number | null;
  avg_health_score: number | null;
  stressed_count: number;
  species_counts: Record<string, number>;
  health_distribution: { healthy: number; moderate: number; stressed: number; critical: number };
}

interface ThermalHotspot {
  parcel_name: string;
  tree_count: number;
  avg_temp_anomaly: number;
  avg_crown_temp_c: number;
}

// ── Wiki page type ──────────────────────────────────────────────────────────

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
  similarity?: number;
}

export interface UserContext {
  parcels: ParcelSummary[];
  alerts: ActiveAlert[];
  surveys: SurveyResult[];
  sensorProducts: SensorProductSummary[];
  treeInventories: TreeInventorySummary[];
  thermalHotspots: ThermalHotspot[];
  wikiPages: WikiPage[];
  season: string;
  seasonActivities: string[];
}

// ── Fetch user data ─────────────────────────────────────────────────────────

export async function fetchUserContext(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
  queryEmbedding?: number[],
): Promise<UserContext> {
  const season = getCurrentSeason();

  // Run all queries in parallel — wiki pages searched semantically if embedding provided
  const [parcelsRes, alertsRes, surveysRes, sensorRes, treeInvRes, hotspotsRes, wikiRes] = await Promise.all([
    fetchParcels(supabase, userId, parcelId),
    fetchAlerts(supabase, userId, parcelId),
    fetchRecentSurveys(supabase, userId, parcelId),
    fetchSensorProducts(supabase, userId, parcelId),
    fetchTreeInventorySummaries(supabase, userId, parcelId),
    fetchThermalHotspots(supabase, userId, parcelId),
    fetchWikiPages(supabase, parcelId, queryEmbedding),
  ]);

  return {
    parcels: parcelsRes,
    alerts: alertsRes,
    surveys: surveysRes,
    sensorProducts: sensorRes,
    treeInventories: treeInvRes,
    thermalHotspots: hotspotsRes,
    wikiPages: wikiRes,
    season,
    seasonActivities: getSeasonalActivities(season),
  };
}

// ── Fetch wiki pages ─────────────────────────────────────────────────────────

/**
 * Fetch relevant wiki pages for the parcel.
 *
 * If a query embedding is provided, runs semantic search to find the most
 * relevant pages for the current question. Otherwise returns the most recently
 * updated pages (up to 5).
 *
 * The wiki is the primary knowledge source for parcel-specific facts — it is
 * read before RAG so the companion doesn't re-derive knowledge from scratch.
 */
async function fetchWikiPages(
  supabase: SupabaseClient,
  parcelId: string | null,
  queryEmbedding?: number[],
): Promise<WikiPage[]> {
  if (!parcelId) return [];

  if (queryEmbedding) {
    // Semantic search: find pages most relevant to the current query
    const { data, error } = await supabase.rpc("match_parcel_wiki", {
      p_parcel_id: parcelId,
      query_embedding: queryEmbedding,
      match_count: 5,
      similarity_threshold: 0.25,
    });
    if (error) {
      console.warn("Wiki semantic search failed:", error.message);
    } else if (data && data.length > 0) {
      return data as WikiPage[];
    }
  }

  // Fallback: most recently updated pages
  const { data, error } = await supabase
    .from("parcel_wiki")
    .select("slug, title, category, content, updated_at")
    .eq("parcel_id", parcelId)
    .not("category", "in", '("index","log")')
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("Wiki fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as WikiPage[];
}

async function fetchParcels(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<ParcelSummary[]> {
  let query = supabase
    .from("parcels")
    .select(
      "id, name, municipality, area_ha, primary_species, health_score, beetle_risk, last_survey_date, latitude, longitude",
    )
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (parcelId) {
    query = query.eq("id", parcelId);
  } else {
    query = query.limit(10);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch parcels for context:", error.message);
    return [];
  }
  return (data ?? []) as ParcelSummary[];
}

async function fetchAlerts(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<ActiveAlert[]> {
  let query = supabase
    .from("alerts")
    .select("id, parcel_id, alert_type, severity, message, created_at, parcels!inner(name)")
    .eq("parcels.user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (parcelId) {
    query = query.eq("parcel_id", parcelId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch alerts for context:", error.message);
    return [];
  }

  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    parcel_id: row.parcel_id,
    parcel_name: row.parcels?.name ?? "Unknown",
    alert_type: row.alert_type,
    severity: row.severity,
    message: row.message,
    created_at: row.created_at,
  }));
}

async function fetchRecentSurveys(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<SurveyResult[]> {
  let query = supabase
    .from("surveys")
    .select(
      "id, parcel_id, survey_type, status, completed_at, ndvi_mean, ndvi_anomaly_area_ha, tree_count, species_distribution, beetle_detections, parcels!inner(name)",
    )
    .eq("parcels.user_id", userId)
    .in("status", ["completed", "reviewed"])
    .order("completed_at", { ascending: false })
    .limit(5);

  if (parcelId) {
    query = query.eq("parcel_id", parcelId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch surveys for context:", error.message);
    return [];
  }

  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    parcel_id: row.parcel_id,
    parcel_name: row.parcels?.name ?? "Unknown",
    survey_type: row.survey_type,
    status: row.status,
    completed_at: row.completed_at,
    ndvi_mean: row.ndvi_mean,
    ndvi_anomaly_area_ha: row.ndvi_anomaly_area_ha,
    tree_count: row.tree_count,
    species_distribution: row.species_distribution,
    beetle_detections: row.beetle_detections,
  }));
}

async function fetchSensorProducts(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<SensorProductSummary[]> {
  let query = supabase
    .from("sensor_products")
    .select(
      "parcel_id, sensor_type, product_name, metadata, created_at, parcels!inner(name, user_id)",
    )
    .eq("parcels.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (parcelId) {
    query = query.eq("parcel_id", parcelId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch sensor products for context:", error.message);
    return [];
  }

  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((row: any) => ({
    parcel_id: row.parcel_id,
    parcel_name: row.parcels?.name ?? "Unknown",
    sensor_type: row.sensor_type,
    product_name: row.product_name,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }));
}

async function fetchTreeInventorySummaries(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<TreeInventorySummary[]> {
  // Get the latest survey per parcel that has tree inventory data
  let query = supabase
    .from("tree_inventory")
    .select(
      "parcel_id, height_m, dbh_cm, ndvi, ndre, crown_temp_c, health_score, stress_flag, species_prediction, parcels!inner(name, user_id)",
    )
    .eq("parcels.user_id", userId)
    .limit(500);

  if (parcelId) {
    query = query.eq("parcel_id", parcelId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch tree inventory for context:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group by parcel and compute aggregates
  // deno-lint-ignore no-explicit-any
  const byParcel = new Map<string, { name: string; rows: any[] }>();
  // deno-lint-ignore no-explicit-any
  for (const row of data as any[]) {
    const pid = row.parcel_id;
    if (!byParcel.has(pid)) {
      byParcel.set(pid, { name: row.parcels?.name ?? "Unknown", rows: [] });
    }
    byParcel.get(pid)!.rows.push(row);
  }

  const summaries: TreeInventorySummary[] = [];
  for (const [parcelId, { name, rows }] of byParcel) {
    const avg = (vals: (number | null)[]) => {
      const valid = vals.filter((v): v is number => v != null);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    const speciesCounts: Record<string, number> = {};
    for (const r of rows) {
      const sp = r.species_prediction ?? "unknown";
      speciesCounts[sp] = (speciesCounts[sp] ?? 0) + 1;
    }

    const healthScores = rows.map((r: { health_score: number | null }) => r.health_score).filter((v: number | null): v is number => v != null);
    const healthDist = { healthy: 0, moderate: 0, stressed: 0, critical: 0 };
    for (const hs of healthScores) {
      if (hs >= 70) healthDist.healthy++;
      else if (hs >= 50) healthDist.moderate++;
      else if (hs >= 40) healthDist.stressed++;
      else healthDist.critical++;
    }

    summaries.push({
      parcel_id: parcelId,
      parcel_name: name,
      total_trees: rows.length,
      avg_height_m: avg(rows.map((r: { height_m: number | null }) => r.height_m)),
      avg_dbh_cm: avg(rows.map((r: { dbh_cm: number | null }) => r.dbh_cm)),
      avg_ndvi: avg(rows.map((r: { ndvi: number | null }) => r.ndvi)),
      avg_ndre: avg(rows.map((r: { ndre: number | null }) => r.ndre)),
      avg_crown_temp_c: avg(rows.map((r: { crown_temp_c: number | null }) => r.crown_temp_c)),
      avg_health_score: avg(rows.map((r: { health_score: number | null }) => r.health_score)),
      stressed_count: rows.filter((r: { stress_flag: boolean }) => r.stress_flag).length,
      species_counts: speciesCounts,
      health_distribution: healthDist,
    });
  }

  return summaries;
}

async function fetchThermalHotspots(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string | null,
): Promise<ThermalHotspot[]> {
  // Find parcels with trees that have high thermal anomalies (z-score > 1.5)
  let query = supabase
    .from("tree_inventory")
    .select(
      "parcel_id, crown_temp_c, temp_anomaly, parcels!inner(name, user_id)",
    )
    .eq("parcels.user_id", userId)
    .gt("temp_anomaly", 1.5)
    .limit(200);

  if (parcelId) {
    query = query.eq("parcel_id", parcelId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch thermal hotspots for context:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group by parcel
  // deno-lint-ignore no-explicit-any
  const byParcel = new Map<string, { name: string; rows: any[] }>();
  // deno-lint-ignore no-explicit-any
  for (const row of data as any[]) {
    const pid = row.parcel_id;
    if (!byParcel.has(pid)) {
      byParcel.set(pid, { name: row.parcels?.name ?? "Unknown", rows: [] });
    }
    byParcel.get(pid)!.rows.push(row);
  }

  const hotspots: ThermalHotspot[] = [];
  for (const [_parcelId, { name, rows }] of byParcel) {
    const temps = rows.map((r: { crown_temp_c: number | null }) => r.crown_temp_c).filter((v: number | null): v is number => v != null);
    const anomalies = rows.map((r: { temp_anomaly: number | null }) => r.temp_anomaly).filter((v: number | null): v is number => v != null);
    hotspots.push({
      parcel_name: name,
      tree_count: rows.length,
      avg_temp_anomaly: anomalies.length > 0 ? anomalies.reduce((a: number, b: number) => a + b, 0) / anomalies.length : 0,
      avg_crown_temp_c: temps.length > 0 ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length : 0,
    });
  }

  return hotspots;
}

// ── Format as LLM context ───────────────────────────────────────────────────

/**
 * Format the user's data into a structured text block for injection into the
 * system prompt. Returns empty string if no meaningful data is available.
 */
export function formatUserContext(ctx: UserContext): string {
  const sections: string[] = [];

  // ── Wiki pages FIRST — pre-synthesised parcel knowledge (Karpathy pattern)
  // The wiki is the primary source for parcel-specific facts. The companion
  // reads the compiled wiki before raw data, avoiding re-derivation each query.
  if (ctx.wikiPages.length > 0) {
    sections.push(formatWikiSection(ctx.wikiPages));
  }

  // Season and activities
  sections.push(formatSeasonSection(ctx.season, ctx.seasonActivities));

  // Parcel summary
  if (ctx.parcels.length > 0) {
    sections.push(formatParcelSection(ctx.parcels));
  }

  // Active alerts
  if (ctx.alerts.length > 0) {
    sections.push(formatAlertSection(ctx.alerts));
  }

  // Recent surveys
  if (ctx.surveys.length > 0) {
    sections.push(formatSurveySection(ctx.surveys));
  }

  // Sensor products (multispectral, thermal, LiDAR)
  if (ctx.sensorProducts.length > 0) {
    sections.push(formatSensorProductSection(ctx.sensorProducts));
  }

  // Tree inventory summaries
  if (ctx.treeInventories.length > 0) {
    sections.push(formatTreeInventorySection(ctx.treeInventories));
  }

  // Thermal anomaly hotspots
  if (ctx.thermalHotspots.length > 0) {
    sections.push(formatThermalHotspotSection(ctx.thermalHotspots));
  }

  return sections.join("\n\n");
}

function formatWikiSection(pages: WikiPage[]): string {
  let section =
    `<parcel_wiki>\n` +
    `The following pages are from this parcel's compiled knowledge wiki. ` +
    `This is pre-synthesised knowledge — prefer it over re-deriving from raw data. ` +
    `Cite wiki pages as [Wiki: <slug>] when referencing them.\n\n`;

  for (const p of pages) {
    const updated = p.updated_at?.slice(0, 10) ?? "unknown";
    section += `### [[${p.slug}]] — ${p.title} (updated ${updated})\n`;
    section += p.content.length > 800 ? p.content.slice(0, 800) + "...\n" : p.content + "\n";
    section += "\n---\n\n";
  }

  section += `</parcel_wiki>`;
  return section;
}

function formatSeasonSection(season: string, activities: string[]): string {
  const seasonLabel: Record<string, string> = {
    spring: "Vår / Spring",
    summer: "Sommar / Summer",
    autumn: "Höst / Autumn",
    winter: "Vinter / Winter",
  };

  let section = `## Current Season: ${seasonLabel[season] ?? season}`;
  if (activities.length > 0) {
    section += "\nRecommended activities this season:\n";
    section += activities.map((a) => `- ${a}`).join("\n");
  }
  return section;
}

function formatParcelSection(parcels: ParcelSummary[]): string {
  let section = `## User's Forest Parcels (${parcels.length})\n`;

  for (const p of parcels) {
    const parts: string[] = [
      `**${p.name}**`,
      p.municipality ? `Municipality: ${p.municipality}` : null,
      `Area: ${p.area_ha} ha`,
      p.primary_species ? `Primary species: ${p.primary_species}` : null,
      p.health_score != null ? `Health score: ${p.health_score}/100` : null,
      p.beetle_risk ? `Beetle risk: ${p.beetle_risk}` : null,
      p.last_survey_date ? `Last survey: ${p.last_survey_date}` : "No survey yet",
    ].filter(Boolean) as string[];

    section += "\n" + parts.join(" | ");
  }

  return section;
}

function formatAlertSection(alerts: ActiveAlert[]): string {
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  let section = `## Active Alerts (${alerts.length} total`;
  if (criticalCount > 0) section += `, ${criticalCount} critical`;
  if (warningCount > 0) section += `, ${warningCount} warnings`;
  section += ")\n";

  for (const a of alerts) {
    const sevIcon =
      a.severity === "critical" ? "CRITICAL" :
      a.severity === "warning" ? "WARNING" : "INFO";
    section += `\n[${sevIcon}] ${a.parcel_name}: ${a.message} (${a.alert_type}, ${a.created_at})`;
  }

  return section;
}

function formatSurveySection(surveys: SurveyResult[]): string {
  let section = `## Recent Survey Results\n`;

  for (const s of surveys) {
    const parts: string[] = [
      `**${s.parcel_name}** — ${s.survey_type} (${s.status})`,
      s.completed_at ? `Completed: ${s.completed_at}` : null,
      s.ndvi_mean != null ? `NDVI mean: ${s.ndvi_mean.toFixed(3)}` : null,
      s.ndvi_anomaly_area_ha != null
        ? `NDVI anomaly area: ${s.ndvi_anomaly_area_ha.toFixed(2)} ha`
        : null,
      s.tree_count != null ? `Tree count: ${s.tree_count}` : null,
      s.beetle_detections != null ? `Beetle detections: ${s.beetle_detections}` : null,
      s.species_distribution
        ? `Species: ${Object.entries(s.species_distribution)
            .map(([sp, pct]) => `${sp} ${pct}%`)
            .join(", ")}`
        : null,
    ].filter(Boolean) as string[];

    section += "\n" + parts.join(" | ");
  }

  return section;
}

function formatSensorProductSection(products: SensorProductSummary[]): string {
  // Group by parcel, then by sensor type
  const byParcel = new Map<string, SensorProductSummary[]>();
  for (const p of products) {
    if (!byParcel.has(p.parcel_name)) {
      byParcel.set(p.parcel_name, []);
    }
    byParcel.get(p.parcel_name)!.push(p);
  }

  let section = `## Sensor Data Products\n`;

  for (const [parcelName, prods] of byParcel) {
    section += `\n### ${parcelName}\n`;

    // Group by sensor type
    const bySensor = new Map<string, SensorProductSummary[]>();
    for (const p of prods) {
      if (!bySensor.has(p.sensor_type)) {
        bySensor.set(p.sensor_type, []);
      }
      bySensor.get(p.sensor_type)!.push(p);
    }

    for (const [sensorType, sensorProds] of bySensor) {
      const productNames = sensorProds.map((p) => p.product_name).join(", ");
      const latest = sensorProds[0].created_at;
      section += `- **${sensorType}**: ${productNames} (latest: ${latest})\n`;

      // Include key metadata values if available
      for (const sp of sensorProds) {
        const meta = sp.metadata;
        const metaParts: string[] = [];
        if (meta.mean != null) metaParts.push(`mean: ${Number(meta.mean).toFixed(3)}`);
        if (meta.min != null) metaParts.push(`min: ${Number(meta.min).toFixed(3)}`);
        if (meta.max != null) metaParts.push(`max: ${Number(meta.max).toFixed(3)}`);
        if (meta.std_dev != null) metaParts.push(`std_dev: ${Number(meta.std_dev).toFixed(3)}`);
        if (meta.anomaly_area_ha != null) metaParts.push(`anomaly area: ${Number(meta.anomaly_area_ha).toFixed(2)} ha`);
        if (meta.hotspot_count != null) metaParts.push(`hotspots: ${meta.hotspot_count}`);
        if (metaParts.length > 0) {
          section += `  ${sp.product_name}: ${metaParts.join(", ")}\n`;
        }
      }
    }
  }

  return section;
}

function formatTreeInventorySection(inventories: TreeInventorySummary[]): string {
  let section = `## Tree Inventory Summary\n`;

  for (const inv of inventories) {
    section += `\n### ${inv.parcel_name}\n`;
    section += `- Total trees detected: ${inv.total_trees}\n`;
    if (inv.avg_height_m != null) section += `- Average height: ${inv.avg_height_m.toFixed(1)} m\n`;
    if (inv.avg_dbh_cm != null) section += `- Average DBH: ${inv.avg_dbh_cm.toFixed(1)} cm\n`;
    if (inv.avg_ndvi != null) section += `- Average NDVI: ${inv.avg_ndvi.toFixed(3)}\n`;
    if (inv.avg_ndre != null) section += `- Average NDRE: ${inv.avg_ndre.toFixed(3)}\n`;
    if (inv.avg_crown_temp_c != null) section += `- Average crown temperature: ${inv.avg_crown_temp_c.toFixed(1)} °C\n`;
    if (inv.avg_health_score != null) section += `- Average health score: ${inv.avg_health_score.toFixed(0)}/100\n`;
    section += `- Stressed trees: ${inv.stressed_count} (${((inv.stressed_count / inv.total_trees) * 100).toFixed(1)}%)\n`;

    // Crown health distribution
    const hd = inv.health_distribution;
    section += `- Crown health distribution: ${hd.healthy} healthy (>=70), ${hd.moderate} moderate (50-69), ${hd.stressed} stressed (40-49), ${hd.critical} critical (<40)\n`;

    // Species breakdown
    const speciesEntries = Object.entries(inv.species_counts)
      .sort(([, a], [, b]) => b - a)
      .map(([sp, count]) => `${sp}: ${count}`);
    if (speciesEntries.length > 0) {
      section += `- Species distribution: ${speciesEntries.join(", ")}\n`;
    }
  }

  return section;
}

function formatThermalHotspotSection(hotspots: ThermalHotspot[]): string {
  let section = `## Thermal Anomaly Hotspots (trees with temp anomaly z-score > 1.5)\n`;
  section += `*Elevated crown temperature indicates reduced transpiration, a key early indicator of bark beetle infestation or drought stress.*\n`;

  for (const hs of hotspots) {
    section += `\n- **${hs.parcel_name}**: ${hs.tree_count} trees with elevated temperature`;
    section += ` | avg crown temp: ${hs.avg_crown_temp_c.toFixed(1)} °C`;
    section += ` | avg anomaly z-score: ${hs.avg_temp_anomaly.toFixed(2)}`;
    section += `\n`;
  }

  return section;
}

// ── Seasonal activities ─────────────────────────────────────────────────────

function getSeasonalActivities(season: string): string[] {
  switch (season) {
    case "spring":
      return [
        "Monitor for bark beetle swarming (granbarkborre) — first flight typically mid-April to May",
        "Inspect overwintered windthrow for beetle colonization",
        "Plan spring planting (plantering) — optimal before bud break",
        "Submit avverkningsanmälan for planned summer/autumn felling",
        "Check pheromone trap deployment",
      ];
    case "summer":
      return [
        "PEAK BEETLE SEASON — active monitoring critical",
        "Check for sister generations (syskonkullar) from June onwards",
        "Schedule drone surveys for early detection of NDVI anomalies",
        "Avoid fresh cut surfaces in spruce stands if possible",
        "Monitor for drought stress — supplementary watering for new plantings",
        "Plan autumn thinning (gallring) operations",
      ];
    case "autumn":
      return [
        "Optimal time for thinning (gallring) and final felling (slutavverkning)",
        "Inspect stands for late-season beetle attacks before winter",
        "Plan winter harvesting operations",
        "Review annual forest management plan",
        "Apply for FSC/PEFC certification if needed",
        "Order seedlings for spring planting",
      ];
    case "winter":
      return [
        "Optimal harvesting conditions — frozen ground minimizes soil damage",
        "Conduct forest inventory on frozen ground",
        "Plan next year's management activities",
        "Review timber contracts and market outlook",
        "Maintain and service harvesting equipment",
        "Scarification (markberedning) planning for spring",
      ];
    default:
      return [];
  }
}
