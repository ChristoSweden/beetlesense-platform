import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { ok, err } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * news-refresh Edge Function
 *
 * Fetches fresh forestry news from real Swedish RSS feeds on each login.
 * Only fetches if the latest curated_news entry is older than STALE_THRESHOLD.
 *
 * Sources:
 *   - Skogsstyrelsen (Swedish Forest Agency) — nyheter
 *   - SLU (Swedish Univ. of Agricultural Sciences) — forest research
 *   - Skogsindustrierna (Forest Industries) — market/industry
 *   - Södra Skogsägarna — southern forest owner cooperative
 *   - SMHI — weather warnings relevant to forestry
 */

const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
}

const RSS_SOURCES: { url: string; source: string; category: string }[] = [
  {
    url: "https://www.skogsstyrelsen.se/rss/nyheter/",
    source: "Skogsstyrelsen",
    category: "FOREST_HEALTH",
  },
  {
    url: "https://www.slu.se/ew-nyheter/rss/",
    source: "SLU",
    category: "TECHNOLOGY",
  },
  {
    url: "https://www.skogsindustrierna.se/rss/nyheter/",
    source: "Skogsindustrierna",
    category: "MARKET_PRICES",
  },
  {
    url: "https://www.sodra.com/sv/om-sodra/press-och-nyheter/rss/",
    source: "Södra",
    category: "MARKET_PRICES",
  },
];

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check staleness: skip fetch if we have recent news
    const { data: latest } = await supabase
      .from("curated_news")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      const age = Date.now() - new Date(latest.created_at).getTime();
      if (age < STALE_THRESHOLD_MS) {
        return ok({ status: "fresh", age_hours: Math.round(age / 3600000 * 10) / 10, fetched: 0 });
      }
    }

    // Fetch all RSS feeds in parallel
    const feedResults = await Promise.allSettled(
      RSS_SOURCES.map((src) => fetchRSSFeed(src.url, src.source, src.category))
    );

    const allItems: RSSItem[] = [];
    for (const result of feedResults) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    if (allItems.length === 0) {
      return ok({ status: "no_items", fetched: 0 });
    }

    // Deduplicate by URL and score
    const seen = new Set<string>();
    const unique: RSSItem[] = [];
    for (const item of allItems) {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        unique.push(item);
      }
    }

    // Categorize beetle-related articles
    const beetleKeywords = ["barkborr", "granbarkborr", "bark beetle", "ips typographus", "scolytus"];
    const climateKeywords = ["klimat", "torka", "drought", "storm", "brand", "fire", "climate"];
    const regulationKeywords = ["förordning", "lagstiftning", "regulation", "eu forest", "policy"];

    for (const item of unique) {
      const text = `${item.title} ${item.description}`.toLowerCase();
      if (beetleKeywords.some((kw) => text.includes(kw))) {
        item.category = "BEETLE_OUTBREAKS";
      } else if (climateKeywords.some((kw) => text.includes(kw))) {
        item.category = "CLIMATE_IMPACT";
      } else if (regulationKeywords.some((kw) => text.includes(kw))) {
        item.category = "REGULATIONS";
      }
    }

    // Score by recency
    const now = Date.now();
    const scored = unique.map((item) => {
      const pubMs = new Date(item.pubDate).getTime();
      const ageDays = Math.max(0, (now - pubMs) / 86400000);
      const recencyScore = Math.max(0, 1 - ageDays / 30); // linear decay over 30 days
      const relevanceScore = item.category === "BEETLE_OUTBREAKS" ? 0.95 : 0.7;
      const combinedScore = relevanceScore * 0.6 + recencyScore * 0.4;
      return { ...item, recencyScore, relevanceScore, combinedScore };
    });

    // Sort by combined score, take top 20
    scored.sort((a, b) => b.combinedScore - a.combinedScore);
    const top = scored.slice(0, 20);

    // Upsert into curated_news
    const rows = top.map((item) => ({
      source_url: item.link,
      title: item.title.slice(0, 500),
      summary: item.description.slice(0, 1000),
      category: item.category,
      relevance_score: item.relevanceScore,
      recency_score: item.recencyScore,
      combined_score: item.combinedScore,
      language: "sv",
      published_at: new Date(item.pubDate).toISOString(),
      expires_at: new Date(now + 30 * 86400000).toISOString(),
      metadata: { source_name: item.source, fetched_via: "news-refresh" },
    }));

    const { error: upsertError } = await supabase
      .from("curated_news")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return err(`Failed to store news: ${upsertError.message}`, 500);
    }

    return ok({ status: "refreshed", fetched: top.length, total_parsed: allItems.length });
  } catch (e) {
    console.error("news-refresh error:", e);
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});

/**
 * Fetch and parse an RSS feed into RSSItem[].
 * Uses simple XML parsing (no external deps needed in Deno).
 */
async function fetchRSSFeed(
  url: string,
  source: string,
  defaultCategory: string,
): Promise<RSSItem[]> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "BeetleSense/1.0 (+https://beetlesense.ai)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    console.warn(`RSS fetch failed for ${source}: ${resp.status}`);
    return [];
  }

  const xml = await resp.text();
  const items: RSSItem[] = [];

  // Simple regex-based RSS parsing (reliable for standard RSS 2.0/Atom)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractAtomLink(block);
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");

    if (title && link) {
      items.push({
        title: stripCDATA(title),
        link: stripCDATA(link).trim(),
        description: stripHTML(stripCDATA(description || "")),
        pubDate: pubDate || new Date().toISOString(),
        source,
        category: defaultCategory,
      });
    }
  }

  // Also try Atom <entry> format
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractAtomLink(block) || extractTag(block, "link");
    const summary = extractTag(block, "summary") || extractTag(block, "content");
    const pubDate = extractTag(block, "published") || extractTag(block, "updated");

    if (title && link) {
      items.push({
        title: stripCDATA(title),
        link: stripCDATA(link).trim(),
        description: stripHTML(stripCDATA(summary || "")),
        pubDate: pubDate || new Date().toISOString(),
        source,
        category: defaultCategory,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1] : "";
}

function extractAtomLink(xml: string): string {
  const match = /<link[^>]*href="([^"]*)"[^>]*\/?>/i.exec(xml);
  return match ? match[1] : "";
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
