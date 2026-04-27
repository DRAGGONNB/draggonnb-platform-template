'use client'

// Phase 11: /dashboard/campaigns/runs/[runId] — Campaign run detail (CAMP-05).
// Auto-refreshes every 30s when run is in 'executing' status.

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RunItem {
  id: string
  channel: string
  recipient_ref: string | null
  status: string
  provider_message_id: string | null
  published_url: string | null
  sent_at: string | null
  verified_at: string | null
  error_code: string | null
  error_message: string | null
}

interface RunDetail {
  id: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  items_total: number
  items_sent: number
  items_failed: number
  error_message: string | null
  campaigns: { name: string } | null
  items: RunItem[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: string }) {
  const icons: Record<string, string> = {
    email: '📧',
    sms: '💬',
    facebook: '📘',
    instagram: '📷',
    linkedin: '💼',
  }
  return <span className="mr-1 text-base">{icons[channel] ?? '📣'}</span>
}

function ItemStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Sent</Badge>
    case 'verified':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Verified</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
    case 'skipped':
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Skipped</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'executing':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />
    case 'killed':
      return <XCircle className="h-5 w-5 text-gray-500" />
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-600" />
    default:
      return null
  }
}

// ─── Client Component ────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>()
  const runId = params.runId

  const [run, setRun] = useState<RunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/runs/${runId}`)
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to load run')
      }
      const data = await res.json() as { run: RunDetail }
      setRun(data.run)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    fetchRun()
  }, [fetchRun])

  // Auto-refresh every 30s when executing
  useEffect(() => {
    if (run?.status !== 'executing') return
    const interval = setInterval(() => { fetchRun() }, 30_000)
    return () => clearInterval(interval)
  }, [run?.status, fetchRun])

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{error ?? 'Run not found'}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/campaigns/runs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to runs
          </Link>
        </Button>
      </div>
    )
  }

  const campaignName = typeof run.campaigns === 'object' && run.campaigns !== null
    ? (Array.isArray(run.campaigns) ? (run.campaigns[0] as { name: string })?.name : run.campaigns.name)
    : null

  return (
    <div className="space-y-6 p-6">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/campaigns/runs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All runs
          </Link>
        </Button>
        {run.status === 'executing' && (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Auto-refreshing every 30s
          </span>
        )}
      </div>

      {/* Run header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RunStatusIcon status={run.status} />
            {campaignName ?? `Run ${runId.slice(0, 8)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1 font-medium capitalize">{run.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Scheduled</dt>
              <dd className="mt-1">
                {run.scheduled_at
                  ? new Date(run.scheduled_at).toLocaleString('en-ZA')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Started</dt>
              <dd className="mt-1">
                {run.started_at
                  ? new Date(run.started_at).toLocaleString('en-ZA')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Completed</dt>
              <dd className="mt-1">
                {run.completed_at
                  ? new Date(run.completed_at).toLocaleString('en-ZA')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Total items</dt>
              <dd className="mt-1 font-medium">{run.items_total}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Sent</dt>
              <dd className="mt-1 font-medium text-green-700">{run.items_sent}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Failed</dt>
              <dd className={`mt-1 font-medium ${run.items_failed > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                {run.items_failed}
              </dd>
            </div>
            {run.error_message && (
              <div className="col-span-4">
                <dt className="text-gray-500">Error</dt>
                <dd className="mt-1 rounded bg-red-50 px-2 py-1 text-sm text-red-700">
                  {run.error_message}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>Run Items ({run.items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!run.items || run.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No items in this run.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published URL</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <ChannelIcon channel={item.channel} />
                      <span className="capitalize">{item.channel}</span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">
                      {item.recipient_ref ?? '—'}
                    </TableCell>
                    <TableCell>
                      <ItemStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {item.published_url ? (
                        <a
                          href={item.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {item.error_message ? (
                        <span className="text-xs text-red-600" title={item.error_message}>
                          {item.error_message.slice(0, 60)}
                          {item.error_message.length > 60 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
