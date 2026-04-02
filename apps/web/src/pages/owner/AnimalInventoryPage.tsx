/**
 * AnimalInventoryPage — Wildlife population tracking and browsing damage analysis.
 *
 * Tracks moose, deer, boar, and protected species across forest parcels
 * using camera trap, drone survey, and field observation data. Calculates
 * real browsing pressure indices and economic damage using Skogsstyrelsen
 * formulas.
 */

import { useState, useMemo } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
  Eye,
} from 'lucide-react';

// ─── Data Model ───

interface AnimalObservation {
  id: string;
  parcelId: string;
  species: string;
  count: number;
  method: 'camera_trap' | 'drone_survey' | 'field_observation' | 'track_count' | 'pellet_count';
  date: string;
  location: { lat: number; lng: number };
  confidence: 'high' | 'medium' | 'low';
  isProtected: boolean;
}

interface BrowsingDamage {
  parcelId: string;
  damageLevel: 'none' | 'light' | 'moderate' | 'severe';
  affectedSpecies: string[];
  percentAffected: number;
  primaryCause: string;
  estimatedLoss: number;
}

// ─── Species metadata ───

const SPECIES_META: Record<string, { emoji: string; label: string; labelSv: string; isProtected: boolean; protectionNote?: string }> = {
  moose:                    { emoji: '🫎', label: 'Moose',                  labelSv: 'Älg',                  isProtected: false },
  roe_deer:                 { emoji: '🦌', label: 'Roe Deer',              labelSv: 'Rådjur',               isProtected: false },
  red_deer:                 { emoji: '🦌', label: 'Red Deer',              labelSv: 'Kronhjort',            isProtected: false },
  wild_boar:                { emoji: '🐗', label: 'Wild Boar',             labelSv: 'Vildsvin',             isProtected: false },
  lynx:                     { emoji: '🐆', label: 'Lynx',                  labelSv: 'Lodjur',               isProtected: true, protectionNote: 'EU Habitats Directive Annex II & IV, Swedish Red List (VU)' },
  wolf:                     { emoji: '🐺', label: 'Wolf',                  labelSv: 'Varg',                 isProtected: true, protectionNote: 'EU Habitats Directive Annex II & IV, Swedish Red List (CR)' },
  brown_bear:               { emoji: '🐻', label: 'Brown Bear',            labelSv: 'Brunbjörn',            isProtected: true, protectionNote: 'EU Habitats Directive Annex II & IV' },
  capercaillie:             { emoji: '🐔', label: 'Capercaillie',          labelSv: 'Tjäder',               isProtected: false },
  black_woodpecker:         { emoji: '🐦', label: 'Black Woodpecker',      labelSv: 'Spillkråka',           isProtected: true, protectionNote: 'EU Birds Directive Annex I' },
  'white-backed_woodpecker': { emoji: '🐦', label: 'White-backed Woodpecker', labelSv: 'Vitryggig hackspett', isProtected: true, protectionNote: 'EU Birds Directive Annex I, Swedish Red List (CR). Requires old deciduous forest buffers.' },
};

const METHOD_LABELS: Record<string, string> = {
  camera_trap: 'Camera trap',
  drone_survey: 'Drone survey',
  field_observation: 'Field observation',
  track_count: 'Track count',
  pellet_count: 'Pellet count',
};

const CONFIDENCE_WEIGHT: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

// ─── Demo observations (38 records across 5 parcels, 12 months) ───

