import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───

export type BatchStatus = 'standing' | 'harvested' | 'in_transport' | 'at_mill';

export type CustodyStepId =
  | 'standing'
  | 'felling'
  | 'forwarding'
  | 'landing'
  | 'transport'
  | 'reception';

export interface CustodyStep {
  id: CustodyStepId;
  label_sv: string;
  label_en: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp: string | null;
  gps: { lat: number; lng: number } | null;
  operator: string | null;
  verificationMethod: string | null;
  volume_m3: number | null;
  notes: string | null;
}

export interface TimberBatch {
  id: string;
  species: string;
  species_sv: string;
  volume_m3: number;
  qualityGrade: string;
  status: BatchStatus;
  parcelName: string;
  parcelCoords: { n: number; e: number }; // SWEREF99 TM
  areaHarvested_ha: number;
  destination: string;
  destinationMill: string;
  fsc_coc: string;
  pefc_coc: string;
  satelliteVerification: {
    beforeDate: string;
    afterDate: string;
    sentinel2: boolean;
    deforestationFree: boolean;
  };
  custodyChain: CustodyStep[];
  carbonFootprint_kg: number;
  transportDistance_km: number;
  createdAt: string;
  eudrCompliance: number; // 0-100
  anomalies: string[];
}

export interface EUDRChecklistItem {
  id: string;
  label_sv: string;
  label_en: string;
  passed: boolean;
  source: string;
}

export interface DueDiligenceStatement {
  batchId: string;
  operatorName: string;
  date: string;
  riskLevel: 'low' | 'medium' | 'high';
  countryRisk: string;
  summary_sv: string;
  summary_en: string;
}

// ─── Demo chain templates ───

function makeCustodyChain(status: BatchStatus, data: Partial<Record<CustodyStepId, Partial<CustodyStep>>>): CustodyStep[] {
  const steps: { id: CustodyStepId; label_sv: string; label_en: string }[] = [
    { id: 'standing', label_sv: 'Staende skog', label_en: 'Standing forest' },
    { id: 'felling', label_sv: 'Avverkning', label_en: 'Felling' },
    { id: 'forwarding', label_sv: 'Skotning', label_en: 'Forwarding' },
    { id: 'landing', label_sv: 'Avlagg', label_en: 'Landing / Roadside' },
    { id: 'transport', label_sv: 'Transport', label_en: 'Transport' },
    { id: 'reception', label_sv: 'Mottagning (sagverk/bruk)', label_en: 'Reception (sawmill)' },
  ];

  const statusOrder: BatchStatus[] = ['standing', 'harvested', 'in_transport', 'at_mill'];
  const _statusIndex = statusOrder.indexOf(status);

  // Map status to how many steps are completed
  const completedUpTo: Record<BatchStatus, number> = {
    standing: 0,
    harvested: 3,    // standing, felling, forwarding done
    in_transport: 4, // + landing done
    at_mill: 6,      // all done
  };
  const maxCompleted = completedUpTo[status];

  // in_transport means transport step is in_progress
  const inProgressStep: CustodyStepId | null =
    status === 'in_transport' ? 'transport' : null;

  return steps.map((step, i) => {
    const override = data[step.id] ?? {};
    let stepStatus: 'completed' | 'in_progress' | 'pending';
    if (step.id === inProgressStep) {
      stepStatus = 'in_progress';
    } else if (i < maxCompleted) {
      stepStatus = 'completed';
    } else {
      stepStatus = 'pending';
    }

    return {
      id: step.id,
      label_sv: step.label_sv,
      label_en: step.label_en,
      status: stepStatus,
      timestamp: override.timestamp ?? null,
      gps: override.gps ?? null,
      operator: override.operator ?? null,
      verificationMethod: override.verificationMethod ?? null,
      volume_m3: override.volume_m3 ?? null,
      notes: override.notes ?? null,
    };
  });
}

// ─── Demo batches ───

