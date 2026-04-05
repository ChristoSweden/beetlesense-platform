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
 * - Protected Areas (CDDA 2022)
 * - Habitat Types (EUNIS 2012)
 * - Forest Types (JRC FTYPE)
 * - Biogeographical Regions (2016)
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
  protectedAreas: VectorLayerConfig;
  habitatTypes: RasterLayerConfig;
  forestTypes: RasterLayerConfig;
  bioregions: VectorLayerConfig;
  cadastralParcels: RasterLayerConfig;
  propertyBoundaries: RasterLayerConfig;
}

export interface InspireOverlaysProps {
  mapReady: boolean;
  showTreeCover: boolean;
  showLandCover: boolean;
  showNatura2000: boolean;
  showElevation: boolean;
  showProtectedAreas?: boolean;
  showHabitatTypes?: boolean;
  showForestTypes?: boolean;
  showBioregions?: boolean;
  showCadastralParcels?: boolean;
  showPropertyBoundaries?: boolean;
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

function getProtectedAreasUrl(bbox: [number, number, number, number]): string {
  return `https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/CDDA_2022/MapServer/WFSServer?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=CDDA_2022&BBOX=${bbox.join(',')},EPSG:4326&OUTPUTFORMAT=geojson&COUNT=30`;
}

function getHabitatTypesUrl(bbox: [number, number, number, number]): string {
  return `https://image.discomap.eea.europa.eu/arcgis/services/Habitats/EUNISHabitatType_2012/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=0&CRS=EPSG:4326&BBOX=${bbox.join(',')}&WIDTH=512&HEIGHT=512&FORMAT=image/png&TRANSPARENT=true`;
}

function getForestTypesUrl(bbox: [number, number, number, number]): string {
  return `https://image.discomap.eea.europa.eu/arcgis/services/ForestSpatialPattern/FTYPE_100m_2015/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=0&CRS=EPSG:4326&BBOX=${bbox.join(',')}&WIDTH=512&HEIGHT=512&FORMAT=image/png&TRANSPARENT=true`;
}

function getBioregionsUrl(bbox: [number, number, number, number]): string {
  return `https://bio.discomap.eea.europa.eu/arcgis/services/Biogeography/BiogeoRegions2016/MapServer/WFSServer?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=BiogeoRegions2016&BBOX=${bbox.join(',')},EPSG:4326&OUTPUTFORMAT=geojson&COUNT=5`;
}

// ─── Lantmäteriet Cadastral WMS (free, no API key) ───

const LM_WMS_BASE = 'https://minkarta.lantmateriet.se/map/fastighetsindelning';

function getCadastralParcelsUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: 'CP.CadastralParcel',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    STYLES: '',
  });
  return `${LM_WMS_BASE}?${params.toString()}`;
}

function getPropertyBoundariesUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: 'granser',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    STYLES: '',
  });
  return `${LM_WMS_BASE}?${params.toString()}`;
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
    protectedAreas: {
      id: 'inspire-cdda',
      type: 'vector' as const,
      url: getProtectedAreasUrl(bbox),
      label: 'Protected Areas (CDDA)',
      color: '#16a34a',
      opacity: 0.25,
    },
    habitatTypes: {
      id: 'inspire-eunis',
      type: 'raster' as const,
      url: getHabitatTypesUrl(bbox),
      label: 'Habitat Types (EUNIS)',
      opacity: 0.4,
    },
    forestTypes: {
      id: 'inspire-forest-type',
      type: 'raster' as const,
      url: getForestTypesUrl(bbox),
      label: 'Forest Types (JRC)',
      opacity: 0.5,
    },
    bioregions: {
      id: 'inspire-bioregions',
      type: 'vector' as const,
      url: getBioregionsUrl(bbox),
      label: 'Biogeographical Regions',
      color: '#8b5cf6',
      opacity: 0.15,
    },
    cadastralParcels: {
      id: 'lm-cadastral-parcels',
      type: 'raster' as const,
      url: getCadastralParcelsUrl(bbox),
      label: 'Cadastral Parcels (Lantmäteriet)',
      opacity: 0.5,
    },
    propertyBoundaries: {
      id: 'lm-property-boundaries',
      type: 'raster' as const,
      url: getPropertyBoundariesUrl(bbox),
      label: 'Property Boundaries (Lantmäteriet)',
      opacity: 0.7,
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
  showProtectedAreas,
  showHabitatTypes,
  showForestTypes,
  showBioregions,
  showCadastralParcels,
  showPropertyBoundaries,
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

  if (showProtectedAreas) {
    activeLayers.push({
      ...configs.protectedAreas,
      label: t('map.layers.protectedAreas', configs.protectedAreas.label),
    });
  }

  if (showHabitatTypes) {
    activeLayers.push({
      ...configs.habitatTypes,
      label: t('map.layers.habitatTypes', configs.habitatTypes.label),
    });
  }

  if (showForestTypes) {
    activeLayers.push({
      ...configs.forestTypes,
      label: t('map.layers.forestTypes', configs.forestTypes.label),
    });
  }

  if (showBioregions) {
    activeLayers.push({
      ...configs.bioregions,
      label: t('map.layers.bioregions', configs.bioregions.label),
    });
  }

  if (showCadastralParcels) {
    activeLayers.push({
      ...configs.cadastralParcels,
      label: t('map.layers.cadastralParcels', configs.cadastralParcels.label),
    });
  }

  if (showPropertyBoundaries) {
    activeLayers.push({
      ...configs.propertyBoundaries,
      label: t('map.layers.propertyBoundaries', configs.propertyBoundaries.label),
    });
  }

  return activeLayers.length > 0 ? activeLayers : null;
}
