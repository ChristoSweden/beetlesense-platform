/**
 * usePilotEarnings — Earnings data hook for the pilot earnings dashboard.
 *
 * Fetches completed pilot_jobs for the logged-in pilot, calculates totals,
 * monthly breakdowns, per-sensor-type stats, tax estimates, and averages.
 * In demo mode: returns realistic mock data (8 jobs over 3 months).
 */

import { useState, useEffect, useMemo } from 'react';
import { isDemo } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───

export type PayoutStatus = 'paid' | 'pending';

export type SensorType = 'RGB' | 'Multispectral' | 'Thermal' | 'LiDAR';

export interface EarningEntry {
  id: string;
  job_title: string;
  parcel_name: string;
  completed_at: string;
  fee_sek: number;
  status: PayoutStatus;
  sensors: SensorType[];
  area_ha: number;
  flight_hours: number;
}

export interface MonthlyEarning {
  month: string;
  label: string;
  total: number;
}

export interface SensorEarnings {
  sensor: SensorType;
  total_sek: number;
  job_count: number;
  avg_fee: number;
}

export interface PayoutSettings {
  bank_name: string;
  account_last4: string;
  clearing: string;
  schedule: 'monthly' | 'biweekly';
  next_payout_date: string;
}

export interface PilotEarningsData {
  earnings: EarningEntry[];
  totalEarned: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayout: number;
  avgPerJob: number;
  avgPerHectare: number;
  avgPerHour: number;
  monthlyData: MonthlyEarning[];
  sensorBreakdown: SensorEarnings[];
  taxEstimate: { gross: number; tax: number; net: number; rate: number };
  payoutSettings: PayoutSettings;
  loading: boolean;
}

// ─── Demo Data ───

const DEMO_EARNINGS: EarningEntry[] = [
  {
    id: 'e1',
    job_title: 'Hälsokontroll — Ekbacken',
    parcel_name: 'Ekbacken',
    completed_at: '2026-03-12',
    fee_sek: 1830,
    status: 'paid',
    sensors: ['RGB'],
    area_ha: 12.4,
    flight_hours: 1.5,
  },
  {
    id: 'e2',
    job_title: 'Barkborreinventering — Granudden',
    parcel_name: 'Granudden',
    completed_at: '2026-03-02',
    fee_sek: 3190,
    status: 'pending',
    sensors: ['RGB', 'Multispectral'],
    area_ha: 28.0,
    flight_hours: 3.2,
  },
  {
    id: 'e3',
    job_title: 'Komplett inventering — Norra Skogen',
    parcel_name: 'Norra Skogen',
    completed_at: '2026-02-20',
    fee_sek: 4250,
    status: 'paid',
    sensors: ['Multispectral', 'Thermal'],
    area_ha: 42.5,
    flight_hours: 4.0,
  },
  {
    id: 'e4',
    job_title: 'Vårinspektion — Tallmon',
    parcel_name: 'Tallmon',
    completed_at: '2026-02-10',
    fee_sek: 4500,
    status: 'paid',
    sensors: ['RGB', 'Multispectral', 'Thermal'],
    area_ha: 67.1,
    flight_hours: 5.5,
  },
  {
    id: 'e5',
    job_title: 'Akutinspektion — Granudden',
    parcel_name: 'Granudden',
    completed_at: '2026-01-28',
    fee_sek: 3800,
    status: 'paid',
    sensors: ['RGB', 'Thermal'],
    area_ha: 31.0,
    flight_hours: 2.8,
  },
  {
    id: 'e6',
    job_title: 'Viltskadekartläggning — Björklund',
    parcel_name: 'Björklund',
    completed_at: '2026-01-15',
    fee_sek: 2400,
    status: 'paid',
    sensors: ['RGB', 'Multispectral'],
    area_ha: 25.5,
    flight_hours: 2.5,
  },
  {
    id: 'e7',
    job_title: 'Vinterbaseline — Ekbacken',
    parcel_name: 'Ekbacken',
    completed_at: '2025-12-18',
    fee_sek: 890,
    status: 'paid',
    sensors: ['RGB'],
    area_ha: 12.4,
    flight_hours: 1.0,
  },
  {
    id: 'e8',
    job_title: 'Artidentifiering — Tallmon',
    parcel_name: 'Tallmon',
    completed_at: '2025-11-20',
    fee_sek: 3600,
    status: 'paid',
    sensors: ['Multispectral', 'LiDAR'],
    area_ha: 67.1,
    flight_hours: 6.0,
  },
];

const DEMO_PAYOUT_SETTINGS: PayoutSettings = {
  bank_name: 'Swedbank',
  account_last4: '4821',
  clearing: '8327',
  schedule: 'monthly',
  next_payout_date: '2026-04-01',
};

// ─── Hook ───

