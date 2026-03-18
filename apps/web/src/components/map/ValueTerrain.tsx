import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';
import { DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type TerrainMode = 'canopy' | 'value' | 'risk' | 'growth';

interface TerrainCell {
  id: string;
  lng: number;
  lat: number;
  species: 'spruce' | 'pine' | 'birch' | 'oak' | 'alder';
  canopyHeight: number;    // 8-32m
  valueSEK: number;        // 400-900 SEK/m³fub
  riskScore: number;       // 0-100
  healthScore: number;     // 0-100
  growthRate: number;      // 3-12 m³/ha/year
  ageClass: number;        // 20-120 years
  riskType: 'beetle' | 'storm' | 'drought' | 'fire';
}

interface ValueTerrainProps {
  map: maplibregl.Map | null;
  mode?: TerrainMode;
  extrusionScale?: number;
  showBorders?: boolean;
}

// ─── Seeded random for deterministic demo data ───

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Demo cell generation ───

function generateDemoCells(): TerrainCell[] {
  const cells: TerrainCell[] = [];
  const rng = seededRandom(42);
  const _species: TerrainCell['species'][] = ['spruce', 'pine', 'birch', 'oak', 'alder'];
  const riskTypes: TerrainCell['riskType'][] = ['beetle', 'storm', 'drought', 'fire'];

  // Generate cells around each demo parcel
  for (const parcel of DEMO_PARCELS) {
    const [cLng, cLat] = parcel.center;
    const gridCols = parcel.area_hectares > 40 ? 4 : 3;
    const gridRows = gridCols;
    const cellSize = 0.003;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const lng = cLng - (gridCols * cellSize) / 2 + col * cellSize + cellSize * 0.1;
        const lat = cLat - (gridRows * cellSize) / 2 + row * cellSize + cellSize * 0.1;

        // Pick dominant species based on parcel mix
        const primarySpecies = parcel.species_mix[0]?.species.toLowerCase() as TerrainCell['species'] ?? 'spruce';

        // Canopy height varies by species
        const speciesHeightBase: Record<string, number> = {
          spruce: 24, pine: 22, birch: 16, oak: 18, alder: 14,
        };
        const baseHeight = speciesHeightBase[primarySpecies] ?? 20;
        const canopyHeight = Math.max(8, Math.min(32, baseHeight + (rng() - 0.5) * 12));

        // Health and value correlated with parcel status
        const statusMultiplier = parcel.status === 'healthy' ? 1.0
          : parcel.status === 'at_risk' ? 0.7
          : parcel.status === 'infested' ? 0.4 : 0.6;

        const healthScore = Math.max(10, Math.min(100, Math.round(statusMultiplier * 80 + rng() * 30)));
        const valueSEK = Math.max(400, Math.min(900, Math.round(400 + statusMultiplier * 350 + rng() * 150)));
        const riskScore = Math.max(0, Math.min(100, Math.round((1 - statusMultiplier) * 60 + rng() * 40)));
        const growthRate = Math.max(3, Math.min(12, 3 + statusMultiplier * 6 + rng() * 3));
        const ageClass = Math.round(20 + rng() * 100);

        cells.push({
          id: `terrain-${parcel.id}-${row}-${col}`,
          lng,
          lat,
          species: primarySpecies,
          canopyHeight: Math.round(canopyHeight * 10) / 10,
          valueSEK,
          riskScore,
          healthScore,
          growthRate: Math.round(growthRate * 10) / 10,
          ageClass,
          riskType: riskTypes[Math.floor(rng() * riskTypes.length)],
        });
      }
    }
  }

  return cells;
}

// ─── Color functions ───

function speciesColor(species: TerrainCell['species']): string {
  switch (species) {
    case 'spruce': return '#1a7a3a';
    case 'pine':   return '#2d8f4e';
    case 'birch':  return '#7ac47a';
    case 'oak':    return '#8b6914';
    case 'alder':  return '#5b9b5b';
  }
}

