import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Bug,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Sparkles,
  Menu,
  Globe,
} from 'lucide-react';

export function TopBar() {
  const { profile, signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'sv' : 'en');
  };

  return (
    <header
      className="flex items-center justify-between h-[var(--topbar-height)] px-4 lg:px-6 border-b border-[var(--border)] flex-shrink-0"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="lg:hidden p-2 rounded-lg text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo — mobile only */}
        <div className="flex lg:hidden items-center gap-2">
          <Bug size={20} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">BeetleSense</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* AI Companion toggle */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)]
            hover:bg-[var(--green)]/15 transition-colors"
          title={t('nav.companion')}
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          title={t('common.language')}
        >
          <Globe size={18} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          title={t('common.notifications')}
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--amber)] rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-[var(--green)]">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text3)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] shadow-2xl z-50 overflow-hidden"
              style={{ background: 'var(--surface)' }}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {profile?.full_name ?? 'User'}
                </p>
                <p className="text-xs text-[var(--text3)] truncate">{profile?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(`/${profile?.role ?? 'owner'}/settings`);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(`/${profile?.role ?? 'owner'}/settings`);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <Settings size={16} />
                  {t('common.settings')}
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-[var(--border)] py-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--bg3)] transition-colors"
                >
                  <LogOut size={16} />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