const DEMO_BATCHES: TimberBatch[] = [
  {
    id: 'BTS-2026-0001',
    species: 'Spruce sawlog',
    species_sv: 'Grantimmer',
    volume_m3: 245,
    qualityGrade: 'Klass 1',
    status: 'at_mill',
    parcelName: 'Norra Skogen',
    parcelCoords: { n: 6342150, e: 442830 },
    areaHarvested_ha: 8.5,
    destination: 'Vida Alvesta',
    destinationMill: 'Vida Timber AB, Alvesta',
    fsc_coc: 'FSC-C123456',
    pefc_coc: 'PEFC/05-22-01',
    satelliteVerification: {
      beforeDate: '2025-12-15',
      afterDate: '2026-02-20',
      sentinel2: true,
      deforestationFree: true,
    },
    custodyChain: makeCustodyChain('at_mill', {
      standing: { timestamp: '2025-12-01T08:00:00Z', gps: { lat: 57.19, lng: 14.04 }, operator: 'BeetleSense satellite', verificationMethod: 'Sentinel-2 NDVI', volume_m3: 250 },
      felling: { timestamp: '2026-01-15T07:30:00Z', gps: { lat: 57.191, lng: 14.042 }, operator: 'Skogstjänst AB (skördare John Deere 1270G)', verificationMethod: 'Skördardator StanForD', volume_m3: 248, notes: 'Avverkning slutförd enligt plan' },
      forwarding: { timestamp: '2026-01-16T10:00:00Z', gps: { lat: 57.192, lng: 14.045 }, operator: 'Skogstjänst AB (skotare Komatsu 855)', verificationMethod: 'GPS-logg', volume_m3: 247 },
      landing: { timestamp: '2026-01-16T14:30:00Z', gps: { lat: 57.195, lng: 14.050 }, operator: 'Skogstjänst AB', verificationMethod: 'Avläggsrapport', volume_m3: 245 },
      transport: { timestamp: '2026-01-18T06:00:00Z', gps: { lat: 56.90, lng: 14.55 }, operator: 'Scania R650 (Transportbolaget Syd)', verificationMethod: 'SDR transportdokument', volume_m3: 245 },
      reception: { timestamp: '2026-01-18T14:00:00Z', gps: { lat: 56.898, lng: 14.556 }, operator: 'Vida Alvesta mätstation', verificationMethod: 'VMF Syd virkesmätning', volume_m3: 245, notes: 'Mätning godkänd. Klass 1: 78%, Klass 2: 22%' },
    }),
    carbonFootprint_kg: 3420,
    transportDistance_km: 42,
    createdAt: '2025-12-01T08:00:00Z',
    eudrCompliance: 100,
    anomalies: [],
  },
  {
    id: 'BTS-2026-0002',
    species: 'Pine pulpwood',
    species_sv: 'Tallmassaved',
    volume_m3: 180,
    qualityGrade: 'Massaved',
    status: 'in_transport',
    parcelName: 'Tallbacken',
    parcelCoords: { n: 6358200, e: 438750 },
    areaHarvested_ha: 12.0,
    destination: 'Södra Värö',
    destinationMill: 'Södra Cell Värö',
    fsc_coc: 'FSC-C789012',
    pefc_coc: 'PEFC/05-22-02',
    satelliteVerification: {
      beforeDate: '2026-01-10',
      afterDate: '2026-03-05',
      sentinel2: true,
      deforestationFree: true,
    },
    custodyChain: makeCustodyChain('in_transport', {
      standing: { timestamp: '2026-01-10T08:00:00Z', gps: { lat: 57.30, lng: 13.53 }, operator: 'BeetleSense satellite', verificationMethod: 'Sentinel-2 NDVI', volume_m3: 190 },
      felling: { timestamp: '2026-02-20T07:00:00Z', gps: { lat: 57.301, lng: 13.532 }, operator: 'Norra Skog Entreprenad (skördare Ponsse Scorpion)', verificationMethod: 'Skördardator StanForD', volume_m3: 185 },
      forwarding: { timestamp: '2026-02-21T08:00:00Z', gps: { lat: 57.303, lng: 13.535 }, operator: 'Norra Skog Entreprenad (skotare Ponsse Elk)', verificationMethod: 'GPS-logg', volume_m3: 182 },
      landing: { timestamp: '2026-02-21T13:00:00Z', gps: { lat: 57.308, lng: 13.540 }, operator: 'Norra Skog Entreprenad', verificationMethod: 'Avläggsrapport', volume_m3: 180 },
      transport: { timestamp: '2026-03-15T05:30:00Z', gps: { lat: 57.10, lng: 12.25 }, operator: 'Volvo FH16 (Västra Transport AB)', verificationMethod: 'SDR transportdokument', volume_m3: 180, notes: 'Beräknad ankomst 2026-03-15 kl 14:00' },
    }),
    carbonFootprint_kg: 5180,
    transportDistance_km: 148,
    createdAt: '2026-01-10T08:00:00Z',
    eudrCompliance: 100,
    anomalies: ['Ovanlig rutt upptäckt — omväg via Borås pga vägarbete'],
  },
  {
    id: 'BTS-2026-0003',
    species: 'Spruce sawlog',
    species_sv: 'Grantimmer',
    volume_m3: 320,
    qualityGrade: 'Klass 1–2',
    status: 'harvested',
    parcelName: 'Granudden',
    parcelCoords: { n: 6345500, e: 444200 },
    areaHarvested_ha: 15.2,
    destination: 'Stora Enso Ala',
    destinationMill: 'Stora Enso Timber, Ala sågverk',
    fsc_coc: 'FSC-C345678',
    pefc_coc: 'PEFC/05-22-03',
    satelliteVerification: {
      beforeDate: '2026-02-01',
      afterDate: '2026-03-12',
      sentinel2: true,
      deforestationFree: true,
    },
    custodyChain: makeCustodyChain('harvested', {
      standing: { timestamp: '2026-02-01T08:00:00Z', gps: { lat: 57.22, lng: 14.10 }, operator: 'BeetleSense satellite', verificationMethod: 'Sentinel-2 NDVI', volume_m3: 335 },
      felling: { timestamp: '2026-03-08T07:00:00Z', gps: { lat: 57.221, lng: 14.102 }, operator: 'Kronobergs Skogsentreprenad (skördare Komatsu 951)', verificationMethod: 'Skördardator StanForD', volume_m3: 325 },
      forwarding: { timestamp: '2026-03-10T08:00:00Z', gps: { lat: 57.223, lng: 14.106 }, operator: 'Kronobergs Skogsentreprenad (skotare Komatsu 855)', verificationMethod: 'GPS-logg', volume_m3: 320, notes: 'Skotning pågår, 80% klart' },
    }),
    carbonFootprint_kg: 2850,
    transportDistance_km: 95,
    createdAt: '2026-02-01T08:00:00Z',
    eudrCompliance: 88,
    anomalies: ['Volym avviker från prognos — 4.5% lägre än planerat'],
  },
  {
    id: 'BTS-2026-0004',
    species: 'Birch pulpwood',
    species_sv: 'Björkmassa',
    volume_m3: 95,
    qualityGrade: 'Massaved',
    status: 'standing',
    parcelName: 'Ekbacken',
    parcelCoords: { n: 6352800, e: 436100 },
    areaHarvested_ha: 4.8,
    destination: 'Södra Mönsterås',
    destinationMill: 'Södra Cell Mönsterås',
    fsc_coc: 'FSC-C901234',
    pefc_coc: 'PEFC/05-22-04',
    satelliteVerification: {
      beforeDate: '2026-03-10',
      afterDate: '',
      sentinel2: true,
      deforestationFree: true,
    },
    custodyChain: makeCustodyChain('standing', {
      standing: { timestamp: '2026-03-10T08:00:00Z', gps: { lat: 57.30, lng: 13.53 }, operator: 'BeetleSense satellite', verificationMethod: 'Sentinel-2 NDVI', volume_m3: 95, notes: 'Planerad avverkning april 2026' },
    }),
    carbonFootprint_kg: 0,
    transportDistance_km: 210,
    createdAt: '2026-03-10T08:00:00Z',
    eudrCompliance: 62,
    anomalies: [],
  },
];

