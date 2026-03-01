import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Validate a referral code (public endpoint for signup flow)
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('referral_code', code)
      .single()

    if (error || !org) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({
      valid: true,
      referrerName: org.name,
    })
  } catch (error) {
    console.error('Referral validate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
