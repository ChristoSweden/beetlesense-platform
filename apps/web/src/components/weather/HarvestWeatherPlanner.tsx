import {
  Truck,
  Droplets,
  CloudRain,
  Snowflake,
  Sun,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Gauge,
  TreePine,
} from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { type DailyForecast, type HarvestWindow } from '@/services/smhiService';

interface HarvestWeatherPlannerProps {
  lat?: number;
  lon?: number;
  parcelId?: string;
}

type GroundStatus = 'dry' | 'damp' | 'wet' | 'frozen';
type WindStatus = 'safe' | 'marginal' | 'dangerous';
type PrecipStatus = 'none' | 'light' | 'heavy';
type DayVerdict = 'go' | 'caution' | 'no-go';

interface DayAssessment {
  date: string;
  dayLabel: string;
  dateLabel: string;
  ground: GroundStatus;
  wind: WindStatus;
  precip: PrecipStatus;
  precipMm: number;
  verdict: DayVerdict;
  maxTemp: number;
  minTemp: number;
  avgWind: number;
  maxGust: number;
}

function assessDay(day: DailyForecast, prevDay: DailyForecast | null): DayAssessment {
  const recentRain = prevDay ? prevDay.totalPrecipitation : 0;
  let ground: GroundStatus = 'dry';
  if (day.minTemp < -2) ground = 'frozen';
  else if (day.totalPrecipitation > 5 || recentRain > 8) ground = 'wet';
  else if (day.totalPrecipitation > 1 || recentRain > 3) ground = 'damp';

  let wind: WindStatus = 'safe';
  if (day.maxWindGust > 20 || day.avgWindSpeed > 12) wind = 'dangerous';
  else if (day.maxWindGust > 14 || day.avgWindSpeed > 8) wind = 'marginal';

  let precip: PrecipStatus = 'none';
  if (day.totalPrecipitation > 5) precip = 'heavy';
  else if (day.totalPrecipitation > 0.5) precip = 'light';

  let verdict: DayVerdict = 'go';
  if (wind === 'dangerous' || precip === 'heavy' || ground === 'wet') {
    verdict = 'no-go';
  } else if (wind === 'marginal' || precip === 'light' || ground === 'damp') {
    verdict = 'caution';
  }

  const date = new Date(day.date + 'T12:00:00');
  const days = ['S\u00f6n', 'M\u00e5n', 'Tis', 'Ons', 'Tor', 'Fre', 'L\u00f6r'];

  return {
    date: day.date,
    dayLabel: days[date.getDay()],
    dateLabel: `${date.getDate()}/${date.getMonth() + 1}`,
    ground,
    wind,
    precip,
    precipMm: day.totalPrecipitation,
    verdict,
    maxTemp: day.maxTemp,
    minTemp: day.minTemp,
    avgWind: day.avgWindSpeed,
    maxGust: day.maxWindGust,
  };
}

function verdictColor(v: DayVerdict): string {
  if (v === 'go') return '#4ade80';
  if (v === 'caution') return '#fbbf24';
  return '#ef4444';
}

function verdictBg(v: DayVerdict): string {
  if (v === 'go') return 'rgba(74,222,128,0.1)';
  if (v === 'caution') return 'rgba(251,191,36,0.1)';
  return 'rgba(239,68,68,0.1)';
}

function groundIcon(status: GroundStatus) {
  switch (status) {
    case 'frozen': return <Snowflake size={12} className="text-cyan-400" />;
    case 'wet': return <Droplets size={12} className="text-blue-500" />;
    case 'damp': return <Droplets size={12} className="text-blue-300" />;
    default: return <Sun size={12} className="text-yellow-400" />;
  }
}

function groundLabel(status: GroundStatus): string {
  switch (status) {
    case 'frozen': return 'Frusen';
    case 'wet': return 'Bl\u00f6t';
    case 'damp': return 'Fuktig';
    default: return 'Torr';
  }
}

function windColor(status: WindStatus): string {
  if (status === 'safe') return '#4ade80';
  if (status === 'marginal') return '#fbbf24';
  return '#ef4444';
}

function precipColor(status: PrecipStatus): string {
  if (status === 'none') return '#4ade80';
  if (status === 'light') return '#fbbf24';
  return '#ef4444';
}

function qualityBadge(quality: HarvestWindow['quality']) {
  const color = quality === 'excellent' ? '#4ade80' : quality === 'good' ? '#86efac' : '#fbbf24';
  const label = quality === 'excellent' ? 'Utm\u00e4rkt' : quality === 'good' ? 'Bra' : 'Marginellt';

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
    >
      {quality === 'excellent' ? <CheckCircle size={10} /> : quality === 'good' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
      {label}
    </span>
  );
}

