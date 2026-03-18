import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useFusionStore } from '@/stores/fusionStore';
import { DEMO_PARCELS } from '@/lib/demoData';

interface TemporalRingsProps {
  map: maplibregl.Map | null;
}

// ─── Demo temporal data for each parcel (10 years) ───

interface YearData {
  year: number;
  growth: number;  // 0-1 (ring width)
  health: number;  // 0-1 (ring color: green→red)
}

interface ParcelTemporal {
  parcelId: string;
  name: string;
  center: [number, number];
  dominantSpecies: string;
  currentRisk: number; // 0-1 for glow
  years: YearData[];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateTemporalData(): ParcelTemporal[] {
  const data: ParcelTemporal[] = [];
  const currentYear = 2026;

  const parcels = DEMO_PARCELS.slice(0, 5);

  // Pre-defined trajectories per parcel
  const trajectories: Record<string, { baseGrowth: number; healthTrend: number; eventYear?: number; risk: number }> = {
    p1: { baseGrowth: 0.7, healthTrend: -0.03, eventYear: 2024, risk: 0.65 },  // at_risk
    p2: { baseGrowth: 0.8, healthTrend: 0.01, risk: 0.15 },                     // healthy
    p3: { baseGrowth: 0.75, healthTrend: 0.0, risk: 0.2 },                      // healthy
    p4: { baseGrowth: 0.6, healthTrend: -0.05, eventYear: 2023, risk: 0.9 },    // infested
    p5: { baseGrowth: 0.65, healthTrend: -0.01, risk: 0.35 },                   // unknown
  };

  for (const parcel of parcels) {
    const rand = seededRandom(parcel.id.charCodeAt(1) * 7919);
    const traj = trajectories[parcel.id] ?? { baseGrowth: 0.7, healthTrend: 0, risk: 0.3 };
    const years: YearData[] = [];

    for (let i = 0; i < 10; i++) {
      const year = currentYear - 9 + i;
      const yearIdx = i / 9; // 0-1 normalized
      let growth = traj.baseGrowth + (rand() - 0.5) * 0.25;
      let health = 0.85 + traj.healthTrend * i + (rand() - 0.5) * 0.1;

      // Event year: sharp decline
      if (traj.eventYear && year === traj.eventYear) {
        growth *= 0.4;
        health -= 0.3;
      }
      if (traj.eventYear && year > traj.eventYear) {
        growth *= 0.6 + yearIdx * 0.2;
        health -= 0.15;
      }

      // Drought year 2022 affected everyone
      if (year === 2022) {
        growth *= 0.65;
        health -= 0.1;
      }

      years.push({
        year,
        growth: Math.max(0.15, Math.min(1, growth)),
        health: Math.max(0.1, Math.min(1, health)),
      });
    }

    const dominant = parcel.species_mix.reduce((a, b) => a.pct > b.pct ? a : b).species;

    data.push({
      parcelId: parcel.id,
      name: parcel.name,
      center: parcel.center,
      dominantSpecies: dominant,
      currentRisk: traj.risk,
      years,
    });
  }

  return data;
}

// ─── SVG Ring Rendering ───

function healthToColor(health: number): string {
  if (health >= 0.75) return '#4ade80';
  if (health >= 0.55) return '#86efac';
  if (health >= 0.4) return '#facc15';
  if (health >= 0.25) return '#fb923c';
  return '#ef4444';
}

function speciesColor(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('spruce') || s.includes('gran')) return '#4ade80';
  if (s.includes('pine') || s.includes('tall')) return '#22d3ee';
  if (s.includes('birch') || s.includes('björk')) return '#fbbf24';
  if (s.includes('oak') || s.includes('ek')) return '#fb923c';
  return '#86efac';
}

function riskGlowColor(risk: number): string {
  if (risk >= 0.7) return 'rgba(239,68,68,0.6)';
  if (risk >= 0.4) return 'rgba(251,191,36,0.4)';
  return 'rgba(74,222,128,0.3)';
}

