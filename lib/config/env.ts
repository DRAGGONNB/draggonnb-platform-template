/**
 * Validated environment singleton.
 *
 * IMPORTANT: nodejs runtime only. DO NOT import from edge-runtime files
 * (middleware.ts, any route with `export const runtime = 'edge'`).
 * Edge has restricted process.env access; using this module from edge
 * will throw at request time, not at boot.
 *
 * Edge files must read process.env directly with inline guards.
 *
 * EDGE EXCLUSION LIST (audit run 2026-04-26):
 * Command: grep -rn "runtime.*['\"']edge['\"']" app/ lib/ middleware.ts
 * Result: No edge-runtime files found in this codebase.
 * middleware.ts uses Node.js runtime. All API routes use Node.js runtime.
 * Re-run audit if new routes are added with `export const runtime = 'edge'`.
 */
import { envSchema, type Env } from './env-schema'

function buildEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  x ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    const message = `Environment validation failed:\n${errors}\n\nFix .env.local or Vercel env vars and retry.`
    console.error(message)
    throw new Error('Environment validation failed: see logs above')
  }
  return Object.freeze(result.data)
}

export const env: Env = buildEnv()
