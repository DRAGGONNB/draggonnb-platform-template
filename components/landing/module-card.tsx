'use client'

import Link from 'next/link'
import { ArrowRight, Hotel, UtensilsCrossed, Crosshair, Shield, Users, Sparkles } from 'lucide-react'
import type { ModuleCardContent } from '@/lib/landing/module-content'

const ICON_MAP = {
  Hotel,
  UtensilsCrossed,
  Crosshair,
  Shield,
  Users,
  Sparkles,
} as const

const TONE_MAP: Record<ModuleCardContent['tone'], { iconBg: string; iconText: string; ring: string }> = {
  crimson: { iconBg: 'bg-[#6B1420]/10', iconText: 'text-[#6B1420]', ring: 'hover:border-[#6B1420]/40' },
  charcoal: { iconBg: 'bg-[#363940]/10', iconText: 'text-[#363940]', ring: 'hover:border-[#363940]/40' },
  amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-600', ring: 'hover:border-amber-500/40' },
  blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-600', ring: 'hover:border-blue-500/40' },
  pink: { iconBg: 'bg-pink-500/10', iconText: 'text-pink-600', ring: 'hover:border-pink-500/40' },
  emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600', ring: 'hover:border-emerald-500/40' },
}

export function ModuleCard({ card }: { card: ModuleCardContent }) {
  const Icon = ICON_MAP[card.icon as keyof typeof ICON_MAP] ?? Sparkles
  const tone = TONE_MAP[card.tone]
  const linkProps = card.external
    ? { href: card.learnMoreHref, target: '_blank' as const, rel: 'noopener noreferrer' as const }
    : { href: card.learnMoreHref }

  return (
    <Link
      {...linkProps}
      data-module-card={card.id}
      className={`group relative flex h-full flex-col rounded-2xl border border-[#C0C1C4]/50 bg-white p-6 shadow-md transition-all hover:shadow-lg ${tone.ring}`}
    >
      <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${tone.iconBg}`}>
        <Icon className={`h-6 w-6 ${tone.iconText}`} aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#363940]">{card.title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[#A8A9AD]">{card.valueProp}</p>
      <ul className="mb-6 flex-1 space-y-2 text-sm text-[#363940]">
        {card.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.iconBg.replace('/10', '')}`} aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <span className={`inline-flex items-center text-sm font-semibold ${tone.iconText} underline-offset-4 group-hover:underline`}>
        Learn more
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}
