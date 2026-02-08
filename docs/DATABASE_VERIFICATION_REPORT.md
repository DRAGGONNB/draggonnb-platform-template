# Database Schema Verification Report

**Project:** DraggonnB CRMM
**Supabase Project ID:** psqfgzbjbgqrmjskdavs
**Supabase URL:** https://psqfgzbjbgqrmjskdavs.supabase.co
**Report Date:** 2025-12-26
**Status:** PENDING VERIFICATION

---

## Executive Summary

Database schema verification tools have been created for the DraggonnB CRMM project. The database needs to be verified to confirm that all 7 critical tables exist and are properly configured before proceeding with development.

---

## Verification Methods Created

Three verification methods are now available:

### 1. Web-Based API Verification (Recommended)
- **Endpoint:** `http://localhost:3000/api/admin/verify-database`
- **File:** `C:\Dev\DraggonnB_CRMM\app\api\admin\verify-database\route.ts`
- **Usage:** Start dev server (`npm run dev`) and visit the endpoint in browser
- **Output:** JSON report with table status, counts, and recommendations

### 2. Node.js Command Line Script
- **Command:** `npm run db:verify`
- **File:** `C:\Dev\DraggonnB_CRMM\scripts\verify-database.js`
- **Usage:** Run from terminal after `npm install`
- **Output:** Detailed console report with table verification

### 3. Manual SQL Queries
- **File:** `C:\Dev\DraggonnB_CRMM\docs\DATABASE_VERIFICATION_GUIDE.md`
- **Usage:** Run queries directly in Supabase SQL Editor
- **Output:** Direct database inspection results

---

## Required Tables (7 Critical Tables)

The following tables are REQUIRED for DraggonnB CRMM MVP functionality:

### 1. organizations
**Purpose:** Store client organization records
**Key Columns:**
- id (UUID, primary key)
- name (text)
- subscription_tier (text: 'starter', 'professional', 'enterprise')
- subscription_status (text: 'trial', 'active', 'suspended', 'cancelled')
- owner_id (UUID, references auth.users)
- payfast_subscription_token (text, unique)
- next_billing_date (date)
- created_at, updated_at (timestamps)

### 2. users
**Purpose:** User profiles linked to Supabase authentication
**Key Columns:**
- id (UUID, references auth.users)
- email (text, unique)
- full_name (text)
- role (text: 'admin', 'manager', 'member')
- organization_id (UUID, references organizations)
- created_at, updated_at (timestamps)

### 3. client_usage_metrics
**Purpose:** Track monthly usage for billing limits
**Key Columns:**
- id (UUID, primary key)
- organization_id (UUID, unique, references organizations)
- posts_monthly (integer, default 0)
- ai_generations_monthly (integer, default 0)
- posts_limit (integer, default 30)
- ai_generations_limit (integer, default 50)
- reset_date (timestamp)

### 4. subscription_history
**Purpose:** Log all payment transactions
**Key Columns:**
- id (UUID, primary key)
- organization_id (UUID, references organizations)
- transaction_id (text, unique per transaction)
- payment_method (text, default 'payfast')
- status (text: 'pending', 'completed', 'failed', 'cancelled')
- amount_gross, amount_fee, amount_net (numeric)
- currency (text, default 'ZAR')
- payfast_response (jsonb)

### 5. social_posts
**Purpose:** Store generated and published social media posts
**Key Columns:**
- id (UUID, primary key)
- organization_id (UUID, references organizations)
- content (text)
- platforms (text array: ['linkedin', 'facebook', 'instagram'])
- status (text: 'draft', 'scheduled', 'published', 'failed')
- scheduled_for, published_at (timestamps)
- platform_post_ids (jsonb)
- engagement metrics (likes_count, comments_count, shares_count)

