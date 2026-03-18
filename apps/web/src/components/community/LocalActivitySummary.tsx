import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageCircle, AlertTriangle, Wrench, ChevronRight } from 'lucide-react';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';

/**
 * LocalActivitySummary - compact widget for the dashboard sidebar
 * showing community highlights near the user's area.
 */
export function LocalActivitySummary() {
  const { t } = useTranslation();
  const { posts, isLoading } = useCommunityFeed({ county: 'Kronoberg' });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 bg-[var(--bg3)] rounded" />
          <div className="h-3 w-full bg-[var(--bg3)] rounded" />
          <div className="h-3 w-3/4 bg-[var(--bg3)] rounded" />
        </div>
      </div>
    );
  }

  // Compute summary stats from the last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentPosts = posts.filter((p) => new Date(p.created_at).getTime() >= oneWeekAgo);
  const alertCount = recentPosts.filter((p) => p.type === 'alert').length;
  const offerCount = recentPosts.filter((p) => p.type === 'offer' || p.type === 'request').length;
  const totalActivity = recentPosts.length;

  if (totalActivity === 0) return null;

  const summaryItems: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (alertCount > 0) {
    summaryItems.push({
      icon: <AlertTriangle size={13} />,
      text: t('community.summary.alertsNearby', { count: alertCount }),
      color: '#fbbf24',
    });
  }

  if (offerCount > 0) {
    summaryItems.push({
      icon: <Wrench size={13} />,
      text: t('community.summary.servicesAvailable', { count: offerCount }),
      color: '#a78bfa',
    });
  }

  if (summaryItems.length === 0) {
    summaryItems.push({
      icon: <MessageCircle size={13} />,
      text: t('community.summary.postsThisWeek', { count: totalActivity }),
      color: '#4ade80',
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#4ade8015', color: '#4ade80' }}
          >
            <MessageCircle size={14} />
          </div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('community.summary.title')}
          </h3>
        </div>
        <Link
          to="/owner/community"
          className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5"
        >
          {t('owner.dashboard.viewAll')}
          <ChevronRight size={10} />
        </Link>
      </div>

      <div className="space-y-2">
        {summaryItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span style={{ color: item.color }}>{item.icon}</span>
            <span className="text-xs text-[var(--text2)]">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
