'use client'
// Plan 11-09: entity_drafts autosave wiring. Branch B from Task 0.
// Client island: renders deal edit form + wires useEntityDraft for 1s-debounced autosave.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEntityDraft } from '@/lib/crm/entity-drafts/use-entity-draft'
import { DraftConflictBanner } from '@/components/crm/DraftConflictBanner'

interface Deal {
  id: string
  name: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
  company: string | null
  description: string | null
}

interface DealEditFormProps {
  deal: Deal
  hasDraft: boolean
  draftModifiedAt: string | null
  draftTabId: string | null
}

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export function DealEditForm({
  deal,
  draftModifiedAt,
  draftTabId,
}: DealEditFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Controlled form state — every keystroke updates this, triggering the autosave debounce
  const [formState, setFormState] = useState({
    name: deal.name ?? '',
    value: String(deal.value ?? 0),
    stage: deal.stage ?? 'lead',
    probability: String(deal.probability ?? 0),
    expected_close_date: deal.expected_close_date ?? '',
    company: deal.company ?? '',
    description: deal.description ?? '',
  })

  const { conflictDetected, dismissConflict, clear } = useEntityDraft({
    entityType: 'deal',
    entityId: deal.id,
    initialTabId: draftTabId,
    initialModifiedAt: draftModifiedAt,
    currentValues: formState,
  })

  function handleChange(field: keyof typeof formState, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)

    try {
      const payload = {
        ...formState,
        value: Number(formState.value) || 0,
        probability: Number(formState.probability) || 0,
        expected_close_date: formState.expected_close_date || null,
      }

      const res = await fetch(`/api/crm/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error || 'Failed to save deal')
        return
      }

      // On success: delete draft row
      await clear()
      router.back()
    } catch {
      setSaveError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/crm/deals">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">Edit deal details</p>
        </div>
      </div>

      {/* Conflict banner (soft warning — no hard block) */}
      {conflictDetected && (
        <DraftConflictBanner
          onReload={() => router.refresh()}
          onDismiss={dismissConflict}
        />
      )}

      {/* Edit form */}
      <Card className="p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Deal Name</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value (ZAR)</Label>
            <Input
              id="value"
              type="number"
              min="0"
              value={formState.value}
              onChange={(e) => handleChange('value', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="probability">Probability (%)</Label>
            <Input
              id="probability"
              type="number"
              min="0"
              max="100"
              value={formState.probability}
              onChange={(e) => handleChange('probability', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={formState.stage}
              onValueChange={(val) => handleChange('stage', val)}
            >
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input
              id="expected_close_date"
              type="date"
              value={formState.expected_close_date}
              onChange={(e) => handleChange('expected_close_date', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formState.company}
              onChange={(e) => handleChange('company', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Add notes about this deal..."
          />
        </div>

        {saveError && (
          <p className="mt-3 text-sm text-red-600">{saveError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/crm/deals">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
