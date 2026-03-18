/**
 * useSensorProducts — Fetches multi-sensor drone data products.
 *
 * Retrieves sensor_products and fusion_products for a given parcelId or
 * surveyId. In demo mode, returns realistic mock data for multispectral
 * (NDVI, NDRE, etc.), thermal, RGB, and LiDAR products.
 *
 * Products are grouped by sensor type, with download URL generation via
 * Supabase Storage.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type SensorType = 'multispectral' | 'thermal' | 'rgb' | 'lidar';

export interface SensorProduct {
  id: string;
  survey_id: string;
  parcel_id: string;
  sensor_type: SensorType;
  product_name: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
  /** Signed download URL (generated on demand) */
  download_url?: string;
}

export interface FusionProduct {
  id: string;
  survey_id: string;
  parcel_id: string;
  product_name: string;
  storage_path: string;
  sensors_used: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  /** Signed download URL (generated on demand) */
  download_url?: string;
}

export interface SensorProductsByType {
  multispectral: SensorProduct[];
  thermal: SensorProduct[];
  rgb: SensorProduct[];
  lidar: SensorProduct[];
}

export interface SensorProductsData {
  /** All sensor products (flat list) */
  sensorProducts: SensorProduct[];
  /** Fusion products derived from multi-sensor pipelines */
  fusionProducts: FusionProduct[];
  /** Sensor products grouped by sensor type */
  bySensorType: SensorProductsByType;
  /** Whether data is loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether using demo data */
  isDemo: boolean;
  /** Force refresh data */
  refresh: () => Promise<void>;
  /** Generate a signed download URL for a sensor product */
  getDownloadUrl: (storagePath: string) => Promise<string | null>;
}

// ─── Demo data ───

const DEMO_SURVEY_ID = 's1';
const DEMO_PARCEL_ID = 'p1';
const DEMO_CREATED = '2026-03-06T14:30:00Z';

