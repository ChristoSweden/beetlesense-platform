import { useState, useMemo, useCallback } from 'react';

// ─── Types ───

export type CertificationId = 'fsc' | 'pefc' | 'eu_taxonomy' | 'naturskydd';

export type RequirementStatus = 'uppfyllt' | 'delvis' | 'ej_uppfyllt';

export interface CertificationRequirement {
  id: string;
  label_sv: string;
  label_en: string;
  status: RequirementStatus;
  evidence?: string;
  actionNeeded_sv?: string;
  actionNeeded_en?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  estimatedCostSEK: number;
}

export interface Certification {
  id: CertificationId;
  name: string;
  fullName_sv: string;
  fullName_en: string;
  issuingBody_sv: string;
  issuingBody_en: string;
  compliancePct: number;
  status: 'certifierad' | 'pagaende' | 'ej_pabörjad';
  renewalDate?: string;
  requirements: CertificationRequirement[];
  financialBenefit_sv: string;
  financialBenefit_en: string;
  premiumPctLow: number;
  premiumPctHigh: number;
  auditCostSEK: number;
  annualFeeSEK: number;
  complianceCostSEK: number;
  carbonCreditEligible: boolean;
  description_sv: string;
  description_en: string;
}

export interface PremiumCalculation {
  certificationId: CertificationId;
  certificationName: string;
  annualPremiumSEK: number;
  totalCostSEK: number;
  roiMonths: number;
  premiumPerM3: number;
}

// ─── Demo Data ───

