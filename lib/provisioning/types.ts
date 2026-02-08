export interface ProvisioningJob {
  clientId: string;
  clientName: string;
  orgEmail: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale';
  createdResources?: CreatedResources;
}

export interface CreatedResources {
  supabaseProjectId?: string;
  supabaseProjectRef?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseDatabaseUrl?: string;
  githubRepoName?: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelDeploymentUrl?: string;
  n8nWorkflowId?: string;
  n8nWebhookUrl?: string;
}

export interface ProvisioningResult {
  success: boolean;
  step: ProvisioningStep;
  data?: Partial<CreatedResources>;
  error?: string;
}

export type ProvisioningStep =
  | 'supabase-project'
  | 'database-schema'
  | 'github-repo'
  | 'vercel-deployment'
  | 'n8n-webhooks'
  | 'deploy-automations'
  | 'onboarding-sequence'
  | 'finalize';
