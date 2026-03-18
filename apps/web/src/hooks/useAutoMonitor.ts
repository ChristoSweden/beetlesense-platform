/**
 * useAutoMonitor — Hook for Autonomous Monitoring Orchestration.
 * Provides pipeline events, automation rules, and performance metrics.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ───

export type PipelineStageStatus = 'complete' | 'active' | 'pending' | 'skipped';

export interface PipelineStage {
  id: string;
  name: string;
  nameEn: string;
  icon: string; // lucide icon name
  status: PipelineStageStatus;
  timestamp: string | null;
  confidence: number | null;
  duration: string | null;
  detail: string;
  aiReasoning?: string;
  rawData?: string;
}

export type PipelineStatus = 'completed' | 'active' | 'pending';
export type ThreatType = 'beetle' | 'storm' | 'drought' | 'false_alarm';

export interface PipelineEvent {
  id: string;
  parcel: string;
  parcelId: string;
  threatType: ThreatType;
  status: PipelineStatus;
  startedAt: string;
  totalDuration: string | null;
  stages: PipelineStage[];
  summary: string;
}

export type EventType = 'detection' | 'analysis' | 'dispatch' | 'scan' | 'classification' | 'action' | 'rule_triggered' | 'system';
export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface FeedEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  timestamp: string;
  parcel: string;
  title: string;
  description: string;
  pipelineId?: string;
  isRecent: boolean; // < 1h ago
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  triggerThreshold: number;
  conditionThreshold: number;
  executionCount: number;
  lastExecuted: string | null;
  category: 'detection' | 'response' | 'monitoring' | 'emergency';
}

export interface PerformanceStats {
  avgDetectionToAction: number; // hours
  falsePositiveRate: number; // %
  droneDispatchSuccess: number; // %
  areasMonitored: number; // ha
  satellitePasses: number; // per month
  costPerDetection: number; // SEK
  manualCostPerDetection: number; // SEK
  timeSaved: number; // hours/month
  trends: {
    detectionTime: number[];
    falsePositiveRate: number[];
    dispatchSuccess: number[];
    months: string[];
  };
}

// ─── Demo Data ───

function buildDemoPipelines(): PipelineEvent[] {
  return [
    {
      id: 'pipe-1',
      parcel: 'Granudden',
      parcelId: 'p4',
      threatType: 'beetle',
      status: 'completed',
      startedAt: '2026-03-02T08:12:00Z',
      totalDuration: '6h 15min',
      summary: 'Barkborreangrepp grad 2 bekräftat. Grannar varnade, försäkringsärende påbörjat.',
      stages: [
        {
          id: 's1-1', name: 'Satellitdetektering', nameEn: 'Satellite Detection',
          icon: 'satellite', status: 'complete',
          timestamp: '2026-03-02T08:12:00Z', confidence: 78, duration: '—',
          detail: 'NDVI-avvikelse -18% detekterad i nordöstra sektorn av Granudden. Sentinel-2 pass 2026-03-02.',
          aiReasoning: 'NDVI dropped from 0.72 to 0.59 over 10 days. Spectral signature consistent with chlorophyll loss in coniferous canopy.',
          rawData: 'Band 4 (Red): 0.089 → 0.112\nBand 8 (NIR): 0.342 → 0.298\nNDVI: 0.587 (prev: 0.721)\nArea affected: ~2.8 ha',
        },
        {
          id: 's1-2', name: 'AI-analys', nameEn: 'AI Analysis',
          icon: 'brain', status: 'complete',
          timestamp: '2026-03-02T08:34:00Z', confidence: 82, duration: '22min',
          detail: 'AI klassificerar: 82% sannolikhet barkborre, 12% torka, 6% falskt alarm.',
          aiReasoning: 'Spectral decay pattern matches Ips typographus attack signature. Spatial clustering indicates point-source spread, not diffuse drought. GDD accumulation supports beetle activity.',
          rawData: 'Beetle: 82.3%\nDrought: 11.8%\nStorm: 0.2%\nFalse alarm: 5.7%',
        },
        {
          id: 's1-3', name: 'Drönardispatch', nameEn: 'Drone Dispatch',
          icon: 'plane', status: 'complete',
          timestamp: '2026-03-02T09:15:00Z', confidence: null, duration: '41min',
          detail: 'Automatiskt drönarppdrag skapat. Pilot Erik J. tilldelad. Mission #M-2026-0312.',
          aiReasoning: 'Nearest available pilot: 23 km. Weather conditions: wind 4.2 m/s, overcast (ideal). Priority: HIGH due to beetle probability >80%.',
        },
        {
          id: 's1-4', name: 'Högupplösningsskanning', nameEn: 'Hi-Res Scan',
          icon: 'camera', status: 'complete',
          timestamp: '2026-03-02T11:45:00Z', confidence: null, duration: '2h 30min',
          detail: '342 bilder tagna. 2.8 ha skannat med 3.2 cm/px upplösning. Multispektral data insamlad.',
          rawData: 'Images: 342\nGSD: 3.2 cm/px\nOverlap: 80/70\nBands: RGB + RedEdge + NIR\nFlight alt: 90m AGL',
        },
        {
          id: 's1-5', name: 'Detaljklassificering', nameEn: 'Detailed Classification',
          icon: 'microscope', status: 'complete',
          timestamp: '2026-03-02T13:10:00Z', confidence: 94, duration: '1h 25min',
          detail: 'AI bekräftar barkborreangrepp grad 2. 187 angripna granar identifierade. Spridning nordöst → sydväst.',
          aiReasoning: 'Crown-level classification on 3.2cm imagery. 187 trees showing bore dust and crown discoloration. Attack gradient suggests NE origin, spreading SW. Estimated attack age: 2-3 weeks.',
          rawData: 'Affected trees: 187\nSpecies: 100% Picea abies\nAttack grade: 2 (active, larvae present)\nArea: 2.4 ha primary, 0.4 ha buffer\nConfidence: 94.2%',
        },
        {
          id: 's1-6', name: 'Åtgärd utlöst', nameEn: 'Action Triggered',
          icon: 'zap', status: 'complete',
          timestamp: '2026-03-02T14:27:00Z', confidence: null, duration: '1h 17min',
          detail: 'Grannvarning skickad till 4 fastigheter. Försäkringsärende #INS-2026-0088 påbörjat hos Länsförsäkringar.',
          aiReasoning: 'Actions triggered: (1) Neighbor alert to 4 properties within 2km radius. (2) Insurance claim initiated — severity exceeds 50% threshold. (3) Contractor availability check queued.',
        },
      ],
    },
    {
      id: 'pipe-2',
      parcel: 'Tallbacken',
      parcelId: 'p3',
      threatType: 'drought',
      status: 'completed',
      startedAt: '2026-03-08T06:45:00Z',
      totalDuration: '8h 40min',
      summary: 'Torkstress bekräftad, ingen barkborre. Övervakningsfrekvens ökad till daglig.',
      stages: [
        {
          id: 's2-1', name: 'Satellitdetektering', nameEn: 'Satellite Detection',
          icon: 'satellite', status: 'complete',
          timestamp: '2026-03-08T06:45:00Z', confidence: 65, duration: '—',
          detail: 'NDVI-avvikelse -12% över 8.3 ha i Tallbacken. Diffust mönster tyder på abiotisk stress.',
          rawData: 'NDVI: 0.61 (prev: 0.69)\nPattern: diffuse, non-clustered\nArea: 8.3 ha\nPrecipitation deficit: -42mm (30d)',
        },
        {
          id: 's2-2', name: 'AI-analys', nameEn: 'AI Analysis',
          icon: 'brain', status: 'complete',
          timestamp: '2026-03-08T07:12:00Z', confidence: 45, duration: '27min',
          detail: 'AI klassificerar: 45% torkstress, 32% barkborre, 23% falskt alarm. Drönare rekommenderas.',
          aiReasoning: 'Diffuse spectral change across large area argues against point-source beetle attack. Low precipitation supports drought hypothesis but beetle cannot be ruled out at 32%.',
        },
        {
          id: 's2-3', name: 'Drönardispatch', nameEn: 'Drone Dispatch',
          icon: 'plane', status: 'complete',
          timestamp: '2026-03-08T08:05:00Z', confidence: null, duration: '53min',
          detail: 'Drönare dispatched för verifiering. Pilot Lisa M. tilldelad. Standard prioritet.',
        },
        {
          id: 's2-4', name: 'Högupplösningsskanning', nameEn: 'Hi-Res Scan',
          icon: 'camera', status: 'complete',
          timestamp: '2026-03-08T11:30:00Z', confidence: null, duration: '3h 25min',
          detail: '518 bilder tagna. 8.3 ha skannat. Inga synliga borrspår.',
          rawData: 'Images: 518\nGSD: 3.5 cm/px\nArea: 8.3 ha\nNo visible bore dust or entry holes detected',
        },
        {
          id: 's2-5', name: 'Detaljklassificering', nameEn: 'Detailed Classification',
          icon: 'microscope', status: 'complete',
          timestamp: '2026-03-08T13:45:00Z', confidence: 91, duration: '2h 15min',
          detail: 'AI bekräftar torkstress. Inga barkborreangrepp. CWSI-index förhöjt i 78% av kronanlyser.',
          aiReasoning: 'Crown-level analysis shows uniform stress signature without beetle-specific indicators. CWSI (Crop Water Stress Index) elevated. No bore dust, no entry holes, no resin flow anomalies.',
          rawData: 'Beetle: 3.1%\nDrought: 91.4%\nHealthy: 5.5%\nCWSI: 0.72 (threshold: 0.55)',
        },
        {
          id: 's2-6', name: 'Åtgärd utlöst', nameEn: 'Action Triggered',
          icon: 'zap', status: 'complete',
          timestamp: '2026-03-08T15:25:00Z', confidence: null, duration: '1h 40min',
          detail: 'Övervakningsfrekvens ökad från veckovis till daglig för Tallbacken. GDD-varning aktiverad.',
        },
      ],
    },
    {
      id: 'pipe-3',
      parcel: 'Norra Skogen',
      parcelId: 'p1',
      threatType: 'beetle',
      status: 'active',
      startedAt: '2026-03-15T07:30:00Z',
      totalDuration: null,
      summary: 'NDVI-avvikelse detekterad. AI indikerar 71% barkborre. Drönare dispatching...',
      stages: [
        {
          id: 's3-1', name: 'Satellitdetektering', nameEn: 'Satellite Detection',
          icon: 'satellite', status: 'complete',
          timestamp: '2026-03-15T07:30:00Z', confidence: 73, duration: '—',
          detail: 'NDVI-avvikelse -15.8% i västra Norra Skogen. Klustrat mönster misstänkt biotisk orsak.',
          rawData: 'NDVI: 0.58 (prev: 0.69)\nPattern: clustered, 1.9 ha\nNearby infestation: Granudden (4.2 km NE)',
        },
        {
          id: 's3-2', name: 'AI-analys', nameEn: 'AI Analysis',
          icon: 'brain', status: 'complete',
          timestamp: '2026-03-15T07:58:00Z', confidence: 71, duration: '28min',
          detail: 'AI klassificerar: 71% barkborre, 18% torka, 11% falskt alarm. Drönare rekommenderas med hög prioritet.',
          aiReasoning: 'Clustered pattern + proximity to confirmed Granudden infestation raises beetle probability. Season (March) aligns with early swarming. GDD: 712 (approaching 800 threshold).',
        },
        {
          id: 's3-3', name: 'Drönardispatch', nameEn: 'Drone Dispatch',
          icon: 'plane', status: 'active',
          timestamp: '2026-03-15T08:15:00Z', confidence: null, duration: null,
          detail: 'Drönare dispatching... Pilot söks i Värnamo-området. Beräknad ankomst: 2h.',
        },
        {
          id: 's3-4', name: 'Högupplösningsskanning', nameEn: 'Hi-Res Scan',
          icon: 'camera', status: 'pending',
          timestamp: null, confidence: null, duration: null,
          detail: 'Väntar på drönare...',
        },
        {
          id: 's3-5', name: 'Detaljklassificering', nameEn: 'Detailed Classification',
          icon: 'microscope', status: 'pending',
          timestamp: null, confidence: null, duration: null,
          detail: 'Väntar på drönarddata...',
        },
        {
          id: 's3-6', name: 'Åtgärd utlöst', nameEn: 'Action Triggered',
          icon: 'zap', status: 'pending',
          timestamp: null, confidence: null, duration: null,
          detail: 'Väntar på klassificering...',
        },
      ],
    },
    {
      id: 'pipe-4',
      parcel: 'Ekbacken',
      parcelId: 'p2',
      threatType: 'storm',
      status: 'completed',
      startedAt: '2026-02-20T04:15:00Z',
      totalDuration: '3h 50min',
      summary: 'Vindskador bekräftade, 3.2 ha drabbat. Akut entreprenör kontaktad, försäkringsärende inlämnat.',
      stages: [
        {
          id: 's4-1', name: 'Satellitdetektering', nameEn: 'Satellite Detection',
          icon: 'satellite', status: 'complete',
          timestamp: '2026-02-20T04:15:00Z', confidence: 88, duration: '—',
          detail: 'Plötslig NDVI-förändring efter storm 19 feb. 3.2 ha med dramatisk spektral förändring.',
          rawData: 'NDVI: 0.31 (prev: 0.68)\nChange: -54%\nPattern: linear/directional\nWind data: 28 m/s gusts 2026-02-19',
        },
        {
          id: 's4-2', name: 'AI-analys', nameEn: 'AI Analysis',
          icon: 'brain', status: 'complete',
          timestamp: '2026-02-20T04:32:00Z', confidence: 91, duration: '17min',
          detail: 'AI klassificerar: 91% vindskador (windthrow), 7% övrigt, 2% falskt alarm.',
          aiReasoning: 'Extreme NDVI drop (-54%) with linear pattern aligned to wind direction (WSW). Temporal correlation with storm event. High confidence windthrow.',
        },
        {
          id: 's4-3', name: 'Drönardispatch', nameEn: 'Drone Dispatch',
          icon: 'plane', status: 'complete',
          timestamp: '2026-02-20T05:10:00Z', confidence: null, duration: '38min',
          detail: 'AKUT dispatch. Pilot Marcus H. tilldelad med emergency prioritet.',
        },
        {
          id: 's4-4', name: 'Högupplösningsskanning', nameEn: 'Hi-Res Scan',
          icon: 'camera', status: 'complete',
          timestamp: '2026-02-20T06:45:00Z', confidence: null, duration: '1h 35min',
          detail: '412 bilder. 3.2 ha vindskadeområde dokumenterat. Omkullfallna stammar kartlagda.',
          rawData: 'Images: 412\nGSD: 2.8 cm/px\nFallen trees: ~340\nArea: 3.2 ha\nAccess roads: 2 blocked',
        },
        {
          id: 's4-5', name: 'Detaljklassificering', nameEn: 'Detailed Classification',
          icon: 'microscope', status: 'complete',
          timestamp: '2026-02-20T07:20:00Z', confidence: 96, duration: '35min',
          detail: 'AI bekräftar vindskador. ~340 träd omkullblåsta. Volym: ca 480 m³fub. Sekundär barkborreris.',
          aiReasoning: 'Photogrammetric analysis confirms 340 ±15 fallen trees. Volume estimated via crown-diameter regression. Secondary beetle risk flagged — fallen spruce = breeding material.',
          rawData: 'Fallen trees: 340 ±15\nVolume: ~480 m³fub\nSpecies: 60% spruce, 30% pine, 10% birch\nSecondary beetle risk: HIGH',
        },
        {
          id: 's4-6', name: 'Åtgärd utlöst', nameEn: 'Action Triggered',
          icon: 'zap', status: 'complete',
          timestamp: '2026-02-20T08:05:00Z', confidence: null, duration: '45min',
          detail: 'Akut entreprenör kontaktad (Skogsservice AB). Försäkringsärende #INS-2026-0071 inlämnat. Barkborreprevention initierad.',
        },
      ],
    },
  ];
}

function buildDemoRules(): AutomationRule[] {
  return [
    {
      id: 'rule-1',
      name: 'NDVI-avvikelse → Drönardispatch',
      trigger: 'NDVI drop >15%',
      condition: 'AI-konfidens >70%',
      action: 'Dispatcha drönare inom 24h',
      enabled: true,
      triggerThreshold: 15,
      conditionThreshold: 70,
      executionCount: 7,
      lastExecuted: '2026-03-15T08:15:00Z',
      category: 'detection',
    },
    {
      id: 'rule-2',
      name: 'Barkborre bekräftad → Larm + Försäkring',
      trigger: 'Barkborre bekräftad',
      condition: 'Allvarlighetsgrad >50%',
      action: 'Varna grannar + Starta försäkringsärende',
      enabled: true,
      triggerThreshold: 50,
      conditionThreshold: 50,
      executionCount: 3,
      lastExecuted: '2026-03-02T14:27:00Z',
      category: 'response',
    },
    {
      id: 'rule-3',
      name: 'Stormskador → Akut åtgärd',
      trigger: 'Stormskador detekterade',
      condition: 'Yta >2 ha',
      action: 'Akut entreprenör + Försäkringsärende',
      enabled: true,
      triggerThreshold: 2,
      conditionThreshold: 2,
      executionCount: 1,
      lastExecuted: '2026-02-20T08:05:00Z',
      category: 'emergency',
    },
    {
      id: 'rule-4',
      name: 'Torkstress → Ökad övervakning',
      trigger: 'Torkstress stigande',
      condition: 'GDD >800',
      action: 'Öka övervakningsfrekvens till daglig',
      enabled: true,
      triggerThreshold: 800,
      conditionThreshold: 800,
      executionCount: 2,
      lastExecuted: '2026-03-08T15:25:00Z',
      category: 'monitoring',
    },
  ];
}

function buildDemoFeedEvents(): FeedEvent[] {
  const _now = new Date('2026-03-17T10:00:00Z');
  return [
    {
      id: 'fe-1', type: 'detection', severity: 'high',
      timestamp: '2026-03-15T07:30:00Z', parcel: 'Norra Skogen',
      title: 'NDVI-avvikelse detekterad', description: '-15.8% NDVI-drop i västra sektorn. Klustrat mönster.',
      pipelineId: 'pipe-3', isRecent: false,
    },
    {
      id: 'fe-2', type: 'analysis', severity: 'high',
      timestamp: '2026-03-15T07:58:00Z', parcel: 'Norra Skogen',
      title: 'AI-analys klar: 71% barkborre', description: 'Klustrat mönster + närhet till Granudden-utbrott höjer sannolikheten.',
      pipelineId: 'pipe-3', isRecent: false,
    },
    {
      id: 'fe-3', type: 'dispatch', severity: 'medium',
      timestamp: '2026-03-15T08:15:00Z', parcel: 'Norra Skogen',
      title: 'Drönare dispatching', description: 'Pilot söks i Värnamo-området. Beräknad ankomst 2h.',
      pipelineId: 'pipe-3', isRecent: false,
    },
    {
      id: 'fe-4', type: 'rule_triggered', severity: 'info',
      timestamp: '2026-03-15T08:16:00Z', parcel: 'Norra Skogen',
      title: 'Regel utlöst: NDVI-avvikelse → Drönardispatch', description: 'Automatisk dispatch baserad på NDVI drop >15% och AI-konfidens >70%.',
      pipelineId: 'pipe-3', isRecent: false,
    },
    {
      id: 'fe-5', type: 'action', severity: 'medium',
      timestamp: '2026-03-08T15:25:00Z', parcel: 'Tallbacken',
      title: 'Övervakningsfrekvens ökad', description: 'Torkstress bekräftad. Daglig övervakning aktiverad för Tallbacken.',
      pipelineId: 'pipe-2', isRecent: false,
    },
    {
      id: 'fe-6', type: 'classification', severity: 'low',
      timestamp: '2026-03-08T13:45:00Z', parcel: 'Tallbacken',
      title: 'Klassificering klar: torkstress', description: '91% torkstress, ingen barkborre. CWSI förhöjt.',
      pipelineId: 'pipe-2', isRecent: false,
    },
    {
      id: 'fe-7', type: 'action', severity: 'critical',
      timestamp: '2026-03-02T14:27:00Z', parcel: 'Granudden',
      title: 'Grannvarning + Försäkringsärende', description: '4 fastigheter varnade. Ärende #INS-2026-0088 påbörjat.',
      pipelineId: 'pipe-1', isRecent: false,
    },
    {
      id: 'fe-8', type: 'classification', severity: 'critical',
      timestamp: '2026-03-02T13:10:00Z', parcel: 'Granudden',
      title: 'Barkborre grad 2 bekräftad', description: '187 angripna granar. 94% konfidens. Spridning NE→SW.',
      pipelineId: 'pipe-1', isRecent: false,
    },
    {
      id: 'fe-9', type: 'action', severity: 'critical',
      timestamp: '2026-02-20T08:05:00Z', parcel: 'Ekbacken',
      title: 'Akut åtgärd: stormskador', description: 'Entreprenör kontaktad. Försäkringsärende #INS-2026-0071. ~340 träd drabbade.',
      pipelineId: 'pipe-4', isRecent: false,
    },
    {
      id: 'fe-10', type: 'system', severity: 'info',
      timestamp: '2026-02-18T12:00:00Z', parcel: '—',
      title: 'Systemuppdatering: ny AI-modell', description: 'Bark beetle detection model v3.2 deployed. +4.7% accuracy improvement.',
      isRecent: false,
    },
  ];
}

function buildDemoPerformance(): PerformanceStats {
  return {
    avgDetectionToAction: 4.2,
    falsePositiveRate: 12,
    droneDispatchSuccess: 94,
    areasMonitored: 214.8,
    satellitePasses: 6,
    costPerDetection: 380,
    manualCostPerDetection: 2200,
    timeSaved: 23,
    trends: {
      detectionTime: [8.1, 6.5, 5.8, 5.2, 4.8, 4.2],
      falsePositiveRate: [28, 22, 18, 15, 14, 12],
      dispatchSuccess: [78, 82, 86, 89, 91, 94],
      months: ['Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    },
  };
}

// ─── Hook ───

export function useAutoMonitor() {
  const [pipelines, setPipelines] = useState<PipelineEvent[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const _intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Simulate loading
    const t = setTimeout(() => {
      setPipelines(buildDemoPipelines());
      setRules(buildDemoRules());
      setFeedEvents(buildDemoFeedEvents());
      setPerformance(buildDemoPerformance());
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const updateRuleThreshold = useCallback((ruleId: string, field: 'triggerThreshold' | 'conditionThreshold', value: number) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, [field]: value } : r));
  }, []);

  const completedCount = pipelines.filter(p => p.status === 'completed').length;
  const activeCount = pipelines.filter(p => p.status === 'active').length;
  const pendingCount = pipelines.filter(p => p.status === 'pending').length;

  return {
    pipelines,
    rules,
    feedEvents,
    performance,
    isLoading,
    toggleRule,
    updateRuleThreshold,
    stats: { completedCount, activeCount, pendingCount, totalCount: pipelines.length },
  };
}
