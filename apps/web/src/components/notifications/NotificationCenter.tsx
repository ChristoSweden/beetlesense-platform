import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotificationStore,
  SUBTYPE_DISPLAY,
  type NotificationCategory,
  type Notification,
  type NotificationSubtype,
} from '@/stores/notificationStore';
import {
  Bell,
  Bug,
  Camera,
  Cpu,
  FileCheck,
  Users,
  Sparkles,
  Check,
  CheckCheck,
  X,
  Filter,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Constants ───

const ICON_MAP: Record<string, typeof Bell> = {
  Bug,
  Camera,
  Cpu,
  FileCheck,
  Users,
  Sparkles,
  Bell,
};

const CATEGORY_ICON: Record<NotificationCategory, typeof Bell> = {
  alerts: Bug,
  permits: FileCheck,
  surveys: Camera,
  community: Users,
  system: Sparkles,
};

const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  alerts: '#ef4444',
  permits: '#a78bfa',
  surveys: '#4ade80',
  community: '#60a5fa',
  system: '#f59e0b',
};

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  alerts: 'Alerts',
  permits: 'Permits',
  surveys: 'Surveys',
  community: 'Community',
  system: 'System',
};

type TabKey = 'all' | NotificationCategory;
type ReadFilter = 'all' | 'unread' | 'read';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'permits', label: 'Permits' },
  { key: 'surveys', label: 'Surveys' },
  { key: 'community', label: 'Community' },
  { key: 'system', label: 'System' },
];

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Swipeable Notification Card ───

function NotificationCard({
  notification,
  onMarkRead,
  onDismiss,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const subtype = notification.metadata?.subtype as NotificationSubtype | undefined;
  const subtypeDisplay = subtype ? SUBTYPE_DISPLAY[subtype] : undefined;
  const Icon =
    (subtypeDisplay?.icon && ICON_MAP[subtypeDisplay.icon]) ||
    (notification.icon && ICON_MAP[notification.icon]) ||
    CATEGORY_ICON[notification.category] ||
    Bell;
  const color = subtypeDisplay?.color ?? CATEGORY_COLOR[notification.category] ?? '#4ade80';

  // Touch swipe state
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    touchCurrentX.current = e.touches[0].clientX;
    const delta = touchCurrentX.current - touchStartX.current;
    // Only allow left swipe
    if (delta < 0) {
      setOffsetX(Math.max(delta, -120));
    }
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offsetX < -80) {
      // Dismiss threshold reached
      setOffsetX(-400);
      setTimeout(() => onDismiss(notification.id), 200);
    } else {
      setOffsetX(0);
    }
  }, [offsetX, onDismiss, notification.id]);

  const handleClick = () => {
    if (!notification.is_read) onMarkRead(notification.id);
    if (notification.action_url) onNavigate(notification.action_url);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Dismiss background */}
      <div className="absolute inset-0 flex items-center justify-end px-6 bg-red-500/20 rounded-xl">
        <X size={20} className="text-red-400" />
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        className={`relative flex gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
          notification.is_read
            ? 'border-emerald-800/20 bg-[#030d05]'
            : 'border-emerald-800/40 bg-emerald-950/40'
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="article"
        aria-label={`${notification.category}: ${notification.title}`}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold leading-tight ${
                notification.is_read ? 'text-emerald-100/50' : 'text-emerald-50'
              }`}
            >
              {notification.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-emerald-100/30">
                {timeAgo(notification.created_at)}
              </span>
              {!notification.is_read && (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-emerald-100/40 mt-1 leading-relaxed line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `${color}15`, color }}
            >
              {CATEGORY_LABEL[notification.category]}
            </span>

            {notification.action_url && (
              <span className="text-[10px] font-medium text-emerald-400">
                View details
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="p-1.5 rounded-lg text-emerald-100/30 hover:text-emerald-400 hover:bg-emerald-900/40 transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(notification.id);
            }}
            className="p-1.5 rounded-lg text-emerald-100/30 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NotificationCenter ───

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    subscribe,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [fetchNotifications, subscribe]);

  // Apply filters
  const filtered = notifications.filter((n) => {
    if (activeTab !== 'all' && n.category !== activeTab) return false;
    if (readFilter === 'unread' && n.is_read) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-emerald-50 flex items-center gap-2">
            <Bell size={20} className="text-emerald-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 min-w-[22px] h-[22px] flex items-center justify-center px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-xs text-emerald-100/40 mt-1">
            Stay updated on alerts, surveys, and activity
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/30 transition-colors"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const tabColor =
            tab.key !== 'all'
              ? CATEGORY_COLOR[tab.key as NotificationCategory]
              : undefined;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-white'
                  : 'text-emerald-100/40 hover:text-emerald-100/70 hover:bg-emerald-900/30'
              }`}
              style={
                isActive && tabColor
                  ? { background: `${tabColor}30`, color: tabColor }
                  : undefined
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Read/Unread Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-emerald-100/30" />
        {(['all', 'unread', 'read'] as ReadFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setReadFilter(f)}
            className={`text-xs font-medium transition-colors ${
              readFilter === f
                ? 'text-emerald-400'
                : 'text-emerald-100/30 hover:text-emerald-100/50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications"
          description={
            readFilter === 'unread'
              ? 'You are all caught up!'
              : 'Nothing here yet. Notifications will appear as events occur.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={markAsRead}
              onDismiss={dismiss}
              onNavigate={(url) => navigate(url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
