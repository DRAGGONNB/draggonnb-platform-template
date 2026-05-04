/** @vitest-environment jsdom */
/**
 * Approvals web UI tests — sidebar integration + Telegram activation page render.
 *
 * Checks:
 *   1. buildSidebar includes 'approvals' item for all role/module combos
 *   2. /approvals item has correct href + icon
 *   3. /approvals item appears between 'insights' and 'settings' in the order
 *   4. TelegramIntegrationPage renders Connect Telegram button
 *   5. TelegramIntegrationPage shows error state correctly
 *   6. TelegramIntegrationPage shows link state after successful fetch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'

// ── Sidebar integration tests ────────────────────────────────────────────────

describe('buildSidebar — approvals nav item (Phase 14)', () => {
  it('includes "approvals" item for user with no modules', () => {
    const items = buildSidebar([], 'user')
    const ids = items.map((i) => i.id)
    expect(ids).toContain('approvals')
  })

  it('includes "approvals" item for admin with all modules', () => {
    const items = buildSidebar(['crm', 'accommodation'], 'admin')
    const ids = items.map((i) => i.id)
    expect(ids).toContain('approvals')
  })

  it('approvals item has href = /approvals', () => {
    const items = buildSidebar([], 'user')
    const approvals = items.find((i) => i.id === 'approvals')
    expect(approvals).toBeDefined()
    expect(approvals!.href).toBe('/approvals')
  })

  it('approvals item has an icon field (lucide-react icon name)', () => {
    const items = buildSidebar([], 'user')
    const approvals = items.find((i) => i.id === 'approvals')
    expect(approvals!.icon).toBeTruthy()
  })

  it('approvals appears between insights and settings in order', () => {
    const items = buildSidebar([], 'user')
    const ids = items.map((i) => i.id)
    const approvalsIdx = ids.indexOf('approvals')
    const insightsIdx = ids.indexOf('insights')
    const settingsIdx = ids.indexOf('settings')
    expect(approvalsIdx).toBeGreaterThan(insightsIdx)
    expect(approvalsIdx).toBeLessThan(settingsIdx)
  })
})

// ── TelegramIntegrationPage component render tests ────────────────────────────

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('TelegramIntegrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Connect Telegram button', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/dashboard/settings/integrations/telegram/page'
    )
    render(<Page />)
    expect(screen.getByRole('button', { name: /Connect Telegram/i })).toBeInTheDocument()
  })

  it('shows loading state while fetch is in progress', async () => {
    const user = userEvent.setup()
    // Never resolves — simulates slow fetch
    global.fetch = vi.fn(() => new Promise(() => {})) as any

    const { default: Page } = await import(
      '@/app/(dashboard)/dashboard/settings/integrations/telegram/page'
    )
    render(<Page />)

    const btn = screen.getByRole('button', { name: /Connect Telegram/i })
    await user.click(btn)
    expect(screen.getByRole('button', { name: /Generating/i })).toBeInTheDocument()
  })

  it('shows the generated link when fetch succeeds', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ link: 'https://t.me/DraggonnB_AssistantBot?start=auth_test123' }),
    }) as any

    const { default: Page } = await import(
      '@/app/(dashboard)/dashboard/settings/integrations/telegram/page'
    )
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /Connect Telegram/i }))
    await waitFor(() => {
      expect(screen.getByText(/t\.me\/DraggonnB_AssistantBot/)).toBeInTheDocument()
    })
  })

  it('shows error message when fetch returns non-OK', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'server misconfigured' }),
    }) as any

    const { default: Page } = await import(
      '@/app/(dashboard)/dashboard/settings/integrations/telegram/page'
    )
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /Connect Telegram/i }))
    await waitFor(() => {
      expect(screen.getByText(/server misconfigured/i)).toBeInTheDocument()
    })
  })
})
