import type React from 'react';

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

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="h-8 w-20" />
      <Shimmer className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-8 w-20" />
      </div>
      {/* Chart area */}
      <Shimmer className="h-48" />
    </div>
  );
}

function ListWidgetSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <Shimmer className="h-5 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

function MapPreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <Shimmer className="h-5 w-32" />
      <Shimmer className="h-40 rounded-lg" />
      <div className="flex gap-2">
        <Shimmer className="h-6 w-16 rounded-full" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Public API ─── */

export type WidgetSkeletonVariant = 'stat-card' | 'chart' | 'list' | 'map-preview';

interface WidgetSkeletonProps {
  variant?: WidgetSkeletonVariant;
}

const variants: Record<WidgetSkeletonVariant, () => React.JSX.Element> = {
  'stat-card': StatCardSkeleton,
  chart: ChartSkeleton,
  list: ListWidgetSkeleton,
  'map-preview': MapPreviewSkeleton,
};

export function WidgetSkeleton({ variant = 'stat-card' }: WidgetSkeletonProps) {
  const Variant = variants[variant];
  return (
    <div role="status" aria-label="Loading widget">
      <span className="sr-only">Loading...</span>
      <Variant />
    </div>
  );
}
