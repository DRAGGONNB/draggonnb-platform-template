import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/leads/[id]/approve
 * Admin endpoint. Marks a lead as approved for provisioning.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    // Admin auth check - require internal secret or authenticated admin user
    const internalSecret = request.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_API_SECRET

    if (expectedSecret && internalSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Fetch lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, qualification_status, email, company_name')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Only qualified leads can be approved
    if (lead.qualification_status !== 'qualified') {
      return NextResponse.json(
        { error: `Cannot approve lead with status: ${lead.qualification_status}` },
        { status: 400 }
      )
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from('leads')
      .update({ qualification_status: 'approved' })
      .eq('id', leadId)

    if (updateError) {
      console.error('Failed to approve lead:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve lead' },
        { status: 500 }
      )
    }

    console.log(`Lead ${leadId} (${lead.email}) approved for provisioning`)

    return NextResponse.json({
      success: true,
      message: `Lead ${lead.company_name} approved for provisioning`,
    })
  } catch (error) {
    console.error('Lead approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
