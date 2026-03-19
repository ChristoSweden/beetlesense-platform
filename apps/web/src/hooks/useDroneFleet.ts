import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type DroneManufacturer = 'dji' | 'autel' | 'parrot';

export interface FleetAircraft {
  id: string;
  serialNumber: string;
  manufacturer: DroneManufacturer;
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

export interface FleetMission {
  id: string;
  name: string;
  parcelId: string;
  parcelName?: string;
  aircraftId: string | null;
  aircraftName?: string;
  manufacturer: DroneManufacturer;
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

export interface FleetStats {
  totalAircraft: number;
  activeAircraft: number;
  cloudPaired: number;
  totalFlightHours: number;
  totalMissions: number;
  completedMissions: number;
  plannedMissions: number;
  activeMissions: number;
  byManufacturer: Record<DroneManufacturer, number>;
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

const DEMO_AIRCRAFT: FleetAircraft[] = [
  // DJI aircraft
  {
    id: 'drone-dji-1',
    serialNumber: 'M350RTK-2024-SE001',
    manufacturer: 'dji',
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
    id: 'drone-dji-2',
    serialNumber: 'M3E-2024-SE002',
    manufacturer: 'dji',
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
    id: 'drone-dji-3',
    serialNumber: 'M3M-2024-SE003',
    manufacturer: 'dji',
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
  // Autel aircraft
  {
    id: 'drone-autel-1',
    serialNumber: 'AU-EVO2RTK-SE001',
    manufacturer: 'autel',
    model: 'evo_ii_rtk',
    modelName: 'Autel EVO II RTK',
    rtkCapable: true,
    thermalCapable: false,
    multispectralCapable: true,
    lidarCapable: false,
    maxFlightTimeMin: 36,
    status: 'active',
    firmwareVersion: 'v2.7.18',
    totalFlightHours: 64.2,
    totalFlights: 41,
    lastSeenAt: new Date(Date.now() - 7200000).toISOString(),
    cloudPaired: true,
  },
  {
    id: 'drone-autel-2',
    serialNumber: 'AU-EVOMAX4T-SE001',
    manufacturer: 'autel',
    model: 'evo_max_4t',
    modelName: 'Autel EVO Max 4T',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: true,
    maxFlightTimeMin: 42,
    status: 'active',
    firmwareVersion: 'v1.5.22',
    totalFlightHours: 37.8,
    totalFlights: 28,
    lastSeenAt: new Date(Date.now() - 14400000).toISOString(),
    cloudPaired: true,
  },
  {
    id: 'drone-autel-3',
    serialNumber: 'AU-EVO2D640T-SE001',
    manufacturer: 'autel',
    model: 'evo_ii_dual_640t',
    modelName: 'Autel EVO II Dual 640T',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 38,
    status: 'maintenance',
    firmwareVersion: 'v2.5.10',
    totalFlightHours: 52.1,
    totalFlights: 35,
    lastSeenAt: new Date(Date.now() - 604800000).toISOString(),
    cloudPaired: false,
  },
  // Parrot aircraft
  {
    id: 'drone-parrot-1',
    serialNumber: 'PA-ANAFI-SE001',
    manufacturer: 'parrot',
    model: 'anafi_usa',
    modelName: 'Parrot ANAFI USA',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 32,
    status: 'active',
    firmwareVersion: 'v1.10.1',
    totalFlightHours: 21.4,
    totalFlights: 18,
    lastSeenAt: new Date(Date.now() - 259200000).toISOString(),
    cloudPaired: false,
  },
];

const DEMO_MISSIONS: FleetMission[] = [
  {
    id: 'mission-fleet-1',
    name: 'Barkborrekartläggning — Norra Skogen',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    aircraftId: 'drone-dji-1',
    aircraftName: 'DJI Matrice 350 RTK',
    manufacturer: 'dji',
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
    id: 'mission-fleet-2',
    name: 'Termisk inspektion — Söderskog',
    parcelId: 'p3',
    parcelName: 'Söderskog',
    aircraftId: 'drone-autel-2',
    aircraftName: 'Autel EVO Max 4T',
    manufacturer: 'autel',
    missionType: 'inspection',
    status: 'completed',
    altitudeM: 60,
    speedMs: 4,
    overlapFront: 80,
    overlapSide: 70,
    sensorsEnabled: ['rgb', 'thermal', 'lidar'],
    estimatedDurationMin: 32,
    estimatedPhotos: 480,
    coverageAreaHa: 38.7,
    flightDistanceM: 6100,
    mediaCount: 480,
    startedAt: '2026-03-12T08:00:00Z',
    completedAt: '2026-03-12T08:32:00Z',
    createdAt: '2026-03-11T16:00:00Z',
  },
  {
    id: 'mission-fleet-3',
    name: 'Vårinspektion — Granudden',
    parcelId: 'p2',
    parcelName: 'Granudden',
    aircraftId: 'drone-dji-2',
    aircraftName: 'DJI Mavic 3 Enterprise',
    manufacturer: 'dji',
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
  {
    id: 'mission-fleet-4',
    name: 'RTK-kartläggning — Björkdalen',
    parcelId: 'p4',
    parcelName: 'Björkdalen',
    aircraftId: 'drone-autel-1',
    aircraftName: 'Autel EVO II RTK',
    manufacturer: 'autel',
    missionType: 'mapping',
    status: 'planned',
    altitudeM: 70,
    speedMs: 5,
    overlapFront: 80,
    overlapSide: 70,
    sensorsEnabled: ['rgb', 'multispectral'],
    estimatedDurationMin: 22,
    estimatedPhotos: 310,
    coverageAreaHa: 32.1,
    flightDistanceM: 5400,
    mediaCount: 0,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-03-18T08:00:00Z',
  },
];

// ─── Hook ───

export function useDroneFleet(filterManufacturer?: DroneManufacturer) {
  const [aircraft, setAircraft] = useState<FleetAircraft[]>([]);
  const [missions, setMissions] = useState<FleetMission[]>([]);
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

      // Fetch from all manufacturer tables in parallel
      const [djiAircraftRes, autelAircraftRes, djiMissionsRes, autelMissionsRes] = await Promise.all([
        supabase.from('dji_aircraft').select('*'),
        supabase.from('autel_aircraft').select('*'),
        supabase
          .from('dji_missions')
          .select('*, parcels(name), dji_aircraft(model_name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('autel_missions')
          .select('*, parcels(name), autel_aircraft(model_name)')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const allAircraft: FleetAircraft[] = [];

      // Map DJI aircraft
      if (djiAircraftRes.data) {
        allAircraft.push(...djiAircraftRes.data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          serialNumber: a.serial_number as string,
          manufacturer: 'dji' as const,
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

      // Map Autel aircraft
      if (autelAircraftRes.data) {
        allAircraft.push(...autelAircraftRes.data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          serialNumber: a.serial_number as string,
          manufacturer: 'autel' as const,
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

      setAircraft(allAircraft);

      const allMissions: FleetMission[] = [];

      // Map DJI missions
      if (djiMissionsRes.data) {
        allMissions.push(...djiMissionsRes.data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          parcelId: m.parcel_id as string,
          parcelName: (m.parcels as Record<string, string>)?.name,
          aircraftId: m.aircraft_id as string | null,
          aircraftName: (m.dji_aircraft as Record<string, string>)?.model_name,
          manufacturer: 'dji' as const,
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

      // Map Autel missions
      if (autelMissionsRes.data) {
        allMissions.push(...autelMissionsRes.data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          parcelId: m.parcel_id as string,
          parcelName: (m.parcels as Record<string, string>)?.name,
          aircraftId: m.aircraft_id as string | null,
          aircraftName: (m.autel_aircraft as Record<string, string>)?.model_name,
          manufacturer: 'autel' as const,
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

      // Sort all missions by createdAt descending
      allMissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setMissions(allMissions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Fallback to demo data
      setAircraft(DEMO_AIRCRAFT);
      setMissions(DEMO_MISSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Apply manufacturer filter
  const filteredAircraft = useMemo(() => {
    if (!filterManufacturer) return aircraft;
    return aircraft.filter(a => a.manufacturer === filterManufacturer);
  }, [aircraft, filterManufacturer]);

  const filteredMissions = useMemo(() => {
    if (!filterManufacturer) return missions;
    return missions.filter(m => m.manufacturer === filterManufacturer);
  }, [missions, filterManufacturer]);

  const generateFlightPlan = useCallback(async (
    parcelId: string,
    sensors: string[],
    altitudeM?: number,
    manufacturer?: DroneManufacturer,
  ): Promise<FlightPlanResult | null> => {
    try {
      const fnName = manufacturer === 'autel' ? 'autel-mission' : 'dji-mission';
      const { data, error: fnError } = await supabase.functions.invoke(fnName, {
        body: { parcel_id: parcelId, sensors, altitude_m: altitudeM },
        method: 'POST',
      });
      if (fnError) throw fnError;
      return data as FlightPlanResult;
    } catch {
      // Demo fallback — generate synthetic waypoints
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

  const stats = useMemo((): FleetStats => {
    const src = filteredAircraft;
    const mSrc = filteredMissions;
    const byManufacturer: Record<DroneManufacturer, number> = { dji: 0, autel: 0, parrot: 0 };
    for (const a of aircraft) {
      byManufacturer[a.manufacturer]++;
    }
    return {
      totalAircraft: src.length,
      activeAircraft: src.filter(a => a.status === 'active').length,
      cloudPaired: src.filter(a => a.cloudPaired).length,
      totalFlightHours: Math.round(src.reduce((sum, a) => sum + a.totalFlightHours, 0)),
      totalMissions: mSrc.length,
      completedMissions: mSrc.filter(m => m.status === 'completed').length,
      plannedMissions: mSrc.filter(m => m.status === 'planned').length,
      activeMissions: mSrc.filter(m => m.status === 'in_progress').length,
      byManufacturer,
    };
  }, [aircraft, filteredAircraft, filteredMissions]);

  return {
    aircraft: filteredAircraft,
    missions: filteredMissions,
    stats,
    loading,
    error,
    refresh: loadData,
    generateFlightPlan,
  };
}
