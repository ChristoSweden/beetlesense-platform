/**
 * useEarlyDetection — Detection alerts, NDVI change detection, risk propagation,
 * community sightings, and response time statistics.
 *
 * Beetle biology reference:
 * - Ips typographus flight distance: 2–5 km typical, up to 40 km under wind
 * - Stressed trees (drought, storm damage) are 10× more vulnerable
 * - Detection → action response time target: < 3 days
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
// Demo data is always used for now; live mode will use Supabase detection results

// ─── Types ───

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'critical';
export type AlertSource = 'satellite' | 'community' | 'trap' | 'drone' | 'neighbor';
export type AlertStatus = 'active' | 'investigating' | 'confirmed' | 'resolved' | 'false_positive';

export interface DetectionAlert {
  id: string;
  parcelId: string;
  parcelName: string;
  severity: AlertSeverity;
  source: AlertSource;
  status: AlertStatus;
  title: string;
  description: string;
  detectedAt: string;
  updatedAt: string;
  location: [number, number]; // [lng, lat]
  affectedAreaHa: number;
  ndviDrop?: number;        // percentage
  confidence: number;       // 0-100
  responseActions: string[];
}

export interface CommunitySighting {
  id: string;
  reporterName: string;
  distance: number;         // km from nearest parcel
  direction: string;        // compass direction
  reportedAt: string;
  description: string;
  confirmed: boolean;
  location: [number, number];
  severity: AlertSeverity;
}

export interface TrapData {
  id: string;
  parcelId: string;
  parcelName: string;
  trapType: string;
  lastReading: string;
  catchCount: number;
  weeklyTrend: 'increasing' | 'stable' | 'decreasing';
  threshold: number;
  isAboveThreshold: boolean;
  weeklyHistory: { week: string; count: number }[];
}

export interface RiskPropagation {
  sourceParcelName: string;
  targetParcelId: string;
  targetParcelName: string;
  distance: number;          // km
  probability: number;       // 0-100
  estimatedWeeks: number;
  windExposure: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface ResponseStats {
  avgDetectionToAction: number;   // days
  avgActionToResolution: number;  // days
  totalAlertsThisSeason: number;
  resolvedAlerts: number;
  falsePositiveRate: number;      // percentage
  bestResponseTime: number;       // days
  worstResponseTime: number;      // days
  recentResponses: { alertId: string; parcelName: string; detectedAt: string; actionAt: string; daysTaken: number }[];
}

export interface NDVIChangeResult {
  parcelId: string;
  parcelName: string;
  standNumber: string;
  previousNdvi: number;
  currentNdvi: number;
  changePct: number;
  changeDate: string;
  isSignificant: boolean;
  possibleCauses: string[];
}

export interface ActionChecklist {
  riskLevel: AlertSeverity;
  items: { id: string; label: string; completed: boolean; priority: 'high' | 'medium' | 'low' }[];
}

export interface UseEarlyDetectionReturn {
  alerts: DetectionAlert[];
  communitySightings: CommunitySighting[];
  trapData: TrapData[];
  riskPropagations: RiskPropagation[];
  responseStats: ResponseStats;
  ndviChanges: NDVIChangeResult[];
  actionChecklists: ActionChecklist[];
  loading: boolean;
  error: string | null;
  activeAlertCount: number;
  criticalCount: number;
  refresh: () => void;
}

// ─── Demo Data ───

const DEMO_ALERTS: DetectionAlert[] = [
  {
    id: 'da-1',
    parcelId: 'p4',
    parcelName: 'Granudden',
    severity: 'critical',
    source: 'satellite',
    status: 'confirmed',
    title: 'Bekräftad barkborreangrepp — Avd. 3',
    description: 'Sentinel-2 NDVI-analys visar kraftigt fall (-47%) i granbestånd. Drönarundersökning bekräftar aktivt angrepp med synligt borrmjöl och kronförgröning.',
    detectedAt: '2026-03-02T08:00:00Z',
    updatedAt: '2026-03-08T14:00:00Z',
    location: [14.105, 57.218],
    affectedAreaHa: 4.2,
    ndviDrop: 47,
    confidence: 96,
    responseActions: [
      'Drönarundersökning genomförd 2026-03-05',
      'Avverkning beställd 2026-03-08',
      'Feromonfällor utplacerade 2026-03-09',
    ],
  },
  {
    id: 'da-2',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    severity: 'danger',
    source: 'satellite',
    status: 'investigating',
    title: 'NDVI-avvikelse detekterad — Avd. 7',
    description: 'Spectral anomaly detected in spruce stand. NDVI dropped 28% from 3-year baseline. Drone survey ordered.',
    detectedAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-14T09:00:00Z',
    location: [14.045, 57.195],
    affectedAreaHa: 6.8,
    ndviDrop: 28,
    confidence: 82,
    responseActions: [
      'Drönarundersökning beställd 2026-03-12',
    ],
  },
  {
    id: 'da-3',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    severity: 'warning',
    source: 'community',
    status: 'active',
    title: 'Grannrapport: Misstänkt angrepp 2,3 km bort',
    description: 'Skogsägare på Lidvägen rapporterar brunt borrmjöl vid granstam ca 2,3 km nordväst om Norra Skogen.',
    detectedAt: '2026-03-13T16:00:00Z',
    updatedAt: '2026-03-13T16:00:00Z',
    location: [14.025, 57.205],
    affectedAreaHa: 0,
    confidence: 65,
    responseActions: [],
  },
  {
    id: 'da-4',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    severity: 'warning',
    source: 'satellite',
    status: 'active',
    title: 'Svag NDVI-trend — Avd. 5',
    description: 'Gradual NDVI decline of 14% over 6 weeks in mixed spruce/pine stand. May indicate early-stage stress or drought.',
    detectedAt: '2026-03-14T08:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
    location: [14.155, 57.775],
    affectedAreaHa: 2.5,
    ndviDrop: 14,
    confidence: 58,
    responseActions: [],
  },
  {
    id: 'da-5',
    parcelId: 'p4',
    parcelName: 'Granudden',
    severity: 'info',
    source: 'trap',
    status: 'active',
    title: 'Feromonfälla: Ökande fångst',
    description: 'Fälla #3 vid Granudden visar ökande fångster senaste veckan. 124 individer — över varningströskeln 100.',
    detectedAt: '2026-03-15T07:00:00Z',
    updatedAt: '2026-03-16T07:00:00Z',
    location: [14.112, 57.225],
    affectedAreaHa: 0,
    confidence: 90,
    responseActions: [],
  },
  {
    id: 'da-6',
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    severity: 'info',
    source: 'satellite',
    status: 'resolved',
    title: 'NDVI-avvikelse — falsk positiv (löv-säsong)',
    description: 'Initial NDVI drop attributed to seasonal deciduous leaf patterns in oak stand. No beetle activity confirmed.',
    detectedAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-03-01T14:00:00Z',
    location: [13.535, 57.305],
    affectedAreaHa: 1.8,
    ndviDrop: 12,
    confidence: 45,
    responseActions: [
      'Fältinspektion genomförd 2026-02-25 — ingen barkborraktivitet',
      'Markerad som falsk positiv 2026-03-01',
    ],
  },
];

const DEMO_SIGHTINGS: CommunitySighting[] = [
  {
    id: 'cs-1',
    reporterName: 'Anders L.',
    distance: 2.3,
    direction: 'NV',
    reportedAt: '2026-03-13T16:00:00Z',
    description: 'Borrmjöl vid granstam, ca 15 träd med synliga ingångshål.',
    confirmed: false,
    location: [14.025, 57.205],
    severity: 'warning',
  },
  {
    id: 'cs-2',
    reporterName: 'Maria K.',
    distance: 4.8,
    direction: 'Ö',
    reportedAt: '2026-03-10T09:00:00Z',
    description: 'Kronförgröning i granbestånd, uppskattningsvis 30-40 träd påverkade.',
    confirmed: true,
    location: [14.18, 57.19],
    severity: 'danger',
  },
  {
    id: 'cs-3',
    reporterName: 'Erik S.',
    distance: 8.1,
    direction: 'S',
    reportedAt: '2026-03-06T14:00:00Z',
    description: 'Hackspettaktivitet i stormskadade granar. Möjlig barkborrehärd.',
    confirmed: false,
    location: [14.05, 57.12],
    severity: 'info',
  },
  {
    id: 'cs-4',
    reporterName: 'Lisa B.',
    distance: 1.5,
    direction: 'SV',
    reportedAt: '2026-03-15T11:00:00Z',
    description: 'Stormfälld gran med färskt borrmjöl i Västerskogen.',
    confirmed: true,
    location: [14.02, 57.18],
    severity: 'warning',
  },
];

const DEMO_TRAP_DATA: TrapData[] = [
  {
    id: 'trap-1',
    parcelId: 'p4',
    parcelName: 'Granudden',
    trapType: 'Feromonfälla Ips typographus',
    lastReading: '2026-03-16T07:00:00Z',
    catchCount: 124,
    weeklyTrend: 'increasing',
    threshold: 100,
    isAboveThreshold: true,
    weeklyHistory: [
      { week: 'V8', count: 12 }, { week: 'V9', count: 28 }, { week: 'V10', count: 56 },
      { week: 'V11', count: 89 }, { week: 'V12', count: 124 },
    ],
  },
  {
    id: 'trap-2',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    trapType: 'Feromonfälla Ips typographus',
    lastReading: '2026-03-16T07:00:00Z',
    catchCount: 45,
    weeklyTrend: 'increasing',
    threshold: 100,
    isAboveThreshold: false,
    weeklyHistory: [
      { week: 'V8', count: 5 }, { week: 'V9', count: 12 }, { week: 'V10', count: 22 },
      { week: 'V11', count: 34 }, { week: 'V12', count: 45 },
    ],
  },
  {
    id: 'trap-3',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    trapType: 'Feromonfälla Ips typographus',
    lastReading: '2026-03-16T07:00:00Z',
    catchCount: 8,
    weeklyTrend: 'stable',
    threshold: 100,
    isAboveThreshold: false,
    weeklyHistory: [
      { week: 'V8', count: 3 }, { week: 'V9', count: 5 }, { week: 'V10', count: 7 },
      { week: 'V11', count: 6 }, { week: 'V12', count: 8 },
    ],
  },
];

const DEMO_RISK_PROPAGATIONS: RiskPropagation[] = [
  {
    sourceParcelName: 'Bekräftat angrepp (Anders L.)',
    targetParcelId: 'p1',
    targetParcelName: 'Norra Skogen',
    distance: 2.3,
    probability: 42,
    estimatedWeeks: 3,
    windExposure: 'high',
    factors: [
      'Rådande sydvästlig vind gynnar spridning',
      'Hög andel gran (65%) i målbestånd',
      'Torka-stress ökar mottagligheten',
    ],
  },
  {
    sourceParcelName: 'Granudden (bekräftad härjning)',
    targetParcelId: 'p1',
    targetParcelName: 'Norra Skogen',
    distance: 3.1,
    probability: 35,
    estimatedWeeks: 4,
    windExposure: 'medium',
    factors: [
      'Aktiv härjning med >400 angripna träd',
      'Terräng ger delvis vindskydd',
      'Svärmningsperiod startar inom 4 veckor',
    ],
  },
  {
    sourceParcelName: 'Maria K. rapporterad härjning',
    targetParcelId: 'p4',
    targetParcelName: 'Granudden',
    distance: 4.8,
    probability: 28,
    estimatedWeeks: 5,
    windExposure: 'medium',
    factors: [
      'Redan pågående angrepp kan förvärras',
      'Hög andel gran (85%)',
      'Stressade träd efter torka',
    ],
  },
  {
    sourceParcelName: 'Granudden (bekräftad härjning)',
    targetParcelId: 'p3',
    targetParcelName: 'Tallmon',
    distance: 12.5,
    probability: 8,
    estimatedWeeks: 8,
    windExposure: 'low',
    factors: [
      'Långt avstånd minskar risk',
      'Låg andel gran (20%)',
      'Tallmon domineras av tall som ej är värdväxt',
    ],
  },
];

const DEMO_RESPONSE_STATS: ResponseStats = {
  avgDetectionToAction: 4.2,
  avgActionToResolution: 12.5,
  totalAlertsThisSeason: 8,
  resolvedAlerts: 3,
  falsePositiveRate: 11,
  bestResponseTime: 1,
  worstResponseTime: 9,
  recentResponses: [
    { alertId: 'da-1', parcelName: 'Granudden', detectedAt: '2026-03-02', actionAt: '2026-03-05', daysTaken: 3 },
    { alertId: 'da-6', parcelName: 'Ekbacken', detectedAt: '2026-02-20', actionAt: '2026-02-25', daysTaken: 5 },
    { alertId: 'hist-1', parcelName: 'Norra Skogen', detectedAt: '2025-08-14', actionAt: '2025-08-15', daysTaken: 1 },
  ],
};

const DEMO_NDVI_CHANGES: NDVIChangeResult[] = [
  {
    parcelId: 'p4',
    parcelName: 'Granudden',
    standNumber: 'Avd. 3',
    previousNdvi: 0.78,
    currentNdvi: 0.31,
    changePct: -60.3,
    changeDate: '2026-03-08',
    isSignificant: true,
    possibleCauses: ['Barkborreangrepp (bekräftat)', 'Torkstress'],
  },
  {
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    standNumber: 'Avd. 7',
    previousNdvi: 0.76,
    currentNdvi: 0.52,
    changePct: -31.6,
    changeDate: '2026-03-12',
    isSignificant: true,
    possibleCauses: ['Möjligt barkborreangrepp', 'Vindskada'],
  },
  {
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    standNumber: 'Avd. 2',
    previousNdvi: 0.77,
    currentNdvi: 0.62,
    changePct: -19.5,
    changeDate: '2026-03-14',
    isSignificant: true,
    possibleCauses: ['Stressindikation', 'Torkeffekt'],
  },
  {
    parcelId: 'p3',
    parcelName: 'Tallmon',
    standNumber: 'Avd. 5',
    previousNdvi: 0.79,
    currentNdvi: 0.64,
    changePct: -19.0,
    changeDate: '2026-03-15',
    isSignificant: true,
    possibleCauses: ['Svag stressindikation', 'Torka'],
  },
  {
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    standNumber: 'Avd. 1',
    previousNdvi: 0.74,
    currentNdvi: 0.71,
    changePct: -4.1,
    changeDate: '2026-03-10',
    isSignificant: false,
    possibleCauses: ['Normal säsongsvariation'],
  },
];

const DEMO_CHECKLISTS: ActionChecklist[] = [
  {
    riskLevel: 'critical',
    items: [
      { id: 'c1', label: 'Genomför fältinspektion inom 24 timmar', completed: true, priority: 'high' },
      { id: 'c2', label: 'Beställ sanitetsavverkning', completed: true, priority: 'high' },
      { id: 'c3', label: 'Meddela Skogsstyrelsen', completed: false, priority: 'high' },
      { id: 'c4', label: 'Placera feromonfällor runt angreppsområde', completed: true, priority: 'medium' },
      { id: 'c5', label: 'Informera angränsande skogsägare', completed: false, priority: 'medium' },
      { id: 'c6', label: 'Dokumentera med foton för försäkring', completed: false, priority: 'low' },
    ],
  },
  {
    riskLevel: 'danger',
    items: [
      { id: 'd1', label: 'Beställ drönarundersökning', completed: true, priority: 'high' },
      { id: 'd2', label: 'Inspektera misstänkt område inom 3 dagar', completed: false, priority: 'high' },
      { id: 'd3', label: 'Kontrollera angränsande bestånd', completed: false, priority: 'medium' },
      { id: 'd4', label: 'Förbered avverkningsresurser', completed: false, priority: 'medium' },
    ],
  },
  {
    riskLevel: 'warning',
    items: [
      { id: 'w1', label: 'Övervaka NDVI-trend veckovis', completed: false, priority: 'medium' },
      { id: 'w2', label: 'Kontrollera feromonfällor', completed: false, priority: 'medium' },
      { id: 'w3', label: 'Inspektera stormskadade träd', completed: false, priority: 'low' },
    ],
  },
];

// ─── Hook ───

export function useEarlyDetection(): UseEarlyDetectionReturn {
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const data = useMemo(() => {
    const alerts = [...DEMO_ALERTS].sort((a, b) => {
      const order: Record<AlertSeverity, number> = { critical: 0, danger: 1, warning: 2, info: 3 };
      return order[a.severity] - order[b.severity];
    });

    const activeAlertCount = alerts.filter((a) => a.status !== 'resolved' && a.status !== 'false_positive').length;
    const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;

    return {
      alerts,
      communitySightings: DEMO_SIGHTINGS,
      trapData: DEMO_TRAP_DATA,
      riskPropagations: DEMO_RISK_PROPAGATIONS,
      responseStats: DEMO_RESPONSE_STATS,
      ndviChanges: DEMO_NDVI_CHANGES,
      actionChecklists: DEMO_CHECKLISTS,
      activeAlertCount,
      criticalCount,
    };
  }, [refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  return { ...data, loading, error, refresh };
}
