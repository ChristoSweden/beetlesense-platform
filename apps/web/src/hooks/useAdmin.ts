import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

/* ─── Types ─── */

export interface SystemStats {
  totalUsers: number;
  activeParcels: number;
  surveysProcessed: number;
  apiCallsToday: number;
}

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface QueueStatus {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

export type ServiceHealth = 'healthy' | 'degraded' | 'down';

export interface ServiceStatus {
  name: string;
  status: ServiceHealth;
  latency: number; // ms
  uptime: number;  // percentage
  lastCheck: string;
}

export interface ActivityItem {
  id: string;
  type: 'signup' | 'survey' | 'alert' | 'report' | 'login';
  message: string;
  timestamp: string;
  user?: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'owner' | 'pilot' | 'inspector' | 'admin';
  parcelsCount: number;
  lastActive: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  surveysCount: number;
  reportsCount: number;
}

export interface ResponseTimePoint {
  hour: string;
  supabase: number;
  redis: number;
  inference: number;
  qgis: number;
}

export interface ErrorRatePoint {
  hour: string;
  count: number;
  rate: number; // percentage
}

export interface DatabaseStats {
  sizeGB: number;
  connections: number;
  maxConnections: number;
  rowCount: number;
}

export interface WorkerQueue {
  name: string;
  depth: number;
  processing: number;
  failed: number;
}

export interface EdgeFunctionStats {
  name: string;
  invocations: number;
  avgLatency: number;
  errorRate: number;
}

export interface PageViewStat {
  page: string;
  views: number;
  uniqueUsers: number;
}

export interface FeatureRanking {
  feature: string;
  usageCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CompanionStats {
  totalQueries: number;
  avgPerDay: number;
  topTopics: { topic: string; count: number }[];
}

export interface KBSearchStats {
  totalSearches: number;
  avgResultsClicked: number;
  topQueries: { query: string; count: number }[];
}

export interface CountyDistribution {
  county: string;
  users: number;
}

export interface SensorQueueJob {
  id: string;
  sensorType: 'multispectral' | 'thermal' | 'RGB';
  status: 'waiting' | 'active' | 'completed' | 'failed';
  completedAt?: string;
  durationSec?: number;
  parcelName?: string;
}

export interface SensorQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  perSensorType: {
    sensorType: 'multispectral' | 'thermal' | 'RGB';
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    avgProcessingTimeSec: number;
  }[];
  recentCompletions: {
    id: string;
    sensorType: 'multispectral' | 'thermal' | 'RGB';
    completedAt: string;
    durationSec: number;
    parcelName: string;
  }[];
}

/* ─── Demo data generators ─── */

function generateUserGrowth(): UserGrowthPoint[] {
  const points: UserGrowthPoint[] = [];
  let count = 142;
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    count += Math.floor(Math.random() * 8) + 1;
    points.push({ date: d.toISOString().slice(0, 10), count });
  }
  return points;
}

function generateResponseTimes(): ResponseTimePoint[] {
  const points: ResponseTimePoint[] = [];
  for (let h = 0; h < 24; h++) {
    points.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      supabase: 20 + Math.random() * 40,
      redis: 1 + Math.random() * 5,
      inference: 200 + Math.random() * 300,
      qgis: 80 + Math.random() * 120,
    });
  }
  return points;
}

function generateErrorRates(): ErrorRatePoint[] {
  const points: ErrorRatePoint[] = [];
  for (let h = 0; h < 24; h++) {
    const count = Math.floor(Math.random() * 12);
    points.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      count,
      rate: +(count / (800 + Math.random() * 400) * 100).toFixed(2),
    });
  }
  return points;
}

const SWEDISH_FIRST = ['Erik', 'Anna', 'Lars', 'Maria', 'Johan', 'Eva', 'Karl', 'Karin', 'Anders', 'Ingrid', 'Sven', 'Birgitta', 'Gustaf', 'Margareta', 'Olof', 'Helena', 'Per', 'Lena', 'Nils', 'Sofia'];
const SWEDISH_LAST = ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Lindberg', 'Holm', 'Forsberg', 'Ekström', 'Bergström', 'Nyström', 'Lundqvist', 'Sjöberg', 'Lindqvist', 'Wallin'];

