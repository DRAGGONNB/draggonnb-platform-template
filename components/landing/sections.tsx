import Link from 'next/link'
import {
  Users,
  Sparkles,
  Share2,
  Mail,
  BarChart3,
  CreditCard,
  Zap,
  Check,
  ArrowRight,
  UserPlus,
  Settings,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QualificationCTA } from './qualification-cta'

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-48">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm">
          <Zap className="h-4 w-4 text-blue-400" />
          Built for South African SMEs
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          AI-Powered Business Automation{' '}
          <span className="gradient-text">That Runs Itself</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 sm:text-xl">
          Tell us your 3 biggest business challenges. Our AI builds a custom automation
          solution -- CRM, email, social, and more -- that goes live in 72 hours.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="btn-futuristic h-12 rounded-xl px-8 text-base">
            <Link href="/qualify">
              Get Your AI Solution
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-slate-600 bg-transparent px-8 text-base text-slate-200 hover:bg-white/5 hover:text-white">
            <Link href="/pricing">See Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof Bar                                                    */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '500+', label: 'SA Businesses' },
  { value: '72hr', label: 'AI Setup Time' },
  { value: '60-80%', label: 'Profit Margins' },
  { value: 'R1,500', label: 'Starting From /mo' },
]

export function SocialProofBar() {
  return (
    <section className="border-y border-white/10 bg-slate-800/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Problem / Solution                                                  */
/* ------------------------------------------------------------------ */

const painPoints = [
  {
    problem: 'Scattered tools for CRM, email, and socials',
    solution: 'One unified platform for everything',
  },
  {
    problem: 'Expensive agencies that drain your budget',
    solution: 'Professional marketing from R1,500/month',
  },
  {
    problem: 'No time to create content consistently',
    solution: 'AI writes your content, you approve it',
  },
  {
    problem: 'No visibility into what is working',
    solution: 'Real-time analytics and performance insights',
  },
]

export function ProblemSolutionSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Stop Juggling. Start <span className="gradient-text">Growing.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            South African SMEs lose hours every week switching between disconnected tools. DraggonnB brings it all together.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {painPoints.map((item, i) => (
            <div
              key={i}
              className="group rounded-xl border border-white/10 bg-slate-800/50 p-6 transition-all hover-lift hover-glow"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400">
                  X
                </div>
                <p className="text-slate-400 line-through decoration-slate-600">{item.problem}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-3.5 w-3.5 text-green-400" />
                </div>
                <p className="font-medium text-white">{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features Grid                                                       */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Users,
    title: 'CRM & Contacts',
    description:
      'Track contacts, companies, and deals in one place. Never lose a lead again.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'AI Content Generation',
    description:
      'Generate social posts, emails, and marketing copy tailored to your brand voice.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Share2,
    title: 'Social Media Management',
    description:
      'Schedule and publish to multiple platforms. Manage all accounts from one dashboard.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Mail,
    title: 'Email Campaigns',
    description:
      'Build sequences, send campaigns, and track opens and clicks with ease.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description:
      'Real-time dashboards showing what is working. Daily and weekly insight reports.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: CreditCard,
    title: 'PayFast Payments',
    description:
      'Secure billing via PayFast -- South Africa\'s trusted payment gateway. No setup fees.',
    gradient: 'from-blue-500 to-purple-500',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-white/10 bg-slate-800/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Everything You Need to{' '}
            <span className="gradient-text">Automate Growth</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Six powerful modules working together so you can focus on running your business.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/10 bg-slate-800/60 p-6 transition-all hover-lift hover-glow"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                        */
/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Tell Us Your Challenges',
    description:
      'Fill out our quick form with your 3 biggest business pain points. It takes less than 5 minutes.',
  },
  {
    icon: Settings,
    number: '02',
    title: 'Get Your AI Solution',
    description:
      'Our AI analyzes your needs, matches automations from our library, and proposes a custom solution.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Go Live in 72 Hours',
    description:
      'Pay, and our platform automatically sets up your AI-powered CRM, email, and automations.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            From Pain Points to{' '}
            <span className="gradient-text">AI Solution in 72 Hours</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Three simple steps from your business challenges to a fully automated solution.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative text-center">
                {/* Connector line on desktop */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 md:block">
                    <div className="h-px w-full bg-gradient-to-r from-blue-500/50 to-transparent" />
                  </div>
                )}

                <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-slate-800">
                    <Icon className="h-8 w-8 text-blue-400" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing Preview                                                     */
/* ------------------------------------------------------------------ */

const tiers = [
  {
    id: 'core',
    name: 'Core',
    price: 'R1,500',
    description: 'Everything you need to manage CRM, email, and 1 custom automation.',
    highlights: ['Social CRM & deals pipeline', '1 custom automation', '30 posts/mo, 50 AI gens', '1,000 emails/mo'],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R3,500',
    description: 'AI content, advanced email, and smart lead pipeline for growing businesses.',
    highlights: ['3+ business automations', 'AI content for all channels', 'Smart lead pipeline', '10,000 emails/mo'],
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'R7,500',
    description: 'White label, AI agents, and unlimited everything for agencies and teams.',
    highlights: ['White label branding', '3 AI agents included', 'Unlimited everything', 'API access'],
    popular: false,
  },
]

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="border-t border-white/10 bg-slate-800/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            All plans include a 14-day free trial. No credit card required. Pay in Rands.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-xl border p-8 transition-all hover-lift ${
                tier.popular
                  ? 'border-blue-500/50 bg-slate-800 shadow-lg shadow-blue-500/10'
                  : 'border-white/10 bg-slate-800/60'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="mb-1 text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mb-4 text-sm text-slate-400">{tier.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="ml-1 text-slate-400">/month</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 shrink-0 text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={tier.popular ? 'default' : 'outline'}
                size="lg"
                className={`w-full rounded-lg ${
                  tier.popular
                    ? 'btn-futuristic'
                    : 'border-slate-600 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Link href={`/qualify?tier=${tier.id}`}>Get Started</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Need something custom?{' '}
          <Link href="/pricing" className="text-blue-400 underline-offset-4 hover:underline">
            View full feature comparison
          </Link>
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Trust / CTA                                                         */
/* ------------------------------------------------------------------ */

export function CTASection() {
  return <QualificationCTA />
}
