import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://hfebdtipreitaspqydap.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_6gJWhpaHdY7gX6Sme8ggfA_0NBKK93T';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'mahaposhan-register',
    },
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Diagnostic helper to measure Supabase API reachability and latency.
 */
export async function checkSupabaseHealth(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase URL or Anon Key is missing' };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('schools').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error && error.code !== 'PGRST116') {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: err?.message || 'Network error' };
  }
}

