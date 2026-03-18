// ─── Forestry Calendar Data ───
// Complete 12-month Swedish forestry activity calendar.
// Sources: Skogsstyrelsen recommendations, SLU research, Skogforsk guidelines.

export type ActivityCategory =
  | 'beetle_monitoring'
  | 'harvest'
  | 'planting'
  | 'thinning'
  | 'road_maintenance'
  | 'inventory';

export type UrgencyLevel = 'high' | 'medium' | 'low';

export type SwedishRegion = 'south' | 'central' | 'north';

export interface ForestryActivity {
  id: string;
  month: number; // 1-12
  title_sv: string;
  title_en: string;
  description_sv: string;
  description_en: string;
  category: ActivityCategory;
  urgency: UrgencyLevel;
  regions: SwedishRegion[];
  /** Optional research citation or reference */
  reference?: string;
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  beetle_monitoring: '#ef4444', // red
  harvest: '#f59e0b',          // amber
  planting: '#22c55e',         // green
  thinning: '#3b82f6',         // blue
  road_maintenance: '#6b7280', // gray
  inventory: '#a855f7',        // purple
};

export const CATEGORY_I18N_KEYS: Record<ActivityCategory, string> = {
  beetle_monitoring: 'calendar.categories.beetleMonitoring',
  harvest: 'calendar.categories.harvest',
  planting: 'calendar.categories.planting',
  thinning: 'calendar.categories.thinning',
  road_maintenance: 'calendar.categories.roadMaintenance',
  inventory: 'calendar.categories.inventory',
};

