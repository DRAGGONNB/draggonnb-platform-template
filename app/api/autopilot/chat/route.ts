import { NextRequest, NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { getClientProfile } from '@/lib/autopilot/client-profile'
import { BusinessAutopilotAgent } from '@/lib/agents/business-autopilot'
import { checkUsage, incrementUsage } from '@/lib/tier/feature-gate'

export async function POST(request: NextRequest) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
  }

  const orgId = userOrg.organizationId

  // Check usage
  const usageCheck = await checkUsage(orgId, 'agent_invocations')
  if (!usageCheck.allowed) {
    return NextResponse.json({
      error: 'Usage limit reached',
      reason: usageCheck.reason,
      current: usageCheck.current,
      limit: usageCheck.limit,
    }, { status: 429 })
  }

  let body: { message: string; session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const profile = await getClientProfile(orgId)
  if (!profile) {
    return NextResponse.json(
      { error: 'Client profile not found. Complete your Autopilot setup first.' },
      { status: 404 }
    )
  }

  const agent = new BusinessAutopilotAgent(profile)

  try {
    const result = await agent.chat(body.message, orgId, body.session_id)
    await incrementUsage(orgId, 'agent_invocations')

    return NextResponse.json({
      response: result.response,
      result: result.result,
      session_id: result.sessionId,
      tokens_used: result.tokensUsed,
    })
  } catch (err) {
    console.error('Autopilot chat error:', err)
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 })
  }
}
