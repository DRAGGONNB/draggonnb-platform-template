import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionClient } from '@/scripts/provisioning/orchestrator';
import { z } from 'zod';

const provisioningSchema = z.object({
  clientId: z.string().min(1).max(50),
  clientName: z.string().min(1).max(100),
  orgEmail: z.string().email(),
  tier: z.enum(['starter', 'professional', 'enterprise'])
});

export async function POST(request: NextRequest) {
  try {
    // Auth check - must be authenticated admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check when role system is implemented
    // For now, any authenticated user can provision (restrict in production)

    // Parse and validate body
    const body = await request.json();
    const validation = provisioningSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, clientName, orgEmail, tier } = validation.data;

    // Run provisioning
    const result = await provisionClient(clientId, clientName, orgEmail, tier);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Provisioning failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Client provisioned successfully',
      resources: {
        supabaseProjectId: result.resources?.supabaseProjectId,
        githubRepoUrl: result.resources?.githubRepoUrl,
        vercelDeploymentUrl: result.resources?.vercelDeploymentUrl,
        n8nWebhookUrl: result.resources?.n8nWebhookUrl
      }
    });

  } catch (error) {
    console.error('Provisioning API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
