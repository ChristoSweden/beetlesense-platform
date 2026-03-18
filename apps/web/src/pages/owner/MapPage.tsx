import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Locate,
  Ruler,
  PenTool,
  Maximize,
  Minimize,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Eye,
  EyeOff,
  Satellite,
  Thermometer,
  TreePine,
  Bug,
  CloudLightning,
  Plane,
  Users,
  Cloud,
  FileDown,
  ClipboardList,
  Camera,
  Leaf,
} from 'lucide-react';

// ─── Demo data ───

type HealthStatus = 'healthy' | 'at_risk' | 'infested';

interface DemoParcel {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area_ha: number;
  health: HealthStatus;
  healthScore: number;
  riskLevel: string;
  municipality: string;
  lastSurvey: string;
  speciesMix: string;
  ndviHistory: number[]; // 12 months of NDVI values 0-1
}

const PARCELS: DemoParcel[] = [
  {
    id: 'p1', name: 'Granudden', lat: 57.78, lng: 14.16,
    area_ha: 31.9, health: 'infested', healthScore: 32, riskLevel: 'Critical',
    municipality: 'Jönköping', lastSurvey: '2026-03-08',
    speciesMix: 'Spruce 85%, Pine 10%, Birch 5%',
    ndviHistory: [0.72, 0.70, 0.65, 0.58, 0.50, 0.45, 0.42, 0.38, 0.35, 0.33, 0.31, 0.32],
  },
  {
    id: 'p2', name: 'Tallbacken', lat: 57.65, lng: 14.30,
    area_ha: 45.2, health: 'healthy', healthScore: 88, riskLevel: 'Low',
    municipality: 'Nässjö', lastSurvey: '2026-03-12',
    speciesMix: 'Pine 70%, Spruce 20%, Birch 10%',
    ndviHistory: [0.78, 0.80, 0.82, 0.84, 0.85, 0.86, 0.87, 0.86, 0.85, 0.84, 0.83, 0.84],
  },
  {
    id: 'p3', name: 'Björklund', lat: 58.20, lng: 13.85,
    area_ha: 22.7, health: 'at_risk', healthScore: 61, riskLevel: 'Moderate',
    municipality: 'Skara', lastSurvey: '2026-02-28',
    speciesMix: 'Birch 45%, Spruce 35%, Oak 20%',
    ndviHistory: [0.80, 0.78, 0.76, 0.73, 0.70, 0.68, 0.65, 0.63, 0.61, 0.60, 0.59, 0.61],
  },
  {
    id: 'p4', name: 'Ekskogen', lat: 56.90, lng: 14.70,
    area_ha: 55.8, health: 'healthy', healthScore: 91, riskLevel: 'Low',
    municipality: 'Olofström', lastSurvey: '2026-03-15',
    speciesMix: 'Oak 50%, Beech 30%, Birch 20%',
    ndviHistory: [0.82, 0.83, 0.85, 0.87, 0.88, 0.89, 0.90, 0.91, 0.90, 0.89, 0.88, 0.89],
  },
  {
    id: 'p5', name: 'Furudal', lat: 57.35, lng: 14.55,
    area_ha: 38.4, health: 'at_risk', healthScore: 55, riskLevel: 'Moderate',
    municipality: 'Vetlanda', lastSurvey: '2026-03-01',
    speciesMix: 'Spruce 60%, Pine 30%, Birch 10%',
    ndviHistory: [0.75, 0.73, 0.70, 0.68, 0.65, 0.62, 0.58, 0.55, 0.53, 0.52, 0.54, 0.55],
  },
  {
    id: 'p6', name: 'Aspängen', lat: 58.05, lng: 14.10,
    area_ha: 19.6, health: 'healthy', healthScore: 85, riskLevel: 'Low',
    municipality: 'Hjo', lastSurvey: '2026-03-10',
    speciesMix: 'Aspen 40%, Spruce 35%, Pine 25%',
    ndviHistory: [0.76, 0.78, 0.80, 0.82, 0.83, 0.84, 0.85, 0.84, 0.83, 0.82, 0.83, 0.85],
  },
  {
    id: 'p7', name: 'Lindbacka', lat: 57.50, lng: 13.95,
    area_ha: 28.3, health: 'infested', healthScore: 28, riskLevel: 'Critical',
    municipality: 'Ulricehamn', lastSurvey: '2026-03-05',
    speciesMix: 'Spruce 90%, Birch 10%',
    ndviHistory: [0.68, 0.64, 0.58, 0.50, 0.42, 0.36, 0.30, 0.26, 0.24, 0.25, 0.27, 0.28],
  },
  {
    id: 'p8', name: 'Orrhult', lat: 57.90, lng: 14.45,
    area_ha: 63.1, health: 'at_risk', healthScore: 58, riskLevel: 'Moderate',
    municipality: 'Mullsjö', lastSurvey: '2026-02-20',
    speciesMix: 'Spruce 55%, Pine 30%, Birch 15%',
    ndviHistory: [0.79, 0.77, 0.74, 0.71, 0.68, 0.65, 0.62, 0.59, 0.57, 0.56, 0.57, 0.58],
  },
];

