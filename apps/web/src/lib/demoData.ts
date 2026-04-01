/**
 * Demo data for BeetleSense — realistic Swedish forest parcels, surveys, reports, and news.
 * Used when Supabase is not configured or user is in demo mode.
 */

import { useAuthStore } from '@/stores/authStore';

export function isDemo(): boolean {
  return useAuthStore.getState().profile?.id === 'demo-user';
}

// ─── Parcels ───

export interface DemoParcel {
  id: string;
  name: string;
  area_hectares: number;
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
  last_survey: string | null;
  municipality: string;
  center: [number, number]; // [lng, lat] WGS84
  species_mix: { species: string; pct: number }[];
  elevation_m: number;
  soil_type: string;
  registered_at: string;
}

export const DEMO_PARCELS: DemoParcel[] = [
  {
    id: 'p1',
    name: 'Norra Skogen',
    area_hectares: 42.5,
    status: 'at_risk',
    last_survey: '2026-03-10',
    municipality: 'Värnamo',
    center: [14.04, 57.19],
    species_mix: [{ species: 'Spruce', pct: 65 }, { species: 'Pine', pct: 25 }, { species: 'Birch', pct: 10 }],
    elevation_m: 210,
    soil_type: 'Moraine',
    registered_at: '2025-09-15',
  },
  {
    id: 'p2',
    name: 'Ekbacken',
    area_hectares: 18.3,
    status: 'healthy',
    last_survey: '2026-03-12',
    municipality: 'Gislaved',
    center: [13.53, 57.30],
    species_mix: [{ species: 'Oak', pct: 40 }, { species: 'Birch', pct: 35 }, { species: 'Spruce', pct: 25 }],
    elevation_m: 185,
    soil_type: 'Clay',
    registered_at: '2025-10-02',
  },
  {
    id: 'p3',
    name: 'Tallmon',
    area_hectares: 67.1,
    status: 'healthy',
    last_survey: '2026-02-28',
    municipality: 'Jönköping',
    center: [14.16, 57.78],
    species_mix: [{ species: 'Pine', pct: 70 }, { species: 'Spruce', pct: 20 }, { species: 'Birch', pct: 10 }],
    elevation_m: 290,
    soil_type: 'Sandy moraine',
    registered_at: '2025-08-20',
  },
  {
    id: 'p4',
    name: 'Granudden',
    area_hectares: 31.9,
    status: 'infested',
    last_survey: '2026-03-08',
    municipality: 'Värnamo',
    center: [14.10, 57.22],
    species_mix: [{ species: 'Spruce', pct: 85 }, { species: 'Pine', pct: 10 }, { species: 'Birch', pct: 5 }],
    elevation_m: 230,
    soil_type: 'Moraine',
    registered_at: '2025-09-01',
  },
  {
    id: 'p5',
    name: 'Björklund',
    area_hectares: 55.0,
    status: 'unknown',
    last_survey: null,
    municipality: 'Nässjö',
    center: [14.70, 57.65],
    species_mix: [{ species: 'Birch', pct: 50 }, { species: 'Spruce', pct: 30 }, { species: 'Alder', pct: 20 }],
    elevation_m: 310,
    soil_type: 'Peat',
    registered_at: '2026-01-10',
  },
];

// ─── Surveys ───

export type SurveyStatus = 'draft' | 'processing' | 'complete' | 'failed';
export type AnalysisModule = 'tree_health' | 'vegetation_index' | 'wildlife_damage' | 'bark_beetle' | 'wild_boar' | 'boundary_survey';

export interface DemoSurvey {
  id: string;
  name: string;
  parcel_id: string;
  parcel_name: string;
  modules: AnalysisModule[];
  status: SurveyStatus;
  priority: 'standard' | 'priority';
  created_at: string;
  updated_at: string;
  results_summary?: string;
}

export const DEMO_SURVEYS: DemoSurvey[] = [
  {
    id: 's1',
    name: 'Spring Beetle Assessment',
    parcel_id: 'p1',
    parcel_name: 'Norra Skogen',
    modules: ['bark_beetle', 'tree_health', 'vegetation_index'],
    status: 'complete',
    priority: 'priority',
    created_at: '2026-03-05T08:00:00Z',
    updated_at: '2026-03-06T14:30:00Z',
    results_summary: 'Moderate bark beetle activity detected in northeast sector. 3,240 trees counted. Species: 65% spruce, 25% pine, 10% birch.',
  },
  {
    id: 's2',
    name: 'Q1 Health Check',
    parcel_id: 'p2',
    parcel_name: 'Ekbacken',
    modules: ['bark_beetle', 'vegetation_index'],
    status: 'complete',
    priority: 'standard',
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-12T09:15:00Z',
    results_summary: 'No bark beetle activity detected. Forest health is excellent. Oak regeneration progressing well.',
  },
  {
    id: 's3',
    name: 'Emergency Infestation Survey',
    parcel_id: 'p4',
    parcel_name: 'Granudden',
    modules: ['bark_beetle', 'tree_health', 'boundary_survey'],
    status: 'complete',
    priority: 'priority',
    created_at: '2026-03-01T06:00:00Z',
    updated_at: '2026-03-02T18:00:00Z',
    results_summary: 'Severe bark beetle infestation confirmed. ~420 trees affected (34% of spruce). Immediate intervention recommended in plots B3–B7.',
  },
  {
    id: 's4',
    name: 'Tallmon Full Inventory',
    parcel_id: 'p3',
    parcel_name: 'Tallmon',
    modules: ['tree_health', 'vegetation_index', 'wildlife_damage'],
    status: 'processing',
    priority: 'standard',
    created_at: '2026-03-14T07:30:00Z',
    updated_at: '2026-03-14T07:30:00Z',
  },
  {
    id: 's5',
    name: 'Boar Damage Assessment',
    parcel_id: 'p3',
    parcel_name: 'Tallmon',
    modules: ['wild_boar', 'wildlife_damage'],
    status: 'draft',
    priority: 'standard',
    created_at: '2026-03-15T12:00:00Z',
    updated_at: '2026-03-15T12:00:00Z',
  },
];

