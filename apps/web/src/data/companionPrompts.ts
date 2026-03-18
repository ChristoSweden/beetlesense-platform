/**
 * companionPrompts.ts — Curated conversation starters for the AI Companion.
 *
 * 20 Swedish + 20 English prompts organized by category.
 * Each prompt has a short label (for button display) and the full question text.
 */

export type PromptCategory =
  | "beetle_management"
  | "forest_health"
  | "timber_market"
  | "legal"
  | "operations"
  | "climate";

export interface CompanionPrompt {
  id: string;
  category: PromptCategory;
  label: { sv: string; en: string };
  question: { sv: string; en: string };
}

export const PROMPT_CATEGORIES: Record<
  PromptCategory,
  { label: { sv: string; en: string }; icon: string }
> = {
  beetle_management: {
    label: { sv: "Barkborrehantering", en: "Beetle Management" },
    icon: "bug",
  },
  forest_health: {
    label: { sv: "Skogshälsa", en: "Forest Health" },
    icon: "trees",
  },
  timber_market: {
    label: { sv: "Virkesmarknad", en: "Timber Market" },
    icon: "trending-up",
  },
  legal: {
    label: { sv: "Lagar & regler", en: "Legal & Regulations" },
    icon: "scale",
  },
  operations: {
    label: { sv: "Skogsskötsel", en: "Operations" },
    icon: "axe",
  },
  climate: {
    label: { sv: "Klimat", en: "Climate" },
    icon: "cloud-sun",
  },
};

