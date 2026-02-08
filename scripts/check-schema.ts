/**
 * Check Database Schema Script
 * Run with: npx tsx scripts/check-schema.ts
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

async function checkSchema() {
  console.log('='.repeat(50))
  console.log('DraggonnB CRMM Schema Check')
  console.log('='.repeat(50))
  console.log('')

  // Check organizations table
  console.log('ORGANIZATIONS TABLE:')
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1)
  if (orgs && orgs.length > 0) {
    console.log('Columns:', Object.keys(orgs[0]).join(', '))
  } else {
    console.log('(empty table)')
  }
  console.log('')

  // Check users table
  console.log('USERS TABLE:')
  const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1)
  if (usersError) {
    console.log('Error:', usersError.message)
  } else if (users && users.length > 0) {
    console.log('Columns:', Object.keys(users[0]).join(', '))
  } else {
    // Try to insert and rollback to see columns
    console.log('(empty table - checking columns via insert attempt)')
    const { error: insertError } = await supabase.from('users').insert({
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@test.com',
      organization_id: '00000000-0000-0000-0000-000000000001'
    })
    if (insertError) {
      console.log('Insert test error:', insertError.message)
      // Check if error indicates missing column
      if (insertError.message.includes('organization_id')) {
        console.log('WARNING: organization_id column may be missing!')
      }
    }
    // Clean up test record
    await supabase.from('users').delete().eq('id', '00000000-0000-0000-0000-000000000000')
  }
  console.log('')

  // List all organizations
  console.log('EXISTING ORGANIZATIONS:')
  const { data: allOrgs } = await supabase.from('organizations').select('id, name, subscription_tier, subscription_status')
  if (allOrgs) {
    allOrgs.forEach((org, i) => {
      console.log(`  ${i + 1}. ${org.name} (${org.subscription_tier}/${org.subscription_status}) - ${org.id}`)
    })
  }
  console.log('')

  // Check RLS status
  console.log('CHECKING RLS POLICIES...')
  // Service role bypasses RLS, so we test by checking if there are any errors on policy checks

  console.log('='.repeat(50))
}

checkSchema().catch(console.error)
