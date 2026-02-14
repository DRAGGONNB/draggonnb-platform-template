export interface OpsClient {
  id: string;
  client_id: string;
  client_name: string;
  org_email: string;
  tier: 'core' | 'growth' | 'scale';
  modules: Record<string, boolean>;
  branding: {
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    company_name: string;
  };
  integrations: Record<string, boolean>;

  supabase_project_id: string | null;
  supabase_project_ref: string | null;
  github_repo_url: string | null;
  vercel_project_id: string | null;
  vercel_deployment_url: string | null;
  n8n_workflow_ids: string | null;

  billing_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown';
  provisioned_at: string;
  last_health_check: string | null;

  created_at: string;
  updated_at: string;
}

export interface OpsClientHealth {
  id: string;
  client_id: string;
  vercel_responds: boolean;
  supabase_connects: boolean;
  n8n_webhook_responds: boolean;
  login_page_loads: boolean;
  rls_enabled: boolean;
  all_passed: boolean;
  check_details: Record<string, unknown> | null;
  checked_at: string;
}

export interface OpsBillingEvent {
  id: string;
  client_id: string;
  event_type: 'payment_received' | 'payment_failed' | 'subscription_created' | 'subscription_cancelled' | 'tier_changed' | 'refund';
  amount_zar: number | null;
  currency: string;
  payment_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OpsBillingSummary {
  total_clients: number;
  active_clients: number;
  mrr_zar: number;
  clients_by_tier: Record<string, number>;
  clients_by_health: Record<string, number>;
}
