/**
 * Admin Feedback Panel — live feed from Supabase feedback table.
 * Filterable by category/rating/date/route.
 * Mark reviewed or escalate.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Filter, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Frown, Meh, Smile } from 'lucide-react';
import { captureWithCode } from '@/lib/sentry';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  rating: number;
  category: string;
  message: string | null;
  route: string;
  app_version: string;
  device_type: string;
  reviewed: boolean;
  escalated: boolean;
  created_at: string;
}

const RATING_ICONS: Record<number, { icon: typeof Frown; color: string }> = {
  1: { icon: Frown, color: 'text-red-400' },
  2: { icon: Meh, color: 'text-[var(--amber)]' },
  3: { icon: Smile, color: 'text-[var(--green)]' },
};

export default function FeedbackPanelPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      if (filterRating !== 'all') query = query.eq('rating', parseInt(filterRating));

      const { data, error } = await query;
      if (error) {
        captureWithCode(error, 'FEED-003');
        return;
      }
      setFeedback(data || []);
    } catch (e) {
      captureWithCode(e, 'FEED-003');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterRating]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
        setFeedback((prev) => [payload.new as FeedbackItem, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleReview = async (id: string) => {
    await supabase.from('feedback').update({ reviewed: true }).eq('id', id);
    setFeedback((prev) => prev.map((f) => f.id === id ? { ...f, reviewed: true } : f));
  };

  const handleEscalate = async (id: string) => {
    await supabase.from('feedback').update({ escalated: true }).eq('id', id);
    setFeedback((prev) => prev.map((f) => f.id === id ? { ...f, escalated: true } : f));
  };

  // Sentiment trend (simple counts)
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  feedback.forEach((f) => {
    if (f.rating === 3) sentimentCounts.positive++;
    else if (f.rating === 2) sentimentCounts.neutral++;
    else sentimentCounts.negative++;
  });
  const total = feedback.length || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text)]">Feedback Panel</h1>
        <button onClick={fetchFeedback} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text3)] transition hover:border-[var(--border2)] hover:text-[var(--text)]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Sentiment Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Smile className="h-5 w-5 text-[var(--green)]" />
            <span className="text-xs text-[var(--text3)] uppercase">Positive</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)] font-mono">{sentimentCounts.positive}</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-[var(--green)] transition-all" style={{ width: `${(sentimentCounts.positive / total) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Meh className="h-5 w-5 text-[var(--amber)]" />
            <span className="text-xs text-[var(--text3)] uppercase">Neutral</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)] font-mono">{sentimentCounts.neutral}</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-[var(--amber)] transition-all" style={{ width: `${(sentimentCounts.neutral / total) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Frown className="h-5 w-5 text-red-400" />
            <span className="text-xs text-[var(--text3)] uppercase">Negative</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)] font-mono">{sentimentCounts.negative}</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${(sentimentCounts.negative / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-[var(--text3)]" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]">
          <option value="all">All Categories</option>
          <option value="bug">🐛 Bug</option>
          <option value="idea">💡 Idea</option>
          <option value="confusion">🤔 Confusion</option>
          <option value="compliment">🌟 Compliment</option>
        </select>
        <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]">
          <option value="all">All Ratings</option>
          <option value="1">😞 Negative</option>
          <option value="2">😐 Neutral</option>
          <option value="3">😊 Positive</option>
        </select>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--green)]" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <MessageSquare className="h-10 w-10 text-[var(--text3)]" />
          <p className="text-sm text-[var(--text3)]">No feedback yet. Feedback from users will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => {
            const RatingIcon = RATING_ICONS[item.rating]?.icon || Meh;
            const ratingColor = RATING_ICONS[item.rating]?.color || 'text-[var(--text3)]';
            return (
              <div key={item.id} className={`rounded-xl border bg-[var(--bg2)] p-4 transition ${item.escalated ? 'border-[var(--amber)]' : item.reviewed ? 'border-[var(--border)] opacity-60' : 'border-[var(--border)]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <RatingIcon className={`h-5 w-5 ${ratingColor}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs rounded-md bg-[var(--surface)] px-2 py-0.5 text-[var(--text3)]">{item.category}</span>
                        <span className="text-xs text-[var(--text3)]">{item.route}</span>
                        <span className="text-xs text-[var(--text3)]">{item.device_type}</span>
                      </div>
                      {item.message && <p className="mt-1 text-sm text-[var(--text)]">{item.message}</p>}
                      <p className="mt-1 text-xs text-[var(--text3)]">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!item.reviewed && (
                      <button onClick={() => handleReview(item.id)} title="Mark reviewed" className="rounded-lg p-1.5 text-[var(--text3)] transition hover:bg-[var(--surface)] hover:text-[var(--green)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {!item.escalated && (
                      <button onClick={() => handleEscalate(item.id)} title="Escalate" className="rounded-lg p-1.5 text-[var(--text3)] transition hover:bg-[var(--surface)] hover:text-[var(--amber)]">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
