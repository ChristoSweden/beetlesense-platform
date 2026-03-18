import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useFusionStore } from '@/stores/fusionStore';

interface ForestPulseLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'forest-pulse-source';
const FILL_LAYER_ID = 'forest-pulse-fill';
const OUTLINE_LAYER_ID = 'forest-pulse-outline';

// ─── HSV → RGB conversion ───

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Species → Hue mapping ───

function speciesHue(speciesMix: { species: string; pct: number }[]): number {
  // Weighted hue blend
  let totalHue = 0;
  let totalWeight = 0;
  for (const { species, pct } of speciesMix) {
    const s = species.toLowerCase();
    let hue: number;
    if (s.includes('spruce') || s.includes('gran')) hue = 120;       // emerald green
    else if (s.includes('pine') || s.includes('tall')) hue = 180;    // teal
    else if (s.includes('birch') || s.includes('björk')) hue = 45;   // gold
    else if (s.includes('oak') || s.includes('ek')) hue = 30;        // warm orange
    else if (s.includes('alder') || s.includes('al')) hue = 90;      // yellow-green
    else hue = 150; // default
    totalHue += hue * pct;
    totalWeight += pct;
  }
  return totalWeight > 0 ? totalHue / totalWeight : 120;
}

// ─── Hexagonal grid generation ───

interface HexCell {
  center: [number, number];
  vertices: [number, number][];
  species_mix: { species: string; pct: number }[];
  health_score: number;
  value_score: number;
  value_sek: number;
  hue: number;
  color: string;
}

/** Seeded pseudo-random number generator for deterministic demo data */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateHexGrid(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  cellSizeKm: number,
): HexCell[] {
  const cells: HexCell[] = [];
  const rand = seededRandom(42);

  // Convert km to approximate degrees
  const kmToLng = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const kmToLat = 1 / 110.574;

  const hexRadiusDeg = cellSizeKm * kmToLat;
  const hexWidth = hexRadiusDeg * Math.sqrt(3);
  const hexHeight = hexRadiusDeg * 2;

  // Grid bounds in degrees
  const radiusLng = radiusKm * kmToLng;
  const radiusLat = radiusKm * kmToLat;

  const speciesTemplates: { species: string; pct: number }[][] = [
    [{ species: 'Gran', pct: 65 }, { species: 'Tall', pct: 25 }, { species: 'Björk', pct: 10 }],
    [{ species: 'Tall', pct: 70 }, { species: 'Gran', pct: 20 }, { species: 'Björk', pct: 10 }],
    [{ species: 'Björk', pct: 50 }, { species: 'Gran', pct: 30 }, { species: 'Tall', pct: 20 }],
    [{ species: 'Gran', pct: 85 }, { species: 'Tall', pct: 10 }, { species: 'Björk', pct: 5 }],
    [{ species: 'Tall', pct: 45 }, { species: 'Björk', pct: 35 }, { species: 'Ek', pct: 20 }],
    [{ species: 'Gran', pct: 40 }, { species: 'Tall', pct: 40 }, { species: 'Björk', pct: 20 }],
    [{ species: 'Björk', pct: 60 }, { species: 'Al', pct: 25 }, { species: 'Gran', pct: 15 }],
    [{ species: 'Gran', pct: 55 }, { species: 'Tall', pct: 30 }, { species: 'Ek', pct: 15 }],
  ];

  // Risk zone near Granudden (14.10, 57.22) — lower health scores
  const riskCenterLng = 14.10;
  const riskCenterLat = 57.22;
  const riskRadius = 0.03; // ~3km

  let row = 0;
  for (let lat = centerLat - radiusLat; lat <= centerLat + radiusLat; lat += hexHeight * 0.75) {
    const offset = row % 2 === 0 ? 0 : hexWidth / 2;
    for (let lng = centerLng - radiusLng + offset; lng <= centerLng + radiusLng; lng += hexWidth) {
      // Check if within circular bounds
      const dLng = (lng - centerLng) / radiusLng;
      const dLat = (lat - centerLat) / radiusLat;
      if (dLng * dLng + dLat * dLat > 1) continue;

      // Distance to risk zone
      const distToRisk = Math.sqrt(
        Math.pow(lng - riskCenterLng, 2) + Math.pow(lat - riskCenterLat, 2),
      );
      const riskInfluence = Math.max(0, 1 - distToRisk / riskRadius);

      // Generate cell data
      const templateIdx = Math.floor(rand() * speciesTemplates.length);
      const species_mix = speciesTemplates[templateIdx];
      const baseHealth = 0.5 + rand() * 0.5; // 0.5-1.0
      const health_score = Math.max(0.15, baseHealth - riskInfluence * 0.6);
      const value_score = 0.3 + rand() * 0.7;
      const value_sek = Math.round(200 + value_score * 600); // 200-800 SEK/m³

      const hue = speciesHue(species_mix);
      const saturation = 0.2 + health_score * 0.8; // 0.2 (stressed) to 1.0 (healthy)
      const brightness = 0.25 + value_score * 0.65; // 0.25 (low value) to 0.9 (high value)

      const [r, g, b] = hsvToRgb(hue, saturation, brightness);
      const color = rgbToHex(r, g, b);

      // Generate hex vertices
      const vertices: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = ((60 * i - 30) * Math.PI) / 180;
        const vLng = lng + hexRadiusDeg * kmToLng / kmToLat * Math.cos(angle);
        const vLat = lat + hexRadiusDeg * Math.sin(angle);
        vertices.push([vLng, vLat]);
      }
      vertices.push(vertices[0]); // close polygon

      cells.push({
        center: [lng, lat],
        vertices,
        species_mix,
        health_score,
        value_score,
        value_sek,
        hue,
        color,
      });
    }
    row++;
  }

  return cells;
}

