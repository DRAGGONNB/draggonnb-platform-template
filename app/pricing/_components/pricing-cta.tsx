/**
 * Pricing-page trust trio.
 *
 * Reinforces the v3.0 trust copy mandated by Pitfall F:
 *   - "3 business days to go live" (replaces "14-day free trial")
 *   - "Pay in Rands" (replaces "No credit card required")
 *   - "Cancel anytime"
 *
 * Also surfaces the literal "3 business days" string near the CTA
 * (ONBOARD-09 must-have for the pricing page).
 */
export function PricingCTA() {
  return (
    <section className="mt-16 grid grid-cols-1 gap-6 text-center md:grid-cols-3">
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="font-semibold text-[#363940]">Live in 3 business days</div>
        <div className="mt-1 text-sm text-gray-600">
          From signup to running on autopilot.
        </div>
      </div>
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="font-semibold text-[#363940]">Pay in Rands</div>
        <div className="mt-1 text-sm text-gray-600">
          PayFast subscriptions. South African business pricing.
        </div>
      </div>
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="font-semibold text-[#363940]">Cancel anytime</div>
        <div className="mt-1 text-sm text-gray-600">
          No lock-in. Add or remove modules monthly.
        </div>
      </div>
    </section>
  )
}
