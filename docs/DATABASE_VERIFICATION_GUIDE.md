# Database Schema Verification Guide

**Project:** DraggonnB CRMM
**Supabase Project:** psqfgzbjbgqrmjskdavs
**Date:** 2025-12-26

---

## Overview

This guide provides multiple methods to verify the DraggonnB CRMM database schema deployment on Supabase.

---

## Method 1: Web-Based Verification (Recommended for Development)

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Access the Verification Endpoint

Open your browser and navigate to:

```
http://localhost:3000/api/admin/verify-database
```

This will return a JSON report showing:
- Which tables exist
- Which tables are missing
- Record counts for each table
- RLS status
- Recommendations for next steps

**Example Response:**

```json
{
  "status": "success",
  "summary": "7/7 tables verified",
  "results": {
    "timestamp": "2025-12-26T10:30:00.000Z",
    "tables": {
      "required": 7,
      "found": 7,
      "missing": [],
      "details": {
        "organizations": {
          "exists": true,
          "accessible": true,
          "recordCount": 0
        }
      }
    },
    "recommendations": [
      "SUCCESS: All required tables exist",
      "Next: Verify RLS policies are configured"
    ]
  }
}
```

---

## Method 2: Node.js Script (Command Line)

### Step 1: Install Dependencies (if not already done)

```bash
npm install
```

### Step 2: Run the Verification Script

```bash
npm run db:verify
```

This will output a detailed console report showing table status, columns, and RLS configuration.

---

## Method 3: Direct SQL Queries (Supabase Dashboard)

### Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
2. Navigate to: **SQL Editor**
3. Run the queries below

### Query 1: List All Tables in Public Schema

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Output (7 tables):**
- analytics_snapshots
- client_usage_metrics
- organizations
- platform_metrics
- social_posts
- subscription_history
- users

---

### Query 2: Verify Table Columns

#### Organizations Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'organizations'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- name (text)
- subscription_tier (text)
- subscription_status (text)
- owner_id (uuid)
- payfast_subscription_token (text)
- next_billing_date (date)
- created_at (timestamp)
- updated_at (timestamp)

#### Users Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- email (text)
- full_name (text)
- role (text)
- organization_id (uuid)
- created_at (timestamp)
- updated_at (timestamp)

#### Client Usage Metrics Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_usage_metrics'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- organization_id (uuid)
- posts_monthly (integer)
- ai_generations_monthly (integer)
- posts_limit (integer)
- ai_generations_limit (integer)
- reset_date (timestamp)

#### Subscription History Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'subscription_history'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- organization_id (uuid)
- transaction_id (text)
- payment_method (text)
- status (text)
- amount_gross (numeric)
- amount_fee (numeric)
- amount_net (numeric)
- currency (text)
- created_at (timestamp)

#### Social Posts Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'social_posts'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- organization_id (uuid)
- content (text)
- platforms (ARRAY)
- status (text)
- scheduled_for (timestamp)
- published_at (timestamp)
- platform_post_ids (jsonb)

#### Analytics Snapshots Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'analytics_snapshots'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- organization_id (uuid)
- snapshot_date (date)
- period_type (text)
- total_posts (integer)
- total_engagements (integer)
- engagement_rate (numeric)

#### Platform Metrics Table

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'platform_metrics'
ORDER BY ordinal_position;
```

**Expected Key Columns:**
- id (uuid)
- post_id (uuid)
- organization_id (uuid)
- platform (text)
- likes (integer)
- comments (integer)
- shares (integer)
- impressions (integer)
- reach (integer)

---

### Query 3: Check Row Level Security (RLS) Status

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Output:**
- All tables should show `rls_enabled = false` initially (for development)
- BEFORE PRODUCTION: RLS must be enabled on all tables

**To Enable RLS (when ready for production):**

```sql
-- Enable RLS on all critical tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
```

---

### Query 4: Verify Triggers

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- `update_organizations_updated_at` on organizations
- `update_users_updated_at` on users
- `update_usage_metrics_updated_at` on client_usage_metrics
- `update_social_posts_updated_at` on social_posts
- `update_platform_metrics_updated_at` on platform_metrics

---

### Query 5: Verify Helper Functions

```sql
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Expected Functions:**
- `update_updated_at_column()` - Trigger function for auto-updating timestamps
- `create_user_with_organization()` - Atomic user + org creation

