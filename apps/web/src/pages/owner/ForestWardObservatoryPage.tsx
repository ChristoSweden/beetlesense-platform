import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Bug,
  Flame,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Network,
  Radio,
  Shield,
  Activity,
  MapPin,
  BarChart3,
  Zap,
  Upload,
  Award,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { useForestWardObservatory } from '@/hooks/useForestWardObservatory';
import { useCompoundThreat } from '@/hooks/useCompoundThreat';
import { getThreatColor } from '@/services/compoundThreatService';
import type { SingleThreat, ThreatInteraction } from '@/services/compoundThreatService';
import type { BBOAAlert, PhenologicalStation, CrossBorderSignal, GDDValidation } from '@/services/forestWardObservatoryService';
import { getEFIConsent, saveEFIConsent } from '@/services/forestWardObservatoryService';
import { calculateFusedRisk, detectCascadingThreats, getDemoFusionInputs, type CompoundRiskAssessment as FusionAssessment, type CascadingThreat } from '@/services/fusionEngine';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ── Helpers ──────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  if (trend === 'rising') return <ArrowUpRight size={12} className="text-red-500" />;
  if (trend === 'falling') return <ArrowDownRight size={12} className="text-green-600" />;
  return <Minus size={12} className="text-[var(--text3)]" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(220,38,38,0.12)', text: '#dc2626' },
    warning: { bg: 'rgba(234,88,12,0.12)', text: '#ea580c' },
    watch: { bg: 'rgba(202,138,4,0.12)', text: '#ca8a04' },
    info: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
    high: { bg: 'rgba(220,38,38,0.12)', text: '#dc2626' },
    medium: { bg: 'rgba(234,88,12,0.12)', text: '#ea580c' },
    low: { bg: 'rgba(22,163,74,0.12)', text: '#16a34a' },
  };
  const c = config[severity] ?? config.info;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: c.bg, color: c.text }}>
      {severity}
    </span>
  );
}

function RiskBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? '#dc2626' : score >= 50 ? '#ea580c' : score >= 25 ? '#ca8a04' : '#16a34a';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text3)] w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function ForestWardObservatoryPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'sv' ? 'sv' : 'en';
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'stations' | 'compound' | 'validation' | 'fusion' | 'contribute'>('overview');

  const observatory = useForestWardObservatory();
  const compound = useCompoundThreat();

  // EFI consent state
  const [efiConsent, setEfiConsent] = useState(false);
  const [efiLastContributed, setEfiLastContributed] = useState<string | null>(null);
  const [efiLoading, setEfiLoading] = useState(false);
  const [efiSaving, setEfiSaving] = useState(false);

  // Load consent on mount
  useEffect(() => {
    if (isDemo() || !isSupabaseConfigured) {
      // Demo mode — show consent as false with no last contribution
      return;
    }
    setEfiLoading(true);
    getEFIConsent(supabase as Parameters<typeof getEFIConsent>[0]).then((status) => {
      setEfiConsent(status.consent);
      setEfiLastContributed(status.lastContributed);
    }).finally(() => setEfiLoading(false));
  }, []);

  const handleToggleConsent = useCallback(async () => {
    const newVal = !efiConsent;
    setEfiSaving(true);
    if (!isDemo() && isSupabaseConfigured) {
      await saveEFIConsent(supabase as Parameters<typeof saveEFIConsent>[0], newVal);
    }
    setEfiConsent(newVal);
    setEfiSaving(false);
  }, [efiConsent]);

  // Multi-source fusion engine
  const fusionData = useMemo(() => {
    const inputs = getDemoFusionInputs();
    const assessment = calculateFusedRisk(inputs);
    const cascading = detectCascadingThreats(inputs);
    return { assessment, cascading };
  }, []);

  const tabs = [
    { id: 'overview' as const, label: lang === 'sv' ? 'Översikt' : 'Overview', icon: <Globe size={14} /> },
    { id: 'alerts' as const, label: lang === 'sv' ? 'BBOA-larm' : 'BBOA Alerts', icon: <AlertTriangle size={14} /> },
    { id: 'stations' as const, label: lang === 'sv' ? 'Stationer' : 'Stations', icon: <Radio size={14} /> },
    { id: 'compound' as const, label: lang === 'sv' ? 'Sammansatt Hot' : 'Compound Threat', icon: <Zap size={14} /> },
    { id: 'fusion' as const, label: lang === 'sv' ? 'Datafusion' : 'Data Fusion', icon: <Activity size={14} /> },
    { id: 'validation' as const, label: lang === 'sv' ? 'GDD-validering' : 'GDD Validation', icon: <BarChart3 size={14} /> },
    { id: 'contribute' as const, label: lang === 'sv' ? 'Bidra' : 'Contribute', icon: <Award size={14} /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--green)' }}>
            <Network size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              {lang === 'sv' ? 'ForestWard Observatorium' : 'ForestWard Observatory'}
            </h1>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              {lang === 'sv'
                ? 'Realtidsdata från EFIs pan-europeiska skogshälsonätverk — fenologiska stationer, barkborrelarm och gränsöverskridande signaler.'
                : "Real-time data from EFI's pan-European forest health network — phenological stations, bark beetle alerts, and cross-border early warning signals."}
            </p>
          </div>
          <button
            onClick={observatory.refresh}
            disabled={observatory.loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={observatory.loading ? 'animate-spin' : ''} />
            {lang === 'sv' ? 'Uppdatera' : 'Refresh'}
          </button>
        </div>

        {/* Connection Status Bar */}
        {observatory.status && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${observatory.status.api_status === 'connected' ? 'bg-green-500' : observatory.status.api_status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-semibold text-[var(--text2)] uppercase">{observatory.status.api_status}</span>
            </div>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)]">{observatory.status.stations_reporting}/{observatory.status.stations_total} stations</span>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)]">{observatory.status.active_alerts} active alerts</span>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)]">Latency: {observatory.status.pipeline_latency_min} min</span>
            <span className="text-[10px] text-[var(--text3)]">|</span>
            <span className="text-[10px] text-[var(--text3)]">Freshness: {observatory.status.data_freshness}%</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--green)] text-white'
                  : 'border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:border-[var(--green)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab observatory={observatory} compound={compound} lang={lang} />}
        {activeTab === 'alerts' && <AlertsTab alerts={observatory.alerts} lang={lang} />}
        {activeTab === 'stations' && <StationsTab stations={observatory.stations} lang={lang} />}
        {activeTab === 'compound' && <CompoundTab compound={compound} lang={lang} />}
        {activeTab === 'fusion' && <FusionTab assessment={fusionData.assessment} cascading={fusionData.cascading} lang={lang} />}
        {activeTab === 'validation' && <ValidationTab validation={observatory.validation} lang={lang} />}
        {activeTab === 'contribute' && (
          <ContributeTab
            lang={lang}
            consent={efiConsent}
            lastContributed={efiLastContributed}
            loading={efiLoading}
            saving={efiSaving}
            onToggle={handleToggleConsent}
          />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ observatory, compound, lang }: {
  observatory: ReturnType<typeof useForestWardObservatory>;
  compound: ReturnType<typeof useCompoundThreat>;
  lang: string;
}) {
  const criticalAlerts = observatory.alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
  const highSignals = observatory.signals.filter(s => s.risk === 'high');

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Bug size={16} />} color="#dc2626" label={lang === 'sv' ? 'BBOA-larm' : 'BBOA Alerts'} value={`${observatory.alerts.length}`} detail={`${criticalAlerts.length} ${lang === 'sv' ? 'kritiska' : 'critical/warning'}`} />
        <StatCard icon={<Radio size={16} />} color="#3b82f6" label={lang === 'sv' ? 'Stationer' : 'Stations'} value={`${observatory.stations.filter(s => s.is_current).length}`} detail={`${lang === 'sv' ? 'av' : 'of'} ${observatory.stations.length} ${lang === 'sv' ? 'rapporterar' : 'reporting'}`} />
        <StatCard icon={<Globe size={16} />} color="#8b5cf6" label={lang === 'sv' ? 'Gränsöverskridande' : 'Cross-Border'} value={`${observatory.signals.length}`} detail={`${highSignals.length} ${lang === 'sv' ? 'hög risk' : 'high risk'}`} />
        <StatCard icon={<Zap size={16} />} color={compound.assessment ? getThreatColor(compound.assessment.compound_level) : '#16a34a'} label={lang === 'sv' ? 'Sammansatt Hot' : 'Compound Threat'} value={compound.assessment ? `${compound.assessment.compound_score}` : '...'} detail={compound.assessment?.compound_level ?? 'Loading'} />
      </div>

      {/* Active BBOA Alerts (most recent/severe) */}
      {criticalAlerts.length > 0 && (
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            {lang === 'sv' ? 'Aktiva Barkborrelarm' : 'Active Bark Beetle Alerts'}
          </h2>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 3).map(alert => (
              <AlertCard key={alert.id} alert={alert} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Cross-Border Signals */}
      {observatory.signals.length > 0 && (
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
            <Globe size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Gränsöverskridande Signaler' : 'Cross-Border Early Warning'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {observatory.signals.map(signal => (
              <SignalCard key={signal.id} signal={signal} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Data Contributions */}
      <section>
        <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
          <Upload size={14} className="text-[var(--green)]" />
          {lang === 'sv' ? 'BeetleSense Databidrag till ForestWard' : 'BeetleSense Contributions to ForestWard'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {observatory.contributions.map(c => (
            <div key={c.type} className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
              <p className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-1">
                {c.type.replace(/_/g, ' ')}
              </p>
              <p className="text-lg font-bold text-[var(--text)]">{c.record_count.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  {c.status} | {c.last_contributed}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab({ alerts, lang }: { alerts: BBOAAlert[]; lang: string }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text3)]">
        {lang === 'sv'
          ? `${alerts.length} barkborrelarm från ForestWard Observatory — sorterade efter avstånd från dina skiften.`
          : `${alerts.length} bark beetle outbreak alerts from ForestWard Observatory — sorted by distance from your parcels.`}
      </p>
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} lang={lang} expanded />
      ))}
    </div>
  );
}

function AlertCard({ alert, lang: _lang, expanded }: { alert: BBOAAlert; lang: string; expanded?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs font-mono text-[var(--text3)]">{alert.id}</span>
        </div>
        {alert.distance_km !== undefined && (
          <span className="text-xs font-semibold text-[var(--text2)] flex items-center gap-1">
            <MapPin size={10} />
            {alert.distance_km} km
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Bug size={12} className="text-[var(--text3)]" />
        <span className="text-xs font-semibold text-[var(--text)]">{alert.species}</span>
        <span className="text-[10px] text-[var(--text3)]">— {alert.region}, {alert.country}</span>
      </div>
      <p className="text-xs text-[var(--text2)] mb-2">
        {expanded ? alert.description : alert.description.slice(0, 120) + (alert.description.length > 120 ? '...' : '')}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--text3)]">
        <span>{alert.affected_ha} ha affected</span>
        <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
        <span>Source: {alert.source.replace('_', ' ')}</span>
        <span><Clock size={10} className="inline mr-0.5" />{alert.issued_date}</span>
      </div>
    </div>
  );
}

// ── Stations Tab ─────────────────────────────────────────────────────────────

function StationsTab({ stations, lang }: { stations: PhenologicalStation[]; lang: string }) {
  const grouped = useMemo(() => {
    const map = new Map<string, PhenologicalStation[]>();
    stations.forEach(s => {
      const list = map.get(s.country) ?? [];
      list.push(s);
      map.set(s.country, list);
    });
    return map;
  }, [stations]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text3)]">
        {lang === 'sv'
          ? `${stations.length} fenologiska stationer i ForestWard-nätverket. GDD (Growing Degree-Days, bas 5°C) indikerar vegetationsutveckling och barkborreflygtider.`
          : `${stations.length} phenological stations in the ForestWard network. GDD (Growing Degree-Days, base 5°C) tracks vegetation development and bark beetle flight timing.`}
      </p>
      {Array.from(grouped.entries()).map(([country, countryStations]) => (
        <section key={country}>
          <h3 className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
            <Globe size={12} className="text-[var(--green)]" />
            {country}
            <span className="text-[10px] text-[var(--text3)] font-normal">({countryStations.length} stations)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {countryStations.map(station => (
              <StationCard key={station.id} station={station} lang={lang} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StationCard({ station, lang: _lang }: { station: PhenologicalStation; lang: string }) {
  const phaseColor = {
    dormant: '#6b7280',
    budburst: '#16a34a',
    active_growth: '#059669',
    senescence: '#ca8a04',
  }[station.phenophase];

  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-[var(--text)]">{station.name}</p>
          <p className="text-[10px] text-[var(--text3)] font-mono">{station.id} | {station.elevation_m}m | {station.species}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${station.is_current ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-[10px] text-[var(--text3)]">{station.data_age_hours}h ago</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">GDD</p>
          <p className="text-lg font-bold text-[var(--text)]">{station.gdd_accumulated}</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Phase</p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${phaseColor}15`, color: phaseColor }}>
            {station.phenophase.replace('_', ' ')}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Lat/Lon</p>
          <p className="text-[10px] text-[var(--text2)]">{station.latitude.toFixed(2)}°N {station.longitude.toFixed(2)}°E</p>
        </div>
      </div>
    </div>
  );
}

// ── Compound Threat Tab ──────────────────────────────────────────────────────

function CompoundTab({ compound, lang }: {
  compound: ReturnType<typeof useCompoundThreat>;
  lang: string;
}) {
  const a = compound.assessment;
  if (!a) return <p className="text-xs text-[var(--text3)]">Loading...</p>;

  return (
    <div className="space-y-5">
      {/* Compound Score Header */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-serif font-semibold text-[var(--text)]">
              {lang === 'sv' ? 'Sammansatt Hotnivå' : 'Compound Threat Level'}
            </h2>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {lang === 'sv'
                ? 'Barkborre × Skogsbrand × Torka — med interaktionseffekter'
                : 'Bark beetle × Wildfire × Drought — with interaction effects'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: getThreatColor(a.compound_level) }}>{a.compound_score}</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: `${getThreatColor(a.compound_level)}15`, color: getThreatColor(a.compound_level) }}>
              {a.compound_level}
            </span>
          </div>
        </div>
        {/* Individual threat bars */}
        <div className="space-y-2">
          <RiskBar score={a.beetle_threat.score} label="Beetle" />
          <RiskBar score={a.fire_threat.score} label="Fire" />
          <RiskBar score={a.drought_threat.score} label="Drought" />
        </div>
      </div>

      {/* Individual Threats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ThreatCard threat={a.beetle_threat} icon={<Bug size={16} />} lang={lang} />
        <ThreatCard threat={a.fire_threat} icon={<Flame size={16} />} lang={lang} />
        <ThreatCard threat={a.drought_threat} icon={<Droplets size={16} />} lang={lang} />
      </div>

      {/* Interactions */}
      {a.interactions.length > 0 && (
        <section>
          <h3 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
            <Zap size={14} className="text-orange-500" />
            {lang === 'sv' ? 'Hotinteraktioner (Förstärkningar)' : 'Threat Interactions (Amplifications)'}
          </h3>
          <div className="space-y-2">
            {a.interactions.map((int, i) => (
              <InteractionCard key={i} interaction={int} />
            ))}
          </div>
        </section>
      )}

      {/* 7-Day Forecast Timeline */}
      {compound.timeline.length > 0 && (
        <section>
          <h3 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
            <Activity size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? '7-dagars Hotprognos' : '7-Day Threat Forecast'}
          </h3>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
            <div className="flex items-end gap-1 h-32">
              {compound.timeline.map((day, _i) => {
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '100px' }}>
                      <div className="w-full rounded-sm" title={`Compound: ${day.compound_score}`}
                        style={{ height: `${day.compound_score}%`, background: getThreatColor(day.compound_score >= 75 ? 'CRITICAL' : day.compound_score >= 50 ? 'HIGH' : day.compound_score >= 25 ? 'MODERATE' : 'LOW'), opacity: 0.8 }} />
                    </div>
                    <span className="text-[9px] text-[var(--text3)]">{day.date.slice(5)}</span>
                    <span className="text-[9px] font-bold" style={{ color: getThreatColor(day.compound_score >= 75 ? 'CRITICAL' : day.compound_score >= 50 ? 'HIGH' : day.compound_score >= 25 ? 'MODERATE' : 'LOW') }}>
                      {day.compound_score}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[var(--border)]">
              <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-sm" style={{ background: '#dc2626' }} /> Critical (75+)</span>
              <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-sm" style={{ background: '#ea580c' }} /> High (50-74)</span>
              <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-sm" style={{ background: '#ca8a04' }} /> Moderate (25-49)</span>
              <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-sm" style={{ background: '#16a34a' }} /> Low (0-24)</span>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section>
        <h3 className="text-sm font-serif font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
          <Shield size={14} className="text-[var(--green)]" />
          {lang === 'sv' ? 'Rekommenderade Åtgärder' : 'Recommended Actions'}
        </h3>
        <div className="space-y-1.5">
          {a.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
              <CheckCircle2 size={14} className="text-[var(--green)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text)]">{rec}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <div className="flex flex-wrap gap-2">
        {a.data_sources.map(src => (
          <span key={src} className="px-2 py-0.5 rounded-full text-[9px] font-medium border border-[var(--border)] text-[var(--text3)]">{src}</span>
        ))}
      </div>
    </div>
  );
}

function ThreatCard({ threat, icon, lang: _lang }: { threat: SingleThreat; icon: React.ReactNode; lang: string }) {
  const color = getThreatColor(threat.level);
  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>{icon}</div>
          <span className="text-xs font-semibold text-[var(--text)]">{threat.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon trend={threat.trend} />
          <span className="text-lg font-bold" style={{ color }}>{threat.score}</span>
        </div>
      </div>
      <div className="space-y-1">
        {threat.drivers.map((d, i) => (
          <p key={i} className="text-[10px] text-[var(--text2)] flex items-start gap-1">
            <span className="text-[var(--text3)]">•</span> {d}
          </p>
        ))}
      </div>
    </div>
  );
}

function InteractionCard({ interaction }: { interaction: ThreatInteraction }) {
  const ampColor = interaction.amplification >= 1.3 ? '#dc2626' : interaction.amplification >= 1.15 ? '#ea580c' : '#ca8a04';
  return (
    <div className="rounded-xl border border-[var(--border)] p-3 flex items-start gap-3" style={{ background: 'var(--bg)' }}>
      <div className="shrink-0 mt-0.5">
        <Zap size={14} style={{ color: ampColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[var(--text)]">{interaction.threats[0]} × {interaction.threats[1]}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${ampColor}15`, color: ampColor }}>
            +{Math.round((interaction.amplification - 1) * 100)}%
          </span>
        </div>
        <p className="text-[10px] text-[var(--text2)]">{interaction.mechanism}</p>
        <p className="text-[10px] text-[var(--text3)] mt-0.5">Confidence: {Math.round(interaction.confidence * 100)}%</p>
      </div>
    </div>
  );
}

// ── Validation Tab ───────────────────────────────────────────────────────────

function ValidationTab({ validation, lang }: { validation: GDDValidation[]; lang: string }) {
  const avgDeviation = validation.length > 0
    ? (validation.reduce((sum, v) => sum + v.deviation_pct, 0) / validation.length).toFixed(1)
    : '0';
  const withinTolerance = validation.filter(v => v.within_tolerance).length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text3)]">
        {lang === 'sv'
          ? 'Korsvalidering av BeetleSense GDD-beräkningar mot ForestWard fenologiska stationsdata. Acceptabel tolerans: ±10%.'
          : "Cross-validation of BeetleSense GDD calculations against ForestWard phenological station readings. Acceptable tolerance: ±10%."}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Stations Validated</p>
          <p className="text-lg font-bold text-[var(--text)]">{validation.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Avg Deviation</p>
          <p className="text-lg font-bold text-[var(--text)]">{avgDeviation}%</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
          <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Within Tolerance</p>
          <p className="text-lg font-bold text-[var(--green)]">{withinTolerance}/{validation.length}</p>
        </div>
      </div>

      {/* Validation Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ background: 'rgba(74,222,128,0.06)' }}>
                <th className="text-left p-2 font-semibold text-[var(--text2)]">Station</th>
                <th className="text-left p-2 font-semibold text-[var(--text2)]">Country</th>
                <th className="text-right p-2 font-semibold text-[var(--text2)]">ForestWard GDD</th>
                <th className="text-right p-2 font-semibold text-[var(--text2)]">BeetleSense GDD</th>
                <th className="text-right p-2 font-semibold text-[var(--text2)]">Deviation</th>
                <th className="text-center p-2 font-semibold text-[var(--text2)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {validation.map(v => (
                <tr key={v.station_id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="p-2 text-[var(--text)]">{v.station_name}</td>
                  <td className="p-2 text-[var(--text3)]">{v.country}</td>
                  <td className="p-2 text-right font-mono text-[var(--text)]">{v.forestward_gdd}</td>
                  <td className="p-2 text-right font-mono text-[var(--text)]">{v.beetlesense_gdd}</td>
                  <td className="p-2 text-right font-mono" style={{ color: v.within_tolerance ? '#16a34a' : '#dc2626' }}>
                    ±{v.deviation_pct}%
                  </td>
                  <td className="p-2 text-center">
                    {v.within_tolerance
                      ? <CheckCircle2 size={14} className="text-green-600 inline" />
                      : <AlertTriangle size={14} className="text-red-500 inline" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ signal, lang: _lang }: { signal: CrossBorderSignal; lang: string }) {
  const typeIcon = {
    beetle_migration: <Bug size={12} />,
    fire_spread: <Flame size={12} />,
    storm_damage: <AlertTriangle size={12} />,
    drought_stress: <Droplets size={12} />,
  }[signal.type];

  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text3)]">{typeIcon}</span>
          <span className="text-xs font-semibold text-[var(--text)]">{signal.origin_country} → {signal.target_country}</span>
        </div>
        <SeverityBadge severity={signal.risk} />
      </div>
      <p className="text-[10px] text-[var(--text2)] mb-1.5">{signal.description.slice(0, 140)}...</p>
      <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text3)]">
        {signal.eta_days !== null && <span>ETA: {signal.eta_days} days</span>}
        {signal.dispersal_range_km > 0 && <span>Range: {signal.dispersal_range_km} km</span>}
        <span><Clock size={10} className="inline mr-0.5" />{signal.issued_date}</span>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, color, label, value, detail }: {
  icon: React.ReactNode; color: string; label: string; value: string; detail: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>{icon}</div>
        <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{detail}</p>
    </div>
  );
}

// ── Fusion Tab ─────────────────────────────────────────────────────────────

function FusionTab({ assessment, cascading, lang }: {
  assessment: FusionAssessment;
  cascading: CascadingThreat[];
  lang: string;
}) {
  const riskColors: Record<string, string> = {
    CRITICAL: '#dc2626', HIGH: '#ea580c', MODERATE: '#ca8a04', LOW: '#16a34a',
  };
  const riskColor = riskColors[assessment.riskLevel] ?? '#16a34a';

  return (
    <div className="space-y-5">
      {/* Fusion header */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${riskColor}15`, color: riskColor }}>
            <Activity size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-serif font-semibold text-[var(--text)]">
              {lang === 'sv' ? 'Multikälla-datafusion' : 'Multi-Source Data Fusion'}
            </h2>
            <p className="text-[10px] text-[var(--text3)]">
              Weighted fusion of {assessment.activeSources} data sources via <code style={{ fontSize: 9, background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>fusionEngine.ts</code>
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono" style={{ color: riskColor }}>{assessment.overallRisk}</span>
            <span className="text-xs text-[var(--text3)]">/100</span>
            <div className="text-[10px] font-bold uppercase" style={{ color: riskColor }}>{assessment.riskLevel}</div>
          </div>
        </div>

        {/* Contributing factors */}
        <div className="space-y-2 mb-4">
          <h3 className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
            {lang === 'sv' ? 'Bidragande datakällor' : 'Contributing Data Sources'}
          </h3>
          {assessment.factors.map(factor => {
            const pct = Math.round(factor.riskScore * 100);
            const barColor = pct >= 60 ? '#dc2626' : pct >= 35 ? '#ca8a04' : '#16a34a';
            return (
              <div key={factor.source} className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--text3)] w-36 shrink-0 truncate">{factor.label}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <span className="text-xs font-mono font-bold w-10 text-right" style={{ color: barColor }}>{pct}%</span>
                <span className="text-[9px] text-[var(--text3)] w-14 text-right">w={factor.weight}</span>
                <span className="text-[9px] text-[var(--text3)] w-14 text-right">c={factor.confidence}</span>
              </div>
            );
          })}
        </div>

        {/* Confidence and source count */}
        <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
          <span>{lang === 'sv' ? 'Konfidens' : 'Confidence'}: <strong className="text-[var(--text)]">{Math.round(assessment.confidenceLevel * 100)}%</strong></span>
          <span>|</span>
          <span>{lang === 'sv' ? 'Aktiva källor' : 'Active sources'}: <strong className="text-[var(--text)]">{assessment.activeSources}/5</strong></span>
        </div>
      </div>

      {/* Cascading threats */}
      {cascading.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg)' }}>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Zap size={14} className="text-red-500" />
            {lang === 'sv' ? 'Kaskadrisker detekterade' : 'Cascading Threats Detected'}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">{cascading.length}</span>
          </h3>
          <div className="space-y-3">
            {cascading.map((threat, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text)]">{threat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: riskColors[threat.riskLevel] ?? '#16a34a' }}>
                      {Math.round((threat.amplification - 1) * 100)}% amplification
                    </span>
                    <SeverityBadge severity={threat.riskLevel.toLowerCase()} />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text2)] mb-1.5">{threat.mechanism}</p>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--green)' }}>
                  <Shield size={10} />
                  <span>{threat.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended actions */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {lang === 'sv' ? 'Rekommenderade åtgärder' : 'Recommended Actions'}
        </h3>
        <div className="space-y-2">
          {assessment.recommendedActions.map((action, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--text2)]">
              <CheckCircle2 size={12} className="text-[var(--green)] mt-0.5 shrink-0" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Contribute Tab (EFI ForestWard Observatory data contribution) ─────────────

interface ContributeTabProps {
  lang: string;
  consent: boolean;
  lastContributed: string | null;
  loading: boolean;
  saving: boolean;
  onToggle: () => void;
}

function ContributeTab({ lang, consent, lastContributed, loading, saving, onToggle }: ContributeTabProps) {
  const isEn = lang !== 'sv';

  const dataPoints = isEn ? [
    'Anonymised parcel boundary (GeoJSON polygon)',
    'Parcel area in hectares',
    'Latest beetle risk level (LOW / MODERATE / HIGH / CRITICAL)',
    'Date of most recent survey',
    'Species composition if recorded',
    'Country code (SE) and provider attribution (BeetleSense)',
  ] : [
    'Anonymiserad fastighetsgräns (GeoJSON-polygon)',
    'Fastighetsareal i hektar',
    'Senaste barkborrerisnivå (LOW / MODERATE / HIGH / CRITICAL)',
    'Datum för senaste inventering',
    'Trädsladssammansättning om registrerad',
    'Landskod (SE) och leverantörsbeteckning (BeetleSense)',
  ];

  return (
    <div className="space-y-5">
      {/* Why contribute */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--green)' }}>
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-1">
              {isEn ? 'Support European Forest Monitoring' : 'Stöd europeisk skogsmiljöövervakning'}
            </h2>
            <p className="text-xs text-[var(--text2)]">
              {isEn
                ? "EFI's ForestWard Observatory (grant G-01-2026) is a pan-European network that tracks forest health, bark beetle outbreaks, and biodiversity. By contributing your anonymised parcel data you help researchers and land managers across Europe make better decisions."
                : 'EFIs ForestWard Observatory (bidrag G-01-2026) är ett paneuropeiskt nätverk som spårar skogshälsa, barkborreutbrott och biologisk mångfald. Genom att bidra med dina anonymiserade fastighetsdata hjälper du forskare och skogsägare i hela Europa att fatta bättre beslut.'}
            </p>
          </div>
        </div>

        {/* What is shared */}
        <div className="rounded-lg border border-[var(--border)] p-4 mb-4" style={{ background: 'var(--bg2)' }}>
          <h3 className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
            <Shield size={12} className="text-[var(--green)]" />
            {isEn ? 'What data is shared' : 'Vilka uppgifter delas'}
          </h3>
          <ul className="space-y-1">
            {dataPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--text2)]">
                <CheckCircle2 size={10} className="text-[var(--green)] mt-0.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-[var(--text3)] mt-3 pt-2 border-t border-[var(--border)]">
            {isEn
              ? 'Your name, contact details, and exact location coordinates are never shared. Data is attributed to BeetleSense as provider, not to individual users.'
              : 'Ditt namn, kontaktuppgifter och exakta positionskoordinater delas aldrig. Data tillskrivs BeetleSense som leverantör, inte enskilda användare.'}
          </p>
        </div>

        {/* Consent toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex-1 pr-4">
            <p className="text-xs font-semibold text-[var(--text)]">
              {isEn
                ? 'Contribute my anonymised parcel data to EFI ForestWard Observatory'
                : 'Bidra med mina anonymiserade fastighetsdata till EFI ForestWard Observatory'}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {isEn
                ? 'Data is exported weekly. You can withdraw consent at any time.'
                : 'Data exporteras varje vecka. Du kan återkalla samtycket när som helst.'}
            </p>
          </div>
          <button
            onClick={onToggle}
            disabled={loading || saving}
            aria-pressed={consent}
            className="flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ color: consent ? 'var(--green)' : 'var(--text3)' }}
          >
            {saving ? (
              <Loader2 size={24} className="animate-spin" />
            ) : consent ? (
              <ToggleRight size={36} />
            ) : (
              <ToggleLeft size={36} />
            )}
          </button>
        </div>
      </div>

      {/* Contribution status */}
      {consent && (
        <div className="rounded-xl border border-[var(--green)] p-5" style={{ background: 'rgba(74,222,128,0.04)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)' }}>
              <Upload size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">
                {isEn ? 'Contribution status' : 'Bidragsstatus'}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {lastContributed
                  ? (isEn ? `Your data was last contributed on ${lastContributed}` : `Dina data bidrog senast ${lastContributed}`)
                  : (isEn
                      ? 'Not yet contributed — your data will be included in the next weekly export (every Monday).'
                      : 'Ännu inte bidragit — dina data inkluderas i nästa veckoexport (varje måndag).')}
              </p>
            </div>
          </div>

          {/* EFI ForestWard Observer badge */}
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green)', color: 'white' }}>
              <Award size={20} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                {isEn ? 'EFI ForestWard Observer' : 'EFI ForestWard-observatör'}
              </p>
              <p className="text-[10px] text-[var(--text2)]">
                {isEn
                  ? 'Thank you for contributing to European forest biodiversity research. Grant reference: G-01-2026.'
                  : 'Tack för ditt bidrag till europeisk forskning om skogsbiologisk mångfald. Referens: G-01-2026.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EFI contact */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
        <p className="text-[10px] text-[var(--text3)]">
          {isEn
            ? 'For questions about the EFI ForestWard Observatory programme or data use, contact: '
            : 'För frågor om EFI ForestWard Observatory-programmet eller dataanvändning, kontakta: '}
          <a href="mailto:grants@efi.int" className="underline" style={{ color: 'var(--green)' }}>grants@efi.int</a>
        </p>
      </div>
    </div>
  );
}
