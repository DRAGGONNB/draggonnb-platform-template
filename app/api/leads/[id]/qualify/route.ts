import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeadQualifierAgent } from '@/lib/agents/lead-qualifier'
import { ProposalGeneratorAgent } from '@/lib/agents/proposal-generator'
import type { QualificationResult } from '@/lib/agents/types'

/**
 * POST /api/leads/[id]/qualify
 * Internal endpoint. Runs Lead Qualifier agent, then triggers proposal generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    // Simple internal auth check
    const internalSecret = request.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_API_SECRET

    if (expectedSecret && internalSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Fetch lead data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Don't re-qualify already qualified leads
    if (lead.qualification_status !== 'pending') {
      return NextResponse.json({
        success: true,
        message: `Lead already ${lead.qualification_status}`,
        qualification: lead.qualification_score,
      })
    }

    // Update status to qualifying
    await supabase
      .from('leads')
      .update({ qualification_status: 'qualifying' })
      .eq('id', leadId)

    // Run Lead Qualifier Agent
    const qualifier = new LeadQualifierAgent()
    let qualificationResult: QualificationResult

    try {
      const agentResult = await qualifier.qualifyLead({
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        website: lead.website,
        industry: lead.industry,
        company_size: lead.company_size,
        business_issues: lead.business_issues || [],
      })

      qualificationResult = agentResult.result as QualificationResult
    } catch (agentError) {
      console.error('Lead qualification agent failed:', agentError)

      // Mark as pending again so it can be retried
      await supabase
        .from('leads')
        .update({ qualification_status: 'pending' })
        .eq('id', leadId)

      return NextResponse.json(
        { error: 'Qualification failed. Will retry.' },
        { status: 500 }
      )
    }

    // Update lead with qualification results
    await supabase
      .from('leads')
      .update({
        qualification_status: qualificationResult.qualification_status,
        qualification_score: qualificationResult.score,
        recommended_tier: qualificationResult.recommended_tier,
        solution_blueprint: {
          automatable_processes: qualificationResult.automatable_processes,
          suggested_templates: qualificationResult.suggested_templates,
          reasoning: qualificationResult.reasoning,
        },
      })
      .eq('id', leadId)

    console.log(
      `Lead ${leadId} qualified: ${qualificationResult.qualification_status} ` +
      `(score: ${qualificationResult.score.overall}, tier: ${qualificationResult.recommended_tier})`
    )

    // If qualified, generate proposal in background
    if (qualificationResult.qualification_status === 'qualified') {
      generateProposalAsync(lead, qualificationResult).catch((err) =>
        console.error('Async proposal generation failed:', err)
      )
    }

    return NextResponse.json({
      success: true,
      qualification: qualificationResult,
    })
  } catch (error) {
    console.error('Lead qualification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate proposal asynchronously after qualification
 */
async function generateProposalAsync(
  lead: Record<string, unknown>,
  qualification: QualificationResult
): Promise<void> {
  try {
    const proposalAgent = new ProposalGeneratorAgent()
    await proposalAgent.generateProposal(
      {
        id: lead.id as string,
        company_name: lead.company_name as string,
        contact_name: lead.contact_name as string | undefined,
        industry: lead.industry as string | undefined,
        company_size: lead.company_size as string | undefined,
        business_issues: (lead.business_issues as string[]) || [],
      },
      qualification
    )

    console.log(`Proposal generated for lead ${lead.id}`)
  } catch (error) {
    console.error(`Proposal generation failed for lead ${lead.id}:`, error)
  }
}
