import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { getRedisConnection } from './lib/redis.js';
import { logger } from './lib/logger.js';
import { config } from './config.js';
import {
  type QueueRegistry,
} from './queues/index.js';
import type { Queue } from 'bullmq';

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '3002', 10);

/** Tracks cumulative metric counters per queue. */
interface QueueMetrics {
  processed: number;
  failed: number;
}

const cumulativeMetrics = new Map<string, QueueMetrics>();

function getOrCreateMetrics(queueName: string): QueueMetrics {
  if (!cumulativeMetrics.has(queueName)) {
    cumulativeMetrics.set(queueName, { processed: 0, failed: 0 });
  }
  return cumulativeMetrics.get(queueName)!;
}

/**
 * Increment job counters. Call these from worker event handlers.
 */
export function recordJobProcessed(queueName: string): void {
  getOrCreateMetrics(queueName).processed++;
}

export function recordJobFailed(queueName: string): void {
  getOrCreateMetrics(queueName).failed++;
}

/** Check if Redis is reachable. */
async function checkRedis(): Promise<{ connected: boolean; latencyMs: number }> {
  try {
    const redis = getRedisConnection();
    const start = Date.now();
    const pong = await redis.ping();
    return { connected: pong === 'PONG', latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: -1 };
  }
}

/** Check if Supabase is reachable. */
async function checkSupabase(): Promise<{ connected: boolean; latencyMs: number }> {
  try {
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { persistSession: false },
    });
    const start = Date.now();
    // Lightweight query to verify connectivity
    const { error } = await supabase.from('organizations').select('id').limit(1);
    return { connected: !error, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: -1 };
  }
}

/**
 * Start the health check HTTP server.
 * Must be called after queues and workers are initialized.
 */