---

### Query 6: Test Record Counts

```sql
SELECT
  'organizations' AS table_name,
  COUNT(*) AS record_count
FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'client_usage_metrics', COUNT(*) FROM client_usage_metrics
UNION ALL
SELECT 'subscription_history', COUNT(*) FROM subscription_history
UNION ALL
SELECT 'social_posts', COUNT(*) FROM social_posts
UNION ALL
SELECT 'analytics_snapshots', COUNT(*) FROM analytics_snapshots
UNION ALL
SELECT 'platform_metrics', COUNT(*) FROM platform_metrics
ORDER BY table_name;
```

**Expected Output (for fresh database):**
- All counts should be `0` initially

---

## Method 4: Supabase CLI Verification

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Link to Remote Project

```bash
supabase link --project-ref psqfgzbjbgqrmjskdavs
```

### Step 3: Pull Current Schema

```bash
supabase db pull
```

This will download the current database schema to `supabase/schema.sql` for comparison.

### Step 4: Check Differences

```bash
supabase db diff
```

---

## Troubleshooting

### Issue: "Table does not exist" errors

**Cause:** Migration has not been run yet.

**Solution:**
1. Navigate to Supabase Dashboard → SQL Editor
2. Open the migration file: `C:\Dev\DraggonnB_CRMM\supabase\migrations\00_initial_schema.sql`
3. Copy the entire contents
4. Paste into SQL Editor and run
5. Re-run verification

### Issue: "Permission denied" or "RLS policy violation"

**Cause:** Row Level Security is enabled and blocking service role access (unlikely).

**Solution:**
1. Verify you're using the SERVICE_ROLE_KEY (not ANON_KEY)
2. Check `.env.local` for correct credentials
3. If RLS is blocking, temporarily disable for testing:
   ```sql
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```

### Issue: "Cannot connect to Supabase"

**Cause:** Invalid credentials or network issues.

**Solution:**
1. Verify Supabase URL: `https://psqfgzbjbgqrmjskdavs.supabase.co`
2. Regenerate API keys in Supabase Dashboard → Settings → API
3. Update `.env.local` with new keys
4. Restart development server

---

## Verification Checklist

Use this checklist to ensure complete schema deployment:

- [ ] All 7 required tables exist
  - [ ] organizations
  - [ ] users
  - [ ] client_usage_metrics
  - [ ] subscription_history
  - [ ] social_posts
  - [ ] analytics_snapshots
  - [ ] platform_metrics

- [ ] All tables have expected columns (use Query 2)
- [ ] All triggers are active (use Query 4)
- [ ] Helper functions exist (use Query 5)
- [ ] RLS status is known (disabled for dev, enabled for prod)
- [ ] Foreign key constraints are working
- [ ] Indexes are created (check in Supabase Dashboard → Database → Indexes)

---

## Next Steps After Verification

### If Tables Are Missing:
1. Run migration: Execute `supabase/migrations/00_initial_schema.sql` in Supabase SQL Editor
2. Re-verify using any method above
3. Proceed to data insertion testing

### If All Tables Exist:
1. ✅ Schema deployment complete
2. Test data insertion (create sample organization)
3. Configure N8N workflows with Supabase credentials
4. Enable RLS policies before production
5. Set up backup strategy

---

## Sample Data Insertion Test

Once schema is verified, test with sample data:

```sql
-- Test: Create a sample organization
SELECT create_user_with_organization(
  gen_random_uuid(), -- user_id (temporary, will be replaced by auth.users)
  'test@example.com',
  'Test User',
  'Test Organization'
);

-- Verify insertion
SELECT * FROM organizations LIMIT 1;
SELECT * FROM users LIMIT 1;
SELECT * FROM client_usage_metrics LIMIT 1;
```

**Expected Result:**
- 1 organization created
- 1 user linked to organization
- 1 usage metrics record initialized

---

## Support

For issues or questions:
- **Supabase Documentation:** https://supabase.com/docs
- **Project CLAUDE.md:** C:\Dev\DraggonnB_CRMM\CLAUDE.md
- **Migration File:** C:\Dev\DraggonnB_CRMM\supabase\migrations\00_initial_schema.sql

---

**Last Updated:** 2025-12-26
**Schema Version:** 1.0.0