export function usePilotEarnings(): PilotEarningsData {
  const { profile } = useAuthStore();
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>(DEMO_PAYOUT_SETTINGS);

  useEffect(() => {
    if (!profile) return;

    if (isDemo() || !isSupabaseConfigured) {
      setEarnings(DEMO_EARNINGS);
      setPayoutSettings(DEMO_PAYOUT_SETTINGS);
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('pilot_jobs')
        .select(`
          id,
          title,
          fee_sek,
          status,
          completed_at,
          assigned_at,
          modules_required,
          parcels:parcel_id(name, area_ha)
        `)
        .eq('pilot_id', profile!.id)
        .in('status', ['completed', 'assigned', 'in_progress'])
        .order('completed_at', { ascending: false });

      if (!error && data) {
        interface PilotJobRow {
          id: string;
          title: string;
          fee_sek: number;
          status: string;
          completed_at: string | null;
          assigned_at: string | null;
          created_at: string;
          modules_required: string[] | null;
          parcels: { name: string; area_ha: number } | null;
        }
        const mapped: EarningEntry[] = (data as PilotJobRow[]).map((row) => ({
          id: row.id,
          job_title: row.title,
          parcel_name: row.parcels?.name ?? 'Okänt skifte',
          completed_at: row.completed_at ?? row.assigned_at ?? row.created_at,
          fee_sek: row.fee_sek,
          status: row.status === 'completed' ? 'paid' as const : 'pending' as const,
          sensors: mapModulesToSensors(row.modules_required ?? []),
          area_ha: row.parcels?.area_ha ?? 0,
          flight_hours: estimateFlightHours(row.parcels?.area_ha ?? 0),
        }));
        setEarnings(mapped);
      }
      setLoading(false);
    }

    load();
  }, [profile]);

  // ─── Computed values ───

  const totalEarned = useMemo(
    () => earnings.reduce((sum, e) => sum + e.fee_sek, 0),
    [earnings],
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return earnings
      .filter((e) => e.completed_at.startsWith(key))
      .reduce((sum, e) => sum + e.fee_sek, 0);
  }, [earnings]);

  const lastMonth = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    return earnings
      .filter((e) => e.completed_at.startsWith(key))
      .reduce((sum, e) => sum + e.fee_sek, 0);
  }, [earnings]);

  const pendingPayout = useMemo(
    () => earnings.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.fee_sek, 0),
    [earnings],
  );

  const completedEarnings = useMemo(
    () => earnings.filter((e) => e.fee_sek > 0),
    [earnings],
  );

  const avgPerJob = useMemo(
    () => (completedEarnings.length > 0 ? totalEarned / completedEarnings.length : 0),
    [totalEarned, completedEarnings],
  );

  const totalHectares = useMemo(
    () => completedEarnings.reduce((sum, e) => sum + e.area_ha, 0),
    [completedEarnings],
  );

  const avgPerHectare = useMemo(
    () => (totalHectares > 0 ? totalEarned / totalHectares : 0),
    [totalEarned, totalHectares],
  );

  const totalHours = useMemo(
    () => completedEarnings.reduce((sum, e) => sum + e.flight_hours, 0),
    [completedEarnings],
  );

  const avgPerHour = useMemo(
    () => (totalHours > 0 ? totalEarned / totalHours : 0),
    [totalEarned, totalHours],
  );

  // Monthly chart data (last 6 months)
  const monthlyData: MonthlyEarning[] = useMemo(() => {
    const now = new Date();
    const months: MonthlyEarning[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('sv-SE', { month: 'short' });
      const total = earnings
        .filter((e) => e.completed_at.startsWith(key))
        .reduce((sum, e) => sum + e.fee_sek, 0);
      months.push({ month: key, label, total });
    }

    return months;
  }, [earnings]);

  // Sensor breakdown
  const sensorBreakdown: SensorEarnings[] = useMemo(() => {
    const sensorMap = new Map<SensorType, { total: number; count: number }>();
    const sensorTypes: SensorType[] = ['RGB', 'Multispectral', 'Thermal', 'LiDAR'];

    sensorTypes.forEach((s) => sensorMap.set(s, { total: 0, count: 0 }));

    earnings.forEach((e) => {
      // Distribute fee proportionally across sensors
      const feePerSensor = e.fee_sek / (e.sensors.length || 1);
      e.sensors.forEach((s) => {
        const entry = sensorMap.get(s)!;
        entry.total += feePerSensor;
        entry.count += 1;
      });
    });

    return sensorTypes
      .map((sensor) => {
        const data = sensorMap.get(sensor)!;
        return {
          sensor,
          total_sek: Math.round(data.total),
          job_count: data.count,
          avg_fee: data.count > 0 ? Math.round(data.total / data.count) : 0,
        };
      })
      .filter((s) => s.job_count > 0);
  }, [earnings]);

  // Tax estimate (30% Swedish freelance / F-skatt)
  const taxEstimate = useMemo(() => {
    const rate = 0.30;
    const gross = totalEarned;
    const tax = Math.round(gross * rate);
    const net = gross - tax;
    return { gross, tax, net, rate };
  }, [totalEarned]);

  return {
    earnings,
    totalEarned,
    thisMonth,
    lastMonth,
    pendingPayout,
    avgPerJob,
    avgPerHectare,
    avgPerHour,
    monthlyData,
    sensorBreakdown,
    taxEstimate,
    payoutSettings,
    loading,
  };
}

// ─── Helpers ───

function mapModulesToSensors(modules: string[]): SensorType[] {
  const sensors: SensorType[] = [];
  for (const m of modules) {
    const lower = m.toLowerCase();
    if (lower.includes('rgb') || lower.includes('ortho')) {
      if (!sensors.includes('RGB')) sensors.push('RGB');
    }
    if (lower.includes('multispectral') || lower.includes('multi')) {
      if (!sensors.includes('Multispectral')) sensors.push('Multispectral');
    }
    if (lower.includes('thermal') || lower.includes('termisk')) {
      if (!sensors.includes('Thermal')) sensors.push('Thermal');
    }
    if (lower.includes('lidar')) {
      if (!sensors.includes('LiDAR')) sensors.push('LiDAR');
    }
  }
  return sensors.length > 0 ? sensors : ['RGB'];
}

function estimateFlightHours(areaHa: number): number {
  // Rough estimate: ~10 ha per hour of flight time
  return Math.round((areaHa / 10) * 10) / 10 || 1;
}
