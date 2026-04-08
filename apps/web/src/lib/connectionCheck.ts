import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function isSupabaseReachable(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 3000)
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal)
    clearTimeout(id)
    return !error
  } catch {
    return false
  }
}
