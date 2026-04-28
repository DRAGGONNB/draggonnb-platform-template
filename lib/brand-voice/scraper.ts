/**
 * Brand Voice URL Scraper (VOICE-01)
 * Fetches a website and extracts brand context via cheerio.
 * Used by the wizard to pre-populate brand voice inputs.
 */

import * as cheerio from 'cheerio'

export interface ScrapedBrandContext {
  title: string | null
  description: string | null
  h1: string | null
  aboutText: string | null
  logoAlt: string | null
}

/**
 * Scrape a public URL for brand context signals.
 * Throws on network error, timeout, or non-200 response — let the API route map to 400/502.
 */
export async function scrapeWebsiteContext(url: string): Promise<ScrapedBrandContext> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  let html: string
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DraggonnB-BrandWizard/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`)
    }
    html = await res.text()
  } catch (err) {
    clearTimeout(timer)
    throw err
  }

  const $ = cheerio.load(html)

  const title = $('title').first().text().trim() || null
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null
  const h1 = $('h1').first().text().trim() || null
  const logoAlt = $('img[class*="logo"], img[id*="logo"], img[alt*="logo"]').first().attr('alt')?.trim() || null

  // Try to find about section text (heuristic: about page link text, or section with about in id/class)
  let aboutText: string | null = null
  $('[id*="about" i], [class*="about" i]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (text.length >= 50 && text.length <= 1000) {
      aboutText = text
      return false // break
    }
  })

  return { title, description, h1, aboutText, logoAlt }
}
