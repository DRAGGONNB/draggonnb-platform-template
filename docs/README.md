# DraggonnB CRMM Documentation

This directory contains comprehensive documentation for the DraggonnB CRMM project.

## Available Documentation

### Database Verification
- **DATABASE_VERIFICATION_REPORT.md** - Complete verification status report and next steps
- **DATABASE_VERIFICATION_GUIDE.md** - Step-by-step guide for all verification methods

## Quick Start: Verify Database Schema

The database schema needs to be verified before proceeding with development. Choose one method:

### Method 1: Web-Based (Easiest)
```bash
npm run dev
```
Then visit: http://localhost:3000/api/admin/verify-database

### Method 2: Command Line
```bash
npm install
npm run db:verify
```

### Method 3: Manual SQL
See DATABASE_VERIFICATION_GUIDE.md for SQL queries to run in Supabase Dashboard

## What to Do Next

1. Read **DATABASE_VERIFICATION_REPORT.md** for current status
2. Run verification using your preferred method
3. If tables are missing, run the migration file in Supabase SQL Editor
4. Proceed to N8N workflow configuration and PayFast integration

## Related Files

- Migration file: `../supabase/migrations/00_initial_schema.sql`
- Verification script: `../scripts/verify-database.js`
- API route: `../app/api/admin/verify-database/route.ts`
- Main docs: `../CLAUDE.md`
