import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle, Flame } from 'lucide-react';

interface WeatherData {
  date: string;
  dayName: string;
  temp: number;
  humidity: number;
  wind: number;
  precipitation: number;
  weatherIcon: string;
  description: string;
}

interface RiskData {
  date: string;
  barkBeetleRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  fireRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
}

interface TimelineDay {
  weather: WeatherData;
  risk: RiskData;
}

// Mock data for 7-day timeline
const generateMockTimeline = (): TimelineDay[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weatherIcons = ['sun', 'cloud', 'rain', 'cloud', 'sun', 'rain', 'cloud'];
  const descriptions = ['Clear skies', 'Partly cloudy', 'Rainy', 'Overcast', 'Sunny', 'Showers', 'Cloudy'];

  const now = new Date();
  const timeline: TimelineDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate realistic weather data
    const temp = Math.floor(Math.random() * 15) + 8; // 8-23°C
    const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
    const wind = parseFloat((Math.random() * 8 + 2).toFixed(1)); // 2-10 m/s
    const precipitation = Math.random() > 0.6 ? Math.floor(Math.random() * 20) + 5 : 0; // 0 or 5-25mm

    // Determine beetle and fire risk based on weather
    let barkBeetleRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    let fireRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    let riskScore = 20;

    // Warm, dry weather increases bark beetle risk
    if (temp > 20 && humidity < 50) {
      barkBeetleRisk = 'Critical';
      riskScore = 95;
      fireRisk = 'High';
    } else if (temp > 18 && humidity < 60) {
      barkBeetleRisk = 'High';
      riskScore = 75;
      fireRisk = 'Medium';
    } else if (temp > 15 && humidity < 70) {
      barkBeetleRisk = 'Medium';
      riskScore = 50;
      fireRisk = 'Low';
    }

    // High precipitation reduces risks
    if (precipitation > 10) {
      barkBeetleRisk = 'Low';
      fireRisk = 'Low';
      riskScore = 15;
    }

    timeline.push({
      weather: {
        date: dateStr,
        dayName: days[i],
        temp,
        humidity,
        wind,
        precipitation,
        weatherIcon: weatherIcons[i],
        description: descriptions[i],
      },
      risk: {
        date: dateStr,
        barkBeetleRisk,
        fireRisk,
        riskScore,
      },
    });
  }

  return timeline;
};

interface SelectedDay {
  weather: WeatherData;
  risk: RiskData;
}

