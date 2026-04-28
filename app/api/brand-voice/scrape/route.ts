/**
 * POST /api/brand-voice/scrape
 * Scrapes a public URL and returns brand context signals.
 *
 * Security: SSRF guard blocks localhost and private IP ranges.
 * Auth: requires valid user session via getUserOrg().
 */

import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { scrapeWebsiteContext } from '@/lib/brand-voice/scraper'
import { z } from 'zod'

const ScrapeInputSchema = z.object({
  url: z.string().url('Must be a valid URL'),
})

export async function POST(req: NextRequest) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: authError ?? 'unauthenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = ScrapeInputSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  // SSRF guard: block requests to private IP ranges and localhost
  // Without this, a tenant can use the scraper to probe internal infrastructure.
  let parsedUrl: URL
  try {
    parsedUrl = new URL(parsed.data.url)
  } catch {
    return Response.json({ error: 'invalid_url' }, { status: 400 })
  }

  const hostname = parsedUrl.hostname
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return Response.json({ error: 'private_url_not_allowed' }, { status: 400 })
  }

  try {
    const ctx = await scrapeWebsiteContext(parsed.data.url)
    return Response.json(ctx)
  } catch (err) {
    return Response.json(
      { error: 'scrape_failed', detail: (err as Error).message },
      { status: 502 },
    )
  }
}
