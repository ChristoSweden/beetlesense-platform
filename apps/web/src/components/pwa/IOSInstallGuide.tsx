import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

const STORAGE_KEY = 'beetlesense-ios-guide-hidden';

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIOS && isSafari && !isStandalone;
}

export function IOSInstallGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;
    const hidden = localStorage.getItem(STORAGE_KEY);
    if (hidden) return;

    // Show after a brief delay
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (permanent: boolean) => {
    setShow(false);
    if (permanent) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden mb-safe">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-serif font-bold text-[var(--text)]">
            Add to Home Screen
          </h3>
          <button
            onClick={() => handleDismiss(false)}
            className="text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-5 text-xs text-[var(--text3)] mb-4">
          Install BeetleSense on your iPhone for the best experience with offline access.
        </p>

        {/* Steps */}
        <div className="px-5 space-y-4 mb-5">
          <Step
            number={1}
            icon={<Share size={16} className="text-blue-400" />}
            title="Tap the Share button"
            description="Find it at the bottom of Safari (square with arrow pointing up)"
          />
          <Step
            number={2}
            icon={<PlusSquare size={16} className="text-[var(--green)]" />}
            title='Tap "Add to Home Screen"'
            description="Scroll down in the share sheet to find this option"
          />
          <Step
            number={3}
            icon={
              <div className="w-4 h-4 rounded bg-[var(--green)] flex items-center justify-center text-[8px] font-bold text-[var(--bg)]">
                B
              </div>
            }
            title='Tap "Add"'
            description="BeetleSense will appear on your home screen"
          />
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => handleDismiss(false)}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            Got it
          </button>
          <button
            onClick={() => handleDismiss(true)}
            className="w-full py-2 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-xs font-mono text-[var(--text3)]">
        {number}
      </div>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div>
          <p className="text-xs font-medium text-[var(--text)]">{title}</p>
          <p className="text-[10px] text-[var(--text3)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
