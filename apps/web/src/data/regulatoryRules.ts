/**
 * Swedish forestry regulatory rules data.
 * Based on Skogsvårdslagen (SVL), Skogsvårdsförordningen (SVF),
 * and Skogsstyrelsen's general regulations (SKSFS).
 *
 * All distances, thresholds, and timelines reflect current Swedish law.
 */

// ─── Felling types ───

export type FellingType =
  | 'foryngringsavverkning'  // Final felling / regeneration felling
  | 'gallring'               // Thinning
  | 'sanitetsavverkning'     // Sanitary felling (beetle / storm damage)
  | 'rojarverksamhet'        // Cleaning / pre-commercial thinning
  | 'ovrig';                 // Other (e.g., road clearing)

export interface FellingTypeInfo {
  id: FellingType;
  label_sv: string;
  label_en: string;
  description_sv: string;
  description_en: string;
  requiresNotification: boolean;
  /** Area threshold in hectares above which notification is required */
  notificationThresholdHa: number;
}

export const FELLING_TYPES: FellingTypeInfo[] = [
  {
    id: 'foryngringsavverkning',
    label_sv: 'Föryngringsavverkning',
    label_en: 'Regeneration felling',
    description_sv: 'Slutavverkning där beståndet avverkas och ny skog etableras. Kräver alltid avverkningsanmälan till Skogsstyrelsen.',
    description_en: 'Final felling where the stand is harvested and new forest is established. Always requires a felling notification to the Swedish Forest Agency.',
    requiresNotification: true,
    notificationThresholdHa: 0.5,
  },
  {
    id: 'gallring',
    label_sv: 'Gallring',
    label_en: 'Thinning',
    description_sv: 'Utglesning av beståndet för att gynna kvarvarande träds tillväxt. Kräver normalt inte anmälan om volymen understiger 0,5 ha.',
    description_en: 'Thinning the stand to promote growth of remaining trees. Normally does not require notification if volume is under 0.5 ha.',
    requiresNotification: false,
    notificationThresholdHa: 0.5,
  },
  {
    id: 'sanitetsavverkning',
    label_sv: 'Sanitetsavverkning',
    label_en: 'Sanitary felling',
    description_sv: 'Avverkning av skadade träd (granbarkborre, storm). Kräver anmälan vid area > 0,5 ha.',
    description_en: 'Felling of damaged trees (bark beetle, storm). Requires notification when area > 0.5 ha.',
    requiresNotification: true,
    notificationThresholdHa: 0.5,
  },
  {
    id: 'rojarverksamhet',
    label_sv: 'Röjning',
    label_en: 'Pre-commercial thinning',
    description_sv: 'Röjning av ungskog. Kräver normalt inte anmälan.',
    description_en: 'Cleaning of young forest. Normally does not require notification.',
    requiresNotification: false,
    notificationThresholdHa: Infinity,
  },
  {
    id: 'ovrig',
    label_sv: 'Övrig avverkning',
    label_en: 'Other felling',
    description_sv: 'Annan typ av avverkning, t.ex. vägröjning eller kraftledning.',
    description_en: 'Other type of felling, e.g., road clearing or power line maintenance.',
    requiresNotification: false,
    notificationThresholdHa: 0.5,
  },
];

// ─── Buffer zone rules ───

export type ConstraintType =
  | 'nyckelbiotop'
  | 'natura2000'
  | 'vattendrag'
  | 'kulturminne'
  | 'strandskydd'
  | 'riparian'
  | 'biotopskydd'
  | 'naturreservat';

export type ConstraintSeverity = 'red' | 'yellow' | 'green';

export interface BufferZoneRule {
  type: ConstraintType;
  label_sv: string;
  label_en: string;
  description_sv: string;
  description_en: string;
  bufferDistanceMin: number; // meters
  bufferDistanceMax: number; // meters
  severity: ConstraintSeverity;
  /** Reference to relevant law / regulation */
  legalReference: string;
  skogsstyrelsenUrl: string;
}

