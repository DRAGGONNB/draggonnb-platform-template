import Link from 'next/link'
import { ArrowRight, Settings2 } from 'lucide-react'

/**
 * v3.0 outcome-led hero (SITE-01, SITE-05).
 *
 * Replaces the prior feature-led "Automate Your Business Growth" hero.
 * Brand colors: charcoal #363940 background, crimson #6B1420 CTA.
 *
 * Trust strip below the CTA reflects the v3.0 truth (Pitfall F):
 *   "3 business days to go live. Pay in Rands. Cancel anytime."
 * The previous strip falsely advertised a 14-day free trial and "no credit
 * card required" — both untrue under PayFast subscriptions, so they were
 * removed in this refactor.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#363940] text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#6B1420]/10 blur-[140px]" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:py-32 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Run your lodge on autopilot.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gray-300 md:text-xl">
            DraggonnB OS replaces ~R4,500/mo of manual work — guest comms,
            booking ops, AI quoting, social posting. Live in 3 business days.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded bg-[#6B1420] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#8a1a29]"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded border-2 border-white px-6 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-[#363940]"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            3 business days to go live. Pay in Rands. Cancel anytime.
          </p>
        </div>

        <div className="relative">
          {/* Module-preview tile. Static SVG/Lucide placeholder until a custom
              launch graphic is sourced (documented as open todo in 10-06). */}
          <div className="flex aspect-square items-center justify-center rounded-2xl border-2 border-[#6B1420] bg-[#6B1420]/15">
            <div className="text-center px-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#6B1420]">
                <Settings2 className="h-10 w-10 text-white" />
              </div>
              <p className="text-sm text-gray-300">
                Pick your modules. Live in 3 business days.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-sm font-semibold text-[#fde7e9] underline-offset-4 hover:underline"
              >
                Try the picker -&gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
