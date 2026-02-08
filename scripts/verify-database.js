/**
 * Database Schema Verification Script
 * Connects to Supabase and verifies all required tables exist
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Required tables for MVP
const REQUIRED_TABLES = [
  'organizations',
  'users',
  'client_usage_metrics',
  'subscription_history',
  'social_posts',
  'analytics_snapshots',
  'platform_metrics'
];

// Expected columns for each critical table
const EXPECTED_COLUMNS = {
  organizations: ['id', 'name', 'subscription_tier', 'subscription_status', 'owner_id', 'payfast_subscription_token', 'next_billing_date'],
  users: ['id', 'email', 'full_name', 'role', 'organization_id'],
  client_usage_metrics: ['id', 'organization_id', 'posts_monthly', 'ai_generations_monthly', 'posts_limit', 'ai_generations_limit'],
  subscription_history: ['id', 'organization_id', 'transaction_id', 'payment_method', 'status', 'amount_gross', 'amount_fee', 'amount_net'],
  social_posts: ['id', 'organization_id', 'content', 'platforms', 'status', 'scheduled_for', 'published_at'],
  analytics_snapshots: ['id', 'organization_id', 'snapshot_date', 'period_type', 'total_posts', 'total_engagements'],
  platform_metrics: ['id', 'post_id', 'organization_id', 'platform', 'likes', 'comments', 'shares', 'impressions']
};

async function verifyDatabase() {
  console.log('\n========================================');
  console.log('DATABASE SCHEMA VERIFICATION REPORT');
  console.log('========================================\n');

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERROR: Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  console.log(`   Supabase URL: ${SUPABASE_URL}\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Query all tables in public schema
    const { data: tables, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
    });

    // If RPC doesn't exist, try direct query
    let existingTables = [];
    if (error) {
      console.log('⚠️  Using alternative query method...\n');

      // Try querying each table individually
      for (const tableName of REQUIRED_TABLES) {
        const { error: tableError } = await supabase
          .from(tableName)
          .select('id')
          .limit(0);

        if (!tableError) {
          existingTables.push(tableName);
        }
      }
    } else {
      existingTables = tables.map(t => t.table_name);
    }

    // Verify required tables
    console.log('TABLE VERIFICATION:');
    console.log('-------------------\n');

    const missingTables = [];
    const foundTables = [];

    for (const tableName of REQUIRED_TABLES) {
      const exists = existingTables.includes(tableName);
      if (exists) {
        console.log(`✅ ${tableName}`);
        foundTables.push(tableName);
      } else {
        console.log(`❌ ${tableName} - MISSING`);
        missingTables.push(tableName);
      }
    }

    console.log(`\n📊 Summary: ${foundTables.length}/${REQUIRED_TABLES.length} required tables exist\n`);

    // Verify columns for existing tables
    if (foundTables.length > 0) {
      console.log('\nCOLUMN VERIFICATION:');
      console.log('--------------------\n');

      for (const tableName of foundTables) {
        if (!EXPECTED_COLUMNS[tableName]) continue;

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (!error && data !== null) {
          console.log(`✅ ${tableName} - columns accessible`);
        } else {
          console.log(`⚠️  ${tableName} - could not verify columns (RLS may be blocking)`);
        }
      }
    }

    // Check RLS status
    console.log('\n\nROW LEVEL SECURITY (RLS) STATUS:');
    console.log('--------------------------------\n');

    for (const tableName of foundTables) {
      const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT relrowsecurity
          FROM pg_class
          WHERE relname = '${tableName}'
        `
      });

      if (!rlsError && rlsData && rlsData.length > 0) {
        const rlsEnabled = rlsData[0].relrowsecurity;
        console.log(`${rlsEnabled ? '🔒' : '🔓'} ${tableName} - RLS ${rlsEnabled ? 'ENABLED' : 'DISABLED'}`);
      } else {
        console.log(`⚠️  ${tableName} - RLS status unknown`);
      }
    }

    // Final recommendations
    console.log('\n\n========================================');
    console.log('RECOMMENDATIONS:');
    console.log('========================================\n');

    if (missingTables.length > 0) {
      console.log('❌ CRITICAL: Missing tables detected!');
      console.log('   Missing tables:', missingTables.join(', '));
      console.log('\n   ACTION REQUIRED:');
      console.log('   1. Run migration: npm run supabase:migrate');
      console.log('   2. Or manually execute: supabase/migrations/00_initial_schema.sql');
      console.log('   3. Re-run this verification script\n');
    } else {
      console.log('✅ All required tables exist!');
      console.log('\n   NEXT STEPS:');
      console.log('   1. Enable RLS policies for production (if not already enabled)');
      console.log('   2. Test database operations with sample data');
      console.log('   3. Configure N8N workflows with database credentials\n');
    }

    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ ERROR during verification:');
    console.error('   ', err.message);
    console.error('\n   This might indicate:');
    console.error('   - Database connection issues');
    console.error('   - Invalid service role key');
    console.error('   - Network connectivity problems\n');
    process.exit(1);
  }
}

// Run verification
verifyDatabase().catch(console.error);