// ─── EUDR checklist builder ───

function buildEUDRChecklist(batch: TimberBatch): EUDRChecklistItem[] {
  const isCompleted = batch.status === 'at_mill';
  const isHarvested = batch.status !== 'standing';

  return [
    {
      id: 'geolocation',
      label_sv: 'Geolokalisering av avverkningsområde',
      label_en: 'Geolocation of harvest area',
      passed: true,
      source: 'BeetleSense parcel data',
    },
    {
      id: 'satellite_before_after',
      label_sv: 'Satellitbilder före och efter avverkning',
      label_en: 'Satellite imagery before and after harvest',
      passed: !!batch.satelliteVerification.afterDate,
      source: 'Sentinel-2 (Copernicus)',
    },
    {
      id: 'legal_harvest',
      label_sv: 'Bevis på laglig avverkning',
      label_en: 'Proof of legal harvest',
      passed: isHarvested,
      source: 'Skogsstyrelsens avverkningsanmälan',
    },
    {
      id: 'due_diligence',
      label_sv: 'Due diligence-utlåtande',
      label_en: 'Due diligence statement',
      passed: batch.eudrCompliance >= 80,
      source: 'BeetleSense autogenererad',
    },
    {
      id: 'risk_assessment',
      label_sv: 'Riskbedömning (landsnivå)',
      label_en: 'Risk assessment (country level)',
      passed: true,
      source: 'Sverige = lågriskland (EU benchmarking)',
    },
    {
      id: 'chain_of_custody',
      label_sv: 'Spårbarhetskedja dokumenterad',
      label_en: 'Chain of custody documentation',
      passed: batch.custodyChain.some((s) => s.status === 'completed'),
      source: 'BeetleSense chain of custody',
    },
    {
      id: 'no_deforestation',
      label_sv: 'Ingen avskogning efter dec 2020',
      label_en: 'No deforestation after Dec 2020',
      passed: batch.satelliteVerification.deforestationFree,
      source: 'Sentinel-2 tidsserieanalys',
    },
    {
      id: 'species_id',
      label_sv: 'Artidentifiering genomförd',
      label_en: 'Species identification completed',
      passed: true,
      source: 'BeetleSense AI + skördardata',
    },
    {
      id: 'operator_registered',
      label_sv: 'Operatör registrerad i EU-systemet',
      label_en: 'Operator registered in EU system',
      passed: isCompleted || batch.status === 'in_transport',
      source: 'EU Information System',
    },
    {
      id: 'fsc_pefc',
      label_sv: 'FSC/PEFC certifieringskedja',
      label_en: 'FSC/PEFC chain of custody',
      passed: !!batch.fsc_coc && !!batch.pefc_coc,
      source: `${batch.fsc_coc} / ${batch.pefc_coc}`,
    },
  ];
}

