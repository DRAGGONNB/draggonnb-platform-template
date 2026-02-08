'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Target,
  Zap,
  Play,
  Pause,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Sequence {
  id: string
  name: string
}

interface OutreachRule {
  id: string
  name: string
  description: string | null
  subscription_tiers: string[]
  service_types: string[]
  trigger_event: string
  sequence_id: string | null
  is_active: boolean
  conditions: Record<string, unknown>
  created_at: string
  email_sequences: { id: string; name: string } | null
}

const triggerEvents = [
  { value: 'new_signup', label: 'New Signup' },
  { value: 'subscription_upgrade', label: 'Subscription Upgrade' },
  { value: 'subscription_downgrade', label: 'Subscription Downgrade' },
  { value: 'inactivity_7d', label: '7 Days Inactive' },
  { value: 'inactivity_30d', label: '30 Days Inactive' },
  { value: 'trial_ending', label: 'Trial Ending Soon' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'custom', label: 'Custom Event' },
]

const subscriptionTiers = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function OutreachPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<OutreachRule[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingRule, setEditingRule] = useState<OutreachRule | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEvent, setTriggerEvent] = useState('')
  const [sequenceId, setSequenceId] = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])

  useEffect(() => {
    loadRules()
    loadSequences()
  }, [])

  async function loadRules() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/email/outreach')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Failed to load rules:', error)
    }
    setIsLoading(false)
  }

  async function loadSequences() {
    try {
      const response = await fetch('/api/email/sequences?active=true')
      if (response.ok) {
        const data = await response.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      console.error('Failed to load sequences:', error)
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
    setTriggerEvent('')
    setSequenceId('')
    setSelectedTiers([])
    setEditingRule(null)
  }

  function openEditDialog(rule: OutreachRule) {
    setEditingRule(rule)
    setName(rule.name)
    setDescription(rule.description || '')
    setTriggerEvent(rule.trigger_event)
    setSequenceId(rule.sequence_id || '')
    setSelectedTiers(rule.subscription_tiers || [])
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name || !triggerEvent) {
      toast({
        title: 'Error',
        description: 'Name and trigger event are required',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const ruleData = {
        name,
        description: description || null,
        trigger_event: triggerEvent,
        sequence_id: sequenceId || null,
        subscription_tiers: selectedTiers,
      }

      const response = editingRule
        ? await fetch(`/api/email/outreach/${editingRule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData),
          })
        : await fetch('/api/email/outreach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData),
          })

      if (!response.ok) {
        throw new Error('Failed to save rule')
      }

      toast({
        title: 'Success',
        description: editingRule ? 'Rule updated' : 'Rule created',
      })

      setDialogOpen(false)
      resetForm()
      loadRules()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleRule(id: string, isActive: boolean) {
    const response = await fetch(`/api/email/outreach/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })

    if (response.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !isActive } : r))
      )
      toast({
        title: 'Success',
        description: `Rule ${!isActive ? 'activated' : 'deactivated'}`,
      })
    }
  }

  async function deleteRule(id: string) {
    const response = await fetch(`/api/email/outreach/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast({
        title: 'Success',
        description: 'Rule deleted',
      })
    } else {
      const data = await response.json()
      toast({
        title: 'Error',
        description: data.error || 'Failed to delete rule',
        variant: 'destructive',
      })
    }
  }

  const filteredRules = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const getTriggerLabel = (value: string) =>
    triggerEvents.find((t) => t.value === value)?.label || value

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Outreach Rules</h1>
          <p className="text-muted-foreground mt-1">
            Automate enrollment based on user actions and subscription tiers
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Rule' : 'Create Outreach Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure when users are automatically enrolled in sequences
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome New Starters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this rule do?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Trigger Event *</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerEvents.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subscription Tiers</Label>
                <div className="flex flex-wrap gap-3">
                  {subscriptionTiers.map((tier) => (
                    <div key={tier.value} className="flex items-center gap-2">
                      <Checkbox
                        id={tier.value}
                        checked={selectedTiers.includes(tier.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTiers([...selectedTiers, tier.value])
                          } else {
                            setSelectedTiers(
                              selectedTiers.filter((t) => t !== tier.value)
                            )
                          }
                        }}
                      />
                      <Label htmlFor={tier.value} className="text-sm">
                        {tier.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Leave empty to apply to all tiers
                </p>
              </div>

              <div className="space-y-2">
                <Label>Enroll in Sequence</Label>
                <Select value={sequenceId} onValueChange={setSequenceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sequence" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id}>
                        {seq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sequences.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active sequences.{' '}
                    <Link
                      href="/email/sequences/builder"
                      className="text-primary underline"
                    >
                      Create one first
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Rules</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No rules match your search' : 'No outreach rules yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first rule
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Tiers</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        {getTriggerLabel(rule.trigger_event)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rule.subscription_tiers?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.subscription_tiers.map((tier) => (
                            <Badge key={tier} variant="outline" className="text-xs">
                              {tier}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">All tiers</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rule.email_sequences ? (
                        <Link
                          href={`/email/sequences/${rule.email_sequences.id}`}
                          className="text-primary hover:underline"
                        >
                          {rule.email_sequences.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                        />
                        <span className="text-sm">
                          {rule.is_active ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Pause className="h-3 w-3" />
                              Paused
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!rule.is_active && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
