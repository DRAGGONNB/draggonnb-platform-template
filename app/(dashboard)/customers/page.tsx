/**
 * Customers overview — minimal hero + quick-links to existing CRM surfaces.
 * Plan 12-07 (smart-landing) may evolve this; for now it's a stub so the
 * new sidebar item doesn't 404.
 *
 * Plan 12-06: Dynamic sidebar shell.
 */

import Link from 'next/link'
import {
  Users,
  Briefcase,
  Building2,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickLink {
  href: string
  title: string
  description: string
  icon: React.ElementType
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/crm',
    title: 'CRM Easy',
    description: "Today's follow-ups, stale deals, and hot leads — at a glance.",
    icon: Sparkles,
  },
  {
    href: '/crm/advanced',
    title: 'Advanced Kanban',
    description: 'Full pipeline view with drag-and-drop deal stages.',
    icon: Target,
  },
  {
    href: '/crm/contacts',
    title: 'Contacts',
    description: 'Search, filter, and manage every person in your CRM.',
    icon: Users,
  },
  {
    href: '/crm/deals',
    title: 'Deals',
    description: 'Active opportunities, values, and stages.',
    icon: Briefcase,
  },
  {
    href: '/crm/companies',
    title: 'Companies',
    description: 'Account-level view of organizations you sell to.',
    icon: Building2,
  },
  {
    href: '/crm/scoring',
    title: 'Lead Scoring',
    description: 'Engagement-driven scoring and hot-lead surfacing.',
    icon: Target,
  },
]

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Users size={20} />
          </span>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        </div>
        <p className="max-w-2xl text-base text-gray-600">
          Your CRM workspace — contacts, deals, companies, and lead scoring.
          Pick a view below to get going.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-all hover:border-emerald-300 hover:shadow-md">
                <CardHeader className="space-y-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                    <Icon size={18} />
                  </span>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRight
                      size={16}
                      className="text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
