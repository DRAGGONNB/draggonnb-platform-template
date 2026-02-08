import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidRedirectUrl } from '@/lib/security/url-validator'

// 1x1 transparent GIF for open tracking
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

/**
 * GET /api/email/track?type=open&id=xxx
 * GET /api/email/track?type=click&id=xxx&url=xxx
 *
 * Handles email open and click tracking
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const emailSendId = searchParams.get('id')
  const redirectUrl = searchParams.get('url')

  if (!emailSendId) {
    // Return transparent pixel for opens, 400 for clicks
    if (type === 'open') {
      return new NextResponse(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }
    return NextResponse.json({ error: 'Missing email send ID' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    if (type === 'open') {
      // Track email open
      const now = new Date().toISOString()

      // Get current record
      const { data: sendRecord } = await supabase
        .from('email_sends')
        .select('status, opened_at, open_count')
        .eq('id', emailSendId)
        .single()

      if (sendRecord) {
        // Update open tracking
        const updates: Record<string, unknown> = {
          open_count: (sendRecord.open_count || 0) + 1,
        }

        // Only update status and opened_at on first open
        if (!sendRecord.opened_at) {
          updates.opened_at = now
          updates.status = 'opened'
        }

        await supabase
          .from('email_sends')
          .update(updates)
          .eq('id', emailSendId)
      }

      // Return tracking pixel
      return new NextResponse(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }

    if (type === 'click') {
      if (!redirectUrl) {
        return NextResponse.json({ error: 'Missing redirect URL' }, { status: 400 })
      }

      // Decode the URL
      const decodedUrl = decodeURIComponent(redirectUrl)

      // Validate URL to prevent open redirect attacks (javascript:, data:, file: etc)
      if (!isValidRedirectUrl(decodedUrl)) {
        return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 })
      }

      // Track click
      const now = new Date().toISOString()

      // Get current record
      const { data: sendRecord } = await supabase
        .from('email_sends')
        .select('status, clicked_at, click_count, clicked_links')
        .eq('id', emailSendId)
        .single()

      if (sendRecord) {
        // Update click tracking
        const clickedLinks = sendRecord.clicked_links || []
        if (!clickedLinks.includes(decodedUrl)) {
          clickedLinks.push(decodedUrl)
        }

        const updates: Record<string, unknown> = {
          click_count: (sendRecord.click_count || 0) + 1,
          clicked_links: clickedLinks,
        }

        // Only update status and clicked_at on first click
        if (!sendRecord.clicked_at) {
          updates.clicked_at = now
          updates.status = 'clicked'
        }

        await supabase
          .from('email_sends')
          .update(updates)
          .eq('id', emailSendId)
      }

      // Redirect to original URL
      return NextResponse.redirect(decodedUrl, 302)
    }

    return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 })
  } catch (error) {
    console.error('Tracking error:', error)

    // For opens, still return pixel to not break email display
    if (type === 'open') {
      return new NextResponse(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store',
        },
      })
    }

    // For clicks, try to redirect anyway (but only if URL is valid)
    if (type === 'click' && redirectUrl) {
      const decodedUrl = decodeURIComponent(redirectUrl)
      if (isValidRedirectUrl(decodedUrl)) {
        return NextResponse.redirect(decodedUrl, 302)
      }
      // Invalid URL in error path - don't redirect
      return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
