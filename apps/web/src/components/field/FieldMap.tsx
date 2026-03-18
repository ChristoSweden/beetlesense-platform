import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, Locate, Plus, Minus, MapPin, Layers } from 'lucide-react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';
import { useFieldModeStore } from '@/stores/fieldModeStore';

// Simplified high-contrast dark style for field use
const FIELD_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Field',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#020a03' },
    },
    {
      id: 'osm-raster',
      type: 'raster',
      source: 'osm-raster',
      paint: {
        'raster-saturation': -0.7,
        'raster-brightness-max': 0.4,
        'raster-brightness-min': 0.02,
        'raster-contrast': 0.3,
        'raster-hue-rotate': 90,
      },
    },
  ],
};

// ─── Parcel boundary GeoJSON builder ───

function buildParcelFeatures(parcels: DemoParcel[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: parcels.map((p) => ({
      type: 'Feature',
      properties: {
        id: p.id,
        name: p.name,
        status: p.status,
        area: p.area_hectares,
      },
      geometry: {
        type: 'Point',
        coordinates: p.center,
      },
    })),
  };
}

// ─── Bearing calculation ───

function getBearing(from: [number, number], to: [number, number]): number {
  const dLon = ((to[0] - from[0]) * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getDistance(from: [number, number], to: [number, number]): number {
  const R = 6371000;
  const dLat = ((to[1] - from[1]) * Math.PI) / 180;
  const dLon = ((to[0] - from[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from[1] * Math.PI) / 180) *
      Math.cos((to[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatBearing(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(degrees / 45) % 8;
  return `${dirs[idx]} ${Math.round(degrees)}°`;
}

// ─── Component ───

export function FieldMap() {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<DemoParcel | null>(null);
  const [showSensorOverlay, setShowSensorOverlay] = useState(false);
  const sensorMarkersRef = useRef<maplibregl.Marker[]>([]);
  const parcels = DEMO_PARCELS;
  const { cachedSensorData } = useFieldModeStore();

  // ─── Derive sensor overlay points from cached data ───
  const sensorOverlayPoints = useMemo(() => {
    if (!cachedSensorData) return { ndviDots: [], thermalHotspots: [], treeHealth: [] };

    // NDVI dots from sensor products
    const ndviDots: { coords: [number, number]; ndvi: number; color: string }[] = [];
    const thermalHotspots: { coords: [number, number]; sigma: number }[] = [];

    cachedSensorData.sensorProducts.forEach((sp) => {
      const parcel = parcels.find((p) => p.id === sp.parcel_id);
      if (!parcel) return;

      const meta = sp.metadata as Record<string, unknown>;
      // Offset coords slightly per product so dots don't fully overlap
      const jitter = () => (Math.random() - 0.5) * 0.005;
      const coords: [number, number] = [
        parcel.center[0] + jitter(),
        parcel.center[1] + jitter(),
      ];

      if (sp.sensor_type === 'multispectral' || sp.product_name.toLowerCase().includes('ndvi')) {
        const ndvi = typeof meta.mean_ndvi === 'number' ? meta.mean_ndvi : 0.6 + (Math.random() - 0.5) * 0.4;
        const color = ndvi > 0.7 ? '#4ade80' : ndvi > 0.5 ? '#fbbf24' : '#ef4444';
        ndviDots.push({ coords, ndvi: Math.round(ndvi * 100) / 100, color });
      }

      if (sp.sensor_type === 'thermal' || sp.product_name.toLowerCase().includes('thermal')) {
        const sigma = typeof meta.anomaly_sigma === 'number' ? meta.anomaly_sigma : 1.5 + Math.random() * 1.5;
        if (sigma > 1.0) {
          thermalHotspots.push({ coords, sigma: Math.round(sigma * 10) / 10 });
        }
      }
    });

    // Tree health from inventory summary
    const treeHealth: { coords: [number, number]; stressedPct: number; count: number }[] = [];
    if (cachedSensorData.treeInventorySummary) {
      const inv = cachedSensorData.treeInventorySummary;
      const parcel = parcels.find((p) => p.id === inv.parcel_id);
      if (parcel && inv.stressed_count !== null && inv.tree_count > 0) {
        treeHealth.push({
          coords: parcel.center,
          stressedPct: Math.round((inv.stressed_count / inv.tree_count) * 100),
          count: inv.tree_count,
        });
      }
    }

    return { ndviDots, thermalHotspots, treeHealth };
  }, [cachedSensorData, parcels]);

  // ─── Add/remove sensor overlay markers ───
  useEffect(() => {
    // Clear existing markers
    sensorMarkersRef.current.forEach((m) => m.remove());
    sensorMarkersRef.current = [];

    if (!showSensorOverlay || !mapRef.current) return;

    const map = mapRef.current;

    // NDVI dots
    sensorOverlayPoints.ndviDots.forEach((dot) => {
      const el = document.createElement('div');
      el.title = `NDVI ${dot.ndvi}`;
      el.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: ${dot.color}; opacity: 0.85;
        border: 2px solid rgba(255,255,255,0.4);
        pointer-events: none;
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(dot.coords)
        .addTo(map);
      sensorMarkersRef.current.push(marker);
    });

    // Thermal hotspots — red warning markers
    sensorOverlayPoints.thermalHotspots.forEach((hs) => {
      const el = document.createElement('div');
      el.title = `Termisk anomali +${hs.sigma}σ`;
      el.innerHTML = `
        <div style="
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(239,68,68,0.25);
          border: 2px solid #ef4444;
          display: flex; align-items: center; justify-content: center;
          animation: pulse 2s infinite;
          pointer-events: none;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(hs.coords)
        .addTo(map);
      sensorMarkersRef.current.push(marker);
    });

    // Tree health indicators
    sensorOverlayPoints.treeHealth.forEach((th) => {
      const bgColor = th.stressedPct > 15 ? '#ef4444' : th.stressedPct > 5 ? '#fbbf24' : '#4ade80';
      const el = document.createElement('div');
      el.title = `Trädhälsa: ${th.stressedPct}% stressade (${th.count} träd)`;
      el.innerHTML = `
        <div style="
          padding: 2px 6px; border-radius: 6px;
          background: ${bgColor}22; border: 1px solid ${bgColor};
          font-size: 10px; font-weight: 700; color: ${bgColor};
          white-space: nowrap; pointer-events: none;
        ">🌲 ${th.stressedPct}%</div>
      `;
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([th.coords[0] + 0.003, th.coords[1] + 0.002])
        .addTo(map);
      sensorMarkersRef.current.push(marker);
    });

    return () => {
      sensorMarkersRef.current.forEach((m) => m.remove());
      sensorMarkersRef.current = [];
    };
  }, [showSensorOverlay, sensorOverlayPoints]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: FIELD_STYLE,
      center: [14.04, 57.19], // Default: Småland
      zoom: 10,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 5,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    );

    map.on('load', () => {
      // Add parcel markers
      const geojson = buildParcelFeatures(parcels);
      map.addSource('field-parcels', {
        type: 'geojson',
        data: geojson,
      });

      // Parcel circles
      map.addLayer({
        id: 'field-parcel-circles',
        type: 'circle',
        source: 'field-parcels',
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'match',
            ['get', 'status'],
            'healthy',
            '#4ade80',
            'at_risk',
            '#fbbf24',
            'infested',
            '#ef4444',
            '#5a8a62',
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
          'circle-opacity': 0.9,
        },
      });

      // Parcel labels
      map.addLayer({
        id: 'field-parcel-labels',
        type: 'symbol',
        source: 'field-parcels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#e8f5e9',
          'text-halo-color': '#030d05',
          'text-halo-width': 2,
        },
      });

      // Click handler for parcels
      map.on('click', 'field-parcel-circles', (e) => {
        const feature = e.features?.[0];
        if (feature?.properties) {
          const parcel = parcels.find(
            (p) => p.id === feature.properties!.id,
          );
          setSelectedParcel(parcel ?? null);
        }
      });

      map.on('mouseenter', 'field-parcel-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'field-parcel-circles', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [parcels]);

  // GPS tracking — blue dot
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserPos(coords);

        if (mapRef.current) {
          if (!userMarkerRef.current) {
            // Create blue dot marker
            const el = document.createElement('div');
            el.className = 'field-user-marker';
            el.innerHTML = `
              <div style="
                width: 20px; height: 20px;
                background: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(59,130,246,0.6);
              "></div>
              <div style="
                position: absolute; top: -2px; left: -2px;
                width: 24px; height: 24px;
                border: 2px solid rgba(59,130,246,0.3);
                border-radius: 50%;
                animation: pulse 2s infinite;
              "></div>
            `;
            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat(coords)
              .addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLngLat(coords);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleLocate = useCallback(() => {
    if (userPos && mapRef.current) {
      mapRef.current.flyTo({ center: userPos, zoom: 14, duration: 1000 });
    }
  }, [userPos]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 200 });
  }, []);

  const handleNavigateToParcel = useCallback(() => {
    if (selectedParcel && mapRef.current) {
      mapRef.current.flyTo({
        center: selectedParcel.center,
        zoom: 15,
        duration: 1500,
      });
    }
  }, [selectedParcel]);

  // Bearing + distance from user to selected parcel
  const navInfo =
    userPos && selectedParcel
      ? {
          bearing: getBearing(userPos, selectedParcel.center),
          distance: getDistance(userPos, selectedParcel.center),
        }
      : null;

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Map controls — large touch targets */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="w-12 h-12 rounded-xl bg-[#0f2212]/90 border border-[var(--border)] text-[var(--green)] flex items-center justify-center active:bg-[var(--green)]/20 transition-colors"
        >
          <Plus size={24} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-12 h-12 rounded-xl bg-[#0f2212]/90 border border-[var(--border)] text-[var(--green)] flex items-center justify-center active:bg-[var(--green)]/20 transition-colors"
        >
          <Minus size={24} />
        </button>
        <button
          onClick={handleLocate}
          className="w-12 h-12 rounded-xl bg-[#0f2212]/90 border border-[var(--border)] text-[#3b82f6] flex items-center justify-center active:bg-blue-500/20 transition-colors"
        >
          <Locate size={24} />
        </button>
        {cachedSensorData && (
          <button
            onClick={() => setShowSensorOverlay((v) => !v)}
            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
              showSensorOverlay
                ? 'bg-[var(--green)]/20 border-[var(--green)]/50 text-[var(--green)]'
                : 'bg-[#0f2212]/90 border-[var(--border)] text-[var(--text2)]'
            }`}
            title="Sensordata"
          >
            <Layers size={22} />
          </button>
        )}
      </div>

      {/* Sensor overlay legend */}
      {showSensorOverlay && cachedSensorData && (
        <div className="absolute top-4 left-4 z-10 rounded-xl bg-[#0f2212]/95 border border-[var(--border)] px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] font-bold text-[var(--green)] uppercase tracking-wider mb-1.5">
            Sensordata
          </p>
          <div className="space-y-1">
            {sensorOverlayPoints.ndviDots.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] border border-white/30" />
                <span className="text-[10px] text-[var(--text2)]">NDVI-värden</span>
              </div>
            )}
            {sensorOverlayPoints.thermalHotspots.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-white/30" />
                <span className="text-[10px] text-[var(--text2)]">Termiska anomalier</span>
              </div>
            )}
            {sensorOverlayPoints.treeHealth.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px]">🌲</span>
                <span className="text-[10px] text-[var(--text2)]">Trädhälsa</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected parcel info card */}
      {selectedParcel && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="rounded-2xl border border-[var(--border)] bg-[#0f2212]/95 backdrop-blur-sm p-4">
            {/* Parcel info */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedParcel.name}
                </h3>
                <p className="text-xs text-[var(--text2)]">
                  {selectedParcel.area_hectares} ha &middot;{' '}
                  {selectedParcel.municipality}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedParcel.status === 'healthy'
                    ? 'bg-[var(--green)]/20 text-[var(--green)]'
                    : selectedParcel.status === 'at_risk'
                      ? 'bg-[var(--amber)]/20 text-[var(--amber)]'
                      : selectedParcel.status === 'infested'
                        ? 'bg-[var(--red)]/20 text-[var(--red)]'
                        : 'bg-[var(--text3)]/20 text-[var(--text3)]'
                }`}
              >
                {selectedParcel.status.replace('_', ' ')}
              </span>
            </div>

            {/* Navigation info */}
            {navInfo && (
              <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-xl bg-[#030d05] border border-[var(--border)]">
                <Navigation
                  size={24}
                  className="text-[var(--green)] flex-shrink-0"
                  style={{
                    transform: `rotate(${navInfo.bearing}deg)`,
                  }}
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    {formatDistance(navInfo.distance)}
                  </p>
                  <p className="text-xs text-[var(--text2)]">
                    {formatBearing(navInfo.bearing)}
                  </p>
                </div>
              </div>
            )}

            {/* Navigate button */}
            <button
              onClick={handleNavigateToParcel}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--green)] text-forest-900 font-bold text-sm min-h-[48px] active:brightness-90 transition-all"
            >
              <MapPin size={18} />
              {t('field.navigateToParcel')}
            </button>
          </div>
        </div>
      )}

      {/* Pulse animation keyframe (injected once) */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
