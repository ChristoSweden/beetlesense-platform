import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export interface DjiAircraft {
  id: string;
  serialNumber: string;
  model: string;
  modelName: string;
  rtkCapable: boolean;
  thermalCapable: boolean;
  multispectralCapable: boolean;
  lidarCapable: boolean;
  maxFlightTimeMin: number;
  status: 'active' | 'maintenance' | 'retired';
  firmwareVersion: string;
  totalFlightHours: number;
  totalFlights: number;
  lastSeenAt: string | null;
  cloudPaired: boolean;
}

export interface DjiMission {
  id: string;
  name: string;
  parcelId: string;
  parcelName?: string;
  aircraftId: string | null;
  aircraftName?: string;
  missionType: 'mapping' | 'inspection' | 'corridor' | 'oblique' | 'custom';
  status: 'planned' | 'uploaded' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  altitudeM: number;
  speedMs: number;
  overlapFront: number;
  overlapSide: number;
  sensorsEnabled: string[];
  estimatedDurationMin: number | null;
  estimatedPhotos: number | null;
  coverageAreaHa: number | null;
  flightDistanceM: number | null;
  mediaCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface FlightPlanResult {
  waypoints: Array<{ lat: number; lng: number; alt: number; heading: number }>;
  stats: {
    gsd_cm: number;
    line_spacing_m: number;
    photo_interval_m: number;
    estimated_photos: number;
    estimated_duration_min: number;
    flight_distance_m: number;
    coverage_area_ha: number;
    batteries_needed: number;
  };
}

// ─── Demo Data ───

const DEMO_AIRCRAFT: DjiAircraft[] = [
  {
    id: 'drone-1',
    serialNumber: 'M350RTK-2024-SE001',
    model: 'matrice_350_rtk',
    modelName: 'DJI Matrice 350 RTK',
    rtkCapable: true,
    thermalCapable: true,
    multispectralCapable: true,
    lidarCapable: true,
    maxFlightTimeMin: 55,
    status: 'active',
    firmwareVersion: 'v07.01.20.01',
    totalFlightHours: 342.5,
    totalFlights: 187,
    lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
    cloudPaired: true,
  },
  {
    id: 'drone-2',
    serialNumber: 'M3E-2024-SE002',
    model: 'mavic_3_enterprise',
    modelName: 'DJI Mavic 3 Enterprise',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 45,
    status: 'active',
    firmwareVersion: 'v01.00.67.00',
    totalFlightHours: 128.3,
    totalFlights: 94,
    lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
    cloudPaired: true,
  },
  {
    id: 'drone-3',
    serialNumber: 'M3M-2024-SE003',
    model: 'mavic_3_multispectral',
    modelName: 'DJI Mavic 3 Multispectral',
    rtkCapable: true,
    thermalCapable: false,
    multispectralCapable: true,
    lidarCapable: false,
    maxFlightTimeMin: 43,
    status: 'active',
    firmwareVersion: 'v01.00.52.00',
    totalFlightHours: 89.1,
    totalFlights: 62,
    lastSeenAt: new Date(Date.now() - 172800000).toISOString(),
    cloudPaired: false,
  },
];

const DEMO_MISSIONS: DjiMission[] = [
  {
    id: 'mission-1',
    name: 'Barkborrekartläggning — Norra Skogen',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    aircraftId: 'drone-1',
    aircraftName: 'DJI Matrice 350 RTK',
    missionType: 'mapping',
    status: 'completed',
    altitudeM: 80,
    speedMs: 5,
    overlapFront: 80,
    overlapSide: 70,
    sensorsEnabled: ['rgb', 'multispectral', 'thermal'],
    estimatedDurationMin: 24,
    estimatedPhotos: 342,
    coverageAreaHa: 45.2,
    flightDistanceM: 7200,
    mediaCount: 342,
    startedAt: '2026-03-10T09:15:00Z',
    completedAt: '2026-03-10T09:39:00Z',
    createdAt: '2026-03-09T14:00:00Z',
  },
  {
    id: 'mission-2',
    name: 'Vårinspektion — Granudden',
    parcelId: 'p2',
    parcelName: 'Granudden',
    aircraftId: 'drone-2',
    aircraftName: 'DJI Mavic 3 Enterprise',
    missionType: 'mapping',
    status: 'planned',
    altitudeM: 60,
    speedMs: 4,
    overlapFront: 85,
    overlapSide: 75,
    sensorsEnabled: ['rgb', 'thermal'],
    estimatedDurationMin: 18,
    estimatedPhotos: 256,
    coverageAreaHa: 28.5,
    flightDistanceM: 4300,
    mediaCount: 0,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-03-17T10:00:00Z',
  },
];

// ─── Hook ───

export function useDjiFleet() {
  const [aircraft, setAircraft] = useState<DjiAircraft[]>([]);
  const [missions, setMissions] = useState<DjiMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        setAircraft(DEMO_AIRCRAFT);
        setMissions(DEMO_MISSIONS);
        setLoading(false);
        return;
      }