function generateMockUsers(): AdminUser[] {
  const roles: AdminUser['role'][] = ['owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'owner', 'pilot', 'pilot', 'pilot', 'inspector', 'inspector', 'inspector', 'admin', 'owner'];
  const statuses: AdminUser['status'][] = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'suspended', 'active', 'pending'];
  return Array.from({ length: 20 }, (_, i) => {
    const first = SWEDISH_FIRST[i];
    const last = SWEDISH_LAST[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const created = new Date();
    created.setDate(created.getDate() - Math.floor(Math.random() * 365));
    const lastActive = new Date();
    lastActive.setDate(lastActive.getDate() - daysAgo);
    return {
      id: `user-${String(i + 1).padStart(3, '0')}`,
      fullName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.se`,
      role: roles[i],
      parcelsCount: roles[i] === 'owner' ? Math.floor(Math.random() * 12) + 1 : 0,
      lastActive: lastActive.toISOString(),
      status: statuses[i],
      createdAt: created.toISOString(),
      surveysCount: Math.floor(Math.random() * 25),
      reportsCount: Math.floor(Math.random() * 15),
    };
  });
}

const COUNTIES = ['Västra Götaland', 'Jönköping', 'Kronoberg', 'Kalmar', 'Östergötland', 'Dalarna', 'Gävleborg', 'Västernorrland', 'Norrbotten', 'Värmland', 'Halland', 'Skåne'];

/* ─── Hook ─── */

export function useAdmin() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTimePoint[]>([]);
  const [errorRates, setErrorRates] = useState<ErrorRatePoint[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [workerQueues, setWorkerQueues] = useState<WorkerQueue[]>([]);
  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStats[]>([]);
  const [pageViews, setPageViews] = useState<PageViewStat[]>([]);
  const [featureRanking, setFeatureRanking] = useState<FeatureRanking[]>([]);
  const [companionStats, setCompanionStats] = useState<CompanionStats | null>(null);
  const [kbSearchStats, setKbSearchStats] = useState<KBSearchStats | null>(null);
  const [countyDistribution, setCountyDistribution] = useState<CountyDistribution[]>([]);
  const [sensorQueueStats, setSensorQueueStats] = useState<SensorQueueStats | null>(null);

  const loadDemoData = useCallback(() => {
    setLoading(true);

    // System stats
    setStats({
      totalUsers: 287,
      activeParcels: 1_843,
      surveysProcessed: 12_456,
      apiCallsToday: 34_219,
    });

    setUserGrowth(generateUserGrowth());

    setQueueStatus({ pending: 23, active: 7, completed: 1_284, failed: 3 });

    setServices([
      { name: 'Supabase', status: 'healthy', latency: 32, uptime: 99.97, lastCheck: new Date().toISOString() },
      { name: 'Redis / Valkey', status: 'healthy', latency: 2, uptime: 99.99, lastCheck: new Date().toISOString() },
      { name: 'Inference Server', status: 'degraded', latency: 450, uptime: 98.5, lastCheck: new Date().toISOString() },
      { name: 'QGIS Server', status: 'healthy', latency: 95, uptime: 99.8, lastCheck: new Date().toISOString() },
    ]);

    const now = new Date();
    setRecentActivity([
      { id: 'a1', type: 'signup', message: 'New user registered: Sofia Wallin (owner)', timestamp: new Date(now.getTime() - 12 * 60000).toISOString(), user: 'Sofia Wallin' },
      { id: 'a2', type: 'survey', message: 'Survey #1847 processing completed — 3 beetle detections', timestamp: new Date(now.getTime() - 28 * 60000).toISOString() },
      { id: 'a3', type: 'alert', message: 'High beetle risk alert triggered for Kronoberg region', timestamp: new Date(now.getTime() - 45 * 60000).toISOString() },
      { id: 'a4', type: 'signup', message: 'New user registered: Per Lundqvist (pilot)', timestamp: new Date(now.getTime() - 67 * 60000).toISOString(), user: 'Per Lundqvist' },
      { id: 'a5', type: 'report', message: 'Report generated for parcel Sjöberg-12 — 45 ha', timestamp: new Date(now.getTime() - 92 * 60000).toISOString() },
      { id: 'a6', type: 'login', message: 'Admin login: admin@beetlesense.ai', timestamp: new Date(now.getTime() - 110 * 60000).toISOString(), user: 'Admin' },
      { id: 'a7', type: 'survey', message: 'Survey #1846 uploaded by pilot Erik Andersson', timestamp: new Date(now.getTime() - 135 * 60000).toISOString(), user: 'Erik Andersson' },
      { id: 'a8', type: 'alert', message: 'Storm warning issued for Dalarna — wind exposure risk', timestamp: new Date(now.getTime() - 180 * 60000).toISOString() },
    ]);

    setUsers(generateMockUsers());

    setResponseTimes(generateResponseTimes());
    setErrorRates(generateErrorRates());

    setDbStats({
      sizeGB: 4.7,
      connections: 24,
      maxConnections: 100,
      rowCount: 2_847_392,
    });

    setWorkerQueues([
      { name: 'survey-processing', depth: 12, processing: 3, failed: 1 },
      { name: 'upload-validation', depth: 5, processing: 2, failed: 0 },
      { name: 'satellite-fetch', depth: 8, processing: 1, failed: 0 },
      { name: 'report-generation', depth: 3, processing: 1, failed: 0 },
      { name: 'notification-dispatch', depth: 0, processing: 0, failed: 0 },
    ]);

    setEdgeFunctions([
      { name: 'companion-chat', invocations: 4_521, avgLatency: 1_200, errorRate: 0.3 },
      { name: 'parcel-register', invocations: 312, avgLatency: 280, errorRate: 0.1 },
      { name: 'survey-status', invocations: 2_847, avgLatency: 45, errorRate: 0.0 },
      { name: 'upload-presign', invocations: 1_893, avgLatency: 32, errorRate: 0.2 },
      { name: 'upload-complete', invocations: 1_891, avgLatency: 120, errorRate: 0.1 },
    ]);

    setPageViews([
      { page: 'Dashboard', views: 12_450, uniqueUsers: 234 },
      { page: 'Parcels', views: 8_923, uniqueUsers: 198 },
      { page: 'Surveys', views: 6_712, uniqueUsers: 167 },
      { page: 'AI Advisor', views: 5_891, uniqueUsers: 145 },
      { page: 'Early Warning', views: 4_567, uniqueUsers: 132 },
      { page: 'Timber Market', views: 3_234, uniqueUsers: 98 },
      { page: 'Satellite Check', views: 2_891, uniqueUsers: 87 },
      { page: 'Portfolio', views: 2_456, uniqueUsers: 76 },
    ]);

    setFeatureRanking([
      { feature: 'AI Companion Chat', usageCount: 4_521, trend: 'up' },
      { feature: 'Parcel Map View', usageCount: 3_891, trend: 'stable' },
      { feature: 'Survey Upload', usageCount: 2_847, trend: 'up' },
      { feature: 'Early Warning Alerts', usageCount: 2_156, trend: 'up' },
      { feature: 'Vision Search', usageCount: 1_823, trend: 'up' },
      { feature: 'Timber Price Check', usageCount: 1_567, trend: 'down' },
      { feature: 'Photo Gallery', usageCount: 1_234, trend: 'stable' },
      { feature: 'Report Generation', usageCount: 987, trend: 'stable' },
    ]);

    setCompanionStats({
      totalQueries: 4_521,
      avgPerDay: 150,
      topTopics: [
        { topic: 'Bark beetle identification', count: 892 },
        { topic: 'Tree species advice', count: 634 },
        { topic: 'Harvest timing', count: 521 },
        { topic: 'Storm damage prevention', count: 412 },
        { topic: 'Regulatory questions', count: 389 },
        { topic: 'Carbon credits', count: 234 },
      ],
    });

    setKbSearchStats({
      totalSearches: 3_456,
      avgResultsClicked: 2.3,
      topQueries: [
        { query: 'granbarkborre', count: 456 },
        { query: 'avverkningstillstånd', count: 321 },
        { query: 'stormskador åtgärder', count: 287 },
        { query: 'plantering rådgivning', count: 234 },
        { query: 'FSC certifiering', count: 198 },
      ],
    });

    setCountyDistribution(
      COUNTIES.map((county) => ({
        county,
        users: Math.floor(Math.random() * 45) + 5,
      })).sort((a, b) => b.users - a.users)
    );

    // Sensor processing queue stats
    const sensorNow = new Date();
    const parcelNames = ['Sjöberg-12', 'Ekström-5', 'Lindberg-8', 'Holm-3', 'Forsberg-22', 'Nyström-14', 'Wallin-7', 'Bergström-9', 'Persson-11', 'Gustafsson-4'];
    setSensorQueueStats({
      waiting: 18,
      active: 5,
      completed: 2_341,
      failed: 7,
      perSensorType: [
        { sensorType: 'multispectral', waiting: 8, active: 2, completed: 1_023, failed: 3, avgProcessingTimeSec: 142 },
        { sensorType: 'thermal', waiting: 6, active: 2, completed: 784, failed: 2, avgProcessingTimeSec: 98 },
        { sensorType: 'RGB', waiting: 4, active: 1, completed: 534, failed: 2, avgProcessingTimeSec: 67 },
      ],
      recentCompletions: Array.from({ length: 10 }, (_, i) => {
        const sType = (['multispectral', 'thermal', 'RGB'] as const)[i % 3];
        const dur = sType === 'multispectral' ? 120 + Math.floor(Math.random() * 50) : sType === 'thermal' ? 80 + Math.floor(Math.random() * 40) : 50 + Math.floor(Math.random() * 30);
        return {
          id: `sq-${String(2341 - i).padStart(4, '0')}`,
          sensorType: sType,
          completedAt: new Date(sensorNow.getTime() - i * 4.5 * 60000).toISOString(),
          durationSec: dur,
          parcelName: parcelNames[i],
        };
      }),
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);

  return {
    isAdmin,
    loading,
    stats,
    userGrowth,
    queueStatus,
    services,
    recentActivity,
    users,
    responseTimes,
    errorRates,
    dbStats,
    workerQueues,
    edgeFunctions,
    pageViews,
    featureRanking,
    companionStats,
    kbSearchStats,
    countyDistribution,
    sensorQueueStats,
    refresh: loadDemoData,
  };
}
