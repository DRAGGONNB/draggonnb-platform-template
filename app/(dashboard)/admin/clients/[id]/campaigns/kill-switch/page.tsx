'use client'

// Phase 11: Admin kill-switch UI — /admin/clients/[id]/campaigns/kill-switch (CAMP-06, Plan 11-11 Task 3).
// platform_admin only. Shows kill switch status + emergency stop / resume buttons + confirmation dialog.

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface KillSwitchStatus {
  active: boolean
  activatedAt: string | null
  deactivatedAt: string | null
  reason: string | null
  admin: string | null
}

export default function CampaignKillSwitchPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const orgId = params.id

  const [status, setStatus] = useState<KillSwitchStatus | null>(null)
  const [orgName, setOrgName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'activate' | 'deactivate' | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/admin/campaigns/kill-switch?orgId=${orgId}`)
      if (res.status === 401 || res.status === 403) {
        setError('Access denied — platform_admin only')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch kill switch status')
      const data = await res.json() as { status: KillSwitchStatus }
      setStatus(data.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchOrgName = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients`)
      if (!res.ok) return
      const data = await res.json() as { clients: Array<{ id: string; name: string }> }
      const org = data.clients.find((c) => c.id === orgId)
      if (org) setOrgName(org.name)
    } catch {
      // Non-fatal — orgId shown as fallback
    }
  }, [orgId])

  useEffect(() => {
    fetchStatus()
    fetchOrgName()
  }, [fetchStatus, fetchOrgName])

  const openDialog = (action: 'activate' | 'deactivate') => {
    setPendingAction(action)
    setReason('')
    setDialogOpen(true)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/campaigns/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          active: pendingAction === 'activate',
          reason: reason.trim() || (pendingAction === 'activate' ? 'Emergency stop' : 'Resumed by admin'),
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; cancelled?: number }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      setToast(
        pendingAction === 'activate'
          ? `Kill switch activated. ${data.cancelled ?? 0} scheduled runs cancelled.`
          : 'Campaigns resumed. Operator must manually reschedule any cancelled runs.'
      )
      setDialogOpen(false)
      await fetchStatus()
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    )
  }

  const isActive = status?.active ?? false

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {toast}
        </div>
      )}

      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to clients
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Kill Switch</h1>
        <p className="mt-1 text-sm text-gray-500">
          {orgName || orgId} — Emergency campaign control
        </p>
      </div>

      {/* Status card */}
      <Card className={isActive ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isActive ? (
              <>
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <span className="text-red-700">Campaigns Stopped</span>
                <Badge className="ml-2 bg-red-600 hover:bg-red-600">KILL SWITCH ACTIVE</Badge>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <span className="text-green-700">Campaigns Running Normally</span>
                <Badge className="ml-2 bg-green-600 hover:bg-green-600">ACTIVE</Badge>
              </>
            )}
          </CardTitle>
          {isActive && (
            <CardDescription className="space-y-1 pt-2 text-red-600">
              {status?.activatedAt && (
                <p>Activated: {new Date(status.activatedAt).toLocaleString('en-ZA')}</p>
              )}
              {status?.admin && <p>By: {status.admin}</p>}
              {status?.reason && <p>Reason: {status.reason}</p>}
            </CardDescription>
          )}
          {!isActive && status?.deactivatedAt && (
            <CardDescription className="pt-2 text-green-600">
              Last resumed: {new Date(status.deactivatedAt).toLocaleString('en-ZA')}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Action card */}
      <Card>
        <CardContent className="pt-6">
          {!isActive ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">
                  Activating the kill switch will immediately cancel all pending and executing
                  campaign runs for this organization. Cancelled runs <strong>cannot be
                  automatically resumed</strong> — the operator must manually reschedule.
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => openDialog('activate')}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Emergency Stop All Campaigns
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <p className="text-sm text-green-700">
                  Resuming campaigns will allow new scheduling. Previously cancelled runs will
                  NOT be automatically rescheduled — the operator must create new runs manually.
                </p>
              </div>
              <Button
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => openDialog('deactivate')}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Resume Campaigns
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'activate'
                ? 'Confirm Emergency Stop'
                : 'Confirm Resume Campaigns'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'activate'
                ? `This will cancel all scheduled sends for ${orgName || orgId} immediately. This cannot be undone automatically.`
                : `This will re-enable campaign scheduling for ${orgName || orgId}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-gray-700">
              Reason {pendingAction === 'activate' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder={
                pendingAction === 'activate'
                  ? 'e.g. Suspicious activity detected, manual content review required...'
                  : 'e.g. Issue resolved, campaigns can resume...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'activate' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={submitting || (pendingAction === 'activate' && !reason.trim())}
              className={pendingAction === 'deactivate' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {pendingAction === 'activate' ? 'Stop All Campaigns' : 'Resume Campaigns'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
