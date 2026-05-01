'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Mail,
  Share2,
  BarChart3,
  Check,
  ArrowRight,
  ClipboardCheck,
  Settings2,
  TrendingUp,
  Zap,
  Clock,
  Send,
  Calendar,
  Wallet,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleGrid } from './module-grid'

/* ------------------------------------------------------------------ */
/*  Hero — re-export from dedicated file (SITE-01)                     */
/* ------------------------------------------------------------------ */
// Hero now lives in components/landing/hero-section.tsx as part of the
// v3.0 outcome-led redesign. Re-exported here to keep existing imports
// from app/page.tsx + tests working without churn.
export { HeroSection } from './hero-section'

/* ------------------------------------------------------------------ */
/*  Trust Indicators (SITE-05, Pitfall F)                              */
/* ------------------------------------------------------------------ */

/**
 * v3.0 trust trio. Replaces the prior strip that falsely advertised
 * "14-day free trial" and "No credit card required" (Pitfall F).
 *
 * Three cards:
 *  1. 3 business days to go live (the operational promise)
 *  2. Pay in Rands (PayFast / SA business positioning)
 *  3. Cancel anytime (no lock-in)
 *
 * The literal strings "3 business days to go live", "Pay in Rands",
 * "Cancel anytime" must appear here for 10-06 acceptance grep.
 */
