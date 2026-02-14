import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';

const N8N_API_BASE = (host: string) => `https://${host}/api/v1`;

// Maps each module to its workflow template definitions
const MODULE_WORKFLOWS: Record<string, { name: string; webhookPath: string }[]> = {
  crm: [
    { name: 'Lead Capture Webhook', webhookPath: 'lead-capture' },
    { name: 'Contact Sync', webhookPath: 'contact-sync' },
  ],
  email: [
    { name: 'Drip Campaign Trigger', webhookPath: 'drip-campaign' },
    { name: 'Bounce Handler', webhookPath: 'bounce-handler' },
  ],
  social: [
    { name: 'Content Scheduler', webhookPath: 'content-scheduler' },
    { name: 'Analytics Collector', webhookPath: 'analytics-collector' },
  ],
  content_studio: [
    { name: 'Content Generation Trigger', webhookPath: 'content-generation' },
  ],
  accommodation: [
    { name: 'Booking Notification', webhookPath: 'booking-notification' },
    { name: 'Availability Sync', webhookPath: 'availability-sync' },
  ],
};

export async function deployAutomations(job: ProvisioningJob): Promise<ProvisioningResult> {
  const apiKey = process.env.N8N_API_KEY;
  const n8nHost = process.env.N8N_HOST || 'n8n.srv1114684.hstgr.cloud';

  if (!apiKey) {
    return {
      success: true,
      step: 'deploy-automations',
      data: { automationWorkflowIds: '' },
    };
  }

  // Determine enabled modules from client config or fall back to defaults by tier
  let enabledModules: string[] = [];

  if (job.createdResources && 'clientConfig' in job.createdResources) {
    // Client config will be wired in B2; use it if available
    const config = (job.createdResources as any).clientConfig;
    if (config?.modules) {
      enabledModules = Object.entries(config.modules)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
    }
  }

  // Fallback: derive from tier
  if (enabledModules.length === 0) {
    enabledModules = ['crm', 'email'];
    if (['growth', 'professional'].includes(job.tier)) {
      enabledModules.push('social', 'content_studio');
    }
    if (['scale', 'enterprise'].includes(job.tier)) {
      enabledModules.push('social', 'content_studio', 'accommodation');
    }
  }

  const createdIds: string[] = [];

  for (const moduleName of enabledModules) {
    const templates = MODULE_WORKFLOWS[moduleName];
    if (!templates) continue;

    for (const template of templates) {
      try {
        const workflowName = `Client ${job.clientId} - ${template.name}`;
        const webhookPath = `client-${job.clientId}/${template.webhookPath}`;

        const workflow = {
          name: workflowName,
          nodes: [
            {
              id: `webhook-${template.webhookPath}`,
              name: `${template.name} Webhook`,
              type: 'n8n-nodes-base.webhook',
              position: [250, 300],
              parameters: {
                path: webhookPath,
                httpMethod: 'POST',
                responseMode: 'responseNode',
              },
              typeVersion: 1,
            },
            {
              id: `response-${template.webhookPath}`,
              name: 'Response',
              type: 'n8n-nodes-base.respondToWebhook',
              position: [500, 300],
              parameters: {},
              typeVersion: 1,
            },
          ],
          connections: {
            [`${template.name} Webhook`]: {
              main: [[{ node: 'Response', type: 'main', index: 0 }]],
            },
          },
          settings: { executionOrder: 'v1' },
        };

        const response = await fetch(`${N8N_API_BASE(n8nHost)}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });

        if (response.ok) {
          const created = await response.json();
          createdIds.push(created.id);
          console.log(`  Created automation workflow: ${workflowName} (${created.id})`);

          // Activate the workflow
          await fetch(`${N8N_API_BASE(n8nHost)}/workflows/${created.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': apiKey },
          });
        } else {
          console.warn(`  Failed to create workflow "${workflowName}": ${await response.text()}`);
        }
      } catch (err) {
        console.warn(`  Warning: failed to deploy ${template.name} for module ${moduleName}:`, err);
      }
    }
  }

  return {
    success: true,
    step: 'deploy-automations',
    data: { automationWorkflowIds: createdIds.join(',') },
  };
}
