/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ModuleGrid } from '@/components/landing/module-grid'
import { MODULE_CARDS } from '@/lib/landing/module-content'

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

describe('ModuleGrid', () => {
  it('renders exactly 6 module cards', () => {
    render(<ModuleGrid />)
    const cards = document.querySelectorAll('[data-module-card]')
    expect(cards).toHaveLength(6)
  })

  it('renders the 5+1 module set in canonical order', () => {
    render(<ModuleGrid />)
    const ids = Array.from(document.querySelectorAll('[data-module-card]')).map((el) =>
      el.getAttribute('data-module-card')
    )
    expect(ids).toEqual(['accommodation', 'restaurant', 'trophy-os', 'elijah', 'crm-campaign', 'other'])
  })

  it('every card has a title, value prop, exactly 3 bullets and a Learn more link', () => {
    render(<ModuleGrid />)
    for (const card of MODULE_CARDS) {
      const node = document.querySelector(`[data-module-card="${card.id}"]`) as HTMLElement
      expect(node).toBeTruthy()
      const scoped = within(node)
      expect(scoped.getByText(card.title)).toBeTruthy()
      expect(scoped.getByText(card.valueProp)).toBeTruthy()
      const bullets = node.querySelectorAll('ul li')
      expect(bullets).toHaveLength(3)
      expect(scoped.getByText(/Learn more/)).toBeTruthy()
    }
  })

  it('cards link to the configured learnMoreHref', () => {
    render(<ModuleGrid />)
    for (const card of MODULE_CARDS) {
      const node = document.querySelector(`[data-module-card="${card.id}"]`) as HTMLAnchorElement
      expect(node.getAttribute('href')).toBe(card.learnMoreHref)
    }
  })

  it('Trophy OS card opens externally (target=_blank, rel=noopener)', () => {
    render(<ModuleGrid />)
    const trophy = document.querySelector('[data-module-card="trophy-os"]') as HTMLAnchorElement
    expect(trophy.getAttribute('target')).toBe('_blank')
    expect(trophy.getAttribute('rel')).toContain('noopener')
  })

  it('renders the section heading', () => {
    render(<ModuleGrid />)
    expect(screen.getByText(/Pick the operating system/)).toBeTruthy()
  })
})
