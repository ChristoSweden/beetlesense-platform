import React from 'react';
import { Bug, AlertTriangle, Calendar, MapPin, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react';
import { useBeetleMonitoring } from '../../hooks/useBeetleMonitoring';
import { getCounties } from '../../services/skogsstyrelsenService';

const RISK_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', moderate: '#facc15', low: '#4ade80' };
const RISK_LABELS: Record<string, string> = { critical: 'Kritisk', high: 'Hög', moderate: 'Förhöjd', low: 'Låg' };

export default function BeetleTrapDashboard() {
  const { trapData, allCountyData, riskLevel, trend, swarmPrediction, nearbyOutbreaks, county, setCounty, loading } = useBeetleMonitoring();
  const counties = getCounties();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const latestCount = trapData.length > 0 ? trapData[trapData.length - 1].count : 0;
  const threshold = trapData.length > 0 ? trapData[0].threshold : 3000;
  const maxCount = Math.max(...trapData.map(t => t.count), threshold);
  const chartHeight = 120;
  const barWidth = Math.floor(200 / Math.max(trapData.length, 1));

  // County risk map data
  const countyRisks = Object.entries(allCountyData).map(([c, data]) => {
    const latest = data[data.length - 1];
    const risk = !latest ? 'low' : latest.count > latest.threshold * 1.5 ? 'critical' : latest.count > latest.threshold ? 'high' : latest.count > latest.threshold * 0.6 ? 'moderate' : 'low';
    return { county: c, count: latest?.count || 0, risk };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {/* Risk header */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug size={18} style={{ color: RISK_COLORS[riskLevel] }} />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Barkborreövervakning</span>
          </div>
          <select
            value={county}
            onChange={e => setCounty(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 border-0 outline-none"
            style={{ background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            {counties.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Risk level */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center" style={{
              background: `${RISK_COLORS[riskLevel]}20`,
              border: `2px solid ${RISK_COLORS[riskLevel]}`,
            }}>
              <Bug size={24} style={{ color: RISK_COLORS[riskLevel] }} />
            </div>
            <div className="text-sm font-bold" style={{ color: RISK_COLORS[riskLevel] }}>{RISK_LABELS[riskLevel]}</div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>Risknivå</div>
          </div>

          {/* Latest count */}
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{latestCount.toLocaleString()}</div>
            <div className="flex items-center justify-center gap-1 text-xs" style={{ color: RISK_COLORS[trend === 'increasing' ? 'high' : trend === 'decreasing' ? 'low' : 'moderate'] }}>
              {trend === 'increasing' ? <TrendingUp size={12} /> : trend === 'decreasing' ? <TrendingDown size={12} /> : <Minus size={12} />}
              {trend === 'increasing' ? 'Ökande' : trend === 'decreasing' ? 'Minskande' : 'Stabil'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>Senaste veckan</div>
          </div>

          {/* Swarming prediction */}
          {swarmPrediction && (
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{swarmPrediction.daysUntil}d</div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>Till svärmning</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>
                GDD: {swarmPrediction.gddCurrent}/{swarmPrediction.gddThreshold}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trap count chart */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Fångster per vecka — {county}</span>
        </div>
        <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${trapData.length * barWidth + 40} ${chartHeight + 30}`}>
          {/* Threshold line */}
          <line x1={30} y1={chartHeight - (threshold / maxCount) * chartHeight} x2={trapData.length * barWidth + 30} y2={chartHeight - (threshold / maxCount) * chartHeight} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
          <text x={0} y={chartHeight - (threshold / maxCount) * chartHeight + 4} fill="#ef4444" fontSize="8">{threshold}</text>
          {/* Bars */}
          {trapData.map((t, i) => {
            const h = (t.count / maxCount) * chartHeight;
            const color = t.exceedsThreshold ? '#ef4444' : t.count > threshold * 0.6 ? '#facc15' : '#4ade80';
            return (
              <g key={i}>
                <rect x={30 + i * barWidth + 2} y={chartHeight - h} width={barWidth - 4} height={h} rx={2} fill={color} opacity={0.8} />
                <text x={30 + i * barWidth + barWidth / 2} y={chartHeight + 15} fill="var(--text3)" fontSize="8" textAnchor="middle">v{t.week}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* County risk ranking */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Risknivå per län</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {countyRisks.slice(0, 8).map(cr => (
            <div key={cr.county} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(4,28,8,0.5)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[cr.risk] }} />
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{cr.county}</span>
              </div>
              <span className="text-xs font-medium" style={{ color: RISK_COLORS[cr.risk] }}>{cr.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby outbreaks */}
      {nearbyOutbreaks.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Utbrott i närheten</span>
          </div>
          <div className="space-y-2">
            {nearbyOutbreaks.map(zone => (
              <div key={zone.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'var(--surface)' }}>
                <div>
                  <span style={{ color: 'var(--text2)' }}>{zone.municipality}, {zone.county}</span>
                  <span className="ml-2" style={{ color: 'var(--text3)' }}>{zone.affectedHa} ha</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{
                  background: zone.severity === 'outbreak' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
                  color: zone.severity === 'outbreak' ? '#ef4444' : '#f97316',
                }}>
                  {zone.severity === 'outbreak' ? 'Utbrott' : zone.severity === 'elevated' ? 'Förhöjd' : 'Normal'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended actions */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Rekommenderade åtgärder</span>
        </div>
        <div className="space-y-2">
          {riskLevel === 'critical' || riskLevel === 'high' ? (
            <>
              <ActionItem text="Inspektera granar med solexponering omgående" priority="high" />
              <ActionItem text="Sätt ut fångstfällor vid angripna bestånd" priority="high" />
              <ActionItem text="Planera stormhyggesrensning inom 3 veckor" priority="medium" />
              <ActionItem text="Kontakta Skogsstyrelsen för rådgivning" priority="medium" />
            </>
          ) : riskLevel === 'moderate' ? (
            <>
              <ActionItem text="Övervaka granbestånd vid nästa skogbesök" priority="medium" />
              <ActionItem text="Kontrollera borrkamrar under bark på vindfällen" priority="medium" />
              <ActionItem text="Planera förebyggande gallring" priority="low" />
            </>
          ) : (
            <>
              <ActionItem text="Rutinkontroll vid normalt skogsbesök" priority="low" />
              <ActionItem text="Situationen stabil — fortsätt bevaka" priority="low" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionItem({ text, priority }: { text: string; priority: 'high' | 'medium' | 'low' }) {
  const colors = { high: '#ef4444', medium: '#facc15', low: '#4ade80' };
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[priority] }} />
      <span style={{ color: 'var(--text2)' }}>{text}</span>
    </div>
  );
}
