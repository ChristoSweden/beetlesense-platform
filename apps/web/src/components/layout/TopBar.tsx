import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Bug,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Sparkles,
  Menu,
} from 'lucide-react';
import { AlertCenter } from '@/components/alerts/AlertCenter';
import { FieldModeToggle } from '@/components/field/FieldModeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageSelector from '@/components/common/LanguageSelector';
import { CommandPaletteTrigger } from '@/components/ux/CommandPalette';
import { StreakBadge } from '@/components/ux/DailyCheckIn';
import { isSupabaseConfigured } from '@/lib/supabase';

export function TopBar() {
  const { profile, signOut } = useAuthStore();
  const { t, i18n: _i18n } = useTranslation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  const isDemoMode = !isSupabaseConfigured;

  const DEMO_ROLES = [
    { key: 'owner', label: t('nav.demoRoleOwner'), path: '/owner/dashboard' },
    { key: 'pilot', label: t('nav.demoRolePilot'), path: '/pilot/dashboard' },
    { key: 'inspector', label: t('nav.demoRoleInspector'), path: '/inspector/dashboard' },
    { key: 'admin', label: t('nav.demoRoleAdmin'), path: '/owner/dashboard' },
  ] as const;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setShowRoleSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu on Escape
  useEffect(() => {
    if (!showUserMenu) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUserMenu]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
          {isDemoMode && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20">
              DEMO
            </span>
          )}
        </div>

        {/* Command palette trigger — desktop */}
        <CommandPaletteTrigger />

        {/* Demo role switcher */}
        {isDemoMode && (
          <div className="relative" ref={roleSwitcherRef}>
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-dashed border-[var(--amber)]/30 text-[var(--amber)] hover:bg-[var(--amber)]/5 transition-colors"
            >
              <span className="px-1 py-0.5 rounded bg-[var(--amber)]/15 text-[8px] font-bold uppercase tracking-wider">Demo</span>
              <span className="hidden sm:inline">
                {DEMO_ROLES.find(r => r.key === (profile?.role ?? 'owner'))?.label ?? t('nav.demoRoleOwner')}
              </span>
              <ChevronDown size={10} className={`transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {showRoleSwitcher && (
              <div
                className="absolute left-0 top-full mt-1.5 w-40 rounded-lg border border-[var(--border)] shadow-xl z-50 py-1 overflow-hidden"
                style={{ background: 'var(--surface)' }}
              >
                {DEMO_ROLES.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => {
                      setShowRoleSwitcher(false);
                      navigate(role.path);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      profile?.role === role.key
                        ? 'text-[var(--green)] bg-[var(--green)]/5 font-medium'
                        : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Field Mode toggle — owner only */}
        {(profile?.role === 'owner' || profile?.role === 'admin') && (
          <FieldModeToggle />
        )}

        {/* AI Companion toggle */}
        <button
          data-tour="companion"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)]
            hover:bg-[var(--green)]/15 transition-colors"
          aria-label={t('nav.companion') + ' — Open AI assistant'}
          title={t('nav.companion')}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Theme toggle */}
        <ThemeToggle size="compact" />

        {/* Language selector */}
        <LanguageSelector compact />

        {/* Streak badge */}
        <StreakBadge />

        {/* Notifications */}
        <NotificationBell />
        <AlertCenter />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label="User menu"
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
              role="menu"
              aria-label="User menu"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {profile?.full_name ?? t('common.user')}
                </p>
                <p className="text-xs text-[var(--text3)] truncate">{profile?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1" role="none">
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(`/${profile?.role ?? 'owner'}/settings`);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <User size={16} aria-hidden="true" />
                  {t('common.profile')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate(`/${profile?.role ?? 'owner'}/settings`);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <Settings size={16} aria-hidden="true" />
                  {t('common.settings')}
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-[var(--border)] py-1" role="none">
                <button
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--bg3)] transition-colors"
                >
                  <LogOut size={16} aria-hidden="true" />
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
