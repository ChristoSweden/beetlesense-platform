/**
 * useDataExport — hook for the Data Export & Portability system.
 *
 * Provides export categories with file counts/sizes, export job
 * creation with progress tracking, download link management,
 * and export history. In demo mode, simulates export preparation.
 */

import { useState, useCallback, useMemo } from 'react';
import { isDemoMode } from '@/lib/dataMode';

// ─── Types ───

export type ExportCategoryId =
  | 'parcels'
  | 'forest_data'
  | 'satellite'
  | 'observations'
  | 'financials'
  | 'ai_history'
  | 'documents'
  | 'sensor_products';

export type SpatialFormat = 'geojson' | 'shapefile' | 'geopackage';
export type TabularFormat = 'csv' | 'excel' | 'json';
export type DocFormat = 'pdf' | 'original';
export type RasterFormat = 'geotiff';
export type ExportFormat = SpatialFormat | TabularFormat | DocFormat | RasterFormat;

export interface ExportCategory {
  id: ExportCategoryId;
  nameSv: string;
  nameEn: string;
  descriptionSv: string;
  icon: string; // lucide icon name
  itemCount: number;
  estimatedSizeBytes: number;
  availableFormats: ExportFormat[];
  defaultFormat: ExportFormat;
  lastExported: string | null;
  selected: boolean;
  selectedFormat: ExportFormat;
  dateFrom: string;
  dateTo: string;
}

export type ExportJobStatus = 'idle' | 'preparing' | 'collecting' | 'packing' | 'complete' | 'error';

export interface ExportJob {
  id: string;
  status: ExportJobStatus;
  progress: number; // 0-100
  categoryProgress: Record<ExportCategoryId, number>;
  startedAt: string;
  estimatedTimeRemaining: number | null; // seconds
  downloadUrl: string | null;
  totalSizeBytes: number;
  error: string | null;
}

export interface ExportHistoryEntry {
  id: string;
  name: string;
  categories: ExportCategoryId[];
  formats: string;
  createdAt: string;
  sizeBytes: number;
  downloadUrl: string | null;
}

// ─── Demo data ───

const DEMO_CATEGORIES: Omit<ExportCategory, 'selected' | 'selectedFormat' | 'dateFrom' | 'dateTo'>[] = [
  {
    id: 'parcels',
    nameSv: 'Skiften',
    nameEn: 'Parcels',
    descriptionSv: 'Gränser, attribut, areal och koordinater',
    icon: 'Map',
    itemCount: 5,
    estimatedSizeBytes: 245_000,
    availableFormats: ['geojson', 'shapefile', 'geopackage', 'csv', 'excel'],
    defaultFormat: 'geojson',
    lastExported: '2026-03-10T14:30:00Z',
  },
  {
    id: 'forest_data',
    nameSv: 'Skogsdata',
    nameEn: 'Forest Data',
    descriptionSv: 'Volym, trädslag, ålder och hälsoindex',
    icon: 'TreePine',
    itemCount: 5,
    estimatedSizeBytes: 1_820_000,
    availableFormats: ['csv', 'excel', 'json', 'geojson'],
    defaultFormat: 'csv',
    lastExported: '2026-03-08T09:15:00Z',
  },
  {
    id: 'satellite',
    nameSv: 'Satellitbilder',
    nameEn: 'Satellite Imagery',
    descriptionSv: 'NDVI-index, hälsokartor och tidserier',
    icon: 'Satellite',
    itemCount: 24,
    estimatedSizeBytes: 48_500_000,
    availableFormats: ['geojson', 'csv', 'json', 'original'],
    defaultFormat: 'original',
    lastExported: null,
  },
  {
    id: 'observations',
    nameSv: 'Observationer',
    nameEn: 'Observations',
    descriptionSv: 'Fältobservationer, undersökningar och foton',
    icon: 'Eye',
    itemCount: 47,
    estimatedSizeBytes: 12_300_000,
    availableFormats: ['csv', 'excel', 'json', 'geojson'],
    defaultFormat: 'csv',
    lastExported: '2026-02-28T16:00:00Z',
  },
  {
    id: 'financials',
    nameSv: 'Ekonomi',
    nameEn: 'Financials',
    descriptionSv: 'Virkesförsäljning, koldioxidkrediter och betalningar',
    icon: 'Wallet',
    itemCount: 18,
    estimatedSizeBytes: 42_000,
    availableFormats: ['csv', 'excel', 'json', 'pdf'],
    defaultFormat: 'excel',
    lastExported: '2026-03-01T11:45:00Z',
  },
  {
    id: 'ai_history',
    nameSv: 'AI-historik',
    nameEn: 'AI History',
    descriptionSv: 'Alla AI-konversationer och rekommendationer',
    icon: 'Sparkles',
    itemCount: 12,
    estimatedSizeBytes: 156_000,
    availableFormats: ['json', 'csv', 'pdf'],
    defaultFormat: 'json',
    lastExported: null,
  },
  {
    id: 'documents',
    nameSv: 'Dokument',
    nameEn: 'Documents',
    descriptionSv: 'Tillstånd, certifieringar och rapporter',
    icon: 'FileText',
    itemCount: 8,
    estimatedSizeBytes: 5_200_000,
    availableFormats: ['pdf', 'original', 'csv'],
    defaultFormat: 'pdf',
    lastExported: '2026-03-12T10:00:00Z',
  },
  {
    id: 'sensor_products',
    nameSv: 'Sensorprodukter',
    nameEn: 'Sensor Products',
    descriptionSv: 'Drönarsensordata — multispektral, termisk, RGB, LiDAR och fusionprodukter',
    icon: 'Scan',
    itemCount: 15,
    estimatedSizeBytes: 156_800_000,
    availableFormats: ['geotiff', 'geojson', 'csv'],
    defaultFormat: 'geotiff',
    lastExported: null,
  },
];

