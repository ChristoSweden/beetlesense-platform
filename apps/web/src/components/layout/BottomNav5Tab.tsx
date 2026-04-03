import { NavLink, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Sparkles, Users, Camera } from 'lucide-react';
import type { ReactNode } from 'react';

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  isCenter?: boolean;
}

const tabs: Tab[] = [
  { to: '/owner/status', label: 'Status', icon: <Shield size={20} /> },
  { to: '/owner/threats', label: 'Threats', icon: <AlertTriangle size={20} />, badge: 3 },
  { to: '/owner/wingman', label: 'Wingman', icon: <Sparkles size={22} />, isCenter: true },
  { to: '/owner/forum', label: 'Community', icon: <Users size={20} />, badge: 2 },
  { to: '/owner/contribute', label: 'Contribute', icon: <Camera size={20} /> },
];

export function BottomNav5Tab() {
  const location = useLocation();

  return (
    <nav
      className="flex items-center justify-around rounded-t-[32px] bg-stone-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      style={{
        height: 80,
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
            className="flex flex-col items-center justify-center"
          >
            {isActive ? (
              <div className="flex items-center gap-2 bg-[#006b2a] text-white rounded-full px-5 py-2">
                <div className="relative">
                  {tab.icon}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                  )}
                </div>
                <span className="font-['Manrope'] text-[11px] font-semibold uppercase tracking-wider">
                  {tab.label}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5 text-stone-500 p-2">
                <div className="relative">
                  {tab.icon}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <span className="font-['Manrope'] text-[11px] font-semibold uppercase tracking-wider mt-0.5">
                  {tab.label}
                </span>
              </div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
