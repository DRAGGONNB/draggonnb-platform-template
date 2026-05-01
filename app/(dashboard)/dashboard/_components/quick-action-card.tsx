'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

export interface QuickActionSuggestion {
  action_type: string
  headline: string
  body: string | null
  cta_label: string
  cta_href: string
  refreshed_at: string
}

export function QuickActionCard({ suggestion }: { suggestion: QuickActionSuggestion | null }) {
  if (!suggestion) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">You&apos;re all caught up</h2>
            <p className="mt-1 text-sm text-gray-600">
              No urgent action needed today. Browse around or set up a new campaign.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-quick-action-card
      data-action-type={suggestion.action_type}
      className="rounded-2xl border border-[#6B1420]/20 bg-gradient-to-br from-[#6B1420]/5 via-white to-[#6B1420]/5 p-8 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#6B1420]/10">
            <Sparkles className="h-6 w-6 text-[#6B1420]" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B1420]">
              Today&apos;s quick action
            </p>
            <h2 className="text-xl font-bold text-gray-900">{suggestion.headline}</h2>
            {suggestion.body && (
              <p className="mt-1 text-sm text-gray-600">{suggestion.body}</p>
            )}
          </div>
        </div>
        <Link
          href={suggestion.cta_href}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#6B1420] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6B1420]/90 sm:self-center"
        >
          {suggestion.cta_label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
