import { useState, useMemo } from 'react';
import type {
  Shield} from 'lucide-react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  TreePine,
  Plane,
  Radio,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  useAirspaceCheck,
  ZONE_TYPE_LABELS,
  type AirspaceRestriction,
  type AirspaceStatus,
  type ZoneType,
} from '@/hooks/useAirspaceCheck';

// ─── Zone Styling ───

const ZONE_STYLES: Record<ZoneType, {
  fill: string;
  stroke: string;
  opacity: number;
  icon: typeof Shield;
  pattern?: 'hatching' | 'dots';
  pulse?: boolean;
}> = {
  CTR: { fill: '#ef4444', stroke: '#dc2626', opacity: 0.25, icon: ShieldX, pattern: 'hatching' },
  ATZ: { fill: '#f97316', stroke: '#ea580c', opacity: 0.20, icon: ShieldAlert },
  R: { fill: '#ef4444', stroke: '#b91c1c', opacity: 0.30, icon: ShieldX, pattern: 'hatching' },
  P: { fill: '#dc2626', stroke: '#991b1b', opacity: 0.35, icon: ShieldX, pattern: 'hatching' },
  D: { fill: '#f59e0b', stroke: '#d97706', opacity: 0.20, icon: AlertTriangle },
  NATURE_RESERVE: { fill: '#22c55e', stroke: '#16a34a', opacity: 0.15, icon: TreePine },
  NOTAM: { fill: '#eab308', stroke: '#ca8a04', opacity: 0.25, icon: Radio, pulse: true },
};

const STATUS_CONFIG: Record<AirspaceStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> = {
  green: { label: 'Flygning tillåten', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: ShieldCheck },
  yellow: { label: 'Flygning med restriktioner', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: ShieldAlert },
  red: { label: 'Flygning ej tillåten', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: ShieldX },
};

// ─── Props ───

interface AirspaceOverlayProps {
  lat: number | null;
  lng: number | null;
  altitudeM?: number;
  radiusKm?: number;
  /** Show the legend panel */
  showLegend?: boolean;
  /** Compact mode for embedded use */
  compact?: boolean;
  /** Called when a restriction zone is clicked */
  onZoneClick?: (restriction: AirspaceRestriction) => void;
}

/**
 * AirspaceOverlay — Swedish drone airspace restriction overlay.
 *
 * Displays:
 * - Status banner (green/yellow/red)
 * - Restriction list with details
 * - Zone type legend in Swedish
 * - Map polygon data for integration with MapLibre
 *
 * Zone colors:
 * - CTR zones: red with hatching
 * - ATZ zones: orange
 * - R/P areas: dark red with hatching
 * - D areas: amber
 * - Nature reserves: green outline
 * - Active NOTAMs: yellow pulsing
 */
