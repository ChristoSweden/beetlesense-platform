import { BaseConnector, ConnectorResponse } from './baseConnector';
import {
  queryPropertyAtPoint,
  getPropertyBoundaryTileUrl,
} from '../opendata/lantmaterietCadastralService';

export interface PropertyBoundary {
  id: string;
  name: string;
  geojson: any;
  municipality: string;
  area_ha: number;
}

class LantmaterietConnector extends BaseConnector {
  constructor() {
    super('supabase');
  }

  /**
   * Fetches the fastighetsgränser for a given point using the free
   * Lantmäteriet WMS GetFeatureInfo (INSPIRE Cadastral Parcels).
   * No API key required.
   */
  async snapToProperty(lat: number, lon: number): Promise<ConnectorResponse<PropertyBoundary>> {
    return this.execute(async () => {
      const info = await queryPropertyAtPoint(lat, lon, 15);

      if (info) {
        // Build a small polygon around the point for display.
        // The WMS GetFeatureInfo gives us property ID but not geometry.
        // The actual boundary is rendered via the WMS raster tile layer.
        const BUFFER = 0.005;
        return {
          id: info.objectId || `LM-${Date.now()}`,
          name: info.fastighetsbeteckning,
          geojson: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [lon - BUFFER, lat - BUFFER],
                [lon + BUFFER, lat - BUFFER],
                [lon + BUFFER, lat + BUFFER],
                [lon - BUFFER, lat + BUFFER],
                [lon - BUFFER, lat - BUFFER],
              ]],
            },
          },
          municipality: info.municipality || 'Unknown',
          area_ha: info.area ? +(info.area / 10000).toFixed(1) : 0,
        };
      }

      // Fallback when GetFeatureInfo returns no result (e.g. clicked on water)
      return {
        id: `LM-${Date.now()}`,
        name: `Fastighet vid ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        geojson: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [lon - 0.005, lat - 0.005],
              [lon + 0.005, lat - 0.005],
              [lon + 0.005, lat + 0.005],
              [lon - 0.005, lat + 0.005],
              [lon - 0.005, lat - 0.005],
            ]],
          },
        },
        municipality: 'Unknown',
        area_ha: 0,
      };
    }, 'SnapToProperty');
  }

  /**
   * Get the MapLibre tile URL for the property boundary WMS layer.
   * Can be added as a raster source to any MapLibre map.
   */
  getTileUrl(): string {
    return getPropertyBoundaryTileUrl();
  }
}

export const lantmaterietConnector = new LantmaterietConnector();