### 6. analytics_snapshots
**Purpose:** Daily/weekly/monthly analytics aggregates
**Key Columns:**
- id (UUID, primary key)
- organization_id (UUID, references organizations)
- snapshot_date (date)
- period_type (text: 'daily', 'weekly', 'monthly')
- Platform-specific metrics (linkedin_posts, facebook_engagements, etc.)
- total_posts, total_engagements, total_reach (integers)
- engagement_rate (numeric)

### 7. platform_metrics
**Purpose:** Per-post engagement metrics
**Key Columns:**
- id (UUID, primary key)
- post_id (UUID, references social_posts)
- organization_id (UUID, references organizations)
- platform (text: 'linkedin', 'facebook', 'instagram', 'twitter')
- likes, comments, shares, impressions, reach (integers)
- engagement_rate (numeric)
- last_fetched_at (timestamp)

---

## Database Functions & Triggers

### Required Functions:
1. **update_updated_at_column()** - Trigger function for auto-updating timestamps
2. **create_user_with_organization()** - Atomic user + organization creation

### Required Triggers:
- update_organizations_updated_at
- update_users_updated_at
- update_usage_metrics_updated_at
- update_social_posts_updated_at
- update_platform_metrics_updated_at

---

## Environment Configuration Status

### Current .env.local Configuration:
✅ NEXT_PUBLIC_SUPABASE_URL configured
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configured
✅ SUPABASE_SERVICE_ROLE_KEY configured

### Keys Present:
- Supabase URL: https://psqfgzbjbgqrmjskdavs.supabase.co
- Anon Key: Present (valid JWT token)
- Service Role Key: Present (valid JWT token)

---

## Row Level Security (RLS) Status

**Current Expected Status:** DISABLED (for development)

**CRITICAL WARNING:**
- RLS must be DISABLED during initial development to allow testing
- RLS MUST be ENABLED before production deployment
- All 7 tables require RLS policies before production

**To Enable RLS (when ready for production):**
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
```

---

## Migration File Details

**Migration File:** `C:\Dev\DraggonnB_CRMM\supabase\migrations\00_initial_schema.sql`
**Status:** Exists and ready for deployment
**Size:** 329 lines
**Version:** 1.0.0
**Target:** Supabase PostgreSQL 15+

### Migration Contents:
- 7 critical table definitions
- Foreign key constraints
- Indexes for performance optimization
- Triggers for auto-updating timestamps
- Helper functions for atomic operations
- Comprehensive comments and documentation

---

## Next Steps to Verify Database

Choose ONE of the following methods:

### Option A: Quick Web Verification (Recommended)
1. Run: `npm run dev`
2. Visit: http://localhost:3000/api/admin/verify-database
3. Review JSON output
4. Follow recommendations

### Option B: Command Line Verification
1. Run: `npm install` (if not done)
2. Run: `npm run db:verify`
3. Review console output
4. Follow recommendations

### Option C: Manual SQL Verification
1. Open: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
2. Go to: SQL Editor
3. Run queries from: `docs\DATABASE_VERIFICATION_GUIDE.md`
4. Compare results with expected output

---

## Expected Verification Outcomes

### Scenario 1: All Tables Exist (READY)
**Indicators:**
- All 7 tables show as "exists: true"
- Record counts are 0 or higher
- No missing tables

**Next Actions:**
1. ✅ Mark schema deployment as COMPLETE
2. Test sample data insertion
3. Configure N8N workflows with Supabase credentials
4. Proceed to PayFast integration testing

### Scenario 2: Tables Missing (NEEDS MIGRATION)
**Indicators:**
- One or more tables show "exists: false"
- Errors like "relation does not exist"

**Next Actions:**
1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/00_initial_schema.sql`
3. Paste and execute in SQL Editor
4. Re-run verification
5. Confirm all tables created

### Scenario 3: Access Denied (RLS BLOCKING)
**Indicators:**
- Tables exist but return "permission denied"
- RLS policy violations

**Next Actions:**
1. Verify using SERVICE_ROLE_KEY (not anon key)
2. Check .env.local credentials
3. Temporarily disable RLS for testing (if needed)
4. Re-run verification

