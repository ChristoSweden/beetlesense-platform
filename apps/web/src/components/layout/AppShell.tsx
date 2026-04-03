import { Suspense, useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LeftRail } from './LeftRail';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav5Tab } from './BottomNav5Tab';
import { OfflineBanner } from '@/lib/offlineSync';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { IOSInstallGuide } from '@/components/pwa/IOSInstallGuide';
import { FieldModeLayout } from '@/components/field/FieldModeLayout';
import { useFieldModeStore } from '@/stores/fieldModeStore';
import { ProductTour } from '@/components/tour/ProductTour';
import { SkipToContent } from '@/components/a11y/SkipToContent';
import { EmergencyFAB } from '@/components/emergency/EmergencyButton';
import { EmergencyFlow } from '@/components/emergency/EmergencyFlow';
import { CommandPalette } from '@/components/ux/CommandPalette';
import { DailyCheckIn } from '@/components/ux/DailyCheckIn';
import { ContextualActions } from '@/components/ux/ContextualActions';

function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-widest">
          {t('common.loading')}
        </span>
      </div>
    </div>
  );
}

export function AppShell() {
  const { isFieldMode } = useFieldModeStore();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const location = useLocation();

  const toggleMobileSidebar = useCallback(() => {
    setShowMobileSidebar((prev) => !prev);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!showMobileSidebar) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMobileSidebar(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMobileSidebar]);

  // When Field Mode is active, render the dedicated field layout
  if (isFieldMode) {
    return <FieldModeLayout />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Skip navigation — first focusable element (WCAG 2.4.1) */}
      <SkipToContent />

      <OfflineBanner />
      {/* Left Rail — desktop only */}
      <aside className="hidden lg:flex lg:flex-shrink-0" role="navigation" aria-label="Main navigation">
        <LeftRail />
      </aside>

      {/* Mobile sidebar drawer */}
      {showMobileSidebar && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden animate-slide-in-left"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <Sidebar />
          </aside>
        </>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuToggle={toggleMobileSidebar} />

        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto overflow-x-hidden pb-[var(--mobile-nav-height)] lg:pb-0"
          tabIndex={-1}
        >
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <BottomNav5Tab />
        </div>
      </div>

      {/* PWA Install Prompts */}
      <InstallPrompt />
      <IOSInstallGuide />

      {/* Product Tour */}
      <ProductTour />

      {/* Emergency "Something's Wrong" button + flow */}
      <EmergencyFAB />
      <EmergencyFlow />

      {/* UX: Command palette (Cmd+K), Daily check-in, Contextual quick actions */}
      <CommandPalette />
      <DailyCheckIn />
      <ContextualActions />
    </div>
  );
}
