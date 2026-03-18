import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useFieldModeStore } from '@/stores/fieldModeStore';
import { useNetworkStatus } from '@/lib/offlineSync';
import { prepareFieldModeCache, type CacheProgress } from '@/lib/cacheManager';

export function FieldModeToggle() {
  const { t } = useTranslation();
  const { isFieldMode, enableFieldMode, disableFieldMode, cacheReady } =
    useFieldModeStore();
  const { isOnline } = useNetworkStatus();
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState(0);

  const handleToggle = useCallback(async () => {
    if (isFieldMode) {
      disableFieldMode();
      return;
    }

    // If cache is already prepared, go straight to field mode
    if (cacheReady) {
      enableFieldMode();
      return;
    }

    // Prepare cache before entering field mode
    setIsPreparing(true);
    setPrepareProgress(0);

    try {
      await prepareFieldModeCache((progress: CacheProgress) => {
        setPrepareProgress(progress.percent);
      });
      enableFieldMode();
    } catch (err) {
      console.error('Failed to prepare field mode cache:', err);
      // Enter field mode anyway — partial cache is better than none
      enableFieldMode();
    } finally {
      setIsPreparing(false);
    }
  }, [isFieldMode, cacheReady, enableFieldMode, disableFieldMode]);

  return (
    <button
      data-tour="field-mode"
      onClick={handleToggle}
      disabled={isPreparing}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isFieldMode
          ? 'bg-[var(--green)] text-forest-900 shadow-[0_0_12px_rgba(74,222,128,0.3)]'
          : isPreparing
            ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)]'
            : 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)] hover:bg-[var(--green)]/15'
      } disabled:cursor-wait`}
      aria-label={
        isPreparing
          ? `Preparing field mode: ${prepareProgress}%`
          : isFieldMode
            ? t('field.exitFieldMode')
            : `${t('field.fieldMode')} — ${isOnline ? 'Online' : 'Offline'}`
      }
      aria-pressed={isFieldMode}
      title={
        isFieldMode
          ? t('field.exitFieldMode')
          : t('field.fieldMode')
      }
    >
      {/* Connection status dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isOnline ? 'bg-[var(--green)]' : 'bg-[var(--amber)] animate-pulse'
        }`}
        aria-hidden="true"
        style={
          isFieldMode
            ? { background: isOnline ? '#030d05' : '#fbbf24' }
            : undefined
        }
      />

      {isPreparing ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span className="hidden sm:inline">{prepareProgress}%</span>
        </>
      ) : (
        <>
          <Compass size={14} />
          <span className="hidden sm:inline">
            {isFieldMode ? t('field.exitFieldMode') : t('field.fieldMode')}
          </span>
        </>
      )}

      {/* Subtle online/offline icon for non-field mode */}
      {!isFieldMode && !isPreparing && (
        <span className="hidden sm:inline text-[10px] opacity-60">
          {isOnline ? (
            <Wifi size={10} />
          ) : (
            <WifiOff size={10} />
          )}
        </span>
      )}

      {/* Preparing progress bar overlay */}
      {isPreparing && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-[var(--green)] rounded-b-lg transition-all duration-300"
          style={{ width: `${prepareProgress}%` }}
        />
      )}
    </button>
  );
}
