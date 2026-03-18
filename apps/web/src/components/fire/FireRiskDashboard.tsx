import React, { useState } from 'react';
import { BarChart3, Calendar, Settings2, TrendingUp, Droplets, Wind, Thermometer } from 'lucide-react';
import { useFireDetection } from '../../hooks/useFireDetection';
import FireAlertPanel from './FireAlertPanel';

function FWIGauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text3)' }}>{label}</span>
        <span style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function FireRiskDashboard() {
  const { nearbyFires, swedenFires, alerts, riskLevel, lastChecked, loading, refresh: _refresh } = useFireDetection();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // FWI components (mock)
  const fwiComponents = [
    { label: 'FFMC (Fine Fuel)', value: 78.3, max: 100, color: '#facc15' },
    { label: 'DMC (Duff Moisture)', value: 22.1, max: 150, color: '#4ade80' },
    { label: 'DC (Drought Code)', value: 145.8, max: 500, color: '#f97316' },
    { label: 'ISI (Spread Index)', value: 4.2, max: 30, color: '#4ade80' },
    { label: 'BUI (Build-up Index)', value: 31.5, max: 200, color: '#facc15' },
    { label: 'FWI (Fire Weather)', value: 8.7, max: 50, color: '#4ade80' },
  ];

  // 7-day forecast (mock)
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const riskScore = Math.round(20 + Math.sin(i * 1.3) * 15 + Math.random() * 10);
    return {
      day: d.toLocaleDateString('sv-SE', { weekday: 'short' }),
      date: d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      temp: Math.round(10 + Math.sin(i) * 5),
      humidity: Math.round(55 + Math.cos(i) * 15),
      wind: Math.round(5 + Math.sin(i * 0.7) * 4),
      rain: i === 3 || i === 5 ? Math.round(2 + Math.random() * 8) : 0,
      riskScore,
      level: riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW',
    };
  });

  const seasonFires = swedenFires.length;
  const historicalAvg = 12; // mock historical average for this week

  return (
    <div className="space-y-6">
      <FireAlertPanel alerts={alerts} riskLevel={riskLevel} nearbyFires={nearbyFires} />

      {/* FWI Components */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: '#f97316' }} />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Fire Weather Index (FWI)</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>
            Uppdaterad: {lastChecked ? new Date(lastChecked).toLocaleTimeString('sv-SE') : '—'}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fwiComponents.map(c => (
            <FWIGauge key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* 7-day fire risk forecast */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} style={{ color: '#f97316' }} />
          <span className="font-semibold" style={{ color: 'var(--text)' }}>7-dagars brandriskprognos</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {forecast.map((d, i) => {
            const colors: Record<string, string> = { HIGH: '#ef4444', MODERATE: '#facc15', LOW: '#4ade80' };
            return (
              <div key={i} className="text-center p-2 rounded-lg" style={{ background: 'rgba(4,28,8,0.5)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text2)' }}>{d.day}</div>
                <div className="text-xs mb-2" style={{ color: 'var(--text3)' }}>{d.date}</div>
                <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold" style={{
                  background: `${colors[d.level]}20`,
                  color: colors[d.level],
                  border: `1px solid ${colors[d.level]}40`,
                }}>
                  {d.riskScore}
                </div>
                <div className="space-y-0.5 text-xs" style={{ color: 'var(--text3)' }}>
                  <div className="flex items-center justify-center gap-1"><Thermometer size={8} /> {d.temp}°</div>
                  <div className="flex items-center justify-center gap-1"><Droplets size={8} /> {d.humidity}%</div>
                  <div className="flex items-center justify-center gap-1"><Wind size={8} /> {d.wind} m/s</div>
                  {d.rain > 0 && <div className="text-blue-400">{d.rain} mm</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>Bränder i Sverige (7 dagar)</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{seasonFires}</div>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: seasonFires > historicalAvg ? '#f97316' : '#4ade80' }}>
            <TrendingUp size={12} />
            {seasonFires > historicalAvg ? 'Över' : 'Under'} historiskt snitt ({historicalAvg})
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>Aktiva varningar</div>
          <div className="text-2xl font-bold mt-1" style={{ color: alerts.length > 0 ? '#f97316' : 'var(--green)' }}>{alerts.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
            {alerts.filter(a => a.severity === 'critical').length} kritiska
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>Satellitkontroll</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>VIIRS + MODIS</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
            Nästa pass: ~{new Date(Date.now() + 5400000).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Alert settings */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button onClick={() => setSettingsOpen(!settingsOpen)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Settings2 size={16} style={{ color: 'var(--text3)' }} />
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Varningsinställningar</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text3)' }}>{settingsOpen ? '▲' : '▼'}</span>
        </button>
        {settingsOpen && (
          <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Kritisk varning', desc: 'Brand inom 5 km', enabled: true },
              { label: 'Varning', desc: 'Brand inom 10 km', enabled: true },
              { label: 'Bevakning', desc: 'Brand inom 25 km', enabled: false },
              { label: 'Push-notiser', desc: 'Skicka till mobilen', enabled: true },
            ].map(setting => (
              <div key={setting.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm" style={{ color: 'var(--text2)' }}>{setting.label}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{setting.desc}</div>
                </div>
                <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${setting.enabled ? '' : 'opacity-50'}`} style={{ background: setting.enabled ? 'var(--green)' : 'var(--border)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: setting.enabled ? '22px' : '2px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
