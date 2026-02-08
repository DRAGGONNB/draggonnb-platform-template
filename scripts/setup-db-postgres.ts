/**
 * Setup Database using Postgres Connection
 * This connects directly to the Postgres database
 *
 * Run with: npx tsx scripts/setup-db-postgres.ts
 */

import { Client } from 'pg'

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[project-ref]:[db-password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
// You need to get the database password from the Supabase dashboard:
// Settings > Database > Connection string > URI

// For transaction mode (Supavisor)
// postgresql://postgres.psqfgzbjbgqrmjskdavs:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

const DATABASE_URL = process.env.DATABASE_URL || ''

if (!DATABASE_URL) {
  console.log('='.repeat(60))
  console.log('DATABASE_URL is not set!')
  console.log('')
  console.log('Please set it by running:')
  console.log('')
  console.log('  export DATABASE_URL="postgresql://postgres.psqfgzbjbgqrmjskdavs:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"')
  console.log('')
  console.log('Or get it from:')
  console.log('  https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs/settings/database')
  console.log('  Under "Connection String" > "Transaction"')
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  console.log('ALTERNATIVE: Run this SQL manually in Supabase SQL Editor:')
  console.log('  https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs/sql/new')
  console.log('')
  console.log('SQL to run:')
  console.log('')
  console.log(`
-- Create users table
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

-- RLS Policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

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
  process.exit(1)
}

const createTableSQL = `
-- Create users table
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

-- RLS Policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

CREATE POLICY "Users can view users in their organization" ON public.users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE USING (id = auth.uid());
`

async function setupDatabase() {
  console.log('='.repeat(60))
  console.log('DraggonnB CRMM Database Setup')
  console.log('='.repeat(60))
  console.log('')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!')
    console.log('')

    console.log('Creating users table and RLS policies...')
    await client.query(createTableSQL)
    console.log('Done!')
    console.log('')

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
    `)

    console.log('Users table columns:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    console.log('')
    console.log('SUCCESS: Database setup complete!')

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }

  console.log('')
  console.log('='.repeat(60))
}

setupDatabase()