function generateDemoObservations(): AnimalObservation[] {
  const obs: AnimalObservation[] = [];
  let id = 1;

  const parcels = DEMO_PARCELS;

  // Helper: slight coordinate jitter around parcel center
  const jitter = (base: number, range = 0.02) => base + (Math.sin(id * 7.3) * range);

  // Seasonal patterns: moose browsing heavier in winter (Nov–Mar)
  // Wild boar year-round, deer spring/summer peak

  const records: Omit<AnimalObservation, 'id' | 'location'>[] = [
    // ── Norra Skogen (p1, 42.5 ha) — heavy moose, moderate deer, some boar ──
    { parcelId: 'p1', species: 'moose', count: 4, method: 'camera_trap', date: '2026-01-15', confidence: 'high', isProtected: false },
    { parcelId: 'p1', species: 'moose', count: 3, method: 'track_count', date: '2026-02-08', confidence: 'high', isProtected: false },
    { parcelId: 'p1', species: 'moose', count: 2, method: 'pellet_count', date: '2025-12-20', confidence: 'medium', isProtected: false },
    { parcelId: 'p1', species: 'moose', count: 1, method: 'camera_trap', date: '2025-11-05', confidence: 'high', isProtected: false },
    { parcelId: 'p1', species: 'roe_deer', count: 6, method: 'drone_survey', date: '2026-03-10', confidence: 'high', isProtected: false },
    { parcelId: 'p1', species: 'roe_deer', count: 4, method: 'field_observation', date: '2025-09-18', confidence: 'medium', isProtected: false },
    { parcelId: 'p1', species: 'wild_boar', count: 3, method: 'camera_trap', date: '2026-01-22', confidence: 'high', isProtected: false },
    { parcelId: 'p1', species: 'lynx', count: 1, method: 'track_count', date: '2026-02-14', confidence: 'medium', isProtected: true },

    // ── Ekbacken (p2, 18.3 ha) — moderate deer, light moose ──
    { parcelId: 'p2', species: 'roe_deer', count: 5, method: 'camera_trap', date: '2026-03-05', confidence: 'high', isProtected: false },
    { parcelId: 'p2', species: 'roe_deer', count: 3, method: 'field_observation', date: '2025-10-12', confidence: 'medium', isProtected: false },
    { parcelId: 'p2', species: 'moose', count: 2, method: 'track_count', date: '2026-01-28', confidence: 'medium', isProtected: false },
    { parcelId: 'p2', species: 'moose', count: 1, method: 'camera_trap', date: '2025-12-03', confidence: 'high', isProtected: false },
    { parcelId: 'p2', species: 'black_woodpecker', count: 2, method: 'field_observation', date: '2026-03-20', confidence: 'high', isProtected: true },

    // ── Tallmon (p3, 67.1 ha) — heavy moose, deer, some boar ──
    { parcelId: 'p3', species: 'moose', count: 5, method: 'camera_trap', date: '2026-02-01', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'moose', count: 3, method: 'drone_survey', date: '2025-12-15', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'moose', count: 4, method: 'pellet_count', date: '2026-01-10', confidence: 'medium', isProtected: false },
    { parcelId: 'p3', species: 'moose', count: 2, method: 'track_count', date: '2025-11-20', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'roe_deer', count: 7, method: 'drone_survey', date: '2026-03-15', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'roe_deer', count: 4, method: 'camera_trap', date: '2025-08-22', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'wild_boar', count: 5, method: 'camera_trap', date: '2026-02-18', confidence: 'high', isProtected: false },
    { parcelId: 'p3', species: 'wild_boar', count: 2, method: 'track_count', date: '2025-10-30', confidence: 'medium', isProtected: false },
    { parcelId: 'p3', species: 'capercaillie', count: 3, method: 'field_observation', date: '2026-03-25', confidence: 'medium', isProtected: false },

    // ── Granudden (p4, 31.9 ha) — heavy moose damage on spruce ──
    { parcelId: 'p4', species: 'moose', count: 6, method: 'camera_trap', date: '2026-01-05', confidence: 'high', isProtected: false },
    { parcelId: 'p4', species: 'moose', count: 4, method: 'track_count', date: '2026-02-20', confidence: 'high', isProtected: false },
    { parcelId: 'p4', species: 'moose', count: 3, method: 'pellet_count', date: '2025-12-10', confidence: 'medium', isProtected: false },
    { parcelId: 'p4', species: 'roe_deer', count: 3, method: 'camera_trap', date: '2026-03-01', confidence: 'high', isProtected: false },
    { parcelId: 'p4', species: 'wild_boar', count: 2, method: 'field_observation', date: '2025-11-15', confidence: 'medium', isProtected: false },
    { parcelId: 'p4', species: 'red_deer', count: 2, method: 'camera_trap', date: '2026-02-25', confidence: 'high', isProtected: false },

    // ── Björklund (p5, 55.0 ha) — moderate presence, protected species ──
    { parcelId: 'p5', species: 'moose', count: 3, method: 'drone_survey', date: '2026-03-18', confidence: 'high', isProtected: false },
    { parcelId: 'p5', species: 'moose', count: 2, method: 'track_count', date: '2026-01-20', confidence: 'medium', isProtected: false },
    { parcelId: 'p5', species: 'roe_deer', count: 8, method: 'drone_survey', date: '2026-03-22', confidence: 'high', isProtected: false },
    { parcelId: 'p5', species: 'roe_deer', count: 5, method: 'camera_trap', date: '2025-07-14', confidence: 'high', isProtected: false },
    { parcelId: 'p5', species: 'wild_boar', count: 3, method: 'camera_trap', date: '2025-11-28', confidence: 'high', isProtected: false },
    { parcelId: 'p5', species: 'capercaillie', count: 2, method: 'field_observation', date: '2026-02-10', confidence: 'medium', isProtected: false },
    { parcelId: 'p5', species: 'white-backed_woodpecker', count: 1, method: 'field_observation', date: '2026-03-28', confidence: 'low', isProtected: true },
    { parcelId: 'p5', species: 'lynx', count: 1, method: 'track_count', date: '2025-12-25', confidence: 'low', isProtected: true },
    { parcelId: 'p5', species: 'brown_bear', count: 1, method: 'track_count', date: '2025-09-05', confidence: 'low', isProtected: true },
  ];

  for (const r of records) {
    const p = parcels.find(pp => pp.id === r.parcelId)!;
    obs.push({
      ...r,
      id: `obs-${id}`,
      location: { lat: jitter(p.center[1]), lng: jitter(p.center[0]) },
    });
    id++;
  }

  return obs;
}

