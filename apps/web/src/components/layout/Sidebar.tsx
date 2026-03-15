import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  TreePine,
  Scan,
  FileBarChart,
  Settings,
  Briefcase,
  Wallet,
  ClipboardCheck,
  Bug,
  Newspaper,
  Eye,
  Camera,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function getNavItems(role: UserRole, t: (key: string) => string): NavItem[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        { to: '/owner/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
        { to: '/owner/parcels', label: t('nav.parcels'), icon: <TreePine size={20} /> },
        { to: '/owner/surveys', label: t('nav.surveys'), icon: <Scan size={20} /> },
        { to: '/owner/capture', label: t('nav.capture'), icon: <Camera size={20} /> },
        { to: '/owner/vision', label: t('nav.vision'), icon: <Eye size={20} /> },
        { to: '/owner/news', label: t('nav.news'), icon: <Newspaper size={20} /> },
        { to: '/owner/reports', label: t('nav.reports'), icon: <FileBarChart size={20} /> },
        { to: '/owner/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
      ];
    case 'pilot':
      return [
        { to: '/pilot/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
        { to: '/pilot/jobs', label: t('nav.jobs'), icon: <Briefcase size={20} /> },
        { to: '/pilot/earnings', label: t('nav.earnings'), icon: <Wallet size={20} /> },
        { to: '/pilot/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
      ];
    case 'inspector':
      return [
        {
          to: '/inspector/dashboard',
          label: t('nav.dashboard'),
          icon: <LayoutDashboard size={20} />,
        },
        { to: '/inspector/surveys', label: t('nav.surveys'), icon: <ClipboardCheck size={20} /> },
        { to: '/inspector/reports', label: t('nav.reports'), icon: <FileBarChart size={20} /> },
        { to: '/inspector/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
      ];
    default:
      return [];
  }
}

export function Sidebar() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const role = profile?.role ?? 'owner';
  const navItems = getNavItems(role, t);

  return (
    <nav
      className="flex flex-col w-[var(--sidebar-width)] h-full border-r border-[var(--border)]"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--topbar-height)] border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)]">
          <Bug size={18} className="text-[var(--green)]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--text)] tracking-tight">
            BeetleSense
          </span>
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">
            {role}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 relative
                ${
                  isActive
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
              {item.label}
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center">
            <span className="text-xs font-semibold text-[var(--green)]">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? profile?.email?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text)] truncate">
              {profile?.full_name ?? profile?.email ?? 'User'}
            </p>
            <p className="text-[10px] text-[var(--text3)] truncate">
              {profile?.organization ?? profile?.email ?? ''}
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
