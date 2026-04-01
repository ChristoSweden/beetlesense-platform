import { useState } from 'react';

interface DayForecast { day: string; date: string; maxTemp: number; minTemp: number; ddAccum: number; ddTotal: number; swarmProb: number; precipitation: number; windSpeed: number; recommendation: string; }
interface GridPrediction { gridId: string; region: string; ddTotal: number; daysToThreshold: number; swarmWindow: string; riskLevel: 'critical' | 'high' | 'moderate' | 'low'; }

const THRESHOLD_DD = 140; // Degree-days above 8.3C from April 1 for spring swarming (Fritscher 2022)
const BASE_TEMP = 8.3;

const FORECAST: DayForecast[] = [
  { day: 'Today', date: 'Apr 1', maxTemp: 14.2, minTemp: 5.8, ddAccum: 5.9, ddTotal: 98.4, swarmProb: 0.12, precipitation: 0, windSpeed: 3.2, recommendation: 'Accumulating. No swarming conditions yet.' },
  { day: 'Wed', date: 'Apr 2', maxTemp: 16.5, minTemp: 7.1, ddAccum: 8.2, ddTotal: 106.6, swarmProb: 0.18, precipitation: 0, windSpeed: 2.8, recommendation: 'Temp rising. Monitor degree-day accumulation.' },
  { day: 'Thu', date: 'Apr 3', maxTemp: 18.1, minTemp: 8.4, ddAccum: 9.8, ddTotal: 116.4, swarmProb: 0.28, precipitation: 2, windSpeed: 4.1, recommendation: 'Light rain may delay swarming. DD accumulating rapidly.' },
  { day: 'Fri', date: 'Apr 4', maxTemp: 19.7, minTemp: 9.2, ddAccum: 11.4, ddTotal: 127.8, swarmProb: 0.42, precipitation: 0, windSpeed: 2.1, recommendation: 'ALERT: Approaching 140 dd threshold. Pre-position drone teams.' },
  { day: 'Sat', date: 'Apr 5', maxTemp: 21.3, minTemp: 10.5, ddAccum: 13.0, ddTotal: 140.8, swarmProb: 0.78, precipitation: 0, windSpeed: 1.5, recommendation: 'THRESHOLD CROSSED. Peak swarming conditions. Deploy all monitoring assets.' },
  { day: 'Sun', date: 'Apr 6', maxTemp: 22.1, minTemp: 11.8, ddAccum: 13.8, ddTotal: 154.6, swarmProb: 0.91, precipitation: 0, windSpeed: 1.2, recommendation: 'PEAK SWARMING. Calm + warm = maximum flight activity. Emergency surveillance.' },
  { day: 'Mon', date: 'Apr 7', maxTemp: 17.4, minTemp: 8.9, ddAccum: 9.1, ddTotal: 163.7, swarmProb: 0.45, precipitation: 8, windSpeed: 6.3, recommendation: 'Rain + wind reducing flight activity. Good window for ground inspection.' },
];

const GRID_PREDICTIONS: GridPrediction[] = [
  { gridId: 'BLE-01', region: 'Blekinge', ddTotal: 142.3, daysToThreshold: 0, swarmWindow: 'Apr 1-3', riskLevel: 'critical' },
  { gridId: 'VMA-04', region: 'V\u00E4stmanland', ddTotal: 131.7, daysToThreshold: 2, swarmWindow: 'Apr 3-5', riskLevel: 'high' },
  { gridId: 'JKP-02', region: 'J\u00F6nk\u00F6ping', ddTotal: 118.9, daysToThreshold: 4, swarmWindow: 'Apr 5-7', riskLevel: 'moderate' },
  { gridId: 'VGO-06', region: 'V\u00E4stra G\u00F6taland', ddTotal: 105.2, daysToThreshold: 6, swarmWindow: 'Apr 7-10', riskLevel: 'moderate' },
  { gridId: 'GVB-03', region: 'G\u00E4vleborg', ddTotal: 72.1, daysToThreshold: 12, swarmWindow: 'Apr 13-16', riskLevel: 'low' },
];

const RISK_COLORS = { critical: '#EF4444', high: '#F59E0B', moderate: '#3B82F6', low: '#10B981' };

