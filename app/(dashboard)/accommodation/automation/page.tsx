'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Zap,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  XCircle,
  Mail,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// --- Types ---

interface AutomationRule {
  id: string
  organization_id: string
  name: string
  trigger_event: string
  channel: string
  template_id: string | null
  conditions: Record<string, unknown> | null
  delay_minutes: number
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MessageQueueItem {
  id: string
  organization_id: string
  booking_id: string | null
  guest_id: string | null
  channel: string
  recipient: string
  subject: string | null
  body: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  scheduled_for: string | null
  sent_at: string | null
  retry_count: number
  error_message: string | null
  created_at: string
}

interface CommsLogEntry {
  id: string
  organization_id: string
  booking_id: string | null
  guest_id: string | null
  channel: string
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string
  status: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// --- Constants ---

type TabId = 'rules' | 'queue' | 'comms'

const TABS: { id: TabId; label: string }[] = [
  { id: 'rules', label: 'Automation Rules' },
  { id: 'queue', label: 'Message Queue' },
  { id: 'comms', label: 'Communications Log' },
]

const TRIGGER_EVENTS = [
  'booking_confirmed',
  'booking_cancelled',
  'check_in',
  'check_out',
  'deposit_received',
  'payment_overdue',
  'inquiry_received',
  'review_request',
]

const CHANNELS = ['email', 'sms', 'whatsapp', 'telegram']

const RULE_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  disabled: 'bg-gray-100 text-gray-700',
}

const QUEUE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const DIRECTION_COLORS: Record<string, string> = {
  inbound: 'bg-blue-100 text-blue-700',
  outbound: 'bg-green-100 text-green-700',
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  telegram: Send,
}

// --- Helpers ---

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatLabel = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const getRuleStatus = (rule: AutomationRule): string => {
  if (rule.is_active) return 'active'
  return 'disabled'
}

const truncateText = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// --- Component ---

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('rules')

