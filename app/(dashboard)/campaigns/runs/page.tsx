// Phase 11: /dashboard/campaigns/runs — Campaign runs list (RSC, CAMP-05).

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, AlertCircle } from 'lucide-react'

interface CampaignRun {
  id: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  items_total: number
  items_sent: number
  items_failed: number
  error_message: string | null
  campaign_id: string
  campaigns: {
    name: string
  } | null
}

function RunStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    executing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    killed: 'bg-gray-100 text-gray-700',
  }
  const cls = variants[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <Badge className={`${cls} hover:${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export default async function CampaignRunsPage() {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) redirect('/login')

  const supabase = createAdminClient()
  const orgId = userOrg.organizationId

  const { data: runs, error: runsError } = await supabase
    .from('campaign_runs')
    .select(`
      id,
      status,
      scheduled_at,
      started_at,
      completed_at,
      items_total,
      items_sent,
      items_failed,
      error_message,
      campaign_id,
      campaigns (
        name
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (runsError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load campaign runs
      </div>
    )
  }

  const typedRuns = (runs ?? []) as unknown as CampaignRun[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Runs</h1>
        <p className="mt-1 text-sm text-gray-500">
          All scheduled and completed campaign sends for your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {typedRuns.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No campaign runs yet. Schedule a campaign to see runs here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead className="w-[80px]">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedRuns.map((run) => {
                  // Supabase join returns array or object — cast safely
                  const campaignData = run.campaigns as unknown as { name: string } | { name: string }[] | null
                  const campaignName = Array.isArray(campaignData)
                    ? campaignData[0]?.name
                    : campaignData?.name
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {campaignName ?? run.campaign_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {run.scheduled_at
                          ? new Date(run.scheduled_at).toLocaleString('en-ZA')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {run.items_sent}/{run.items_total} sent
                      </TableCell>
                      <TableCell>
                        {run.items_failed > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {run.items_failed} failed
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/campaigns/runs/${run.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
