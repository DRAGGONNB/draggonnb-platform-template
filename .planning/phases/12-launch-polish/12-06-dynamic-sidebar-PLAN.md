---
phase: 12
plan_id: 12-06
title: Dynamic sidebar shell (server-rendered, tenant_modules-driven) + ModeToggle primitive
wave: 3
depends_on: [12-01]
files_modified:
  - components/dashboard/Sidebar.tsx
  - components/dashboard/sidebar-server.tsx
  - components/dashboard/sidebar-client.tsx
  - components/dashboard/sidebar-flyout.tsx
  - components/dashboard/sidebar-section.tsx
  - components/ui/mode-toggle.tsx
  - lib/dashboard/build-sidebar.ts
  - app/(dashboard)/layout.tsx
  - __tests__/components/dashboard/sidebar-build.test.ts
  - __tests__/components/ui/mode-toggle.test.tsx
autonomous: false
estimated_loc: 550
estimated_dev_minutes: 240
---

## Objective

Replace the hardcoded 9-section / 54-item sidebar with a server-rendered sidebar built from `tenant_modules` + `module_registry` for the active org. Order: Dashboard → Content Studio → Customers → Operations (only activated verticals) → Insights → Settings → [Admin if platform_admin]. Each top-level becomes one route. Sub-features are reached via shadcn `Tabs` inside the page (Wave 3 plan 12-07/12-08 build the actual tab content).

Also extract the Easy↔Advanced toggle pattern from Phase 11 into a reusable `<ModeToggle>` primitive labelled "Autopilot ⇄ Hands-on" — the 5 instances of mode-toggle code across the platform should consume the same component.

A hover-flyout panel surfaces sub-feature shortcuts for power users (per `docs/redesign/full-experience-mockup.html` scene 5) — non-blocking enhancement layered on the top-level icons.

Includes the human-verification checkpoint at the end since visual UX is core to acceptance.

## must_haves

**Truths:**
- A logged-in user as `tester-starter@draggonnb.test` (CRM-only) sees Dashboard, Content Studio, Customers, Insights, Settings — no Operations, no Admin (only modules they have appear).
- A logged-in user as `tester-pro@draggonnb.test` (multi-module) sees Operations with sub-tabs scoped to their activated modules (e.g. Accommodation only if `tenant_modules.module_id = 'accommodation'` for their org).
- A logged-in user as `tester-admin@draggonnb.test` (platform_admin) sees Admin section in addition.
- Sidebar count: 6 top-level items (or 7 with Admin) — verified by counting rendered links.
- Active state highlights the section containing the current pathname (works on sub-routes — same rule as 12-01 hotfix A6, retained).
- A `<ModeToggle>` component exists at `components/ui/mode-toggle.tsx` with props `{ value: 'autopilot' | 'hands-on', onChange, ariaLabel? }`. Phase 11 Easy/Advanced toggle is refactored to use it.
- Hovering a top-level item with sub-tabs shows a flyout panel listing the tabs (keyboard accessible — `aria-haspopup`, focus-visible).

**Artifacts:**
- `components/dashboard/sidebar-server.tsx` — server component that fetches `tenant_modules` + `module_registry` + user role, passes to client.
- `components/dashboard/sidebar-client.tsx` — client component that renders the static structure + manages active-state + flyout state.
- `components/dashboard/sidebar-flyout.tsx` — small client component for hover/focus flyout.
- `components/dashboard/sidebar-section.tsx` — single section item (icon + label + optional flyout trigger).
- `lib/dashboard/build-sidebar.ts` — pure function `buildSidebar(modules, role)` that returns the structured sidebar tree. Pure = unit-testable.
- `components/ui/mode-toggle.tsx` — reusable Autopilot/Hands-on toggle. Phase 11 mode-toggle refactor.
- Old `components/dashboard/Sidebar.tsx` — legacy hardcoded array DELETED. Replaced with re-export of the new server component for backward compatibility.

**Key links:**
- Server component must read tenant context via `headers()` (`x-tenant-id` injected by middleware) — NOT via cookies / a fresh auth call. Pattern matches Phase 10 `getUserOrg`.
- `buildSidebar` must NOT call Supabase directly — takes already-fetched modules + role as args. Keeps it testable.
- Flyout interaction must NOT block keyboard navigation. Tab through items → flyout shows on focus, hides on blur.
- `<ModeToggle>` must persist state via parent (controlled component). Persistence to `user_profiles.ui_mode` is the parent's responsibility (Phase 11 already does this for CRM).