// ─── Due diligence statement generator ───

function generateDueDiligence(batch: TimberBatch): DueDiligenceStatement {
  return {
    batchId: batch.id,
    operatorName: 'BeetleSense AB',
    date: new Date().toISOString().slice(0, 10),
    riskLevel: 'low',
    countryRisk: 'Sverige — lågriskland enligt EU:s referensbenchmarking',
    summary_sv: `Due diligence-utlåtande för virkesparti ${batch.id}. Partiet består av ${batch.volume_m3} m³ ${batch.species_sv.toLowerCase()} från ${batch.parcelName} (SWEREF99 TM: N ${batch.parcelCoords.n}, E ${batch.parcelCoords.e}). Satellitverifiering via Sentinel-2 bekräftar att ingen avskogning skett efter referensdatumet 31 december 2020. Avverkningsområdet är beläget i Sverige, som klassificeras som lågriskland. Spårbarhetskedjan dokumenteras via BeetleSense digitalt timmerpass med GPS-verifierade steg från stående skog till ${batch.destinationMill}. Certifieringskedja: ${batch.fsc_coc}, ${batch.pefc_coc}. Bedömning: Ingen risk för koppling till avskogning eller skogsförstöring.`,
    summary_en: `Due diligence statement for timber batch ${batch.id}. The batch consists of ${batch.volume_m3} m³ ${batch.species.toLowerCase()} from ${batch.parcelName} (SWEREF99 TM: N ${batch.parcelCoords.n}, E ${batch.parcelCoords.e}). Satellite verification via Sentinel-2 confirms no deforestation has occurred after the reference date of 31 December 2020. The harvest area is located in Sweden, classified as a low-risk country. Chain of custody is documented via BeetleSense digital timber passport with GPS-verified steps from standing forest to ${batch.destinationMill}. Certification chain: ${batch.fsc_coc}, ${batch.pefc_coc}. Assessment: No risk of association with deforestation or forest degradation.`,
  };
}

