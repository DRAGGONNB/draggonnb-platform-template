import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/leads/[id]/proposal
 * Returns the AI-generated proposal for a lead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params
    const supabase = createAdminClient()

    // Fetch lead to verify it exists and is qualified
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, qualification_status, qualification_score, recommended_tier, solution_blueprint')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (lead.qualification_status === 'pending' || lead.qualification_status === 'qualifying') {
      return NextResponse.json({
        success: true,
        status: 'processing',
        message: 'Your proposal is being generated. Please check back shortly.',
      })
    }

    if (lead.qualification_status === 'disqualified') {
      return NextResponse.json({
        success: true,
        status: 'disqualified',
        message: 'Based on our analysis, we may not be the best fit right now. Our team will reach out if we can help.',
      })
    }

    // Fetch the proposal from agent_sessions
    const { data: session } = await supabase
      .from('agent_sessions')
      .select('result, status')
      .eq('agent_type', 'proposal_generator')
      .eq('lead_id', leadId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!session || !session.result) {
      // Proposal not yet generated
      return NextResponse.json({
        success: true,
        status: 'generating',
        message: 'Your proposal is being finalized. Please check back in a few minutes.',
        qualification: {
          score: lead.qualification_score,
          recommended_tier: lead.recommended_tier,
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: 'ready',
      proposal: session.result,
      qualification: {
        score: lead.qualification_score,
        recommended_tier: lead.recommended_tier,
        solution_blueprint: lead.solution_blueprint,
      },
    })
  } catch (error) {
    console.error('Proposal fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
