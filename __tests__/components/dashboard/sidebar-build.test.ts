import { describe, it, expect } from 'vitest'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'

describe('buildSidebar', () => {
  it('starter org with crm-only modules + user role returns 5 items (no verticals, no Admin)', () => {
    const items = buildSidebar(['crm'], 'user')
    expect(items).toHaveLength(5)
    const ids = items.map((i) => i.id)
    expect(ids).toContain('dashboard')
    expect(ids).toContain('content-studio')
    expect(ids).toContain('customers')
    expect(ids).toContain('insights')
    expect(ids).toContain('settings')
    expect(ids).not.toContain('accommodation')
    expect(ids).not.toContain('restaurant')
    expect(ids).not.toContain('elijah')
    expect(ids).not.toContain('admin')
  })

  it('pro org with crm + accommodation + restaurant + role=admin gets verticals as separate top-level items + Admin', () => {
    const items = buildSidebar(['crm', 'accommodation', 'restaurant'], 'admin')
    // Dashboard, Content Studio, Customers, Accommodation, Restaurant, Insights, Settings, Admin
    expect(items).toHaveLength(8)
    const ids = items.map((i) => i.id)
    expect(ids).toContain('accommodation')
    expect(ids).toContain('restaurant')
    expect(ids).toContain('admin')
    expect(ids).not.toContain('operations')

    const accommodation = items.find((i) => i.id === 'accommodation')!
    expect(accommodation.href).toBe('/accommodation')
    expect(accommodation.tabs!.some((t) => t.label === 'Bookings')).toBe(true)

    const restaurant = items.find((i) => i.id === 'restaurant')!
    expect(restaurant.href).toBe('/restaurant')
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

  it('empty active modules returns 5 items (no verticals)', () => {
    const items = buildSidebar([], 'user')
    expect(items).toHaveLength(5)
    const ids = items.map((i) => i.id)
    expect(ids).not.toContain('accommodation')
    expect(ids).not.toContain('restaurant')
    expect(ids).not.toContain('elijah')
    expect(ids).not.toContain('admin')
  })

  it('elijah module activates Security as a top-level item', () => {
    const items = buildSidebar(['elijah'], 'user')
    const security = items.find((i) => i.id === 'elijah')
    expect(security).toBeDefined()
    expect(security!.label).toBe('Security')
    expect(security!.href).toBe('/elijah')
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

  it('verticals appear before Insights and Settings in the order', () => {
    const items = buildSidebar(['crm', 'accommodation', 'restaurant', 'elijah'], 'user')
    const ids = items.map((i) => i.id)
    const insightsIdx = ids.indexOf('insights')
    const accommodationIdx = ids.indexOf('accommodation')
    const restaurantIdx = ids.indexOf('restaurant')
    const elijahIdx = ids.indexOf('elijah')
    expect(accommodationIdx).toBeLessThan(insightsIdx)
    expect(restaurantIdx).toBeLessThan(insightsIdx)
    expect(elijahIdx).toBeLessThan(insightsIdx)
  })

  it('content-studio tabs link to existing routes (not 404 placeholders)', () => {
    const items = buildSidebar(['crm'], 'user')
    const contentStudio = items.find((i) => i.id === 'content-studio')!
    const hrefs = contentStudio.tabs!.map((t) => t.href)
    expect(hrefs).toContain('/content-generator')
    expect(hrefs).toContain('/email')
    expect(hrefs).toContain('/campaigns')
  })

  it('customers tabs link to existing /crm sub-routes', () => {
    const items = buildSidebar(['crm'], 'user')
    const customers = items.find((i) => i.id === 'customers')!
    const hrefs = customers.tabs!.map((t) => t.href)
    expect(hrefs).toContain('/crm')
    expect(hrefs).toContain('/crm/advanced')
    expect(hrefs).toContain('/crm/scoring')
  })
})
