/**
 * ClimateOverlay — Climate projection overlay showing temperature, precipitation,
 * growing season, and species impact for the selected RCP scenario.
 */

import { useMemo } from 'react';
import { Thermometer, Droplets, Sun, Snowflake, AlertTriangle } from 'lucide-react';
import type { ClimateProjection, RCPScenario } from '@/hooks/useDigitalTwin';

interface ClimateOverlayProps {
  projections: Map<RCPScenario, ClimateProjection[]>;
  selectedRCP: RCPScenario;
  currentYear: number;
  onRCPChange: (rcp: RCPScenario) => void;
}

const RCP_LABELS: Record<RCPScenario, { name: string; color: string; desc: string }> = {
  '2.6': { name: 'RCP 2.6', color: '#4ade80', desc: 'Stark utsläppsminskning (Parisavtalet)' },
  '4.5': { name: 'RCP 4.5', color: '#f59e0b', desc: 'Måttlig utsläppsminskning' },
  '8.5': { name: 'RCP 8.5', color: '#ef4444', desc: 'Höga utsläpp (business as usual)' },
};

interface SpeciesImpact {
  species: string;
  impact: string;
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
  recommendation?: string;
}

function getSpeciesImpacts(tempChange: number): SpeciesImpact[] {
  const impacts: SpeciesImpact[] = [];

  if (tempChange < 1) {
    impacts.push({ species: 'Gran (Picea abies)', impact: 'Stabil, ökad tillväxt', severity: 'positive' });
    impacts.push({ species: 'Tall (Pinus sylvestris)', impact: 'Stabil, något ökad tillväxt', severity: 'positive' });
  } else if (tempChange < 2) {
    impacts.push({
      species: 'Gran (Picea abies)',
      impact: `Stressad vid +${tempChange.toFixed(1)}°C — minskande tillväxt`,
      severity: 'warning',
      recommendation: 'Överväg Douglasgran eller hybridlärk som komplement',
    });
    impacts.push({ species: 'Tall (Pinus sylvestris)', impact: 'Relativt stabil', severity: 'neutral' });
    impacts.push({ species: 'Ek (Quercus robur)', impact: 'Ökande lämplighet i södra Sverige', severity: 'positive' });
  } else {
    impacts.push({
      species: 'Gran (Picea abies)',
      impact: `Kritisk vid +${tempChange.toFixed(1)}°C — hög dödlighet, barkborre-epidemier`,
      severity: 'critical',
      recommendation: 'Byt till klimattåliga arter i riskzoner',
    });
    impacts.push({
      species: 'Tall (Pinus sylvestris)',
      impact: 'Måttligt stressad, fortfarande lönsam',
      severity: 'warning',
    });
    impacts.push({
      species: 'Ek / Bok',
      impact: 'Starkt ökande lämplighet — expanderar norrut',
      severity: 'positive',
    });
    impacts.push({
      species: 'Douglasgran / Hybridlärk',
      impact: 'Utmärkt klimatanpassning — hög tillväxt',
      severity: 'positive',
      recommendation: 'Rekommenderas som ersättning för gran',
    });
  }

  return impacts;
}

function TempPrecipChart({
  projections,
  selectedRCP,
  currentYear,
}: {
  projections: Map<RCPScenario, ClimateProjection[]>;
  selectedRCP: RCPScenario;
  currentYear: number;
}) {
  const allRCPs: RCPScenario[] = ['2.6', '4.5', '8.5'];

  const svgW = 420;
  const svgH = 160;
  const pad = { top: 15, right: 15, bottom: 25, left: 40 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  // Sample every 2 years
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2026; y <= 2080; y += 2) arr.push(y);
    return arr;
  }, []);

  const xScale = (i: number) => pad.left + (i / (years.length - 1)) * chartW;
  const yScaleTemp = (v: number) => pad.top + chartH - (v / 4.5) * chartH;

  const currentIdx = years.findIndex(y => y >= currentYear);
  const currentX = currentIdx >= 0 ? xScale(currentIdx) : null;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {[0, 1, 2, 3, 4].map(temp => {
        const y = yScaleTemp(temp);
        return (
          <g key={temp}>
            <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
            <text x={pad.left - 4} y={y + 3} fill="var(--text3)" fontSize="7" textAnchor="end" fontFamily="monospace">
              +{temp}°C
            </text>
          </g>
        );
      })}

      {/* Current year line */}
      {currentX && (
        <line x1={currentX} y1={pad.top} x2={currentX} y2={svgH - pad.bottom}
          stroke="var(--text3)" strokeWidth="0.5" strokeDasharray="3,3" />
      )}

      {/* Lines per RCP */}
      {allRCPs.map(rcp => {
        const data = projections.get(rcp);
        if (!data) return null;
        const isActive = rcp === selectedRCP;

        const points = years.map((y, i) => {
          const dp = data.find(d => d.year === y) || data[0];
          return `${xScale(i)},${yScaleTemp(dp.tempChange)}`;
        }).join(' ');

        // Confidence band for selected RCP
        const bandPoints = isActive ? years.map((y, i) => {
          const dp = data.find(d => d.year === y) || data[0];
          return { x: xScale(i), yLow: yScaleTemp(dp.confidenceLow), yHigh: yScaleTemp(dp.confidenceHigh) };
        }) : null;

        return (
          <g key={rcp}>
            {bandPoints && (
              <polygon
                points={[
                  ...bandPoints.map(p => `${p.x},${p.yHigh}`),
                  ...bandPoints.reverse().map(p => `${p.x},${p.yLow}`),
                ].join(' ')}
                fill={RCP_LABELS[rcp].color}
                opacity="0.1"
              />
            )}
            <polyline
              points={points}
              fill="none"
              stroke={RCP_LABELS[rcp].color}
              strokeWidth={isActive ? '2' : '1'}
              opacity={isActive ? 1 : 0.3}
              strokeDasharray={isActive ? 'none' : '4,2'}
            />
          </g>
        );
      })}

      {/* Decade labels */}
      {[2030, 2040, 2050, 2060, 2070, 2080].map(decade => {
        const idx = years.indexOf(decade);
        if (idx < 0) return null;
        return (
          <text key={decade} x={xScale(idx)} y={svgH - 4} fill="var(--text3)" fontSize="7" textAnchor="middle" fontFamily="monospace">
            {decade}
          </text>
        );
      })}

      {/* Y-axis label */}
      <text x="8" y={pad.top + chartH / 2} fill="var(--text3)" fontSize="7" textAnchor="middle" fontFamily="monospace"
        transform={`rotate(-90, 8, ${pad.top + chartH / 2})`}>
        Temperaturändring
      </text>
    </svg>
  );
}

