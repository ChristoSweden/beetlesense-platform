import type { ReactNode } from 'react';

/* ─── Shimmer block ─── */
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--border2)]/40 ${className}`}
      aria-hidden="true"
    />
  );
}

/* ─── Variants ─── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Page title */}
      <Shimmer className="h-8 w-48" />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-28" />
        ))}
      </div>

      {/* Chart + side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Shimmer className="h-72 lg:col-span-2" />
        <Shimmer className="h-72" />
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Shimmer className="h-48" />
        <Shimmer className="h-48" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Shimmer className="h-4 w-40" />

      {/* Title + actions */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-64" />
        <Shimmer className="h-10 w-32" />
      </div>

      {/* Hero / map area */}
      <Shimmer className="h-64" />

      {/* Detail rows */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Title + search bar */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-10 w-64" />
      </div>

      {/* Filter bar */}
      <Shimmer className="h-10 w-full" />

      {/* List items */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Shimmer key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Title */}
      <Shimmer className="h-8 w-48" />

      {/* Map area */}
      <Shimmer className="h-[60vh]" />

      {/* Legend / controls */}
      <div className="flex gap-4">
        <Shimmer className="h-10 w-32" />
        <Shimmer className="h-10 w-32" />
        <Shimmer className="h-10 w-32" />
      </div>
    </div>
  );
}

/* ─── Public API ─── */

export type PageSkeletonVariant = 'dashboard' | 'detail' | 'list' | 'map';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
}

const variants: Record<PageSkeletonVariant, () => ReactNode> = {
  dashboard: DashboardSkeleton,
  detail: DetailSkeleton,
  list: ListSkeleton,
  map: MapSkeleton,
};

export function PageSkeleton({ variant = 'dashboard' }: PageSkeletonProps) {
  const Variant = variants[variant];
  return (
    <div role="status" aria-label="Loading page content">
      <span className="sr-only">Loading...</span>
      <Variant />
    </div>
  );
}
