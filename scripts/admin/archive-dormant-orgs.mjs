#!/usr/bin/env node
/**
 * Soft-archives the 3 dormant orgs identified in Phase 09 DIAGNOSTICS.md.
 *
 * EXPLICITLY PRESERVES "DragoonB Business Automation" (platform_admin org —
 * Chris's account). The preservation is enforced two ways:
 *   1. Hardcoded PRESERVED_ORG_ID constant.
 *   2. Belt-and-braces guard that refuses to run if PRESERVED_ORG_ID ever
 *      lands in ARCHIVE_ORG_IDS (catches a future copy-paste mistake).
 *
 * IDs sourced directly from .planning/phases/09-foundations-guard-rails/
 * 09-DIAGNOSTICS-DATA.json (entries with classification='dormant' AND
 * phase10_action='soft-archive', minus the platform_admin org).
 *
 * Usage:
 *   node scripts/admin/archive-dormant-orgs.mjs            # dry run (no writes)
 *   node scripts/admin/archive-dormant-orgs.mjs --apply    # actually archive
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    'FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
  )
  process.exit(1)
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// PRESERVED ORG: DragoonB Business Automation (platform_admin) — must NEVER be archived.
const PRESERVED_ORG_ID = '094a610d-2a05-44a4-9fa5-e6084bb632c9'
const PRESERVED_ORG_NAME = 'DragoonB Business Automation'

// 3 dormant orgs queued for soft-archive (per 09-DIAGNOSTICS-DATA.json).
const ARCHIVE_ORG_IDS = Object.freeze([
  '648ffc0d-1732-43a8-8fb8-2ed69486a0db', // Sunset Beach Resort
  'f898b56b-1988-4500-93a8-0e235b564b7b', // TechStart Solutions
  'dcc325b0-8b7b-40a8-b3da-1b1a87dc34fd', // FIGARIE
])

const APPLY = process.argv.includes('--apply')

async function main() {
  // Belt-and-braces: refuse to proceed if the preserved ID accidentally landed in the archive list.
  if (ARCHIVE_ORG_IDS.includes(PRESERVED_ORG_ID)) {
    console.error(
      `FATAL: PRESERVED_ORG_ID (${PRESERVED_ORG_ID}) appears in ARCHIVE_ORG_IDS — ` +
        'refusing to run. Fix the constants.',
    )
    process.exit(1)
  }

  // Confirm preserved org exists, is unarchived, and the name matches expectation.
  const { data: preserved, error: preservedErr } = await supa
    .from('organizations')
    .select('id, name, archived_at')
    .eq('id', PRESERVED_ORG_ID)
    .maybeSingle()
  if (preservedErr) {
    console.error('Failed to verify preserved org:', preservedErr)
    process.exit(1)
  }
  if (!preserved) {
    console.error(
      `FATAL: preserved org ${PRESERVED_ORG_ID} not found in DB. Refusing to run.`,
    )
    process.exit(1)
  }
  if (preserved.name !== PRESERVED_ORG_NAME) {
    console.error(
      `FATAL: preserved org name mismatch. Expected "${PRESERVED_ORG_NAME}", ` +
        `found "${preserved.name}". Refusing to run.`,
    )
    process.exit(1)
  }
  if (preserved.archived_at) {
    console.error(
      `FATAL: preserved org "${PRESERVED_ORG_NAME}" is already archived ` +
        `(archived_at = ${preserved.archived_at}). Refusing to run.`,
    )
    process.exit(1)
  }

  // Fetch the rows we will archive (and confirm they exist + are still un-archived).
  const { data: orgs, error } = await supa
    .from('organizations')
    .select('id, name, subdomain, archived_at')
    .in('id', ARCHIVE_ORG_IDS)
  if (error) {
    console.error('Failed to fetch archive candidates:', error)
    process.exit(1)
  }

  console.log(
    `\nDormant org IDs to archive (per Phase 09 DIAGNOSTICS-DATA.json):`,
  )
  for (const id of ARCHIVE_ORG_IDS) {
    const row = (orgs ?? []).find((r) => r.id === id)
    if (!row) {
      console.log(`  - ${id}: NOT FOUND in DB (skipping)`)
    } else if (row.archived_at) {
      console.log(
        `  - ${row.name} (${id}): ALREADY archived at ${row.archived_at} (skipping)`,
      )
    } else {
      console.log(`  - ${row.name} (${id}): will archive`)
    }
  }
  console.log(
    `\nPRESERVED: ${PRESERVED_ORG_NAME} (${PRESERVED_ORG_ID}) — platform_admin`,
  )

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to archive.')
    return
  }

  let archivedCount = 0
  for (const id of ARCHIVE_ORG_IDS) {
    if (id === PRESERVED_ORG_ID) continue // unreachable due to guard above; defense-in-depth
    const { error: updErr } = await supa
      .from('organizations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .is('archived_at', null) // don't double-archive
      .neq('id', PRESERVED_ORG_ID) // belt-and-braces
    if (updErr) {
      console.error(`Failed to archive ${id}:`, updErr)
    } else {
      console.log(`Archived: ${id}`)
      archivedCount += 1
    }
  }

  console.log(
    `\nDone. Archived ${archivedCount} org(s). ${PRESERVED_ORG_NAME} preserved.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
