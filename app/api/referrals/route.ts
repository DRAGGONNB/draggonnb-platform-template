import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// GET - Return current user's referral code and referral list
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const organizationId = userRecord.organization_id

    // Get or generate referral code
    const { data: org } = await supabase
      .from('organizations')
      .select('referral_code')
      .eq('id', organizationId)
      .single()

    let referralCode = org?.referral_code

    if (!referralCode) {
      const { data: codeResult, error: rpcError } = await supabase.rpc('generate_referral_code', {
        p_organization_id: organizationId,
      })

      if (rpcError) {
        console.error('Error generating referral code:', rpcError)
        return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
      }

      referralCode = codeResult
    }

    // Query referrals for this organization
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError)
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode}`

    return NextResponse.json({
      referralCode,
      referralLink,
      referrals: referrals || [],
    })
  } catch (error) {
    console.error('Referrals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// POST - Create a new referral invitation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const organizationId = userRecord.organization_id

    // Validate request body
    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Check for duplicate: same referrer + same email that isn't expired
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_organization_id', organizationId)
      .eq('referee_email', email)
      .neq('status', 'expired')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A referral for this email already exists' },
        { status: 409 }
      )
    }

    // Get or generate referral code
    const { data: org } = await supabase
      .from('organizations')
      .select('referral_code')
      .eq('id', organizationId)
      .single()

    let referralCode = org?.referral_code

    if (!referralCode) {
      const { data: codeResult, error: rpcError } = await supabase.rpc('generate_referral_code', {
        p_organization_id: organizationId,
      })

      if (rpcError) {
        console.error('Error generating referral code:', rpcError)
        return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
      }

      referralCode = codeResult
    }

    // Insert referral
    const { data: referral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_organization_id: organizationId,
        referral_code: referralCode,
        referee_email: email,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating referral:', insertError)
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
    }

    return NextResponse.json({ referral }, { status: 201 })
  } catch (error) {
    console.error('Referrals POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
