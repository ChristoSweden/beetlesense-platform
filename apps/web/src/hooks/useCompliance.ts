import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { useAuthStore } from '@/stores/authStore';
import {
  type PermitStatus,
  type FellingType,
  type ConstraintType,
  type ConstraintSeverity,
  type ReforestationMethod,
  WAITING_PERIOD_MS,
  BUFFER_ZONE_RULES,
} from '@/data/regulatoryRules';

// ─── Types ───

export interface EnvironmentalConstraint {
  id: string;
  type: ConstraintType;
  name: string;
  distance_m: number;
  severity: ConstraintSeverity;
  description_sv: string;
  description_en: string;
  bufferRequired_m: number;
}

export interface ReforestationPlan {
  species: string;
  method: ReforestationMethod;
  densityPerHa: number;
  plantingDate: string;    // ISO date
  deadline: string;        // ISO date — 3 years from felling
}

export interface FellingPermit {
  id: string;
  parcelId: string;
  parcelName: string;
  areaHa: number;
  fellingType: FellingType;
  volumeM3: number;
  status: PermitStatus;
  constraints: EnvironmentalConstraint[];
  reforestationPlan: ReforestationPlan | null;
  createdAt: string;       // ISO
  submittedAt: string | null;
  reviewDeadline: string | null;  // submittedAt + 6 weeks
  approvedAt: string | null;
  notes: string;
}

export interface ComplianceScore {
  total: number;       // 0–100
  items: {
    id: string;
    label_sv: string;
    label_en: string;
    passed: boolean;
  }[];
}

// ─── Demo data ───

const DEMO_CONSTRAINTS_P1: EnvironmentalConstraint[] = [
  {
    id: 'ec1',
    type: 'vattendrag',
    name: 'Lillån',
    distance_m: 45,
    severity: 'yellow',
    description_sv: 'Vattendrag 45 m från avverkningsgränsen. Skyddszon 15 m krävs.',
    description_en: 'Watercourse 45 m from felling boundary. 15 m buffer zone required.',
    bufferRequired_m: 15,
  },
  {
    id: 'ec2',
    type: 'kulturminne',
    name: 'Kolbotten (RAÄ Värnamo 45:1)',
    distance_m: 120,
    severity: 'green',
    description_sv: 'Kulturlämning 120 m bort. Inget hinder vid aktuell avverkning.',
    description_en: 'Cultural heritage site 120 m away. No obstacle for current felling.',
    bufferRequired_m: 20,
  },
];

const DEMO_CONSTRAINTS_P4: EnvironmentalConstraint[] = [
  {
    id: 'ec3',
    type: 'nyckelbiotop',
    name: 'Nyckelbiotop NB-1234',
    distance_m: 30,
    severity: 'red',
    description_sv: 'Nyckelbiotop inom 30 m. Avverkning bör undvikas i detta område.',
    description_en: 'Key biotope within 30 m. Felling should be avoided in this area.',
    bufferRequired_m: 50,
  },
  {
    id: 'ec4',
    type: 'vattendrag',
    name: 'Storbäcken',
    distance_m: 80,
    severity: 'green',
    description_sv: 'Vattendrag 80 m bort. God marginal till skyddszon.',
    description_en: 'Watercourse 80 m away. Good margin to buffer zone.',
    bufferRequired_m: 15,
  },
  {
    id: 'ec5',
    type: 'natura2000',
    name: 'Natura 2000: Granudden SE0710042',
    distance_m: 350,
    severity: 'yellow',
    description_sv: 'Natura 2000-område 350 m bort. Samråd med Länsstyrelsen kan krävas.',
    description_en: 'Natura 2000 area 350 m away. Consultation with County Board may be required.',
    bufferRequired_m: 500,
  },
];

const now = new Date();
const sixWeeksAgo = new Date(now.getTime() - WAITING_PERIOD_MS);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

