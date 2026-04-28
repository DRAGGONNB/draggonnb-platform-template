import Link from 'next/link'
import Image from 'next/image'
import { getAddonsCatalog } from '@/lib/billing/addons-catalog'
import { ModulePicker, type PricingPickerPlan } from './_components/module-picker'
import { PricingCTA } from './_components/pricing-cta'

/**
 * Public /pricing page.
 *
 * Server component — fetches the live billing_addons_catalog so the picker
 * never hard-codes addon IDs (Phase 09 BILL-02 source-of-truth contract).
 *
 * Closes:
 *   - BILL-01 (interactive module picker)
 *   - BILL-09 (VAT-inclusive label "incl. 15% VAT")
 *   - SITE-02 (public pricing page)
 *   - ONBOARD-09 (literal "3 business days" near the CTA)
 *   - Pitfall F surface (no "14-day free trial" / "No credit card required")
 */

export const metadata = {
  title: 'Pricing — DraggonnB OS',
  description:
    'Modular pricing in Rands. Pick what you need. Live in 3 business days. Pay in Rands. Cancel anytime.',
}

// Static plan list mirrors REQ BILL-01: Core R599 + Vertical R1,199.
// Source of truth for these tier prices stays here until billing_plans
// is fully migrated to the v3.0 R599/R1,199 amounts.
const V3_PLANS: PricingPickerPlan[] = [
  {
    id: 'core',
    name: 'Core',
    priceZarCents: 59900,
    description: 'CRM + Email + Social. The essentials, all in Rands.',
  },
  {
    id: 'vertical_accommodation',
    name: 'Accommodation',
    priceZarCents: 119900,
    description: 'Lodge / B&B / guesthouse automation. Includes Core.',
  },
  {
    id: 'vertical_restaurant',
    name: 'Restaurant',
    priceZarCents: 119900,
    description: 'Restaurant operations + QR menus. Includes Core.',
  },
]

export default async function PricingPage() {
  // Catalog read tolerates DB outage so the marketing page never hard-fails.
  // Empty catalog -> picker shows "no add-ons available", page still renders.
  let addons: Awaited<ReturnType<typeof getAddonsCatalog>> = []
  try {
    addons = await getAddonsCatalog()
  } catch (err) {
    console.error('[/pricing] addons catalog fetch failed:', err)
  }

  return (
    <main className="min-h-screen bg-white text-[#363940]">
      {/* Top bar */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="DraggonnB"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="font-display text-base font-bold text-[#363940]">
              DRAGGON<span className="text-[#6B1420]">NB</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              OS
            </span>
          </Link>
          <Link
            href="/signup"
            className="rounded bg-[#6B1420] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a1a29]"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-[#363940] md:text-5xl">
          Pricing in Rands. Pick what you need.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Live in <strong>3 business days</strong>. Cancel anytime. Pay in Rands.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <ModulePicker plans={V3_PLANS} addons={addons} />
        <PricingCTA />
      </section>
    </main>
  )
}
