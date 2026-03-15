'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, AlertCircle } from 'lucide-react'

interface WABAShareGuideProps {
  wabaId: string
  onWabaIdChange: (id: string) => void
  portfolioId: string
}

const SHARE_STEPS = [
  {
    title: 'Open Meta Business Suite',
    description:
      'Go to business.facebook.com and select your business portfolio from the top-left dropdown.',
  },
  {
    title: 'Navigate to WhatsApp Accounts',
    description:
      'In the left menu, click Settings, then under Accounts, select WhatsApp Accounts.',
  },
  {
    title: 'Click "Assign Partner"',
    description:
      'Find your WhatsApp Business Account in the list and click the "Assign Partner" button.',
  },
  {
    title: 'Enter DraggonnB Portfolio ID',
    description:
      'Paste the DraggonnB Business Portfolio ID shown above into the Partner Business ID field.',
  },
  {
    title: 'Assign and Confirm',
    description:
      'Select "Full Control" permissions, then click Assign and confirm the prompt. DraggonnB will be able to manage your WhatsApp messaging.',
  },
] as const

export function WABAShareGuide({ wabaId, onWabaIdChange, portfolioId }: WABAShareGuideProps) {
  const [copied, setCopied] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleWabaIdChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '')
    onWabaIdChange(cleaned)

    if (cleaned.length > 0 && cleaned.length < 10) {
      setValidationError('WABA ID must be at least 10 digits')
    } else {
      setValidationError(null)
    }
  }

  const copyPortfolioId = async () => {
    try {
      await navigator.clipboard.writeText(portfolioId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = portfolioId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* WABA ID Input */}
      <div className="space-y-2">
        <Label htmlFor="waba-id">WhatsApp Business Account ID</Label>
        <Input
          id="waba-id"
          placeholder="e.g. 1234567890123456"
          value={wabaId}
          onChange={(e) => handleWabaIdChange(e.target.value)}
          className="font-mono"
        />
        {validationError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Find this in Meta Business Suite under Settings &gt; WhatsApp Accounts. It is a
          numeric ID with 10 or more digits.
        </p>
      </div>

      {/* Portfolio ID Copy Box */}
      <div className="space-y-2">
        <Label>DraggonnB Business Portfolio ID</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Copy this ID and paste it in Meta Business Suite when assigning partner access.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono">
            {portfolioId}
          </code>
          <Button variant="outline" size="sm" onClick={copyPortfolioId} className="gap-1.5">
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="space-y-3">
        <Label>How to share access</Label>
        <div className="space-y-3">
          {SHARE_STEPS.map((step, index) => (
            <div key={index} className="flex gap-3 rounded-lg border p-3">
              <Badge
                variant="secondary"
                className="h-6 w-6 shrink-0 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {index + 1}
              </Badge>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
