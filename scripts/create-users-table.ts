/**
 * Create Users Table Script
 * Run with: npx tsx scripts/create-users-table.ts
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

async function createUsersTable() {
  console.log('='.repeat(50))
  console.log('Creating Users Table')
  console.log('='.repeat(50))
  console.log('')

  // Since we can't run raw SQL, let's check if we can use the rpc function
  // First, let's see if there's an existing users table or if it was named differently

  // Check user_profiles table
  console.log('Checking user_profiles table...')
  const { data: userProfiles, error: upError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)

  if (upError) {
    console.log('user_profiles error:', upError.message)
  } else {
    console.log('user_profiles columns:', userProfiles?.length ? Object.keys(userProfiles[0]).join(', ') : '(empty)')
  }

  // Check organization_users table
  console.log('Checking organization_users table...')
  const { data: orgUsers, error: ouError } = await supabase
    .from('organization_users')
    .select('*')
    .limit(1)

  if (ouError) {
    console.log('organization_users error:', ouError.message)
  } else {
    console.log('organization_users columns:', orgUsers?.length ? Object.keys(orgUsers[0]).join(', ') : '(empty)')
  }

  console.log('')
  console.log('='.repeat(50))
  console.log('')
  console.log('The users table does not exist in the database.')
  console.log('')
  console.log('Please run the following SQL in the Supabase SQL Editor:')
  console.log('https://supabase.com/dashboard (open your project SQL Editor)')
  console.log('')
  console.log(`
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`)
  console.log('')
  console.log('='.repeat(50))
}

createUsersTable().catch(console.error)