// Demo risk zone polygons (bark beetle)
const BARK_BEETLE_ZONES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { risk: 'high', label: 'Granudden outbreak zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[14.10, 57.74], [14.22, 57.74], [14.22, 57.82], [14.10, 57.82], [14.10, 57.74]]],
      },
    },
    {
      type: 'Feature',
      properties: { risk: 'high', label: 'Lindbacka outbreak zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[13.88, 57.46], [14.02, 57.46], [14.02, 57.54], [13.88, 57.54], [13.88, 57.46]]],
      },
    },
    {
      type: 'Feature',
      properties: { risk: 'medium', label: 'Furudal risk area' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[14.45, 57.30], [14.65, 57.30], [14.65, 57.40], [14.45, 57.40], [14.45, 57.30]]],
      },
    },
  ],
};

// Demo storm risk zones
const STORM_ZONES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { risk: 'storm', label: 'Western storm corridor' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[13.70, 57.80], [14.00, 57.80], [14.00, 58.10], [13.70, 58.10], [13.70, 57.80]]],
      },
    },
    {
      type: 'Feature',
      properties: { risk: 'storm', label: 'Southern exposure zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[14.50, 56.80], [14.85, 56.80], [14.85, 57.00], [14.50, 57.00], [14.50, 56.80]]],
      },
    },
  ],
};

// Demo survey flight paths
const FLIGHT_PATHS: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { pilot: 'Erik Lindström', date: '2026-03-15', altitude: '120m' },
      geometry: {
        type: 'LineString',
        coordinates: [[14.10, 57.74], [14.18, 57.76], [14.22, 57.80], [14.16, 57.82], [14.12, 57.78]],
      },
    },
    {
      type: 'Feature',
      properties: { pilot: 'Anna Berggren', date: '2026-03-12', altitude: '100m' },
      geometry: {
        type: 'LineString',
        coordinates: [[14.25, 57.62], [14.32, 57.64], [14.35, 57.67], [14.30, 57.66]],
      },
    },
    {
      type: 'Feature',
      properties: { pilot: 'Oskar Nyström', date: '2026-03-10', altitude: '150m' },
      geometry: {
        type: 'LineString',
        coordinates: [[13.88, 57.47], [13.94, 57.49], [13.98, 57.52], [14.00, 57.50], [13.95, 57.48]],
      },
    },
  ],
};

// Demo drone pilot locations
const DRONE_PILOTS = [
  { name: 'Erik Lindström', lat: 57.76, lng: 14.14, status: 'Active' },
  { name: 'Anna Berggren', lat: 57.63, lng: 14.28, status: 'Available' },
  { name: 'Oskar Nyström', lat: 57.48, lng: 13.92, status: 'Active' },
  { name: 'Maria Johansson', lat: 58.18, lng: 13.88, status: 'Offline' },
];

// Parcel boundary polygons (demo)
const PARCEL_BOUNDARIES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: PARCELS.map((p) => {
    const d = 0.03;
    return {
      type: 'Feature' as const,
      properties: { id: p.id, name: p.name, health: p.health },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[p.lng - d, p.lat - d], [p.lng + d, p.lat - d], [p.lng + d, p.lat + d], [p.lng - d, p.lat + d], [p.lng - d, p.lat - d]]],
      },
    };
  }),
};

const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: '#22c55e',
  at_risk: '#f59e0b',
  infested: '#ef4444',
};

const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// ─── Layer config ───

interface LayerDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultVisible: boolean;
}

