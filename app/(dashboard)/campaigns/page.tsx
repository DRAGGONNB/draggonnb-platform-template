export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Mail, MessageSquare, ExternalLink } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  channels: string[]
  scheduled_at: string | null
  created_at: string
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  pending_review: 'outline',
  scheduled: 'default',
  sent: 'default',
  cancelled: 'destructive',
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
}

async function getCampaigns(organizationId: string): Promise<Campaign[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, channels, scheduled_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('getCampaigns error:', error)
    return []
  }
  return (data ?? []) as Campaign[]
}

export default async function CampaignsPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    return (
      <div className="p-6">
        <p className="text-red-500">Could not load campaigns: {error ?? 'Unknown error'}</p>
      </div>
    )
  }

  const campaigns = await getCampaigns(userOrg.organizationId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your marketing campaigns.
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No campaigns yet. Create your first campaign.</p>
          <Link href="/campaigns/new" className="mt-4 inline-block">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[campaign.status] ?? 'secondary'}>
                      {campaign.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(campaign.channels ?? []).map((ch) => (
                        <span
                          key={ch}
                          className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded"
                        >
                          {CHANNEL_ICONS[ch] ?? null}
                          {ch}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.scheduled_at
                      ? new Date(campaign.scheduled_at).toLocaleDateString('en-ZA')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/campaigns/studio/${campaign.id}`}>
                        <Button variant="outline" size="sm">
                          Open
                        </Button>
                      </Link>
                      {(campaign.status === 'scheduled' || campaign.status === 'sent') && (
                        <Link href={`/campaigns/studio/${campaign.id}/runs`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View runs
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
