'use client'

import { useState } from 'react'
import type { ScrapedBrandContext } from '@/lib/brand-voice/scraper'
import type { BrandVoiceInput } from '@/lib/brand-voice/wizard-questions'
import { WizardStepQuestions } from './wizard-step-questions'
import { WizardStepReview } from './wizard-step-review'

type WizardStep = 'url' | 'questions' | 'review' | 'done'

interface ExistingVoice {
  brand_voice_prompt?: string | null
  example_phrases?: string[] | null
  forbidden_topics?: string[] | null
  brand_voice_updated_at?: string | null
}

interface BrandVoiceWizardProps {
  initialExistingVoice?: ExistingVoice | null
}

/**
 * Top-level brand-voice wizard host.
 *
 * Holds the 3-step state machine:
 *   1. url         — scrape a public URL or skip to manual entry
 *   2. questions   — 5 wizard questions (VOICE-01)
 *   3. review      — user-facing summary + Save button
 *   4. done        — success state
 *
 * Submits to:
 *   - POST /api/brand-voice/scrape  (10-03)
 *   - POST /api/brand-voice/save    (10-03)
 *
 * Closes VOICE-01 (UI) and VOICE-08 (UI re-run flow — header on the
 * RSC parent shows "Last updated …" when an existing voice is present).
 */
export function BrandVoiceWizard({ initialExistingVoice }: BrandVoiceWizardProps) {
  const [step, setStep] = useState<WizardStep>('url')
  const [scraped, setScraped] = useState<ScrapedBrandContext | null>(null)
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<BrandVoiceInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Pre-seed list-style answers from existing voice for quick re-edit
  const initialAnswers: Partial<BrandVoiceInput> | null = initialExistingVoice
    ? {
        example_phrases: initialExistingVoice.example_phrases ?? [],
        forbidden_topics: initialExistingVoice.forbidden_topics ?? [],
      }
    : null

  async function handleScrape() {
    if (!url) return
    setScraping(true)
    setScrapeError(null)
    try {
      const res = await fetch('/api/brand-voice/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as ScrapedBrandContext
      setScraped(data)
      setStep('questions')
    } catch (err) {
      setScrapeError((err as Error).message)
    } finally {
      setScraping(false)
    }
  }

  function handleSkip() {
    setScraped(null)
    setStep('questions')
  }

  async function handleSave() {
    if (!answers) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/brand-voice/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, scrapedContext: scraped ?? undefined }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setStep('done')
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'url') {
    return (
      <div className="mt-8 space-y-4">
        <h2 className="font-semibold text-lg text-[#363940]">
          Step 1 of 3 — Your website
        </h2>
        <p className="text-sm text-gray-600">
          We&apos;ll scan your homepage to pre-fill some answers. Or skip and
          fill in manually.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourbusiness.co.za"
          className="w-full rounded border border-gray-300 p-3 text-sm"
        />
        {scrapeError && (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {scrapeError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleScrape}
            disabled={!url || scraping}
            className="rounded bg-[#6B1420] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a1a29] disabled:opacity-50"
          >
            {scraping ? 'Scanning…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-gray-600 hover:text-[#363940]"
          >
            Skip — fill in manually
          </button>
        </div>
      </div>
    )
  }

  if (step === 'questions') {
    return (
      <WizardStepQuestions
        scraped={scraped}
        initialAnswers={initialAnswers}
        onSubmit={(a) => {
          setAnswers(a)
          setStep('review')
        }}
        onBack={() => setStep('url')}
      />
    )
  }

  if (step === 'review' && answers) {
    return (
      <WizardStepReview
        answers={answers}
        saving={saving}
        error={saveError}
        onBack={() => setStep('questions')}
        onSave={handleSave}
      />
    )
  }

  if (step === 'done') {
    return (
      <div className="mt-8 rounded border border-green-200 bg-green-50 p-6">
        <h2 className="font-semibold text-green-900">Brand voice saved.</h2>
        <p className="mt-2 text-sm text-green-800">
          Every AI agent will use this voice on the next request. You can re-run
          the wizard anytime to update it.
        </p>
      </div>
    )
  }

  return null
}
