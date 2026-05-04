// Apply a migration SQL file to the Supabase project via Management API
// Usage: node apply-migration.mjs <migration-file>
// Example: node apply-migration.mjs supabase/migrations/31_brand_voice_columns.sql

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_ad50b10190d42003e1b3ca468f448eece9bf3a0a';
const PROJECT_REF = 'psqfgzbjbgqrmjskdavs';
const MIGRATION_FILE = process.argv[2];

if (!MIGRATION_FILE) {
  console.error('Usage: node apply-migration.mjs <migration-file>');
  process.exit(1);
}

// Resolve from project root (3 levels up from scripts/migrations/phase-10/)
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

const body = JSON.stringify({ query: sql });
const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
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
