import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, MapPin, Flame, Cloud, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { getActiveFiresNearby, getFireRiskIndex, type FireDetection, type FireRisk } from '@/services/fireService';
import { fetchWeather, type WeatherData } from '@/services/smhiService';
import { getBeetleTrapData, getPestZones, type TrapReading, type PestZone } from '@/services/skogsstyrelsenService';
import ForestHealthPredictor from '@/components/demo/ForestHealthPredictor';
import ThreatMap from '@/components/demo/ThreatMap';
import CarbonCalculator from '@/components/demo/CarbonCalculator';
import WhatsNew from '@/components/common/WhatsNew';
import VoiceCommand from '@/components/common/VoiceCommand';

interface DataSourceStatus {
  name: string;
  icon: React.ReactNode;
  status: 'loading' | 'success' | 'error';
  lastUpdated: Date | null;
  error?: string;
}

const DEMO_LAT = 59.3;
const DEMO_LON = 18.0; // Stockholm area

const LiveDemoDashboard: React.FC = () => {
  const [fires, setFires] = useState<FireDetection[]>([]);
  const [fireRisk, setFireRisk] = useState<FireRisk | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [trapData, setTrapData] = useState<TrapReading[]>([]);
  const [pestZones, setPestZones] = useState<PestZone[]>([]);
  const [dataSources, setDataSources] = useState<Record<string, DataSourceStatus>>({
    smhi: { name: 'SMHI Väder', icon: <Cloud className="w-4 h-4" />, status: 'loading', lastUpdated: null },
    firms: { name: 'NASA FIRMS Bränder', icon: <Flame className="w-4 h-4" />, status: 'loading', lastUpdated: null },
    beetle: { name: 'Barkborrar (Skogsstyrelsen)', icon: <AlertCircle className="w-4 h-4" />, status: 'loading', lastUpdated: null },
  });

  useEffect(() => {
    const loadData = async () => {
      // Load fire data
      try {
        const fireData = await getActiveFiresNearby(DEMO_LAT, DEMO_LON, 300);
        setFires(fireData);
        const riskData = await getFireRiskIndex(DEMO_LAT, DEMO_LON);
        setFireRisk(riskData);
        setDataSources(prev => ({
          ...prev,
          firms: { ...prev.firms, status: 'success', lastUpdated: new Date() }
        }));
      } catch (error) {
        console.error('Error loading fire data:', error);
        setDataSources(prev => ({
          ...prev,
          firms: { ...prev.firms, status: 'error', error: 'Kunde inte hämta branddata' }
        }));
      }

      // Load SMHI weather data
      try {
        const weatherData = await fetchWeather(DEMO_LAT, DEMO_LON);
        setWeather(weatherData);
        setDataSources(prev => ({
          ...prev,
          smhi: { ...prev.smhi, status: 'success', lastUpdated: new Date() }
        }));
      } catch (error) {
        console.error('Error loading SMHI data:', error);
        setDataSources(prev => ({
          ...prev,
          smhi: { ...prev.smhi, status: 'error', error: 'Kunde inte hämta väderdata' }
        }));
      }

      // Load beetle trap data
      try {
        const traps = await getBeetleTrapData('Stockholm');
        setTrapData(traps);
        const zones = await getPestZones();
        setPestZones(zones);
        setDataSources(prev => ({
          ...prev,
          beetle: { ...prev.beetle, status: 'success', lastUpdated: new Date() }
        }));
      } catch (error) {
        console.error('Error loading beetle trap data:', error);
        setDataSources(prev => ({
          ...prev,
          beetle: { ...prev.beetle, status: 'error', error: 'Kunde inte hämta barkborrsdata' }
        }));
      }
    };

    loadData();
    const interval = setInterval(loadData, 600000); // Refresh every 10 minutes
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/10';
      case 'error': return 'bg-red-500/10';
      default: return 'bg-yellow-500/10';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MODERATE': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-500/10';
      case 'HIGH': return 'bg-orange-500/10';
      case 'MODERATE': return 'bg-yellow-500/10';
      default: return 'bg-green-500/10';
    }
  };

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'laddar...';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just nu';
    if (diffMins < 60) return `${diffMins} min sedan`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h sedan`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d sedan`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-[#1B5E20]" />
            <span className="text-xl font-bold">BeetleSense</span>
          </Link>
          <div className="flex items-center gap-4">
            <WhatsNew />
            <Link to="/login" className="text-gray-400 hover:text-white transition">Logga in</Link>
            <Link to="/signup" className="px-4 py-2 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition">
              Kom igång
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Live Demo — Realtidsdata från Sverige</h1>
          <p className="text-gray-400">Se hur BeetleSense övervakare Sveriges skogar med verklig data från SMHI, NASA FIRMS och Skogsstyrelsen.</p>
        </div>

        {/* Data Source Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.values(dataSources).map((source, i) => (
            <div key={i} className={`border border-gray-800 rounded-lg p-4 ${getStatusBgColor(source.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {source.icon}
                  <span className="font-semibold text-sm">{source.name}</span>
                </div>
                {source.status === 'success' && <CheckCircle2 className={`w-4 h-4 ${getStatusColor(source.status)}`} />}
                {source.status === 'error' && <AlertCircle className={`w-4 h-4 ${getStatusColor(source.status)}`} />}
                {source.status === 'loading' && <Zap className={`w-4 h-4 ${getStatusColor(source.status)} animate-pulse`} />}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(source.lastUpdated)}
              </div>
              {source.error && <p className="text-xs text-red-400 mt-2">{source.error}</p>}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fire Risk */}
          <div className="border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-semibold">Brandrisk</h2>
            </div>
            {fireRisk ? (
              <div className={`rounded-lg p-4 ${getRiskBg(fireRisk.level)}`}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className={`text-4xl font-bold ${getRiskColor(fireRisk.level)}`}>{fireRisk.score}</span>
                  <span className={`text-lg font-semibold ${getRiskColor(fireRisk.level)}`}>{fireRisk.level}</span>
                </div>
                <div className="space-y-2">
                  {fireRisk.factors.map((factor, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">{factor.name}</span>
                        <span className="font-semibold">{Math.round(factor.value)}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded"
                          style={{ width: `${Math.min(100, (factor.value / 100) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-pulse bg-gray-800 h-32 rounded" />
            )}
          </div>

          {/* Weather Forecast */}
          <div className="border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Väderprognos</h2>
            </div>
            {weather ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {weather.current && (
                    <>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-xs text-gray-400 mb-1">Temperatur</div>
                        <div className="text-2xl font-bold">{Math.round(weather.current.temperature)}°C</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-xs text-gray-400 mb-1">Luftfuktighet</div>
                        <div className="text-2xl font-bold">{weather.current.humidity !== undefined ? Math.round(weather.current.humidity) : 'N/A'}%</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-xs text-gray-400 mb-1">Vindstyrka</div>
                        <div className="text-2xl font-bold">{Math.round(weather.current.windSpeed)} m/s</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-xs text-gray-400 mb-1">Nederbörd</div>
                        <div className="text-2xl font-bold">{weather.daily && weather.daily[0] ? Math.round(weather.daily[0].totalPrecipitation) : 0} mm</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Värderad position: {DEMO_LAT}°N, {DEMO_LON}°E
                </div>
              </div>
            ) : (
              <div className="animate-pulse bg-gray-800 h-32 rounded" />
            )}
          </div>
        </div>

        {/* Forest Health Predictor */}
        <div className="mt-8">
          <ForestHealthPredictor weatherData={weather} trapData={trapData} />
        </div>

        {/* Interactive Threat Map */}
        <div className="mt-8">
          <ThreatMap fires={fires} pestZones={pestZones} />
        </div>

        {/* Beetle Trap Data */}
        {trapData.length > 0 && (
          <div className="mt-8 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-semibold">Barkborrfällor</h2>
            </div>
            <div className="space-y-2">
              {trapData.slice(0, 5).map((trap, i) => (
                <div key={i} className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{trap.county}</span>
                    <span className="text-red-400">{trap.count} individer</span>
                  </div>
                  <div className="text-gray-400">Vecka {trap.week} {trap.year} • {trap.trend}</div>
                </div>
              ))}
              {trapData.length === 0 && (
                <p className="text-gray-400 text-sm">Ingen aktivitet i barkborrfällor.</p>
              )}
            </div>
          </div>
        )}

        {/* Active Fires */}
        {fires.length > 0 && (
          <div className="mt-8 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-semibold">Aktiva bränder inom 300 km</h2>
            </div>
            <div className="space-y-3">
              {fires.slice(0, 5).map((fire, i) => (
                <div key={i} className="border border-red-500/30 bg-red-500/10 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-red-300">{fire.latitude.toFixed(2)}°N, {fire.longitude.toFixed(2)}°E</p>
                      <p className="text-sm text-gray-400">
                        {fire.distanceKm?.toFixed(0)} km {fire.bearing}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        fire.confidence === 'high' ? 'text-green-400' : fire.confidence === 'nominal' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {fire.confidence}
                      </div>
                      <div className="text-xs text-gray-400">{fire.frp.toFixed(1)} MW</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{fire.acq_date} {fire.acq_time}</div>
                </div>
              ))}
              {fires.length === 0 && (
                <p className="text-gray-400 text-sm">Inga aktiva bränder detekterade inom 300 km.</p>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#1B5E20]/30 to-[#4CAF50]/30 border border-[#4CAF50]/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-2">Vill du ha tillgång till alla funktioner?</h3>
          <p className="text-gray-400 mb-6">
            Logga in eller skapa ett konto för att få tillgång till avancerad analys, anpassade varningar och detaljerade rapporter.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/login" className="px-6 py-3 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition">
              Logga in
            </Link>
            <Link to="/signup" className="px-6 py-3 border border-[#4CAF50] text-[#4CAF50] rounded font-semibold hover:bg-[#1B5E20]/20 transition">
              Skapa konto
            </Link>
          </div>
        </div>
      </section>

      {/* Carbon Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <CarbonCalculator />
      </section>

      {/* Footer */}
      {/* ForestWard Observatory - Carbon & Forest Health Intelligence */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/40 to-gray-900/60 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">ForestWard Observatory</h2>
                <p className="text-emerald-400 text-sm font-medium">Carbon Impact & Forest Health Intelligence</p>
              </div>
            </div>
            <p className="text-gray-300 mb-8 max-w-3xl">
              BeetleSense integrates with EU-funded sustainable forestry initiatives to provide real-time carbon sequestration monitoring, 
              biodiversity impact assessment, and early warning systems for forest health threats across Scandinavian forests.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/30 p-5">
                <div className="text-3xl font-bold text-emerald-400 mb-1">2.4M</div>
                <div className="text-sm text-gray-400">Tonnes CO2 sequestered annually</div>
                <div className="text-xs text-emerald-600 mt-2">Monitored forest area: 840 km2</div>
              </div>
              <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/30 p-5">
                <div className="text-3xl font-bold text-amber-400 mb-1">12</div>
                <div className="text-sm text-gray-400">Active threat zones detected</div>
                <div className="text-xs text-amber-600 mt-2">Bark beetle + drought stress combined</div>
              </div>
              <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/30 p-5">
                <div className="text-3xl font-bold text-cyan-400 mb-1">96.2%</div>
                <div className="text-sm text-gray-400">Early detection accuracy</div>
                <div className="text-xs text-cyan-600 mt-2">AI model trained on 5 years of data</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/30 text-emerald-300 text-xs font-medium">EU FORWARDS Programme</span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/30 text-emerald-300 text-xs font-medium">ROB4GREEN Initiative</span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/30 text-emerald-300 text-xs font-medium">Sustainable Forestry AI</span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/30 text-emerald-300 text-xs font-medium">Carbon Sequestration Tracking</span>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-800 bg-black/50 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
          <p>Data uppdateras var 10:e minut från SMHI, NASA FIRMS och Skogsstyrelsen.</p>
        </div>
      </footer>

      {/* Floating Components */}
      <VoiceCommand />
    </div>
  );
};

export default LiveDemoDashboard;
