import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses Row Level Security (RLS).
 *
 * SECURITY: Use ONLY in webhook handlers that validate signatures.
 * This client uses the service role key which has full database access.
 *
 * Valid use cases:
 * - PayFast ITN webhook (validates MD5 signature + server verification)
 * - Resend email webhook (validates HMAC signature)
 *
 * DO NOT use for:
 * - User-facing API routes
 * - Server components with user context
 * - Any endpoint without external signature validation
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Add it to .env.local or Vercel environment variables.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Get it from Supabase Dashboard > Settings > API > service_role key. ' +
      'Add it to .env.local or Vercel environment variables.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
