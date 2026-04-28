/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="mail-icon" />,
  MessageSquare: () => <span data-testid="sms-icon" />,
  RotateCcw: () => <span data-testid="rotate-icon" />,
  ShieldCheck: () => <span data-testid="shield-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left" />,
}))

const fetchMock = vi.fn()
global.fetch = fetchMock

// ============================================================================
// ApprovalScreen smoke test
// ============================================================================

import { ApprovalScreen } from '@/app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalScreen'
import type { ApprovalDraft } from '@/app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalList'

const MOCK_DRAFTS: ApprovalDraft[] = [
  {
    id: 'draft-email',
    campaign_id: 'camp-1',
    channel: 'email',
    subject: 'Sunday brunch special',
    body_text: 'Join us for our Sunday brunch this weekend with 3 courses for R195.',
    brand_safe: null,
    safety_flags: null,
    is_approved: false,
  },
  {
    id: 'draft-sms',
    campaign_id: 'camp-1',
    channel: 'sms',
    subject: null,
    body_text: 'Sunday brunch R195. Book now: draggonnb.co.za/book. Reply STOP to opt out.',
    brand_safe: true,
    safety_flags: [],
    is_approved: false,
  },
]

const CHANNEL_ACCOUNTS = [
  { channelId: 'email', accountName: 'Resend (default org domain)' },
  { channelId: 'sms', accountName: 'SMS via DraggonnB sender ID' },
]

describe('ApprovalScreen', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
  })

  it('renders draft cards for each draft', () => {
    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={MOCK_DRAFTS}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    // Channel badges
    expect(screen.getByText('email')).toBeDefined()
    expect(screen.getByText('sms')).toBeDefined()
  })

  it('shows "Approve all" button', () => {
    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={MOCK_DRAFTS}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    expect(screen.getByText('Approve all')).toBeDefined()
  })

  it('"Approve campaign" button is disabled when drafts not approved', () => {
    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={MOCK_DRAFTS}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    const approveBtn = screen.getByText('Approve campaign')
    expect(approveBtn.closest('button')?.disabled).toBe(true)
  })

  it('opens publish modal after all drafts approved', async () => {
    const user = userEvent.setup()

    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={MOCK_DRAFTS}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    // Click Approve all
    await user.click(screen.getByText('Approve all'))

    // Now approve campaign button should be enabled
    const approveBtn = screen.getByText('Approve campaign')
    await waitFor(() => {
      expect(approveBtn.closest('button')?.disabled).toBe(false)
    })

    // Click it — should open modal
    await user.click(approveBtn)

    await waitFor(() => {
      expect(screen.getByText('Confirm campaign publish')).toBeDefined()
    })
  })

  it('publish modal shows channel accounts', async () => {
    const user = userEvent.setup()

    const approvedDrafts = MOCK_DRAFTS.map((d) => ({ ...d, is_approved: true }))

    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={approvedDrafts}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    await user.click(screen.getByText('Approve campaign'))

    await waitFor(() => {
      expect(screen.getByText('Resend (default org domain)')).toBeDefined()
      expect(screen.getByText('SMS via DraggonnB sender ID')).toBeDefined()
    })
  })

  it('calls /api/campaigns/{id}/approve on schedule click', async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'pending_review', nextAction: 'awaiting_review' }),
    })

    const approvedDrafts = MOCK_DRAFTS.map((d) => ({ ...d, is_approved: true }))

    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={approvedDrafts}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    await user.click(screen.getByText('Approve campaign'))
    await waitFor(() => screen.getByText('Confirm campaign publish'))

    await user.click(screen.getByText('Schedule'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/camp-1/approve',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error when approve API fails', async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '1 draft(s) not yet approved' }),
    })

    const approvedDrafts = MOCK_DRAFTS.map((d) => ({ ...d, is_approved: true }))

    render(
      <ApprovalScreen
        campaignId="camp-1"
        drafts={approvedDrafts}
        channelAccounts={CHANNEL_ACCOUNTS}
      />
    )

    await user.click(screen.getByText('Approve campaign'))
    await waitFor(() => screen.getByText('Confirm campaign publish'))
    await user.click(screen.getByText('Schedule'))

    await waitFor(() => {
      expect(screen.getByText('1 draft(s) not yet approved')).toBeDefined()
    })
  })
})