## Tasks

<task id="1">
  <title>Build sidebar tree builder + server component</title>
  <files>
    lib/dashboard/build-sidebar.ts
    components/dashboard/sidebar-server.tsx
    __tests__/components/dashboard/sidebar-build.test.ts
  </files>
  <actions>
    1. `lib/dashboard/build-sidebar.ts`:
       ```typescript
       export interface SidebarItem {
         id: string
         label: string
         href: string
         icon: string  // lucide icon name
         tabs?: { label: string; href: string }[]  // surface in flyout + in-page Tabs
         badge?: { text: string; tone: 'new' | 'beta' | 'admin' }
         visibleFor?: 'all' | 'platform_admin'
       }

       export function buildSidebar(activeModules: string[], role: string): SidebarItem[] {
         const items: SidebarItem[] = [
           { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'Home' },
           { id: 'content-studio', label: 'Content Studio', href: '/content-studio', icon: 'Sparkles',
             tabs: [
               { label: 'Social', href: '/content-studio/social' },
               { label: 'Email Campaigns', href: '/content-studio/email-campaigns' },
               { label: 'Sequences', href: '/content-studio/sequences' },
               { label: 'Outreach', href: '/content-studio/outreach' },
               { label: 'Drafts', href: '/content-studio/drafts' },
               { label: 'Analytics', href: '/content-studio/analytics' },
             ],
           },
           { id: 'customers', label: 'Customers', href: '/customers', icon: 'Users',
             tabs: [
               { label: 'CRM Easy', href: '/customers' },
               { label: 'Advanced kanban', href: '/customers/advanced' },
               { label: 'Lead Scoring', href: '/customers/scoring' },
               { label: 'Drafts', href: '/customers/drafts' },
             ],
           },
         ]

         // Operations tab — only render if at least one vertical is activated
         const verticalTabs: { label: string; href: string }[] = []
         if (activeModules.includes('accommodation')) verticalTabs.push({ label: 'Accommodation', href: '/operations/accommodation' })
         if (activeModules.includes('restaurant')) verticalTabs.push({ label: 'Restaurant', href: '/operations/restaurant' })
         if (activeModules.includes('elijah')) verticalTabs.push({ label: 'Security', href: '/operations/elijah' })
         if (verticalTabs.length > 0) {
           items.push({ id: 'operations', label: 'Operations', href: verticalTabs[0].href, icon: 'Briefcase', tabs: verticalTabs })
         }

         items.push(
           { id: 'insights', label: 'Insights', href: '/insights', icon: 'BarChart',
             tabs: [
               { label: 'Analytics', href: '/insights' },
               { label: 'Reports', href: '/insights/reports' },
             ],
           },
           { id: 'settings', label: 'Settings', href: '/settings', icon: 'Settings',
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
           items.push(
             { id: 'admin', label: 'Admin', href: '/admin/clients', icon: 'Shield', visibleFor: 'platform_admin',
               badge: { text: 'Admin', tone: 'admin' },
               tabs: [
                 { label: 'Clients', href: '/admin/clients' },
                 { label: 'Modules', href: '/admin/modules' },
                 { label: 'Pricing Matrix', href: '/admin/pricing' },
                 { label: 'Cost Monitoring', href: '/admin/cost-monitoring' },
               ],
             },
           )
         }

         return items
       }
       ```
       Note: until 12-07/12-08 land, `/content-studio`, `/customers`, `/operations`, `/insights` page routes don't yet exist — they will be created in those plans. For now, the sidebar links to NEW URLs; the legacy URLs (`/crm`, `/email`, `/social`, `/accommodation`, etc.) keep working — Wave 3 redesign is additive, not destructive.

    2. `components/dashboard/sidebar-server.tsx` — RSC:
       ```typescript
       import { headers } from 'next/headers'
       import { createAdminClient } from '@/lib/supabase/admin'
       import { buildSidebar } from '@/lib/dashboard/build-sidebar'
       import { SidebarClient } from './sidebar-client'
       import { getUserOrg } from '@/lib/auth/get-user-org'

       export async function SidebarServer() {
         const { data: userOrg } = await getUserOrg()
         if (!userOrg) return null  // never render sidebar pre-auth

         const supabase = createAdminClient()
         const { data: tenantModules } = await supabase
           .from('tenant_modules')
           .select('module_id, status')
           .eq('organization_id', userOrg.organization.id)
           .eq('status', 'active')

         const activeModules = (tenantModules ?? []).map(r => r.module_id)
         const items = buildSidebar(activeModules, userOrg.role)
         return <SidebarClient items={items} />
       }
       ```

    3. Tests in `__tests__/components/dashboard/sidebar-build.test.ts`:
       - case: starter org with `['crm']` modules + role=user → returns 5 items (Dashboard, Content Studio, Customers, Insights, Settings — no Operations, no Admin).
       - case: pro org with `['crm','accommodation','restaurant']` + role=admin → returns 7 items including Operations with 2 vertical tabs + Admin.
       - case: platform_admin → Admin section appears with all 4 admin tabs.
       - case: empty active modules → 5 items (no Operations).
  </actions>
  <verification>
    - `npm test -- sidebar-build` passes ≥4 cases.
    - `lib/dashboard/build-sidebar.ts` is a pure function (no imports from `@/lib/supabase` or `next/*`).
    - Tree shape verified: each item has id+label+href+icon; Operations conditionally absent.
  </verification>
