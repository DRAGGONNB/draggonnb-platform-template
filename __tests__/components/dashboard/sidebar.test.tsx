/** @vitest-environment jsdom */

/**
 * Sidebar component tests — updated for Plan 12-06 dynamic sidebar.
 *
 * The old Sidebar.tsx (hardcoded 54-item navigation array) has been replaced
 * by a server-rendered SidebarServer + SidebarClient pair. The SidebarClient
 * is what we test here — it receives pre-built items from buildSidebar().
 *
 * buildSidebar() is tested exhaustively in sidebar-build.test.ts.
 * This file tests the rendering and active-state logic of SidebarClient.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarClient } from '@/components/dashboard/sidebar-client'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'

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

// Mock next/navigation — default to /dashboard
const pathnameMock = vi.fn(() => '/dashboard')
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

describe('SidebarClient', () => {
  it('renders the DraggonnB logo text', () => {
    const items = buildSidebar([], 'user')
    render(<SidebarClient items={items} />)
    expect(screen.getByText('NB')).toBeInTheDocument()
    expect(screen.getByText('OS')).toBeInTheDocument()
  })

  it('renders exactly 5 top-level items for a CRM-only user', () => {
    const items = buildSidebar(['crm'], 'user')
    render(<SidebarClient items={items} />)
    // buildSidebar is the source of truth for count — tests there cover the full logic
    expect(items).toHaveLength(5)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Content Studio')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Insights')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does NOT render Operations for a CRM-only user', () => {
    const items = buildSidebar(['crm'], 'user')
    render(<SidebarClient items={items} />)
    expect(screen.queryByText('Operations')).not.toBeInTheDocument()
  })

  it('does NOT render Admin section for a regular user', () => {
    const items = buildSidebar(['crm'], 'user')
    render(<SidebarClient items={items} />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('renders Operations for a user with accommodation module', () => {
    const items = buildSidebar(['accommodation'], 'user')
    render(<SidebarClient items={items} />)
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })

  it('renders Admin section for an admin role', () => {
    const items = buildSidebar([], 'admin')
    render(<SidebarClient items={items} />)
    // 'Admin' appears as the link label AND as the badge text
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
  })

  it('marks Dashboard as active when pathname is /dashboard', () => {
    pathnameMock.mockReturnValue('/dashboard')
    const items = buildSidebar([], 'user')
    render(<SidebarClient items={items} />)
    const dashLink = screen.getByText('Dashboard').closest('a')
    expect(dashLink).toHaveAttribute('aria-current', 'page')
  })

  it('does NOT mark Dashboard active when on a sub-route like /crm', () => {
    pathnameMock.mockReturnValue('/crm')
    const items = buildSidebar(['crm'], 'user')
    render(<SidebarClient items={items} />)
    const dashLink = screen.getByText('Dashboard').closest('a')
    expect(dashLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('renders org name in footer when provided', () => {
    const items = buildSidebar([], 'user')
    render(<SidebarClient items={items} orgName="Acme Corp" />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })
})