// ─── QR data ───

export interface QRVerificationData {
  batchId: string;
  verifyUrl: string;
  payload: string;
}

function generateQRData(batch: TimberBatch): QRVerificationData {
  const verifyUrl = `https://app.beetlesense.ai/verify/${batch.id}`;
  const payload = JSON.stringify({
    id: batch.id,
    species: batch.species_sv,
    volume: batch.volume_m3,
    origin: batch.parcelName,
    coords: batch.parcelCoords,
    destination: batch.destinationMill,
    eudr: batch.eudrCompliance === 100 ? 'COMPLIANT' : 'PENDING',
    fsc: batch.fsc_coc,
    pefc: batch.pefc_coc,
    verified: new Date().toISOString(),
  });
  return { batchId: batch.id, verifyUrl, payload };
}

// ─── Hook ───

export interface UseProvenanceReturn {
  batches: TimberBatch[];
  selectedBatch: TimberBatch | null;
  selectBatch: (id: string | null) => void;
  getBatch: (id: string) => TimberBatch | undefined;
  getChecklist: (batch: TimberBatch) => EUDRChecklistItem[];
  getDueDiligence: (batch: TimberBatch) => DueDiligenceStatement;
  getQRData: (batch: TimberBatch) => QRVerificationData;
  totalVolume: number;
  complianceRate: number;
  statusFilter: BatchStatus | 'all';
  setStatusFilter: (f: BatchStatus | 'all') => void;
  speciesFilter: string;
  setSpeciesFilter: (f: string) => void;
  isLoading: boolean;
}

export function useProvenance(): UseProvenanceReturn {
  const { profile } = useAuthStore();
  const [batches, setBatches] = useState<TimberBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');

  useEffect(() => {
    if (!profile) return;
    // Demo mode — load static data
    setBatches(DEMO_BATCHES);
    setIsLoading(false);
  }, [profile]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (speciesFilter !== 'all' && b.species_sv !== speciesFilter) return false;
      return true;
    });
  }, [batches, statusFilter, speciesFilter]);

  const selectedBatch = useMemo(
    () => (selectedBatchId ? batches.find((b) => b.id === selectedBatchId) ?? null : null),
    [batches, selectedBatchId],
  );

  const selectBatch = useCallback((id: string | null) => setSelectedBatchId(id), []);
  const getBatch = useCallback((id: string) => batches.find((b) => b.id === id), [batches]);
  const getChecklist = useCallback((batch: TimberBatch) => buildEUDRChecklist(batch), []);
  const getDueDiligence = useCallback((batch: TimberBatch) => generateDueDiligence(batch), []);
  const getQRData = useCallback((batch: TimberBatch) => generateQRData(batch), []);

  const totalVolume = useMemo(() => filteredBatches.reduce((s, b) => s + b.volume_m3, 0), [filteredBatches]);
  const complianceRate = useMemo(() => {
    if (filteredBatches.length === 0) return 0;
    const compliant = filteredBatches.filter((b) => b.eudrCompliance === 100).length;
    return Math.round((compliant / filteredBatches.length) * 100);
  }, [filteredBatches]);

  return {
    batches: filteredBatches,
    selectedBatch,
    selectBatch,
    getBatch,
    getChecklist,
    getDueDiligence,
    getQRData,
    totalVolume,
    complianceRate,
    statusFilter,
    setStatusFilter,
    speciesFilter,
    setSpeciesFilter,
    isLoading,
  };
}