export const BUFFER_ZONE_RULES: BufferZoneRule[] = [
  {
    type: 'nyckelbiotop',
    label_sv: 'Nyckelbiotop',
    label_en: 'Key biotope',
    description_sv: 'Område med mycket höga naturvärden. Certifierade skogsägare (FSC/PEFC) får normalt inte avverka nyckelbiotoper.',
    description_en: 'Area with very high natural values. Certified forest owners (FSC/PEFC) are normally not allowed to fell key biotopes.',
    bufferDistanceMin: 0,
    bufferDistanceMax: 50,
    severity: 'red',
    legalReference: 'SKSFS 2011:7, 30 § SVL',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/nyckelbiotoper/',
  },
  {
    type: 'natura2000',
    label_sv: 'Natura 2000-område',
    label_en: 'Natura 2000 area',
    description_sv: 'EU-skyddat naturområde. Tillstånd krävs från Länsstyrelsen för åtgärder som kan påverka området.',
    description_en: 'EU-protected natural area. Permit required from the County Administrative Board for actions that may affect the area.',
    bufferDistanceMin: 0,
    bufferDistanceMax: 500,
    severity: 'red',
    legalReference: '7 kap. 28a § Miljöbalken',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/natura-2000/',
  },
  {
    type: 'vattendrag',
    label_sv: 'Vattendrag / sjö',
    label_en: 'Watercourse / lake',
    description_sv: 'Skyddszon mot vatten. Minst 10 m, normalt 15–30 m beroende på vattendragets storlek.',
    description_en: 'Buffer zone towards water. Minimum 10 m, normally 15–30 m depending on watercourse size.',
    bufferDistanceMin: 10,
    bufferDistanceMax: 30,
    severity: 'yellow',
    legalReference: '30 § SVL, SKSFS 2011:7',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/bruka-skog/skyddszoner/',
  },
  {
    type: 'riparian',
    label_sv: 'Kantzonsskog',
    label_en: 'Riparian zone',
    description_sv: 'Kantzon längs vattendrag som ska lämnas orörd eller skötas med stor försiktighet.',
    description_en: 'Riparian zone along watercourses that must be left undisturbed or managed with great care.',
    bufferDistanceMin: 5,
    bufferDistanceMax: 30,
    severity: 'yellow',
    legalReference: '30 § SVL',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/bruka-skog/skyddszoner/',
  },
  {
    type: 'kulturminne',
    label_sv: 'Kulturmiljö / fornlämning',
    label_en: 'Cultural heritage site',
    description_sv: 'Fornlämningar och kulturhistoriska lämningar skyddas av Kulturmiljölagen. Skyddszon normalt 20 m.',
    description_en: 'Ancient monuments and cultural heritage sites are protected by the Heritage Conservation Act. Buffer zone normally 20 m.',
    bufferDistanceMin: 20,
    bufferDistanceMax: 20,
    severity: 'yellow',
    legalReference: '2 kap. Kulturmiljölagen (KML)',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/bruka-skog/kulturmiljoer/',
  },
  {
    type: 'strandskydd',
    label_sv: 'Strandskydd',
    label_en: 'Shoreline protection',
    description_sv: 'Generellt strandskydd 100 m från strandlinjen. Utökat till 300 m i vissa områden.',
    description_en: 'General shoreline protection 100 m from the shoreline. Extended to 300 m in some areas.',
    bufferDistanceMin: 100,
    bufferDistanceMax: 300,
    severity: 'yellow',
    legalReference: '7 kap. 13–18 § Miljöbalken',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/strandskydd/',
  },
  {
    type: 'biotopskydd',
    label_sv: 'Biotopskyddsområde',
    label_en: 'Biotope protection area',
    description_sv: 'Mindre naturvärdesområden med lagskydd. All avverkning kräver dispens.',
    description_en: 'Small areas with natural values under legal protection. All felling requires exemption.',
    bufferDistanceMin: 0,
    bufferDistanceMax: 0,
    severity: 'red',
    legalReference: '7 kap. 11 § Miljöbalken',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/biotopskydd/',
  },
  {
    type: 'naturreservat',
    label_sv: 'Naturreservat',
    label_en: 'Nature reserve',
    description_sv: 'Naturreservat med särskilda föreskrifter. Avverkning oftast förbjuden utan tillstånd.',
    description_en: 'Nature reserve with special regulations. Felling usually prohibited without permission.',
    bufferDistanceMin: 0,
    bufferDistanceMax: 0,
    severity: 'red',
    legalReference: '7 kap. 4 § Miljöbalken',
    skogsstyrelsenUrl: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/naturreservat/',
  },
];

