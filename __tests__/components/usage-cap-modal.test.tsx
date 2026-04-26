/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { UsageCapModal } from '@/app/(dashboard)/_components/usage-cap-modal'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const baseProps = {
  metric: 'agent_invocations',
  used: 1000,
  limit: 1000,
  resetAt: new Date('2026-04-30T22:00:00Z'), // 1 May 00:00 SAST
}

describe('UsageCapModal', () => {
  it('renders the three actions: Upgrade / Buy top-up / Wait until reset', () => {
    render(<UsageCapModal {...baseProps} onClose={() => {}} />)

    expect(screen.getByTestId('usage-cap-action-upgrade')).toBeInTheDocument()
    expect(screen.getByTestId('usage-cap-action-overage')).toBeInTheDocument()
    expect(screen.getByTestId('usage-cap-action-wait')).toBeInTheDocument()

    expect(screen.getByText(/Upgrade your plan/i)).toBeInTheDocument()
    expect(screen.getByText(/Buy a top-up pack/i)).toBeInTheDocument()
    expect(screen.getByText(/Wait until reset/i)).toBeInTheDocument()
  })

  it('formats the reset timestamp in Africa/Johannesburg as "d MMMM at HH:mm SAST"', () => {
    render(<UsageCapModal {...baseProps} onClose={() => {}} />)
    // resetAt = 30 Apr 22:00 UTC → 1 May 00:00 SAST
    expect(screen.getByText(/1 May at 00:00 SAST/)).toBeInTheDocument()
  })

  it('uses the friendly metric label for known metrics', () => {
    render(<UsageCapModal {...baseProps} metric="agent_invocations" onClose={() => {}} />)
    // "AI agent invocations" appears in title + description
    const matches = screen.getAllByText(/AI agent invocations/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('falls back to the raw metric name when no friendly label exists', () => {
    render(<UsageCapModal {...baseProps} metric="bespoke_widgets" onClose={() => {}} />)
    // metric label is rendered split across multiple text nodes — match on textContent
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('bespoke_widgets')
  })

  it('calls onClose when the Wait button is clicked', async () => {
    const onClose = vi.fn()
    render(<UsageCapModal {...baseProps} onClose={onClose} />)

    await userEvent.click(screen.getByTestId('usage-cap-action-wait'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the Close button is clicked', async () => {
    const onClose = vi.fn()
    render(<UsageCapModal {...baseProps} onClose={onClose} />)

    await userEvent.click(screen.getByTestId('usage-cap-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<UsageCapModal {...baseProps} onClose={onClose} />)

    await userEvent.click(screen.getByTestId('usage-cap-modal-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does NOT call onClose when the inner card is clicked', async () => {
    const onClose = vi.fn()
    render(<UsageCapModal {...baseProps} onClose={onClose} />)

    // The dialog is the inner element with role="dialog" - clicking it should NOT bubble close
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders both used/limit numbers with locale formatting', () => {
    render(
      <UsageCapModal
        {...baseProps}
        used={12345}
        limit={50000}
        onClose={() => {}}
      />,
    )
    // toLocaleString() output varies by jsdom default locale — could be "12,345" (en-US)
    // or "12 345" (NBSP-thousands like en-ZA). Strip non-digits to assert digit content.
    const dialog = screen.getByRole('dialog')
    const digitsOnly = (dialog.textContent ?? '').replace(/\D/g, '')
    expect(digitsOnly).toContain('12345')
    expect(digitsOnly).toContain('50000')
  })
})
