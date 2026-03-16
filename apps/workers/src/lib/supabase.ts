import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { logger } from './logger.js'

let client: SupabaseClient | null = null

/**
 * Returns a Supabase admin client using the service role key.
 * This bypasses RLS — use only in worker/server contexts.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client

  client = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  logger.info('Supabase admin client initialized')
  return client
}
