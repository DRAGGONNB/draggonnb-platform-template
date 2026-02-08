'use client'

import { useState } from 'react'
import { Sparkles, Mail, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { EmailGenerationInput, EmailGenerationOutput } from '@/lib/content-studio/types'

export default function EmailContentPage() {
  const [input, setInput] = useState<EmailGenerationInput>({
    goal: 'promotion',
    tone: 'professional',
    audience: '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<EmailGenerationOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ current: number; limit: number } | null>(null)
  const [copiedSubject, setCopiedSubject] = useState<number | null>(null)

  const goals = [
    { value: 'welcome', label: 'Welcome Email' },
    { value: 'promotion', label: 'Promotion / Sales' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'follow_up', label: 'Follow-Up' },
    { value: 're_engagement', label: 'Re-Engagement' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'event_invite', label: 'Event Invitation' },
  ]

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'urgent', label: 'Urgent' },
  ]

  const handleGenerate = async () => {
    if (!input.audience.trim()) {
      setError('Please describe your target audience')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/content/generate/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email content')
      }

      if (data.success && data.data) {
        setResult(data.data)
        setUsage(data.usage || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, subjectIdx?: number) => {
    await navigator.clipboard.writeText(text)
    if (subjectIdx !== undefined) {
      setCopiedSubject(subjectIdx)
      setTimeout(() => setCopiedSubject(null), 2000)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8 text-primary" />
          Email Content Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate compelling email content with AI-powered subject lines and body copy
        </p>
      </div>

      {usage && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            AI Generations this month: <strong>{usage.current}</strong> / {usage.limit}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Define your email goal and audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Goal</Label>
                <Select value={input.goal} onValueChange={(v) => setInput({ ...input, goal: v as EmailGenerationInput['goal'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {goals.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={input.tone} onValueChange={(v) => setInput({ ...input, tone: v as EmailGenerationInput['tone'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience *</Label>
                <Input
                  placeholder="e.g., SA SME owners looking to automate their marketing"
                  value={input.audience}
                  onChange={(e) => setInput({ ...input, audience: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Product / Service</Label>
                <Input
                  placeholder="e.g., DraggonnB CRM Platform"
                  value={input.product || ''}
                  onChange={(e) => setInput({ ...input, product: e.target.value })}
                />
              </div>

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-primary hover:underline"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Offer Details</Label>
                    <Input
                      placeholder="e.g., 30% off for the first 3 months"
                      value={input.offerDetails || ''}
                      onChange={(e) => setInput({ ...input, offerDetails: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Key Bullet Points (comma-separated)</Label>
                    <Input
                      placeholder="e.g., Save time, Increase revenue, Automate follow-ups"
                      value={input.bulletPoints?.join(', ') || ''}
                      onChange={(e) => setInput({ ...input, bulletPoints: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CTA URL</Label>
                    <Input
                      placeholder="https://draggonnb.online/signup"
                      value={input.ctaUrl || ''}
                      onChange={(e) => setInput({ ...input, ctaUrl: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Email Content</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!result ? (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p>Generated email content will appear here</p>
                <p className="text-sm mt-2">Configure your email and click Generate</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Subject Lines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subject Lines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.subjectLines.map((subject, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <span className="flex-1 text-sm">{subject}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(subject, idx)}
                      >
                        {copiedSubject === idx ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Short Body */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Short Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={result.shortBody} rows={6} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(result.shortBody)}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </CardContent>
              </Card>

              {/* Long Body */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Long Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={result.longBody} rows={10} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(result.longBody)}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </CardContent>
              </Card>

              {/* Follow-up Suggestion */}
              {result.followUpSuggestion && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Follow-Up Suggestion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{result.followUpSuggestion}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
