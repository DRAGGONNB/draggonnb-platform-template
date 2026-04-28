/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ModulePicker,
  type PricingPickerPlan,
  type PricingPickerAddon,
} from '@/app/pricing/_components/module-picker'

// next/link mock so we don't hit the App Router context in jsdom
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

const PLANS: PricingPickerPlan[] = [
  { id: 'core', name: 'Core', priceZarCents: 59900, description: 'Core plan' },
  {
    id: 'vertical_accommodation',
    name: 'Accommodation',
    priceZarCents: 119900,
    description: 'Lodge plan',
  },
  {
    id: 'vertical_restaurant',
    name: 'Restaurant',
    priceZarCents: 119900,
    description: 'Restaurant plan',
  },
]

// Mirrors billing_addons_catalog seed (migration 24)
const ADDONS: PricingPickerAddon[] = [
  {
    id: 'finance_ai',
    display_name: 'Finance-AI Module',
    description: 'AI-powered financial reporting',
    price_zar_cents: 39900,
    kind: 'module',
    billing_cycle: 'monthly',
  },
  {
    id: 'events',
    display_name: 'Events Module',
    description: 'Event bookings + ticketing',
    price_zar_cents: 29900,
    kind: 'module',
    billing_cycle: 'monthly',
  },
  {
    id: 'white_label',
    display_name: 'White-label Branding',
    description: 'Custom domain + logo',
    price_zar_cents: 49900,
    kind: 'module',
    billing_cycle: 'monthly',
  },
  {
    id: 'setup_fee',
    display_name: 'Setup & Onboarding',
    description: 'Once-off setup',
    price_zar_cents: 149900,
    kind: 'setup_fee',
    billing_cycle: 'one_off',
  },
  {
    id: 'topup_posts_100',
    display_name: '100 Extra Social Posts',
    description: 'Top-up pack',
    price_zar_cents: 4900,
    kind: 'overage_pack',
    billing_cycle: 'one_off',
  },
]

describe('ModulePicker (BILL-01 + BILL-09)', () => {
  it('renders all 3 plans from props', () => {
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Accommodation')).toBeInTheDocument()
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
  })

  it('renders only kind=module + monthly addons (filters out setup_fee + overage_pack)', () => {
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    expect(screen.getByText('Finance-AI Module')).toBeInTheDocument()
    expect(screen.getByText('Events Module')).toBeInTheDocument()
    expect(screen.getByText('White-label Branding')).toBeInTheDocument()
    // setup_fee belongs in the once-off line, not the toggle list
    expect(screen.queryByText('100 Extra Social Posts')).not.toBeInTheDocument()
  })

  it('shows "incl. 15% VAT" label in the live total (BILL-09)', () => {
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    expect(screen.getAllByText(/incl\. 15% VAT/i).length).toBeGreaterThanOrEqual(1)
  })

  // en-ZA locale uses comma decimal + U+00A0 (NBSP) thousands separator
  // (e.g. "R1 199,00"). Testing Library normalises whitespace, so for
  // multi-thousand values we match via regex (\s+ tolerates NBSP).
  it('default state shows Core plan total: R599,00 ex / R688,85 inc (en-ZA format)', () => {
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    const total = screen.getByTestId('pricing-total')
    expect(within(total).getByText('R599,00')).toBeInTheDocument()
    expect(within(total).getByText('R688,85')).toBeInTheDocument()
  })

  it('selecting Vertical Accommodation updates total to R1 199,00 ex / R1 378,85 inc', async () => {
    const user = userEvent.setup()
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)

    const lodgeRadio = screen.getByRole('radio', { name: /Accommodation/i })
    await user.click(lodgeRadio)

    const total = screen.getByTestId('pricing-total')
    expect(within(total).getByText(/R1\s+199,00/)).toBeInTheDocument()
    expect(within(total).getByText(/R1\s+378,85/)).toBeInTheDocument()
  })

  it('toggling Finance-AI on Core updates inc-VAT total to R1 147,70 (R599 + R399 = R998 ex)', async () => {
    const user = userEvent.setup()
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)

    const financeAiCheckbox = screen.getByRole('checkbox', { name: /Finance-AI Module/i })
    await user.click(financeAiCheckbox)

    const total = screen.getByTestId('pricing-total')
    expect(within(total).getByText('R998,00')).toBeInTheDocument()
    expect(within(total).getByText(/R1\s+147,70/)).toBeInTheDocument()
  })

  it('shows the once-off setup line when setup_fee is in the catalog', () => {
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    expect(screen.getByText(/Once-off setup/i)).toBeInTheDocument()
    // R1,499 ex -> R1,723.85 inc (en-ZA: "R1 723,85")
    expect(screen.getByText(/R1\s+723,85/)).toBeInTheDocument()
  })

  it('hides the once-off setup line when no setup_fee in catalog', () => {
    const noSetup = ADDONS.filter((a) => a.id !== 'setup_fee')
    render(<ModulePicker plans={PLANS} addons={noSetup} />)
    expect(screen.queryByText(/Once-off setup/i)).not.toBeInTheDocument()
  })

  it('toggling an addon off restores the previous total', async () => {
    const user = userEvent.setup()
    render(<ModulePicker plans={PLANS} addons={ADDONS} />)
    const total = screen.getByTestId('pricing-total')

    const events = screen.getByRole('checkbox', { name: /Events Module/i })
    await user.click(events) // ON: 599 + 299 = 898 ex
    expect(within(total).getByText('R898,00')).toBeInTheDocument()
    await user.click(events) // OFF: back to 599 ex -> 688,85 inc
    expect(within(total).getByText('R688,85')).toBeInTheDocument()
  })
})
