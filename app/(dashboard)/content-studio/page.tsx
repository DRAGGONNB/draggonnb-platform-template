/**
 * Content Studio overview — minimal hero + quick-links to existing module
 * surfaces. Plan 12-07 (smart-landing) replaces this with a real action-first
 * landing experience; this stub exists so the new sidebar item doesn't 404.
 *
 * Plan 12-06: Dynamic sidebar shell.
 */

import Link from 'next/link'
import {
  Sparkles,
  Mail,
  Send,
  Megaphone,
  Share2,
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
    href: '/content-generator',
    title: 'Content Generator',
    description: 'AI-powered post + caption drafting for social and email.',
    icon: Sparkles,
  },
  {
    href: '/content-generator/social',
    title: 'Social Studio',
    description: 'Craft and schedule social posts across your channels.',
    icon: Share2,
  },
  {
    href: '/email',
    title: 'Email Hub',
    description: 'Templates, sequences, outreach and one-off campaigns.',
    icon: Mail,
  },
  {
    href: '/email/campaigns',
    title: 'Email Campaigns',
    description: 'Single-send broadcasts to your audience.',
    icon: Send,
  },
  {
    href: '/email/sequences',
    title: 'Email Sequences',
    description: 'Multi-step nurture flows with delays and triggers.',
    icon: Mail,
  },
  {
    href: '/campaigns',
    title: 'Multi-channel Campaigns',
    description: 'Coordinate email + SMS + social drafts with brand-safety review.',
    icon: Megaphone,
  },
]

export default function ContentStudioPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Sparkles size={20} />
          </span>
          <h1 className="text-3xl font-bold text-gray-900">Content Studio</h1>
        </div>
        <p className="max-w-2xl text-base text-gray-600">
          Everything for creating, scheduling, and tracking content — across email,
          social, and multi-channel campaigns. Pick a tool below to get going.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-all hover:border-amber-300 hover:shadow-md">
                <CardHeader className="space-y-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-100">
                    <Icon size={18} />
                  </span>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRight
                      size={16}
                      className="text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-700"
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