// ─── Reforestation requirements (Skogsvårdslagen) ───

export type ReforestationMethod = 'planting' | 'seeding' | 'natural_regeneration';

export interface ReforestationSpecies {
  id: string;
  label_sv: string;
  label_en: string;
  /** Typical planting density per hectare */
  densityPerHa: number;
}

export const REFORESTATION_SPECIES: ReforestationSpecies[] = [
  { id: 'gran', label_sv: 'Gran (Picea abies)', label_en: 'Norway spruce (Picea abies)', densityPerHa: 2500 },
  { id: 'tall', label_sv: 'Tall (Pinus sylvestris)', label_en: 'Scots pine (Pinus sylvestris)', densityPerHa: 2200 },
  { id: 'bjork', label_sv: 'Björk (Betula spp.)', label_en: 'Birch (Betula spp.)', densityPerHa: 2000 },
  { id: 'ek', label_sv: 'Ek (Quercus robur)', label_en: 'Oak (Quercus robur)', densityPerHa: 3000 },
  { id: 'bok', label_sv: 'Bok (Fagus sylvatica)', label_en: 'Beech (Fagus sylvatica)', densityPerHa: 4000 },
  { id: 'lark', label_sv: 'Lärk (Larix spp.)', label_en: 'Larch (Larix spp.)', densityPerHa: 2000 },
  { id: 'contorta', label_sv: 'Contortatall (Pinus contorta)', label_en: 'Lodgepole pine (Pinus contorta)', densityPerHa: 2000 },
];

export interface ReforestationMethodInfo {
  id: ReforestationMethod;
  label_sv: string;
  label_en: string;
  description_sv: string;
  description_en: string;
}

export const REFORESTATION_METHODS: ReforestationMethodInfo[] = [
  {
    id: 'planting',
    label_sv: 'Plantering',
    label_en: 'Planting',
    description_sv: 'Aktiv plantering av skogsplantor. Vanligaste metoden i Södra och Mellersta Sverige.',
    description_en: 'Active planting of seedlings. Most common method in Southern and Central Sweden.',
  },
  {
    id: 'seeding',
    label_sv: 'Sådd',
    label_en: 'Seeding',
    description_sv: 'Sådd av frö direkt på föryngringsytan. Vanligast för tall på torr mark.',
    description_en: 'Direct seeding on the regeneration area. Most common for pine on dry ground.',
  },
  {
    id: 'natural_regeneration',
    label_sv: 'Naturlig föryngring',
    label_en: 'Natural regeneration',
    description_sv: 'Föryngring genom fröfall från kvarlämnade fröträd. Kräver godkänd föryngringsplan.',
    description_en: 'Regeneration through seed fall from retained seed trees. Requires approved regeneration plan.',
  },
];

// ─── Key Skogsvårdslagen requirements ───

export interface LegalRequirement {
  id: string;
  label_sv: string;
  label_en: string;
  description_sv: string;
  description_en: string;
  legalReference: string;
}

