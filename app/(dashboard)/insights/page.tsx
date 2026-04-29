/**
 * Insights overview — minimal hero + quick-links to existing analytics
 * surfaces. Plan 12-07 may evolve this; for now it's a stub so the new
 * sidebar item doesn't 404.
 *
 * Plan 12-06: Dynamic sidebar shell.
 */

import Link from 'next/link'
import {
  TrendingUp,
  Mail,
  DollarSign,
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
    href: '/email/analytics',
    title: 'Email Analytics',
    description: 'Open rates, click rates, replies — across every email send.',
    icon: Mail,
  },
  {
    href: '/admin/cost-monitoring',
    title: 'Cost Monitoring',
    description: 'AI usage and spend by org, day, and agent — admin only.',
    icon: DollarSign,
  },
]

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <TrendingUp size={20} />
          </span>
          <h1 className="text-3xl font-bold text-gray-900">Insights</h1>
        </div>
        <p className="max-w-2xl text-base text-gray-600">
          Performance reporting across your modules — email engagement, AI
          spend, and more dashboards landing in upcoming releases.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-all hover:border-blue-300 hover:shadow-md">
                <CardHeader className="space-y-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100">
                    <Icon size={18} />
                  </span>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRight
                      size={16}
                      className="text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700"
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

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <p className="text-sm text-blue-900">
          <strong>Coming soon:</strong> CRM activity reports, accommodation
          revenue tracking, social engagement summaries.
        </p>
      </section>
    </div>
  )
}
