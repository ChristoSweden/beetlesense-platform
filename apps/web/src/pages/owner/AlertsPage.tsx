import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAlerts, type Alert } from '@/hooks/useAlerts';
import {
  Bell,
  Bug,
  CloudLightning,
  TrendingDown,
  TreePine,
  Snowflake,
  Droplets,
  FileText,
  ChevronRight,
  Sparkles,
  X,
  Filter,
  Loader2,
  Check,
  CheckCheck,
} from 'lucide-react';
import type { AlertCategory, AlertSeverity } from '@beetlesense/shared';
import { ExportButton } from '@/components/export/ExportButton';

// ─── Constants ───

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  BEETLE_SEASON: Bug,
  STORM_WARNING: CloudLightning,
  NDVI_DROP: TrendingDown,
  HARVEST_WINDOW: TreePine,
  FROST_RISK: Snowflake,
  DROUGHT_STRESS: Droplets,
  REGULATORY_DEADLINE: FileText,
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  BEETLE_SEASON: 'Beetle Season',
  STORM_WARNING: 'Storm Warning',
  NDVI_DROP: 'NDVI Drop',
  HARVEST_WINDOW: 'Harvest Window',
  FROST_RISK: 'Frost Risk',
  DROUGHT_STRESS: 'Drought Stress',
  REGULATORY_DEADLINE: 'Regulatory',
};

const CATEGORY_LABELS_SV: Record<string, string> = {
  BEETLE_SEASON: 'Barkborresäsong',
  STORM_WARNING: 'Stormvarning',
  NDVI_DROP: 'NDVI-nedgång',
  HARVEST_WINDOW: 'Gallringsfönster',
  FROST_RISK: 'Frostrisk',
  DROUGHT_STRESS: 'Torkstress',
  REGULATORY_DEADLINE: 'Regelefterlevnad',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#4ade80',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(239, 68, 68, 0.1)',
  warning: 'rgba(245, 158, 11, 0.1)',
  info: 'rgba(74, 222, 128, 0.1)',
};

// ─── Helpers ───

