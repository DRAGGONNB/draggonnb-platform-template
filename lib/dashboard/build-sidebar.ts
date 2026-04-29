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
        { label: 'Social', href: '/content-studio/social' },
        { label: 'Email Campaigns', href: '/content-studio/email-campaigns' },
        { label: 'Sequences', href: '/content-studio/sequences' },
        { label: 'Outreach', href: '/content-studio/outreach' },
        { label: 'Drafts', href: '/content-studio/drafts' },
        { label: 'Analytics', href: '/content-studio/analytics' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      href: '/customers',
      icon: 'Users',
      tabs: [
        { label: 'CRM Easy', href: '/customers' },
        { label: 'Advanced Kanban', href: '/customers/advanced' },
        { label: 'Lead Scoring', href: '/customers/scoring' },
        { label: 'Drafts', href: '/customers/drafts' },
      ],
    },
  ]

  // Operations — only render if at least one vertical is activated
  const verticalTabs: SidebarTab[] = []
  if (activeModules.includes('accommodation')) {
    verticalTabs.push({ label: 'Accommodation', href: '/operations/accommodation' })
  }
  if (activeModules.includes('restaurant')) {
    verticalTabs.push({ label: 'Restaurant', href: '/operations/restaurant' })
  }
  if (activeModules.includes('elijah') || activeModules.includes('security_ops')) {
    verticalTabs.push({ label: 'Security', href: '/operations/security' })
  }

  if (verticalTabs.length > 0) {
    items.push({
      id: 'operations',
      label: 'Operations',
      href: verticalTabs[0].href,
      icon: 'Briefcase',
      tabs: verticalTabs,
    })
  }

  items.push(
    {
      id: 'insights',
      label: 'Insights',
      href: '/insights',
      icon: 'TrendingUp',
      tabs: [
        { label: 'Analytics', href: '/insights' },
        { label: 'Reports', href: '/insights/reports' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: 'Settings',
      tabs: [
        { label: 'Account', href: '/settings/account' },
        { label: 'Brand Voice', href: '/settings/brand-voice' },
        { label: 'Team', href: '/settings/team' },
        { label: 'Integrations', href: '/settings/integrations' },
        { label: 'Billing', href: '/settings/billing' },
        { label: 'Social Accounts', href: '/settings/social' },
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
