import { Radio } from 'lucide-react';
import { LiveWeatherObservationWidget } from './LiveWeatherObservation';
import { SatelliteStatusWidget } from './SatelliteStatusWidget';
import { HarvestAlertsWidget } from './HarvestAlertsWidget';
import { ForestHealthIndicatorWidget } from './ForestHealthIndicatorWidget';

/**
 * Live Data Panel — container for all open data integrations.
 *
 * Displays real-time data from:
 * - SMHI (live weather observations, no key needed)
 * - Sentinel-2 (satellite pass status and NDVI)
 * - Skogsstyrelsen (harvest notifications via WFS)
 * - Global Forest Watch (tree cover loss alerts)
 *
 * Each widget handles its own loading, error states, and data fetching.
 */
export function LiveDataPanel() {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8060' }}
          />
          <Radio size={14} className="text-[var(--green)]" />
        </div>
        <h2 className="text-sm font-bold text-[var(--text)]">Live Open Data</h2>
        <span className="text-[10px] text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          4 sources
        </span>
      </div>

      <p className="text-[10px] text-[var(--text3)] -mt-2">
        Real-time data from SMHI, ESA Sentinel-2, Skogsstyrelsen, and Global Forest Watch
      </p>

      {/* Aggregated health indicator at top */}
      <ForestHealthIndicatorWidget />

      {/* Live weather from SMHI observation station */}
      <LiveWeatherObservationWidget />

      {/* Sentinel-2 satellite status */}
      <SatelliteStatusWidget />

      {/* Nearby harvest notifications */}
      <HarvestAlertsWidget />
    </div>
  );
}