export const COMPANION_PROMPTS: CompanionPrompt[] = [
  // ── Beetle Management (4 prompts) ──────────────────────────────────────
  {
    id: "beetle-1",
    category: "beetle_management",
    label: { sv: "Skydda mot granbarkborren", en: "Protect against bark beetle" },
    question: {
      sv: "Hur skyddar jag min skog mot granbarkborren? Vilka förebyggande åtgärder är mest effektiva?",
      en: "How do I protect my forest against the European spruce bark beetle? What preventive measures are most effective?",
    },
  },
  {
    id: "beetle-2",
    category: "beetle_management",
    label: { sv: "Tecken på angrepp", en: "Signs of infestation" },
    question: {
      sv: "Vilka är de tidiga tecknen på ett granbarkborreangrepp och hur skiljer jag dem från andra skador?",
      en: "What are the early signs of a bark beetle attack and how do I distinguish them from other damage?",
    },
  },
  {
    id: "beetle-3",
    category: "beetle_management",
    label: { sv: "Fångstvirke", en: "Trap trees" },
    question: {
      sv: "Hur fungerar fångstvirke som metod mot barkborre? När ska det läggas ut och tas bort?",
      en: "How do trap trees work as a method against bark beetle? When should they be deployed and removed?",
    },
  },
  {
    id: "beetle-4",
    category: "beetle_management",
    label: { sv: "Svärmningsperiod", en: "Swarming period" },
    question: {
      sv: "När svärmar granbarkborren i min region och hur påverkar temperaturen svärmningen?",
      en: "When does the bark beetle swarm in my region and how does temperature affect swarming?",
    },
  },

  // ── Forest Health (4 prompts) ──────────────────────────────────────────
  {
    id: "health-1",
    category: "forest_health",
    label: { sv: "Tolka NDVI-resultat", en: "Interpret NDVI results" },
    question: {
      sv: "Kan du förklara mina senaste NDVI-resultat och vad de betyder för skogens hälsa?",
      en: "Can you explain my latest NDVI results and what they mean for my forest's health?",
    },
  },
  {
    id: "health-2",
    category: "forest_health",
    label: { sv: "Drönardataanalys", en: "Drone data analysis" },
    question: {
      sv: "Vad kan man se i en drönarinventering som man inte ser från marken? Hur ofta bör jag flyga?",
      en: "What can you see in a drone survey that you can't see from the ground? How often should I fly?",
    },
  },
  {
    id: "health-3",
    category: "forest_health",
    label: { sv: "Stormskador", en: "Storm damage" },
    question: {
      sv: "Vi har haft stormar nyligen. Hur prioriterar jag uppröjning och vilka risker innebär stormskadad skog?",
      en: "We've had storms recently. How should I prioritize cleanup and what risks does storm-damaged forest pose?",
    },
  },
  {
    id: "health-4",
    category: "forest_health",
    label: { sv: "Röta i granen", en: "Root rot in spruce" },
    question: {
      sv: "Hur allvarligt är rotröta i min granskog och vilka åtgärder kan jag vidta?",
      en: "How serious is root rot in my spruce forest and what measures can I take?",
    },
  },

  // ── Timber Market (3 prompts) ──────────────────────────────────────────
  {
    id: "timber-1",
    category: "timber_market",
    label: { sv: "Aktuella virkespriser", en: "Current timber prices" },
    question: {
      sv: "Vad är de aktuella virkespriserna för gran och tall i min region? Är det bra läge att sälja?",
      en: "What are the current timber prices for spruce and pine in my region? Is it a good time to sell?",
    },
  },
  {
    id: "timber-2",
    category: "timber_market",
    label: { sv: "Värdera min skog", en: "Value my forest" },
    question: {
      sv: "Kan du uppskatta virkesförrådet och marknadsvärdet för mina skiften baserat på BeetleSense-data?",
      en: "Can you estimate the standing volume and market value for my parcels based on BeetleSense data?",
    },
  },
  {
    id: "timber-3",
    category: "timber_market",
    label: { sv: "Bästa säljtidpunkt", en: "Best time to sell" },
    question: {
      sv: "När under året är det bäst att avverka och leverera virke med tanke på pris och barkborre?",
      en: "When during the year is the best time to harvest and deliver timber considering price and bark beetle?",
    },
  },

  // ── Legal & Regulations (3 prompts) ────────────────────────────────────
  {
    id: "legal-1",
    category: "legal",
    label: { sv: "Avverkningsanmälan", en: "Felling notification" },
    question: {
      sv: "När behöver jag skicka in avverkningsanmälan till Skogsstyrelsen och vad ska den innehålla?",
      en: "When do I need to submit a felling notification to Skogsstyrelsen and what should it contain?",
    },
  },
  {
    id: "legal-2",
    category: "legal",
    label: { sv: "FSC-certifiering", en: "FSC certification" },
    question: {
      sv: "Vad innebär FSC-certifiering för mig som skogsägare och är det värt det ekonomiskt?",
      en: "What does FSC certification mean for me as a forest owner and is it worth it financially?",
    },
  },
  {
    id: "legal-3",
    category: "legal",
    label: { sv: "EUDR-reglerna", en: "EUDR rules" },
    question: {
      sv: "Hur påverkar EU:s avskogningsförordning (EUDR) mig som svensk skogsägare?",
      en: "How does the EU Deforestation Regulation (EUDR) affect me as a Swedish forest owner?",
    },
  },

  // ── Operations (3 prompts) ─────────────────────────────────────────────
  {
    id: "ops-1",
    category: "operations",
    label: { sv: "Gallringskostnad", en: "Thinning cost" },
    question: {
      sv: "Vad kostar en gallring per hektar och vad kan jag förvänta mig i nettointäkt?",
      en: "What does thinning cost per hectare and what can I expect in net income?",
    },
  },
  {
    id: "ops-2",
    category: "operations",
    label: { sv: "Planteringsråd", en: "Planting advice" },
    question: {
      sv: "Vilka trädslag bör jag plantera på mitt skifte och hur många plantor per hektar?",
      en: "What tree species should I plant on my parcel and how many seedlings per hectare?",
    },
  },
  {
    id: "ops-3",
    category: "operations",
    label: { sv: "Röjningstidpunkt", en: "Pre-commercial thinning" },
    question: {
      sv: "När är det rätt tid för röjning och hur påverkar det framtida gallring och tillväxt?",
      en: "When is the right time for pre-commercial thinning and how does it affect future thinning and growth?",
    },
  },

  // ── Climate (3 prompts) ────────────────────────────────────────────────
  {
    id: "climate-1",
    category: "climate",
    label: { sv: "Klimatanpassning", en: "Climate adaptation" },
    question: {
      sv: "Hur bör jag anpassa min skogsskötsel till klimatförändringarna? Ska jag byta trädslag?",
      en: "How should I adapt my forest management to climate change? Should I switch tree species?",
    },
  },
  {
    id: "climate-2",
    category: "climate",
    label: { sv: "Torka och stress", en: "Drought and stress" },
    question: {
      sv: "Hur påverkar torka risken för barkborreangrepp och vad kan jag göra förebyggande?",
      en: "How does drought affect the risk of bark beetle attacks and what can I do preventively?",
    },
  },
  {
    id: "climate-3",
    category: "climate",
    label: { sv: "Kolkrediter", en: "Carbon credits" },
    question: {
      sv: "Kan jag tjäna pengar på kolkrediter som skogsägare i Sverige? Hur fungerar det?",
      en: "Can I earn money from carbon credits as a forest owner in Sweden? How does it work?",
    },
  },
];

/**
 * Get prompts filtered by category.
 */
export function getPromptsByCategory(category: PromptCategory): CompanionPrompt[] {
  return COMPANION_PROMPTS.filter((p) => p.category === category);
}

/**
 * Get a random selection of prompts across categories.
 */
export function getRandomPrompts(count: number = 4, _lang: "sv" | "en" = "sv"): CompanionPrompt[] {
  // Pick one from each category first, then fill randomly
  const categories = Object.keys(PROMPT_CATEGORIES) as PromptCategory[];
  const selected: CompanionPrompt[] = [];
  const shuffled = [...categories].sort(() => Math.random() - 0.5);

  for (const cat of shuffled) {
    if (selected.length >= count) break;
    const catPrompts = COMPANION_PROMPTS.filter((p) => p.category === cat);
    if (catPrompts.length > 0) {
      selected.push(catPrompts[Math.floor(Math.random() * catPrompts.length)]);
    }
  }

  return selected.slice(0, count);
}
