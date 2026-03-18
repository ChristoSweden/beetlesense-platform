/**
 * useCrossBorderAlert — European bark beetle outbreak intelligence hook.
 * Provides outbreak data, propagation models, wind corridors, and Swedish risk forecasts.
 */

import { useState, useMemo } from 'react';

// ─── Types ───

export type OutbreakSeverity = 'critical' | 'severe' | 'moderate' | 'low' | 'minimal';
export type TrendDirection = 'expanding' | 'stable' | 'declining';

export interface CountryOutbreak {
  id: string;
  country: string;
  countryCode: string;
  flag: string;
  center: [number, number]; // [lng, lat]
  severity: OutbreakSeverity;
  totalAffectedHa: number;
  cubicMetersLost: number; // m³ timber lost
  economicDamageMSEK: number;
  yearDetected: number;
  speciesAffected: string[];
  trend: TrendDirection;
  responseEffectiveness: number; // 0-100
  distanceToSwedenKm: number;
  relevanceForSweden: number; // 0-100
  regions: OutbreakRegion[];
  summary: string;
}

export interface OutbreakRegion {
  name: string;
  lat: number;
  lng: number;
  severity: OutbreakSeverity;
  affectedHa: number;
  yearFirst: number;
  active: boolean;
}

export interface PropagationFront {
  id: string;
  name: string;
  coordinates: [number, number][]; // line of leading edge
  direction: number; // degrees from north
  speedKmPerYear: number;
  distanceToSwedenKm: number;
  estimatedArrivalYear: [number, number]; // range [earliest, latest]
  confidence: number; // 0-100
}

export interface WindCorridor {
  id: string;
  name: string;
  from: [number, number];
  to: [number, number];
  dominantDirection: string;
  seasonalActive: string;
  riskContribution: number; // 0-100
}

export interface SwedishRegionRisk {
  region: string;
  lat: number;
  lng: number;
  riskScore: number; // 0-100
  primaryThreatFrom: string;
  estimatedArrivalYear: string;
  currentLocalStatus: string;
}

export interface TimelineSnapshot {
  year: number;
  label: string;
  countries: { country: string; severity: OutbreakSeverity; affectedHa: number }[];
  frontLineKmFromSweden: number;
  predicted: boolean;
}

export interface PreparednessItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed';
  deadline: string;
  category: string;
}

