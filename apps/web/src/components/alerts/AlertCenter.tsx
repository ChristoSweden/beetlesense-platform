import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles,
  Check,
  ChevronRight,
  X,
} from 'lucide-react';


// ─── Icon Map ───

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  BEETLE_SEASON: Bug,
  STORM_WARNING: CloudLightning,
  NDVI_DROP: TrendingDown,
  HARVEST_WINDOW: TreePine,
  FROST_RISK: Snowflake,
  DROUGHT_STRESS: Droplets,
  REGULATORY_DEADLINE: FileText,
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function groupByDate(alerts: Alert[]): Map<string, Alert[]> {
  const groups = new Map<string, Alert[]>();
  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

  for (const alert of alerts) {
    const date = new Date(alert.created_at).toLocaleDateString();
    let label: string;
    if (date === today) label = 'Today';
    else if (date === yesterday) label = 'Yesterday';
    else label = new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const existing = groups.get(label) ?? [];
    existing.push(alert);
    groups.set(label, existing);
  }

  return groups;
}

// ─── AlertCard ───

function AlertCard({
  alert,
  onMarkRead,
  onAskAi,
}: {
  alert: Alert;
  onMarkRead: (id: string) => void;
  onAskAi: (alert: Alert) => void;
}) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[alert.category] ?? Bell;
  const severityColor = SEVERITY_COLORS[alert.severity] ?? '#4ade80';
  const severityBg = SEVERITY_BG[alert.severity] ?? 'rgba(74, 222, 128, 0.1)';

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors cursor-pointer group ${
        alert.is_read ? 'opacity-70' : ''
      }`}
      style={{ background: alert.is_read ? 'transparent' : 'var(--bg3)' }}
      onClick={() => !alert.is_read && onMarkRead(alert.id)}
      role="article"
      aria-label={`${alert.severity} alert: ${alert.title}${!alert.is_read ? ' (unread)' : ''}`}
    >
      {/* Severity strip + icon */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0" aria-hidden="true">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: severityBg }}
        >
          <Icon size={16} style={{ color: severityColor }} />
        </div>
        <div
          className="w-1 flex-1 rounded-full min-h-[8px]"
          style={{ background: severityColor, opacity: 0.4 }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--text)] leading-tight">
            <span className="sr-only">{alert.severity}: </span>
            {alert.title}
          </p>
          {!alert.is_read && (
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: severityColor }} aria-hidden="true" />
          )}
        </div>

        <p className="text-[11px] text-[var(--text2)] mt-1 leading-relaxed line-clamp-2">
          {alert.message}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-[var(--text3)]">
            {formatRelativeTime(alert.created_at)}
          </span>
          {alert.parcel_name && (
            <span className="text-[10px] text-[var(--text3)] bg-[var(--bg2)] px-1.5 py-0.5 rounded">
              {alert.parcel_name}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi(alert);
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Ask AI about: ${alert.title}`}
          >
            <Sparkles size={10} aria-hidden="true" />
            {t('alerts.askAi')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AlertCenter (Bell + Dropdown) ───

export function AlertCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleAskAi = (alert: Alert) => {
    setOpen(false);
    // Navigate to companion with alert context
    const rolePrefix = '/' + (alert.user_id === 'demo-user' ? 'owner' : 'owner');
    navigate(`${rolePrefix}/dashboard`, {
      state: { companionPrompt: `Tell me more about this alert: "${alert.title}" - ${alert.message}` },
    });
  };

  const recentAlerts = alerts.slice(0, 8);
  const grouped = groupByDate(recentAlerts);

  return (
    <div className="relative" ref={panelRef} data-tour="alerts">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        title={t('alerts.title')}
        aria-label={`${t('alerts.title')}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] rounded-xl border border-[var(--border)] shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)' }}
          role="region"
          aria-label="Notifications"
          aria-live="polite"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('alerts.title')}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-[10px] font-medium text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
                >
                  <Check size={12} />
                  {t('alerts.markAllRead')}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
                aria-label="Close notifications"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={24} className="text-[var(--text3)] mb-2" />
                <p className="text-xs text-[var(--text3)]">{t('alerts.noAlerts')}</p>
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {Array.from(grouped.entries()).map(([dateLabel, dateAlerts]) => (
                  <div key={dateLabel}>
                    <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider px-2 mb-1">
                      {dateLabel}
                    </p>
                    <div className="space-y-1">
                      {dateAlerts.map((alert) => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          onMarkRead={markAsRead}
                          onAskAi={handleAskAi}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-2.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/owner/alerts');
                }}
                className="flex items-center justify-center gap-1 w-full text-xs font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
              >
                {t('alerts.viewAll')}
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