function buildForestPulseGeoJSON(): GeoJSON.FeatureCollection {
  // Generate ~60-80 hex cells around Värnamo
  const cells = generateHexGrid(14.04, 57.18, 4, 0.6);

  return {
    type: 'FeatureCollection',
    features: cells.map((cell, i) => ({
      type: 'Feature' as const,
      id: i,
      properties: {
        id: `fp-${i}`,
        color: cell.color,
        health_score: Number(cell.health_score.toFixed(2)),
        value_score: Number(cell.value_score.toFixed(2)),
        value_sek: cell.value_sek,
        hue: Math.round(cell.hue),
        species_json: JSON.stringify(cell.species_mix),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [cell.vertices],
      },
    })),
  };
}

function speciesLabel(species: string): string {
  const map: Record<string, string> = {
    'Gran': 'Gran (Spruce)',
    'Tall': 'Tall (Pine)',
    'Björk': 'Björk (Birch)',
    'Ek': 'Ek (Oak)',
    'Al': 'Al (Alder)',
  };
  return map[species] ?? species;
}

function healthLabel(score: number): string {
  if (score >= 0.8) return 'Utmärkt';
  if (score >= 0.6) return 'God';
  if (score >= 0.4) return 'Nedsatt';
  return 'Kritisk';
}

function healthColor(score: number): string {
  if (score >= 0.8) return '#4ade80';
  if (score >= 0.6) return '#facc15';
  if (score >= 0.4) return '#fb923c';
  return '#ef4444';
}

export function ForestPulseLayer({ map }: ForestPulseLayerProps) {
  const { mode, opacity } = useFusionStore();
  const loadedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const loadLayer = useCallback(() => {
    if (!map || loadedRef.current) return;

    try {
      const geojson = buildForestPulseGeoJSON();
      if (geojson.features.length === 0) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.8,
              0.6,
            ],
          },
          layout: {
            visibility: 'none',
          },
        });

        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ffffff',
              'rgba(255,255,255,0.15)',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              2,
              0.5,
            ],
          },
          layout: {
            visibility: 'none',
          },
        });

        // Hover interaction
        let hoveredId: string | number | undefined;

        map.on('mousemove', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features || e.features.length === 0) return;

          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = e.features[0].id;
          map.setFeatureState({ source: SOURCE_ID, id: hoveredId! }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';

          // Show tooltip with decomposed values
          const props = e.features[0].properties;
          let speciesMix: { species: string; pct: number }[] = [];
          try {
            speciesMix = JSON.parse(props?.species_json ?? '[]');
          } catch { /* empty */ }
          const health = props?.health_score ?? 0;
          const valueSek = props?.value_sek ?? 0;

          const speciesHtml = speciesMix
            .map((s: { species: string; pct: number }) =>
              `<span style="color:#a3c9a8;">${speciesLabel(s.species)}</span> <span style="font-family:'DM Mono',monospace;color:var(--green,#4ade80);">${s.pct}%</span>`,
            )
            .join(' &middot; ');

          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: '320px',
            offset: 12,
            className: 'forest-pulse-popup',
          })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:'DM Sans',sans-serif;background:#0a1f0d;border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:12px 14px;backdrop-filter:blur(12px);">
                <p style="font-weight:700;font-size:13px;margin:0 0 8px;color:#e8f5e9;letter-spacing:0.03em;">
                  Forest Pulse\u2122 Cell
                </p>
                <div style="margin:0 0 6px;">
                  <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">Arter (Species)</span>
                  <div style="font-size:12px;margin-top:2px;">${speciesHtml}</div>
                </div>
                <div style="display:flex;gap:16px;margin-top:8px;">
                  <div>
                    <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">H\u00e4lsa</span>
                    <div style="font-size:14px;font-weight:600;font-family:'DM Mono',monospace;color:${healthColor(health)};">
                      ${Math.round(health * 100)}% <span style="font-size:10px;font-weight:400;color:#a3c9a8;">${healthLabel(health)}</span>
                    </div>
                  </div>
                  <div>
                    <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">V\u00e4rde</span>
                    <div style="font-size:14px;font-weight:600;font-family:'DM Mono',monospace;color:#e8f5e9;">
                      ${valueSek} <span style="font-size:10px;font-weight:400;color:#a3c9a8;">SEK/m\u00b3</span>
                    </div>
                  </div>
                </div>
              </div>`,
            )
            .addTo(map);
        });

        map.on('mouseleave', FILL_LAYER_ID, () => {
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = undefined;
          map.getCanvas().style.cursor = '';
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('ForestPulseLayer error:', err);
    }
  }, [map]);

  // Load when map is ready
  useEffect(() => {
    if (!map) return;
    if (map.loaded()) loadLayer();
    else {
      map.on('load', loadLayer);
      return () => { map.off('load', loadLayer); };
    }
  }, [map, loadLayer]);

  // Toggle visibility based on fusion mode
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = mode === 'forest-pulse' || mode === 'composite';
    const vis = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, OUTLINE_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, mode]);

  // Update opacity
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    if (map.getLayer(FILL_LAYER_ID)) {
      map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        Math.min(opacity + 0.2, 1),
        opacity,
      ]);
    }
  }, [map, opacity]);

  return null;
}