function renderRingSVG(
  parcel: ParcelTemporal,
  expanded: boolean,
): string {
  const size = expanded ? 180 : 64;
  const center = size / 2;
  const maxRadius = (size / 2) - (expanded ? 24 : 6);
  const minRadius = expanded ? 12 : 6;
  const ringSpace = (maxRadius - minRadius) / parcel.years.length;

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

  // Outer glow
  const glowColor = riskGlowColor(parcel.currentRisk);
  svg += `<defs>
    <filter id="glow-${parcel.parcelId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${expanded ? 6 : 3}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>`;

  // Background glow circle
  svg += `<circle cx="${center}" cy="${center}" r="${maxRadius + 4}" fill="none" stroke="${glowColor}" stroke-width="${expanded ? 4 : 2}" filter="url(#glow-${parcel.parcelId})" opacity="0.7"/>`;

  // Rings from outer (oldest) to inner (newest)
  for (let i = 0; i < parcel.years.length; i++) {
    const yr = parcel.years[i];
    const radius = maxRadius - i * ringSpace;
    const width = Math.max(1, ringSpace * yr.growth * 0.85);
    const color = healthToColor(yr.health);

    svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${width}" opacity="0.85"/>`;

    // Year labels when expanded
    if (expanded && i % 2 === 0) {
      const labelR = radius + ringSpace * 0.3;
      const angle = -Math.PI / 4 + (i * Math.PI) / 25;
      const lx = center + labelR * Math.cos(angle);
      const ly = center + labelR * Math.sin(angle);
      svg += `<text x="${lx}" y="${ly}" font-size="7" fill="#a3c9a8" font-family="DM Mono,monospace" text-anchor="middle" dominant-baseline="middle">${yr.year}</text>`;
    }
  }

  // Center dot: dominant species color
  const dotColor = speciesColor(parcel.dominantSpecies);
  const dotRadius = expanded ? 8 : 4;
  svg += `<circle cx="${center}" cy="${center}" r="${dotRadius}" fill="${dotColor}" stroke="#030d05" stroke-width="1"/>`;

  // Name label when expanded
  if (expanded) {
    svg += `<text x="${center}" y="${size - 6}" font-size="10" fill="#e8f5e9" font-family="DM Sans,sans-serif" text-anchor="middle" font-weight="600">${parcel.name}</text>`;

    // Health timeline mini-text
    const healthNow = parcel.years[parcel.years.length - 1].health;
    const healthColor = healthToColor(healthNow);
    svg += `<text x="${center}" y="10" font-size="8" fill="${healthColor}" font-family="DM Mono,monospace" text-anchor="middle">H\u00e4lsa ${Math.round(healthNow * 100)}%</text>`;
  }

  svg += '</svg>';
  return svg;
}

function renderTooltipHTML(parcel: ParcelTemporal): string {
  const latestYear = parcel.years[parcel.years.length - 1];
  const oldestYear = parcel.years[0];
  const avgGrowth = parcel.years.reduce((s, y) => s + y.growth, 0) / parcel.years.length;
  const trendSign = latestYear.health > oldestYear.health ? '+' : '';
  const trend = ((latestYear.health - oldestYear.health) * 100).toFixed(0);

  return `<div style="font-family:'DM Sans',sans-serif;background:#0a1f0d;border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:12px 14px;min-width:200px;">
    <p style="font-weight:700;font-size:13px;margin:0 0 6px;color:#e8f5e9;">${parcel.name} \u2014 Temporal</p>
    <div style="font-size:11px;color:#a3c9a8;margin-bottom:4px;">
      Dominant: <span style="color:${speciesColor(parcel.dominantSpecies)};font-weight:600;">${parcel.dominantSpecies}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">H\u00e4lsotrend (10\u00e5r)</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:${healthToColor(latestYear.health)};font-weight:600;">${trendSign}${trend}%</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">Medeltillv\u00e4xt</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:#e8f5e9;font-weight:600;">${(avgGrowth * 100).toFixed(0)}%</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">Aktuell risk</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:${riskGlowColor(parcel.currentRisk).replace('0.6)', '1)').replace('0.4)', '1)').replace('0.3)', '1)')};font-weight:600;">${Math.round(parcel.currentRisk * 100)}%</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#5a8a62;">H\u00e4lsa nu</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:${healthToColor(latestYear.health)};font-weight:600;">${Math.round(latestYear.health * 100)}%</div>
      </div>
    </div>
    <div style="font-size:10px;color:#5a8a62;margin-top:8px;text-align:center;">Klicka f\u00f6r att expandera \u00e5rsringar</div>
  </div>`;
}

export function TemporalRings({ map }: TemporalRingsProps) {
  const { mode } = useFusionStore();
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);
  const dataRef = useRef<ParcelTemporal[]>([]);

  const visible = mode === 'temporal' || mode === 'composite';

  const createMarkers = useCallback(() => {
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!visible) return;

    const data = generateTemporalData();
    dataRef.current = data;

    for (const parcel of data) {
      const isExpanded = expandedParcel === parcel.parcelId;
      const svgString = renderRingSVG(parcel, isExpanded);

      const el = document.createElement('div');
      el.innerHTML = svgString;
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease';
      el.style.filter = 'drop-shadow(0 0 8px rgba(74,222,128,0.2))';

      // Hover: scale up
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)';
        el.style.filter = 'drop-shadow(0 0 16px rgba(74,222,128,0.4))';

        // Show tooltip
        const tooltip = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '280px',
          offset: isExpanded ? 96 : 38,
          className: 'temporal-rings-popup',
        })
          .setLngLat(parcel.center)
          .setHTML(renderTooltipHTML(parcel))
          .addTo(map);

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.filter = 'drop-shadow(0 0 8px rgba(74,222,128,0.2))';
          tooltip.remove();
        }, { once: true });
      });

      // Click: expand/collapse
      el.addEventListener('click', () => {
        setExpandedParcel((prev) => prev === parcel.parcelId ? null : parcel.parcelId);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(parcel.center)
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [map, visible, expandedParcel]);

  useEffect(() => {
    if (!map) return;
    if (map.loaded()) createMarkers();
    else {
      map.on('load', createMarkers);
      return () => { map.off('load', createMarkers); };
    }
  }, [map, createMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, []);

  return null;
}
