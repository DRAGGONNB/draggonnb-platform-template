import { describe, it, expect } from 'vitest'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'

describe('buildSidebar', () => {
  it('starter org with crm-only modules + user role returns 5 items (no Operations, no Admin)', () => {
    const items = buildSidebar(['crm'], 'user')
    expect(items).toHaveLength(5)
    const ids = items.map((i) => i.id)
    expect(ids).toContain('dashboard')
    expect(ids).toContain('content-studio')
    expect(ids).toContain('customers')
    expect(ids).toContain('insights')
    expect(ids).toContain('settings')
    expect(ids).not.toContain('operations')
    expect(ids).not.toContain('admin')
  })

  it('pro org with crm + accommodation + restaurant + role=admin returns 7 items including Operations with 2 vertical tabs + Admin', () => {
    const items = buildSidebar(['crm', 'accommodation', 'restaurant'], 'admin')
    expect(items).toHaveLength(7)
    const ids = items.map((i) => i.id)
    expect(ids).toContain('operations')
    expect(ids).toContain('admin')

    const ops = items.find((i) => i.id === 'operations')!
    expect(ops.tabs).toHaveLength(2)
    const tabHrefs = ops.tabs!.map((t) => t.href)
    expect(tabHrefs).toContain('/operations/accommodation')
    expect(tabHrefs).toContain('/operations/restaurant')
  })

  it('platform_admin role shows Admin section with all 4 admin tabs', () => {
    const items = buildSidebar([], 'platform_admin')
    const admin = items.find((i) => i.id === 'admin')
    expect(admin).toBeDefined()
    expect(admin!.tabs).toHaveLength(4)
    const tabLabels = admin!.tabs!.map((t) => t.label)
    expect(tabLabels).toContain('Clients')
    expect(tabLabels).toContain('Modules')
    expect(tabLabels).toContain('Pricing Matrix')
    expect(tabLabels).toContain('Cost Monitoring')
  })

  it('empty active modules returns 5 items (no Operations)', () => {
    const items = buildSidebar([], 'user')
    expect(items).toHaveLength(5)
    const ids = items.map((i) => i.id)
    expect(ids).not.toContain('operations')
    expect(ids).not.toContain('admin')
  })

  it('elijah module activates Security in Operations tab', () => {
    const items = buildSidebar(['elijah'], 'user')
    const ops = items.find((i) => i.id === 'operations')
    expect(ops).toBeDefined()
    expect(ops!.tabs!.some((t) => t.label === 'Security')).toBe(true)
  })

  it('every item has id, label, href, and icon fields', () => {
    const items = buildSidebar(['crm', 'accommodation'], 'admin')
    for (const item of items) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.href).toBeTruthy()
      expect(item.icon).toBeTruthy()
    }
  })

  it('dashboard href is exactly /dashboard, not a prefix match trap', () => {
    const items = buildSidebar([], 'user')
    const dash = items.find((i) => i.id === 'dashboard')!
    expect(dash.href).toBe('/dashboard')
  })
})
