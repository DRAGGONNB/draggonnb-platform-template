'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TemplateEditor } from '@/components/email/TemplateEditor'
import { TemplatePreview } from '@/components/email/TemplatePreview'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { EmailTemplate, TemplateCategory } from '@/lib/email/types'

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const templateId = searchParams.get('id')

  const [isLoading, setIsLoading] = useState(!!templateId)
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId)
    }
  }, [templateId])

  async function loadTemplate(id: string) {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      })
    } else {
      setTemplate(data)
    }
    setIsLoading(false)
  }

  const handleSave = useCallback(
    async (data: {
      name: string
      subject: string
      description?: string
      category: TemplateCategory
      html_content: string
      editor_json: Record<string, unknown>
    }) => {
      const supabase = createClient()

      // Get current user's organization
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to save templates',
          variant: 'destructive',
        })
        return
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single()

      if (userError || !user?.organization_id) {
        toast({
          title: 'Error',
          description: 'Organization not found',
          variant: 'destructive',
        })
        return
      }

      // Extract variables from template
      const variableMatches = data.html_content.match(/\{\{(\w+)\}\}/g) || []
      const variables = [...new Set(variableMatches.map((m) => m.replace(/\{\{|\}\}/g, '')))]

      if (templateId) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: data.name,
            subject: data.subject,
            description: data.description,
            category: data.category,
            html_content: data.html_content,
            editor_json: data.editor_json,
            variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId)

        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to update template',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Success',
            description: 'Template updated successfully',
          })
        }
      } else {
        // Create new template
        const { data: newTemplate, error } = await supabase
          .from('email_templates')
          .insert({
            organization_id: user.organization_id,
            name: data.name,
            subject: data.subject,
            description: data.description,
            category: data.category,
            html_content: data.html_content,
            editor_json: data.editor_json,
            variables,
            is_active: true,
          })
          .select()
          .single()

        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to create template',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Success',
            description: 'Template created successfully',
          })
          // Redirect to edit the new template
          router.push(`/email/templates/editor?id=${newTemplate.id}`)
        }
      }
    },
    [templateId, router, toast]
  )

  const handlePreview = useCallback((html: string) => {
    setPreviewHtml(html)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/email/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {templateId ? 'Edit Template' : 'Create Template'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Design your email template with the drag-and-drop editor
          </p>
        </div>
      </div>

      <TemplateEditor
        templateId={templateId || undefined}
        initialData={
          template
            ? {
                name: template.name,
                subject: template.subject,
                description: template.description || undefined,
                category: template.category,
                editor_json: template.editor_json as Record<string, unknown> | undefined,
              }
            : undefined
        }
        onSave={handleSave}
        onPreview={handlePreview}
      />

      {previewHtml && (
        <TemplatePreview
          html={previewHtml}
          subject={template?.subject}
          open={!!previewHtml}
          onOpenChange={(open) => !open && setPreviewHtml(null)}
        />
      )}
    </div>
  )
}

export default function TemplateEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  )
}
