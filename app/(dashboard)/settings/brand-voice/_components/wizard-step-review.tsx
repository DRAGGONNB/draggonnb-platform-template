'use client'

import type { BrandVoiceInput } from '@/lib/brand-voice/wizard-questions'

interface WizardStepReviewProps {
  answers: BrandVoiceInput
  saving?: boolean
  error?: string | null
  onBack: () => void
  onSave: () => void
}

/**
 * Step 3 of the brand-voice wizard: review answers and submit.
 *
 * Renders a structured summary (not raw JSON) so the user can verify
 * their voice configuration before it's committed. Save button calls
 * POST /api/brand-voice/save (handled by the parent wizard).
 */
export function WizardStepReview({
  answers,
  saving = false,
  error,
  onBack,
  onSave,
}: WizardStepReviewProps) {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-semibold text-lg text-[#363940]">
        Step 3 of 3 — Review and save
      </h2>
      <p className="text-sm text-gray-600">
        Confirm everything below. Saving overwrites your previous brand voice
        and applies it to every AI agent on the next request.
      </p>

      <dl className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <div>
          <dt className="font-semibold text-[#363940]">Tone</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {answers.tone.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[#6B1420]/10 px-2 py-0.5 text-xs text-[#6B1420]"
              >
                {t}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="font-semibold text-[#363940]">Audience</dt>
          <dd className="mt-1 whitespace-pre-wrap text-gray-700">{answers.audience}</dd>
        </div>

        <div>
          <dt className="font-semibold text-[#363940]">Differentiator</dt>
          <dd className="mt-1 whitespace-pre-wrap text-gray-700">
            {answers.differentiator}
          </dd>
        </div>

        {answers.example_phrases.length > 0 && (
          <div>
            <dt className="font-semibold text-[#363940]">Example phrases</dt>
            <dd className="mt-1">
              <ul className="list-disc pl-5 text-gray-700">
                {answers.example_phrases.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {answers.forbidden_topics.length > 0 && (
          <div>
            <dt className="font-semibold text-[#363940]">Forbidden topics</dt>
            <dd className="mt-1">
              <ul className="list-disc pl-5 text-gray-700">
                {answers.forbidden_topics.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded bg-[#6B1420] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a1a29] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save brand voice'}
        </button>
      </div>
    </div>
  )
}
