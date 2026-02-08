/**
 * Execute SQL via Supabase Management API
 * This requires the Supabase database URL or we can use postgres package
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrlEnv || !supabaseServiceKeyEnv) {
  console.error('ERROR: Required environment variables are missing')
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabaseUrl: string = supabaseUrlEnv
const supabaseServiceKey: string = supabaseServiceKeyEnv

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// The SQL to execute
const createTableSQL = `
-- Create users table that links auth.users to organizations
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`

async function executeSQL() {
  console.log('Attempting to execute SQL...')
  console.log('')

  // Try using fetch to call the SQL endpoint directly
  // This requires the access token which we'll need to get from the project settings

  // Alternative: Try to access the PostgreSQL directly
  // The database connection string is: postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

  // For now, let's try a workaround - check if there's an existing RPC function we can use

  // First, let's try to create the table by using the Data API to POST to a non-existent table
  // This won't work for creating tables, but let's verify

  console.log('Testing direct SQL execution via fetch...')

  // The Supabase project should have pg_net extension which allows HTTP requests
  // Or we can use the REST API with X-Client-Info header

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'exec_sql',
        sql: createTableSQL
      })
    })

    if (!response.ok) {
      console.log('RPC approach failed:', response.status, await response.text())
    } else {
      console.log('Success:', await response.json())
    }
  } catch (e) {
    console.log('Fetch error:', e)
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('MANUAL STEPS REQUIRED:')
  console.log('='.repeat(60))
  console.log('')
  console.log('1. Go to: https://supabase.com/dashboard (open your project SQL Editor)')
  console.log('')
  console.log('2. Copy and paste this SQL:')
  console.log('')
  console.log(createTableSQL)
  console.log('')
  console.log('3. Click "Run" to execute')
  console.log('')
  console.log('4. Then add these RLS policies:')
  console.log('')
  console.log(`
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view users in their organization" ON public.users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE USING (id = auth.uid());
`)
  console.log('')
  console.log('='.repeat(60))
}

executeSQL().catch(console.error)
