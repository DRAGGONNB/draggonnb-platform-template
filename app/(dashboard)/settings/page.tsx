/**
 * Settings overview — minimal hero + quick-links to existing settings
 * surfaces. Plan 12-06: Dynamic sidebar shell.
 */

import Link from 'next/link'
import {
  Settings as SettingsIcon,
  Mic,
  Share2,
  CreditCard,
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
    href: '/settings/brand-voice',
    title: 'Brand Voice',
    description: 'Tone, style, and audience guardrails for AI-generated content.',
    icon: Mic,
  },
  {
    href: '/settings/social',
    title: 'Social Accounts',
    description: 'Connect and manage your linked social media accounts.',
    icon: Share2,
  },
  {
    href: '/billing',
    title: 'Billing & Plan',
    description: 'Subscription, invoices, credit packs, and usage.',
    icon: CreditCard,
  },
]

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
            <SettingsIcon size={20} />
          </span>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="max-w-2xl text-base text-gray-600">
          Workspace, billing, and integration settings. Pick a section below to manage.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-all hover:border-gray-400 hover:shadow-md">
                <CardHeader className="space-y-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 group-hover:bg-gray-200">
                    <Icon size={18} />
                  </span>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRight
                      size={16}
                      className="text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-gray-700"
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
