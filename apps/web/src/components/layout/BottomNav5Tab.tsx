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
        
        if (tab.isCenter) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative -top-6 flex flex-col items-center justify-center pointer-events-auto group"
            >
              <div 
                className={`
                  flex items-center justify-center w-16 h-16 rounded-2xl shadow-2xl transition-all duration-500
                  ${isActive ? 'bg-[#006b2a] rotate-[15deg] scale-110' : 'bg-stone-900 group-hover:bg-stone-800'}
                `}
                style={{
                  boxShadow: isActive ? '0 12px 24px rgba(0, 107, 42, 0.4)' : '0 8px 16px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="text-white relative transition-transform duration-500 group-hover:scale-110">
                  {tab.icon}
                  {!isActive && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
              </div>
              <span 
                className={`
                  font-['Manrope'] text-[10px] font-extrabold uppercase tracking-[0.15em] mt-2 transition-colors duration-300
                  ${isActive ? 'text-[#006b2a]' : 'text-stone-500'}
                `}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className="flex flex-col items-center justify-center h-full px-2 group relative"
          >
            <div className={`
              flex flex-col items-center gap-1 transition-all duration-300
              ${isActive ? 'text-[#006b2a]' : 'text-stone-440 group-hover:text-stone-600'}
            `}>
              <div className="relative">
                <div className={`
                  absolute inset-0 bg-[#006b2a]/10 rounded-full scale-0 transition-transform duration-300
                  ${isActive ? 'scale-[2.5]' : ''}
                `} />
                <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
                  {tab.icon}
                </div>
                {tab.badge && tab.badge > 0 && (
                  <span className={`
                    absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-stone-50 transition-colors
                    ${isActive ? 'bg-red-500' : 'bg-stone-300'}
                  `} />
                )}
              </div>
              <span className={`
                font-['Manrope'] text-[9px] font-bold uppercase tracking-wider transition-all
                ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}
              `}>
                {tab.label}
              </span>
            </div>
            {isActive && (
              <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#006b2a]" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
