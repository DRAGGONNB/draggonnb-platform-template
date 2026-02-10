import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { redirect } from 'next/navigation'
import { RealtimeEngagementChart } from '@/components/dashboard/RealtimeEngagementChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { TopPerformingPosts } from '@/components/dashboard/TopPerformingPosts'
import { BestPostingTimes } from '@/components/dashboard/BestPostingTimes'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { AnalyticsCard } from '@/components/dashboard/AnalyticsCard'

async function getDashboardData(organizationId: string) {
  const supabase = await createClient()

  // Define all queries
  const usageQuery = supabase
    .from('client_usage_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single()

  const contactsQuery = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const dealsQuery = supabase
    .from('deals')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('stage', 'won')

  const postsQuery = supabase
    .from('social_posts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10)

  const analyticsQuery = supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('snapshot_date', { ascending: true })
    .limit(7)

  const topPostsQuery = supabase
    .from('social_posts')
    .select('*, platform_metrics(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(3)

  // Execute all queries in parallel
  const [
    { data: usageData },
    { count: contactsCount },
    { data: deals },
    { data: recentPosts },
    { data: analyticsData },
    { data: topPosts },
  ] = await Promise.all([
    usageQuery,
    contactsQuery,
    dealsQuery,
    postsQuery,
    analyticsQuery,
    topPostsQuery,
  ])

  return {
    usage: usageData,
    contactsCount: contactsCount || 0,
    deals,
    recentPosts,
    analytics: analyticsData,
    topPosts,
  }
}

export default async function DashboardPage() {
  // Get user and organization
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    // If no user/org, redirect to login
    redirect('/login')
  }

  // Fetch data server-side for this organization
  const data = await getDashboardData(userOrg.organizationId)

  // Calculate stats from data
  const postsCount = data.usage?.posts_published || 0
  const engagementRate = 0 // Calculated from platform_metrics when available
  const contactsCount = data.contactsCount || 0
  const totalRevenue = data.deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0
  const revenueImpact = totalRevenue > 0 ? `R${(totalRevenue / 1000).toFixed(1)}k` : 'R0'

  // Transform analytics data for chart
  const chartData = data.analytics?.map((snapshot) => {
    const breakdown = snapshot.platform_breakdown || {}
    return {
      date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { weekday: 'short' }),
      linkedin: breakdown.linkedin?.engagement || 0,
      facebook: breakdown.facebook?.engagement || 0,
      instagram: breakdown.instagram?.engagement || 0,
    }
  }) || []

  // Transform top posts
  const topPerformingPosts = data.topPosts?.map((post) => ({
    id: post.id,
    title: post.content?.substring(0, 50) || 'Untitled Post',
    engagements: post.platform_metrics?.[0]?.total_engagements || 0,
  })) || []

  return (
    <div className="space-y-8">
      {/* Hero Section with Stats */}
      <div className="gradient-hero rounded-2xl p-10 text-white animate-slide-in">
        <h1 className="mb-2 text-3xl font-bold">Welcome back, {userOrg.fullName?.split(' ')[0] || 'there'}!</h1>
        <p className="mb-8 text-base opacity-90">Last 30 Days Performance Overview</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="📝"
            value={postsCount}
            label="Posts Published"
            trend={postsCount > 0 ? 'This month' : 'No posts yet'}
            trendDirection={postsCount > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            icon="💬"
            value={`${engagementRate}%`}
            label="Engagement Rate"
            trend={engagementRate > 0 ? 'This month' : 'Publish to track'}
            trendDirection={engagementRate > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            icon="👥"
            value={contactsCount}
            label="CRM Contacts"
            trend={contactsCount > 0 ? 'Total in CRM' : 'Add contacts to start'}
            trendDirection={contactsCount > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            icon="💰"
            value={revenueImpact}
            label="Revenue Impact"
            trend={totalRevenue > 0 ? 'From closed deals' : 'Close deals to track'}
            trendDirection={totalRevenue > 0 ? 'up' : 'neutral'}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Engagement Chart */}
          {chartData.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6">
              <EmptyState
                title="No analytics yet"
                description="Analytics will appear here once you start publishing content."
              />
            </div>
          ) : (
            <RealtimeEngagementChart initialChartData={chartData} />
          )}

          {/* Bottom Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <TopPerformingPosts posts={topPerformingPosts.length > 0 ? topPerformingPosts : undefined} />
            <BestPostingTimes />
          </div>
        </div>

        {/* Right Column - 1/3 width - Widgets */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Quick Actions
            </h3>
            <QuickActions />
          </div>

          {/* Upcoming Posts */}
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Upcoming Posts
            </h3>
            {(data.recentPosts?.length || 0) > 0 ? (
              <div className="space-y-3 text-sm text-gray-600">
                {data.recentPosts?.slice(0, 3).map((post, i) => (
                  <div key={post.id || i} className="border-b border-gray-100 pb-2 last:border-0">
                    <div className="font-medium text-gray-900 truncate">{post.content?.substring(0, 40) || 'Post'}</div>
                    <div className="text-xs text-gray-400">{post.status || 'draft'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-gray-400">
                <p>No posts yet</p>
                <p className="text-xs mt-1">Create content to see posts here</p>
              </div>
            )}
          </div>

          {/* Usage & Limits */}
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Usage This Month
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1.5 flex justify-between font-medium text-gray-900">
                  <span>Posts Published</span>
                  <span>{data.usage?.posts_published || 0}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700" style={{ width: `${Math.min((data.usage?.posts_published || 0) / 30 * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between font-medium text-gray-900">
                  <span>AI Generations</span>
                  <span>{data.usage?.ai_generations_count || 0}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700" style={{ width: `${Math.min((data.usage?.ai_generations_count || 0) / 50 * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Team Activity */}
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Team Activity
            </h3>
            <ActivityFeed />
          </div>

          {/* Content Analytics */}
          <AnalyticsCard snapshots={data.analytics || []} />

          {/* Tips & Insights */}
          <div className="rounded-2xl border border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-900">
              💡 Tips & Insights
            </h3>
            <p className="text-sm text-yellow-800">
              Your best posting time is <strong>Tuesday 2 PM</strong>.{' '}
              <a href="#" className="font-semibold text-orange-600 hover:text-orange-700">
                Learn more →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
