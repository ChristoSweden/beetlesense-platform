import { useOfflineSync } from '../../hooks/useOfflineSync';

// ─── Styles (inline to avoid external deps) ───

const pulseKeyframes = `
@keyframes bs-pulse-sync {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes bs-flash-synced {
  0% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}
`;

interface OfflineIndicatorProps {
  /** Compact mode for mobile — shorter text, smaller padding. */
  compact?: boolean;
  /** Custom class name for the container. */
  className?: string;
}

export function OfflineIndicator({
  compact = false,
  className = '',
}: OfflineIndicatorProps) {
  const { isOnline, pendingCount, isSyncing, justReconnected } =
    useOfflineSync();

  // Nothing to show when online and no recent reconnection
  if (isOnline && !justReconnected && !isSyncing) return null;

  // Just reconnected — show green "Synkad" flash
  if (isOnline && justReconnected && !isSyncing && pendingCount === 0) {
    return (
      <>
        <style>{pulseKeyframes}</style>
        <div
          role="status"
          aria-live="polite"
          className={className}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: compact ? '0.25rem 0.75rem' : '0.5rem 1rem',
            backgroundColor: 'rgba(34, 197, 94, 0.95)',
            color: '#fff',
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 600,
            animation: 'bs-flash-synced 2s ease-out forwards',
          }}
        >
          <SyncedIcon />
          Synkad
        </div>
      </>
    );
  }

  // Syncing — pulse animation
  if (isSyncing) {
    return (
      <>
        <style>{pulseKeyframes}</style>
        <div
          role="status"
          aria-live="polite"
          className={className}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: compact ? '0.25rem 0.75rem' : '0.5rem 1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.95)',
            color: '#fff',
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 600,
            animation: 'bs-pulse-sync 1.5s ease-in-out infinite',
          }}
        >
          <SyncingIcon />
          {compact
            ? `Synkar ${pendingCount}...`
            : `Synkroniserar ${pendingCount} ${pendingCount === 1 ? 'ändring' : 'ändringar'}...`}
        </div>
      </>
    );
  }

  // Offline banner
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: compact ? '0.25rem 0.75rem' : '0.5rem 1rem',
          backgroundColor: 'rgba(245, 158, 11, 0.95)',
          color: '#1a1a1a',
          fontSize: compact ? '0.7rem' : '0.75rem',
          fontWeight: 600,
        }}
      >
        <OfflineIcon />
        <span>
          {compact
            ? 'Offline'
            : 'Du är offline \u2014 ändringar sparas lokalt'}
        </span>
        {pendingCount > 0 && (
          <span
            style={{
              marginLeft: '0.25rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              fontSize: '0.65rem',
            }}
          >
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  return null;
}

// ─── Inline SVG Icons (no lucide dependency) ───

function OfflineIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function SyncingIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function SyncedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default OfflineIndicator;
