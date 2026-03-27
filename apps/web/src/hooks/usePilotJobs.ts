/**
 * usePilotJobs — Job lifecycle hook for the pilot job board.
 *
 * For pilots: fetches open jobs sorted by distance, with apply/reject mutations.
 * For owners: fetches their posted jobs with application counts, plus accept/reject.
 * In demo mode: returns realistic mock jobs near Värnamo.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { isDemo } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───

export type PilotJobStatus =
  | 'open'
  | 'applied'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface PilotJob {
  id: string;
  title: string;
  description: string | null;
  parcel_id: string | null;
  survey_id: string | null;
  owner_id: string;
  pilot_id: string | null;
  status: PilotJobStatus;
  fee_sek: number;
  location_lat: number | null;
  location_lng: number | null;
  modules_required: string[];
  deadline: string | null;
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  // Enriched fields
  parcel_name?: string;
  municipality?: string;
  area_ha?: number;
  application_count?: number;
  my_application_status?: ApplicationStatus | null;
  distance_km?: number;
}

export interface PilotApplication {
  id: string;
  job_id: string;
  pilot_id: string;
  message: string | null;
  proposed_fee_sek: number | null;
  status: ApplicationStatus;
  created_at: string;
  pilot_name?: string;
  pilot_rating?: number;
  pilot_completed_missions?: number;
}

interface UsePilotJobsOptions {
  /** 'pilot' shows open jobs; 'owner' shows posted jobs */
  role: 'pilot' | 'owner';
  /** Filter by status */
  statusFilter?: PilotJobStatus[];
  /** Max distance in km (pilot mode) */
  maxDistanceKm?: number;
  /** Pilot's coordinates for distance sorting */
  pilotLocation?: [number, number] | null;
}

// ─── Demo Data ───

const DEMO_PILOT_JOBS: PilotJob[] = [
  {
    id: 'pj-1',
    title: 'Barkborreinventering — Norra Skogen',
    description:
      'Flyguppdrag för Norra Skogen i Värnamo kommun. Fullständig barkborreinventering med RGB och multispektral sensor.',
    parcel_id: 'p1',
    survey_id: 's1',
    owner_id: 'demo-owner-1',
    pilot_id: null,
    status: 'open',
    fee_sek: 9_400,
    location_lat: 57.186,
    location_lng: 14.044,
    modules_required: ['RGB Ortho', 'Multispectral'],
    deadline: '2026-04-01',
    created_at: '2026-03-16T08:30:00Z',
    assigned_at: null,
    completed_at: null,
    parcel_name: 'Norra Skogen',
    municipality: 'Värnamo',
    area_ha: 42.5,
    application_count: 2,
    my_application_status: null,
    distance_km: 8.3,
  },
  {
    id: 'pj-2',
    title: 'Komplett skogsinventering — Tallmon',
    description:
      'Full inventering av Tallmon med LiDAR, multispektral och 3D-modellering. Stort skifte — kräver planering av flera flygningar.',
    parcel_id: 'p2',
    survey_id: 's2',
    owner_id: 'demo-owner-2',
    pilot_id: null,
    status: 'open',
    fee_sek: 15_120,
    location_lat: 57.782,
    location_lng: 14.162,
    modules_required: ['RGB Ortho', 'Multispectral', 'LiDAR', '3D Model'],
    deadline: '2026-04-15',
    created_at: '2026-03-15T14:00:00Z',
    assigned_at: null,
    completed_at: null,
    parcel_name: 'Tallmon',
    municipality: 'Jönköping',
    area_ha: 67.1,
    application_count: 0,
    my_application_status: null,
    distance_km: 45.2,
  },
  {
    id: 'pj-3',
    title: 'Hälsokontroll — Ekbacken',
    description:
      'Snabb hälsokontroll med RGB och termisk sensor. Misstänkt barkborreangrepp i södra delen.',
    parcel_id: 'p3',
    survey_id: 's3',
    owner_id: 'demo-owner-1',
    pilot_id: null,
    status: 'open',
    fee_sek: 4_410,
    location_lat: 57.303,
    location_lng: 13.544,
    modules_required: ['RGB Ortho', 'Thermal'],
    deadline: '2026-03-25',
    created_at: '2026-03-17T10:15:00Z',
    assigned_at: null,
    completed_at: null,
    parcel_name: 'Ekbacken',
    municipality: 'Gislaved',
    area_ha: 18.3,
    application_count: 1,
    my_application_status: null,
    distance_km: 22.7,
  },
  {
    id: 'pj-4',
    title: 'Stormskadekartläggning — Granudden',
    description:
      'Brådskande kartläggning efter stormen Ingvar. Hela skiftet behöver fotograferas för försäkringsärende.',
    parcel_id: 'p4',
    survey_id: 's4',
    owner_id: 'demo-owner-3',
    pilot_id: null,
    status: 'open',
    fee_sek: 7_700,
    location_lat: 57.100,
    location_lng: 14.350,
    modules_required: ['RGB Ortho', '3D Model'],
    deadline: '2026-03-22',
    created_at: '2026-03-18T06:00:00Z',
    assigned_at: null,
    completed_at: null,
    parcel_name: 'Granudden',
    municipality: 'Värnamo',
    area_ha: 31.0,
    application_count: 3,
    my_application_status: null,
    distance_km: 12.1,
  },
  {
    id: 'pj-5',
    title: 'Drönarkartläggning — Björklund',
    description:
      'Rutinmässig kartering av blandskog inför gallring. Standarduppdrag med RGB.',
    parcel_id: 'p5',
    survey_id: 's5',
    owner_id: 'demo-owner-2',
    pilot_id: 'demo-user',
    status: 'assigned',
    fee_sek: 5_900,
    location_lat: 57.250,
    location_lng: 14.200,
    modules_required: ['RGB Ortho'],
    deadline: '2026-04-10',
    created_at: '2026-03-10T12:00:00Z',
    assigned_at: '2026-03-14T09:00:00Z',
    completed_at: null,
    parcel_name: 'Björklund',
    municipality: 'Värnamo',
    area_ha: 25.5,
    application_count: 0,
    my_application_status: 'accepted',
    distance_km: 5.0,
  },
];

