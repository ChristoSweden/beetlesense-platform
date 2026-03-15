import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreePine, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-6">
      <div className="max-w-md w-full text-center">
        {/* Decorative background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--green)]/3 rounded-full blur-[150px]" />
        </div>

        <div className="relative">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-6">
            <TreePine size={40} className="text-[var(--text3)]" />
          </div>

          <p className="text-6xl font-serif font-bold text-gradient mb-4">404</p>

          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">
            {t('errors.notFound')}
          </h1>
          <p className="text-sm text-[var(--text2)] mb-8">
            {t('errors.notFoundMessage')}
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            <ArrowLeft size={16} />
            {t('errors.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