// ─── Browsing damage per parcel (Skogsstyrelsen-based formulas) ───

function computeBrowsingDamage(observations: AnimalObservation[], parcels: DemoParcel[]): BrowsingDamage[] {
  return parcels.map(p => {
    const parcelObs = observations.filter(o => o.parcelId === p.id);
    const mooseCount = parcelObs.filter(o => o.species === 'moose').reduce((s, o) => s + o.count * CONFIDENCE_WEIGHT[o.confidence], 0);
    const deerCount = parcelObs.filter(o => ['roe_deer', 'red_deer'].includes(o.species)).reduce((s, o) => s + o.count * CONFIDENCE_WEIGHT[o.confidence], 0);
    const boarCount = parcelObs.filter(o => o.species === 'wild_boar').reduce((s, o) => s + o.count * CONFIDENCE_WEIGHT[o.confidence], 0);

    // Browsing pressure: weighted observations per hectare
    const browsingPressure = (mooseCount * 3 + deerCount * 1 + boarCount * 1.5) / p.area_hectares;

    let damageLevel: BrowsingDamage['damageLevel'];
    let percentAffected: number;
    if (browsingPressure > 1.0) { damageLevel = 'severe'; percentAffected = Math.min(45, 20 + browsingPressure * 12); }
    else if (browsingPressure > 0.5) { damageLevel = 'moderate'; percentAffected = 10 + browsingPressure * 10; }
    else if (browsingPressure > 0.15) { damageLevel = 'light'; percentAffected = 3 + browsingPressure * 8; }
    else { damageLevel = 'none'; percentAffected = browsingPressure * 5; }

    percentAffected = Math.round(percentAffected * 10) / 10;

    // Primary cause
    const primaryCause = mooseCount >= deerCount && mooseCount >= boarCount ? 'moose' :
      deerCount >= boarCount ? 'roe_deer' : 'wild_boar';

    // Affected tree species: spruce most vulnerable to moose, oak/birch to deer
    const affectedSpecies = p.species_mix
      .filter(s => {
        if (primaryCause === 'moose') return ['Spruce', 'Pine'].includes(s.species);
        if (primaryCause === 'wild_boar') return true; // root damage to all
        return ['Birch', 'Oak'].includes(s.species);
      })
      .map(s => s.species);

    // Economic damage: Skogsstyrelsen formula
    // Seedling replacement: 15–25 SEK/plant, ~2200 stems/ha standard planting
    // Damage cost = damagedPct/100 × stemsPerHa × costPerStem × area
    const stemsPerHa = 2200;
    const costPerStem = primaryCause === 'moose' ? 22 : primaryCause === 'wild_boar' ? 18 : 16;
    const estimatedLoss = Math.round(
      (percentAffected / 100) * stemsPerHa * costPerStem * p.area_hectares * 0.3 // 0.3 = fraction of area in young plantations
    );

    return { parcelId: p.id, damageLevel, affectedSpecies, percentAffected, primaryCause, estimatedLoss };
  });
}