export interface CrossBorderData {
  countries: CountryOutbreak[];
  propagationFronts: PropagationFront[];
  windCorridors: WindCorridor[];
  swedishRegionRisks: SwedishRegionRisk[];
  timeline: TimelineSnapshot[];
  preparednessChecklist: PreparednessItem[];
  overallSwedishRisk: number;
  beetleFrontDistanceKm: number;
  estimatedArrival: string;
  propagationSpeedKmYear: number;
  isLoading: boolean;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

// ─── Demo Data ───

const COUNTRIES: CountryOutbreak[] = [
  {
    id: 'cz',
    country: 'Tjeckien',
    countryCode: 'CZ',
    flag: '🇨🇿',
    center: [15.5, 49.8],
    severity: 'critical',
    totalAffectedHa: 380000,
    cubicMetersLost: 150000000,
    economicDamageMSEK: 48000,
    yearDetected: 2018,
    speciesAffected: ['Picea abies (gran)', 'Picea pungens'],
    trend: 'declining',
    responseEffectiveness: 35,
    distanceToSwedenKm: 1050,
    relevanceForSweden: 72,
    regions: [
      { name: 'Moravskoslezský', lat: 49.75, lng: 18.3, severity: 'critical', affectedHa: 120000, yearFirst: 2018, active: true },
      { name: 'Olomoucký', lat: 49.6, lng: 17.2, severity: 'severe', affectedHa: 85000, yearFirst: 2019, active: true },
      { name: 'Vysočina', lat: 49.4, lng: 15.6, severity: 'severe', affectedHa: 95000, yearFirst: 2019, active: true },
      { name: 'Jihomoravský', lat: 49.0, lng: 16.6, severity: 'moderate', affectedHa: 80000, yearFirst: 2020, active: false },
    ],
    summary: 'Epicentret för Europas barkborrekris. 150 miljoner m³ förlust sedan 2018. Torka + stormar 2017–2018 utlöste den värsta katastrofen i europeisk skogshistoria.',
  },
  {
    id: 'de',
    country: 'Tyskland',
    countryCode: 'DE',
    flag: '🇩🇪',
    center: [10.5, 51.2],
    severity: 'severe',
    totalAffectedHa: 285000,
    cubicMetersLost: 100000000,
    economicDamageMSEK: 35000,
    yearDetected: 2019,
    speciesAffected: ['Picea abies (gran)', 'Pinus sylvestris (tall)'],
    trend: 'expanding',
    responseEffectiveness: 45,
    distanceToSwedenKm: 650,
    relevanceForSweden: 85,
    regions: [
      { name: 'Harz (Niedersachsen)', lat: 51.8, lng: 10.6, severity: 'critical', affectedHa: 65000, yearFirst: 2019, active: true },
      { name: 'Thüringen', lat: 50.7, lng: 11.0, severity: 'severe', affectedHa: 55000, yearFirst: 2019, active: true },
      { name: 'Nordrhein-Westfalen', lat: 51.5, lng: 8.5, severity: 'severe', affectedHa: 70000, yearFirst: 2020, active: true },
      { name: 'Schleswig-Holstein', lat: 54.2, lng: 9.8, severity: 'moderate', affectedHa: 30000, yearFirst: 2023, active: true },
      { name: 'Mecklenburg-Vorpommern', lat: 53.8, lng: 12.0, severity: 'moderate', affectedHa: 35000, yearFirst: 2024, active: true },
      { name: 'Bayern', lat: 48.8, lng: 11.5, severity: 'moderate', affectedHa: 30000, yearFirst: 2020, active: true },
    ],
    summary: 'Sprider sig norrut genom Niedersachsen och Mecklenburg-Vorpommern. Den nordligaste fronten är nu bara 650 km från Sveriges sydkust. 100M m³ förlust.',
  },
  {
    id: 'at',
    country: 'Österrike',
    countryCode: 'AT',
    flag: '🇦🇹',
    center: [14.5, 47.5],
    severity: 'severe',
    totalAffectedHa: 120000,
    cubicMetersLost: 40000000,
    economicDamageMSEK: 14000,
    yearDetected: 2018,
    speciesAffected: ['Picea abies (gran)'],
    trend: 'stable',
    responseEffectiveness: 55,
    distanceToSwedenKm: 1200,
    relevanceForSweden: 45,
    regions: [
      { name: 'Kärnten', lat: 46.8, lng: 14.0, severity: 'severe', affectedHa: 45000, yearFirst: 2018, active: true },
      { name: 'Steiermark', lat: 47.3, lng: 15.4, severity: 'severe', affectedHa: 40000, yearFirst: 2019, active: true },
      { name: 'Oberösterreich', lat: 48.0, lng: 14.0, severity: 'moderate', affectedHa: 35000, yearFirst: 2019, active: true },
    ],
    summary: 'Alpina granbestånd hårt drabbade. 40M m³ förlust. Artskifte pågår — gran ersätts med lövträd i lägre höjder.',
  },
  {
    id: 'pl',
    country: 'Polen',
    countryCode: 'PL',
    flag: '🇵🇱',
    center: [19.0, 52.0],
    severity: 'severe',
    totalAffectedHa: 95000,
    cubicMetersLost: 25000000,
    economicDamageMSEK: 8500,
    yearDetected: 2019,
    speciesAffected: ['Picea abies (gran)', 'Pinus sylvestris (tall)'],
    trend: 'expanding',
    responseEffectiveness: 40,
    distanceToSwedenKm: 500,
    relevanceForSweden: 88,
    regions: [
      { name: 'Białowieża', lat: 52.7, lng: 23.8, severity: 'severe', affectedHa: 15000, yearFirst: 2016, active: true },
      { name: 'Sudety (sydväst)', lat: 50.7, lng: 16.5, severity: 'severe', affectedHa: 30000, yearFirst: 2019, active: true },
      { name: 'Pomorskie (norr)', lat: 54.2, lng: 18.0, severity: 'moderate', affectedHa: 25000, yearFirst: 2024, active: true },
      { name: 'Warmińsko-Mazurskie', lat: 53.8, lng: 20.5, severity: 'moderate', affectedHa: 25000, yearFirst: 2024, active: true },
    ],
    summary: 'Norra spridning accelererar. Pomorskie-regionen (500 km från Sverige) visar ökande aktivitet 2024–2025. Białowieża-kontroversen försenade bekämpning.',
  },
  {
    id: 'lv',
    country: 'Lettland',
    countryCode: 'LV',
    flag: '🇱🇻',
    center: [25.0, 57.0],
    severity: 'moderate',
    totalAffectedHa: 18000,
    cubicMetersLost: 4500000,
    economicDamageMSEK: 1800,
    yearDetected: 2024,
    speciesAffected: ['Picea abies (gran)'],
    trend: 'expanding',
    responseEffectiveness: 50,
    distanceToSwedenKm: 350,
    relevanceForSweden: 92,
    regions: [
      { name: 'Kurzeme (väst)', lat: 56.9, lng: 21.8, severity: 'moderate', affectedHa: 8000, yearFirst: 2024, active: true },
      { name: 'Vidzeme (norr)', lat: 57.5, lng: 25.3, severity: 'low', affectedHa: 5000, yearFirst: 2025, active: true },
      { name: 'Zemgale (central)', lat: 56.6, lng: 24.3, severity: 'moderate', affectedHa: 5000, yearFirst: 2024, active: true },
    ],
    summary: 'Snabbast växande utbrott i Baltikum. Kurzeme-regionen bara 350 km från Gotland. Milda vintrar 2023–2025 accelererar spridningen.',
  },
  {
    id: 'lt',
    country: 'Litauen',
    countryCode: 'LT',
    flag: '🇱🇹',
    center: [24.0, 55.5],
    severity: 'moderate',
    totalAffectedHa: 12000,
    cubicMetersLost: 3000000,
    economicDamageMSEK: 1200,
    yearDetected: 2024,
    speciesAffected: ['Picea abies (gran)', 'Pinus sylvestris (tall)'],
    trend: 'expanding',
    responseEffectiveness: 45,
    distanceToSwedenKm: 450,
    relevanceForSweden: 78,
    regions: [
      { name: 'Žemaitija (väst)', lat: 55.9, lng: 22.2, severity: 'moderate', affectedHa: 7000, yearFirst: 2024, active: true },
      { name: 'Aukštaitija (nordöst)', lat: 55.7, lng: 25.5, severity: 'low', affectedHa: 5000, yearFirst: 2025, active: true },
    ],
    summary: 'Utbrott som upptäcktes 2024 expanderar västerut. Vindkorridor över Östersjön ger spridningsrisk till Gotland och Småland.',
  },
  {
    id: 'no',
    country: 'Norge',
    countryCode: 'NO',
    flag: '🇳🇴',
    center: [10.0, 60.5],
    severity: 'moderate',
    totalAffectedHa: 8500,
    cubicMetersLost: 2200000,
    economicDamageMSEK: 850,
    yearDetected: 2023,
    speciesAffected: ['Picea abies (gran)'],
    trend: 'expanding',
    responseEffectiveness: 65,
    distanceToSwedenKm: 0,
    relevanceForSweden: 95,
    regions: [
      { name: 'Vestland', lat: 60.4, lng: 5.3, severity: 'moderate', affectedHa: 4000, yearFirst: 2023, active: true },
      { name: 'Vestfold og Telemark', lat: 59.2, lng: 9.5, severity: 'moderate', affectedHa: 3000, yearFirst: 2024, active: true },
      { name: 'Østlandet', lat: 60.0, lng: 11.0, severity: 'low', affectedHa: 1500, yearFirst: 2025, active: true },
    ],
    summary: 'Gränsland med Sverige. Utbrott i Vestfold og Telemark och Østlandet kan spridas direkt till Värmland och Dalsland. Hög omedelbar relevans.',
  },
  {
    id: 'fi',
    country: 'Finland',
    countryCode: 'FI',
    flag: '🇫🇮',
    center: [26.0, 62.0],
    severity: 'low',
    totalAffectedHa: 3500,
    cubicMetersLost: 800000,
    economicDamageMSEK: 350,
    yearDetected: 2025,
    speciesAffected: ['Picea abies (gran)'],
    trend: 'expanding',
    responseEffectiveness: 70,
    distanceToSwedenKm: 200,
    relevanceForSweden: 75,
    regions: [
      { name: 'Sydvästra Finland', lat: 60.5, lng: 23.0, severity: 'low', affectedHa: 2000, yearFirst: 2025, active: true },
      { name: 'Häme', lat: 61.0, lng: 24.5, severity: 'minimal', affectedHa: 1500, yearFirst: 2025, active: true },
    ],
    summary: 'Minimal skada hittills men uppvärmning snabbast i Europa. Dubbelgenerationer av barkborren rapporterades för första gången 2025 i södra Finland.',
  },
  {
    id: 'dk',
    country: 'Danmark',
    countryCode: 'DK',
    flag: '🇩🇰',
    center: [10.0, 56.0],
    severity: 'moderate',
    totalAffectedHa: 6500,
    cubicMetersLost: 1800000,
    economicDamageMSEK: 650,
    yearDetected: 2020,
    speciesAffected: ['Picea abies (gran)', 'Picea sitchensis'],
    trend: 'stable',
    responseEffectiveness: 60,
    distanceToSwedenKm: 20,
    relevanceForSweden: 90,
    regions: [
      { name: 'Jylland (mitt)', lat: 56.0, lng: 9.5, severity: 'moderate', affectedHa: 3500, yearFirst: 2020, active: true },
      { name: 'Sjælland', lat: 55.4, lng: 12.0, severity: 'moderate', affectedHa: 3000, yearFirst: 2022, active: true },
    ],
    summary: 'Liten skogsareal men proportionellt svårt drabbat. Sjælland-utbrotten bara 20 km från Skåne. Bro-effekt för spridning till södra Sverige.',
  },
];

const PROPAGATION_FRONTS: PropagationFront[] = [
  {
    id: 'pf-1',
    name: 'Nordtysk front',
    coordinates: [
      [9.5, 54.0],
      [10.5, 53.8],
      [11.5, 53.9],
      [12.5, 54.1],
      [13.5, 54.0],
    ],
    direction: 0,
    speedKmPerYear: 80,
    distanceToSwedenKm: 420,
    estimatedArrivalYear: [2027, 2029],
    confidence: 72,
  },
  {
    id: 'pf-2',
    name: 'Baltisk front',
    coordinates: [
      [20.5, 56.5],
      [21.5, 57.0],
      [22.5, 57.2],
      [23.5, 57.0],
      [24.5, 56.8],
    ],
    direction: 315,
    speedKmPerYear: 60,
    distanceToSwedenKm: 350,
    estimatedArrivalYear: [2028, 2031],
    confidence: 55,
  },
  {
    id: 'pf-3',
    name: 'Polsk norrfront',
    coordinates: [
      [16.0, 54.0],
      [17.0, 54.2],
      [18.0, 54.3],
      [19.0, 54.1],
      [20.0, 53.9],
    ],
    direction: 345,
    speedKmPerYear: 70,
    distanceToSwedenKm: 500,
    estimatedArrivalYear: [2028, 2032],
    confidence: 60,
  },
  {
    id: 'pf-4',
    name: 'Norsk gränsfront',
    coordinates: [
      [11.0, 59.5],
      [11.5, 59.8],
      [12.0, 60.0],
      [12.3, 60.3],
    ],
    direction: 90,
    speedKmPerYear: 40,
    distanceToSwedenKm: 0,
    estimatedArrivalYear: [2026, 2027],
    confidence: 85,
  },
];

const WIND_CORRIDORS: WindCorridor[] = [
  {
    id: 'wc-1',
    name: 'Sydvästlig Östersjö-korridor',
    from: [12.0, 54.0],
    to: [13.5, 56.0],
    dominantDirection: 'SW → NE',
    seasonalActive: 'Maj–Juli (huvudsvärmning)',
    riskContribution: 85,
  },
  {
    id: 'wc-2',
    name: 'Baltisk östvind-korridor',
    from: [22.0, 57.0],
    to: [18.5, 57.5],
    dominantDirection: 'E → W',
    seasonalActive: 'Juni–Augusti',
    riskContribution: 65,
  },
  {
    id: 'wc-3',
    name: 'Norsk gränskorridor',
    from: [11.0, 59.5],
    to: [13.0, 59.5],
    dominantDirection: 'W → E',
    seasonalActive: 'April–Juni',
    riskContribution: 70,
  },
  {
    id: 'wc-4',
    name: 'Dansk sund-korridor',
    from: [12.5, 55.5],
    to: [13.0, 55.8],
    dominantDirection: 'S → N',
    seasonalActive: 'Maj–Juli',
    riskContribution: 90,
  },
];

const SWEDISH_REGION_RISKS: SwedishRegionRisk[] = [
  { region: 'Skåne', lat: 55.7, lng: 13.2, riskScore: 82, primaryThreatFrom: 'Danmark / Nordtyskland', estimatedArrivalYear: '2026–2027', currentLocalStatus: 'Förhöjd lokal aktivitet' },
  { region: 'Blekinge', lat: 56.2, lng: 15.0, riskScore: 75, primaryThreatFrom: 'Nordtyskland / Polen', estimatedArrivalYear: '2027–2028', currentLocalStatus: 'Måttlig aktivitet' },
  { region: 'Småland', lat: 57.2, lng: 14.8, riskScore: 68, primaryThreatFrom: 'Nordtyskland / Baltikum', estimatedArrivalYear: '2027–2029', currentLocalStatus: 'Lokal övervakning aktiv' },
  { region: 'Gotland', lat: 57.6, lng: 18.3, riskScore: 71, primaryThreatFrom: 'Lettland / Litauen', estimatedArrivalYear: '2028–2030', currentLocalStatus: 'Vindövervakning aktiv' },
  { region: 'Västra Götaland', lat: 58.2, lng: 12.5, riskScore: 60, primaryThreatFrom: 'Danmark / Norge', estimatedArrivalYear: '2027–2029', currentLocalStatus: 'Normal' },
  { region: 'Värmland', lat: 59.5, lng: 13.5, riskScore: 72, primaryThreatFrom: 'Norge (Østlandet)', estimatedArrivalYear: '2026–2027', currentLocalStatus: 'Norskt gränsutbrott närmar sig' },
  { region: 'Dalarna', lat: 61.0, lng: 14.5, riskScore: 35, primaryThreatFrom: 'Inhemskt / Norge', estimatedArrivalYear: '2029–2032', currentLocalStatus: 'Låg risk' },
  { region: 'Norrland', lat: 63.5, lng: 17.0, riskScore: 18, primaryThreatFrom: 'Finland (långsiktigt)', estimatedArrivalYear: '2032+', currentLocalStatus: 'Minimal risk idag' },
];

const TIMELINE: TimelineSnapshot[] = [
  {
    year: 2018,
    label: 'Utbrottet börjar',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 80000 },
      { country: 'Österrike', severity: 'moderate', affectedHa: 25000 },
    ],
    frontLineKmFromSweden: 1200,
    predicted: false,
  },
  {
    year: 2019,
    label: 'Spridning till Tyskland',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 200000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 60000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 50000 },
      { country: 'Polen', severity: 'moderate', affectedHa: 20000 },
    ],
    frontLineKmFromSweden: 1000,
    predicted: false,
  },
  {
    year: 2020,
    label: 'Kris i Centraleuropa',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 300000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 130000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 75000 },
      { country: 'Polen', severity: 'moderate', affectedHa: 40000 },
      { country: 'Danmark', severity: 'low', affectedHa: 2000 },
    ],
    frontLineKmFromSweden: 850,
    predicted: false,
  },
  {
    year: 2021,
    label: 'Nordlig expansion',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 340000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 180000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 90000 },
      { country: 'Polen', severity: 'severe', affectedHa: 55000 },
      { country: 'Danmark', severity: 'low', affectedHa: 3500 },
    ],
    frontLineKmFromSweden: 750,
    predicted: false,
  },
  {
    year: 2022,
    label: 'Nordtyskland drabbas',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 360000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 220000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 100000 },
      { country: 'Polen', severity: 'severe', affectedHa: 65000 },
      { country: 'Danmark', severity: 'moderate', affectedHa: 4500 },
    ],
    frontLineKmFromSweden: 650,
    predicted: false,
  },
  {
    year: 2023,
    label: 'Norge rapporterar utbrott',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 370000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 250000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 110000 },
      { country: 'Polen', severity: 'severe', affectedHa: 75000 },
      { country: 'Danmark', severity: 'moderate', affectedHa: 5500 },
      { country: 'Norge', severity: 'low', affectedHa: 2000 },
    ],
    frontLineKmFromSweden: 500,
    predicted: false,
  },
  {
    year: 2024,
    label: 'Baltikum och Norden',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 378000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 270000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 115000 },
      { country: 'Polen', severity: 'severe', affectedHa: 85000 },
      { country: 'Lettland', severity: 'moderate', affectedHa: 10000 },
      { country: 'Litauen', severity: 'low', affectedHa: 6000 },
      { country: 'Danmark', severity: 'moderate', affectedHa: 6000 },
      { country: 'Norge', severity: 'moderate', affectedHa: 5000 },
    ],
    frontLineKmFromSweden: 350,
    predicted: false,
  },
  {
    year: 2025,
    label: 'Fronten närmar sig',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 380000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 285000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 120000 },
      { country: 'Polen', severity: 'severe', affectedHa: 95000 },
      { country: 'Lettland', severity: 'moderate', affectedHa: 18000 },
      { country: 'Litauen', severity: 'moderate', affectedHa: 12000 },
      { country: 'Danmark', severity: 'moderate', affectedHa: 6500 },
      { country: 'Norge', severity: 'moderate', affectedHa: 7500 },
      { country: 'Finland', severity: 'low', affectedHa: 2500 },
    ],
    frontLineKmFromSweden: 250,
    predicted: false,
  },
  {
    year: 2026,
    label: 'Idag — akut läge',
    countries: [
      { country: 'Tjeckien', severity: 'critical', affectedHa: 380000 },
      { country: 'Tyskland', severity: 'severe', affectedHa: 300000 },
      { country: 'Österrike', severity: 'severe', affectedHa: 120000 },
      { country: 'Polen', severity: 'severe', affectedHa: 110000 },
      { country: 'Lettland', severity: 'moderate', affectedHa: 25000 },
      { country: 'Litauen', severity: 'moderate', affectedHa: 18000 },
      { country: 'Danmark', severity: 'moderate', affectedHa: 7000 },
      { country: 'Norge', severity: 'moderate', affectedHa: 8500 },
      { country: 'Finland', severity: 'low', affectedHa: 3500 },
    ],
    frontLineKmFromSweden: 150,
    predicted: false,
  },
  {
    year: 2027,
    label: 'Prognos: södra Sverige',
    countries: [
      { country: 'Tyskland', severity: 'severe', affectedHa: 320000 },
      { country: 'Polen', severity: 'severe', affectedHa: 130000 },
      { country: 'Lettland', severity: 'severe', affectedHa: 35000 },
      { country: 'Litauen', severity: 'moderate', affectedHa: 25000 },
      { country: 'Norge', severity: 'moderate', affectedHa: 12000 },
      { country: 'Finland', severity: 'moderate', affectedHa: 8000 },
      { country: 'Sverige', severity: 'moderate', affectedHa: 15000 },
    ],
    frontLineKmFromSweden: 0,
    predicted: true,
  },
  {
    year: 2028,
    label: 'Prognos: expansion',
    countries: [
      { country: 'Tyskland', severity: 'severe', affectedHa: 330000 },
      { country: 'Polen', severity: 'severe', affectedHa: 145000 },
      { country: 'Lettland', severity: 'severe', affectedHa: 45000 },
      { country: 'Litauen', severity: 'severe', affectedHa: 35000 },
      { country: 'Norge', severity: 'moderate', affectedHa: 18000 },
      { country: 'Finland', severity: 'moderate', affectedHa: 15000 },
      { country: 'Sverige', severity: 'severe', affectedHa: 50000 },
    ],
    frontLineKmFromSweden: -100,
    predicted: true,
  },
];