// ─── Reports ───

export interface DemoReport {
  id: string;
  title: string;
  survey_id: string;
  survey_name: string;
  parcel_name: string;
  type: 'summary' | 'detailed' | 'valuation';
  created_at: string;
  status: 'ready' | 'generating';
  modules: string[];
}

export const DEMO_REPORTS: DemoReport[] = [
  {
    id: 'r1',
    title: 'Beetle Assessment — Norra Skogen',
    survey_id: 's1',
    survey_name: 'Spring Beetle Assessment',
    parcel_name: 'Norra Skogen',
    type: 'detailed',
    created_at: '2026-03-06T15:00:00Z',
    status: 'ready',
    modules: ['beetle_detection', 'tree_count', 'species_id'],
  },
  {
    id: 'r2',
    title: 'Health Check — Ekbacken',
    survey_id: 's2',
    survey_name: 'Q1 Health Check',
    parcel_name: 'Ekbacken',
    type: 'summary',
    created_at: '2026-03-12T10:00:00Z',
    status: 'ready',
    modules: ['beetle_detection', 'species_id'],
  },
  {
    id: 'r3',
    title: 'Emergency Report — Granudden Infestation',
    survey_id: 's3',
    survey_name: 'Emergency Infestation Survey',
    parcel_name: 'Granudden',
    type: 'detailed',
    created_at: '2026-03-02T19:00:00Z',
    status: 'ready',
    modules: ['beetle_detection', 'tree_count', 'change_detection'],
  },
];

// ─── News / Curated Articles ───

export interface DemoNewsItem {
  id: string;
  title: string;
  snippet: string;
  source: string;
  source_url: string;
  category: 'BEETLE_OUTBREAKS' | 'FOREST_HEALTH' | 'CLIMATE_IMPACT' | 'REGULATIONS' | 'TECHNOLOGY' | 'MARKET_PRICES';
  published_at: string;
  combined_score: number;
}

export const DEMO_NEWS: DemoNewsItem[] = [
  {
    id: 'n1',
    title: 'Skogsstyrelsen warns of early bark beetle flight season in southern Sweden',
    snippet: 'Warmer-than-average February temperatures have accelerated bark beetle emergence by 2–3 weeks. Forest owners in Småland and Götaland urged to inspect spruce stands immediately.',
    source: 'Skogsstyrelsen',
    source_url: 'https://www.skogsstyrelsen.se/om-oss/pressrum/',
    category: 'BEETLE_OUTBREAKS',
    published_at: '2026-03-14T08:00:00Z',
    combined_score: 0.95,
  },
  {
    id: 'n2',
    title: 'New EU Forest Monitoring Regulation adopted — what it means for Swedish landowners',
    snippet: 'The EU Forest Monitoring Regulation mandates satellite-based health monitoring across all member states. Sweden to implement national reporting framework by 2027.',
    source: 'European Commission',
    source_url: 'https://environment.ec.europa.eu/topics/forests_en',
    category: 'REGULATIONS',
    published_at: '2026-03-12T10:00:00Z',
    combined_score: 0.82,
  },
  {
    id: 'n3',
    title: 'Timber prices rise 8% in Q1 as supply tightens after storm damage',
    snippet: 'Swedish timber prices have risen sharply following widespread storm damage in January. Sawlog prices now SEK 580/m³, pulpwood SEK 320/m³.',
    source: 'Virkesbörsen',
    source_url: 'https://www.virkesborsen.se/',
    category: 'MARKET_PRICES',
    published_at: '2026-03-10T14:00:00Z',
    combined_score: 0.78,
  },
  {
    id: 'n4',
    title: 'SLU study: drone-based detection outperforms satellite for early-stage infestations',
    snippet: 'Researchers at SLU found that sub-5cm drone imagery detects beetle damage 3–4 weeks earlier than Sentinel-2 NDVI, with 91% accuracy vs 67% for satellite alone.',
    source: 'SLU Forest Faculty',
    source_url: 'https://www.slu.se/en/faculties/s/',
    category: 'TECHNOLOGY',
    published_at: '2026-03-08T09:00:00Z',
    combined_score: 0.88,
  },
  {
    id: 'n5',
    title: 'Record drought stress across Nordic forests — SMHI climate outlook',
    snippet: 'SMHI forecasts below-average precipitation through May 2026, raising concerns about drought stress in coniferous forests and increased fire risk.',
    source: 'SMHI',
    source_url: 'https://www.smhi.se/klimat/klimatet-da-och-nu',
    category: 'CLIMATE_IMPACT',
    published_at: '2026-03-06T11:00:00Z',
    combined_score: 0.85,
  },
  {
    id: 'n6',
    title: 'Lantmäteriet releases updated national LiDAR dataset — 1 pt/m² coverage complete',
    snippet: 'The updated laser scanning dataset now covers 100% of Sweden with improved point density, enabling more accurate canopy height models and terrain analysis.',
    source: 'Lantmäteriet',
    source_url: 'https://www.lantmateriet.se/sv/geodata/geodataprodukter/laserdata/',
    category: 'TECHNOLOGY',
    published_at: '2026-03-04T07:30:00Z',
    combined_score: 0.72,
  },
];

// ─── Pilot Jobs ───

