/**
 * Route prefetching utility.
 * Warms the chunk cache by calling import() on likely next routes
 * when the user hovers or focuses on navigation links.
 */

const prefetchedRoutes = new Set<string>();

// Map of route paths to their dynamic import functions.
// Add entries here for routes you want to support prefetching.
const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/owner/dashboard': () => import('@/pages/owner/DashboardPage'),
  '/owner/parcels': () => import('@/pages/owner/ParcelsPage'),
  '/owner/surveys': () => import('@/pages/owner/SurveysPage'),
  '/owner/reports': () => import('@/pages/owner/ReportsPage'),
  '/owner/capture': () => import('@/pages/owner/CapturePage'),
  '/owner/alerts': () => import('@/pages/owner/AlertsPage'),
  '/owner/news': () => import('@/pages/owner/NewsPage'),
  '/owner/settings': () => import('@/pages/owner/SettingsPage'),
  '/pilot/dashboard': () => import('@/pages/pilot/PilotDashboardPage'),
  '/pilot/jobs': () => import('@/pages/pilot/JobBoardPage'),
  '/pilot/earnings': () => import('@/pages/pilot/EarningsPage'),
  '/inspector/dashboard': () => import('@/pages/inspector/InspectorDashboardPage'),
  '/inspector/surveys': () => import('@/pages/inspector/InspectorSurveysPage'),
  '/inspector/reports': () => import('@/pages/inspector/InspectorReportsPage'),
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Prefetch a route's JS chunk. Debounced to 150ms to avoid
 * excessive prefetching during rapid mouse movement.
 */
export function prefetchRoute(path: string): void {
  if (prefetchedRoutes.has(path)) return;

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const importFn = routeImportMap[path];
    if (importFn) {
      prefetchedRoutes.add(path);
      importFn().catch(() => {
        // Silently fail — the chunk will load normally on navigation
        prefetchedRoutes.delete(path);
      });
    }
  }, 150);
}

/**
 * Returns onMouseEnter and onFocus handlers that trigger prefetching.
 * Usage: <Link to="/owner/dashboard" {...prefetchHandlers('/owner/dashboard')}>
 */
export function prefetchHandlers(path: string) {
  return {
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
  };
}
