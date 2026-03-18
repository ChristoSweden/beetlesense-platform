/**
 * PropagationForecast — Arrival prediction panel showing beetle front distance,
 * propagation speed, wind analysis, and action recommendations.
 */

import {
  ArrowDown,
  Wind,
  Thermometer,
  AlertTriangle,
  Shield,
  TrendingUp,
  Target,
} from 'lucide-react';
import type { PropagationFront, WindCorridor } from '@/hooks/useCrossBorderAlert';

interface PropagationForecastProps {
  beetleFrontDistanceKm: number;
  estimatedArrival: string;
  propagationSpeedKmYear: number;
  overallRisk: number;
  propagationFronts: PropagationFront[];
  windCorridors: WindCorridor[];
}

export function PropagationForecast({
  beetleFrontDistanceKm,
  estimatedArrival,
  propagationSpeedKmYear,
  overallRisk,
  propagationFronts,
  windCorridors,
}: PropagationForecastProps) {
  const riskColor =
    overallRisk >= 75 ? 'var(--red)' : overallRisk >= 50 ? '#f97316' : overallRisk >= 30 ? 'var(--yellow)' : 'var(--green)';

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header with dramatic stat */}
      <div className="p-5 border-b border-[var(--border)]" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Target size={16} className="text-red-400" />
              Ankomstprognos
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              Barkborrefront avstånd till din skog
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-bold font-mono"
            style={{ background: `${riskColor}15`, color: riskColor }}
          >
            Risk {overallRisk}/100
          </div>
        </div>

        {/* Big stat: distance + arrival */}
        <div className="flex items-end gap-6 mb-3">
          <div>
            <div className="text-3xl font-mono font-bold text-red-400">{beetleFrontDistanceKm} km</div>
            <div className="text-xs text-[var(--text3)]">söder om din skog</div>
          </div>
          <div className="pb-0.5">
            <div className="text-lg font-mono font-bold text-[var(--yellow)]">{estimatedArrival}</div>
            <div className="text-xs text-[var(--text3)]">beräknad ankomst</div>
          </div>
        </div>

        {/* Speed indicator */}
        <div className="flex items-center gap-3 bg-[var(--bg)] rounded-lg p-3 border border-[var(--border)]">
          <TrendingUp size={16} className="text-[var(--yellow)]" />
          <div className="flex-1">
            <div className="text-xs text-[var(--text)]">
              Spridningshastighet: <span className="font-mono font-bold text-[var(--yellow)]">{propagationSpeedKmYear} km/år</span>
            </div>
            <div className="text-[10px] text-[var(--text3)] mt-0.5">
              Baserat på historisk data 2018-2026
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="p-4 border-b border-[var(--border)]">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">Historisk jämförelse</h4>
        <div className="space-y-2">
          <ComparisonRow
            from="Tjeckien"
            to="Tyskland"
            years="3 år (2018 → 2021)"
            distance="350 km"
            status="complete"
          />
          <ComparisonRow
            from="Tyskland"
            to="Nordtyskland"
            years="3 år (2021 → 2024)"
            distance="300 km"
            status="complete"
          />
          <ComparisonRow
            from="Nordtyskland"
            to="Sverige"
            years="2-4 år (2024 → ?)"
            distance="420 km"
            status="active"
          />
          <ComparisonRow
            from="Norge"
            to="Värmland"
            years="1-2 år (2025 → ?)"
            distance="50 km"
            status="imminent"
          />
        </div>
      </div>

      {/* Active fronts */}
      <div className="p-4 border-b border-[var(--border)]">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          Aktiva spridningsfronter
        </h4>
        <div className="space-y-2">
          {propagationFronts.map((front) => (
            <div
              key={front.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
            >
              <ArrowDown
                size={16}
                className="text-red-400 flex-shrink-0"
                style={{ transform: `rotate(${front.direction}deg)` }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text)] truncate">
                  {front.name}
                </div>
                <div className="text-[10px] text-[var(--text3)]">
                  {front.distanceToSwedenKm > 0
                    ? `${front.distanceToSwedenKm} km till Sverige`
                    : 'Vid svenska gränsen'}{' '}
                  &middot; {front.speedKmPerYear} km/år
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono font-bold text-[var(--yellow)]">
                  {front.estimatedArrivalYear[0]}-{front.estimatedArrivalYear[1]}
                </div>
                <div className="text-[10px] text-[var(--text3)]">
                  {front.confidence}% konf.
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wind corridors */}
      <div className="p-4 border-b border-[var(--border)]">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Wind size={14} className="text-blue-400" />
          Vindkorridorer för barkborrespridning
        </h4>
        <div className="space-y-2">
          {windCorridors.map((wc) => (
            <div
              key={wc.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
            >
              <Wind size={14} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text)] truncate">{wc.name}</div>
                <div className="text-[10px] text-[var(--text3)]">
                  {wc.dominantDirection} &middot; {wc.seasonalActive}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="text-xs font-mono font-bold"
                  style={{ color: wc.riskContribution >= 80 ? '#ef4444' : wc.riskContribution >= 60 ? '#f97316' : '#eab308' }}
                >
                  {wc.riskContribution}%
                </div>
                <div className="text-[10px] text-[var(--text3)]">risk</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature suitability */}
      <div className="p-4 border-b border-[var(--border)]">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Thermometer size={14} className="text-orange-400" />
          Temperaturlämplighet
        </h4>
        <div className="space-y-2">
          <TempRow label="Medelvinter 2025/26" value="+2.1°C över normalt" impact="Ökad övervintring" severity="high" />
          <TempRow label="Vårsvärmning" value="3 veckor tidigare" impact="Tidig svärmning april" severity="high" />
          <TempRow label="Sommarprognos" value="Torka+värme troligt" impact="Dubbelgeneration möjlig" severity="critical" />
          <TempRow label="Norrlandsrisk" value="+1.8°C trend" impact="Nya utbredningsområden" severity="medium" />
        </div>
      </div>

      {/* Action recommendations */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Shield size={14} className="text-[var(--green)]" />
          Rekommenderade åtgärder
        </h4>
        <div className="space-y-1.5">
          <ActionItem
            urgency="immediate"
            text="Inspektera alla granbestånd inom 2 veckor"
            time="Nu"
          />
          <ActionItem
            urgency="immediate"
            text="Ta bort stormskadade och torkstressade träd"
            time="Före april"
          />
          <ActionItem
            urgency="soon"
            text="Installera feromonfällor i utsatta bestånd"
            time="April 2026"
          />
          <ActionItem
            urgency="soon"
            text="Boka drönarpilot för regelbunden övervakning"
            time="Mars-sep"
          />
          <ActionItem
            urgency="plan"
            text="Plantera lövträd i granmonokulturer"
            time="Höst 2026"
          />
          <ActionItem
            urgency="plan"
            text="Granska och uppgradera skogsförsäkring"
            time="Före sommar"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function ComparisonRow({
  from,
  to,
  years,
  distance,
  status,
}: {
  from: string;
  to: string;
  years: string;
  distance: string;
  status: 'complete' | 'active' | 'imminent';
}) {
  const color =
    status === 'imminent'
      ? '#ef4444'
      : status === 'active'
        ? '#eab308'
        : 'var(--text3)';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="flex items-center gap-1 flex-1">
        <span className="text-[var(--text2)]">{from}</span>
        <ArrowDown size={10} className="text-[var(--text3)] rotate-[-90deg]" />
        <span className="text-[var(--text)]" style={{ color }}>{to}</span>
      </div>
      <span className="text-[var(--text3)] font-mono">{distance}</span>
      <span className="font-mono font-medium" style={{ color }}>
        {years}
      </span>
      {status === 'imminent' && (
        <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded-full font-semibold uppercase">
          nära
        </span>
      )}
    </div>
  );
}

function TempRow({
  label,
  value,
  impact,
  severity,
}: {
  label: string;
  value: string;
  impact: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}) {
  const color =
    severity === 'critical'
      ? '#ef4444'
      : severity === 'high'
        ? '#f97316'
        : severity === 'medium'
          ? '#eab308'
          : '#4ade80';
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[var(--text)]">{label}</div>
        <div className="text-[10px] text-[var(--text3)]">{value}</div>
      </div>
      <div className="text-[10px] font-medium text-right flex-shrink-0" style={{ color }}>
        {impact}
      </div>
    </div>
  );
}

function ActionItem({
  urgency,
  text,
  time,
}: {
  urgency: 'immediate' | 'soon' | 'plan';
  text: string;
  time: string;
}) {
  const color =
    urgency === 'immediate' ? '#ef4444' : urgency === 'soon' ? '#f97316' : '#4ade80';
  const label =
    urgency === 'immediate' ? 'AKUT' : urgency === 'soon' ? 'SNART' : 'PLANERA';
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
      <span
        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 flex-shrink-0 uppercase"
        style={{ background: `${color}20`, color }}
      >
        {label}
      </span>
      <div className="flex-1 text-[11px] text-[var(--text)]">{text}</div>
      <span className="text-[10px] text-[var(--text3)] font-mono flex-shrink-0">{time}</span>
    </div>
  );
}