// ─── Population aggregation ───

interface SpeciesPopulation {
  species: string;
  totalCount: number;
  adjustedDensity: number; // per 100 ha
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  isProtected: boolean;
  confidence: 'high' | 'medium' | 'low';
  observationCount: number;
}

function computePopulations(observations: AnimalObservation[], totalAreaHa: number): SpeciesPopulation[] {
  const speciesMap = new Map<string, AnimalObservation[]>();
  observations.forEach(o => {
    const list = speciesMap.get(o.species) || [];
    list.push(o);
    speciesMap.set(o.species, list);
  });

  const now = new Date('2026-04-01');
  const threeMonthsAgo = new Date('2026-01-01');
  const sixMonthsAgo = new Date('2025-10-01');

  const results: SpeciesPopulation[] = [];

  speciesMap.forEach((obs, species) => {
    const totalCount = obs.reduce((s, o) => s + o.count, 0);
    const adjustedCount = obs.reduce((s, o) => s + o.count * CONFIDENCE_WEIGHT[o.confidence], 0);
    const adjustedDensity = Math.round((adjustedCount / totalAreaHa) * 100 * 10) / 10;

    // Trend: last 3 months vs previous 3 months
    const recent = obs.filter(o => new Date(o.date) >= threeMonthsAgo && new Date(o.date) < now);
    const previous = obs.filter(o => new Date(o.date) >= sixMonthsAgo && new Date(o.date) < threeMonthsAgo);
    const recentSum = recent.reduce((s, o) => s + o.count, 0);
    const previousSum = previous.reduce((s, o) => s + o.count, 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPct = 0;
    if (previousSum > 0) {
      trendPct = Math.round(((recentSum - previousSum) / previousSum) * 100);
      if (trendPct > 15) trend = 'up';
      else if (trendPct < -15) trend = 'down';
    } else if (recentSum > 0) {
      trend = 'up';
      trendPct = 100;
    }

    // Overall confidence: weighted average
    const avgConf = obs.reduce((s, o) => s + CONFIDENCE_WEIGHT[o.confidence], 0) / obs.length;
    const confidence = avgConf >= 0.8 ? 'high' : avgConf >= 0.55 ? 'medium' : 'low';

    results.push({
      species,
      totalCount,
      adjustedDensity,
      trend,
      trendPct,
      isProtected: SPECIES_META[species]?.isProtected ?? false,
      confidence,
      observationCount: obs.length,
    });
  });

  // Sort: protected first, then by total count desc
  results.sort((a, b) => {
    if (a.isProtected !== b.isProtected) return a.isProtected ? -1 : 1;
    return b.totalCount - a.totalCount;
  });

  return results;
}

// ─── Monthly chart data ───

interface MonthlyData {
  month: string; // "2025-04"
  label: string; // "Apr"
  counts: Record<string, number>;
}

function computeMonthlyTrends(observations: AnimalObservation[]): MonthlyData[] {
  const months: MonthlyData[] = [];
  const start = new Date('2025-04-01');

  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en', { month: 'short' });
    months.push({ month: key, label, counts: {} });
  }

  observations.forEach(o => {
    const d = new Date(o.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find(mm => mm.month === key);
    if (m) {
      m.counts[o.species] = (m.counts[o.species] || 0) + o.count;
    }
  });

  return months;
}

// ─── Component ───

type SortField = 'date' | 'species' | 'count';
type SortDir = 'asc' | 'desc';

export default function AnimalInventoryPage() {
  const observations = useMemo(() => generateDemoObservations(), []);
  const parcels = DEMO_PARCELS;
  const totalAreaHa = parcels.reduce((s, p) => s + p.area_hectares, 0);

  const populations = useMemo(() => computePopulations(observations, totalAreaHa), [observations, totalAreaHa]);
  const damage = useMemo(() => computeBrowsingDamage(observations, parcels), [observations, parcels]);
  const monthly = useMemo(() => computeMonthlyTrends(observations), [observations]);

  const protectedSpecies = populations.filter(p => p.isProtected);

  // Timeline filters
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [parcelFilter, setParcelFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const allSpecies = useMemo(() => [...new Set(observations.map(o => o.species))].sort(), [observations]);

  const filteredObs = useMemo(() => {
    let list = [...observations];
    if (speciesFilter !== 'all') list = list.filter(o => o.species === speciesFilter);
    if (parcelFilter !== 'all') list = list.filter(o => o.parcelId === parcelFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === 'species') cmp = a.species.localeCompare(b.species);
      else cmp = a.count - b.count;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [observations, speciesFilter, parcelFilter, sortField, sortDir]);

  // Chart: find top 4 species by total count for the bar chart
  const chartSpecies = useMemo(() => {
    const counts = new Map<string, number>();
    observations.forEach(o => counts.set(o.species, (counts.get(o.species) || 0) + o.count));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
  }, [observations]);

  const maxMonthlyCount = useMemo(() => {
    let max = 0;
    monthly.forEach(m => {
      chartSpecies.forEach(sp => {
        if ((m.counts[sp] || 0) > max) max = m.counts[sp] || 0;
      });
    });
    return max || 1;
  }, [monthly, chartSpecies]);

  const CHART_COLORS: Record<string, string> = {
    moose: '#b45309',
    roe_deer: '#059669',
    wild_boar: '#7c3aed',
    red_deer: '#0284c7',
    lynx: '#dc2626',
    capercaillie: '#ca8a04',
    black_woodpecker: '#1d4ed8',
    'white-backed_woodpecker': '#6366f1',
    wolf: '#374151',
    brown_bear: '#92400e',
  };

  const totalDamageSEK = damage.reduce((s, d) => s + d.estimatedLoss, 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  const damageLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return '#dc2626';
      case 'moderate': return '#f59e0b';
      case 'light': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const damageLevelBg = (level: string) => {
    switch (level) {
      case 'severe': return 'rgba(220,38,38,0.08)';
      case 'moderate': return 'rgba(245,158,11,0.08)';
      case 'light': return 'rgba(34,197,94,0.08)';
      default: return 'rgba(107,114,128,0.05)';
    }
  };

  const confidenceDots = (conf: string) => {
    const filled = conf === 'high' ? 3 : conf === 'medium' ? 2 : 1;
    return (
      <span style={{ display: 'inline-flex', gap: 2 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: i < filled ? 'var(--green)' : 'var(--border)',
          }} />
        ))}
      </span>
    );
  };

  const recommendedAction = (d: BrowsingDamage) => {
    if (d.damageLevel === 'severe') return 'Install browse protection (Tubex/mesh). Consider hunting license increase.';
    if (d.damageLevel === 'moderate') return 'Monitor closely. Apply repellent (Trico) on vulnerable stands.';
    if (d.damageLevel === 'light') return 'Standard monitoring. No action needed.';
    return 'No action needed.';
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🫎</div>
            <div>
              <h1 style={{ fontSize: 20, fontFamily: 'var(--font-serif, serif)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Viltinventering
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
                Wildlife populations, browsing damage &amp; protected species across your parcels
              </p>
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {[
              { label: 'Total area', value: `${totalAreaHa.toFixed(1)} ha` },
              { label: 'Species detected', value: `${populations.length}` },
              { label: 'Observations', value: `${observations.length}` },
              { label: 'Protected species', value: `${protectedSpecies.length}`, alert: protectedSpecies.length > 0 },
              { label: 'Est. browsing damage', value: `${(totalDamageSEK / 1000).toFixed(0)}k SEK`, alert: totalDamageSEK > 50000 },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '8px 14px', borderRadius: 10,
                background: item.alert ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                border: `1px solid ${item.alert ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                minWidth: 120,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: item.alert ? '#d97706' : 'var(--text)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            1. POPULATION OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} /> Population Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {populations.map(pop => {
              const meta = SPECIES_META[pop.species];
              return (
                <div key={pop.species} style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {pop.isProtected && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6,
                      padding: '2px 6px', fontSize: 10, color: '#92400e', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <Shield size={10} /> Protected
                    </div>
                  )}
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{meta?.emoji || '🦌'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {meta?.label || pop.species}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                    {meta?.labelSv || ''}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{pop.totalCount}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>observed</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600,
                      color: pop.trend === 'up' ? '#dc2626' : pop.trend === 'down' ? '#059669' : '#6b7280',
                    }}>
                      {pop.trend === 'up' && <TrendingUp size={14} />}
                      {pop.trend === 'down' && <TrendingDown size={14} />}
                      {pop.trend === 'stable' && <Minus size={14} />}
                      {pop.trendPct !== 0 && `${pop.trendPct > 0 ? '+' : ''}${pop.trendPct}%`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                    <span>{pop.adjustedDensity}/100ha</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {confidenceDots(pop.confidence)} {pop.confidence}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            2. BROWSING DAMAGE ASSESSMENT
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} /> Browsing Damage Assessment
          </h2>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {['Parcel', 'Damage Level', 'Primary Cause', 'Trees Affected', 'Est. Loss (SEK)', 'Recommended Action'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {damage.map(d => {
                    const parcel = parcels.find(p => p.id === d.parcelId)!;
                    const causeMeta = SPECIES_META[d.primaryCause];
                    return (
                      <tr key={d.parcelId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{parcel.name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            color: damageLevelColor(d.damageLevel), background: damageLevelBg(d.damageLevel),
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: damageLevelColor(d.damageLevel) }} />
                            {d.damageLevel}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {causeMeta?.emoji} {causeMeta?.label || d.primaryCause}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {d.percentAffected}% — {d.affectedSpecies.join(', ')}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: d.estimatedLoss > 50000 ? '#dc2626' : 'var(--text)' }}>
                          {d.estimatedLoss.toLocaleString('sv-SE')} kr
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)', maxWidth: 220 }}>
                          {recommendedAction(d)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg)' }}>
                    <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 12 }}>Total estimated damage</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#dc2626' }}>{totalDamageSEK.toLocaleString('sv-SE')} kr</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            3. PROTECTED SPECIES ALERT
        ══════════════════════════════════════════════════════════════════ */}
        {protectedSpecies.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} style={{ color: '#d97706' }} /> Protected Species Alert
            </h2>
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 20,
            }}>
              <p style={{ fontSize: 13, color: '#92400e', marginBottom: 16, lineHeight: 1.5 }}>
                <strong>{protectedSpecies.length} protected species</strong> have been detected on your parcels.
                Forest operations may be restricted in affected areas. Contact Lansstyrelsen before any harvesting
                or road construction near observation sites.
              </p>

              <div style={{ display: 'grid', gap: 12 }}>
                {protectedSpecies.map(sp => {
                  const meta = SPECIES_META[sp.species];
                  const relatedObs = observations.filter(o => o.species === sp.species);
                  const affectedParcels = [...new Set(relatedObs.map(o => o.parcelId))];
                  return (
                    <div key={sp.species} style={{
                      background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{meta?.emoji}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>
                            {meta?.label} ({meta?.labelSv})
                          </div>
                          <div style={{ fontSize: 11, color: '#b45309' }}>{meta?.protectionNote}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
                        <div><strong>Observations:</strong> {sp.totalCount} individual(s) across {sp.observationCount} sighting(s)</div>
                        <div><strong>Parcels:</strong> {affectedParcels.map(pid => parcels.find(p => p.id === pid)?.name).join(', ')}</div>
                        <div><strong>What this means:</strong> A minimum 100m buffer zone should be maintained around observation sites. No clear-cutting within buffer.</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: 16, padding: '12px 16px', background: '#fef3c7', borderRadius: 8,
                fontSize: 12, color: '#78350f', lineHeight: 1.5,
              }}>
                <strong>Contact Lansstyrelsen Jonkopings lan:</strong><br />
                Phone: 010-223 60 00 | Email: jonkoping@lansstyrelsen.se<br />
                Report observations via <em>Artportalen.se</em> (Swedish Species Observation System)
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            4. POPULATION TRENDS CHART (CSS-based)
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} /> Population Trends (12 months)
          </h2>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              {chartSpecies.map(sp => (
                <div key={sp} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: CHART_COLORS[sp] || '#6b7280' }} />
                  {SPECIES_META[sp]?.label || sp}
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
              {monthly.map((m, mi) => (
                <div key={mi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 150, width: '100%' }}>
                    {chartSpecies.map(sp => {
                      const val = m.counts[sp] || 0;
                      const h = val > 0 ? Math.max(4, (val / maxMonthlyCount) * 140) : 0;
                      return (
                        <div key={sp} style={{
                          flex: 1, height: h, backgroundColor: CHART_COLORS[sp] || '#6b7280',
                          borderRadius: '3px 3px 0 0', transition: 'height 0.3s',
                          minWidth: 3,
                        }}
                          title={`${SPECIES_META[sp]?.label}: ${val}`}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>{m.label}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, fontStyle: 'italic' }}>
              Note: Winter peaks (Nov-Mar) reflect increased moose browsing activity and easier tracking conditions.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            5. OBSERVATION TIMELINE
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} /> Observation Timeline
          </h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <select
              value={speciesFilter}
              onChange={e => setSpeciesFilter(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
              }}
            >
              <option value="all">All species</option>
              {allSpecies.map(sp => (
                <option key={sp} value={sp}>{SPECIES_META[sp]?.label || sp}</option>
              ))}
            </select>
            <select
              value={parcelFilter}
              onChange={e => setParcelFilter(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
              }}
            >
              <option value="all">All parcels</option>
              {parcels.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th onClick={() => toggleSort('date')} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                      Date <SortIcon field="date" />
                    </th>
                    <th onClick={() => toggleSort('species')} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                      Species <SortIcon field="species" />
                    </th>
                    <th onClick={() => toggleSort('count')} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                      Count <SortIcon field="count" />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Method</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Parcel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObs.map(o => {
                    const meta = SPECIES_META[o.species];
                    const parcel = parcels.find(p => p.id === o.parcelId);
                    return (
                      <tr key={o.id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: o.isProtected ? 'rgba(254,243,199,0.3)' : undefined,
                      }}>
                        <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>{o.date}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span>{meta?.emoji}</span>
                            <span style={{ fontWeight: o.isProtected ? 600 : 400 }}>{meta?.label || o.species}</span>
                            {o.isProtected && <Shield size={12} style={{ color: '#d97706' }} />}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.count}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text3)' }}>{METHOD_LABELS[o.method]}</td>
                        <td style={{ padding: '8px 12px' }}>{parcel?.name}</td>
                        <td style={{ padding: '8px 12px' }}>{confidenceDots(o.confidence)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