function formatDateTime(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Recommended Actions ───

const RECOMMENDED_ACTIONS: Record<string, { en: string[]; sv: string[] }> = {
  BEETLE_SEASON: {
    en: [
      'Inspect spruce-dominant parcels for fresh bore dust and resin flow',
      'Schedule a drone survey for early detection',
      'Remove windthrown trees and fresh stumps that attract beetles',
      'Contact Skogsstyrelsen for current risk zone maps',
    ],
    sv: [
      'Inspektera grantunga skiften efter färsk borrmjöl och kådflöde',
      'Boka en drönarsundersökning för tidig detektion',
      'Ta bort stormfällda träd och färska stubbar som lockar barkborrar',
      'Kontakta Skogsstyrelsen för aktuella riskzonskartor',
    ],
  },
  NDVI_DROP: {
    en: [
      'Schedule a close-range inspection of the affected parcel',
      'Compare with previous NDVI images to identify exact affected area',
      'Consider requesting a priority drone survey',
      'Check for signs of drought, disease, or pest damage on-site',
    ],
    sv: [
      'Boka en närinspektion av det påverkade skiftet',
      'Jämför med tidigare NDVI-bilder för att identifiera exakt påverkat område',
      'Överväg att begära en prioriterad drönarsundersökning',
      'Kontrollera tecken på torka, sjukdom eller skadedjur på plats',
    ],
  },
  STORM_WARNING: {
    en: [
      'Wait 2-3 days for satellite imagery update to assess damage',
      'Check for windthrown trees that may attract bark beetles',
      'Report significant damage to your insurance provider',
      'Consider emergency drone survey if damage is suspected',
    ],
    sv: [
      'Vänta 2-3 dagar på uppdaterade satellitbilder för att bedöma skador',
      'Kontrollera om stormfällda träd kan locka barkborrar',
      'Anmäl betydande skador till ditt försäkringsbolag',
      'Överväg en akut drönarsundersökning om skador misstänks',
    ],
  },
  HARVEST_WINDOW: {
    en: [
      'Contact your forestry contractor to plan thinning operations',
      'Review parcel-specific harvest recommendations in your reports',
      'Ensure harvesting notification is filed with Skogsstyrelsen',
    ],
    sv: [
      'Kontakta din skogsentreprenör för att planera gallringsarbete',
      'Granska skiftesspecifika avverkningsrekommendationer i dina rapporter',
      'Säkerställ att avverkningsanmälan är inlämnad till Skogsstyrelsen',
    ],
  },
  FROST_RISK: {
    en: [
      'Postpone planting of new seedlings until frost risk passes',
      'Protect existing young plants with frost covers if possible',
      'Monitor SMHI forecasts for updated frost predictions',
    ],
    sv: [
      'Skjut upp plantering av nya plantor tills frostrisken passerat',
      'Skydda befintliga unga plantor med frostskydd om möjligt',
      'Följ SMHI-prognoser för uppdaterade frostförutsägelser',
    ],
  },
  DROUGHT_STRESS: {
    en: [
      'Monitor spruce stands closely for bark beetle activity',
      'Avoid harvesting operations that could stress remaining trees',
      'Consider thinning to reduce competition for water',
      'Check soil moisture levels on sensitive parcels',
    ],
    sv: [
      'Övervaka granbestånd noga efter barkborrsaktivitet',
      'Undvik avverkningsarbete som kan stressa kvarvarande träd',
      'Överväg gallring för att minska konkurrens om vatten',
      'Kontrollera markfuktigheten på känsliga skiften',
    ],
  },
  REGULATORY_DEADLINE: {
    en: [
      'Review all pending harvesting notifications on Skogsstyrelsen portal',
      'Verify environmental consideration plans are up to date',
      'File any missing documentation before the deadline',
    ],
    sv: [
      'Granska alla väntande avverkningsanmälningar på Skogsstyrelsens portal',
      'Verifiera att miljöhänsynsplaner är uppdaterade',
      'Lämna in eventuell saknad dokumentation före deadline',
    ],
  },
};

// ─── Alert Detail View ───

function AlertDetail({
  alert,
  onClose,
  onDismiss,
  onAskAi,
  lang,
}: {
  alert: Alert;
  onClose: () => void;
  onDismiss: (id: string) => void;
  onAskAi: (alert: Alert) => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[alert.category] ?? Bell;
  const severityColor = SEVERITY_COLORS[alert.severity] ?? '#4ade80';
  const categoryLabels = lang === 'sv' ? CATEGORY_LABELS_SV : CATEGORY_LABELS_EN;
  const actions = RECOMMENDED_ACTIONS[alert.category];
  const actionList = actions ? (lang === 'sv' ? actions.sv : actions.en) : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Header with severity color strip */}
      <div className="h-1" style={{ background: severityColor }} />

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: SEVERITY_BG[alert.severity] }}
            >
              <Icon size={20} style={{ color: severityColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{alert.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: SEVERITY_BG[alert.severity], color: severityColor }}
                >
                  {t(`alerts.severity.${alert.severity}`)}
                </span>
                <span className="text-[10px] text-[var(--text3)]">
                  {categoryLabels[alert.category] ?? alert.category}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-[var(--text2)] leading-relaxed mb-4">{alert.message}</p>

        {/* Metadata */}
        {alert.parcel_name && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">
              {t('alerts.parcel')}:
            </span>
            <Link
              to={`/owner/parcels/${alert.parcel_id}`}
              className="text-xs text-[var(--green)] hover:underline"
            >
              {alert.parcel_name}
            </Link>
          </div>
        )}

        <p className="text-[10px] text-[var(--text3)] mb-4">
          {formatDateTime(alert.created_at, lang)}
        </p>

        {/* Recommended actions */}
        {actionList.length > 0 && (
          <div className="mt-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
              {t('alerts.recommendedActions')}
            </h4>
            <ul className="space-y-2">
              {actionList.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                  <Check size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => onAskAi(alert)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            <Sparkles size={14} />
            {t('alerts.askAiAbout')}
          </button>
          <button
            onClick={() => onDismiss(alert.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={14} />
            {t('alerts.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { alerts, unreadCount, loading, error, markAsRead, markAllAsRead, dismiss, refresh } = useAlerts();
  const lang = i18n.language;

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AlertCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categoryLabels = lang === 'sv' ? CATEGORY_LABELS_SV : CATEGORY_LABELS_EN;

  // Filtered alerts
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterCategory]);

  // Unique categories present in alerts
  const presentCategories = useMemo(() => {
    return [...new Set(alerts.map((a) => a.category))];
  }, [alerts]);

  const handleAskAi = (alert: Alert) => {
    navigate('/owner/dashboard', {
      state: {
        companionPrompt: `Tell me more about this alert: "${alert.title}" - ${alert.message}`,
      },
    });
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    if (!alert.is_read) {
      markAsRead(alert.id);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('alerts.title')}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">{t('alerts.allAlerts')}</h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {unreadCount > 0
              ? t('alerts.unreadCount', { count: unreadCount })
              : t('alerts.noAlerts')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text2)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
            >
              <CheckCheck size={14} />
              {t('alerts.markAllRead')}
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFilters
                ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                : 'text-[var(--text2)] border-[var(--border)] hover:bg-[var(--bg3)]'
            }`}
          >
            <Filter size={14} />
            {t('alerts.filters')}
          </button>
          <ExportButton
            alerts={alerts}
            formats={['csv']}
            filenamePrefix="beetlesense-alerts"
            variant="compact"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex flex-wrap gap-4">
          {/* Severity filter */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
              {t('alerts.severityLabel')}
            </p>
            <div className="flex gap-1">
              {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    filterSeverity === sev
                      ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                      : 'text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
                  }`}
                >
                  {sev === 'all' ? t('alerts.all') : t(`alerts.severity.${sev}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
              {t('alerts.typeLabel')}
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                    : 'text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
                }`}
              >
                {t('alerts.all')}
              </button>
              {presentCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat as AlertCategory)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                      : 'text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
                  }`}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/30 text-xs text-red-400">
          {error}
          <button onClick={() => refresh()} className="ml-2 underline hover:no-underline">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Content: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[var(--green)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
              <Bell size={24} className="mx-auto text-[var(--text3)] mb-2" />
              <p className="text-sm text-[var(--text2)]">{t('alerts.noAlerts')}</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const Icon = CATEGORY_ICONS[alert.category] ?? Bell;
              const severityColor = SEVERITY_COLORS[alert.severity] ?? '#4ade80';
              const isSelected = selectedAlert?.id === alert.id;

              return (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)]'
                  } ${alert.is_read ? 'opacity-70' : ''}`}
                  style={{ background: isSelected ? undefined : 'var(--bg2)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: SEVERITY_BG[alert.severity] }}
                  >
                    <Icon size={16} style={{ color: severityColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--text)] leading-tight truncate">
                        {alert.title}
                      </p>
                      {!alert.is_read && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ background: severityColor }}
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text3)] mt-0.5 truncate">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--text3)]">
                        {formatDateTime(alert.created_at, lang)}
                      </span>
                      {alert.parcel_name && (
                        <span className="text-[10px] text-[var(--text3)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                          {alert.parcel_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Alert detail */}
        <div className="hidden lg:block">
          {selectedAlert ? (
            <AlertDetail
              alert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
              onDismiss={(id) => {
                dismiss(id);
                setSelectedAlert(null);
              }}
              onAskAi={handleAskAi}
              lang={lang}
            />
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center h-full flex flex-col items-center justify-center">
              <Bell size={32} className="text-[var(--text3)] mb-3" />
              <p className="text-sm text-[var(--text2)]">{t('alerts.selectAlert')}</p>
              <p className="text-xs text-[var(--text3)] mt-1">{t('alerts.selectAlertDesc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail (full-width below list on small screens) */}
      {selectedAlert && (
        <div className="lg:hidden mt-4">
          <AlertDetail
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
            onDismiss={(id) => {
              dismiss(id);
              setSelectedAlert(null);
            }}
            onAskAi={handleAskAi}
            lang={lang}
          />
        </div>
      )}
    </div>
  );
}