export interface DemoJob {
  id: string;
  title: string;
  parcel_name: string;
  municipality: string;
  area_hectares: number;
  modules: string[];
  fee_sek: number;
  deadline: string;
  status: 'open' | 'assigned' | 'completed';
  priority: 'standard' | 'priority';
}

export const DEMO_JOBS: DemoJob[] = [
  {
    id: 'j1',
    title: 'Beetle survey — Norra Skogen',
    parcel_name: 'Norra Skogen',
    municipality: 'Värnamo',
    area_hectares: 42.5,
    modules: ['beetle_detection', 'tree_count'],
    fee_sek: 4250,
    deadline: '2026-03-20',
    status: 'open',
    priority: 'priority',
  },
  {
    id: 'j2',
    title: 'Full inventory — Tallmon',
    parcel_name: 'Tallmon',
    municipality: 'Jönköping',
    area_hectares: 67.1,
    modules: ['tree_count', 'species_id', 'animal_inventory'],
    fee_sek: 6710,
    deadline: '2026-03-25',
    status: 'open',
    priority: 'standard',
  },
  {
    id: 'j3',
    title: 'Health check — Ekbacken',
    parcel_name: 'Ekbacken',
    municipality: 'Gislaved',
    area_hectares: 18.3,
    modules: ['beetle_detection'],
    fee_sek: 1830,
    deadline: '2026-03-18',
    status: 'completed',
    priority: 'standard',
  },
];

// ─── Dashboard stats (pre-computed for demo) ───

export const DEMO_STATS = {
  owner: {
    totalParcels: '5',
    activeSurveys: '2',
    recentAlerts: '3',
    aiSessions: '12',
  },
  pilot: {
    activeJobs: '1',
    completedJobs: '8',
    totalEarnings: '34,500 SEK',
  },
  inspector: {
    pendingReviews: '3',
    completedReviews: '24',
    accuracy: '96%',
    clients: '7',
    reports: '18',
  },
};

// ─── Activity feed ───

export interface DemoActivity {
  id: string;
  type: 'survey_complete' | 'alert' | 'survey_started';
  message: string;
  parcel_name: string;
  time: string;
  color: string;
}

export const DEMO_ACTIVITIES: DemoActivity[] = [
  { id: 'a1', type: 'alert', message: 'Elevated bark beetle risk detected', parcel_name: 'Norra Skogen', time: '2h ago', color: '#fbbf24' },
  { id: 'a2', type: 'survey_complete', message: 'Survey "Q1 Health Check" completed', parcel_name: 'Ekbacken', time: '1d ago', color: '#4ade80' },
  { id: 'a3', type: 'survey_complete', message: 'Emergency report ready for download', parcel_name: 'Granudden', time: '2d ago', color: '#4ade80' },
  { id: 'a4', type: 'survey_started', message: 'Survey "Tallmon Full Inventory" started processing', parcel_name: 'Tallmon', time: '3d ago', color: '#86efac' },
  { id: 'a5', type: 'alert', message: 'NDVI decline detected (Sentinel-2)', parcel_name: 'Granudden', time: '5d ago', color: '#fbbf24' },
];

// ─── Blog posts ───

export interface DemoBlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  locale: string;
  cover_url: string | null;
  category: 'Bark Beetle Research' | 'Forest Management' | 'Technology' | 'Company News' | 'Regulatory Updates' | 'Climate & Ecology';
  author: string;
  authorRole: string;
  readTime: number;
  featured?: boolean;
  body: string;
  status: 'published' | 'draft';
  seoDescription: string;
}

