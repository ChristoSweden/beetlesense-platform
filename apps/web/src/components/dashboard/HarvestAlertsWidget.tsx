import { useState, useEffect } from 'react';
import { TreePine, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getHarvestNotifications,
  type HarvestNotification,
  type BBox,
} from '@/services/skogsstyrelsenService';

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  slutavverkning: { label: 'Final felling', color: '#ef4444' },
  kalavverkning: { label: 'Clear-cut', color: '#ef4444' },
  gallring: { label: 'Thinning', color: '#fbbf24' },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function HarvestAlertsWidget() {
  const [notifications, setNotifications] = useState<HarvestNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BBox covering Värnamo / Småland area
    const bbox: BBox = [13.5, 56.8, 15.5, 57.5];
    getHarvestNotifications(bbox)
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <TreePine size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Nearby Harvest Activity</span>
        </div>
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-lg bg-[var(--bg3)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TreePine size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Nearby Harvest Activity</span>
        </div>
        <span className="text-[10px] bg-[var(--bg3)] text-[var(--text2)] px-2 py-0.5 rounded-full font-mono">
          {notifications.length} nearby
        </span>
      </div>

      <p className="text-[10px] text-[var(--text3)] mb-2">
        Registered harvest notifications from Skogsstyrelsen within 25 km
      </p>

      {/* Notification list */}
      <div className="space-y-1.5">
        {notifications.slice(0, 5).map(n => {
          const method = METHOD_LABELS[n.method] || { label: n.method, color: '#94a3b8' };
          return (
            <div
              key={n.id}
              className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--bg3)] transition-colors cursor-default"
              style={{ background: 'var(--bg3)' }}
            >
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ background: method.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text)] truncate">
                    {n.municipality}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${method.color}20`, color: method.color }}
                  >
                    {method.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={8} />
                    {n.area_ha} ha {n.species}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Calendar size={8} />
                    {formatDate(n.registeredDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {notifications.length > 5 && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-[var(--text3)]">
            +{notifications.length - 5} more notifications
          </span>
        </div>
      )}

      {/* Source attribution */}
      <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-[9px] text-[var(--text3)] opacity-60">
          Source: Skogsstyrelsen WFS
        </span>
        <Link
          to="/owner/neighbor-activity"
          className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5 font-medium"
        >
          View map <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  );
}