  // Rules state
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [rulesError, setRulesError] = useState<string | null>(null)
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleFilterTrigger, setRuleFilterTrigger] = useState('all')
  const [ruleFilterChannel, setRuleFilterChannel] = useState('all')
  const [ruleFilterStatus, setRuleFilterStatus] = useState('all')
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null)

  // Queue state
  const [messages, setMessages] = useState<MessageQueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [queueFilterStatus, setQueueFilterStatus] = useState('all')
  const [queueFilterChannel, setQueueFilterChannel] = useState('all')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Comms state
  const [logs, setLogs] = useState<CommsLogEntry[]>([])
  const [commsLoading, setCommsLoading] = useState(true)
  const [commsError, setCommsError] = useState<string | null>(null)
  const [commsFilterChannel, setCommsFilterChannel] = useState('all')
  const [commsFilterDirection, setCommsFilterDirection] = useState('all')
  const [commsSearch, setCommsSearch] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // --- Data Fetching ---

  const fetchRules = useCallback(async () => {
    setRulesLoading(true)
    try {
      const params = new URLSearchParams()
      if (ruleFilterTrigger !== 'all') params.set('trigger_event', ruleFilterTrigger)
      if (ruleFilterChannel !== 'all') params.set('channel', ruleFilterChannel)
      if (ruleFilterStatus !== 'all') params.set('is_active', ruleFilterStatus === 'active' ? 'true' : 'false')
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/automation-rules?${queryStr}`
        : '/api/accommodation/automation-rules'
      const res = await fetch(url)
      if (res.status === 403) {
        setRulesError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setRulesError('Failed to load automation rules')
        return
      }
      const data = await res.json()
      setRules(data.rules || [])
      setRulesError(null)
    } catch {
      setRulesError('Failed to load automation rules')
    } finally {
      setRulesLoading(false)
    }
  }, [ruleFilterTrigger, ruleFilterChannel, ruleFilterStatus])

  const fetchMessages = useCallback(async () => {
    setQueueLoading(true)
    try {
      const params = new URLSearchParams()
      if (queueFilterStatus !== 'all') params.set('status', queueFilterStatus)
      if (queueFilterChannel !== 'all') params.set('channel', queueFilterChannel)
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/message-queue?${queryStr}`
        : '/api/accommodation/message-queue'
      const res = await fetch(url)
      if (res.status === 403) {
        setQueueError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setQueueError('Failed to load message queue')
        return
      }
      const data = await res.json()
      setMessages(data.messages || [])
      setQueueError(null)
    } catch {
      setQueueError('Failed to load message queue')
    } finally {
      setQueueLoading(false)
    }
  }, [queueFilterStatus, queueFilterChannel])

  const fetchCommsLog = useCallback(async () => {
    setCommsLoading(true)
    try {
      const params = new URLSearchParams()
      if (commsFilterChannel !== 'all') params.set('channel', commsFilterChannel)
      if (commsFilterDirection !== 'all') params.set('direction', commsFilterDirection)
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/comms-log?${queryStr}`
        : '/api/accommodation/comms-log'
      const res = await fetch(url)
      if (res.status === 403) {
        setCommsError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setCommsError('Failed to load communications log')
        return
      }
      const data = await res.json()
      setLogs(data.logs || [])
      setCommsError(null)
    } catch {
      setCommsError('Failed to load communications log')
    } finally {
      setCommsLoading(false)
    }
  }, [commsFilterChannel, commsFilterDirection])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetchCommsLog()
  }, [fetchCommsLog])

  // --- Actions ---

  const toggleRule = async (rule: AutomationRule) => {
    setTogglingRuleId(rule.id)
    try {
      const res = await fetch(`/api/accommodation/automation-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      if (res.ok) {
        fetchRules()
      } else {
        const data = await res.json()
        setRulesError(data.error || 'Failed to toggle rule')
      }
    } catch {
      setRulesError('Failed to toggle rule')
    } finally {
      setTogglingRuleId(null)
    }
  }

  const retryMessage = async (messageId: string) => {
    setRetryingId(messageId)
    try {
      const res = await fetch(`/api/accommodation/message-queue/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', retry_count: 0 }),
      })
      if (res.ok) {
        fetchMessages()
      } else {
        const data = await res.json()
        setQueueError(data.error || 'Failed to retry message')
      }
    } catch {
      setQueueError('Failed to retry message')
    } finally {
      setRetryingId(null)
    }
  }

  const cancelMessage = async (messageId: string) => {
    setCancellingId(messageId)
    try {
      const res = await fetch(`/api/accommodation/message-queue/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (res.ok) {
        fetchMessages()
      } else {
        const data = await res.json()
        setQueueError(data.error || 'Failed to cancel message')
      }
    } catch {
      setQueueError('Failed to cancel message')
    } finally {
      setCancellingId(null)
    }
  }

  // --- Computed Values ---

  const filteredRules = rules.filter((rule) => {
    if (ruleSearch.trim()) {
      const search = ruleSearch.toLowerCase()
      if (!rule.name.toLowerCase().includes(search)) return false
    }
    return true
  })

  const queueStats = {
    pending: messages.filter((m) => m.status === 'pending').length,
    sentToday: messages.filter((m) => {
      if (m.status !== 'sent' || !m.sent_at) return false
      const sent = new Date(m.sent_at)
      const today = new Date()
      return (
        sent.getFullYear() === today.getFullYear() &&
        sent.getMonth() === today.getMonth() &&
        sent.getDate() === today.getDate()
      )
    }).length,
    failed: messages.filter((m) => m.status === 'failed').length,
    processing: messages.filter((m) => m.status === 'processing').length,
  }

  const filteredLogs = logs.filter((log) => {
    if (commsSearch.trim()) {
      const search = commsSearch.toLowerCase()
      const subject = (log.subject || '').toLowerCase()
      const body = (log.body || '').toLowerCase()
      if (!subject.includes(search) && !body.includes(search)) return false
    }
    return true
  })

  // --- Render ---

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          Automation
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage automation rules, message queues, and communications
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================ */}
      {/* TAB 1: Automation Rules          */}
      {/* ================================ */}
      {activeTab === 'rules' && (
        <div>
          {/* Error */}
          {rulesError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive text-sm">{rulesError}</p>
              <button
                className="text-xs text-destructive underline mt-1"
                onClick={() => setRulesError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by rule name..."
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={ruleFilterTrigger} onValueChange={setRuleFilterTrigger}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trigger Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                {TRIGGER_EVENTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {formatLabel(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ruleFilterChannel} onValueChange={setRuleFilterChannel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ruleFilterStatus} onValueChange={setRuleFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rules Table */}
          {rulesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automation rules found</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger Event</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => {
                      const status = getRuleStatus(rule)
                      const ChannelIcon = CHANNEL_ICONS[rule.channel] || Mail
                      const isToggling = togglingRuleId === rule.id
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatLabel(rule.trigger_event)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm capitalize">{rule.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {rule.delay_minutes > 0
                              ? `${rule.delay_minutes} min`
                              : 'Instant'}
                          </TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                RULE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {formatLabel(status)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(rule.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRule(rule)}
                              disabled={isToggling}
                            >
                              {isToggling ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : rule.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ================================ */}
      {/* TAB 2: Message Queue             */}
      {/* ================================ */}
      {activeTab === 'queue' && (
        <div>
          {/* Error */}
          {queueError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive text-sm">{queueError}</p>
              <button
                className="text-xs text-destructive underline mt-1"
                onClick={() => setQueueError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting delivery</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStats.sentToday}</div>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStats.failed}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <Loader2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStats.processing}</div>
                <p className="text-xs text-muted-foreground">Currently sending</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={queueFilterStatus} onValueChange={setQueueFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={queueFilterChannel} onValueChange={setQueueFilterChannel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Queue Table */}
          {queueLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages in the queue</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg) => {
                      const ChannelIcon = CHANNEL_ICONS[msg.channel] || Mail
                      return (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {msg.recipient}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm capitalize">{msg.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {msg.subject || truncateText(msg.body, 40)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                QUEUE_STATUS_COLORS[msg.status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {formatLabel(msg.status)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDateTime(msg.scheduled_for)}</TableCell>
                          <TableCell>{formatDateTime(msg.sent_at)}</TableCell>
                          <TableCell>{msg.retry_count}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {msg.status === 'failed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => retryMessage(msg.id)}
                                  disabled={retryingId === msg.id}
                                >
                                  {retryingId === msg.id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                  )}
                                  Retry
                                </Button>
                              )}
                              {msg.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelMessage(msg.id)}
                                  disabled={cancellingId === msg.id}
                                >
                                  {cancellingId === msg.id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-1 h-3 w-3" />
                                  )}
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ================================ */}
      {/* TAB 3: Communications Log        */}
      {/* ================================ */}
      {activeTab === 'comms' && (
        <div>
          {/* Error */}
          {commsError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive text-sm">{commsError}</p>
              <button
                className="text-xs text-destructive underline mt-1"
                onClick={() => setCommsError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject or content..."
                value={commsSearch}
                onChange={(e) => setCommsSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={commsFilterChannel} onValueChange={setCommsFilterChannel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={commsFilterDirection} onValueChange={setCommsFilterDirection}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comms Log Table */}
          {commsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No communications found</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Subject / Preview</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id
                      const ChannelIcon = CHANNEL_ICONS[log.channel] || Mail
                      return (
                        <>
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm capitalize">{log.channel}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  DIRECTION_COLORS[log.direction] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {formatLabel(log.direction)}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {log.subject || truncateText(log.body, 60)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {formatLabel(log.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(log.created_at)}</TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${log.id}-expanded`}>
                              <TableCell colSpan={6}>
                                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                                  {log.subject && (
                                    <div>
                                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                                        Subject
                                      </span>
                                      <p className="text-sm mt-1">{log.subject}</p>
                                    </div>
                                  )}
                                  <Separator />
                                  <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                                      Message
                                    </span>
                                    <p className="text-sm mt-1 whitespace-pre-wrap">
                                      {log.body}
                                    </p>
                                  </div>
                                  {log.booking_id && (
                                    <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                                      <span>Booking: {log.booking_id.slice(0, 8)}</span>
                                      {log.guest_id && (
                                        <span>Guest: {log.guest_id.slice(0, 8)}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