const DEMO_HISTORY: ExportHistoryEntry[] = [
  {
    id: 'eh1',
    name: 'Fullständig säkerhetskopia',
    categories: ['parcels', 'forest_data', 'observations', 'financials', 'documents'],
    formats: 'GeoJSON, CSV, PDF',
    createdAt: '2026-03-10T14:30:00Z',
    sizeBytes: 18_400_000,
    downloadUrl: '#',
  },
  {
    id: 'eh2',
    name: 'Skogsdata — alla skiften',
    categories: ['forest_data'],
    formats: 'CSV',
    createdAt: '2026-03-08T09:15:00Z',
    sizeBytes: 1_820_000,
    downloadUrl: '#',
  },
  {
    id: 'eh3',
    name: 'Ekonomirapport Q1',
    categories: ['financials'],
    formats: 'Excel',
    createdAt: '2026-03-01T11:45:00Z',
    sizeBytes: 42_000,
    downloadUrl: '#',
  },
];

// ─── Helpers ───

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatLabel(format: ExportFormat): string {
  const labels: Record<ExportFormat, string> = {
    geojson: 'GeoJSON',
    shapefile: 'Shapefile',
    geopackage: 'GeoPackage',
    csv: 'CSV',
    excel: 'Excel',
    json: 'JSON',
    pdf: 'PDF',
    original: 'Original',
    geotiff: 'GeoTIFF',
  };
  return labels[format] ?? format;
}

// ─── Hook ───

