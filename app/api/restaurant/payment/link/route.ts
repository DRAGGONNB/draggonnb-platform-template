import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { generateBillPaymentLink } from '@/lib/restaurant/payfast/generate-link'
import { z } from 'zod'

const RequestSchema = z.object({
  bill_id: z.string().uuid(),
  payer_slot: z.number().int().min(1).optional(),
  tip_pct: z.number().min(0).max(50).default(0),
  tip_amount: z.number().min(0).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()
  const { bill_id, payer_slot, tip_pct, tip_amount } = parsed.data

  // Get bill and restaurant
  const { data: bill } = await admin
    .from('bills')
    .select(`
      *,
      table_sessions(table_id, restaurant_tables(label)),
      restaurants(slug, payfast_merchant_id, payfast_merchant_key, payfast_passphrase, service_charge_pct)
    `)
    .eq('id', bill_id)
    .eq('organization_id', auth.organizationId)
    .single()

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  const restaurant = (bill.restaurants as unknown as { slug: string; payfast_merchant_id: string; payfast_merchant_key: string; payfast_passphrase: string } | null)
  const session = (bill.table_sessions as unknown as { table_id: string; restaurant_tables: { label: string } | null } | null)
  const tableLabel = session?.restaurant_tables?.label ?? 'Table'
  const restaurantSlug = restaurant?.slug ?? 'restaurant'

  // Determine amount and payers to generate links for
  const links: Array<{ slot: number; url: string; payerToken: string }> = []

  if (payer_slot) {
    // Single payer link
    const { data: payer } = await admin
      .from('bill_payers')
      .select('id, payfast_token, amount_due')
      .eq('bill_id', bill_id)
      .eq('slot_number', payer_slot)
      .single()

    if (!payer) return NextResponse.json({ error: 'Payer slot not found' }, { status: 404 })

    const amount = payer.amount_due ?? bill.total
    const tip = tip_amount ?? Number((amount * tip_pct / 100).toFixed(2))

    const url = generateBillPaymentLink({
      merchantId: restaurant?.payfast_merchant_id || process.env.PAYFAST_MERCHANT_ID || '',
      merchantKey: restaurant?.payfast_merchant_key || process.env.PAYFAST_MERCHANT_KEY || '',
      passphrase: restaurant?.payfast_passphrase || process.env.PAYFAST_PASSPHRASE,
      billId: bill_id,
      payerId: payer.id,
      payerToken: payer.payfast_token,
      amount,
      tipAmount: tip,
      restaurantSlug,
      tableLabel,
      sandbox: process.env.PAYFAST_MODE !== 'production',
    })

    links.push({ slot: payer_slot, url, payerToken: payer.payfast_token })
  } else {
    // Generate links for all pending payers (split billing)
    const { data: payers } = await admin
      .from('bill_payers')
      .select('id, payfast_token, slot_number, amount_due, status')
      .eq('bill_id', bill_id)
      .eq('status', 'pending')

    for (const payer of payers ?? []) {
      const amount = payer.amount_due ?? bill.total
      const tip = Number((amount * tip_pct / 100).toFixed(2))

      const url = generateBillPaymentLink({
        merchantId: restaurant?.payfast_merchant_id || process.env.PAYFAST_MERCHANT_ID || '',
        merchantKey: restaurant?.payfast_merchant_key || process.env.PAYFAST_MERCHANT_KEY || '',
        passphrase: restaurant?.payfast_passphrase || process.env.PAYFAST_PASSPHRASE,
        billId: bill_id,
        payerId: payer.id,
        payerToken: payer.payfast_token,
        amount,
        tipAmount: tip,
        restaurantSlug,
        tableLabel,
        sandbox: process.env.PAYFAST_MODE !== 'production',
      })

      links.push({ slot: payer.slot_number, url, payerToken: payer.payfast_token })
    }
  }

  return NextResponse.json({ links, billId: bill_id })
}
