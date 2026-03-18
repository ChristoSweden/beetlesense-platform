import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Activity,
  BarChart3,
  ArrowLeft,
  Bug,
  Shield,
  FileCode2,
  BookOpen,
} from 'lucide-react';
import { Suspense } from 'react';

const adminNavItems = [
  { to: '/admin/dashboard', labelKey: 'nav.adminDashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/admin/users', labelKey: 'nav.adminUsers', icon: <Users size={20} /> },
  { to: '/admin/health', labelKey: 'nav.adminHealth', icon: <Activity size={20} /> },
  { to: '/admin/analytics', labelKey: 'nav.adminAnalytics', icon: <BarChart3 size={20} /> },
  { to: '/admin/api-docs', labelKey: 'nav.adminApiDocs', icon: <FileCode2 size={20} /> },
  { to: '/admin/blog-editor', labelKey: 'nav.adminBlogEditor', icon: <BookOpen size={20} /> },
];

function AdminPageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-widest">Loading</span>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0" role="navigation" aria-label="Admin navigation">
        <nav
          className="flex flex-col w-[var(--sidebar-width)] h-full border-r border-[var(--border)]"
          style={{ background: 'var(--bg2)' }}
        >
          {/* Logo + Admin badge */}
          <div className="flex items-center gap-3 px-5 h-[var(--topbar-height)] border-b border-[var(--border)]">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)]">
              <Bug size={18} className="text-[var(--green)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--text)] tracking-tight">BeetleSense</span>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">admin</span>
            </div>
          </div>

          {/* Admin Mode banner */}
          <div className="mx-3 mt-4 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Shield size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-400">{t('nav.adminMode')}</span>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150 relative
                    ${isActive
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--green)]" />
                  )}
                  <span className={isActive ? 'text-[var(--green)]' : 'text-[var(--text3)] group-hover:text-[var(--text2)]'}>
                    {item.icon}
                  </span>
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </div>

          {/* Back to user view */}
          <div className="px-3 py-3 border-t border-[var(--border)]">
            <button
              onClick={() => navigate('/owner/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-all duration-150"
            >
              <ArrowLeft size={20} className="text-[var(--text3)]" />
              {t('nav.adminBackToUser')}
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-amber-400">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">
                  {profile?.full_name ?? 'Admin'}
                </p>
                <p className="text-[10px] text-[var(--text3)] truncate">
                  {profile?.email ?? ''}
                </p>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile admin banner */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">{t('nav.adminMode')}</span>
          </div>
          <button
            onClick={() => navigate('/owner/dashboard')}
            className="text-xs text-[var(--text2)] hover:text-[var(--text)] flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            {t('nav.adminBackToUser')}
          </button>
        </div>

        {/* Mobile nav tabs */}
        <div className="lg:hidden flex border-b border-[var(--border)] bg-[var(--bg2)] overflow-x-auto">
          {adminNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--green)] text-[var(--green)]'
                    : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {item.icon}
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden" tabIndex={-1}>
          <Suspense fallback={<AdminPageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
