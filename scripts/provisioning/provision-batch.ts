#!/usr/bin/env npx tsx
/**
 * Batch Provisioning Runner
 *
 * Usage:
 *   npx tsx scripts/provisioning/provision-batch.ts
 *   npx tsx scripts/provisioning/provision-batch.ts --client bee-mee
 *   npx tsx scripts/provisioning/provision-batch.ts --dry-run
 *
 * Reads client configs from scripts/provisioning/clients/*.json
 * and provisions each one via the orchestrator.
 */

import * as fs from 'fs';
import * as path from 'path';
import { provisionClient } from './orchestrator';
import { validateFullProvisioningEnv } from '../../lib/provisioning/config';

interface ClientManifest {
  clientId: string;
  clientName: string;
  orgEmail: string;
  tier: 'core' | 'growth' | 'scale';
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
    tagline?: string;
    logo_url?: string;
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const singleClient = args.find((_, i) => args[i - 1] === '--client');

  // Validate env
  const envCheck = validateFullProvisioningEnv();
  if (!envCheck.valid) {
    console.error('Missing required env vars:', envCheck.missing.join(', '));
    process.exit(1);
  }
  if (envCheck.optional.length > 0) {
    console.warn('Missing optional env vars (some steps may be skipped):', envCheck.optional.join(', '));
  }

  // Load client configs
  const clientsDir = path.join(__dirname, 'clients');
  if (!fs.existsSync(clientsDir)) {
    console.error(`Clients directory not found: ${clientsDir}`);
    process.exit(1);
  }

  const configFiles = fs.readdirSync(clientsDir)
    .filter(f => f.endsWith('.json'))
    .filter(f => !singleClient || f === `${singleClient}.json`);

  if (configFiles.length === 0) {
    console.error(singleClient
      ? `Client config not found: ${singleClient}.json`
      : 'No client configs found in clients/');
    process.exit(1);
  }

  const clients: ClientManifest[] = configFiles.map(f => {
    const raw = fs.readFileSync(path.join(clientsDir, f), 'utf-8');
    return JSON.parse(raw);
  });

  console.log(`\n=== DraggonnB Batch Provisioning ===`);
  console.log(`Clients: ${clients.map(c => c.clientName).join(', ')}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const results: Array<{ client: string; success: boolean; error?: string }> = [];

  for (const client of clients) {
    console.log(`\n--- Provisioning: ${client.clientName} (${client.clientId}) ---`);
    console.log(`  Tier: ${client.tier}`);
    console.log(`  Email: ${client.orgEmail}`);
    console.log(`  Subdomain: ${client.clientId}.draggonnb.co.za`);

    if (dryRun) {
      console.log('  [DRY RUN] Skipping actual provisioning');
      results.push({ client: client.clientId, success: true });
      continue;
    }

    try {
      const result = await provisionClient(
        client.clientId,
        client.clientName,
        client.orgEmail,
        client.tier,
        client.branding ? { branding: client.branding } : undefined
      );

      if (result.success) {
        console.log(`  OK: ${client.clientName} provisioned`);
        if (result.resources?.organizationId) {
          console.log(`  Org ID: ${result.resources.organizationId}`);
        }
        if (result.resources?.n8nWorkflowId) {
          console.log(`  N8N Workflow: ${result.resources.n8nWorkflowId}`);
        }
      } else {
        console.error(`  FAILED: ${result.error}`);
      }

      results.push({
        client: client.clientId,
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`  EXCEPTION: ${msg}`);
      results.push({ client: client.clientId, success: false, error: msg });
    }
  }

  // Summary
  console.log('\n=== Provisioning Summary ===');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    for (const r of results.filter(r => !r.success)) {
      console.log(`  - ${r.client}: ${r.error}`);
    }
  }

  // Write results to file
  const resultsPath = path.join(__dirname, 'clients', '_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    results,
  }, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
