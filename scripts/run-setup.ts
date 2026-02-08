/**
 * Database Setup Script
 * Run with: npx tsx scripts/run-setup.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psqfgzbjbgqrmjskdavs.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runSetup() {
  console.log('='.repeat(50))
  console.log('DraggonnB CRMM Database Setup')
  console.log('='.repeat(50))

  // Read SQL file
  const sqlPath = path.join(__dirname, 'setup-database.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  // Split by semicolons but handle edge cases
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/) // Split by ; not inside quotes
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Skip comments and empty statements
    if (!statement || statement.startsWith('--') || statement.trim() === '') {
      continue
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error) {
        console.error(`[${i + 1}] Error: ${error.message}`)
        errorCount++
      } else {
        successCount++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('already exists')) {
        console.log(`[${i + 1}] Skipped (already exists)`)
        successCount++
      } else {
        console.error(`[${i + 1}] Error: ${message}`)
        errorCount++
      }
    }
  }

  console.log('')
  console.log('='.repeat(50))
  console.log(`Setup complete: ${successCount} succeeded, ${errorCount} errors`)
  console.log('='.repeat(50))
}

runSetup().catch(console.error)
