import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export interface DDProject {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };
  mapCount: number;
  createdAt: string;
}

export interface DDMap {
  id: string;
  projectId: string;
  name: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  dateCreated: string;
  areaM2: number;
  resolutionCm: number;
  imageCount: number;
  layers: string[];
  imported: boolean;
  linkedSurveyId: string | null;
}

export interface DDConnection {
  connected: boolean;
  accountName: string | null;
  connectedAt: string | null;
  projectCount: number;
  mapCount: number;
}

// ─── Demo Data ───

const DEMO_PROJECTS: DDProject[] = [
  {
    id: 'dd-proj-1',
    name: 'Norra Skogen — Barkborrekartering',
    description: 'Bark beetle survey over 45 hectares of spruce forest, Jönköping',
    location: { lat: 57.78, lng: 14.16 },
    mapCount: 3,
    createdAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'dd-proj-2',
    name: 'Granudden — Vårinspektion 2026',
    description: 'Spring health inspection using multispectral imagery',
    location: { lat: 57.64, lng: 14.94 },
    mapCount: 2,
    createdAt: '2026-03-01T10:30:00Z',
  },
  {
    id: 'dd-proj-3',
    name: 'Södra Beståndet — Stormskador',
    description: 'Post-storm damage assessment with RGB and thermal',
    location: { lat: 56.88, lng: 14.52 },
    mapCount: 1,
    createdAt: '2026-03-10T14:00:00Z',
  },
];

const DEMO_MAPS: DDMap[] = [
  {
    id: 'dd-map-1',
    projectId: 'dd-proj-1',
    name: 'Ortofoto — 2026-02-15 80m',
    status: 'complete',
    dateCreated: '2026-02-15T12:00:00Z',
    areaM2: 452000,
    resolutionCm: 2.1,
    imageCount: 342,
    layers: ['orthomosaic', 'elevation', 'plant_health', 'ndvi'],
    imported: true,
    linkedSurveyId: 'survey-demo-1',
  },
  {
    id: 'dd-map-2',
    projectId: 'dd-proj-1',
    name: 'Termisk — 2026-02-15 60m',
    status: 'complete',
    dateCreated: '2026-02-15T14:30:00Z',
    areaM2: 452000,
    resolutionCm: 5.4,
    imageCount: 186,
    layers: ['orthomosaic', 'thermal'],
    imported: false,
    linkedSurveyId: null,
  },
  {
    id: 'dd-map-3',
    projectId: 'dd-proj-1',
    name: 'NDVI — 2026-03-01 80m',
    status: 'complete',
    dateCreated: '2026-03-01T09:00:00Z',
    areaM2: 452000,
    resolutionCm: 2.3,
    imageCount: 298,
    layers: ['orthomosaic', 'ndvi', 'plant_health', 'zones'],
    imported: false,
    linkedSurveyId: null,
  },
  {
    id: 'dd-map-4',
    projectId: 'dd-proj-2',
    name: 'Vårflyg — 2026-03-05 60m',
    status: 'complete',
    dateCreated: '2026-03-05T10:00:00Z',
    areaM2: 285000,
    resolutionCm: 1.8,
    imageCount: 256,
    layers: ['orthomosaic', 'elevation', 'plant_health'],
    imported: false,
    linkedSurveyId: null,
  },
  {
    id: 'dd-map-5',
    projectId: 'dd-proj-3',
    name: 'Stormskador — 2026-03-12 50m',
    status: 'processing',
    dateCreated: '2026-03-12T11:00:00Z',
    areaM2: 180000,
    resolutionCm: 1.5,
    imageCount: 198,
    layers: ['orthomosaic'],
    imported: false,
    linkedSurveyId: null,
  },
];

const DEMO_CONNECTION: DDConnection = {
  connected: true,
  accountName: 'BeetleSense Demo',
  connectedAt: '2026-01-10T08:00:00Z',
  projectCount: 3,
  mapCount: 5,
};

// ─── Hook ───

