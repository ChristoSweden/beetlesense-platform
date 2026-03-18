export type TaskCategory =
  | 'setup'
  | 'fieldwork'
  | 'monitoring'
  | 'planning'
  | 'financial'
  | 'operations';

export interface ChecklistTask {
  id: string;
  month: number;
  title_sv: string;
  title_en: string;
  description_sv: string;
  description_en: string;
  why_sv: string;
  why_en: string;
  category: TaskCategory;
  link?: string;
  estimatedMinutes: number;
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  setup: '#4ade80',
  fieldwork: '#86efac',
  monitoring: '#fbbf24',
  planning: '#60a5fa',
  financial: '#a78bfa',
  operations: '#f97316',
};

export const CATEGORY_I18N_KEYS: Record<TaskCategory, string> = {
  setup: 'firstYear.categories.setup',
  fieldwork: 'firstYear.categories.fieldwork',
  monitoring: 'firstYear.categories.monitoring',
  planning: 'firstYear.categories.planning',
  financial: 'firstYear.categories.financial',
  operations: 'firstYear.categories.operations',
};

export const FIRST_YEAR_TASKS: ChecklistTask[] = [
  // ── Month 1 ──
  {
    id: 'fy-1-1',
    month: 1,
    title_en: 'Register your property on BeetleSense',
    title_sv: 'Registrera din fastighet på BeetleSense',
    description_en: 'Add your property ID so we can fetch satellite data, boundaries, and health scores for your forest.',
    description_sv: 'Lägg till ditt fastighets-ID så vi kan hämta satellitdata, gränser och hälsoindex för din skog.',
    why_en: 'This is the foundation of your digital forest management. Without registering, we cannot monitor your parcels or send you alerts.',
    why_sv: 'Detta är grunden för din digitala skogsförvaltning. Utan registrering kan vi inte övervaka dina skiften eller skicka varningar.',
    category: 'setup',
    link: '/owner/parcels',
    estimatedMinutes: 10,
  },
  {
    id: 'fy-1-2',
    month: 1,
    title_en: 'Locate your property boundaries',
    title_sv: 'Hitta dina fastighetsgränser',
    description_en: 'Use the interactive map to verify your parcel boundaries match the Lantmäteriet records.',
    description_sv: 'Använd den interaktiva kartan för att verifiera att dina skiftesgränser stämmer med Lantmäteriets register.',
    why_en: 'Knowing your exact boundaries prevents disputes with neighbors and ensures surveys cover the right area.',
    why_sv: 'Att känna till dina exakta gränser förhindrar tvister med grannar och säkerställer att undersökningar täcker rätt område.',
    category: 'setup',
    link: '/owner/dashboard',
    estimatedMinutes: 20,
  },
  {
    id: 'fy-1-3',
    month: 1,
    title_en: 'Get a copy of your skogsbruksplan',
    title_sv: 'Skaffa en kopia av din skogsbruksplan',
    description_en: 'Contact your local forest agency or previous owner to obtain the forest management plan for your property.',
    description_sv: 'Kontakta din lokala skogsbyrå eller tidigare ägare för att få tag på skogsbruksplanen för din fastighet.',
    why_en: 'The skogsbruksplan is the blueprint of your forest — it shows species, volumes, age classes, and planned operations. Essential for all decisions.',
    why_sv: 'Skogsbruksplanen är ritningen av din skog — den visar trädslag, volymer, åldersklasser och planerade åtgärder. Avgörande för alla beslut.',
    category: 'setup',
    estimatedMinutes: 60,
  },

  // ── Month 2 ──
  {
    id: 'fy-2-1',
    month: 2,
    title_en: 'Walk your forest boundaries',
    title_sv: 'Gå dina skogsgränser',
    description_en: 'Take a walk along your property boundaries. Note any unclear markers, fences, or encroachments.',
    description_sv: 'Ta en promenad längs dina fastighetsgränser. Notera eventuella otydliga markeringar, staket eller inkräktningar.',
    why_en: 'Physical inspection reveals things satellite data cannot — downed boundary markers, neighbor encroachments, or access issues.',
    why_sv: 'Fysisk inspektion avslöjar saker som satellitdata inte kan — fallna gränsmarkeringar, granninkräktningar eller åtkomstproblem.',
    category: 'fieldwork',
    estimatedMinutes: 120,
  },
  {
    id: 'fy-2-2',
    month: 2,
    title_en: 'Take photos of different areas',
    title_sv: 'Ta foton av olika områden',
    description_en: 'Use the capture feature to photograph representative areas of your forest — dense stands, clearings, and borders.',
    description_sv: 'Använd fångstfunktionen för att fotografera representativa områden i din skog — täta bestånd, gläntor och gränser.',
    why_en: 'Baseline photos help track changes over time. The AI can also identify species, diseases, and damage from your photos.',
    why_sv: 'Basfoton hjälper att följa förändringar över tid. AI:n kan också identifiera arter, sjukdomar och skador från dina foton.',
    category: 'fieldwork',
    link: '/owner/capture',
    estimatedMinutes: 60,
  },
  {
    id: 'fy-2-3',
    month: 2,
    title_en: 'Note any visible damage',
    title_sv: 'Notera eventuella synliga skador',
    description_en: 'Look for windthrown trees, bark beetle exit holes, fungal growths, or discolored crowns during your walk.',
    description_sv: 'Leta efter vindfällen, barkborrens utgångshål, svamptillväxt eller missfärgade kronor under din promenad.',
    why_en: 'Early detection of damage is key. Bark beetle infestations spread fast — catching them early can save entire stands.',
    why_sv: 'Tidig upptäckt av skador är avgörande. Barkborreangrepp sprider sig snabbt — att upptäcka dem tidigt kan rädda hela bestånd.',
    category: 'fieldwork',
    link: '/owner/vision',
    estimatedMinutes: 30,
  },

  // ── Month 3 ──
  {
    id: 'fy-3-1',
    month: 3,
    title_en: 'Learn about beetle monitoring',
    title_sv: 'Lär dig om barkborrövervakning',
    description_en: 'Read up on the bark beetle season calendar and understand when monitoring is most critical in your region.',
    description_sv: 'Läs på om barkborresäsongens kalender och förstå när övervakning är mest kritisk i din region.',
    why_en: 'Bark beetles (granbarkborre) are the #1 threat to Swedish spruce forests. Knowing the swarming timeline helps you act before damage occurs.',
    why_sv: 'Granbarkborren är det största hotet mot svenska granskogar. Att känna till svärmningsperioden hjälper dig agera innan skador uppstår.',
    category: 'monitoring',
    link: '/owner/calendar',
    estimatedMinutes: 30,
  },
  {
    id: 'fy-3-2',
    month: 3,
    title_en: 'Check if you have spruce-dominant areas',
    title_sv: 'Kontrollera om du har grandominerande områden',
    description_en: 'Review your skogsbruksplan or use the map to identify stands where spruce (gran) makes up more than 70% of species.',
    description_sv: 'Granska din skogsbruksplan eller använd kartan för att identifiera bestånd där gran utgör mer än 70% av arterna.',
    why_en: 'Spruce-heavy areas are most vulnerable to bark beetle attack. Knowing where they are lets you prioritize monitoring.',
    why_sv: 'Grantunga områden är mest sårbara för barkborreangrepp. Att veta var de finns låter dig prioritera övervakning.',
    category: 'monitoring',
    link: '/owner/parcels',
    estimatedMinutes: 20,
  },

  // ── Month 4 ──
  {
    id: 'fy-4-1',
    month: 4,
    title_en: 'Order a drone survey or walk-through inspection',
    title_sv: 'Beställ en drönarsökning eller besiktning',
    description_en: 'Schedule a professional drone survey through BeetleSense to get high-resolution imagery of your forest.',
    description_sv: 'Boka en professionell drönarundersökning genom BeetleSense för att få högupplösta bilder av din skog.',
    why_en: 'Drone surveys detect individual tree damage that satellites miss. Spring is ideal before full leaf-out when damage is most visible.',
    why_sv: 'Drönarundersökningar upptäcker skador på enskilda träd som satelliter missar. Våren är idealisk före full lövning när skador syns bäst.',
    category: 'monitoring',
    link: '/owner/surveys',
    estimatedMinutes: 15,
  },
  {
    id: 'fy-4-2',
    month: 4,
    title_en: 'Check for winter storm damage',
    title_sv: 'Kontrollera efter vinterstormsskador',
    description_en: 'After winter storms, inspect your forest for uprooted or broken trees that could become beetle breeding grounds.',
    description_sv: 'Efter vinterstormar, inspektera din skog efter uppryckta eller brutna träd som kan bli grogrund för barkborren.',
    why_en: 'Windthrown spruce are prime breeding material for bark beetles. Removing them before May swarming season is critical.',
    why_sv: 'Vindfällen av gran är förstklassigt yngelmaterial för barkborren. Att ta bort dem före majsvärmningen är avgörande.',
    category: 'fieldwork',
    estimatedMinutes: 90,
  },

  // ── Month 5 ──
  {
    id: 'fy-5-1',
    month: 5,
    title_en: 'Review your first BeetleSense report',
    title_sv: 'Granska din första BeetleSense-rapport',
    description_en: 'Check your dashboard for the generated health report based on satellite and drone data.',
    description_sv: 'Kontrollera din översikt för den genererade hälsorapporten baserad på satellit- och drönardata.',
    why_en: 'Your first report gives you a quantified baseline. Compare future reports against this to track improvement or deterioration.',
    why_sv: 'Din första rapport ger dig en kvantifierad baslinje. Jämför framtida rapporter mot denna för att följa förbättring eller försämring.',
    category: 'monitoring',
    link: '/owner/reports',
    estimatedMinutes: 20,
  },
  {
    id: 'fy-5-2',
    month: 5,
    title_en: 'Ask the AI Companion about any findings',
    title_sv: 'Fråga AI-assistenten om eventuella fynd',
    description_en: 'Use the AI companion to discuss your report findings, ask about risk areas, or get advice on next steps.',
    description_sv: 'Använd AI-assistenten för att diskutera dina rapportfynd, fråga om riskområden eller få råd om nästa steg.',
    why_en: 'The AI companion can explain technical findings in plain language and suggest specific actions for your situation.',
    why_sv: 'AI-assistenten kan förklara tekniska fynd på vanlig svenska och föreslå specifika åtgärder för din situation.',
    category: 'monitoring',
    estimatedMinutes: 15,
  },

  // ── Month 6 ──
  {
    id: 'fy-6-1',
    month: 6,
    title_en: 'Understand your timber value',
    title_sv: 'Förstå ditt virkesvärde',
    description_en: 'Review the timber value estimator on your dashboard to understand what your standing timber is worth.',
    description_sv: 'Granska virkesvärdestimatorn på din översikt för att förstå vad din stående skog är värd.',
    why_en: 'Knowing your timber value helps you make informed harvest decisions and understand what is at risk from pest damage.',
    why_sv: 'Att känna till ditt virkesvärde hjälper dig fatta informerade avverkningsbeslut och förstå vad som riskeras vid skadeangrepp.',
    category: 'financial',
    link: '/owner/dashboard',
    estimatedMinutes: 20,
  },
  {
    id: 'fy-6-2',
    month: 6,
    title_en: 'Meet a local forest inspector',
    title_sv: 'Träffa en lokal skogsinspektör',
    description_en: 'Connect with a Skogsstyrelsen inspector or a local forest consultant for professional guidance.',
    description_sv: 'Kontakta en Skogsstyrelsen-inspektör eller en lokal skogskonsult för professionell vägledning.',
    why_en: 'A professional can verify your skogsbruksplan, advise on operations, and help you navigate regulations.',
    why_sv: 'En professionell kan verifiera din skogsbruksplan, ge råd om åtgärder och hjälpa dig navigera regelverk.',
    category: 'planning',
    estimatedMinutes: 60,
  },

  // ── Month 7 ──
  {
    id: 'fy-7-1',
    month: 7,
    title_en: 'Plan any thinning operations',
    title_sv: 'Planera eventuella gallringsåtgärder',
    description_en: 'Based on your skogsbruksplan and reports, decide if any stands need thinning this year.',
    description_sv: 'Baserat på din skogsbruksplan och rapporter, avgör om några bestånd behöver gallras i år.',
    why_en: 'Thinning improves growth of remaining trees, reduces competition, and can lower pest risk by improving air circulation.',
    why_sv: 'Gallring förbättrar tillväxten av kvarvarande träd, minskar konkurrens och kan sänka skaderisken genom bättre luftcirkulation.',
    category: 'planning',
    estimatedMinutes: 45,
  },
  {
    id: 'fy-7-2',
    month: 7,
    title_en: 'Check road access for machinery',
    title_sv: 'Kontrollera vägåtkomst för maskiner',
    description_en: 'Verify that forest roads can handle harvester and forwarder traffic. Note any bridges, soft ground, or narrow passages.',
    description_sv: 'Verifiera att skogsbilvägar klarar skördare och skotare. Notera eventuella broar, mjuk mark eller trånga passager.',
    why_en: 'Poor road access can delay harvest by months and increase costs. Planning ahead avoids surprises.',
    why_sv: 'Dålig vägåtkomst kan fördröja avverkning med månader och öka kostnader. Att planera i förväg undviker överraskningar.',
    category: 'operations',
    estimatedMinutes: 60,
  },

  // ── Month 8 ──
  {
    id: 'fy-8-1',
    month: 8,
    title_en: 'Review summer satellite health data',
    title_sv: 'Granska sommarens satellithälsodata',
    description_en: 'Summer provides the best satellite data. Check NDVI changes and health scores for signs of stress.',
    description_sv: 'Sommaren ger bäst satellitdata. Kontrollera NDVI-förändringar och hälsoindex för tecken på stress.',
    why_en: 'Peak growing season reveals stress and damage most clearly in satellite data. This is your best window for detection.',
    why_sv: 'Högsäsongen för tillväxt avslöjar stress och skador tydligast i satellitdata. Detta är ditt bästa fönster för detektion.',
    category: 'monitoring',
    link: '/owner/reports',
    estimatedMinutes: 20,
  },
  {
    id: 'fy-8-2',
    month: 8,
    title_en: 'Document any beetle damage',
    title_sv: 'Dokumentera eventuella barkborreskador',
    description_en: 'If you find bark beetle damage, use the capture and vision tools to document it with GPS-tagged photos.',
    description_sv: 'Om du hittar barkborreskador, använd fångst- och bildsökningsverktygen för att dokumentera med GPS-taggade foton.',
    why_en: 'Documentation is essential for insurance claims, Skogsstyrelsen reporting, and tracking the spread over time.',
    why_sv: 'Dokumentation är avgörande för försäkringsärenden, rapportering till Skogsstyrelsen och att följa spridningen över tid.',
    category: 'fieldwork',
    link: '/owner/capture',
    estimatedMinutes: 45,
  },

  // ── Month 9 ──
  {
    id: 'fy-9-1',
    month: 9,
    title_en: 'Plan autumn operations',
    title_sv: 'Planera höstens åtgärder',
    description_en: 'Autumn is ideal for many forestry operations. Plan what needs to happen before the ground freezes.',
    description_sv: 'Hösten är idealisk för många skogsbruksåtgärder. Planera vad som behöver ske innan marken fryser.',
    why_en: 'Ground conditions in autumn are often good for machinery. Planning now ensures contractors are available.',
    why_sv: 'Markförhållandena på hösten är ofta bra för maskiner. Att planera nu säkerställer att entreprenörer är tillgängliga.',
    category: 'planning',
    estimatedMinutes: 30,
  },
  {
    id: 'fy-9-2',
    month: 9,
    title_en: 'Get quotes from contractors',
    title_sv: 'Begär offerter från entreprenörer',
    description_en: 'If you plan any harvest or thinning, contact 2-3 forestry contractors for competitive quotes.',
    description_sv: 'Om du planerar avverkning eller gallring, kontakta 2-3 skogsentreprenörer för konkurrenskraftiga offerter.',
    why_en: 'Prices vary significantly between contractors. Getting multiple quotes ensures fair pricing and good service.',
    why_sv: 'Priserna varierar betydligt mellan entreprenörer. Att begära flera offerter säkerställer rimligt pris och bra service.',
    category: 'operations',
    estimatedMinutes: 60,
  },

  // ── Month 10 ──
  {
    id: 'fy-10-1',
    month: 10,
    title_en: 'File avverkningsanmälan if needed',
    title_sv: 'Lämna avverkningsanmälan om det behövs',
    description_en: 'If you plan to harvest more than 0.5 ha, you must file a notification with Skogsstyrelsen at least 6 weeks before.',
    description_sv: 'Om du planerar att avverka mer än 0,5 ha måste du lämna anmälan till Skogsstyrelsen minst 6 veckor innan.',
    why_en: 'This is a legal requirement. Failing to file can result in fines and stop-orders on your operation.',
    why_sv: 'Detta är ett lagkrav. Att inte anmäla kan resultera i böter och stopporder på din åtgärd.',
    category: 'operations',
    estimatedMinutes: 30,
  },
  {
    id: 'fy-10-2',
    month: 10,
    title_en: 'Start harvest if planned',
    title_sv: 'Påbörja avverkning om planerad',
    description_en: 'If conditions allow and notifications are approved, begin harvest operations with your chosen contractor.',
    description_sv: 'Om förhållandena tillåter och anmälningar är godkända, påbörja avverkning med din valda entreprenör.',
    why_en: 'Autumn harvest on frozen or dry ground minimizes soil damage and protects water quality.',
    why_sv: 'Höstavverkning på frusen eller torr mark minimerar markskador och skyddar vattenkvaliteten.',
    category: 'operations',
    estimatedMinutes: 30,
  },

  // ── Month 11 ──
  {
    id: 'fy-11-1',
    month: 11,
    title_en: 'Year-end financial review',
    title_sv: 'Årsbokslut och ekonomisk genomgång',
    description_en: 'Review income from timber sales, costs for operations, and any forestry subsidies you are eligible for.',
    description_sv: 'Granska intäkter från virkesförsäljning, kostnader för åtgärder och eventuella skogsbidrag du har rätt till.',
    why_en: 'Forestry has unique tax rules in Sweden. A proper review ensures you do not miss deductions or subsidies.',
    why_sv: 'Skogsbruk har unika skatteregler i Sverige. En ordentlig genomgång säkerställer att du inte missar avdrag eller bidrag.',
    category: 'financial',
    estimatedMinutes: 60,
  },
  {
    id: 'fy-11-2',
    month: 11,
    title_en: 'Understand skogskonto tax benefits',
    title_sv: 'Förstå skogskontots skattefördelar',
    description_en: 'Learn how skogskonto lets you spread timber income over multiple years to reduce your tax burden.',
    description_sv: 'Lär dig hur skogskontot låter dig sprida virkesintäkter över flera år för att minska din skattebörda.',
    why_en: 'Skogskonto can defer up to 60% of timber income. This is one of the biggest financial advantages of forest ownership in Sweden.',
    why_sv: 'Skogskontot kan skjuta upp till 60% av virkesintäkterna. Detta är en av de största ekonomiska fördelarna med skogsägande i Sverige.',
    category: 'financial',
    estimatedMinutes: 30,
  },

  // ── Month 12 ──
  {
    id: 'fy-12-1',
    month: 12,
    title_en: 'Set goals for next year',
    title_sv: 'Sätt mål för nästa år',
    description_en: 'Based on everything you learned, write down 3-5 goals for your second year of forest ownership.',
    description_sv: 'Baserat på allt du lärt dig, skriv ner 3-5 mål för ditt andra år som skogsägare.',
    why_en: 'Intentional goal-setting transforms you from a passive owner into an active forest manager.',
    why_sv: 'Medvetna målsättningar förvandlar dig från en passiv ägare till en aktiv skogsförvaltare.',
    category: 'planning',
    estimatedMinutes: 30,
  },
  {
    id: 'fy-12-2',
    month: 12,
    title_en: "Review your forest's yearly health trend",
    title_sv: 'Granska din skogs årliga hälsotrend',
    description_en: 'Compare your current health score with the baseline from month 1. Celebrate improvements and note areas to watch.',
    description_sv: 'Jämför ditt nuvarande hälsoindex med baslinjen från månad 1. Fira förbättringar och notera områden att bevaka.',
    why_en: 'Seeing the full year trend validates your efforts and highlights where to focus in year two.',
    why_sv: 'Att se hela årets trend bekräftar dina insatser och pekar ut var du ska fokusera under år två.',
    category: 'monitoring',
    link: '/owner/reports',
    estimatedMinutes: 15,
  },
];

export function getTasksForMonth(month: number): ChecklistTask[] {
  return FIRST_YEAR_TASKS.filter((t) => t.month === month);
}

export function getTotalTaskCount(): number {
  return FIRST_YEAR_TASKS.length;
}
