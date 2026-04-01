import React, { useMemo } from 'react';
import { AlertCircle, TrendingUp, CloudRain, Wind, Droplets } from 'lucide-react';
import type { WeatherData } from '@/services/smhiService';
import type { TrapReading } from '@/services/skogsstyrelsenService';

interface ForestHealthPredictorProps {
  weatherData: WeatherData | null;
  trapData: TrapReading[];
}

interface DayRiskForecast {
  date: string;
  dayName: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  riskScore: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  beetleCount: number;
  riskFactors: string[];
}

const ForestHealthPredictor: React.FC<ForestHealthPredictorProps> = ({ weatherData, trapData }) => {
  const forecast = useMemo<DayRiskForecast[]>(() => {
    if (!weatherData || trapData.length === 0) return [];

    const now = new Date();
    const baselineBeetleCount = Math.max(...trapData.map(t => t.count), 1000);

    return (weatherData.daily || []).slice(0, 7).map((day, index) => {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() + index);

      const temperature = (day.maxTemp + day.minTemp) / 2;
      const humidity = day.avgHumidity;
      const windSpeed = day.avgWindSpeed;

      // Beetle trend: simulate increase with warm, dry weather
      const temperatureFactor = temperature > 20 ? (temperature - 15) / 10 : 0;
      const humidityFactor = Math.max(0, (75 - humidity) / 50); // Low humidity increases risk
      const windFactor = windSpeed > 3 ? (windSpeed - 2) / 8 : 0;

      const beetleMultiplier = 1 + (temperatureFactor * 0.4 + humidityFactor * 0.3 + windFactor * 0.2);
      const projectedBeetleCount = Math.round(baselineBeetleCount * beetleMultiplier);

      // Risk calculation: combination of weather + beetles
      const tempRiskScore = temperature > 25 ? 30 : temperature > 20 ? 20 : temperature > 15 ? 10 : 0;
      const humidityRiskScore = humidity < 40 ? 30 : humidity < 60 ? 20 : 0;
      const windRiskScore = windSpeed > 5 ? 20 : windSpeed > 3 ? 10 : 0;
      const beetleRiskScore = projectedBeetleCount > baselineBeetleCount * 1.5 ? 20 : projectedBeetleCount > baselineBeetleCount ? 10 : 0;

      const totalRiskScore = tempRiskScore + humidityRiskScore + windRiskScore + beetleRiskScore;

      let riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
      if (totalRiskScore >= 70) riskLevel = 'EXTREME';
      else if (totalRiskScore >= 50) riskLevel = 'HIGH';
      else if (totalRiskScore >= 30) riskLevel = 'MODERATE';
      else riskLevel = 'LOW';

      const riskFactors: string[] = [];
      if (temperature > 25) riskFactors.push(`Högt värmestress (${temperature.toFixed(0)}°C)`);
      if (humidity < 50) riskFactors.push(`Låg luftfuktighet (${humidity.toFixed(0)}%)`);
      if (windSpeed > 4) riskFactors.push(`Höga vindar (${windSpeed.toFixed(1)} m/s)`);
      if (projectedBeetleCount > baselineBeetleCount * 1.3) riskFactors.push('Ökad barkborrsaktivitet');

      return {
        date: day.date,
        dayName: dayDate.toLocaleDateString('sv-SE', { weekday: 'short' }),
        riskLevel,
        riskScore: totalRiskScore,
        temperature,
        humidity,
        windSpeed,
        beetleCount: projectedBeetleCount,
        riskFactors: riskFactors.length > 0 ? riskFactors : ['Normala förhållanden'],
      };
    });
  }, [weatherData, trapData]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'HIGH': return 'bg-orange-500/20 border-orange-500/50 text-orange-300';
      case 'MODERATE': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      default: return 'bg-green-500/20 border-green-500/50 text-green-300';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-600 text-red-100';
      case 'HIGH': return 'bg-orange-600 text-orange-100';
      case 'MODERATE': return 'bg-yellow-600 text-yellow-100';
      default: return 'bg-green-600 text-green-100';
    }
  };

  if (!weatherData || trapData.length === 0) {
    return (
      <div className="border border-gray-800 rounded-lg p-6 bg-gray-900">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">AI Forest Health Predictor</h2>
        </div>
        <div className="animate-pulse bg-gray-800 h-40 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-lg p-6 bg-gray-900">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-semibold">AI Forest Health Predictor</h2>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        7-dagsprognos för skogshälsa baserad på väder + barkborrsdata
      </p>

      <div className="space-y-4">
        {forecast.map((day, i) => (
          <div
            key={i}
            className={`border rounded-lg p-4 transition-colors ${getRiskColor(day.riskLevel)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">
                  {day.dayName} — {new Date(day.date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                </div>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getRiskBadgeColor(day.riskLevel)}`}>
                  {day.riskLevel} RISK
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{day.riskScore}</div>
                <div className="text-xs text-gray-400">Risk Score</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-black/30 rounded p-2 text-center">
                <div className="text-xs text-gray-400 mb-1">Temp</div>
                <div className="font-semibold">{day.temperature.toFixed(0)}°C</div>
              </div>
              <div className="bg-black/30 rounded p-2 text-center flex flex-col items-center justify-center">
                <Droplets className="w-3 h-3 mb-1" />
                <div className="font-semibold text-sm">{day.humidity.toFixed(0)}%</div>
              </div>
              <div className="bg-black/30 rounded p-2 text-center flex flex-col items-center justify-center">
                <Wind className="w-3 h-3 mb-1" />
                <div className="font-semibold text-sm">{day.windSpeed.toFixed(1)}</div>
              </div>
              <div className="bg-black/30 rounded p-2 text-center">
                <div className="text-xs text-gray-400 mb-1">Borkborre</div>
                <div className="font-semibold text-sm">{(day.beetleCount / 1000).toFixed(1)}k</div>
              </div>
            </div>

            <div className="text-sm space-y-1">
              <div className="font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Riskfaktorer:
              </div>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {day.riskFactors.map((factor, fi) => (
                  <li key={fi} className="text-xs">{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-sm text-emerald-300">
        <p>Prognosen kombinerar SMHI väderdata med trappdata från Skogsstyrelsen för att identifiera högriskperioder för barkborrar och torka.</p>
      </div>
    </div>
  );
};

export default ForestHealthPredictor;
