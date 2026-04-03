import { NavLink, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Sparkles, Users, Camera } from 'lucide-react';
import type { ReactNode } from 'react';

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
  iconSize?: number;
  badge?: number;
  isCenter?: boolean;
}

const tabs: Tab[] = [
  { to: '/owner/status', label: 'Status', icon: <Shield size={20} /> },
  { to: '/owner/threats', label: 'Threats', icon: <AlertTriangle size={20} />, badge: 3 },
  { to: '/owner/wingman', label: 'Wingman', icon: <Sparkles size={24} />, isCenter: true },
  { to: '/owner/forum', label: 'Community', icon: <Users size={20} />, badge: 2 },
  { to: '/owner/contribute', label: 'Contribute', icon: <Camera size={20} /> },
];

export function BottomNav5Tab() {
  const location = useLocation();

  return (
    <nav
      className="flex items-stretch border-t border-[var(--border)]"
      style={{
        background: 'var(--bg2)',
        height: 'var(--mobile-nav-height)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const isActive =
          location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 relative
              transition-colors duration-150
              ${isActive ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
            `}
          >
            {/* Active pill indicator */}
            {isActive && (
              <div
                className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--green)]"
                style={{ width: 16, height: 4 }}
              />
            )}

            {/* Icon wrapper */}
            <div className="relative">
              {tab.isCenter ? (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'var(--green-wash)',
                  }}
                >
                  {tab.icon}
                </div>
              ) : (
                tab.icon
              )}

              {/* Badge dot */}
              {tab.badge && tab.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: 'var(--risk-high)',
                  }}
                />
              )}
            </div>

            <span
              className="font-medium"
              style={{ fontSize: 10, fontFamily: 'var(--font-sans)' }}
            >
              {tab.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
