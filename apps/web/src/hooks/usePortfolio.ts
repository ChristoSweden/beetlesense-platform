import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export interface PortfolioParcel {
  id: string;
  name: string;
  municipality: string;
  county: string;
  area_hectares: number;
  health_score: number;
  timber_value_kr: number;
  warnings: number;
  last_survey_date: string | null;
  center: [number, number]; // [lng, lat] WGS84
  boundary: [number, number][]; // polygon coordinates
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
}

export interface PortfolioSummary {
  totalHectares: number;
  totalValue: number;
  avgHealthScore: number;
  activeWarnings: number;
  // Trend vs previous month
  hectaresTrend: number;
  valueTrend: number;
  healthTrend: number;
  warningsTrend: number;
}

export type SortField = 'name' | 'municipality' | 'area_hectares' | 'health_score' | 'timber_value_kr' | 'warnings' | 'last_survey_date';
export type SortDirection = 'asc' | 'desc';

export interface UsePortfolioReturn {
  parcels: PortfolioParcel[];
  filteredParcels: PortfolioParcel[];
  summary: PortfolioSummary;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  exportCsv: () => void;
  refetch: () => void;
}

// ─── Demo data: 8 realistic Swedish parcels ───

const DEMO_PARCELS: PortfolioParcel[] = [
  {
    id: 'pf-1',
    name: 'Norra Skogen',
    municipality: 'Växjö',
    county: 'Kronoberg',
    area_hectares: 85,
    health_score: 78,
    timber_value_kr: 4_200_000,
    warnings: 1,
    last_survey_date: '2026-03-10',
    center: [14.81, 56.88],
    boundary: [[14.79, 56.87], [14.83, 56.87], [14.83, 56.89], [14.79, 56.89], [14.79, 56.87]],
    status: 'at_risk',
  },
  {
    id: 'pf-2',
    name: 'Ekbacken',
    municipality: 'Alvesta',
    county: 'Kronoberg',
    area_hectares: 32,
    health_score: 92,
    timber_value_kr: 1_850_000,
    warnings: 0,
    last_survey_date: '2026-03-12',
    center: [14.55, 56.90],
    boundary: [[14.53, 56.895], [14.57, 56.895], [14.57, 56.905], [14.53, 56.905], [14.53, 56.895]],
    status: 'healthy',
  },
  {
    id: 'pf-3',
    name: 'Stormossen',
    municipality: 'Jönköping',
    county: 'Jönköping',
    area_hectares: 120,
    health_score: 65,
    timber_value_kr: 5_600_000,
    warnings: 3,
    last_survey_date: '2026-02-28',
    center: [14.16, 57.78],
    boundary: [[14.12, 57.77], [14.20, 57.77], [14.20, 57.79], [14.12, 57.79], [14.12, 57.77]],
    status: 'at_risk',
  },
  {
    id: 'pf-4',
    name: 'Tallåsen',
    municipality: 'Vetlanda',
    county: 'Jönköping',
    area_hectares: 45,
    health_score: 88,
    timber_value_kr: 2_300_000,
    warnings: 0,
    last_survey_date: '2026-03-05',
    center: [15.08, 57.43],
    boundary: [[15.06, 57.42], [15.10, 57.42], [15.10, 57.44], [15.06, 57.44], [15.06, 57.42]],
    status: 'healthy',
  },
  {
    id: 'pf-5',
    name: 'Björkudden',
    municipality: 'Kalmar',
    county: 'Kalmar',
    area_hectares: 18,
    health_score: 45,
    timber_value_kr: 520_000,
    warnings: 2,
    last_survey_date: '2026-01-15',
    center: [16.36, 56.66],
    boundary: [[16.35, 56.655], [16.37, 56.655], [16.37, 56.665], [16.35, 56.665], [16.35, 56.655]],
    status: 'infested',
  },
  {
    id: 'pf-6',
    name: 'Granvik',
    municipality: 'Nybro',
    county: 'Kalmar',
    area_hectares: 180,
    health_score: 71,
    timber_value_kr: 7_800_000,
    warnings: 2,
    last_survey_date: '2026-03-01',
    center: [15.91, 56.74],
    boundary: [[15.86, 56.73], [15.96, 56.73], [15.96, 56.75], [15.86, 56.75], [15.86, 56.73]],
    status: 'at_risk',
  },
  {
    id: 'pf-7',
    name: 'Lindhagen',
    municipality: 'Linköping',
    county: 'Östergötland',
    area_hectares: 55,
    health_score: 84,
    timber_value_kr: 3_100_000,
    warnings: 0,
    last_survey_date: '2026-03-14',
    center: [15.63, 58.41],
    boundary: [[15.61, 58.40], [15.65, 58.40], [15.65, 58.42], [15.61, 58.42], [15.61, 58.40]],
    status: 'healthy',
  },
  {
    id: 'pf-8',
    name: 'Skogslyckan',
    municipality: 'Mjölby',
    county: 'Östergötland',
    area_hectares: 15,
    health_score: 59,
    timber_value_kr: 680_000,
    warnings: 1,
    last_survey_date: null,
    center: [15.13, 58.33],
    boundary: [[15.12, 58.325], [15.14, 58.325], [15.14, 58.335], [15.12, 58.335], [15.12, 58.325]],
    status: 'unknown',
  },
];