export const LEGAL_REQUIREMENTS: LegalRequirement[] = [
  {
    id: 'notification_6_weeks',
    label_sv: 'Anmälningsplikt 6 veckor',
    label_en: '6-week notification period',
    description_sv: 'Avverkningsanmälan ska skickas till Skogsstyrelsen minst 6 veckor innan avverkning påbörjas (10 § SVF).',
    description_en: 'Felling notification must be sent to the Swedish Forest Agency at least 6 weeks before felling begins (Section 10 SVF).',
    legalReference: '10 § Skogsvårdsförordningen (SVF)',
  },
  {
    id: 'reforestation_3_years',
    label_sv: 'Återbeskogning inom 3 år',
    label_en: 'Reforestation within 3 years',
    description_sv: 'Ny skog ska vara etablerad senast 3 år efter avverkning. Godkänt föryngringsresultat ska uppnås (5 § SVL).',
    description_en: 'New forest must be established no later than 3 years after felling. Approved regeneration result must be achieved (Section 5 SVL).',
    legalReference: '5 § Skogsvårdslagen (SVL)',
  },
  {
    id: 'minimum_age',
    label_sv: 'Lägsta slutavverkningsålder',
    label_en: 'Minimum final felling age',
    description_sv: 'Skog får normalt inte slutavverkas innan den uppnått lägsta slutavverkningsålder (10 § SVL). Varierar med trädslag och ståndort.',
    description_en: 'Forest may normally not be final-felled before reaching minimum final felling age (Section 10 SVL). Varies by species and site quality.',
    legalReference: '10 § Skogsvårdslagen (SVL)',
  },
  {
    id: 'retention_trees',
    label_sv: 'Hänsyn vid avverkning',
    label_en: 'Retention at felling',
    description_sv: 'Vid avverkning ska hänsyn tas till naturvårdens och kulturmiljövårdens intressen (30 § SVL). Minst 5–10% av arealen bör lämnas som hänsynsytor.',
    description_en: 'At felling, consideration must be given to nature conservation and cultural heritage interests (Section 30 SVL). At least 5–10% of the area should be retained.',
    legalReference: '30 § Skogsvårdslagen (SVL)',
  },
  {
    id: 'area_threshold',
    label_sv: 'Anmälningsgräns 0,5 ha',
    label_en: '0.5 ha notification threshold',
    description_sv: 'Avverkningsanmälan krävs för avverkning av mer än 0,5 hektar produktiv skogsmark (14 § SVL).',
    description_en: 'Felling notification is required for felling of more than 0.5 hectares of productive forest land (Section 14 SVL).',
    legalReference: '14 § Skogsvårdslagen (SVL)',
  },
  {
    id: 'beetle_obligation',
    label_sv: 'Bekämpningsskyldighet',
    label_en: 'Pest control obligation',
    description_sv: 'Skogsägare är skyldiga att vidta åtgärder för att förebygga insektsangrepp, bl.a. bortforsling av virke (29 § SVL).',
    description_en: 'Forest owners are obligated to take measures to prevent insect attacks, including removal of timber (Section 29 SVL).',
    legalReference: '29 § Skogsvårdslagen (SVL)',
  },
];

// ─── Permit status types ───

export type PermitStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'requires_changes' | 'expired';

export const PERMIT_STATUS_CONFIG: Record<PermitStatus, {
  label_sv: string;
  label_en: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label_sv: 'Utkast',
    label_en: 'Draft',
    color: '#94a3b8',
    bgColor: '#94a3b815',
  },
  submitted: {
    label_sv: 'Inskickad',
    label_en: 'Submitted',
    color: '#60a5fa',
    bgColor: '#60a5fa15',
  },
  under_review: {
    label_sv: 'Under granskning',
    label_en: 'Under review',
    color: '#fbbf24',
    bgColor: '#fbbf2415',
  },
  approved: {
    label_sv: 'Godkänd',
    label_en: 'Approved',
    color: '#4ade80',
    bgColor: '#4ade8015',
  },
  requires_changes: {
    label_sv: 'Kräver ändringar',
    label_en: 'Requires changes',
    color: '#f97316',
    bgColor: '#f9731615',
  },
  expired: {
    label_sv: 'Utgången',
    label_en: 'Expired',
    color: '#ef4444',
    bgColor: '#ef444415',
  },
};

/** Mandatory 6-week waiting period in milliseconds */
export const WAITING_PERIOD_MS = 6 * 7 * 24 * 60 * 60 * 1000;
export const WAITING_PERIOD_DAYS = 42;