const DEMO_SENSOR_PRODUCTS: SensorProduct[] = [
  // Multispectral products
  {
    id: 'sp-ms-ndvi',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'multispectral',
    product_name: 'ndvi',
    storage_path: 'surveys/s1/multispectral/ndvi.tif',
    metadata: { band_formula: '(NIR - Red) / (NIR + Red)', resolution_cm: 5, min: 0.12, max: 0.91, mean: 0.68 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-ms-ndre',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'multispectral',
    product_name: 'ndre',
    storage_path: 'surveys/s1/multispectral/ndre.tif',
    metadata: { band_formula: '(NIR - RedEdge) / (NIR + RedEdge)', resolution_cm: 5, min: 0.05, max: 0.72, mean: 0.41 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-ms-evi',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'multispectral',
    product_name: 'evi',
    storage_path: 'surveys/s1/multispectral/evi.tif',
    metadata: { band_formula: '2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)', resolution_cm: 5, min: 0.08, max: 0.78, mean: 0.52 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-ms-chlorophyll',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'multispectral',
    product_name: 'chlorophyll_index',
    storage_path: 'surveys/s1/multispectral/chlorophyll_index.tif',
    metadata: { band_formula: 'MCARI/MTVI2', resolution_cm: 5, min: 1.2, max: 48.5, mean: 28.3, unit: 'ug/cm2' },
    created_at: DEMO_CREATED,
  },
  // Thermal products
  {
    id: 'sp-th-temperature',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'thermal',
    product_name: 'temperature',
    storage_path: 'surveys/s1/thermal/temperature.tif',
    metadata: { resolution_cm: 10, min_celsius: 8.2, max_celsius: 24.7, mean_celsius: 14.3, radiometric_accuracy: '±0.5°C' },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-th-anomaly',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'thermal',
    product_name: 'thermal_anomaly',
    storage_path: 'surveys/s1/thermal/anomaly.tif',
    metadata: { resolution_cm: 10, method: 'z-score', hotspots_count: 47, threshold_sigma: 2.0 },
    created_at: DEMO_CREATED,
  },
  // RGB products
  {
    id: 'sp-rgb-ortho',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'rgb',
    product_name: 'orthomosaic',
    storage_path: 'surveys/s1/rgb/orthomosaic.tif',
    metadata: { resolution_cm: 2.5, images_count: 1247, overlap_front: 80, overlap_side: 70, file_size_mb: 2340 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-rgb-dsm',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'rgb',
    product_name: 'dsm',
    storage_path: 'surveys/s1/rgb/dsm.tif',
    metadata: { resolution_cm: 5, method: 'photogrammetry', crs: 'EPSG:3006', vertical_accuracy_m: 0.15 },
    created_at: DEMO_CREATED,
  },
  // LiDAR products
  {
    id: 'sp-li-chm',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'lidar',
    product_name: 'canopy_height_model',
    storage_path: 'surveys/s1/lidar/chm.tif',
    metadata: { resolution_cm: 50, point_density_per_m2: 45, max_height_m: 32.4, mean_height_m: 18.7, crs: 'EPSG:3006' },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-li-dtm',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'lidar',
    product_name: 'dtm',
    storage_path: 'surveys/s1/lidar/dtm.tif',
    metadata: { resolution_cm: 50, point_density_per_m2: 45, crs: 'EPSG:3006', ground_classification: 'ASPRS Class 2' },
    created_at: DEMO_CREATED,
  },
  {
    id: 'sp-li-pointcloud',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    sensor_type: 'lidar',
    product_name: 'classified_pointcloud',
    storage_path: 'surveys/s1/lidar/classified.laz',
    metadata: { point_count: 189_400_000, point_density_per_m2: 45, classifications: ['ground', 'low_veg', 'med_veg', 'high_veg', 'building'], file_size_mb: 870 },
    created_at: DEMO_CREATED,
  },
];

const DEMO_FUSION_PRODUCTS: FusionProduct[] = [
  {
    id: 'fp-beetle-stress',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    product_name: 'beetle_stress',
    storage_path: 'surveys/s1/fusion/beetle_stress.tif',
    sensors_used: ['multispectral', 'thermal', 'rgb'],
    metadata: { model_version: '2.3.1', affected_area_pct: 12.4, confidence_mean: 0.87, classes: ['healthy', 'early_stress', 'active_attack', 'grey_attack'] },
    created_at: DEMO_CREATED,
  },
  {
    id: 'fp-crown-health',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    product_name: 'crown_health',
    storage_path: 'surveys/s1/fusion/crown_health.tif',
    sensors_used: ['multispectral', 'thermal', 'lidar', 'rgb'],
    metadata: { model_version: '1.8.0', total_crowns: 3240, healthy_pct: 78, stressed_pct: 15, dead_pct: 7 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'fp-moisture-stress',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    product_name: 'moisture_stress',
    storage_path: 'surveys/s1/fusion/moisture_stress.tif',
    sensors_used: ['multispectral', 'thermal'],
    metadata: { model_version: '1.2.0', cwsi_mean: 0.34, cwsi_max: 0.81, drought_risk_area_pct: 8.2 },
    created_at: DEMO_CREATED,
  },
  {
    id: 'fp-tree-inventory',
    survey_id: DEMO_SURVEY_ID,
    parcel_id: DEMO_PARCEL_ID,
    product_name: 'tree_inventory',
    storage_path: 'surveys/s1/fusion/tree_inventory.gpkg',
    sensors_used: ['multispectral', 'thermal', 'lidar', 'rgb'],
    metadata: { tree_count: 3240, species_detected: 3, mean_height_m: 18.7, total_volume_m3: 4850 },
    created_at: DEMO_CREATED,
  },
];

// ─── Hook ───

export function useSensorProducts(options: {
  parcelId?: string;
  surveyId?: string;
}): SensorProductsData {
  const { parcelId, surveyId } = options;

  const [sensorProducts, setSensorProducts] = useState<SensorProduct[]>([]);
  const [fusionProducts, setFusionProducts] = useState<FusionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Demo mode
    if (isDemo()) {
      await new Promise(r => setTimeout(r, 300));
      // Filter demo data by parcelId/surveyId if provided, otherwise return all
      const filteredSensor = DEMO_SENSOR_PRODUCTS.filter(p =>
        (!parcelId || p.parcel_id === parcelId || parcelId === DEMO_PARCEL_ID) &&
        (!surveyId || p.survey_id === surveyId || surveyId === DEMO_SURVEY_ID),
      );
      const filteredFusion = DEMO_FUSION_PRODUCTS.filter(p =>
        (!parcelId || p.parcel_id === parcelId || parcelId === DEMO_PARCEL_ID) &&
        (!surveyId || p.survey_id === surveyId || surveyId === DEMO_SURVEY_ID),
      );
      setSensorProducts(filteredSensor);
      setFusionProducts(filteredFusion);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    try {
      // Build sensor_products query
      let spQuery = supabase
        .from('sensor_products')
        .select('*')
        .order('sensor_type', { ascending: true })
        .order('product_name', { ascending: true });

      if (parcelId) spQuery = spQuery.eq('parcel_id', parcelId);
      if (surveyId) spQuery = spQuery.eq('survey_id', surveyId);

      // Build fusion_products query
      let fpQuery = supabase
        .from('fusion_products')
        .select('*')
        .order('product_name', { ascending: true });

      if (parcelId) fpQuery = fpQuery.eq('parcel_id', parcelId);
      if (surveyId) fpQuery = fpQuery.eq('survey_id', surveyId);

      // Execute both queries in parallel
      const [spResult, fpResult] = await Promise.all([spQuery, fpQuery]);

      if (spResult.error) throw new Error(spResult.error.message);
      if (fpResult.error) throw new Error(fpResult.error.message);

      // If no data from live, fall back to demo
      if (
        (!spResult.data || spResult.data.length === 0) &&
        (!fpResult.data || fpResult.data.length === 0)
      ) {
        setSensorProducts(DEMO_SENSOR_PRODUCTS);
        setFusionProducts(DEMO_FUSION_PRODUCTS);
        setIsDemoMode(true);
        setLoading(false);
        return;
      }

      setSensorProducts((spResult.data ?? []) as SensorProduct[]);
      setFusionProducts((fpResult.data ?? []) as FusionProduct[]);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sensor products';
      console.warn('useSensorProducts: fetch failed, using demo data', err);
      setError(message);
      setSensorProducts(DEMO_SENSOR_PRODUCTS);
      setFusionProducts(DEMO_FUSION_PRODUCTS);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [parcelId, surveyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Group sensor products by type
  const bySensorType = useMemo((): SensorProductsByType => {
    const groups: SensorProductsByType = {
      multispectral: [],
      thermal: [],
      rgb: [],
      lidar: [],
    };

    for (const product of sensorProducts) {
      if (product.sensor_type in groups) {
        groups[product.sensor_type].push(product);
      }
    }

    return groups;
  }, [sensorProducts]);

  // Generate signed download URL from Supabase Storage
  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    if (isDemoMode) {
      // In demo mode, return a placeholder URL
      return `https://demo.beetlesense.ai/downloads/${storagePath}`;
    }

    try {
      const { data, error: urlError } = await supabase.storage
        .from('survey-data')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (urlError) {
        console.warn('useSensorProducts: failed to create signed URL', urlError);
        return null;
      }

      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  }, [isDemoMode]);

  return {
    sensorProducts,
    fusionProducts,
    bySensorType,
    loading,
    error,
    isDemo: isDemoMode,
    refresh,
    getDownloadUrl,
  };
}