const DEMO_APPLICATIONS: PilotApplication[] = [
  {
    id: 'app-1',
    job_id: 'pj-1',
    pilot_id: 'demo-pilot-1',
    message: 'Har erfarenhet av barkborreinventering i Småland. Kan flyga nästa vecka.',
    proposed_fee_sek: 9_000,
    status: 'pending',
    created_at: '2026-03-16T10:00:00Z',
    pilot_name: 'Erik Lindgren',
    pilot_rating: 4.8,
    pilot_completed_missions: 34,
  },
  {
    id: 'app-2',
    job_id: 'pj-1',
    pilot_id: 'demo-pilot-2',
    message: 'DJI Matrice 350 med MicaSense RedEdge. Tillgänglig direkt.',
    proposed_fee_sek: null,
    status: 'pending',
    created_at: '2026-03-16T14:30:00Z',
    pilot_name: 'Anna Svensson',
    pilot_rating: 4.5,
    pilot_completed_missions: 12,
  },
  {
    id: 'app-3',
    job_id: 'pj-3',
    pilot_id: 'demo-pilot-1',
    message: 'Har termisk kamera (FLIR Vue Pro). Kan flyga imorgon.',
    proposed_fee_sek: 4_200,
    status: 'pending',
    created_at: '2026-03-17T11:00:00Z',
    pilot_name: 'Erik Lindgren',
    pilot_rating: 4.8,
    pilot_completed_missions: 34,
  },
];

// ─── Haversine distance ───

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Hook ───