const DEMO_PERMITS: FellingPermit[] = [
  // Active: submitted 2 weeks ago, under review
  {
    id: 'fp1',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    areaHa: 8.5,
    fellingType: 'foryngringsavverkning',
    volumeM3: 1200,
    status: 'under_review',
    constraints: DEMO_CONSTRAINTS_P1,
    reforestationPlan: {
      species: 'gran',
      method: 'planting',
      densityPerHa: 2500,
      plantingDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadline: new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    createdAt: new Date(twoWeeksAgo.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    submittedAt: twoWeeksAgo.toISOString(),
    reviewDeadline: new Date(twoWeeksAgo.getTime() + WAITING_PERIOD_MS).toISOString(),
    approvedAt: null,
    notes: 'Avverkning planeras i nordöstra sektionen av Norra Skogen.',
  },
  // Active: submitted, approved
  {
    id: 'fp2',
    parcelId: 'p4',
    parcelName: 'Granudden',
    areaHa: 5.2,
    fellingType: 'sanitetsavverkning',
    volumeM3: 680,
    status: 'approved',
    constraints: DEMO_CONSTRAINTS_P4,
    reforestationPlan: {
      species: 'tall',
      method: 'planting',
      densityPerHa: 2200,
      plantingDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadline: new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    createdAt: threeMonthsAgo.toISOString(),
    submittedAt: new Date(threeMonthsAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewDeadline: new Date(threeMonthsAgo.getTime() + 2 * 24 * 60 * 60 * 1000 + WAITING_PERIOD_MS).toISOString(),
    approvedAt: sixWeeksAgo.toISOString(),
    notes: 'Sanitetsavverkning efter granbarkborreangrepp. Godkänd av Skogsstyrelsen.',
  },
  // Historical: completed
  {
    id: 'fp3',
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    areaHa: 3.8,
    fellingType: 'gallring',
    volumeM3: 420,
    status: 'approved',
    constraints: [],
    reforestationPlan: null,
    createdAt: sixMonthsAgo.toISOString(),
    submittedAt: new Date(sixMonthsAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewDeadline: new Date(sixMonthsAgo.getTime() + 1 * 24 * 60 * 60 * 1000 + WAITING_PERIOD_MS).toISOString(),
    approvedAt: new Date(sixMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Gallring av blandbestånd. Genomförd utan anmärkningar.',
  },
  // Historical: expired
  {
    id: 'fp4',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    areaHa: 12.0,
    fellingType: 'foryngringsavverkning',
    volumeM3: 2100,
    status: 'expired',
    constraints: [],
    reforestationPlan: {
      species: 'tall',
      method: 'seeding',
      densityPerHa: 2200,
      plantingDate: new Date(oneYearAgo.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadline: new Date(oneYearAgo.getTime() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    createdAt: oneYearAgo.toISOString(),
    submittedAt: new Date(oneYearAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewDeadline: new Date(oneYearAgo.getTime() + 2 * 24 * 60 * 60 * 1000 + WAITING_PERIOD_MS).toISOString(),
    approvedAt: new Date(oneYearAgo.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Avverkning genomförd. Anmälan har gått ut.',
  },
  // Historical: required changes
  {
    id: 'fp5',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    areaHa: 6.0,
    fellingType: 'foryngringsavverkning',
    volumeM3: 900,
    status: 'requires_changes',
    constraints: DEMO_CONSTRAINTS_P1,
    reforestationPlan: {
      species: 'gran',
      method: 'planting',
      densityPerHa: 2500,
      plantingDate: new Date(sixMonthsAgo.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadline: new Date(sixMonthsAgo.getTime() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    createdAt: new Date(sixMonthsAgo.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    submittedAt: new Date(sixMonthsAgo.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    reviewDeadline: new Date(sixMonthsAgo.getTime() - 28 * 24 * 60 * 60 * 1000 + WAITING_PERIOD_MS).toISOString(),
    approvedAt: null,
    notes: 'Skogsstyrelsen begärde komplettering av miljöhänsyn vid Lillån.',
  },
];

// ─── Demo environmental data for constraint checking ───

interface DemoRegulatoryZone {
  type: ConstraintType;
  name: string;
  distance_m: number;
  parcelIds: string[];
}

const DEMO_REGULATORY_ZONES: DemoRegulatoryZone[] = [
  { type: 'vattendrag', name: 'Lillån', distance_m: 45, parcelIds: ['p1'] },
  { type: 'kulturminne', name: 'Kolbotten (RAÄ Värnamo 45:1)', distance_m: 120, parcelIds: ['p1'] },
  { type: 'nyckelbiotop', name: 'Nyckelbiotop NB-1234', distance_m: 30, parcelIds: ['p4'] },
  { type: 'vattendrag', name: 'Storbäcken', distance_m: 80, parcelIds: ['p4', 'p3'] },
  { type: 'natura2000', name: 'Natura 2000: Granudden SE0710042', distance_m: 350, parcelIds: ['p4'] },
  { type: 'riparian', name: 'Kantzon Lillån', distance_m: 55, parcelIds: ['p1'] },
  { type: 'strandskydd', name: 'Strandskydd Eksjön', distance_m: 180, parcelIds: ['p2'] },
  { type: 'kulturminne', name: 'Kolmila (RAÄ Jönköping 12:5)', distance_m: 200, parcelIds: ['p3'] },
];

// ─── Helper: compute compliance score ───

function computeComplianceScore(permit: FellingPermit): ComplianceScore {
  const items = [
    {
      id: 'notification',
      label_sv: 'Avverkningsanmälan inskickad',
      label_en: 'Felling notification submitted',
      passed: permit.status !== 'draft',
    },
    {
      id: 'waiting_period',
      label_sv: '6-veckors väntetid',
      label_en: '6-week waiting period',
      passed: permit.status === 'approved' || permit.status === 'expired',
    },
    {
      id: 'environmental_check',
      label_sv: 'Miljöhänsyn kontrollerad',
      label_en: 'Environmental check completed',
      passed: permit.constraints.length > 0 || permit.status !== 'draft',
    },
    {
      id: 'reforestation_plan',
      label_sv: 'Återbeskogningsplan',
      label_en: 'Reforestation plan',
      passed: permit.reforestationPlan !== null || permit.fellingType === 'gallring',
    },
    {
      id: 'buffer_zones',
      label_sv: 'Skyddszoner respekterade',
      label_en: 'Buffer zones respected',
      passed: !permit.constraints.some((c) => c.severity === 'red' && c.distance_m < c.bufferRequired_m),
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  const total = Math.round((passedCount / items.length) * 100);

  return { total, items };
}

// ─── localStorage persistence for drafts ───

const DRAFTS_KEY = 'beetlesense_compliance_drafts';

function loadDrafts(): FellingPermit[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: FellingPermit[]) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full or unavailable
  }
}

// ─── Hook ───

export interface UseComplianceReturn {
  permits: FellingPermit[];
  activePermits: FellingPermit[];
  historicalPermits: FellingPermit[];
  getPermit: (id: string) => FellingPermit | undefined;
  getComplianceScore: (permit: FellingPermit) => ComplianceScore;
  getConstraintsForParcel: (parcelId: string) => EnvironmentalConstraint[];
  saveDraft: (permit: FellingPermit) => void;
  submitPermit: (id: string) => void;
  deletePermit: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function useCompliance(): UseComplianceReturn {
  const { profile } = useAuthStore();
  const [permits, setPermits] = useState<FellingPermit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load permits
  useEffect(() => {
    if (!profile) return;

    async function load() {
      setError(null);

      if (isDemo()) {
        // Merge demo permits with any locally saved drafts
        const drafts = loadDrafts();
        const demoIds = new Set(DEMO_PERMITS.map((p) => p.id));
        const uniqueDrafts = drafts.filter((d) => !demoIds.has(d.id));
        setPermits([...uniqueDrafts, ...DEMO_PERMITS]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('felling_permits')
          .select('*')
          .eq('owner_id', profile!.id)
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;

        const loaded: FellingPermit[] = (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          parcelId: row.parcel_id as string,
          parcelName: row.parcel_name as string,
          areaHa: row.area_ha as number,
          fellingType: row.felling_type as FellingType,
          volumeM3: row.volume_m3 as number,
          status: row.status as PermitStatus,
          constraints: (row.constraints as EnvironmentalConstraint[]) ?? [],
          reforestationPlan: (row.reforestation_plan as ReforestationPlan | null) ?? null,
          createdAt: row.created_at as string,
          submittedAt: row.submitted_at as string | null,
          reviewDeadline: row.review_deadline as string | null,
          approvedAt: row.approved_at as string | null,
          notes: (row.notes as string) ?? '',
        }));

        // Merge with local drafts
        const drafts = loadDrafts();
        const dbIds = new Set(loaded.map((p) => p.id));
        const uniqueDrafts = drafts.filter((d) => !dbIds.has(d.id));

        setPermits([...uniqueDrafts, ...loaded]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load permits');
      }

      setIsLoading(false);
    }

    load();
  }, [profile]);

  const activePermits = useMemo(
    () => permits.filter((p) => ['draft', 'submitted', 'under_review', 'requires_changes'].includes(p.status)),
    [permits],
  );

  const historicalPermits = useMemo(
    () => permits.filter((p) => ['approved', 'expired'].includes(p.status)),
    [permits],
  );

  const getPermit = useCallback(
    (id: string) => permits.find((p) => p.id === id),
    [permits],
  );

  const getComplianceScore = useCallback(
    (permit: FellingPermit) => computeComplianceScore(permit),
    [],
  );

  const getConstraintsForParcel = useCallback(
    (parcelId: string): EnvironmentalConstraint[] => {
      // In demo mode, use mock regulatory zones
      const zones = DEMO_REGULATORY_ZONES.filter((z) => z.parcelIds.includes(parcelId));

      return zones.map((zone) => {
        const rule = BUFFER_ZONE_RULES.find((r) => r.type === zone.type);
        const bufferRequired = rule
          ? Math.max(rule.bufferDistanceMin, Math.min(rule.bufferDistanceMax, zone.distance_m))
          : 0;

        let severity: ConstraintSeverity = 'green';
        if (zone.distance_m < bufferRequired) {
          severity = 'red';
        } else if (zone.distance_m < bufferRequired * 2) {
          severity = 'yellow';
        }

        // Override: nyckelbiotop and natura2000 close are always red/yellow
        if (zone.type === 'nyckelbiotop' && zone.distance_m < 100) severity = 'red';
        if (zone.type === 'natura2000' && zone.distance_m < 500) severity = 'yellow';

        return {
          id: `constraint-${zone.type}-${parcelId}-${zone.name}`,
          type: zone.type,
          name: zone.name,
          distance_m: zone.distance_m,
          severity,
          description_sv: rule?.description_sv ?? '',
          description_en: rule?.description_en ?? '',
          bufferRequired_m: rule?.bufferDistanceMin ?? 0,
        };
      });
    },
    [],
  );

  const saveDraft = useCallback(
    (permit: FellingPermit) => {
      setPermits((prev) => {
        const existing = prev.findIndex((p) => p.id === permit.id);
        let updated: FellingPermit[];
        if (existing >= 0) {
          updated = [...prev];
          updated[existing] = permit;
        } else {
          updated = [permit, ...prev];
        }

        // Persist drafts to localStorage
        const drafts = updated.filter((p) => p.status === 'draft');
        saveDrafts(drafts);

        return updated;
      });
    },
    [],
  );

  const submitPermit = useCallback(
    (id: string) => {
      setPermits((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== id) return p;
          const submittedAt = new Date().toISOString();
          return {
            ...p,
            status: 'submitted' as PermitStatus,
            submittedAt,
            reviewDeadline: new Date(new Date(submittedAt).getTime() + WAITING_PERIOD_MS).toISOString(),
          };
        });

        // Remove submitted permits from drafts storage
        const drafts = updated.filter((p) => p.status === 'draft');
        saveDrafts(drafts);

        return updated;
      });
    },
    [],
  );

  const deletePermit = useCallback(
    (id: string) => {
      setPermits((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        const drafts = updated.filter((p) => p.status === 'draft');
        saveDrafts(drafts);
        return updated;
      });
    },
    [],
  );

  return {
    permits,
    activePermits,
    historicalPermits,
    getPermit,
    getComplianceScore,
    getConstraintsForParcel,
    saveDraft,
    submitPermit,
    deletePermit,
    isLoading,
    error,
  };
}
