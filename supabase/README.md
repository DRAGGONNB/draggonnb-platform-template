# DraggonnB CRMM - Database Deployment Guide

## Overview

This directory contains SQL migration files for the DraggonnB CRMM database schema.

**Database:** Supabase (PostgreSQL 15+)
**Project ID:** `psqfgzbjbgqrmjskdavs`
**Project URL:** https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs

---

## Migration Files

### 00_initial_schema.sql
Creates the 7 critical tables needed for MVP functionality:

1. **organizations** - Client organization records
2. **users** - User profiles linked to auth.users
3. **client_usage_metrics** - Usage tracking and limits
4. **subscription_history** - Payment transaction logs
5. **social_posts** - Generated and published content
6. **analytics_snapshots** - Aggregated analytics data
7. **platform_metrics** - Per-post engagement metrics

Also includes:
- Foreign key relationships and indexes
- Triggers for `updated_at` timestamps
- Helper function: `create_user_with_organization()` for atomic signup

### 01_rls_policies.sql
Implements Row Level Security (RLS) policies for multi-tenant data isolation:

- Enables RLS on all tables
- Organization-scoped access policies
- Service role bypass for API operations
- Admin/manager role permissions

---

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended for First Deploy)

1. **Login to Supabase:**
   - Go to: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
   - Navigate to: **SQL Editor** (left sidebar)

2. **Deploy Initial Schema:**
   - Click "New Query"
   - Copy entire contents of `00_initial_schema.sql`
   - Paste into SQL editor
   - Click "Run" (or press F5)
   - Wait for "Success" message

3. **Deploy RLS Policies:**
   - Click "New Query" again
   - Copy entire contents of `01_rls_policies.sql`
   - Paste into SQL editor
   - Click "Run"
   - Wait for "Success" message

4. **Verify Deployment:**
   ```sql
   -- Check that all tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Expected output: 7 tables
   -- analytics_snapshots
   -- client_usage_metrics
   -- organizations
   -- platform_metrics
   -- social_posts
   -- subscription_history
   -- users
   ```

5. **Verify RLS is Enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND rowsecurity = TRUE
   ORDER BY tablename;

   -- Expected: All 7 tables with rowsecurity = TRUE
   ```

### Option 2: Supabase CLI (For Automated Deployments)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref psqfgzbjbgqrmjskdavs

# Run migrations
supabase db push

# Verify
supabase db dump
```

### Option 3: Direct PostgreSQL Connection

```bash
# Get connection string from Supabase dashboard
# Settings → Database → Connection string (URI)

psql "postgresql://postgres:[YOUR-PASSWORD]@db.psqfgzbjbgqrmjskdavs.supabase.co:5432/postgres" \
  -f migrations/00_initial_schema.sql \
  -f migrations/01_rls_policies.sql
```

---

## Post-Deployment Testing

### 1. Test Signup Flow

Run this SQL to simulate the signup process:

```sql
-- Call the atomic signup function
SELECT create_user_with_organization(
  'test-user-uuid'::uuid,
  'test@example.com',
  'Test User',
  'Test Organization'
);

-- Verify records created
SELECT * FROM organizations WHERE name = 'Test Organization';
SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM client_usage_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Test Organization');

-- Cleanup test data
DELETE FROM organizations WHERE name = 'Test Organization';
```

### 2. Test RLS Policies

```sql
-- Create two test users in different organizations
SELECT create_user_with_organization(
  'user-a-uuid'::uuid, 'usera@example.com', 'User A', 'Org A'
);
SELECT create_user_with_organization(
  'user-b-uuid'::uuid, 'userb@example.com', 'User B', 'Org B'
);

-- Impersonate User A
SET request.jwt.claims.sub TO 'user-a-uuid';

-- Try to query User B's organization (should return 0 rows)
SELECT * FROM organizations WHERE name = 'Org B';

-- Query own organization (should return 1 row)
SELECT * FROM organizations WHERE name = 'Org A';

-- Reset
RESET request.jwt.claims.sub;

-- Cleanup
DELETE FROM organizations WHERE name IN ('Org A', 'Org B');
```

### 3. Test Usage Metrics

```sql
-- Insert test organization
INSERT INTO organizations (id, name, subscription_tier, subscription_status, owner_id)
VALUES ('test-org-id'::uuid, 'Test Org', 'starter', 'active', 'test-user-id'::uuid);

-- Insert usage metrics
INSERT INTO client_usage_metrics (organization_id, posts_monthly, ai_generations_monthly)
VALUES ('test-org-id'::uuid, 5, 10);

-- Query metrics
SELECT * FROM client_usage_metrics WHERE organization_id = 'test-org-id'::uuid;

-- Cleanup
DELETE FROM organizations WHERE id = 'test-org-id'::uuid;
```

---

## Rollback Procedure

If you need to roll back the schema:

```sql
-- WARNING: This will delete ALL data!

DROP TABLE IF EXISTS platform_metrics CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;
DROP TABLE IF NOT EXISTS social_posts CASCADE;
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS client_usage_metrics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS create_user_with_organization CASCADE;
```

---

## Troubleshooting

### Issue: "relation already exists"
**Solution:** Schema is already deployed. Either skip deployment or run DROP statements first.

### Issue: RLS policy blocks service role
**Solution:** Ensure service role has bypass policy:
```sql
CREATE POLICY "Service role full access"
  ON table_name FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### Issue: Foreign key constraint violation
**Solution:** Ensure parent records exist before inserting child records. Use the atomic `create_user_with_organization()` function for signup.

### Issue: Can't connect to database
**Solution:**
1. Check Supabase project is not paused
2. Verify connection string and password
3. Check IP allowlist in Supabase settings

---

## Schema Maintenance

### Adding New Migrations

1. Create new file: `02_description.sql`
2. Write forward migration SQL
3. Test on local/staging first
4. Deploy to production
5. Update this README

### Backup Procedure

```bash
# Export current schema
supabase db dump > backup_$(date +%Y%m%d).sql

# Or via pg_dump
pg_dump "postgresql://..." > backup.sql
```

### Monitoring

- **Table Sizes:** Dashboard → Database → Size
- **Active Connections:** Dashboard → Database → Connections
- **Slow Queries:** Dashboard → Database → Query Performance

---

## Support

**Documentation:** See `CLAUDE.md` for full project documentation
**Issues:** Create GitHub issue or contact project admin
**Supabase Support:** https://supabase.com/support
