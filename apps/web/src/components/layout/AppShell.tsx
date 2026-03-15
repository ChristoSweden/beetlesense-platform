import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from '@/lib/offlineSync';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { IOSInstallGuide } from '@/components/pwa/IOSInstallGuide';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-widest">
          Loading
        </span>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <OfflineBanner />
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[var(--mobile-nav-height)] lg:pb-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <MobileNav />
        </div>
      </div>

      {/* PWA Install Prompts */}
      <InstallPrompt />
      <IOSInstallGuide />
    </div>
  );
}
