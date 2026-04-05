/**
 * INSPIRE Overlays — WMS/WFS layer configs for MapLibre
 *
 * Generates layer configuration objects for INSPIRE open data layers.
 * These configs can be consumed by the BaseMap or any MapLibre-based
 * component to add raster/vector overlays.
 *
 * Layers:
 * - Tree Cover Density (Copernicus Land Monitoring Service)
 * - Land Cover (Corine CLC 2018)
 * - Natura 2000 Protected Sites (EEA)
 * - Elevation (EU-DEM v1.1)
 */

import { useTranslation } from 'react-i18next';

// ─── Types ───

interface RasterLayerConfig {
  id: string;
  type: 'raster';
  url: string;
  label: string;
  opacity: number;
}

interface VectorLayerConfig {
  id: string;
  type: 'vector';
  url: string;
  label: string;
  color: string;
  opacity: number;
}

export type InspireLayerConfig = RasterLayerConfig | VectorLayerConfig;

export interface InspireLayerConfigs {
  treeCoverDensity: RasterLayerConfig;
  landCover: RasterLayerConfig;
  natura2000: VectorLayerConfig;
  elevation: RasterLayerConfig;
}

export interface InspireOverlaysProps {
  mapReady: boolean;
  showTreeCover: boolean;
  showLandCover: boolean;
  showNatura2000: boolean;
  showElevation: boolean;
  bbox: [number, number, number, number];
}

// ─── WMS URL Builders ───

function getTreeCoverDensityUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: 'TCD',
    CRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
  });
  return `https://image.discomap.eea.europa.eu/arcgis/services/GioLand/HRL_TreeCoverDensity_2018/MapServer/WMSServer?${params.toString()}`;
}

function getLandCoverUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: '12',
    CRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
  });
  return `https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?${params.toString()}`;
}

function getNatura2000Url(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    REQUEST: 'GetFeature',
    VERSION: '2.0.0',
    TYPENAMES: 'Natura2000End2021',
    BBOX: `${bbox.join(',')},EPSG:4326`,
    OUTPUTFORMAT: 'geojson',
    COUNT: '50',
  });
  return `https://bio.discomap.eea.europa.eu/arcgis/services/Natura2000/Natura2000End2021/MapServer/WFSServer?${params.toString()}`;
}

function getElevationUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: '1',
    CRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
  });
  return `https://image.discomap.eea.europa.eu/arcgis/services/Elevation/EUDem_v11/MapServer/WMSServer?${params.toString()}`;
}

// ─── Layer Config Generator ───

/**
 * Generate INSPIRE layer configurations for a given bounding box.
 * These configs contain all the info needed to add layers to a MapLibre map.
 */
export function getInspireLayerConfigs(
  bbox: [number, number, number, number],
): InspireLayerConfigs {
  return {
    treeCoverDensity: {
      id: 'inspire-tree-cover',
      type: 'raster' as const,
      url: getTreeCoverDensityUrl(bbox),
      label: 'Tree Cover Density (CLMS)',
      opacity: 0.6,
    },
    landCover: {
      id: 'inspire-land-cover',
      type: 'raster' as const,
      url: getLandCoverUrl(bbox),
      label: 'Land Cover (Corine)',
      opacity: 0.5,
    },
    natura2000: {
      id: 'inspire-natura2000',
      type: 'vector' as const,
      url: getNatura2000Url(bbox),
      label: 'Natura 2000 Sites',
      color: '#22c55e',
      opacity: 0.3,
    },
    elevation: {
      id: 'inspire-elevation',
      type: 'raster' as const,
      url: getElevationUrl(bbox),
      label: 'Elevation (EU-DEM)',
      opacity: 0.4,
    },
  };
}

// ─── React Component ───

/**
 * InspireOverlays — returns the list of active INSPIRE layer configs
 * based on toggle props. Does not render any visible UI.
 *
 * Usage:
 *   const layers = InspireOverlays({ mapReady, showTreeCover, ... bbox });
 *   // then pass `layers` to your map component to add/remove sources
 */
export default function InspireOverlays({
  mapReady,
  showTreeCover,
  showLandCover,
  showNatura2000,
  showElevation,
  bbox,
}: InspireOverlaysProps): InspireLayerConfig[] | null {
  const { t } = useTranslation();

  if (!mapReady) return null;

  const configs = getInspireLayerConfigs(bbox);
  const activeLayers: InspireLayerConfig[] = [];

  if (showTreeCover) {
    activeLayers.push({
      ...configs.treeCoverDensity,
      label: t('map.layers.treeCover', configs.treeCoverDensity.label),
    });
  }

  if (showLandCover) {
    activeLayers.push({
      ...configs.landCover,
      label: t('map.layers.landCover', configs.landCover.label),
    });
  }

  if (showNatura2000) {
    activeLayers.push({
      ...configs.natura2000,
      label: t('map.layers.natura2000', configs.natura2000.label),
    });
  }

  if (showElevation) {
    activeLayers.push({
      ...configs.elevation,
      label: t('map.layers.elevation', configs.elevation.label),
    });
  }

  return activeLayers.length > 0 ? activeLayers : null;
}