</task>

<task id="2">
  <title>Build client sidebar + flyout + replace legacy + extract ModeToggle</title>
  <files>
    components/dashboard/sidebar-client.tsx
    components/dashboard/sidebar-section.tsx
    components/dashboard/sidebar-flyout.tsx
    components/dashboard/Sidebar.tsx
    components/ui/mode-toggle.tsx
    app/(dashboard)/layout.tsx
    __tests__/components/ui/mode-toggle.test.tsx
  </files>
  <actions>
    1. `components/dashboard/sidebar-client.tsx`:
       ```typescript
       'use client'
       import { usePathname } from 'next/navigation'
       import Link from 'next/link'
       import { SidebarSection } from './sidebar-section'
       import type { SidebarItem } from '@/lib/dashboard/build-sidebar'

       export function SidebarClient({ items }: { items: SidebarItem[] }) {
         const pathname = usePathname()
         return (
           <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
             <div className="flex h-full flex-col overflow-y-auto py-6">
               {/* logo */}
               <nav className="flex-1 space-y-1 px-3">
                 {items.map(item => {
                   const isActive = item.href === '/dashboard'
                     ? pathname === '/dashboard'
                     : pathname === item.href || pathname.startsWith(item.href + '/')
                   return <SidebarSection key={item.id} item={item} isActive={isActive} />
                 })}
               </nav>
             </div>
           </aside>
         )
       }
       ```

    2. `components/dashboard/sidebar-section.tsx` — renders a single item; if item.tabs exists, attach a hover/focus flyout containing those tabs.

    3. `components/dashboard/sidebar-flyout.tsx` — small panel positioned `absolute left-full top-0`. Visible only when parent section has `:hover` or `:focus-within`. Each tab is a `<Link>`. Flyout has `role="menu"`, items have `role="menuitem"`, and the parent section has `aria-haspopup="menu"`.

    4. Replace `components/dashboard/Sidebar.tsx`:
       - Delete the hardcoded `navigation` array.
       - Replace component body with `export { SidebarServer as Sidebar } from './sidebar-server'`.
       - Keep the same export name so `app/(dashboard)/layout.tsx` doesn't break.
       - If `app/(dashboard)/layout.tsx` imports `Sidebar` and renders it client-side, change the layout to render `<SidebarServer />` (which is a server component) inside the layout.

    5. `app/(dashboard)/layout.tsx`:
       - Confirm the layout is a server component.
       - Replace the `<Sidebar usageStats={...} />` line with `<SidebarServer />`.
       - The old `usageStats` prop pattern is dropped — usage banners are a Phase 10 surface (already separate component); the sidebar usage block was always optional UI. Either drop the usage block entirely from the sidebar (cleaner) or fetch it inside `SidebarServer` from `usage_events` for the active org. Pick "drop"; the dedicated usage banner above the dashboard already covers this.

    6. `components/ui/mode-toggle.tsx`:
       ```typescript
       'use client'
       export interface ModeToggleProps {
         value: 'autopilot' | 'hands-on'
         onChange: (value: 'autopilot' | 'hands-on') => void
         labels?: { autopilot: string; handsOn: string }  // override the defaults
         ariaLabel?: string
       }
       export function ModeToggle({ value, onChange, labels, ariaLabel = 'View mode' }: ModeToggleProps) {
         const a = labels?.autopilot ?? 'Autopilot'
         const h = labels?.handsOn ?? 'Hands-on'
         return (
           <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border bg-white p-1">
             <button role="tab" aria-selected={value === 'autopilot'}
               className={value === 'autopilot' ? 'bg-brand-crimson-500 text-white' : ''}
               onClick={() => onChange('autopilot')}>{a}</button>
             <button role="tab" aria-selected={value === 'hands-on'}
               className={value === 'hands-on' ? 'bg-brand-crimson-500 text-white' : ''}
               onClick={() => onChange('hands-on')}>{h}</button>
           </div>
         )
       }
       ```

    7. Refactor Phase 11 Easy/Advanced toggle to use `<ModeToggle>`. Grep for the existing toggle in `components/crm/` or `app/(dashboard)/crm/`. Replace with `<ModeToggle value={uiMode} onChange={setUiMode} labels={{ autopilot: 'Easy', handsOn: 'Advanced' }} />`. The label override preserves Phase 11's terminology.

    8. Tests in `__tests__/components/ui/mode-toggle.test.tsx`:
       - case: renders 2 buttons with default labels.
       - case: clicking switches calls onChange with the other value.
       - case: aria-selected reflects current value.
       - case: custom labels render.
  </actions>
  <verification>
    - `npm test -- mode-toggle` passes ≥4 tests.
    - `npm run typecheck` clean.
    - `npm run build` clean.
    - Old `Sidebar.tsx` 100+ line hardcoded array is gone — file is now a thin re-export.
    - Manual: log in as 3 test users → see correct items per role/modules.
  </verification>
