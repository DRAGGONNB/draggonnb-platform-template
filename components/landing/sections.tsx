'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Users,
  Mail,
  Share2,
  Sparkles,
  Building2,
  Bot,
  BarChart3,
  Check,
  ArrowRight,
  ClipboardCheck,
  Settings2,
  TrendingUp,
  Zap,
  Clock,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-48">
      {/* Subtle background blobs */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-crimson-50 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-amber-50 blur-[100px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-crimson-200 bg-brand-crimson-50 px-4 py-1.5 text-sm text-brand-crimson-700">
          <Zap className="h-4 w-4 text-brand-crimson-500" />
          The CRM and Marketing Platform Built for South Africa
        </div>

        <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-brand-charcoal-900 sm:text-5xl lg:text-7xl">
          Automate Your{' '}
          <span className="gradient-text-brand">Business Growth</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
          DraggonnB is the all-in-one CRM, marketing, and automation platform that
          helps South African businesses manage clients, send campaigns, and grow
          revenue -- without the enterprise price tag.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-13 rounded-xl bg-brand-crimson-500 px-8 text-base font-semibold text-white shadow-md hover:bg-brand-crimson-600 hover:shadow-lg">
            <Link href="/qualify">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-13 rounded-xl border-gray-300 px-8 text-base text-gray-700 hover:bg-gray-50"
          >
            <a href="#pricing">See Pricing</a>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            14-day free trial
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Pay in Rands
          </span>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Module Showcase (Services/Features)                                */
/* ------------------------------------------------------------------ */

const modules = [
  {
    icon: Users,
    title: 'CRM & Pipeline',
    description:
      'Manage contacts, companies, and deals in one place. Track every interaction and move leads through your sales pipeline with full visibility.',
    gradient: 'from-brand-crimson-500 to-brand-crimson-700',
  },
  {
    icon: Mail,
    title: 'Email Marketing',
    description:
      'Build campaigns, automate sequences, and track results. Templates, A/B testing, smart segmentation, and deliverability built in.',
    gradient: 'from-brand-crimson-600 to-brand-crimson-800',
  },
  {
    icon: Share2,
    title: 'Social Media',
    description:
      'Schedule posts, monitor engagement, and manage your social presence across platforms from a single dashboard.',
    gradient: 'from-brand-crimson-400 to-brand-crimson-600',
  },
  {
    icon: Sparkles,
    title: 'Content Studio',
    description:
      'Generate professional content with AI for social, email, and web. Autopilot mode creates and schedules weekly content for you.',
    gradient: 'from-amber-500 to-brand-crimson-500',
  },
  {
    icon: Building2,
    title: 'Accommodation',
    description:
      'Purpose-built for lodges, guest houses, and hospitality. Property inventory, guest management, inquiry pipeline, and booking operations.',
    gradient: 'from-brand-crimson-400 to-amber-500',
  },
  {
    icon: Bot,
    title: 'AI Agents',
    description:
      'Intelligent agents that qualify leads, generate proposals, onboard clients, and run daily operations autonomously -- 24/7.',
    gradient: 'from-brand-crimson-500 to-brand-charcoal-500',
  },
]

export function ModuleShowcaseSection() {
  return (
    <section id="modules" className="border-t border-gray-200 bg-gray-50 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-crimson-500">
            The Platform
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 lg:text-4xl">
            Everything You Need to{' '}
            <span className="gradient-text-brand">Run and Grow</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Modular by design. Pick the tools your business needs and add more as you scale.
            Every module is AI-enhanced and built for South African operations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.title}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${mod.gradient} shadow-md`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{mod.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{mod.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
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
      'Your platform is provisioned automatically: isolated database, custom configuration, activated modules, and AI agents ready to work. Live in 72 hours.',
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
    <section id="how-it-works" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-crimson-500">
            How It Works
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 lg:text-4xl">
            Three Steps to a{' '}
            <span className="gradient-text-brand">Smarter Business</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            From sign-up to fully operational in as little as 72 hours.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 md:block">
                    <div className="h-px w-full bg-gradient-to-r from-brand-crimson-300 to-transparent" />
                  </div>
                )}

                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-brand-crimson-50 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <Icon className="h-8 w-8 text-brand-crimson-500" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-crimson-500 text-xs font-bold text-white shadow-md">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.description}</p>
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
  { value: 72, suffix: 'hr', label: 'Go-Live Time', icon: Zap },
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
    <section className="border-y border-gray-200 bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-crimson-500">
            Results That Matter
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 lg:text-4xl">
            Built to Deliver{' '}
            <span className="gradient-text-brand">Real Impact</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Our platform helps South African businesses automate operations and focus on growth.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="group rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-crimson-50">
                  <Icon className="h-6 w-6 text-brand-crimson-500" />
                </div>
                <p className="mb-1 text-3xl font-bold text-gray-900 sm:text-4xl">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-gray-600">{stat.label}</p>
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
    price: 'R1,500',
    description: 'Essential CRM and email for businesses getting started with digital operations.',
    highlights: [
      'CRM with deals pipeline',
      'Email campaigns and sequences',
      '1 business automation',
      '50 AI content generations/mo',
      '2 users included',
    ],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R3,500',
    description: 'Full marketing suite with accommodation module, content studio, and analytics.',
    highlights: [
      'Everything in Core, plus:',
      'Social media management',
      'Content Studio with AI',
      'Accommodation module',
      'A/B testing and analytics',
      '5 users included',
    ],
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'R7,500',
    description: 'White-label platform with AI agents, API access, and unlimited capacity.',
    highlights: [
      'Everything in Growth, plus:',
      'White label (your domain and brand)',
      '3 AI agents (1,000 invocations/mo)',
      'API access and custom integrations',
      'Unlimited users and content',
      'Priority support',
    ],
    popular: false,
  },
]

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-crimson-500">
            Pricing
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 lg:text-4xl">
            Transparent Pricing,{' '}
            <span className="gradient-text-brand">Powerful Platform</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            All plans include a 14-day free trial. No credit card required. Billed in South African Rands.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1 hover:shadow-lg ${
                tier.popular
                  ? 'border-brand-crimson-300 bg-white shadow-md shadow-brand-crimson-100'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-brand-crimson-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="mb-1 text-xl font-semibold text-gray-900">{tier.name}</h3>
              <p className="mb-5 text-sm text-gray-500">{tier.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                <span className="ml-1 text-gray-500">/month</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
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
                    ? 'bg-brand-crimson-500 text-white hover:bg-brand-crimson-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Link href={`/qualify?tier=${tier.id}`}>Get Started</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Need a custom solution?{' '}
          <Link href="/pricing" className="text-brand-crimson-500 underline-offset-4 hover:underline">
            View full feature comparison
          </Link>
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
    <section className="relative overflow-hidden bg-brand-charcoal-900 px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-crimson-600/20 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-5 font-display text-3xl font-bold text-white lg:text-5xl">
          Ready to Automate{' '}
          <span className="gradient-text-brand">Your Growth?</span>
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-brand-charcoal-300">
          Join South African businesses that use DraggonnB to manage clients,
          automate marketing, and grow revenue. Start your free trial today.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-13 rounded-xl bg-brand-crimson-500 px-10 text-base font-semibold text-white hover:bg-brand-crimson-600">
            <Link href="/qualify">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-13 rounded-xl border-brand-charcoal-400/40 bg-transparent px-8 text-base text-brand-charcoal-100 hover:bg-white/5 hover:text-white"
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-charcoal-400">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-green-500" />
            14-day free trial
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand-crimson-400" />
            72-hour setup
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            No lock-in contracts
          </span>
        </div>
      </div>
    </section>
  )
}
