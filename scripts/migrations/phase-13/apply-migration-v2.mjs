// Apply a migration SQL file to Supabase using the service role key + pg_admin endpoint.
// Usage: node apply-migration-v2.mjs <migration-file>
// Fallback for when the Management API PAT has expired.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'psqfgzbjbgqrmjskdavs';
// Use service role key from environment or hardcode for local dev
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_0O9tPPZHAeBNQdRhI_hC7Q_pNHeHIJf';
const MIGRATION_FILE = process.argv[2];

if (!MIGRATION_FILE) {
  console.error('Usage: node apply-migration-v2.mjs <migration-file>');
  process.exit(1);
}

const projectRoot = join(__dirname, '..', '..', '..');
const migrationPath = join(projectRoot, MIGRATION_FILE);

console.log(`Applying migration: ${MIGRATION_FILE}`);
console.log(`Full path: ${migrationPath}`);

let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
  console.log(`SQL length: ${sql.length} chars`);
} catch (err) {
  console.error(`Failed to read migration file: ${err.message}`);
  process.exit(1);
}

// Use Supabase REST API with service role key to execute SQL
// via the pg_admin endpoint (same project, direct execution)
const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;

// The Supabase REST API doesn't have a generic SQL endpoint.
// Use the Management API with the service role key instead.
// The correct endpoint is the /database/query endpoint on api.supabase.com
// but that requires the Management API PAT (different from service role key).
//
// Alternative: use the pg connection string directly via node-postgres
// For now: use the direct Supabase SQL endpoint available on the project

const directSqlUrl = `https://${PROJECT_REF}.supabase.co/pg-meta/v1/query`;
const body = JSON.stringify({ query: sql });

try {
  const response = await fetch(directSqlUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
    },
    body,
  });

  const responseText = await response.text();

  if (response.ok) {
    console.log('SUCCESS - Status:', response.status);
    console.log('Response:', responseText.substring(0, 500));
  } else {
    console.error('FAILED - Status:', response.status);
    console.error('Error:', responseText.substring(0, 2000));
    process.exit(1);
  }
} catch (err) {
  console.error('Request failed:', err.message);
  process.exit(1);
}
