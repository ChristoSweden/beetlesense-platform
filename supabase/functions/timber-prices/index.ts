import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { ok, err } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * timber-prices Edge Function
 *
 * Scrapes/fetches real timber prices from all major Swedish timber buyers.
 * Caches results in the `timber_prices` Supabase table.
 * Only re-fetches if data is older than 24 hours.
 *
 * Sources:
 *   - Skogsstyrelsen / SDC (official statistics)
 *   - Sodra, SCA, Holmen, Stora Enso, Sveaskog, Vida, Setra
 */

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 10_000; // 10s per source
const STALE_PRICE_DAYS = 30; // Mark prices older than 30 days as stale

// ─── Types ───

interface TimberPrice {
  buyer: string;
  assortment: string;
  price_sek_per_m3fub: number;
  region: string;
  valid_from: string;
  valid_to: string | null;
  source_url: string;
  is_estimated: boolean;
  fetched_at: string;
}

// ─── Source Definitions ───

interface PriceSource {
  buyer: string;
  url: string;
  region: string;
  scrape: (html: string, source: PriceSource) => TimberPrice[];
}

const SOURCES: PriceSource[] = [
  {
    buyer: "Skogsstyrelsen",
    url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/",
    region: "Hela Sverige",
    scrape: scrapeSkogsstyrelsen,
  },
  {
    buyer: "Sodra",
    url: "https://www.sodra.com/sv/skog/virkespriser/",
    region: "Gotaland",
    scrape: scrapePriceTable,
  },
  {
    buyer: "SCA",
    url: "https://www.sca.com/sv/skogsliv/virkespriser/",
    region: "Norrland",
    scrape: scrapePriceTable,
  },
  {
    buyer: "Holmen",
    url: "https://www.holmen.com/sv/skog/virkespriser/",
    region: "Svealand",
    scrape: scrapePriceTable,
  },
  {
    buyer: "Stora Enso",
    url: "https://www.storaenso.com/sv-se/skog/virkespriser",
    region: "Svealand",
    scrape: scrapePriceTable,
  },
  {
    buyer: "Sveaskog",
    url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/",
    region: "Hela Sverige",
    scrape: scrapePriceTable,
  },
  {
    buyer: "Vida",
    url: "https://www.vida.se/sv/skog/virkespriser/",
    region: "Gotaland",
    scrape: scrapePriceTable,
  },
  {
    buyer: "Setra",
    url: "https://www.setragroup.com/sv/skog/virkespriser/",
    region: "Svealand",
    scrape: scrapePriceTable,
  },
];

// ─── Fallback Demo Prices ───
// Based on real 2025-2026 Swedish market data. Used when scraping fails.

