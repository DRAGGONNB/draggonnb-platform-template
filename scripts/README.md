# Database Scripts

Utility scripts for managing the DraggonnB CRMM database.

## Prerequisites

All scripts require environment variables to be set. Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these values from your Supabase project dashboard: Settings > API

## Available Scripts

### check-tables.ts
Check which database tables exist and their row counts.
```bash
npx tsx scripts/check-tables.ts
```

### check-schema.ts
Inspect the schema of core tables (organizations, users).
```bash
npx tsx scripts/check-schema.ts
```

### create-users-table.ts
Outputs the SQL needed to create the users table (does not execute automatically).
```bash
npx tsx scripts/create-users-table.ts
```

### execute-sql.ts
Helper for executing SQL statements (provides manual instructions).
```bash
npx tsx scripts/execute-sql.ts
```

### run-setup.ts
Runs the full database setup from `setup-database.sql`.
```bash
npx tsx scripts/run-setup.ts
```

### setup-db-postgres.ts
Direct PostgreSQL setup using the `pg` package.
```bash
npx tsx scripts/setup-db-postgres.ts
```

## Security Notes

- Never commit credentials to version control
- Always use environment variables for sensitive data
- The service role key bypasses Row Level Security - use with caution
- Scripts are for development/setup only, not production use
