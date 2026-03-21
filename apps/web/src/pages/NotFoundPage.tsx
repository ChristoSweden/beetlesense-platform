import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreePine, Compass, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const dashboardPath = user ? '/owner/dashboard' : '/';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'var(--bg, #030d05)',
      }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full blur-[160px]"
          style={{ background: 'rgba(74, 222, 128, 0.06)' }}
        />
      </div>

      <main
        className="relative max-w-md w-full text-center animate-[fadeSlideUp_0.5s_ease-out_both]"
        role="main"
      >
        {/* Forest illustration cluster */}
        <div className="flex items-end justify-center gap-3 mb-8" aria-hidden="true">
          <TreePine
            size={32}
            className="opacity-30"
            style={{ color: 'var(--text3, #5a8a62)' }}
          />
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--surface, #0f2212)',
              border: '1px solid var(--border, rgba(74, 222, 128, 0.12))',
            }}
          >
            <Compass size={36} style={{ color: 'var(--green, #4ade80)' }} />
          </div>
          <TreePine
            size={28}
            className="opacity-20"
            style={{ color: 'var(--text3, #5a8a62)' }}
          />
        </div>

        {/* Error code badge */}
        <span
          className="inline-block text-xs font-mono tracking-widest px-3 py-1 rounded-full mb-6"
          style={{
            color: 'var(--text3, #5a8a62)',
            background: 'var(--surface, #0f2212)',
            border: '1px solid var(--border, rgba(74, 222, 128, 0.12))',
          }}
        >
          404 &middot; UI-003
        </span>

        {/* Headline */}
        <h1
          className="text-3xl sm:text-4xl font-serif font-bold mb-3"
          style={{ color: 'var(--text, #e8f5e9)' }}
        >
          {t('errors.notFound', 'Lost in the forest?')}
        </h1>

        {/* Description */}
        <p
          className="text-sm sm:text-base leading-relaxed mb-10 max-w-xs mx-auto"
          style={{ color: 'var(--text2, #a3c9a8)' }}
        >
          {t(
            'errors.notFoundMessage',
            "The page you're looking for doesn't exist or has been moved.",
          )}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Primary CTA */}
          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              background: 'var(--green, #4ade80)',
              color: 'var(--bg, #030d05)',
              // @ts-expect-error CSS custom property for focus ring offset
              '--tw-ring-offset-color': 'var(--bg, #030d05)',
              '--tw-ring-color': 'var(--green, #4ade80)',
            }}
          >
            Go to Dashboard
            <ArrowRight size={16} />
          </Link>

          {/* Secondary CTA */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              color: 'var(--text2, #a3c9a8)',
              background: 'var(--surface, #0f2212)',
              border: '1px solid var(--border, rgba(74, 222, 128, 0.12))',
              // @ts-expect-error CSS custom property for focus ring offset
              '--tw-ring-offset-color': 'var(--bg, #030d05)',
              '--tw-ring-color': 'var(--green, #4ade80)',
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </main>

      {/* Keyframe animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
