import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { AddBillItemSchema, VoidBillItemSchema } from '@/lib/restaurant/schemas'
import crypto from 'crypto'

// POST: add item to bill
export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = AddBillItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { session_id, menu_item_id, quantity, modifier_notes } = parsed.data
  const admin = createAdminClient()

  // Get bill for this session
  const { data: bill } = await admin
    .from('bills')
    .select('id, subtotal, service_charge_pct, status')
    .eq('session_id', session_id)
    .eq('organization_id', auth.organizationId)
    .single()

  if (!bill) return NextResponse.json({ error: 'Bill not found for session' }, { status: 404 })
  if (bill.status !== 'open') return NextResponse.json({ error: 'Bill is not open' }, { status: 409 })

  // Get menu item price (snapshot at time of order)
  const { data: menuItem } = await admin
    .from('menu_items')
    .select('name, price')
    .eq('id', menu_item_id)
    .single()

  if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })

  // Insert bill item
  const { data: item, error } = await admin
    .from('bill_items')
    .insert({
      organization_id: auth.organizationId,
      bill_id: bill.id,
      menu_item_id,
      name: menuItem.name,
      quantity,
      unit_price: menuItem.price,
      modifier_notes: modifier_notes || null,
    })
    .select()
    .single()

  if (error || !item) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Recalculate bill totals
  await recalculateBill(admin, bill.id, auth.organizationId)

  return NextResponse.json({ item }, { status: 201 })
}

// DELETE: void a bill item
export async function DELETE(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = VoidBillItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { item_id, void_reason, manager_pin } = parsed.data
  const admin = createAdminClient()

  // Get item and check org
  const { data: item } = await admin
    .from('bill_items')
    .select('id, bill_id, unit_price, organization_id, voided')
    .eq('id', item_id)
    .single()

  if (!item || item.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
  if (item.voided) {
    return NextResponse.json({ error: 'Item already voided' }, { status: 409 })
  }

  // Validate manager PIN for high-value voids (> R50)
  if (item.unit_price > 50 && manager_pin) {
    const pinHash = crypto.createHash('sha256').update(manager_pin).digest('hex')
    const { data: manager } = await admin
      .from('restaurant_staff')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('role', 'manager')
      .eq('pin_hash', pinHash)
      .single()

    if (!manager) {
      return NextResponse.json({ error: 'Invalid manager PIN' }, { status: 403 })
    }
  } else if (item.unit_price > 50 && !manager_pin) {
    return NextResponse.json({ error: 'Manager PIN required for items over R50' }, { status: 403 })
  }

  // Void the item
  await admin
    .from('bill_items')
    .update({ voided: true, void_reason, voided_by: auth.userId !== 'service' ? auth.userId : null })
    .eq('id', item_id)

  // Recalculate bill
  await recalculateBill(admin, item.bill_id, auth.organizationId)

  return NextResponse.json({ voided: true })
}

async function recalculateBill(
  admin: ReturnType<typeof createAdminClient>,
  billId: string,
  organizationId: string
) {
  const { data: items } = await admin
    .from('bill_items')
    .select('line_total')
    .eq('bill_id', billId)
    .eq('voided', false)

  const subtotal = (items || []).reduce((sum, i) => sum + Number(i.line_total), 0)

  const { data: bill } = await admin
    .from('bills')
    .select('service_charge_pct')
    .eq('id', billId)
    .single()

  const svcPct = bill?.service_charge_pct ?? 0
  const serviceCharge = Number((subtotal * svcPct / 100).toFixed(2))
  const total = Number((subtotal + serviceCharge).toFixed(2))

  await admin
    .from('bills')
    .update({ subtotal, service_charge: serviceCharge, total, updated_at: new Date().toISOString() })
    .eq('id', billId)
    .eq('organization_id', organizationId)
}