export function useDataExport() {
  const [categories, setCategories] = useState<ExportCategory[]>(
    DEMO_CATEGORIES.map((c) => ({
      ...c,
      selected: false,
      selectedFormat: c.defaultFormat,
      dateFrom: '',
      dateTo: '',
    })),
  );

  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [history, setHistory] = useState<ExportHistoryEntry[]>(DEMO_HISTORY);

  // Toggle category selection
  const toggleCategory = useCallback((id: ExportCategoryId) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)),
    );
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setCategories((prev) => prev.map((c) => ({ ...c, selected: true })));
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    setCategories((prev) => prev.map((c) => ({ ...c, selected: false })));
  }, []);

  // Update format for a category
  const setCategoryFormat = useCallback((id: ExportCategoryId, format: ExportFormat) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selectedFormat: format } : c)),
    );
  }, []);

  // Update date range
  const setCategoryDateRange = useCallback(
    (id: ExportCategoryId, dateFrom: string, dateTo: string) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, dateFrom, dateTo } : c)),
      );
    },
    [],
  );

  // Selected categories
  const selectedCategories = useMemo(
    () => categories.filter((c) => c.selected),
    [categories],
  );

  // Total estimated size for selected
  const totalSelectedSize = useMemo(
    () => selectedCategories.reduce((sum, c) => sum + c.estimatedSizeBytes, 0),
    [selectedCategories],
  );

  // Start export (demo mode: simulate progress)
  const startExport = useCallback(
    (name?: string) => {
      if (selectedCategories.length === 0) return;

      const jobId = crypto.randomUUID();
      const categoryProgress: Record<string, number> = {};
      for (const c of selectedCategories) {
        categoryProgress[c.id] = 0;
      }

      const job: ExportJob = {
        id: jobId,
        status: 'preparing',
        progress: 0,
        categoryProgress: categoryProgress as Record<ExportCategoryId, number>,
        startedAt: new Date().toISOString(),
        estimatedTimeRemaining: 8,
        downloadUrl: null,
        totalSizeBytes: totalSelectedSize,
        error: null,
      };

      setExportJob(job);

      // Simulate progress in demo mode
      const steps: ExportJobStatus[] = ['preparing', 'collecting', 'packing', 'complete'];
      let stepIdx = 0;
      let progress = 0;

      const interval = setInterval(() => {
        progress += Math.random() * 12 + 5;
        if (progress >= 100) progress = 100;

        if (progress > 30 && stepIdx < 1) stepIdx = 1;
        if (progress > 70 && stepIdx < 2) stepIdx = 2;
        if (progress >= 100) stepIdx = 3;

        const catProg: Record<string, number> = {};
        for (const c of selectedCategories) {
          catProg[c.id] = Math.min(100, progress + (Math.random() - 0.5) * 20);
          if (progress >= 100) catProg[c.id] = 100;
        }

        const updatedJob: ExportJob = {
          id: jobId,
          status: steps[stepIdx],
          progress: Math.round(progress),
          categoryProgress: catProg as Record<ExportCategoryId, number>,
          startedAt: job.startedAt,
          estimatedTimeRemaining: progress >= 100 ? 0 : Math.max(1, Math.round(8 * (1 - progress / 100))),
          downloadUrl: progress >= 100 ? '#demo-download' : null,
          totalSizeBytes: totalSelectedSize,
          error: null,
        };

        setExportJob(updatedJob);

        if (progress >= 100) {
          clearInterval(interval);
          // Add to history
          const entry: ExportHistoryEntry = {
            id: crypto.randomUUID(),
            name: name || `Export ${new Date().toLocaleDateString('sv-SE')}`,
            categories: selectedCategories.map((c) => c.id),
            formats: [...new Set(selectedCategories.map((c) => formatLabel(c.selectedFormat)))].join(', '),
            createdAt: new Date().toISOString(),
            sizeBytes: totalSelectedSize,
            downloadUrl: '#demo-download',
          };
          setHistory((prev) => [entry, ...prev]);
        }
      }, 400);

      return () => clearInterval(interval);
    },
    [selectedCategories, totalSelectedSize],
  );

  // Cancel export
  const cancelExport = useCallback(() => {
    setExportJob(null);
  }, []);

  // Dismiss completed export
  const dismissExport = useCallback(() => {
    setExportJob(null);
  }, []);

  return {
    categories,
    selectedCategories,
    totalSelectedSize,
    toggleCategory,
    selectAll,
    deselectAll,
    setCategoryFormat,
    setCategoryDateRange,
    exportJob,
    startExport,
    cancelExport,
    dismissExport,
    history,
    isDemo: isDemoMode(),
  };
}
