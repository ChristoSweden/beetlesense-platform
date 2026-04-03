/**
 * OpenEO Cloud-Based Earth Observation Processing Service
 *
 * OpenEO standard for running analysis on remote servers without downloading raw data.
 * Processes satellite imagery in the cloud and returns results.
 *
 * Backends:
 *   - Copernicus Data Space (CDSE)
 *   - Terrascope (VITO, Belgium)
 *   - EODC (Austria)
 *
 * Spec: https://openeo.org/
 * TODO: Implement OpenID Connect authentication
 */

// ─── Types ───

export interface OpenEOProcess {
  id: string;
  description: string;
  parameters: { name: string; type: string; required: boolean }[];
  returns: string;
}

export interface OpenEOJob {
  id: string;
  status: 'created' | 'queued' | 'running' | 'finished' | 'error';
  created: string;
  updated: string;
  costs?: number;
  title?: string;
  progress?: number;
}

export interface OpenEOBackend {
  id: string;
  title: string;
  url: string;
  description: string;
}

// ─── Source Info ───

export const OPENEO_SOURCE_INFO = {
  name: 'OpenEO Cloud Processing',
  description: 'Run Earth observation analysis on remote cloud backends',
  spec: 'https://openeo.org/',
  backends: 3,
  capability: 'Cloud-side NDVI, change detection, time series analysis',
};

// ─── Backend Registry ───

export const OPENEO_BACKENDS: OpenEOBackend[] = [
  { id: 'cdse', title: 'Copernicus Data Space', url: 'https://openeo.dataspace.copernicus.eu', description: 'ESA Copernicus data processing' },
  { id: 'terrascope', title: 'Terrascope (VITO)', url: 'https://openeo.vito.be', description: 'Belgian EO processing platform' },
  { id: 'eodc', title: 'EODC', url: 'https://openeo.eodc.eu', description: 'Austrian Earth Observation Data Centre' },
];

// ─── Auth Stub ───

/**
 * Authenticate with an OpenEO backend via OpenID Connect.
 * TODO: Implement OIDC flow with backend-specific discovery URLs.
 */
export async function authenticate(_backendUrl: string): Promise<string | null> {
  // TODO: OpenID Connect flow
  // GET {backendUrl}/.well-known/openeo → discover OIDC providers
  // Redirect user for authentication
  return null;
}

// ─── Demo Job Simulation ───

const demoJobs = new Map<string, OpenEOJob>();

function createDemoJob(title: string): OpenEOJob {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: OpenEOJob = {
    id,
    status: 'created',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    title,
    progress: 0,
  };
  demoJobs.set(id, job);

  // Simulate lifecycle: created → queued → running → finished
  setTimeout(() => { job.status = 'queued'; job.updated = new Date().toISOString(); job.progress = 10; }, 500);
  setTimeout(() => { job.status = 'running'; job.updated = new Date().toISOString(); job.progress = 30; }, 1500);
  setTimeout(() => { job.status = 'running'; job.updated = new Date().toISOString(); job.progress = 70; }, 3000);
  setTimeout(() => { job.status = 'finished'; job.updated = new Date().toISOString(); job.progress = 100; }, 5000);

  return job;
}

// ─── Available Processes ───

const DEMO_PROCESSES: OpenEOProcess[] = [
  { id: 'ndvi', description: 'Calculate Normalized Difference Vegetation Index', parameters: [{ name: 'red', type: 'raster-cube', required: true }, { name: 'nir', type: 'raster-cube', required: true }], returns: 'raster-cube' },
  { id: 'evi', description: 'Calculate Enhanced Vegetation Index', parameters: [{ name: 'blue', type: 'raster-cube', required: true }, { name: 'red', type: 'raster-cube', required: true }, { name: 'nir', type: 'raster-cube', required: true }], returns: 'raster-cube' },
  { id: 'reduce_dimension', description: 'Reduce a dimension of a data cube', parameters: [{ name: 'data', type: 'raster-cube', required: true }, { name: 'reducer', type: 'process', required: true }, { name: 'dimension', type: 'string', required: true }], returns: 'raster-cube' },
  { id: 'filter_temporal', description: 'Filter by temporal extent', parameters: [{ name: 'data', type: 'raster-cube', required: true }, { name: 'extent', type: 'temporal-interval', required: true }], returns: 'raster-cube' },
  { id: 'filter_bbox', description: 'Filter by spatial bounding box', parameters: [{ name: 'data', type: 'raster-cube', required: true }, { name: 'extent', type: 'bounding-box', required: true }], returns: 'raster-cube' },
  { id: 'save_result', description: 'Save processing results', parameters: [{ name: 'data', type: 'raster-cube', required: true }, { name: 'format', type: 'string', required: true }], returns: 'file' },
  { id: 'aggregate_temporal_period', description: 'Aggregate by temporal period', parameters: [{ name: 'data', type: 'raster-cube', required: true }, { name: 'period', type: 'string', required: true }, { name: 'reducer', type: 'process', required: true }], returns: 'raster-cube' },
];

// ─── Public API ───

/**
 * List available processing operations on a backend.
 */
export async function listProcesses(_backend: string): Promise<OpenEOProcess[]> {
  await new Promise(r => setTimeout(r, 150));
  return DEMO_PROCESSES;
}

/**
 * Submit a cloud-side NDVI computation job.
 */
export async function submitNDVIJob(
  _backend: string,
  _bbox: [number, number, number, number],
  _dateRange: { start: string; end: string },
): Promise<OpenEOJob> {
  await new Promise(r => setTimeout(r, 200));
  return createDemoJob('NDVI Time Series Computation');
}

/**
 * Submit a cloud-side change detection job.
 */
export async function submitChangeDetection(
  _backend: string,
  _bbox: [number, number, number, number],
  _dateRange1: { start: string; end: string },
  _dateRange2: { start: string; end: string },
): Promise<OpenEOJob> {
  await new Promise(r => setTimeout(r, 200));
  return createDemoJob('Change Detection Analysis');
}

/**
 * Poll job status.
 */
export async function getJobStatus(_backend: string, jobId: string): Promise<OpenEOJob> {
  await new Promise(r => setTimeout(r, 100));
  const job = demoJobs.get(jobId);
  if (job) return { ...job };

  return {
    id: jobId,
    status: 'finished',
    created: new Date(Date.now() - 60000).toISOString(),
    updated: new Date().toISOString(),
    progress: 100,
  };
}

/**
 * Download results of a completed job.
 */
export async function getJobResults(
  _backend: string,
  jobId: string,
): Promise<{ format: string; downloadUrl: string; sizeBytes: number; metadata: Record<string, unknown> }> {
  await new Promise(r => setTimeout(r, 150));

  return {
    format: 'GeoTIFF',
    downloadUrl: `https://openeo.example.com/results/${jobId}/result.tif`,
    sizeBytes: 2_450_000,
    metadata: {
      crs: 'EPSG:32633',
      bbox: [14.3, 56.8, 15.2, 57.3],
      bands: ['ndvi'],
      temporalExtent: ['2025-01-01', '2025-12-31'],
    },
  };
}
