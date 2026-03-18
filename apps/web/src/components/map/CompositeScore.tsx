import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useFusionStore } from '@/stores/fusionStore';

interface CompositeScoreProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'composite-score-source';
const FILL_LAYER_ID = 'composite-score-fill';
const OUTLINE_LAYER_ID = 'composite-score-outline';

// ─── Composite score calculation ───
// Score = health(30%) + risk_inverse(25%) + value(20%) + growth(15%) + climate(10%)

interface CellFactors {
  health: number;   // Halsa 0-1
  risk: number;     // Risk 0-1 (high=bad, inverted for score)
  value: number;    // Varde 0-1
  growth: number;   // Tillvaxt 0-1
  climate: number;  // Klimat 0-1 (resilience)
}

function computeScore(f: CellFactors): number {
  return Math.round(
    (f.health * 0.3 + (1 - f.risk) * 0.25 + f.value * 0.2 + f.growth * 0.15 + f.climate * 0.1) * 100,
  );
}

function scoreToColor(score: number): string {
  // dark red (0) -> orange (30) -> yellow (50) -> light green (70) -> bright green (100)
  if (score <= 30) {
    const t = score / 30;
    const r = Math.round(139 + (251 - 139) * t);
    const g = Math.round(20 + (146 - 20) * t);
    const b = Math.round(20 + (36 - 20) * t);
    return `rgb(${r},${g},${b})`;
  }
  if (score <= 50) {
    const t = (score - 30) / 20;
    const r = Math.round(251 + (250 - 251) * t);
    const g = Math.round(146 + (204 - 146) * t);
    const b = Math.round(36 + (21 - 36) * t);
    return `rgb(${r},${g},${b})`;
  }
  if (score <= 70) {
    const t = (score - 50) / 20;
    const r = Math.round(250 + (134 - 250) * t);
    const g = Math.round(204 + (239 - 204) * t);
    const b = Math.round(21 + (172 - 21) * t);
    return `rgb(${r},${g},${b})`;
  }
  // 70-100
  const t = (score - 70) / 30;
  const r = Math.round(134 + (74 - 134) * t);
  const g = Math.round(239 + (222 - 239) * t);
  const b = Math.round(172 + (128 - 172) * t);
  return `rgb(${r},${g},${b})`;
}

// ─── Hex grid generation with composite data ───

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCompositeGrid(): GeoJSON.FeatureCollection {
  const rand = seededRandom(7919);
  const centerLng = 14.04;
  const centerLat = 57.18;
  const radiusKm = 4;
  const cellSizeKm = 0.6;

  const kmToLng = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const kmToLat = 1 / 110.574;
  const hexRadiusDeg = cellSizeKm * kmToLat;
  const hexWidth = hexRadiusDeg * Math.sqrt(3);
  const hexHeight = hexRadiusDeg * 2;
  const radiusLng = radiusKm * kmToLng;
  const radiusLat = radiusKm * kmToLat;

  // Risk hotspot near Granudden
  const riskLng = 14.10;
  const riskLat = 57.22;
  const riskRadius = 0.035;

  const features: GeoJSON.Feature[] = [];
  let idx = 0;
  let row = 0;

  for (let lat = centerLat - radiusLat; lat <= centerLat + radiusLat; lat += hexHeight * 0.75) {
    const offset = row % 2 === 0 ? 0 : hexWidth / 2;
    for (let lng = centerLng - radiusLng + offset; lng <= centerLng + radiusLng; lng += hexWidth) {
      const dLng = (lng - centerLng) / radiusLng;
      const dLat = (lat - centerLat) / radiusLat;
      if (dLng * dLng + dLat * dLat > 1) continue;

      const distToRisk = Math.sqrt(Math.pow(lng - riskLng, 2) + Math.pow(lat - riskLat, 2));
      const riskInfluence = Math.max(0, 1 - distToRisk / riskRadius);

      const factors: CellFactors = {
        health: Math.max(0.1, 0.55 + rand() * 0.45 - riskInfluence * 0.5),
        risk: Math.min(1, 0.1 + rand() * 0.3 + riskInfluence * 0.6),
        value: 0.3 + rand() * 0.7,
        growth: Math.max(0.15, 0.5 + rand() * 0.5 - riskInfluence * 0.3),
        climate: 0.4 + rand() * 0.5,
      };

      const score = computeScore(factors);
      const color = scoreToColor(score);

      // Hex vertices
      const vertices: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = ((60 * i - 30) * Math.PI) / 180;
        const vLng = lng + hexRadiusDeg * kmToLng / kmToLat * Math.cos(angle);
        const vLat = lat + hexRadiusDeg * Math.sin(angle);
        vertices.push([vLng, vLat]);
      }
      vertices.push(vertices[0]);

      features.push({
        type: 'Feature',
        id: idx,
        properties: {
          id: `cs-${idx}`,
          score,
          color,
          health: Number(factors.health.toFixed(2)),
          risk: Number(factors.risk.toFixed(2)),
          value: Number(factors.value.toFixed(2)),
          growth: Number(factors.growth.toFixed(2)),
          climate: Number(factors.climate.toFixed(2)),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [vertices],
        },
      });
      idx++;
    }
    row++;
  }

  return { type: 'FeatureCollection', features };
}

