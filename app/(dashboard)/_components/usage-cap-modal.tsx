'use client'

import Link from 'next/link'
import { formatResetTimestamp } from '@/lib/usage/format-reset'

interface ModalProps {
  metric: string
  used: number
  limit: number
  resetAt: Date | string
  onClose: () => void
}

const COPY: Record<string, string> = {
  agent_invocations: 'AI agent invocations',
  email_sends: 'email sends',
  social_posts: 'social media posts',
  ai_generations: 'AI content generations',
  receipt_ocr: 'receipt OCR scans',
  campaign_runs: 'campaign runs',
}

/**
 * USAGE-04: 100% cap modal — three-action choice.
 *  1. Upgrade plan       (link to /pricing)
 *  2. Buy a top-up pack  (link to /dashboard/billing/topups)
 *  3. Wait until reset   (closes modal; reset timestamp formatted in Africa/Johannesburg)
 */
export function UsageCapModal({ metric, used, limit, resetAt, onClose }: ModalProps) {
  const label = COPY[metric] ?? metric
  const resetDisplay = formatResetTimestamp(resetAt)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      data-testid="usage-cap-modal-backdrop"
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-cap-modal-title"
      >
        <h2 id="usage-cap-modal-title" className="text-xl font-bold text-[#363940]">
          You&apos;ve reached your {label} cap
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {used.toLocaleString()} of {limit.toLocaleString()} this month. Choose what to
          do next.
        </p>

        <div className="mt-6 space-y-3">
          {/* Action 1: Upgrade plan */}
          <Link
            href="/pricing"
            className="block p-4 border border-[#6B1420] rounded hover:bg-[#fef5f6]"
            data-testid="usage-cap-action-upgrade"
          >
            <div className="font-semibold text-[#363940]">Upgrade your plan</div>
            <div className="text-sm text-gray-600">
              Switch to a higher tier with more {label}.
            </div>
          </Link>

          {/* Action 2: Buy overage top-up */}
          <Link
            href="/dashboard/billing/topups"
            className="block p-4 border border-gray-300 rounded hover:bg-gray-50"
            data-testid="usage-cap-action-overage"
          >
            <div className="font-semibold text-[#363940]">Buy a top-up pack</div>
            <div className="text-sm text-gray-600">
              One-off purchase to keep going this month.
            </div>
          </Link>

          {/* Action 3: Wait until reset */}
          <button
            onClick={onClose}
            className="w-full text-left p-4 border border-gray-300 rounded hover:bg-gray-50"
            data-testid="usage-cap-action-wait"
          >
            <div className="font-semibold text-[#363940]">Wait until reset</div>
            <div className="text-sm text-gray-600">
              Resets on <strong>{resetDisplay}</strong>.
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-6 text-sm text-gray-500 hover:text-gray-900"
          data-testid="usage-cap-close"
        >
          Close
        </button>
      </div>
    </div>
  )
}
