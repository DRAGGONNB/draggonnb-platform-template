/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuleHome } from '@/components/module-home/ModuleHome'
import type { ActionCardManifest, ActionCardItem } from '@/components/module-home/types'

// Mock next/link
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

// Mock client islands (they use hooks/fetch unavailable in jsdom without extra setup)
vi.mock('@/components/module-home/ActionCard', () => ({
  ActionCard: ({ title, items }: { title: string; items: ActionCardItem[] }) => (
    <div data-testid="action-card">
      <span data-testid="card-title">{title}</span>
      <span data-testid="card-item-count">{items.length}</span>
    </div>
  ),
}))

vi.mock('@/components/module-home/ToggleViewButton', () => ({
  ToggleViewButton: ({ currentMode }: { currentMode: string }) => (
    <button data-testid="toggle-view-button">{currentMode === 'easy' ? 'Advanced view →' : 'Easy view →'}</button>
  ),
}))

const CARDS: ActionCardManifest[] = [
  {
    id: 'followups',
    title: 'Follow-ups due',
    description: 'Contacts that need attention',
    emptyStateCTA: 'No follow-ups due today',
    maxItems: 5,
    sourceKind: 'sql_page_load',
  },
  {
    id: 'stale_deals',
    title: 'Stale deals',
    description: 'Deals with no activity',
    emptyStateCTA: 'All deals are active',
    maxItems: 5,
    sourceKind: 'cached_suggestions',
  },
]

const ITEMS: ActionCardItem[] = [
  {
    id: 'item-1',
    entityId: 'contact-1',
    entityType: 'contact',
    displayName: 'Alice Smith',
    subtitle: 'Last contact 9 days ago',
  },
]

const BASE_PROPS = {
  module: 'crm',
  cards: CARDS,
  cardData: {
    followups: { items: ITEMS, totalCount: 1 },
    stale_deals: { items: [], totalCount: 0 },
  },
  userRole: 'admin' as const,
  uiMode: 'easy' as const,
  organizationId: 'org-1',
  hasBrandVoice: true,
  apiEndpointBase: '/api/crm/easy-view',
  advancedHref: '/dashboard/crm/advanced',
}

describe('ModuleHome', () => {
  it('renders module title and Easy view subtitle', () => {
    render(<ModuleHome {...BASE_PROPS} />)
    expect(screen.getByText('crm')).toBeInTheDocument()
    expect(screen.getByText('Easy view')).toBeInTheDocument()
  })

  it('renders one ActionCard per manifest entry', () => {
    render(<ModuleHome {...BASE_PROPS} />)
    const cards = screen.getAllByTestId('action-card')
    expect(cards).toHaveLength(CARDS.length)
  })

  it('passes correct items to each card', () => {
    render(<ModuleHome {...BASE_PROPS} />)
    const counts = screen.getAllByTestId('card-item-count')
    expect(counts[0].textContent).toBe('1') // followups has 1 item
    expect(counts[1].textContent).toBe('0') // stale_deals has 0 items
  })

  it('does NOT render brand-voice banner when hasBrandVoice=true', () => {
    render(<ModuleHome {...BASE_PROPS} hasBrandVoice={true} />)
    expect(screen.queryByText(/brand voice/i)).not.toBeInTheDocument()
  })

  it('renders brand-voice banner when hasBrandVoice=false', () => {
    render(<ModuleHome {...BASE_PROPS} hasBrandVoice={false} />)
    expect(
      screen.getByText(/Complete your brand voice in 30 seconds/i)
    ).toBeInTheDocument()
  })

  it('renders the ToggleViewButton', () => {
    render(<ModuleHome {...BASE_PROPS} />)
    expect(screen.getByTestId('toggle-view-button')).toBeInTheDocument()
  })

  it('brand-voice banner links to /settings/brand-voice', () => {
    render(<ModuleHome {...BASE_PROPS} hasBrandVoice={false} />)
    const link = screen.getByRole('link', { name: /→/i })
    expect(link).toHaveAttribute('href', '/settings/brand-voice')
  })
})
