import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/analytics
 * Get email analytics for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const organizationId = userData.organization_id

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const type = searchParams.get('type') || 'overview'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    if (type === 'overview') {
      // Get overall stats
      const { data: sends } = await supabase
        .from('email_sends')
        .select('status, sent_at, opened_at, clicked_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())

      const totalSent = sends?.filter((s) => s.status === 'sent' || s.status === 'delivered').length || 0
      const totalOpened = sends?.filter((s) => s.opened_at).length || 0
      const totalClicked = sends?.filter((s) => s.clicked_at).length || 0
      const totalBounced = sends?.filter((s) => s.status === 'bounced').length || 0
      const totalFailed = sends?.filter((s) => s.status === 'failed').length || 0

      // Get campaign count
      const { count: campaignCount } = await supabase
        .from('email_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())

      // Get sequence stats
      const { data: sequences } = await supabase
        .from('email_sequences')
        .select('total_enrolled, total_completed')
        .eq('organization_id', organizationId)

      const totalEnrolled = sequences?.reduce((sum, s) => sum + (s.total_enrolled || 0), 0) || 0
      const totalCompleted = sequences?.reduce((sum, s) => sum + (s.total_completed || 0), 0) || 0

      return NextResponse.json({
        overview: {
          total_sent: totalSent,
          total_opened: totalOpened,
          total_clicked: totalClicked,
          total_bounced: totalBounced,
          total_failed: totalFailed,
          open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
          click_rate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
          bounce_rate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0,
          campaigns_sent: campaignCount || 0,
          sequence_enrolled: totalEnrolled,
          sequence_completed: totalCompleted,
        },
      })
    }

    if (type === 'timeline') {
      // Get daily stats
      const { data: sends } = await supabase
        .from('email_sends')
        .select('status, sent_at, opened_at, clicked_at, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Group by date
      const dailyStats: Record<
        string,
        { sent: number; opened: number; clicked: number; bounced: number }
      > = {}

      sends?.forEach((send) => {
        const date = new Date(send.created_at).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { sent: 0, opened: 0, clicked: 0, bounced: 0 }
        }
        if (send.status === 'sent' || send.status === 'delivered') {
          dailyStats[date].sent++
        }
        if (send.opened_at) {
          dailyStats[date].opened++
        }
        if (send.clicked_at) {
          dailyStats[date].clicked++
        }
        if (send.status === 'bounced') {
          dailyStats[date].bounced++
        }
      })

      // Convert to array
      const timeline = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      }))

      return NextResponse.json({ timeline })
    }

    if (type === 'campaigns') {
      // Get campaign performance
      const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('id, name, subject, status, stats, created_at, completed_at')
        .eq('organization_id', organizationId)
        .in('status', ['sent', 'sending'])
        .order('created_at', { ascending: false })
        .limit(10)

      return NextResponse.json({ campaigns })
    }

    if (type === 'sequences') {
      // Get sequence performance
      const { data: sequences } = await supabase
        .from('email_sequences')
        .select('id, name, is_active, total_enrolled, total_completed, created_at')
        .eq('organization_id', organizationId)
        .order('total_enrolled', { ascending: false })
        .limit(10)

      return NextResponse.json({ sequences })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
