export interface BBox {
  west: number
  south: number
  east: number
  north: number
}

export interface LngLat {
  lng: number
  lat: number
}

export type CRS = 'EPSG:3006' | 'EPSG:4326'

export interface GeoJSONGeometry {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface GeoJSONFeature<P = Record<string, unknown>> {
  type: 'Feature'
  geometry: GeoJSONGeometry
  properties: P
  id?: string | number
  bbox?: [number, number, number, number]
}

export interface GeoJSONFeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection'
  features: GeoJSONFeature<P>[]
  bbox?: [number, number, number, number]
}

export interface ParcelGeoProperties {
  parcelId: string
  name: string
  areaHectares: number
  county?: string
  municipality?: string
}
