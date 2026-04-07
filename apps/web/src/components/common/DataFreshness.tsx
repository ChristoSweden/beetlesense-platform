/**
 * DataFreshness — tiny indicator showing data recency and source
 *
 * Displays:
 * - "Live data" with green dot (real mode + fresh)
 * - "Updated 5 min ago" (cached)
 * - "Demo data" with info icon (demo mode)
 * - "Offline — showing cached data" (offline)
 */

import { useState, useEffect } from 'react';
import { Info, Wifi, WifiOff, Circle } from 'lucide-react';
import { getConnectionState } from '@/services/connectionStatus';

interface DataFreshnessProps {
  isDemo: boolean;
  lastUpdated: Date | null;
  error?: string | null;
  className?: string;
}

function formatAge(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DataFreshness({ isDemo, lastUpdated, error, className = '' }: DataFreshnessProps) {
  const [, setTick] = useState(0);
  const connectionState = getConnectionState();

  // Re-render every 30 seconds to update "X min ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Offline state
  if (connectionState === 'disconnected') {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-[var(--amber)] ${className}`}>
        <WifiOff size={10} />
        <span>Offline — cached data</span>
      </span>
    );
  }

  // Demo mode
  if (isDemo) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-[var(--amber)] ${className}`}>
        <Info size={10} />
        <span>Demo data</span>
      </span>
    );
  }

  // Error with fallback
  if (error && lastUpdated) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-[var(--amber)] ${className}`}>
        <Wifi size={10} />
        <span>Updated {formatAge(lastUpdated)}</span>
      </span>
    );
  }

  // Live and fresh
  if (lastUpdated) {
    const ageMs = Date.now() - lastUpdated.getTime();
    const isFresh = ageMs < 5 * 60 * 1000; // less than 5 min

    if (isFresh) {
      return (
        <span className={`inline-flex items-center gap-1 text-[10px] text-[#4ade80] ${className}`}>
          <Circle size={6} fill="currentColor" />
          <span>Live data</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-[var(--text3)] ${className}`}>
        <Circle size={6} fill="currentColor" className="text-[var(--text3)]" />
        <span>Updated {formatAge(lastUpdated)}</span>
      </span>
    );
  }

  // No data yet / unconfigured
  return null;
}