const PREPAREDNESS_CHECKLIST: PreparednessItem[] = [
  {
    id: 'prep-1',
    title: 'Sanitetsavverkning av försvagade träd',
    description: 'Ta bort alla stormskadade, torkstressade och redan angripna granar. Dessa är de primära yngelplatserna.',
    priority: 'critical',
    status: 'in_progress',
    deadline: '2026-04-15',
    category: 'Förebyggande avverkning',
  },
  {
    id: 'prep-2',
    title: 'Fångstträdsstrategier',
    description: 'Placera ut fångstträd (fällda granstammar) i strategiska positioner för att locka barkborrar. Ta bort och förstör innan kläckning.',
    priority: 'high',
    status: 'not_started',
    deadline: '2026-04-01',
    category: 'Fångst och övervakning',
  },
  {
    id: 'prep-3',
    title: 'Feromonfällenätverk',
    description: 'Installera feromonfällor var 200–400m längs skogskanter, speciellt söder- och västsidor. Aktivera senast i april.',
    priority: 'high',
    status: 'not_started',
    deadline: '2026-04-01',
    category: 'Fångst och övervakning',
  },
  {
    id: 'prep-4',
    title: 'Artdiversifiering — plantering',
    description: 'Blanda in lövträd (björk, ek, bok) i granbestånd. Minskar risken för storskaliga angrepp. Plantera minst 20% lövträd.',
    priority: 'medium',
    status: 'not_started',
    deadline: '2026-10-01',
    category: 'Långsiktig resiliens',
  },
  {
    id: 'prep-5',
    title: 'Öka drönarövervakning',
    description: 'Boka drönarpilot för månatlig överflygning mars–september. Tidig detektion ger 3–4 veckors försprång.',
    priority: 'high',
    status: 'in_progress',
    deadline: '2026-03-25',
    category: 'Övervakning',
  },
  {
    id: 'prep-6',
    title: 'Granska skogsförsäkring',
    description: 'Kontrollera att försäkringen täcker barkborreskador. Många svenska skogsförsäkringar har begränsad täckning.',
    priority: 'high',
    status: 'not_started',
    deadline: '2026-05-01',
    category: 'Ekonomiskt skydd',
  },
  {
    id: 'prep-7',
    title: 'Aktivera grannarsnätverk',
    description: 'Kontakta angränsande skogsägare. Utbrott sprids snabbt över fastighetsgränser — koordinerad bekämpning är avgörande.',
    priority: 'medium',
    status: 'not_started',
    deadline: '2026-04-15',
    category: 'Samverkan',
  },
  {
    id: 'prep-8',
    title: 'Kontraktera avverkningsresurser',
    description: 'Säkra tillgång till skördare och skotare NU. Vid utbrott är väntetiden 4–8 veckor om du inte har avtal.',
    priority: 'critical',
    status: 'not_started',
    deadline: '2026-04-01',
    category: 'Beredskap',
  },
  {
    id: 'prep-9',
    title: 'Satellitövervakning — aktivera veckovis',
    description: 'Uppgradera till BeetleSense veckovis satellitövervakning för alla granbestånd. NDVI-avvikelser detekteras inom 5 dagar.',
    priority: 'high',
    status: 'completed',
    deadline: '2026-03-01',
    category: 'Övervakning',
  },
  {
    id: 'prep-10',
    title: 'Vattenstressbedömning',
    description: 'Bedöm markfuktighet och grundvattennivåer. Torkstressade träd har 5× högre risk att bli angripna.',
    priority: 'medium',
    status: 'in_progress',
    deadline: '2026-05-15',
    category: 'Övervakning',
  },
];

// ─── Hook ───

export function useCrossBorderAlert(): CrossBorderData {
  const [selectedYear, setSelectedYear] = useState(2026);

  const data = useMemo<Omit<CrossBorderData, 'selectedYear' | 'setSelectedYear'>>(() => ({
    countries: COUNTRIES,
    propagationFronts: PROPAGATION_FRONTS,
    windCorridors: WIND_CORRIDORS,
    swedishRegionRisks: SWEDISH_REGION_RISKS,
    timeline: TIMELINE,
    preparednessChecklist: PREPAREDNESS_CHECKLIST,
    overallSwedishRisk: 74,
    beetleFrontDistanceKm: 150,
    estimatedArrival: '2027–2028',
    propagationSpeedKmYear: 75,
    isLoading: false,
  }), []);

  return {
    ...data,
    selectedYear,
    setSelectedYear,
  };
}
