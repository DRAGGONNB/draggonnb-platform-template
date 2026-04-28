'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, CheckCircle2 } from 'lucide-react'

/**
 * Mirrors the row shape returned by GET /api/ops/onboarding-progress
 * (lib/onboarding/progress.ts → onboarding_progress table).
 */
interface OnboardingProgressRow {
  organization_id?: string
  day0_completed_at?: string | null
  brand_voice_completed_at?: string | null
  kickoff_call_scheduled_at?: string | null
  steps_completed?: string[] | null
  drift_flags?: string[] | null
}

interface ChecklistItem {
  label: string
  done: boolean
  href: string | null
}

/**
 * 4-step dashboard onboarding checklist (ONBOARD-01 UI).
 *
 * Lifecycle:
 *   - On mount, GET /api/ops/onboarding-progress
 *   - If org has no progress row, render nothing (post-onboarding tenants)
 *   - If all 4 steps complete, auto-hide
 *   - Otherwise render the live state
 *
 * The API returns `{}` when no row exists — we treat empty objects as
 * "no onboarding to show" and hide the widget.
 */
export function OnboardingChecklist() {
  const [progress, setProgress] = useState<OnboardingProgressRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/ops/onboarding-progress', {
          credentials: 'same-origin',
        })
        if (!res.ok) {
          if (!cancelled) setProgress(null)
          return
        }
        const data = (await res.json()) as OnboardingProgressRow
        if (!cancelled) setProgress(data)
      } catch {
        if (!cancelled) setProgress(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    // Render nothing while loading — the widget is supplementary,
    // not the primary content of the page.
    return null
  }

  // Empty object {} means "no onboarding row" — hide entirely
  if (!progress || !progress.day0_completed_at) {
    return null
  }

  const firstActionDone =
    Array.isArray(progress.steps_completed) &&
    progress.steps_completed.includes('first_action')

  const items: ChecklistItem[] = [
    {
      label: 'Account live',
      done: Boolean(progress.day0_completed_at),
      href: null,
    },
    {
      label: 'Brand voice captured',
      done: Boolean(progress.brand_voice_completed_at),
      href: '/settings/brand-voice',
    },
    {
      label: 'Kickoff call booked',
      done: Boolean(progress.kickoff_call_scheduled_at),
      href: process.env.NEXT_PUBLIC_KICKOFF_CALL_URL ?? '#',
    },
    {
      label: 'First action complete',
      done: firstActionDone,
      href: '/dashboard',
    },
  ]

  // Auto-hide once everything is done
  if (items.every((item) => item.done)) {
    return null
  }

  const completedCount = items.filter((i) => i.done).length

  return (
    <section
      data-testid="onboarding-checklist"
      className="rounded-lg border border-[#6B1420] bg-[#fef5f6] p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#363940]">
            Get to live in 3 business days
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            {completedCount} of {items.length} complete
          </p>
        </div>
        <Calendar className="h-5 w-5 text-[#6B1420]" />
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                item.done
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {item.done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </span>
            {item.href && !item.done ? (
              <Link
                href={item.href}
                className="text-[#363940] underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  item.done ? 'text-gray-500 line-through' : 'text-[#363940]'
                }
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
