import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';

const STORAGE_KEY = 'beetlesense-install-dismissed';
const VISIT_KEY = 'beetlesense-visit-count';
const DISMISS_DAYS = 7;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissDate = new Date(dismissedAt);
      const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    // Listen for beforeinstallprompt
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;

      // Show after 2nd visit or after 30 seconds
      if (visits >= 2) {
        setShow(true);
      } else {
        const timer = setTimeout(() => setShow(true), 30000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);

    // Show after 30s even on first visit if prompt is available
    const fallbackTimer = setTimeout(() => {
      if (deferredPromptRef.current) setShow(true);
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      setShow(false);
    }
    deferredPromptRef.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-[var(--mobile-nav-height)] lg:bottom-0 left-0 right-0 z-30 p-3 lg:p-4">
      <div className="max-w-lg mx-auto rounded-xl border border-[var(--green)]/30 bg-[var(--bg2)] shadow-2xl shadow-black/40 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-[var(--green)]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--text)]">
            Install BeetleSense
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            Get offline access and a faster experience
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