export default function PhenologyForecastPage() {
  const [selectedDay, setSelectedDay] = useState<DayForecast>(FORECAST[0]);
  const thresholdDay = FORECAST.find(d => d.ddTotal >= THRESHOLD_DD);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">\uD83C\uDF21\uFE0F</span>
            <h1 className="text-3xl font-bold">7-Day Phenology Forecast</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">PREDICTIVE</span>
          </div>
          <p className="text-[var(--text3)] max-w-3xl">Predict bark beetle swarming 7+ days before visible attack. Based on PHENIPS-TDEF degree-day model (Fritscher 2022): 140 dd above 8.3\u00B0C from April 1 triggers spring swarming. SMHI weather data + neural network combining heat accumulation, moisture index, and day length.</p>
        </div>

        {/* Threshold Banner */}
        {thresholdDay && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
            <span className="text-2xl">\u26A0\uFE0F</span>
            <div><span className="font-bold text-red-400">Swarming threshold (140 dd) predicted: {thresholdDay.date}</span><p className="text-sm text-[var(--text3)]">Deploy monitoring assets before {thresholdDay.day}. {thresholdDay.recommendation}</p></div>
          </div>
        )}

        {/* 7-Day Forecast Strip */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {FORECAST.map(day => {
            const isThreshold = day.ddTotal >= THRESHOLD_DD;
            const isPeak = day.swarmProb >= 0.7;
            return (
              <button key={day.date} onClick={() => setSelectedDay(day)} className={`p-3 rounded-xl border text-center transition-all ${selectedDay.date === day.date ? 'ring-2 ring-amber-500' : ''} ${isPeak ? 'bg-red-500/10 border-red-500/40' : isThreshold ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[var(--bg2)] border-[var(--border)]'}`}>
                <div className="text-xs text-[var(--text3)]">{day.day}</div>
                <div className="text-sm font-bold">{day.date}</div>
                <div className="text-lg font-bold mt-1" style={{ color: day.maxTemp >= 20 ? '#EF4444' : day.maxTemp >= 16.5 ? '#F59E0B' : '#3B82F6' }}>{day.maxTemp}\u00B0</div>
                <div className="text-xs text-[var(--text3)]">{day.minTemp}\u00B0</div>
                <div className="mt-2 h-1 rounded-full bg-[var(--bg3)]">
                  <div className="h-full rounded-full" style={{ width: `${(day.ddTotal / 180) * 100}%`, backgroundColor: day.ddTotal >= THRESHOLD_DD ? '#EF4444' : '#F59E0B' }} />
                </div>
                <div className="text-[10px] text-[var(--text3)] mt-1">{day.ddTotal.toFixed(0)} dd</div>
                {day.swarmProb >= 0.5 && <div className="text-[10px] font-bold text-red-400 mt-1">\uD83D\uDC1B {(day.swarmProb * 100).toFixed(0)}%</div>}
              </button>
            );
          })}
        </div>

        {/* Selected Day Detail */}
        <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)] mb-6">
          <h3 className="font-semibold mb-3">{selectedDay.day} {selectedDay.date} \u2014 Detail</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><div className="text-sm text-[var(--text3)]">Max / Min</div><div className="text-xl font-bold">{selectedDay.maxTemp}\u00B0 / {selectedDay.minTemp}\u00B0</div></div>
            <div><div className="text-sm text-[var(--text3)]">Day-degrees added</div><div className="text-xl font-bold text-amber-400">+{selectedDay.ddAccum.toFixed(1)} dd</div></div>
            <div><div className="text-sm text-[var(--text3)]">Cumulative DD</div><div className="text-xl font-bold" style={{ color: selectedDay.ddTotal >= THRESHOLD_DD ? '#EF4444' : '#F59E0B' }}>{selectedDay.ddTotal.toFixed(1)} / {THRESHOLD_DD}</div></div>
            <div><div className="text-sm text-[var(--text3)]">Swarm Probability</div><div className="text-xl font-bold" style={{ color: selectedDay.swarmProb >= 0.7 ? '#EF4444' : selectedDay.swarmProb >= 0.4 ? '#F59E0B' : '#10B981' }}>{(selectedDay.swarmProb * 100).toFixed(0)}%</div></div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text3)] mb-3">
            <span>\uD83C\uDF27\uFE0F {selectedDay.precipitation}mm</span><span>\uD83D\uDCA8 {selectedDay.windSpeed} m/s</span>
          </div>
          <div className="bg-[var(--bg3)] rounded-lg p-3 text-sm"><span className="font-medium">AI Recommendation:</span> {selectedDay.recommendation}</div>
        </div>

        {/* Regional Grid Predictions */}
        <h2 className="text-lg font-semibold mb-4">\uD83D\uDDFA\uFE0F Regional Swarming Predictions</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {GRID_PREDICTIONS.map(gp => (
            <div key={gp.gridId} className="bg-[var(--bg2)] rounded-xl p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS[gp.riskLevel] }}>
              <div className="font-mono text-xs text-[var(--text3)]">{gp.gridId}</div>
              <div className="font-medium">{gp.region}</div>
              <div className="text-sm mt-2"><span className="text-[var(--text3)]">DD:</span> <span className="font-bold">{gp.ddTotal.toFixed(0)}</span></div>
              <div className="text-sm"><span className="text-[var(--text3)]">Swarm:</span> <span className="font-bold">{gp.swarmWindow}</span></div>
              <div className="text-xs mt-2 px-2 py-1 rounded-full text-center font-semibold" style={{ backgroundColor: RISK_COLORS[gp.riskLevel] + '20', color: RISK_COLORS[gp.riskLevel] }}>{gp.daysToThreshold === 0 ? 'NOW' : gp.daysToThreshold + 'd'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}