---

## Database Schema Checklist

Use this checklist to confirm complete deployment:

### Tables
- [ ] organizations table exists
- [ ] users table exists
- [ ] client_usage_metrics table exists
- [ ] subscription_history table exists
- [ ] social_posts table exists
- [ ] analytics_snapshots table exists
- [ ] platform_metrics table exists

### Indexes
- [ ] idx_organizations_owner_id
- [ ] idx_users_organization_id
- [ ] idx_usage_organization_id
- [ ] idx_subscription_history_org_id
- [ ] idx_social_posts_org_id
- [ ] idx_analytics_org_id
- [ ] idx_platform_metrics_post_id

### Functions
- [ ] update_updated_at_column() function exists
- [ ] create_user_with_organization() function exists

### Triggers
- [ ] 5 update triggers configured (organizations, users, usage_metrics, social_posts, platform_metrics)

### Foreign Keys
- [ ] users.organization_id → organizations.id
- [ ] client_usage_metrics.organization_id → organizations.id
- [ ] subscription_history.organization_id → organizations.id
- [ ] social_posts.organization_id → organizations.id
- [ ] analytics_snapshots.organization_id → organizations.id
- [ ] platform_metrics.organization_id → organizations.id
- [ ] platform_metrics.post_id → social_posts.id

### Security
- [ ] RLS is DISABLED for development (initial state)
- [ ] Plan to enable RLS before production deployment
- [ ] Service role key is secured in .env.local (not committed to git)

---

## Test Data Insertion

After verification succeeds, test with sample data:

```sql
-- Create a test organization with user
SELECT create_user_with_organization(
  gen_random_uuid(),
  'test@draggonnb.com',
  'Test Admin User',
  'Test Organization Ltd'
);

-- Verify records created
SELECT COUNT(*) FROM organizations; -- Should be 1
SELECT COUNT(*) FROM users; -- Should be 1
SELECT COUNT(*) FROM client_usage_metrics; -- Should be 1
```

---

## Files Created for Verification

1. **API Route:** `C:\Dev\DraggonnB_CRMM\app\api\admin\verify-database\route.ts`
2. **CLI Script:** `C:\Dev\DraggonnB_CRMM\scripts\verify-database.js`
3. **Documentation:** `C:\Dev\DraggonnB_CRMM\docs\DATABASE_VERIFICATION_GUIDE.md`
4. **This Report:** `C:\Dev\DraggonnB_CRMM\docs\DATABASE_VERIFICATION_REPORT.md`
5. **Updated package.json:** Added `db:verify` script and `dotenv` dependency

---

## Troubleshooting

### Error: "Cannot find module 'dotenv'"
**Solution:** Run `npm install` to install dependencies

### Error: "Connection refused"
**Solution:** Check internet connection and Supabase project status

### Error: "Invalid API key"
**Solution:** Regenerate keys in Supabase Dashboard → Settings → API

### Error: "Table does not exist"
**Solution:** Run migration file in Supabase SQL Editor

---

## Support & Documentation

- **Main Documentation:** `C:\Dev\DraggonnB_CRMM\CLAUDE.md`
- **Verification Guide:** `C:\Dev\DraggonnB_CRMM\docs\DATABASE_VERIFICATION_GUIDE.md`
- **Migration File:** `C:\Dev\DraggonnB_CRMM\supabase\migrations\00_initial_schema.sql`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs

---

## Summary

**STATUS:** Verification tools ready, database verification PENDING

**ACTION REQUIRED:** Run ONE of the three verification methods to confirm schema deployment

**BLOCKER STATUS:** This is a CRITICAL BLOCKER for Phase 1 development - must be resolved before:
- PayFast payment testing
- N8N workflow activation
- Frontend dashboard development
- Production deployment

**ESTIMATED TIME TO VERIFY:** 5-10 minutes

---

**Report Generated:** 2025-12-26
**Next Review:** After verification is run and results are obtained
