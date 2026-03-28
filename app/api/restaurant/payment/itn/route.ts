/**
 * PayFast ITN handler for restaurant LiveTab bill payments.
 * PUBLIC endpoint — no auth. Validates MD5 signature before any DB writes.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBillITN } from '@/lib/restaurant/payfast/generate-link'

export async function POST(request: NextRequest) {
  let payload: Record<string, string>

  try {
    const text = await request.text()
    payload = Object.fromEntries(new URLSearchParams(text))
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get payer record to fetch restaurant PayFast credentials
  const payerToken = payload.m_payment_id
  if (!payerToken) {
    return NextResponse.json({ error: 'Missing m_payment_id' }, { status: 400 })
  }

  const { data: payer } = await admin
    .from('bill_payers')
    .select('id, bill_id, amount_due, status')
    .eq('payfast_token', payerToken)
    .single()

  if (!payer) {
    console.error('[Restaurant ITN] Payer not found for token:', payerToken)
    return new NextResponse('OK', { status: 200 }) // Always 200 to PayFast
  }

  if (payer.status === 'paid') {
    return new NextResponse('OK', { status: 200 }) // Duplicate ITN — ignore
  }

  // Get restaurant PayFast credentials via bill → session → restaurant
  const { data: bill } = await admin
    .from('bills')
    .select('id, restaurant_id, organization_id, subtotal, total, status')
    .eq('id', payer.bill_id)
    .single()

  if (!bill) {
    return new NextResponse('OK', { status: 200 })
  }

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('payfast_merchant_id, payfast_passphrase')
    .eq('id', bill.restaurant_id)
    .single()

  // Validate ITN
  const validated = validateBillITN(
    payload,
    restaurant?.payfast_merchant_id || process.env.PAYFAST_MERCHANT_ID || '',
    restaurant?.payfast_passphrase || process.env.PAYFAST_PASSPHRASE
  )

  if (!validated) {
    console.error('[Restaurant ITN] Validation failed for payer:', payer.id)
    return new NextResponse('OK', { status: 200 }) // Always 200 to PayFast
  }

  const paidAmount = parseFloat(payload.amount_gross || '0') - validated.tipAmount
  const now = new Date().toISOString()

  // Update payer as paid
  await admin
    .from('bill_payers')
    .update({
      status: 'paid',
      amount_paid: paidAmount,
      tip_amount: validated.tipAmount,
      paid_at: now,
    })
    .eq('id', payer.id)

  // Record payment in ledger
  await admin.from('bill_payments').insert({
    organization_id: bill.organization_id,
    bill_id: bill.id,
    payer_id: payer.id,
    amount: paidAmount,
    tip: validated.tipAmount,
    payment_method: 'eft',
    payfast_ref: validated.pfPaymentId,
    itn_payload: payload,
  })

  // Check if all payers are now paid
  const { data: allPayers } = await admin
    .from('bill_payers')
    .select('status')
    .eq('bill_id', bill.id)

  const allPaid = allPayers?.every(p => p.status === 'paid' || p.status === 'skipped') ?? false

  if (allPaid) {
    // Close the bill and session
    await admin
      .from('bills')
      .update({ status: 'paid', updated_at: now })
      .eq('id', bill.id)

    await admin
      .from('table_sessions')
      .update({ status: 'closed', closed_at: now })
      .eq('id', bill.id) // session_id stored on bill

    // Recalculate tip total on bill
    const { data: allPayments } = await admin
      .from('bill_payments')
      .select('tip')
      .eq('bill_id', bill.id)

    const totalTip = (allPayments || []).reduce((sum, p) => sum + Number(p.tip), 0)
    await admin
      .from('bills')
      .update({ tip_total: totalTip, updated_at: now })
      .eq('id', bill.id)
  } else {
    await admin
      .from('bills')
      .update({ status: 'partially_paid', updated_at: now })
      .eq('id', bill.id)

    await admin
      .from('table_sessions')
      .update({ status: 'partially_paid' })
      .eq('id', bill.id)
  }

  // Trigger N8N for payment notification
  const n8nBase = process.env.N8N_BASE_URL
  const n8nKey = process.env.N8N_API_KEY
  if (n8nBase && n8nKey) {
    fetch(`${n8nBase}/webhook/livetab-payfast-itn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': n8nKey },
      body: JSON.stringify({
        billId: bill.id,
        payerId: payer.id,
        restaurantId: bill.restaurant_id,
        organizationId: bill.organization_id,
        amountPaid: paidAmount,
        tipAmount: validated.tipAmount,
        allPaid,
      }),
    }).catch(err => console.error('[Restaurant ITN] N8N trigger failed:', err))
  }

  return new NextResponse('OK', { status: 200 })
}
