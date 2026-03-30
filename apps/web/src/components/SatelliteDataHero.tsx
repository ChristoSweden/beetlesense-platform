import React, { useState, useEffect, useCallback } from 'react';

// TypeScript Interfaces
interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
  };
}

interface EONETEvent {
  id: string;
  title: string;
  category: string;
  geometry: Array<{
    type: string;
    coordinates: [number, number];
  }>;
  sources: Array<{
    id: string;
    url: string;
  }>;
}

interface EONETResponse {
  events: EONETEvent[];
}

interface DashboardData {
  weather: WeatherData | null;
  wildfires: EONETEvent[];
  lastUpdate: Date;
  loading: boolean;
  error: string | null;
}

// Bark beetle risk calculation based on temperature and humidity
const calculateBarkBeetleRisk = (
  temperature: number,
  humidity: number
): { level: 'low' | 'medium' | 'high'; percentage: number } => {
  // Bark beetles thrive in warm, dry conditions
  // Risk increases with higher temperature and lower humidity
  const tempFactor = Math.max(0, Math.min(1, (temperature - 10) / 20)); // 10-30Â°C range
  const humidityFactor = Math.max(0, 1 - humidity / 100); // Lower humidity = higher risk

  const riskPercentage = Math.round((tempFactor * 0.6 + humidityFactor * 0.4) * 100);

  let level: 'low' | 'medium' | 'high' = 'low';
  if (riskPercentage > 65) level = 'high';
  else if (riskPercentage > 35) level = 'medium';

  return { level, percentage: riskPercentage };
};

// Risk color mapping
const getRiskColor = (
  level: 'low' | 'medium' | 'high'
): { bg: string; text: string; badge: string } => {
  switch (level) {
    case 'high':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        badge: 'bg-red-600',
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        badge: 'bg-amber-600',
      };
    case 'low':
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        badge: 'bg-green-600',
      };
  }
};

// Loading Skeleton Component
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="h-32 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-lg animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-24 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-lg animate-pulse"
        />
      ))}
    </div>
  </div>
);