      const [aircraftRes, missionsRes] = await Promise.all([
        supabase.from('dji_aircraft').select('*').eq('status', 'active'),
        supabase.from('dji_missions').select('*, parcels(name), dji_aircraft(model_name)').order('created_at', { ascending: false }).limit(50),
      ]);

      if (aircraftRes.data) {
        setAircraft(aircraftRes.data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          serialNumber: a.serial_number as string,
          model: a.model as string,
          modelName: a.model_name as string,
          rtkCapable: a.rtk_capable as boolean,
          thermalCapable: a.thermal_capable as boolean,
          multispectralCapable: a.multispectral_capable as boolean,
          lidarCapable: a.lidar_capable as boolean,
          maxFlightTimeMin: a.max_flight_time_min as number,
          status: a.status as 'active',
          firmwareVersion: a.firmware_version as string,
          totalFlightHours: a.total_flight_hours as number,
          totalFlights: a.total_flights as number,
          lastSeenAt: a.last_seen_at as string | null,
          cloudPaired: a.cloud_paired as boolean,
        })));
      }

      if (missionsRes.data) {
        setMissions(missionsRes.data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          parcelId: m.parcel_id as string,
          parcelName: (m.parcels as Record<string, string>)?.name,
          aircraftId: m.aircraft_id as string | null,
          aircraftName: (m.dji_aircraft as Record<string, string>)?.model_name,
          missionType: m.mission_type as 'mapping',
          status: m.status as 'planned',
          altitudeM: m.altitude_m as number,
          speedMs: m.speed_ms as number,
          overlapFront: m.overlap_front as number,
          overlapSide: m.overlap_side as number,
          sensorsEnabled: m.sensors_enabled as string[],
          estimatedDurationMin: m.estimated_duration_min as number | null,
          estimatedPhotos: m.estimated_photos as number | null,
          coverageAreaHa: m.coverage_area_ha as number | null,
          flightDistanceM: m.flight_distance_m as number | null,
          mediaCount: m.media_count as number,
          startedAt: m.started_at as string | null,
          completedAt: m.completed_at as string | null,
          createdAt: m.created_at as string,
        })));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setAircraft(DEMO_AIRCRAFT);
      setMissions(DEMO_MISSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generateFlightPlan = useCallback(async (
    parcelId: string,
    sensors: string[],
    altitudeM?: number,
  ): Promise<FlightPlanResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('dji-mission', {
        body: { parcel_id: parcelId, sensors, altitude_m: altitudeM },
        method: 'POST',
      });
      if (fnError) throw fnError;
      return data as FlightPlanResult;
    } catch {
      // Demo fallback
      return {
        waypoints: Array.from({ length: 48 }, (_, i) => ({
          lat: 57.18 + (Math.floor(i / 8) * 0.001),
          lng: 14.04 + ((i % 8) * 0.001),
          alt: altitudeM ?? 80,
          heading: Math.floor(i / 8) % 2 === 0 ? 90 : 270,
        })),
        stats: {
          gsd_cm: 2.1,
          line_spacing_m: 18.5,
          photo_interval_m: 12.3,
          estimated_photos: 342,
          estimated_duration_min: 24,
          flight_distance_m: 7200,
          coverage_area_ha: 45.2,
          batteries_needed: 1,
        },
      };
    }
  }, []);

  const stats = useMemo(() => ({
    totalAircraft: aircraft.length,
    activeAircraft: aircraft.filter(a => a.status === 'active').length,
    cloudPaired: aircraft.filter(a => a.cloudPaired).length,
    totalFlightHours: Math.round(aircraft.reduce((sum, a) => sum + a.totalFlightHours, 0)),
    totalMissions: missions.length,
    completedMissions: missions.filter(m => m.status === 'completed').length,
    plannedMissions: missions.filter(m => m.status === 'planned').length,
    activeMissions: missions.filter(m => m.status === 'in_progress').length,
  }), [aircraft, missions]);

  return {
    aircraft,
    missions,
    stats,
    loading,
    error,
    refresh: loadData,
    generateFlightPlan,
  };
}
