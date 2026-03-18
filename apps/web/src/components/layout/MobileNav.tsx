import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Map,
  BrainCircuit,
  Bell,
  FileBarChart,
  Briefcase,
  Wallet,
  ClipboardCheck,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface MobileNavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function getMobileNavItems(role: UserRole, t: (key: string) => string): MobileNavItem[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        { to: '/owner/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
        { to: '/owner/map', label: t('nav.map'), icon: <Map size={20} /> },
        { to: '/owner/advisor', label: t('nav.advisor'), icon: <BrainCircuit size={20} /> },
        { to: '/owner/alerts', label: t('nav.alerts'), icon: <Bell size={20} /> },
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
        { to: '/inspector/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
        { to: '/inspector/surveys', label: t('nav.surveys'), icon: <ClipboardCheck size={20} /> },
        { to: '/inspector/reports', label: t('nav.reports'), icon: <FileBarChart size={20} /> },
        { to: '/inspector/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
      ];
    default:
      return [];
  }
}

export function MobileNav() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const role = profile?.role ?? 'owner';
  const items = getMobileNavItems(role, t);

  return (
    <nav
      className="flex items-stretch h-[var(--mobile-nav-height)] border-t border-[var(--border)] glass safe-area-pb"
      style={{ background: 'rgba(7, 20, 9, 0.92)', backdropFilter: 'blur(16px)' }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const isActive =
          location.pathname === item.to || location.pathname.startsWith(item.to + '/');
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={`
              flex-1 flex flex-col items-center justify-center gap-1 relative
              transition-colors duration-150
              ${isActive ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
            `}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full bg-[var(--green)]" />
            )}
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
