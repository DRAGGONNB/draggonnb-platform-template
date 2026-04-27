/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="mail-icon" />,
  MessageSquare: () => <span data-testid="sms-icon" />,
  RotateCcw: () => <span data-testid="rotate-icon" />,
  ShieldCheck: () => <span data-testid="shield-icon" />,
  Wand2: () => <span data-testid="wand-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  Plus: () => <span data-testid="plus-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
}))

// Mock fetch globally
const fetchMock = vi.fn()
global.fetch = fetchMock

// ============================================================================
// StudioComposer smoke test
// ============================================================================

import { StudioComposer } from '@/app/(dashboard)/campaigns/studio/[id]/_components/StudioComposer'
import type { ChannelConfig } from '@/app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector'

const CHANNEL_CONFIG: ChannelConfig[] = [
  { id: 'email', label: 'Email', enabled: true },
  { id: 'sms', label: 'SMS', enabled: true },
  { id: 'facebook', label: 'Facebook', enabled: false, ctaText: 'Connect Facebook to enable' },
  { id: 'instagram', label: 'Instagram', enabled: false, ctaText: 'Connect Instagram to enable' },
  { id: 'linkedin', label: 'LinkedIn', enabled: false, ctaText: 'Connect LinkedIn to enable' },
]

describe('StudioComposer', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    mockPush.mockReset()
  })

  it('renders channel pills', () => {
    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    expect(screen.getByText('Email')).toBeDefined()
    expect(screen.getByText('SMS')).toBeDefined()
    expect(screen.getByText('Facebook')).toBeDefined()
  })

  it('shows disabled channels with CTA badge', () => {
    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    // Facebook has ctaText and is disabled
    expect(screen.getByText('Connect Facebook to enable')).toBeDefined()
    expect(screen.getByText('Connect Instagram to enable')).toBeDefined()
  })

  it('shows "Generate drafts" button when no drafts', () => {
    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    expect(screen.getByText('Generate drafts')).toBeDefined()
  })

  it('shows "Regenerate all drafts" when drafts exist', () => {
    const drafts = [
      {
        id: 'draft-1',
        campaign_id: 'camp-1',
        channel: 'email',
        subject: 'Test subject',
        body_text: 'Test body',
        body_html: null,
        brand_safe: null,
        safety_flags: null,
        is_approved: false,
        regeneration_count: 0,
      },
    ]

    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={['email']}
        initialDrafts={drafts}
      />
    )

    expect(screen.getByText('Regenerate all drafts')).toBeDefined()
  })

  it('calls /api/campaigns/{id}/drafts on generate click', async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ drafts: [] }),
    })

    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    await user.click(screen.getByText('Generate drafts'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/camp-1/drafts',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error message when generate fails', async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Campaigns are paused' }),
    })

    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    await user.click(screen.getByText('Generate drafts'))

    await waitFor(() => {
      expect(screen.getByText('Campaigns are paused')).toBeDefined()
    })
  })

  it('opens locked channel dialog when disabled channel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <StudioComposer
        campaignId="camp-1"
        channelConfig={CHANNEL_CONFIG}
        initialChannels={[]}
        initialDrafts={[]}
      />
    )

    await user.click(screen.getByText('Facebook'))

    await waitFor(() => {
      expect(screen.getByText('Connect Facebook')).toBeDefined()
    })
  })
})
