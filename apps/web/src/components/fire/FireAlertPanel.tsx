import React from 'react';
import { Flame, AlertTriangle, Phone, MapPin, Clock, Shield, ChevronDown } from 'lucide-react';
import type { FireAlert, FireDetection, FireRisk } from '../../services/fireService';

interface Props {
  alerts: FireAlert[];
  riskLevel: FireRisk | null;
  nearbyFires: FireDetection[];
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const colors: Record<string, string> = { EXTREME: '#ef4444', HIGH: '#f97316', MODERATE: '#facc15', LOW: '#4ade80' };
  const color = colors[level] || '#4ade80';
  const angle = (score / 100) * 180 - 90;
  const rad = (angle * Math.PI) / 180;
  const r = 40;
  const cx = 50;
  const cy = 50;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={60} viewBox="0 0 100 60">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 126} 126`}
        />
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>
      <div className="text-lg font-bold" style={{ color }}>{score}</div>
      <div className="text-xs" style={{ color: 'var(--text3)' }}>{level}</div>
    </div>
  );
}

export default function FireAlertPanel({ alerts, riskLevel, nearbyFires }: Props) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-4">
      {/* Emergency banner */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-xl p-4 animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex items-center gap-3">
            <Flame size={24} className="text-red-500" />
            <div className="flex-1">
              <div className="font-bold text-red-400">BRANDVARNING — {criticalAlerts.length} aktiv(a) bränder nära</div>
              <div className="text-sm text-red-300 mt-1">{criticalAlerts[0]?.message}</div>
            </div>
            <a href="tel:112" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-all">
              <Phone size={16} /> Ring 112
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk gauge */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: 'var(--green)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Brandriskindex</span>
          </div>
          {riskLevel && <RiskGauge score={riskLevel.score} level={riskLevel.level} />}
          {riskLevel && (
            <div className="mt-3 space-y-1.5">
              {riskLevel.factors.map(f => (
                <div key={f.name} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text3)' }}>{f.name}</span>
                  <span style={{ color: 'var(--text2)' }}>{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nearby fires count */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} style={{ color: '#f97316' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Bränder i närheten</span>
          </div>
          <div className="space-y-2">
            {[5, 10, 25, 50].map(radius => {
              const count = nearbyFires.filter(f => (f.distanceKm || 999) <= radius).length;
              return (
                <div key={radius} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text3)' }}>Inom {radius} km</span>
                  <span className={`text-sm font-bold ${count > 0 ? 'text-orange-400' : ''}`} style={{ color: count > 0 ? undefined : 'var(--green)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert list */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: '#facc15' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Aktiva varningar</span>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-4">
              <Shield size={24} style={{ color: 'var(--green)' }} className="mx-auto mb-2" />
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Inga brandvarningar</div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => {
                const colors = { critical: '#ef4444', warning: '#f97316', watch: '#facc15' };
                return (
                  <div
                    key={alert.id}
                    className="p-2 rounded-lg cursor-pointer transition-all hover:opacity-80"
                    style={{ background: `${colors[alert.severity]}10`, border: `1px solid ${colors[alert.severity]}30` }}
                    onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: colors[alert.severity] }}>
                        {alert.distanceKm.toFixed(1)} km {alert.bearing}
                      </span>
                      <ChevronDown size={12} style={{ color: 'var(--text3)', transform: expanded === alert.id ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
                    </div>
                    {expanded === alert.id && (
                      <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--text3)' }}>
                        <div>{alert.message}</div>
                        <div className="flex items-center gap-1"><Clock size={10} /> {new Date(alert.timestamp).toLocaleString('sv-SE')}</div>
                        <div>Satellit: {alert.fire.satellite} | FRP: {alert.fire.frp} MW</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