// ─── Radar chart SVG for decomposition popup ───

function renderRadarChart(factors: CellFactors, score: number): string {
  const labels = [
    { key: 'health', label: 'Halsa', value: factors.health },
    { key: 'risk', label: 'Risk', value: 1 - factors.risk }, // inverted: low risk = good
    { key: 'value', label: 'Varde', value: factors.value },
    { key: 'growth', label: 'Tillvaxt', value: factors.growth },
    { key: 'climate', label: 'Klimat', value: factors.climate },
  ];

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 55;
  const n = labels.length;

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

  // Background rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = (maxR * ring) / 4;
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    svg += `<polygon points="${points.join(' ')}" fill="none" stroke="rgba(74,222,128,0.1)" stroke-width="0.5"/>`;
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    svg += `<line x1="${cx}" y1="${cy}" x2="${cx + maxR * Math.cos(angle)}" y2="${cy + maxR * Math.sin(angle)}" stroke="rgba(74,222,128,0.15)" stroke-width="0.5"/>`;
  }

  // Data polygon
  const dataPoints = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = maxR * labels[i].value;
    dataPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const scoreColor = scoreToColor(score);
  svg += `<polygon points="${dataPoints.join(' ')}" fill="${scoreColor}" fill-opacity="0.2" stroke="${scoreColor}" stroke-width="1.5"/>`;

  // Data points + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = maxR * labels[i].value;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);

    svg += `<circle cx="${px}" cy="${py}" r="3" fill="${scoreColor}" stroke="#030d05" stroke-width="1"/>`;

    // Label position (outside the chart)
    const labelR = maxR + 16;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    const anchor = Math.cos(angle) < -0.1 ? 'end' : Math.cos(angle) > 0.1 ? 'start' : 'middle';

    svg += `<text x="${lx}" y="${ly}" font-size="9" fill="#a3c9a8" font-family="DM Sans,sans-serif" text-anchor="${anchor}" dominant-baseline="middle">${labels[i].label}</text>`;
    svg += `<text x="${lx}" y="${ly + 11}" font-size="8" fill="#e8f5e9" font-family="DM Mono,monospace" text-anchor="${anchor}" dominant-baseline="middle">${Math.round(labels[i].value * 100)}%</text>`;
  }

  // Center score
  svg += `<text x="${cx}" y="${cy - 4}" font-size="18" fill="#e8f5e9" font-family="DM Mono,monospace" text-anchor="middle" font-weight="700">${score}</text>`;
  svg += `<text x="${cx}" y="${cy + 10}" font-size="8" fill="#5a8a62" font-family="DM Sans,sans-serif" text-anchor="middle">FI Score</text>`;

  svg += '</svg>';
  return svg;
}

export function CompositeScore({ map }: CompositeScoreProps) {
  const { mode, opacity } = useFusionStore();
  const loadedRef = useRef(false);
  const [activePopup, setActivePopup] = useState<maplibregl.Popup | null>(null);

  const loadLayer = useCallback(() => {
    if (!map || loadedRef.current) return;

    try {
      const geojson = generateCompositeGrid();
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
              0.75,
              0.55,
            ],
          },
          layout: { visibility: 'none' },
        });

        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              'rgba(255,255,255,0.4)',
              'rgba(255,255,255,0.08)',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              1.5,
              0.3,
            ],
          },
          layout: { visibility: 'none' },
        });

        // Hover
        let hoveredId: string | number | undefined;
        map.on('mousemove', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features || e.features.length === 0) return;
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = e.features[0].id;
          map.setFeatureState({ source: SOURCE_ID, id: hoveredId! }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', FILL_LAYER_ID, () => {
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = undefined;
          map.getCanvas().style.cursor = '';
        });

        // Click: decomposition radar popup
        map.on('click', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties;
          if (!props) return;

          const factors: CellFactors = {
            health: props.health,
            risk: props.risk,
            value: props.value,
            growth: props.growth,
            climate: props.climate,
          };
          const score = props.score;
          const radarSvg = renderRadarChart(factors, score);
          const color = scoreToColor(score);

          const html = `<div style="font-family:'DM Sans',sans-serif;background:#0a1f0d;border:1px solid rgba(74,222,128,0.3);border-radius:14px;padding:14px;text-align:center;">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px;color:#e8f5e9;">
              Forest Intelligence Score
            </p>
            <p style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:${color};margin:2px 0 8px;letter-spacing:-0.02em;">
              ${score}/100
            </p>
            ${radarSvg}
            <p style="font-size:10px;color:#5a8a62;margin:8px 0 0;">
              H\u00e4lsa 30% \u00b7 Risk 25% \u00b7 V\u00e4rde 20% \u00b7 Tillv\u00e4xt 15% \u00b7 Klimat 10%
            </p>
          </div>`;

          if (activePopup) activePopup.remove();
          const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
          setActivePopup(popup);
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('CompositeScore error:', err);
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (map.loaded()) loadLayer();
    else {
      map.on('load', loadLayer);
      return () => { map.off('load', loadLayer); };
    }
  }, [map, loadLayer]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = mode === 'composite';
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
        Math.min(opacity + 0.15, 1),
        opacity,
      ]);
    }
  }, [map, opacity]);

  return null;
}
