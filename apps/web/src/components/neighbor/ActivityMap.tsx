import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  activitiesToGeoJSON,
  getWindRose,
  USER_PARCEL_CENTER,
  USER_PARCELS_GEOJSON,
  type NeighborActivity,
} from '@/services/neighborActivityService';

interface ActivityMapProps {
  activities: NeighborActivity[];
  radiusKm: number;
  selectedActivity: NeighborActivity | null;
  onSelectActivity: (activity: NeighborActivity | null) => void;
}

// Generate circle polygon for radius overlay
function createCircleGeoJSON(center: [number, number], radiusKm: number, steps = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos((center[1] * Math.PI) / 180);

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = (radiusKm * Math.cos(angle)) / kmPerDegreeLng;
    const dy = (radiusKm * Math.sin(angle)) / kmPerDegreeLat;
    coords.push([center[0] + dx, center[1] + dy]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

export function ActivityMap({ activities, radiusKm, selectedActivity, onSelectActivity }: ActivityMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: USER_PARCEL_CENTER,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);

      // User parcels source + layers
      map.addSource('user-parcels', {
        type: 'geojson',
        data: USER_PARCELS_GEOJSON,
      });

      map.addLayer({
        id: 'user-parcels-fill',
        type: 'fill',
        source: 'user-parcels',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.2,
        },
      });

      map.addLayer({
        id: 'user-parcels-outline',
        type: 'line',
        source: 'user-parcels',
        paint: {
          'line-color': '#4ade80',
          'line-width': 2,
        },
      });

      // Radius circle source + layer
      map.addSource('radius-circle', {
        type: 'geojson',
        data: createCircleGeoJSON(USER_PARCEL_CENTER, radiusKm),
      });

      map.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.04,
        },
      });

      map.addLayer({
        id: 'radius-circle-outline',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': '#4ade80',
          'line-width': 1.5,
          'line-dasharray': [4, 4],
        },
      });

      // Activities source + layer
      map.addSource('activities', {
        type: 'geojson',
        data: activitiesToGeoJSON(activities),
      });

      map.addLayer({
        id: 'activities-circle',
        type: 'circle',
        source: 'activities',
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'activities-circle-pulse',
        type: 'circle',
        source: 'activities',
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.15,
        },
      });

      // Click handler for activity markers
      map.on('click', 'activities-circle', (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const actId = feature.properties?.id;
        const act = activities.find((a) => a.id === actId);
        if (act) onSelectActivity(act);
      });

      map.on('mouseenter', 'activities-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'activities-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update activities data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource('activities') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(activitiesToGeoJSON(activities));
    }
  }, [activities, mapLoaded]);

  // Update radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource('radius-circle') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(createCircleGeoJSON(USER_PARCEL_CENTER, radiusKm) as GeoJSON.GeoJSON);
    }
  }, [radiusKm, mapLoaded]);

  // Fly to selected activity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (selectedActivity) {
      map.flyTo({
        center: selectedActivity.coordinates,
        zoom: 14,
        duration: 800,
      });

      // Show popup
      if (popupRef.current) popupRef.current.remove();
      const popup = new maplibregl.Popup({ closeOnClick: true, offset: 15 })
        .setLngLat(selectedActivity.coordinates)
        .setHTML(`
          <div style="font-family: system-ui; padding: 4px;">
            <strong style="font-size: 12px;">${t(`neighbor.activityType.${selectedActivity.type}`)}</strong>
            <br/>
            <span style="font-size: 11px; color: #666;">
              ${selectedActivity.distanceKm} km ${t(`neighbor.direction.${selectedActivity.direction}`)}
              &middot; ${selectedActivity.areaHa} ha
            </span>
          </div>
        `)
        .addTo(map);
      popupRef.current = popup;
    } else {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      map.flyTo({
        center: USER_PARCEL_CENTER,
        zoom: 12,
        duration: 600,
      });
    }
  }, [selectedActivity, mapLoaded, t]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[var(--border)]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Wind rose overlay */}
      <WindRoseOverlay />

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 rounded-lg border border-[var(--border)] px-3 py-2 text-[10px] max-w-[180px]"
        style={{ background: 'var(--bg2)', opacity: 0.95 }}
      >
        <p className="font-semibold text-[var(--text)] mb-1.5">{t('neighbor.map.legend')}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-[#4ade80]" style={{ background: '#4ade8033' }} />
            <span className="text-[var(--text3)]">{t('neighbor.map.yourParcels')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-white" style={{ background: '#f97316' }} />
            <span className="text-[var(--text3)]">{t('neighbor.map.fellingNotif')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-white" style={{ background: '#ef4444' }} />
            <span className="text-[var(--text3)]">{t('neighbor.map.clearcutOrBeetle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-white" style={{ background: '#4ade80' }} />
            <span className="text-[var(--text3)]">{t('neighbor.map.plantingOrLow')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WindRoseOverlay() {
  const { t } = useTranslation();
  const windRose = getWindRose();
  const maxFreq = Math.max(...windRose.map((w) => w.frequency));
  const size = 80;
  const center = size / 2;
  const maxRadius = (size - 24) / 2;

  return (
    <div
      className="absolute top-3 right-14 rounded-lg border border-[var(--border)] p-2"
      style={{ background: 'var(--bg2)', opacity: 0.9 }}
    >
      <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider text-center mb-1">
        {t('neighbor.map.wind')}
      </p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Compass lines */}
        <line x1={center} y1={4} x2={center} y2={size - 4} stroke="var(--border)" strokeWidth={0.5} />
        <line x1={4} y1={center} x2={size - 4} y2={center} stroke="var(--border)" strokeWidth={0.5} />

        {/* Wind bars */}
        {windRose.map((entry) => {
          const angleRad = ((entry.direction - 90) * Math.PI) / 180;
          const barLength = (entry.frequency / maxFreq) * maxRadius;
          const x2 = center + Math.cos(angleRad) * barLength;
          const y2 = center + Math.sin(angleRad) * barLength;
          const opacity = 0.3 + (entry.frequency / maxFreq) * 0.7;

          return (
            <line
              key={entry.direction}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="#4ade80"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={opacity}
            />
          );
        })}

        {/* Cardinal labels */}
        <text x={center} y={10} textAnchor="middle" fill="var(--text3)" fontSize={8} fontWeight={600}>N</text>
        <text x={size - 6} y={center + 3} textAnchor="middle" fill="var(--text3)" fontSize={8}>E</text>
        <text x={center} y={size - 3} textAnchor="middle" fill="var(--text3)" fontSize={8}>S</text>
        <text x={6} y={center + 3} textAnchor="middle" fill="var(--text3)" fontSize={8}>W</text>

        {/* Center dot */}
        <circle cx={center} cy={center} r={2} fill="var(--text3)" />
      </svg>
      <p className="text-[8px] text-[var(--text3)] text-center">
        {t('neighbor.map.prevailingSW')}
      </p>
    </div>
  );
}
