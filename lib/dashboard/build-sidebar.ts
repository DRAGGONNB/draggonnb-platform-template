/**
 * Pure sidebar tree builder.
 * Takes already-fetched module IDs and user role — NO Supabase calls.
 * Keeps this file testable without any Next.js / Supabase dependencies.
 */

export interface SidebarTab {
  label: string
  href: string
}

export interface SidebarItem {
  id: string
  label: string
  href: string
  icon: string // lucide-react icon name
  tabs?: SidebarTab[] // surfaced in flyout + in-page Tabs
  badge?: { text: string; tone: 'new' | 'beta' | 'admin' }
  visibleFor?: 'all' | 'platform_admin'
}

/**
 * Build the structured sidebar tree for the given org's active modules and user role.
 *
 * Order contract:
 *   Dashboard → Content Studio → Customers → Operations (if verticals activated)
 *   → Insights → Settings → [Admin if admin/platform_admin]
 *
 * 6 items max (7 with Admin).
 */
export function buildSidebar(activeModules: string[], role: string): SidebarItem[] {
  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
    },
    {
      id: 'content-studio',
      label: 'Content Studio',
      href: '/content-studio',
      icon: 'Sparkles',
      tabs: [
        { label: 'Generator', href: '/content-generator' },
        { label: 'Social', href: '/content-generator/social' },
        { label: 'Email Hub', href: '/email' },
        { label: 'Email Campaigns', href: '/email/campaigns' },
        { label: 'Sequences', href: '/email/sequences' },
        { label: 'Outreach', href: '/email/outreach' },
        { label: 'Multi-channel Campaigns', href: '/campaigns' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      href: '/customers',
      icon: 'Users',
      tabs: [
        { label: 'CRM Easy', href: '/crm' },
        { label: 'Advanced Kanban', href: '/crm/advanced' },
        { label: 'Lead Scoring', href: '/crm/scoring' },
        { label: 'Contacts', href: '/crm/contacts' },
        { label: 'Deals', href: '/crm/deals' },
        { label: 'Companies', href: '/crm/companies' },
      ],
    },
  ]

  // Operations — only render if at least one vertical is activated.
  // Per CONTEXT decision: verticals get their own top-level entries; the
  // Operations wrapper was rejected. Each vertical becomes its own item.
  if (activeModules.includes('accommodation')) {
    items.push({
      id: 'accommodation',
      label: 'Accommodation',
      href: '/accommodation',
      icon: 'Hotel',
      tabs: [
        { label: 'Overview', href: '/accommodation' },
        { label: 'Bookings', href: '/accommodation/bookings' },
        { label: 'Calendar', href: '/accommodation/calendar' },
        { label: 'Properties', href: '/accommodation/properties' },
        { label: 'Inquiries', href: '/accommodation/inquiries' },
        { label: 'Guests', href: '/accommodation/guests' },
        { label: 'Operations', href: '/accommodation/operations' },
        { label: 'Channels', href: '/accommodation/channels' },
        { label: 'Stock', href: '/accommodation/stock' },
        { label: 'Costs', href: '/accommodation/costs' },
        { label: 'Automation', href: '/accommodation/automation' },
      ],
    })
  }
  if (activeModules.includes('restaurant')) {
    items.push({
      id: 'restaurant',
      label: 'Restaurant',
      href: '/restaurant',
      icon: 'UtensilsCrossed',
      tabs: [
        { label: 'Overview', href: '/restaurant' },
        { label: 'Menu', href: '/restaurant/menu' },
        { label: 'Tables', href: '/restaurant/tables' },
        { label: 'Reservations', href: '/restaurant/reservations' },
        { label: 'SOPs', href: '/restaurant/sops' },
        { label: 'Compliance', href: '/restaurant/compliance/temps' },
      ],
    })
  }
  if (activeModules.includes('elijah') || activeModules.includes('security_ops')) {
    items.push({
      id: 'elijah',
      label: 'Security',
      href: '/elijah',
      icon: 'Shield',
      tabs: [
        { label: 'Overview', href: '/elijah' },
        { label: 'Members', href: '/elijah/members' },
        { label: 'Patrols', href: '/elijah/patrols' },
        { label: 'Incidents', href: '/elijah/incidents' },
        { label: 'Roll Call', href: '/elijah/rollcall' },
        { label: 'Fire', href: '/elijah/fire' },
        { label: 'SOPs', href: '/elijah/sops' },
      ],
    })
  }

  items.push(
    {
      id: 'insights',
      label: 'Insights',
      href: '/insights',
      icon: 'TrendingUp',
      tabs: [
        { label: 'Overview', href: '/insights' },
        { label: 'Email Analytics', href: '/email/analytics' },
        { label: 'Cost Monitoring', href: '/admin/cost-monitoring' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: 'Settings',
      tabs: [
        { label: 'Overview', href: '/settings' },
        { label: 'Brand Voice', href: '/settings/brand-voice' },
        { label: 'Social Accounts', href: '/settings/social' },
        { label: 'Billing', href: '/billing' },
      ],
    },
  )

  if (role === 'platform_admin' || role === 'admin') {
    items.push({
      id: 'admin',
      label: 'Admin',
      href: '/admin/clients',
      icon: 'Shield',
      visibleFor: 'platform_admin',
      badge: { text: 'Admin', tone: 'admin' },
      tabs: [
        { label: 'Clients', href: '/admin/clients' },
        { label: 'Modules', href: '/admin/modules' },
        { label: 'Pricing Matrix', href: '/admin/pricing' },
        { label: 'Cost Monitoring', href: '/admin/cost-monitoring' },
      ],
    })
  }

  return items
}