export const DEMO_BLOG_POSTS: DemoBlogPost[] = [
  {
    id: 'b1',
    title: 'Understanding Bark Beetle Biology: A Guide for Forest Owners',
    excerpt: 'Learn how Ips typographus reproduces, spreads, and what environmental conditions trigger outbreaks in Nordic forests.',
    slug: 'bark-beetle-biology-guide',
    published_at: '2026-03-10T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Bark Beetle Research',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 8,
    featured: true,
    status: 'published',
    seoDescription: 'Comprehensive guide to Ips typographus biology for Swedish forest owners.',
    body: `## Introduction to Ips typographus\n\nThe European spruce bark beetle (*Ips typographus*) is the most destructive forest pest in Scandinavia. Each year, granbarkborren causes damage worth billions of kronor across Swedish forests.\n\n## Life Cycle and Swarming\n\nBark beetles emerge in spring when temperatures reach 18-20\u00b0C. The male bores into the bark of weakened spruce trees and releases aggregation pheromones that attract both males and females.\n\n### Reproduction Phases\n\n- **Swarming flight**: April\u2013May, triggered by warm weather\n- **Gallery construction**: Female creates egg galleries under bark\n- **Larval development**: 6\u20138 weeks depending on temperature\n- **New generation**: Emerges July\u2013August, may produce a second brood\n\n## Environmental Triggers\n\nDrought stress is the primary factor making forests vulnerable. When trees cannot produce enough resin to defend themselves, beetles can overwhelm healthy stands. Climate change is extending the beetle season and enabling **double generations** (dubbelgenerationer) in southern Sweden.\n\n## Detection Methods\n\nEarly detection is critical. Look for:\n- Brown boring dust (borrmj\u00f6l) at the base of spruce trunks\n- Small entry holes (2mm diameter) in bark\n- Crown discoloration from green to yellow-brown\n- Woodpecker activity (hackspettsarbete) indicating larval presence\n\n## What Forest Owners Can Do\n\nTimely removal of infested trees is the single most effective countermeasure. Skogsstyrelsen recommends removing attacked trees within 3 weeks of detection to prevent the next generation from emerging.\n\nBeetleSense AI helps you detect these signs weeks earlier using drone imagery and satellite data fusion, giving you the critical time advantage needed to protect your forest.`,
  },
  {
    id: 'b2',
    title: 'How Satellite + Drone Fusion Improves Detection Accuracy',
    excerpt: 'A technical overview of how BeetleSense combines Sentinel-2 NDVI time-series with sub-5cm drone imagery for early detection.',
    slug: 'satellite-drone-fusion',
    published_at: '2026-03-05T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Technology',
    author: 'Anna Svensson',
    authorRole: 'Head of Remote Sensing, BeetleSense',
    readTime: 12,
    status: 'published',
    seoDescription: 'Technical deep-dive into satellite and drone data fusion for bark beetle detection.',
    body: `## The Detection Challenge\n\nTraditional forest monitoring relies on ground surveys that are slow, expensive, and often too late. By the time crown discoloration is visible to the naked eye, the beetles have already reproduced and spread.\n\n## Our Multi-Scale Approach\n\nBeetleSense uses a tiered detection system:\n\n### Tier 1: Satellite Monitoring (Sentinel-2)\n\nWe process Sentinel-2 imagery every 5 days, computing NDVI (Normalized Difference Vegetation Index) time-series for every forest parcel. Our algorithms detect subtle spectral shifts that indicate stress weeks before visible symptoms appear.\n\n### Tier 2: Drone Surveys\n\nWhen satellite data flags a potential hotspot, we deploy drone pilots for high-resolution inspection. Our DJI Mavic 3 Multispectral drones capture sub-5cm imagery across visible and near-infrared bands.\n\n### Tier 3: AI Inference\n\nOur ONNX-optimized neural networks process drone imagery in real-time, classifying tree health at individual crown level with 94.7% accuracy.\n\n## Results from Sm\u00e5land Pilot\n\nDuring our 2025 pilot in Sm\u00e5land, the fusion approach detected infestations an average of 23 days earlier than traditional ground surveys. This early warning enabled forest owners to remove affected trees before second-generation swarming.`,
  },
  {
    id: 'b3',
    title: '5 Steps to Protect Your Forest Before Beetle Season',
    excerpt: 'Practical tips from SLU researchers on preparing your forest holdings for the spring bark beetle flight season.',
    slug: 'protect-forest-beetle-season',
    published_at: '2026-02-28T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Forest Management',
    author: 'Johan Ekstr\u00f6m',
    authorRole: 'Forest Management Advisor',
    readTime: 5,
    status: 'published',
    seoDescription: 'Five practical steps to prepare your Swedish forest for bark beetle season.',
    body: `## Preparing for Beetle Season 2026\n\nWith warmer winters and earlier springs, Swedish forest owners need to be proactive. Here are five steps recommended by SLU (Sveriges lantbruksuniversitet) researchers.\n\n## Step 1: Remove Storm-Damaged Trees\n\nWindfallen and broken trees are primary breeding sites. Remove all storm damage before April to eliminate beetle nurseries.\n\n## Step 2: Monitor Your Borders\n\nInfestations often spread from neighboring properties. Walk your forest boundaries and check for signs of attack in adjacent stands.\n\n## Step 3: Set Up Pheromone Traps\n\nDeploy feromonfällor by early April. While traps alone won't stop an outbreak, they provide valuable early warning data.\n\n## Step 4: Register for Satellite Monitoring\n\nSign up for BeetleSense satellite alerts. Our system monitors your parcels every 5 days and notifies you of any spectral anomalies.\n\n## Step 5: Arrange Contractor Access\n\nHave a harvesting contractor on standby. When an infestation is detected, rapid removal is critical \u2014 every day counts.`,
  },
  {
    id: 'b4',
    title: 'Klimatf\u00f6r\u00e4ndringarnas p\u00e5verkan p\u00e5 granbarkborren i Norden',
    excerpt: 'Hur stigande temperaturer och f\u00f6r\u00e4ndrade nederbördsm\u00f6nster driver barkborreutbrott till nya regioner i Sverige och Finland.',
    slug: 'climate-change-bark-beetle-nordics',
    published_at: '2026-02-20T10:00:00Z',
    locale: 'sv',
    cover_url: null,
    category: 'Climate & Ecology',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 10,
    status: 'published',
    seoDescription: 'How climate change is driving bark beetle outbreaks northward in Scandinavia.',
    body: `## Nordliga utbrott\n\nHistoriskt har allvarliga barkborreutbrott begr\u00e4nsats till s\u00f6dra Sverige. Men de senaste \u00e5rens data visar en tydlig nordv\u00e4rd migration.\n\n## Temperaturdata fr\u00e5n SMHI\n\nSMHI:s data visar att medeltemperaturen i mars-april har \u00f6kat med 2.3\u00b0C sedan 1990 i Norrlands kustomr\u00e5den. Detta inneb\u00e4r att sv\u00e4rmningsperioden b\u00f6rjar tidigare och varar l\u00e4ngre.\n\n## Dubbla generationer\n\nI G\u00f6taland registrerades dubbelgenerationer av granbarkborren f\u00f6r f\u00f6rsta g\u00e5ngen 2018. Sedan dess har fenomenet blivit allt vanligare och observerats s\u00e5 l\u00e5ngt norrut som Dalarna.\n\n## Vad detta betyder f\u00f6r skogsbruket\n\nSkogsbrukare i mellansverige b\u00f6r nu planera f\u00f6r barkborreangrepp som tidigare bara var ett problem i s\u00f6der. Det kr\u00e4ver ny kompetens, nya verktyg och snabbare beslutsfattande.`,
  },
  {
    id: 'b5',
    title: 'BeetleSense Launches Real-Time Alert System for Forest Owners',
    excerpt: 'Our new push notification system delivers instant alerts when satellite data detects potential beetle activity on your parcels.',
    slug: 'real-time-alert-system-launch',
    published_at: '2026-02-15T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Company News',
    author: 'Maria Johansson',
    authorRole: 'CEO, BeetleSense',
    readTime: 4,
    status: 'published',
    seoDescription: 'BeetleSense launches real-time push notifications for bark beetle detection alerts.',
    body: `## Instant Forest Monitoring\n\nToday we are excited to announce the launch of our real-time alert system. Forest owners who register their parcels with BeetleSense will now receive push notifications within hours of satellite-detected anomalies.\n\n## How It Works\n\nOur system processes Sentinel-2 data every 5 days. When our AI models detect spectral changes consistent with early-stage beetle attack, we immediately notify the parcel owner via:\n\n- Push notification (PWA)\n- Email alert\n- SMS (optional)\n\n## Pilot Results\n\nDuring our beta testing with 47 forest owners in V\u00e4xj\u00f6 kommun, the alert system achieved:\n\n- 23 days average early detection vs. visual inspection\n- 89% of alerts confirmed as true positives upon ground inspection\n- 3.2M SEK estimated savings in prevented timber loss\n\n## Getting Started\n\nAll BeetleSense subscribers can activate alerts from the Settings page. Free tier users receive weekly digest emails.`,
  },
  {
    id: 'b6',
    title: 'New EU Deforestation Regulation: What Swedish Forest Owners Need to Know',
    excerpt: 'The EUDR requires due diligence for timber products. Here is how it affects small-scale Swedish forest owners and what steps to take.',
    slug: 'eudr-swedish-forest-owners',
    published_at: '2026-02-10T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Regulatory Updates',
    author: 'Karin Bergstr\u00f6m',
    authorRole: 'Regulatory Affairs, BeetleSense',
    readTime: 7,
    status: 'published',
    seoDescription: 'EU Deforestation Regulation impact on Swedish forestry and compliance requirements.',
    body: `## The EU Deforestation Regulation (EUDR)\n\nThe EUDR entered into force in June 2023 and becomes applicable for large operators in December 2024. It requires companies placing timber products on the EU market to prove their supply chains are deforestation-free.\n\n## Impact on Swedish Forest Owners\n\nWhile Sweden's forests are not being deforested, the regulation still requires:\n\n- Geolocation data for all harvested timber\n- Due diligence documentation\n- Traceability through the supply chain\n\n## How BeetleSense Helps\n\nOur platform automatically generates EUDR-compliant geolocation reports for every parcel. The satellite monitoring history serves as proof that your forest management practices are sustainable and legal.\n\n## Timeline\n\n- **December 2024**: Large operators must comply\n- **June 2025**: Small and medium enterprises must comply\n- **2026**: Full enforcement begins\n\nContact Skogsstyrelsen or your local LRF office for detailed guidance on compliance requirements specific to your situation.`,
  },
  {
    id: 'b7',
    title: 'Machine Learning for Tree Species Classification from Drone Imagery',
    excerpt: 'How our neural network distinguishes between gran, tall, bj\u00f6rk, and other species using multispectral drone data.',
    slug: 'ml-tree-species-classification',
    published_at: '2026-02-05T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Technology',
    author: 'Anna Svensson',
    authorRole: 'Head of Remote Sensing, BeetleSense',
    readTime: 15,
    status: 'published',
    seoDescription: 'Deep learning approach to tree species classification from multispectral drone imagery.',
    body: `## Why Species Classification Matters\n\nKnowing the exact species composition of a forest stand is critical for management decisions, timber valuation, and beetle risk assessment. Spruce (gran) is the primary host for Ips typographus, so knowing your spruce percentage is essential.\n\n## Our Model Architecture\n\nWe use a modified EfficientNet-B4 backbone trained on over 120,000 annotated tree crowns from Swedish forests. The model processes 5-band multispectral imagery (RGB + RedEdge + NIR) and classifies individual crowns.\n\n## Species We Detect\n\n- **Gran (Picea abies)**: 97.2% accuracy\n- **Tall (Pinus sylvestris)**: 95.8% accuracy\n- **Bj\u00f6rk (Betula spp.)**: 93.1% accuracy\n- **Ek (Quercus robur)**: 89.4% accuracy\n- **Other deciduous**: 85.7% accuracy\n\n## Training Data from Riksskogstaxeringen\n\nWe partnered with SLU to use Riksskogstaxeringen (National Forest Inventory) ground truth data for validation. This ensures our models are calibrated against the gold standard for Swedish forest data.`,
  },
  {
    id: 'b8',
    title: 'Skogsbruksplan 2.0: Digitala verktyg f\u00f6r modern skogf\u00f6rvaltning',
    excerpt: 'Hur digitala skogsbruksplaner och AI-drivna beslutst\u00f6d f\u00f6r\u00e4ndrar hur svenska skogs\u00e4gare f\u00f6rvaltar sina fastigheter.',
    slug: 'digital-forest-management-plan',
    published_at: '2026-01-28T10:00:00Z',
    locale: 'sv',
    cover_url: null,
    category: 'Forest Management',
    author: 'Johan Ekstr\u00f6m',
    authorRole: 'Forest Management Advisor',
    readTime: 6,
    status: 'published',
    seoDescription: 'Digital forest management plans and AI decision support for Swedish forest owners.',
    body: `## Fr\u00e5n papper till pixlar\n\nDen traditionella skogsbruksplanen \u2014 en tjock p\u00e4rm med kartor och best\u00e5ndsbeskrivningar \u2014 h\u00e5ller p\u00e5 att ers\u00e4ttas av dynamiska digitala verktyg.\n\n## Vad BeetleSense erbjuder\n\n- Realtidsuppdaterade best\u00e5ndsdata fr\u00e5n satellit och dr\u00f6nare\n- AI-genererade sk\u00f6tself\u00f6rslag baserade p\u00e5 aktuella marknadsdata\n- Automatisk integration med Skogsstyrelsens registerdata\n- Delningsfunktion f\u00f6r samarbete med virkesuppk\u00f6pare och inspektorer\n\n## F\u00f6rdelar f\u00f6r sm\u00e5skogsbrukare\n\nF\u00f6r de 320,000 privata skogs\u00e4garna i Sverige inneb\u00e4r digitalisering b\u00e4ttre \u00f6versikt, snabbare beslut och h\u00f6gre l\u00f6nsamhet. En studie fr\u00e5n LRF visar att digitala verktyg kan \u00f6ka nettov\u00e4rdet med 8-12%.`,
  },
  {
    id: 'b9',
    title: 'Drone Pilot Certification: Requirements and Best Practices in Sweden',
    excerpt: 'Everything you need to know about getting certified as a drone pilot for forestry surveys under Swedish and EU regulations.',
    slug: 'drone-pilot-certification-sweden',
    published_at: '2026-01-20T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Regulatory Updates',
    author: 'Karin Bergstr\u00f6m',
    authorRole: 'Regulatory Affairs, BeetleSense',
    readTime: 9,
    status: 'published',
    seoDescription: 'Swedish drone pilot certification requirements for forestry surveys.',
    body: `## EU Drone Regulations in Sweden\n\nSince January 2024, all drone operations in Sweden follow the EU framework managed by Transportstyrelsen. For forestry surveys, pilots typically operate in the Specific category.\n\n## Required Certifications\n\n- A2 Certificate of Competency (minimum)\n- Operational authorization for BVLOS flights\n- Insurance meeting minimum EU requirements\n\n## Best Practices for Forest Surveys\n\n- Fly at 80-120m AGL for optimal resolution\n- Use 80% front overlap and 70% side overlap\n- Plan flights during overcast conditions to reduce shadows\n- Avoid flights during high winds (>8 m/s)\n\n## Joining the BeetleSense Pilot Network\n\nWe are actively recruiting certified drone pilots across Sweden. Our platform matches forest owners with nearby pilots and handles scheduling, payment, and data processing automatically.`,
  },
  {
    id: 'b10',
    title: 'Carbon Credits from Swedish Forests: Opportunity or Greenwashing?',
    excerpt: 'An honest look at the emerging voluntary carbon market for Swedish forestry and what it means for small-scale forest owners.',
    slug: 'carbon-credits-swedish-forests',
    published_at: '2026-01-15T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Climate & Ecology',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 11,
    status: 'published',
    seoDescription: 'Analysis of voluntary carbon credit opportunities for Swedish forest owners.',
    body: `## The Carbon Credit Landscape\n\nVoluntary carbon markets are growing rapidly, with forest carbon credits being among the most sought-after. But is this a real opportunity for Swedish forest owners, or just h\u00e4gring?\n\n## How Forest Carbon Credits Work\n\n- **Afforestation/Reforestation**: Planting new forests on non-forested land\n- **Improved Forest Management (IFM)**: Adopting practices that increase carbon storage\n- **Avoided Deforestation**: Protecting forests that would otherwise be cleared\n\n## The Swedish Context\n\nSweden's forests already store approximately 3.2 billion tonnes of CO2. The question is whether additional management practices can generate creditable carbon offsets beyond the baseline.\n\n## Our Carbon Module\n\nBeetleSense's Carbon Tracking module uses satellite-derived biomass estimates and growth models to calculate the carbon sequestration potential of your forest. While we don't sell credits directly, we provide the monitoring, reporting, and verification (MRV) data that credit programs require.`,
  },
  {
    id: 'b11',
    title: 'BeetleSense Partners with Skogsstyrelsen for National Beetle Monitoring',
    excerpt: 'We are proud to announce a pilot partnership with the Swedish Forest Agency to expand our monitoring network across G\u00f6taland.',
    slug: 'skogsstyrelsen-partnership',
    published_at: '2026-01-10T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Company News',
    author: 'Maria Johansson',
    authorRole: 'CEO, BeetleSense',
    readTime: 4,
    status: 'published',
    seoDescription: 'BeetleSense partnership with Skogsstyrelsen for bark beetle monitoring.',
    body: `## A Major Milestone\n\nWe are thrilled to announce that BeetleSense has entered a pilot partnership with Skogsstyrelsen (the Swedish Forest Agency) to enhance national bark beetle monitoring.\n\n## Scope of the Partnership\n\n- Coverage of 2.3 million hectares across G\u00f6taland\n- Integration with Skogsstyrelsen's existing monitoring infrastructure\n- Shared data standards for interoperability\n- Joint research on predictive outbreak modeling\n\n## What This Means for Forest Owners\n\nForest owners in the pilot region will receive enhanced monitoring at no additional cost. Our satellite-derived risk assessments will be cross-referenced with Skogsstyrelsen's ground survey data for improved accuracy.\n\n## Next Steps\n\nThe pilot runs from March to October 2026. Based on results, we aim to expand coverage to Svealand in 2027.`,
  },
  {
    id: 'b12',
    title: 'LiDAR vs. Photogrammetry: Choosing the Right Sensor for Forest Surveys',
    excerpt: 'A comparison of LiDAR point clouds and photogrammetric DSM for measuring tree height, canopy density, and timber volume.',
    slug: 'lidar-vs-photogrammetry',
    published_at: '2026-01-05T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Technology',
    author: 'Anna Svensson',
    authorRole: 'Head of Remote Sensing, BeetleSense',
    readTime: 13,
    status: 'published',
    seoDescription: 'Comparison of LiDAR and photogrammetry sensors for forest inventory surveys.',
    body: `## Sensor Selection for Forest Inventory\n\nChoosing between LiDAR and photogrammetry depends on your objectives, budget, and the type of forest you're surveying.\n\n## LiDAR Advantages\n\n- Penetrates canopy to measure ground elevation\n- Accurate tree height measurements (\u00b10.5m)\n- Works in all lighting conditions\n- Measures canopy density and vertical structure\n\n## Photogrammetry Advantages\n\n- Lower hardware cost (standard RGB camera)\n- Higher spatial resolution for crown delineation\n- Color information for species classification\n- Faster processing for large areas\n\n## Our Recommendation\n\nFor comprehensive forest inventory, we recommend a hybrid approach: use Lantm\u00e4teriet's national LiDAR data (Nationell H\u00f6jdmodell) for terrain modeling and combine it with fresh photogrammetric drone data for current canopy analysis.\n\n## BeetleSense Processing Pipeline\n\nOur platform automatically integrates both data sources. Upload your drone imagery and we handle the rest \u2014 point cloud generation, DTM/DSM extraction, individual tree detection, and volume estimation.`,
  },
  {
    id: 'b13',
    title: 'Stormskador och barkborreangrepp: S\u00e5 h\u00e4nger det ihop',
    excerpt: 'Efter stormar som Gudrun och Per \u00f6kade barkborreskadorna dramatiskt. L\u00e4r dig sambandet och hur du skyddar din skog.',
    slug: 'storm-damage-beetle-connection',
    published_at: '2025-12-28T10:00:00Z',
    locale: 'sv',
    cover_url: null,
    category: 'Bark Beetle Research',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 7,
    status: 'published',
    seoDescription: 'The connection between storm damage and bark beetle outbreaks in Swedish forests.',
    body: `## Stormarna som f\u00f6r\u00e4ndrade svenskt skogsbruk\n\nStormen Gudrun (2005) f\u00e4llde 75 miljoner kubikmeter skog p\u00e5 en natt. I \u00e5ren som f\u00f6ljde exploderade granbarkborrepopulationen till historiska niv\u00e5er.\n\n## Sambandet\n\nStormf\u00e4lld skog ger barkborren obegr\u00e4nsat med yngelmaterial. Stressade tr\u00e4d i kantzoner har nedsatt motst\u00e5ndskraft. Rotskadade men st\u00e5ende tr\u00e4d blir l\u00e4tta m\u00e5l.\n\n## Tidslinjen\n\n- **\u00c5r 1 efter stormen**: Barkborren f\u00f6r\u00f6kar sig i vindf\u00e4llen\n- **\u00c5r 2-3**: Populationen v\u00e4xer och angriper st\u00e5ende skog\n- **\u00c5r 4-5**: Utbrottet n\u00e5r sin topp\n- **\u00c5r 6+**: Gradvis \u00e5terg\u00e5ng om \u00e5tg\u00e4rder vidtagits\n\n## F\u00f6rebyggande \u00e5tg\u00e4rder\n\nSnabb upparbetning av stormskadad skog \u00e4r avg\u00f6rande. BeetleSense hj\u00e4lper dig identifiera skadade omr\u00e5den med satellit\u00f6vervakning s\u00e5 att du kan prioritera r\u00e4tt.`,
  },
  {
    id: 'b14',
    title: 'Timber Market Outlook: Spring 2026 Price Forecast',
    excerpt: 'Analysis of current sawlog and pulpwood prices in Sweden, with predictions for the spring harvesting season.',
    slug: 'timber-market-spring-2026',
    published_at: '2025-12-20T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Forest Management',
    author: 'Johan Ekstr\u00f6m',
    authorRole: 'Forest Management Advisor',
    readTime: 6,
    status: 'published',
    seoDescription: 'Spring 2026 timber price forecast for Swedish sawlog and pulpwood markets.',
    body: `## Current Market Conditions\n\nSwedish sawlog prices have stabilized after the volatility of 2024-2025. Current prices for spruce sawlog range from 620-680 SEK/m3fub depending on region and quality.\n\n## Price Drivers\n\n- **Housing construction**: Boverket projects 63,000 new builds in 2026, supporting demand\n- **Export markets**: Strong demand from UK and Middle East\n- **Beetle-damaged timber**: Increasing supply of salvage logs pushing prices down in affected regions\n- **Energy prices**: Pulpwood and bioenergy demand remains strong\n\n## Regional Variations\n\n- **G\u00f6taland**: Prices under pressure due to beetle salvage supply\n- **Svealand**: Stable, moderate demand\n- **Norrland**: Premium prices due to limited beetle impact\n\n## Our Recommendation\n\nIf you have beetle-damaged timber, sell now before quality deteriorates further. For healthy stands, consider holding until late spring when construction demand peaks.`,
  },
  {
    id: 'b15',
    title: 'How We Built Our ONNX Inference Pipeline for Edge Deployment',
    excerpt: 'Engineering deep-dive into our model optimization and deployment strategy for real-time forest health inference.',
    slug: 'onnx-inference-pipeline',
    published_at: '2025-12-15T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Technology',
    author: 'Anna Svensson',
    authorRole: 'Head of Remote Sensing, BeetleSense',
    readTime: 14,
    status: 'published',
    seoDescription: 'Technical guide to BeetleSense ONNX model optimization and deployment pipeline.',
    body: `## From PyTorch to Production\n\nTraining a good model is only half the battle. Getting it to run efficiently in production at scale requires careful engineering.\n\n## Our Tech Stack\n\n- Training: PyTorch with mixed-precision (AMP)\n- Export: TorchScript -> ONNX (opset 18)\n- Optimization: ONNX Runtime with TensorRT EP\n- Serving: FastAPI with async batch inference\n- Orchestration: BullMQ job queues on Redis\n\n## Performance Numbers\n\n- Model size: 84MB (FP16 quantized, down from 340MB FP32)\n- Inference time: 12ms per tile (512x512) on NVIDIA T4\n- Throughput: 83 tiles/second per GPU\n- End-to-end survey processing: ~4 minutes for 100ha\n\n## Batch Processing Strategy\n\nWhen a drone survey is uploaded, our BullMQ workers tile the orthomosaic, queue inference jobs, and aggregate results. The entire pipeline is observable via Prometheus metrics and Grafana dashboards.`,
  },
  {
    id: 'b16',
    title: 'Biodiversity Monitoring: Beyond Bark Beetles',
    excerpt: 'How drone and satellite data can support biodiversity assessments, nyckelbiotop identification, and nature conservation.',
    slug: 'biodiversity-monitoring',
    published_at: '2025-12-10T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Climate & Ecology',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 8,
    status: 'published',
    seoDescription: 'Using remote sensing for biodiversity monitoring and conservation in Swedish forests.',
    body: `## Beyond Pest Detection\n\nWhile BeetleSense started with bark beetle detection, our remote sensing capabilities have much broader applications for biodiversity monitoring.\n\n## Nyckelbiotop Identification\n\nNyckelbiotoper (key habitats) are small areas with high conservation value. Our multispectral analysis can help identify:\n\n- Old-growth characteristics (dead wood density, canopy gaps)\n- Species diversity indicators\n- Wetland and riparian buffer zones\n- \u00c4delgranslundar and other rare forest types\n\n## Dead Wood Mapping\n\nDead wood (d\u00f6d ved) is crucial for forest biodiversity. Our LiDAR processing pipeline can detect and quantify standing dead trees and fallen logs, helping forest owners meet FSC/PEFC certification requirements.\n\n## Integration with Artdatabanken\n\nWe are exploring data sharing with Artdatabanken (the Swedish Species Information Centre) to overlay species observation data with our remote sensing layers.`,
  },
  {
    id: 'b17',
    title: 'BeetleSense Q4 2025 Product Update',
    excerpt: 'New features shipped in Q4: field mode, storm risk maps, carbon tracking, and 14 other improvements.',
    slug: 'q4-2025-product-update',
    published_at: '2025-12-05T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Company News',
    author: 'Maria Johansson',
    authorRole: 'CEO, BeetleSense',
    readTime: 5,
    status: 'published',
    seoDescription: 'BeetleSense Q4 2025 product update with new features and improvements.',
    body: `## What We Shipped in Q4 2025\n\nIt's been our biggest quarter yet. Here are the highlights:\n\n## Major Features\n\n- **Field Mode**: Offline-capable mobile view for on-site forest inspections\n- **Storm Risk Maps**: Wind damage probability overlays using SMHI forecast data\n- **Carbon Tracking**: Biomass estimation and carbon sequestration monitoring\n- **Harvest Logistics**: Route planning and contractor scheduling tools\n\n## Improvements\n\n- 40% faster survey processing pipeline\n- Swedish language support (finally!)\n- Dark mode refinements\n- Improved mobile responsiveness\n- PDF report export with custom branding\n\n## Community Growth\n\n- 1,247 registered forest owners (up 340% from Q3)\n- 89 certified drone pilots in our network\n- 23 inspector organizations onboarded\n\n## What's Next\n\nQ1 2026 focus areas: AI Companion chat, professional directory, and Skogsstyrelsen integration.`,
  },
  {
    id: 'b18',
    title: 'Pheromone Trap Networks: Combining Traditional and Digital Monitoring',
    excerpt: 'How IoT-connected pheromone traps complement satellite data for comprehensive bark beetle surveillance.',
    slug: 'pheromone-trap-iot-network',
    published_at: '2025-12-01T10:00:00Z',
    locale: 'en',
    cover_url: null,
    category: 'Bark Beetle Research',
    author: 'Dr. Erik Lindgren',
    authorRole: 'Chief Entomologist, BeetleSense',
    readTime: 9,
    status: 'published',
    seoDescription: 'IoT pheromone trap networks for bark beetle monitoring integrated with satellite data.',
    body: `## The Best of Both Worlds\n\nPheromone traps (feromonfällor) have been used for bark beetle monitoring since the 1970s. Now, IoT connectivity is transforming them from passive tools into active sensor networks.\n\n## How IoT Traps Work\n\n- Solar-powered sensors count trapped beetles using infrared beam breaks\n- Data transmitted via LoRaWAN or NB-IoT every 4 hours\n- Cloud dashboard shows real-time trap counts across the network\n- Automated alerts when catch rates exceed thresholds\n\n## Integration with BeetleSense\n\nWe are piloting integration of IoT trap data with our satellite monitoring. When trap counts spike in an area, we increase satellite monitoring frequency and prioritize drone surveys for nearby parcels.\n\n## Research Partnership with SLU\n\nIn collaboration with SLU's Department of Ecology, we are conducting a two-year study comparing detection timing between traditional traps, IoT traps, and satellite monitoring. Preliminary results suggest the combination detects outbreaks 31 days earlier than any single method alone.\n\n## Trap Placement Guidelines\n\n- Deploy at forest edges, especially south-facing\n- Space traps 200-400m apart for adequate coverage\n- Place at 1.5m height for Ips typographus\n- Activate by early April in southern Sweden`,
  },
];