export function startHealthServer(queues: QueueRegistry): void {
  const app = express();

  const queueInstances: Queue[] = Object.values(queues);

  // ---------- GET /health — liveness probe ----------
  app.get('/health', async (_req, res) => {
    try {
      const redisCheck = await checkRedis();
      const supabaseCheck = await checkSupabase();
      const mem = process.memoryUsage();

      // Gather queue stats summary
      const queueStats: Record<string, { active: number; waiting: number; failed: number }> = {};
      for (const q of queueInstances) {
        try {
          const counts = await q.getJobCounts('active', 'waiting', 'failed');
          queueStats[q.name] = {
            active: counts.active || 0,
            waiting: counts.waiting || 0,
            failed: counts.failed || 0,
          };
        } catch {
          queueStats[q.name] = { active: -1, waiting: -1, failed: -1 };
        }
      }

      const isHealthy = redisCheck.connected;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        uptime_seconds: Math.floor(process.uptime()),
        redis: {
          connected: redisCheck.connected,
          latency_ms: redisCheck.latencyMs,
        },
        supabase: {
          connected: supabaseCheck.connected,
          latency_ms: supabaseCheck.latencyMs,
        },
        memory: {
          rss_mb: Math.round(mem.rss / 1024 / 1024),
          heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
          external_mb: Math.round(mem.external / 1024 / 1024),
        },
        queues: queueStats,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.status(503).json({
        status: 'error',
        error: (err as Error).message,
      });
    }
  });

  // ---------- GET /ready — readiness probe ----------
  app.get('/ready', async (_req, res) => {
    try {
      const [redisCheck, supabaseCheck] = await Promise.all([
        checkRedis(),
        checkSupabase(),
      ]);

      // Verify all queues are reachable
      const queueChecks = await Promise.all(
        queueInstances.map(async (q) => {
          try {
            await q.getJobCounts('active', 'waiting');
            return { name: q.name, ready: true };
          } catch {
            return { name: q.name, ready: false };
          }
        }),
      );

      const allQueuesReady = queueChecks.every((c) => c.ready);
      const isReady = redisCheck.connected && supabaseCheck.connected && allQueuesReady;

      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not_ready',
        redis: redisCheck.connected,
        supabase: supabaseCheck.connected,
        queues: queueChecks,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, 'Readiness check failed');
      res.status(503).json({
        status: 'not_ready',
        error: (err as Error).message,
      });
    }
  });

  // ---------- GET /health/ready — alias for /ready ----------
  app.get('/health/ready', (req, res) => {
    // Forward to /ready handler by redirecting internally via the router
    req.url = '/ready';
    app(req, res);
  });

  // ---------- GET /health/metrics — Prometheus-compatible ----------
  app.get('/health/metrics', async (_req, res) => {
    try {
      const lines: string[] = [];

      lines.push('# HELP beetlesense_jobs_processed_total Total jobs processed successfully');
      lines.push('# TYPE beetlesense_jobs_processed_total counter');

      lines.push('# HELP beetlesense_jobs_failed_total Total jobs that failed');
      lines.push('# TYPE beetlesense_jobs_failed_total counter');

      lines.push('# HELP beetlesense_queue_active Number of currently active jobs');
      lines.push('# TYPE beetlesense_queue_active gauge');

      lines.push('# HELP beetlesense_queue_waiting Number of jobs waiting in queue');
      lines.push('# TYPE beetlesense_queue_waiting gauge');

      lines.push('# HELP beetlesense_queue_delayed Number of delayed jobs');
      lines.push('# TYPE beetlesense_queue_delayed gauge');

      lines.push('# HELP beetlesense_queue_completed Total completed jobs (BullMQ counter)');
      lines.push('# TYPE beetlesense_queue_completed gauge');

      lines.push('# HELP beetlesense_queue_failed Total failed jobs (BullMQ counter)');
      lines.push('# TYPE beetlesense_queue_failed gauge');

      for (const q of queueInstances) {
        const counts = await q.getJobCounts(
          'active',
          'waiting',
          'delayed',
          'completed',
          'failed',
        );

        const name = q.name;
        const cumulative = getOrCreateMetrics(name);

        lines.push(`beetlesense_jobs_processed_total{queue="${name}"} ${cumulative.processed}`);
        lines.push(`beetlesense_jobs_failed_total{queue="${name}"} ${cumulative.failed}`);
        lines.push(`beetlesense_queue_active{queue="${name}"} ${counts.active || 0}`);
        lines.push(`beetlesense_queue_waiting{queue="${name}"} ${counts.waiting || 0}`);
        lines.push(`beetlesense_queue_delayed{queue="${name}"} ${counts.delayed || 0}`);
        lines.push(`beetlesense_queue_completed{queue="${name}"} ${counts.completed || 0}`);
        lines.push(`beetlesense_queue_failed{queue="${name}"} ${counts.failed || 0}`);
      }

      // Redis info
      try {
        const redis = getRedisConnection();
        const info = await redis.info('memory');
        const usedMemMatch = info.match(/used_memory:(\d+)/);
        if (usedMemMatch) {
          lines.push('# HELP beetlesense_redis_memory_used_bytes Redis memory usage');
          lines.push('# TYPE beetlesense_redis_memory_used_bytes gauge');
          lines.push(`beetlesense_redis_memory_used_bytes ${usedMemMatch[1]}`);
        }

        const clientInfo = await redis.info('clients');
        const connectedMatch = clientInfo.match(/connected_clients:(\d+)/);
        if (connectedMatch) {
          lines.push('# HELP beetlesense_redis_connected_clients Redis connected clients');
          lines.push('# TYPE beetlesense_redis_connected_clients gauge');
          lines.push(`beetlesense_redis_connected_clients ${connectedMatch[1]}`);
        }
      } catch {
        // Redis metrics unavailable — skip
      }

      // Supabase connectivity
      const supabaseCheck = await checkSupabase();
      lines.push('# HELP beetlesense_supabase_connected Whether Supabase is reachable (1=yes, 0=no)');
      lines.push('# TYPE beetlesense_supabase_connected gauge');
      lines.push(`beetlesense_supabase_connected ${supabaseCheck.connected ? 1 : 0}`);

      // Process uptime
      lines.push('# HELP process_start_time_seconds Start time of the process');
      lines.push('# TYPE process_start_time_seconds gauge');
      lines.push(`process_start_time_seconds ${Math.floor(Date.now() / 1000 - process.uptime())}`);

      lines.push('# HELP process_uptime_seconds Uptime of the worker process');
      lines.push('# TYPE process_uptime_seconds gauge');
      lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

      // Memory
      const mem = process.memoryUsage();
      lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
      lines.push('# TYPE process_resident_memory_bytes gauge');
      lines.push(`process_resident_memory_bytes ${mem.rss}`);

      lines.push('# HELP process_heap_used_bytes Heap used in bytes');
      lines.push('# TYPE process_heap_used_bytes gauge');
      lines.push(`process_heap_used_bytes ${mem.heapUsed}`);

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(lines.join('\n') + '\n');
    } catch (err) {
      logger.error({ err }, 'Metrics generation failed');
      res.status(500).send('# Error generating metrics\n');
    }
  });

  app.listen(HEALTH_PORT, '0.0.0.0', () => {
    logger.info({ port: HEALTH_PORT }, 'Health server listening');
  });
}
