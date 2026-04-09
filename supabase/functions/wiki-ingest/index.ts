/**
 * wiki-ingest — LLM-maintained per-parcel knowledge wiki (Karpathy pattern)
 *
 * POST /wiki-ingest
 * Body: {
 *   parcel_id: string,
 *   trigger: 'survey' | 'alert' | 'answer' | 'manual',
 *   source_id?: string,       // survey/alert/message ID that triggered this
 *   answer_content?: string,  // for trigger='answer': the companion answer to file
 *   answer_question?: string, // the question that produced the answer
 * }
 *
 * On each ingest the function:
 * 1. Fetches all parcel data (surveys, alerts, tree inventory)
 * 2. Reads existing wiki pages for context
 * 3. Uses Claude to generate/update relevant wiki pages
 * 4. Embeds each page and upserts into parcel_wiki
 * 5. Updates the wiki index and log
 *
 * The wiki is a compounding artifact — each ingest makes it richer.
 * The companion reads the wiki first (contextBuilder) instead of re-deriving
 * everything from raw data on every query.
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { generateQueryEmbedding } from "../_shared/embedding.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-haiku-4-5-20251001"; // fast + cheap for wiki maintenance
const ANTHROPIC_API =
  "https://api.anthropic.com/v1/messages";

const CATEGORY_SLUGS: Record<string, string> = {
  health: "forest-health-overview",
  threat: "threat-assessment",
  observation: "recent-observations",
  financial: "financial-overview",
  regulatory: "regulatory-status",
  plan: "management-plan",
};

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const supabase = createServiceClient();
    const user = await getUser(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const body = await req.json();
    const { parcel_id, trigger, source_id, answer_content, answer_question } = body;

    if (!parcel_id) {
      return new Response(JSON.stringify({ error: "parcel_id required" }), { status: 400 });
    }

    // Verify parcel ownership
    const { data: parcel, error: parcelErr } = await supabase
      .from("parcels")
      .select("id, name, municipality, area_ha, primary_species, health_score, beetle_risk, latitude, longitude")
      .eq("id", parcel_id)
      .eq("user_id", user.id)
      .single();

    if (parcelErr || !parcel) {
      return new Response(JSON.stringify({ error: "Parcel not found" }), { status: 404 });
    }

    // ── 1. Gather parcel data ──────────────────────────────────────────────
    const parcelData = await gatherParcelData(supabase, parcel_id, user.id);

    // ── 2. Read existing wiki for context ──────────────────────────────────
    const existingPages = await fetchExistingWiki(supabase, parcel_id);

    // ── 3. Generate wiki pages via Claude ─────────────────────────────────
    const pagesToWrite: WikiPage[] = [];

    if (trigger === "answer" && answer_content && answer_question) {
      // File a companion answer back as an insight page
      const page = await generateInsightPage(
        parcel,
        answer_question,
        answer_content,
        source_id,
      );
      if (page) pagesToWrite.push(page);
    } else {
      // Full ingest: generate/update core wiki pages
      const generated = await generateCorePages(parcel, parcelData, existingPages, trigger);
      pagesToWrite.push(...generated);
    }

    // ── 4. Embed and upsert pages ──────────────────────────────────────────
    const upserted: string[] = [];
    for (const page of pagesToWrite) {
      try {
        const embedding = await generateQueryEmbedding(`${page.title}\n\n${page.content}`);
        await upsertWikiPage(supabase, {
          ...page,
          parcel_id,
          user_id: user.id,
          embedding,
          source_ids: source_id ? [source_id] : [],
        });
        upserted.push(page.slug);
      } catch (e) {
        console.warn(`Failed to embed/upsert wiki page "${page.slug}":`, e);
      }
    }

    // ── 5. Rebuild index ───────────────────────────────────────────────────
    const allPages = await fetchExistingWiki(supabase, parcel_id);
    await rebuildIndex(supabase, parcel_id, user.id, parcel.name, allPages);

    // ── 6. Append log entry ────────────────────────────────────────────────
    await appendLog(supabase, parcel_id, user.id, trigger, upserted, source_id);

    return new Response(
      JSON.stringify({ success: true, pages_written: upserted }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("wiki-ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500 },
    );
  }
});

// ── Types ────────────────────────────────────────────────────────────────────

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  content: string;
  source_type: string;
  tags: string[];
  related_slugs: string[];
}

interface WikiPageRow extends WikiPage {
  parcel_id: string;
  user_id: string;
  embedding: number[];
  source_ids: string[];
}

// ── Data gathering ────────────────────────────────────────────────────────────

async function gatherParcelData(
  supabase: SupabaseClient,
  parcelId: string,
  _userId: string,
): Promise<string> {
  const [surveysRes, alertsRes, treeRes] = await Promise.all([
    supabase
      .from("surveys")
      .select("id, survey_type, completed_at, ndvi_mean, ndvi_anomaly_area_ha, tree_count, species_distribution, beetle_detections, status")
      .eq("parcel_id", parcelId)
      .in("status", ["completed", "reviewed"])
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("alerts")
      .select("id, alert_type, severity, message, created_at, is_active")
      .eq("parcel_id", parcelId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tree_inventory")
      .select("height_m, dbh_cm, ndvi, ndre, crown_temp_c, health_score, stress_flag, species_prediction")
      .eq("parcel_id", parcelId)
      .limit(200),
  ]);

  const surveys = surveysRes.data ?? [];
  const alerts = alertsRes.data ?? [];
  const trees = treeRes.data ?? [];

  // Summarise tree inventory
  const treeCount = trees.length;
  const avgNdvi = treeCount > 0
    ? (trees.reduce((s, t) => s + (t.ndvi ?? 0), 0) / treeCount).toFixed(3)
    : "N/A";
  const stressedCount = trees.filter((t) => t.stress_flag).length;
  const avgHealth = treeCount > 0
    ? (trees.reduce((s, t) => s + (t.health_score ?? 0), 0) / treeCount).toFixed(1)
    : "N/A";

  return `## Surveys (${surveys.length} completed)
${surveys.map((s) =>
  `- ${s.completed_at?.slice(0, 10) ?? "unknown date"} | ${s.survey_type} | NDVI: ${s.ndvi_mean?.toFixed(3) ?? "N/A"} | Beetle detections: ${s.beetle_detections ?? 0} | Trees: ${s.tree_count ?? 0}`
).join("\n")}

## Active Alerts (${alerts.filter((a) => a.is_active).length} active)
${alerts.slice(0, 10).map((a) =>
  `- [${a.severity.toUpperCase()}] ${a.alert_type}: ${a.message} (${a.created_at?.slice(0, 10)}${a.is_active ? ", ACTIVE" : ", resolved"})`
).join("\n")}

## Tree Inventory Summary
- Total trees sampled: ${treeCount}
- Average NDVI: ${avgNdvi}
- Average health score: ${avgHealth}/100
- Stressed trees: ${stressedCount} (${treeCount > 0 ? ((stressedCount / treeCount) * 100).toFixed(1) : 0}%)`;
}

// ── Existing wiki fetch ───────────────────────────────────────────────────────

async function fetchExistingWiki(
  supabase: SupabaseClient,
  parcelId: string,
): Promise<{ slug: string; title: string; category: string; content: string; updated_at: string }[]> {
  const { data } = await supabase
    .from("parcel_wiki")
    .select("slug, title, category, content, updated_at")
    .eq("parcel_id", parcelId)
    .not("category", "in", '("index","log")')
    .order("updated_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── Core page generation ──────────────────────────────────────────────────────

async function generateCorePages(
  // deno-lint-ignore no-explicit-any
  parcel: any,
  parcelData: string,
  existingPages: { slug: string; title: string; category: string; content: string; updated_at: string }[],
  trigger: string,
): Promise<WikiPage[]> {
  const existingSummary = existingPages.length > 0
    ? `## Existing wiki pages (for context — update or cross-reference as needed)\n${
      existingPages.map((p) => `### ${p.title} (${p.slug})\n${p.content.slice(0, 500)}`).join("\n\n")
    }`
    : "No existing wiki pages yet — this is the first ingest.";

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are maintaining a structured knowledge wiki for a Swedish forest parcel.
This wiki follows the Karpathy LLM Wiki pattern: it is a persistent, compounding artifact
that the AI maintains and forest owners read. You write all of it; the human reads it.

## Parcel: ${parcel.name}
- Location: ${parcel.municipality ?? "Sweden"}
- Area: ${parcel.area_ha} ha
- Primary species: ${parcel.primary_species ?? "mixed"}
- Current health score: ${parcel.health_score ?? "unknown"}/100
- Beetle risk: ${parcel.beetle_risk ?? "unknown"}
- Coordinates: ${parcel.latitude ?? "N/A"}, ${parcel.longitude ?? "N/A"}
- Ingest trigger: ${trigger}
- Date: ${today}

## Raw data from sensors, surveys, and alerts
${parcelData}

${existingSummary}

## Your task
Generate or update the following wiki pages for this parcel. Return them as a JSON array.
Each page is a markdown document that synthesises the data above into clear, actionable knowledge.

Write exactly these pages (update if they exist, create if they don't):
1. "forest-health-overview" (category: health) — overall health status, NDVI trends, key metrics, what's improving/declining
2. "threat-assessment" (category: threat) — current threats ranked by severity, beetle risk, active alerts, recommended actions
3. "recent-observations" (category: observation) — timeline of recent surveys and findings, what changed since last survey

Each page MUST:
- Be 200–500 words of markdown
- Use ## subheadings, bullet points, and bold for key numbers
- Include a "Last updated: ${today}" line at the top
- Cross-reference related pages using [[slug]] notation
- Be in the same language as the parcel name (Swedish names → Swedish content, English names → English content)
- Synthesise all available data — do NOT just list raw numbers, interpret them
- Flag contradictions or gaps in the data

Return ONLY valid JSON, no other text:
[
  {
    "slug": "forest-health-overview",
    "title": "Forest Health Overview",
    "category": "health",
    "content": "...",
    "tags": ["health", "ndvi", "overview"],
    "related_slugs": ["threat-assessment", "recent-observations"]
  },
  ...
]`;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API error ${res.status}: ${detail}`);
  }

  const json = await res.json();
  const raw = json.content?.[0]?.text ?? "[]";

  // Extract JSON from response (may have markdown fences)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn("Wiki generation returned no JSON, raw:", raw.slice(0, 300));
    return [];
  }

  const pages = JSON.parse(jsonMatch[0]) as WikiPage[];
  return pages.map((p) => ({ ...p, source_type: "survey_compiled" }));
}

// ── Insight page (file answer back) ─────────────────────────────────────────

async function generateInsightPage(
  // deno-lint-ignore no-explicit-any
  parcel: any,
  question: string,
  answer: string,
  _sourceId: string | undefined,
): Promise<WikiPage | null> {
  const today = new Date().toISOString().slice(0, 10);
  const slug = `insight-${today}-${Math.random().toString(36).slice(2, 7)}`;

  // Derive a clean title from the question
  const title = question.length > 60
    ? question.slice(0, 57) + "..."
    : question;

  const content = `Last updated: ${today}

## Question
${question}

## Answer
${answer}

---
*This insight was generated by the BeetleSense AI companion and filed to the wiki because it received high confidence. It represents synthesised knowledge about ${parcel.name} and should be reviewed by the forest owner.*`;

  return {
    slug,
    title,
    category: "insight",
    content,
    source_type: "query_filed",
    tags: ["insight", "companion-answer"],
    related_slugs: [CATEGORY_SLUGS.health, CATEGORY_SLUGS.threat],
  };
}

// ── Upsert wiki page ──────────────────────────────────────────────────────────

async function upsertWikiPage(
  supabase: SupabaseClient,
  page: WikiPageRow,
): Promise<void> {
  const { error } = await supabase
    .from("parcel_wiki")
    .upsert(
      {
        parcel_id: page.parcel_id,
        user_id: page.user_id,
        slug: page.slug,
        title: page.title,
        category: page.category,
        content: page.content,
        source_type: page.source_type,
        source_ids: page.source_ids,
        tags: page.tags,
        related_slugs: page.related_slugs,
        embedding: page.embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "parcel_id,slug" },
    );

  if (error) throw new Error(`Upsert failed for slug "${page.slug}": ${error.message}`);
}

// ── Rebuild index ─────────────────────────────────────────────────────────────

async function rebuildIndex(
  supabase: SupabaseClient,
  parcelId: string,
  userId: string,
  parcelName: string,
  pages: { slug: string; title: string; category: string; updated_at: string }[],
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const grouped: Record<string, typeof pages> = {};
  for (const p of pages) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, ps]) =>
      `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n${
        ps.map((p) => `- [[${p.slug}]] — ${p.title} *(updated ${p.updated_at?.slice(0, 10)})*`).join("\n")
      }`
    )
    .join("\n\n");

  const content = `# Wiki Index — ${parcelName}
Last updated: ${today}

This is the auto-maintained index for the **${parcelName}** forest parcel wiki.
The BeetleSense AI writes and updates all pages. You read; the AI maintains.

## Pages (${pages.length} total)

${sections}

---
*Wiki maintained by BeetleSense AI using the Karpathy LLM Wiki pattern.
New pages are created on each survey, alert, or high-confidence companion answer.*`;

  await supabase
    .from("parcel_wiki")
    .upsert(
      {
        parcel_id: parcelId,
        user_id: userId,
        slug: "index",
        title: `Wiki Index — ${parcelName}`,
        category: "index",
        content,
        source_type: "ai_generated",
        source_ids: [],
        tags: ["index"],
        related_slugs: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "parcel_id,slug" },
    );
}

// ── Append log ────────────────────────────────────────────────────────────────

async function appendLog(
  supabase: SupabaseClient,
  parcelId: string,
  userId: string,
  trigger: string,
  pagesWritten: string[],
  sourceId: string | undefined,
): Promise<void> {
  // Fetch existing log
  const { data: existing } = await supabase
    .from("parcel_wiki")
    .select("content")
    .eq("parcel_id", parcelId)
    .eq("slug", "log")
    .single();

  const today = new Date().toISOString().slice(0, 19).replace("T", " ");
  const entry = `## [${today}] ${trigger} | ${pagesWritten.length} pages written
- Pages: ${pagesWritten.join(", ") || "none"}
- Source ID: ${sourceId ?? "manual"}`;

  const content = existing?.content
    ? `${entry}\n\n${existing.content}`
    : `# Wiki Log\nAppend-only record of all ingest operations.\n\n${entry}`;

  await supabase
    .from("parcel_wiki")
    .upsert(
      {
        parcel_id: parcelId,
        user_id: userId,
        slug: "log",
        title: "Wiki Log",
        category: "log",
        content,
        source_type: "ai_generated",
        source_ids: [],
        tags: ["log"],
        related_slugs: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "parcel_id,slug" },
    );
}