const FSC_REQUIREMENTS: CertificationRequirement[] = [
  {
    id: 'fsc-1',
    label_sv: 'Minst 5% av produktiv skogsmark avsatt for naturvard',
    label_en: 'At least 5% of productive forest land set aside for conservation',
    status: 'delvis',
    evidence: '3.2% avsatt (5.1 ha av 159.8 ha)',
    actionNeeded_sv: 'Avsatt ytterligare 2.9 ha for naturvard',
    actionNeeded_en: 'Set aside an additional 2.9 ha for conservation',
    priority: 'critical',
    estimatedHours: 16,
    estimatedCostSEK: 8000,
  },
  {
    id: 'fsc-2',
    label_sv: 'Inga avverkningar i nyckelbiotoper',
    label_en: 'No harvesting in key biotopes',
    status: 'uppfyllt',
    evidence: '2 nyckelbiotoper identifierade, bada skyddade',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-3',
    label_sv: 'Hansyn vid avverkning (kantzoner, hansynstrad, hogstubar)',
    label_en: 'Consideration during harvesting (buffer zones, retention trees, high stumps)',
    status: 'delvis',
    evidence: 'Kantzoner OK, hansynstrad 4/ha (krav 10/ha)',
    actionNeeded_sv: 'Oka antal hansynstrad till minst 10 per hektar',
    actionNeeded_en: 'Increase retention trees to at least 10 per hectare',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 4000,
  },
  {
    id: 'fsc-4',
    label_sv: 'Dokumenterad skotselplan',
    label_en: 'Documented management plan',
    status: 'uppfyllt',
    evidence: 'Skotselplan uppdaterad 2025-11',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-5',
    label_sv: 'Kemikalierestriktioner',
    label_en: 'Chemical restrictions',
    status: 'uppfyllt',
    evidence: 'Inga kemikalier anvands',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-6',
    label_sv: 'Medarbetarskydd och arbetsvillkor',
    label_en: 'Worker safety and employment conditions',
    status: 'uppfyllt',
    evidence: 'Avtal med certifierade entreprenorer',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-7',
    label_sv: 'Biologisk mangfald - dodvedsstrategi',
    label_en: 'Biodiversity - deadwood strategy',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Ta fram dodvedsstrategi med mal om 20 m3/ha',
    actionNeeded_en: 'Develop deadwood strategy targeting 20 m3/ha',
    priority: 'high',
    estimatedHours: 12,
    estimatedCostSEK: 6000,
  },
  {
    id: 'fsc-8',
    label_sv: 'Stakeholder-konsultation med lokalsamhalle',
    label_en: 'Stakeholder consultation with local community',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Genomfor samrad med berorda parter',
    actionNeeded_en: 'Conduct consultation with affected parties',
    priority: 'medium',
    estimatedHours: 20,
    estimatedCostSEK: 5000,
  },
  {
    id: 'fsc-9',
    label_sv: 'Overvakning av miljopåverkan',
    label_en: 'Monitoring of environmental impact',
    status: 'delvis',
    evidence: 'Satellitovervakning aktiv, markbaserad saknas',
    actionNeeded_sv: 'Komplettera med markinventeringar 2 ggr/ar',
    actionNeeded_en: 'Supplement with ground surveys 2x/year',
    priority: 'medium',
    estimatedHours: 24,
    estimatedCostSEK: 12000,
  },
  {
    id: 'fsc-10',
    label_sv: 'Sparbarhet i leveranskedjan (Chain of Custody)',
    label_en: 'Traceability in supply chain (Chain of Custody)',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Implementera CoC-system for virkesfloden',
    actionNeeded_en: 'Implement CoC system for timber flows',
    priority: 'critical',
    estimatedHours: 40,
    estimatedCostSEK: 25000,
  },
  {
    id: 'fsc-11',
    label_sv: 'Vattendragsskydd - 10m kantzoner vid alla vattendrag',
    label_en: 'Watercourse protection - 10m buffer zones at all watercourses',
    status: 'uppfyllt',
    evidence: 'Alla vattendrag har >10m kantzon',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-12',
    label_sv: 'Aterstallning av forringate habitat',
    label_en: 'Restoration of degraded habitats',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Identifiera och paborja restaurering av 2 omraden',
    actionNeeded_en: 'Identify and begin restoration of 2 areas',
    priority: 'medium',
    estimatedHours: 32,
    estimatedCostSEK: 18000,
  },
  {
    id: 'fsc-13',
    label_sv: 'Utbildning av all personal i FSC-krav',
    label_en: 'Training of all personnel in FSC requirements',
    status: 'delvis',
    evidence: 'Agaren utbildad, entreprenorer ej',
    actionNeeded_sv: 'Utbilda entreprenorer i FSC-krav',
    actionNeeded_en: 'Train contractors in FSC requirements',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 4000,
  },
  {
    id: 'fsc-14',
    label_sv: 'Ingen konvertering av naturskog',
    label_en: 'No conversion of natural forest',
    status: 'uppfyllt',
    evidence: 'Ingen konvertering genomford',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'fsc-15',
    label_sv: 'Dokumentation av hotade arter',
    label_en: 'Documentation of endangered species',
    status: 'delvis',
    evidence: 'Artinventering fran 2023, behover uppdateras',
    actionNeeded_sv: 'Genomfor ny artinventering',
    actionNeeded_en: 'Conduct new species inventory',
    priority: 'medium',
    estimatedHours: 16,
    estimatedCostSEK: 10000,
  },
];

