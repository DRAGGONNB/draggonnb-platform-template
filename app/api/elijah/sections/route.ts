import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createSectionSchema } from '@/lib/elijah/validations'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('elijah_section')
      .select('*, households:elijah_household(count)')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
    }

    return NextResponse.json({ sections: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createSectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_section')
      .insert({ organization_id: auth.organizationId, ...parsed.data })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 })
    }

    return NextResponse.json({ section: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