const LAYER_DEFS: LayerDef[] = [
  { id: 'satellite', label: 'Satellite imagery', icon: <Satellite size={14} />, defaultVisible: false },
  { id: 'ndvi', label: 'NDVI heatmap', icon: <Thermometer size={14} />, defaultVisible: false },
  { id: 'parcels', label: 'Parcel boundaries', icon: <TreePine size={14} />, defaultVisible: true },
  { id: 'beetles', label: 'Bark beetle risk', icon: <Bug size={14} />, defaultVisible: true },
  { id: 'storms', label: 'Storm risk zones', icon: <CloudLightning size={14} />, defaultVisible: false },
  { id: 'flights', label: 'Survey flight paths', icon: <Plane size={14} />, defaultVisible: false },
  { id: 'pilots', label: 'Drone pilot locations', icon: <Users size={14} />, defaultVisible: false },
  { id: 'weather', label: 'Weather overlay', icon: <Cloud size={14} />, defaultVisible: false },
  { id: 'thermal', label: 'Termisk anomali', icon: <Thermometer size={14} />, defaultVisible: false },
  { id: 'multispectral', label: 'Multispektral', icon: <Leaf size={14} />, defaultVisible: false },
  { id: 'crown-health', label: 'Kronhälsa', icon: <TreePine size={14} />, defaultVisible: false },
  { id: 'beetle-stress', label: 'Barkborrestress', icon: <Bug size={14} />, defaultVisible: false },
];

// ─── NDVI Heatmap GeoJSON (demo gradient points) ───

