import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';

const N8N_API_BASE = (host: string) => `https://${host}/api/v1`;

export async function createN8NWorkflow(job: ProvisioningJob): Promise<ProvisioningResult> {
  const apiKey = process.env.N8N_API_KEY;
  const n8nHost = process.env.N8N_HOST || 'n8n.srv1114684.hstgr.cloud';

  if (!apiKey) {
    return {
      success: false,
      step: 'n8n-webhooks',
      error: 'Missing N8N_API_KEY environment variable'
    };
  }

  try {
    const workflowName = `Client ${job.clientId} - ${job.clientName}`;
    const webhookPath = `client-${job.clientId}`;

    // Check if workflow already exists (idempotency)
    const existingWorkflow = await findWorkflowByName(workflowName, apiKey, n8nHost);
    if (existingWorkflow) {
      console.log(`N8N workflow "${workflowName}" already exists, skipping creation`);
      return {
        success: true,
        step: 'n8n-webhooks',
        data: {
          n8nWorkflowId: existingWorkflow.id,
          n8nWebhookUrl: `https://${n8nHost}/webhook/${webhookPath}/content`
        }
      };
    }

    // Create workflow with client-specific webhook
    console.log(`Creating N8N workflow: ${workflowName}`);
    const workflow = {
      name: workflowName,
      nodes: [
        {
          id: 'webhook',
          name: 'Client Webhook',
          type: 'n8n-nodes-base.webhook',
          position: [250, 300],
          parameters: {
            path: `${webhookPath}/content`,
            httpMethod: 'POST',
            responseMode: 'responseNode'
          },
          typeVersion: 1
        },
        {
          id: 'response',
          name: 'Response',
          type: 'n8n-nodes-base.respondToWebhook',
          position: [500, 300],
          parameters: {},
          typeVersion: 1
        }
      ],
      connections: {
        'Client Webhook': {
          main: [[{ node: 'Response', type: 'main', index: 0 }]]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };

    const response = await fetch(`${N8N_API_BASE(n8nHost)}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        step: 'n8n-webhooks',
        error: `Failed to create N8N workflow: ${error}`
      };
    }

    const createdWorkflow = await response.json();
    console.log(`Created N8N workflow: ${createdWorkflow.id}`);

    // Activate the workflow
    await activateN8NWorkflow(createdWorkflow.id, apiKey, n8nHost);

    return {
      success: true,
      step: 'n8n-webhooks',
      data: {
        n8nWorkflowId: createdWorkflow.id,
        n8nWebhookUrl: `https://${n8nHost}/webhook/${webhookPath}/content`
      }
    };
  } catch (error) {
    console.error('N8N workflow creation failed:', error);
    return {
      success: false,
      step: 'n8n-webhooks',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function findWorkflowByName(name: string, apiKey: string, n8nHost: string): Promise<{ id: string } | null> {
  try {
    const response = await fetch(`${N8N_API_BASE(n8nHost)}/workflows`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });

    if (!response.ok) return null;

    const workflows = await response.json();
    return workflows.data?.find((w: any) => w.name === name) || null;
  } catch (error) {
    console.error('Failed to search for existing N8N workflow:', error);
    return null;
  }
}

export async function activateN8NWorkflow(workflowId: string, apiKey: string, n8nHost: string): Promise<void> {
  try {
    const response = await fetch(`${N8N_API_BASE(n8nHost)}/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': apiKey }
    });

    if (response.ok) {
      console.log(`Activated N8N workflow: ${workflowId}`);
    } else {
      console.warn(`Failed to activate workflow ${workflowId}: ${await response.text()}`);
    }
  } catch (error) {
    console.warn(`Failed to activate workflow ${workflowId}:`, error);
  }
}