const DEMO_PRICES: Omit<TimberPrice, "fetched_at">[] = [
  // Sodra - Gotaland
  { buyer: "Sodra", assortment: "Talltimmer", price_sek_per_m3fub: 780, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sodra.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Sodra", assortment: "Grantimmer", price_sek_per_m3fub: 720, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sodra.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Sodra", assortment: "Massaved tall", price_sek_per_m3fub: 370, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sodra.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Sodra", assortment: "Massaved gran", price_sek_per_m3fub: 350, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sodra.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Sodra", assortment: "Bjorkmassa", price_sek_per_m3fub: 400, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sodra.com/sv/skog/virkespriser/", is_estimated: true },
  // SCA - Norrland
  { buyer: "SCA", assortment: "Talltimmer", price_sek_per_m3fub: 730, region: "Norrland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sca.com/sv/skogsliv/virkespriser/", is_estimated: true },
  { buyer: "SCA", assortment: "Grantimmer", price_sek_per_m3fub: 680, region: "Norrland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sca.com/sv/skogsliv/virkespriser/", is_estimated: true },
  { buyer: "SCA", assortment: "Massaved tall", price_sek_per_m3fub: 340, region: "Norrland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sca.com/sv/skogsliv/virkespriser/", is_estimated: true },
  { buyer: "SCA", assortment: "Massaved gran", price_sek_per_m3fub: 320, region: "Norrland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sca.com/sv/skogsliv/virkespriser/", is_estimated: true },
  { buyer: "SCA", assortment: "Bjorkmassa", price_sek_per_m3fub: 370, region: "Norrland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sca.com/sv/skogsliv/virkespriser/", is_estimated: true },
  // Stora Enso - Svealand
  { buyer: "Stora Enso", assortment: "Talltimmer", price_sek_per_m3fub: 760, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.storaenso.com/sv-se/skog/virkespriser", is_estimated: true },
  { buyer: "Stora Enso", assortment: "Grantimmer", price_sek_per_m3fub: 710, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.storaenso.com/sv-se/skog/virkespriser", is_estimated: true },
  { buyer: "Stora Enso", assortment: "Massaved tall", price_sek_per_m3fub: 360, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.storaenso.com/sv-se/skog/virkespriser", is_estimated: true },
  { buyer: "Stora Enso", assortment: "Massaved gran", price_sek_per_m3fub: 340, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.storaenso.com/sv-se/skog/virkespriser", is_estimated: true },
  { buyer: "Stora Enso", assortment: "Bjorkmassa", price_sek_per_m3fub: 390, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.storaenso.com/sv-se/skog/virkespriser", is_estimated: true },
  // Holmen - Svealand
  { buyer: "Holmen", assortment: "Talltimmer", price_sek_per_m3fub: 750, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.holmen.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Holmen", assortment: "Grantimmer", price_sek_per_m3fub: 700, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.holmen.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Holmen", assortment: "Massaved tall", price_sek_per_m3fub: 355, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.holmen.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Holmen", assortment: "Massaved gran", price_sek_per_m3fub: 335, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.holmen.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Holmen", assortment: "Bjorkmassa", price_sek_per_m3fub: 385, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.holmen.com/sv/skog/virkespriser/", is_estimated: true },
  // Sveaskog - Hela Sverige
  { buyer: "Sveaskog", assortment: "Talltimmer", price_sek_per_m3fub: 770, region: "Hela Sverige", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/", is_estimated: true },
  { buyer: "Sveaskog", assortment: "Grantimmer", price_sek_per_m3fub: 715, region: "Hela Sverige", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/", is_estimated: true },
  { buyer: "Sveaskog", assortment: "Massaved tall", price_sek_per_m3fub: 365, region: "Hela Sverige", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/", is_estimated: true },
  { buyer: "Sveaskog", assortment: "Massaved gran", price_sek_per_m3fub: 345, region: "Hela Sverige", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/", is_estimated: true },
  { buyer: "Sveaskog", assortment: "Bjorkmassa", price_sek_per_m3fub: 395, region: "Hela Sverige", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/", is_estimated: true },
  // Vida - Gotaland
  { buyer: "Vida", assortment: "Talltimmer", price_sek_per_m3fub: 790, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.vida.se/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Vida", assortment: "Grantimmer", price_sek_per_m3fub: 735, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.vida.se/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Vida", assortment: "Massaved tall", price_sek_per_m3fub: 375, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.vida.se/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Vida", assortment: "Massaved gran", price_sek_per_m3fub: 355, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.vida.se/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Vida", assortment: "Bjorkmassa", price_sek_per_m3fub: 405, region: "Gotaland", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.vida.se/sv/skog/virkespriser/", is_estimated: true },
  // Setra - Svealand
  { buyer: "Setra", assortment: "Talltimmer", price_sek_per_m3fub: 775, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.setragroup.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Setra", assortment: "Grantimmer", price_sek_per_m3fub: 725, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.setragroup.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Setra", assortment: "Massaved tall", price_sek_per_m3fub: 360, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.setragroup.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Setra", assortment: "Massaved gran", price_sek_per_m3fub: 345, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.setragroup.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Setra", assortment: "Bjorkmassa", price_sek_per_m3fub: 390, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.setragroup.com/sv/skog/virkespriser/", is_estimated: true },
  // Moelven - Svealand
  { buyer: "Moelven", assortment: "Talltimmer", price_sek_per_m3fub: 765, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.moelven.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Moelven", assortment: "Grantimmer", price_sek_per_m3fub: 710, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.moelven.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Moelven", assortment: "Massaved tall", price_sek_per_m3fub: 350, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.moelven.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Moelven", assortment: "Massaved gran", price_sek_per_m3fub: 335, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.moelven.com/sv/skog/virkespriser/", is_estimated: true },
  { buyer: "Moelven", assortment: "Bjorkmassa", price_sek_per_m3fub: 380, region: "Svealand", valid_from: "2026-01-01", valid_to: null, source_url: "https://www.moelven.com/sv/skog/virkespriser/", is_estimated: true },
  // Skogsstyrelsen - official averages
  { buyer: "Skogsstyrelsen", assortment: "Talltimmer", price_sek_per_m3fub: 760, region: "Hela Sverige", valid_from: "2025-10-01", valid_to: "2025-12-31", source_url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/", is_estimated: true },
  { buyer: "Skogsstyrelsen", assortment: "Grantimmer", price_sek_per_m3fub: 710, region: "Hela Sverige", valid_from: "2025-10-01", valid_to: "2025-12-31", source_url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/", is_estimated: true },
  { buyer: "Skogsstyrelsen", assortment: "Massaved tall", price_sek_per_m3fub: 355, region: "Hela Sverige", valid_from: "2025-10-01", valid_to: "2025-12-31", source_url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/", is_estimated: true },
  { buyer: "Skogsstyrelsen", assortment: "Massaved gran", price_sek_per_m3fub: 340, region: "Hela Sverige", valid_from: "2025-10-01", valid_to: "2025-12-31", source_url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/", is_estimated: true },
  { buyer: "Skogsstyrelsen", assortment: "Bjorkmassa", price_sek_per_m3fub: 385, region: "Hela Sverige", valid_from: "2025-10-01", valid_to: "2025-12-31", source_url: "https://www.skogsstyrelsen.se/statistik/statistik-efter-amne/virkesspriser/", is_estimated: true },
];

// ─── HTML Scraping Helpers ───

/** Known assortment keywords mapped to canonical names */
const ASSORTMENT_KEYWORDS: [RegExp, string][] = [
  [/talltimmer|tall\s*timmer|pine\s*sawlog/i, "Talltimmer"],
  [/grantimmer|gran\s*timmer|spruce\s*sawlog/i, "Grantimmer"],
  [/massaved\s*tall|tall\s*massaved|pine\s*pulp/i, "Massaved tall"],
  [/massaved\s*gran|gran\s*massaved|spruce\s*pulp/i, "Massaved gran"],
  [/bj[oö]rk\s*massa|bj[oö]rkmassa|birch\s*pulp/i, "Bjorkmassa"],
];

function matchAssortment(text: string): string | null {
  for (const [regex, name] of ASSORTMENT_KEYWORDS) {
    if (regex.test(text)) return name;
  }
  return null;
}

/**
 * Extract price numbers from table cells near assortment keywords.
 * Uses a generic <tr>...<td> pattern common to Swedish forestry sites.
 */
function scrapePriceTable(html: string, source: PriceSource): TimberPrice[] {
  const prices: TimberPrice[] = [];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Strategy 1: Look for <tr> rows containing an assortment name and a price
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cellTexts = extractCellTexts(rowHtml);
    if (cellTexts.length < 2) continue;

    // Find which cell has an assortment name
    let assortment: string | null = null;
    for (const cell of cellTexts) {
      assortment = matchAssortment(cell);
      if (assortment) break;
    }
    if (!assortment) continue;

    // Find a price number (3-4 digit number, possibly with decimals)
    for (const cell of cellTexts) {
      const priceMatch = cell.match(/(\d{3,4}(?:[,.]\d{1,2})?)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(",", "."));
        if (price >= 100 && price <= 2000) {
          prices.push({
            buyer: source.buyer,
            assortment,
            price_sek_per_m3fub: Math.round(price),
            region: source.region,
            valid_from: today,
            valid_to: null,
            source_url: source.url,
            is_estimated: false,
            fetched_at: now,
          });
          break; // Take first valid price per row
        }
      }
    }
  }

  // Strategy 2: Look for dl/dt/dd patterns (some sites use definition lists)
  if (prices.length === 0) {
    const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dlMatch;
    while ((dlMatch = dlRegex.exec(html)) !== null) {
      const term = stripHTML(dlMatch[1]);
      const value = stripHTML(dlMatch[2]);
      const assortment = matchAssortment(term);
      if (!assortment) continue;
      const priceMatch = value.match(/(\d{3,4}(?:[,.]\d{1,2})?)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(",", "."));
        if (price >= 100 && price <= 2000) {
          prices.push({
            buyer: source.buyer,
            assortment,
            price_sek_per_m3fub: Math.round(price),
            region: source.region,
            valid_from: today,
            valid_to: null,
            source_url: source.url,
            is_estimated: false,
            fetched_at: now,
          });
        }
      }
    }
  }

  // Strategy 3: Look for structured data (JSON-LD or data attributes)
  if (prices.length === 0) {
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch;
    while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.offers || data.price) {
          // Attempt to extract structured price data
          const offers = Array.isArray(data.offers) ? data.offers : [data.offers || data];
          for (const offer of offers) {
            if (offer.name && offer.price) {
              const assortment = matchAssortment(offer.name);
              if (assortment) {
                prices.push({
                  buyer: source.buyer,
                  assortment,
                  price_sek_per_m3fub: Math.round(Number(offer.price)),
                  region: source.region,
                  valid_from: today,
                  valid_to: null,
                  source_url: source.url,
                  is_estimated: false,
                  fetched_at: now,
                });
              }
            }
          }
        }
      } catch {
        // Invalid JSON-LD, skip
      }
    }
  }

  return prices;
}

/**
 * Skogsstyrelsen publishes quarterly statistics in a specific format.
 * They often use a different table structure with period headers.
 */
function scrapeSkogsstyrelsen(html: string, source: PriceSource): TimberPrice[] {
  const prices: TimberPrice[] = [];
  const now = new Date().toISOString();

  // Try the same generic table approach first
  const genericPrices = scrapePriceTable(html, source);
  if (genericPrices.length > 0) return genericPrices;

  // Skogsstyrelsen may also show data in a chart/embed — attempt to find
  // any structured data blocks with price information
  const numericBlocks = html.match(/(?:talltimmer|grantimmer|massaved|bj[oö]rk)[^<]{0,200}?\d{3,4}/gi);
  if (numericBlocks) {
    for (const block of numericBlocks) {
      const assortment = matchAssortment(block);
      if (!assortment) continue;
      const priceMatch = block.match(/(\d{3,4})/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1], 10);
        if (price >= 100 && price <= 2000) {
          prices.push({
            buyer: source.buyer,
            assortment,
            price_sek_per_m3fub: price,
            region: source.region,
            valid_from: "2025-10-01", // Quarterly
            valid_to: "2025-12-31",
            source_url: source.url,
            is_estimated: false,
            fetched_at: now,
          });
        }
      }
    }
  }

  return prices;
}

function extractCellTexts(rowHtml: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = cellRegex.exec(rowHtml)) !== null) {
    cells.push(stripHTML(match[1]).trim());
  }
  return cells;
}

function stripHTML(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ─── Fetch a single source ───

async function fetchSource(source: PriceSource): Promise<{
  buyer: string;
  prices: TimberPrice[];
  error?: string;
}> {
  try {
    const resp = await fetch(source.url, {
      headers: {
        "User-Agent": "BeetleSense/1.0 (+https://beetlesense.ai)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!resp.ok) {
      console.warn(`Fetch failed for ${source.buyer}: HTTP ${resp.status}`);
      return { buyer: source.buyer, prices: [], error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();

    // Some sites require JavaScript rendering — detect empty/minimal content
    if (html.length < 500 || !html.includes("<table") && !html.includes("<dt") && !html.includes("kr/m")) {
      console.warn(`${source.buyer}: Page may require JS rendering (${html.length} bytes, no price indicators found)`);
      return { buyer: source.buyer, prices: [], error: "JS_RENDERING_REQUIRED" };
    }

    const prices = source.scrape(html, source);
    console.log(`${source.buyer}: Scraped ${prices.length} prices`);
    return { buyer: source.buyer, prices };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`Fetch error for ${source.buyer}: ${msg}`);
    return { buyer: source.buyer, prices: [], error: msg };
  }
}

// ─── Main Handler ───

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse query params
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("force") === "true";
    const regionFilter = url.searchParams.get("region"); // Optional: "Gotaland", "Svealand", "Norrland"

    // Check staleness: skip fetch if we have recent data (unless forced)
    if (!forceRefresh) {
      const { data: latest } = await supabase
        .from("timber_prices")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        const age = Date.now() - new Date(latest.fetched_at).getTime();
        if (age < STALE_THRESHOLD_MS) {
          // Return cached data
          let query = supabase
            .from("timber_prices")
            .select("*")
            .order("buyer", { ascending: true });

          if (regionFilter) {
            query = query.or(`region.eq.${regionFilter},region.eq.Hela Sverige`);
          }

          const { data: cached, error: cacheError } = await query;
          if (cacheError) {
            return err(`Failed to read cache: ${cacheError.message}`, 500);
          }

          // Mark stale prices
          const now = Date.now();
          const enriched = (cached || []).map((p: any) => ({
            ...p,
            is_stale: (now - new Date(p.fetched_at).getTime()) > STALE_PRICE_DAYS * 86400000,
          }));

          return ok({
            status: "cached",
            age_hours: Math.round(age / 3600000 * 10) / 10,
            prices: enriched,
            count: enriched.length,
          });
        }
      }
    }

    // Fetch all sources in parallel
    const results = await Promise.allSettled(
      SOURCES.map((source) => fetchSource(source))
    );

    const allPrices: TimberPrice[] = [];
    const fetchStatus: { buyer: string; count: number; error?: string }[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { buyer, prices, error } = result.value;
        allPrices.push(...prices);
        fetchStatus.push({ buyer, count: prices.length, error });
      } else {
        fetchStatus.push({ buyer: "unknown", count: 0, error: result.reason?.message });
      }
    }

    // For any buyer with 0 scraped prices, fill in from demo fallback
    const scrapedBuyers = new Set(allPrices.map((p) => p.buyer));
    const now = new Date().toISOString();

    for (const demoPrice of DEMO_PRICES) {
      if (!scrapedBuyers.has(demoPrice.buyer)) {
        allPrices.push({
          ...demoPrice,
          fetched_at: now,
        });
      }
    }

    // Upsert into timber_prices table
    if (allPrices.length > 0) {
      const rows = allPrices.map((p) => ({
        buyer: p.buyer,
        assortment: p.assortment,
        price_sek_per_m3fub: p.price_sek_per_m3fub,
        region: p.region,
        valid_from: p.valid_from,
        valid_to: p.valid_to,
        source_url: p.source_url,
        is_estimated: p.is_estimated,
        fetched_at: p.fetched_at,
      }));

      const { error: upsertError } = await supabase
        .from("timber_prices")
        .upsert(rows, {
          onConflict: "buyer,assortment,region,valid_from",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        // Don't fail the response — still return fetched data
      }
    }

    // Apply region filter if requested
    let filteredPrices = allPrices;
    if (regionFilter) {
      filteredPrices = allPrices.filter(
        (p) => p.region === regionFilter || p.region === "Hela Sverige"
      );
    }

    // Mark stale prices
    const nowMs = Date.now();
    const enriched = filteredPrices.map((p) => ({
      ...p,
      is_stale: (nowMs - new Date(p.fetched_at).getTime()) > STALE_PRICE_DAYS * 86400000,
    }));

    return ok({
      status: "refreshed",
      prices: enriched,
      count: enriched.length,
      sources: fetchStatus,
    });
  } catch (e) {
    console.error("timber-prices error:", e);
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