function generateNDVIPoints(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lat = 56.8; lat <= 58.3; lat += 0.15) {
    for (let lng = 13.7; lng <= 14.8; lng += 0.15) {
      // Vary NDVI by proximity to infested parcels
      const distToInfested = Math.min(
        ...PARCELS.filter((p) => p.health === 'infested').map(
          (p) => Math.sqrt((lat - p.lat) ** 2 + (lng - p.lng) ** 2),
        ),
      );
      const ndvi = Math.min(0.9, Math.max(0.2, 0.8 - (0.5 / (distToInfested + 0.3))));
      features.push({
        type: 'Feature',
        properties: { ndvi },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// ─── Thermal anomaly GeoJSON (demo hotspot zones) ───

function generateThermalZones(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  // Thermal hotspots near infested and at-risk parcels
  PARCELS.filter((p) => p.health === 'infested' || p.health === 'at_risk').forEach((p) => {
    const d = 0.02 + Math.random() * 0.02;
    const offsetLng = (Math.random() - 0.5) * 0.04;
    const offsetLat = (Math.random() - 0.5) * 0.04;
    const temp = p.health === 'infested' ? 38 + Math.random() * 6 : 32 + Math.random() * 4;
    features.push({
      type: 'Feature',
      properties: { temp: Math.round(temp * 10) / 10, label: `${p.name} thermal anomaly` },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [p.lng + offsetLng - d, p.lat + offsetLat - d],
          [p.lng + offsetLng + d, p.lat + offsetLat - d],
          [p.lng + offsetLng + d, p.lat + offsetLat + d],
          [p.lng + offsetLng - d, p.lat + offsetLat + d],
          [p.lng + offsetLng - d, p.lat + offsetLat - d],
        ]],
      },
    });
  });
  return { type: 'FeatureCollection', features };
}

// ─── Multispectral vegetation index GeoJSON (demo grid) ───

function generateMultispectralPoints(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lat = 56.8; lat <= 58.3; lat += 0.12) {
    for (let lng = 13.7; lng <= 14.8; lng += 0.12) {
      // Higher vegetation index away from infested areas
      const distToInfested = Math.min(
        ...PARCELS.filter((p) => p.health === 'infested').map(
          (p) => Math.sqrt((lat - p.lat) ** 2 + (lng - p.lng) ** 2),
        ),
      );
      const veg = Math.min(0.95, Math.max(0.15, 0.85 - (0.6 / (distToInfested + 0.25))));
      features.push({
        type: 'Feature',
        properties: { veg: Math.round(veg * 100) / 100 },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// ─── Crown health GeoJSON (demo per-tree circles) ───

function generateCrownHealthPoints(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  PARCELS.forEach((p) => {
    // Scatter sample tree points within each parcel
    const count = Math.floor(p.area_ha / 8) + 3;
    for (let i = 0; i < count; i++) {
      const jLng = p.lng + (Math.random() - 0.5) * 0.05;
      const jLat = p.lat + (Math.random() - 0.5) * 0.05;
      const score = Math.max(0.1, Math.min(1.0, p.healthScore / 100 + (Math.random() - 0.5) * 0.3));
      features.push({
        type: 'Feature',
        properties: { score: Math.round(score * 100) / 100, parcel: p.name },
        geometry: { type: 'Point', coordinates: [jLng, jLat] },
      });
    }
  });
  return { type: 'FeatureCollection', features };
}

// ─── Beetle stress fusion GeoJSON (demo zones) ───

function generateBeetleStressZones(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  PARCELS.forEach((p) => {
    if (p.health === 'healthy') return;
    const stress = p.health === 'infested' ? 'critical' : 'elevated';
    const d = 0.025 + (p.area_ha / 1000);
    features.push({
      type: 'Feature',
      properties: { stress, label: `${p.name} stress zone`, score: p.healthScore },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [p.lng - d, p.lat - d * 0.8],
          [p.lng + d, p.lat - d * 0.8],
          [p.lng + d * 1.1, p.lat + d * 0.6],
          [p.lng - d * 0.5, p.lat + d],
          [p.lng - d, p.lat - d * 0.8],
        ]],
      },
    });
  });
  return { type: 'FeatureCollection', features };
}

// ─── Component ───

const DEFAULT_CENTER: [number, number] = [14.5, 57.7];
const DEFAULT_ZOOM = 7;

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pilotMarkersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerPanel, setLayerPanel] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    () => new Set(LAYER_DEFS.filter((l) => l.defaultVisible).map((l) => l.id)),
  );
  const [selectedParcel, setSelectedParcel] = useState<DemoParcel | null>(null);
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const drawPointsRef = useRef<[number, number][]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search filtering
  const filteredParcels = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return PARCELS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.municipality.toLowerCase().includes(q),
    );
  }, [search]);

  // Toggle a layer
  const toggleLayer = useCallback((id: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Haversine distance in km
  const haversine = useCallback((a: [number, number], b: [number, number]) => {
    const R = 6371;
    const dLat = ((b[1] - a[1]) * Math.PI) / 180;
    const dLng = ((b[0] - a[0]) * Math.PI) / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinLng * sinLng;
    return 2 * R * Math.asin(Math.sqrt(h));
  }, []);

  // ─── Initialize map ───

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 4,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // ─── NDVI heatmap source + layer ───
      map.addSource('ndvi-points', {
        type: 'geojson',
        data: generateNDVIPoints(),
      });
      map.addLayer({
        id: 'ndvi-heatmap',
        type: 'heatmap',
        source: 'ndvi-points',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['get', 'ndvi'],
          'heatmap-intensity': 0.6,
          'heatmap-radius': 40,
          'heatmap-opacity': 0.6,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#8b0000',
            0.4, '#ff4500',
            0.6, '#ffa500',
            0.8, '#adff2f',
            1.0, '#006400',
          ],
        },
      });

      // ─── Parcel boundaries ───
      map.addSource('parcel-boundaries', {
        type: 'geojson',
        data: PARCEL_BOUNDARIES,
      });
      map.addLayer({
        id: 'parcel-boundaries-fill',
        type: 'fill',
        source: 'parcel-boundaries',
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'match', ['get', 'health'],
            'healthy', 'rgba(34,197,94,0.12)',
            'at_risk', 'rgba(245,158,11,0.12)',
            'infested', 'rgba(239,68,68,0.12)',
            'rgba(100,100,100,0.08)',
          ],
          'fill-outline-color': [
            'match', ['get', 'health'],
            'healthy', '#22c55e',
            'at_risk', '#f59e0b',
            'infested', '#ef4444',
            '#666',
          ],
        },
      });
      map.addLayer({
        id: 'parcel-boundaries-line',
        type: 'line',
        source: 'parcel-boundaries',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': [
            'match', ['get', 'health'],
            'healthy', '#22c55e',
            'at_risk', '#f59e0b',
            'infested', '#ef4444',
            '#666',
          ],
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // ─── Bark beetle risk zones ───
      map.addSource('beetle-zones', {
        type: 'geojson',
        data: BARK_BEETLE_ZONES,
      });
      map.addLayer({
        id: 'beetle-zones-fill',
        type: 'fill',
        source: 'beetle-zones',
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'match', ['get', 'risk'],
            'high', 'rgba(239,68,68,0.2)',
            'medium', 'rgba(245,158,11,0.15)',
            'rgba(200,200,200,0.1)',
          ],
          'fill-outline-color': [
            'match', ['get', 'risk'],
            'high', '#ef4444',
            'medium', '#f59e0b',
            '#999',
          ],
        },
      });
      map.addLayer({
        id: 'beetle-zones-line',
        type: 'line',
        source: 'beetle-zones',
        paint: {
          'line-color': [
            'match', ['get', 'risk'],
            'high', '#ef4444',
            'medium', '#f59e0b',
            '#999',
          ],
          'line-width': 1.5,
          'line-dasharray': [4, 2],
        },
      });

      // ─── Storm risk zones ───
      map.addSource('storm-zones', {
        type: 'geojson',
        data: STORM_ZONES,
      });
      map.addLayer({
        id: 'storm-zones-fill',
        type: 'fill',
        source: 'storm-zones',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': 'rgba(147,51,234,0.15)',
          'fill-outline-color': '#9333ea',
        },
      });
      map.addLayer({
        id: 'storm-zones-line',
        type: 'line',
        source: 'storm-zones',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#9333ea',
          'line-width': 1.5,
          'line-dasharray': [3, 3],
        },
      });

      // ─── Flight paths ───
      map.addSource('flight-paths', {
        type: 'geojson',
        data: FLIGHT_PATHS,
      });
      map.addLayer({
        id: 'flight-paths-line',
        type: 'line',
        source: 'flight-paths',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2.5,
          'line-dasharray': [1, 2],
        },
      });

      // ─── Thermal anomaly zones ───
      map.addSource('thermal-zones', {
        type: 'geojson',
        data: generateThermalZones(),
      });
      map.addLayer({
        id: 'thermal-zones-fill',
        type: 'fill',
        source: 'thermal-zones',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': 'rgba(239,68,68,0.2)',
          'fill-outline-color': '#ef4444',
        },
      });
      map.addLayer({
        id: 'thermal-zones-line',
        type: 'line',
        source: 'thermal-zones',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#ef4444',
          'line-width': 1.5,
          'line-dasharray': [2, 2],
        },
      });

      // ─── Multispectral vegetation index ───
      map.addSource('multispectral-points', {
        type: 'geojson',
        data: generateMultispectralPoints(),
      });
      map.addLayer({
        id: 'multispectral-heatmap',
        type: 'heatmap',
        source: 'multispectral-points',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['get', 'veg'],
          'heatmap-intensity': 0.5,
          'heatmap-radius': 35,
          'heatmap-opacity': 0.55,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#7f1d1d',
            0.4, '#a16207',
            0.6, '#65a30d',
            0.8, '#22c55e',
            1.0, '#15803d',
          ],
        },
      });

      // ─── Crown health circles ───
      map.addSource('crown-health-points', {
        type: 'geojson',
        data: generateCrownHealthPoints(),
      });
      map.addLayer({
        id: 'crown-health-circles',
        type: 'circle',
        source: 'crown-health-points',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            7, 4,
            12, 10,
            16, 18,
          ],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'score'],
            0.1, '#ef4444',
            0.4, '#f97316',
            0.6, '#eab308',
            0.8, '#84cc16',
            1.0, '#22c55e',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
      });

      // ─── Beetle stress fusion zones ───
      map.addSource('beetle-stress-zones', {
        type: 'geojson',
        data: generateBeetleStressZones(),
      });
      map.addLayer({
        id: 'beetle-stress-fill',
        type: 'fill',
        source: 'beetle-stress-zones',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'match', ['get', 'stress'],
            'critical', 'rgba(249,115,22,0.25)',
            'elevated', 'rgba(249,115,22,0.12)',
            'rgba(200,200,200,0.08)',
          ],
          'fill-outline-color': [
            'match', ['get', 'stress'],
            'critical', '#f97316',
            'elevated', '#fb923c',
            '#999',
          ],
        },
      });
      map.addLayer({
        id: 'beetle-stress-line',
        type: 'line',
        source: 'beetle-stress-zones',
        layout: { visibility: 'none' },
        paint: {
          'line-color': [
            'match', ['get', 'stress'],
            'critical', '#f97316',
            'elevated', '#fb923c',
            '#999',
          ],
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      // ─── Measure line source ───
      map.addSource('measure-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'measure-line-layer',
        type: 'line',
        source: 'measure-line',
        paint: {
          'line-color': '#f97316',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });
      map.addSource('measure-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'measure-points-layer',
        type: 'circle',
        source: 'measure-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#f97316',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      // ─── Draw polygon source ───
      map.addSource('draw-polygon', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draw-polygon-fill',
        type: 'fill',
        source: 'draw-polygon',
        paint: {
          'fill-color': 'rgba(59,130,246,0.15)',
          'fill-outline-color': '#3b82f6',
        },
      });
      map.addLayer({
        id: 'draw-polygon-line',
        type: 'line',
        source: 'draw-polygon',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };

  }, []);

  // ─── Parcel markers ───

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    PARCELS.forEach((parcel) => {
      const el = document.createElement('div');
      el.className = 'beetlesense-parcel-marker';
      el.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: ${HEALTH_COLOR[parcel.health]};
        border: 2.5px solid rgba(255,255,255,0.9);
        cursor: pointer;
        box-shadow: 0 0 8px ${HEALTH_COLOR[parcel.health]}80;
        transition: transform 0.15s, box-shadow 0.15s;
      `;

      // Hover tooltip
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.4)';
        el.style.boxShadow = `0 0 16px ${HEALTH_COLOR[parcel.health]}`;
        el.title = `${parcel.name} - ${parcel.health.replace('_', ' ')}`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = `0 0 8px ${HEALTH_COLOR[parcel.health]}80`;
      });

      // Click popup
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close any existing popup
        popupRef.current?.remove();

        const popup = new maplibregl.Popup({ offset: 20, closeButton: true, maxWidth: '260px' })
          .setLngLat([parcel.lng, parcel.lat])
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #e5e7eb; background: #1a1a2e; padding: 8px 4px; font-size: 13px;">
              <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #fff;">${parcel.name}</div>
              <div style="display: flex; gap: 12px; margin-bottom: 4px;">
                <span>${parcel.area_ha} ha</span>
                <span style="color: ${HEALTH_COLOR[parcel.health]}; font-weight: 600;">${parcel.health.replace('_', ' ')}</span>
              </div>
              <div style="color: #9ca3af; font-size: 11px;">
                Health score: <strong style="color: #fff;">${parcel.healthScore}/100</strong><br/>
                Last survey: ${parcel.lastSurvey}<br/>
                ${parcel.municipality}
              </div>
            </div>
          `)
          .addTo(map);
        popupRef.current = popup;

        // Open info panel
        setSelectedParcel(parcel);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([parcel.lng, parcel.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapLoaded]);

  // ─── Drone pilot markers ───

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old
    pilotMarkersRef.current.forEach((m) => m.remove());
    pilotMarkersRef.current = [];

    if (!visibleLayers.has('pilots')) return;

    DRONE_PILOTS.forEach((pilot) => {
      const el = document.createElement('div');
      const color = pilot.status === 'Active' ? '#3b82f6' : pilot.status === 'Available' ? '#22d3ee' : '#6b7280';
      el.style.cssText = `
        width: 12px; height: 12px; border-radius: 50%;
        background: ${color};
        border: 2px solid #fff;
        cursor: pointer;
        box-shadow: 0 0 6px ${color};
      `;
      el.title = `${pilot.name} (${pilot.status})`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popupRef.current?.remove();
        const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '200px' })
          .setLngLat([pilot.lng, pilot.lat])
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #e5e7eb; background: #1a1a2e; padding: 6px 2px; font-size: 12px;">
              <div style="font-weight: 700; color: #fff; margin-bottom: 2px;">${pilot.name}</div>
              <span style="color: ${color}; font-weight: 600;">${pilot.status}</span>
            </div>
          `)
          .addTo(map);
        popupRef.current = popup;
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pilot.lng, pilot.lat])
        .addTo(map);
      pilotMarkersRef.current.push(marker);
    });
  }, [mapLoaded, visibleLayers]);

  // ─── Layer visibility sync ───

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerMapping: Record<string, string[]> = {
      ndvi: ['ndvi-heatmap'],
      parcels: ['parcel-boundaries-fill', 'parcel-boundaries-line'],
      beetles: ['beetle-zones-fill', 'beetle-zones-line'],
      storms: ['storm-zones-fill', 'storm-zones-line'],
      flights: ['flight-paths-line'],
      thermal: ['thermal-zones-fill', 'thermal-zones-line'],
      multispectral: ['multispectral-heatmap'],
      'crown-health': ['crown-health-circles'],
      'beetle-stress': ['beetle-stress-fill', 'beetle-stress-line'],
    };

    Object.entries(layerMapping).forEach(([key, layerIds]) => {
      const vis = visibleLayers.has(key) ? 'visible' : 'none';
      layerIds.forEach((lid) => {
        if (map.getLayer(lid)) {
          map.setLayoutProperty(lid, 'visibility', vis);
        }
      });
    });
  }, [visibleLayers, mapLoaded]);

  // ─── Measure mode click handler ───

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!measureMode) {
      // Clear measurement
      const src = map.getSource('measure-line') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
      const ptsSrc = map.getSource('measure-points') as maplibregl.GeoJSONSource | undefined;
      ptsSrc?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const pts: [number, number][] = [];

    function onClick(e: maplibregl.MapMouseEvent) {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      pts.push(coord);
      setMeasurePoints([...pts]);

      // Update line
      const lineSrc = map!.getSource('measure-line') as maplibregl.GeoJSONSource;
      if (pts.length >= 2) {
        lineSrc.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: pts },
        });
        let totalDist = 0;
        for (let i = 1; i < pts.length; i++) {
          totalDist += haversine(pts[i - 1], pts[i]);
        }
        setMeasureDistance(totalDist);
      }

      // Update points
      const ptsSrc = map!.getSource('measure-points') as maplibregl.GeoJSONSource;
      ptsSrc.setData({
        type: 'FeatureCollection',
        features: pts.map((c) => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: c },
        })),
      });
    }

    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [measureMode, mapLoaded, haversine]);

  // ─── Draw polygon mode ───

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!drawMode) {
      drawPointsRef.current = [];
      const src = map.getSource('draw-polygon') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    function onClick(e: maplibregl.MapMouseEvent) {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      drawPointsRef.current.push(coord);
      const pts = drawPointsRef.current;
      if (pts.length >= 3) {
        const closed = [...pts, pts[0]];
        const src = map!.getSource('draw-polygon') as maplibregl.GeoJSONSource;
        src.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [closed] },
        });
      }
    }

    function onDblClick(e: maplibregl.MapMouseEvent) {
      e.preventDefault();
      setDrawMode(false);
    }

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.getCanvas().style.cursor = '';
    };
  }, [drawMode, mapLoaded]);

  // ─── Map tools ───

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn({ duration: 300 }), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut({ duration: 300 }), []);

  const handleLocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true },
    );
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 1000 });
    setMeasureMode(false);
    setDrawMode(false);
    setMeasureDistance(null);
    setMeasurePoints([]);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleMeasureToggle = useCallback(() => {
    setMeasureMode((prev) => {
      if (!prev) {
        setDrawMode(false);
        setMeasurePoints([]);
        setMeasureDistance(null);
      }
      return !prev;
    });
  }, []);

  const handleDrawToggle = useCallback(() => {
    setDrawMode((prev) => {
      if (!prev) {
        setMeasureMode(false);
        setMeasureDistance(null);
        setMeasurePoints([]);
      }
      return !prev;
    });
  }, []);

  // Fly to parcel from search
  const flyToParcel = useCallback((parcel: DemoParcel) => {
    mapRef.current?.flyTo({ center: [parcel.lng, parcel.lat], zoom: 12, duration: 1200 });
    setSelectedParcel(parcel);
    setSearch('');
  }, []);

  // ─── Fullscreen change listener ───
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ─── Render ───

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] flex bg-[var(--bg)]">
      {/* ── Left sidebar: Layer controls ── */}
      <div
        className={`relative z-20 flex-shrink-0 transition-all duration-300 ease-in-out ${
          layerPanel ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="w-64 h-full border-r border-[var(--border)] bg-[var(--bg2)] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[var(--green)]" />
              <span className="text-sm font-semibold text-[var(--text1)]">Map Layers</span>
            </div>
            <button
              onClick={() => setLayerPanel(false)}
              className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
              aria-label="Collapse layer panel"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {LAYER_DEFS.map((layer) => {
              const active = visibleLayers.has(layer.id);
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-[var(--green)]/5 text-[var(--text1)]'
                      : 'text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text2)]'
                  }`}
                >
                  <div className={`flex-shrink-0 ${active ? 'text-[var(--green)]' : ''}`}>
                    {layer.icon}
                  </div>
                  <span className="text-xs font-medium flex-1">{layer.label}</span>
                  {active ? (
                    <Eye size={13} className="text-[var(--green)] flex-shrink-0" />
                  ) : (
                    <EyeOff size={13} className="text-[var(--text3)] flex-shrink-0 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="border-t border-[var(--border)] px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">
              Health Legend
            </div>
            <div className="flex flex-col gap-1.5">
              {(['healthy', 'at_risk', 'infested'] as HealthStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: HEALTH_COLOR[status] }}
                  />
                  <span className="text-[11px] text-[var(--text2)] capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layer panel toggle when collapsed */}
      {!layerPanel && (
        <button
          onClick={() => setLayerPanel(true)}
          className="absolute top-4 left-2 z-30 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors shadow-lg"
          aria-label="Expand layer panel"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── Map area ── */}
      <div className="flex-1 relative">
        {/* Search bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parcels by name or municipality..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm text-sm text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)] focus:border-[var(--green)] shadow-lg"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text1)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {filteredParcels.length > 0 && (
            <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
              {filteredParcels.map((p) => (
                <button
                  key={p.id}
                  onClick={() => flyToParcel(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg3)] transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: HEALTH_COLOR[p.health] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text1)] truncate">{p.name}</div>
                    <div className="text-[11px] text-[var(--text3)]">
                      {p.municipality} &middot; {p.area_ha} ha
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map container */}
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Map tools (top-right) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5" role="toolbar" aria-label="Map tools">
          <ToolButton icon={<ZoomIn size={16} />} label="Zoom in" onClick={handleZoomIn} />
          <ToolButton icon={<ZoomOut size={16} />} label="Zoom out" onClick={handleZoomOut} />
          <div className="h-1" />
          <ToolButton icon={<Locate size={16} />} label="Locate me" onClick={handleLocate} />
          <ToolButton
            icon={<Ruler size={16} />}
            label="Measure distance"
            onClick={handleMeasureToggle}
            active={measureMode}
          />
          <ToolButton
            icon={<PenTool size={16} />}
            label="Draw polygon"
            onClick={handleDrawToggle}
            active={drawMode}
          />
          <div className="h-1" />
          <ToolButton
            icon={isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={handleFullscreen}
          />
          <ToolButton icon={<RotateCcw size={16} />} label="Reset view" onClick={handleResetView} />
        </div>

        {/* Measure distance display */}
        {measureMode && measureDistance !== null && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <Ruler size={14} className="text-orange-400" />
              <span className="text-[var(--text1)] font-medium">
                {measureDistance < 1
                  ? `${(measureDistance * 1000).toFixed(0)} m`
                  : `${measureDistance.toFixed(2)} km`}
              </span>
              <span className="text-[var(--text3)]">
                ({measurePoints.length} points)
              </span>
            </div>
          </div>
        )}

        {drawMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
              <PenTool size={14} className="text-blue-400" />
              <span>Click to add points. Double-click to finish.</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right sidebar: Info panel ── */}
      <div
        className={`absolute top-0 right-0 z-30 h-full transition-transform duration-300 ease-in-out ${
          selectedParcel ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 340 }}
      >
        {selectedParcel && (
          <div className="w-full h-full border-l border-[var(--border)] bg-[var(--bg2)] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: HEALTH_COLOR[selectedParcel.health] }}
                />
                <span className="text-sm font-bold text-[var(--text1)] truncate">
                  {selectedParcel.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedParcel(null)}
                className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
                aria-label="Close info panel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Summary */}
              <div className="space-y-3">
                <SummaryRow label="Municipality" value={selectedParcel.municipality} />
                <SummaryRow label="Area" value={`${selectedParcel.area_ha} ha`} />
                <SummaryRow
                  label="Health Score"
                  value={
                    <span style={{ color: HEALTH_COLOR[selectedParcel.health] }} className="font-bold">
                      {selectedParcel.healthScore}/100
                    </span>
                  }
                />
                <SummaryRow
                  label="Risk Level"
                  value={
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{
                        color: HEALTH_COLOR[selectedParcel.health],
                        borderColor: `${HEALTH_COLOR[selectedParcel.health]}40`,
                        background: `${HEALTH_COLOR[selectedParcel.health]}10`,
                      }}
                    >
                      {selectedParcel.riskLevel}
                    </span>
                  }
                />
                <SummaryRow label="Last Survey" value={selectedParcel.lastSurvey} />
                <SummaryRow label="Species Mix" value={selectedParcel.speciesMix} />
              </div>

              {/* NDVI Timeline (CSS-only mini chart) */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">
                  NDVI Timeline (12 months)
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="flex items-end gap-[3px] h-16">
                    {selectedParcel.ndviHistory.map((val, i) => {
                      const pct = val * 100;
                      const hue = val * 120; // 0=red, 120=green
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm transition-all"
                            style={{
                              height: `${pct}%`,
                              background: `hsl(${hue}, 70%, 45%)`,
                              minHeight: 2,
                            }}
                            title={`${MONTH_LABELS[i]}: ${val.toFixed(2)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-[3px] mt-1">
                    {MONTH_LABELS.map((m, i) => (
                      <div key={i} className="flex-1 text-center text-[8px] text-[var(--text3)]">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold mb-2">
                  Quick Actions
                </div>
                <ActionButton
                  icon={<ClipboardList size={14} />}
                  label="View Details"
                  sublabel="Full parcel report"
                />
                <ActionButton
                  icon={<Camera size={14} />}
                  label="Order Survey"
                  sublabel="Request drone inspection"
                  accent
                />
                <ActionButton
                  icon={<FileDown size={14} />}
                  label="Export GeoJSON"
                  sublabel="Download parcel boundary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function ToolButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg border transition-colors shadow-md ${
        active
          ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)]'
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-[var(--text3)] flex-shrink-0">{label}</span>
      <span className="text-xs text-[var(--text1)] text-right">{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  sublabel,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
        accent
          ? 'border-[var(--green)]/30 bg-[var(--green)]/5 hover:bg-[var(--green)]/10 text-[var(--green)]'
          : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg3)] text-[var(--text2)]'
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-[var(--text3)]">{sublabel}</div>
      </div>
    </button>
  );
}
