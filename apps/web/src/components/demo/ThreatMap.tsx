import React, { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import type { FireDetection } from '@/services/fireService';
import type { PestZone } from '@/services/skogsstyrelsenService';

interface ThreatMapProps {
  fires: FireDetection[];
  pestZones: PestZone[];
}

interface HoveredFeature {
  type: 'fire' | 'beetle' | null;
  index: number | null;
}

// Simplified Sweden map coordinates (latitude/longitude to SVG coordinates)
// Using a 1000x1200 SVG canvas for Sweden
const latLonToSvg = (lat: number, lon: number): [number, number] => {
  // Sweden bounds approximately: lat 55-69, lon 10-25
  const minLat = 54.5, maxLat = 69.5, minLon = 10, maxLon = 25;
  const svgWidth = 1000, svgHeight = 1200;

  const x = ((lon - minLon) / (maxLon - minLon)) * svgWidth;
  const y = ((maxLat - lat) / (maxLat - minLat)) * svgHeight;

  return [x, y];
};

// Simple polygon for Sweden outline (simplified)
const SwedenOutline = () => {
  const points = [
    // Very simplified Sweden coastline
    [55.2, 15.5], [55.3, 14.8], [55.5, 14.0], [55.8, 13.5], [56.2, 13.2],
    [56.5, 12.8], [56.8, 12.3], [57.2, 11.8], [57.5, 11.5], [57.8, 11.2],
    [58.2, 11.0], [58.5, 11.2], [58.8, 11.5], [59.2, 11.8], [59.5, 12.3],
    [59.8, 12.8], [60.2, 13.5], [60.5, 14.2], [60.8, 14.8], [61.2, 15.5],
    [61.5, 16.2], [61.8, 17.0], [62.2, 17.8], [62.5, 18.5], [62.8, 19.2],
    [63.2, 19.8], [63.5, 20.2], [63.8, 20.5], [64.2, 20.8], [64.5, 21.0],
    [64.8, 21.2], [65.2, 21.3], [65.5, 21.2], [65.8, 21.0], [66.2, 20.8],
    [66.5, 20.5], [66.8, 20.2], [67.2, 19.8], [67.5, 19.5], [67.8, 19.2],
    [68.2, 19.0], [68.5, 18.8], [68.8, 18.5], [69.2, 18.2], [69.5, 17.8],
    [69.3, 17.0], [69.0, 16.2], [68.8, 15.5], [68.5, 14.8], [68.2, 14.2],
    [67.8, 13.8], [67.5, 13.2], [67.2, 12.8], [66.8, 12.5], [66.5, 12.2],
    [66.2, 12.0], [65.8, 11.8], [65.5, 11.5], [65.2, 11.2], [64.8, 10.8],
    [64.5, 10.5], [64.2, 10.2], [63.8, 10.0], [63.5, 10.2], [63.2, 10.5],
    [62.8, 10.8], [62.5, 11.0], [62.2, 11.2], [61.8, 11.0], [61.5, 10.8],
    [61.2, 10.5], [60.8, 10.2], [60.5, 10.0], [60.2, 10.2], [59.8, 10.5],
    [59.5, 10.8], [59.2, 11.0], [58.8, 11.2], [58.5, 11.0], [58.2, 10.8],
    [57.8, 10.5], [57.5, 10.2], [57.2, 10.0], [56.8, 10.2], [56.5, 10.5],
    [56.2, 10.8], [55.8, 11.0], [55.5, 11.2], [55.2, 11.0], [55.0, 10.8],
    [55.2, 15.5], // Close the loop
  ];

  const pathData = points.map((p, i) => {
    const [x, y] = latLonToSvg(p[0], p[1]);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return <path d={pathData + ' Z'} fill="#1f2937" stroke="#4b5563" strokeWidth="2" />;
};

// Pulsing fire hotspot
const FireHotspot: React.FC<{ fire: FireDetection; onHover: (hover: boolean) => void }> = ({
  fire,
  onHover,
}) => {
  const [x, y] = latLonToSvg(fire.latitude, fire.longitude);
  const size = fire.frp > 10 ? 12 : 8;

  return (
    <g
      key={`fire-${fire.latitude}-${fire.longitude}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Pulsing outer ring */}
      <circle cx={x} cy={y} r={size + 8} fill="#ef4444" opacity="0.3" className="animate-pulse" />

      {/* Main dot */}
      <circle cx={x} cy={y} r={size} fill="#dc2626" className="hover:fill-red-300 transition-colors cursor-pointer" />

      {/* Glow */}
      <circle cx={x} cy={y} r={size - 2} fill="#ff6b6b" opacity="0.8" />
    </g>
  );
};

// Beetle threat zone
const BeetleThreatZone: React.FC<{ zone: PestZone; onHover: (hover: boolean) => void }> = ({
  zone,
  onHover,
}) => {
  const [x, y] = latLonToSvg(zone.lat, zone.lon);
  const sizeMap = { outbreak: 16, elevated: 12, normal: 8 };
  const size = sizeMap[zone.severity];

  return (
    <g
      key={`beetle-${zone.id}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Threat zone background */}
      <circle cx={x} cy={y} r={size + 6} fill="#f59e0b" opacity="0.2" />

      {/* Main hexagon-like indicator */}
      <circle cx={x} cy={y} r={size} fill="#f59e0b" className="hover:fill-amber-300 transition-colors cursor-pointer" />

      {/* Severity indicator */}
      <circle cx={x} cy={y} r={size - 3} fill="#fbbf24" opacity="0.9" />
    </g>
  );
};

// Healthy forest area (green zones)
const HealthyZone: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
  const [x, y] = latLonToSvg(lat, lon);
  return (
    <circle
      cx={x}
      cy={y}
      r={6}
      fill="#10b981"
      opacity="0.6"
      className="hover:opacity-100 transition-opacity cursor-pointer"
    />
  );
};

const ThreatMap: React.FC<ThreatMapProps> = ({ fires, pestZones }) => {
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature>({ type: null, index: null });

  // Select the first few zones and fires for display
  const displayFires = fires.slice(0, 8);
  const displayZones = pestZones.slice(0, 6);

  // Generate some healthy zone indicators (monitoring locations)
  const healthyZones = [
    { lat: 58.5, lon: 15.0 },
    { lat: 60.2, lon: 18.5 },
    { lat: 62.8, lon: 17.2 },
    { lat: 57.0, lon: 12.5 },
  ];

  const getHoveredFireInfo = () => {
    if (hoveredFeature.type === 'fire' && hoveredFeature.index !== null) {
      const fire = displayFires[hoveredFeature.index];
      return {
        title: 'Aktiv brand',
        details: [
          `Kraft: ${fire.frp.toFixed(1)} MW`,
          `Säkerhet: ${fire.confidence}`,
          `Tid: ${fire.acq_time.substring(0, 2)}:${fire.acq_time.substring(2)}`,
        ],
      };
    }
    return null;
  };

  const getHoveredZoneInfo = () => {
    if (hoveredFeature.type === 'beetle' && hoveredFeature.index !== null) {
      const zone = displayZones[hoveredFeature.index];
      return {
        title: `Barkborre - ${zone.severity.toUpperCase()}`,
        details: [
          `Art: ${zone.species}`,
          `Område: ${zone.affectedHa} hektar`,
          `Region: ${zone.county}`,
        ],
      };
    }
    return null;
  };

  const hoveredInfo = getHoveredFireInfo() || getHoveredZoneInfo();

  return (
    <div className="border border-gray-800 rounded-lg p-6 bg-gray-900">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-semibold">Interactive Threat Map</h2>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Realtidsövervakning av skogshotretorna i Sverige
      </p>

      <div className="relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800 mb-6">
        {/* SVG Map */}
        <svg viewBox="0 0 1000 1200" className="w-full h-auto" style={{ minHeight: '500px' }}>
          {/* Sweden outline */}
          <SwedenOutline />

          {/* Healthy monitored areas (green) */}
          {healthyZones.map((zone, i) => (
            <HealthyZone key={`healthy-${i}`} lat={zone.lat} lon={zone.lon} />
          ))}

          {/* Beetle threat zones (amber) */}
          {displayZones.map((zone, i) => (
            <BeetleThreatZone
              key={`beetle-${i}`}
              zone={zone}
              onHover={(hover) =>
                setHoveredFeature(hover ? { type: 'beetle', index: i } : { type: null, index: null })
              }
            />
          ))}

          {/* Fire hotspots (red) */}
          {displayFires.map((fire, i) => (
            <FireHotspot
              key={`fire-${i}`}
              fire={fire}
              onHover={(hover) =>
                setHoveredFeature(hover ? { type: 'fire', index: i } : { type: null, index: null })
              }
            />
          ))}

          {/* Legend background */}
          <rect x="10" y="10" width="180" height="110" fill="#1f2937" opacity="0.9" rx="4" />
          <text x="20" y="30" fontSize="12" fontWeight="bold" fill="#fff">
            Legend
          </text>
          <circle cx="20" cy="45" r="4" fill="#dc2626" />
          <text x="30" y="48" fontSize="11" fill="#e5e7eb">
            Aktiva bränder
          </text>
          <circle cx="20" cy="60" r="4" fill="#f59e0b" />
          <text x="30" y="63" fontSize="11" fill="#e5e7eb">
            Barkborrar
          </text>
          <circle cx="20" cy="75" r="4" fill="#10b981" />
          <text x="30" y="78" fontSize="11" fill="#e5e7eb">
            Frisk skog
          </text>
          <circle cx="20" cy="90" r="4" fill="#6b7280" />
          <text x="30" y="93" fontSize="11" fill="#e5e7eb">
            Bebyggelse
          </text>
        </svg>

        {/* Hovered Info Tooltip */}
        {hoveredInfo && (
          <div className="absolute bottom-4 left-4 bg-gray-950 border border-gray-700 rounded-lg p-3 max-w-xs z-20">
            <div className="font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {hoveredInfo.title}
            </div>
            <div className="space-y-1 text-xs text-gray-300">
              {hoveredInfo.details.map((detail, i) => (
                <div key={i}>{detail}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{displayFires.length}</div>
          <div className="text-xs text-gray-400 mt-1">Aktiva bränder</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{displayZones.length}</div>
          <div className="text-xs text-gray-400 mt-1">Barkborrzoner</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{healthyZones.length}</div>
          <div className="text-xs text-gray-400 mt-1">Övervakade zoner</div>
        </div>
      </div>

      <div className="p-4 bg-cyan-950/40 border border-cyan-800/50 rounded-lg text-sm text-cyan-300">
        <p>Kartan visar realtidsdata från NASA FIRMS (bränder) och Skogsstyrelsen (barkborrhotretector). Hovra över markörer för mer information.</p>
      </div>
    </div>
  );
};

export default ThreatMap;