export const forestryActivities: ForestryActivity[] = [
  // ─── January ───
  {
    id: 'jan-winter-harvest',
    month: 1,
    title_sv: 'Vinteravverkning',
    title_en: 'Winter harvest',
    description_sv:
      'Tjälad mark ger bästa bärigheten. Avverka gran och tall med minimala markskador. Kontrollera att skotarvägar är farbara.',
    description_en:
      'Frozen ground provides the best load-bearing capacity. Harvest spruce and pine with minimal soil damage. Verify that forwarder roads are passable.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
    reference: 'Skogforsk: Markskador vid avverkning (2023)',
  },
  {
    id: 'jan-storm-inspection',
    month: 1,
    title_sv: 'Stormskadeinventering',
    title_en: 'Storm damage inspection',
    description_sv:
      'Inspektera bestånd efter vinterstormar. Vindfällen skapar grogrund för barkborrar till våren. Prioritera sanering av stormfälld gran.',
    description_en:
      'Inspect stands after winter storms. Windthrown trees create breeding grounds for bark beetles in spring. Prioritize salvage of storm-felled spruce.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
    reference: 'Skogsstyrelsen: Stormskadat virke och barkborrar',
  },
  {
    id: 'jan-year-planning',
    month: 1,
    title_sv: 'Årsplanering',
    title_en: 'Annual planning',
    description_sv:
      'Planera årets skogsbruksåtgärder: avverkning, gallring, plantering och vägunderhåll. Granska skogsbruksplanen.',
    description_en:
      'Plan the year\'s forestry operations: harvesting, thinning, planting, and road maintenance. Review the forestry management plan.',
    category: 'inventory',
    urgency: 'low',
    regions: ['south', 'central', 'north'],
  },

  // ─── February ───
  {
    id: 'feb-winter-harvest',
    month: 2,
    title_sv: 'Vinteravverkning fortsätter',
    title_en: 'Winter harvest continues',
    description_sv:
      'Fortsätt avverkning medan marken är frusen. Februari är ofta den bästa månaden för avverkning i norra Sverige.',
    description_en:
      'Continue harvesting while ground remains frozen. February is often the best month for harvesting in northern Sweden.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'feb-planting-plan',
    month: 2,
    title_sv: 'Planera vårplantering',
    title_en: 'Plan spring planting',
    description_sv:
      'Beställ plantor från plantskola. Kontrollera att rätt proveniens beställs för ditt område. Plantorna ska levereras i april-maj.',
    description_en:
      'Order seedlings from the nursery. Ensure the correct provenance is ordered for your area. Seedlings should be delivered in April-May.',
    category: 'planting',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'feb-windthrow-salvage',
    month: 2,
    title_sv: 'Vindfällesanering',
    title_en: 'Windthrow salvage',
    description_sv:
      'Sanera stormfälld skog före barkborresäsongen. Virke som ligger kvar i skogen till april riskerar att bli yngelträd.',
    description_en:
      'Salvage storm-felled timber before bark beetle season. Timber left in the forest until April risks becoming breeding material.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
    reference: 'SLU: Barkborreprevention genom sanering',
  },

  // ─── March ───
  {
    id: 'mar-trap-deployment',
    month: 3,
    title_sv: 'Barkborrefällor sätts ut',
    title_en: 'Beetle trap deployment begins',
    description_sv:
      'Sätt ut feromonfällor i slutet av mars (södra Sverige). Fällorna ska vara på plats innan svärmningen startar i april. Placera vid solexponerade beståndskanter.',
    description_en:
      'Deploy pheromone traps in late March (southern Sweden). Traps must be in place before swarming starts in April. Place at sun-exposed stand edges.',
    category: 'beetle_monitoring',
    urgency: 'high',
    regions: ['south', 'central'],
    reference: 'Skogsstyrelsen: Barkborren — åtgärder och övervakning',
  },
  {
    id: 'mar-survey-planning',
    month: 3,
    title_sv: 'Planera vårens inventeringar',
    title_en: 'Pre-season survey planning',
    description_sv:
      'Boka drönare för NDVI-övervakning som startar i april. Planera flygvägar och prioritera riskområden baserat på fjolårets data.',
    description_en:
      'Book drones for NDVI monitoring starting in April. Plan flight paths and prioritize risk areas based on last year\'s data.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'mar-final-harvest',
    month: 3,
    title_sv: 'Sista vinteravverkning',
    title_en: 'Final winter harvest window',
    description_sv:
      'Avsluta markberoende avverkningar innan tjälen går ur marken. I södra Sverige kan marken bli mjuk redan i mars.',
    description_en:
      'Complete ground-dependent harvesting before frost leaves the soil. In southern Sweden, the ground can become soft as early as March.',
    category: 'harvest',
    urgency: 'medium',
    regions: ['south', 'central'],
  },

  // ─── April ───
  {
    id: 'apr-beetle-swarming',
    month: 4,
    title_sv: 'Barkborrens svärmning börjar',
    title_en: 'Beetle swarming starts',
    description_sv:
      'Granbarkborren börjar svärma i södra Sverige när temperaturen överstiger 18°C. Övervaka fällor och inspektera riskbestånd. Tidig upptäckt är avgörande.',
    description_en:
      'Bark beetles begin swarming in southern Sweden when temperatures exceed 18°C. Monitor traps and inspect at-risk stands. Early detection is critical.',
    category: 'beetle_monitoring',
    urgency: 'high',
    regions: ['south'],
    reference: 'SLU: Granbarkborrens biologi och övervakning (Långström et al.)',
  },
  {
    id: 'apr-spring-planting',
    month: 4,
    title_sv: 'Vårplantering startar',
    title_en: 'Spring planting begins',
    description_sv:
      'Plantera barrotsplantor när marken har tinat. I södra Sverige startar planteringen i mitten av april. Markberedda ytor först.',
    description_en:
      'Plant bare-root seedlings when the ground has thawed. In southern Sweden, planting starts mid-April. Scarified areas first.',
    category: 'planting',
    urgency: 'high',
    regions: ['south', 'central'],
  },
  {
    id: 'apr-ndvi-start',
    month: 4,
    title_sv: 'NDVI-övervakning startar',
    title_en: 'NDVI monitoring starts',
    description_sv:
      'Satellitbaserad NDVI-övervakning börjar ge meningsfulla data när vegetationsperioden startar. Jämför med baslinjedata från föregående år.',
    description_en:
      'Satellite-based NDVI monitoring starts providing meaningful data as the growing season begins. Compare with baseline data from previous years.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },

  // ─── May ───
  {
    id: 'may-peak-swarming',
    month: 5,
    title_sv: 'Högsäsong barkborresvärmning',
    title_en: 'Peak beetle swarming',
    description_sv:
      'Högsäsong för granbarkborrens svärmning i hela södra och mellersta Sverige. Inspektera granbestånd veckovis. Leta efter brunt borrmjöl vid stambasen.',
    description_en:
      'Peak swarming season for bark beetles across southern and central Sweden. Inspect spruce stands weekly. Look for brown bore dust at the stem base.',
    category: 'beetle_monitoring',
    urgency: 'high',
    regions: ['south', 'central'],
    reference: 'Skogsstyrelsen: Granbarkborrens svärmperioder 2020-2025',
  },
  {
    id: 'may-planting-continues',
    month: 5,
    title_sv: 'Plantering fortsätter',
    title_en: 'Planting continues',
    description_sv:
      'Fortsätt plantering med täckrotsplantor. I norra Sverige startar planteringen i maj. Undvik plantering vid frost.',
    description_en:
      'Continue planting with containerized seedlings. In northern Sweden, planting starts in May. Avoid planting during frost events.',
    category: 'planting',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'may-drone-surveys',
    month: 5,
    title_sv: 'Första drönarflygningar',
    title_en: 'First drone surveys',
    description_sv:
      'Genomför drönarflygningar över prioriterade bestånd. RGB- och multispektralbilder ger tidig detektering av stressade träd.',
    description_en:
      'Conduct drone flights over priority stands. RGB and multispectral imagery enables early detection of stressed trees.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },

  // ─── June ───
  {
    id: 'jun-damage-inspection',
    month: 6,
    title_sv: 'Barkborreskadeinventering',
    title_en: 'Beetle damage inspection',
    description_sv:
      'Inventera bestånd för att upptäcka angrepp från vårens svärmning. Angripna träd visar gulnande kronor. Markera och avverka angripna träd snabbt.',
    description_en:
      'Survey stands to detect attacks from spring swarming. Infested trees show yellowing crowns. Mark and fell infested trees promptly.',
    category: 'beetle_monitoring',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'jun-second-gen-risk',
    month: 6,
    title_sv: 'Riskbedömning andragenerations-angrepp',
    title_en: 'Second generation risk assessment',
    description_sv:
      'Vid varma somrar kan barkborren producera en andra generation. Bedöm risken baserat på temperaturdata och populationsnivåer.',
    description_en:
      'During warm summers, bark beetles can produce a second generation. Assess risk based on temperature data and population levels.',
    category: 'beetle_monitoring',
    urgency: 'medium',
    regions: ['south', 'central'],
    reference: 'SLU: Dubbelgenerationer av granbarkborre i ett förändrat klimat',
  },
  {
    id: 'jun-road-maintenance-start',
    month: 6,
    title_sv: 'Vägunderhåll börjar',
    title_en: 'Road maintenance begins',
    description_sv:
      'Inspektera och reparera skogsbilvägar efter vårens tjällossning. Grusa, dika och röj sikthindrande vegetation.',
    description_en:
      'Inspect and repair forest roads after spring thaw. Gravel, ditch, and clear sight-obstructing vegetation.',
    category: 'road_maintenance',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },

  // ─── July ───
  {
    id: 'jul-summer-monitoring',
    month: 7,
    title_sv: 'Sommarövervaning',
    title_en: 'Summer monitoring',
    description_sv:
      'Fortsätt övervakning av barkborreangrepp. Var extra vaksam vid torkstress — det ökar trädets sårbarhet. Kontrollera feromonfällor regelbundet.',
    description_en:
      'Continue monitoring for bark beetle attacks. Be extra vigilant during drought stress — it increases tree vulnerability. Check pheromone traps regularly.',
    category: 'beetle_monitoring',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'jul-road-maintenance',
    month: 7,
    title_sv: 'Vägunderhåll',
    title_en: 'Forest road maintenance',
    description_sv:
      'Fortsätt vägunderhåll. Sommarens torra väder ger bra förutsättningar för grusning och dikesrensning.',
    description_en:
      'Continue road maintenance. Summer dry weather provides good conditions for graveling and ditch clearing.',
    category: 'road_maintenance',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'jul-drought-assessment',
    month: 7,
    title_sv: 'Torkstressbedömning',
    title_en: 'Drought stress assessment',
    description_sv:
      'Utvärdera torkstress via NDVI-analys och fältbesök. Torkstressade granar lockar barkborrar via kemiska signaler.',
    description_en:
      'Evaluate drought stress via NDVI analysis and field visits. Drought-stressed spruce attracts bark beetles through chemical signals.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central'],
    reference: 'SLU: Torkstress och barkborreattacker (Netherer & Pennerstorfer)',
  },

  // ─── August ───
  {
    id: 'aug-late-beetle-check',
    month: 8,
    title_sv: 'Sent sommarbarkborrekontroll',
    title_en: 'Late summer beetle check',
    description_sv:
      'Kontrollera om andragenerationens svärmning har inträffat. Inventera kronor för tidiga tecken på angrepp (grå/gula kronor).',
    description_en:
      'Check if second-generation swarming has occurred. Survey crowns for early signs of attack (gray/yellow crowns).',
    category: 'beetle_monitoring',
    urgency: 'high',
    regions: ['south', 'central'],
  },
  {
    id: 'aug-harvest-planning',
    month: 8,
    title_sv: 'Planera höstavverkning',
    title_en: 'Harvest planning for autumn',
    description_sv:
      'Planera höstens avverkning. Identifiera bestånd som behöver gallras eller slutavverkas. Kontrollera avverkningsanmälningar.',
    description_en:
      'Plan autumn harvesting. Identify stands needing thinning or final felling. Verify harvest notifications are filed.',
    category: 'harvest',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'aug-road-finish',
    month: 8,
    title_sv: 'Avsluta vägunderhåll',
    title_en: 'Complete road maintenance',
    description_sv:
      'Slutför sommarens vägunderhåll innan höstregnen kommer. Kontrollera att vägarna tål höstens transporter.',
    description_en:
      'Complete summer road maintenance before autumn rains arrive. Verify that roads can handle autumn transport loads.',
    category: 'road_maintenance',
    urgency: 'low',
    regions: ['south', 'central', 'north'],
  },

  // ─── September ───
  {
    id: 'sep-thinning-start',
    month: 9,
    title_sv: 'Höstgallring börjar',
    title_en: 'Autumn thinning begins',
    description_sv:
      'Börja gallring i lövdominerade och blandbestånd. Marken börjar torka upp efter sommaren. Gallra enligt skogsbruksplanen.',
    description_en:
      'Begin thinning in deciduous and mixed stands. The ground starts drying out after summer. Thin according to the forest management plan.',
    category: 'thinning',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'sep-beetle-season-end',
    month: 9,
    title_sv: 'Barkborresäsongen avslutas',
    title_en: 'Beetle season winds down',
    description_sv:
      'Svärmningen avtar. Gör en slutinventering av årets angrepp. Dokumentera angreppsomfånget för planering av nästa säsong.',
    description_en:
      'Swarming subsides. Conduct a final inventory of this year\'s attacks. Document the extent of damage for planning next season.',
    category: 'beetle_monitoring',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'sep-autumn-inventory',
    month: 9,
    title_sv: 'Höstinventering',
    title_en: 'Autumn inventory',
    description_sv:
      'Inventera bestånd med drönarflygningar. Analysera vegetationsindex och bedöm skogstillståndet inför vintern.',
    description_en:
      'Inventory stands with drone flights. Analyze vegetation indices and assess forest condition ahead of winter.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },

  // ─── October ───
  {
    id: 'oct-harvest-season',
    month: 10,
    title_sv: 'Huvudavverkningssäsongen startar',
    title_en: 'Main harvest season starts',
    description_sv:
      'Marken börjar frysa och bärigheten ökar. Starta slutavverkning och gallring. Prioritera bestånd med barkborreskador.',
    description_en:
      'Ground begins to freeze and bearing capacity increases. Start final felling and thinning. Prioritize stands with bark beetle damage.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'oct-thinning-continues',
    month: 10,
    title_sv: 'Gallring fortsätter',
    title_en: 'Thinning continues',
    description_sv:
      'Fortsätt gallring. Oktober ger ofta bra förhållanden med fast mark och lagom temperatur.',
    description_en:
      'Continue thinning operations. October often provides good conditions with firm ground and moderate temperatures.',
    category: 'thinning',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'oct-inventory-surveys',
    month: 10,
    title_sv: 'Beståndsuppskattning',
    title_en: 'Inventory surveys',
    description_sv:
      'Genomför beståndsuppskattningar för virkesvolym och tillväxt. Uppdatera skogsbruksplanen med årets observationer.',
    description_en:
      'Conduct stand volume and growth estimates. Update the forest management plan with this year\'s observations.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },

  // ─── November ───
  {
    id: 'nov-harvest-continues',
    month: 11,
    title_sv: 'Avverkning fortsätter',
    title_en: 'Harvest continues',
    description_sv:
      'Avverkningen fortsätter med allt bättre markförhållanden. Avverka stormskadad och barkborreangripen skog i första hand.',
    description_en:
      'Harvesting continues with improving ground conditions. Prioritize felling storm-damaged and beetle-infested timber.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'nov-storm-prep',
    month: 11,
    title_sv: 'Stormförberedelser',
    title_en: 'Storm preparation',
    description_sv:
      'Inspektera beståndskanter och nygallrade bestånd. Dessa är extra känsliga för höststormar. Överväg kantzon-åtgärder.',
    description_en:
      'Inspect stand edges and recently thinned stands. These are especially vulnerable to autumn storms. Consider edge zone measures.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'nov-thinning-end',
    month: 11,
    title_sv: 'Gallringssäsongen avslutas',
    title_en: 'Thinning season ends',
    description_sv:
      'Avsluta pågående gallringsarbeten. I norra Sverige kan gallring vara svår att genomföra efter november på grund av snö.',
    description_en:
      'Complete ongoing thinning operations. In northern Sweden, thinning can be difficult after November due to snow.',
    category: 'thinning',
    urgency: 'low',
    regions: ['south', 'central', 'north'],
  },

  // ─── December ───
  {
    id: 'dec-winter-harvest',
    month: 12,
    title_sv: 'Vinteravverkning',
    title_en: 'Winter harvest',
    description_sv:
      'Vinteravverkning på frusen mark. Idealiska förhållanden i norra och mellersta Sverige. Fokusera på slutavverkning.',
    description_en:
      'Winter harvesting on frozen ground. Ideal conditions in northern and central Sweden. Focus on final felling.',
    category: 'harvest',
    urgency: 'high',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'dec-year-end-reporting',
    month: 12,
    title_sv: 'Årsbokslutsrapportering',
    title_en: 'Year-end reporting',
    description_sv:
      'Sammanställ årets skogsbruksaktiviteter. Rapportera avverkade volymer. Förbered deklaration för skogsintäkter.',
    description_en:
      'Compile the year\'s forestry activities. Report harvested volumes. Prepare tax declarations for forestry income.',
    category: 'inventory',
    urgency: 'medium',
    regions: ['south', 'central', 'north'],
  },
  {
    id: 'dec-next-year-plan',
    month: 12,
    title_sv: 'Planera nästa år',
    title_en: 'Plan next year',
    description_sv:
      'Börja planera nästa års skogsbruk. Uppdatera skogsbruksplanen, boka entreprenörer och beställ plantor.',
    description_en:
      'Begin planning next year\'s forestry. Update the management plan, book contractors, and order seedlings.',
    category: 'inventory',
    urgency: 'low',
    regions: ['south', 'central', 'north'],
  },
];

/** Get activities for a given month */
export function getActivitiesByMonth(month: number): ForestryActivity[] {
  return forestryActivities.filter((a) => a.month === month);
}

/** Get activities for a given month filtered by region */
export function getActivitiesByMonthAndRegion(
  month: number,
  region?: SwedishRegion,
): ForestryActivity[] {
  return forestryActivities.filter(
    (a) => a.month === month && (!region || a.regions.includes(region)),
  );
}

/** Get the top N most urgent activities for a given month */
export function getUrgentActivities(
  month: number,
  region?: SwedishRegion,
  limit = 3,
): ForestryActivity[] {
  const urgencyOrder: Record<UrgencyLevel, number> = { high: 0, medium: 1, low: 2 };
  return getActivitiesByMonthAndRegion(month, region)
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, limit);
}

/** Month names keyed by number for i18n lookup */
export const MONTH_I18N_KEYS: Record<number, string> = {
  1: 'calendar.months.january',
  2: 'calendar.months.february',
  3: 'calendar.months.march',
  4: 'calendar.months.april',
  5: 'calendar.months.may',
  6: 'calendar.months.june',
  7: 'calendar.months.july',
  8: 'calendar.months.august',
  9: 'calendar.months.september',
  10: 'calendar.months.october',
  11: 'calendar.months.november',
  12: 'calendar.months.december',
};
