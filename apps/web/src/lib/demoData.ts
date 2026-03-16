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
    source_url: '#',
    category: 'BEETLE_OUTBREAKS',
    published_at: '2026-03-14T08:00:00Z',
    combined_score: 0.95,
  },
  {
    id: 'n2',
    title: 'New EU Forest Monitoring Regulation adopted — what it means for Swedish landowners',
    snippet: 'The EU Forest Monitoring Regulation mandates satellite-based health monitoring across all member states. Sweden to implement national reporting framework by 2027.',
    source: 'European Commission',
    source_url: '#',
    category: 'REGULATIONS',
    published_at: '2026-03-12T10:00:00Z',
    combined_score: 0.82,
  },
  {
    id: 'n3',
    title: 'Timber prices rise 8% in Q1 as supply tightens after storm damage',
    snippet: 'Swedish timber prices have risen sharply following widespread storm damage in January. Sawlog prices now SEK 580/m³, pulpwood SEK 320/m³.',
    source: 'Virkesbörsen',
    source_url: '#',
    category: 'MARKET_PRICES',
    published_at: '2026-03-10T14:00:00Z',
    combined_score: 0.78,
  },
  {
    id: 'n4',
    title: 'SLU study: drone-based detection outperforms satellite for early-stage infestations',
    snippet: 'Researchers at SLU found that sub-5cm drone imagery detects beetle damage 3–4 weeks earlier than Sentinel-2 NDVI, with 91% accuracy vs 67% for satellite alone.',
    source: 'SLU Forest Faculty',
    source_url: '#',
    category: 'TECHNOLOGY',
    published_at: '2026-03-08T09:00:00Z',
    combined_score: 0.88,
  },
  {
    id: 'n5',
    title: 'Record drought stress across Nordic forests — SMHI climate outlook',
    snippet: 'SMHI forecasts below-average precipitation through May 2026, raising concerns about drought stress in coniferous forests and increased fire risk.',
    source: 'SMHI',
    source_url: '#',
    category: 'CLIMATE_IMPACT',
    published_at: '2026-03-06T11:00:00Z',
    combined_score: 0.85,
  },
  {
    id: 'n6',
    title: 'Lantmäteriet releases updated national LiDAR dataset — 1 pt/m² coverage complete',
    snippet: 'The updated laser scanning dataset now covers 100% of Sweden with improved point density, enabling more accurate canopy height models and terrain analysis.',
    source: 'Lantmäteriet',
    source_url: '#',
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
}

export const DEMO_BLOG_POSTS: DemoBlogPost[] = [
  {
    id: 'b1',
    title: 'Understanding Bark Beetle Biology: A Guide for Forest Owners',
    excerpt: 'Learn how Ips typographus reproduces, spreads, and what environmental conditions trigger outbreaks in Nordic forests.',
    slug: 'bark-beetle-biology-guide',
    published_at: '2026-03-01T10:00:00Z',
    locale: 'en',
    cover_url: null,
  },
  {
    id: 'b2',
    title: 'How Satellite + Drone Fusion Improves Detection Accuracy',
    excerpt: 'A technical overview of how BeetleSense combines Sentinel-2 NDVI time-series with sub-5cm drone imagery for early detection.',
    slug: 'satellite-drone-fusion',
    published_at: '2026-02-15T10:00:00Z',
    locale: 'en',
    cover_url: null,
  },
  {
    id: 'b3',
    title: '5 Steps to Protect Your Forest Before Beetle Season',
    excerpt: 'Practical tips from SLU researchers on preparing your forest holdings for the spring bark beetle flight season.',
    slug: 'protect-forest-beetle-season',
    published_at: '2026-02-01T10:00:00Z',
    locale: 'en',
    cover_url: null,
  },
];
