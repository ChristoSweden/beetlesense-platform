/**
 * Haptic feedback utility for mobile devices.
 * Uses the Vibration API — no-op on desktop or unsupported browsers.
 */

type HapticIntensity = 'light' | 'medium' | 'heavy';

const VIBRATION_MAP: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: [30, 10, 50],
};

/**
 * Trigger a haptic vibration if supported by the device.
 * Safe to call anywhere — silently no-ops on desktop.
 */
export function triggerHaptic(type: HapticIntensity = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    navigator.vibrate(VIBRATION_MAP[type]);
  } catch {
    // Silently ignore — some browsers list vibrate but throw on call
  }
}
