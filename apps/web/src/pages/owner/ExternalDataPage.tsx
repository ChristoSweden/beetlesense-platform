import React, { useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, RefreshCw, ArrowLeft, Wifi, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const WeatherDashboard = lazy(() => import('../../components/weather/WeatherDashboard'));
const FireRiskDashboard = lazy(() => import('../../components/fire/FireRiskDashboard'));
const MarketOverview = lazy(() => import('../../components/market/MarketOverview'));
const BeetleTrapDashboard = lazy(() => import('../../components/beetle/BeetleTrapDashboard'));
const SoilProfileCard = lazy(() => import('../../components/soil/SoilProfileCard'));

type Tab = 'overview' | 'weather' | 'fire' | 'market' | 'soil-beetle';

interface DataSource {
  id: string;
  name: string;
  nameSv: string;
  status: 'live' | 'cached' | 'unavailable';
  lastUpdated: string;
  metric: string;
  metricLabel: string;
  frequency: string;
}

const DATA_SOURCES: DataSource[] = [
  { id: 'smhi', name: 'SMHI Weather', nameSv: 'SMHI Väder', status: 'live', lastUpdated: '2 min sedan', metric: '14°C', metricLabel: 'Temperatur', frequency: '6h' },
  { id: 'firms', name: 'NASA Fire Detection', nameSv: 'NASA Brandövervakning', status: 'live', lastUpdated: '3h sedan', metric: '0', metricLabel: 'Aktiva bränder', frequency: '3h' },
  { id: 'nordpool', name: 'Nord Pool Energy', nameSv: 'Nord Pool Energi', status: 'live', lastUpdated: '1h sedan', metric: '55 öre', metricLabel: 'Spotpris SE3', frequency: '1h' },
  { id: 'euets', name: 'EU ETS Carbon', nameSv: 'EU ETS Kolkredit', status: 'live', lastUpdated: '15 min sedan', metric: '€73', metricLabel: 'per tonne CO₂', frequency: '15m' },
  { id: 'riksbanken', name: 'Riksbanken FX', nameSv: 'Riksbanken Valuta', status: 'live', lastUpdated: '1h sedan', metric: '11.18', metricLabel: 'EUR/SEK', frequency: '1h' },
  { id: 'skogsstyrelsen', name: 'Forest Agency Beetles', nameSv: 'Skogsstyrelsen Barkborre', status: 'cached', lastUpdated: '1d sedan', metric: '2 450', metricLabel: 'Fångster v.11', frequency: '1v' },
  { id: 'sgu', name: 'SGU Soil Data', nameSv: 'SGU Markdata', status: 'live', lastUpdated: '30d sedan', metric: 'Morän', metricLabel: 'Primär jordart', frequency: 'Statisk' },
  { id: 'timber', name: 'Timber Market', nameSv: 'Virkesmarknad', status: 'live', lastUpdated: '6h sedan', metric: '485 kr', metricLabel: 'Gran m³fub', frequency: '24h' },
];

function StatusDot({ status }: { status: DataSource['status'] }) {
  const colors = { live: '#4ade80', cached: '#facc15', unavailable: '#f87171' };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: colors[status] }} />}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: colors[status] }} />
    </span>
  );
}

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
    </div>
  );
}

export default function ExternalDataPage() {
  const { i18n } = useTranslation();
  const sv = (i18n.language || 'sv').startsWith('sv');
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const liveCount = DATA_SOURCES.filter(s => s.status === 'live').length;
  const qualityScore = Math.round((liveCount / DATA_SOURCES.length) * 100);

  const handleRefreshAll = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: sv ? 'Översikt' : 'Overview' },
    { id: 'weather', label: sv ? 'Väder' : 'Weather' },
    { id: 'fire', label: sv ? 'Brand' : 'Fire' },
    { id: 'market', label: sv ? 'Marknad' : 'Market' },
    { id: 'soil-beetle', label: sv ? 'Mark & Barkborre' : 'Soil & Beetle' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/owner/dashboard" className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: 'var(--text3)' }}>
            <ArrowLeft size={18} />
          </Link>
          <Globe size={24} style={{ color: 'var(--green)' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {sv ? 'Extern Data' : 'External Data'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {sv ? '8 datakällor i realtid' : '8 real-time data sources'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
              background: qualityScore > 80 ? 'rgba(74,222,128,0.15)' : 'rgba(250,204,21,0.15)',
              color: qualityScore > 80 ? '#4ade80' : '#facc15',
            }}>
              {qualityScore}
            </div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>
              {sv ? 'Datakvalitet' : 'Data quality'}
            </div>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--green)', color: '#030d05' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {sv ? 'Uppdatera alla' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-t-lg"
            style={{
              color: tab === t.id ? 'var(--green)' : 'var(--text3)',
              borderBottom: tab === t.id ? '2px solid var(--green)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DATA_SOURCES.map(source => (
              <div
                key={source.id}
                className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={() => {
                  if (['smhi'].includes(source.id)) setTab('weather');
                  else if (['firms'].includes(source.id)) setTab('fire');
                  else if (['nordpool', 'euets', 'riksbanken', 'timber'].includes(source.id)) setTab('market');
                  else if (['skogsstyrelsen', 'sgu'].includes(source.id)) setTab('soil-beetle');
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                    {sv ? source.nameSv : source.name}
                  </span>
                  <StatusDot status={source.status} />
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                  {source.metric}
                </div>
                <div className="text-xs" style={{ color: 'var(--text3)' }}>{source.metricLabel}</div>
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text3)' }}>
                    <Clock size={10} /> {source.lastUpdated}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>
                    ↻ {source.frequency}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* API usage stats */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={16} style={{ color: 'var(--green)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {sv ? 'API-användning idag' : 'API Usage Today'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'SMHI', calls: 12, limit: '∞', icon: <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> },
                { label: 'NASA FIRMS', calls: 8, limit: '500/dag', icon: <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> },
                { label: 'Nord Pool', calls: 24, limit: '1000/dag', icon: <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> },
                { label: 'Riksbanken', calls: 4, limit: '∞', icon: <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> },
              ].map(api => (
                <div key={api.label} className="flex items-center gap-2">
                  {api.icon}
                  <div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{api.label}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{api.calls} / {api.limit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'weather' && (
        <Suspense fallback={<TabFallback />}>
          <WeatherDashboard />
        </Suspense>
      )}

      {tab === 'fire' && (
        <Suspense fallback={<TabFallback />}>
          <FireRiskDashboard />
        </Suspense>
      )}

      {tab === 'market' && (
        <Suspense fallback={<TabFallback />}>
          <MarketOverview />
        </Suspense>
      )}

      {tab === 'soil-beetle' && (
        <Suspense fallback={<TabFallback />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BeetleTrapDashboard />
            <SoilProfileCard />
          </div>
        </Suspense>
      )}
    </div>
  );
}