const DEMO_SUMMARY: PortfolioSummary = {
  totalHectares: DEMO_PARCELS.reduce((s, p) => s + p.area_hectares, 0),
  totalValue: DEMO_PARCELS.reduce((s, p) => s + p.timber_value_kr, 0),
  avgHealthScore: Math.round(DEMO_PARCELS.reduce((s, p) => s + p.health_score, 0) / DEMO_PARCELS.length),
  activeWarnings: DEMO_PARCELS.reduce((s, p) => s + p.warnings, 0),
  hectaresTrend: 0,
  valueTrend: 3.2,
  healthTrend: -1.5,
  warningsTrend: 2,
};

// ─── Hook ───

export function usePortfolio(): UsePortfolioReturn {
  const [parcels, setParcels] = useState<PortfolioParcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchParcels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (isDemo()) {
      setParcels(DEMO_PARCELS);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('parcels')
        .select('id, name, municipality, county, area_hectares, health_score, timber_value_kr, warnings, last_survey_date, center, boundary, status')
        .order('name');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setParcels(data as PortfolioParcel[]);
      } else {
        // Fallback to demo data if no parcels found
        setParcels(DEMO_PARCELS);
      }
    } catch (err: any) {
      // Use demo data on error
      setParcels(DEMO_PARCELS);
      setError(err.message ?? 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  // Filter
  const filteredParcels = useMemo(() => {
    let result = [...parcels];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.municipality.toLowerCase().includes(q) ||
          p.county.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      // Handle nulls for last_survey_date
      if (aVal === null) aVal = sortDirection === 'asc' ? '\uffff' : '';
      if (bVal === null) bVal = sortDirection === 'asc' ? '\uffff' : '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'sv')
          : bVal.localeCompare(aVal, 'sv');
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [parcels, searchQuery, sortField, sortDirection]);

  // Summary
  const summary = useMemo<PortfolioSummary>(() => {
    if (parcels.length === 0) {
      return { totalHectares: 0, totalValue: 0, avgHealthScore: 0, activeWarnings: 0, hectaresTrend: 0, valueTrend: 0, healthTrend: 0, warningsTrend: 0 };
    }

    if (isDemo()) return DEMO_SUMMARY;

    return {
      totalHectares: parcels.reduce((s, p) => s + p.area_hectares, 0),
      totalValue: parcels.reduce((s, p) => s + p.timber_value_kr, 0),
      avgHealthScore: Math.round(parcels.reduce((s, p) => s + p.health_score, 0) / parcels.length),
      activeWarnings: parcels.reduce((s, p) => s + p.warnings, 0),
      hectaresTrend: 0,
      valueTrend: 0,
      healthTrend: 0,
      warningsTrend: 0,
    };
  }, [parcels]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  // CSV export
  const exportCsv = useCallback(() => {
    const headers = ['Name', 'Municipality', 'County', 'Area (ha)', 'Health Score', 'Timber Value (kr)', 'Warnings', 'Last Survey Date', 'Status'];
    const rows = filteredParcels.map((p) => [
      p.name,
      p.municipality,
      p.county,
      String(p.area_hectares),
      String(p.health_score),
      String(p.timber_value_kr),
      String(p.warnings),
      p.last_survey_date ?? 'N/A',
      p.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beetlesense-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredParcels]);

  return {
    parcels,
    filteredParcels,
    summary,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSortField,
    toggleSortDirection,
    exportCsv,
    refetch: fetchParcels,
  };
}
