'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { vatInclusivePrice, VAT_LABEL } from '@/lib/billing/vat'
import { formatZARDecimal } from '@/lib/billing/format-zar'

/**
 * Plan = base subscription tier (Core / vertical).
 * Hard-coded in the parent page (matches REQ BILL-01: Core R599 + Vertical R1,199).
 */
export interface PricingPickerPlan {
  id: string
  name: string
  priceZarCents: number
  description: string
}

/**
 * Addon = catalog row from billing_addons_catalog (Phase 09 BILL-02).
 * Server-fetched in the parent RSC and passed in — never hard-coded here.
 */
export interface PricingPickerAddon {
  id: string
  display_name: string
  description?: string | null
  price_zar_cents: number
  kind: string
  billing_cycle: string
}

interface ModulePickerProps {
  plans: PricingPickerPlan[]
  addons: PricingPickerAddon[]
  defaultPlanId?: string
}

/**
 * Interactive module picker for the public /pricing page.
 *
 * Behaviour:
 *   - Radio-select base plan
 *   - Multi-toggle add-on modules (kind='module', billing_cycle='monthly')
 *   - Live total updates with Math.round VAT math
 *   - "incl. 15% VAT" label always visible (BILL-09)
 *   - Setup fee shown as a separate one-off line if catalog includes it
 *
 * Closes BILL-01 (module picker), SITE-02 (pricing page), and surfaces
 * the "3 business days" promise in the sidebar (ONBOARD-09).
 */
export function ModulePicker({ plans, addons, defaultPlanId = 'core' }: ModulePickerProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId)
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // Phase 09 catalog filter: only kind='module' + monthly cycle in the toggle list
  const monthlyAddons = useMemo(
    () => addons.filter((a) => a.kind === 'module' && a.billing_cycle === 'monthly'),
    [addons],
  )
  const setupFee = useMemo(
    () => addons.find((a) => a.id === 'setup_fee'),
    [addons],
  )

  const totals = useMemo(() => {
    const plan = plans.find((p) => p.id === selectedPlanId)
    const planCents = plan?.priceZarCents ?? 0
    const addonCents = Array.from(selectedAddonIds).reduce((sum, id) => {
      const a = addons.find((x) => x.id === id)
      return sum + (a?.price_zar_cents ?? 0)
    }, 0)
    const subtotalEx = planCents + addonCents
    const subtotalInc = vatInclusivePrice(subtotalEx)
    const setupEx = setupFee?.price_zar_cents ?? 0
    const setupInc = vatInclusivePrice(setupEx)
    return { subtotalEx, subtotalInc, setupEx, setupInc }
  }, [plans, addons, selectedPlanId, selectedAddonIds, setupFee])

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {/* Plan selector */}
        <fieldset className="space-y-3">
          <legend className="mb-3 text-lg font-semibold text-[#363940]">
            1. Pick your plan
          </legend>
          {plans.map((p) => {
            const selected = selectedPlanId === p.id
            return (
              <label
                key={p.id}
                className={`block cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  selected
                    ? 'border-[#6B1420] bg-[#fef5f6]'
                    : 'border-gray-200 hover:border-[#6B1420]/40'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={selected}
                  onChange={() => setSelectedPlanId(p.id)}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-[#363940]">{p.name}</div>
                    <div className="text-sm text-gray-600">{p.description}</div>
                  </div>
                  <div className="whitespace-nowrap font-mono text-lg text-[#363940]">
                    {formatZARDecimal(p.priceZarCents)}
                    <span className="ml-1 text-xs text-gray-500">/mo</span>
                  </div>
                </div>
              </label>
            )
          })}
        </fieldset>

        {/* Addons */}
        <fieldset className="space-y-3">
          <legend className="mb-3 text-lg font-semibold text-[#363940]">
            2. Add modules (optional)
          </legend>
          {monthlyAddons.length === 0 && (
            <p className="text-sm text-gray-500">No add-on modules currently available.</p>
          )}
          {monthlyAddons.map((a) => {
            const selected = selectedAddonIds.has(a.id)
            return (
              <label
                key={a.id}
                className={`block cursor-pointer rounded-lg border p-4 transition-colors ${
                  selected
                    ? 'border-[#6B1420] bg-[#fef5f6]'
                    : 'border-gray-200 hover:border-[#6B1420]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAddon(a.id)}
                      className="mt-1 h-4 w-4 accent-[#6B1420]"
                    />
                    <div>
                      <div className="font-medium text-[#363940]">{a.display_name}</div>
                      {a.description && (
                        <div className="text-sm text-gray-600">{a.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="whitespace-nowrap font-mono text-[#363940]">
                    {formatZARDecimal(a.price_zar_cents)}
                    <span className="ml-1 text-xs text-gray-500">/mo</span>
                  </div>
                </div>
              </label>
            )
          })}
        </fieldset>
      </div>

      {/* Live total sidebar */}
      <aside
        data-testid="pricing-total"
        className="sticky top-6 h-fit rounded-lg bg-[#363940] p-6 text-white"
      >
        <h3 className="mb-4 text-base font-semibold">Your total</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <dt>Monthly (ex VAT)</dt>
            <dd className="font-mono">{formatZARDecimal(totals.subtotalEx)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-600 pt-2 text-base font-semibold">
            <dt>Monthly</dt>
            <dd className="font-mono">{formatZARDecimal(totals.subtotalInc)}</dd>
          </div>
          <div className="flex justify-between text-xs text-gray-300">
            <dt>{VAT_LABEL}</dt>
            <dd></dd>
          </div>
          {totals.setupEx > 0 && (
            <div className="mt-3 border-t border-gray-600 pt-3 text-xs">
              <div className="flex justify-between font-mono">
                <dt>Once-off setup</dt>
                <dd>{formatZARDecimal(totals.setupInc)}</dd>
              </div>
              <div className="mt-1 text-gray-400">
                {VAT_LABEL} — billed after first month
              </div>
            </div>
          )}
        </dl>
        <div className="mt-6 text-xs text-gray-300">
          Replaces ~R4,500/mo of manual work. Live in 3 business days. Cancel anytime.
        </div>
        <Link
          href="/signup"
          className="mt-6 block w-full rounded bg-[#6B1420] py-3 text-center font-semibold text-white transition-colors hover:bg-[#8a1a29]"
        >
          Get started
        </Link>
      </aside>
    </div>
  )
}