export function ClimateOverlay({ projections, selectedRCP, currentYear, onRCPChange }: ClimateOverlayProps) {
  const currentProj = useMemo(() => {
    const data = projections.get(selectedRCP);
    if (!data) return null;
    return data.find(d => d.year === currentYear) || data[0];
  }, [projections, selectedRCP, currentYear]);

  const speciesImpacts = useMemo(() => {
    return getSpeciesImpacts(currentProj?.tempChange || 0);
  }, [currentProj]);

  if (!currentProj) return null;

  const severityColors = {
    positive: { bg: 'rgba(74,222,128,0.1)', text: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    neutral: { bg: 'rgba(148,163,184,0.1)', text: 'var(--text2)', border: 'var(--border)' },
    warning: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    critical: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  };

  return (
    <div className="space-y-4">
      {/* RCP Selector */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)]">Klimatscenario</h3>
          <div className="flex gap-1">
            {(['2.6', '4.5', '8.5'] as RCPScenario[]).map(rcp => (
              <button
                key={rcp}
                onClick={() => onRCPChange(rcp)}
                className="text-[10px] px-2.5 py-1 rounded-md font-mono font-medium transition-all"
                style={{
                  background: selectedRCP === rcp ? RCP_LABELS[rcp].color : 'transparent',
                  color: selectedRCP === rcp ? '#000' : 'var(--text3)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: selectedRCP === rcp ? RCP_LABELS[rcp].color : 'transparent',
                }}
              >
                {RCP_LABELS[rcp].name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <p className="text-[10px] text-[var(--text3)] mb-3">{RCP_LABELS[selectedRCP].desc}</p>

          {/* Temperature/Precipitation chart */}
          <TempPrecipChart
            projections={projections}
            selectedRCP={selectedRCP}
            currentYear={currentYear}
          />

          {/* Legend */}
          <div className="flex gap-4 mt-2">
            {(['2.6', '4.5', '8.5'] as RCPScenario[]).map(rcp => (
              <span key={rcp} className="flex items-center gap-1 text-[9px] text-[var(--text3)]">
                <span className="w-3 h-0.5 rounded" style={{
                  background: RCP_LABELS[rcp].color,
                  opacity: selectedRCP === rcp ? 1 : 0.3,
                }} />
                {RCP_LABELS[rcp].name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Current climate stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ClimateStat
          icon={<Thermometer size={14} />}
          label="Temperaturändring"
          value={`+${currentProj.tempChange.toFixed(1)}°C`}
          color={currentProj.tempChange > 2 ? '#ef4444' : currentProj.tempChange > 1 ? '#fbbf24' : '#4ade80'}
        />
        <ClimateStat
          icon={<Droplets size={14} />}
          label="Sommarnederbörd"
          value={`${currentProj.precipChangeSummer > 0 ? '+' : ''}${currentProj.precipChangeSummer}%`}
          color={currentProj.precipChangeSummer < -10 ? '#ef4444' : '#06b6d4'}
        />
        <ClimateStat
          icon={<Sun size={14} />}
          label="Växtsäsong"
          value={`${currentProj.growingSeasonDays} dagar`}
          color="#4ade80"
          detail={`+${currentProj.growingSeasonDays - 200} dagar vs idag`}
        />
        <ClimateStat
          icon={<Snowflake size={14} />}
          label="Frostfri period"
          value={`${currentProj.frostFreeDays} dagar`}
          color="#06b6d4"
          detail={`+${currentProj.frostFreeDays - 180} dagar vs idag`}
        />
      </div>

      {/* Species impact assessment */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <AlertTriangle size={14} className="text-[var(--yellow)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Artpåverkan vid {currentYear}</h3>
        </div>

        <div className="p-4 space-y-2">
          {speciesImpacts.map((si, i) => {
            const colors = severityColors[si.severity];
            return (
              <div
                key={i}
                className="rounded-lg p-3 border"
                style={{ background: colors.bg, borderColor: colors.border }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium" style={{ color: colors.text }}>
                      {si.species}
                    </span>
                    <p className="text-[10px] text-[var(--text2)] mt-0.5">{si.impact}</p>
                  </div>
                  <span
                    className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {si.severity === 'positive' ? 'GYNNSAM' :
                     si.severity === 'neutral' ? 'STABIL' :
                     si.severity === 'warning' ? 'VARNING' : 'KRITISK'}
                  </span>
                </div>
                {si.recommendation && (
                  <p className="text-[9px] mt-1.5 px-2 py-1 rounded bg-[var(--bg)] text-[var(--text3)]">
                    {si.recommendation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClimateStat({ icon, label, value, color, detail }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-mono font-bold" style={{ color }}>
        {value}
      </div>
      {detail && (
        <span className="text-[9px] text-[var(--text3)]">{detail}</span>
      )}
    </div>
  );
}
