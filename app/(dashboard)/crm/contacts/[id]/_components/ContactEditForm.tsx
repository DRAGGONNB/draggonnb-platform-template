'use client'
// Plan 11-09: entity_drafts autosave wiring. Branch B from Task 0.
// Client island: renders contact edit form + wires useEntityDraft for 1s-debounced autosave.
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

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  job_title: string | null
  status: string
  notes: string | null
  tags: string[] | null
}

interface ContactEditFormProps {
  contact: Contact
  hasDraft: boolean
  draftModifiedAt: string | null
  draftTabId: string | null
}

export function ContactEditForm({
  contact,
  draftModifiedAt,
  draftTabId,
}: ContactEditFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Controlled form state — every keystroke updates this, triggering the autosave debounce
  const [formState, setFormState] = useState({
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    job_title: contact.job_title ?? '',
    status: contact.status ?? 'active',
    notes: contact.notes ?? '',
  })

  const { conflictDetected, dismissConflict, clear } = useEntityDraft({
    entityType: 'contact',
    entityId: contact.id,
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
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error || 'Failed to save contact')
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
        <Link href="/dashboard/crm/contacts">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {contact.first_name} {contact.last_name}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Edit contact details</p>
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
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formState.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formState.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formState.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formState.company}
              onChange={(e) => handleChange('company', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              value={formState.job_title}
              onChange={(e) => handleChange('job_title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formState.status}
              onValueChange={(val) => handleChange('status', val)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formState.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Add notes about this contact..."
          />
        </div>

        {saveError && (
          <p className="mt-3 text-sm text-red-600">{saveError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/crm/contacts">
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