// Main Component
export const SatelliteDataHero: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData>({
    weather: null,
    wildfires: [],
    lastUpdate: new Date(),
    loading: true,
    error: null,
  });

  // Fetch weather data from Open-Meteo
  const fetchWeatherData = useCallback(async (): Promise<WeatherData | null> => {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=57.0&longitude=14.8&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=Europe/Stockholm'
      );
      if (!response.ok) throw new Error('Weather API failed');
      return await response.json();
    } catch (err) {
      console.error('Error fetching weather:', err);
      return null;
    }
  }, []);

  // Fetch wildfire data from NASA EONET
  const fetchWildfireData = useCallback(async (): Promise<EONETEvent[]> => {
    try {
      const response = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&limit=5&status=open'
      );
      if (!response.ok) throw new Error('Wildfire API failed');
      const data: EONETResponse = await response.json();
      return data.events || [];
    } catch (err) {
      console.error('Error fetching wildfire data:', err);
      return [];
    }
  }, []);

  // Main data fetch function
  const fetchAllData = useCallback(async () => {
    setDashboard((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [weatherData, wildfireData] = await Promise.all([
        fetchWeatherData(),
        fetchWildfireData(),
      ]);

      setDashboard({
        weather: weatherData,
        wildfires: wildfireData,
        lastUpdate: new Date(),
        loading: false,
        error: null,
      });
    } catch {
      setDashboard((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch live data',
      }));
    }
  }, [fetchWeatherData, fetchWildfireData]);

  // Initial fetch and polling
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Format last update time
  const formatLastUpdate = (date: Date): string => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (dashboard.loading && !dashboard.weather) {
    return <LoadingSkeleton />;
  }

  const weather = dashboard.weather?.current;
  const barkBeetleRisk = weather
    ? calculateBarkBeetleRisk(weather.temperature_2m, weather.relative_humidity_2m)
    : { level: 'low' as const, percentage: 0 };
  const riskColors = getRiskColor(barkBeetleRisk.level);

  return (
    <div className="w-full">
      {/* LIVE Badge and Status */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-600/40">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-semibold text-red-400 tracking-widest uppercase">
            Live Data
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Last updated: {formatLastUpdate(dashboard.lastUpdate)}
        </span>
      </div>

      {/* Error Message */}
      {dashboard.error && (
        <div className="mb-6 p-4 bg-red-600/20 border border-red-600/40 rounded-lg">
          <p className="text-sm text-red-300">{dashboard.error}</p>
        </div>
      )}

      {/* Main Data Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Temperature Card */}
        {weather && (
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
            <div className="relative px-6 py-6 bg-slate-900/80 backdrop-blur rounded-xl border border-green-600/30 hover:border-green-600/60 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Temperature
                  </p>
                  <p className="text-4xl font-bold text-white">
                    {Math.round(weather.temperature_2m)}Â°C
                  </p>
                </div>
                <span className="text-2xl">ð¡ï¸</span>
              </div>
              <p className="text-xs text-slate-500 mt-3">Småland, Sweden</p>
            </div>
          </div>
        )}

        {/* Humidity Card */}
        {weather && (
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
            <div className="relative px-6 py-6 bg-slate-900/80 backdrop-blur rounded-xl border border-blue-600/30 hover:border-blue-600/60 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Humidity
                  </p>
                  <p className="text-4xl font-bold text-white">
                    {weather.relative_humidity_2m}%
                  </p>
                </div>
                <span className="text-2xl">ð§</span>
              </div>
              <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${weather.relative_humidity_2m}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Wind Speed Card */}
        {weather && (
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-zinc-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
            <div className="relative px-6 py-6 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-600/30 hover:border-slate-600/60 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Wind Speed
                  </p>
                  <p className="text-4xl font-bold text-white">
                    {Math.round(weather.wind_speed_10m)}
                    <span className="text-lg ml-1">km/h</span>
                  </p>
                </div>
                <span className="text-2xl">ð¨</span>
              </div>
              <p className="text-xs text-slate-500 mt-3">10m altitude</p>
            </div>
          </div>
        )}

        {/* Bark Beetle Risk Card */}
        <div className="group relative">
          <div
            className={`absolute inset-0 ${riskColors.bg.replace('/20', '/30')} rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000`}
          />
          <div
            className={`relative px-6 py-6 bg-slate-900/80 backdrop-blur rounded-xl border transition ${
              barkBeetleRisk.level === 'high'
                ? 'border-red-600/30 hover:border-red-600/60'
                : barkBeetleRisk.level === 'medium'
                  ? 'border-amber-600/30 hover:border-amber-600/60'
                  : 'border-green-600/30 hover:border-green-600/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Beetle Risk
                </p>
                <p className={`text-4xl font-bold ${riskColors.text}`}>
                  {barkBeetleRisk.percentage}%
                </p>
              </div>
              <span className="text-2xl">ðª²</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span
                className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${riskColors.badge} text-white`}
              >
                {barkBeetleRisk.level === 'high'
                  ? 'High Risk'
                  : barkBeetleRisk.level === 'medium'
                    ? 'Medium Risk'
                    : 'Low Risk'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Wildfires Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-xl blur opacity-50" />
        <div className="relative px-6 py-6 bg-slate-900/60 backdrop-blur rounded-xl border border-amber-600/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">ð¥</span>
              <div>
                <h3 className="text-sm font-semibold text-white">Global Active Wildfires</h3>
                <p className="text-xs text-slate-400">
                  Monitored by NASA EONET
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">
                {dashboard.wildfires.length}
              </p>
              <p className="text-xs text-slate-500">active events</p>
            </div>
          </div>

          {dashboard.wildfires.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/50">
              {dashboard.wildfires.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="text-amber-500 font-bold mt-0.5">â¢</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate text-xs">
                      {event.title}
                    </p>
                  </div>
                </div>
              ))}
              {dashboard.wildfires.length > 3 && (
                <p className="text-xs text-slate-500 pt-2">
                  +{dashboard.wildfires.length - 3} more events
                </p>
              )}
            </div>
          )}

          {dashboard.wildfires.length === 0 && (
            <p className="text-xs text-slate-400 mt-4">
              No major active wildfire events detected globally
            </p>
          )}
        </div>
      </div>

      {/* Data Sources Footer */}
      <div className="mt-8 pt-6 border-t border-slate-700/50">
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            Weather: Open-Meteo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Wildfires: NASA EONET
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Analysis: BeetleSense AI
          </span>
        </div>
      </div>

      {/* Animated Satellite Orbit SVG */}
      <div className="mt-12 flex justify-center">
        <svg
          viewBox="0 0 200 200"
          className="w-32 h-32 opacity-60 hover:opacity-100 transition-opacity"
        >
          {/* Central point */}
          <circle cx="100" cy="100" r="4" fill="#10b981" />

          {/* Orbit paths */}
          <circle cx="100" cy="100" r="40" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.3" />

          {/* Animated satellites */}
          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="20s"
              repeatCount="indefinite"
            />
            <circle cx="140" cy="100" r="3" fill="#10b981" opacity="0.8" />
          </g>

          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="25s"
              repeatCount="indefinite"
              direction="reverse"
            />
            <circle cx="100" cy="160" r="2.5" fill="#3b82f6" opacity="0.8" />
          </g>

          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="30s"
              repeatCount="indefinite"
            />
            <circle cx="60" cy="100" r="2" fill="#f59e0b" opacity="0.8" />
          </g>

          {/* Text label */}
          <text x="100" y="190" textAnchor="middle" className="text-xs fill-slate-500" fontSize="8">
            Data Sources
          </text>
        </svg>
      </div>
    </div>
  );
};

export default SatelliteDataHero;