const PEFC_REQUIREMENTS: CertificationRequirement[] = [
  {
    id: 'pefc-1',
    label_sv: 'Skotselplan uppdaterad vart 10:e ar',
    label_en: 'Management plan updated every 10 years',
    status: 'uppfyllt',
    evidence: 'Skotselplan fran 2025, giltig till 2035',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-2',
    label_sv: 'Naturhansyn vid alla atgarder',
    label_en: 'Nature consideration in all operations',
    status: 'uppfyllt',
    evidence: 'Hansyn dokumenterad for alla avverkningar 2024-2026',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-3',
    label_sv: 'Skydd av fornlamningar och kulturmiljoer',
    label_en: 'Protection of ancient monuments and cultural environments',
    status: 'uppfyllt',
    evidence: '1 fornlamning identifierad, skyddad med 30m buffert',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-4',
    label_sv: 'Utbildade entreprenorer',
    label_en: 'Certified contractors',
    status: 'delvis',
    evidence: '2 av 3 entreprenorer har PEFC-utbildning',
    actionNeeded_sv: 'Sakerstall att alla entreprenorer har PEFC-utbildning',
    actionNeeded_en: 'Ensure all contractors have PEFC training',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 3000,
  },
  {
    id: 'pefc-5',
    label_sv: 'Sparbarhet i leveranskedjan',
    label_en: 'Traceability in supply chain',
    status: 'uppfyllt',
    evidence: 'PEFC CoC via Sodras system',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-6',
    label_sv: 'Hansyn till rennaring (om aktuellt)',
    label_en: 'Consideration for reindeer herding (if applicable)',
    status: 'uppfyllt',
    evidence: 'Ej aktuellt i Smaland',
    priority: 'low',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-7',
    label_sv: 'Biologisk mangfald - hansyn till rod- och svartlistade arter',
    label_en: 'Biodiversity - consideration for red-listed species',
    status: 'uppfyllt',
    evidence: 'Artdatabanken konsulterad, atgarder vidtagna',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-8',
    label_sv: 'Foryngring efter avverkning inom 3 ar',
    label_en: 'Regeneration after harvesting within 3 years',
    status: 'uppfyllt',
    evidence: 'Alla avverkade ytor foryngrade',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-9',
    label_sv: 'Dokumentation av genomforda atgarder',
    label_en: 'Documentation of performed operations',
    status: 'delvis',
    evidence: 'Digital dokumentation fran 2025, aldre saknas',
    actionNeeded_sv: 'Digitalisera dokumentation fran 2020-2024',
    actionNeeded_en: 'Digitize documentation from 2020-2024',
    priority: 'medium',
    estimatedHours: 16,
    estimatedCostSEK: 4000,
  },
  {
    id: 'pefc-10',
    label_sv: 'Markberedning med minimal markpaverkan',
    label_en: 'Soil preparation with minimal ground impact',
    status: 'uppfyllt',
    evidence: 'Inversmarkberedning anvands',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-11',
    label_sv: 'Skogsbilvagsunderhall och dikning',
    label_en: 'Forest road maintenance and ditching',
    status: 'uppfyllt',
    evidence: 'Vagnar i gott skick, diken rensade 2025',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-12',
    label_sv: 'Kemikalieanvandning minimerad',
    label_en: 'Chemical use minimized',
    status: 'uppfyllt',
    evidence: 'Inga kemikalier utom mekanisk slyrojning',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'pefc-13',
    label_sv: 'Vattenskyddsatgarder',
    label_en: 'Water protection measures',
    status: 'delvis',
    evidence: 'Kantzoner 5m, krav 10m vid ett vattendrag',
    actionNeeded_sv: 'Utoka kantzon vid Norra backen till 10m',
    actionNeeded_en: 'Expand buffer zone at Norra backen to 10m',
    priority: 'high',
    estimatedHours: 4,
    estimatedCostSEK: 2000,
  },
  {
    id: 'pefc-14',
    label_sv: 'Arlig intern revision',
    label_en: 'Annual internal audit',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Genomfor intern revision for 2026',
    actionNeeded_en: 'Conduct internal audit for 2026',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 5000,
  },
  {
    id: 'pefc-15',
    label_sv: 'Friluftsliv och allmanhetens tillgang',
    label_en: 'Recreation and public access',
    status: 'uppfyllt',
    evidence: 'Allemansratten respekteras fullt ut',
    priority: 'low',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
];

const EU_TAXONOMY_REQUIREMENTS: CertificationRequirement[] = [
  {
    id: 'eu-1',
    label_sv: 'Skogsbruksplan i linje med EU:s taxonomi for hallbart skogsbruk',
    label_en: 'Management plan aligned with EU Taxonomy for sustainable forestry',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Uppdatera skotselplan med taxonomi-specifika kriterier',
    actionNeeded_en: 'Update management plan with taxonomy-specific criteria',
    priority: 'critical',
    estimatedHours: 40,
    estimatedCostSEK: 20000,
  },
  {
    id: 'eu-2',
    label_sv: 'Klimatnytta dokumenterad (kolbindning)',
    label_en: 'Climate benefit documented (carbon sequestration)',
    status: 'delvis',
    evidence: 'BeetleSense kolmodul aktiv, EUs format saknas',
    actionNeeded_sv: 'Exportera data i EU-format',
    actionNeeded_en: 'Export data in EU format',
    priority: 'critical',
    estimatedHours: 16,
    estimatedCostSEK: 8000,
  },
  {
    id: 'eu-3',
    label_sv: 'Do No Significant Harm (DNSH) - biologisk mangfald',
    label_en: 'Do No Significant Harm (DNSH) - biodiversity',
    status: 'delvis',
    evidence: 'Artinventering genomford, uppfoljning saknas',
    actionNeeded_sv: 'Implementera arlig uppfoljning av biologisk mangfald',
    actionNeeded_en: 'Implement annual biodiversity monitoring',
    priority: 'critical',
    estimatedHours: 24,
    estimatedCostSEK: 15000,
  },
  {
    id: 'eu-4',
    label_sv: 'DNSH - vattenresurser och marina ekosystem',
    label_en: 'DNSH - water resources and marine ecosystems',
    status: 'uppfyllt',
    evidence: 'Kantzoner vid alla vattendrag, ingen paverkan',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'eu-5',
    label_sv: 'DNSH - cirkularekonomi (vedanvandning)',
    label_en: 'DNSH - circular economy (wood use)',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Dokumentera kaskadanvandning av virke',
    actionNeeded_en: 'Document cascade use of timber',
    priority: 'high',
    estimatedHours: 12,
    estimatedCostSEK: 5000,
  },
  {
    id: 'eu-6',
    label_sv: 'DNSH - fororeningar (inga kemikalier)',
    label_en: 'DNSH - pollution (no chemicals)',
    status: 'uppfyllt',
    evidence: 'Kemikaliefri skotsel',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'eu-7',
    label_sv: 'Klimatriskanpassning (resiliens)',
    label_en: 'Climate risk adaptation (resilience)',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Ta fram klimatanpassningsplan med tradartsdiversifiering',
    actionNeeded_en: 'Develop climate adaptation plan with species diversification',
    priority: 'critical',
    estimatedHours: 32,
    estimatedCostSEK: 15000,
  },
  {
    id: 'eu-8',
    label_sv: 'GIS-baserad avverkningsplanering',
    label_en: 'GIS-based harvesting planning',
    status: 'uppfyllt',
    evidence: 'BeetleSense GIS anvands',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'eu-9',
    label_sv: 'Tredjepartsverifiering av hallbarhet',
    label_en: 'Third-party sustainability verification',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Anlita ackrediterat verifieringsorgan',
    actionNeeded_en: 'Engage accredited verification body',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 25000,
  },
  {
    id: 'eu-10',
    label_sv: 'Rapportering till EU:s hallbarhetsregister',
    label_en: 'Reporting to EU sustainability registry',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Registrera i CSRD-rapporteringssystem',
    actionNeeded_en: 'Register in CSRD reporting system',
    priority: 'high',
    estimatedHours: 20,
    estimatedCostSEK: 10000,
  },
  {
    id: 'eu-11',
    label_sv: 'Markkolsinventering',
    label_en: 'Soil carbon inventory',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Genomfor markkolsinventering for alla skiften',
    actionNeeded_en: 'Conduct soil carbon inventory for all stands',
    priority: 'medium',
    estimatedHours: 24,
    estimatedCostSEK: 18000,
  },
  {
    id: 'eu-12',
    label_sv: 'Hallbar avverkningsniva (tillvaxt > uttag)',
    label_en: 'Sustainable harvest level (growth > extraction)',
    status: 'uppfyllt',
    evidence: 'Tillvaxt 6.2 m3sk/ha/ar, uttag 4.1 m3sk/ha/ar',
    priority: 'critical',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'eu-13',
    label_sv: 'Sociala minimikrav (OECD riktlinjer)',
    label_en: 'Social minimum safeguards (OECD guidelines)',
    status: 'delvis',
    evidence: 'Grundlaggande krav uppfyllda, dokumentation ofullstandig',
    actionNeeded_sv: 'Formalisera socialt ansvarspolicy',
    actionNeeded_en: 'Formalize social responsibility policy',
    priority: 'medium',
    estimatedHours: 12,
    estimatedCostSEK: 3000,
  },
  {
    id: 'eu-14',
    label_sv: 'Analys av klimatpaverkan over rotation',
    label_en: 'Climate impact analysis over rotation',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Genomfor livscykelanalys for skogsbruksperiod',
    actionNeeded_en: 'Conduct lifecycle analysis for forestry period',
    priority: 'high',
    estimatedHours: 32,
    estimatedCostSEK: 20000,
  },
  {
    id: 'eu-15',
    label_sv: 'Transparensrapportering (arlig hallbarhetsredovisning)',
    label_en: 'Transparency reporting (annual sustainability report)',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Producera forsta hallbarhetsredovisningen',
    actionNeeded_en: 'Produce first sustainability report',
    priority: 'medium',
    estimatedHours: 40,
    estimatedCostSEK: 15000,
  },
];

const NATURSKYDD_REQUIREMENTS: CertificationRequirement[] = [
  {
    id: 'ns-1',
    label_sv: 'Minst 10% av skogsmarken avsatt som naturreservat/skydd',
    label_en: 'At least 10% of forest land set aside as nature reserve/protection',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Utoka naturvardsavsattningar fran 3.2% till 10%',
    actionNeeded_en: 'Expand conservation set-asides from 3.2% to 10%',
    priority: 'critical',
    estimatedHours: 24,
    estimatedCostSEK: 12000,
  },
  {
    id: 'ns-2',
    label_sv: 'Kontinuitetsskogsbruk (kalhyggesfritt) på minst 30% av arealen',
    label_en: 'Continuous cover forestry (no clear-cutting) on at least 30% of area',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Overg fran kalhyggesbruk till blädning/skarmstallning på 48 ha',
    actionNeeded_en: 'Transition from clear-cutting to selective cutting on 48 ha',
    priority: 'critical',
    estimatedHours: 80,
    estimatedCostSEK: 40000,
  },
  {
    id: 'ns-3',
    label_sv: 'Ingen introduktion av frammmande tradslag',
    label_en: 'No introduction of non-native tree species',
    status: 'uppfyllt',
    evidence: 'Enbart inhemska tradslag planterade',
    priority: 'high',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'ns-4',
    label_sv: 'Dodved >20 m3/ha i avsatta omraden',
    label_en: 'Deadwood >20 m3/ha in set-aside areas',
    status: 'delvis',
    evidence: '12 m3/ha i nuvarande avsattningar',
    actionNeeded_sv: 'Oka dodved genom aktiv kvarlamnande och ringbarkning',
    actionNeeded_en: 'Increase deadwood through active retention and ring-barking',
    priority: 'high',
    estimatedHours: 16,
    estimatedCostSEK: 5000,
  },
  {
    id: 'ns-5',
    label_sv: 'Skydd av alla vattenmiljoer med minst 15m kantzon',
    label_en: 'Protection of all water environments with at least 15m buffer zone',
    status: 'delvis',
    evidence: '10m kantzoner, krav 15m',
    actionNeeded_sv: 'Utoka kantzoner vid 3 vattendrag',
    actionNeeded_en: 'Expand buffer zones at 3 watercourses',
    priority: 'high',
    estimatedHours: 8,
    estimatedCostSEK: 4000,
  },
  {
    id: 'ns-6',
    label_sv: 'Inga insekticider eller fungicider',
    label_en: 'No insecticides or fungicides',
    status: 'uppfyllt',
    evidence: 'Kemikaliefri drift bekraftad',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'ns-7',
    label_sv: 'Fodelseplats och forstorningskvot for rodlistade arter',
    label_en: 'Breeding sites and destruction ratio for red-listed species',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Genomfor inventering med focus pa rodlistade arter',
    actionNeeded_en: 'Conduct inventory focused on red-listed species',
    priority: 'critical',
    estimatedHours: 32,
    estimatedCostSEK: 15000,
  },
  {
    id: 'ns-8',
    label_sv: 'Blandskogsfrämjande (minst 3 tradslag per bestand)',
    label_en: 'Mixed forest promotion (at least 3 species per stand)',
    status: 'delvis',
    evidence: '3 av 5 bestand uppfyller krav',
    actionNeeded_sv: 'Inplantering av lovtrad i 2 granbestand',
    actionNeeded_en: 'Plant broadleaves in 2 spruce stands',
    priority: 'medium',
    estimatedHours: 24,
    estimatedCostSEK: 10000,
  },
  {
    id: 'ns-9',
    label_sv: 'Allmanhetens tillgang garanterad (friluftslivsplan)',
    label_en: 'Public access guaranteed (outdoor recreation plan)',
    status: 'uppfyllt',
    evidence: 'Befintliga stigar och leder markerade',
    priority: 'low',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'ns-10',
    label_sv: 'Pedagogisk skyltning vid naturvardsobjekt',
    label_en: 'Educational signage at conservation objects',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Satt upp informationsskyltar vid nyckelbiotoper',
    actionNeeded_en: 'Install information signs at key biotopes',
    priority: 'low',
    estimatedHours: 8,
    estimatedCostSEK: 3000,
  },
  {
    id: 'ns-11',
    label_sv: 'Arlig ekologisk uppfoljning',
    label_en: 'Annual ecological monitoring',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Etablera overvakningsprogram med arlig rapport',
    actionNeeded_en: 'Establish monitoring program with annual report',
    priority: 'high',
    estimatedHours: 20,
    estimatedCostSEK: 12000,
  },
  {
    id: 'ns-12',
    label_sv: 'Dokumenterad klimatanpassningsstrategi',
    label_en: 'Documented climate adaptation strategy',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Ta fram klimatanpassningsplan',
    actionNeeded_en: 'Develop climate adaptation plan',
    priority: 'medium',
    estimatedHours: 16,
    estimatedCostSEK: 8000,
  },
  {
    id: 'ns-13',
    label_sv: 'Ingen godsling av skogsmark',
    label_en: 'No fertilization of forest land',
    status: 'uppfyllt',
    evidence: 'Ingen godsling genomford',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'ns-14',
    label_sv: 'Hansyn till kulturmiljoer och samiska rattigheter',
    label_en: 'Consideration for cultural environments and Sami rights',
    status: 'uppfyllt',
    evidence: 'Kulturmiljoer kartlagda, ej i samiskt omrade',
    priority: 'medium',
    estimatedHours: 0,
    estimatedCostSEK: 0,
  },
  {
    id: 'ns-15',
    label_sv: 'Kommunikation med allmanhet om naturvardsatgarder',
    label_en: 'Communication with public about conservation measures',
    status: 'ej_uppfyllt',
    actionNeeded_sv: 'Publicera arlig naturvardsrapport',
    actionNeeded_en: 'Publish annual conservation report',
    priority: 'low',
    estimatedHours: 12,
    estimatedCostSEK: 4000,
  },
];

const DEMO_CERTIFICATIONS: Certification[] = [
  {
    id: 'pefc',
    name: 'PEFC',
    fullName_sv: 'Programme for the Endorsement of Forest Certification',
    fullName_en: 'Programme for the Endorsement of Forest Certification',
    issuingBody_sv: 'PEFC International / Svenska PEFC',
    issuingBody_en: 'PEFC International / Swedish PEFC',
    compliancePct: 78,
    status: 'pagaende',
    requirements: PEFC_REQUIREMENTS,
    financialBenefit_sv: 'PEFC-certifiering ger +3-8% på virkespriset och enklare forsaljning till storre sagverk',
    financialBenefit_en: 'PEFC certification gives +3-8% on timber price and easier sales to larger sawmills',
    premiumPctLow: 3,
    premiumPctHigh: 8,
    auditCostSEK: 8000,
    annualFeeSEK: 2500,
    complianceCostSEK: 14000,
    carbonCreditEligible: false,
    description_sv: 'PEFC ar det mest utbredda certifieringssystemet i Sverige. Populart bland sma och medelstora skogsagare tack vare gruppceritifiering via skogsagarforeningar.',
    description_en: 'PEFC is the most widespread certification system in Sweden. Popular among small and medium forest owners thanks to group certification via forest owner associations.',
  },
  {
    id: 'fsc',
    name: 'FSC',
    fullName_sv: 'Forest Stewardship Council',
    fullName_en: 'Forest Stewardship Council',
    issuingBody_sv: 'FSC International / FSC Sverige',
    issuingBody_en: 'FSC International / FSC Sweden',
    compliancePct: 62,
    status: 'pagaende',
    requirements: FSC_REQUIREMENTS,
    financialBenefit_sv: 'FSC-certifiering ger +5-15% på virkespriset och tillgang till premiummarknader',
    financialBenefit_en: 'FSC certification gives +5-15% on timber price and access to premium markets',
    premiumPctLow: 5,
    premiumPctHigh: 15,
    auditCostSEK: 15000,
    annualFeeSEK: 5000,
    complianceCostSEK: 92000,
    carbonCreditEligible: true,
    description_sv: 'FSC ar det mest kravande certifieringssystemet med starkare fokus pa biologisk mangfald och sociala fragor. Ger hogst marknadspremie.',
    description_en: 'FSC is the most demanding certification system with stronger focus on biodiversity and social issues. Gives the highest market premium.',
  },
  {
    id: 'eu_taxonomy',
    name: 'EU Taxonomi',
    fullName_sv: 'EU:s taxonomi for hallbar skogsverksamhet',
    fullName_en: 'EU Taxonomy for Sustainable Forestry',
    issuingBody_sv: 'Europeiska kommissionen',
    issuingBody_en: 'European Commission',
    compliancePct: 45,
    status: 'ej_pabörjad',
    requirements: EU_TAXONOMY_REQUIREMENTS,
    financialBenefit_sv: 'EU-taxonomi oppnar dörren for gron finansiering och ESG-investerare med 2-5% lagre ranta',
    financialBenefit_en: 'EU Taxonomy opens the door for green financing and ESG investors with 2-5% lower interest rates',
    premiumPctLow: 2,
    premiumPctHigh: 5,
    auditCostSEK: 25000,
    annualFeeSEK: 8000,
    complianceCostSEK: 154000,
    carbonCreditEligible: true,
    description_sv: 'EU:s taxonomi ar ett nytt ramverk som klassificerar hallbara ekonomiska aktiviteter. Allt viktigare for tillgang till gron finansiering.',
    description_en: 'The EU Taxonomy is a new framework classifying sustainable economic activities. Increasingly important for access to green financing.',
  },
  {
    id: 'naturskydd',
    name: 'Bra Miljoval Skog',
    fullName_sv: 'Naturskyddsforeningens "Bra Miljoval Skog"',
    fullName_en: 'Swedish Society for Nature Conservation "Good Environmental Choice Forest"',
    issuingBody_sv: 'Naturskyddsforeningen',
    issuingBody_en: 'Swedish Society for Nature Conservation',
    compliancePct: 55,
    status: 'ej_pabörjad',
    requirements: NATURSKYDD_REQUIREMENTS,
    financialBenefit_sv: 'Bra Miljoval Skog ger nischpremie +4-10% och starkt varumarkesvarde for miljomedvetna kopare',
    financialBenefit_en: 'Good Environmental Choice Forest gives niche premium +4-10% and strong brand value for eco-conscious buyers',
    premiumPctLow: 4,
    premiumPctHigh: 10,
    auditCostSEK: 12000,
    annualFeeSEK: 4000,
    complianceCostSEK: 113000,
    carbonCreditEligible: true,
    description_sv: 'Det mest miljoambitiosa certifieringssystemet i Sverige. Kraver kontinuitetsskogsbruk och hogre avsattningar for naturvard.',
    description_en: 'The most environmentally ambitious certification system in Sweden. Requires continuous cover forestry and higher conservation set-asides.',
  },
];

// ─── Hook ───

export function useCertification() {
  const [selectedCertId, setSelectedCertId] = useState<CertificationId | null>(null);
  const certifications = DEMO_CERTIFICATIONS;

  const selectedCertification = useMemo(
    () => certifications.find((c) => c.id === selectedCertId) ?? null,
    [selectedCertId, certifications],
  );

  const getGapCount = useCallback((cert: Certification) => {
    return cert.requirements.filter((r) => r.status !== 'uppfyllt').length;
  }, []);

  const getMetCount = useCallback((cert: Certification) => {
    return cert.requirements.filter((r) => r.status === 'uppfyllt').length;
  }, []);

  const getTotalCostForGaps = useCallback((cert: Certification) => {
    return cert.requirements
      .filter((r) => r.status !== 'uppfyllt')
      .reduce((sum, r) => sum + r.estimatedCostSEK, 0);
  }, []);

  const getTotalHoursForGaps = useCallback((cert: Certification) => {
    return cert.requirements
      .filter((r) => r.status !== 'uppfyllt')
      .reduce((sum, r) => sum + r.estimatedHours, 0);
  }, []);

  const calculatePremium = useCallback(
    (
      certIds: CertificationId[],
      annualHarvestM3: number,
      basePricePerM3: number,
    ): PremiumCalculation[] => {
      return certIds.map((cid) => {
        const cert = certifications.find((c) => c.id === cid);
        if (!cert) {
          return {
            certificationId: cid,
            certificationName: cid,
            annualPremiumSEK: 0,
            totalCostSEK: 0,
            roiMonths: 0,
            premiumPerM3: 0,
          };
        }
        const avgPremiumPct = (cert.premiumPctLow + cert.premiumPctHigh) / 2;
        const premiumPerM3 = basePricePerM3 * (avgPremiumPct / 100);
        const annualPremiumSEK = premiumPerM3 * annualHarvestM3;
        const totalCostSEK = cert.auditCostSEK + cert.complianceCostSEK;
        const roiMonths = annualPremiumSEK > 0 ? Math.ceil((totalCostSEK / annualPremiumSEK) * 12) : 0;

        return {
          certificationId: cid,
          certificationName: cert.name,
          annualPremiumSEK: Math.round(annualPremiumSEK),
          totalCostSEK,
          roiMonths,
          premiumPerM3: Math.round(premiumPerM3),
        };
      });
    },
    [certifications],
  );

  return {
    certifications,
    selectedCertification,
    selectedCertId,
    setSelectedCertId,
    getGapCount,
    getMetCount,
    getTotalCostForGaps,
    getTotalHoursForGaps,
    calculatePremium,
  };
}
