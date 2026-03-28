import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { staff_id, pin } = body as { staff_id?: unknown; pin?: unknown }

  if (!staff_id || !pin) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (typeof staff_id !== 'string' || typeof pin !== 'string') {
    return NextResponse.json({ error: 'Invalid field types' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurant_staff')
    .select('id, display_name, role, pin_hash, is_active')
    .eq('id', staff_id)
    .eq('is_active', true)
    .single()

  if (!data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

  const hash = crypto.createHash('sha256').update(pin).digest('hex')
  if (hash !== data.pin_hash) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  return NextResponse.json({
    staff: {
      id: data.id,
      display_name: data.display_name,
      role: data.role,
    },
  })
}
