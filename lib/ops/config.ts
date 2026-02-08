import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get the ops Supabase client.
 * Uses separate OPS_SUPABASE_URL + OPS_SUPABASE_SERVICE_ROLE_KEY if set,
 * otherwise falls back to createAdminClient() (main project).
 *
 * This enables future migration to a separate ops Supabase project
 * by simply setting two environment variables.
 */
export function getOpsClient() {
  const opsUrl = process.env.OPS_SUPABASE_URL
  const opsKey = process.env.OPS_SUPABASE_SERVICE_ROLE_KEY

  if (opsUrl && opsKey) {
    return createClient(opsUrl, opsKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // Fallback to main admin client
  return createAdminClient()
}
