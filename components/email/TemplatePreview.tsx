'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Monitor, Smartphone } from 'lucide-react'

interface TemplatePreviewProps {
  html: string
  subject?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplatePreview({
  html,
  subject,
  open,
  onOpenChange,
}: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  // Replace template variables with sample data for preview
  const previewHtml = html
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{last_name\}\}/g, 'Doe')
    .replace(/\{\{full_name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{company_name\}\}/g, 'Acme Corp')
    .replace(/\{\{subscription_tier\}\}/g, 'Professional')
    .replace(/\{\{unsubscribe_url\}\}/g, '#unsubscribe')
    .replace(/\{\{preferences_url\}\}/g, '#preferences')
    .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Email Preview</span>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
              <TabsList>
                <TabsTrigger value="desktop">
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {subject && (
            <div className="bg-muted p-3 rounded-t-lg border-b">
              <div className="text-sm text-muted-foreground">Subject:</div>
              <div className="font-medium">{subject}</div>
            </div>
          )}

          <Tabs value={viewMode} className="h-full">
            <TabsContent value="desktop" className="h-full mt-0">
              <div className="h-full overflow-auto bg-white rounded-b-lg border">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Email Preview - Desktop"
                />
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="h-full mt-0 flex justify-center">
              <div className="w-[375px] h-full overflow-auto bg-white rounded-lg border shadow-lg">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Email Preview - Mobile"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