export default function AirspaceOverlay({
  lat,
  lng,
  altitudeM = 120,
  radiusKm = 15,
  showLegend = true,
  compact = false,
  onZoneClick,
}: AirspaceOverlayProps) {
  const {
    status,
    allowed: _allowed,
    restrictions,
    warnings,
    maxAltitudeM,
    requiresPermit,
    permitAuthorities,
    loading,
    error,
    refresh,
  } = useAirspaceCheck(lat, lng, altitudeM, radiusKm);

  const [legendOpen, setLegendOpen] = useState(false);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Group restrictions by type for organized display
  const _groupedRestrictions = useMemo(() => {
    const groups: Record<string, AirspaceRestriction[]> = {};
    for (const r of restrictions) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [restrictions]);

  /**
   * Get GeoJSON FeatureCollection for map rendering.
   * Consumers can pass this to MapLibre GL as a source.
   */
  const _geoJsonFeatures = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: restrictions
        .filter(r => r.geometry)
        .map(r => {
          const style = ZONE_STYLES[r.type];
          return {
            type: 'Feature' as const,
            id: r.id,
            properties: {
              id: r.id,
              type: r.type,
              name: r.name,
              description: r.description,
              maxAltitudeM: r.maxAltitudeM,
              requiresPermit: r.requiresPermit,
              fillColor: style.fill,
              fillOpacity: style.opacity,
              strokeColor: style.stroke,
              strokeWidth: r.type === 'NATURE_RESERVE' ? 2 : 1.5,
              pattern: style.pattern ?? null,
              pulse: style.pulse ?? false,
            },
            geometry: r.geometry!,
          };
        }),
    };
  }, [restrictions]);

  if (lat === null || lng === null) {
    return (
      <div style={{
        padding: compact ? '12px' : '16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#9ca3af',
        fontSize: '14px',
        textAlign: 'center',
      }}>
        <Plane size={20} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
        <div>Välj en plats på kartan för att kontrollera luftrum</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? '8px' : '12px',
    }}>
      {/* ── Status Banner ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: compact ? '10px 14px' : '14px 18px',
        background: statusConfig.bgColor,
        borderRadius: '12px',
        border: `1px solid ${statusConfig.color}33`,
      }}>
        <StatusIcon size={compact ? 20 : 24} color={statusConfig.color} />
        <div style={{ flex: 1 }}>
          <div style={{
            color: statusConfig.color,
            fontWeight: 600,
            fontSize: compact ? '14px' : '16px',
          }}>
            {loading ? 'Kontrollerar luftrum...' : statusConfig.label}
          </div>
          {!loading && !compact && (
            <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
              Max höjd: {maxAltitudeM}m AGL &middot; {restrictions.length} restriktioner inom {radiusKm} km
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '4px',
          }}
          title="Uppdatera"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.1)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ── Warnings ── */}
      {warnings.length > 0 && !compact && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '12px 14px',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '13px',
              color: '#fbbf24',
            }}>
              <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Permit Requirements ── */}
      {requiresPermit && !compact && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(139,92,246,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(139,92,246,0.2)',
          fontSize: '13px',
          color: '#c4b5fd',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Tillstånd krävs</div>
          <div>Kontakta: {permitAuthorities.join(', ')}</div>
          <a
            href="https://www.droneinfo.se"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#a78bfa',
              marginTop: '6px',
              fontSize: '12px',
              textDecoration: 'none',
            }}
          >
            Mer info på Drönarkollen <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* ── Restriction List ── */}
      {restrictions.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {!compact && (
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
              Aktiva restriktioner
            </div>
          )}
          {restrictions.map(r => {
            const style = ZONE_STYLES[r.type];
            const ZoneIcon = style.icon;
            const isExpanded = expandedZone === r.id;

            return (
              <div
                key={r.id}
                onClick={() => {
                  setExpandedZone(isExpanded ? null : r.id);
                  onZoneClick?.(r);
                }}
                style={{
                  padding: compact ? '8px 10px' : '10px 14px',
                  background: `${style.fill}11`,
                  borderRadius: '8px',
                  border: `1px solid ${style.stroke}33`,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <div style={{
                    width: compact ? '28px' : '32px',
                    height: compact ? '28px' : '32px',
                    borderRadius: '8px',
                    background: `${style.fill}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ZoneIcon size={compact ? 14 : 16} color={style.stroke} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: '#e5e7eb',
                      fontSize: compact ? '12px' : '13px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {r.name}
                    </div>
                    {!compact && (
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '1px' }}>
                        {ZONE_TYPE_LABELS[r.type]}
                        {r.maxAltitudeM !== null && r.maxAltitudeM > 0 && ` · Max ${r.maxAltitudeM}m`}
                      </div>
                    )}
                  </div>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: style.fill,
                    boxShadow: style.pulse ? `0 0 8px ${style.fill}88` : 'none',
                    animation: style.pulse ? 'pulse 2s ease-in-out infinite' : 'none',
                    flexShrink: 0,
                  }} />
                </div>

                {/* Expanded details */}
                {isExpanded && !compact && (
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '12px',
                    color: '#9ca3af',
                    lineHeight: 1.5,
                  }}>
                    <p>{r.description}</p>
                    {r.validFrom && (
                      <p style={{ marginTop: '6px', color: '#f59e0b' }}>
                        Giltig: {new Date(r.validFrom).toLocaleDateString('sv-SE')}
                        {r.validUntil && ` — ${new Date(r.validUntil).toLocaleDateString('sv-SE')}`}
                      </p>
                    )}
                    {r.requiresPermit && r.permitAuthority && (
                      <p style={{ marginTop: '4px' }}>
                        Tillståndsgivare: {r.permitAuthority}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── No restrictions ── */}
      {restrictions.length === 0 && !loading && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '13px',
        }}>
          <ShieldCheck size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
          <div>Inga restriktioner hittades inom {radiusKm} km</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            Maxhöjd: {maxAltitudeM}m AGL (öppen kategori)
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {showLegend && !compact && (
        <div style={{
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={13} /> Zonförklaring
            </span>
            {legendOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {legendOpen && (
            <div style={{
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {(Object.keys(ZONE_STYLES) as ZoneType[]).map(type => {
                const style = ZONE_STYLES[type];
                const _ZoneIcon = style.icon;
                return (
                  <div key={type} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '16px',
                      borderRadius: '3px',
                      background: `${style.fill}${Math.round(style.opacity * 255).toString(16).padStart(2, '0')}`,
                      border: `1.5px solid ${style.stroke}`,
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {style.pattern === 'hatching' && (
                        <svg width="24" height="16" style={{ position: 'absolute', top: 0, left: 0 }}>
                          <pattern id={`h-${type}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="6" stroke={style.stroke} strokeWidth="1" opacity="0.5" />
                          </pattern>
                          <rect width="24" height="16" fill={`url(#h-${type})`} />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#d1d5db', fontWeight: 500 }}>{ZONE_TYPE_LABELS[type]}</span>
                      <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                        {getLegendDescription(type)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div style={{
                marginTop: '6px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '11px',
                color: '#6b7280',
                lineHeight: 1.5,
              }}>
                Källa: LFV, Drönarkollen, Naturvårdsverket. Data uppdateras regelbundet men
                kontrollera alltid aktuell information på{' '}
                <a
                  href="https://www.droneinfo.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a78bfa', textDecoration: 'none' }}
                >
                  droneinfo.se
                </a>{' '}
                innan flygning.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ───

function getLegendDescription(type: ZoneType): string {
  const descriptions: Record<ZoneType, string> = {
    CTR: '— Flygning förbjuden utan tillstånd från LFV',
    ATZ: '— Samordning med flygledning krävs',
    R: '— Militärt / känsligt — tillstånd krävs',
    P: '— Flygning helt förbjuden',
    D: '— Varning — kontrollera aktivitet',
    NATURE_RESERVE: '— Kan kräva tillstånd från Länsstyrelsen',
    NOTAM: '— Tillfällig restriktion — kontrollera giltighet',
  };
  return descriptions[type];
}

// ─── Exported Utilities ───

/**
 * Get GeoJSON-ready zone data for MapLibre GL source.
 * Usage: map.addSource('airspace', { type: 'geojson', data: getAirspaceGeoJson(restrictions) })
 */
export function getAirspaceGeoJson(restrictions: AirspaceRestriction[]) {
  return {
    type: 'FeatureCollection' as const,
    features: restrictions
      .filter(r => r.geometry)
      .map(r => {
        const style = ZONE_STYLES[r.type];
        return {
          type: 'Feature' as const,
          id: r.id,
          properties: {
            id: r.id,
            type: r.type,
            name: r.name,
            fillColor: style.fill,
            fillOpacity: style.opacity,
            strokeColor: style.stroke,
            pattern: style.pattern ?? null,
          },
          geometry: r.geometry!,
        };
      }),
  };
}

/**
 * MapLibre GL paint properties for airspace fill layer.
 */
export const AIRSPACE_FILL_PAINT = {
  'fill-color': ['get', 'fillColor'],
  'fill-opacity': ['get', 'fillOpacity'],
} as const;

/**
 * MapLibre GL paint properties for airspace outline layer.
 */
export const AIRSPACE_LINE_PAINT = {
  'line-color': ['get', 'strokeColor'],
  'line-width': 1.5,
  'line-dasharray': [2, 2],
} as const;
