import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { ProvisioningResult } from '../../../lib/provisioning/types';

export async function cloneSchemaToProject(
  databaseUrl: string,
  projectRef: string
): Promise<ProvisioningResult> {
  try {
    // 1. Read template schema
    const schemaPath = path.join(__dirname, '../template/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`Cloning schema to project ${projectRef}...`);

    // 2. Connect to new project DB
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      // 3. Execute schema (creates tables, indexes, and RLS policies)
      await client.query(schema);

      console.log('Schema cloned successfully');

      // 4. Verify RLS is enabled on all tables
      await enableRLSOnAllTables(client);

      return {
        success: true,
        step: 'database-schema'
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Database schema cloning failed:', error);
    return {
      success: false,
      step: 'database-schema',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function enableRLSOnAllTables(client: Client): Promise<void> {
  console.log('Verifying RLS is enabled on all tables...');

  // Execute RLS enable for all public tables
  // This is idempotent - safe to run even if already enabled
  const rlsScript = `
    DO $$
    DECLARE
      tbl record;
      enabled_count integer := 0;
    BEGIN
      FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        enabled_count := enabled_count + 1;
      END LOOP;
      RAISE NOTICE 'RLS enabled on % tables', enabled_count;
    END $$;
  `;

  await client.query(rlsScript);
  console.log('RLS verification complete');
}