function healthToColor(health: number): string {
  // Red (0) -> Yellow (50) -> Green (100)
  if (health <= 50) {
    const t = health / 50;
    const r = Math.round(220 + (234 - 220) * t);
    const g = Math.round(38 + (179 - 38) * t);
    const b = Math.round(38 + (8 - 38) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (health - 50) / 50;
  const r = Math.round(234 + (74 - 234) * t);
  const g = Math.round(179 + (222 - 179) * t);
  const b = Math.round(8 + (128 - 8) * t);
  return `rgb(${r},${g},${b})`;
}

function riskTypeColor(type: TerrainCell['riskType']): string {
  switch (type) {
    case 'beetle':  return '#ef4444';
    case 'storm':   return '#60a5fa';
    case 'drought': return '#f59e0b';
    case 'fire':    return '#f97316';
  }
}

function ageClassColor(age: number): string {
  // Young (20) teal -> Mature (70) green -> Old (120) golden
  if (age <= 70) {
    const t = (age - 20) / 50;
    const r = Math.round(20 + (34 - 20) * t);
    const g = Math.round(184 + (197 - 184) * t);
    const b = Math.round(166 + (94 - 166) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = Math.min(1, (age - 70) / 50);
  const r = Math.round(34 + (180 - 34) * t);
  const g = Math.round(197 + (140 - 197) * t);
  const b = Math.round(94 + (20 - 94) * t);
  return `rgb(${r},${g},${b})`;
}

// ─── GeoJSON builder ───

function buildTerrainGeoJSON(
  cells: TerrainCell[],
  mode: TerrainMode,
  scale: number,
): GeoJSON.FeatureCollection {
  const cellSize = 0.0028; // slightly less than spacing for gaps if borders on

  const features: GeoJSON.Feature[] = cells.map((cell) => {
    let height: number;
    let color: string;

    switch (mode) {
      case 'canopy':
        height = cell.canopyHeight * scale * 40; // exaggerate for visual impact
        color = speciesColor(cell.species);
        break;
      case 'value':
        height = (cell.valueSEK - 300) * scale * 0.8; // 80-480 base range
        color = healthToColor(cell.healthScore);
        break;
      case 'risk':
        // Inverted: high risk = valleys, low risk = peaks
        height = (110 - cell.riskScore) * scale * 4;
        color = riskTypeColor(cell.riskType);
        break;
      case 'growth':
        height = cell.growthRate * scale * 50;
        color = ageClassColor(cell.ageClass);
        break;
    }

    return {
      type: 'Feature',
      properties: {
        id: cell.id,
        height: Math.max(20, height),
        color,
        species: cell.species,
        canopyHeight: cell.canopyHeight,
        valueSEK: cell.valueSEK,
        riskScore: cell.riskScore,
        healthScore: cell.healthScore,
        growthRate: cell.growthRate,
        ageClass: cell.ageClass,
        riskType: cell.riskType,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [cell.lng, cell.lat],
          [cell.lng + cellSize, cell.lat],
          [cell.lng + cellSize, cell.lat + cellSize],
          [cell.lng, cell.lat + cellSize],
          [cell.lng, cell.lat],
        ]],
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

// ─── Tooltip helpers ───

function formatTooltip(props: Record<string, unknown>, mode: TerrainMode): string {
  const species = String(props.species ?? '');
  const capSpecies = species.charAt(0).toUpperCase() + species.slice(1);

  switch (mode) {
    case 'canopy':
      return `<div style="font-family:'DM Sans',sans-serif;padding:2px 0;">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#e8f5e9;">Kronhöjd — ${capSpecies}</p>
        <p style="font-size:12px;margin:0;color:#a3c9a8;">
          Höjd: <span style="font-family:'DM Mono',monospace;color:#4ade80;">${Number(props.canopyHeight).toFixed(1)} m</span>
        </p>
        <p style="font-size:11px;margin:2px 0 0;color:#5a8a62;">Hälsa: ${props.healthScore}%</p>
      </div>`;
    case 'value':
      return `<div style="font-family:'DM Sans',sans-serif;padding:2px 0;">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#e8f5e9;">Virkesv&auml;rde</p>
        <p style="font-size:12px;margin:0;color:#a3c9a8;">
          <span style="font-family:'DM Mono',monospace;color:#fbbf24;">${props.valueSEK} SEK/m&sup3;fub</span>
        </p>
        <p style="font-size:11px;margin:2px 0 0;color:#5a8a62;">H&auml;lsa: ${props.healthScore}%&ensp;&middot;&ensp;${capSpecies}</p>
      </div>`;
    case 'risk':
      return `<div style="font-family:'DM Sans',sans-serif;padding:2px 0;">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#e8f5e9;">Riskanalys</p>
        <p style="font-size:12px;margin:0;color:#a3c9a8;">
          Risk: <span style="font-family:'DM Mono',monospace;color:#ef4444;">${props.riskScore}/100</span>
        </p>
        <p style="font-size:11px;margin:2px 0 0;color:#5a8a62;">Typ: ${props.riskType}&ensp;&middot;&ensp;${capSpecies}</p>
      </div>`;
    case 'growth':
      return `<div style="font-family:'DM Sans',sans-serif;padding:2px 0;">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#e8f5e9;">Tillv&auml;xt</p>
        <p style="font-size:12px;margin:0;color:#a3c9a8;">
          <span style="font-family:'DM Mono',monospace;color:#4ade80;">${Number(props.growthRate).toFixed(1)} m&sup3;/ha/&aring;r</span>
        </p>
        <p style="font-size:11px;margin:2px 0 0;color:#5a8a62;">&Aring;ldersklass: ${props.ageClass} &aring;r</p>
      </div>`;
  }
}

// ─── Constants ───

const SOURCE_ID = 'value-terrain-source';
const EXTRUSION_LAYER_ID = 'value-terrain-extrusion';
const BORDER_LAYER_ID = 'value-terrain-borders';

// ─── Component ───

export function ValueTerrain({
  map,
  mode = 'canopy',
  extrusionScale = 1,
  showBorders = true,
}: ValueTerrainProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);
  const cellsRef = useRef<TerrainCell[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [currentMode, setCurrentMode] = useState<TerrainMode>(mode);
  const prevModeRef = useRef<TerrainMode>(mode);

  // Generate cells once
  if (cellsRef.current.length === 0) {
    cellsRef.current = generateDemoCells();
  }

  // Set dramatic 3D camera on first load
  const setupCamera = useCallback((m: maplibregl.Map) => {
    m.easeTo({
      pitch: 60,
      bearing: -30,
      duration: 1500,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    });
  }, []);

  const loadTerrain = useCallback(() => {
    if (!map || loadedRef.current) return;

    const geojson = buildTerrainGeoJSON(cellsRef.current, mode, extrusionScale);
    if (geojson.features.length === 0) return;

    try {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // 3D fill-extrusion layer
        map.addLayer({
          id: EXTRUSION_LAYER_ID,
          type: 'fill-extrusion',
          source: SOURCE_ID,
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['get', 'height'],
              0, 0,
              2000, 2000,
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.95,
              0.82,
            ],
            'fill-extrusion-vertical-gradient': true,
          },
        });

        // Border outlines (flat on top)
        map.addLayer({
          id: BORDER_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': 'rgba(74, 222, 128, 0.3)',
            'line-width': 0.8,
          },
          layout: {
            visibility: showBorders ? 'visible' : 'none',
          },
        });

        // Hover interactions
        let hoveredId: string | number | undefined;

        map.on('mousemove', EXTRUSION_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            if (hoveredId !== undefined) {
              map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId! }, { hover: true });
            map.getCanvas().style.cursor = 'pointer';

            // Show tooltip
            const props = e.features[0].properties ?? {};
            if (popupRef.current) popupRef.current.remove();
            popupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              maxWidth: '260px',
              offset: 15,
            })
              .setLngLat(e.lngLat)
              .setHTML(formatTooltip(props, currentMode))
              .addTo(map);
          }
        });

        map.on('mouseleave', EXTRUSION_LAYER_ID, () => {
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

        setupCamera(map);
        loadedRef.current = true;
      }
    } catch (err) {
      console.error('ValueTerrain error:', err);
    }
  }, [map, mode, extrusionScale, showBorders, setupCamera, currentMode]);

  // Load on map ready
  useEffect(() => {
    if (!map) return;
    if (map.loaded()) {
      loadTerrain();
    } else {
      map.on('load', loadTerrain);
      return () => { map.off('load', loadTerrain); };
    }
  }, [map, loadTerrain]);

  // Update data when mode or scale changes
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    setCurrentMode(mode);

    const geojson = buildTerrainGeoJSON(cellsRef.current, mode, extrusionScale);
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }

    // Animate height transition by briefly lowering opacity
    if (prevModeRef.current !== mode) {
      // Smooth transition: briefly pulse opacity for visual feedback
      map.setPaintProperty(EXTRUSION_LAYER_ID, 'fill-extrusion-opacity', 0.4);
      setTimeout(() => {
        if (map.getLayer(EXTRUSION_LAYER_ID)) {
          map.setPaintProperty(EXTRUSION_LAYER_ID, 'fill-extrusion-opacity', [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.95,
            0.82,
          ]);
        }
      }, 300);
      prevModeRef.current = mode;
    }
  }, [map, mode, extrusionScale]);

  // Toggle borders
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    if (map.getLayer(BORDER_LAYER_ID)) {
      map.setLayoutProperty(BORDER_LAYER_ID, 'visibility', showBorders ? 'visible' : 'none');
    }
  }, [map, showBorders]);

  // Toggle layer visibility via map store
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('parcels'); // tie to parcels visibility
    const vis = visible ? 'visible' : 'none';
    [EXTRUSION_LAYER_ID, BORDER_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