function MoistureGauge({ value }: { value: number }) {
  const color = value > 70 ? '#3b82f6' : value > 40 ? '#4ade80' : '#fbbf24';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[rgba(4,28,8,0.6)] border border-[rgba(74,222,128,0.1)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}

function AccessibilityScore({ score }: { score: number }) {
  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#ef4444';
  const label = score >= 70 ? 'Bra framkomlighet' : score >= 40 ? 'M\u00e5ttlig framkomlighet' : 'D\u00e5lig framkomlighet';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#94a3b8]">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[rgba(4,28,8,0.6)] border border-[rgba(74,222,128,0.1)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function HarvestWeatherPlanner({ lat, lon, parcelId }: HarvestWeatherPlannerProps) {
  const {
    daily,
    harvestWindows,
    soilMoisture,
    machineAccessibility,
    isLoading,
  } = useWeather({ lat, lon, parcelId });

  const assessments: DayAssessment[] = daily.map((day, i) =>
    assessDay(day, i > 0 ? daily[i - 1] : null)
  );

  const bestWindow = harvestWindows.length > 0
    ? harvestWindows.reduce((best, w) =>
        w.quality === 'excellent' || (w.quality === 'good' && best.quality === 'marginal') ? w : best
      )
    : null;

  if (isLoading && assessments.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-6">
        <div className="flex items-center gap-3">
          <TreePine size={16} className="text-[#4ade80] animate-pulse" />
          <span className="text-sm text-[#94a3b8]">Analyserar sk\u00f6rdef\u00f6rh\u00e5llanden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Best Harvest Window Recommendation */}
      {bestWindow && (
        <div className="rounded-xl border border-[rgba(74,222,128,0.25)] bg-[rgba(4,28,8,0.8)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TreePine size={16} className="text-[#4ade80]" />
              <h3 className="text-sm font-semibold text-[#e2e8f0]">B\u00e4sta sk\u00f6rdef\u00f6nster</h3>
            </div>
            {qualityBadge(bestWindow.quality)}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <p className="text-[10px] text-[#64748b]">Period</p>
              <p className="text-xs text-[#e2e8f0]">
                {new Date(bestWindow.startDate + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                {' \u2013 '}
                {new Date(bestWindow.endDate + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <p className="text-[10px] text-[#64748b]">Dagar</p>
              <p className="text-xs text-[#e2e8f0]">{bestWindow.days} dagar</p>
            </div>
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <p className="text-[10px] text-[#64748b]">Sn. vind</p>
              <p className="text-xs text-[#e2e8f0]">{bestWindow.avgWindSpeed} m/s</p>
            </div>
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <p className="text-[10px] text-[#64748b]">Markf\u00f6rh.</p>
              <p className="text-xs text-[#e2e8f0]">{groundLabel(bestWindow.groundCondition)}</p>
            </div>
          </div>

          <p className="text-xs text-[#94a3b8] italic">{bestWindow.recommendationSv}</p>
        </div>
      )}

      {/* Gantt-Style Day Assessment Chart */}
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Daglig bed\u00f6mning / 10 dagar</h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-[10px] text-[#64748b]">
                <th className="text-left pb-2 pr-2 w-16">Dag</th>
                <th className="text-center pb-2 w-20">Bed\u00f6mning</th>
                <th className="text-center pb-2 w-16">Mark</th>
                <th className="text-center pb-2 w-16">Vind</th>
                <th className="text-center pb-2 w-16">Nederb.</th>
                <th className="text-center pb-2 w-16">Temp</th>
                <th className="text-center pb-2 w-20">Byar</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr
                  key={a.date}
                  className="border-t border-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.03)] transition-colors"
                >
                  <td className="py-2 pr-2">
                    <div className="text-xs font-medium text-[#e2e8f0]">{a.dayLabel}</div>
                    <div className="text-[10px] text-[#64748b]">{a.dateLabel}</div>
                  </td>

                  <td className="py-2 text-center">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
                      style={{ color: verdictColor(a.verdict), background: verdictBg(a.verdict) }}
                    >
                      {a.verdict === 'go' && <CheckCircle size={10} />}
                      {a.verdict === 'caution' && <AlertTriangle size={10} />}
                      {a.verdict === 'no-go' && <XCircle size={10} />}
                      {a.verdict === 'go' ? 'K\u00d6R' : a.verdict === 'caution' ? 'VARNING' : 'STOPP'}
                    </div>
                  </td>

                  <td className="py-2 text-center">
                    <div className="inline-flex items-center gap-1">
                      {groundIcon(a.ground)}
                      <span className="text-[10px] text-[#94a3b8]">{groundLabel(a.ground)}</span>
                    </div>
                  </td>

                  <td className="py-2 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-[40px] h-1.5 rounded-full bg-[rgba(4,28,8,0.6)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((a.avgWind / 15) * 100, 100)}%`,
                            background: windColor(a.wind),
                          }}
                        />
                      </div>
                      <span className="text-[10px] mt-0.5" style={{ color: windColor(a.wind) }}>
                        {a.avgWind.toFixed(0)} m/s
                      </span>
                    </div>
                  </td>

                  <td className="py-2 text-center">
                    <div className="flex flex-col items-center">
                      {a.precip === 'heavy' ? (
                        <CloudRain size={12} className="text-red-400" />
                      ) : a.precip === 'light' ? (
                        <CloudRain size={12} className="text-yellow-400" />
                      ) : (
                        <Sun size={12} className="text-green-400" />
                      )}
                      <span className="text-[10px] mt-0.5" style={{ color: precipColor(a.precip) }}>
                        {a.precipMm > 0.1 ? `${a.precipMm.toFixed(1)} mm` : '-'}
                      </span>
                    </div>
                  </td>

                  <td className="py-2 text-center">
                    <span className="text-[10px] text-[#e2e8f0]">
                      {Math.round(a.maxTemp)}\u00b0/{Math.round(a.minTemp)}\u00b0
                    </span>
                  </td>

                  <td className="py-2 text-center">
                    <span className="text-[10px]" style={{ color: windColor(a.wind) }}>
                      {a.maxGust.toFixed(0)} m/s
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
            <span className="text-[#64748b]">K\u00f6r / Go</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span className="text-[#64748b]">Varning / Caution</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="text-[#64748b]">Stopp / No-go</span>
          </div>
        </div>
      </div>

      {/* Ground Conditions Panel */}
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={16} className="text-[#4ade80]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Markf\u00f6rh\u00e5llanden</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={14} className="text-blue-400" />
              <span className="text-xs text-[#94a3b8]">Markfukt (uppskattad)</span>
            </div>
            <MoistureGauge value={soilMoisture} />
            <p className="text-[10px] text-[#64748b] mt-1">
              {soilMoisture > 70
                ? 'H\u00f6g markfukt. Risk f\u00f6r markskador vid k\u00f6rning med tunga maskiner.'
                : soilMoisture > 40
                  ? 'Normal markfukt. Goda f\u00f6rh\u00e5llanden f\u00f6r de flesta operationer.'
                  : 'L\u00e5g markfukt. Utm\u00e4rkta f\u00f6rh\u00e5llanden f\u00f6r sk\u00f6rd.'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={14} className="text-[#4ade80]" />
              <span className="text-xs text-[#94a3b8]">Maskinframkomlighet</span>
            </div>
            <AccessibilityScore score={machineAccessibility} />
            <p className="text-[10px] text-[#64748b] mt-1">
              {machineAccessibility >= 70
                ? 'Tunga maskiner (sk\u00f6rdare, skotare) kan operera normalt.'
                : machineAccessibility >= 40
                  ? 'Anv\u00e4nd bredare d\u00e4ck eller bandutrustning. Undvik br\u00e4nna mark.'
                  : 'Avr\u00e5der fr\u00e5n tunga maskiner. Risk f\u00f6r allvarliga markskador.'}
            </p>
          </div>
        </div>
      </div>

      {/* All Harvest Windows */}
      {harvestWindows.length > 1 && (
        <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Alla sk\u00f6rdef\u00f6nster</h3>
          <div className="space-y-2">
            {harvestWindows.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg border border-[rgba(74,222,128,0.08)] bg-[rgba(4,28,8,0.4)]"
              >
                <div className="flex items-center gap-3">
                  {qualityBadge(w.quality)}
                  <div>
                    <p className="text-xs text-[#e2e8f0]">
                      {new Date(w.startDate + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                      {' \u2013 '}
                      {new Date(w.endDate + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-[#64748b]">{w.days} dagar, {w.avgWindSpeed} m/s sn.vind</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#64748b]">{groundLabel(w.groundCondition)}</p>
                  <p className="text-[10px] text-[#64748b]">{w.totalPrecipitation} mm</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
