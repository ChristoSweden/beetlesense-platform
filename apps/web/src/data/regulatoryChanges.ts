// ─── Regulatory Changes Demo Data ───
// Personalized feed of regulation changes affecting Swedish forestry

export type ImpactSeverity = 'high' | 'medium' | 'low' | 'informational';

export type RegulatoryCategory =
  | 'felling_rules'
  | 'environmental_protection'
  | 'tax_finance'
  | 'eu_directives'
  | 'biodiversity'
  | 'climate';

export type RegulatorySource =
  | 'Skogsstyrelsen'
  | 'Riksdag'
  | 'EU'
  | 'Skatteverket'
  | 'Naturvårdsverket'
  | 'Länsstyrelsen'
  | 'Riksantikvarieämbetet'
  | 'Transportstyrelsen'
  | 'PEFC'
  | 'FSC';

export type RegulatoryScope = 'national' | 'eu' | 'regional';

export interface RequiredAction {
  id: string;
  text_en: string;
  text_sv: string;
  deadline: string | null; // ISO date
  completed: boolean;
}

export interface AffectedParcel {
  parcelId: string;
  parcelName: string;
  reason_en: string;
  reason_sv: string;
}

export interface BeforeAfter {
  label_en: string;
  label_sv: string;
  before: string;
  after: string;
}

export interface RegulatoryChange {
  id: string;
  title_en: string;
  title_sv: string;
  summary_en: string;
  summary_sv: string;
  details_en: string;
  details_sv: string;
  howAffectsYou_en: string;
  howAffectsYou_sv: string;
  effectiveDate: string; // ISO date
  publishedDate: string; // ISO date
  source: RegulatorySource;
  scope: RegulatoryScope;
  severity: ImpactSeverity;
  categories: RegulatoryCategory[];
  sourceUrl: string;
  affectedParcels: AffectedParcel[];
  requiredActions: RequiredAction[];
  beforeAfter: BeforeAfter[];
  financialImpact: { estimate_en: string; estimate_sv: string } | null;
  complianceDeadline: string | null; // ISO date
  isRead: boolean;
}

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().slice(0, 10);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);

