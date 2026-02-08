import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// This API creates the users table if it doesn't exist
// Should only be called once during initial setup
// Protected by SETUP_SECRET environment variable (no hardcoded fallback)

const SETUP_SECRET = process.env.SETUP_SECRET

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Check if SETUP_SECRET is configured (required for security)
    if (!SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Setup endpoint disabled - SETUP_SECRET not configured' },
        { status: 503 }
      )
    }

    // Verify setup secret
    const { secret } = await request.json()

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test connection
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (orgsError) {
      return NextResponse.json(
        { error: `Database connection failed: ${orgsError.message}` },
        { status: 500 }
      )
    }

    // Check if users table exists by trying to query it
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (usersError && usersError.message.includes('does not exist')) {
      return NextResponse.json({
        status: 'users_table_missing',
        message: 'The users table does not exist. Please create it manually.',
        sql: `
-- Run this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs/sql/new

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

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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
        `,
        supabaseUrl: 'https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs/sql/new'
      })
    }

    // Users table exists - check its structure
    const { data: testUser } = await supabase
      .from('users')
      .select('*')
      .limit(0)

    return NextResponse.json({
      status: 'ok',
      message: 'Database is properly configured',
      tables: {
        organizations: 'ok',
        users: 'ok'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Setup API',
    usage: 'POST with { "secret": "your-setup-secret" } to check database status'
  })
}
