/**
 * Floating Feedback Widget — persistent on every screen.
 *
 * Three tiers:
 *  1. Quick emoji rating (😞😐😊)
 *  2. Optional text message + category
 *  3. Optional screenshot (via canvas capture)
 *
 * Stores submissions in Supabase `feedback` table.
 * Tagged with: user_id, route, app_version, timestamp, device_type, category.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquarePlus, X, Send, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { trackFeedbackOpened, trackFeedbackSubmitted } from '@/lib/posthog';
import { captureWithCode } from '@/lib/sentry';

type FeedbackCategory = 'bug' | 'idea' | 'confusion' | 'compliment';
type FeedbackRating = 1 | 2 | 3;
type WidgetState = 'collapsed' | 'emoji' | 'details' | 'submitting' | 'success' | 'error';

const EMOJI_MAP: Record<FeedbackRating, { emoji: string; label: string }> = {
  1: { emoji: '😞', label: 'Not great' },
  2: { emoji: '😐', label: 'Okay' },
  3: { emoji: '😊', label: 'Love it' },
};

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'idea', label: 'Idea', icon: '💡' },
  { value: 'confusion', label: 'Confused', icon: '🤔' },
  { value: 'compliment', label: 'Compliment', icon: '🌟' },
];

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function FeedbackWidget() {
  const [state, setState] = useState<WidgetState>('collapsed');
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const { user } = useAuthStore();

  // Auto-focus textarea when details panel opens
  useEffect(() => {
    if (state === 'details' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  // Auto-dismiss success after 2s
  useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(() => {
        resetWidget();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const resetWidget = useCallback(() => {
    setState('collapsed');
    setRating(null);
    setCategory('idea');
    setMessage('');
    setScreenshotUrl(null);
  }, []);

  const handleOpen = useCallback(() => {
    setState('emoji');
    trackFeedbackOpened();
  }, []);

  const handleEmojiSelect = useCallback((r: FeedbackRating) => {
    setRating(r);
    setState('details');
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      // Use html2canvas-like approach via canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Simple viewport capture placeholder — in production use html2canvas
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#030d05';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4ade80';
      ctx.font = '16px monospace';
      ctx.fillText(`Screenshot of ${location.pathname} at ${new Date().toISOString()}`, 20, 30);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        setScreenshotUrl(url);
      }
    } catch (e) {
      captureWithCode(e, 'FEED-002');
    }
  }, [location.pathname]);

  const handleSubmit = useCallback(async () => {
    if (!rating) return;
    if (!user?.id) {
      // RLS requires authenticated user — show helpful message
      setState('error');
      return;
    }
    setState('submitting');

    try {
      const payload = {
        user_id: user.id,
        rating,
        category,
        message: message.trim() || null,
        screenshot_url: screenshotUrl,
        route: location.pathname,
        app_version: APP_VERSION,
        device_type: getDeviceType(),
        metadata: {
          user_agent: navigator.userAgent,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
          timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase.from('feedback').insert(payload);

      if (error) {
        captureWithCode(error, 'FEED-001', { payload });
        setState('error');
        return;
      }

      trackFeedbackSubmitted(category, rating);
      setState('success');
    } catch (e) {
      captureWithCode(e, 'FEED-001');
      setState('error');
    }
  }, [rating, category, message, screenshotUrl, location.pathname, user]);

  // Don't show on admin routes (admin has its own feedback panel)
  // Actually we DO want it everywhere per spec

  if (state === 'collapsed') {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green)] text-[var(--bg)] shadow-lg transition-all duration-200 ease-out hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] active:scale-95"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-[var(--border2)] bg-[var(--bg2)] shadow-2xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4"
      role="dialog"
      aria-label="Feedback form"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-sm font-semibold text-[var(--text)]">
          {state === 'success' ? 'Thank you!' : state === 'error' ? 'Oops' : 'Send Feedback'}
        </span>
        <button
          onClick={resetWidget}
          className="rounded-lg p-1 text-[var(--text3)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          aria-label="Close feedback"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Success State */}
        {state === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--green)]" />
            <p className="text-sm text-[var(--text2)]">Your feedback helps us improve BeetleSense. Thanks!</p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-[var(--red)]">
              {!user?.id
                ? 'Please sign in to send feedback. (AUTH-004) Log in and try again.'
                : 'We couldn\'t send your feedback. (FEED-001) Try again in a moment.'}
            </p>
            <button
              onClick={() => !user?.id ? window.location.assign('/login') : setState('details')}
              className="rounded-lg bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--bg3)]"
            >
              {!user?.id ? 'Sign in' : 'Try again'}
            </button>
          </div>
        )}

        {/* Submitting State */}
        {state === 'submitting' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--green)]" />
            <p className="text-sm text-[var(--text3)]">Sending...</p>
          </div>
        )}

        {/* Emoji Selection */}
        {state === 'emoji' && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--text2)]">How's your experience?</p>
            <div className="flex gap-4">
              {([1, 2, 3] as FeedbackRating[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleEmojiSelect(r)}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-2xl transition-all duration-200 hover:scale-110 hover:border-[var(--green)] hover:bg-[var(--bg3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] active:scale-95"
                  aria-label={EMOJI_MAP[r].label}
                  title={EMOJI_MAP[r].label}
                >
                  {EMOJI_MAP[r].emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Details Form */}
        {state === 'details' && (
          <div className="flex flex-col gap-3">
            {/* Selected emoji */}
            {rating && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{EMOJI_MAP[rating].emoji}</span>
                <span className="text-xs text-[var(--text3)]">{EMOJI_MAP[rating].label}</span>
              </div>
            )}

            {/* Category */}
            <div className="flex gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCategory(opt.value)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                    category === opt.value
                      ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
                  }`}
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more (optional)..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text3)] transition focus:border-[var(--green)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]"
            />

            {/* Screenshot + Submit */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleScreenshot}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                  screenshotUrl
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:bg-[var(--surface)] hover:text-[var(--text2)]'
                }`}
                title="Attach screenshot"
              >
                <Camera className="h-3.5 w-3.5" />
                {screenshotUrl ? 'Captured' : 'Screenshot'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!rating}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)] active:scale-95 disabled:opacity-50"
              >
                Submit <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackWidget;