export function useDroneDeploy() {
  const [projects, setProjects] = useState<DDProject[]>([]);
  const [maps, setMaps] = useState<DDMap[]>([]);
  const [connection, setConnection] = useState<DDConnection>({
    connected: false,
    accountName: null,
    connectedAt: null,
    projectCount: 0,
    mapCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        setProjects(DEMO_PROJECTS);
        setMaps(DEMO_MAPS);
        setConnection(DEMO_CONNECTION);
        setLoading(false);
        return;
      }

      // Check if DroneDeploy is connected for this organization
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'dronedeploy')
        .maybeSingle();

      if (!integration) {
        setConnection({
          connected: false,
          accountName: null,
          connectedAt: null,
          projectCount: 0,
          mapCount: 0,
        });
        setLoading(false);
        return;
      }

      setConnection({
        connected: true,
        accountName: integration.account_name ?? 'DroneDeploy',
        connectedAt: integration.created_at,
        projectCount: integration.metadata?.project_count ?? 0,
        mapCount: integration.metadata?.map_count ?? 0,
      });

      // Fetch synced DD maps from local DB
      const { data: ddMaps } = await supabase
        .from('dd_maps')
        .select('*')
        .order('date_created', { ascending: false })
        .limit(100);

      if (ddMaps) {
        // Group into projects by unique project names
        const projectMap = new Map<string, DDProject>();
        const mappedDDMaps: DDMap[] = [];

        for (const m of ddMaps) {
          const projId = m.dd_plan_id ?? m.dd_map_id;
          if (!projectMap.has(projId)) {
            projectMap.set(projId, {
              id: projId,
              name: m.name?.split(' — ')[0] ?? 'Untitled',
              description: '',
              location: m.location ? { lat: 0, lng: 0 } : { lat: 0, lng: 0 },
              mapCount: 0,
              createdAt: m.date_created ?? m.synced_at,
            });
          }
          const proj = projectMap.get(projId)!;
          proj.mapCount++;

          mappedDDMaps.push({
            id: m.dd_map_id,
            projectId: projId,
            name: m.name,
            status: m.status,
            dateCreated: m.date_created,
            areaM2: m.area_m2 ?? 0,
            resolutionCm: m.resolution_cm ?? 0,
            imageCount: m.image_count ?? 0,
            layers: m.available_layers ?? [],
            imported: !!m.imported_at,
            linkedSurveyId: m.linked_survey_id,
          });
        }

        setProjects(Array.from(projectMap.values()));
        setMaps(mappedDDMaps);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Fallback to demo data
      setProjects(DEMO_PROJECTS);
      setMaps(DEMO_MAPS);
      setConnection(DEMO_CONNECTION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /**
   * Initiate the OAuth flow to connect a DroneDeploy account.
   */
  const connectAccount = useCallback(async () => {
    try {
      if (isDemo() || !isSupabaseConfigured) {
        setConnection(DEMO_CONNECTION);
        setProjects(DEMO_PROJECTS);
        setMaps(DEMO_MAPS);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('dronedeploy-webhook', {
        body: { action: 'connect' },
        method: 'POST',
      });

      if (fnError) throw fnError;

      // Redirect to DroneDeploy OAuth page
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  /**
   * Disconnect the DroneDeploy account.
   */
  const disconnectAccount = useCallback(async () => {
    try {
      if (isDemo() || !isSupabaseConfigured) {
        setConnection({
          connected: false,
          accountName: null,
          connectedAt: null,
          projectCount: 0,
          mapCount: 0,
        });
        setProjects([]);
        setMaps([]);
        return;
      }

      await supabase
        .from('integrations')
        .delete()
        .eq('provider', 'dronedeploy');

      setConnection({
        connected: false,
        accountName: null,
        connectedAt: null,
        projectCount: 0,
        mapCount: 0,
      });
      setProjects([]);
      setMaps([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  /**
   * Import a specific DroneDeploy map into BeetleSense.
   */
  const importMap = useCallback(async (
    ddMapId: string,
    parcelId: string,
    surveyId: string,
  ): Promise<boolean> => {
    setImporting(ddMapId);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        // Simulate import in demo mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        setMaps(prev => prev.map(m =>
          m.id === ddMapId ? { ...m, imported: true, linkedSurveyId: surveyId } : m,
        ));
        return true;
      }

      const { error: fnError } = await supabase.functions.invoke('dronedeploy-webhook', {
        body: {
          action: 'import',
          map_id: ddMapId,
          parcel_id: parcelId,
          survey_id: surveyId,
        },
        method: 'POST',
      });

      if (fnError) throw fnError;

      // Update local state
      setMaps(prev => prev.map(m =>
        m.id === ddMapId ? { ...m, imported: true, linkedSurveyId: surveyId } : m,
      ));

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return false;
    } finally {
      setImporting(null);
    }
  }, []);

  /**
   * Trigger a sync to pull latest maps from DroneDeploy.
   */
  const syncMaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const { error: fnError } = await supabase.functions.invoke('dronedeploy-webhook', {
        body: { action: 'sync' },
        method: 'POST',
      });

      if (fnError) throw fnError;

      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const stats = useMemo(() => ({
    totalProjects: projects.length,
    totalMaps: maps.length,
    completeMaps: maps.filter(m => m.status === 'complete').length,
    importedMaps: maps.filter(m => m.imported).length,
    processingMaps: maps.filter(m => m.status === 'processing').length,
    totalAreaHa: Math.round(maps.reduce((sum, m) => sum + m.areaM2, 0) / 10000),
  }), [projects, maps]);

  /**
   * Get maps filtered by project ID.
   */
  const getProjectMaps = useCallback(
    (projectId: string) => maps.filter(m => m.projectId === projectId),
    [maps],
  );

  return {
    // State
    projects,
    maps,
    connection,
    stats,
    loading,
    importing,
    error,

    // Actions
    connectAccount,
    disconnectAccount,
    importMap,
    syncMaps,
    refresh: loadData,

    // Helpers
    getProjectMaps,
  };
}
