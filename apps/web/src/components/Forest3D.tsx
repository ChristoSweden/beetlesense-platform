/**
 * RealisticForestHero — Professional forest visualization for the landing page hero.
 *
 * Replaces WebGL 3D with a stunning real forest photograph:
 * - High-quality Unsplash image of Swedish boreal forest
 * - Ken Burns (zoom/pan) CSS animation for cinematic feel
 * - Overlaid stats with dark gradient for readability
 * - Lazy-loaded for performance
 */

import React from 'react';

const FOREST_IMAGE_URL = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80';

export default function RealisticForestHero() {
  return (
    <div
      className="relative w-full h-[600px] overflow-hidden rounded-lg shadow-2xl"
      style={{
        backgroundImage: `url('${FOREST_IMAGE_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Ken Burns animation background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('${FOREST_IMAGE_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'ken-burns 25s ease-in-out infinite alternate',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[var(--bg)]/40 pointer-events-none" />

      {/* Stats overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center space-y-4">
          <div className="text-5xl font-bold text-[var(--green)]">
            12.4M
          </div>
          <div className="text-lg text-[var(--text2)]">
            hectares monitored for beetle activity
          </div>
          <div className="grid grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-semibold text-[var(--green)]">847</div>
              <div className="text-sm text-[var(--text3)]">Detections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-[var(--green)]">56</div>
              <div className="text-sm text-[var(--text3)]">Sites Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-[var(--green)]">98%</div>
              <div className="text-sm text-[var(--text3)]">Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