const WeatherTimeline: React.FC = () => {
  const timeline = useMemo(() => generateMockTimeline(), []);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'Critical':
        return 'from-red-600 to-red-800';
      case 'High':
        return 'from-orange-600 to-orange-800';
      case 'Medium':
        return 'from-yellow-600 to-yellow-800';
      default:
        return 'from-green-600 to-green-800';
    }
  };

  const getRiskBadgeColor = (risk: string): string => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-600/90 text-red-100';
      case 'High':
        return 'bg-orange-600/90 text-orange-100';
      case 'Medium':
        return 'bg-yellow-600/90 text-yellow-100';
      default:
        return 'bg-green-600/90 text-green-100';
    }
  };

  const getWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className="w-5 h-5" />;
      case 'cloud':
        return <Cloud className="w-5 h-5" />;
      case 'rain':
        return <CloudRain className="w-5 h-5" />;
      default:
        return <Cloud className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Weather & Risk Timeline</h2>
        <p className="text-gray-400 text-sm sm:text-base">
          7-day forecast with bark beetle and fire risk indicators. Tap any day for detailed insights.
        </p>
      </div>

      {/* Timeline Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 mb-8">
        <AnimatePresence>
          {timeline.map((day, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedDay(day)}
              className={`relative overflow-hidden rounded-lg p-3 sm:p-4 transition-all duration-200 ${
                selectedDay?.weather.date === day.weather.date
                  ? 'ring-2 ring-blue-400 scale-105'
                  : 'hover:scale-105'
              }`}
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${getRiskColor(
                  day.risk.barkBeetleRisk
                )} opacity-20`}
              />

              {/* Dark Background */}
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Day Name & Date */}
                <div className="mb-2 sm:mb-3">
                  <h3 className="font-semibold text-white text-sm sm:text-base">{day.weather.dayName}</h3>
                  <p className="text-xs text-gray-300">
                    {new Date(day.weather.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* Weather Icon */}
                <div className="mb-2 text-blue-300">
                  {getWeatherIcon(day.weather.weatherIcon)}
                </div>

                {/* Temperature */}
                <div className="mb-2">
                  <p className="text-lg sm:text-xl font-bold text-white">{day.weather.temp}°C</p>
                  <p className="text-xs text-gray-300">{day.weather.description}</p>
                </div>

                {/* Risk Badges */}
                <div className="flex flex-col gap-1 mt-auto">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getRiskBadgeColor(day.risk.barkBeetleRisk)}`}>
                    <AlertCircle className="w-3 h-3" />
                    <span>Beetle</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getRiskBadgeColor(day.risk.fireRisk)}`}>
                    <Flame className="w-3 h-3" />
                    <span>Fire</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Detailed View */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-lg border border-gray-700 overflow-hidden bg-gradient-to-br ${getRiskColor(
              selectedDay.risk.barkBeetleRisk
            )} bg-opacity-10 mb-8`}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {selectedDay.weather.dayName},{' '}
                  {new Date(selectedDay.weather.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <p className="text-gray-400 text-sm">{selectedDay.weather.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Weather Details */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    Weather Details
                  </h4>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Temperature
                      </span>
                      <span className="font-bold text-lg text-white">{selectedDay.weather.temp}°C</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-1.5">
                      <div
                        className="bg-red-400 h-1.5 rounded"
                        style={{ width: `${Math.min(100, (selectedDay.weather.temp / 30) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        Humidity
                      </span>
                      <span className="font-bold text-lg text-white">{selectedDay.weather.humidity}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-1.5">
                      <div
                        className="bg-blue-400 h-1.5 rounded"
                        style={{ width: `${selectedDay.weather.humidity}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        Wind Speed
                      </span>
                      <span className="font-bold text-lg text-white">{selectedDay.weather.wind.toFixed(1)} m/s</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-1.5">
                      <div
                        className="bg-teal-400 h-1.5 rounded"
                        style={{ width: `${Math.min(100, (selectedDay.weather.wind / 15) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 flex items-center gap-2">
                        <CloudRain className="w-4 h-4" />
                        Precipitation
                      </span>
                      <span className="font-bold text-lg text-white">{selectedDay.weather.precipitation} mm</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-1.5">
                      <div
                        className="bg-cyan-400 h-1.5 rounded"
                        style={{ width: `${Math.min(100, (selectedDay.weather.precipitation / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Risk Assessment */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    Risk Assessment
                  </h4>

                  {/* Bark Beetle Risk */}
                  <div className={`rounded-lg p-4 border ${getRiskBadgeColor(selectedDay.risk.barkBeetleRisk)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Bark Beetle Risk
                      </h5>
                      <span className="text-lg font-bold">{selectedDay.risk.barkBeetleRisk}</span>
                    </div>
                    <p className="text-xs opacity-90">
                      {selectedDay.risk.barkBeetleRisk === 'Critical'
                        ? 'Extreme conditions favor bark beetle activity. Immediate action recommended.'
                        : selectedDay.risk.barkBeetleRisk === 'High'
                          ? 'High bark beetle activity likely. Monitor trees closely.'
                          : selectedDay.risk.barkBeetleRisk === 'Medium'
                            ? 'Moderate conditions for bark beetle activity.'
                            : 'Conditions unfavorable for bark beetle activity.'}
                    </p>
                  </div>

                  {/* Fire Risk */}
                  <div className={`rounded-lg p-4 border ${getRiskBadgeColor(selectedDay.risk.fireRisk)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        Fire Risk
                      </h5>
                      <span className="text-lg font-bold">{selectedDay.risk.fireRisk}</span>
                    </div>
                    <p className="text-xs opacity-90">
                      {selectedDay.risk.fireRisk === 'Critical'
                        ? 'Critical fire conditions. High precaution advised.'
                        : selectedDay.risk.fireRisk === 'High'
                          ? 'Elevated fire risk. Maintain vigilance.'
                          : selectedDay.risk.fireRisk === 'Medium'
                            ? 'Moderate fire conditions. Stay alert.'
                            : 'Low fire risk conditions.'}
                    </p>
                  </div>

                  {/* Overall Risk Score */}
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-gray-300 text-sm mb-2">Overall Risk Score</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-white">{selectedDay.risk.riskScore}</span>
                      <span className="text-gray-400">/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-2 mt-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedDay.risk.riskScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-2 rounded bg-gradient-to-r ${getRiskColor(
                          selectedDay.risk.barkBeetleRisk
                        )}`}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Info Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 bg-blue-950/30 border border-blue-800/50 rounded-lg p-4 text-sm text-blue-300"
              >
                <p>
                  This timeline combines weather forecasts with risk modeling algorithms. For production use, this will
                  integrate with SMHI API for real-time weather data and historical bark beetle trap data from Skogsstyrelsen.
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 sm:p-6">
        <h4 className="font-semibold mb-4">Risk Levels Explained</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { level: 'Critical', color: 'bg-red-600', description: 'Extreme conditions require immediate action' },
            { level: 'High', color: 'bg-orange-600', description: 'High activity, close monitoring needed' },
            { level: 'Medium', color: 'bg-yellow-600', description: 'Moderate conditions, stay alert' },
            { level: 'Low', color: 'bg-green-600', description: 'Favorable conditions for forest health' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0 mt-1`} />
              <div className="text-sm">
                <p className="font-semibold">{item.level}</p>
                <p className="text-gray-400 text-xs">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherTimeline;