export function usePilotJobs(options: UsePilotJobsOptions) {
  const { role, statusFilter, maxDistanceKm = 200, pilotLocation } = options;
  const { profile } = useAuthStore();

  const [jobs, setJobs] = useState<PilotJob[]>([]);
  const [applications, setApplications] = useState<PilotApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load jobs ──
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ── Demo mode ──
    if (isDemo() || !isSupabaseConfigured) {
      let demoJobs = [...DEMO_PILOT_JOBS];

      if (role === 'owner') {
        // In demo, show jobs owned by the demo user
        demoJobs = demoJobs.filter(
          (j) => j.owner_id === 'demo-owner-1' || j.owner_id === profile?.id,
        );
      }

      if (statusFilter && statusFilter.length > 0) {
        demoJobs = demoJobs.filter((j) => statusFilter.includes(j.status));
      }

      // Sort by distance if pilot location available
      if (pilotLocation && role === 'pilot') {
        demoJobs = demoJobs
          .map((j) => ({
            ...j,
            distance_km:
              j.location_lat && j.location_lng
                ? Math.round(
                    haversineKm(
                      pilotLocation[1],
                      pilotLocation[0],
                      j.location_lat,
                      j.location_lng,
                    ) * 10,
                  ) / 10
                : 999,
          }))
          .filter((j) => (j.distance_km ?? 999) <= maxDistanceKm)
          .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      }

      setJobs(demoJobs);
      setApplications(DEMO_APPLICATIONS);
      setLoading(false);
      return;
    }

    // ── Supabase queries ──
    try {
      if (role === 'pilot') {
        // Pilots: open jobs + jobs they've applied to / been assigned
        let query = supabase
          .from('pilot_jobs')
          .select(
            `
            *,
            parcels:parcel_id(name, municipality, area_ha)
          `,
          )
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        } else {
          // Default: open jobs + pilot's assigned/in_progress
          query = query.or(
            `status.eq.open,pilot_id.eq.${profile?.id}`,
          );
        }

        const { data, error: fetchErr } = await query;

        if (fetchErr) {
          setError(fetchErr.message);
          setLoading(false);
          return;
        }

        // Enrich with parcel data and distance
        const enriched: PilotJob[] = (data ?? []).map((row: any) => ({
          ...row,
          parcel_name: row.parcels?.name ?? null,
          municipality: row.parcels?.municipality ?? null,
          area_ha: row.parcels?.area_ha ?? null,
          distance_km:
            pilotLocation && row.location_lat && row.location_lng
              ? Math.round(
                  haversineKm(
                    pilotLocation[1],
                    pilotLocation[0],
                    row.location_lat,
                    row.location_lng,
                  ) * 10,
                ) / 10
              : null,
        }));

        // Filter by distance
        const filtered =
          pilotLocation && maxDistanceKm
            ? enriched.filter(
                (j) => j.distance_km == null || j.distance_km! <= maxDistanceKm,
              )
            : enriched;

        // Sort by distance (closest first)
        filtered.sort(
          (a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999),
        );

        // Fetch pilot's own applications to annotate my_application_status
        if (profile?.id) {
          const { data: myApps } = await supabase
            .from('pilot_applications')
            .select('job_id, status')
            .eq('pilot_id', profile.id);

          if (myApps) {
            const appMap = new Map(
              myApps.map((a: any) => [a.job_id, a.status as ApplicationStatus]),
            );
            filtered.forEach((j) => {
              j.my_application_status = appMap.get(j.id) ?? null;
            });
          }
        }

        setJobs(filtered);
      } else {
        // Owner: their posted jobs with application count
        const { data, error: fetchErr } = await supabase
          .from('pilot_jobs')
          .select(
            `
            *,
            parcels:parcel_id(name, municipality, area_ha),
            pilot_applications(count)
          `,
          )
          .eq('owner_id', profile?.id ?? '')
          .order('created_at', { ascending: false });

        if (fetchErr) {
          setError(fetchErr.message);
          setLoading(false);
          return;
        }

        const enriched: PilotJob[] = (data ?? []).map((row: any) => ({
          ...row,
          parcel_name: row.parcels?.name ?? null,
          municipality: row.parcels?.municipality ?? null,
          area_ha: row.parcels?.area_ha ?? null,
          application_count: row.pilot_applications?.[0]?.count ?? 0,
        }));

        setJobs(enriched);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ladda uppdrag');
    }

    setLoading(false);
  }, [role, statusFilter, maxDistanceKm, pilotLocation, profile?.id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // ── Real-time subscription for new jobs ──
  useEffect(() => {
    if (isDemo() || !isSupabaseConfigured || role !== 'pilot') return;

    const channel = supabase
      .channel('pilot-jobs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pilot_jobs' },
        () => {
          // Reload to get enriched data
          loadJobs();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pilot_jobs' },
        () => {
          loadJobs();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, loadJobs]);

  // ── Fetch applications for a specific job (owner view) ──
  const fetchApplications = useCallback(
    async (jobId: string): Promise<PilotApplication[]> => {
      if (isDemo() || !isSupabaseConfigured) {
        return DEMO_APPLICATIONS.filter((a) => a.job_id === jobId);
      }

      const { data, error: fetchErr } = await supabase
        .from('pilot_applications')
        .select(
          `
          *,
          profiles:pilot_id(full_name),
          pilot_profiles:pilot_id(rating, completed_missions)
        `,
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (fetchErr) {
        console.error('Failed to fetch applications:', fetchErr);
        return [];
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        pilot_name: row.profiles?.full_name ?? 'Okänd pilot',
        pilot_rating: row.pilot_profiles?.rating ?? 0,
        pilot_completed_missions: row.pilot_profiles?.completed_missions ?? 0,
      }));
    },
    [],
  );

  // ─── Mutations ───

  /** Pilot applies for a job */
  const apply = useCallback(
    async (
      jobId: string,
      message?: string,
      proposedFeeSek?: number,
    ): Promise<{ success: boolean; error?: string }> => {
      if (isDemo() || !isSupabaseConfigured) {
        // Optimistic update in demo
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, my_application_status: 'pending' as const } : j,
          ),
        );
        return { success: true };
      }

      if (!profile?.id) {
        return { success: false, error: 'Du måste vara inloggad' };
      }

      const { error: insertErr } = await supabase
        .from('pilot_applications')
        .insert({
          job_id: jobId,
          pilot_id: profile.id,
          message: message ?? null,
          proposed_fee_sek: proposedFeeSek ?? null,
          status: 'pending',
        });

      if (insertErr) {
        if (insertErr.code === '23505') {
          return { success: false, error: 'Du har redan ansökt till detta uppdrag' };
        }
        return { success: false, error: insertErr.message };
      }

      // Update local state
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, my_application_status: 'pending' as const } : j,
        ),
      );

      return { success: true };
    },
    [profile?.id],
  );

  /** Owner accepts an application — calls the assign-pilot edge function */
  const accept = useCallback(
    async (
      applicationId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (isDemo() || !isSupabaseConfigured) {
        // Demo: simulate acceptance
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId
              ? { ...a, status: 'accepted' as const }
              : a.job_id ===
                  prev.find((x) => x.id === applicationId)?.job_id
                ? { ...a, status: 'rejected' as const }
                : a,
          ),
        );
        const app = DEMO_APPLICATIONS.find((a) => a.id === applicationId);
        if (app) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === app.job_id
                ? { ...j, status: 'assigned' as const, pilot_id: app.pilot_id }
                : j,
            ),
          );
        }
        return { success: true };
      }

      const { data: _data, error: fnErr } = await supabase.functions.invoke(
        'assign-pilot',
        {
          body: { application_id: applicationId },
        },
      );

      if (fnErr) {
        return { success: false, error: fnErr.message };
      }

      // Reload jobs to reflect the change
      await loadJobs();
      return { success: true };
    },
    [loadJobs],
  );

  /** Owner rejects an application */
  const reject = useCallback(
    async (
      applicationId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (isDemo() || !isSupabaseConfigured) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, status: 'rejected' as const } : a,
          ),
        );
        return { success: true };
      }

      const { error: updateErr } = await supabase
        .from('pilot_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      return { success: true };
    },
    [],
  );

  // ── Summary stats ──
  const stats = useMemo(() => {
    const open = jobs.filter((j) => j.status === 'open').length;
    const assigned = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const totalFeeSek = jobs
      .filter((j) => j.status === 'completed' || j.status === 'assigned' || j.status === 'in_progress')
      .reduce((sum, j) => sum + j.fee_sek, 0);

    return { open, assigned, completed, totalFeeSek };
  }, [jobs]);

  return {
    jobs,
    applications,
    loading,
    error,
    stats,
    // Actions
    apply,
    accept,
    reject,
    reload: loadJobs,
    fetchApplications,
  };
}