export function TrustIndicators() {
  const items = [
    {
      icon: Calendar,
      title: '3 business days to go live',
      body: 'From signup to running on autopilot. No 6-week onboardings.',
    },
    {
      icon: Wallet,
      title: 'Pay in Rands',
      body: 'PayFast subscriptions, VAT-inclusive billing, no FX surprises.',
    },
    {
      icon: Ban,
      title: 'Cancel anytime',
      body: 'No lock-in. Add or remove modules monthly.',
    },
  ]

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <div
              key={it.title}
              className="rounded-2xl border border-[#363940]/10 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6B1420]/10">
                <Icon className="h-6 w-6 text-[#6B1420]" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-[#363940]">
                {it.title}
              </h3>
              <p className="text-sm text-gray-600">{it.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Module Showcase — module-focused 5+1 grid (12-08)                  */
/* ------------------------------------------------------------------ */

export function ModuleShowcaseSection() {
  return <ModuleGrid />
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: ClipboardCheck,
    number: '01',
    title: 'Qualify and Sign Up',
    description:
      'Tell us about your business, your industry, and your biggest challenges. Our qualification process ensures we match you with the right modules and tier.',
  },
  {
    icon: Settings2,
    number: '02',
    title: 'We Configure Your Platform',
    description:
      'Your platform is provisioned automatically: isolated database, custom configuration, activated modules, and AI agents ready to work. Live in 3 business days.',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Start Growing',
    description:
      'Import your contacts, launch your first campaign, and let AI agents handle the rest. Ongoing support and module upgrades as your business scales.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#F5F5F6] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B1420]">
            How It Works
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-[#363940] lg:text-4xl">
            Three Steps to a{' '}
            <span className="gradient-text-brand">Smarter Business</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#A8A9AD]">
            From sign-up to fully operational in 3 business days.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative text-center">
                {/* Connector line between steps */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 md:block">
                    <div className="h-px w-full bg-gradient-to-r from-[#C0C1C4] to-transparent" />
                  </div>
                )}

                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-[#6B1420]/10 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#C0C1C4]/50 bg-white shadow-sm">
                    <Icon className="h-8 w-8 text-[#6B1420]" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#6B1420] text-xs font-bold text-white shadow-lg">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-semibold text-[#363940]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#A8A9AD]">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof / Stats                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: 2400, suffix: '+', label: 'Automation Hours Saved', icon: Clock },
  { value: 340, suffix: '%', label: 'Average Client Growth', icon: TrendingUp },
  { value: 150, suffix: 'K+', label: 'Emails Sent', icon: Send },
  { value: 3, suffix: ' days', label: 'Go-Live Time', icon: Zap },
]

function AnimatedCounter({
  target,
  suffix,
  duration = 2000,
}: {
  target: number
  suffix: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const startTime = performance.now()
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [target, duration, hasAnimated])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export function SocialProofSection() {
  return (
    <section className="bg-[#363940] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B1420]">
            Results That Matter
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-white lg:text-4xl">
            Built to Deliver{' '}
            <span className="gradient-text-brand">Real Impact</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#A8A9AD]">
            Our platform helps South African businesses automate operations and focus on growth.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition-all hover-lift hover-glow-brand"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6B1420]/15">
                  <Icon className="h-6 w-6 text-[#6B1420]" />
                </div>
                <p className="mb-1 text-3xl font-bold text-white sm:text-4xl">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-[#A8A9AD]">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing Preview                                                    */
/* ------------------------------------------------------------------ */

const tiers = [
  {
    id: 'core',
    name: 'Core',
    price: 'R599',
    description: 'CRM, email and social. Built for SA SMEs in Rands.',
    highlights: [
      'CRM with deals pipeline',
      'Email campaigns and sequences',
      'Social posting and scheduling',
      '50 AI content generations/mo',
      '2 users included',
    ],
    popular: false,
  },
  {
    id: 'vertical',
    name: 'Vertical',
    price: 'R1,199',
    description: 'Core + your industry pack (Accommodation or Restaurant).',
    highlights: [
      'Everything in Core, plus:',
      'Accommodation or Restaurant module',
      'Vertical AI agents (quoting, concierge, ops)',
      'Booking + payment automation',
      '5 users included',
    ],
    popular: true,
  },
  {
    id: 'addons',
    name: 'Add modules',
    price: 'R299+',
    description: 'Stack white-label, finance-AI, events on top of any plan.',
    highlights: [
      'Add to Core or Vertical',
      'Events module',
      'Finance-AI module',
      'White-label branding',
      'Top-up packs for content / posts / emails',
    ],
    popular: false,
  },
]

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="bg-[#F5F5F6] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B1420]">
            Pricing
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-[#363940] lg:text-4xl">
            Modular pricing,{' '}
            <span className="gradient-text-brand">all in Rands</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#A8A9AD]">
            Pick a plan, stack modules, see the live total. Live in 3 business days.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all hover-lift ${
                tier.popular
                  ? 'border-[#6B1420] bg-white shadow-lg shadow-[#6B1420]/10 ring-2 ring-[#6B1420]'
                  : 'border-[#C0C1C4]/50 bg-white shadow-md'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-[#6B1420] px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-[#6B1420]/25">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="mb-1 text-xl font-semibold text-[#363940]">{tier.name}</h3>
              <p className="mb-5 text-sm text-[#A8A9AD]">{tier.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-[#363940]">{tier.price}</span>
                <span className="ml-1 text-[#A8A9AD]">/month</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#A8A9AD]">
                    <Check className="h-4 w-4 shrink-0 text-[#6B1420]" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={tier.popular ? 'default' : 'outline'}
                size="lg"
                className={`w-full rounded-xl ${
                  tier.popular
                    ? 'btn-brand'
                    : 'border-[#C0C1C4] bg-transparent text-[#363940] hover:bg-[#F5F5F6] hover:text-[#363940]'
                }`}
              >
                <Link href="/pricing">See on pricing page</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-[#A8A9AD]">
          Use the live module picker on the{' '}
          <Link href="/pricing" className="text-[#6B1420] underline-offset-4 hover:underline">
            pricing page
          </Link>{' '}
          to build your plan and see VAT-inclusive totals.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#6B1420] to-[#4A0E16] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-[100px]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-5 font-display text-3xl font-bold text-white lg:text-5xl">
          Ready to Automate{' '}
          <span className="text-brand-gold-300">Your Growth?</span>
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-white/80">
          Join South African businesses that use DraggonnB to manage clients,
          automate marketing, and grow revenue.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-13 rounded-xl bg-white px-10 text-base font-semibold text-[#6B1420] hover:bg-white/90">
            <Link href="/signup">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-13 rounded-xl border-white/30 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-brand-gold-300" />
            3 business days to go live
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-brand-gold-300" />
            Pay in Rands
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-brand-gold-300" />
            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  )
}