</task>

<task id="3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Dynamic sidebar (server-rendered from tenant_modules + module_registry), with hover-flyout for sub-tabs, retained pathname.startsWith active state, and the new <ModeToggle> primitive used by Phase 11's Easy/Advanced toggle.</what-built>
  <how-to-verify>
    1. Open the staging Vercel URL on desktop. Log in as `tester-starter@draggonnb.test` (CRM-only). Confirm sidebar shows: Dashboard, Content Studio, Customers, Insights, Settings (5 items). No Operations. No Admin.
    2. Log out. Log in as `tester-pro@draggonnb.test` (CRM + Accommodation + Restaurant + Elijah). Confirm sidebar shows 6 items including Operations.
    3. Hover Operations → flyout appears showing Accommodation / Restaurant / Security tabs. Click Accommodation → lands at `/operations/accommodation` (or whatever URL — page may 404 until plan 12-07 lands; that's fine).
    4. Tab through sidebar with keyboard. Confirm each item is reachable, flyout opens on focus, ESC closes it.
    5. Log in as `tester-admin@draggonnb.test`. Confirm Admin section appears.
    6. Navigate to `/crm/contacts` → CRM-related sidebar item is highlighted (active).
    7. Open `/dashboard/crm` (Phase 11 route) → confirm the Easy/Advanced toggle still works and uses the new `<ModeToggle>` primitive (visual: same button group but unified styling).
    Type "approved" if all 7 checks pass. Otherwise list the failing item.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

## Verification

- `npm run build` clean.
- `npm test` clean.
- Old hardcoded `navigation` array no longer in repo (grep `'Email Hub'` returns 0 hits in components/).
- Sidebar renders correct items for each role/module combo.

## Out of scope

- Building the actual `/content-studio`, `/customers`, `/operations`, `/insights` pages with content. Those are 12-07 (smart-landing dashboard) + 12-08 (module landing redesign) + future. This plan only ships the SHELL — sidebar + ModeToggle.
- Mobile sidebar behavior (hamburger / drawer). Add `lg:fixed` etc to gate desktop-only display; mobile drawer is a follow-on.
- Per-tenant icon customization. Icons come from a fixed Lucide set.

## REQ-IDs closed

None directly. This is the foundational sidebar redesign captured in CONTEXT.md `<sidebar_redesign_brief>`. Phase 12 ROADMAP didn't include this; it's net-new scope per Chris's testing feedback.
