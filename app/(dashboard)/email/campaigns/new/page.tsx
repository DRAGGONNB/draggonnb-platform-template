'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Send, Save, Calendar } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface TemplateOption {
  id: string
  name: string
  subject: string
}

function CampaignFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const editId = searchParams.get('edit')

  const [isLoading, setIsLoading] = useState(!!editId)
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState<TemplateOption[]>([])

  // Form state
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')

  useEffect(() => {
    loadTemplates()
    if (editId) {
      loadCampaign(editId)
    }
  }, [editId])

  async function loadTemplates() {
    const supabase = createClient()
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setTemplates(data)
    }
  }

  async function loadCampaign(id: string) {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      setName(data.name)
      setSubject(data.subject)
      setPreviewText(data.preview_text || '')
      setTemplateId(data.template_id || '')
      setScheduledFor(data.scheduled_for || '')
    }
    setIsLoading(false)
  }

  async function handleSave(sendNow = false) {
    if (!name || !subject) {
      toast({
        title: 'Error',
        description: 'Name and subject are required',
        variant: 'destructive',
      })
      return
    }

    if (!templateId) {
      toast({
        title: 'Error',
        description: 'Please select a template',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const campaignData = {
        name,
        subject,
        preview_text: previewText || null,
        template_id: templateId,
        scheduled_for: scheduledFor || null,
      }

      let campaignId = editId

      if (editId) {
        // Update existing
        const response = await fetch(`/api/email/campaigns/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignData),
        })

        if (!response.ok) {
          throw new Error('Failed to update campaign')
        }
      } else {
        // Create new
        const response = await fetch('/api/email/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignData),
        })

        if (!response.ok) {
          throw new Error('Failed to create campaign')
        }

        const result = await response.json()
        campaignId = result.campaign.id
      }

      // Send immediately if requested
      if (sendNow && campaignId) {
        const sendResponse = await fetch(`/api/email/campaigns/${campaignId}/send`, {
          method: 'POST',
        })

        if (!sendResponse.ok) {
          const errorData = await sendResponse.json()
          toast({
            title: 'Campaign saved but send failed',
            description: errorData.error || 'Failed to send campaign',
            variant: 'destructive',
          })
          router.push('/email/campaigns')
          return
        }

        toast({
          title: 'Success',
          description: 'Campaign sent successfully',
        })
      } else {
        toast({
          title: 'Success',
          description: editId ? 'Campaign updated' : 'Campaign created',
        })
      }

      router.push('/email/campaigns')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/email/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {editId ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your email campaign details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Basic information about your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., January Newsletter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Email Template *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No templates available.{' '}
                  <Link href="/email/templates/editor" className="text-primary underline">
                    Create one first
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Your January Update from {{company_name}}"
            />
            <p className="text-sm text-muted-foreground">
              Use {'{{variable_name}}'} for personalization
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview">Preview Text (Optional)</Label>
            <Textarea
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="This text appears in email previews..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule (Optional)</Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to save as draft or send immediately
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/email/campaigns')}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Draft
        </Button>
        <Button onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Now
        </Button>
      </div>
    </div>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CampaignFormContent />
    </Suspense>
  )
}
