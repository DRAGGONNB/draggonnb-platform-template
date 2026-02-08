/**
 * Check Database Tables Script
 * Run with: npx tsx scripts/check-tables.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Required environment variables are missing')
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const tables = [
  'organizations',
  'users',
  'user_profiles',
  'organization_users',
  'client_usage_metrics',
  'subscription_history',
  'social_posts',
  'platform_metrics',
  'analytics_snapshots',
  'email_templates',
  'email_campaigns',
  'email_sends',
  'email_unsubscribes',
  'email_sequences'
]

async function checkTables() {
  console.log('='.repeat(50))
  console.log('DraggonnB CRMM Database Table Check')
  console.log('='.repeat(50))
  console.log('')

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`)
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }

  console.log('')
  console.log('='.repeat(50))
}

checkTables().catch(console.error)