export const REGULATORY_CHANGES: RegulatoryChange[] = [
  {
    id: 'rc-01',
    title_en: 'EU Deforestation Regulation (EUDR) — Full Enforcement',
    title_sv: 'EU:s avskogningsförordning (EUDR) — fullständig tillämpning',
    summary_en: 'The EU Deforestation Regulation requires proof that timber and wood products are not linked to deforestation. Due diligence and geolocation documentation are now mandatory for all timber exports.',
    summary_sv: 'EU:s avskogningsförordning kräver bevis på att virke och träprodukter inte är kopplade till avskogning. Due diligence och geolokaliseringsdokumentation är nu obligatoriskt för all virkesexport.',
    details_en: 'Regulation (EU) 2023/1115 entered full application on 30 December 2024. All operators and traders placing timber on the EU market must submit due diligence statements through the EU Information System. Small and medium operators have until 30 June 2025 for full compliance. The regulation requires geolocation coordinates for all harvest plots, proof of legality, and deforestation-free status verified against a 31 December 2020 cut-off date.',
    details_sv: 'Förordning (EU) 2023/1115 trädde i full tillämpning den 30 december 2024. Alla operatörer och handlare som släpper ut virke på EU-marknaden måste lämna in due diligence-utlåtanden via EU:s informationssystem. Små och medelstora operatörer har till 30 juni 2025 för full efterlevnad. Förordningen kräver geolokaliseringskoordinater för alla avverkningsområden, bevis på laglighet och avskogningsfri status verifierad mot ett brytdatum den 31 december 2020.',
    howAffectsYou_en: 'Your parcels Norra Skogen and Granudden have active timber harvest plans. You must register geolocation data and submit due diligence statements before selling harvested timber. BeetleSense can auto-generate the required coordinates from your parcel data.',
    howAffectsYou_sv: 'Dina skiften Norra Skogen och Granudden har aktiva avverkningsplaner. Du måste registrera geolokaliseringsdata och lämna in due diligence-utlåtanden innan du säljer avverkat virke. BeetleSense kan automatiskt generera de nödvändiga koordinaterna från dina skiftesdata.',
    effectiveDate: '2024-12-30',
    publishedDate: daysAgo(45),
    source: 'EU',
    scope: 'eu',
    severity: 'high',
    categories: ['eu_directives', 'felling_rules'],
    sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2023/1115',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Active harvest plan with planned timber export', reason_sv: 'Aktiv avverkningsplan med planerad virkesexport' },
      { parcelId: 'p4', parcelName: 'Granudden', reason_en: 'Sanitation felling timber designated for export', reason_sv: 'Sanitetsavverkningsvirke avsett för export' },
    ],
    requiredActions: [
      { id: 'a01-1', text_en: 'Register in EU EUDR Information System', text_sv: 'Registrera dig i EU:s EUDR-informationssystem', deadline: daysFromNow(30), completed: false },
      { id: 'a01-2', text_en: 'Prepare geolocation data for all harvest areas', text_sv: 'Förbered geolokaliseringsdata för alla avverkningsområden', deadline: daysFromNow(30), completed: false },
      { id: 'a01-3', text_en: 'Submit due diligence statement before timber sale', text_sv: 'Lämna in due diligence-utlåtande före virkesförsäljning', deadline: null, completed: false },
    ],
    beforeAfter: [
      { label_en: 'Timber sale documentation', label_sv: 'Dokumentation vid virkesförsäljning', before: 'Invoice + transport document', after: 'Invoice + DDS + geolocation + legality proof' },
    ],
    financialImpact: { estimate_en: 'Administrative cost: ~2,000-5,000 SEK per harvest operation', estimate_sv: 'Administrativ kostnad: ~2 000-5 000 SEK per avverkningsoperation' },
    complianceDeadline: '2025-06-30',
    isRead: false,
  },
  {
    id: 'rc-02',
    title_en: 'Updated Skogsvårdslagen §10 — Increased Retention Tree Requirements',
    title_sv: 'Uppdaterad Skogsvårdslagen §10 — höjda krav på naturvårdsträd',
    summary_en: 'The Swedish Forestry Act has been amended to increase the minimum number of retention trees (naturvårdsträd) that must be left standing after final felling. The new requirement is 10 trees per hectare, up from the previous guideline of 5-7.',
    summary_sv: 'Skogsvårdslagen har ändrats för att öka minimiantal naturvårdsträd som måste lämnas kvar efter föryngringsavverkning. Det nya kravet är 10 träd per hektar, upp från tidigare riktlinjer på 5-7.',
    details_en: 'The amendment to Skogsvårdslagen §10 strengthens the requirements for biological diversity during final felling operations. Forest owners must now retain at least 10 living trees per hectare as naturvårdsträd, prioritizing old-growth trees, trees with cavities, and broadleaf species. Dead standing trees (högstubbar) are counted separately. Skogsstyrelsen will update their guidance documents accordingly.',
    details_sv: 'Ändringen av Skogsvårdslagen §10 stärker kraven på biologisk mångfald vid föryngringsavverkning. Skogsägare måste nu lämna kvar minst 10 levande träd per hektar som naturvårdsträd, med prioritering av gamla träd, hålträd och lövträd. Döda stående träd (högstubbar) räknas separat. Skogsstyrelsen kommer att uppdatera sina vägledningsdokument.',
    howAffectsYou_en: 'Your planned felling at Norra Skogen (8.5 ha) must now retain at least 85 trees instead of the ~50 you previously planned. Update your avverkningsanmälan accordingly.',
    howAffectsYou_sv: 'Din planerade avverkning vid Norra Skogen (8,5 ha) måste nu lämna kvar minst 85 träd istället för de ~50 du tidigare planerat. Uppdatera din avverkningsanmälan därefter.',
    effectiveDate: '2025-07-01',
    publishedDate: daysAgo(14),
    source: 'Riksdag',
    scope: 'national',
    severity: 'high',
    categories: ['felling_rules', 'biodiversity'],
    sourceUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Active felling notification — must update retention plan', reason_sv: 'Aktiv avverkningsanmälan — måste uppdatera naturvårdsplan' },
      { parcelId: 'p3', parcelName: 'Tallmon', reason_en: 'Planned final felling within 12 months', reason_sv: 'Planerad föryngringsavverkning inom 12 månader' },
    ],
    requiredActions: [
      { id: 'a02-1', text_en: 'Revise retention tree plan for Norra Skogen felling', text_sv: 'Revidera naturvårdsträdsplan för Norra Skogen-avverkning', deadline: '2025-07-01', completed: false },
      { id: 'a02-2', text_en: 'Identify and mark suitable retention trees before felling', text_sv: 'Identifiera och märk lämpliga naturvårdsträd innan avverkning', deadline: null, completed: false },
    ],
    beforeAfter: [
      { label_en: 'Retention trees per hectare', label_sv: 'Naturvårdsträd per hektar', before: '5-7 (guideline)', after: '10 (mandatory minimum)' },
    ],
    financialImpact: { estimate_en: 'Reduced harvest volume: ~3-5 m³sk/ha retained', estimate_sv: 'Minskad avverkningsvolym: ~3-5 m³sk/ha kvarlämnas' },
    complianceDeadline: '2025-07-01',
    isRead: false,
  },
  {
    id: 'rc-03',
    title_en: 'New Natura 2000 Buffer Zone Guidelines — Länsstyrelsen Kronoberg',
    title_sv: 'Nya riktlinjer för Natura 2000-buffertzoner — Länsstyrelsen Kronoberg',
    summary_en: 'Länsstyrelsen Kronoberg has issued updated guidelines for buffer zones around Natura 2000 sites. Forest operations within 500 meters now require mandatory consultation.',
    summary_sv: 'Länsstyrelsen Kronoberg har utfärdat uppdaterade riktlinjer för buffertzoner kring Natura 2000-områden. Skogsbruksåtgärder inom 500 meter kräver nu obligatoriskt samråd.',
    details_en: 'The County Administrative Board of Kronoberg has strengthened its interpretation of the Habitat Directive regarding Natura 2000 areas. All forestry operations (including thinning) within 500 meters of a Natura 2000 boundary now require a formal samråd (consultation) with the County Board before any work begins. The previous threshold was 200 meters for final felling only. Environmental impact assessments may be required for operations within 250 meters.',
    details_sv: 'Länsstyrelsen Kronoberg har stärkt sin tolkning av Art- och habitatdirektivet gällande Natura 2000-områden. Alla skogsbruksåtgärder (inklusive gallring) inom 500 meter från en Natura 2000-gräns kräver nu ett formellt samråd med Länsstyrelsen innan arbetet påbörjas. Den tidigare gränsen var 200 meter för enbart föryngringsavverkning. Miljökonsekvensbeskrivningar kan krävas för åtgärder inom 250 meter.',
    howAffectsYou_en: 'Your parcel Granudden is 350 meters from Natura 2000 area SE0710042. Under the new guidelines, you must consult Länsstyrelsen before any forestry operations, including the approved sanitation felling.',
    howAffectsYou_sv: 'Ditt skifte Granudden ligger 350 meter från Natura 2000-område SE0710042. Enligt de nya riktlinjerna måste du samråda med Länsstyrelsen innan skogsbruksåtgärder, inklusive den godkända sanitetsavverkningen.',
    effectiveDate: '2025-04-01',
    publishedDate: daysAgo(7),
    source: 'Länsstyrelsen',
    scope: 'regional',
    severity: 'high',
    categories: ['environmental_protection', 'biodiversity'],
    sourceUrl: 'https://www.lansstyrelsen.se/kronoberg',
    affectedParcels: [
      { parcelId: 'p4', parcelName: 'Granudden', reason_en: '350 m from Natura 2000 area SE0710042', reason_sv: '350 m från Natura 2000-område SE0710042' },
    ],
    requiredActions: [
      { id: 'a03-1', text_en: 'Submit samråd request to Länsstyrelsen Kronoberg for Granudden operations', text_sv: 'Lämna in samrådsförfrågan till Länsstyrelsen Kronoberg för åtgärder vid Granudden', deadline: '2025-04-01', completed: false },
    ],
    beforeAfter: [
      { label_en: 'Consultation trigger distance', label_sv: 'Samrådsgränsavstånd', before: '200 m (final felling only)', after: '500 m (all operations)' },
    ],
    financialImpact: null,
    complianceDeadline: '2025-04-01',
    isRead: false,
  },
  {
    id: 'rc-04',
    title_en: 'Skogsstyrelsen Bark Beetle Control Ordinance — Mandatory Reporting',
    title_sv: 'Skogsstyrelsens föreskrift om barkborrebekämpning — obligatorisk rapportering',
    summary_en: 'Skogsstyrelsen has issued a new ordinance requiring all forest owners to report bark beetle infestations within 14 days of detection and remove infested timber within 3 weeks.',
    summary_sv: 'Skogsstyrelsen har utfärdat en ny föreskrift som kräver att alla skogsägare rapporterar granbarkborreangrepp inom 14 dagar efter upptäckt och tar bort angripet virke inom 3 veckor.',
    details_en: 'Following record bark beetle outbreaks in southern Sweden, Skogsstyrelsen has invoked §29 of the Forestry Act to issue binding regulations. Forest owners must: (1) actively monitor stands with more than 50% spruce above age 60, (2) report confirmed infestations via the digital reporting system within 14 days, (3) remove or debark infested timber within 21 days. Failure to comply may result in injunctions and fines up to 500,000 SEK.',
    details_sv: 'Efter rekordstora granbarkborreangrepp i södra Sverige har Skogsstyrelsen åberopat §29 i skogsvårdslagen för att utfärda bindande föreskrifter. Skogsägare måste: (1) aktivt övervaka bestånd med mer än 50% gran över 60 års ålder, (2) rapportera bekräftade angrepp via det digitala rapporteringssystemet inom 14 dagar, (3) ta bort eller barka angripet virke inom 21 dagar. Bristande efterlevnad kan resultera i förelägganden och böter upp till 500 000 SEK.',
    howAffectsYou_en: 'Your parcels Norra Skogen and Granudden both contain significant spruce stands over age 60. BeetleSense actively monitors these stands. Ensure you report any detected infestations promptly through the linked Skogsstyrelsen reporting portal.',
    howAffectsYou_sv: 'Dina skiften Norra Skogen och Granudden innehåller båda betydande granbestånd över 60 års ålder. BeetleSense övervakar aktivt dessa bestånd. Se till att du rapporterar eventuella upptäckta angrepp omgående via Skogsstyrelsens kopplade rapporteringsportal.',
    effectiveDate: '2025-03-15',
    publishedDate: daysAgo(21),
    source: 'Skogsstyrelsen',
    scope: 'national',
    severity: 'high',
    categories: ['environmental_protection', 'felling_rules'],
    sourceUrl: 'https://www.skogsstyrelsen.se/lag-och-tillsyn/',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Contains 65% spruce above age 60', reason_sv: 'Innehåller 65% gran över 60 års ålder' },
      { parcelId: 'p4', parcelName: 'Granudden', reason_en: 'Active bark beetle infestation detected', reason_sv: 'Aktivt granbarkborreangrepp upptäckt' },
    ],
    requiredActions: [
      { id: 'a04-1', text_en: 'Register in Skogsstyrelsen digital reporting system', text_sv: 'Registrera dig i Skogsstyrelsens digitala rapporteringssystem', deadline: null, completed: true },
      { id: 'a04-2', text_en: 'Submit infestation report for Granudden', text_sv: 'Lämna in angreppsrapport för Granudden', deadline: daysFromNow(7), completed: false },
      { id: 'a04-3', text_en: 'Remove infested timber from Granudden within deadline', text_sv: 'Ta bort angripet virke från Granudden inom tidsfrist', deadline: daysFromNow(14), completed: false },
    ],
    beforeAfter: [
      { label_en: 'Reporting requirement', label_sv: 'Rapporteringskrav', before: 'Voluntary reporting', after: 'Mandatory within 14 days' },
      { label_en: 'Timber removal deadline', label_sv: 'Tidsfrist för virkesuttag', before: 'No fixed deadline', after: 'Within 21 days of detection' },
    ],
    financialImpact: { estimate_en: 'Fines up to 500,000 SEK for non-compliance. Salvage timber value: ~60-80% of healthy timber.', estimate_sv: 'Böter upp till 500 000 SEK vid bristande efterlevnad. Skadat virkes värde: ~60-80% av friskt virke.' },
    complianceDeadline: daysFromNow(14),
    isRead: true,
  },
  {
    id: 'rc-05',
    title_en: 'Tax Reform: Changes to Skogsavdrag Calculation',
    title_sv: 'Skattereform: ändringar i beräkning av skogsavdrag',
    summary_en: 'The Swedish Tax Agency has updated the rules for skogsavdrag (forest deduction), allowing higher deductions for first-time forest owners and introducing a new climate bonus for certified sustainable forestry.',
    summary_sv: 'Skatteverket har uppdaterat reglerna för skogsavdrag, med högre avdrag för förstagångsägare och en ny klimatbonus för certifierat hållbart skogsbruk.',
    details_en: 'From tax year 2025, the skogsavdrag maximum has been raised from 50% to 60% of the acquisition value for forest owners who purchased their property within the last 5 years. A new "klimatbonus" provides an additional 10% deduction for forest owners with FSC or PEFC certification who can demonstrate net carbon sequestration growth. The skogskonto (forest account) maximum deposit has been raised from 60% to 80% of net forest income.',
    details_sv: 'Från beskattningsår 2025 har skogsavdragets maximum höjts från 50% till 60% av anskaffningsvärdet för skogsägare som köpt sin fastighet inom de senaste 5 åren. En ny "klimatbonus" ger ytterligare 10% avdrag för skogsägare med FSC- eller PEFC-certifiering som kan visa nettotillväxt i koldioxidbindning. Skogskontots maximala insättning har höjts från 60% till 80% av nettoinkomsten från skog.',
    howAffectsYou_en: 'As a forest owner with recent acquisitions, you may qualify for the increased 60% deduction. If your forest is certified, the additional klimatbonus could save you an estimated 15,000-25,000 SEK annually. Consult your skatterådgivare.',
    howAffectsYou_sv: 'Som skogsägare med nyliga förvärv kan du kvalificera dig för det höjda 60%-avdraget. Om din skog är certifierad kan den extra klimatbonusen spara uppskattningsvis 15 000-25 000 SEK årligen. Kontakta din skatterådgivare.',
    effectiveDate: '2025-01-01',
    publishedDate: daysAgo(60),
    source: 'Skatteverket',
    scope: 'national',
    severity: 'medium',
    categories: ['tax_finance'],
    sourceUrl: 'https://www.skatteverket.se/foretagochorganisationer/skatter/skogsbruk',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Timber income subject to skogsavdrag', reason_sv: 'Virkesinkomst som omfattas av skogsavdrag' },
      { parcelId: 'p3', parcelName: 'Tallmon', reason_en: 'Planned final felling generates taxable income', reason_sv: 'Planerad föryngringsavverkning genererar skattepliktig inkomst' },
    ],
    requiredActions: [
      { id: 'a05-1', text_en: 'Review skogsavdrag eligibility with tax advisor', text_sv: 'Granska skogsavdragsberättigande med skatterådgivare', deadline: '2026-05-01', completed: false },
      { id: 'a05-2', text_en: 'Consider FSC/PEFC certification for klimatbonus', text_sv: 'Överväg FSC/PEFC-certifiering för klimatbonus', deadline: null, completed: false },
    ],
    beforeAfter: [
      { label_en: 'Skogsavdrag maximum', label_sv: 'Skogsavdrag maximum', before: '50% of acquisition value', after: '60% for owners <5 years' },
      { label_en: 'Skogskonto deposit cap', label_sv: 'Skogskonto insättningstak', before: '60% of net forest income', after: '80% of net forest income' },
    ],
    financialImpact: { estimate_en: 'Potential annual savings: 15,000-25,000 SEK with klimatbonus', estimate_sv: 'Potentiell årlig besparing: 15 000-25 000 SEK med klimatbonus' },
    complianceDeadline: '2026-05-01',
    isRead: true,
  },
  {
    id: 'rc-06',
    title_en: 'EU Biodiversity Strategy 2030 — 30% Protection Target Implications',
    title_sv: 'EU:s strategi för biologisk mångfald 2030 — konsekvenser av 30%-skyddsmålet',
    summary_en: 'The EU Biodiversity Strategy requires 30% of land to be protected by 2030. Sweden is developing its national implementation plan, which may significantly expand protected forest areas.',
    summary_sv: 'EU:s strategi för biologisk mångfald kräver att 30% av marken ska skyddas till 2030. Sverige utvecklar sin nationella genomförandeplan, som kan utöka skyddade skogsområden avsevärt.',
    details_en: 'The European Commission\'s Biodiversity Strategy for 2030 sets a target of protecting 30% of EU land area, with 10% under strict protection. Sweden currently protects approximately 15% of productive forest land. The Swedish government has tasked Naturvårdsverket with proposing how to reach the target. Potential measures include expanded nature reserves, new biotope protection areas, and voluntary conservation agreements (naturvårdsavtal). Forest owners in areas of high conservation value may face new restrictions.',
    details_sv: 'Europeiska kommissionens strategi för biologisk mångfald 2030 sätter ett mål att skydda 30% av EU:s landyta, varav 10% under strikt skydd. Sverige skyddar för närvarande cirka 15% av produktiv skogsmark. Regeringen har gett Naturvårdsverket i uppdrag att föreslå hur målet ska nås. Möjliga åtgärder inkluderar utökade naturreservat, nya biotopskyddsområden och frivilliga naturvårdsavtal. Skogsägare i områden med höga naturvärden kan möta nya restriktioner.',
    howAffectsYou_en: 'The expansion is still being planned, but parcels near existing protected areas (like Granudden near Natura 2000) are likely candidates for voluntary or mandatory conservation measures. Monitor developments and consider proactive naturvårdsavtal.',
    howAffectsYou_sv: 'Utökningen planeras fortfarande, men skiften nära befintliga skyddade områden (som Granudden nära Natura 2000) är sannolika kandidater för frivilliga eller obligatoriska naturvårdsåtgärder. Bevaka utvecklingen och överväg proaktiva naturvårdsavtal.',
    effectiveDate: '2030-01-01',
    publishedDate: daysAgo(30),
    source: 'EU',
    scope: 'eu',
    severity: 'medium',
    categories: ['eu_directives', 'biodiversity', 'environmental_protection'],
    sourceUrl: 'https://environment.ec.europa.eu/strategy/biodiversity-strategy-2030_en',
    affectedParcels: [
      { parcelId: 'p4', parcelName: 'Granudden', reason_en: 'Adjacent to Natura 2000 area — likely expansion candidate', reason_sv: 'Angränsande till Natura 2000-område — sannolik utökningskandidat' },
    ],
    requiredActions: [],
    beforeAfter: [
      { label_en: 'Protected forest land in Sweden', label_sv: 'Skyddad skogsmark i Sverige', before: '~15% of productive forest', after: 'Target: 30% of all land' },
    ],
    financialImpact: { estimate_en: 'Potential compensation through naturvårdsavtal or intrångsersättning', estimate_sv: 'Möjlig ersättning genom naturvårdsavtal eller intrångsersättning' },
    complianceDeadline: null,
    isRead: false,
  },
  {
    id: 'rc-07',
    title_en: 'New Wetland Restoration Requirements Near Forest Parcels',
    title_sv: 'Nya krav på våtmarksrestaurering nära skogsskiften',
    summary_en: 'Naturvårdsverket has issued new guidance requiring environmental impact assessment for forestry operations near historically drained wetlands, and offers restoration subsidies.',
    summary_sv: 'Naturvårdsverket har utfärdat ny vägledning som kräver miljökonsekvensbedömning för skogsbruksåtgärder nära historiskt utdikade våtmarker, och erbjuder restaureringsbidrag.',
    details_en: 'As part of Sweden\'s climate adaptation strategy, Naturvårdsverket now requires that forestry operations within 100 meters of historically drained wetlands undergo environmental screening. Forest owners are also eligible for LONA-bidrag (local nature conservation grants) of up to 90% of restoration costs. The goal is to restore 30,000 hectares of wetlands by 2030.',
    details_sv: 'Som en del av Sveriges klimatanpassningsstrategi kräver Naturvårdsverket nu att skogsbruksåtgärder inom 100 meter från historiskt utdikade våtmarker genomgår miljöscreening. Skogsägare är också berättigade till LONA-bidrag (lokala naturvårdsbidrag) på upp till 90% av restaureringskostnaderna. Målet är att restaurera 30 000 hektar våtmarker till 2030.',
    howAffectsYou_en: 'Ekbacken has a historically drained wetland area along its eastern boundary. Future thinning operations may require environmental screening. You may also apply for LONA-bidrag for voluntary wetland restoration.',
    howAffectsYou_sv: 'Ekbacken har ett historiskt utdikat våtmarksområde längs dess östra gräns. Framtida gallringsoperationer kan kräva miljöscreening. Du kan också ansöka om LONA-bidrag för frivillig våtmarksrestaurering.',
    effectiveDate: '2025-06-01',
    publishedDate: daysAgo(10),
    source: 'Naturvårdsverket',
    scope: 'national',
    severity: 'medium',
    categories: ['environmental_protection', 'climate'],
    sourceUrl: 'https://www.naturvardsverket.se/amnesomraden/vatmark/',
    affectedParcels: [
      { parcelId: 'p2', parcelName: 'Ekbacken', reason_en: 'Historical drained wetland on eastern boundary', reason_sv: 'Historiskt utdikad våtmark vid östra gränsen' },
    ],
    requiredActions: [
      { id: 'a07-1', text_en: 'Map wetland areas on Ekbacken using historical drainage records', text_sv: 'Kartlägg våtmarksområden på Ekbacken med historiska dikningskartor', deadline: null, completed: false },
    ],
    beforeAfter: [
      { label_en: 'Wetland buffer requirement', label_sv: 'Våtmarksbuffert krav', before: 'No specific requirement', after: 'Environmental screening within 100 m' },
    ],
    financialImpact: { estimate_en: 'LONA-bidrag: up to 90% of restoration costs (50,000-200,000 SEK)', estimate_sv: 'LONA-bidrag: upp till 90% av restaureringskostnader (50 000-200 000 SEK)' },
    complianceDeadline: '2025-06-01',
    isRead: false,
  },
  {
    id: 'rc-08',
    title_en: 'Updated Cultural Heritage Protection Rules (Riksantikvarieämbetet)',
    title_sv: 'Uppdaterade regler för kulturminneskydd (Riksantikvarieämbetet)',
    summary_en: 'Riksantikvarieämbetet has expanded the buffer zone requirements around forest cultural heritage sites and introduced mandatory reporting of new discoveries during forestry operations.',
    summary_sv: 'Riksantikvarieämbetet har utökat krav på skyddszoner kring skogskulturlämningar och infört obligatorisk rapportering av nya upptäckter vid skogsbruksåtgärder.',
    details_en: 'The updated regulations from Riksantikvarieämbetet (RAÄ) increase the standard protection zone around registered cultural heritage sites in forest from 15 meters to 25 meters. Additionally, machine operators must now be trained in cultural heritage identification, and any new discoveries during forestry operations must be reported to Länsstyrelsen within 48 hours. Damage to cultural heritage sites can result in criminal prosecution under Kulturmiljölagen.',
    details_sv: 'De uppdaterade föreskrifterna från Riksantikvarieämbetet (RAÄ) ökar standardskyddszonen kring registrerade kulturlämningar i skog från 15 meter till 25 meter. Dessutom måste maskinförare nu ha utbildning i kulturminnesidentifiering, och eventuella nya upptäckter under skogsbruksåtgärder måste rapporteras till Länsstyrelsen inom 48 timmar. Skador på kulturlämningar kan leda till åtal enligt Kulturmiljölagen.',
    howAffectsYou_en: 'Norra Skogen has a registered kolbotten (RAÄ Värnamo 45:1) 120 meters from your felling area. The wider buffer zone does not directly affect your current plan, but ensure machine operators are aware of its location.',
    howAffectsYou_sv: 'Norra Skogen har en registrerad kolbotten (RAÄ Värnamo 45:1) 120 meter från ditt avverkningsområde. Den bredare skyddszonen påverkar inte direkt din nuvarande plan, men se till att maskinförare känner till dess placering.',
    effectiveDate: '2025-05-01',
    publishedDate: daysAgo(18),
    source: 'Riksantikvarieämbetet',
    scope: 'national',
    severity: 'low',
    categories: ['environmental_protection'],
    sourceUrl: 'https://www.raa.se/hitta-information/kulturmiljolagen/',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Registered cultural heritage site within 200 m', reason_sv: 'Registrerad kulturlämning inom 200 m' },
      { parcelId: 'p3', parcelName: 'Tallmon', reason_en: 'Known kolmila within parcel boundary', reason_sv: 'Känd kolmila inom skiftesgräns' },
    ],
    requiredActions: [
      { id: 'a08-1', text_en: 'Ensure machine operators have cultural heritage training', text_sv: 'Säkerställ att maskinförare har kulturminnesutbildning', deadline: '2025-05-01', completed: false },
    ],
    beforeAfter: [
      { label_en: 'Cultural heritage buffer zone', label_sv: 'Kulturminneskyddzon', before: '15 m standard', after: '25 m standard' },
    ],
    financialImpact: null,
    complianceDeadline: '2025-05-01',
    isRead: true,
  },
  {
    id: 'rc-09',
    title_en: 'PEFC Standard Revision 2025 — Stricter Deadwood Requirements',
    title_sv: 'PEFC-standardrevision 2025 — striktare krav på döda ved',
    summary_en: 'The revised PEFC Sweden forest management standard increases the minimum deadwood retention from 3 to 5 m³/ha and introduces new monitoring requirements.',
    summary_sv: 'Den reviderade PEFC-standarden för skogsbruk i Sverige ökar minimikravet på död ved från 3 till 5 m³/ha och inför nya övervakningskrav.',
    details_en: 'PEFC Sweden has finalized its 2025 standard revision with stricter requirements for biodiversity indicators. Key changes include: minimum 5 m³/ha of deadwood (up from 3), at least 2 high stumps per hectare after felling, broadleaf retention minimum increased to 15% in mixed stands, and annual monitoring documentation required. Non-compliance triggers a 6-month corrective action period before certificate suspension.',
    details_sv: 'PEFC Sverige har färdigställt sin 2025-standardrevision med striktare krav på indikatorer för biologisk mångfald. Viktiga ändringar inkluderar: minimum 5 m³/ha av död ved (upp från 3), minst 2 högstubbar per hektar efter avverkning, lövträdsretention minimum ökat till 15% i blandbestånd, och årlig övervakningsdokumentation krävs. Bristande efterlevnad utlöser en 6-månaders åtgärdsperiod innan certifikatsuspension.',
    howAffectsYou_en: 'If your forest is PEFC-certified, review your current deadwood levels. BeetleSense can estimate deadwood volumes from survey data to help verify compliance.',
    howAffectsYou_sv: 'Om din skog är PEFC-certifierad, granska dina nuvarande döda ved-nivåer. BeetleSense kan uppskatta döda ved-volymer från undersökningsdata för att hjälpa verifiera efterlevnad.',
    effectiveDate: '2025-10-01',
    publishedDate: daysAgo(25),
    source: 'PEFC',
    scope: 'national',
    severity: 'medium',
    categories: ['biodiversity', 'environmental_protection'],
    sourceUrl: 'https://pefc.se/standarder/',
    affectedParcels: [],
    requiredActions: [
      { id: 'a09-1', text_en: 'Assess current deadwood levels across all parcels', text_sv: 'Bedöm nuvarande döda ved-nivåer över alla skiften', deadline: '2025-10-01', completed: false },
    ],
    beforeAfter: [
      { label_en: 'Minimum deadwood', label_sv: 'Minimikrav döda ved', before: '3 m³/ha', after: '5 m³/ha' },
      { label_en: 'Broadleaf retention (mixed stands)', label_sv: 'Lövträdsretention (blandbestånd)', before: '10%', after: '15%' },
    ],
    financialImpact: null,
    complianceDeadline: '2025-10-01',
    isRead: false,
  },
  {
    id: 'rc-10',
    title_en: 'Strandskydd Reform — Changes to Shoreline Protection Near Forests',
    title_sv: 'Strandskyddsreform — ändringar av strandskydd nära skog',
    summary_en: 'The Swedish government has reformed strandskydd (shoreline protection) rules, easing restrictions for forestry in rural areas while strengthening protection near large lakes.',
    summary_sv: 'Regeringen har reformerat strandskyddsreglerna och lättar på restriktioner för skogsbruk i glesbygd, samtidigt som skyddet stärks nära stora sjöar.',
    details_en: 'The reformed Miljöbalken Chapter 7 §§13-18 introduces a differentiated strandskydd system. In rural municipalities (low population density), the standard protection zone for forest operations is reduced from 100 m to 50 m from smaller watercourses. However, for lakes larger than 1 km² and designated watercourses, the zone is extended to 150 m. Forestry operations within the zone still require dispensation from the municipality.',
    details_sv: 'Den reformerade Miljöbalken kapitel 7 §§13-18 inför ett differentierat strandskyddssystem. I glesbygdskommuner (låg befolkningstäthet) minskas standardskyddszonen för skogsbruksåtgärder från 100 m till 50 m från mindre vattendrag. Dock utökas zonen till 150 m för sjöar större än 1 km² och utpekade vattendrag. Skogsbruksåtgärder inom zonen kräver fortfarande dispens från kommunen.',
    howAffectsYou_en: 'Ekbacken is near Eksjön (strandskydd area). Check whether the reformed rules apply to your municipality and whether any current operations fall within the adjusted zone.',
    howAffectsYou_sv: 'Ekbacken ligger nära Eksjön (strandskyddsområde). Kontrollera om de reformerade reglerna gäller din kommun och om några pågående åtgärder faller inom den justerade zonen.',
    effectiveDate: '2025-09-01',
    publishedDate: daysAgo(35),
    source: 'Riksdag',
    scope: 'national',
    severity: 'low',
    categories: ['environmental_protection', 'felling_rules'],
    sourceUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/',
    affectedParcels: [
      { parcelId: 'p2', parcelName: 'Ekbacken', reason_en: 'Located near Eksjön strandskydd area', reason_sv: 'Beläget nära Eksjöns strandskyddsområde' },
    ],
    requiredActions: [],
    beforeAfter: [
      { label_en: 'Strandskydd (rural, small watercourses)', label_sv: 'Strandskydd (glesbygd, mindre vattendrag)', before: '100 m', after: '50 m' },
      { label_en: 'Strandskydd (large lakes >1 km²)', label_sv: 'Strandskydd (stora sjöar >1 km²)', before: '100 m', after: '150 m' },
    ],
    financialImpact: null,
    complianceDeadline: null,
    isRead: true,
  },
  {
    id: 'rc-11',
    title_en: 'New Drone Regulation for Forestry (Transportstyrelsen)',
    title_sv: 'Ny drönarelagstiftning för skogsbruk (Transportstyrelsen)',
    summary_en: 'Transportstyrelsen has updated drone regulations affecting forestry surveys. New rules require registration, operator certificates, and flight logging for all professional forestry drone operations.',
    summary_sv: 'Transportstyrelsen har uppdaterat drönarelagstiftning som påverkar skogsundersökningar. Nya regler kräver registrering, operatörscertifikat och flygloggning för alla professionella skogsbruksdrönareoperationer.',
    details_en: 'Under the updated EASA-aligned Swedish drone regulation (TSFS 2024:XX), all drone operations for forestry purposes in the "specific" category now require: UAS operator registration, Remote pilot certificate (A2 minimum), flight plans filed via the Transportstyrelsen digital system, and insurance documentation. BVLOS (Beyond Visual Line of Sight) operations require additional authorization. The grace period for existing operators ends June 2025.',
    details_sv: 'Enligt den uppdaterade EASA-anpassade svenska drönarelagstiftningen (TSFS 2024:XX) kräver alla drönareoperationer för skogsbruksändamål i "specifik" kategori nu: UAS-operatörsregistrering, fjärrpilotsertifikat (minst A2), flygplaner inlämnade via Transportstyrelsens digitala system, och försäkringsdokumentation. BVLOS-operationer (utom synhåll) kräver ytterligare auktorisation. Övergångsperioden för befintliga operatörer slutar juni 2025.',
    howAffectsYou_en: 'This primarily affects BeetleSense drone pilots conducting surveys on your parcels. No direct action needed from you, but verify that your contracted pilots are compliant.',
    howAffectsYou_sv: 'Detta påverkar främst BeetleSense-drönarpiloter som genomför undersökningar på dina skiften. Ingen direkt åtgärd behövs från dig, men verifiera att dina kontrakterade piloter efterlever regelverket.',
    effectiveDate: '2025-06-30',
    publishedDate: daysAgo(40),
    source: 'Transportstyrelsen',
    scope: 'national',
    severity: 'informational',
    categories: ['felling_rules'],
    sourceUrl: 'https://www.transportstyrelsen.se/sv/luftfart/dronare/',
    affectedParcels: [],
    requiredActions: [],
    beforeAfter: [
      { label_en: 'Forestry drone certification', label_sv: 'Skogsbruksdrönarecertifiering', before: 'Basic registration sufficient', after: 'A2 certificate + flight logging required' },
    ],
    financialImpact: null,
    complianceDeadline: '2025-06-30',
    isRead: true,
  },
  {
    id: 'rc-12',
    title_en: 'Climate Adaptation Requirements in Skogsbruksplaner',
    title_sv: 'Klimatanpassningskrav i skogsbruksplaner',
    summary_en: 'Skogsstyrelsen now recommends that all skogsbruksplaner (forest management plans) include a climate adaptation section addressing species diversification, drought resilience, and bark beetle risk management.',
    summary_sv: 'Skogsstyrelsen rekommenderar nu att alla skogsbruksplaner inkluderar en klimatanpassningssektion som adresserar artdiversifiering, torktålighet och hantering av granbarkborrerisker.',
    details_en: 'While not yet legally binding, Skogsstyrelsen\'s new guidance (Meddelande 2025:X) strongly recommends climate adaptation planning in all forest management plans. Key elements include: (1) species diversification strategy to reduce monoculture risk, (2) drought resilience assessment for each stand, (3) bark beetle risk classification with monitoring plan, (4) fire risk assessment, and (5) storm damage vulnerability analysis. Plans compliant with the guidance are prioritized for government subsidies.',
    details_sv: 'Även om det ännu inte är juridiskt bindande, rekommenderar Skogsstyrelsens nya vägledning (Meddelande 2025:X) starkt klimatanpassningsplanering i alla skogsbruksplaner. Viktiga element inkluderar: (1) artdiversifieringsstrategi för att minska monokulturrisker, (2) torktålighetsbedömning för varje bestånd, (3) granbarkborrerisklassificering med övervakningsplan, (4) brandriskbedömning, och (5) stormskadeanalys. Planer som följer vägledningen prioriteras för statliga bidrag.',
    howAffectsYou_en: 'Consider updating your skogsbruksplan with a climate adaptation section. BeetleSense\'s Growth Model and Storm Risk tools can provide data for the required assessments. Compliant plans receive priority for SKOG-bidrag.',
    howAffectsYou_sv: 'Överväg att uppdatera din skogsbruksplan med en klimatanpassningssektion. BeetleSenses tillväxtmodell och stormriskverktyg kan tillhandahålla data för de krävda bedömningarna. Efterlevande planer får prioritet för SKOG-bidrag.',
    effectiveDate: '2025-04-15',
    publishedDate: daysAgo(5),
    source: 'Skogsstyrelsen',
    scope: 'national',
    severity: 'medium',
    categories: ['climate', 'felling_rules'],
    sourceUrl: 'https://www.skogsstyrelsen.se/globalassets/mer-om-skog/publikationer/',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'High spruce proportion — elevated climate risk', reason_sv: 'Hög granandel — förhöjd klimatrisk' },
      { parcelId: 'p4', parcelName: 'Granudden', reason_en: 'Active bark beetle risk — requires monitoring plan', reason_sv: 'Aktiv granbarkborreorisk — kräver övervakningsplan' },
    ],
    requiredActions: [
      { id: 'a12-1', text_en: 'Update skogsbruksplan with climate adaptation section', text_sv: 'Uppdatera skogsbruksplan med klimatanpassningssektion', deadline: null, completed: false },
    ],
    beforeAfter: [],
    financialImpact: { estimate_en: 'Compliant plans eligible for SKOG-bidrag subsidies', estimate_sv: 'Efterlevande planer berättigade till SKOG-bidrag' },
    complianceDeadline: null,
    isRead: false,
  },
  {
    id: 'rc-13',
    title_en: 'EU Carbon Border Adjustment Mechanism (CBAM) — Indirect Impact on Timber Exports',
    title_sv: 'EU:s gränsjusteringsmekanism för koldioxid (CBAM) — indirekt påverkan på virkesexport',
    summary_en: 'CBAM does not directly cover timber, but its effects on steel, cement, and energy sectors indirectly influence construction timber demand and pricing.',
    summary_sv: 'CBAM omfattar inte direkt virke, men dess effekter på stål-, cement- och energisektorer påverkar indirekt efterfrågan och prissättning av konstruktionsvirke.',
    details_en: 'The EU Carbon Border Adjustment Mechanism (CBAM) entered its transitional phase in 2023 and full implementation from 2026. While timber is not directly covered, CBAM increases the cost of carbon-intensive building materials (steel, cement, aluminum), making wood construction more competitive. Market analysis suggests a 5-15% increase in construction timber demand over 2025-2030, which could positively impact timber prices for Swedish forest owners.',
    details_sv: 'EU:s gränsjusteringsmekanism för koldioxid (CBAM) gick in i sin övergångsfas 2023 och full implementering från 2026. Även om virke inte direkt omfattas, ökar CBAM kostnaderna för koldioxidintensiva byggmaterial (stål, cement, aluminium), vilket gör träbyggande mer konkurrenskraftigt. Marknadsanalyser antyder en 5-15% ökning av efterfrågan på konstruktionsvirke 2025-2030, vilket kan påverka virkespriserna positivt för svenska skogsägare.',
    howAffectsYou_en: 'Positive market signal: timber prices may increase as wood construction becomes more competitive against steel and cement. Consider timing of planned harvests to benefit from the trend.',
    howAffectsYou_sv: 'Positiv marknadssignal: virkespriserna kan öka i takt med att träbyggande blir mer konkurrenskraftigt jämfört med stål och cement. Överväg tidpunkt för planerade avverkningar för att dra nytta av trenden.',
    effectiveDate: '2026-01-01',
    publishedDate: daysAgo(50),
    source: 'EU',
    scope: 'eu',
    severity: 'informational',
    categories: ['eu_directives', 'tax_finance', 'climate'],
    sourceUrl: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    affectedParcels: [],
    requiredActions: [],
    beforeAfter: [],
    financialImpact: { estimate_en: 'Timber price impact: estimated +5-15% for construction grades by 2028', estimate_sv: 'Prispåverkan på virke: beräknad +5-15% för konstruktionskvaliteter till 2028' },
    complianceDeadline: null,
    isRead: true,
  },
  {
    id: 'rc-14',
    title_en: 'Updated Avverkningsanmälan Requirements — Digital Submission Mandatory',
    title_sv: 'Uppdaterade krav på avverkningsanmälan — digital inlämning obligatorisk',
    summary_en: 'Skogsstyrelsen now requires all avverkningsanmälningar to be submitted digitally through Mina sidor or via API. Paper submissions are no longer accepted.',
    summary_sv: 'Skogsstyrelsen kräver nu att alla avverkningsanmälningar lämnas in digitalt via Mina sidor eller via API. Pappersanmälningar godtas inte längre.',
    details_en: 'From March 2025, Skogsstyrelsen requires all felling notifications (avverkningsanmälningar) to be submitted digitally. The updated digital form includes new mandatory fields: GPS coordinates of the felling area boundary (polygon, not just centroid), species composition breakdown, and environmental consideration plan (hänsynsplan). BeetleSense users can export parcel data in the required format directly from the compliance module.',
    details_sv: 'Från mars 2025 kräver Skogsstyrelsen att alla avverkningsanmälningar lämnas in digitalt. Det uppdaterade digitala formuläret inkluderar nya obligatoriska fält: GPS-koordinater för avverkningsområdets gränser (polygon, inte bara centroid), artsammansättning och hänsynsplan. BeetleSense-användare kan exportera skiftesdata i det krävda formatet direkt från regelefterlevnadsmodulen.',
    howAffectsYou_en: 'Your existing avverkningsanmälan for Norra Skogen was submitted in the old format. For future submissions, use BeetleSense\'s compliance module to generate the required digital submission with polygon coordinates.',
    howAffectsYou_sv: 'Din befintliga avverkningsanmälan för Norra Skogen lämnades in i det gamla formatet. För framtida inlämningar, använd BeetleSenses regelefterlevnadsmodul för att generera den krävda digitala inlämningen med polygonkoordinater.',
    effectiveDate: '2025-03-01',
    publishedDate: daysAgo(55),
    source: 'Skogsstyrelsen',
    scope: 'national',
    severity: 'medium',
    categories: ['felling_rules'],
    sourceUrl: 'https://www.skogsstyrelsen.se/aga-skog/avverka/',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Active avverkningsanmälan — future updates must use new format', reason_sv: 'Aktiv avverkningsanmälan — framtida uppdateringar måste använda nytt format' },
    ],
    requiredActions: [
      { id: 'a14-1', text_en: 'Register for Skogsstyrelsen digital submission via Mina sidor', text_sv: 'Registrera dig för Skogsstyrelsens digitala inlämning via Mina sidor', deadline: null, completed: true },
    ],
    beforeAfter: [
      { label_en: 'Submission format', label_sv: 'Inlämningsformat', before: 'Paper or digital accepted', after: 'Digital only (Mina sidor / API)' },
      { label_en: 'Area specification', label_sv: 'Områdesspecifikation', before: 'Centroid coordinate + area', after: 'Full polygon boundary required' },
    ],
    financialImpact: null,
    complianceDeadline: '2025-03-01',
    isRead: true,
  },
  {
    id: 'rc-15',
    title_en: 'Swedish FSC Standard Revision — Increased Set-aside Requirements',
    title_sv: 'Svensk FSC-standardrevision — ökade krav på frivilliga avsättningar',
    summary_en: 'The revised Swedish FSC standard increases voluntary set-aside requirements from 5% to 7% of productive forest area and introduces landscape-level planning requirements.',
    summary_sv: 'Den reviderade svenska FSC-standarden ökar kraven på frivilliga avsättningar från 5% till 7% av produktiv skogsmarksareal och inför krav på landskapsplanering.',
    details_en: 'FSC Sweden\'s revised national standard (effective January 2026) increases the minimum voluntary set-aside from 5% to 7% of productive forest area for certified forest owners. New requirements include: landscape-level conservation planning with neighboring landowners, connectivity corridors between protected areas, and annual biodiversity monitoring. Small-scale forest owners (<200 ha) can meet the requirement through group certification with shared set-aside areas.',
    details_sv: 'FSC Sveriges reviderade nationella standard (gällande från januari 2026) ökar minimikravet på frivilliga avsättningar från 5% till 7% av produktiv skogsmarksareal för certifierade skogsägare. Nya krav inkluderar: landskapsplanering med grannmarkägare, konnektivitetskorridorer mellan skyddade områden, och årlig biodiversitetsövervakning. Småskaliga skogsägare (<200 ha) kan uppfylla kravet genom gruppcertifiering med gemensamma avsättningsområden.',
    howAffectsYou_en: 'If you hold FSC certification, you will need to increase your set-aside area. For your total holding, this means approximately 1-2 additional hectares. Consider partnering with neighbors for group compliance.',
    howAffectsYou_sv: 'Om du har FSC-certifiering behöver du öka din avsättningsareal. För ditt totala innehav innebär detta cirka 1-2 ytterligare hektar. Överväg samarbete med grannar för gruppcertifiering.',
    effectiveDate: '2026-01-01',
    publishedDate: daysAgo(3),
    source: 'FSC',
    scope: 'national',
    severity: 'medium',
    categories: ['biodiversity', 'environmental_protection'],
    sourceUrl: 'https://se.fsc.org/se-se/standarder',
    affectedParcels: [
      { parcelId: 'p1', parcelName: 'Norra Skogen', reason_en: 'Part of certified holding — set-aside increase needed', reason_sv: 'Del av certifierat innehav — ökad avsättning behövs' },
      { parcelId: 'p2', parcelName: 'Ekbacken', reason_en: 'Broadleaf stand suitable as set-aside candidate', reason_sv: 'Lövbestånd lämpligt som avsättningskandidat' },
    ],
    requiredActions: [
      { id: 'a15-1', text_en: 'Identify additional 1-2 ha for voluntary set-aside', text_sv: 'Identifiera ytterligare 1-2 ha för frivillig avsättning', deadline: '2026-01-01', completed: false },
      { id: 'a15-2', text_en: 'Contact neighboring landowners about group certification', text_sv: 'Kontakta grannmarkägare om gruppcertifiering', deadline: null, completed: false },
    ],
    beforeAfter: [
      { label_en: 'FSC voluntary set-aside', label_sv: 'FSC frivillig avsättning', before: '5% of productive area', after: '7% of productive area' },
    ],
    financialImpact: { estimate_en: 'Opportunity cost: ~8,000-15,000 SEK/year per additional hectare set aside', estimate_sv: 'Alternativkostnad: ~8 000-15 000 SEK/år per ytterligare hektar avsatt' },
    complianceDeadline: '2026-01-01',
    isRead: false,
  },
];
