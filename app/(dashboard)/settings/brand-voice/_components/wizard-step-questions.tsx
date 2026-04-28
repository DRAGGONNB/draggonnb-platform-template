'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  WIZARD_QUESTIONS,
  BrandVoiceInputSchema,
  type BrandVoiceInput,
} from '@/lib/brand-voice/wizard-questions'
import type { ScrapedBrandContext } from '@/lib/brand-voice/scraper'

interface WizardStepQuestionsProps {
  scraped: ScrapedBrandContext | null
  initialAnswers?: Partial<BrandVoiceInput> | null
  onSubmit: (answers: BrandVoiceInput) => void
  onBack?: () => void
}

/**
 * Step 2 of the brand-voice wizard: 5 questions sourced from
 * lib/brand-voice/wizard-questions.ts (VOICE-01 schema).
 *
 * Pre-fills "audience" with the scraped page description if available,
 * giving the user a starting point rather than a blank textarea.
 *
 * Validates client-side via BrandVoiceInputSchema before calling onSubmit
 * so the parent never has to re-validate.
 */
export function WizardStepQuestions({
  scraped,
  initialAnswers,
  onSubmit,
  onBack,
}: WizardStepQuestionsProps) {
  // Tone is multi-select with optional custom additions
  const TONE_QUESTION = WIZARD_QUESTIONS[0]
  const TONE_OPTIONS = TONE_QUESTION.options

  const [tone, setTone] = useState<string[]>(initialAnswers?.tone ?? [])
  const [customTone, setCustomTone] = useState('')

  const [audience, setAudience] = useState<string>(
    initialAnswers?.audience ?? scraped?.description ?? '',
  )
  const [differentiator, setDifferentiator] = useState<string>(
    initialAnswers?.differentiator ?? '',
  )
  const [examplePhrases, setExamplePhrases] = useState<string[]>(
    initialAnswers?.example_phrases ?? [''],
  )
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>(
    initialAnswers?.forbidden_topics ?? [''],
  )

  // Re-pre-fill if scraped context arrives after mount (rare but safe)
  useEffect(() => {
    if (!audience && scraped?.description) {
      setAudience(scraped.description)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scraped])

  const [errors, setErrors] = useState<string[]>([])

  function toggleTone(t: string) {
    setTone((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  function addCustomTone() {
    const v = customTone.trim()
    if (!v) return
    if (!tone.includes(v)) setTone([...tone, v])
    setCustomTone('')
  }

  function updateListItem(
    list: string[],
    setList: (next: string[]) => void,
    idx: number,
    value: string,
  ) {
    const next = [...list]
    next[idx] = value
    setList(next)
  }

  function addListItem(list: string[], setList: (next: string[]) => void, max: number) {
    if (list.length >= max) return
    setList([...list, ''])
  }

  function removeListItem(
    list: string[],
    setList: (next: string[]) => void,
    idx: number,
  ) {
    const next = list.filter((_, i) => i !== idx)
    setList(next.length === 0 ? [''] : next)
  }

  const candidate = useMemo<Partial<BrandVoiceInput>>(
    () => ({
      scrapedContext: scraped ?? undefined,
      tone,
      audience,
      differentiator,
      example_phrases: examplePhrases.map((p) => p.trim()).filter(Boolean),
      forbidden_topics: forbiddenTopics.map((p) => p.trim()).filter(Boolean),
    }),
    [scraped, tone, audience, differentiator, examplePhrases, forbiddenTopics],
  )

  function handleSubmit() {
    const parsed = BrandVoiceInputSchema.safeParse(candidate)
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
      return
    }
    setErrors([])
    onSubmit(parsed.data)
  }

  return (
    <div className="mt-8 space-y-6">
      <h2 className="font-semibold text-lg text-[#363940]">
        Step 2 of 3 — Tell us about your brand
      </h2>

      {/* Tone */}
      <fieldset>
        <legend className="font-medium text-[#363940]">{TONE_QUESTION.label}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONE_OPTIONS.map((opt) => {
            const active = tone.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleTone(opt)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-[#6B1420] bg-[#6B1420] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#6B1420]'
                }`}
              >
                {opt}
              </button>
            )
          })}
          {/* Custom tones already added show as pills too */}
          {tone
            .filter((t) => !(TONE_OPTIONS as readonly string[]).includes(t))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTone(t)}
                className="rounded-full border border-[#6B1420] bg-[#6B1420] px-3 py-1 text-sm text-white"
              >
                {t} ×
              </button>
            ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customTone}
            onChange={(e) => setCustomTone(e.target.value)}
            placeholder="Add a custom tone (e.g. 'Quirky')"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustomTone}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            Add
          </button>
        </div>
      </fieldset>

      {/* Audience */}
      <fieldset>
        <legend className="font-medium text-[#363940]">
          {WIZARD_QUESTIONS[1].label}
        </legend>
        <textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={WIZARD_QUESTIONS[1].placeholder}
          className="mt-2 w-full rounded border border-gray-300 p-3 text-sm"
        />
        <div className="text-xs text-gray-500">{audience.length}/500</div>
      </fieldset>

      {/* Differentiator */}
      <fieldset>
        <legend className="font-medium text-[#363940]">
          {WIZARD_QUESTIONS[2].label}
        </legend>
        <textarea
          value={differentiator}
          onChange={(e) => setDifferentiator(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={WIZARD_QUESTIONS[2].placeholder}
          className="mt-2 w-full rounded border border-gray-300 p-3 text-sm"
        />
        <div className="text-xs text-gray-500">{differentiator.length}/500</div>
      </fieldset>

      {/* Example phrases */}
      <fieldset>
        <legend className="font-medium text-[#363940]">
          {WIZARD_QUESTIONS[3].label}
        </legend>
        <p className="text-xs text-gray-500">{WIZARD_QUESTIONS[3].placeholder}</p>
        <div className="mt-2 space-y-2">
          {examplePhrases.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={p}
                onChange={(e) =>
                  updateListItem(examplePhrases, setExamplePhrases, i, e.target.value)
                }
                className="flex-1 rounded border border-gray-300 p-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeListItem(examplePhrases, setExamplePhrases, i)}
                className="text-sm text-gray-500 hover:text-[#6B1420]"
              >
                Remove
              </button>
            </div>
          ))}
          {examplePhrases.length < 5 && (
            <button
              type="button"
              onClick={() => addListItem(examplePhrases, setExamplePhrases, 5)}
              className="text-sm text-[#6B1420] hover:underline"
            >
              + Add phrase
            </button>
          )}
        </div>
      </fieldset>

      {/* Forbidden topics */}
      <fieldset>
        <legend className="font-medium text-[#363940]">
          {WIZARD_QUESTIONS[4].label}
        </legend>
        <p className="text-xs text-gray-500">{WIZARD_QUESTIONS[4].placeholder}</p>
        <div className="mt-2 space-y-2">
          {forbiddenTopics.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={p}
                onChange={(e) =>
                  updateListItem(forbiddenTopics, setForbiddenTopics, i, e.target.value)
                }
                className="flex-1 rounded border border-gray-300 p-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeListItem(forbiddenTopics, setForbiddenTopics, i)}
                className="text-sm text-gray-500 hover:text-[#6B1420]"
              >
                Remove
              </button>
            </div>
          ))}
          {forbiddenTopics.length < 10 && (
            <button
              type="button"
              onClick={() => addListItem(forbiddenTopics, setForbiddenTopics, 10)}
              className="text-sm text-[#6B1420] hover:underline"
            >
              + Add forbidden topic
            </button>
          )}
        </div>
      </fieldset>

      {errors.length > 0 && (
        <ul className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-3 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded bg-[#6B1420] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a1a29]"
        >
          Review answers
        </button>
      </div>
    </div>
  )
}
