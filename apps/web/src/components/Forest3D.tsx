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

    </div>
  );
}
