import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotificationStore,
  type NotificationCategory,
  type Notification,
} from '@/stores/notificationStore';
import {
  Bell,
  Bug,
  Camera,
  FileCheck,
  Users,
  Sparkles,
  Settings,
  CheckCheck,
  X,
} from 'lucide-react';

// ─── Icon Map ───

const ICON_MAP: Record<string, typeof Bell> = {
  Bug,
  Camera,
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
  alerts: 'Alert',
  permits: 'Permit',
  surveys: 'Survey',
  community: 'Community',
  system: 'System',
};

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
  return `${days}d ago`;
}

// ─── Notification Row ───

function NotificationRow({
  notification,
  onAction,
}: {
  notification: Notification;
  onAction: (n: Notification) => void;
}) {
  const Icon =
    (notification.icon && ICON_MAP[notification.icon]) ||
    CATEGORY_ICON[notification.category] ||
    Bell;
  const color = CATEGORY_COLOR[notification.category] ?? '#4ade80';

  return (
    <button
      onClick={() => onAction(notification)}
      className="w-full flex gap-3 p-3 rounded-lg text-left transition-colors hover:bg-emerald-950/40 group"
      style={{
        background: notification.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.04)',
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
        style={{ background: `${color}15` }}
      >
        <Icon size={16} style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs font-semibold leading-tight line-clamp-1 ${
              notification.is_read ? 'text-emerald-100/50' : 'text-emerald-50'
            }`}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
              style={{ background: color }}
            />
          )}
        </div>
        <p className="text-[11px] text-emerald-100/40 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {CATEGORY_LABEL[notification.category]}
          </span>
          <span className="text-[10px] text-emerald-100/30">
            {timeAgo(notification.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── NotificationBell ───

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    subscribe,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch on mount + subscribe to real-time updates
  useEffect(() => {
    fetchNotifications();
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [fetchNotifications, subscribe]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.action_url) {
      setOpen(false);
      navigate(n.action_url);
    }
  };

  const recentItems = notifications.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-emerald-100/50 hover:text-emerald-100/80 hover:bg-emerald-900/30 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] rounded-xl border border-emerald-800/40 shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ background: '#071a0b' }}
          role="region"
          aria-label="Notifications"
          aria-live="polite"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-800/30">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-50">Notifications</h3>
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/owner/notifications');
                }}
                className="p-1.5 rounded-md text-emerald-100/40 hover:text-emerald-100/70 hover:bg-emerald-900/40 transition-colors"
                title="Notification settings"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-emerald-100/40 hover:text-emerald-100/70 hover:bg-emerald-900/40 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={28} className="text-emerald-100/20 mb-3" />
                <p className="text-xs text-emerald-100/30">No notifications yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {recentItems.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onAction={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-emerald-800/30 px-4 py-2.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/owner/notifications');
                }}
                className="flex items-center justify-center gap-1 w-full text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
