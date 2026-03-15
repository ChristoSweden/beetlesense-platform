import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { ShieldX, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <ShieldX size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)] mb-2">
            {t('errors.forbidden')}
          </h1>
          <p className="text-sm text-[var(--text2)] mb-8">
            {t('errors.forbiddenMessage')}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)] text-sm font-medium hover:bg-[var(--green)]/15 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('errors.goHome')}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
